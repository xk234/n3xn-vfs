"""Shared tuning and visual configuration — n3xn Python Studio."""
WIDTH, HEIGHT = 640, 360
GROUND_Y = 292
PLAYER_X = 142
PLAYER_SIZE = 28

# Collision is intentionally tighter than the visual cube.
# This is the main source of "fair" Geometry Dash feel.
HITBOX_INSET = 4.0

BASE_SPEED = 315.0
GRAVITY = 1850.0
JUMP_VELOCITY = -640.0
ORB_VELOCITY = -720.0
PAD_VELOCITY = -800.0

# Fixed physics step (independent of render FPS)
FIXED_STEP = 1.0 / 120.0

# Input forgiveness
JUMP_BUFFER = 0.12   # seconds
COYOTE_TIME = 0.09   # seconds

MAX_PARTICLES = 100

# Python Studio palette
BG = "#0b1220"
PANEL = "#111c2d"
GRID = "#1c2b40"
CYAN = "#38bdf8"
BLUE = "#60a5fa"
VIOLET = "#a78bfa"
PURPLE = "#8b5cf6"
PINK = "#f472b6"
AMBER = "#fbbf24"
WHITE = "#eaf4ff"
MUTED = "#8da4bd"
GREEN = "#34d399"
RED = "#fb7185"
DARK = "#07101d"
