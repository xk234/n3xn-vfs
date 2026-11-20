# Python Games — n3xn Python Studio

The Games category contains playable Python projects designed for the Pyodide worker and n3xn graphics bridge.

## Geometry Dash — Python Studio Edition

The first expanded game is a modular, original rhythm-platformer. Its gameplay is inspired by the one-button precision platformer genre; its title treatment, visuals, levels, and effects are original and styled for n3xn Python Studio.

Project files in the template:

- `main.py`: runtime entry point and n3xn callback registration.
- `geometry_dash/config.py`: dimensions, physics constants, and palette.
- `geometry_dash/levels.py`: three hand-authored levels and object patterns.
- `geometry_dash/effects.py`: particles, trails, death burst, and camera effects.
- `geometry_dash/engine.py`: state machine, fixed-step physics, collision, HUD, and rendering.

### Features

- Three original levels with different colors, speeds, obstacle density, jump pads, and timed jump orbs.
- Automatic forward movement and one-button jumping.
- Jump buffering, coyote-time tolerance, fixed-step 120 Hz physics, cube rotation.
- Separating-axis triangle hit tests for spikes and tighter, consistent block collision bounds.
- Spikes and blocks, jump pads, jump orbs, collectible coins, collision, death burst, particles, and trails.
- Progress percentage, attempts, per-level best progress.
- Practice mode with automatic checkpoints.
- Pause, restart, title screen, level selection, and completion flow.
- Python Studio palette, smooth gradient backdrop, filled beveled spike art, rounded cube layers, cyan/violet accents, and custom HUD.

### Controls

- **Space / Up / W / click:** start, jump, retry, or advance after completion.
- **P / Escape:** pause or resume.
- **R:** restart (practice mode resumes from the latest checkpoint).
- **C:** toggle practice mode.
- **H:** toggle the live hitbox debug overlay (red player bounds, amber obstacle bounds).
- **1 / 2 / 3:** select a level from the title/death/completion screen.

### Runtime API

```python
from n3xn import draw_batch, on_frame, on_key, on_click

def update(dt):
    # update and render
    draw_batch([("rect", 10, 10, 20, 20, "#38bdf8", "")])

def key_event(key, pressed):
    pass

on_frame(update)
on_key(key_event)
on_click(lambda x, y: None)
```

Drawing operations: `clear`, `rect`, `roundrect`, `gradient`, `poly`, `circle`, `line`, and `text`. The Python callback is invoked in a dedicated worker at a 30 FPS target. Keep per-frame work bounded and use batched drawing. The `n3xn.play_sound(kind)` bridge triggers synthesized jump, pad, orb, coin, checkpoint, crash, and completion effects, plus an original 16-step procedural electronic loop. Audio starts after the first user gesture and pauses/resumes with gameplay.

## Roadmap

- Add jump pads, jump orbs, gravity portals, speed portals, and alternate movement modes.
- Add custom level authoring/import and level validation.
- Expand the original soundtrack and add level-specific beat maps and audio timing tools.
- Add more original levels and a progression/select screen.
- Add a real multiplayer game only after a transport and authoritative/synchronized simulation layer is implemented; local Python worker callbacks alone are not multiplayer.


### Current feel / known work

The collision pass now tests the player rectangle against actual spike triangles with a separating-axis test, rather than estimating the triangle surface at one point. Physics advances at a fixed 120 Hz with buffered jumps and coyote time, so the result is less dependent on display frame rate. This still needs hands-on playtesting at different refresh rates and on touch input; it is not yet a claim of exact Geometry Dash physics.
