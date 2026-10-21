"""El jugador: movimiento, salto, golpe, daño y rebobinado del tiempo.

Trucos de "game feel" incluidos (son los que hacen que Mario se sienta bien):
  * Coyote time: puedes saltar unos milisegundos después de dejar el borde.
  * Jump buffer: si pulsas saltar justo antes de tocar el suelo, cuenta.
  * Salto variable: soltar el botón corta el salto.
  * Squash & stretch al aterrizar y saltar.
"""
from collections import deque

import pygame

from core.assets import Assets
from core.physics import Body, approach, move_body
from settings import (AIR_ACCEL, COYOTE_TIME, FPS, GRAVITY, INVULNERABLE_TIME, JUMP_BUFFER,
                      JUMP_CUT, JUMP_SPEED, MAX_FALL_SPEED, MAX_HEALTH, PUNCH_COOLDOWN,
                      PUNCH_TIME, REWIND_COST_PER_SEC, REWIND_MAX_ENERGY,
                      REWIND_RECHARGE_PER_SEC, REWIND_SECONDS, RUN_ACCEL, RUN_DECEL, RUN_SPEED)

PLAYER_W, PLAYER_H = 30, 66
SPRITE_FOOT = 89   # px desde el borde superior del sprite hasta la suela


class Player(Body):
    def __init__(self, x, y):
        super().__init__(x, y, PLAYER_W, PLAYER_H)
        self.frames = Assets.player()
        self.facing = 1
        self.health = MAX_HEALTH
        self.coyote = 0.0
        self.jump_buffer = 0.0
        self.jumping = False
        self.punch_timer = 0.0
        self.punch_cooldown = 0.0
        self.punch_id = 0
        self.invulnerable = 0.0
        self.hurt_timer = 0.0
        self.dead = False
        self.dead_timer = 0.0
        self.win = False
        self.anim = "idle"
        self.anim_time = 0.0
        self.squash = 0.0
        self.step_timer = 0.0
        self.history = deque(maxlen=int(REWIND_SECONDS * FPS))
        self.rewind_energy = REWIND_MAX_ENERGY
        self.rewinding = False

    # ------------------------------------------------------------------ API
    @property
    def punch_active(self):
        return self.punch_timer > 0 and self.punch_timer < PUNCH_TIME - 0.04

    @property
    def punch_rect(self):
        r = self.rect
        w, h = 40, 34
        x = r.right - 4 if self.facing > 0 else r.left - w + 4
        return pygame.Rect(x, r.top + 14, w, h)

    def hurt(self, level, source_x=None, damage=1):
        if self.invulnerable > 0 or self.dead or self.win:
            return False
        self.health -= damage
        level.audio.play("hurt")
        level.camera.shake(10, 0.3)
        level.particles.hit(self.centerx, self.y + 20)
        if self.health <= 0:
            self.die(level)
            return True
        self.invulnerable = INVULNERABLE_TIME
        self.hurt_timer = 0.35
        direction = -self.facing if source_x is None else (1 if self.centerx > source_x else -1)
        self.vx = direction * 320
        self.vy = -520
        return True

    def die(self, level):
        if self.dead:
            return
        self.dead = True
        self.health = 0
        self.dead_timer = 0.0
        self.vy = -780
        self.vx = 0
        level.audio.play("hurt")

    def bounce(self, strength):
        self.vy = -strength
        self.jumping = True
        self.squash = -0.25

    def heal(self):
        if self.health < MAX_HEALTH:
            self.health += 1
            return True
        return False

    def respawn(self, x, y):
        self.x, self.y = x, y
        self.vx = self.vy = 0
        self.health = MAX_HEALTH
        self.dead = False
        self.invulnerable = 1.5
        self.history.clear()
        self.rewind_energy = REWIND_MAX_ENERGY

    # --------------------------------------------------------------- update
    def update(self, dt, inp, level):
        self.anim_time += dt
        self.squash = approach(self.squash, 0, dt * 2.5)

        if self.dead:
            # Animación de muerte estilo Mario: salta y cae fuera de pantalla
            self.dead_timer += dt
            self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
            self.y += self.vy * dt
            return

        if self.win:
            self.vx = approach(self.vx, 0, RUN_DECEL * dt)
            self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
            move_body(self, dt, level.tilemap, level.platforms)
            self.anim = "win"
            return

        # --- Rebobinar el tiempo -------------------------------------------
        self.rewinding = False
        if inp.rewind and self.rewind_energy > 0 and len(self.history) > 1:
            self.rewinding = True
            self.rewind_energy = max(0, self.rewind_energy - REWIND_COST_PER_SEC * dt)
            for _ in range(2):  # rebobina al doble de velocidad
                if len(self.history) > 1:
                    snap = self.history.pop()
            self.x, self.y, self.vx, self.vy, self.facing, self.anim = snap
            self.ground_platform = None
            self.invulnerable = max(self.invulnerable, 0.2)
            if self.anim_time % 0.12 < dt:
                level.particles.emit(self.centerx, self.y + self.h / 2, 2, (140, 220, 255),
                                     speed=(20, 80), life=(0.3, 0.6), size=(3, 6), gravity=0, kind="star")
            return
        self.rewind_energy = min(REWIND_MAX_ENERGY, self.rewind_energy + REWIND_RECHARGE_PER_SEC * dt)

        # --- Temporizadores --------------------------------------------------
        self.invulnerable = max(0, self.invulnerable - dt)
        self.hurt_timer = max(0, self.hurt_timer - dt)
        self.punch_timer = max(0, self.punch_timer - dt)
        self.punch_cooldown = max(0, self.punch_cooldown - dt)
        self.jump_buffer = max(0, self.jump_buffer - dt)
        self.coyote = COYOTE_TIME if self.on_ground else max(0, self.coyote - dt)

        controllable = self.hurt_timer <= 0

        # --- Movimiento horizontal ------------------------------------------
        axis = inp.axis if controllable else 0
        if axis:
            self.facing = axis
        target = axis * RUN_SPEED
        if self.punch_timer > 0 and self.on_ground:
            target *= 0.35
        if self.on_ground:
            accel = RUN_ACCEL if axis else RUN_DECEL
        else:
            accel = AIR_ACCEL
        if controllable:
            self.vx = approach(self.vx, target, accel * dt)

        # --- Salto -----------------------------------------------------------
        if inp.jump_pressed and controllable:
            self.jump_buffer = JUMP_BUFFER
        if inp.down and inp.jump_pressed and self.on_ground and self._on_oneway(level):
            self.drop_through = 0.25   # bajar de una plataforma de un sentido
            self.jump_buffer = 0
        if self.jump_buffer > 0 and self.coyote > 0:
            self.vy = -JUMP_SPEED
            self.jump_buffer = 0
            self.coyote = 0
            self.jumping = True
            self.squash = -0.22
            self.ground_platform = None
            level.audio.play("jump")
            level.particles.dust(self.centerx, self.bottom, 5)
        if self.jumping and not inp.jump_held and self.vy < 0:
            self.vy *= JUMP_CUT
            self.jumping = False
        if self.vy >= 0:
            self.jumping = False

        # --- Golpe -----------------------------------------------------------
        if inp.punch_pressed and self.punch_cooldown <= 0 and controllable:
            self.punch_timer = PUNCH_TIME
            self.punch_cooldown = PUNCH_COOLDOWN
            self.punch_id += 1
            level.audio.play("punch")

        # --- Gravedad y colisiones -------------------------------------------
        self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
        vy_before = self.vy
        was_on_ground = move_body(self, dt, level.tilemap, level.platforms)
        if self.on_ground and not was_on_ground and vy_before > 300:
            self.squash = min(0.3, vy_before / 2600)
            level.particles.dust(self.centerx, self.bottom, 7)

        # Polvo al correr
        if self.on_ground and abs(self.vx) > RUN_SPEED * 0.7:
            self.step_timer -= dt
            if self.step_timer <= 0:
                self.step_timer = 0.18
                level.particles.dust(self.centerx - self.facing * 10, self.bottom, 2)

        self.history.append((self.x, self.y, self.vx, self.vy, self.facing, self.anim))
        self._pick_anim()

    def _on_oneway(self, level):
        from settings import TILE
        ty = int((self.y + self.h + 2) // TILE)
        r = self.rect
        cols = range(r.left // TILE, (r.right - 1) // TILE + 1)
        tm = level.tilemap
        return any(tm.oneway(tx, ty) for tx in cols) and not any(tm.solid(tx, ty) for tx in cols)

    def _pick_anim(self):
        old = self.anim
        if self.hurt_timer > 0:
            self.anim = "hurt"
        elif self.punch_timer > 0:
            self.anim = "punch"
        elif not self.on_ground:
            self.anim = "jump" if self.vy < 0 else "fall"
        elif abs(self.vx) > 30:
            self.anim = "run"
        else:
            self.anim = "idle"
        if self.anim != old:
            self.anim_time = 0

    # ----------------------------------------------------------------- draw
    def current_frame(self):
        frames = self.frames["right" if self.facing > 0 else "left"][self.anim]
        if self.anim == "run":
            idx = int(self.anim_time * 14) % len(frames)
        elif self.anim == "idle":
            idx = int(self.anim_time * 6) % len(frames)
        elif self.anim == "punch":
            idx = min(len(frames) - 1, int((PUNCH_TIME - self.punch_timer) / PUNCH_TIME * 4))
        elif self.anim == "win":
            idx = int(self.anim_time * 4) % len(frames)
        else:
            idx = 0
        return frames[idx]

    def draw(self, screen, cam):
        if self.invulnerable > 0 and not self.rewinding and int(self.invulnerable * 20) % 2 == 0 and not self.dead:
            return
        img = self.current_frame()
        if self.dead:
            img = self.frames["right" if self.facing > 0 else "left"]["hurt"][0]
        if abs(self.squash) > 0.01:
            w, h = img.get_size()
            sx, sy = 1 + self.squash * 0.6, 1 - self.squash
            img = pygame.transform.smoothscale(img, (int(w * sx), int(h * sy)))
            foot = SPRITE_FOOT * sy
        else:
            foot = SPRITE_FOOT
        x = self.x + self.w / 2 - img.get_width() / 2 - cam[0]
        y = self.y + self.h - foot - cam[1]
        if self.rewinding:
            ghost = img.copy()
            ghost.fill((120, 200, 255, 120), special_flags=pygame.BLEND_RGBA_MULT)
            screen.blit(ghost, (x - self.vx * 0.03, y - self.vy * 0.03))
        screen.blit(img, (x, y))
