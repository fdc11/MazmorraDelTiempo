/**
 * main.js — Bootstrap del motor. Conecta todos los módulos del engine.
 *
 * Responsabilidades:
 *   1. Inicializar renderer, input y el game loop.
 *   2. Registrar los handlers de cada estado (MENU, PLAYING, PAUSED, …).
 *   3. Cargar niveles y módulos externos (player, ui, audio) con import()
 *      dinámico; si fallan, mostrar pantalla placeholder sin romper el juego.
 *   4. Mostrar una pantalla de prueba temporal con FPS, estado e input.
 *      TODO: Reemplazar esta pantalla por ui.js cuando esté disponible.
 *
 * Contrato de nivel que main.js espera (NO implementado aquí):
 *   export default {
 *     id: number,
 *     name: string,
 *     timeLimit: number,       // segundos disponibles
 *     init(ctx),               // prepara el nivel
 *     update(dt, input, ctx),  // lógica por frame
 *     draw(ctx, renderer),     // render por frame
 *     isComplete(ctx),         // → boolean
 *   }
 */

import { STATE, KEYS, PALETTE, CANVAS, LEVEL_MODULES } from './config.js';

import { initRenderer, beginFrame, endRenderFrame, getCtx,
         drawRect, drawText, fadeScreen } from './engine/renderer.js';

import { initInput, endFrame as endInputFrame, isPressed,
         getDebugState } from './engine/input.js';

import { initCamera, updateCamera } from './engine/camera.js';

import { on, change, updateState, drawState, getState } from './engine/state.js';

import { startLoop, getFPS } from './engine/loop.js';

// ─── Estado de juego compartido (contexto mutable) ────────────────────────────

/**
 * Contexto de juego compartido entre módulos cargados dinámicamente.
 * Ampliable por player.js, ui.js, etc. sin tocar main.js.
 */
const gameCtx = {
  currentLevelIndex: 0,
  levels:            [],   // módulos de nivel cargados
  player:            null, // referencia al jugador (player.js)
  ui:                null, // referencia a la UI (ui.js)
  audio:             null, // referencia al audio (audio.js)
  score:             0,
  timeLeft:          0,
};

// ─── Carga dinámica de módulos externos ───────────────────────────────────────

/**
 * Intenta cargar un módulo JS con import() dinámico.
 * Si falla (archivo no existe aún), devuelve null sin lanzar error.
 * @param {string} path
 * @returns {Promise<any|null>}
 */
async function tryImport(path) {
  try {
    return await import(path);
  } catch {
    // Módulo todavía no disponible — se muestra placeholder
    return null;
  }
}

/**
 * Carga todos los niveles definidos en LEVEL_MODULES.
 * Los que fallen se almacenan como null (se mostrará placeholder al intentar jugarlos).
 */
async function loadLevels() {
  const results = await Promise.allSettled(
    LEVEL_MODULES.map(path => tryImport(`./${path.replace('js/', '')}`)),
  );

  gameCtx.levels = results.map((r, i) => {
    if (r.status === 'fulfilled' && r.value?.default) {
      return r.value.default;
    }
    // Nivel no disponible — objeto placeholder
    return {
      id:        i + 1,
      name:      `Nivel ${i + 1}`,
      timeLimit: 0,
      _placeholder: true,
      init:       () => {},
      update:     () => {},
      draw:       (ctx, r) => drawLevelPlaceholder(ctx, r, i + 1),
      isComplete: () => false,
    };
  });
}

/**
 * Carga módulos opcionales: player, ui, audio.
 * Si alguno falla, gameCtx los deja en null y el juego continúa.
 */
async function loadOptionalModules() {
  const [playerMod, uiMod, audioMod] = await Promise.all([
    tryImport('./player.js'),
    tryImport('./ui.js'),
    tryImport('./audio.js'),
  ]);

  gameCtx.player = playerMod?.default ?? null;
  gameCtx.ui     = uiMod?.default     ?? null;
  gameCtx.audio  = audioMod?.default  ?? null;
}

