"""Carteles a pantalla completa: título del nivel, nivel completado, avisos."""
import math

import pygame

from settings import GOLD, HEIGHT, INK, WIDTH
from art.text import blit_text
from ui.widgets import panel


def _ease_out(t):
    return 1 - (1 - max(0, min(1, t))) ** 3


def draw_intro(screen, level, index, age):
    """Cinta con el nombre del nivel que entra desde la izquierda y se va."""
    total = 2.4
    if age < 0.45:
        k = _ease_out(age / 0.45)
    elif age > total - 0.45:
        k = 1 - _ease_out((age - (total - 0.45)) / 0.45)
    else:
        k = 1
    y = HEIGHT * 0.42
    w = WIDTH * k
    ribbon = pygame.Surface((WIDTH, 170), pygame.SRCALPHA)
    pygame.draw.rect(ribbon, (*INK, 220), (0, 0, w, 170))
    pygame.draw.rect(ribbon, (255, 200, 60, 255), (0, 8, w, 6))
    pygame.draw.rect(ribbon, (255, 200, 60, 255), (0, 156, w, 6))
    screen.blit(ribbon, (0, y - 85))
    if k > 0.6:
        a = int(255 * min(1, (k - 0.6) / 0.4))
        blit_text(screen, f"NIVEL {index + 1}", 30, (WIDTH / 2, y - 46), (160, 230, 255), alpha=a)
        blit_text(screen, level.name.upper(), 62, (WIDTH / 2, y + 4), GOLD, outline=5, alpha=a)
        if level.subtitle:
            blit_text(screen, level.subtitle, 26, (WIDTH / 2, y + 54), alpha=a)


def draw_complete(screen, age, bonus):
    k = _ease_out(age / 0.4)
    rect = pygame.Rect(0, 0, 620, 220)
    rect.center = (WIDTH / 2, HEIGHT * 0.4 + (1 - k) * 60)
    panel(screen, rect, alpha=int(210 * k))
    s = 1 + max(0, 0.25 - age) * 2
    blit_text(screen, "¡NIVEL COMPLETADO!", 52, (rect.centerx, rect.top + 64), GOLD, outline=5, scale=s, alpha=int(255 * k))
    if age > 0.6:
        blit_text(screen, f"Bonus de tiempo  +{bonus}", 32, (rect.centerx, rect.top + 140), (190, 240, 255))
    t = pygame.time.get_ticks() / 1000
    for i in range(3):
        a = t * 2 + i * 2.1
        x = rect.centerx + math.cos(a) * 280
        y = rect.top + 30 + math.sin(a * 1.3) * 10
        pygame.draw.circle(screen, (255, 230, 120), (x, y), 4)


def draw_banner(screen, msg):
    blit_text(screen, msg, 64, (WIDTH / 2, HEIGHT * 0.4), (255, 120, 120), outline=5)
