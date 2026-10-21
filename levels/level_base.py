"""Cargador genérico de niveles a partir de archivos JSON.

Los diseñadores de niveles NO tocan este archivo: solo editan su
levels/nivel_X.json. Leyenda de símbolos del mapa:

    #  bloque sólido            k  caja (sólida)          =  plataforma de un sentido
    ^  pinchos                  F  bloque que se cae      P  inicio del jugador
    o  reloj de arena (puntos)  h  corazón (vida)         C  punto de control
    E  portal de salida         G  portal oculto (aparece al vencer al jefe)
    s  slime                    b  murciélago             B  jefe final
    t  antorcha (decoración)    v  jarrón (decoración)    n  estandarte (decoración)
    "  hierba (decoración)      .  aire

Objetos con parámetros van en la lista "entities" del JSON:
    {"type": "saw", "from": [x, y], "to": [x, y], "speed": 1.2}
    {"type": "moving_platform", "from": [x, y], "to": [x, y], "width": 3, "speed": 0.6}
    {"type": "bat", "at": [x, y], "span": 4}
    {"type": "sign", "at": [x, y], "text": "¡Salta con ESPACIO!"}
(coordenadas en tiles: x = columna, y = fila, empezando en 0)
"""
import json

import pygame

from art import world
from art.backgrounds import Parallax
from core.assets import Assets
from core.physics import TileMap
from art.text import blit_text
from settings import LEVELS_DIR, TILE

# Cada grupo de entidades vive en su propio archivo (y lo programa un
# integrante distinto). Si un archivo todavía no existe en la rama actual,
# sus símbolos simplemente se ignoran y el nivel sigue cargando.
try:
    from entities.items import Checkpoint, Heart, Hourglass, Portal, Sign
except ImportError:
    Checkpoint = Heart = Hourglass = Portal = Sign = None
try:
    from entities.traps import FallingPlatform, MovingPlatform, Saw, Spikes
except ImportError:
    FallingPlatform = MovingPlatform = Saw = Spikes = None
try:
    from entities.enemies import Bat, Slime
except ImportError:
    Bat = Slime = None
try:
    from entities.boss import TimeGuardian
except ImportError:
    TimeGuardian = None


