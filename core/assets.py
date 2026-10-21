"""Caché de sprites: se generan una sola vez y se reutilizan.

Las animaciones se guardan mirando a la derecha y su versión espejada.
Si en el futuro usan PNGs, este es el único archivo que hay que cambiar.
"""
import pygame

from art import characters, world


def _flip_all(frames):
    return [pygame.transform.flip(f, True, False) for f in frames]


def _conv(frames):
    return [f.convert_alpha() for f in frames]


class Assets:
    _cache = {}

    @classmethod
    def get(cls, key, builder):
        if key not in cls._cache:
            cls._cache[key] = builder()
        return cls._cache[key]

    # --- Personajes ----------------------------------------------------------
    @classmethod
    def player(cls):
        def build():
            right = {k: _conv(v) for k, v in characters.build_player_frames().items()}
            return {"right": right, "left": {k: _flip_all(v) for k, v in right.items()}}
        return cls.get("player", build)

    @classmethod
    def slime(cls, theme):
        def build():
            right = _conv(characters.build_slime_frames(world.THEMES[theme]["slime"]))
            return {"right": right, "left": _flip_all(right)}
        return cls.get(("slime", theme), build)

    @classmethod
    def bat(cls):
        return cls.get("bat", lambda: _conv(characters.build_bat_frames()))

    @classmethod
    def boss(cls):
        def build():
            right = {k: _conv([pygame.transform.smoothscale_by(f, 0.82) for f in v])
                     for k, v in characters.build_boss_frames().items()}
            return {"right": right, "left": {k: _flip_all(v) for k, v in right.items()}}
        return cls.get("boss", build)

    # --- Objetos -------------------------------------------------------------
    @classmethod
    def portal(cls):
        return cls.get("portal", lambda: _conv(world.portal_frames()))

    @classmethod
    def flag(cls, raised):
        return cls.get(("flag", raised), lambda: _conv(world.flag_frames(raised)))

    @classmethod
    def torch(cls):
        return cls.get("torch", lambda: _conv(world.torch_frames()))

    @classmethod
    def saw_rotations(cls, steps=24):
        def build():
            base = world.saw_blade().convert_alpha()
            return [pygame.transform.rotozoom(base, -i * 360 / steps / 2, 1) for i in range(steps)]
        return cls.get("saw", build)

    @classmethod
    def gear_rotations(cls, steps=16):
        def build():
            base = world.boss_gear().convert_alpha()
            return [pygame.transform.rotozoom(base, -i * 45 / steps, 1) for i in range(steps)]
        return cls.get("gear", build)

    @classmethod
    def preload(cls):
        """Genera lo más pesado al arrancar (para que no haya tirones luego)."""
        cls.player()
        cls.boss()
        cls.bat()
        cls.portal()
        cls.torch()
        cls.saw_rotations()
