"""Particles, shake, flash — I Am Geometrying My Dash."""
import math
import random
from .config import MAX_PARTICLES


class Effects:
    def __init__(self):
        self.particles = []
        self.shake = 0.0
        self.flash = 0.0
        self.tick = 0.0

    def burst(self, x, y, color, count=24, power=220):
        for _ in range(count):
            if len(self.particles) >= MAX_PARTICLES:
                self.particles.pop(0)
            angle = random.random() * math.tau
            speed = random.uniform(power * 0.25, power)
            self.particles.append([
                x, y,
                math.cos(angle) * speed,
                math.sin(angle) * speed,
                random.uniform(0.22, 0.7),
                random.uniform(2.0, 5.5),
                color,
            ])

    def trail(self, x, y, color):
        if len(self.particles) < MAX_PARTICLES and random.random() < 0.75:
            self.particles.append([
                x, y,
                random.uniform(-60, -10),
                random.uniform(-25, 25),
                random.uniform(0.12, 0.28),
                random.uniform(2, 4.5),
                color,
            ])

    def update(self, dt):
        self.tick += dt
        self.shake = max(0.0, self.shake - dt * 26)
        self.flash = max(0.0, self.flash - dt * 3.4)
        alive = []
        for p in self.particles:
            p[0] += p[2] * dt
            p[1] += p[3] * dt
            p[3] += 270 * dt
            p[4] -= dt
            if p[4] > 0:
                alive.append(p)
        self.particles = alive

    def render(self, ops):
        for x, y, vx, vy, life, size, color in self.particles:
            fade = min(1.0, life * 3.5)
            s = max(1, int(size * fade))
            ops.append(("rect", int(x), int(y), s, s, color, ""))
