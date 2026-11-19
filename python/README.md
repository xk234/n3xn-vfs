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
- Import individual Python/text files or a complete `.n3py.json` project export.
- Export the full project and its entry-file setting as `.n3py.json`.
- Console output, Python REPL, graphics canvas, and sandboxed HTML preview.
- The `n3xn` Python bridge currently provides `write(text, level)`, `clear(color)`, `draw(kind, x, y, width, height, color, label)`, `show_html(html)`, and `on_click(callback)`.

## Demos

The template manifest includes Hello Python, Number Lab, CSV Analyzer, Canvas Clicker, and Mandelbrot Explorer.

## Notes and current boundaries

This is a browser-hosted CPython environment, not a native Linux process. Native extensions must have compatible Pyodide wheels; arbitrary system packages, subprocesses, native binaries, and unrestricted OS access are not provided. Worker execution has a 60-second guard. The canvas bridge is an intentionally small graphics API, not a full Pygame or SDL implementation. Offline operation requires a successful initial runtime download and sufficient browser cache storage.
