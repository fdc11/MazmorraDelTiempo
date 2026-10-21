"""Fondos con parallax (varias capas que se mueven a distinta velocidad).

Cada capa es horizontalmente "tileable": las formas usan senos con
frecuencias enteras sobre el ancho de la capa, así no se nota la costura.
"""
import math

import pygame

from art.draw import capsule, circle, poly, radial_glow, rng, rrect, shade, vgradient
from settings import HEIGHT, WIDTH

LAYER_W = 1600
LS = 2  # supersampling de capas (más ligero que el de sprites)


def _wave(x, seed, amps):
    total = 0
    for i, (freq, amp) in enumerate(amps):
        total += math.sin(x / LAYER_W * 2 * math.pi * freq + seed * (i + 1) * 1.7) * amp
    return total


def _ridge(surf, color, base_y, amps, seed, step=8, outline_col=None):
    pts = []
    for x in range(0, LAYER_W + step, step):
        pts.append((x, base_y + _wave(x, seed, amps)))
    poly_pts = pts + [(LAYER_W, HEIGHT + 10), (0, HEIGHT + 10)]
    if outline_col:
        pygame.draw.lines(surf, outline_col, False, [(x * LS, y * LS) for x, y in pts], 3 * LS)
    poly(surf, color, poly_pts, LS)
    return pts


def _layer():
    return pygame.Surface((LAYER_W * LS, HEIGHT * LS), pygame.SRCALPHA)


def _done(surf):
    return pygame.transform.smoothscale(surf, (LAYER_W, HEIGHT))


def _wrap_draw(fn, x, *args):
    """Dibuja un elemento y su copia desplazada para que la capa sea continua."""
    fn(x, *args)
    if x < 200:
        fn(x + LAYER_W, *args)
    if x > LAYER_W - 200:
        fn(x - LAYER_W, *args)


# ---------------------------------------------------------------------------
def _sky(theme_data, theme):
    sky = vgradient(WIDTH, HEIGHT, theme_data["sky_top"], theme_data["sky_bottom"])
    R = rng(5)
    if theme == "reloj":
        for _ in range(140):
            x, y = R.uniform(0, WIDTH), R.uniform(0, HEIGHT * 0.7)
            r = R.choice([1, 1, 1.5, 2])
            pygame.draw.circle(sky, (255, 255, 230), (x, y), r)
        sky.blit(radial_glow(170, (200, 180, 255), 120), (980 - 170, 140 - 170))
        pygame.draw.circle(sky, (246, 240, 255), (980, 140), 62)
        pygame.draw.circle(sky, (218, 206, 246), (960, 130), 14)
        pygame.draw.circle(sky, (218, 206, 246), (1004, 162), 9)
    else:
        sx, sy = (1020, 150) if theme == "desierto" else (220, 120)
        sky.blit(radial_glow(220, (255, 240, 180), 160), (sx - 220, sy - 220))
        pygame.draw.circle(sky, (255, 246, 196), (sx, sy), 66)
        pygame.draw.circle(sky, (255, 252, 230), (sx - 10, sy - 10), 46)
    return sky


def _cloud(surf, x, y, scale, col):
    blobs = [(-34, 6, 22), (-12, -8, 28), (16, -4, 26), (38, 8, 18), (0, 10, 22)]
    for dx, dy, r in blobs:
        circle(surf, shade(col, -0.12), x + dx * scale, y + dy * scale + 4 * scale, r * scale, LS)
    for dx, dy, r in blobs:
        circle(surf, col, x + dx * scale, y + dy * scale, r * scale, LS)
    rrect(surf, col, x - 50 * scale, y + 6 * scale, 100 * scale, 18 * scale, 9 * scale, LS)
    circle(surf, shade(col, 0.5), x - 14 * scale, y - 14 * scale, 10 * scale, LS)


def cloud_sprites(theme):
    col = (255, 255, 255) if theme != "reloj" else (150, 120, 200)
    out = []
    for i, sc in enumerate((1.0, 0.7, 1.3)):
        w, h = int(140 * sc), int(80 * sc)
        surf = pygame.Surface((w * LS, h * LS), pygame.SRCALPHA)
        _cloud(surf, w / 2, h / 2, sc, col)
        img = pygame.transform.smoothscale(surf, (w, h))
        img.set_alpha(220 if theme != "reloj" else 150)
        out.append(img)
    return out


