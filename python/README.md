# n3xn Python Studio

A standalone Python playground that lives beside Dreamland at `/python/`. It uses the same static-site deployment model and a separate UI/runtime/service-worker scope.

## Runtime

- CPython through Pyodide 0.26.2 (WebAssembly).
- Pyodide executes in a dedicated Web Worker so normal Python computation does not block the editor UI.
- Each run synchronizes the current multi-file project into the Pyodide virtual filesystem and executes the selected entry file with `runpy`.
- A persistent Python console shares the same worker runtime.
- Package installation first tries the pinned Pyodide package repository and then falls back to `micropip` for compatible pure-Python wheels.
- Runtime assets are cached by the Python-scoped service worker. Use **Warm offline** after the first successful load. Packages are cached as they are loaded; a first-time package install requires network access.

## Workspace

- Monaco editor with Python syntax highlighting, completions, multiple files, and editor themes.
- IndexedDB project persistence with a localStorage fallback.
- Import individual files or whole folders, preserving relative paths for Python source, text, binary assets (images, audio, fonts, data), or a complete `.n3py.json` project export.
- Export the full project and its entry-file setting as `.n3py.json`.
- Export a compressed, self-contained `.html` with the Pyodide 0.26.2 runtime, detected Pyodide package dependencies, project source, and imported binary assets embedded. The standalone output is designed to run from `file:///` without a server.
- Fullscreen controls are available for the graphics/game area, Python terminal, and HTML preview.
- Console output, Python REPL, graphics canvas, and sandboxed HTML preview.
- The `n3xn` Python bridge provides `write(text, level)`, `clear(color)`, `draw(kind, x, y, width, height, color, label)`, `draw_batch(operations)`, `show_html(html)`, `on_click(callback)`, `on_frame(callback)`, and `on_key(callback)`. Retained callbacks are released when a new run replaces them or a run fails.

## Games development

The template selector now has a **Games** category, starting with **Geometry Dash: Python Edition**.

The game bridge is intentionally small and low-dependency:

```python
from n3xn import draw_batch, on_frame, on_key, on_click

def update(dt):
    # update your world and draw it with draw_batch([...])
    pass

def key_event(key, pressed):
    pass

on_frame(update)       # called at a capped 30 FPS
on_key(key_event)      # key name and pressed/released state
on_click(lambda x, y: None)
```

Available drawing operations are `clear`, `rect`, `roundrect`, `gradient`, `poly`, `circle`, `line`, and `text`. Frame callbacks run in the Python worker; the UI sends bounded time steps and input events. Keep frame work small, batch drawing operations, and avoid blocking calls inside a game callback.

### Geometry Dash controls

- **Space / Up / W / click:** jump
- **P:** pause or resume
- **R:** restart
- Reach the finish without hitting spikes or blocks.

This is an original, self-contained platformer demo inspired by one-button rhythm games; it does not include Geometry Dash's proprietary art, music, or levels.

## Existing demos

- Hello Python
- Number Lab
- CSV Analyzer
- Canvas Clicker
- Mandelbrot Explorer
- Geometry Dash: Python Edition

## Notes and current boundaries

This is a browser-hosted CPython environment, not a native Linux process. Native extensions must have compatible Pyodide wheels; arbitrary system packages, subprocesses, native binaries, and unrestricted OS access are not provided. Worker execution has a 60-second guard. The canvas bridge is a small graphics API rather than a full Pygame or SDL implementation. Offline operation requires a successful initial runtime download and sufficient browser cache storage.


## Games development

The template picker includes a **Games** category. The featured **Geometry Dash — Python Studio Edition** project is a modular multi-file platform game in `templates/games/geometry_dash/`.

Its files separate configuration, hand-authored level patterns, particle effects, and the game engine. It includes three original levels, automatic forward movement, precise jumping, spikes and blocks, jump pads and orbs, collectible coins, practice checkpoints, a progress HUD, particles, synthesized sound effects, and an original procedural electronic soundtrack. Controls: Space/Up/W/click to jump, P/Escape to pause, R to restart, C to toggle practice, H to inspect hitboxes, and 1–3 to choose a level from the title screen.

The game bridge now includes `n3xn.play_sound(kind)`; audio is generated locally with Web Audio after the first user gesture. No external audio files or third-party game packages are required.


## Standalone HTML export

Use **Export single HTML** to create `n3xn-python-standalone.html`. The exporter scans Python imports and an optional `requirements.txt`, resolves compatible packages from the pinned Pyodide lockfile, fetches those wheels plus the core runtime, and gzip-compresses the runtime, project, and assets into the HTML file. UTF-8 source is encoded through `TextEncoder`/fatal `TextDecoder`; binary project files are preserved as bytes in the Pyodide virtual filesystem.

The first export requires a network connection to download the runtime and dependencies. Once created, the output is self-contained and is intended to execute locally through `file:///`. It provides its own canvas, terminal, HTML preview, keyboard/mouse input, and fullscreen controls. Pyodide-compatible packages are bundled from imports or `requirements.txt`; packages installed manually through a prior interactive `micropip` session are not automatically inferred unless declared in the project. Native system packages and CPython extensions without Pyodide wheels cannot be bundled.