class Level:
    def __init__(self, filename, state, audio, particles):
        path = LEVELS_DIR / filename
        data = json.loads(path.read_text(encoding="utf-8"))
        self.data = data
        self.name = data.get("name", filename)
        self.subtitle = data.get("subtitle", "")
        self.theme = data.get("theme", "castillo")
        self.time_limit = float(data.get("time", 300))
        self.music = data.get("music", self.theme)
        self.tips = data.get("tips", [])

        rows = [r.rstrip("\n") for r in data["map"]]
        width = max(len(r) for r in rows)
        rows = [r.ljust(width, ".") for r in rows]
        self.tilemap = TileMap(rows)

        self.state, self.audio, self.particles = state, audio, particles
        self.player = None
        self.camera = None
        self.items, self.hazards, self.enemies = [], [], []
        self.platforms, self.projectiles, self.checkpoints = [], [], []
        self.torches = []
        self.portal = None
        self.boss = None
        self.start = (2 * TILE, 5 * TILE)
        self.respawn_point = None
        self.texts = []
        self.hitstop_timer = 0.0
        self.announcement = None
        self.completed = False
        self.arena = data.get("boss_arena")
        self.boss_started = False

        self._spawn_from_map(rows)
        self._spawn_from_list(data.get("entities", []))
        self.background = Parallax(self.theme, world.THEMES[self.theme])
        self.tile_layer = self._bake_tiles(rows)

    # -------------------------------------------------------------- creación
    def _spawn_from_map(self, rows):
        th = self.theme
        for ty, row in enumerate(rows):
            for tx, ch in enumerate(row):
                if ch == "P":
                    self.start = (tx * TILE + 9, (ty + 1) * TILE - 66)
                elif ch == "o" and Hourglass:
                    self.items.append(Hourglass(tx, ty))
                elif ch == "h" and Heart:
                    self.items.append(Heart(tx, ty))
                elif ch == "C" and Checkpoint:
                    cp = Checkpoint(tx, ty)
                    self.checkpoints.append(cp)
                    self.items.append(cp)
                elif ch in "EG" and Portal:
                    self.portal = Portal(tx, ty, hidden=(ch == "G"))
                elif ch == "^" and Spikes:
                    self.hazards.append(Spikes(tx, ty, th))
                elif ch == "F" and FallingPlatform:
                    self.platforms.append(FallingPlatform(tx, ty, th))
                elif ch == "s" and Slime:
                    self.enemies.append(Slime(tx, ty, th))
                elif ch == "b" and Bat:
                    self.enemies.append(Bat(tx, ty))
                elif ch == "B" and TimeGuardian:
                    self.boss = TimeGuardian(tx, ty)
                elif ch == "t":
                    self.torches.append((tx * TILE + 9, ty * TILE - 4))

    def _spawn_from_list(self, entities):
        for e in entities:
            kind = e.get("type")
            if kind == "saw" and Saw:
                self.hazards.append(Saw(e["from"], e.get("to", e["from"]), e.get("speed", 1.0)))
            elif kind == "moving_platform" and MovingPlatform:
                self.platforms.append(MovingPlatform(e["from"], e["to"], e.get("width", 2),
                                                     e.get("speed", 0.6), self.theme))
            elif kind == "bat" and Bat:
                self.enemies.append(Bat(*e["at"], span=e.get("span", 3)))
            elif kind == "sign" and Sign:
                self.items.append(Sign(*e["at"], e.get("text", "")))

    def _bake_tiles(self, rows):
        """Pre-dibuja todos los tiles estáticos en una sola superficie (rendimiento)."""
        tm = self.tilemap
        surf = pygame.Surface((tm.px_w, tm.px_h), pygame.SRCALPHA)
        th = self.theme

        def ground(x, y):
            if x < 0 or x >= tm.w:
                return tm.char(max(0, min(tm.w - 1, x)), y) == "#"
            if y >= tm.h:
                return tm.char(x, tm.h - 1) == "#"
            return tm.char(x, y) == "#"

        for ty, row in enumerate(rows):
            for tx, ch in enumerate(row):
                pos = (tx * TILE, ty * TILE)
                if ch == "n":
                    surf.blit(world.banner(th), (tx * TILE + 6, ty * TILE - 20))
                elif ch == "v":
                    img = world.vase(th)
                    surf.blit(img, (tx * TILE + TILE / 2 - img.get_width() / 2, (ty + 1) * TILE - img.get_height() + 2))
                elif ch == '"':
                    img = world.grass_tuft(th, (tx * 3 + ty) % 4)
                    surf.blit(img, (tx * TILE + 4, (ty + 1) * TILE - img.get_height() + 3))
        for ty, row in enumerate(rows):
            for tx, ch in enumerate(row):
                pos = (tx * TILE, ty * TILE)
                if ch == "#":
                    depth = 0
                    while depth < 3 and ground(tx, ty - depth - 1):
                        depth += 1
                    img = world.solid_tile(th, ground(tx, ty - 1), ground(tx, ty + 1), ground(tx - 1, ty),
                                           ground(tx + 1, ty), (tx * 7 + ty * 3) % 3, depth)
                    surf.blit(img, pos)
                elif ch == "k":
                    surf.blit(world.crate(), pos)
                elif ch == "=":
                    left = tm.char(tx - 1, ty) != "="
                    right = tm.char(tx + 1, ty) != "="
                    surf.blit(world.platform_tile(th, left, right), pos)
        return surf.convert_alpha() if pygame.display.get_surface() else surf

    # ------------------------------------------------------- API para entidades
    def attach(self, player, camera):
        self.player = player
        self.camera = camera
        player.is_player = True

    def float_text(self, msg, x, y, color=(255, 236, 120)):
        self.texts.append([msg, x, y, color, 1.0])

    def set_checkpoint(self, cp):
        self.respawn_point = cp.spawn

    def hitstop(self, t):
        self.hitstop_timer = max(self.hitstop_timer, t)

    def announce(self, msg, duration=1.6, sub=""):
        self.announcement = [msg, duration, duration, sub]

    def spawn_projectile(self, p):
        self.projectiles.append(p)

    def complete(self):
        if not self.completed:
            self.completed = True
            self.player.win = True
            self.audio.play("portal")
            self.particles.confetti(self.player.centerx, self.player.y, 50)

    def boss_defeated(self):
        if self.portal:
            self.portal.show()
            self.audio.play("checkpoint")
        if self.camera:
            self.camera.bounds = None
        self.announce("¡VICTORIA!", 2.0, "El portal se ha abierto")
        self.audio.play_music(self.music)

    # --------------------------------------------------------------- update
    def update(self, dt, inp):
        self.background.update(dt)
        for t in self.texts:
            t[2] -= 50 * dt
            t[4] -= dt
        self.texts = [t for t in self.texts if t[4] > 0]
        if self.announcement:
            self.announcement[1] -= dt
            if self.announcement[1] <= 0:
                self.announcement = None

        if self.hitstop_timer > 0:
            self.hitstop_timer -= dt
            return

        player = self.player
        for p in self.platforms:
            p.update(dt, self)
        player.update(dt, inp, self)

        if self.arena and self.boss and not self.boss.dead:
            self._update_arena()

        pr = player.rect
        for group in (self.items, self.hazards):
            for e in group:
                e.update(dt, self)
                if e.alive and not player.dead and not player.win and pr.colliderect(e.rect):
                    e.touch_player(self, player)
        if self.portal:
            self.portal.update(dt, self)
            if not player.dead and pr.colliderect(self.portal.rect):
                self.portal.touch_player(self, player)

        for e in self.enemies:
            e.update(dt, self)
            if not player.win:
                e.interact(self, player)
        if self.boss:
            self.boss.update(dt, self)
            if not player.win:
                self.boss.interact(self, player)
        for p in self.projectiles:
            p.update(dt, self)
            if p.alive and not player.win:
                p.interact(self, player)

        self.items = [e for e in self.items if e.alive]
        self.enemies = [e for e in self.enemies if e.alive]
        self.projectiles = [p for p in self.projectiles if p.alive]
        if self.boss and not self.boss.alive:
            self.boss = None

        # Caer al vacío
        if not player.dead and player.y > self.tilemap.px_h + 40:
            player.die(self)
            player.vy = 0

    def _update_arena(self):
        x1, x2 = self.arena
        player = self.player
        if not self.boss_started and player.x > (x1 + 1) * TILE:
            self.boss_started = True
            self.boss.active = True
            self.camera.bounds = (x1 * TILE, (x2 + 1) * TILE)
            self.audio.play_music("jefe")
            self.announce("ROUND 1", 1.4, "¡PELEA!")
        if self.boss_started:
            player.x = max(x1 * TILE + 4, min((x2 + 1) * TILE - player.w - 4, player.x))

    # ----------------------------------------------------------------- draw
    def draw(self, screen, cam, torch_frames=None):
        self.background.draw(screen, cam[0], cam[1], self.camera.max_y if self.camera else 0)
        torches = Assets.torch()
        glow = world.glow(70, (255, 150, 60), 110)
        t = pygame.time.get_ticks() / 1000
        for i, (x, y) in enumerate(self.torches):
            if -80 < x - cam[0] < screen.get_width() + 80:
                screen.blit(glow, (x + 15 - 70 - cam[0], y + 12 - 70 - cam[1]), special_flags=pygame.BLEND_RGB_ADD)
                screen.blit(torches[int(t * 10 + i) % len(torches)], (x - cam[0], y - cam[1]))
        sw = screen.get_width()
        area = pygame.Rect(cam[0], cam[1], sw, screen.get_height())
        screen.blit(self.tile_layer, (0, 0), area)
        for group in (self.platforms, self.hazards, self.items):
            for e in group:
                if e.on_screen(cam):
                    e.draw(screen, cam)
        if self.portal:
            self.portal.draw(screen, cam)
        for e in self.enemies:
            e.draw(screen, cam)
        if self.boss:
            self.boss.draw(screen, cam)

    def draw_front(self, screen, cam):
        for p in self.projectiles:
            p.draw(screen, cam)
        for msg, x, y, col, life in self.texts:
            blit_text(screen, msg, 24, (x - cam[0], y - cam[1]), col, alpha=int(255 * min(1, life * 2)))
