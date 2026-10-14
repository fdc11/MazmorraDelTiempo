/**
 * js/engine/input.js — Manejo de teclado: down, pressed y released por frame con preventDefault.
 * Issue #1 — Base del motor | Rama: feature/base-motor
 */

import { KEYS, SCROLL_BLOCK_KEYS } from '../config.js';

const downKeys = new Map();
const pressedKeys = new Set();
const releasedKeys = new Set();

// Soporte para captura de primer input para desbloqueo de audio
let hasInteracted = false;
const interactionCallbacks = new Set();

function onKeyDown(event) {
  if (SCROLL_BLOCK_KEYS.has(event.code)) {
    event.preventDefault();
  }

  if (!hasInteracted) {
    hasInteracted = true;
    for (const cb of interactionCallbacks) cb();
  }

  if (!downKeys.get(event.code)) {
    pressedKeys.add(event.code);
  }
  downKeys.set(event.code, true);
}

function onKeyUp(event) {
  downKeys.set(event.code, false);
  releasedKeys.add(event.code);
}

function onBlur() {
  downKeys.clear();
  pressedKeys.clear();
  releasedKeys.clear();
}

function onPointerDown() {
  if (!hasInteracted) {
    hasInteracted = true;
    for (const cb of interactionCallbacks) cb();
  }
}

/**
 * Inicializa los listeners del DOM.
 */
export function initInput() {
  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onBlur);
  window.addEventListener('pointerdown', onPointerDown);
}

/**
 * Registra un callback que se ejecuta tras la primera interacción (click o tecla).
 * @param {() => void} cb
 */
export function onFirstInteraction(cb) {
  if (hasInteracted) {
    cb();
  } else {
    interactionCallbacks.add(cb);
  }
}

/**
 * Limpia los flancos ascendentes y descendentes al finalizar el frame lógico.
 */
export function endFrame() {
  pressedKeys.clear();
  releasedKeys.clear();
}

/**
 * Comprueba si alguna tecla de la lista o acción está presionada.
 * @param {string[]|string} codes
 * @returns {boolean}
 */
export function isDown(codes) {
  if (typeof codes === 'string') {
    if (KEYS[codes]) return isDown(KEYS[codes]);
    return downKeys.get(codes) === true;
  }
  return codes.some(c => downKeys.get(c) === true);
}

/**
 * Comprueba si alguna tecla fue pulsada justo en este frame.
 * @param {string[]|string} codes
 * @returns {boolean}
 */
export function isPressed(codes) {
  if (typeof codes === 'string') {
    if (KEYS[codes]) return isPressed(KEYS[codes]);
    return pressedKeys.has(codes);
  }
  return codes.some(c => pressedKeys.has(c));
}

/**
 * Comprueba si alguna tecla fue soltada justo en este frame.
 * @param {string[]|string} codes
 * @returns {boolean}
 */
export function isReleased(codes) {
  if (typeof codes === 'string') {
    if (KEYS[codes]) return isReleased(KEYS[codes]);
    return releasedKeys.has(codes);
  }
  return codes.some(c => releasedKeys.has(c));
}

export function getDebugState() {
  const active = [];
  for (const [code, val] of downKeys.entries()) {
    if (val) active.push(code);
  }
  return { active, pressed: Array.from(pressedKeys) };
}
