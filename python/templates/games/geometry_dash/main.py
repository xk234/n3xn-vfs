"""
Geometry Dash — Python Studio Edition
=====================================
Pure n3xn runtime entry. Never imports pygame.

Controls
  Space / W / Up / click   jump / start
  1 2 3                    select level (menu)
  P / Escape              pause
  R                        restart (or last checkpoint in practice)
  C                        practice mode
  H                        toggle hitbox debug

Works with:
  - n3xn Python Studio (on_frame / draw_batch)
  - Single-HTML exporter (file:///)
"""

from n3xn import draw_batch, on_frame, on_key, on_click
from geometry_dash import GeometryGame

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

print("GEOMETRY DASH — Python Studio Edition")
print("Space / click = jump | 1-3 = levels | C = practice | H = hitboxes")
