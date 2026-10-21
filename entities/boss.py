"""Jefe final: El Guardián del Tiempo (pelea 1 vs 1 estilo Street Fighter).

Patrón de ataques (siempre se telegrafían para que la pelea sea justa):
  * EMBESTIDA: se agacha (ojos rojos) y carga. Si choca contra la pared
    queda ATURDIDO unos segundos -> ventana para golpearlo.
  * PISOTÓN: salta hacia ti y al caer lanza ondas de choque por el suelo
    (sáltalas).
  * ENGRANAJES: lanza engranajes en parábola (puedes destruirlos a golpes).
A mitad de vida entra en "fase 2" y se vuelve más rápido.
"""
import math
import random

import pygame

from core.assets import Assets
from core.physics import Body, move_body
from entities.base import Entity
from settings import GRAVITY, MAX_FALL_SPEED, SCORE_BOSS, STOMP_BOUNCE, TILE

BOSS_W, BOSS_H = 96, 134
SPRITE_FOOT = 166   # sprites escalados al 82 %


class TimeGuardian(Body):
    MAX_HP = 18
    NAME = "GUARDIÁN DEL TIEMPO"

    def __init__(self, tx, ty):
        super().__init__(tx * TILE, (ty + 1) * TILE - BOSS_H, BOSS_W, BOSS_H)
        self.frames = Assets.boss()
        self.hp = self.MAX_HP
        self.alive = True
        self.active = False         # se activa cuando el jugador entra a la arena
        self.dead = False
        self.facing = -1
        self.state = "idle"
        self.timer = 1.2
        self.t = 0.0
        self.flash = 0.0
        self.invuln = 0.0
        self.last_punch = -1
        self.death_timer = 0.0
        self.attack_count = 0

    # ----------------------------------------------------------------- util
    @property
    def phase2(self):
        return self.hp <= self.MAX_HP // 2

    @property
    def speed_mult(self):
        return 1.3 if self.phase2 else 1.0

    def _set(self, state, timer):
        self.state = state
        self.timer = timer

    def _face_player(self, player):
        self.facing = 1 if player.centerx > self.centerx else -1

    # --------------------------------------------------------------- update
    def update(self, dt, level):
        self.t += dt
        self.flash = max(0, self.flash - dt)
        self.invuln = max(0, self.invuln - dt)
        player = level.player

        if self.dead:
            self._update_dead(dt, level)
            return

        self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
        was_ground = self.on_ground
        if not self.active:
            self.vx = 0
            move_body(self, dt, level.tilemap, use_oneway=False)
            return

        self.timer -= dt * self.speed_mult
        st = self.state

        if st == "idle":
            self.vx = 0
            self._face_player(player)
            if self.timer <= 0:
                self._choose_attack(level)
        elif st == "walk":
            self._face_player(player)
            self.vx = self.facing * 150 * self.speed_mult
            if self.timer <= 0 or abs(player.centerx - self.centerx) < 90:
                self._set("idle", 0.25)
        elif st == "windup":
            self.vx = 0
            if self.timer <= 0:
                self._set("dash", 1.3)
                level.audio.play("punch")
        elif st == "dash":
            self.vx = self.facing * 640 * self.speed_mult
            if self.t % 0.06 < dt:
                level.particles.dust(self.centerx - self.facing * 40, self.bottom, 2)
            if self.hit_wall:
                self._set("stunned", 1.8)
                self.vx = -self.facing * 200
                self.vy = -300
                level.camera.shake(14, 0.35)
                level.audio.play("slam")
                level.particles.burst(self.centerx + self.facing * 50, self.y + 50, (255, 230, 150), 16)
            elif self.timer <= 0:
                self._set("idle", 0.5)
        elif st == "stunned":
            if self.on_ground:
                self.vx = 0
            if self.t % 0.25 < dt:
                level.particles.emit(self.centerx, self.y - 10, 2, (255, 230, 90), speed=(40, 90),
                                     life=(0.4, 0.7), size=(4, 7), gravity=-30, kind="star")
            if self.timer <= 0:
                self._set("idle", 0.4)
        elif st == "jump":
            if self.on_ground and not was_ground and self.vy >= 0:
                self._land_slam(level)
            elif self.timer <= -2:
                self._set("idle", 0.4)
        elif st == "throw":
            self.vx = 0
            if self.timer <= 0:
                self._throw(level)
                self.attack_count += 1
                if self.attack_count < (4 if self.phase2 else 3):
                    self._set("throw", 0.35)
                else:
                    self._set("idle", 0.7)
        elif st == "recover":
            self.vx = 0
            if self.timer <= 0:
                self._set("idle", 0.3)

        move_body(self, dt, level.tilemap, use_oneway=False)
        self._arena_clamp(level)
        if st == "jump" and self.on_ground and not was_ground:
            self._land_slam(level)

    def _arena_clamp(self, level):
        """Los bordes de la arena funcionan como paredes para el jefe."""
        if not level.arena:
            return
        lo = level.arena[0] * TILE
        hi = (level.arena[1] + 1) * TILE - self.w
        if self.x < lo:
            self.x, self.hit_wall = lo, -1
        elif self.x > hi:
            self.x, self.hit_wall = hi, 1

    def _choose_attack(self, level):
        player = level.player
        dist = abs(player.centerx - self.centerx)
        options = ["dash", "jump", "throw"]
        weights = [3, 2, 2] if dist > 260 else [2, 3, 1]
        choice = random.choices(options, weights)[0]
        self._face_player(player)
        if random.random() < 0.25 and dist > 400:
            self._set("walk", 1.0)
            return
        if choice == "dash":
            self._set("windup", 0.7)
        elif choice == "jump":
            self._set("jump", 0)
            self.vy = -980
            self.vx = max(-420, min(420, (player.centerx - self.centerx) * 0.9))
            level.audio.play("jump")
        elif choice == "throw":
            self.attack_count = 0
            self._set("throw", 0.45)

    def _land_slam(self, level):
        if self.state != "jump":
            return
        self.vx = 0
        level.camera.shake(16, 0.4)
        level.audio.play("slam")
        level.particles.dust(self.centerx - 40, self.bottom, 10)
        level.particles.dust(self.centerx + 40, self.bottom, 10)
        for d in (-1, 1):
            level.spawn_projectile(Shockwave(self.centerx + d * 50, self.bottom, d, 1.3 if self.phase2 else 1.0))
        self._set("recover", 0.9)

    def _throw(self, level):
        player = level.player
        dx = player.centerx - self.centerx
        t = 1.0
        vx = dx / t + random.uniform(-60, 60)
        vy = -0.5 * 900 * t - 120
        level.spawn_projectile(Gear(self.centerx + self.facing * 50, self.y + 40, vx, vy))
        level.audio.play("punch")

    # ---------------------------------------------------------- interacción
    def interact(self, level, player):
        if self.dead or not self.active or player.dead:
            return
        r = self.rect.inflate(-20, -10)
        pr = player.rect
        if player.punch_active and self.last_punch != player.punch_id and player.punch_rect.colliderect(r):
            self.last_punch = player.punch_id
            dmg = 2 if self.state == "stunned" else 1
            self.take_damage(level, dmg, player.punch_rect.center)
            return
        if pr.colliderect(r):
            if player.vy > 0 and pr.bottom - r.top < 30:
                player.bounce(STOMP_BOUNCE * 1.1)
                player.vx = -self.facing * 200
                self.take_damage(level, 1, (pr.centerx, r.top))
            elif not player.rewinding:
                player.hurt(level, self.centerx)

    def take_damage(self, level, dmg, at):
        if self.invuln > 0:
            return
        self.hp = max(0, self.hp - dmg)
        self.flash = 0.15
        self.invuln = 0.3
        level.audio.play("boss_hit")
        level.particles.hit(*at)
        level.hitstop(0.07)
        level.camera.shake(6, 0.15)
        if self.hp <= 0:
            self.dead = True
            self.death_timer = 0
            self.vx = 0
            level.audio.play("explode")
            level.announce("¡K.O.!", 2.0)

    def _update_dead(self, dt, level):
        self.death_timer += dt
        self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
        move_body(self, dt, level.tilemap, use_oneway=False)
        if self.death_timer < 2.0 and self.t % 0.15 < dt:
            level.particles.burst(self.x + random.uniform(0, self.w), self.y + random.uniform(0, self.h),
                                  random.choice([(255, 200, 80), (255, 120, 60), (255, 255, 255)]), 10)
            level.camera.shake(6, 0.1)
        if self.death_timer >= 2.2 and self.alive:
            self.alive = False
            level.state.add_score(SCORE_BOSS)
            level.float_text(f"+{SCORE_BOSS}", self.centerx, self.y)
            level.particles.confetti(self.centerx, self.y + 40, 80)
            level.boss_defeated()

    # ----------------------------------------------------------------- draw
    def _anim(self):
        if self.dead:
            return "dead", 0
        st = self.state
        if st == "walk":
            return "walk", int(self.t * 9)
        if st == "windup":
            return "windup", 0
        if st == "dash":
            return "dash", 0
        if st == "jump":
            return ("slam_up", 0)
        if st == "recover":
            return "slam_down", 0
        if st == "throw":
            return "throw", 0
        if st == "stunned":
            return "dead", 0
        return "idle", int(self.t * 7)

    def draw(self, screen, cam):
        name, idx = self._anim()
        frames = self.frames["right" if self.facing > 0 else "left"][name]
        img = frames[idx % len(frames)]
        if self.flash > 0:
            img = img.copy()
            img.fill((255, 255, 255, 0), special_flags=pygame.BLEND_RGBA_MAX)
        if self.dead and self.death_timer > 1.6:
            img = img.copy()
            img.set_alpha(max(0, int(255 * (2.2 - self.death_timer) / 0.6)))
        ox = math.sin(self.t * 70) * 3 if self.state == "windup" else 0
        x = self.centerx - img.get_width() / 2 - cam[0] + ox
        y = self.y + self.h - SPRITE_FOOT - cam[1]
        screen.blit(img, (x, y))


