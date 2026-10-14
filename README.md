# La Mazmorra del Tiempo

> Videojuego cinemático de plataformas 2D de inspiración persa estilo *Prince of Persia*.  
> Desarrollado de principio a fin en **JavaScript Vanilla (ES2022, ES Modules) + HTML5 Canvas 2D**.  
> **Cero dependencias externas, cero imágenes, cero audio pregrabado**: arte vectorial, iluminación, física esquelética, efectos sonoros y música generativa generados 100% por código en tiempo real.

---

## 🏛️ Dirección de Arte y Estética

- **Resolución lógica**: 960×540 (proporción 16:9), tamaño de tile de 48 px.
- **Renderizado**: Vectorial suavizado (`imageSmoothingEnabled = true`) con escalado adaptativo a `window.devicePixelRatio` para nitidez absoluta y contenedor con centrado letterbox.
- **Tipografía**: Google Fonts *"Cinzel"* (titulares reales, números del HUD) y *"Cormorant Garamond"* (textos narrativos y carteles). Prohibido el pixel art.
- **Paleta Cromática Canónica Persa**:
  - `DEEP_SHADOW`: `#120d12` (sombra profunda)
  - `NIGHT`: `#1b1620` (noche)
  - `SANDSTONE_DARK`: `#3b2f2a` (arenisca oscura)
  - `SANDSTONE`: `#5a463a` (arenisca)
  - `SANDSTONE_MID`: `#8c6a4f` (arenisca media)
  - `SANDSTONE_LIGHT`: `#c49a6c` (arenisca clara)
  - `BONE_DUST`: `#e9d9b8` (hueso / polvo)
  - `LAPIS`: `#1f3a6b` (lapislázuli)
  - `TILE_BLUE`: `#2e5aa8` (azul azulejo)
  - `TURQUOISE`: `#2fb5a8` (turquesa)
  - `FIRE`: `#ff9a3c` (fuego)
  - `FLAME_LIGHT`: `#ffd27a` (llama clara)
  - `TIME_GOLD`: `#f2c14e` (oro del tiempo)
  - `CRIMSON`: `#a3262a` (carmesí)
  - `CRIMSON_DARK`: `#6b1a1f` (carmesí oscuro)
- **Fondos con 3 capas de parallax**:
  1. Bruma mística, gradiente de profundidad y rayos de sol volumétricos desde ventanas altas.
  2. Arcos persas lejanos con molduras de azulejos lapislázuli y turquesa.
  3. Pilares medios de arenisca con tapices carmesí bordados en oro y relieves tallados de relojes de arena.
- **Iluminación**: Antorchas con llamas animadas mediante curvas Bézier, halos de luz cálida con mezcla radial `lighter`, partículas de polvo iluminadas flotando en el aire y viñeta perimetral suave.
- **Personaje (Rotoscopia Vectorial)**: Figura humana estilizada con túnica clara, faja carmesí, cinta en la frente con física de seguimiento ondulatorio, pelo azabache y animación esquelética paramétrica interpolada suavemente (idle, carrera, salto, caída, agarre de cornisas, escalada, agachado, daño y muerte).

---

## 🎮 Controles

| Acción | Teclas |
|---|---|
| **Moverse / Correr** | `A` / `D`  o  `←` / `→` |
| **Saltar** | `W` / `Espacio`  o  `↑` |
| **Agacharse / Soltarse de cornisa** | `S`  o  `↓` |
| **Trepar cornisa colgado** | `W` / `Espacio`  o  `↑` |
| **Bajar de plataforma atravesable** | `S` + Salto |
| **Pausar** | `P`  o  `Escape` |
| **Reiniciar nivel actual** | `R` |
| **Silenciar / Activar sonido** | `M` |
| **Confirmar en menús** | `Enter`  o  `Espacio` |

---

## 📐 Constantes de Física y Verificación de Salto

