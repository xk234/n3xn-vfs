"""Geometry Dash: Python Edition — a small original rhythm-platformer demo.

Controls:
    Space / Up / W / click: jump
    R: restart after a crash
    P: pause / resume

This is an original game inspired by one-button precision platformers.
It uses only the n3xn graphics bridge and Python's standard library.
"""
import math
import random
from n3xn import draw_batch, on_click, on_frame, on_key

WIDTH, HEIGHT = 640, 360
GROUND = 292
PLAYER_X = 112
SIZE = 28
LEVEL_LENGTH = 4300
SPEED = 285.0
GRAVITY = 1850.0
JUMP = -650.0

player_y = float(GROUND - SIZE)
velocity_y = 0.0
distance = 0.0
score = 0
alive = True
won = False
paused = False
jump_queued = False
held = set()
camera_flash = 0.0

# (world x, width, height, kind). Spikes are intentionally spaced for readable jumps.
OBSTACLES = [
    (520, 30, 38, "spike"), (760, 30, 38, "spike"),
    (990, 30, 38, "spike"), (1190, 64, 52, "block"),
    (1450, 30, 38, "spike"), (1510, 30, 38, "spike"),
    (1780, 64, 52, "block"), (2020, 30, 38, "spike"),
    (2080, 30, 38, "spike"), (2140, 30, 38, "spike"),
    (2450, 64, 68, "block"), (2730, 30, 38, "spike"),
    (2790, 30, 38, "spike"), (3050, 64, 52, "block"),
    (3310, 30, 38, "spike"), (3370, 30, 38, "spike"),
    (3600, 64, 68, "block"), (3890, 30, 38, "spike"),
    (3950, 30, 38, "spike"),
]

def reset():
    global player_y, velocity_y, distance, score, alive, won, paused
    global jump_queued, held, camera_flash
    player_y = float(GROUND - SIZE)
    velocity_y = 0.0
    distance = 0.0
    score = 0
    alive = True
    won = False
    paused = False
    jump_queued = False
    held = set()
    camera_flash = 0.0

def jump():
    global velocity_y, player_y, jump_queued
    if not alive or won:
        reset()
        return
    if paused:
        return
    if player_y >= GROUND - SIZE - 1:
        velocity_y = JUMP
        jump_queued = False

def on_click_game(x, y):
    if not alive or won:
        reset()
    else:
        jump()

def on_key_game(key, pressed):
    global paused, jump_queued
    key = str(key).lower()
    if pressed:
        held.add(key)
        if key in (" ", "space", "arrowup", "w"):
            if not alive or won:
                reset()
            else:
                jump_queued = True
        elif key == "r":
            reset()
        elif key == "p":
            paused = not paused
    else:
        held.discard(key)

def hit_test(obstacle, px, py):
    ox, ow, oh, kind = obstacle
    screen_x = ox - distance
    if kind == "spike":
        # A slightly forgiving inset hitbox makes the narrow spike fair.
        left, right = screen_x + 7, screen_x + ow - 7
        top = GROUND - oh + 10
    else:
        left, right = screen_x + 3, screen_x + ow - 3
        top = GROUND - oh + 3
    return (px + SIZE - 4 > left and px + 4 < right
            and py + SIZE - 3 > top and py + 3 < GROUND)

