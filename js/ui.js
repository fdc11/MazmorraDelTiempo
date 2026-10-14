/**
 * js/ui.js — Interfaz gráfica vectorial avanzada y sistema UI/UX profesional.
 * Soporta HUD flotante minimalista, menús interactivos con efectos hover de ratón y teclado,
 * pantallas de Pausa, Game Over con estadísticas completas y Victoria cinematográfica.
 * Issue #8 — Interfaz | Rama: feature/interfaz-menu
 */

import { CANVAS, PALETTE } from './config.js';
import { drawText, drawRect } from './engine/renderer.js';

export class UI {
  constructor() {
    this.animTime = 0;
    this.mouseX = -1;
    this.mouseY = -1;
    this.hoveredButtonKey = null;
    this._session = null;
  }

  /**
   * Vincula la sesión al UI para acceso al high score.
   */
  setSession(session) {
    this._session = session;
  }

  update(dt) {
    this.animTime += dt;
  }

  /**
   * Actualiza la posición lógica del cursor del ratón dentro del canvas.
   * @param {number} mx Coordenada X lógica (0 a 960)
   * @param {number} my Coordenada Y lógica (0 a 540)
   */
  setMousePos(mx, my) {
    this.mouseX = mx;
    this.mouseY = my;
  }

  /**
   * Determina si el cursor del ratón colisiona con una caja rectangular.
   */
  _isMouseOver(x, y, w, h) {
    return (
      this.mouseX >= x &&
      this.mouseX <= x + w &&
      this.mouseY >= y &&
      this.mouseY <= y + h
    );
  }

  // ─── 1. MENÚ PRINCIPAL ──────────────────────────────────────────────────────
  /**
   * Dibuja el menú principal con reloj de arena gigante, arcos persas y botones con hover interactivo.
   * @param {CanvasRenderingContext2D} ctx
   * @param {number} selectedIndex Índice seleccionado por teclado
   * @param {boolean} isMuted
   * @returns {number|null} Índice del botón bajo el ratón (o null)
   */
  drawMenu(ctx, selectedIndex = 0, isMuted = false) {
    const t = this.animTime;
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // 1. Fondo sombrío palaciego con gradiente radial
    const bgGrad = ctx.createRadialGradient(cx, cy * 0.75, 40, cx, cy, CANVAS.WIDTH * 0.75);
    bgGrad.addColorStop(0, '#221820');
    bgGrad.addColorStop(0.55, '#140f17');
    bgGrad.addColorStop(1, PALETTE.DEEP_SHADOW);
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // 2. Reloj de arena monumental animado en segundo plano
    this._drawGiantHourglass(ctx, cx, cy - 10, t);

    // 3. Arcos arquitectónicos persas
    this._drawMenuPalaceArches(ctx);

    // 4. Título monumental y subtítulo
    drawText('LA MAZMORRA DEL TIEMPO', cx, 105, {
      font: 'bold 44px "Cinzel", serif',
      color: PALETTE.TIME_GOLD,
      align: 'center',
      shadow: { color: 'rgba(232, 182, 58, 0.55)', blur: 20, y: 3 },
    });

    drawText('El palacio donde cada segundo cuenta', cx, 150, {
      font: 'italic 20px "Cormorant Garamond", serif',
      color: PALETTE.BONE_DUST,
      align: 'center',
      shadow: { color: 'rgba(0,0,0,0.85)', blur: 8 },
    });

    // 5. High Score (si existe)
    const highScore = this._session?.highScore || 0;
    if (highScore > 0) {
      const hsStr = `RÉCORD: ${highScore.toString().padStart(6, '0')}`;
      drawText(hsStr, cx, 175, {
        font: '14px "Cinzel", serif',
        color: PALETTE.SANDSTONE_LIGHT,
        align: 'center',
        shadow: { color: 'rgba(0,0,0,0.8)', blur: 6 },
      });
    }

    // 6. Opciones interactivas del Menú
    const options = [
      { text: 'JUGAR', key: 'play' },
      { text: 'CONTROLES', key: 'controls' },
      { text: `SONIDO: ${isMuted ? 'SILENCIADO' : 'ACTIVADO'}`, key: 'sound' },
    ];

    const startY = highScore > 0 ? 282 : 270;
    const spacing = 54;
    const btnW = 280;
    const btnH = 38;
    let hoveredIdx = null;

    for (let i = 0; i < options.length; i++) {
      const btnY = startY + i * spacing;
      const btnX = cx - btnW / 2;
      const isMouseOver = this._isMouseOver(btnX, btnY - btnH / 2, btnW, btnH);
      if (isMouseOver) hoveredIdx = i;

      const isSel = (hoveredIdx === i) || (hoveredIdx === null && i === selectedIndex);

      // Render del botón con hover / selección
      this._drawInteractiveButton(ctx, cx, btnY, btnW, btnH, options[i].text, isSel, isMouseOver);
    }

    // 7. Pie de página con ayuda de navegación
    drawText('Usa W / S o el RATÓN para elegir — ENTER o CLIC para confirmar', cx, CANVAS.HEIGHT - 38, {
      font: '16px "Cormorant Garamond", serif',
      color: PALETTE.SANDSTONE_LIGHT,
      align: 'center',
    });

    return hoveredIdx;
  }

