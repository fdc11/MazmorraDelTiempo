"""Arte del mundo: tiles, plataformas, trampas, objetos y decoración.

Los temas visuales ("desierto", "castillo", "reloj") se definen en THEMES.
Un diseñador de niveles solo elige el tema en el JSON del nivel.
"""
import math
from functools import lru_cache

import pygame

from art.draw import (canvas, capsule, circle, ellipse, finish, outline, poly,
                      radial_glow, rng, rrect, shade, SS)
from settings import INK, TILE

THEMES = {
    "desierto": {
        "top": (250, 214, 112), "body": (224, 168, 98), "mortar": (196, 138, 80),
        "plank": (184, 116, 64), "accent": (70, 170, 200),
        "sky_top": (86, 168, 248), "sky_bottom": (255, 222, 168),
        "far": (244, 196, 138), "mid": (226, 160, 96), "near": (204, 136, 78),
        "slime": (128, 206, 92),
    },
    "castillo": {
        "top": (112, 202, 84), "body": (132, 140, 168), "mortar": (104, 110, 140),
        "plank": (150, 98, 60), "accent": (220, 60, 70),
        "sky_top": (96, 176, 255), "sky_bottom": (214, 238, 255),
        "far": (168, 188, 230), "mid": (112, 172, 122), "near": (78, 140, 98),
        "slime": (236, 96, 150),
    },
    "reloj": {
        "top": (236, 186, 82), "body": (112, 86, 156), "mortar": (86, 64, 124),
        "plank": (190, 136, 70), "accent": (90, 240, 255),
        "sky_top": (26, 20, 66), "sky_bottom": (124, 74, 158),
        "far": (64, 48, 118), "mid": (86, 60, 136), "near": (60, 40, 96),
        "slime": (90, 220, 210),
    },
}


# ---------------------------------------------------------------------------
# TILES SÓLIDOS (con auto-tiling por vecinos)
# ---------------------------------------------------------------------------
@lru_cache(maxsize=512)
def solid_tile(theme, up, down, left, right, variant, depth):
    """Tile de 48x48. up/down/left/right = True si hay un sólido vecino."""
    th = THEMES[theme]
    s = SS
    T = TILE
    surf = canvas(T, T)
    r = 12
    ink_w = 3
    radii = {
        "border_top_left_radius": int(r * s) if (not up and not left) else 0,
        "border_top_right_radius": int(r * s) if (not up and not right) else 0,
        "border_bottom_left_radius": int(r * s) if (not down and not left) else 0,
        "border_bottom_right_radius": int(r * s) if (not down and not right) else 0,
    }
    pygame.draw.rect(surf, INK, pygame.Rect(0, 0, T * s, T * s), **radii)
    il = 0 if left else ink_w
    it = 0 if up else ink_w
    ir = 0 if right else ink_w
    ib = 0 if down else ink_w
    inner = pygame.Rect(il * s, it * s, (T - il - ir) * s, (T - it - ib) * s)
    inner_radii = {k: max(0, v - int(ink_w * s)) for k, v in radii.items()}

    body_col = shade(th["body"], -0.07 * min(depth, 3))
    shape = pygame.Surface(surf.get_size(), pygame.SRCALPHA)
    pygame.draw.rect(shape, (255, 255, 255, 255), inner, **inner_radii)

    layer = pygame.Surface(surf.get_size(), pygame.SRCALPHA)
    layer.fill((*shade(th["mortar"], -0.07 * min(depth, 3)), 255))
    R = rng(variant * 7919 + depth * 31 + sum(map(ord, theme)))
    for row in range(2):
        off = 0 if row == 0 else -12
        y = row * 24
        x = off
        while x < T:
            bc = shade(body_col, R.uniform(-0.05, 0.05))
            rrect(layer, bc, x + 1.2, y + 1.2, 21.6, 21.6, 5, s)
            if depth < 2:
                rrect(layer, shade(bc, 0.1), x + 3, y + 3, 17, 4, 2, s)
            if R.random() < 0.18:
                capsule(layer, shade(bc, -0.2), x + 6, y + 10, x + 12, y + 15, 1.2, s)
            x += 24
    # sombra de profundidad en la parte baja del bloque
    if not down:
        shadow = pygame.Surface((T * s, 10 * s), pygame.SRCALPHA)
        shadow.fill((0, 0, 0, 40))
        layer.blit(shadow, (0, (T - 10) * s))

    # Capa superior (arena / césped / latón)
    if not up:
        top = th["top"]
        rrect(layer, shade(top, -0.2), 0, 0, T, 16, 0, s)
        for i in range(5):
            circle(layer, shade(top, -0.2), 4 + i * 10, 16, 5.5, s)
        rrect(layer, top, 0, 0, T, 13, 0, s)
        for i in range(5):
            circle(layer, top, 4 + i * 10 + (2 if variant % 2 else 0), 13, 5, s)
        rrect(layer, shade(top, 0.35), 0, 2, T, 3, 1, s)
        for i in range(3):
            circle(layer, shade(top, 0.2), 8 + i * 16 + R.uniform(-3, 3), 8, 1.6, s)

    layer.blit(shape, (0, 0), special_flags=pygame.BLEND_RGBA_MIN)
    surf.blit(layer, (0, 0))
    return finish(surf, T, T)


