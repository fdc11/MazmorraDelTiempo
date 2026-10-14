/**
 * state.js — Máquina de estados finitos para el juego.
 *
 * Estados posibles (de config.js):
 *   MENU | PLAYING | PAUSED | GAME_OVER | VICTORY
 *
 * Cada estado puede definir hooks:
 *   enter(prevState)   → al entrar al estado
 *   update(dt, input)  → lógica por frame
 *   draw(ctx, r)       → renderizado por frame
 *   exit(nextState)    → al salir del estado
 *
 * Uso:
 *   on(STATE.MENU, { enter, update, draw, exit })
 *   change(STATE.PLAYING)
 *   updateState(dt, input)
 *   drawState(ctx, r)
 */

import { STATE } from '../config.js';

/** @type {string} Estado actual. */
let currentState = STATE.MENU;

/**
 * Mapa de estado → { enter, update, draw, exit }.
 * @type {Map<string, { enter?: Function, update?: Function, draw?: Function, exit?: Function }>}
 */
const handlers = new Map();

// ─── API pública ──────────────────────────────────────────────────────────────

/**
 * Registra los handlers para un estado.
 * Llamar antes de iniciar el loop.
 * @param {string} state — Una de las constantes STATE.*
 * @param {{ enter?: Function, update?: Function, draw?: Function, exit?: Function }} hooks
 */
export function on(state, hooks) {
  if (!Object.values(STATE).includes(state)) {
    console.warn(`[state] Estado desconocido: "${state}"`);
  }
  handlers.set(state, hooks);
}

/**
 * Cambia al estado indicado, llamando exit() del actual y enter() del nuevo.
 * Si ya estamos en ese estado, no hace nada.
 * @param {string} nextState
 */
export function change(nextState) {
  if (nextState === currentState) return;

  const prev = currentState;
  const prevHandler = handlers.get(prev);
  const nextHandler = handlers.get(nextState);

  // Salir del estado actual
  if (prevHandler?.exit) {
    prevHandler.exit(nextState);
  }

  currentState = nextState;

  // Entrar al nuevo estado
  if (nextHandler?.enter) {
    nextHandler.enter(prev);
  }
}

/**
 * Ejecuta el update del estado actual.
 * @param {number} dt    — Delta time fijo en segundos
 * @param {object} input — Referencia al módulo de input
 */
export function updateState(dt, input) {
  const handler = handlers.get(currentState);
  if (handler?.update) {
    handler.update(dt, input);
  }
}

/**
 * Ejecuta el draw del estado actual.
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} r — Referencia al módulo renderer (helpers)
 */
export function drawState(ctx, r) {
  const handler = handlers.get(currentState);
  if (handler?.draw) {
    handler.draw(ctx, r);
  }
}

/**
 * Devuelve el estado actual como string.
 * @returns {string}
 */
export function getState() {
  return currentState;
}

/**
 * Comprueba si estamos en el estado indicado.
 * @param {string} state
 * @returns {boolean}
 */
export function is(state) {
  return currentState === state;
}
