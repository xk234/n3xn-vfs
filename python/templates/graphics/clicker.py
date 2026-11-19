"""Interactive canvas demo: click the glowing target."""
from n3xn import clear, draw, write, on_click

score = 0
target_x, target_y, radius = 320, 185, 38

def paint():
    clear("#080f20")
    draw("text", 24, 34, 0, 0, "#c4b5fd", "N3XN PYTHON ARCADE")
    draw("text", 24, 62, 0, 0, "#94a3b8", "Click the glowing target")
    draw("circle", target_x, target_y, radius, radius, "#8b5cf6")
    draw("circle", target_x, target_y, 12, 12, "#e0e7ff")
    draw("text", 24, 330, 0, 0, "#67e8f9", "SCORE: " + str(score))

def clicked(x, y):
    global score, target_x, target_y
    dx, dy = x - target_x, y - target_y
    if dx * dx + dy * dy <= radius * radius:
        score += 1
        target_x = 70 + (score * 97) % 500
        target_y = 110 + (score * 61) % 150
        write("Target hit! Score: " + str(score), "ok")
    else:
        write("Miss! Try the glowing target.", "warn")
    paint()

on_click(clicked)
paint()
write("Canvas Clicker ready — click the target in the Graphics tab.", "ok")
