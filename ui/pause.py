"""Menú de pausa (se dibuja encima del juego congelado)."""
import pygame

from settings import CONTROLS, GOLD, WIDTH
from art.text import blit_text
from ui.widgets import Button, ButtonList, dim, panel


class PauseMenu:
    def __init__(self, audio, level_name):
        cx = WIDTH // 2
        self.level_name = level_name
        self.menu = ButtonList([
            Button("CONTINUAR", (cx, 330), "resume"),
            Button("REINICIAR NIVEL", (cx, 410), "restart"),
            Button("MENÚ PRINCIPAL", (cx, 490), "menu"),
        ], audio)
        self.t = 0.0

    def handle_event(self, e):
        if e.type == pygame.KEYDOWN and e.key in (pygame.K_ESCAPE, pygame.K_p):
            return "resume"
        return self.menu.handle_event(e)

    def update(self, dt):
        self.t += dt
        self.menu.update(dt)

    def draw(self, screen):
        dim(screen, 160)
        panel(screen, (WIDTH / 2 - 260, 150, 520, 420))
        blit_text(screen, "PAUSA", 64, (WIDTH / 2, 205), GOLD, outline=5)
        blit_text(screen, self.level_name, 24, (WIDTH / 2, 258), (190, 220, 255))
        self.menu.draw(screen, self.t)
        tips = "   ·   ".join(f"{k}: {v}" for k, v in CONTROLS.items())
        blit_text(screen, tips, 18, (WIDTH / 2, 610), (220, 220, 240), outline=2)
