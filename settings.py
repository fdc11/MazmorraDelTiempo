"""Constantes globales del juego.

Cualquier valor "mágico" (tamaños, velocidades, colores) vive aquí para que
nadie tenga que tocar el código de otro módulo para ajustar el balance.
"""
from pathlib import Path

# --- Rutas -----------------------------------------------------------------
BASE_DIR = Path(__file__).resolve().parent
LEVELS_DIR = BASE_DIR / "levels"
SAVE_FILE = BASE_DIR / "save.json"

# --- Pantalla --------------------------------------------------------------
TITLE = "La Mazmorra del Tiempo"
WIDTH, HEIGHT = 1280, 720
FPS = 60
TILE = 48

# --- Física del jugador (px, px/s, px/s²) ----------------------------------
GRAVITY = 2300
MAX_FALL_SPEED = 1100
RUN_SPEED = 340
RUN_ACCEL = 2600
RUN_DECEL = 3000
AIR_ACCEL = 1700
JUMP_SPEED = 860            # ≈ 3.4 tiles de altura máxima
JUMP_CUT = 0.45             # al soltar el salto, la velocidad se multiplica por esto
COYOTE_TIME = 0.10          # segundos que puedes saltar tras dejar el borde
JUMP_BUFFER = 0.12          # segundos que se recuerda un salto pulsado antes de tocar suelo
STOMP_BOUNCE = 620

# --- Combate ---------------------------------------------------------------
PUNCH_TIME = 0.22
PUNCH_COOLDOWN = 0.30
INVULNERABLE_TIME = 1.2
MAX_HEALTH = 3
START_LIVES = 3

# --- Rebobinar el tiempo ---------------------------------------------------
REWIND_SECONDS = 3.0
REWIND_MAX_ENERGY = 100
REWIND_COST_PER_SEC = 45
REWIND_RECHARGE_PER_SEC = 12

# --- Puntuación ------------------------------------------------------------
SCORE_HOURGLASS = 100
SCORE_ENEMY = 200
SCORE_BOSS = 5000
SCORE_TIME_BONUS = 10       # por segundo restante al terminar un nivel

# --- Paleta global (UI) ----------------------------------------------------
INK = (34, 24, 38)          # contorno oscuro de todo el arte
WHITE = (255, 255, 255)
CREAM = (255, 244, 222)
GOLD = (255, 200, 60)
GOLD_DARK = (196, 128, 24)
RED = (232, 64, 72)
GREEN = (96, 200, 96)
SKY_BLUE = (112, 196, 255)
PURPLE = (120, 80, 200)

# Controles (pygame key names). Se documentan en README y en el menú.
CONTROLS = {
    "Mover": "← → / A D",
    "Saltar": "Espacio / W / ↑",
    "Golpe": "J / X",
    "Rebobinar": "K / Shift (mantener)",
    "Pausa": "Esc / P",
}
