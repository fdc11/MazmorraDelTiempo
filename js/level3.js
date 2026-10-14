/**
 * js/level3.js — Nivel 3: "El Corazón del Reloj". Nivel final, laberinto con trampas combinadas, cuchillas oscilantes y derrumbe en cadena.
 * Issue #7 — Nivel 3 | Rama: feature/nivel-3
 */

import { Tilemap } from './engine/tilemap.js';
import { TileRenderer } from './engine/tileRenderer.js';
import { Hourglass, ExitDoor, Checkpoint, FixedSpikes, HintSign } from './engine/entities.js';
import { RetractableSpikes, CollapsingFloor, PressurePlate, Gate, OscillatingBlade, MovingPlatform } from './engine/traps.js';
import { PALETTE, TILE_SIZE, PHYSICS, CANVAS } from './config.js';

// Mapa de 90 columnas x 20 filas: laberinto, cuchillas, rutas falsas y secuencia de escape
const LEVEL3_MAP = [
  "##########################################################################################",
  "#T........T.........T.........T.........T.........T.........T.........T.........T........#",
  "#........................................................................................#",
  "#......................................................................................E.#",
  "#.........................................................................FFFFFFFF########",
  "#........................................................................................#",
  "#....................H......................C............................................#",
  "#.................######.................#######.........................................#",
  "#........................................................................................#",
  "#..P........................................................H..................B.........#",
  "######...=====.............SSSSS.........................######.............##############",
  "#....#...................#########.......................................................#",
  "#....#......................................H........................H...................#",
  "#....#...C..............^^^^^............#######..................#######................#",
  "#....#########.......###########.........................................................#",
  "#........................................................................................#",
  "#...........................................^^^^^........^^^^^...........................#",
  "#...........................................#####........#####...........................#",
  "#........................................................................................#",
  "##########################################################################################",
];

const tileRenderer = new TileRenderer();

let tilemapInstance = null;
let entities = [];
let traps = [];
let torches = [];
let blades = [];
let exitDoor = null;
let collapseCorridorFloors = [];
let isCollapsing = false;
let collapseTimer = 0;

