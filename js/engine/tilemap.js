/**
 * tilemap.js — Mapa de tiles basado en ASCII.
 *
 * Leyenda base:
 *   '#'  muro sólido (colisión total)
 *   '='  plataforma de un solo sentido (se pisa desde arriba, se atraviesa hacia abajo)
 *   '.'  vacío
 *   '^'  pincho (hazard)
 *   'P'  spawn del jugador
 *   'E'  salida del nivel
 *   'C'  checkpoint
 *   'T'  antorcha decorativa
 *
 * Los niveles pueden extender la leyenda sin modificar esta clase pasando un
 * objeto `legend` adicional en el constructor (sus valores se mezclan con la base).
 *
 * Comportamiento de límites:
 *   - Izquierda, derecha y arriba del mapa → sólido (isSolid = true).
 *   - Abajo del mapa → vacío (isSolid = false) para permitir caer al vacío.
 */

// ─── Leyenda base ─────────────────────────────────────────────────────────────

/** @type {Record<string, string>} Tipo de tile para cada carácter ASCII. */
const BASE_LEGEND = {
  '#': 'solid',
  '=': 'oneway',
  '.': 'empty',
  '^': 'hazard',
  'P': 'empty',   // spawn: vacío para la física (la posición se usa por separado)
  'E': 'empty',   // salida: vacío para la física
  'C': 'empty',   // checkpoint: vacío para la física
  'T': 'empty',   // antorcha: decorativa, sin colisión
};

// ─── Clase Tilemap ────────────────────────────────────────────────────────────

export class Tilemap {
  /**
   * @param {string[]} rows     — Array de strings, una por fila del mapa ASCII.
   * @param {Record<string,string>} [legend] — Leyenda extendida que sobreescribe la base.
   * @param {number}   [tileSize=16] — Tamaño de tile en píxeles lógicos.
   */
  constructor(rows, legend = {}, tileSize = 16) {
    this.tileSize = tileSize;

    // Normalizar filas a la misma longitud (la más larga marca el ancho)
    const cols = Math.max(...rows.map(r => r.length));
    this._rows = rows.map(r => r.padEnd(cols, '.'));

    this._cols      = cols;
    this._rowCount  = this._rows.length;

    // Mezclar leyendas (la extendida sobreescribe la base)
    this._legend = { ...BASE_LEGEND, ...legend };

    // Dimensiones totales en píxeles lógicos
    this.widthPx  = this._cols     * tileSize;
    this.heightPx = this._rowCount * tileSize;

    // Localizar spawn y entidades en una sola pasada
    this.spawnPoint = { x: 0, y: 0 };
    this._entityMap = new Map(); // char → [{col, row}]

    this._parseEntities();
  }

  // ─── Análisis de entidades ───────────────────────────────────────────────────

  /** Recorre el mapa una vez y registra todas las entidades. */
  _parseEntities() {
    for (let row = 0; row < this._rowCount; row++) {
      for (let col = 0; col < this._cols; col++) {
        const ch = this._rows[row][col];

        // Registrar posición de la entidad
        if (!this._entityMap.has(ch)) this._entityMap.set(ch, []);
        this._entityMap.get(ch).push({ col, row });

        // Spawn especial: guardar en coordenadas de mundo (esquina superior-izquierda del tile)
        if (ch === 'P') {
          this.spawnPoint = {
            x: col * this.tileSize,
            y: row * this.tileSize,
          };
        }
      }
    }
  }

  // ─── API principal ───────────────────────────────────────────────────────────

  /**
   * Devuelve el carácter ASCII en la celda (col, row).
   * Fuera del mapa devuelve '#' (arriba/lados) o '.' (abajo).
   * @param {number} col
   * @param {number} row
   * @returns {string}
   */
  tileAt(col, row) {
    if (col < 0 || col >= this._cols || row < 0) return '#'; // bordes sólidos
    if (row >= this._rowCount) return '.';                    // abajo -> vacío
    return this._rows[row][col];
  }

  /**
   * ¿El tile en (col, row) bloquea el paso desde cualquier dirección?
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isSolid(col, row) {
    const type = this._legend[this.tileAt(col, row)];
    return type === 'solid';
  }

  /**
   * ¿El tile es plataforma de un solo sentido?
   * (Colisiona solo cuando se cae desde arriba y los pies están encima.)
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isOneWay(col, row) {
    const type = this._legend[this.tileAt(col, row)];
    return type === 'oneway';
  }

  /**
   * ¿El tile causa daño (hazard)?
   * @param {number} col
   * @param {number} row
   * @returns {boolean}
   */
  isHazard(col, row) {
    const type = this._legend[this.tileAt(col, row)];
    return type === 'hazard';
  }

  /**
   * Convierte coordenadas de mundo (px) a (col, row) de tile.
   * @param {number} x — px lógico horizontal
   * @param {number} y — px lógico vertical
   * @returns {{ col: number, row: number }}
   */
  worldToTile(x, y) {
    return {
      col: Math.floor(x / this.tileSize),
      row: Math.floor(y / this.tileSize),
    };
  }

  /**
   * Devuelve las posiciones de todas las ocurrencias de un carácter.
   * Útil para colocar entidades (antorchas, checkpoints, salida...).
   * @param {string} char — Carácter ASCII a buscar
   * @returns {{ col: number, row: number }[]}
   */
  getEntities(char) {
    return this._entityMap.get(char) ?? [];
  }
}
