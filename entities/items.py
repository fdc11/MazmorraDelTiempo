"""Coleccionables y objetos de nivel: relojes de arena, corazones,
banderas de control (checkpoints) y el portal de salida."""
import math

import pygame

from art import world
from core.assets import Assets
from entities.base import Entity
from settings import INK, SCORE_HOURGLASS, TILE
from art.text import text as render_text


class Hourglass(Entity):
    def __init__(self, tx, ty):
        super().__init__(tx * TILE + 10, ty * TILE + 6, 28, 36)
        self.img = world.hourglass()
        self.glow = world.glow(34, (255, 220, 120), 90)
        self.t = (tx * 0.37) % 3

    def touch_player(self, level, player):
        self.alive = False
        level.state.hourglasses += 1
        level.state.add_score(SCORE_HOURGLASS)
        level.audio.play("coin")
        level.particles.sparkle(self.centerx, self.centery)
        level.float_text(f"+{SCORE_HOURGLASS}", self.centerx, self.y)

    def draw(self, screen, cam):
        bob = math.sin(self.t * 3) * 4
        x, y = self.centerx - cam[0], self.centery - cam[1] + bob
        screen.blit(self.glow, (x - 34, y - 34), special_flags=pygame.BLEND_RGB_ADD)
        sx = abs(math.cos(self.t * 2.2))
        img = self.img
        w = max(4, int(img.get_width() * (0.25 + 0.75 * sx)))
        img = pygame.transform.smoothscale(img, (w, img.get_height()))
        screen.blit(img, (x - w / 2, y - img.get_height() / 2))


class Heart(Entity):
    def __init__(self, tx, ty):
        super().__init__(tx * TILE + 8, ty * TILE + 8, 32, 30)
        self.img = world.heart(30)

    def touch_player(self, level, player):
        self.alive = False
        if player.heal():
            level.audio.play("heal")
            level.float_text("+1 ♥", self.centerx, self.y, (255, 120, 140))
        else:
            level.state.add_score(500)
            level.audio.play("coin")
            level.float_text("+500", self.centerx, self.y)
        level.particles.sparkle(self.centerx, self.centery, (255, 110, 130))

    def draw(self, screen, cam):
        beat = 1 + max(0, math.sin(self.t * 6)) * 0.12
        img = pygame.transform.smoothscale_by(self.img, beat)
        y = self.centery + math.sin(self.t * 2.5) * 3
        screen.blit(img, (self.centerx - img.get_width() / 2 - cam[0], y - img.get_height() / 2 - cam[1]))


class Checkpoint(Entity):
    def __init__(self, tx, ty):
        # la bandera se apoya sobre el suelo del tile (ty es la celda donde se dibuja)
        super().__init__(tx * TILE + 2, (ty + 1) * TILE - 100, 44, 100)
        self.active = False
        self.down = Assets.flag(False)
        self.up = Assets.flag(True)
        self.spawn = (tx * TILE + 8, (ty + 1) * TILE - 66)

    def touch_player(self, level, player):
        if not self.active:
            self.active = True
            level.set_checkpoint(self)
            level.audio.play("checkpoint")
            level.particles.sparkle(self.centerx, self.y + 20, (120, 255, 140))
            level.float_text("¡PUNTO DE CONTROL!", self.centerx, self.y - 10, (140, 255, 160))

    def draw(self, screen, cam):
        frames = self.up if self.active else self.down
        img = frames[int(self.t * 10) % len(frames)]
        screen.blit(img, (self.x - cam[0], self.y - cam[1]))


