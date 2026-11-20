# Geometry Dash — Python Studio Edition

Pure **n3xn Python Studio** game. No pygame. Uses the official Studio game API:

```python
from n3xn import draw_batch, on_frame, on_key, on_click
```

## Project layout

```
main.py                     entry (registers frame + input callbacks)
geometry_dash/
  __init__.py
  config.py                 physics + palette
  levels.py                 three original levels
  effects.py                particles / shake
  engine.py                 physics, collision (SAT spikes), render
```

## How to run in n3xn

1. Open **Games → Geometry Dash — Python Studio Edition** (or import this folder as a multi-file project).
2. Press **Run**.
3. Use the fullscreen button on the graphics panel for a proper play view.

## Single-file HTML export

Use the Studio **Export single HTML** button. The exporter bundles project sources, Pyodide 0.26.2, and the canvas host. Open the resulting `.html` from `file:///` after the first runtime download.

## Controls

| Input | Action |
|-------|--------|
| Space / W / Up / click | Jump / start |
| 1 2 3 | Select level (menu) |
| P / Escape | Pause |
| R | Restart (or last checkpoint in practice) |
| C | Toggle practice mode |
| H | Toggle hitbox debug |

## Design notes

- **Hitboxes**: visual cube is 28 px; collision box is inset by 4 px (`HITBOX_INSET`). Spikes use real triangle SAT.
- **Timing**: fixed 120 Hz physics accumulator, jump buffer (120 ms), coyote time (90 ms).
- **No pygame**: entry never imports pygame, so Pyodide / single-HTML export stay clean.
- **Theme**: Python Studio dark editor palette (cyan / violet / amber).
