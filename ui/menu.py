"""Menú principal con fondo animado, controles y créditos."""
import math

import pygame

from art import world
from art.backgrounds import Parallax
from core.assets import Assets
from core.game import Scene
from settings import CONTROLS, GOLD, HEIGHT, TILE, WIDTH
from art.text import blit_text
from ui.widgets import Button, ButtonList, dim, panel

CREDITS = [
    ("Programación y mecánicas", "Integrante 1"),
    ("Niveles 1 y 2", "Integrante 2"),
    ("Nivel 3 e interfaz", "Integrante 3"),
    ("Arte y sonido", "Generados por código (pygame-ce)"),
]


class MenuScene(Scene):
    def __init__(self, game):
        super().__init__(game)
        self.bg = Parallax("reloj", world.THEMES["reloj"])
        self.cam_x = 0.0
        self.t = 0.0
        cx = WIDTH // 2
        self.menu = ButtonList([
            Button("JUGAR", (cx, 370), "play"),
            Button("CONTROLES", (cx, 450), "controls"),
            Button("CRÉDITOS", (cx, 530), "credits"),
            Button("SALIR", (cx, 610), "quit"),
        ], game.audio)
        self.overlay = None
        self.ground = self._ground_strip()
        self.player = Assets.player()["right"]
        self.boss = Assets.boss()["left"]["idle"]
        self.hourglass = world.hourglass()
        game.audio.play_music("menu")

    def _ground_strip(self):
        surf = pygame.Surface((WIDTH + TILE * 2, TILE * 2), pygame.SRCALPHA)
        for x in range(0, WIDTH // TILE + 2):
            surf.blit(world.solid_tile("reloj", False, True, True, True, x % 3, 0), (x * TILE, 0))
            surf.blit(world.solid_tile("reloj", True, True, True, True, x % 3, 1), (x * TILE, TILE))
        return surf

    def handle_event(self, e):
        if self.overlay:
            if e.type in (pygame.KEYDOWN, pygame.MOUSEBUTTONDOWN, pygame.JOYBUTTONDOWN):
                self.overlay = None
                self.game.audio.play("select")
            return
        action = self.menu.handle_event(e)
        if action == "play":
            self.game.start_new_game()
        elif action in ("controls", "credits"):
            self.overlay = action
        elif action == "quit":
            self.game.quit()

    def update(self, dt):
        self.t += dt
        self.cam_x += 70 * dt
        self.bg.update(dt)
        self.menu.update(dt)

    def draw(self, screen):
        self.bg.draw(screen, self.cam_x)
        gx = -(self.cam_x % TILE)
        screen.blit(self.ground, (gx, HEIGHT - TILE * 2 + 20))
        floor = HEIGHT - TILE * 2 + 20
        # Personajes de adorno
        run = self.player["run"]
        img = run[int(self.t * 14) % len(run)]
        screen.blit(img, (150, floor - 89))
        b = self.boss[int(self.t * 6) % len(self.boss)]
        screen.blit(b, (WIDTH - 290, floor - 166))
        # Título
        for i, (line, size, y) in enumerate((("LA MAZMORRA", 92, 120), ("DEL TIEMPO", 72, 205))):
            wob = math.sin(self.t * 2 + i) * 4
            blit_text(screen, line, size, (WIDTH / 2, y + wob), GOLD, outline=7)
        hg = pygame.transform.smoothscale_by(self.hourglass, 1.4)
        w = max(4, int(hg.get_width() * abs(math.cos(self.t * 1.6))))
        hg = pygame.transform.smoothscale(hg, (w, hg.get_height()))
        for x in (WIDTH / 2 - 400, WIDTH / 2 + 400):
            screen.blit(hg, (x - w / 2, 150 + math.sin(self.t * 3) * 6))
        blit_text(screen, f"RÉCORD: {self.game.state.high_score:07d}", 22, (WIDTH / 2, 286), (190, 230, 255))
        self.menu.draw(screen, self.t)
        blit_text(screen, "↑ ↓ para elegir · ENTER para aceptar · F11 pantalla completa", 18,
                  (WIDTH / 2, HEIGHT - 20), (220, 210, 250), outline=2)
        if self.overlay == "controls":
            self._draw_controls(screen)
        elif self.overlay == "credits":
            self._draw_credits(screen)

    def _draw_controls(self, screen):
        dim(screen, 170)
        panel(screen, (WIDTH / 2 - 330, 130, 660, 470))
        blit_text(screen, "CONTROLES", 54, (WIDTH / 2, 185), GOLD, outline=5)
        y = 260
        for k, v in CONTROLS.items():
            blit_text(screen, k, 28, (WIDTH / 2 - 40, y), (190, 230, 255), anchor="midright")
            blit_text(screen, v, 28, (WIDTH / 2 + 10, y), anchor="midleft")
            y += 52
        blit_text(screen, "Salta sobre los enemigos o golpéalos. Mantén REBOBINAR para volver atrás en el tiempo.",
                  18, (WIDTH / 2, y + 14), (230, 220, 255), outline=2)
        blit_text(screen, "(pulsa cualquier tecla)", 20, (WIDTH / 2, 570), (200, 200, 220), outline=2)

    def _draw_credits(self, screen):
        dim(screen, 170)
        panel(screen, (WIDTH / 2 - 330, 150, 660, 420))
        blit_text(screen, "CRÉDITOS", 54, (WIDTH / 2, 205), GOLD, outline=5)
        y = 290
        for role, name in CREDITS:
            blit_text(screen, role, 22, (WIDTH / 2, y), (190, 230, 255))
            blit_text(screen, name, 30, (WIDTH / 2, y + 30))
            y += 68
        blit_text(screen, "(pulsa cualquier tecla)", 20, (WIDTH / 2, 545), (200, 200, 220), outline=2)
