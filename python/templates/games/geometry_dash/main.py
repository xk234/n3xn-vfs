"""Geometry Dash — the n3xn Python Studio rhythm-platformer."""
from n3xn import draw_batch, on_click, on_frame, on_key
from geometry_dash.engine import GeometryGame

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
print("Space / Up / W / click: jump")
print("P / Escape: pause    R: restart    C: practice mode")
print("1 / 2 / 3: select a level from the title screen")
