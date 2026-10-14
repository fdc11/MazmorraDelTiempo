/**
 * loop.js — Game loop con timestep fijo (60 Hz) y acumulador.
 *
 * Diseño:
 *   - La lógica se ejecuta en pasos fijos de FIXED_DT segundos.
 *   - El render se ejecuta en cada frame de rAF con interpolación alpha.
 *   - Se clampea el delta máximo a MAX_DELTA para evitar la "espiral de la muerte"
 *     (p.ej. al volver de otra pestaña inactiva).
 *   - Se pausa automáticamente cuando la ventana pierde el foco.
 *
 * Uso:
 *   startLoop(updateFn, drawFn)
 *   stopLoop()
 *   pauseLoop() / resumeLoop()
 */

import { FIXED_DT, MAX_DELTA } from '../config.js';

/** ID del requestAnimationFrame activo. */
let rafId = null;

/** Acumulador de tiempo sin procesar (segundos). */
let accumulator = 0;

/** Timestamp del último frame (ms). */
let lastTime = 0;

/** Si el loop está en pausa voluntaria. */
let paused = false;

/** FPS medido para debug. */
let fps = 0;
let fpsFrameCount = 0;
let fpsAccum = 0;

/** Callbacks inyectados desde main.js. */
let onUpdate = null; // (dt: number) => void
let onDraw   = null; // (alpha: number) => void

// ─── Listener de visibilidad ──────────────────────────────────────────────────

function onBlur() {
  paused = true;
}

function onFocus() {
  // Al recuperar el foco, reseteamos lastTime para evitar un delta enorme
  lastTime = 0;
  paused = false;
}

// ─── Loop principal ───────────────────────────────────────────────────────────

/**
 * Frame principal ejecutado por requestAnimationFrame.
 * @param {number} timestamp — ms desde el inicio de la pestaña
 */
function frame(timestamp) {
  rafId = requestAnimationFrame(frame);

  if (paused) return;

  // Delta en segundos, clampado para evitar saltos
  if (lastTime === 0) lastTime = timestamp;
  const rawDelta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  const delta = Math.min(rawDelta, MAX_DELTA);

  // Medición de FPS
  fpsAccum += delta;
  fpsFrameCount++;
  if (fpsAccum >= 1) {
    fps = Math.round(fpsFrameCount / fpsAccum);
    fpsFrameCount = 0;
    fpsAccum = 0;
  }

  // Acumular tiempo y ejecutar tantos ticks lógicos como corresponda
  accumulator += delta;
  while (accumulator >= FIXED_DT) {
    onUpdate?.(FIXED_DT);
    accumulator -= FIXED_DT;
  }

  // Alpha de interpolación para el render (0..1)
  const alpha = accumulator / FIXED_DT;
  onDraw?.(alpha);
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicia el game loop.
 * @param {(dt: number) => void}     updateFn — Función de lógica fija
 * @param {(alpha: number) => void}  drawFn   — Función de render
 */
export function startLoop(updateFn, drawFn) {
  onUpdate = updateFn;
  onDraw   = drawFn;

  window.addEventListener('blur',  onBlur);
  window.addEventListener('focus', onFocus);

  lastTime    = 0;
  accumulator = 0;
  paused      = false;
  rafId       = requestAnimationFrame(frame);
}

/**
 * Detiene el game loop por completo.
 */
export function stopLoop() {
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.removeEventListener('blur',  onBlur);
  window.removeEventListener('focus', onFocus);
}

/**
 * Pausa el loop (sigue corriendo rAF pero no actualiza ni dibuja).
 */
export function pauseLoop() {
  paused = true;
}

/**
 * Reanuda el loop después de una pausa.
 */
export function resumeLoop() {
  lastTime = 0; // Evitar salto de tiempo al reanudar
  paused   = false;
}

/**
 * Devuelve los FPS medidos en el último segundo.
 * @returns {number}
 */
export function getFPS() {
  return fps;
}

/**
 * Indica si el loop está actualmente en pausa.
 * @returns {boolean}
 */
export function isPaused() {
  return paused;
}
