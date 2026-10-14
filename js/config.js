/**
 * config.js — Constantes globales del juego, paleta cromática, física y estados.
 * Issue #1 — Base del motor | Rama: feature/base-motor
 */

/** Resolución lógica fija del canvas (16:9) */
export const CANVAS = Object.freeze({
  WIDTH:  960,
  HEIGHT: 540,
  ASPECT: 16 / 9,
});

/** Tamaño base de celda / tile en píxeles lógicos */
export const TILE_SIZE = 48;

/** Frecuencia de actualización fija */
export const TARGET_FPS = 60;
export const FIXED_DT   = 1 / TARGET_FPS;
export const MAX_DELTA  = 0.25;

// ─── Paleta de colores oficial Dark Fantasy / Dungeon Retro-Moderno ─────────
export const PALETTE = Object.freeze({
  // Sombras y muros de piedra
  DEEP_SHADOW:      '#0e0a10', // Sombra profunda / abismo
  NIGHT:            '#16121c', // Muro lejano
  STONE_DARK:       '#262029', // Piedra gris oscura
  STONE_MID:        '#3a323d', // Piedra gris sillar
  STONE_LIGHT:      '#5c5261', // Relieve de piedra
  SANDSTONE_DARK:   '#342822', // Arenisca oscura
  SANDSTONE:        '#523e33', // Arenisca intermedia
  SANDSTONE_MID:    '#7a5e46', // Arenisca labrada
  SANDSTONE_LIGHT:  '#b88e5d', // Arenisca clara / bordes
  BONE_DUST:        '#e8dab8', // Polvo / hueso antiguo

  // Joyas, azulejos y acentos
  LAPIS:            '#1a335c', // Lapislázuli profundo
  TILE_BLUE:        '#284e94', // Mosaico azul
  TURQUOISE:        '#28a397', // Turquesa místico
  TURQUOISE_GLOW:   '#4ae0d2', // Brillo de fuego mágico

  // Fuego de antorcha y oro del tiempo
  FIRE_DARK:        '#d44a1c', // Base de llama ardiente
  FIRE:             '#ff8326', // Llama de antorcha
  FLAME_LIGHT:      '#ffcc66', // Núcleo amarillo incandescente
  TIME_GOLD:        '#e8b63a', // Oro antiguo del tiempo
  TIME_GOLD_BRIGHT: '#ffdf7a', // Destello dorado / glint

  // Peligro y metal oxidado
  RUST_DARK:        '#42231d', // Hierro oxidado oscuro
  RUST_LIGHT:       '#7d4233', // Óxido anaranjado
  METAL_EDGE:       '#d1d5db', // Filo metálico afilado
  CRIMSON:          '#9c1c20', // Sangre / faja carmesí
  CRIMSON_DARK:     '#5e1215', // Carmesí oscuro
  CRIMSON_FLASH:    'rgba(180, 25, 30, 0.45)', // Screen flash al recibir daño
});

// ─── Física del jugador y Game Feel (Tight Controls) ─────────────────────────
/**
 * Parámetros de física calibrados para máxima reactividad y sensación de peso:
 * - Coyote Time (120ms) y Jump Buffer (120ms) para cero pérdida de pulsaciones.
 * - Gravedad asimétrica: 1560 px/s² en ascenso, multiplicador de 1.35x en descenso
 *   para evitar la sensación "flotante" y lograr saltos ágiles y nítidos.
 * - Corner Nudge (5px): tolerancia en bordes de plataformas para evitar frustración.
 */
export const PHYSICS = Object.freeze({
  GRAVITY:               1560,     // px/s²
  FALL_GRAVITY_MULT:     1.35,     // Caída más rápida y ágil (evita salto flotante)
  RUN_SPEED:             270,      // px/s
  WALK_SPEED:            150,      // px/s
  ACCEL_GROUND:          2400,     // px/s² (aceleración inmediata)
  ACCEL_AIR:             1300,     // px/s² (control aéreo responsivo)
  FRICTION_GROUND:       0.78,     // Desaceleración reactiva
  FRICTION_AIR:          0.94,     // Desaceleración aérea
  JUMP_IMPULSE:         -630,      // px/s (impulso de salto inicial)
  JUMP_CUT_VY:          -200,      // px/s clamp al soltar salto anticipadamente
  TERMINAL_VELOCITY:     880,      // px/s velocidad terminal de caída
  COYOTE_TIME:           0.12,     // 120 ms de gracia al dejar el borde
  JUMP_BUFFER:           0.12,     // 120 ms de buffer antes de tocar suelo
  CORNER_NUDGE_PX:       5,        // Ajuste milimétrico de esquinas para evitar colisiones bruscas

  // Dimensiones de Hitbox del personaje (px)
  HITBOX_WIDTH:          26,
  HITBOX_HEIGHT:         68,
  CROUCH_HEIGHT:         40,

  // Límites teóricos de nivel
  MAX_JUMP_HEIGHT_TILES: 2.6,
  MAX_JUMP_DIST_TILES:   4.5,
  MAX_SAFE_STEP_TILES:   2.6 * 0.85, // 2.21 tiles
  MAX_SAFE_GAP_TILES:    4.5 * 0.85, // 3.82 tiles
});

// ─── Controles y teclas ──────────────────────────────────────────────────────
export const KEYS = Object.freeze({
  LEFT:    ['ArrowLeft', 'KeyA'],
  RIGHT:   ['ArrowRight', 'KeyD'],
  UP:      ['ArrowUp', 'KeyW'],
  DOWN:    ['ArrowDown', 'KeyS'],
  JUMP:    ['Space', 'ArrowUp', 'KeyW'],
  ACTION:  ['KeyE'],
  PAUSE:   ['KeyP', 'Escape'],
  RESTART: ['KeyR'],
  CONFIRM: ['Enter', 'Space'],
  MUTE:    ['KeyM'],
});

export const SCROLL_BLOCK_KEYS = new Set([
  'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Space', 'KeyW', 'KeyS', 'KeyA', 'KeyD'
]);

// ─── Cámara y efectos ────────────────────────────────────────────────────────
export const CAMERA = Object.freeze({
  LERP:        0.09,
  LOOK_AHEAD:  60,     // px hacia donde mira el personaje
  SHAKE_DECAY: 0.85,
});

// ─── Estados del juego ───────────────────────────────────────────────────────
export const STATE = Object.freeze({
  MENU:      'MENU',
  CONTROLS:  'CONTROLS',
  INTRO:     'INTRO',
  PLAYING:   'PLAYING',
  PAUSED:    'PAUSED',
  GAME_OVER: 'GAME_OVER',
  VICTORY:   'VICTORY',
});

// ─── Rutas de niveles cargables ──────────────────────────────────────────────
export const LEVEL_MODULES = Object.freeze([
  'js/level1.js',
  'js/level2.js',
  'js/level3.js',
]);