// ─── Pantallas placeholder ────────────────────────────────────────────────────

/**
 * Dibuja una pantalla placeholder cuando un nivel no está disponible.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} r — módulo renderer
 * @param {number} levelNum
 */
function drawLevelPlaceholder(ctx, r, levelNum) {
  drawRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT, PALETTE.STONE_DARK);
  drawText(
    `NIVEL ${levelNum}`,
    CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20,
    PALETTE.TIME_GOLD, 8, 'center',
  );
  drawText(
    'no disponible aun',
    CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2,
    PALETTE.TEXT_DIM, 5, 'center',
  );
  drawText(
    'Vuelve pronto!',
    CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 16,
    PALETTE.STONE_LIGHT, 5, 'center',
  );
}

// ─── Pantalla de prueba / debug ───────────────────────────────────────────────
// TODO: Reemplazar por ui.js cuando esté disponible (buscar este comentario).

/**
 * Dibuja la pantalla de prueba temporal que verifica el correcto
 * funcionamiento del motor: título, FPS, estado e input detectado.
 * @param {CanvasRenderingContext2D} ctx
 */
function drawDebugOverlay() {
  const state   = getState();
  const fps     = getFPS();
  const debug   = getDebugState();

  // Fondo semitransparente
  fadeScreen(PALETTE.FADE_BLACK, 0.35);

  // ── Título del juego ──
  drawText(
    'LA MAZMORRA',
    CANVAS.WIDTH / 2, 18,
    PALETTE.TIME_GOLD, 8, 'center',
  );
  drawText(
    'DEL TIEMPO',
    CANVAS.WIDTH / 2, 30,
    PALETTE.TIME_GOLD, 8, 'center',
  );

  // ── FPS ──
  const fpsColor = fps >= 55 ? PALETTE.TORCH_CORE : PALETTE.DANGER;
  drawText(`FPS: ${fps}`, 6, 6, fpsColor, 5);

  // ── Estado actual ──
  drawText('ESTADO:', 6, CANVAS.HEIGHT - 48, PALETTE.TEXT_DIM, 5);
  drawText(state, 6, CANVAS.HEIGHT - 38, PALETTE.TORCH_CORE, 6);

  // ── Input detectado ──
  const inputStr = debug.down.length > 0
    ? debug.down.slice(0, 3).join(' ').replace(/Key|Arrow/g, '')
    : '---';
  drawText('INPUT:', 6, CANVAS.HEIGHT - 20, PALETTE.TEXT_DIM, 5);
  drawText(inputStr, 6, CANVAS.HEIGHT - 10, PALETTE.TEXT_WHITE, 5);

  // ── Controles de prueba ──
  const hintX = CANVAS.WIDTH - 6;
  drawText('ENTER=PLAY', hintX, CANVAS.HEIGHT - 48, PALETTE.STONE_LIGHT, 4, 'right');
  drawText('P=PAUSA',    hintX, CANVAS.HEIGHT - 38, PALETTE.STONE_LIGHT, 4, 'right');
  drawText('R=MENU',     hintX, CANVAS.HEIGHT - 28, PALETTE.STONE_LIGHT, 4, 'right');
  drawText('E=VICTORIA', hintX, CANVAS.HEIGHT - 18, PALETTE.STONE_LIGHT, 4, 'right');
  drawText('ESC=GAMEOVER',hintX,CANVAS.HEIGHT -  8, PALETTE.STONE_LIGHT, 4, 'right');
}

// ─── Handlers de estados ──────────────────────────────────────────────────────

