"""Pantalla de Game Over."""
import math

import pygame

from art import world
from art.backgrounds import Parallax
from core.assets import Assets
from core.game import Scene
from settings import HEIGHT, WIDTH
from art.text import blit_text
from ui.widgets import Button, ButtonList, dim, panel


class GameOverScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.bg = Parallax("reloj", world.THEMES["reloj"])
        self.t = 0.0
        self.final_score = game.state.score
        self.level_index = game.state.level_index
        cx = WIDTH // 2
        self.menu = ButtonList([
            Button(f"CONTINUAR (NIVEL {self.level_index + 1})", (cx, 470), "continue", width=440),
            Button("MENÚ PRINCIPAL", (cx, 550), "menu", width=440),
        ], game.audio)
        self.hurt = Assets.player()["right"]["hurt"][0]

    def handle_event(self, e):
        action = self.menu.handle_event(e)
        if action == "continue":
            st = self.game.state
            st.score = 0
            st.lives = 3
            self.game.start_level(self.level_index)
        elif action == "menu":
            from ui.menu import MenuScene
            self.game.change_scene(MenuScene(self.game))

    def update(self, dt):
        self.t += dt
        self.bg.update(dt)
        self.menu.update(dt)

    def draw(self, screen):
        self.bg.draw(screen, self.t * 20)
        dim(screen, 170, (40, 6, 20))
        drop = min(1, self.t / 0.6)
        y = -100 + 280 * (1 - (1 - drop) ** 3)
        blit_text(screen, "GAME OVER", 110, (WIDTH / 2, y), (255, 90, 100), outline=8)
        img = pygame.transform.rotate(self.hurt, math.sin(self.t * 2) * 10)
        screen.blit(img, (WIDTH / 2 - img.get_width() / 2, 255))
        panel(screen, (WIDTH / 2 - 220, 360, 440, 60), alpha=170)
        blit_text(screen, f"PUNTUACIÓN: {self.final_score:07d}", 28, (WIDTH / 2, 390))
        self.menu.draw(screen, self.t)
        blit_text(screen, f"Récord: {self.game.state.high_score:07d}", 20, (WIDTH / 2, HEIGHT - 40), (220, 200, 230))