Calculadas con precisión matemática para tiles de 48 px (`js/config.js`):
- **Gravedad ($g$)**: $1560 \text{ px/s}^2$
- **Impulso de salto ($v_{jump}$)**: $-624 \text{ px/s}$
- **Altura máxima de salto ($H$)**: $\frac{(-624)^2}{2 \times 1560} = 124.8 \text{ px} \approx 2.60 \text{ tiles}$.
- **Velocidad de carrera ($v_x$)**: $270 \text{ px/s}$
- **Tiempo en el aire ($T$)**: $2 \times \frac{624}{1560} = 0.80 \text{ s}$.
- **Distancia de salto corriendo**: $270 \times 0.80 = 216 \text{ px} \approx 4.50 \text{ tiles}$.
- **Criterio de alcanzabilidad**: Todos los huecos y escalones del camino principal se mantienen por debajo del **85%** de estos máximos ($\le 2.21$ tiles de altura y $\le 3.82$ tiles de foso horizontal).
- **Modo Debug**: Añadiendo `?debug=1` en la URL del navegador se ejecuta el validador automático en la consola de JavaScript.

---

## 🎶 Motor de Audio Sintetizado (Web Audio API)

- **Cero archivos mp3/wav/ogg**: Síntesis pura en tiempo real mediante `OscillatorNode`, `BiquadFilterNode`, `GainNode`, generadores de ruido analógico y `DynamicsCompressorNode`.
- **Efectos de sonido (16 tipos)**: `jump`, `land`, `step`, `grab`, `hurt`, `death`, `spike`, `collect`, `door`, `checkpoint`, `trap-warn`, `collapse`, `blade`, `plate`, `victory`, `gameover`.
- **Música ambiental generativa en bucle**:
  - Dron místico grave continuo con modulación de filtro analógico.
  - Melodía generativa en escala **Frigia Dominante / Maqam Hijaz** (segunda aumentada persa).
  - Percusión suave tipo *tombak / darbouka* sintetizada mediante impactos senoidales y chasquidos de ruido filtrado.
  - Tono y cadencia adaptados por nivel.

---

## 🗺️ Niveles Incluidos

1. **Nivel 1 — "El Vestíbulo"** (Tutorial, 60×12 tiles, 120 s): Introducción al movimiento cinemático, salto de abismos, plataformas con agarre de cornisa, pinchos estáticos, reloj de arena de bonificación, checkpoint y salida.
2. **Nivel 2 — "Las Cámaras Quebradas"** (Dificultad media, 70×16 tiles, 150 s): Gran verticalidad palaciega, tramos de pinchos retráctiles con aviso previo de 0.4s, pisos quebradizos que se derrumban sobre el abismo y placa de presión vinculada a una reja levadiza.
3. **Nivel 3 — "El Corazón del Reloj"** (Dificultad alta / Final, 90×20 tiles, 150 s): Complejo laberinto con rutas falsas y relojes cebo, péndulos con cuchillas de cimitarra, dos checkpoints y secuencia final de derrumbe en cadena al pisar la placa clave.

---

## 🚀 Cómo Ejecutar

Dado que utiliza módulos nativos de ES2022 (`type="module"`), el juego debe ejecutarse a través de un servidor HTTP local:

### Con Node.js / npx
```bash
npx serve .
```
o bien con Python:
```bash
python -m http.server 8000
```
Abre en tu navegador:
`http://localhost:3000` (o `http://localhost:8000`)

---

## 📂 Arquitectura de Archivos y Responsabilidades

- **Issue #1 — Base del motor** (`feature/base-motor`):
  `index.html`, `styles.css`, `js/config.js`, `js/main.js`, `js/engine/loop.js`, `js/engine/input.js`, `js/engine/renderer.js`, `js/engine/camera.js`, `js/engine/state.js`, `js/engine/particles.js`
- **Issue #2 — Movimiento** (`feature/movimiento-jugador`):
  `js/player.js`, `js/engine/tilemap.js`
- **Issue #3 — Vidas** (`feature/sistema-vidas`):
  `js/engine/vitals.js`
- **Issue #4 — Cambio de niveles** (`feature/sistema-niveles`):
  `js/levels.js`, `js/engine/session.js`, `js/engine/events.js`, `js/engine/transition.js`, integración en `main.js`
- **Issue #5 — Nivel 1** (`feature/nivel-1`):
  `js/level1.js`, `js/engine/entities.js`, `js/engine/tileRenderer.js`
- **Issue #6 — Nivel 2** (`feature/nivel-2`):
  `js/level2.js`, `js/engine/traps.js`
- **Issue #7 — Nivel 3** (`feature/nivel-3`):
  `js/level3.js`
- **Issue #8 — Interfaz** (`feature/interfaz-menu`):
  `js/ui.js`
- **Issue #9 — Audio** (`feature/audio`):
  `js/audio.js`