function registerStates() {

  // ── MENU ──────────────────────────────────────────────────────────────────
  on(STATE.MENU, {
    enter() {
      gameCtx.currentLevelIndex = 0;
      gameCtx.score = 0;
    },
    update(_dt, _input) {
      if (isPressed(KEYS.CONFIRM)) change(STATE.PLAYING);
    },
    draw(ctx) {
      drawRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT, PALETTE.STONE_DARK);
      // Fondo decorativo de piedra
      drawDecorativeBackground();
      drawDebugOverlay();
      drawText('Pulsa ENTER', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 10,
               PALETTE.TEXT_WHITE, 5, 'center');
    },
  });

  // ── PLAYING ───────────────────────────────────────────────────────────────
  on(STATE.PLAYING, {
    enter(prev) {
      const level = gameCtx.levels[gameCtx.currentLevelIndex];
      if (level && !level._placeholder) {
        gameCtx.timeLeft = level.timeLimit;
        level.init(gameCtx);
      }
      // Inicializar cámara con tamaño del mapa (placeholder usa resolución lógica)
      initCamera(CANVAS.WIDTH * 4, CANVAS.HEIGHT * 4);
    },
    update(dt, _input) {
      if (isPressed(KEYS.PAUSE)) {
        change(STATE.PAUSED);
        return;
      }
      if (isPressed(KEYS.RESTART)) {
        change(STATE.MENU);
        return;
      }
      // Controles de prueba para cambiar estados desde cualquier lugar
      if (isPressed(KEYS.ACTION)) { change(STATE.VICTORY);  return; }
      if (isPressed(['Escape']))   { change(STATE.GAME_OVER); return; }

      const level = gameCtx.levels[gameCtx.currentLevelIndex];

      // Actualizar tiempo si el nivel tiene límite
      if (level && !level._placeholder && level.timeLimit > 0) {
        gameCtx.timeLeft -= dt;
        if (gameCtx.timeLeft <= 0) {
          gameCtx.timeLeft = 0;
          change(STATE.GAME_OVER);
          return;
        }
      }

      level?.update(dt, _input, gameCtx);
      updateCamera(dt);

      if (level?.isComplete(gameCtx)) {
        const nextIndex = gameCtx.currentLevelIndex + 1;
        if (nextIndex < gameCtx.levels.length) {
          gameCtx.currentLevelIndex = nextIndex;
          change(STATE.PLAYING);
        } else {
          change(STATE.VICTORY);
        }
      }
    },
    draw(ctx) {
      drawRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT, PALETTE.VOID);
      const level = gameCtx.levels[gameCtx.currentLevelIndex];
      level?.draw(ctx, { drawRect, drawText, fadeScreen });
      drawDebugOverlay();
    },
  });

  // ── PAUSED ────────────────────────────────────────────────────────────────
  on(STATE.PAUSED, {
    update(_dt, _input) {
      if (isPressed(KEYS.PAUSE) || isPressed(KEYS.CONFIRM)) {
        change(STATE.PLAYING);
      }
      if (isPressed(KEYS.RESTART)) change(STATE.MENU);
    },
    draw(ctx) {
      // Reutilizar el último frame de playing (fondo congelado)
      drawRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT, PALETTE.STONE_DARK);
      drawDecorativeBackground();
      fadeScreen(PALETTE.FADE_BLACK, 0.55);

      drawText('PAUSA', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20,
               PALETTE.TIME_GOLD, 10, 'center');
      drawText('ENTER para continuar', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 6,
               PALETTE.TEXT_WHITE, 4, 'center');
      drawText('R para volver al menu', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 18,
               PALETTE.TEXT_DIM, 4, 'center');
      drawDebugOverlay();
    },
  });

  // ── GAME_OVER ─────────────────────────────────────────────────────────────
  on(STATE.GAME_OVER, {
    update(_dt, _input) {
      if (isPressed(KEYS.CONFIRM) || isPressed(KEYS.RESTART)) {
        change(STATE.MENU);
      }
    },
    draw(ctx) {
      drawRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT, PALETTE.STONE_DARK);
      drawDecorativeBackground();
      fadeScreen(PALETTE.FADE_BLACK, 0.6);

      drawText('GAME OVER', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20,
               PALETTE.DANGER, 10, 'center');
      drawText('ENTER para reiniciar', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 6,
               PALETTE.TEXT_WHITE, 4, 'center');
      drawDebugOverlay();
    },
  });

  // ── VICTORY ───────────────────────────────────────────────────────────────
  on(STATE.VICTORY, {
    update(_dt, _input) {
      if (isPressed(KEYS.CONFIRM) || isPressed(KEYS.RESTART)) {
        change(STATE.MENU);
      }
    },
    draw(ctx) {
      drawRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT, PALETTE.STONE_MID);
      drawDecorativeBackground();
      fadeScreen(PALETTE.FADE_BLACK, 0.45);

      drawText('¡VICTORIA!', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 - 20,
               PALETTE.TIME_GOLD, 10, 'center');
      drawText('Escapaste del tiempo', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 4,
               PALETTE.HERO_SKIN, 4, 'center');
      drawText('ENTER para el menu', CANVAS.WIDTH / 2, CANVAS.HEIGHT / 2 + 16,
               PALETTE.TEXT_DIM, 4, 'center');
      drawDebugOverlay();
    },
  });
}

