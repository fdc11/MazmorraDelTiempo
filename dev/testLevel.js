/**
 * testLevel.js — Nivel de prueba para dev/player-test.html
 *
 * Escenario (28 cols × 17 filas, tiles de 16 px = 448 × 272 px):
 *   - Spawn en col 4, fila 3
 *   - Plataforma sólida alta en col 10, fila 6 (borde a la izquierda → agarre)
 *   - Plataforma de un solo sentido en cols 11-25, fila 7
 *   - Plataforma sólida media en cols 11-14, fila 10
 *   - Suelo parcial en fila 15 con pozo en cols 4-7
 *   - Pinchos en cols 11-16, fila 14
 *   - Fila 16 vacía bajo el pozo (para caída al vacío)
 */

export const TEST_LEVEL_ROWS = [
  '############################',  // 0  techo sólido
  '#..........................#',  // 1
  '#..........................#',  // 2
  '#....P.............T.......#',  // 3  spawn (P) y antorcha (T)
  '#..........................#',  // 4
  '#..........................#',  // 5
  '#..........#...............#',  // 6  columna sólida borde (col 11); col 10 vacio arriba
  '#...........===============#',  // 7  plataforma de un solo sentido (cols 12-26)
  '#..........................#',  // 8
  '#..........................#',  // 9
  '#...........####...........#',  // 10 plataforma sólida media (cols 12-15)
  '#..........................#',  // 11
  '#..........................#',  // 12
  '#....######................#',  // 13 suelo elevado (cols 5-10)
  '#..........^^^^^^..........#',  // 14 pinchos (cols 11-16)
  '####....################.###',  // 15 suelo con pozo en cols 4-7
  '............................',  // 16 vacío bajo el pozo (caída al vacío)
];

/** Leyenda extendida — la base es suficiente para este nivel. */
export const TEST_LEVEL_LEGEND = {};
