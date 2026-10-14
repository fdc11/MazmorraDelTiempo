/**
 * config.js — Única fuente de verdad de constantes del juego.
 * Todos los módulos importan desde aquí; sin números mágicos en el código.
 */

/** Resolución lógica del canvas (independiente de la pantalla física). */
export const CANVAS = Object.freeze({
  WIDTH:  320,
  HEIGHT: 200,
});

/** Tamaño de tile en píxeles lógicos. */
export const TILE_SIZE = 16;

/** Frames por segundo objetivo del loop de lógica. */
export const TARGET_FPS = 60;

/** Duración fija de cada tick de lógica en segundos. */
export const FIXED_DT = 1 / TARGET_FPS;

/** Máximo delta acumulado antes de clamp (evita espiral de la muerte). */
export const MAX_DELTA = 0.25;

// ─── Física ───────────────────────────────────────────────────────────────────

export const PHYSICS = Object.freeze({
  /** Aceleración gravitatoria en píxeles lógicos / s². */
  GRAVITY:          480,
  /** Velocidad horizontal del jugador en px/s. */
  PLAYER_SPEED:     100,
  /** Impulso vertical al saltar en px/s (negativo = arriba). */
  JUMP_VELOCITY:   -260,
  /** Factor de fricción horizontal (multiplicador por frame). */
  FRICTION:           0.82,
});

// ─── Input — teclas mapeadas ──────────────────────────────────────────────────

export const KEYS = Object.freeze({
  LEFT:   ['ArrowLeft',  'KeyA'],
  RIGHT:  ['ArrowRight', 'KeyD'],
  UP:     ['ArrowUp',    'KeyW'],
  DOWN:   ['ArrowDown',  'KeyS'],
  JUMP:   ['Space', 'ArrowUp', 'KeyW'],
  ACTION: ['KeyE'],
  PAUSE:  ['KeyP', 'Escape'],
  RESTART:['KeyR'],
  CONFIRM:['Enter', 'Space'],
});

/** Teclas que deben suprimir el scroll del navegador. */
export const SCROLL_BLOCK_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space',
]);

// ─── Cámara ───────────────────────────────────────────────────────────────────

export const CAMERA = Object.freeze({
  /** Factor de lerp (suavizado) — 0 = sin seguimiento, 1 = instantáneo. */
  LERP: 0.1,
  /** Amplitud inicial del screen shake en px. */
  SHAKE_DECAY: 0.85,
});

// ─── Paleta de colores (máx. 16 tonos) ───────────────────────────────────────
// Tonos piedra azul-grisácea, naranja de antorcha, dorado para el tiempo.

export const PALETTE = Object.freeze({
  // Fondos y piedra
  VOID:        '#0a0c14',   // Negro absoluto del vacío
  STONE_DARK:  '#1a1f2e',   // Piedra oscura
  STONE_MID:   '#2d3550',   // Piedra media
  STONE_LIGHT: '#4a5580',   // Piedra clara / resalte
  // Antorcha / fuego
  TORCH_CORE:  '#ff9f1c',   // Naranja brillante
  TORCH_GLOW:  '#ff6b2b',   // Naranja profundo
  // Tiempo / dorado
  TIME_GOLD:   '#f0c040',   // Dorado del tiempo
  TIME_DIM:    '#a07820',   // Dorado opaco
  // Personaje / UI
  HERO_SKIN:   '#e8c090',   // Piel del héroe
  HERO_CLOTH:  '#3a5fa0',   // Ropa azul
  // Peligro / enemigos
  DANGER:      '#c0392b',   // Rojo peligro
  SPIKE:       '#7f8c8d',   // Gris pinchos
  // Texto / UI
  TEXT_WHITE:  '#f0f0f0',   // Texto principal
  TEXT_DIM:    '#8090a0',   // Texto secundario
  // Transparencias (usadas con globalAlpha)
  FADE_BLACK:  '#000000',
  OVERLAY:     '#000000',   // Con alpha 0.5 en fade
});

// ─── Estados de la máquina de estados ────────────────────────────────────────

export const STATE = Object.freeze({
  MENU:      'MENU',
  PLAYING:   'PLAYING',
  PAUSED:    'PAUSED',
  GAME_OVER: 'GAME_OVER',
  VICTORY:   'VICTORY',
});

// ─── Niveles disponibles ──────────────────────────────────────────────────────

/**
 * Lista ordenada de niveles. Para registrar un nivel nuevo, añadirlo aquí.
 * main.js los cargará con import() dinámico sin necesitar más cambios.
 */
export const LEVEL_MODULES = Object.freeze([
  'js/level1.js',
  'js/level2.js',
  'js/level3.js',
]);
