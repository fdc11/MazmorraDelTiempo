"""Piezas reutilizables de interfaz: paneles, barras y botones."""
import math

import pygame

from settings import INK, WHITE
from art.text import blit_text, text


def panel(screen, rect, color=(34, 24, 54), alpha=200, radius=16, border=(255, 255, 255), border_alpha=60):
    rect = pygame.Rect(rect)
    surf = pygame.Surface(rect.size, pygame.SRCALPHA)
    pygame.draw.rect(surf, (*INK, min(255, alpha + 40)), surf.get_rect(), border_radius=radius)
    pygame.draw.rect(surf, (*color, alpha), surf.get_rect().inflate(-6, -6), border_radius=radius - 3)
    pygame.draw.rect(surf, (*border, border_alpha), surf.get_rect().inflate(-6, -6), 2, border_radius=radius - 3)
    screen.blit(surf, rect)


def bar(screen, rect, value, max_value, color, back=(40, 30, 60), reverse=False, radius=8, shine=True):
    rect = pygame.Rect(rect)
    pygame.draw.rect(screen, INK, rect.inflate(6, 6), border_radius=radius + 3)
    pygame.draw.rect(screen, back, rect, border_radius=radius)
    frac = max(0.0, min(1.0, value / max_value)) if max_value else 0
    w = int(rect.w * frac)
    if w > 0:
        fill = pygame.Rect(rect.right - w if reverse else rect.left, rect.top, w, rect.h)
        pygame.draw.rect(screen, color, fill, border_radius=radius)
        if shine:
            hl = fill.inflate(-6, 0)
            hl.h = max(2, rect.h // 4)
            hl.top = rect.top + 3
            light = tuple(min(255, c + 70) for c in color)
            pygame.draw.rect(screen, light, hl, border_radius=radius // 2)


class Button:
    def __init__(self, label, center, action, width=320, height=64, color=(255, 190, 60)):
        self.label = label
        self.center = center
        self.action = action
        self.rect = pygame.Rect(0, 0, width, height)
        self.rect.center = center
        self.color = color
        self.hover = 0.0

    def update(self, dt, selected):
        target = 1.0 if selected else 0.0
        self.hover += (target - self.hover) * min(1, dt * 12)

    def draw(self, screen, t=0.0):
        scale = 1 + self.hover * 0.08
        r = self.rect.copy()
        r.w, r.h = int(r.w * scale), int(r.h * scale)
        r.center = self.center
        # sombra
        sh = pygame.Surface(r.inflate(8, 8).size, pygame.SRCALPHA)
        pygame.draw.rect(sh, (0, 0, 0, 80), sh.get_rect(), border_radius=20)
        screen.blit(sh, r.inflate(8, 8).move(0, 8))
        pygame.draw.rect(screen, INK, r.inflate(8, 8), border_radius=20)
        base = self.color if self.hover > 0.5 else (236, 226, 248)
        pygame.draw.rect(screen, tuple(max(0, c - 50) for c in base), r, border_radius=16)
        top = r.copy()
        top.h -= 6
        pygame.draw.rect(screen, base, top, border_radius=16)
        hl = top.inflate(-24, 0)
        hl.h = 8
        hl.top = top.top + 6
        pygame.draw.rect(screen, tuple(min(255, c + 40) for c in base), hl, border_radius=4)
        wob = math.sin(t * 6) * 2 * self.hover
        blit_text(screen, self.label, int(30 * scale), (r.centerx, r.centery - 3 + wob), WHITE if self.hover > 0.5 else (70, 56, 96),
                  outline=3 if self.hover > 0.5 else 0, shadow=False)


class ButtonList:
    """Menú vertical navegable con teclado, mando y ratón."""

    def __init__(self, buttons, audio=None):
        self.buttons = buttons
        self.index = 0
        self.audio = audio

    def handle_event(self, e):
        old = self.index
        if e.type == pygame.KEYDOWN:
            if e.key in (pygame.K_UP, pygame.K_w):
                self.index = (self.index - 1) % len(self.buttons)
            elif e.key in (pygame.K_DOWN, pygame.K_s):
                self.index = (self.index + 1) % len(self.buttons)
            elif e.key in (pygame.K_RETURN, pygame.K_SPACE, pygame.K_KP_ENTER, pygame.K_j, pygame.K_x):
                return self._activate()
        elif e.type == pygame.JOYHATMOTION:
            if e.value[1] > 0:
                self.index = (self.index - 1) % len(self.buttons)
            elif e.value[1] < 0:
                self.index = (self.index + 1) % len(self.buttons)
        elif e.type == pygame.JOYBUTTONDOWN and e.button == 0:
            return self._activate()
        elif e.type == pygame.MOUSEMOTION:
            for i, b in enumerate(self.buttons):
                if b.rect.collidepoint(e.pos):
                    self.index = i
        elif e.type == pygame.MOUSEBUTTONDOWN and e.button == 1:
            for i, b in enumerate(self.buttons):
                if b.rect.collidepoint(e.pos):
                    self.index = i
                    return self._activate()
        if old != self.index and self.audio:
            self.audio.play("select")
        return None

    def _activate(self):
        if self.audio:
            self.audio.play("confirm")
        return self.buttons[self.index].action

    def update(self, dt):
        for i, b in enumerate(self.buttons):
            b.update(dt, i == self.index)

    def draw(self, screen, t=0.0):
        for b in self.buttons:
            b.draw(screen, t)


def dim(screen, alpha=150, color=(14, 8, 30)):
    s = pygame.Surface(screen.get_size(), pygame.SRCALPHA)
    s.fill((*color, alpha))
    screen.blit(s, (0, 0))


def icon_text(screen, icon, msg, size, pos):
    """Icono + texto alineados a la izquierda."""
    x, y = pos
    screen.blit(icon, (x, y - icon.get_height() / 2))
    surf = text(msg, size)
    screen.blit(surf, (x + icon.get_width() + 6, y - surf.get_height() / 2))
