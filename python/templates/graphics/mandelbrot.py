"""A compact Mandelbrot fractal drawn with Python."""
from n3xn import clear, draw, draw_batch, write

WIDTH, HEIGHT = 160, 90
clear("#050816")
draw("text", 18, 24, 0, 0, "#c4b5fd", "MANDELBROT / PYTHON WASM")
operations = []
for py in range(HEIGHT):
    cy = (py - HEIGHT / 2) * 2.8 / HEIGHT
    for px in range(WIDTH):
        cx = (px - WIDTH * 0.68) * 3.5 / WIDTH
        x = y = 0.0
        iteration = 0
        while x*x + y*y <= 4 and iteration < 28:
            x, y = x*x - y*y + cx, 2*x*y + cy
            iteration += 1
        if iteration < 28:
            shade = int(iteration * 9) % 255
            color = "#%02x%02x%02x" % (30 + shade // 2, 30 + shade // 3, 100 + shade // 2)
            operations.append(("rect", px * 4, py * 4 + 30, 4, 4, color, ""))
draw_batch(operations)
write("Fractal rendered with pure Python loops.", "ok")
