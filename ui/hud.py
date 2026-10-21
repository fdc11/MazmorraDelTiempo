"""HUD: corazones, vidas, tiempo, puntos, energía de rebobinado
y barras de vida estilo Street Fighter en la pelea contra el jefe."""
import math

import pygame

from art import world
from core.assets import Assets
from settings import GOLD, MAX_HEALTH, REWIND_MAX_ENERGY, WIDTH, HEIGHT, INK
from art.text import blit_text
from ui.widgets import bar, panel


class HUD:
    def __init__(self):
        self.heart = world.heart(34)
        self.heart_empty = world.heart_empty(34)
        self.hourglass = pygame.transform.smoothscale_by(world.hourglass(), 0.75)
        idle = Assets.player()["right"]["idle"][0]
        self.face = idle.subsurface(pygame.Rect(14, 4, 54, 50)).copy()
        self.face = pygame.transform.smoothscale_by(self.face, 0.8)
        self.shown_score = 0
        self.heart_pulse = [0.0] * MAX_HEALTH
        self.last_health = MAX_HEALTH

    def update(self, dt, state, player):
        diff = state.score - self.shown_score
        self.shown_score += max(1, int(diff * min(1, dt * 10))) if diff > 0 else diff
        if player.health != self.last_health:
            for i in range(MAX_HEALTH):
                self.heart_pulse[i] = 0.4
            self.last_health = player.health
        self.heart_pulse = [max(0, p - dt) for p in self.heart_pulse]

    # ------------------------------------------------------------------
    def draw(self, screen, state, player, level, time_left):
        t = pygame.time.get_ticks() / 1000
        boss = level.boss
        if boss and level.boss_started and not boss.dead:
            self._draw_fight(screen, player, boss, time_left, t)
        else:
            self._draw_normal(screen, state, player, time_left, t)
        self._draw_rewind(screen, player, t)
        if level.announcement:
            self._draw_announcement(screen, level.announcement)

    def _hearts(self, screen, player, x, y):
        for i in range(MAX_HEALTH):
            img = self.heart if i < player.health else self.heart_empty
            s = 1 + self.heart_pulse[i] * 0.6
            if i == player.health - 1 and player.health == 1:
                s += abs(math.sin(pygame.time.get_ticks() / 150)) * 0.12
            if s != 1:
                img = pygame.transform.smoothscale_by(img, s)
            screen.blit(img, (x + i * 40 - (img.get_width() - 42) / 2, y - (img.get_height() - 42) / 2))

    def _draw_normal(self, screen, state, player, time_left, t):
        # Vida y vidas
        panel(screen, (16, 14, 250, 64), alpha=170)
        screen.blit(self.face, (24, 16))
        blit_text(screen, f"x{state.lives}", 26, (74, 46), anchor="midleft")
        self._hearts(screen, player, 118, 25)
        # Tiempo
        secs = max(0, int(math.ceil(time_left)))
        col = (255, 255, 255)
        scale = 1.0
        if secs <= 30:
            col = (255, 110, 110)
            scale = 1 + max(0, math.sin(t * 8)) * 0.08
        panel(screen, (WIDTH / 2 - 90, 14, 180, 64), alpha=170)
        self._clock_icon(screen, WIDTH / 2 - 52, 46, t)
        blit_text(screen, f"{secs // 60}:{secs % 60:02d}", 32, (WIDTH / 2 + 18, 46), col, scale=scale)
        # Puntos y relojes
        panel(screen, (WIDTH - 316, 14, 300, 64), alpha=170)
        screen.blit(self.hourglass, (WIDTH - 302, 20))
        blit_text(screen, f"{state.hourglasses}", 26, (WIDTH - 266, 46), GOLD, anchor="midleft")
        blit_text(screen, f"{int(self.shown_score):07d}", 30, (WIDTH - 30, 46), anchor="midright")

    def _clock_icon(self, screen, x, y, t):
        pygame.draw.circle(screen, INK, (x, y), 17)
        pygame.draw.circle(screen, (250, 240, 214), (x, y), 14)
        a = t * 2
        pygame.draw.line(screen, (220, 50, 60), (x, y), (x + math.cos(a) * 11, y + math.sin(a) * 11), 3)
        pygame.draw.line(screen, INK, (x, y), (x + math.cos(a / 12) * 7, y + math.sin(a / 12) * 7), 4)
        pygame.draw.circle(screen, INK, (x, y), 3)

    def _draw_rewind(self, screen, player, t):
        x, y = 22, HEIGHT - 44
        blit_text(screen, "TIEMPO", 18, (x, y - 22), (160, 230, 255), anchor="midleft")
        col = (90, 200, 255) if not player.rewinding else (170, 240, 255)
        bar(screen, (x, y - 8, 200, 16), player.rewind_energy, REWIND_MAX_ENERGY, col, radius=7)
        if player.rewinding:
            blit_text(screen, "◄◄ REBOBINANDO", 22, (x + 214, y), (170, 240, 255), anchor="midleft",
                      alpha=int(160 + 95 * abs(math.sin(t * 6))))

    def _draw_fight(self, screen, player, boss, time_left, t):
        """Barras de vida tipo Street Fighter."""
        w = 470
        # Jugador (izquierda)
        bar(screen, (40, 30, w, 30), player.health, MAX_HEALTH, (255, 214, 60), back=(160, 30, 40), radius=6)
        blit_text(screen, "KAI", 26, (44, 82), anchor="midleft")
        screen.blit(self.face, (40 + w - 50, 62))
        # Jefe (derecha, la barra se vacía hacia la derecha)
        bx = WIDTH - 40 - w
        hp_col = (255, 214, 60) if not boss.phase2 else (255, 140, 60)
        bar(screen, (bx, 30, w, 30), boss.hp, boss.MAX_HP, hp_col, back=(160, 30, 40), reverse=True, radius=6)
        blit_text(screen, boss.NAME, 26, (WIDTH - 44, 82), anchor="midright")
        # Centro: KO / tiempo
        pygame.draw.circle(screen, INK, (WIDTH // 2, 46), 40)
        pygame.draw.circle(screen, (200, 40, 60), (WIDTH // 2, 46), 34)
        secs = max(0, int(math.ceil(time_left)))
        blit_text(screen, f"{min(99, secs)}", 30, (WIDTH // 2, 46))
        if boss.phase2:
            blit_text(screen, "¡FURIA!", 20, (bx + w / 2, 82), (255, 150, 80), alpha=int(150 + 100 * abs(math.sin(t * 5))))

    def _draw_announcement(self, screen, ann):
        msg, left, total, sub = ann
        age = total - left
        scale = min(1.0, age / 0.18) if age < 0.18 else 1 + max(0, 0.1 - (age - 0.18)) * 0.5
        alpha = 255 if left > 0.3 else int(255 * left / 0.3)
        blit_text(screen, msg, 96, (WIDTH / 2, HEIGHT * 0.36), (255, 214, 60), outline=6, alpha=alpha,
                  scale=max(0.05, scale))
        if sub and age > 0.35:
            blit_text(screen, sub, 46, (WIDTH / 2, HEIGHT * 0.36 + 80), (255, 255, 255), outline=4, alpha=alpha)
