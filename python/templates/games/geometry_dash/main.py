"""
I Am Geometrying My Dash
========================
by Keagan  ·  AI Agents
Pure n3xn Python Studio — no pygame.

Modes: Cube · Ship · Ball · Wave · Gravity portals · Speed portals
"""

from n3xn import draw_batch, on_frame, on_key, on_click
from geometry_dash import GeometryGame
from geometry_dash.config import TITLE, SUBTITLE, VERSION

game = GeometryGame()


def update(dt):
    game.update(dt)
    draw_batch(game.render())


def keyboard(key, pressed):
    game.key(key, pressed)


def mouse_click(x, y):
    game.click(x, y)


on_key(keyboard)
on_click(mouse_click)
on_frame(update)

print(f"{TITLE}  v{VERSION}")
print(SUBTITLE)
print("Space/click=jump | 1-4=levels | C=practice | H=hitboxes | P=pause")
