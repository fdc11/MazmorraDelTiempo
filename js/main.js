/**
 * js/main.js — Bootstrap del motor, orquestación de estados, bus de eventos e integración total.
 * Issue #1 — Base del motor | Rama: feature/base-motor
 * Issue #4 — Integración   | Rama: feature/sistema-niveles
 */

import { CANVAS, STATE, KEYS, PALETTE } from './config.js';

import { initRenderer, beginFrame, endRenderFrame, getCtx, drawText, fadeScreen, triggerScreenFlash, updateScreenFlash } from './engine/renderer.js';
import { initInput, endFrame, isDown, isPressed, onFirstInteraction } from './engine/input.js';
import { initCamera, resetCamera, followTarget, updateCamera, startShake, setZoom, worldToScreen, getVisibleBounds, getCameraPos } from './engine/camera.js';
import { on, change, updateState, drawState, getState } from './engine/state.js';
import { startLoop, getFPS } from './engine/loop.js';
import { particles } from './engine/particles.js';

// ─── Carga dinámica protegida de subsistemas ──────────────────────────────────
let PlayerClass = null;
let VitalsClass = null;
let sessionInstance = null;
let eventsInstance = null;
let transitionInstance = null;
let uiInstance = null;
let audioInstance = null;
let levelLoaders = [];

// Instancias activas de partida
let player = null;
let vitals = null;
let currentLevel = null;
let currentLevelIndex = 0;
let loadedLevels = [];

// Game feel: hit-stop (congelación momentánea al recibir daño)
let hitStopTimer = 0;
let respawnPendingTimer = 0;
let deathTransitionTimer = 0;

// Opciones de menú y pantallas interactivas
let menuSelectedIndex = 0;
let pauseSelectedIndex = 0;
let gameOverSelectedIndex = 0;
let victorySelectedIndex = 0;

/**
 * Intenta importar un módulo; si falla no rompe la aplicación.
 */
async function safeImport(path) {
  try {
    return await import(path);
  } catch (err) {
    console.warn(`[main] Módulo opcional no disponible aún: ${path}`, err);
    return null;
  }
}

async function bootstrapModules() {
  const [
    playerMod,
    vitalsMod,
    sessionMod,
    eventsMod,
    transitionMod,
    uiMod,
    audioMod,
    levelsMod,
  ] = await Promise.all([
    safeImport('./player.js'),
    safeImport('./engine/vitals.js'),
    safeImport('./engine/session.js'),
    safeImport('./engine/events.js'),
    safeImport('./engine/transition.js'),
    safeImport('./ui.js'),
    safeImport('./audio.js'),
    safeImport('./levels.js'),
  ]);

  PlayerClass = playerMod?.Player ?? null;
  VitalsClass = vitalsMod?.Vitals ?? null;
  sessionInstance = sessionMod?.session ?? null;
  eventsInstance = eventsMod?.events ?? null;
  transitionInstance = transitionMod?.transition ?? null;
  uiInstance = uiMod?.ui ?? null;
  audioInstance = audioMod?.audio ?? null;

  if (levelsMod?.LEVEL_LOADERS) {
    levelLoaders = levelsMod.LEVEL_LOADERS;
  } else if (levelsMod?.default) {
    levelLoaders = levelsMod.default;
  }

  // Pre-cargar niveles
  loadedLevels = [];
  for (let i = 0; i < levelLoaders.length; i++) {
    try {
      const mod = await levelLoaders[i]();
      loadedLevels.push(mod?.default || mod);
    } catch {
      loadedLevels.push(null);
    }
  }

  // Conectar desbloqueo de audio al primer clic o pulsación de tecla
  if (audioInstance) {
    onFirstInteraction(() => {
      audioInstance.init();
    });
  }

  // Conectar bus de eventos si existe
  if (eventsInstance) {
    eventsInstance.on('damage', (payload) => {
      if (vitals) {
        const applied = vitals.damage(payload.amount || 1, payload.source || 'hazard');
        if (applied) {
          hitStopTimer = 0.06; // 60 ms de hit-stop
          startShake(10);
          triggerScreenFlash('rgba(180, 25, 30, 0.45)', 0.22, 0.45);
          audioInstance?.playSFX('hurt');
          // Chispas de sangre en el punto de impacto
          if (player) {
            particles.emitBlood(player.x + player.width / 2, player.y + player.height * 0.4, 6);
          }
        }
      }
    });

    eventsInstance.on('kill', (payload) => {
      vitals?.kill(payload.source || 'hazard');
      startShake(16);
      setZoom(1.15);
      triggerScreenFlash('rgba(156, 28, 32, 0.65)', 0.40, 0.65);
      audioInstance?.playSFX('death');
      // Explosión de sangre y humo dramática al morir
      if (player) {
        particles.emitBlood(player.x + player.width / 2, player.y + player.height * 0.35, 16);
        particles.emitDeathSmoke(player.x + player.width / 2, player.y + player.height * 0.5, 10);
      }
    });

    eventsInstance.on('checkpoint', (payload) => {
      vitals?.setCheckpoint(payload.x, payload.y);
    });

    eventsInstance.on('collect', (payload) => {
      if (sessionInstance && payload) {
        if (payload.points) sessionInstance.addScore(payload.points);
        if (payload.time) sessionInstance.addTime(payload.time);
      }
    });

    eventsInstance.on('sfx', (payload) => {
      if (audioInstance && payload?.name) {
        audioInstance.playSFX(payload.name);
      }
    });
  }
}

