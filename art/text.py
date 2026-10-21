"""Fuentes y texto con contorno (estilo cartoon).

Si quieren una fuente propia, pongan un .ttf en assets/fonts/ y se usará
automáticamente (por ejemplo, una de Google Fonts como "Fredoka" o "Lilita One").
"""
import math

import pygame

from settings import BASE_DIR, INK

FONT_DIR = BASE_DIR / "assets" / "fonts"
SYSTEM_FONTS = "fredoka,lilitaone,arialroundedmtbold,segoeuiblack,arialblack,verdanabold,verdana"

_font_cache = {}
_text_cache = {}


def font(size):
    if size not in _font_cache:
        custom = sorted(FONT_DIR.glob("*.ttf")) + sorted(FONT_DIR.glob("*.otf")) if FONT_DIR.exists() else []
        if custom:
            f = pygame.font.Font(str(custom[0]), size)
        else:
            f = pygame.font.SysFont(SYSTEM_FONTS, size, bold=False)
            if f.get_height() < size * 0.8:   # fuente por defecto: la forzamos en negrita
                f = pygame.font.SysFont(SYSTEM_FONTS, size, bold=True)
        _font_cache[size] = f
    return _font_cache[size]


def text(msg, size, color=(255, 255, 255), outline=3, shadow=True, outline_color=INK):
    """Devuelve una superficie con el texto con contorno y sombra (cacheada)."""
    key = (msg, size, color, outline, shadow, outline_color)
    if key in _text_cache:
        return _text_cache[key]
    f = font(size)
    base = f.render(msg, True, color)
    o = outline
    w, h = base.get_width() + o * 2 + 4, base.get_height() + o * 2 + 6
    surf = pygame.Surface((w, h), pygame.SRCALPHA)
    if o:
        edge = f.render(msg, True, outline_color)
        if shadow:
            sh = f.render(msg, True, outline_color)
            sh.set_alpha(140)
            for a in range(0, 360, 30):
                surf.blit(sh, (o + 2 + math.cos(math.radians(a)) * o, o + 5 + math.sin(math.radians(a)) * o))
        for a in range(0, 360, 20):
            surf.blit(edge, (o + 2 + math.cos(math.radians(a)) * o, o + 2 + math.sin(math.radians(a)) * o))
    surf.blit(base, (o + 2, o + 2))
    if len(_text_cache) > 400:
        _text_cache.clear()
    _text_cache[key] = surf
    return surf


def blit_text(screen, msg, size, pos, color=(255, 255, 255), anchor="center", outline=3, shadow=True,
              outline_color=INK, alpha=255, scale=1.0):
    surf = text(msg, size, color, outline, shadow, outline_color)
    if scale != 1.0:
        surf = pygame.transform.smoothscale_by(surf, scale)
    if alpha < 255:
        surf = surf.copy()
        surf.set_alpha(alpha)
    r = surf.get_rect()
    setattr(r, anchor, (int(pos[0]), int(pos[1])))
    screen.blit(surf, r)
    return r
