"""Clase base para todo lo que vive dentro de un nivel."""
import pygame


class Entity:
    """Objeto del nivel. Las subclases sobrescriben lo que necesiten."""
    solid_platform = False     # True si se puede pisar (plataformas)

    def __init__(self, x, y, w, h):
        self.x, self.y, self.w, self.h = float(x), float(y), w, h
        self.alive = True
        self.t = 0.0

    @property
    def rect(self):
        return pygame.Rect(round(self.x), round(self.y), self.w, self.h)

    @property
    def centerx(self):
        return self.x + self.w / 2

    @property
    def centery(self):
        return self.y + self.h / 2

    def update(self, dt, level):
        self.t += dt

    def touch_player(self, level, player):
        """Se llama cuando el rectángulo del jugador toca este objeto."""

    def draw(self, screen, cam):
        pass

    def on_screen(self, cam, margin=120):
        from settings import WIDTH, HEIGHT
        r = self.rect
        return (r.right > cam[0] - margin and r.left < cam[0] + WIDTH + margin
                and r.bottom > cam[1] - margin and r.top < cam[1] + HEIGHT + margin)
