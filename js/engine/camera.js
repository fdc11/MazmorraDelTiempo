/**
 * camera.js — Cámara 2D con seguimiento suavizado y screen shake.
 *
 * La cámara transforma coordenadas de mundo a coordenadas de pantalla lógica.
 * Para dibujar: x_screen = x_world - camera.x
 *
 * Uso:
 *   initCamera(mapW, mapH)  → define límites del mapa
 *   updateCamera(dt)        → avanza lerp y decaimiento del shake
 *   followTarget(x, y)      → informa posición del objetivo (p.ej. jugador)
 *   startShake(amplitude)   → inicia screen shake
 *   worldToScreen(x, y)     → convierte coordenadas de mundo a pantalla
 */

import { CANVAS, CAMERA } from '../config.js';

/** Posición actual de la cámara en coordenadas de mundo (esquina superior izquierda). */
let camX = 0;
let camY = 0;

/** Posición objetivo hacia la que la cámara hace lerp. */
let targetX = 0;
let targetY = 0;

/** Límites del mapa en px lógicos (para no salir fuera). */
let mapWidth  = CANVAS.WIDTH;
let mapHeight = CANVAS.HEIGHT;

/** Estado del screen shake. */
let shakeAmplitude = 0;

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicializa la cámara con los límites del mapa.
 * @param {number} mapW — Ancho del mapa en px lógicos
 * @param {number} mapH — Alto del mapa en px lógicos
 */
export function initCamera(mapW, mapH) {
  mapWidth  = mapW;
  mapHeight = mapH;
  camX = 0;
  camY = 0;
  targetX = 0;
  targetY = 0;
  shakeAmplitude = 0;
}

/**
 * Informa a la cámara de la posición del objetivo a seguir.
 * Normalmente se llama con el centro del jugador cada frame.
 * @param {number} x — Centro del objetivo en mundo X
 * @param {number} y — Centro del objetivo en mundo Y
 */
export function followTarget(x, y) {
  // La cámara centra al objetivo en la pantalla lógica
  targetX = x - CANVAS.WIDTH  / 2;
  targetY = y - CANVAS.HEIGHT / 2;
}

/**
 * Avanza el estado de la cámara (lerp + shake decay).
 * Llamar una vez por frame lógico.
 * @param {number} dt — Delta time fijo en segundos
 */
export function updateCamera(dt) {
  // Lerp hacia el objetivo (independiente del dt para suavidad uniforme)
  camX += (targetX - camX) * CAMERA.LERP;
  camY += (targetY - camY) * CAMERA.LERP;

  // Clamp a los límites del mapa
  camX = clamp(camX, 0, Math.max(0, mapWidth  - CANVAS.WIDTH));
  camY = clamp(camY, 0, Math.max(0, mapHeight - CANVAS.HEIGHT));

  // Decaimiento exponencial del shake
  shakeAmplitude *= CAMERA.SHAKE_DECAY;
  if (shakeAmplitude < 0.5) shakeAmplitude = 0;
}

/**
 * Inicia un screen shake con la amplitud dada.
 * @param {number} amplitude — Amplitud inicial en px lógicos
 */
export function startShake(amplitude) {
  shakeAmplitude = Math.max(shakeAmplitude, amplitude);
}

/**
 * Convierte coordenadas de mundo a coordenadas de pantalla lógica.
 * @param {number} worldX
 * @param {number} worldY
 * @returns {{ x: number, y: number }}
 */
export function worldToScreen(worldX, worldY) {
  const shakeX = shakeAmplitude > 0 ? randRange(-shakeAmplitude, shakeAmplitude) : 0;
  const shakeY = shakeAmplitude > 0 ? randRange(-shakeAmplitude, shakeAmplitude) : 0;

  return {
    x: worldX - camX + shakeX,
    y: worldY - camY + shakeY,
  };
}

/**
 * Devuelve la posición actual de la cámara (útil para culling).
 * @returns {{ x: number, y: number }}
 */
export function getCameraPos() {
  return { x: camX, y: camY };
}

/**
 * Aplica el transform de cámara al contexto 2D para dibujar en coordenadas de mundo.
 * Usar junto con resetCameraTransform().
 * @param {CanvasRenderingContext2D} ctx
 */
export function applyCameraTransform(ctx) {
  const shakeX = shakeAmplitude > 0 ? randRange(-shakeAmplitude, shakeAmplitude) : 0;
  const shakeY = shakeAmplitude > 0 ? randRange(-shakeAmplitude, shakeAmplitude) : 0;

  ctx.save();
  ctx.translate(
    Math.round(-camX + shakeX),
    Math.round(-camY + shakeY),
  );
}

/**
 * Restaura el transform de cámara.
 * @param {CanvasRenderingContext2D} ctx
 */
export function resetCameraTransform(ctx) {
  ctx.restore();
}

// ─── Utilidades internas ──────────────────────────────────────────────────────

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function randRange(min, max) {
  return min + Math.random() * (max - min);
}
