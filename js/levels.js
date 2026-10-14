/**
 * js/levels.js — Registro y lista ordenada de cargadores de niveles.
 * Issue #4 — Cambio de niveles | Rama: feature/sistema-niveles
 */

/**
 * Lista ordenada de cargadores dinámicos de niveles.
 * Para añadir un nivel nuevo al juego, únicamente se agrega una nueva línea a esta lista.
 */
export const LEVEL_LOADERS = [
  () => import('./level1.js'),
  () => import('./level2.js'),
  () => import('./level3.js'),
];

export default LEVEL_LOADERS;
