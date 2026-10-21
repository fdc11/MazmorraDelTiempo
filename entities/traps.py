"""Trampas y plataformas especiales.

Para añadir una trampa nueva: crea una clase aquí y regístrala en
levels/level_base.py (diccionario ENTITY_TYPES o símbolos del mapa).
"""
import math

import pygame

from art import world
from core.assets import Assets
from core.physics import circle_rect_overlap
from entities.base import Entity
from settings import INK, TILE


class Spikes(Entity):
    def __init__(self, tx, ty, theme):
        super().__init__(tx * TILE, ty * TILE, TILE, TILE)
        self.img = world.spikes(theme)

    @property
    def rect(self):
        return pygame.Rect(round(self.x) + 6, round(self.y) + 22, TILE - 12, TILE - 22)

    def touch_player(self, level, player):
        if player.hurt(level, None):
            player.vy = -700

    def draw(self, screen, cam):
        screen.blit(self.img, (self.x - cam[0], self.y - cam[1]))


class Saw(Entity):
    """Sierra giratoria que recorre un riel entre dos puntos (en tiles)."""
    RADIUS = 24

    def __init__(self, p1, p2, speed=1.0):
        self.p1 = pygame.Vector2(p1[0] * TILE + TILE / 2, p1[1] * TILE + TILE / 2)
        self.p2 = pygame.Vector2(p2[0] * TILE + TILE / 2, p2[1] * TILE + TILE / 2)
        super().__init__(self.p1.x - self.RADIUS, self.p1.y - self.RADIUS, self.RADIUS * 2, self.RADIUS * 2)
        dist = max(1, self.p1.distance_to(self.p2) / TILE)
        self.rate = speed / dist
        self.phase = 0.0
        self.frames = Assets.saw_rotations()

    def update(self, dt, level):
        super().update(dt, level)
        self.phase += self.rate * dt * math.pi
        k = (1 - math.cos(self.phase)) / 2
        pos = self.p1.lerp(self.p2, k)
        self.x, self.y = pos.x - self.RADIUS, pos.y - self.RADIUS

    def touch_player(self, level, player):
        if circle_rect_overlap(self.centerx, self.centery, self.RADIUS - 3, player.rect):
            player.hurt(level, self.centerx)

    def draw(self, screen, cam):
        a = (self.p1.x - cam[0], self.p1.y - cam[1])
        b = (self.p2.x - cam[0], self.p2.y - cam[1])
        if self.p1 != self.p2:
            pygame.draw.line(screen, INK, a, b, 8)
            pygame.draw.line(screen, (120, 110, 140), a, b, 4)
            for p in (a, b):
                pygame.draw.circle(screen, INK, p, 8)
                pygame.draw.circle(screen, (180, 170, 200), p, 5)
        img = self.frames[int(self.t * 40) % len(self.frames)]
        screen.blit(img, (self.centerx - img.get_width() / 2 - cam[0], self.centery - img.get_height() / 2 - cam[1]))


class PlatformBase(Entity):
    """Interfaz común para plataformas que se pueden pisar."""
    solid_platform = True

    def __init__(self, x, y, w, h):
        super().__init__(x, y, w, h)
        self.active = True
        self.dx = 0.0
        self.prev_top = y

    @property
    def top(self):
        return self.y

    def on_stand(self, body):
        pass


class MovingPlatform(PlatformBase):
    def __init__(self, p1, p2, width, speed, theme):
        self.p1 = pygame.Vector2(p1[0] * TILE, p1[1] * TILE)
        self.p2 = pygame.Vector2(p2[0] * TILE, p2[1] * TILE)
        super().__init__(self.p1.x, self.p1.y, width * TILE, 22)
        dist = max(1, self.p1.distance_to(self.p2) / TILE)
        self.rate = speed / dist
        self.phase = 0.0
        self.img = world.moving_platform(theme, width)

    def update(self, dt, level):
        super().update(dt, level)
        self.prev_top = self.y
        old_x = self.x
        self.phase += self.rate * dt * math.pi
        k = (1 - math.cos(self.phase)) / 2
        pos = self.p1.lerp(self.p2, k)
        self.x, self.y = pos.x, pos.y
        self.dx = self.x - old_x

    def draw(self, screen, cam):
        screen.blit(self.img, (self.x - cam[0], self.y - cam[1]))


class FallingPlatform(PlatformBase):
    SHAKE = 0.45
    RESPAWN = 3.0

    def __init__(self, tx, ty, theme):
        super().__init__(tx * TILE, ty * TILE, TILE, 26)
        self.home = (self.x, self.y)
        self.img = world.falling_block(theme)
        self.state = "idle"
        self.timer = 0.0
        self.vy = 0.0
        self.t = 1.0

    def on_stand(self, body):
        if self.state == "idle" and getattr(body, "is_player", False):
            self.state = "shaking"
            self.timer = self.SHAKE

    def update(self, dt, level):
        super().update(dt, level)
        self.prev_top = self.y
        if self.state == "shaking":
            self.timer -= dt
            if self.timer <= 0:
                self.state = "falling"
                self.vy = 0
                level.particles.dust(self.centerx, self.y + self.h, 6)
        elif self.state == "falling":
            self.vy = min(1000, self.vy + 2200 * dt)
            self.y += self.vy * dt
            if self.y > level.tilemap.px_h + 100:
                self.state = "gone"
                self.active = False
                self.timer = self.RESPAWN
        elif self.state == "gone":
            self.timer -= dt
            if self.timer <= 0:
                self.x, self.y = self.home
                self.prev_top = self.y
                self.state = "idle"
                self.active = True
                self.t = 0

    def draw(self, screen, cam):
        if self.state == "gone":
            return
        ox = math.sin(self.t * 80) * 2.5 if self.state == "shaking" else 0
        img = self.img
        if self.state == "idle" and self.t < 0.4:
            img = img.copy()
            img.set_alpha(int(255 * self.t / 0.4))
        screen.blit(img, (self.x + ox - cam[0], self.y - cam[1]))
