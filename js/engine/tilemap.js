/**
 * js/engine/tilemap.js — Parser de mapas ASCII, colisiones AABB y gestión de entidades.
 * Issue #2 — Movimiento | Rama: feature/movimiento-jugador
 */

import { TILE_SIZE } from '../config.js';

/**
 * Leyenda base de colisiones por carácter ASCII.
 * '#' muro sólido
 * '=' plataforma unidireccional
 * '.' vacío
 * '^' pincho fijo
 * 'F' piso que cae (sólido hasta derrumbe)
 * 'G' reja cerrada (sólida hasta apertura)
 * 'P' spawn
 * 'E' salida
 * 'C' checkpoint
 * 'T' antorcha
 * 'H' reloj de arena
 * 'S' pincho retráctil
 * 'B' placa de presión
 * 'L' cuchilla oscilante
 * 'K' cartel
 */
const BASE_LEGEND = {
  '#': 'solid',
  '=': 'oneway',
  '.': 'empty',
  '^': 'hazard',
  'F': 'solid',
  'G': 'solid',
  'P': 'empty',
  'E': 'empty',
  'C': 'empty',
  'T': 'empty',
  'H': 'empty',
  'S': 'empty',
  'B': 'empty',
  'L': 'empty',
  'K': 'empty',
};

export class Tilemap {
  /**
   * @param {string[]} rows Filas del mapa en formato ASCII.
   * @param {Record<string, string>} [customLegend]
   * @param {number} [tileSize=TILE_SIZE]
   */
  constructor(rows, customLegend = {}, tileSize = TILE_SIZE) {
    this.tileSize = tileSize;

    // Normalizar ancho de filas
    const cols = Math.max(...rows.map(r => r.length));
    this._rows = rows.map(r => r.padEnd(cols, '.'));
    this._cols = cols;
    this._rowCount = this._rows.length;

    this._legend = { ...BASE_LEGEND, ...customLegend };

    this.widthPx  = this._cols * tileSize;
    this.heightPx = this._rowCount * tileSize;

    this.spawnPoint = { x: tileSize, y: tileSize };
    this._entityMap = new Map();

    this._parse();
  }

  _parse() {
    this._entityMap.clear();

    for (let row = 0; row < this._rowCount; row++) {
      for (let col = 0; col < this._cols; col++) {
        const ch = this._rows[row][col];

        if (!this._entityMap.has(ch)) {
          this._entityMap.set(ch, []);
        }
        this._entityMap.get(ch).push({ col, row });

        if (ch === 'P') {
          this.spawnPoint = {
            x: col * this.tileSize,
            y: (row + 1) * this.tileSize - 68, // Posicionar los pies del personaje sobre el piso
          };
        }
      }
    }
  }

  /**
   * Devuelve el carácter en la celda (col, row).
   * Límites: izquierda, derecha y arriba son muros ('#'); abajo es vacío ('.').
   */
  tileAt(col, row) {
    if (col < 0 || col >= this._cols || row < 0) return '#';
    if (row >= this._rowCount) return '.';
    return this._rows[row][col];
  }

  /**
   * Modifica un tile dinámicamente en tiempo de ejecución (útil para derrumbes o rejas).
   */
  setTile(col, row, char) {
    if (col < 0 || col >= this._cols || row < 0 || row >= this._rowCount) return;
    const str = this._rows[row];
    this._rows[row] = str.substring(0, col) + char + str.substring(col + 1);
  }

  /**
   * Comprueba si el tile bloquea el paso en cualquier dirección.
   */
  isSolid(col, row) {
    const type = this._legend[this.tileAt(col, row)];
    return type === 'solid';
  }

  /**
   * Comprueba si el tile es una plataforma atravesable desde abajo.
   */
  isOneWay(col, row) {
    const type = this._legend[this.tileAt(col, row)];
    return type === 'oneway';
  }

  /**
   * Comprueba si el tile es un peligro estático mortal.
   */
  isHazard(col, row) {
    const type = this._legend[this.tileAt(col, row)];
    return type === 'hazard';
  }

  /**
   * Convierte coordenadas de mundo en px a columna y fila de tile.
   */
  worldToTile(x, y) {
    return {
      col: Math.floor(x / this.tileSize),
      row: Math.floor(y / this.tileSize),
    };
  }

  /**
   * Devuelve todas las apariciones de un carácter en el mapa.
   */
  getEntities(char) {
    return this._entityMap.get(char) ?? [];
  }

  get cols() {
    return this._cols;
  }

  get rows() {
    return this._rowCount;
  }
}
