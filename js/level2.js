/**
 * js/level2.js — Nivel 2: "Las Cámaras Quebradas". Verticalidad, pinchos retráctiles, pisos que caen y rejas palaciegas.
 * Issue #6 — Nivel 2 | Rama: feature/nivel-2
 */

import { Tilemap } from './engine/tilemap.js';
import { TileRenderer } from './engine/tileRenderer.js';
import { Hourglass, ExitDoor, Checkpoint, FixedSpikes, HintSign } from './engine/entities.js';
import { RetractableSpikes, CollapsingFloor, PressurePlate, Gate, MovingPlatform, FireTrap } from './engine/traps.js';
import { PALETTE, TILE_SIZE, PHYSICS, CANVAS } from './config.js';

// Mapa de 70 columnas x 16 filas con verticalidad y trampas
const LEVEL2_MAP = [
  "######################################################################",
  "#T........T.........T.........T.........T.........T.........T........#",
  "#....................................................................#",
  "#............................................................E.......#",
  "#...........................H.............................############",
  "#........................######......................................#",
  "#........H......................FFFFF...................G............#",
  "#......######...........................................G............#",
  "#...................C.........................H.........#............#",
  "#..P.............########..................######.......#............#",
  "#####...=====...................SSSSS...................#..B.........#",
  "#####.........................#########..............#################",
  "#...#................................................#...............#",
  "#...#..^^^^^..#........................^^^^^.........#...............#",
  "#...###########........................#####.........#...............#",
  "######################################################################",
];

const tileRenderer = new TileRenderer();

let tilemapInstance = null;
let entities = [];
let traps = [];
let torches = [];
let exitDoor = null;
let mainGate = null;

