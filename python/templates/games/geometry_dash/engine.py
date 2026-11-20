"""I Am Geometrying My Dash — core engine (pure n3xn, no pygame)."""
import math
import random

from .config import *
from .levels import LEVELS, build_objects
from .effects import Effects

try:
    from n3xn import play_sound as _play
except Exception:
    def _play(_name):
        pass


MODE_CUBE = "cube"
MODE_SHIP = "ship"
MODE_BALL = "ball"
MODE_WAVE = "wave"


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
        self.mode = MODE_CUBE
        self.gdir = 1
        self.holding = False
        self.speed_mult = 1.0
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
        self.mode = MODE_CUBE
        self.gdir = 1
        self.holding = False
        self.speed_mult = 1.0

    def select_level(self, index):
        self.level_index = max(0, min(len(LEVELS) - 1, index))
        self.level = LEVELS[self.level_index]
        self.objects = build_objects(self.level)
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
            if obj["kind"] in ("pad", "orb") or obj["kind"].startswith("portal_") or obj["kind"].startswith("speed_"):
                obj["used"] = False
            if obj["kind"] == "coin":
                obj["collected"] = False
        self.death_timer = 0.0
        self.complete_timer = 0.0
        self.effects = Effects()
        self._reset_player()
        self.message = ""
        self.message_timer = 0.0
        _play("start")

    def restart(self):
        if self.practice and self.checkpoints:
            self.distance = self.checkpoints[-1]
            self.last_checkpoint = self.distance
            self.coins = self.checkpoint_coins
            for obj in self.objects:
                if obj["x"] >= self.distance:
                    if obj["kind"] in ("pad", "orb") or obj["kind"].startswith("portal_") or obj["kind"].startswith("speed_"):
                        obj["used"] = False
                    if obj["kind"] == "coin":
                        obj["collected"] = False
            self._reset_player()
            self.physics_accumulator = 0.0
            self.state = "playing"
            self.paused = False
            self.effects.burst(PLAYER_X + 12, GROUND_Y - 8, VIOLET, 12, 90)
            _play("resume")
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
        self.jump_buffer = JUMP_BUFFER
        self.holding = True

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
                    _play("pause" if self.paused else "resume")
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
            elif key in ("1", "2", "3", "4") and self.state in ("menu", "dead", "complete"):
                self.select_level(int(key) - 1)
        else:
            self.keys.discard(key)
            if key in (" ", "space", "arrowup", "w"):
                self.holding = False

    def click(self, x, y):
        if self.state == "menu" and y < 280 and x > 400:
            idx = min(len(LEVELS) - 1, max(0, int((y - 90) / 42)))
            self.select_level(idx)
        else:
            if not any(k in self.keys for k in (" ", "space", "arrowup", "w")):
                self.jump()

    def _die(self):
        self.state = "dead"
        self.death_timer = 0.0
        self.holding = False
        self.effects.shake = 10.0
        self.effects.flash = 1.0
        self.effects.burst(PLAYER_X + PLAYER_SIZE / 2, self.player_y + PLAYER_SIZE / 2, RED, 42, 320)
        _play("death")

    def _set_mode(self, mode):
        if self.mode == mode:
            return
        self.mode = mode
        self.player_vy = 0.0
        self.rotation = 0.0
        self.effects.burst(PLAYER_X + 14, self.player_y + 14, self.level["accent"], 16, 140)
        _play("orb")

    @staticmethod
    def _polygons_overlap(a, b):
        for polygon in (a, b):
            for i in range(len(polygon)):
                p1, p2 = polygon[i], polygon[(i + 1) % len(polygon)]
                axis = (-(p2[1] - p1[1]), p2[0] - p1[0])
                al = [p[0] * axis[0] + p[1] * axis[1] for p in a]
                bl = [p[0] * axis[0] + p[1] * axis[1] for p in b]
                if max(al) <= min(bl) or max(bl) <= min(al):
                    return False
        return True

    def _player_box(self):
        inset = HITBOX_INSET
        return PLAYER_X + inset, PLAYER_X + PLAYER_SIZE - inset, self.player_y + inset, self.player_y + PLAYER_SIZE - (inset - 1.0)

    def _collision(self, obj):
        sx = obj["x"] - self.distance + PLAYER_X
        left, right, top, bottom = self._player_box()
        if obj["kind"] in ("pad", "orb", "coin") or obj["kind"].startswith("portal_") or obj["kind"].startswith("speed_"):
            return False
        if obj["kind"] == "block":
            return right > sx + 2 and left < sx + obj["w"] - 2 and bottom > GROUND_Y - obj["h"] + 2 and top < GROUND_Y
        spike = [(sx + 2.5, GROUND_Y), (sx + obj["w"] * 0.5, GROUND_Y - obj["h"]), (sx + obj["w"] - 2.5, GROUND_Y)]
        player = [(left, top), (right, top), (right, bottom), (left, bottom)]
        return self._polygons_overlap(player, spike)

    def _physics(self, dt):
        self.elapsed += dt
        speed = self.level["speed"] * self.speed_mult
        self.distance += speed * dt
        self.camera = self.distance
        floor = GROUND_Y - PLAYER_SIZE if self.gdir > 0 else CEILING_Y
        grounded = (self.gdir > 0 and self.player_y >= floor - 0.5) or (self.gdir < 0 and self.player_y <= floor + 0.5)
        self.coyote = COYOTE_TIME if grounded else max(0.0, self.coyote - dt)
        self.jump_buffer = max(0.0, self.jump_buffer - dt)

        if self.mode == MODE_CUBE:
            self.player_vy += GRAVITY * self.gdir * dt
            if self.jump_buffer > 0 and self.coyote > 0:
                self.player_vy = JUMP_VELOCITY * self.gdir
                self.jump_buffer = 0.0
                self.coyote = 0.0
                self.effects.burst(PLAYER_X + 12, floor + (8 if self.gdir > 0 else -8), self.level["color"], 7, 65)
                _play("jump")
        elif self.mode == MODE_SHIP:
            if self.holding:
                self.player_vy += SHIP_THRUST * self.gdir * dt
            else:
                self.player_vy += SHIP_GRAVITY * self.gdir * dt
            lim = SHIP_MAX_FALL
            self.player_vy = max(-lim, min(lim, self.player_vy))
            self.rotation = max(-0.55, min(0.55, self.player_vy * 0.0012))
        elif self.mode == MODE_BALL:
            self.player_vy += BALL_GRAVITY * self.gdir * dt
            if self.jump_buffer > 0 and self.coyote > 0:
                self.gdir *= -1
                self.player_vy = BALL_FLIP * self.gdir
                self.jump_buffer = 0.0
                self.coyote = 0.0
                self.effects.burst(PLAYER_X + 12, self.player_y + 14, VIOLET, 12, 100)
                _play("jump")
        elif self.mode == MODE_WAVE:
            target = -WAVE_SPEED_Y if self.holding else WAVE_SPEED_Y
            if self.gdir < 0:
                target = -target
            self.player_vy = target
            self.rotation = -0.7 if self.holding else 0.7

        if self.jump_buffer > 0:
            for obj in self.objects:
                if obj["kind"] != "orb" or obj["used"]:
                    continue
                ox = obj["x"] - self.distance + PLAYER_X + obj["w"] / 2
                oy = obj["y"] + obj["h"] / 2
                if abs(PLAYER_X + PLAYER_SIZE / 2 - ox) < 42 and abs(self.player_y + PLAYER_SIZE / 2 - oy) < 42:
                    obj["used"] = True
                    self.player_vy = ORB_VELOCITY * self.gdir
                    self.jump_buffer = 0.0
                    self.coyote = 0.0
                    self.effects.burst(ox, oy, self.level["accent"], 18, 145)
                    _play("orb")
                    break

        self.player_y += self.player_vy * dt
        if self.gdir > 0:
            if self.player_y >= GROUND_Y - PLAYER_SIZE:
                self.player_y = float(GROUND_Y - PLAYER_SIZE)
                if self.mode != MODE_WAVE:
                    self.player_vy = 0.0
            if self.player_y < CEILING_Y:
                self.player_y = float(CEILING_Y)
                if self.mode == MODE_SHIP:
                    self.player_vy = max(0.0, self.player_vy)
        else:
            if self.player_y <= CEILING_Y:
                self.player_y = float(CEILING_Y)
                if self.mode != MODE_WAVE:
                    self.player_vy = 0.0
            if self.player_y > GROUND_Y - PLAYER_SIZE:
                self.player_y = float(GROUND_Y - PLAYER_SIZE)

        if self.mode == MODE_CUBE and not grounded:
            self.rotation = (self.rotation + speed * dt * 0.012 * self.gdir) % math.tau
        elif self.mode == MODE_CUBE and grounded:
            self.rotation = round(self.rotation / (math.pi / 2)) * (math.pi / 2)
        elif self.mode == MODE_BALL:
            self.rotation = (self.rotation + speed * dt * 0.02) % math.tau

        self.effects.trail(PLAYER_X + 2, self.player_y + PLAYER_SIZE / 2, self.level["color"])

        for obj in self.objects:
            if obj["x"] - self.distance > PLAYER_X + 130:
                break
            screen_x = obj["x"] - self.distance + PLAYER_X
            if obj["kind"] == "coin" and not obj["collected"]:
                if abs(PLAYER_X + PLAYER_SIZE / 2 - (screen_x + obj["w"] / 2)) < 24 and abs(self.player_y + PLAYER_SIZE / 2 - (obj["y"] + obj["h"] / 2)) < 26:
                    obj["collected"] = True
                    self.coins += 1
                    self.effects.burst(screen_x + obj["w"] / 2, obj["y"] + obj["h"] / 2, AMBER, 14, 120)
                    _play("coin")
                continue
            if obj["kind"] == "pad" and not obj["used"]:
                if grounded and PLAYER_X + PLAYER_SIZE > screen_x and PLAYER_X < screen_x + obj["w"]:
                    obj["used"] = True
                    self.player_vy = PAD_VELOCITY * self.gdir
                    self.coyote = 0.0
                    self.effects.burst(screen_x + obj["w"] / 2, GROUND_Y - 8, self.level["accent"], 16, 130)
                    _play("pad")
                continue
            if obj["kind"].startswith("portal_") and not obj["used"]:
                oy = obj.get("y", GROUND_Y - 72)
                if PLAYER_X + PLAYER_SIZE > screen_x and PLAYER_X < screen_x + obj["w"] and self.player_y + PLAYER_SIZE > oy and self.player_y < oy + obj["h"]:
                    obj["used"] = True
                    kind = obj["kind"]
                    if kind == "portal_ship":
                        self._set_mode(MODE_SHIP)
                    elif kind == "portal_cube":
                        self._set_mode(MODE_CUBE)
                    elif kind == "portal_ball":
                        self._set_mode(MODE_BALL)
                    elif kind == "portal_wave":
                        self._set_mode(MODE_WAVE)
                    elif kind == "portal_grav":
                        self.gdir *= -1
                        self.player_vy *= 0.35
                        self.effects.burst(PLAYER_X + 14, self.player_y + 14, PINK, 20, 160)
                        _play("orb")
                continue
            if obj["kind"].startswith("speed_") and not obj["used"]:
                oy = obj.get("y", GROUND_Y - 80)
                if PLAYER_X + PLAYER_SIZE > screen_x and PLAYER_X < screen_x + obj["w"] and self.player_y + PLAYER_SIZE > oy and self.player_y < oy + obj["h"]:
                    obj["used"] = True
                    self.speed_mult = 1.35 if "fast" in obj["kind"] else 0.75
                    self.effects.burst(PLAYER_X + 14, self.player_y + 14, ORANGE, 14, 120)
                    _play("checkpoint")
                continue
            if obj["kind"] in ("pad", "orb", "coin"):
                continue
            if obj["x"] + obj["w"] - self.distance >= 0 and self._collision(obj):
                self._die()
                return

        if self.practice and self.distance - self.last_checkpoint >= 700:
            checkpoint = int(self.distance // 700) * 700
            self.last_checkpoint = checkpoint
            self.checkpoint_coins = self.coins
            self.checkpoints.append(checkpoint)
            self.effects.burst(PLAYER_X + 12, GROUND_Y - 8, GREEN, 14, 110)
            _play("checkpoint")
            self.message = "CHECKPOINT"
            self.message_timer = 1.0

        if self.distance >= self.level["length"]:
            self.state = "complete"
            self.complete_timer = 0.0
            self.best[self.level_index] = max(self.best[self.level_index], 100)
            self.effects.burst(PLAYER_X + 12, self.player_y + 12, GREEN, 50, 280)
            _play("complete")

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
        encoded = ";".join(f"{int(x)},{int(y)}" for x, y in points)
        ops.append(("poly", 0, 0, 0, 0, color, encoded))

    def _round_rect(self, ops, x, y, w, h, color, radius=5):
        ops.append(("roundrect", int(x), int(y), int(w), int(h), color, str(radius)))

    def _text(self, ops, x, y, value, color=WHITE):
        ops.append(("text", int(x), int(y), 0, 0, color, str(value)))

    def _spike(self, ops, x, height, color):
        base = GROUND_Y
        tip = base - height
        self._poly(ops, [(x, base), (x + 17, tip), (x + 34, base)], DARK)
        self._poly(ops, [(x + 3, base - 2), (x + 17, tip + 5), (x + 31, base - 2)], color)
        self._poly(ops, [(x + 8, base - 3), (x + 17, tip + 13), (x + 26, base - 3)], "#eaf4ff")

    def _draw_player(self, ops, px, py, level_color):
        cx, cy = px + PLAYER_SIZE / 2, py + PLAYER_SIZE / 2
        if self.mode == MODE_CUBE:
            self._round_rect(ops, px - 4, py - 4, PLAYER_SIZE + 8, PLAYER_SIZE + 8, "#122d43", 7)
            cube = [(cx + math.cos(self.rotation + math.pi / 4 + i * math.pi / 2) * 19, cy + math.sin(self.rotation + math.pi / 4 + i * math.pi / 2) * 19) for i in range(4)]
            inner = [(cx + math.cos(self.rotation + math.pi / 4 + i * math.pi / 2) * 14, cy + math.sin(self.rotation + math.pi / 4 + i * math.pi / 2) * 14) for i in range(4)]
            self._poly(ops, cube, level_color)
            self._poly(ops, inner, "#eaf7ff")
            self._rect(ops, px + 8, py + 8, 4, 4, "#0b1220")
            self._rect(ops, px + 18, py + 8, 4, 4, "#0b1220")
        elif self.mode == MODE_SHIP:
            self._poly(ops, [(px, cy), (px + PLAYER_SIZE, py + 4), (px + PLAYER_SIZE * 0.7, cy), (px + PLAYER_SIZE, py + PLAYER_SIZE - 4)], level_color)
            self._rect(ops, px + 6, cy - 4, 10, 8, "#eaf7ff")
        elif self.mode == MODE_BALL:
            ops.append(("circle", cx, cy, 15, 0, level_color, ""))
            ops.append(("circle", cx, cy, 10, 0, "#eaf7ff", ""))
            ops.append(("circle", cx, cy, 5, 0, level_color, ""))
        elif self.mode == MODE_WAVE:
            self._poly(ops, [(px, cy), (px + PLAYER_SIZE * 0.55, py), (px + PLAYER_SIZE, cy), (px + PLAYER_SIZE * 0.55, py + PLAYER_SIZE)], TEAL)
            self._poly(ops, [(px + 4, cy), (px + PLAYER_SIZE * 0.5, py + 6), (px + PLAYER_SIZE - 4, cy), (px + PLAYER_SIZE * 0.5, py + PLAYER_SIZE - 6)], "#eaf7ff")

    def render(self):
        ops = [("clear", BG, 0, 0, 0, 0, "")]
        level_color = self.level["color"]
        shake_x = random.uniform(-self.effects.shake, self.effects.shake) if self.effects.shake > 0 else 0
        shake_y = random.uniform(-self.effects.shake * 0.4, self.effects.shake * 0.4) if self.effects.shake > 0 else 0
        pulse = 1.0 + math.sin(self.effects.tick * 7.0) * 0.12
        ops.append(("gradient", 0, 0, WIDTH, HEIGHT, DARK, "#17283c"))
        for i in range(12):
            x = int((i * 64 - self.distance * 0.18) % 768) - 64
            self._line(ops, x, 0, x, GROUND_Y, GRID)
        self._rect(ops, 0, GROUND_Y, WIDTH, HEIGHT - GROUND_Y, "#111d2e")
        self._rect(ops, 0, GROUND_Y, WIDTH, 3, level_color)
        self._rect(ops, 0, 0, WIDTH, CEILING_Y, "#0a1018")
        self._rect(ops, 0, CEILING_Y - 2, WIDTH, 2, level_color if self.gdir < 0 else "#1a2740")

        for obj in self.objects:
            sx = obj["x"] - self.distance + PLAYER_X + shake_x
            if sx < -70 or sx > WIDTH + 70:
                continue
            if obj["kind"] == "spike":
                self._spike(ops, sx, obj["h"], level_color)
            elif obj["kind"] == "pad":
                pad_color = "#334155" if obj["used"] else self.level["accent"]
                self._rect(ops, sx, GROUND_Y - 8, obj["w"], 8, pad_color)
                self._rect(ops, sx + 5, GROUND_Y - 12, obj["w"] - 10, 4, WHITE)
            elif obj["kind"] == "coin":
                if not obj["collected"]:
                    ox, oy = sx + obj["w"] // 2, obj["y"] + obj["h"] // 2
                    self._rect(ops, ox - 9, oy - 12, 18, 24, AMBER)
                    self._rect(ops, ox - 5, oy - 8, 10, 16, "#fff2b2")
            elif obj["kind"] == "orb":
                orb_color = "#526174" if obj["used"] else self.level["accent"]
                ox, oy = sx + obj["w"] // 2, obj["y"] + obj["h"] // 2
                ops.append(("circle", ox, oy, int(14 * pulse), 0, orb_color, ""))
                ops.append(("circle", ox, oy, 8, 0, BG, ""))
                ops.append(("circle", ox, oy, 3, 0, WHITE, ""))
            elif obj["kind"].startswith("portal_"):
                oy = obj.get("y", GROUND_Y - 72)
                colors = {"portal_ship": CYAN, "portal_cube": BLUE, "portal_ball": VIOLET, "portal_wave": TEAL, "portal_grav": PINK}
                col = colors.get(obj["kind"], WHITE)
                self._rect(ops, sx, oy, 8, obj["h"], col)
                self._rect(ops, sx + obj["w"] - 8, oy, 8, obj["h"], col)
            elif obj["kind"].startswith("speed_"):
                oy = obj.get("y", GROUND_Y - 80)
                col = ORANGE if "fast" in obj["kind"] else MUTED
                self._poly(ops, [(sx, oy + 20), (sx + 20, oy), (sx + 40, oy + 20), (sx + 20, oy + 40)], col)
            else:
                y = GROUND_Y - obj["h"]
                self._rect(ops, sx, y, obj["w"], obj["h"], "#1c3550")
                self._rect(ops, sx + 3, y + 3, obj["w"] - 6, 4, level_color)

        px, py = PLAYER_X + shake_x, self.player_y + shake_y
        if self.state != "dead" or self.death_timer < 0.08:
            self._draw_player(ops, px, py, level_color)
        if self.debug_hitboxes:
            left, right, top, bottom = self._player_box()
            self._rect(ops, left, top, right - left, bottom - top, RED)
        self.effects.render(ops)

        percent = min(100, int(self.distance / max(1, self.level["length"]) * 100))
        self._rect(ops, 16, 12, 200, 10, "#1a2740")
        self._rect(ops, 16, 12, int(200 * percent / 100), 10, level_color)
        self._text(ops, 16, 32, f"{percent}%  ATTEMPT {self.attempt}  {self.mode.upper()}  COINS {self.coins}", MUTED)
        self._text(ops, 16, 48, f"{self.level['name']}  BEST {self.best[self.level_index]}%", MUTED)
        if self.practice:
            self._text(ops, 16, 64, "PRACTICE", VIOLET)

        if self.state == "menu":
            self._rect(ops, 30, 60, 360, 230, PANEL)
            self._text(ops, 46, 88, TITLE, CYAN)
            self._text(ops, 46, 108, SUBTITLE, MUTED)
            self._text(ops, 46, 136, "SPACE / CLICK  jump", WHITE)
            self._text(ops, 46, 154, "1-4 levels   C practice   H hitboxes", WHITE)
            self._text(ops, 46, 172, "P pause   R restart", WHITE)
            self._text(ops, 46, 200, "Cube · Ship · Ball · Wave · Gravity", VIOLET)
            self._text(ops, 46, 230, self.message or "PRESS SPACE TO START", AMBER)
            self._text(ops, 46, 260, f"v{VERSION}", MUTED)
            for i, lvl in enumerate(LEVELS):
                y = 70 + i * 42
                self._rect(ops, 410, y, 210, 36, PANEL)
                self._text(ops, 422, y + 12, f"{i+1}. {lvl['name']}", lvl["color"])
                self._text(ops, 422, y + 26, f"best {self.best[i]}%", MUTED)
        elif self.state == "dead":
            self._text(ops, 220, 150, "CRASHED", RED)
            self._text(ops, 180, 175, "SPACE / R  restart", MUTED)
        elif self.state == "complete":
            self._text(ops, 160, 140, "LEVEL COMPLETE", GREEN)
            self._text(ops, 200, 165, f"COINS  {self.coins}", AMBER)
        elif self.paused:
            self._text(ops, 260, 160, "PAUSED", WHITE)
        if self.message_timer > 0 and self.message:
            self._text(ops, 200, 80, self.message, AMBER)
        return ops
