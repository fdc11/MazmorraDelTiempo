/**
 * js/engine/camera.js — Cámara cinemática 2D con lerp, límites de mapa, look-ahead, shake y zoom.
 * Issue #1 — Base del motor | Rama: feature/base-motor
 */

import { CANVAS, CAMERA } from '../config.js';

let camX = 0;
let camY = 0;
let targetX = 0;
let targetY = 0;

let mapWidth  = CANVAS.WIDTH;
let mapHeight = CANVAS.HEIGHT;

let shakeAmplitude = 0;
let currentShakeX = 0;
let currentShakeY = 0;

let currentZoom = 1.0;
let targetZoom = 1.0;

/**
 * Inicializa la cámara con las dimensiones del mapa actual.
 * @param {number} wPx
 * @param {number} hPx
 */
export function initCamera(wPx, hPx) {
  mapWidth  = Math.max(CANVAS.WIDTH, wPx);
  mapHeight = Math.max(CANVAS.HEIGHT, hPx);

  camX = 0;
  camY = 0;
  targetX = 0;
  targetY = 0;
  shakeAmplitude = 0;
  currentShakeX = 0;
  currentShakeY = 0;
  currentZoom = 1.0;
  targetZoom = 1.0;
}

/**
 * Centra la cámara instantáneamente en un punto (útil para spawn o teletransporte).
 * @param {number} x
 * @param {number} y
 */
export function resetCamera(x, y) {
  camX = clamp(x - CANVAS.WIDTH / 2, 0, Math.max(0, mapWidth - CANVAS.WIDTH));
  camY = clamp(y - CANVAS.HEIGHT / 2, 0, Math.max(0, mapHeight - CANVAS.HEIGHT));
  targetX = camX;
  targetY = camY;
}

/**
 * Informa a la cámara de la posición y orientación del objetivo a seguir.
 * @param {number} x
 * @param {number} y
 * @param {number} facing 1 para derecha, -1 para izquierda
 */
export function followTarget(x, y, facing = 1) {
  const lookOffset = facing * (CAMERA.LOOK_AHEAD || 60);
  targetX = x + lookOffset - CANVAS.WIDTH / 2;
  targetY = y - CANVAS.HEIGHT / 2;
}

/**
 * Actualiza el lerp, decaimiento del shake y zoom.
 * @param {number} dt
 */
export function updateCamera(dt) {
  const lerpFactor = CAMERA.LERP || 0.08;

  camX += (targetX - camX) * lerpFactor;
  camY += (targetY - camY) * lerpFactor;

  // Clampear a los bordes del mapa
  const maxCamX = Math.max(0, mapWidth - CANVAS.WIDTH);
  const maxCamY = Math.max(0, mapHeight - CANVAS.HEIGHT);
  camX = clamp(camX, 0, maxCamX);
  camY = clamp(camY, 0, maxCamY);

  // Decaimiento del screen shake
  if (shakeAmplitude > 0.3) {
    currentShakeX = (Math.random() * 2 - 1) * shakeAmplitude;
    currentShakeY = (Math.random() * 2 - 1) * shakeAmplitude;
    shakeAmplitude *= CAMERA.SHAKE_DECAY;
  } else {
    shakeAmplitude = 0;
    currentShakeX = 0;
    currentShakeY = 0;
  }

  // Interpolación de zoom
  currentZoom += (targetZoom - currentZoom) * 0.1;
}

/**
 * Inicia una sacudida de pantalla con decaimiento.
 * @param {number} amplitude
 */
export function startShake(amplitude) {
  shakeAmplitude = Math.max(shakeAmplitude, amplitude);
}

/**
 * Define el zoom deseado (1.0 = normal, 1.15 = leve zoom de muerte).
 * @param {number} zoom
 */
export function setZoom(zoom) {
  targetZoom = zoom;
}

/**
 * Convierte coordenadas de mundo a coordenadas lógicas de pantalla considerando shake y zoom.
 * @param {number} wx
 * @param {number} wy
 * @returns {{ x: number, y: number }}
 */
export function worldToScreen(wx, wy) {
  const rawX = wx - camX + currentShakeX;
  const rawY = wy - camY + currentShakeY;

  if (Math.abs(currentZoom - 1.0) < 0.001) {
    return { x: rawX, y: rawY };
  }

  // Escalar desde el centro de la pantalla
  const cx = CANVAS.WIDTH / 2;
  const cy = CANVAS.HEIGHT / 2;
  return {
    x: cx + (rawX - cx) * currentZoom,
    y: cy + (rawY - cy) * currentZoom,
  };
}

/**
 * Devuelve el área visible actual en coordenadas de mundo.
 */
export function getVisibleBounds() {
  return {
    left:   camX - 60,
    top:    camY - 60,
    right:  camX + CANVAS.WIDTH + 60,
    bottom: camY + CANVAS.HEIGHT + 60,
  };
}

export function getCameraPos() {
  return { x: camX, y: camY, shakeX: currentShakeX, shakeY: currentShakeY, zoom: currentZoom };
}

function clamp(val, min, max) {
  return Math.max(min, Math.min(max, val));
}
