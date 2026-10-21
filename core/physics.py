"""Colisiones con el mapa de tiles y plataformas.

Física "de plataformas clásica": NO es realista a propósito. Se mueve un eje
a la vez (primero X, luego Y) y se corrige la posición contra los tiles.
"""
import math

import pygame

from settings import TILE

SOLID_CHARS = set("#k")
ONEWAY_CHARS = set("=")


class TileMap:
    def __init__(self, rows):
        self.rows = rows
        self.h = len(rows)
        self.w = max(len(r) for r in rows)
        self.px_w = self.w * TILE
        self.px_h = self.h * TILE

    def char(self, tx, ty):
        if ty < 0 or ty >= self.h or tx < 0 or tx >= self.w:
            return "."
        row = self.rows[ty]
        return row[tx] if tx < len(row) else "."

    def solid(self, tx, ty):
        # Los bordes izquierdo/derecho del nivel son paredes; arriba y abajo no.
        if tx < 0 or tx >= self.w:
            return 0 <= ty < self.h or ty < 0
        return self.char(tx, ty) in SOLID_CHARS

    def oneway(self, tx, ty):
        return self.char(tx, ty) in ONEWAY_CHARS


class Body:
    """Cualquier cosa que se mueve con física contra el mapa."""

    def __init__(self, x, y, w, h):
        self.x, self.y = float(x), float(y)
        self.w, self.h = w, h
        self.vx = self.vy = 0.0
        self.on_ground = False
        self.hit_wall = 0          # -1 izquierda, 1 derecha
        self.hit_ceiling = False
        self.ground_platform = None
        self.drop_through = 0.0    # tiempo atravesando plataformas de un sentido

    @property
    def rect(self):
        return pygame.Rect(round(self.x), round(self.y), self.w, self.h)

    @property
    def centerx(self):
        return self.x + self.w / 2

    @property
    def centery(self):
        return self.y + self.h / 2

    @property
    def bottom(self):
        return self.y + self.h


def move_body(body, dt, tilemap, platforms=(), use_oneway=True):
    """Mueve `body` según su velocidad resolviendo colisiones."""
    body.hit_wall = 0
    body.hit_ceiling = False
    if body.drop_through > 0:
        body.drop_through -= dt

    # Arrastre de plataformas móviles sobre las que estaba parado
    if body.ground_platform is not None and body.ground_platform.active:
        p = body.ground_platform
        body.x += p.dx
        body.y = p.top - body.h

    # --- Eje X ---
    body.x += body.vx * dt
    r = body.rect
    ty0, ty1 = r.top // TILE, (r.bottom - 1) // TILE
    if body.vx > 0:
        tx = (r.right - 1) // TILE
        for ty in range(ty0, ty1 + 1):
            if tilemap.solid(tx, ty):
                body.x = tx * TILE - body.w
                body.vx = 0
                body.hit_wall = 1
                break
    elif body.vx < 0:
        tx = r.left // TILE
        for ty in range(ty0, ty1 + 1):
            if tilemap.solid(tx, ty):
                body.x = (tx + 1) * TILE
                body.vx = 0
                body.hit_wall = -1
                break

    # --- Eje Y ---
    prev_bottom = body.y + body.h
    body.y += body.vy * dt
    r = body.rect
    tx0, tx1 = r.left // TILE, (r.right - 1) // TILE
    was_on_ground = body.on_ground
    body.on_ground = False
    body.ground_platform = None
    if body.vy >= 0:
        ty = (r.bottom - 1) // TILE
        for tx in range(tx0, tx1 + 1):
            top = ty * TILE
            if tilemap.solid(tx, ty) or (use_oneway and tilemap.oneway(tx, ty) and prev_bottom <= top + 2
                                         and body.drop_through <= 0):
                body.y = top - body.h
                body.vy = 0
                body.on_ground = True
                break
        if not body.on_ground:
            for p in platforms:
                if not p.active or body.drop_through > 0:
                    continue
                if (r.right > p.rect.left + 2 and r.left < p.rect.right - 2
                        and prev_bottom <= max(p.prev_top, p.top) + 4 and body.y + body.h >= p.top):
                    body.y = p.top - body.h
                    body.vy = 0
                    body.on_ground = True
                    body.ground_platform = p
                    p.on_stand(body)
                    break
    else:
        ty = r.top // TILE
        for tx in range(tx0, tx1 + 1):
            if tilemap.solid(tx, ty):
                body.y = (ty + 1) * TILE
                body.vy = 0
                body.hit_ceiling = True
                break
    return was_on_ground


def ledge_ahead(body, tilemap, direction):
    """True si el tile delante-abajo está vacío (para que los enemigos den la vuelta)."""
    x = body.x + body.w + 2 if direction > 0 else body.x - 2
    tx = int(x // TILE)
    ty = int((body.y + body.h + 4) // TILE)
    return not (tilemap.solid(tx, ty) or tilemap.oneway(tx, ty))


def approach(value, target, step):
    if value < target:
        return min(value + step, target)
    return max(value - step, target)


def circle_rect_overlap(cx, cy, radius, rect):
    nx = max(rect.left, min(cx, rect.right))
    ny = max(rect.top, min(cy, rect.bottom))
    return math.hypot(cx - nx, cy - ny) < radius