@lru_cache(maxsize=64)
def platform_tile(theme, left_end, right_end):
    """Plataforma de un solo sentido (se atraviesa desde abajo). 48x18."""
    th = THEMES[theme]
    s = SS
    T, H = TILE, 18
    surf = canvas(T, H + 10)
    x0 = 3 if left_end else 0
    x1 = T - 3 if right_end else T
    col = th["plank"]
    rrect(surf, INK, x0 - (3 if left_end else 0), 0, x1 - x0 + (3 if left_end else 0) + (3 if right_end else 0) - 0, H, 7, s)
    rrect(surf, col, x0, 3, x1 - x0, H - 6, 5, s)
    rrect(surf, shade(col, 0.25), x0 + 2, 4.5, x1 - x0 - 4, 3, 1.5, s)
    rrect(surf, shade(col, -0.2), x0, H - 7, x1 - x0, 4, 2, s)
    capsule(surf, shade(col, -0.25), x0 + 8, 9.5, x0 + 22, 9.5, 1.2, s)
    for bx in ((x0 + 7,) if left_end else ()) + ((x1 - 7,) if right_end else ()):
        circle(surf, INK, bx, 9, 2.6, s)
        circle(surf, (210, 210, 220), bx, 9, 1.6, s)
    # soportes
    if left_end:
        poly(surf, INK, [(x0 + 2, H - 2), (x0 + 12, H - 2), (x0 + 4, H + 8)], s)
    if right_end:
        poly(surf, INK, [(x1 - 2, H - 2), (x1 - 12, H - 2), (x1 - 4, H + 8)], s)
    return finish(surf, T, H + 10)


# ---------------------------------------------------------------------------
# TRAMPAS
# ---------------------------------------------------------------------------
@lru_cache(maxsize=8)
def spikes(theme="castillo"):
    s = SS
    T = TILE
    surf = canvas(T, T)
    metal = (196, 204, 222)
    rrect(surf, INK, 0, T - 12, T, 12, 3, s)
    rrect(surf, (96, 100, 124), 2, T - 10, T - 4, 8, 2, s)
    for i in range(3):
        bx = 2 + i * 15.3
        tip = (bx + 7.6, T - 34)
        poly(surf, INK, [(bx - 1.5, T - 9), tip[0:2], (bx + 16.7, T - 9)], s)
        poly(surf, metal, [(bx + 1.2, T - 10.5), (tip[0], tip[1] + 4), (bx + 14, T - 10.5)], s)
        poly(surf, shade(metal, -0.3), [(tip[0], tip[1] + 4), (bx + 14, T - 10.5), (tip[0], T - 10.5)], s)
        poly(surf, (255, 255, 255), [(tip[0] - 1, tip[1] + 7), (tip[0] - 3.4, T - 16), (tip[0] - 1.5, T - 16)], s)
    return finish(surf, T, T)


@lru_cache(maxsize=4)
def saw_blade(radius=26):
    s = SS
    size = radius * 2 + 8
    surf = canvas(size, size)
    c = size / 2
    pts = []
    teeth = 14
    for i in range(teeth * 2):
        a = i / (teeth * 2) * 2 * math.pi
        rr = radius if i % 2 == 0 else radius - 7
        a2 = a + (0.12 if i % 2 == 0 else 0)
        pts.append((c + math.cos(a2) * rr, c + math.sin(a2) * rr))
    poly(surf, (210, 216, 230), pts, s)
    circle(surf, (170, 176, 196), c, c, radius - 9, s)
    circle(surf, (226, 230, 240), c - 3, c - 3, radius - 15, s)
    for i in range(4):
        a = i / 4 * 2 * math.pi + 0.4
        circle(surf, (150, 156, 178), c + math.cos(a) * (radius - 13), c + math.sin(a) * (radius - 13), 3, s)
    circle(surf, INK, c, c, 7, s)
    circle(surf, (220, 60, 70), c, c, 5, s)
    circle(surf, (255, 160, 160), c - 1.5, c - 1.5, 1.6, s)
    surf = outline(surf, 2 * s)
    return finish(surf, size + 4, size + 4)


