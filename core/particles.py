"""Partículas: polvo, brillos, chispas, confeti. Le dan "jugo" al juego."""
import math
import random

import pygame


class Particle:
    __slots__ = ("x", "y", "vx", "vy", "life", "max_life", "size", "color", "gravity", "kind", "spin")

    def __init__(self, x, y, vx, vy, life, size, color, gravity=0.0, kind="circle"):
        self.x, self.y, self.vx, self.vy = x, y, vx, vy
        self.life = self.max_life = life
        self.size, self.color, self.gravity, self.kind = size, color, gravity, kind
        self.spin = random.uniform(0, math.tau)


class ParticleSystem:
    def __init__(self):
        self.items = []

    def emit(self, x, y, n, color, speed=(60, 200), life=(0.3, 0.7), size=(3, 7),
             gravity=600, kind="circle", angle=(0, math.tau)):
        for _ in range(n):
            a = random.uniform(*angle)
            sp = random.uniform(*speed)
            self.items.append(Particle(x, y, math.cos(a) * sp, math.sin(a) * sp,
                                       random.uniform(*life), random.uniform(*size), color, gravity, kind))

    # Atajos con nombre para que el código de juego sea legible
    def dust(self, x, y, n=6):
        self.emit(x, y, n, (236, 224, 200), speed=(30, 110), life=(0.25, 0.5), size=(4, 8),
                  gravity=-60, angle=(math.pi, math.tau))

    def sparkle(self, x, y, color=(255, 220, 90)):
        self.emit(x, y, 12, color, speed=(80, 240), life=(0.3, 0.6), size=(3, 6), gravity=200, kind="star")

    def hit(self, x, y):
        self.emit(x, y, 10, (255, 255, 255), speed=(150, 380), life=(0.12, 0.25), size=(3, 6), gravity=0, kind="spark")
        self.emit(x, y, 6, (255, 200, 80), speed=(100, 250), life=(0.2, 0.4), size=(4, 7), gravity=400)

    def burst(self, x, y, color, n=20):
        self.emit(x, y, n, color, speed=(100, 360), life=(0.4, 0.9), size=(5, 10), gravity=700)

    def confetti(self, x, y, n=60):
        cols = [(255, 90, 90), (255, 210, 70), (90, 200, 255), (130, 230, 120), (200, 120, 255)]
        for _ in range(n):
            self.emit(x, y, 1, random.choice(cols), speed=(200, 600), life=(1.2, 2.4), size=(5, 9),
                      gravity=500, kind="rect", angle=(-math.pi * 0.9, -math.pi * 0.1))

    def update(self, dt):
        alive = []
        for p in self.items:
            p.life -= dt
            if p.life <= 0:
                continue
            p.vy += p.gravity * dt
            p.x += p.vx * dt
            p.y += p.vy * dt
            p.spin += dt * 8
            alive.append(p)
        self.items = alive

    def draw(self, screen, cam):
        ox, oy = cam
        for p in self.items:
            t = p.life / p.max_life
            x, y = p.x - ox, p.y - oy
            if p.kind == "circle":
                pygame.draw.aacircle(screen, p.color, (x, y), max(1, p.size * (0.4 + 0.6 * t)))
            elif p.kind == "star":
                r = p.size * t + 1
                pts = []
                for i in range(8):
                    rr = r if i % 2 == 0 else r * 0.4
                    a = p.spin + i * math.pi / 4
                    pts.append((x + math.cos(a) * rr, y + math.sin(a) * rr))
                pygame.draw.polygon(screen, p.color, pts)
            elif p.kind == "spark":
                ln = p.size * 3 * t
                n = math.hypot(p.vx, p.vy) or 1
                pygame.draw.line(screen, p.color, (x, y), (x - p.vx / n * ln, y - p.vy / n * ln), 3)
            elif p.kind == "rect":
                w = p.size * abs(math.cos(p.spin))
                pygame.draw.rect(screen, p.color, (x - w / 2, y - p.size / 3, max(1, w), p.size * 0.66))