# --- Desierto ---------------------------------------------------------------
def _pyramid(surf, x, base, w, h, col):
    poly(surf, col, [(x - w / 2, base), (x, base - h), (x + w / 2, base)], LS)
    poly(surf, shade(col, -0.18), [(x, base - h), (x + w / 2, base), (x + w * 0.12, base)], LS)
    for i in range(1, 6):
        y = base - h * i / 6
        hw = w / 2 * (1 - i / 6)
        pygame.draw.line(surf, shade(col, -0.1), ((x - hw) * LS, y * LS), ((x + hw) * LS, y * LS), LS)


def _palm(surf, x, base, h, col):
    trunk = shade(col, -0.25)
    for i in range(8):
        t0, t1 = i / 8, (i + 1) / 8
        capsule(surf, trunk, x + math.sin(t0 * 1.6) * 16, base - h * t0, x + math.sin(t1 * 1.6) * 16,
                base - h * t1, 9 - i * 0.5, LS)
    tx, ty = x + math.sin(1.6) * 16, base - h
    for a in (-160, -120, -60, -20, 20, -90):
        r = math.radians(a)
        ex, ey = tx + math.cos(r) * 50, ty + math.sin(r) * 30 + 18
        mx, my = tx + math.cos(r) * 26, ty + math.sin(r) * 20 - 6
        poly(surf, col, [(tx, ty), (mx, my - 6), (ex, ey), (mx, my + 4)], LS)


def _desert(td):
    far = _layer()
    for x, w, h in ((260, 360, 210), (560, 240, 140), (1180, 300, 180)):
        _wrap_draw(lambda xx, w=w, h=h: _pyramid(far, xx, 440, w, h, td["far"]), x)
    _ridge(far, shade(td["far"], 0.06), 440, [(2, 18), (5, 8)], 1.0)
    mid = _layer()
    _ridge(mid, td["mid"], 500, [(1, 30), (3, 18), (7, 6)], 2.0)
    for x in (140, 520, 900, 1360):
        _wrap_draw(lambda xx: _palm(mid, xx, 500 + _wave(xx, 2.0, [(1, 30), (3, 18), (7, 6)]) + 6, 150, (96, 150, 80)), x)
    near = _layer()
    _ridge(near, td["near"], 580, [(2, 24), (5, 10)], 3.0)
    return [(far, 0.12), (mid, 0.3), (near, 0.55)]


# --- Castillo ---------------------------------------------------------------
def _tower(surf, x, base, w, h, col, roof):
    rrect(surf, col, x - w / 2, base - h, w, h + 40, 2, LS)
    for i in range(3):
        rrect(surf, col, x - w / 2 + i * w / 2.5 - 2, base - h - 12, w / 5, 14, 2, LS)
    poly(surf, roof, [(x - w / 2 - 8, base - h), (x, base - h - w * 1.3), (x + w / 2 + 8, base - h)], LS)
    rrect(surf, shade(col, -0.25), x - 5, base - h + 30, 10, 18, 5, LS)


def _castle_layer(td):
    far = _layer()
    _ridge(far, td["far"], 380, [(2, 70), (5, 30), (11, 10)], 0.5)
    # cumbres nevadas sutiles
    for x in range(0, LAYER_W, 8):
        y = 380 + _wave(x, 0.5, [(2, 70), (5, 30), (11, 10)])
        if y < 340:
            pygame.draw.line(far, shade(td["far"], 0.45), (x * LS, y * LS), (x * LS, (y + (340 - y) * 0.4) * LS), 8 * LS)
    castle_col = shade(td["far"], -0.16)
    roof = shade((200, 90, 110), 0.35)
    cx = 980
    rrect(far, castle_col, cx - 150, 390, 300, 330, 0, LS)
    for x, w, h in ((cx - 150, 54, 150), (cx - 60, 44, 110), (cx + 40, 60, 190), (cx + 150, 50, 140)):
        _tower(far, x, 420, w, h, castle_col, roof)
    mid = _layer()
    _ridge(mid, td["mid"], 480, [(2, 34), (4, 16)], 1.3)
    R = rng(11)
    for x in range(40, LAYER_W, 120):
        x2 = x + R.uniform(-30, 30)
        y = 480 + _wave(x2, 1.3, [(2, 34), (4, 16)]) + 6

        def tree(xx, y=y, sc=R.uniform(0.8, 1.2)):
            capsule(mid, shade(td["mid"], -0.35), xx, y, xx, y - 40 * sc, 8 * sc, LS)
            circle(mid, shade(td["mid"], -0.12), xx, y - 52 * sc, 26 * sc, LS)
            circle(mid, shade(td["mid"], -0.02), xx - 10 * sc, y - 60 * sc, 16 * sc, LS)
        _wrap_draw(tree, x2)
    near = _layer()
    _ridge(near, td["near"], 580, [(3, 18), (8, 8)], 2.2)
    return [(far, 0.12), (mid, 0.3), (near, 0.55)]


