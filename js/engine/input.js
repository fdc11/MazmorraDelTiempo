/**
 * input.js — Manejo de teclado con estados por frame.
 *
 * Estados disponibles por tecla:
 *   down     → tecla está presionada en este frame
 *   pressed  → tecla se presionó justo este frame (flanco ascendente)
 *   released → tecla se soltó justo este frame  (flanco descendente)
 *
 * Los estados pressed / released se limpian al llamar a endFrame().
 */

import { SCROLL_BLOCK_KEYS } from '../config.js';

/** @type {Map<string, boolean>} Teclas actualmente presionadas. */
const downKeys = new Map();

/** @type {Set<string>} Teclas presionadas en este frame (flanco). */
const pressedKeys = new Set();

/** @type {Set<string>} Teclas soltadas en este frame (flanco). */
const releasedKeys = new Set();

// ─── Listeners de DOM ─────────────────────────────────────────────────────────

function onKeyDown(event) {
  // Evitar scroll del navegador con teclas de juego
  if (SCROLL_BLOCK_KEYS.has(event.code)) {
    event.preventDefault();
  }

  if (!downKeys.get(event.code)) {
    // Solo registrar flanco ascendente (ignorar key-repeat del SO)
    pressedKeys.add(event.code);
  }
  downKeys.set(event.code, true);
}

function onKeyUp(event) {
  downKeys.set(event.code, false);
  releasedKeys.add(event.code);
}

/** Limpia todos los estados al perder el foco (evita teclas "atascadas"). */
function onBlur() {
  downKeys.clear();
  pressedKeys.clear();
  releasedKeys.clear();
}

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Inicializa los listeners de teclado.
 * Llamar una sola vez desde main.js.
 */
export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup',   onKeyUp);
  window.addEventListener('blur',    onBlur);
}

/**
 * Limpia los estados de flanco al final de cada frame lógico.
 * Debe llamarse al final de cada ciclo de update en el game loop.
 */
export function endFrame() {
  pressedKeys.clear();
  releasedKeys.clear();
}

/**
 * Comprueba si alguna de las teclas del array está presionada ahora.
 * @param {string[]} codes — Array de KeyboardEvent.code
 * @returns {boolean}
 */
export function isDown(codes) {
  return codes.some(c => downKeys.get(c) === true);
}

/**
 * Comprueba si alguna de las teclas se presionó este frame (flanco).
 * @param {string[]} codes
 * @returns {boolean}
 */
export function isPressed(codes) {
  return codes.some(c => pressedKeys.has(c));
}

/**
 * Comprueba si alguna de las teclas se soltó este frame.
 * @param {string[]} codes
 * @returns {boolean}
 */
export function isReleased(codes) {
  return codes.some(c => releasedKeys.has(c));
}

/**
 * Devuelve un snapshot legible del estado actual de input.
 * Útil para la pantalla de debug / prueba temporal.
 * @returns {{ down: string[], pressed: string[] }}
 */
export function getDebugState() {
  return {
    down:    [...downKeys.entries()].filter(([, v]) => v).map(([k]) => k),
    pressed: [...pressedKeys],
  };
}
