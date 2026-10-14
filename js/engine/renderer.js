/**
 * renderer.js — Canvas lógico 320×200 escalado a pantalla física.
 *
 * Estrategia de escalado:
 *   1. Se calcula el máximo entero k tal que k*320 ≤ vw y k*200 ≤ vh.
 *   2. Si no hay entero válido (ventana muy pequeña), se usa el máximo float.
 *   3. image-rendering: pixelated en CSS + imageSmoothingEnabled = false en 2D.
 *
 * Uso:
 *   initRenderer(canvasEl)  → llamar una sola vez al inicio
 *   beginFrame()            → llamar al inicio de cada frame de render
 *   endRenderFrame()        → restaura transform
 *   helpers: drawRect, drawText, fadeScreen, etc.
 */

import { CANVAS, PALETTE } from '../config.js';

/** @type {HTMLCanvasElement} Canvas del DOM. */
let domCanvas;

/** @type {CanvasRenderingContext2D} Contexto 2D del canvas. */
let ctx;

/** Escala actual (px físicos por px lógico). */
let scale = 1;

/** Offset horizontal (para letterboxing). */
let offsetX = 0;

/** Offset vertical (para pillarboxing). */
let offsetY = 0;

// ─── Inicialización ───────────────────────────────────────────────────────────

/**
 * Inicializa el renderer enlazándolo con el canvas del DOM.
 * @param {HTMLCanvasElement} canvas
 */
export function initRenderer(canvas) {
  domCanvas = canvas;
  ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Escalar al tamaño inicial de ventana
  handleResize();

  // Recalcular escala cuando cambie el tamaño de la ventana
  window.addEventListener('resize', handleResize);
}

/**
 * Recalcula la escala y ajusta el tamaño físico del canvas.
 * Se llama automáticamente en cada evento resize.
 */
export function handleResize() {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  // Escala entera máxima
  const kw = Math.floor(vw / CANVAS.WIDTH);
  const kh = Math.floor(vh / CANVAS.HEIGHT);
  const intScale = Math.max(1, Math.min(kw, kh));

  // Si la escala entera encaja, la usamos; si no, usamos la float mínima
  const floatScale = Math.min(vw / CANVAS.WIDTH, vh / CANVAS.HEIGHT);
  scale = (intScale * CANVAS.WIDTH <= vw && intScale * CANVAS.HEIGHT <= vh)
    ? intScale
    : floatScale;

  // Actualizar tamaño físico del canvas
  domCanvas.width  = Math.round(CANVAS.WIDTH  * scale);
  domCanvas.height = Math.round(CANVAS.HEIGHT * scale);

  // Centrar con CSS si hay espacio extra
  offsetX = Math.floor((vw - domCanvas.width)  / 2);
  offsetY = Math.floor((vh - domCanvas.height) / 2);

  domCanvas.style.left = `${offsetX}px`;
  domCanvas.style.top  = `${offsetY}px`;

  // Restaurar smoothing tras resize (algunos navegadores lo resetean)
  ctx.imageSmoothingEnabled = false;
}

// ─── Frame lifecycle ──────────────────────────────────────────────────────────

/**
 * Aplica el transform de escala y limpia el canvas.
 * Llamar al inicio de cada frame de render.
 */
export function beginFrame() {
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.clearRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
}

/**
 * Restaura el transform a identidad.
 * Llamar al final de cada frame de render.
 */
export function endRenderFrame() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
}

/**
 * Devuelve el contexto 2D para que otros módulos puedan dibujar.
 * @returns {CanvasRenderingContext2D}
 */
export function getCtx() {
  return ctx;
}

/**
 * Devuelve la escala actual (útil para la cámara y el input de ratón).
 * @returns {number}
 */
export function getScale() {
  return scale;
}

// ─── Helpers de dibujo ───────────────────────────────────────────────────────

/**
 * Dibuja un rectángulo relleno en coordenadas lógicas.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} color — Color CSS
 */
export function drawRect(x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h));
}

/**
 * Dibuja el contorno de un rectángulo en coordenadas lógicas.
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {string} color
 * @param {number} [lineWidth=1]
 */
export function drawRectStroke(x, y, w, h, color, lineWidth = 1) {
  ctx.strokeStyle = color;
  ctx.lineWidth   = lineWidth;
  ctx.strokeRect(Math.round(x) + 0.5, Math.round(y) + 0.5, Math.round(w), Math.round(h));
}

/**
 * Dibuja texto en coordenadas lógicas con la fuente pixel del juego.
 * @param {string}  text
 * @param {number}  x
 * @param {number}  y
 * @param {string}  color
 * @param {number}  [size=6]   — Tamaño en px lógicos
 * @param {string}  [align='left']
 */
export function drawText(text, x, y, color, size = 6, align = 'left') {
  ctx.fillStyle    = color;
  ctx.font         = `${size}px "Press Start 2P", monospace`;
  ctx.textAlign    = align;
  ctx.textBaseline = 'top';
  ctx.fillText(text, Math.round(x), Math.round(y));
}

/**
 * Dibuja un fade de pantalla con un color sólido y alpha dado.
 * Útil para transiciones entre estados.
 * @param {string} color — Color CSS (sin alpha)
 * @param {number} alpha — 0.0 (transparente) a 1.0 (opaco)
 */
export function fadeScreen(color, alpha) {
  ctx.globalAlpha = Math.max(0, Math.min(1, alpha));
  ctx.fillStyle   = color;
  ctx.fillRect(0, 0, CANVAS.WIDTH, CANVAS.HEIGHT);
  ctx.globalAlpha = 1;
}

/**
 * Dibuja un sprite (recorte de imagen) en coordenadas lógicas.
 * @param {HTMLImageElement|HTMLCanvasElement} img
 * @param {number} sx  — Origen X en la hoja de sprites
 * @param {number} sy  — Origen Y en la hoja de sprites
 * @param {number} sw  — Ancho del sprite
 * @param {number} sh  — Alto del sprite
 * @param {number} dx  — Destino X lógico
 * @param {number} dy  — Destino Y lógico
 * @param {number} [dw] — Ancho de destino (por defecto sw)
 * @param {number} [dh] — Alto de destino (por defecto sh)
 */
export function drawSprite(img, sx, sy, sw, sh, dx, dy, dw = sw, dh = sh) {
  ctx.drawImage(
    img,
    sx, sy, sw, sh,
    Math.round(dx), Math.round(dy), dw, dh,
  );
}