// ─── Gestión de partida y cambio de nivel ────────────────────────────────────
function setupNewGame() {
  currentLevelIndex = 0;
  if (sessionInstance) {
    sessionInstance.resetSession();
  }
  if (VitalsClass) {
    vitals = new VitalsClass(3, 3);
    vitals.onDeath = (source) => {
      if (player) player.state = 'dead';
      startShake(14);
      setZoom(1.15);
      triggerScreenFlash('rgba(156, 28, 32, 0.65)', 0.45, 0.65);
      deathTransitionTimer = 1.3;
    };
    vitals.onGameOver = (source) => {
      deathTransitionTimer = 1.4;
    };
    vitals.onDamage = () => {
      if (player && player.state !== 'dead') {
        player.state = 'hurt';
      }
    };
  }
  loadCurrentLevel();
}

function loadCurrentLevel() {
  currentLevel = loadedLevels[currentLevelIndex] ?? null;

  if (!currentLevel) {
    console.warn(`[main] Nivel ${currentLevelIndex + 1} no disponible.`);
    return;
  }

  // Iniciar nivel
  const levelCtx = createLevelContext();
  currentLevel.init(levelCtx);

  // Inicializar vitals y checkpoint con el spawn del nivel
  const spawn = currentLevel.spawn || { x: 96, y: 300 };
  if (vitals) {
    vitals.resetLevel();
    vitals.setCheckpoint(spawn.x, spawn.y);
  }

  // Crear o reiniciar jugador
  if (PlayerClass) {
    if (!player) {
      player = new PlayerClass(spawn.x, spawn.y);
    } else {
      player.reset(spawn.x, spawn.y);
    }

    // Callbacks de física y daño
    player.onLand = (distanceTiles) => {
      vitals?.applyFall(distanceTiles);
      audioInstance?.playSFX('land');
    };
    player.onHazard = (type) => {
      vitals?.damage(1, type);
    };
    player.onLedgeGrab = () => {
      audioInstance?.playSFX('grab');
    };
  }

  // Configurar sesión de tiempo
  if (sessionInstance) {
    sessionInstance.setTime(currentLevel.timeLimit || 120);
  }

  // Ajustar cámara y audio
  const mapW = currentLevel.tilemap?.widthPx || CANVAS.WIDTH;
  const mapH = currentLevel.tilemap?.heightPx || CANVAS.HEIGHT;
  initCamera(mapW, mapH);
  resetCamera(spawn.x, spawn.y);
  setZoom(1.0);

  audioInstance?.setLevelTheme(currentLevel.id || 1);

  // Tarjeta cinemática de introducción
  if (transitionInstance) {
    change(STATE.INTRO);
    transitionInstance.showLevelIntro(
      currentLevel.id || (currentLevelIndex + 1),
      currentLevel.name || `Nivel ${currentLevelIndex + 1}`,
      'El tiempo corre inexorablemente',
      () => {
        change(STATE.PLAYING);
      }
    );
  } else {
    change(STATE.PLAYING);
  }
}

