"""Core game state, physics, collision, camera, and rendering."""
import math
import random
from .config import *
from .levels import LEVELS, build_objects
from .effects import Effects
from n3xn import play_sound

class GeometryGame:
    def __init__(self):
        self.level_index = 0
        self.practice = False
        self.debug_hitboxes = False
        self.attempt = 0
        self.coins = 0
        self.checkpoint_coins = 0
        self.best = [0 for _ in LEVELS]
        self.effects = Effects()
        self.keys = set()
        self.state = "menu"
        self.paused = False
        self.camera = 0.0
        self.player_y = float(GROUND_Y - PLAYER_SIZE)
        self.player_vy = 0.0
        self.rotation = 0.0
        self.jump_buffer = 0.0
        self.coyote = 0.0
        self.distance = 0.0
        self.elapsed = 0.0
        self.physics_accumulator = 0.0
        self.checkpoints = []
        self.last_checkpoint = 0.0
        self.death_timer = 0.0
        self.complete_timer = 0.0
        self.level = LEVELS[0]
        self.objects = build_objects(self.level)
        self.message_timer = 0.0
        self.message = "PRESS SPACE OR CLICK TO START"
        self._reset_player()

    def _reset_player(self):
        self.player_y = float(GROUND_Y - PLAYER_SIZE)
        self.player_vy = 0.0
        self.rotation = 0.0
        self.jump_buffer = 0.0
        self.coyote = 0.0

    def select_level(self, index):
        self.level_index = max(0, min(len(LEVELS) - 1, index))
        self.level = LEVELS[self.level_index]
        self.objects = build_objects(self.level)
        self.best[self.level_index] = max(self.best[self.level_index], 0)
        self.start_attempt()

    def start_attempt(self):
        self.attempt += 1
        self.state = "playing"
        self.paused = False
        self.distance = 0.0
        self.elapsed = 0.0
        self.physics_accumulator = 0.0
        self.camera = 0.0
        self.checkpoints = []
        self.last_checkpoint = 0.0
        self.coins = 0
        self.checkpoint_coins = 0
        for obj in self.objects:
            if obj["kind"] in ("pad", "orb"):
                obj["used"] = False
            if obj["kind"] == "coin":
                obj["collected"] = False
        self.death_timer = 0.0
        self.complete_timer = 0.0
        self.effects = Effects()
        self._reset_player()
        self.message = ""
        self.message_timer = 0.0
        play_sound("start")

    def restart(self):
        if self.practice and self.checkpoints:
            self.distance = self.checkpoints[-1]
            self.last_checkpoint = self.distance
            self.coins = self.checkpoint_coins
            for obj in self.objects:
                if obj["kind"] in ("pad", "orb") and obj["x"] >= self.distance:
                    obj["used"] = False
                if obj["kind"] == "coin" and obj["x"] >= self.distance:
                    obj["collected"] = False
            self._reset_player()
            self.physics_accumulator = 0.0
            self.state = "playing"
            self.paused = False
            self.effects.burst(PLAYER_X + 12, GROUND_Y - 8, VIOLET, 12, 90)
            play_sound("resume")
        else:
            self.start_attempt()

    def jump(self):
        if self.state in ("menu", "dead", "complete"):
            if self.state == "menu":
                self.start_attempt()
            elif self.state == "dead":
                self.start_attempt()
            else:
                self.select_level((self.level_index + 1) % len(LEVELS))
            return
        if self.paused:
            return
        self.jump_buffer = 0.145

    def key(self, key, pressed):
        key = str(key).lower()
        if pressed:
            if key in self.keys:
                return
            self.keys.add(key)
            if key in (" ", "space", "arrowup", "w"):
                self.jump()
            elif key in ("p", "escape"):
                if self.state == "playing":
                    self.paused = not self.paused
                    play_sound("pause" if self.paused else "resume")
            elif key == "r":
                self.restart()
            elif key == "h":
                self.debug_hitboxes = not self.debug_hitboxes
                self.message = "HITBOX DEBUG ON" if self.debug_hitboxes else "HITBOX DEBUG OFF"
                self.message_timer = 1.6
            elif key == "c":
                self.practice = not self.practice
                self.message = "PRACTICE MODE ON" if self.practice else "PRACTICE MODE OFF"
                self.message_timer = 1.6
            elif key in ("1", "2", "3") and self.state in ("menu", "dead", "complete"):
                self.select_level(int(key) - 1)
        else:
            self.keys.discard(key)

    def click(self, x, y):
        if self.state == "menu" and y < 245 and x > 410:
            self.select_level(min(2, max(0, int((y - 105) / 48))))
        else:
            self.jump()

    def _die(self):
        self.state = "dead"
        self.death_timer = 0.0
        self.effects.shake = 9.0
        self.effects.flash = 1.0
        self.effects.burst(PLAYER_X + PLAYER_SIZE / 2, self.player_y + PLAYER_SIZE / 2, RED, 38, 300)
        play_sound("death")

    @staticmethod
    def _polygons_overlap(a, b):
        """Separating-axis test: avoids the old spike-center false positives."""
        for polygon in (a, b):
            for i in range(len(polygon)):
                p1, p2 = polygon[i], polygon[(i + 1) % len(polygon)]
                axis = (-(p2[1] - p1[1]), p2[0] - p1[0])
                al = [p[0] * axis[0] + p[1] * axis[1] for p in a]
                bl = [p[0] * axis[0] + p[1] * axis[1] for p in b]
                if max(al) <= min(bl) or max(bl) <= min(al):
                    return False
        return True

    def _collision(self, obj):
        sx = obj["x"] - self.distance + PLAYER_X
        # A small, consistent inset gives a forgiving cube hitbox without
        # making the visible cube and collision shape feel unrelated.
        left, right = PLAYER_X + 3.5, PLAYER_X + PLAYER_SIZE - 3.5
        top, bottom = self.player_y + 3.5, self.player_y + PLAYER_SIZE - 2.5
        if obj["kind"] in ("pad", "orb", "coin"):
            return False
        if obj["kind"] == "block":
            ox1, ox2 = sx + 2.0, sx + obj["w"] - 2.0
            oy1, oy2 = GROUND_Y - obj["h"] + 2.0, GROUND_Y
            return right > ox1 and left < ox2 and bottom > oy1 and top < oy2
        # Real triangular spike collision (SAT), not a midpoint approximation.
        spike = [(sx + 2.0, GROUND_Y), (sx + obj["w"] * 0.5, GROUND_Y - obj["h"]), (sx + obj["w"] - 2.0, GROUND_Y)]
        player = [(left, top), (right, top), (right, bottom), (left, bottom)]
        return self._polygons_overlap(player, spike)

    def _physics(self, dt):
        self.elapsed += dt
        speed = self.level["speed"]
        self.distance += speed * dt
        self.camera = self.distance
        grounded = self.player_y >= GROUND_Y - PLAYER_SIZE - 0.5
        self.coyote = 0.105 if grounded else max(0.0, self.coyote - dt)
        self.jump_buffer = max(0.0, self.jump_buffer - dt)
        # Orbs activate only when a jump press is timed near the ring.
        if self.jump_buffer > 0:
            for obj in self.objects:
                if obj["kind"] != "orb" or obj["used"]:
                    continue
                ox = obj["x"] - self.distance + PLAYER_X + obj["w"] / 2
                oy = obj["y"] + obj["h"] / 2
                cx, cy = PLAYER_X + PLAYER_SIZE / 2, self.player_y + PLAYER_SIZE / 2
                if abs(cx - ox) < 43 and abs(cy - oy) < 44:
                    obj["used"] = True
                    self.player_vy = -735.0
                    self.jump_buffer = 0.0
                    self.coyote = 0.0
                    self.effects.burst(ox, oy, self.level["accent"], 18, 145)
                    play_sound("orb")
                    break
        if self.jump_buffer > 0 and self.coyote > 0:
            self.player_vy = JUMP_VELOCITY
            self.jump_buffer = 0.0
            self.coyote = 0.0
            self.effects.burst(PLAYER_X + 12, GROUND_Y - 2, self.level["color"], 7, 65)
            play_sound("jump")
        self.player_vy += GRAVITY * dt
        self.player_y += self.player_vy * dt
        if self.player_y >= GROUND_Y - PLAYER_SIZE:
            self.player_y = float(GROUND_Y - PLAYER_SIZE)
            self.player_vy = 0.0
        if self.player_y < GROUND_Y - PLAYER_SIZE - 1:
            self.rotation = (self.rotation + speed * dt * 0.012) % math.tau
        else:
            self.rotation = round(self.rotation / (math.pi / 2)) * (math.pi / 2)

        self.effects.trail(PLAYER_X + 2, self.player_y + PLAYER_SIZE - 3, self.level["color"])
        for obj in self.objects:
            if obj["x"] - self.distance > PLAYER_X + 110:
                break
            screen_x = obj["x"] - self.distance + PLAYER_X
            if obj["kind"] == "coin" and not obj["collected"]:
                coin_x = screen_x + obj["w"] / 2
                coin_y = obj["y"] + obj["h"] / 2
                player_cx = PLAYER_X + PLAYER_SIZE / 2
                player_cy = self.player_y + PLAYER_SIZE / 2
                if abs(player_cx - coin_x) < 25 and abs(player_cy - coin_y) < 28:
                    obj["collected"] = True
                    self.coins += 1
                    self.effects.burst(coin_x, coin_y, AMBER, 14, 120)
                    play_sound("coin")
                continue
            if obj["kind"] == "pad" and not obj["used"]:
                grounded_now = self.player_y >= GROUND_Y - PLAYER_SIZE - 0.5
                if grounded_now and PLAYER_X + PLAYER_SIZE > screen_x and PLAYER_X < screen_x + obj["w"]:
                    obj["used"] = True
                    self.player_vy = -820.0
                    self.player_y -= 2
                    self.coyote = 0.0
                    self.effects.burst(screen_x + obj["w"] / 2, GROUND_Y - 8, self.level["accent"], 16, 130)
                    play_sound("pad")
            if obj["kind"] in ("pad", "orb"):
                continue
            if obj["x"] + obj["w"] - self.distance >= 0 and self._collision(obj):
                self._die()
                return
        if self.practice and self.distance - self.last_checkpoint >= 650:
            checkpoint = int(self.distance // 650) * 650
            hazards = [o for o in self.objects if o["kind"] in ("spike", "block")]
            previous_end = max([o["x"] + o["w"] for o in hazards if o["x"] + o["w"] <= checkpoint] or [0])
            next_start = min([o["x"] for o in hazards if o["x"] >= checkpoint] or [self.level["length"]])
            safe_low, safe_high = previous_end + 60, next_start - 100
            if safe_low <= safe_high:
                checkpoint = min(max(checkpoint, safe_low), safe_high)
            else:
                checkpoint = max(self.last_checkpoint + 260, next_start - 180)
            self.last_checkpoint = checkpoint
            self.checkpoint_coins = self.coins
            self.checkpoints.append(checkpoint)
            self.effects.burst(PLAYER_X + 12, GROUND_Y - 8, GREEN, 14, 110)
            play_sound("checkpoint")
            self.message = "CHECKPOINT"
            self.message_timer = 1.0
        if self.distance >= self.level["length"]:
            self.state = "complete"
            self.complete_timer = 0.0
            self.best[self.level_index] = max(self.best[self.level_index], 100)
            self.effects.burst(PLAYER_X + 12, self.player_y + 12, GREEN, 45, 260)
            play_sound("complete")

    def update(self, dt):
        dt = min(max(float(dt), 0.0), 0.10)
        self.effects.update(dt)
        self.message_timer = max(0.0, self.message_timer - dt)
        if self.state == "dead":
            self.death_timer += dt
            return
        if self.state == "complete":
            self.complete_timer += dt
            return
        if self.state != "playing" or self.paused:
            self.physics_accumulator = 0.0
            return
        # A true fixed-step accumulator keeps jump arcs and collisions identical
        # at 30, 60, 120 FPS and during short frame-time spikes.
        self.physics_accumulator = min(self.physics_accumulator + dt, FIXED_STEP * 12)
        while self.physics_accumulator >= FIXED_STEP:
            if self.state != "playing":
                self.physics_accumulator = 0.0
                break
            self._physics(FIXED_STEP)
            self.physics_accumulator -= FIXED_STEP
        percent = min(100, int(self.distance / self.level["length"] * 100))
        self.best[self.level_index] = max(self.best[self.level_index], percent)
    def _rect(self, ops, x, y, w, h, color):
        ops.append(("rect", int(x), int(y), int(w), int(h), color, ""))

    def _line(self, ops, x1, y1, x2, y2, color):
        ops.append(("line", int(x1), int(y1), int(x2), int(y2), color, ""))

    def _poly(self, ops, points, color):
        encoded = ";".join(str(int(x)) + "," + str(int(y)) for x, y in points)
        ops.append(("poly", 0, 0, 0, 0, color, encoded))

    def _round_rect(self, ops, x, y, w, h, color, radius=5):
        ops.append(("roundrect", int(x), int(y), int(w), int(h), color, str(radius)))

    def _text(self, ops, x, y, value, color=WHITE):
        ops.append(("text", int(x), int(y), 0, 0, color, str(value)))

    def _spike(self, ops, x, height, color):
        base = GROUND_Y
        tip = base - height
        # Solid, beveled hazard silhouettes read much more clearly at speed.
        self._poly(ops, [(x, base), (x + 17, tip), (x + 34, base)], "#07101d")
        self._poly(ops, [(x + 3, base - 2), (x + 17, tip + 5), (x + 31, base - 2)], color)
        self._poly(ops, [(x + 8, base - 3), (x + 17, tip + 13), (x + 26, base - 3)], "#eaf4ff")
        self._line(ops, x + 1, base, x + 33, base, color)

    def render(self):
        ops = [("clear", BG, 0, 0, 0, 0, "")]
        level_color = self.level["color"]
        shake_x = random.uniform(-self.effects.shake, self.effects.shake) if self.effects.shake > 0 else 0
        shake_y = random.uniform(-self.effects.shake * 0.45, self.effects.shake * 0.45) if self.effects.shake > 0 else 0
        pulse = 1.0 + math.sin(self.effects.tick * 7.0) * 0.12
        # Smooth atmospheric backdrop replaces the old stacked color bands.
        ops.append(("gradient", 0, 0, WIDTH, HEIGHT, "#07101d", "#17283c"))
        for i in range(12):
            x = int((i * 64 - self.distance * 0.18) % 768) - 64
            self._line(ops, x, 0, x, GROUND_Y, GRID)
        for y in range(34, GROUND_Y, 36):
            self._line(ops, 0, y, WIDTH, y, "#17263a")
        # Floating code-like particles in the far background.
        for i in range(9):
            x = int((i * 91 - self.distance * 0.10) % 700) - 30
            y = 42 + (i * 37) % 150
            self._rect(ops, x, y, 3 + i % 3, 3, "#243c55")
        # Floor and glowing horizon.
        self._rect(ops, 0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y, "#111d2e")
        self._rect(ops, 0, GROUND_Y, WIDTH, 3, level_color)
        self._rect(ops, 0, GROUND_Y + 4, WIDTH, 1, "#30465f")
        for i in range(18):
            x = int((i * 44 - self.distance % 44))
            self._rect(ops, x, GROUND_Y + 18, 21, 3, "#30465f")
        # Decorative rails.
        for i in range(6):
            x = int((i * 132 - self.distance * 0.45) % 790) - 70
            self._rect(ops, x, 76 + (i % 3) * 19, 24, 2, "#20344c")

        # World objects.
        for obj in self.objects:
            sx = obj["x"] - self.distance + PLAYER_X + shake_x
            if sx < -60 or sx > WIDTH + 60:
                continue
            if obj["kind"] == "spike":
                self._spike(ops, sx, obj["h"], level_color)
            elif obj["kind"] == "pad":
                pad_color = "#334155" if obj["used"] else self.level["accent"]
                self._rect(ops, sx, GROUND_Y - 8, obj["w"], 8, pad_color)
                self._rect(ops, sx + 5, GROUND_Y - 12, obj["w"] - 10, 4, WHITE)
                self._rect(ops, sx + 10, GROUND_Y - 16, obj["w"] - 20, 3, pad_color)
            elif obj["kind"] == "coin":
                if not obj["collected"]:
                    ox, oy = sx + obj["w"] // 2, obj["y"] + obj["h"] // 2
                    self._rect(ops, ox - 9, oy - 12, 18, 24, AMBER)
                    self._rect(ops, ox - 5, oy - 8, 10, 16, "#fff2b2")
                    self._rect(ops, ox - 2, oy - 6, 4, 12, AMBER)
            elif obj["kind"] == "orb":
                orb_color = "#526174" if obj["used"] else self.level["accent"]
                ox, oy = sx + obj["w"] // 2, obj["y"] + obj["h"] // 2
                ops.append(("circle", ox, oy, int(14 * pulse), 0, orb_color, ""))
                ops.append(("circle", ox, oy, 8, 0, BG, ""))
                ops.append(("circle", ox, oy, 3, 0, WHITE, ""))
            else:
                y = GROUND_Y - obj["h"]
                self._rect(ops, sx, y, obj["w"], obj["h"], "#1c3550")
                self._rect(ops, sx + 3, y + 3, obj["w"] - 6, 4, level_color)
                self._rect(ops, sx + 5, y + 12, obj["w"] - 10, 2, "#54718e")
                self._rect(ops, sx + 5, GROUND_Y - 5, obj["w"] - 10, 2, level_color)

        # Player glow, rotation outline, and face.
        px, py = PLAYER_X + shake_x, self.player_y + shake_y
        if self.state != "dead" or self.death_timer < 0.08:
            self._round_rect(ops, px - 5, py - 5, PLAYER_SIZE + 10, PLAYER_SIZE + 10, "#122d43", 8)
            cx, cy = px + PLAYER_SIZE / 2, py + PLAYER_SIZE / 2
            # Rotate the actual cube silhouette while keeping its gameplay hitbox stable.
            cube = [(cx + math.cos(self.rotation + math.pi / 4 + i * math.pi / 2) * 20,
                     cy + math.sin(self.rotation + math.pi / 4 + i * math.pi / 2) * 20) for i in range(4)]
            inner = [(cx + math.cos(self.rotation + math.pi / 4 + i * math.pi / 2) * 15,
                      cy + math.sin(self.rotation + math.pi / 4 + i * math.pi / 2) * 15) for i in range(4)]
            core = [(cx + math.cos(self.rotation + math.pi / 4 + i * math.pi / 2) * 10,
                     cy + math.sin(self.rotation + math.pi / 4 + i * math.pi / 2) * 10) for i in range(4)]
            self._poly(ops, cube, level_color)
            self._poly(ops, inner, "#eaf7ff")
            self._poly(ops, core, level_color)
            self._rect(ops, px + 8, py + 8, 4, 4, "#0b1220")
            self._rect(ops, px + 18, py + 8, 4, 4, "#0b1220")

        if self.debug_hitboxes:
            # Red = player collision box; amber = obstacle collision geometry.
            l, r = PLAYER_X + 3.5, PLAYER_X + PLAYER_SIZE - 3.5
            t, b = self.player_y + 3.5, self.player_y + PLAYER_SIZE - 2.5
            self._line(ops, l, t, r, t, RED)
            self._line(ops, r, t, r, b, RED)
            self._line(ops, r, b, l, b, RED)
            self._line(ops, l, b, l, t, RED)
            for obj in self.objects:
                sx = obj["x"] - self.distance + PLAYER_X
                if sx < -50 or sx > WIDTH + 50 or obj["kind"] not in ("spike", "block"):
                    continue
                if obj["kind"] == "block":
                    x1, x2 = sx + 2, sx + obj["w"] - 2
                    y1, y2 = GROUND_Y - obj["h"] + 2, GROUND_Y
                    corners = [(x1,y1),(x2,y1),(x2,y2),(x1,y2)]
                else:
                    corners = [(sx+2,GROUND_Y),(sx+obj["w"]*0.5,GROUND_Y-obj["h"]),(sx+obj["w"]-2,GROUND_Y)]
                for i in range(len(corners)):
                    p1, p2 = corners[i], corners[(i+1)%len(corners)]
                    self._line(ops, p1[0], p1[1], p2[0], p2[1], AMBER)

        self.effects.render(ops)
        # HUD.
        self._rect(ops, 14, 12, 612, 38, "#0b1524")
        self._rect(ops, 20, 18, 600, 5, "#263a50")
        progress = min(1.0, self.distance / self.level["length"])
        self._rect(ops, 20, 18, int(600 * progress), 5, level_color)
        self._text(ops, 20, 41, self.level["name"], WHITE)
        self._text(ops, 480, 41, str(int(progress * 100)) + "%", level_color)
        self._text(ops, 20, 66, "ATTEMPT " + str(max(1, self.attempt)), MUTED)
        self._text(ops, 400, 66, "COINS " + str(self.coins), AMBER)
        self._text(ops, 520, 66, "BEST " + str(self.best[self.level_index]) + "%", MUTED)
        if self.practice:
            self._text(ops, 270, 66, "PRACTICE", GREEN)
        if self.debug_hitboxes:
            self._text(ops, 270, 88, "HITBOX DEBUG", RED)

        if self.state == "menu":
            self._rect(ops, 90, 83, 460, 178, "#0b1728")
            self._rect(ops, 90, 83, 4, 178, VIOLET)
            self._text(ops, 126, 121, "n3xn / PYTHON STUDIO", CYAN)
            self._text(ops, 126, 157, "GEOMETRY DASH", WHITE)
            self._text(ops, 126, 181, "A precision platform game", MUTED)
            self._text(ops, 126, 218, "SPACE / CLICK  START", level_color)
            self._text(ops, 126, 241, "1-3 SELECT LEVEL   C PRACTICE", MUTED)
            self._text(ops, 390, 118, "01  FIRST STEPS", WHITE)
            self._text(ops, 390, 166, "02  NEON CIRCUIT", VIOLET)
            self._text(ops, 390, 214, "03  BYTECODE RUSH", GREEN)
        elif self.paused:
            self._rect(ops, 150, 120, 340, 105, "#0b1728")
            self._text(ops, 260, 157, "PAUSED", WHITE)
            self._text(ops, 194, 188, "P / ESCAPE TO RESUME", CYAN)
        elif self.state == "dead":
            self._rect(ops, 120, 113, 400, 112, "#20182b")
            self._text(ops, 255, 151, "CRASHED", RED)
            self._text(ops, 165, 181, "SPACE / CLICK TO RETRY", WHITE)
            self._text(ops, 211, 204, "R RESTART  •  C PRACTICE", MUTED)
        elif self.state == "complete":
            self._rect(ops, 105, 108, 430, 120, "#102b2c")
            self._text(ops, 230, 148, "LEVEL COMPLETE", GREEN)
            self._text(ops, 158, 179, "SPACE / CLICK FOR NEXT LEVEL", WHITE)
            self._text(ops, 224, 204, "100%  •  NICE RUN", MUTED)
        elif self.message_timer > 0:
            self._text(ops, 255, 112, self.message, GREEN)

        self._text(ops, 18, 348, "SPACE / CLICK JUMP   P PAUSE   R RESTART   C PRACTICE", MUTED)
        if self.effects.flash > 0:
            self._rect(ops, 0, 0, WIDTH, 3, RED)
            self._rect(ops, 0, HEIGHT - 3, WIDTH, 3, RED)
        return ops
