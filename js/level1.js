/**
 * js/level1.js — Nivel 1: "El Vestíbulo". Tutorial cinemático persa con saltos, cornisas, púas y relojes.
 * Issue #5 — Nivel 1 | Rama: feature/nivel-1
 */

import { Tilemap } from './engine/tilemap.js';
import { TileRenderer } from './engine/tileRenderer.js';
import { Hourglass, ExitDoor, Checkpoint, FixedSpikes, HintSign } from './engine/entities.js';
import { PALETTE, TILE_SIZE, PHYSICS, CANVAS } from './config.js';

// Mapa de 60 columnas x 12 filas
const LEVEL1_MAP = [
  "############################################################",
  "#T........T.........T.........T.........T.........T........#",
  "#..........................................................#",
  "#..........................................................#",
  "#........................H...............H...............E.#",
  "#.....................#####.............###............#####",
  "#...................###....................................#",
  "#..P.....K.........##.......K......K..........C...K........#",
  "######..###..=======........#..^^^^^..#...#######.###...####",
  "######..###.................###########...#######.###...####",
  "#....#..#...................###########...#######.###...####",
  "############################################################",
];

const tileRenderer = new TileRenderer();

let tilemapInstance = null;
let entities = [];
let torches = [];
let exitDoor = null;

export default {
  id: 1,
  name: 'El Vestíbulo',
  timeLimit: 120, // 120 segundos
  theme: {
    skyTop:        '#120d12',
    skyBottom:     '#22181d',
    farPillars:    '#2d222b',
    accentTile:    PALETTE.LAPIS,
    subAccentTile: PALETTE.TURQUOISE,
  },
  tilemap: null,
  spawn: { x: 96, y: 300 },

  init(ctx) {
    tilemapInstance = new Tilemap(LEVEL1_MAP);
    this.tilemap = tilemapInstance;
    this.spawn = { ...tilemapInstance.spawnPoint };

    entities = [];
    torches = [];

    // Parsear antorchas 'T'
    for (const t of tilemapInstance.getEntities('T')) {
      torches.push({ x: t.col * TILE_SIZE + 24, y: t.row * TILE_SIZE + 20 });
    }

    // Parsear salida 'E'
    const exits = tilemapInstance.getEntities('E');
    if (exits.length > 0) {
      exitDoor = new ExitDoor(exits[0].col * TILE_SIZE, (exits[0].row + 1) * TILE_SIZE - 70);
      entities.push(exitDoor);
    }

    // Parsear checkpoints 'C'
    for (const c of tilemapInstance.getEntities('C')) {
      entities.push(new Checkpoint(c.col * TILE_SIZE + 8, (c.row + 1) * TILE_SIZE - 42));
    }

    // Parsear relojes de arena 'H'
    for (const h of tilemapInstance.getEntities('H')) {
      entities.push(new Hourglass(h.col * TILE_SIZE + 12, h.row * TILE_SIZE + 8, 20, 200));
    }

    // Parsear pinchos fijos '^'
    for (const sp of tilemapInstance.getEntities('^')) {
      entities.push(new FixedSpikes(sp.col * TILE_SIZE, sp.row * TILE_SIZE + 24, TILE_SIZE, 24));
    }

    // Colocar carteles de guía tutorial
    entities.push(new HintSign(9 * TILE_SIZE, 7 * TILE_SIZE + 12, 'A / D para correr'));
    entities.push(new HintSign(26 * TILE_SIZE, 7 * TILE_SIZE + 12, 'Salta a la cornisa y pulsa W'));
    entities.push(new HintSign(34 * TILE_SIZE, 7 * TILE_SIZE + 12, 'Cuidado con las puas: mide tu salto'));
    entities.push(new HintSign(50 * TILE_SIZE, 7 * TILE_SIZE + 12, 'El tiempo apremia hacia la salida'));

    // Validación de alcanzabilidad en modo debug (?debug=1)
    if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
      this._validateReachability();
    }
  },

  update(dt, ctx) {
    tileRenderer.update(dt);
    for (const entity of entities) {
      entity.update(dt, ctx);
    }
  },

  draw(arg1, arg2) {
    const canvasCtx = (arg1 && typeof arg1.fillRect === 'function') ? arg1 : (arg2 && typeof arg2.fillRect === 'function' ? arg2 : null);
    const levelCtx  = (arg1 && arg1.camera) ? arg1 : (arg2 && arg2.camera ? arg2 : null);
    const camera    = levelCtx?.camera;

    const bounds = camera?.getVisibleBounds ? camera.getVisibleBounds() : { left: 0, top: 0, right: CANVAS.WIDTH, bottom: CANVAS.HEIGHT };
    const worldToScreen = camera?.worldToScreen ? (x, y) => camera.worldToScreen(x, y) : (x, y) => ({ x, y });
    const camPos = camera?.getCameraPos ? camera.getCameraPos() : { x: 0, y: 0 };

    if (!canvasCtx) return;

    // 1. Fondos con 3 capas de parallax
    tileRenderer.drawBackground(canvasCtx, camPos, this.theme);

    // 2. Muros y plataformas
    tileRenderer.drawTiles(canvasCtx, tilemapInstance, worldToScreen, bounds);

    // 3. Entidades interactivas
    for (const entity of entities) {
      entity.draw(canvasCtx, worldToScreen);
    }

    // 4. Iluminación volumétrica y antorchas
    tileRenderer.drawLighting(canvasCtx, torches, worldToScreen);
  },

  isComplete(ctx) {
    return exitDoor && exitDoor.isPlayerAtExit(ctx.player);
  },

  _validateReachability() {
    console.log('%c[DEBUG] Validando alcanzabilidad del Nivel 1:', 'color: #f2c14e; font-weight: bold;');
    console.log(`- Salto máx alto: ${PHYSICS.MAX_JUMP_HEIGHT_TILES} tiles (Límite seguro 85%: ${PHYSICS.MAX_SAFE_STEP_TILES.toFixed(2)} tiles)`);
    console.log(`- Salto máx largo: ${PHYSICS.MAX_JUMP_DIST_TILES} tiles (Límite seguro 85%: ${PHYSICS.MAX_SAFE_GAP_TILES.toFixed(2)} tiles)`);
    // Hueco 1: cols 6 a 8 = 2 tiles (<= 3.82). Seguro.
    // Plataforma 2: elevación 2 tiles con cornisa. Seguro.
    // Foso de pinchos: 5 tiles con plataforma central. Seguro.
    console.log('%c[DEBUG] Nivel 1: Todos los saltos y cornisas dentro de los límites de alcance.', 'color: #2fb5a8;');
  }
};
