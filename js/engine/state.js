/**
 * js/engine/state.js — Máquina de estados finitos del juego (MENU, CONTROLS, INTRO, PLAYING, PAUSED, GAME_OVER, VICTORY).
 * Issue #1 — Base del motor | Rama: feature/base-motor
 */

import { STATE } from '../config.js';

let currentState = STATE.MENU;
const handlers = new Map();

/**
 * Registra los ganchos de ciclo de vida para un estado.
 * @param {string} state
 * @param {{ enter?: (prev: string, data?: any) => void, update?: (dt: number, input: any) => void, draw?: (ctx: CanvasRenderingContext2D, r: any) => void, exit?: (next: string) => void }} hooks
 */
export function on(state, hooks) {
  handlers.set(state, hooks);
}

/**
 * Cambia al nuevo estado disparando exit() del anterior y enter() del nuevo.
 * @param {string} nextState
 * @param {any} [data] Datos opcionales pasados al hook enter
 */
export function change(nextState, data = null) {
  if (nextState === currentState && !data) return;

  const prev = currentState;
  const prevHandler = handlers.get(prev);
  const nextHandler = handlers.get(nextState);

  if (prevHandler?.exit) {
    prevHandler.exit(nextState);
  }

  currentState = nextState;

  if (nextHandler?.enter) {
    nextHandler.enter(prev, data);
  }
}

/**
 * Ejecuta la actualización lógica del estado activo.
 * @param {number} dt
 * @param {any} input
 */
export function updateState(dt, input) {
  const handler = handlers.get(currentState);
  if (handler?.update) {
    handler.update(dt, input);
  }
}

/**
 * Ejecuta el renderizado del estado activo.
 * @param {CanvasRenderingContext2D} ctx
 * @param {any} renderer
 */
export function drawState(ctx, renderer) {
  const handler = handlers.get(currentState);
  if (handler?.draw) {
    handler.draw(ctx, renderer);
  }
}

export function getState() {
  return currentState;
}
