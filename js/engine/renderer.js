/**
 * js/engine/renderer.js — Canvas 960×540 con escalado DPI de alta definición, letterbox y utilidades vectoriales.
 * Issue #1 — Base del motor | Rama: feature/base-motor
 */

import { CANVAS, PALETTE } from '../config.js';

let domCanvas = null;
let ctx = null;

let dpr = 1;
let cssWidth = CANVAS.WIDTH;
let cssHeight = CANVAS.HEIGHT;
let scaleFactor = 1;

/**
 * Inicializa el contexto del canvas y configura el redimensionamiento responsivo.
 * @param {HTMLCanvasElement} canvas
 */
export function initRenderer(canvas) {
  domCanvas = canvas;
  ctx = canvas.getContext('2d', { alpha: false });

  window.addEventListener('resize', handleResize);
  handleResize();
}

/**
 * Recalcula el tamaño del canvas preservando la relación 16:9 y aprovechando devicePixelRatio.
 */
export function handleResize() {
  if (!domCanvas || !ctx) return;

  const vw = window.innerWidth;
  const vh = window.innerHeight;

  dpr = window.devicePixelRatio || 1;

  // Ajuste manteniendo la relación de aspecto 16:9
  let w = vw;
  let h = vw / CANVAS.ASPECT;

  if (h > vh) {
    h = vh;
    w = vh * CANVAS.ASPECT;
  }

  cssWidth = Math.floor(w);
  cssHeight = Math.floor(h);

  // Dimensiones físicas del búfer basadas en DPR para vectores nítidos
  domCanvas.width = Math.round(cssWidth * dpr);
  domCanvas.height = Math.round(cssHeight * dpr);

  // Dimensiones visuales CSS
  domCanvas.style.width = `${cssWidth}px`;
  domCanvas.style.height = `${cssHeight}px`;

  // Factor de escala de coordenadas lógicas (960x540) a búfer físico
  scaleFactor = (cssWidth / CANVAS.WIDTH) * dpr;

  // Activar suavizado para ilustración vectorial
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
}

/**
 * Prepara el canvas para el renderizado del frame lógico actual.
 */
export function beginFrame() {
  if (!ctx) return;
  ctx.setTransform(scaleFactor, 0, 0, scaleFactor, 0, 0);
  ctx.imageSmoothingEnabled = true;

  // Fondo base profundo
  ctx.fillStyle = PALETTE.DEEP_SHADOW;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
}

// ─── Posprocesamiento: Screen Flash ──────────────────────────────────────────
let flashColor = 'rgba(180, 25, 30, 0.5)';
let flashAlpha = 0;
let flashTimer = 0;
let flashDuration = 0.2;

/**
 * Dispara un destello en toda la pantalla (p.ej. rojo al recibir daño o morir, o blanco al completar objetivo).
 * @param {string} color Color CSS (hex o rgba)
 * @param {number} [duration=0.25] Duración en segundos
 * @param {number} [maxAlpha=0.45] Opacidad máxima inicial
 */
export function triggerScreenFlash(color = 'rgba(180, 25, 30, 0.45)', duration = 0.25, maxAlpha = 0.45) {
  flashColor = color;
  flashDuration = Math.max(0.05, duration);
  flashTimer = flashDuration;
  flashAlpha = maxAlpha;
}

/**
 * Actualiza el decaimiento del screen flash.
 * @param {number} dt Delta time
 */
export function updateScreenFlash(dt) {
  if (flashTimer > 0) {
    flashTimer -= dt;
    const progress = Math.max(0, flashTimer / flashDuration);
    flashAlpha = progress * 0.45;
  } else {
    flashAlpha = 0;
  }
}

/**
 * Finaliza el frame de render aplicando posprocesamiento global (Screen Flash).
 */
export function endRenderFrame() {
  if (flashAlpha > 0.005 && ctx) {
    ctx.save();
    ctx.fillStyle = flashColor;
    ctx.globalAlpha = flashAlpha;
    ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
    ctx.restore();
  }
}

/**
 * Devuelve el contexto 2D activo.
 * @returns {CanvasRenderingContext2D}
 */
export function getCtx() {
  return ctx;
}

/**
 * Devuelve la escala actual entre px lógicos y CSS.
 */
export function getScale() {
  return cssWidth / CANVAS.WIDTH;
}

// ─── Helpers de Dibujo Vectorial ──────────────────────────────────────────────

/**
 * Dibuja un rectángulo relleno con opción de esquinas redondeadas.
 */
export function drawRect(x, y, w, h, color, radius = 0) {
  if (!ctx) return;
  ctx.fillStyle = color;
  if (radius > 0 && typeof ctx.roundRect === 'function') {
    ctx.beginPath();
    ctx.roundRect(x, y, w, h, radius);
    ctx.fill();
  } else {
    ctx.fillRect(x, y, w, h);
  }
}

/**
 * Dibuja un trazo de contorno rectangular.
 */
export function strokeRect(x, y, w, h, color, lineWidth = 1) {
  if (!ctx) return;
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, w, h);
}

/**
 * Dibuja un círculo relleno con opción de borde.
 */
export function drawCircle(x, y, radius, fillColor, strokeColor = null, lineWidth = 1) {
  if (!ctx || radius <= 0) return;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  if (fillColor) {
    ctx.fillStyle = fillColor;
    ctx.fill();
  }
  if (strokeColor) {
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

/**
 * Dibuja texto con tipografía estilizada y opción de sombra / halo.
 */
export function drawText(text, x, y, options = {}) {
  if (!ctx) return;
  const {
    font = '20px "Cinzel", serif',
    color = PALETTE.BONE_DUST,
    align = 'left',
    baseline = 'middle',
    shadow = null,
    stroke = null,
    strokeWidth = 2,
  } = options;

  ctx.save();
  ctx.font = font;
  ctx.textAlign = align;
  ctx.textBaseline = baseline;

  if (shadow) {
    ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.8)';
    ctx.shadowBlur = shadow.blur || 6;
    ctx.shadowOffsetX = shadow.x || 0;
    ctx.shadowOffsetY = shadow.y || 2;
  }

  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = strokeWidth;
    ctx.strokeText(text, x, y);
  }

  ctx.fillStyle = color;
  ctx.fillText(text, x, y);
  ctx.restore();
}

/**
 * Dibuja una capa de fundido de pantalla para transiciones o daño.
 */
export function fadeScreen(alpha, color = PALETTE.DEEP_SHADOW) {
  if (!ctx || alpha <= 0) return;
  ctx.save();
  ctx.fillStyle = color;
  ctx.globalAlpha = Math.min(1, Math.max(0, alpha));
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
  ctx.restore();
}

/**
 * Dibuja un halo de luz cálida radial con mezcla suave.
 */
export function drawRadialLight(x, y, radius, innerColor, outerColor = 'rgba(0,0,0,0)') {
  if (!ctx || radius <= 0) return;
  ctx.save();
  const grad = ctx.createRadialGradient(x, y, 0, x, y, radius);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(1, outerColor);
  ctx.fillStyle = grad;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