function createLevelContext() {
  return {
    player,
    input: { isDown, isPressed },
    camera: { startShake, setZoom, worldToScreen, getCameraPos, getVisibleBounds },
    audio: audioInstance,
    score: { add: (n) => sessionInstance?.addScore(n) },
    time: { addSeconds: (s) => sessionInstance?.addTime(s) },
    events: eventsInstance || { emit: () => {}, on: () => {} },
    particles,
  };
}

// ─── Registro de estados de la máquina FSM ────────────────────────────────────
function registerStateHandlers() {
  // ── ESTADO: MENÚ PRINCIPAL ─────────────────────────────────
  on(STATE.MENU, {
    enter() {
      menuSelectedIndex = 0;
      setZoom(1.0);
    },
    update(dt) {
      uiInstance?.update(dt);

      if (isPressed(KEYS.UP)) {
        menuSelectedIndex = (menuSelectedIndex - 1 + 3) % 3;
        audioInstance?.playSFX('step');
      } else if (isPressed(KEYS.DOWN)) {
        menuSelectedIndex = (menuSelectedIndex + 1) % 3;
        audioInstance?.playSFX('step');
      }

      if (isPressed(KEYS.CONFIRM)) {
        audioInstance?.playSFX('collect');
        if (menuSelectedIndex === 0) {
          setupNewGame();
        } else if (menuSelectedIndex === 1) {
          change(STATE.CONTROLS);
        } else if (menuSelectedIndex === 2) {
          audioInstance?.toggleMute();
        }
      }
    },
    draw(ctx, renderer) {
      if (uiInstance) {
        uiInstance.drawMenu(ctx, menuSelectedIndex, audioInstance?.isMuted ?? false);
      } else {
        drawFallbackScreen(ctx, 'LA MAZMORRA DEL TIEMPO', 'Presiona ENTER para iniciar');
      }
    },
  });

  // ── ESTADO: CONTROLES ──────────────────────────────────────
  on(STATE.CONTROLS, {
    update(dt) {
      uiInstance?.update(dt);
      if (isPressed(KEYS.PAUSE) || isPressed(KEYS.CONFIRM)) {
        change(STATE.MENU);
      }
    },
    draw(ctx, renderer) {
      if (uiInstance) {
        uiInstance.drawControls(ctx);
      } else {
        drawFallbackScreen(ctx, 'CONTROLES', 'Presiona ESC para volver');
      }
    },
  });

  // ── ESTADO: INTRODUCCIÓN DE NIVEL ──────────────────────────
  on(STATE.INTRO, {
    update(dt) {
      transitionInstance?.update(dt);
    },
    draw(ctx, renderer) {
      // Dibujar fondo estático del nivel bajo la tarjeta
      if (currentLevel) {
        const renderCtx = createLevelContext();
        currentLevel.draw(ctx, renderCtx);
      }
      transitionInstance?.draw(ctx);
    },
  });

  // ── ESTADO: EN JUEGO (PLAYING) ─────────────────────────────
  on(STATE.PLAYING, {
    update(dt) {
      uiInstance?.update(dt);
      transitionInstance?.update(dt);
      particles.update(dt);

      // Manejo de pausa
      if (isPressed(KEYS.PAUSE)) {
        change(STATE.PAUSED);
        return;
      }

      // Tecla R: reiniciar nivel actual
      if (isPressed(KEYS.RESTART)) {
        loadCurrentLevel();
        return;
      }

      // Tecla M: mutear audio
      if (isPressed(KEYS.MUTE)) {
        audioInstance?.toggleMute();
      }

      // Manejo de hit-stop (daño recibido)
      if (hitStopTimer > 0) {
        hitStopTimer -= dt;
        return;
      }

      // Transición tras muerte
      if (deathTransitionTimer > 0) {
        deathTransitionTimer -= dt;
        if (deathTransitionTimer <= 0) {
          if (vitals?.isGameOver) {
            change(STATE.GAME_OVER);
          } else {
            // Respawn en el último checkpoint
            const cp = vitals?.respawn() || { x: 96, y: 300 };
            player?.reset(cp.x, cp.y);
            resetCamera(cp.x, cp.y);
            setZoom(1.0);
          }
        }
      }

      // Actualizar Vitals e invulnerabilidad
      vitals?.update(dt);

      // Descuento del tiempo del nivel
      if (sessionInstance && !vitals?.isGameOver && deathTransitionTimer <= 0) {
        const timeLeft = sessionInstance.tickTime(dt);
        if (timeLeft <= 0) {
          vitals?.timeExpired();
        }
      }

      // Actualizar al jugador
      if (player && currentLevel) {
        player.update(dt, { isDown, isPressed }, { tilemap: currentLevel.tilemap }, particles);
        followTarget(player.x + player.width / 2, player.y + player.height / 2, player.facing);
      }

      // Actualizar cámara
      updateCamera(dt);

      // Actualizar entidades del nivel actual
      if (currentLevel) {
        const levelCtx = createLevelContext();
        currentLevel.update(dt, levelCtx);

        // Comprobar finalización del nivel
        if (currentLevel.isComplete(levelCtx)) {
          handleLevelComplete();
        }
      }
    },
    draw(ctx, renderer) {
      if (currentLevel) {
        const renderCtx = createLevelContext();

        // 1. Dibujar nivel y entidades
        currentLevel.draw(ctx, renderCtx);

        // 2. Dibujar partículas en el espacio del mundo
        particles.draw(ctx, worldToScreen);

        // 3. Dibujar jugador con animación esquelética y parpadeo de invulnerabilidad
        if (player) {
          player.draw(ctx, worldToScreen, vitals?.snapshot().invulnerable ?? false);
        }
      }

      // 4. Dibujar HUD vectorial en pantalla lógica (arriba de todo)
      if (uiInstance && vitals && sessionInstance && currentLevel) {
        uiInstance.drawHUD(ctx, vitals.snapshot(), sessionInstance, currentLevel.name);
      }

      // 5. Fundidos o tarjetas de transición
      transitionInstance?.draw(ctx);
    },
  });

  // ── ESTADO: PAUSA ──────────────────────────────────────────
  on(STATE.PAUSED, {
    enter() {
      pauseSelectedIndex = 0;
    },
    update(dt) {
      uiInstance?.update(dt);
      if (isPressed(KEYS.UP)) {
        pauseSelectedIndex = (pauseSelectedIndex - 1 + 3) % 3;
        audioInstance?.playSFX('step');
      } else if (isPressed(KEYS.DOWN)) {
        pauseSelectedIndex = (pauseSelectedIndex + 1) % 3;
        audioInstance?.playSFX('step');
      }

      if (isPressed(KEYS.CONFIRM)) {
        if (pauseSelectedIndex === 0) {
          change(STATE.PLAYING);
        } else if (pauseSelectedIndex === 1) {
          loadCurrentLevel();
          change(STATE.PLAYING);
        } else {
          change(STATE.MENU);
        }
      } else if (isPressed(KEYS.PAUSE)) {
        change(STATE.PLAYING);
      } else if (isPressed(KEYS.RESTART)) {
        loadCurrentLevel();
        change(STATE.PLAYING);
      }
    },
    draw(ctx, renderer) {
      if (currentLevel) {
        const renderCtx = createLevelContext();
        currentLevel.draw(ctx, renderCtx);
      }
      uiInstance?.drawPause(ctx, pauseSelectedIndex);
    },
  });

  // ── ESTADO: GAME OVER ──────────────────────────────────────
  on(STATE.GAME_OVER, {
    enter() {
      gameOverSelectedIndex = 0;
      setZoom(1.0);
      sessionInstance?.saveHighScore();
      audioInstance?.playSFX('gameover');
    },
    update(dt) {
      uiInstance?.update(dt);

      if (isPressed(KEYS.UP)) {
        gameOverSelectedIndex = (gameOverSelectedIndex - 1 + 3) % 3;
        audioInstance?.playSFX('step');
      } else if (isPressed(KEYS.DOWN)) {
        gameOverSelectedIndex = (gameOverSelectedIndex + 1) % 3;
        audioInstance?.playSFX('step');
      }

      if (isPressed(KEYS.CONFIRM)) {
        if (gameOverSelectedIndex === 0) {
          loadCurrentLevel();
          change(STATE.PLAYING);
        } else if (gameOverSelectedIndex === 1) {
          setupNewGame();
        } else {
          change(STATE.MENU);
        }
      }
    },
    draw(ctx, renderer) {
      if (uiInstance) {
        uiInstance.drawGameOver(ctx, gameOverSelectedIndex, sessionInstance, vitals);
      } else {
        drawFallbackScreen(ctx, 'GAME OVER', 'Presiona ENTER para reintentar');
      }
    },
  });

  // ── ESTADO: VICTORIA (VICTORY) ─────────────────────────────
  on(STATE.VICTORY, {
    enter() {
      victorySelectedIndex = 0;
      sessionInstance?.saveHighScore();
      audioInstance?.playSFX('victory');
    },
    update(dt) {
      uiInstance?.update(dt);
      if (isPressed(KEYS.UP) || isPressed(KEYS.DOWN)) {
        victorySelectedIndex = (victorySelectedIndex + 1) % 2;
        audioInstance?.playSFX('step');
      }
      if (isPressed(KEYS.CONFIRM)) {
        if (victorySelectedIndex === 0) {
          setupNewGame();
        } else {
          change(STATE.MENU);
        }
      } else if (isPressed(KEYS.PAUSE)) {
        change(STATE.MENU);
      }
    },
    draw(ctx, renderer) {
      if (uiInstance && sessionInstance) {
        uiInstance.drawVictory(ctx, sessionInstance, victorySelectedIndex);
      } else {
        drawFallbackScreen(ctx, 'VICTORIA', 'Has escapado de la Mazmorra del Tiempo');
      }
    },
  });
}