// ─── Decoración de fondo ──────────────────────────────────────────────────────

/**
 * Dibuja un fondo decorativo de tiles de piedra para las pantallas de UI.
 * Temporal hasta que level1.js exista.
 */
function drawDecorativeBackground() {
  const tileSize = 16;
  const cols = Math.ceil(CANVAS.WIDTH  / tileSize);
  const rows = Math.ceil(CANVAS.HEIGHT / tileSize);

  for (let row = 0; row < rows; row++) {
    for (let col = 0; col < cols; col++) {
      const shade = (row + col) % 2 === 0 ? PALETTE.STONE_DARK : PALETTE.STONE_MID;
      drawRect(col * tileSize, row * tileSize, tileSize - 1, tileSize - 1, shade);
    }
  }

  // Antorchas decorativas
  drawTorch(40, 40);
  drawTorch(CANVAS.WIDTH - 48, 40);
  drawTorch(40, CANVAS.HEIGHT - 56);
  drawTorch(CANVAS.WIDTH - 48, CANVAS.HEIGHT - 56);
}

/**
 * Dibuja una antorcha decorativa simple en coordenadas lógicas.
 * @param {number} x
 * @param {number} y
 */
function drawTorch(x, y) {
  // Mástil
  drawRect(x + 3, y + 8,  2, 8, PALETTE.TIME_DIM);
  // Llama exterior
  drawRect(x,     y,      8, 10, PALETTE.TORCH_GLOW);
  // Llama interior
  drawRect(x + 2, y + 2,  4,  6, PALETTE.TORCH_CORE);
  // Brillo central
  drawRect(x + 3, y + 3,  2,  3, PALETTE.TEXT_WHITE);
}

// ─── Update y Draw globales ───────────────────────────────────────────────────

/**
 * Función de update pasada al game loop. Ejecuta la lógica del estado actual.
 * @param {number} dt — Delta time fijo en segundos
 */
function update(dt) {
  updateState(dt, { isPressed });
  endInputFrame(); // Limpiar estados de flanco al final de cada tick lógico
}

/**
 * Función de draw pasada al game loop. Renderiza el estado actual.
 * @param {number} alpha — Factor de interpolación [0..1] (para futura interpolación)
 */
function draw(_alpha) {
  beginFrame();
  drawState(getCtx(), { drawRect, drawText, fadeScreen });
  endRenderFrame();
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

/**
 * Punto de entrada principal. Se ejecuta al cargar el módulo.
 */
async function bootstrap() {
  // 1. Canvas del DOM
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('[main] No se encontró #gameCanvas en el DOM.');
    return;
  }

  // 2. Inicializar motor
  initRenderer(canvas);
  initInput();
  initCamera(CANVAS.WIDTH, CANVAS.HEIGHT); // Límites iniciales, el nivel los reemplaza

  // 3. Cargar módulos externos (sin bloquear si fallan)
  await Promise.all([loadLevels(), loadOptionalModules()]);

  // 4. Registrar handlers de estados
  registerStates();

  // 5. Arrancar el loop
  startLoop(update, draw);
}

bootstrap();
