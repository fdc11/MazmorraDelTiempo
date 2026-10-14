# La Mazmorra del Tiempo

> Plataformas 2D estilo Prince of Persia — JavaScript vanilla (ES2022, ES Modules) + HTML5 Canvas 2D. Sin frameworks ni dependencias externas.

---

## Ejecución

### Opción A — Live Server (VS Code)
1. Instala la extensión **Live Server** en VS Code.
2. Abre la carpeta del proyecto y pulsa **Go Live** en la barra de estado.
3. El juego abre en `http://127.0.0.1:5500`.

### Opción B — npx serve
```bash
npx serve .
```
Abre `http://localhost:3000` en Chrome o Firefox.

> **Importante**: el juego usa ES Modules (`type="module"`), por lo que **debe** servirse desde un servidor HTTP local. No funciona con `file://`.

---

## Estructura del proyecto

```
MazmorraDelTiempo/
├── index.html            # Canvas único, entry point del módulo
├── styles.css            # Fondo oscuro, canvas pixel-perfect centrado
├── js/
│   ├── config.js         # Única fuente de verdad (constantes, paleta, teclas)
│   ├── main.js           # Bootstrap: conecta engine, estados y carga niveles
│   │
│   ├── engine/           # Motor reutilizable (sin lógica de juego)
│   │   ├── loop.js       # Game loop fixed-timestep 60 Hz + acumulador
│   │   ├── input.js      # Teclado con estados down/pressed/released por frame
│   │   ├── renderer.js   # Canvas lógico 320×200 escalado pixel-perfect
│   │   ├── camera.js     # Seguimiento lerp, límites de mapa, screen shake
│   │   └── state.js      # FSM: MENU → PLAYING → PAUSED / GAME_OVER / VICTORY
│   │
│   │   # ── Módulos por implementar (otras ramas) ──────────────
│   ├── player.js         # (pendiente) Lógica y render del jugador
│   ├── ui.js             # (pendiente) HUD, menús, overlays
│   ├── audio.js          # (pendiente) Efectos y música
│   ├── level1.js         # (pendiente) Nivel 1
│   ├── level2.js         # (pendiente) Nivel 2
│   └── level3.js         # (pendiente) Nivel 3
└── README.md
```

---

## Verificación manual (criterios de aceptación)

| # | Qué verificar | Cómo |
|---|---------------|------|
| 1 | Sin errores en consola | Abrir DevTools → pestaña Console |
| 2 | Loop a 60 Hz estable | FPS visible en esquina superior izquierda |
| 3 | Cambio de estados por teclado | `Enter` → PLAYING · `P` → PAUSED · `E` → VICTORY · `Esc` → GAME OVER · `R` → MENU |
| 4 | Escalado al redimensionar | Arrastrar borde de ventana; el canvas se reescala sin deformar proporción 16:10 |
| 5 | Pausa automática | Cambiar de pestaña y volver; el FPS no muestra saltos |
| 6 | Niveles no disponibles | Aparece pantalla "Nivel X no disponible aún" en lugar de error |

---

## Añadir un nivel nuevo

1. Crea `js/levelN.js` exportando el contrato de nivel:

```js
export default {
  id: N,
  name: 'Nombre del nivel',
  timeLimit: 120,                     // segundos
  init(gameCtx)  { /* setup */ },
  update(dt, input, gameCtx) { /* lógica */ },
  draw(ctx, renderer) { /* render */ },
  isComplete(gameCtx) { return false; },
};
```

2. Registra la ruta en `js/config.js`:

```js
export const LEVEL_MODULES = Object.freeze([
  'js/level1.js',
  'js/level2.js',
  'js/level3.js',
  'js/levelN.js', // ← añadir aquí
]);
```

**main.js no requiere ningún otro cambio.**

---

## Paleta de colores

| Token | Hex | Uso |
|-------|-----|-----|
| `VOID` | `#0a0c14` | Negro del vacío |
| `STONE_DARK` | `#1a1f2e` | Piedra oscura |
| `STONE_MID` | `#2d3550` | Piedra media |
| `STONE_LIGHT` | `#4a5580` | Resalte piedra |
| `TORCH_CORE` | `#ff9f1c` | Llama naranja brillante |
| `TORCH_GLOW` | `#ff6b2b` | Llama naranja profundo |
| `TIME_GOLD` | `#f0c040` | Dorado del tiempo |
| `TIME_DIM` | `#a07820` | Dorado opaco |
| `HERO_SKIN` | `#e8c090` | Piel del héroe |
| `HERO_CLOTH` | `#3a5fa0` | Ropa azul |
| `DANGER` | `#c0392b` | Rojo peligro |
| `SPIKE` | `#7f8c8d` | Gris pinchos |
| `TEXT_WHITE` | `#f0f0f0` | Texto principal |
| `TEXT_DIM` | `#8090a0` | Texto secundario |