function handleLevelComplete() {
  audioInstance?.playSFX('door');

  // Bonificación de tiempo: 10 pts por segundo restante
  if (sessionInstance) {
    const timeBonus = Math.floor(sessionInstance.timeLeft) * 10;
    sessionInstance.addScore(timeBonus);
  }

  const nextIndex = currentLevelIndex + 1;
  if (nextIndex < loadedLevels.length && loadedLevels[nextIndex]) {
    currentLevelIndex = nextIndex;
    if (transitionInstance) {
      transitionInstance.fade(1.0, 3, () => {
        loadCurrentLevel();
        transitionInstance.fade(0.0, 2);
      });
    } else {
      loadCurrentLevel();
    }
  } else {
    // Victoria absoluta tras completar el último nivel
    change(STATE.VICTORY);
  }
}

function drawFallbackScreen(ctx, title, subtitle) {
  fadeScreen(0.9, PALETTE.DEEP_SHADOW);
  drawText(title, CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 30, {
    font: 'bold 36px "Cinzel", serif',
    color: PALETTE.TIME_GOLD,
    align: 'center',
  });
  drawText(subtitle, CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 20, {
    font: '20px "Cormorant Garamond", serif',
    color: PALETTE.BONE_DUST,
    align: 'center',
  });
}

// ─── Arranque principal ──────────────────────────────────────────────────────
async function main() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('[main] Canvas #gameCanvas no encontrado en el DOM.');
    return;
  }

  // Inicializar subsistemas del motor
  initRenderer(canvas);
  initInput();

  // Carga protegida de módulos
  await bootstrapModules();

  // Soporte interactivo de ratón para hover visual y clics precisos
  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS.WIDTH / rect.width;
    const mx = (e.clientX - rect.left) * scale;
    const my = (e.clientY - rect.top) * scale;
    uiInstance?.setMousePos(mx, my);

    const st = getState();
    let isOver = false;
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    if (st === STATE.MENU) {
      isOver = (mx >= cx - 140 && mx <= cx + 140 && my >= 250 && my <= 415);
    } else if (st === STATE.CONTROLS) {
      isOver = (mx >= cx - 130 && mx <= cx + 130 && my >= CANVAS.HEIGHT - 85 && my <= CANVAS.HEIGHT - 45);
    } else if (st === STATE.PAUSED) {
      isOver = (mx >= cx - 160 && mx <= cx + 160 && my >= cy - 40 && my <= cy + 120);
    } else if (st === STATE.GAME_OVER) {
      isOver = (mx >= cx - 170 && mx <= cx + 170 && my >= cy - 10 && my <= cy + 135);
    } else if (st === STATE.VICTORY) {
      isOver = (mx >= cx - 140 && mx <= cx + 140 && my >= cy + 85 && my <= cy + 175);
    }

    canvas.style.cursor = isOver ? 'pointer' : 'default';
  });

  canvas.addEventListener('mouseleave', () => {
    uiInstance?.setMousePos(-1, -1);
    canvas.style.cursor = 'default';
  });

  canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const scale = CANVAS.WIDTH / rect.width;
    const mx = (e.clientX - rect.left) * scale;
    const my = (e.clientY - rect.top) * scale;
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    const st = getState();
    if (st === STATE.MENU) {
      if (mx >= cx - 140 && mx <= cx + 140) {
        if (my >= 250 && my <= 290) {
          audioInstance?.playSFX('collect');
          setupNewGame();
        } else if (my >= 304 && my <= 344) {
          audioInstance?.playSFX('step');
          change(STATE.CONTROLS);
        } else if (my >= 358 && my <= 398) {
          audioInstance?.toggleMute();
        }
      }
    } else if (st === STATE.CONTROLS) {
      if (mx >= cx - 130 && mx <= cx + 130 && my >= CANVAS.HEIGHT - 85 && my <= CANVAS.HEIGHT - 45) {
        audioInstance?.playSFX('step');
        change(STATE.MENU);
      }
    } else if (st === STATE.PAUSED) {
      if (mx >= cx - 160 && mx <= cx + 160) {
        if (my >= cy - 38 && my <= cy - 2) {
          change(STATE.PLAYING);
        } else if (my >= cy + 8 && my <= cy + 44) {
          loadCurrentLevel();
          change(STATE.PLAYING);
        } else if (my >= cy + 54 && my <= cy + 90) {
          change(STATE.MENU);
        }
      }
    } else if (st === STATE.GAME_OVER) {
      if (mx >= cx - 170 && mx <= cx + 170) {
        if (my >= cy - 10 && my <= cy + 28) {
          loadCurrentLevel();
          change(STATE.PLAYING);
        } else if (my >= cy + 34 && my <= cy + 72) {
          setupNewGame();
        } else if (my >= cy + 78 && my <= cy + 116) {
          change(STATE.MENU);
        }
      }
    } else if (st === STATE.VICTORY) {
      if (mx >= cx - 140 && mx <= cx + 140) {
        if (my >= cy + 86 && my <= cy + 122) {
          setupNewGame();
        } else if (my >= cy + 130 && my <= cy + 166) {
          change(STATE.MENU);
        }
      }
    }
  });

  // Configurar máquina de estados
  registerStateHandlers();

  // Arrancar en el Menú Principal
  change(STATE.MENU);

  // Iniciar loop a 60 Hz con acumulador fijo
  startLoop(
    (dt) => {
      updateScreenFlash(dt);
      updateState(dt, { isDown, isPressed });
      endFrame();
    },
    (alpha) => {
      beginFrame();
      const ctx = getCtx();
      try {
        drawState(ctx, { drawText, fadeScreen });
      } catch (err) {
        console.error('[main] Error capturado en render:', err);
        drawFallbackScreen(ctx, 'LA MAZMORRA DEL TIEMPO', 'Reanudando partida...');
      }
      endRenderFrame();
    }
  );
}

// Iniciar aplicación al cargar el DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', main);
} else {
  main();
}
