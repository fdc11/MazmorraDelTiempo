/**
 * js/engine/loop.js — Game loop con timestep fijo a 60 Hz, acumulador y control de foco.
 * Issue #1 — Base del motor | Rama: feature/base-motor
 */

import { FIXED_DT, MAX_DELTA } from '../config.js';

let rafId = null;
let accumulator = 0;
let lastTime = 0;
let isPaused = false;
let isRunning = false;

// Estadísticas de FPS para depuración
let fps = 60;
let fpsCount = 0;
let fpsTimer = 0;

let updateCallback = null;
let renderCallback = null;

function handleVisibility() {
  if (document.hidden) {
    isPaused = true;
  } else {
    lastTime = 0;
    accumulator = 0;
    isPaused = false;
  }
}

function handleBlur() {
  isPaused = true;
}

function handleFocus() {
  lastTime = 0;
  accumulator = 0;
  isPaused = false;
}

function tick(timestamp) {
  if (!isRunning) return;
  rafId = requestAnimationFrame(tick);

  if (isPaused) return;

  if (lastTime === 0) {
    lastTime = timestamp;
    return;
  }

  const rawDelta = (timestamp - lastTime) / 1000;
  lastTime = timestamp;
  const delta = Math.min(rawDelta, MAX_DELTA);

  // Cálculo de FPS
  fpsTimer += delta;
  fpsCount++;
  if (fpsTimer >= 1.0) {
    fps = Math.round(fpsCount / fpsTimer);
    fpsCount = 0;
    fpsTimer = 0;
  }

  // Ticks de física con paso fijo
  accumulator += delta;
  while (accumulator >= FIXED_DT) {
    if (updateCallback) {
      updateCallback(FIXED_DT);
    }
    accumulator -= FIXED_DT;
  }

  // Render con interpolación alpha
  const alpha = accumulator / FIXED_DT;
  if (renderCallback) {
    renderCallback(alpha);
  }
}

/**
 * Inicia el loop de juego.
 * @param {(dt: number) => void} onUpdate
 * @param {(alpha: number) => void} onRender
 */
export function startLoop(onUpdate, onRender) {
  updateCallback = onUpdate;
  renderCallback = onRender;

  if (isRunning) return;
  isRunning = true;
  isPaused = false;
  lastTime = 0;
  accumulator = 0;

  window.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('blur', handleBlur);
  window.addEventListener('focus', handleFocus);

  rafId = requestAnimationFrame(tick);
}

/**
 * Detiene el loop de juego.
 */
export function stopLoop() {
  isRunning = false;
  if (rafId) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
  window.removeEventListener('visibilitychange', handleVisibility);
  window.removeEventListener('blur', handleBlur);
  window.removeEventListener('focus', handleFocus);
}

export function pauseLoop() {
  isPaused = true;
}

export function resumeLoop() {
  lastTime = 0;
  accumulator = 0;
  isPaused = false;
}

export function getFPS() {
  return fps;
}