class Portal(Entity):
    def __init__(self, tx, ty, hidden=False):
        super().__init__(tx * TILE - 24, (ty + 1) * TILE - 130, 96, 132)
        self.frames = Assets.portal()
        self.glow = world.glow(110, (140, 110, 255))
        self.hidden = hidden
        self.appear = 0.0 if hidden else 1.0

    @property
    def rect(self):
        return pygame.Rect(round(self.x) + 26, round(self.y) + 20, 44, 104)

    def show(self):
        self.hidden = False

    def update(self, dt, level):
        super().update(dt, level)
        if not self.hidden and self.appear < 1:
            self.appear = min(1, self.appear + dt * 1.5)
        if not self.hidden and self.t % 0.2 < dt:
            level.particles.emit(self.centerx, self.centery, 1, (190, 160, 255), speed=(30, 90),
                                 life=(0.5, 1.0), size=(3, 6), gravity=-40, kind="star")

    def touch_player(self, level, player):
        if not self.hidden and self.appear >= 1:
            level.complete()

    def draw(self, screen, cam):
        if self.hidden:
            return
        img = self.frames[int(self.t * 14) % len(self.frames)]
        if self.appear < 1:
            img = pygame.transform.smoothscale_by(img, max(0.05, self.appear))
        cx, cy = self.centerx - cam[0], self.centery - cam[1]
        pulse = 1 + math.sin(self.t * 3) * 0.08
        g = pygame.transform.smoothscale_by(self.glow, pulse * self.appear) if self.appear > 0.05 else None
        if g:
            screen.blit(g, (cx - g.get_width() / 2, cy - g.get_height() / 2), special_flags=pygame.BLEND_RGB_ADD)
        screen.blit(img, (cx - img.get_width() / 2, cy - img.get_height() / 2))


class Sign(Entity):
    """Cartel de madera; muestra un consejo cuando el jugador se acerca."""

    def __init__(self, tx, ty, msg):
        super().__init__(tx * TILE + 6, (ty + 1) * TILE - 46, 36, 46)
        self.msg = msg
        self.show = 0.0
        self.img = _sign_image()

    @property
    def rect(self):
        return pygame.Rect(0, 0, 0, 0)   # no colisiona con nada

    def update(self, dt, level):
        super().update(dt, level)
        near = level.player and abs(level.player.centerx - self.centerx) < 130 and abs(level.player.y - self.y) < 160
        self.show = max(0.0, min(1.0, self.show + (dt * 5 if near else -dt * 5)))

    def draw(self, screen, cam):
        screen.blit(self.img, (self.x - 4 - cam[0], self.y - 4 - cam[1]))
        if self.show <= 0:
            return
        txt = render_text(self.msg, 20, outline=0, shadow=False, color=(60, 40, 70))
        w, h = txt.get_width() + 32, txt.get_height() + 22
        bx = self.centerx - w / 2 - cam[0]
        by = self.y - h - 22 - cam[1] + (1 - self.show) * 12
        bubble = pygame.Surface((w, h + 14), pygame.SRCALPHA)
        pygame.draw.rect(bubble, INK, (0, 0, w, h), border_radius=14)
        pygame.draw.rect(bubble, (255, 250, 236), (3, 3, w - 6, h - 6), border_radius=12)
        pygame.draw.polygon(bubble, INK, [(w / 2 - 12, h - 3), (w / 2 + 12, h - 3), (w / 2, h + 13)])
        pygame.draw.polygon(bubble, (255, 250, 236), [(w / 2 - 8, h - 4), (w / 2 + 8, h - 4), (w / 2, h + 8)])
        bubble.blit(txt, (16, 11))
        bubble.set_alpha(int(255 * self.show))
        screen.blit(bubble, (bx, by))

    def on_screen(self, cam, margin=400):
        return super().on_screen(cam, margin) or True


_SIGN = None


def _sign_image():
    global _SIGN
    if _SIGN is None:
        from art.draw import SS, canvas, finish, outline, rrect
        s = SS
        surf = canvas(44, 54)
        rrect(surf, (120, 76, 44), 18, 22, 8, 32, 2, s)
        rrect(surf, (196, 128, 68), 2, 4, 40, 24, 5, s)
        rrect(surf, (226, 160, 96), 5, 6, 34, 4, 2, s)
        for y in (14, 20):
            rrect(surf, (150, 96, 52), 9, y, 26, 2.4, 1, s)
        _SIGN = finish(outline(surf, 2 * s), 48, 58)
    return _SIGN
