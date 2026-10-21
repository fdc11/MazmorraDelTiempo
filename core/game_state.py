"""Estado global de la partida: vidas, puntuación, nivel actual y récord.

El récord (high score) se guarda en save.json para que persista entre
sesiones. save.json está en .gitignore: cada jugador tiene el suyo.
"""
import json

from settings import SAVE_FILE, START_LIVES


class GameState:
    def __init__(self):
        self.high_score = 0
        self.best_level = 0
        self.load()
        self.reset()

    def reset(self):
        self.score = 0
        self.lives = START_LIVES
        self.level_index = 0
        self.hourglasses = 0
        self.total_time = 0.0
        self.enemies_defeated = 0

    def add_score(self, points):
        self.score += points
        if self.score > self.high_score:
            self.high_score = self.score

    # --- Persistencia --------------------------------------------------------
    def load(self):
        try:
            data = json.loads(SAVE_FILE.read_text(encoding="utf-8"))
            self.high_score = int(data.get("high_score", 0))
            self.best_level = int(data.get("best_level", 0))
        except (OSError, ValueError):
            pass

    def save(self):
        self.best_level = max(self.best_level, self.level_index)
        data = {"high_score": self.high_score, "best_level": self.best_level}
        try:
            SAVE_FILE.write_text(json.dumps(data, indent=2), encoding="utf-8")
        except OSError:
            pass