# --- Torre del Reloj --------------------------------------------------------
def _gear_shape(surf, x, y, r, col, teeth=12):
    for i in range(teeth):
        a = i / teeth * 2 * math.pi
        capsule(surf, col, x, y, x + math.cos(a) * r, y + math.sin(a) * r, r * 0.22, LS)
    circle(surf, col, x, y, r * 0.82, LS)
    circle(surf, shade(col, -0.3), x, y, r * 0.3, LS)


def _clock_layer(td):
    far = _layer()
    for x, y, r in ((200, 380, 90), (360, 470, 60), (1300, 420, 110)):
        _wrap_draw(lambda xx, y=y, r=r: _gear_shape(far, xx, y, r, shade(td["far"], 0.08)), x)
    # torre del reloj
    tx = 820
    col = shade(td["far"], -0.15)
    rrect(far, col, tx - 70, 210, 140, 520, 6, LS)
    poly(far, col, [(tx - 90, 214), (tx, 90), (tx + 90, 214)], LS)
    circle(far, (214, 180, 120), tx, 300, 52, LS)
    circle(far, (236, 214, 170), tx, 300, 44, LS)
    capsule(far, col, tx, 300, tx, 268, 5, LS)
    capsule(far, col, tx, 300, tx + 24, 310, 5, LS)
    for i in range(4):
        rrect(far, shade(td["far"], 0.25), tx - 46 + i * 26, 380, 14, 26, 6, LS)
    _ridge(far, shade(td["far"], -0.05), 480, [(2, 30), (6, 12)], 0.7)
    mid = _layer()
    _ridge(mid, td["mid"], 510, [(1, 40), (4, 24), (9, 8)], 1.9)
    R = rng(3)
    for x in range(80, LAYER_W, 260):
        y = 510 + _wave(x, 1.9, [(1, 40), (4, 24), (9, 8)])

        def lamp(xx, y=y):
            capsule(mid, shade(td["mid"], -0.35), xx, y, xx, y - 70, 4, LS)
            mid.blit(pygame.transform.smoothscale(radial_glow(40, (255, 210, 120), 140), (80 * LS, 80 * LS)),
                     ((xx - 40) * LS, (y - 110) * LS))
            circle(mid, (255, 230, 150), xx, y - 74, 7, LS)
        _wrap_draw(lamp, x + R.uniform(-40, 40))
    near = _layer()
    _ridge(near, td["near"], 590, [(3, 20), (7, 8)], 2.9)
    return [(far, 0.12), (mid, 0.3), (near, 0.55)]


def build_background(theme, theme_data):
    """Devuelve (cielo_estático, [(capa, factor_parallax), ...], nubes)."""
    sky = _sky(theme_data, theme)
    if theme == "desierto":
        layers = _desert(theme_data)
    elif theme == "castillo":
        layers = _castle_layer(theme_data)
    else:
        layers = _clock_layer(theme_data)
    layers = [(_done(s), f) for s, f in layers]
    return sky, layers, cloud_sprites(theme)


class Parallax:
    """Dibuja el fondo según la posición de la cámara."""

    def __init__(self, theme, theme_data):
        self.sky, self.layers, self.clouds = build_background(theme, theme_data)
        R = rng(42)
        self.cloud_pos = [[R.uniform(0, LAYER_W), R.uniform(40, 260), R.uniform(8, 22), R.randrange(3)]
                          for _ in range(7)]

    def update(self, dt):
        for c in self.cloud_pos:
            c[0] = (c[0] + c[2] * dt) % (LAYER_W + 300)

    def draw(self, screen, cam_x, cam_y=0, max_cam_y=0):
        screen.blit(self.sky, (0, 0))
        for c in self.cloud_pos:
            x = (c[0] - cam_x * 0.06) % (LAYER_W + 300) - 150
            for off in (0, LAYER_W + 300):
                if -200 < x + off < WIDTH + 200:
                    screen.blit(self.clouds[c[3]], (x + off - self.clouds[c[3]].get_width() / 2, c[1]))
        for layer, factor in self.layers:
            x = -(cam_x * factor) % LAYER_W
            y = (max_cam_y - cam_y) * factor * 0.5
            screen.blit(layer, (x - LAYER_W, y))
            screen.blit(layer, (x, y))
            if x + LAYER_W < WIDTH:
                screen.blit(layer, (x + LAYER_W, y))