  _drawInteractiveButton(ctx, cx, cy, w, h, text, isSelected, isHovered) {
    const t = this.animTime;
    const x = cx - w / 2;
    const y = cy - h / 2;

    ctx.save();

    if (isSelected || isHovered) {
      // Fondo luminoso translúcido con gradiente
      const btnGrad = ctx.createLinearGradient(x, y, x + w, y);
      btnGrad.addColorStop(0, 'rgba(232, 182, 58, 0.05)');
      btnGrad.addColorStop(0.5, 'rgba(232, 182, 58, 0.22)');
      btnGrad.addColorStop(1, 'rgba(232, 182, 58, 0.05)');
      ctx.fillStyle = btnGrad;
      ctx.fillRect(x, y, w, h);

      // Marco dorado con resplandor
      ctx.strokeStyle = PALETTE.TIME_GOLD;
      ctx.lineWidth = 1.5;
      ctx.strokeRect(x, y, w, h);

      // Ornamentos angulares en las 4 esquinas del botón
      this._drawButtonCorners(ctx, x, y, w, h);

      // Marcadores de flecha flotante a los lados
      const markerOffset = Math.sin(t * 8) * 4;
      this._drawMenuMarker(ctx, x - 18 - markerOffset, cy);
      this._drawMenuMarker(ctx, x + w + 18 + markerOffset, cy, true);
    } else {
      // Botón en reposo
      ctx.fillStyle = 'rgba(22, 18, 28, 0.5)';
      ctx.fillRect(x, y, w, h);
      ctx.strokeStyle = 'rgba(184, 142, 93, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(x, y, w, h);
    }

    // Texto del botón
    drawText(text, cx, cy + 1, {
      font: isSelected ? 'bold 22px "Cinzel", serif' : '20px "Cinzel", serif',
      color: isSelected ? PALETTE.TIME_GOLD_BRIGHT : PALETTE.SANDSTONE_LIGHT,
      align: 'center',
      baseline: 'middle',
      shadow: isSelected ? { color: 'rgba(232, 182, 58, 0.65)', blur: 12 } : null,
    });

    ctx.restore();
  }