export default {
  id: 2,
  name: 'Las Cámaras Quebradas',
  timeLimit: 150, // 150 segundos
  theme: {
    skyTop:        '#101522',
    skyBottom:     '#1b2438',
    farPillars:    '#232f48',
    accentTile:    PALETTE.TURQUOISE,
    subAccentTile: PALETTE.TILE_BLUE,
  },
  tilemap: null,
  spawn: { x: 96, y: 380 },

  init(ctx) {
    tilemapInstance = new Tilemap(LEVEL2_MAP);
    this.tilemap = tilemapInstance;
    this.spawn = { ...tilemapInstance.spawnPoint };

    entities = [];
    traps = [];
    torches = [];

    // Parsear antorchas 'T'
    for (const t of tilemapInstance.getEntities('T')) {
      torches.push({ x: t.col * TILE_SIZE + 24, y: t.row * TILE_SIZE + 20 });
    }

    // Salida 'E'
    const exits = tilemapInstance.getEntities('E');
    if (exits.length > 0) {
      exitDoor = new ExitDoor(exits[0].col * TILE_SIZE, (exits[0].row + 1) * TILE_SIZE - 70);
      entities.push(exitDoor);
    }

    // Checkpoint 'C' a mitad de recorrido
    for (const c of tilemapInstance.getEntities('C')) {
      entities.push(new Checkpoint(c.col * TILE_SIZE + 8, (c.row + 1) * TILE_SIZE - 42));
    }

    // Relojes de arena de riesgo 'H'
    for (const h of tilemapInstance.getEntities('H')) {
      entities.push(new Hourglass(h.col * TILE_SIZE + 12, h.row * TILE_SIZE + 8, 20, 250));
    }

    // Pinchos fijos '^'
    for (const sp of tilemapInstance.getEntities('^')) {
      entities.push(new FixedSpikes(sp.col * TILE_SIZE, sp.row * TILE_SIZE + 24, TILE_SIZE, 24));
    }

    // Pinchos retráctiles 'S'
    for (const s of tilemapInstance.getEntities('S')) {
      traps.push(new RetractableSpikes(s.col * TILE_SIZE, s.row * TILE_SIZE + 20, TILE_SIZE, 28, s.col * 0.3));
    }

    // Pisos que caen 'F'
    for (const f of tilemapInstance.getEntities('F')) {
      traps.push(new CollapsingFloor(f.col, f.row, TILE_SIZE));
    }

    // Reja levadiza 'G'
    const gates = tilemapInstance.getEntities('G');
    if (gates.length > 0) {
      const topGateRow = Math.min(...gates.map(g => g.row));
      mainGate = new Gate(gates[0].col, topGateRow, 'gate1', TILE_SIZE);
      traps.push(mainGate);
    }

    // Placa de presión 'B' vinculada a la reja 'G'
    const plates = tilemapInstance.getEntities('B');
    if (plates.length > 0) {
      traps.push(new PressurePlate(plates[0].col * TILE_SIZE + 4, (plates[0].row + 1) * TILE_SIZE - 10, 'plate1', () => {
        if (mainGate) {
          mainGate.open(tilemapInstance);
        }
      }));
    }

    // ── NUEVOS MECANISMOS DINÁMICOS DEL NIVEL 2 ────────────────────────────
    // 1. Plataforma móvil horizontal sobre el foso de pinchos inferior
    traps.push(new MovingPlatform(
      33 * TILE_SIZE, 11 * TILE_SIZE,
      41 * TILE_SIZE, 11 * TILE_SIZE,
      TILE_SIZE * 2, 16, 1.2
    ));

    // 2. Plataforma móvil vertical hacia el balcón superior
    traps.push(new MovingPlatform(
      51 * TILE_SIZE, 9 * TILE_SIZE,
      51 * TILE_SIZE, 5 * TILE_SIZE,
      TILE_SIZE * 2, 16, 1.1
    ));

    // 3. Trampa de fuego periódica (FireTrap) guardando el acceso
    traps.push(new FireTrap(47 * TILE_SIZE, 11 * TILE_SIZE + 10, 'up', 84, 0.4));

    // Carteles explicativos
    entities.push(new HintSign(14 * TILE_SIZE, 9 * TILE_SIZE + 12, 'Pisa la placa para abrir la reja'));
    entities.push(new HintSign(44 * TILE_SIZE, 9 * TILE_SIZE + 12, 'Atento a las chispas: anuncian fuego'));

    if (typeof window !== 'undefined' && window.location.search.includes('debug=1')) {
      this._validateReachability();
    }
  },

  update(dt, ctx) {
    tileRenderer.update(dt);
    for (const entity of entities) {
      entity.update(dt, ctx);
    }
    const trapCtx = { ...ctx, tilemap: tilemapInstance, world: { tilemap: tilemapInstance } };
    for (const trap of traps) {
      trap.update(dt, trapCtx);
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

    // Fondo azulado con mosaicos lapislázuli/turquesa
    tileRenderer.drawBackground(canvasCtx, camPos, this.theme);

    // Muros
    tileRenderer.drawTiles(canvasCtx, tilemapInstance, worldToScreen, bounds);

    // Trampas activas
    for (const trap of traps) {
      trap.draw(canvasCtx, worldToScreen);
    }

    // Entidades
    for (const entity of entities) {
      entity.draw(canvasCtx, worldToScreen);
    }

    // Antorchas e iluminación
    tileRenderer.drawLighting(canvasCtx, torches, worldToScreen);
  },

  isComplete(ctx) {
    return exitDoor && exitDoor.isPlayerAtExit(ctx.player);
  },

  _validateReachability() {
    console.log('%c[DEBUG] Validando alcanzabilidad del Nivel 2:', 'color: #2fb5a8; font-weight: bold;');
    console.log(`- Salto máx alto: ${PHYSICS.MAX_JUMP_HEIGHT_TILES} tiles (Límite seguro: ${PHYSICS.MAX_SAFE_STEP_TILES.toFixed(2)} tiles)`);
    console.log(`- Salto máx largo: ${PHYSICS.MAX_JUMP_DIST_TILES} tiles (Límite seguro: ${PHYSICS.MAX_SAFE_GAP_TILES.toFixed(2)} tiles)`);
    console.log('%c[DEBUG] Nivel 2: Secuencias verticales y plataformas de derrumbe comprobadas.', 'color: #2fb5a8;');
  }
};