@lru_cache(maxsize=8)
def falling_block(theme):
    th = THEMES[theme]
    s = SS
    T, H = TILE, 26
    surf = canvas(T, H)
    col = shade(th["body"], 0.08)
    rrect(surf, INK, 0, 0, T, H, 7, s)
    rrect(surf, col, 3, 3, T - 6, H - 6, 5, s)
    rrect(surf, shade(col, 0.22), 6, 5, T - 12, 4, 2, s)
    capsule(surf, INK, 20, 3, 25, 12, 1.4, s)
    capsule(surf, INK, 25, 12, 21, 22, 1.4, s)
    capsule(surf, INK, 25, 12, 33, 16, 1.2, s)
    return finish(surf, T, H)


@lru_cache(maxsize=16)
def moving_platform(theme, tiles):
    th = THEMES[theme]
    s = SS
    W, H = TILE * tiles, 22
    surf = canvas(W, H)
    rrect(surf, INK, 0, 0, W, H, 9, s)
    col = (120, 128, 160) if theme != "desierto" else (176, 120, 70)
    rrect(surf, col, 3, 3, W - 6, H - 6, 7, s)
    rrect(surf, shade(col, 0.28), 6, 4.5, W - 12, 3.5, 2, s)
    stripe = th["accent"]
    for i in range(int(W // 24)):
        x = 10 + i * 24
        if x + 12 < W - 8:
            poly(surf, stripe, [(x, H - 5), (x + 8, 9), (x + 14, 9), (x + 6, H - 5)], s)
    for bx in (9, W - 9):
        circle(surf, INK, bx, H / 2 + 1, 3, s)
        circle(surf, (230, 230, 240), bx, H / 2 + 1, 1.8, s)
    return finish(surf, W, H)


# ---------------------------------------------------------------------------
# OBJETOS
# ---------------------------------------------------------------------------
@lru_cache(maxsize=2)
def hourglass():
    s = SS
    W, H = 28, 38
    surf = canvas(W + 4, H + 4)
    gold, glass, sand = (255, 202, 64), (200, 238, 255), (255, 170, 60)
    ox, oy = 2, 2
    poly(surf, glass, [(ox + 5, oy + 6), (ox + 23, oy + 6), (ox + 15, oy + 19), (ox + 23, oy + 32),
                       (ox + 5, oy + 32), (ox + 13, oy + 19)], s)
    poly(surf, sand, [(ox + 9, oy + 10), (ox + 19, oy + 10), (ox + 14.5, oy + 17), (ox + 13.5, oy + 17)], s)
    poly(surf, sand, [(ox + 14, oy + 24), (ox + 21, oy + 31), (ox + 7, oy + 31)], s)
    capsule(surf, sand, ox + 14, oy + 17, ox + 14, oy + 26, 1.4, s)
    poly(surf, (255, 255, 255), [(ox + 8, oy + 8), (ox + 10, oy + 8), (ox + 13, oy + 14), (ox + 12, oy + 15)], s)
    rrect(surf, gold, ox, oy, W, 7, 3, s)
    rrect(surf, gold, ox, oy + H - 7, W, 7, 3, s)
    rrect(surf, shade(gold, 0.4), ox + 3, oy + 1.4, W - 6, 2, 1, s)
    rrect(surf, shade(gold, -0.25), ox + 2, oy + 6, 3, H - 12, 1, s)
    rrect(surf, shade(gold, -0.25), ox + W - 5, oy + 6, 3, H - 12, 1, s)
    surf = outline(surf, 2 * s)
    return finish(surf, W + 8, H + 8)


@lru_cache(maxsize=2)
def heart(size=30):
    s = SS
    surf = canvas(size + 4, size + 4)
    c = size / 2 + 2
    r = size * 0.28
    red = (240, 64, 82)
    circle(surf, red, c - r * 0.95, c - r * 0.35, r, s)
    circle(surf, red, c + r * 0.95, c - r * 0.35, r, s)
    poly(surf, red, [(c - r * 1.9, c - r * 0.1), (c + r * 1.9, c - r * 0.1), (c, c + r * 2.1)], s)
    circle(surf, (255, 170, 180), c - r * 1.1, c - r * 0.65, r * 0.38, s)
    surf = outline(surf, 2 * s)
    return finish(surf, size + 8, size + 8)


@lru_cache(maxsize=2)
def heart_empty(size=30):
    img = heart(size).copy()
    img.fill((70, 60, 80, 255), special_flags=pygame.BLEND_RGBA_MIN)
    return img


def portal_frames(n=12):
    """Portal del tiempo (salida del nivel)."""
    frames = []
    W, H = 96, 132
    for f in range(n):
        s = SS
        surf = canvas(W, H)
        cx, cy = W / 2, H / 2 + 4
        ellipse(surf, INK, cx, cy, 40, 58, s)
        ellipse(surf, (60, 30, 120), cx, cy, 36, 54, s)
        for k in range(6):
            t = (f / n + k / 6)
            rx = 34 * (1 - k / 7)
            ry = 52 * (1 - k / 7)
            col = shade((120, 80, 255), k / 7)
            rect = pygame.Rect(0, 0, rx * 2 * s, ry * 2 * s)
            rect.center = (cx * s, cy * s)
            a0 = t * 2 * math.pi
            pygame.draw.arc(surf, col, rect, a0, a0 + 3.6, int(4 * s))
        ellipse(surf, (230, 220, 255), cx, cy, 8, 12, s)
        # marco de piedra con gema
        pygame.draw.ellipse(surf, INK, pygame.Rect((cx - 44) * s, (cy - 62) * s, 88 * s, 124 * s), int(9 * s))
        pygame.draw.ellipse(surf, (236, 186, 82), pygame.Rect((cx - 43) * s, (cy - 61) * s, 86 * s, 122 * s), int(5 * s))
        circle(surf, INK, cx, cy - 60, 8, s)
        circle(surf, (90, 240, 255), cx, cy - 60, 6, s)
        circle(surf, (255, 255, 255), cx - 2, cy - 62, 2, s)
        frames.append(finish(surf, W, H))
    return frames


def flag_frames(raised, n=6):
    frames = []
    W, H = 44, 100
    for f in range(n):
        s = SS
        surf = canvas(W, H)
        rrect(surf, INK, 6, 4, 7, H - 6, 3, s)
        rrect(surf, (230, 230, 240), 8, 6, 3, H - 10, 1.5, s)
        circle(surf, INK, 9.5, 5, 5, s)
        circle(surf, (255, 202, 64), 9.5, 5, 3.4, s)
        rrect(surf, INK, 0, H - 8, 20, 8, 3, s)
        rrect(surf, (120, 120, 140), 2, H - 6, 16, 4, 2, s)
        top = 10 if raised else H - 44
        col = (90, 210, 110) if raised else (200, 70, 80)
        pts_top, pts_bot = [], []
        for i in range(7):
            x = 12 + i * 5
            w = math.sin(f / n * 2 * math.pi + i * 0.8) * 2.5 * (i / 6)
            pts_top.append((x, top + w))
            pts_bot.append((x, top + 22 + w - i * 0.8))
        poly(surf, INK, [(p[0], p[1] - 2) for p in pts_top] + [(p[0] + 1, p[1] + 2) for p in reversed(pts_bot)], s)
        poly(surf, col, pts_top + list(reversed(pts_bot)), s)
        circle(surf, (255, 255, 255), 24, top + 10, 3.4, s)
        frames.append(finish(surf, W, H))
    return frames


@lru_cache(maxsize=2)
def boss_gear(r=16):
    s = SS
    size = r * 2 + 6
    surf = canvas(size, size)
    c = size / 2
    for i in range(8):
        a = i / 8 * 2 * math.pi
        capsule(surf, (236, 186, 82), c, c, c + math.cos(a) * r, c + math.sin(a) * r, 6, s)
    circle(surf, (236, 186, 82), c, c, r - 4, s)
    circle(surf, (255, 228, 140), c - 2, c - 2, r - 9, s)
    circle(surf, INK, c, c, 3.5, s)
    surf = outline(surf, 2 * s)
    return finish(surf, size + 4, size + 4)


# ---------------------------------------------------------------------------
# DECORACIÓN
# ---------------------------------------------------------------------------
def torch_frames(n=6):
    frames = []
    W, H = 30, 56
    for f in range(n):
        s = SS
        surf = canvas(W, H)
        cx = W / 2
        rrect(surf, INK, cx - 6, 26, 12, 26, 3, s)
        rrect(surf, (120, 76, 44), cx - 4, 28, 8, 22, 2, s)
        rrect(surf, INK, cx - 9, 22, 18, 8, 3, s)
        rrect(surf, (180, 180, 196), cx - 7, 24, 14, 4, 2, s)
        flick = math.sin(f / n * 2 * math.pi) * 2
        poly(surf, (255, 120, 40), [(cx - 8, 22), (cx - 3 + flick, 2), (cx + 2, 10), (cx + 5 - flick, 0), (cx + 8, 22)], s)
        poly(surf, (255, 200, 60), [(cx - 5, 22), (cx - 1 + flick, 8), (cx + 4 - flick * 0.5, 6), (cx + 5, 22)], s)
        ellipse(surf, (255, 250, 200), cx, 18, 2.6, 4, s)
        frames.append(finish(surf, W, H))
    return frames


@lru_cache(maxsize=4)
def crate():
    s = SS
    T = TILE
    surf = canvas(T, T)
    wood = (196, 128, 68)
    rrect(surf, INK, 1, 1, T - 2, T - 2, 6, s)
    rrect(surf, wood, 4, 4, T - 8, T - 8, 4, s)
    rrect(surf, shade(wood, -0.2), 9, 9, T - 18, T - 18, 2, s)
    capsule(surf, wood, 10, 10, T - 10, T - 10, 6, s, ink=INK, ink_w=1.4)
    rrect(surf, shade(wood, 0.25), 6, 5, T - 12, 3, 1.5, s)
    return finish(surf, T, T)


@lru_cache(maxsize=4)
def vase(theme):
    s = SS
    W, H = 34, 44
    surf = canvas(W, H)
    col = (70, 150, 190) if theme == "desierto" else (110, 120, 170)
    ellipse(surf, col, W / 2, H - 16, 15, 15, s)
    rrect(surf, col, W / 2 - 7, 4, 14, 14, 3, s)
    rrect(surf, shade(col, 0.2), W / 2 - 10, 2, 20, 6, 3, s)
    rrect(surf, (255, 210, 100), W / 2 - 14, H - 20, 28, 4, 2, s)
    ellipse(surf, shade(col, 0.35), W / 2 - 6, H - 22, 3, 6, s)
    surf = outline(surf, 2 * s)
    return finish(surf, W + 4, H + 4)


@lru_cache(maxsize=4)
def banner(theme):
    s = SS
    W, H = 36, 92
    surf = canvas(W, H)
    col = THEMES[theme]["accent"] if theme != "reloj" else (150, 60, 200)
    rrect(surf, INK, 0, 0, W, 7, 3, s)
    rrect(surf, (200, 160, 80), 2, 1.5, W - 4, 4, 2, s)
    poly(surf, INK, [(3, 5), (W - 3, 5), (W - 3, H), (W / 2, H - 12), (3, H)], s)
    poly(surf, col, [(6, 7), (W - 6, 7), (W - 6, H - 5), (W / 2, H - 16), (6, H - 5)], s)
    poly(surf, (255, 210, 90), [(W / 2, 22), (W / 2 + 8, 34), (W / 2, 46), (W / 2 - 8, 34)], s)
    rrect(surf, (255, 210, 90), 8, 12, W - 16, 2.4, 1, s)
    return finish(surf, W, H)


@lru_cache(maxsize=8)
def grass_tuft(theme, variant):
    s = SS
    W, H = 40, 22
    surf = canvas(W, H)
    R = rng(variant + 17)
    col = THEMES[theme]["top"] if theme != "reloj" else (120, 200, 140)
    col = shade(col, -0.1)
    if theme == "desierto":
        col = (120, 176, 80)
    for i in range(7):
        x = 6 + i * 4.6 + R.uniform(-1, 1)
        h = R.uniform(9, 19)
        lean = R.uniform(-4, 4)
        poly(surf, shade(col, R.uniform(-0.15, 0.2)), [(x - 3, H), (x + lean, H - h), (x + 3, H)], s)
    if theme != "reloj" and R.random() < 0.6:
        circle(surf, (255, 240, 120) if theme == "desierto" else (255, 140, 170), 20 + R.uniform(-8, 8), H - 12, 3, s)
    surf = outline(surf, 1.4 * s)
    return finish(surf, W + 3, H + 3)


@lru_cache(maxsize=16)
def glow(radius, color, strength=120):
    """Halo para mezclar en modo aditivo (usar special_flags=BLEND_RGB_ADD)."""
    return radial_glow(radius, color, strength).premul_alpha()