  _drawButtonCorners(ctx, x, y, w, h) {
    ctx.strokeStyle = PALETTE.TIME_GOLD_BRIGHT;
    ctx.lineWidth = 2;
    const len = 6;

    // Sup Izq
    ctx.beginPath();
    ctx.moveTo(x, y + len); ctx.lineTo(x, y); ctx.lineTo(x + len, y);
    ctx.stroke();

    // Sup Der
    ctx.beginPath();
    ctx.moveTo(x + w - len, y); ctx.lineTo(x + w, y); ctx.lineTo(x + w, y + len);
    ctx.stroke();

    // Inf Izq
    ctx.beginPath();
    ctx.moveTo(x, y + h - len); ctx.lineTo(x, y + h); ctx.lineTo(x + len, y + h);
    ctx.stroke();

    // Inf Der
    ctx.beginPath();
    ctx.moveTo(x + w - len, y + h); ctx.lineTo(x + w, y + h); ctx.lineTo(x + w, y + h - len);
    ctx.stroke();
  }

  _drawGiantHourglass(ctx, cx, cy, time) {
    ctx.save();
    ctx.globalAlpha = 0.20;
    ctx.strokeStyle = PALETTE.TIME_GOLD;
    ctx.lineWidth = 3;

    // Silueta superior
    ctx.beginPath();
    ctx.moveTo(cx - 110, cy - 140);
    ctx.lineTo(cx + 110, cy - 140);
    ctx.lineTo(cx + 16, cy);
    ctx.lineTo(cx - 16, cy);
    ctx.closePath();
    ctx.stroke();

    // Silueta inferior
    ctx.beginPath();
    ctx.moveTo(cx - 16, cy);
    ctx.lineTo(cx + 16, cy);
    ctx.lineTo(cx + 110, cy + 140);
    ctx.lineTo(cx - 110, cy + 140);
    ctx.closePath();
    ctx.stroke();

    // Hilo de arena cayendo en bucle
    ctx.fillStyle = PALETTE.FLAME_LIGHT;
    ctx.fillRect(cx - 2, cy, 4, 110);

    // Duna de arena inferior
    ctx.beginPath();
    ctx.ellipse(cx, cy + 120, 60, 18, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawMenuPalaceArches(ctx) {
    ctx.save();
    ctx.strokeStyle = 'rgba(74, 57, 67, 0.35)';
    ctx.lineWidth = 2;

    // Arco izquierdo
    ctx.beginPath();
    ctx.moveTo(40, CANVAS.HEIGHT);
    ctx.lineTo(40, 160);
    ctx.quadraticCurveTo(80, 80, 120, 160);
    ctx.lineTo(120, CANVAS.HEIGHT);
    ctx.stroke();

    // Arco derecho
    ctx.beginPath();
    ctx.moveTo(CANVAS.WIDTH - 40, CANVAS.HEIGHT);
    ctx.lineTo(CANVAS.WIDTH - 40, 160);
    ctx.quadraticCurveTo(CANVAS.WIDTH - 80, 80, CANVAS.WIDTH - 120, 160);
    ctx.lineTo(CANVAS.WIDTH - 120, CANVAS.HEIGHT);
    ctx.stroke();

    ctx.restore();
  }

  _drawMenuMarker(ctx, x, y, flip = false) {
    ctx.save();
    ctx.translate(x, y);
    if (flip) ctx.scale(-1, 1);
    ctx.fillStyle = PALETTE.TIME_GOLD;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(-12, -7);
    ctx.lineTo(-8, 0);
    ctx.lineTo(-12, 7);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  // ─── 2. PANTALLA DE CONTROLES ──────────────────────────────────────────────
  drawControls(ctx) {
    const cx = CANVAS.WIDTH / 2;

    ctx.fillStyle = PALETTE.DEEP_SHADOW;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Marco exterior ornamental
    this._drawPersianFrame(ctx, 40, 24, CANVAS.WIDTH - 80, CANVAS.HEIGHT - 48);

    drawText('GUÍA DE CONTROLES', cx, 66, {
      font: 'bold 30px "Cinzel", serif',
      color: PALETTE.TIME_GOLD,
      align: 'center',
      shadow: { color: 'rgba(232, 182, 58, 0.45)', blur: 12 },
    });

    const list = [
      { key: 'A / D  ó  ← / →', action: 'Caminar y Correr por los pasadizos' },
      { key: 'W  ó  ESPACIO', action: 'Salto con coyote time y buffer fluido' },
      { key: 'SALTO + CORNISA', action: 'Quedar colgado; presiona W para trepar' },
      { key: 'S  ó  ↓', action: 'Agacharse / Soltar cornisa / Bajar plataforma' },
      { key: 'P  ó  ESC', action: 'Pausar partida y contemplar la mazmorra' },
      { key: 'R', action: 'Reiniciar nivel actual instantáneamente' },
      { key: 'M', action: 'Silenciar o reactivar el laúd y tambores' },
    ];

    const startY = 125;
    const spacing = 42;

    for (let i = 0; i < list.length; i++) {
      const item = list[i];
      const y = startY + i * spacing;

      // Caja de tecla estilizada
      ctx.fillStyle = PALETTE.STONE_DARK;
      ctx.fillRect(160, y - 14, 190, 28);
      ctx.strokeStyle = PALETTE.TIME_GOLD;
      ctx.lineWidth = 1;
      ctx.strokeRect(160, y - 14, 190, 28);

      drawText(item.key, 255, y, {
        font: 'bold 15px "Cinzel", serif',
        color: PALETTE.BONE_DUST,
        align: 'center',
      });

      drawText(item.action, 380, y, {
        font: '19px "Cormorant Garamond", serif',
        color: PALETTE.SANDSTONE_LIGHT,
        align: 'left',
      });
    }

    // Botón interactivo de retorno
    const backBtnW = 260;
    const backBtnH = 36;
    const backBtnY = CANVAS.HEIGHT - 65;
    const isHovered = this._isMouseOver(cx - backBtnW / 2, backBtnY - backBtnH / 2, backBtnW, backBtnH);

    this._drawInteractiveButton(ctx, cx, backBtnY, backBtnW, backBtnH, 'VOLVER AL MENÚ', isHovered, isHovered);

    return isHovered;
  }

  // ─── 3. HUD FLOTANTE MINIMALISTA Y ELEGANTE ────────────────────────────────
  /**
   * Dibuja el HUD flotante minimalista en la parte superior:
   * - Corazones joya tallados con reflejos.
   * - Vidas restantes con medallón.
   * - Reloj de arena animado + cronómetro digital (pulso de alerta en <= 10s).
   * - Puntuación y nombre del nivel actual.
   */
  drawHUD(ctx, vitals, session, levelName = '') {
    const hp = vitals.hp;
    const maxHp = vitals.maxHp;
    const lives = vitals.lives;
    const timeLeft = session.timeLeft;
    const score = session.score;

    ctx.save();

    // 1. Barra flotante con esquinas redondeadas y cristal traslúcido
    const hudW = CANVAS.WIDTH - 48;
    const hudH = 44;
    const hudX = 24;
    const hudY = 10;

    // Fondo oscuro glassmorphic
    const hudGrad = ctx.createLinearGradient(hudX, hudY, hudX, hudY + hudH);
    hudGrad.addColorStop(0, 'rgba(18, 14, 22, 0.92)');
    hudGrad.addColorStop(1, 'rgba(10, 8, 14, 0.82)');
    ctx.fillStyle = hudGrad;

    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, hudW, hudH, 8);
      ctx.fill();
    } else {
      ctx.fillRect(hudX, hudY, hudW, hudH);
    }

    // Borde biselado dorado fino
    ctx.strokeStyle = 'rgba(232, 182, 58, 0.4)';
    ctx.lineWidth = 1;
    if (typeof ctx.roundRect === 'function') {
      ctx.beginPath();
      ctx.roundRect(hudX, hudY, hudW, hudH, 8);
      ctx.stroke();
    } else {
      ctx.strokeRect(hudX, hudY, hudW, hudH);
    }

    // ── IZQUIERDA: Salud (Corazones joya) y Vidas ─────────────────
    const heartCenterY = hudY + hudH / 2;
    for (let i = 0; i < maxHp; i++) {
      const isFull = i < hp;
      this._drawPersianHeart(ctx, hudX + 24 + i * 26, heartCenterY, isFull);
    }

    // Icono de vidas
    this._drawLifeIcon(ctx, hudX + 116, heartCenterY);
    drawText(`x${lives}`, hudX + 132, heartCenterY, {
      font: 'bold 16px "Cinzel", serif',
      color: PALETTE.BONE_DUST,
      align: 'left',
    });

    // ── CENTRO: Reloj de Arena y Tiempo restante MM:SS ───────────
    const cx = CANVAS.WIDTH / 2;
    const minutes = Math.floor(timeLeft / 60);
    const seconds = Math.floor(timeLeft % 60);
    const timeStr = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

    // Efecto de urgencia si quedan <= 10 s (latido carmesí palpitante)
    const isCritical = timeLeft <= 10;
    const timeColor = isCritical ? PALETTE.CRIMSON : PALETTE.TIME_GOLD;
    const pulseScale = isCritical ? 1 + Math.sin(this.animTime * 12) * 0.14 : 1.0;

    ctx.save();
    ctx.translate(cx, heartCenterY);
    ctx.scale(pulseScale, pulseScale);

    this._drawMiniHourglass(ctx, -46, 0, isCritical);

    drawText(timeStr, 0, 0, {
      font: 'bold 22px "Cinzel", serif',
      color: timeColor,
      align: 'center',
      baseline: 'middle',
      shadow: isCritical ? { color: PALETTE.CRIMSON, blur: 12 } : null,
    });
    ctx.restore();

    // ── DERECHA: Puntuación formateada y Nivel ───────────────────
    const scoreStr = score.toString().padStart(6, '0');
    drawText(scoreStr, hudX + hudW - 18, heartCenterY - 7, {
      font: 'bold 17px "Cinzel", serif',
      color: PALETTE.TIME_GOLD,
      align: 'right',
      baseline: 'middle',
    });

    drawText(levelName.toUpperCase(), hudX + hudW - 18, heartCenterY + 9, {
      font: '11px "Cinzel", serif',
      color: PALETTE.SANDSTONE_LIGHT,
      align: 'right',
      baseline: 'middle',
    });

    ctx.restore();
  }

  _drawPersianHeart(ctx, x, y, full) {
    ctx.save();
    ctx.translate(x, y + 2);
    ctx.beginPath();
    ctx.moveTo(0, 4);
    ctx.bezierCurveTo(-7, -4, -10, -10, 0, -14);
    ctx.bezierCurveTo(10, -10, 7, -4, 0, 4);
    ctx.closePath();

    if (full) {
      // Rubí persa tallado con reflejo y resplandor
      ctx.fillStyle = PALETTE.CRIMSON;
      ctx.shadowColor = PALETTE.CRIMSON;
      ctx.shadowBlur = 6;
      ctx.fill();

      // Reflejo blanco en el lóbulo superior izquierdo
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(-3, -9, 1.5, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = PALETTE.FLAME_LIGHT;
      ctx.lineWidth = 1;
      ctx.stroke();
    } else {
      // Contenedor de corazón vacío
      ctx.fillStyle = 'rgba(38, 30, 36, 0.5)';
      ctx.fill();
      ctx.strokeStyle = PALETTE.STONE_LIGHT;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
    ctx.restore();
  }

  _drawLifeIcon(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    // Rostro miniatura estilizado
    ctx.fillStyle = PALETTE.BONE_DUST;
    ctx.beginPath();
    ctx.arc(0, 0, 6, 0, Math.PI * 2);
    ctx.fill();
    // Cinta carmesí con faja
    ctx.fillStyle = PALETTE.CRIMSON;
    ctx.fillRect(-6, -3, 12, 2.5);
    ctx.restore();
  }

  _drawMiniHourglass(ctx, x, y, critical) {
    ctx.save();
    ctx.translate(x, y);
    ctx.strokeStyle = critical ? PALETTE.CRIMSON : PALETTE.TIME_GOLD;
    ctx.lineWidth = 1.5;

    ctx.beginPath();
    ctx.moveTo(-6, -8);
    ctx.lineTo(6, -8);
    ctx.lineTo(0, 0);
    ctx.lineTo(6, 8);
    ctx.lineTo(-6, 8);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.stroke();

    ctx.fillStyle = critical ? PALETTE.CRIMSON : PALETTE.TIME_GOLD;
    ctx.fillRect(-2, 2, 4, 4);
    ctx.restore();
  }

  // ─── 4. PANTALLA DE PAUSA ──────────────────────────────────────────────────
  drawPause(ctx, selectedIndex = 0) {
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    // Overlay sombrío difuminado
    ctx.fillStyle = 'rgba(10, 8, 12, 0.82)';
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Marco persa central
    const panelW = 420;
    const panelH = 310;
    this._drawPersianFrame(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH);

    drawText('PAUSA', cx, cy - 105, {
      font: 'bold 34px "Cinzel", serif',
      color: PALETTE.TIME_GOLD,
      align: 'center',
      shadow: { color: 'rgba(232, 182, 58, 0.5)', blur: 14 },
    });

    drawText('El fluir del tiempo se ha detenido', cx, cy - 68, {
      font: 'italic 18px "Cormorant Garamond", serif',
      color: PALETTE.BONE_DUST,
      align: 'center',
    });

    // Opciones interactivas con ratón y teclado
    const opts = ['CONTINUAR PARTIDA', 'REINICIAR NIVEL', 'VOLVER AL MENÚ'];
    const startY = cy - 20;
    const spacing = 46;
    const btnW = 320;
    const btnH = 34;
    let hoveredIdx = null;

    for (let i = 0; i < opts.length; i++) {
      const btnY = startY + i * spacing;
      const isMouseOver = this._isMouseOver(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      if (isMouseOver) hoveredIdx = i;

      const isSel = (hoveredIdx === i) || (hoveredIdx === null && i === selectedIndex);
      this._drawInteractiveButton(ctx, cx, btnY, btnW, btnH, opts[i], isSel, isMouseOver);
    }

    return hoveredIdx;
  }

  // ─── 5. PANTALLA DE GAME OVER ──────────────────────────────────────────────
  drawGameOver(ctx, selectedIndex = 0, session = null, vitals = null) {
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;
    const t = this.animTime;

    // Overlay sombrío carmesí con pulso
    const pulseAlpha = 0.90 + Math.sin(t * 1.5) * 0.02;
    ctx.fillStyle = `rgba(12, 6, 8, ${pulseAlpha})`;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    const panelW = 520;
    const panelH = 360;
    this._drawPersianFrame(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, PALETTE.CRIMSON);

    // Título con efecto de resplandor carmesí pulsante
    const crimsonGlow = 8 + Math.sin(t * 2.5) * 6;
    drawText('EL TIEMPO SE HA AGOTADO', cx, cy - 130, {
      font: 'bold 30px "Cinzel", serif',
      color: PALETTE.CRIMSON,
      align: 'center',
      shadow: { color: 'rgba(156, 28, 32, 0.80)', blur: crimsonGlow },
    });

    drawText('Tu espíritu yace sepultado bajo las arenas de la mazmorra.', cx, cy - 92, {
      font: 'italic 18px "Cormorant Garamond", serif',
      color: PALETTE.BONE_DUST,
      align: 'center',
    });

    // Separador ornamental
    ctx.strokeStyle = 'rgba(156, 28, 32, 0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(cx - 160, cy - 62);
    ctx.lineTo(cx + 160, cy - 62);
    ctx.stroke();
    this._drawDiamond(ctx, cx, cy - 62, 5, PALETTE.CRIMSON);

    // Estadísticas en dos filas limpias
    if (session) {
      const elapsedMins = Math.floor((session.totalTimeElapsed || 0) / 60);
      const elapsedSecs = Math.floor((session.totalTimeElapsed || 0) % 60);
      const timeStr = `${elapsedMins.toString().padStart(2,'0')}m ${elapsedSecs.toString().padStart(2,'0')}s`;
      const scoreStr = session.score.toString().padStart(6, '0');
      const hsStr = (session.highScore || 0).toString().padStart(6, '0');
      const isNewRecord = session.score > 0 && session.score >= (session.highScore || 0);

      // Fila 1: Puntuación
      drawText(`PUNTUACIÓN`, cx - 90, cy - 36, {
        font: '12px "Cinzel", serif',
        color: PALETTE.SANDSTONE_LIGHT,
        align: 'center',
      });
      drawText(scoreStr, cx - 90, cy - 18, {
        font: 'bold 22px "Cinzel", serif',
        color: isNewRecord ? PALETTE.TIME_GOLD : PALETTE.BONE_DUST,
        align: 'center',
        shadow: isNewRecord ? { color: 'rgba(232, 182, 58, 0.6)', blur: 10 } : null,
      });
      if (isNewRecord) {
        drawText('¡NUEVO RÉCORD!', cx - 90, cy + 2, {
          font: 'italic 12px "Cormorant Garamond", serif',
          color: PALETTE.TIME_GOLD,
          align: 'center',
        });
      }

      // Divisor vertical
      ctx.strokeStyle = 'rgba(184, 142, 93, 0.25)';
      ctx.beginPath();
      ctx.moveTo(cx, cy - 44);
      ctx.lineTo(cx, cy + 10);
      ctx.stroke();

      // Fila 2: Tiempo e Nivel
      drawText(`TIEMPO SOBREVIVIDO`, cx + 90, cy - 36, {
        font: '12px "Cinzel", serif',
        color: PALETTE.SANDSTONE_LIGHT,
        align: 'center',
      });
      drawText(timeStr, cx + 90, cy - 18, {
        font: 'bold 22px "Cinzel", serif',
        color: PALETTE.BONE_DUST,
        align: 'center',
      });
      drawText(`Récord: ${hsStr}`, cx + 90, cy + 2, {
        font: '12px "Cinzel", serif',
        color: PALETTE.SANDSTONE_LIGHT,
        align: 'center',
      });
    }

    // Opciones
    const opts = ['REINTENTAR NIVEL', 'REINICIAR DESDE EL INICIO', 'VOLVER AL MENÚ'];
    const startY = cy + 24;
    const spacing = 44;
    const btnW = 340;
    const btnH = 34;
    let hoveredIdx = null;

    for (let i = 0; i < opts.length; i++) {
      const btnY = startY + i * spacing;
      const isMouseOver = this._isMouseOver(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      if (isMouseOver) hoveredIdx = i;

      const isSel = (hoveredIdx === i) || (hoveredIdx === null && i === selectedIndex);
      this._drawInteractiveButton(ctx, cx, btnY, btnW, btnH, opts[i], isSel, isMouseOver);
    }

    return hoveredIdx;
  }

  // ─── 6. PANTALLA DE VICTORIA ───────────────────────────────────────────────
  drawVictory(ctx, session, selectedIndex = 0) {
    const cx = CANVAS.WIDTH / 2;
    const cy = CANVAS.HEIGHT / 2;

    ctx.fillStyle = PALETTE.DEEP_SHADOW;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);

    // Rayos dorados de triunfo en rotación
    this._drawVictoryRays(ctx, cx, cy);

    const panelW = 540;
    const panelH = 370;
    this._drawPersianFrame(ctx, cx - panelW / 2, cy - panelH / 2, panelW, panelH, PALETTE.TIME_GOLD);

    drawText('VICTORIA ABSOLUTA', cx, cy - 130, {
      font: 'bold 38px "Cinzel", serif',
      color: PALETTE.TIME_GOLD,
      align: 'center',
      shadow: { color: 'rgba(232, 182, 58, 0.8)', blur: 24 },
    });

    drawText('¡Has burlado el destino y escapado de la Mazmorra del Tiempo!', cx, cy - 88, {
      font: 'italic 21px "Cormorant Garamond", serif',
      color: PALETTE.BONE_DUST,
      align: 'center',
    });

    // Panel de Estadísticas detalladas
    const elapsedMins = Math.floor((session.totalTimeElapsed || 0) / 60);
    const elapsedSecs = Math.floor((session.totalTimeElapsed || 0) % 60);
    const timeFormatted = `${elapsedMins}m ${elapsedSecs.toString().padStart(2, '0')}s`;

    const statsY = cy - 42;
    drawText(`Tiempo Total Transcurrido: ${timeFormatted}`, cx, statsY, {
      font: '18px "Cinzel", serif',
      color: PALETTE.BONE_DUST,
      align: 'center',
    });

    drawText(`Puntuación de la Odisea: ${session.score}`, cx, statsY + 30, {
      font: 'bold 20px "Cinzel", serif',
      color: PALETTE.FLAME_LIGHT,
      align: 'center',
    });

    drawText(`Récord Histórico: ${session.highScore}`, cx, statsY + 58, {
      font: '17px "Cinzel", serif',
      color: PALETTE.SANDSTONE_LIGHT,
      align: 'center',
    });

    // Botones interactivos
    const opts = ['JUGAR DE NUEVO', 'VOLVER AL MENÚ'];
    const startY = cy + 104;
    const spacing = 44;
    const btnW = 280;
    const btnH = 34;
    let hoveredIdx = null;

    for (let i = 0; i < opts.length; i++) {
      const btnY = startY + i * spacing;
      const isMouseOver = this._isMouseOver(cx - btnW / 2, btnY - btnH / 2, btnW, btnH);
      if (isMouseOver) hoveredIdx = i;

      const isSel = (hoveredIdx === i) || (hoveredIdx === null && i === selectedIndex);
      this._drawInteractiveButton(ctx, cx, btnY, btnW, btnH, opts[i], isSel, isMouseOver);
    }

    return hoveredIdx;
  }

  _drawVictoryRays(ctx, cx, cy) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = PALETTE.TIME_GOLD;
    const count = 16;
    const rot = this.animTime * 0.18;
    for (let i = 0; i < count; i++) {
      const angle = rot + (i * Math.PI * 2) / count;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, CANVAS.WIDTH * 0.75, angle, angle + 0.14);
      ctx.closePath();
      ctx.fill();
    }
    ctx.restore();
  }

  _drawDiamond(ctx, x, y, size, color) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, y - size);
    ctx.lineTo(x + size, y);
    ctx.lineTo(x, y + size);
    ctx.lineTo(x - size, y);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  _drawPersianFrame(ctx, x, y, w, h, strokeColor = PALETTE.TIME_GOLD) {
    ctx.save();
    // Fondo de panel translúcido
    ctx.fillStyle = 'rgba(18, 14, 22, 0.75)';
    ctx.fillRect(x, y, w, h);

    // Borde exterior
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = 1.5;
    ctx.strokeRect(x, y, w, h);

    // Borde interior fino
    ctx.strokeStyle = 'rgba(184, 142, 93, 0.35)';
    ctx.lineWidth = 1;
    ctx.strokeRect(x + 6, y + 6, w - 12, h - 12);

    // Ornamentos en las 4 esquinas
    this._drawCornerOrnament(ctx, x, y, 0, strokeColor);
    this._drawCornerOrnament(ctx, x + w, y, 1, strokeColor);
    this._drawCornerOrnament(ctx, x + w, y + h, 2, strokeColor);
    this._drawCornerOrnament(ctx, x, y + h, 3, strokeColor);

    ctx.restore();
  }

  _drawCornerOrnament(ctx, x, y, rot = 0, color = PALETTE.TIME_GOLD) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((rot * Math.PI) / 2);
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(14, 0);
    ctx.lineTo(0, 14);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

export const ui = new UI();
