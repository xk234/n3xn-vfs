# Python Games — n3xn Python Studio

This folder contains playable Python game demos for the browser-hosted Pyodide runtime.

## Development contract

Games use the `n3xn` bridge from the Python worker:

- `on_frame(callback)`: register a frame update callback. It receives a bounded `dt` in seconds, capped at 30 calls per second.
- `on_key(callback)`: receive `(key, pressed)` for keyboard down/up events.
- `on_click(callback)`: receive canvas coordinates.
- `draw_batch(operations)`: send a batch of canvas operations to the UI.

Supported operations: `clear`, `rect`, `circle`, `line`, and `text`.

## Current game

- `geometry-dash.py`: original one-button obstacle platformer with jumping, collision, progress, pause, restart, and a finish state.

## Roadmap

1. Improve Geometry Dash: better collision shapes, level editor, checkpoints, sound effects, and selectable levels.
2. Add a Snake game with keyboard controls and persistent high scores.
3. Add a top-down arcade shooter with waves and local co-op experiments.
4. Add multiplayer only where a game has a real synchronization model and a reachable transport; the current Python worker is local single-player and does not itself provide network multiplayer.
