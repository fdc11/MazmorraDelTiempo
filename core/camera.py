"""Cámara que sigue al jugador con suavizado, anticipación y temblor."""
import random

from settings import HEIGHT, WIDTH


class Camera:
    def __init__(self, level_w, level_h):
        self.x = self.y = 0.0
        self.level_w, self.level_h = level_w, level_h
        self.bounds = None          # (min_x, max_x) para bloquear la arena del jefe
        self.shake_time = 0.0
        self.shake_power = 0.0
        self.look = 0.0

    @property
    def max_y(self):
        return max(0, self.level_h - HEIGHT)

    def shake(self, power=8, time=0.25):
        self.shake_power = max(self.shake_power, power)
        self.shake_time = max(self.shake_time, time)

    def snap(self, target_x, target_y):
        self.x, self.y = self._clamp(target_x - WIDTH / 2, target_y - HEIGHT * 0.55)

    def _clamp(self, x, y):
        lo, hi = 0, max(0, self.level_w - WIDTH)
        if self.bounds:
            lo, hi = self.bounds[0], max(self.bounds[0], self.bounds[1] - WIDTH)
        return max(lo, min(hi, x)), max(0, min(self.max_y, y))

    def update(self, dt, target_x, target_y, facing):
        self.look += (facing * 110 - self.look) * min(1, dt * 2.5)
        tx, ty = self._clamp(target_x - WIDTH / 2 + self.look, target_y - HEIGHT * 0.55)
        k = min(1, dt * 7)
        self.x += (tx - self.x) * k
        self.y += (ty - self.y) * min(1, dt * 5)
        if self.shake_time > 0:
            self.shake_time -= dt
            if self.shake_time <= 0:
                self.shake_power = 0

    @property
    def offset(self):
        if self.shake_time > 0:
            p = self.shake_power
            return (int(self.x + random.uniform(-p, p)), int(self.y + random.uniform(-p, p)))
        return (int(self.x), int(self.y))
