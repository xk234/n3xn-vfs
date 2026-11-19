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
- The `n3xn` Python bridge currently provides `write(text, level)`, `clear(color)`, `draw(kind, x, y, width, height, color, label)`, `draw_batch(operations)`, `show_html(html)`, and `on_click(callback)`. Click callbacks are retained explicitly by the worker and released when a new run replaces them or a run fails, preventing expired Pyodide borrowed-proxy errors.

## Demos

The template manifest includes Hello Python, Number Lab, CSV Analyzer, Canvas Clicker, and Mandelbrot Explorer.

## Notes and current boundaries

This is a browser-hosted CPython environment, not a native Linux process. Native extensions must have compatible Pyodide wheels; arbitrary system packages, subprocesses, native binaries, and unrestricted OS access are not provided. Worker execution has a 60-second guard. The canvas bridge is an intentionally small graphics API, not a full Pygame or SDL implementation. Offline operation requires a successful initial runtime download and sufficient browser cache storage.


## Standalone HTML export

Use **Standalone HTML** in the Studio toolbar to create `n3xn-python-standalone.html`. The export embeds:

- The pinned Pyodide 0.26.2 JavaScript and WebAssembly runtime.
- The Python standard-library archive and package lock file.
- The current multi-file project and its selected entry point.
- Package wheels fetched by the active Studio runtime, with the installed package names and install source recorded.
- A compact standalone runner with a source editor, console/REPL, and the n3xn graphics/click bridge.

Runtime assets and wheels are gzip-compressed before being Base64-embedded. The export does not reference the deployed `/python/` path or a CDN for its embedded runtime. It uses an in-memory Blob worker and virtual asset responses so the exported runtime can be opened as a local HTML file in browsers that permit Blob workers and WebAssembly from `file://`.

**Package scope:** the export includes wheels captured from packages installed in the Studio runtime. Pyodide repository packages are restored from the embedded Pyodide lockfile; PyPI wheels installed through micropip are embedded from the captured wheel cache. If a wheel was not successfully captured (for example, a browser storage quota failure or an install performed before this capture feature was deployed), that package cannot be guaranteed to work offline in the export. Reinstall it in the current Studio session and export again.

**Browser boundary:** a local HTML file cannot bypass browser security. The embedded project files are available to Python, but the page cannot freely read arbitrary files elsewhere on the computer. External network requests from user code still depend on browser CORS and connectivity. Browser testing of the generated file under `file://` is required before treating a specific browser/version as supported.