def frame(dt):
    global player_y, velocity_y, distance, score, alive, won
    global jump_queued, camera_flash
    dt = min(max(float(dt), 0.0), 0.05)

    if alive and not won and not paused:
        if jump_queued:
            jump()
        distance += SPEED * dt
        score = int(distance // 10)
        velocity_y += GRAVITY * dt
        player_y += velocity_y * dt
        if player_y >= GROUND - SIZE:
            player_y = float(GROUND - SIZE)
            velocity_y = 0.0
        for obstacle in OBSTACLES:
            if distance + PLAYER_X + SIZE > obstacle[0] and distance + PLAYER_X < obstacle[0] + obstacle[1]:
                if hit_test(obstacle, PLAYER_X, player_y):
                    alive = False
                    camera_flash = 0.22
                    break
        if distance >= LEVEL_LENGTH:
            won = True
    if camera_flash > 0:
        camera_flash = max(0.0, camera_flash - dt)

    ops = []
    # Background and subtle parallax grid.
    ops.append(("clear", "#0b1022", 0, 0, 0, 0, ""))
    ops.append(("rect", 0, 0, WIDTH, GROUND, "#111a34", ""))
    for i in range(11):
        x = int((i * 78 - (distance * 0.22) % 78))
        ops.append(("line", x, 0, x, GROUND, "#1d2a4a", ""))
    for i in range(5):
        y = 44 + i * 48
        ops.append(("line", 0, y, WIDTH, y, "#172341", ""))
    ops.append(("rect", 0, GROUND, WIDTH, HEIGHT - GROUND, "#202b4a", ""))
    ops.append(("rect", 0, GROUND, WIDTH, 4, "#8b5cf6", ""))
    # Floor ticks scroll to reinforce speed.
    for i in range(17):
        x = int((i * 48 - distance % 48))
        ops.append(("rect", x, GROUND + 18, 23, 3, "#425276", ""))

    for ox, ow, oh, kind in OBSTACLES:
        sx = int(ox - distance)
        if sx < -80 or sx > WIDTH + 80:
            continue
        if kind == "block":
            ops.append(("rect", sx, GROUND - oh, ow, oh, "#f973a8", ""))
            ops.append(("rect", sx + 5, GROUND - oh + 5, ow - 10, 5, "#ffd0e2", ""))
        else:
            # Three line segments form a crisp spike using the bridge's line primitive.
            ops.append(("line", sx, GROUND, sx + ow // 2, GROUND - oh, "#fbbf24", ""))
            ops.append(("line", sx + ow // 2, GROUND - oh, sx + ow, GROUND, "#fbbf24", ""))
            ops.append(("line", sx, GROUND, sx + ow, GROUND, "#fbbf24", ""))

    # Player cube with a small highlight.
    cube_color = "#fb7185" if not alive else "#67e8f9"
    ops.append(("rect", PLAYER_X, int(player_y), SIZE, SIZE, cube_color, ""))
    ops.append(("rect", PLAYER_X + 5, int(player_y) + 5, 7, 7, "#effcff", ""))
    ops.append(("line", PLAYER_X + 18, int(player_y) + 8, PLAYER_X + 23, int(player_y) + 8, "#0b1022", ""))
    ops.append(("line", PLAYER_X + 18, int(player_y) + 18, PLAYER_X + 23, int(player_y) + 18, "#0b1022", ""))

    progress = min(1.0, distance / LEVEL_LENGTH)
    ops.append(("rect", 18, 18, 190, 7, "#293657", ""))
    ops.append(("rect", 18, 18, int(190 * progress), 7, "#a78bfa", ""))
    ops.append(("text", 18, 43, 0, 0, "#cbd5e1", "SCORE  " + str(score)))
    ops.append(("text", 500, 43, 0, 0, "#94a3b8", str(int(progress * 100)) + "%"))

    if paused:
        ops.append(("rect", 170, 122, 300, 92, "#17213b", ""))
        ops.append(("text", 254, 158, 0, 0, "#ffffff", "PAUSED"))
        ops.append(("text", 203, 185, 0, 0, "#cbd5e1", "Press P to resume"))
    elif not alive:
        ops.append(("rect", 142, 112, 356, 116, "#241b35", ""))
        ops.append(("text", 250, 151, 0, 0, "#fb7185", "CRASH!"))
        ops.append(("text", 183, 180, 0, 0, "#e2e8f0", "Press SPACE, click, or R to retry"))
        ops.append(("text", 253, 204, 0, 0, "#94a3b8", "Score: " + str(score)))
    elif won:
        ops.append(("rect", 142, 112, 356, 116, "#172d3b", ""))
        ops.append(("text", 249, 151, 0, 0, "#67e8f9", "LEVEL COMPLETE!"))
        ops.append(("text", 220, 180, 0, 0, "#e2e8f0", "Press SPACE or click to play again"))
        ops.append(("text", 260, 204, 0, 0, "#94a3b8", "Score: " + str(score)))
    else:
        ops.append(("text", 18, 340, 0, 0, "#a5b4fc", "SPACE / UP / W / CLICK  •  P PAUSE  •  R RESTART"))

    draw_batch(ops)

on_click(on_click_game)
on_key(on_key_game)
on_frame(frame)
print("GEOMETRY DASH: PYTHON EDITION")
print("Jump over the spikes and blocks. Reach the finish!")
print("Controls: Space / Up / W / click to jump · P pause · R restart")
