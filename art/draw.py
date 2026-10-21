"""Herramientas de dibujo vectorial "cartoon".

Todo el arte del juego se genera por código con estas funciones:
  * Se dibuja a resolución x3 (supersampling) y luego se reduce con
    smoothscale -> bordes suaves, sin aspecto pixelado.
  * `outline()` añade el contorno oscuro tipo sticker/caricatura.

Si algún día el equipo consigue un pack de sprites (Kenney, CraftPix...),
basta con cargar PNGs en lugar de llamar a estos generadores.
"""
import math
import random

import pygame

from settings import INK

SS = 3  # factor de supersampling


def canvas(w, h, scale=SS):
    """Superficie transparente a resolución aumentada."""
    return pygame.Surface((int(w * scale), int(h * scale)), pygame.SRCALPHA)


def finish(surf, w, h):
    """Reduce una superficie supersampleada a su tamaño final."""
    return pygame.transform.smoothscale(surf, (int(w), int(h)))


def shade(color, amount):
    """Aclara (amount>0) u oscurece (amount<0) un color. amount en -1..1."""
    r, g, b = color[:3]
    if amount >= 0:
        return (int(r + (255 - r) * amount), int(g + (255 - g) * amount), int(b + (255 - b) * amount))
    a = 1 + amount
    return (int(r * a), int(g * a), int(b * a))


def mix(c1, c2, t):
    return tuple(int(c1[i] + (c2[i] - c1[i]) * t) for i in range(3))


def outline(surf, thickness, color=INK):
    """Devuelve una copia de `surf` con contorno exterior uniforme."""
    t = int(thickness)
    w, h = surf.get_size()
    out = pygame.Surface((w + 2 * t, h + 2 * t), pygame.SRCALPHA)
    sil = pygame.mask.from_surface(surf, 40).to_surface(setcolor=(*color, 255), unsetcolor=(0, 0, 0, 0))
    steps = 16
    for i in range(steps):
        a = 2 * math.pi * i / steps
        out.blit(sil, (t + round(math.cos(a) * t), t + round(math.sin(a) * t)))
    out.blit(sil, (t, t))
    out.blit(surf, (t, t))
    return out


def sprite(w, h, painter, outline_px=2.2, pad=4):
    """Atajo: crea un lienzo, llama a painter(surf, s) y devuelve el sprite final.

    `painter` recibe la superficie y el factor de escala `s` (coordenadas
    lógicas * s = coordenadas reales del lienzo).
    """
    s = SS
    surf = canvas(w + pad * 2, h + pad * 2)
    painter(surf, s, pad)
    if outline_px:
        surf = outline(surf, outline_px * s)
        total_w = w + pad * 2 + outline_px * 2
        total_h = h + pad * 2 + outline_px * 2
    else:
        total_w, total_h = w + pad * 2, h + pad * 2
    return finish(surf, total_w, total_h)


# --- Primitivas (coordenadas lógicas; `s` es la escala) ---------------------

def circle(surf, color, cx, cy, r, s=SS):
    pygame.draw.circle(surf, color, (cx * s, cy * s), max(1, r * s))


def ellipse(surf, color, cx, cy, rx, ry, s=SS):
    rect = pygame.Rect(0, 0, max(1, rx * 2 * s), max(1, ry * 2 * s))
    rect.center = (cx * s, cy * s)
    pygame.draw.ellipse(surf, color, rect)


def rrect(surf, color, x, y, w, h, r, s=SS):
    pygame.draw.rect(surf, color, pygame.Rect(x * s, y * s, max(1, w * s), max(1, h * s)), border_radius=int(r * s))


def poly(surf, color, pts, s=SS):
    pygame.draw.polygon(surf, color, [(x * s, y * s) for x, y in pts])


def capsule(surf, color, x1, y1, x2, y2, width, s=SS, ink=None, ink_w=1.6):
    """Segmento grueso con extremos redondeados (brazos, piernas, cadenas).

    Si `ink` se pasa, se dibuja primero un borde de ese color.
    """
    if ink is not None:
        _capsule(surf, ink, x1, y1, x2, y2, width + ink_w * 2, s)
    _capsule(surf, color, x1, y1, x2, y2, width, s)


def _capsule(surf, color, x1, y1, x2, y2, width, s):
    w = width * s
    p1 = pygame.Vector2(x1 * s, y1 * s)
    p2 = pygame.Vector2(x2 * s, y2 * s)
    d = p2 - p1
    if d.length() > 0.01:
        n = pygame.Vector2(-d.y, d.x).normalize() * (w / 2)
        pygame.draw.polygon(surf, color, [p1 + n, p2 + n, p2 - n, p1 - n])
    pygame.draw.circle(surf, color, p1, w / 2)
    pygame.draw.circle(surf, color, p2, w / 2)


def vgradient(w, h, top, bottom):
    """Superficie con degradado vertical (rápido: 1 px de ancho y se estira)."""
    col = pygame.Surface((1, max(2, h)))
    for y in range(h):
        col.set_at((0, y), mix(top, bottom, y / max(1, h - 1)))
    return pygame.transform.smoothscale(col, (w, h))


def radial_glow(radius, color, strength=180):
    """Halo circular suave (luz de antorchas, portales, sol)."""
    size = radius * 2
    surf = pygame.Surface((size, size), pygame.SRCALPHA)
    steps = 24
    for i in range(steps, 0, -1):
        t = i / steps
        alpha = int(strength * (1 - t) ** 1.6)
        pygame.draw.circle(surf, (*color, alpha), (radius, radius), int(radius * t))
    return surf


def rng(seed):
    return random.Random(seed)
