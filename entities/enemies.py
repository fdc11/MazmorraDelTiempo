"""Enemigos comunes. Se derrotan saltándoles encima (Mario) o a golpes."""
import math

import pygame

from core.assets import Assets
from core.physics import Body, ledge_ahead, move_body
from settings import GRAVITY, MAX_FALL_SPEED, SCORE_ENEMY, STOMP_BOUNCE, TILE


class Enemy(Body):
    score = SCORE_ENEMY
    stompable = True

    def __init__(self, x, y, w, h):
        super().__init__(x, y, w, h)
        self.alive = True
        self.dead = False
        self.death_timer = 0.0
        self.t = 0.0
        self.last_punch = -1
        self.flash = 0.0

    def kill(self, level, how):
        if self.dead:
            return
        self.dead = True
        self.death_how = how
        level.state.add_score(self.score)
        level.state.enemies_defeated += 1
        level.float_text(f"+{self.score}", self.centerx, self.y)

    def interact(self, level, player):
        """Golpes, pisotones y daño por contacto."""
        if self.dead or player.dead:
            return
        pr = player.rect
        er = self.rect
        if player.punch_active and self.last_punch != player.punch_id and player.punch_rect.colliderect(er):
            self.last_punch = player.punch_id
            level.audio.play("hit")
            level.particles.hit(self.centerx, self.y + self.h / 2)
            level.hitstop(0.05)
            self.on_punched(level, player)
            return
        if pr.colliderect(er):
            if self.stompable and player.vy > 0 and pr.bottom - er.top < 26:
                level.audio.play("stomp")
                level.particles.burst(self.centerx, er.top, (255, 255, 255), 8)
                player.bounce(STOMP_BOUNCE)
                player.y = er.top - player.h
                self.kill(level, "stomp")
            elif not player.rewinding:
                player.hurt(level, self.centerx)

    def on_punched(self, level, player):
        self.vy = -380
        self.vx = player.facing * 260
        self.kill(level, "punch")


class Slime(Enemy):
    SPEED = 70

    def __init__(self, tx, ty, theme):
        super().__init__(tx * TILE + 4, ty * TILE + TILE - 32, 40, 32)
        self.frames = Assets.slime(theme)
        self.dir = -1

    def update(self, dt, level):
        self.t += dt
        if self.dead:
            self.death_timer += dt
            if self.death_how == "punch":
                self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
                self.x += self.vx * dt
                self.y += self.vy * dt
            if self.death_timer > 0.8:
                self.alive = False
            return
        self.vx = self.dir * self.SPEED
        self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
        move_body(self, dt, level.tilemap, level.platforms)
        if self.hit_wall or (self.on_ground and ledge_ahead(self, level.tilemap, self.dir)):
            self.dir *= -1
        if self.y > level.tilemap.px_h + 50:
            self.alive = False

    def draw(self, screen, cam):
        frames = self.frames["right" if self.dir > 0 else "left"]
        img = frames[int(self.t * 9) % len(frames)]
        if self.dead and self.death_how == "stomp":
            k = max(0.05, 1 - self.death_timer * 3)
            img = pygame.transform.smoothscale(img, (int(img.get_width() * (1 + (1 - k) * 0.5)), max(2, int(img.get_height() * k * 0.5))))
        elif self.dead:
            img = pygame.transform.rotate(img, self.death_timer * 540)
        x = self.centerx - img.get_width() / 2 - cam[0]
        y = self.y + self.h - img.get_height() + 6 - cam[1]
        if self.dead and self.death_how == "punch":
            y = self.y + self.h / 2 - img.get_height() / 2 - cam[1]
        screen.blit(img, (x, y))


class Bat(Enemy):
    """Vuela de un lado a otro con un vaivén suave."""

    def __init__(self, tx, ty, span=3):
        super().__init__(tx * TILE + 6, ty * TILE + 10, 36, 26)
        self.frames = Assets.bat()
        self.home_x, self.home_y = self.x, self.y
        self.span = span * TILE
        self.t = (tx * 0.53) % 6

    def update(self, dt, level):
        self.t += dt
        if self.dead:
            self.death_timer += dt
            self.vy = min(MAX_FALL_SPEED, self.vy + GRAVITY * dt)
            self.x += self.vx * dt
            self.y += self.vy * dt
            if self.death_timer > 1.2:
                self.alive = False
            return
        self.x = self.home_x + math.sin(self.t * 0.9) * self.span
        self.y = self.home_y + math.sin(self.t * 3.1) * 18

    def draw(self, screen, cam):
        img = self.frames[int(self.t * 12) % len(self.frames)]
        facing_right = math.cos(self.t * 0.9) > 0
        if facing_right:
            img = pygame.transform.flip(img, True, False)
        if self.dead:
            img = pygame.transform.rotate(pygame.transform.flip(img, False, True), self.death_timer * 200)
        screen.blit(img, (self.centerx - img.get_width() / 2 - cam[0], self.centery - img.get_height() / 2 - cam[1]))