class Gear(Entity):
    """Engranaje lanzado por el jefe."""

    def __init__(self, x, y, vx, vy):
        super().__init__(x - 16, y - 16, 32, 32)
        self.vx, self.vy = vx, vy
        self.frames = Assets.gear_rotations()
        self.last_punch = -1

    def update(self, dt, level):
        super().update(dt, level)
        self.vy += 900 * dt
        self.x += self.vx * dt
        self.y += self.vy * dt
        tm = level.tilemap
        if tm.solid(int(self.centerx // TILE), int(self.centery // TILE)) or self.y > tm.px_h:
            self.alive = False
            level.particles.burst(self.centerx, self.centery, (236, 186, 82), 8)

    def interact(self, level, player):
        if player.punch_active and player.punch_rect.colliderect(self.rect):
            self.alive = False
            level.audio.play("hit")
            level.particles.hit(self.centerx, self.centery)
            level.state.add_score(50)
        elif player.rect.inflate(-6, -6).colliderect(self.rect) and not player.rewinding:
            player.hurt(level, self.centerx)
            self.alive = False

    def draw(self, screen, cam):
        img = self.frames[int(self.t * 30) % len(self.frames)]
        screen.blit(img, (self.centerx - img.get_width() / 2 - cam[0], self.centery - img.get_height() / 2 - cam[1]))


class Shockwave(Entity):
    """Onda de choque que recorre el suelo. Hay que saltarla."""

    def __init__(self, x, ground_y, direction, speed_mult=1.0):
        super().__init__(x - 20, ground_y - 34, 40, 34)
        self.dir = direction
        self.speed = 430 * speed_mult
        self.life = 1.6

    def update(self, dt, level):
        super().update(dt, level)
        self.x += self.dir * self.speed * dt
        self.life -= dt
        tx = int((self.centerx + self.dir * 20) // TILE)
        ty = int((self.y + 10) // TILE)
        if self.life <= 0 or level.tilemap.solid(tx, ty):
            self.alive = False
        if self.t % 0.05 < dt:
            level.particles.emit(self.centerx, self.y + self.h, 2, (255, 210, 120), speed=(40, 120),
                                 life=(0.2, 0.4), size=(3, 6), gravity=300,
                                 angle=(math.pi * 1.1, math.pi * 1.9))

    def interact(self, level, player):
        if player.rect.colliderect(self.rect.inflate(-8, 0)) and not player.rewinding:
            player.hurt(level, self.centerx)

    def draw(self, screen, cam):
        x, y = self.centerx - cam[0], self.y + self.h - cam[1]
        alpha = max(0, min(1, self.life / 0.4))
        surf = pygame.Surface((80, 60), pygame.SRCALPHA)
        for i, (col, r) in enumerate((((255, 140, 60), 30), ((255, 210, 120), 22), ((255, 255, 220), 12))):
            rect = pygame.Rect(40 - r, 60 - r * 1.6, r * 2, r * 3.2)
            pygame.draw.ellipse(surf, (*col, int(230 * alpha)), rect)
        if self.dir < 0:
            surf = pygame.transform.flip(surf, True, False)
        screen.blit(surf, (x - 40, y - 60))