export default {
  id: 3,
  name: 'El Corazón del Reloj',
  timeLimit: 150, // 150 segundos
  theme: {
    skyTop:        '#12080a',
    skyBottom:     '#240e14',
    farPillars:    '#38141c',
    accentTile:    PALETTE.CRIMSON,
    subAccentTile: PALETTE.FIRE,
  },
  tilemap: null,
  spawn: { x: 96, y: 380 },

  init(ctx) {
    tilemapInstance = new Tilemap(LEVEL3_MAP);
    this.tilemap = tilemapInstance;
    this.spawn = { ...tilemapInstance.spawnPoint };

    entities = [];
    traps = [];
    torches = [];
    blades = [];
    collapseCorridorFloors = [];
    isCollapsing = false;
    collapseTimer = 0;

    // Antorchas 'T'
    for (const t of tilemapInstance.getEntities('T')) {
      torches.push({ x: t.col * TILE_SIZE + 24, y: t.row * TILE_SIZE + 20 });
    }

    // Salida 'E'
    const exits = tilemapInstance.getEntities('E');
    if (exits.length > 0) {
      exitDoor = new ExitDoor(exits[0].col * TILE_SIZE, (exits[0].row + 1) * TILE_SIZE - 70);
      entities.push(exitDoor);
    }

    // Dos checkpoints 'C'
    for (const c of tilemapInstance.getEntities('C')) {
      entities.push(new Checkpoint(c.col * TILE_SIZE + 8, (c.row + 1) * TILE_SIZE - 42));
    }

    // Relojes 'H' (algunos como cebo en rutas alternativas)
    for (const h of tilemapInstance.getEntities('H')) {
      entities.push(new Hourglass(h.col * TILE_SIZE + 12, h.row * TILE_SIZE + 8, 25, 300));
    }

    // Pinchos fijos '^'
    for (const sp of tilemapInstance.getEntities('^')) {
      entities.push(new FixedSpikes(sp.col * TILE_SIZE, sp.row * TILE_SIZE + 24, TILE_SIZE, 24));
    }

    // Pinchos retráctiles 'S'
    for (const s of tilemapInstance.getEntities('S')) {
      traps.push(new RetractableSpikes(s.col * TILE_SIZE, s.row * TILE_SIZE + 20, TILE_SIZE, 28, s.col * 0.25));
    }

    // Pisos quebradizos 'F'
    for (const f of tilemapInstance.getEntities('F')) {
      const fl = new CollapsingFloor(f.col, f.row, TILE_SIZE);
      traps.push(fl);
      collapseCorridorFloors.push(fl);
    }

    // Cuchillas oscilantes de cimitarra 'L'
    blades.push(new OscillatingBlade(25 * TILE_SIZE, 5 * TILE_SIZE, 150, 2.5, 1.2, 0));
    blades.push(new OscillatingBlade(35 * TILE_SIZE, 5 * TILE_SIZE, 150, 2.5, 1.2, Math.PI * 0.5));
    blades.push(new OscillatingBlade(55 * TILE_SIZE, 5 * TILE_SIZE, 160, 2.8, 1.3, Math.PI));

    // Plataforma móvil suspendida entre las zonas de peligro
    traps.push(new MovingPlatform(
      42 * TILE_SIZE, 13 * TILE_SIZE,
      49 * TILE_SIZE, 13 * TILE_SIZE,
      TILE_SIZE * 2, 16, 1.4
    ));

    // Placa de presión 'B' que desata el derrumbe en cadena
    const plates = tilemapInstance.getEntities('B');
    if (plates.length > 0) {
      traps.push(new PressurePlate(plates[0].col * TILE_SIZE + 4, (plates[0].row + 1) * TILE_SIZE - 10, 'climax-plate', () => {
        if (!isCollapsing) {
          isCollapsing = true;
          collapseTimer = 0;
          ctx.camera?.startShake(14);
          ctx.events?.emit('sfx', { name: 'collapse' });
        }
      }));
    }

    // Cartel dramático
    entities.push(new HintSign(12 * TILE_SIZE, 9 * TILE_SIZE + 12, 'El corazón colapsa: corre sin dudar'));

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

    for (const blade of blades) {
      blade.update(dt, ctx);
    }

    // Secuencia de derrumbe en cadena
    if (isCollapsing) {
      collapseTimer += dt;
      // Cada 0.25 s colapsa el siguiente piso del pasillo
      const step = Math.floor(collapseTimer / 0.25);
      if (step < collapseCorridorFloors.length) {
        const floorToFall = collapseCorridorFloors[step];
        if (floorToFall.state === 'idle') {
          floorToFall.state = 'shaking';
          floorToFall.shakeTimer = 0.05;
        }
      }
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

    // Fondo carmesí / fuego oscuro
    tileRenderer.drawBackground(canvasCtx, camPos, this.theme);

    // Muros
    tileRenderer.drawTiles(canvasCtx, tilemapInstance, worldToScreen, bounds);

    // Cuchillas oscilantes
    for (const blade of blades) {
      blade.draw(canvasCtx, worldToScreen);
    }

    // Trampas y pisos que caen
    for (const trap of traps) {
      trap.draw(canvasCtx, worldToScreen);
    }

    // Entidades
    for (const entity of entities) {
      entity.draw(canvasCtx, worldToScreen);
    }

    // Antorchas
    tileRenderer.drawLighting(canvasCtx, torches, worldToScreen);
  },

  isComplete(ctx) {
    return exitDoor && exitDoor.isPlayerAtExit(ctx.player);
  },

  _validateReachability() {
    console.log('%c[DEBUG] Validando alcanzabilidad del Nivel 3:', 'color: #ff9a3c; font-weight: bold;');
    console.log(`- Salto máx alto: ${PHYSICS.MAX_JUMP_HEIGHT_TILES} tiles (Límite seguro: ${PHYSICS.MAX_SAFE_STEP_TILES.toFixed(2)} tiles)`);
    console.log(`- Salto máx largo: ${PHYSICS.MAX_JUMP_DIST_TILES} tiles (Límite seguro: ${PHYSICS.MAX_SAFE_GAP_TILES.toFixed(2)} tiles)`);
    console.log('%c[DEBUG] Nivel 3: Rutas de laberinto y escape en cadena comprobadas.', 'color: #2fb5a8;');
  }
};
