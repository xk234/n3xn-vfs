/**
 * Main-thread Pyodide host for pygame-ce (and other DOM-bound packages).
 * Worker-based Python cannot open an SDL/canvas window; this path can.
 */
let py = null;
let loading = null;
let running = false;
let handlers = {};
let canvasEl = null;

const PKG_ALIASES = {
  pygame: "pygame-ce",
  "pygame-ce": "pygame-ce",
};

function emit(type, data = {}) {
  try {
    handlers[type]?.(data);
  } catch (_) {}
}

function log(text, level = "out") {
  emit("stdout", { text: String(text), level });
}

export function setPygameHandlers(next) {
  handlers = { ...handlers, ...next };
}

function pyodideIndexURL() {
  try {
    if (navigator.serviceWorker?.controller) {
      return new URL("/__pyodide__/v0.26.2/full/", location.origin).href;
    }
  } catch (_) {}
  return "https://cdn.jsdelivr.net/pyodide/v0.26.2/full/";
}

async function ensurePyodide() {
  if (py) return py;
  if (loading) return loading;
  loading = (async () => {
    const base = pyodideIndexURL();
    log("Loading main-thread Pyodide for pygame…", "system");
    if (!globalThis.loadPyodide) {
      await new Promise((resolve, reject) => {
        const s = document.createElement("script");
        s.src = base + "pyodide.js";
        s.onload = resolve;
        s.onerror = () => reject(new Error("Failed to load pyodide.js"));
        document.head.appendChild(s);
      });
    }
    py = await loadPyodide({
      indexURL: base,
      stdout: (t) => log(t, "out"),
      stderr: (t) => log(t, "err"),
    });
    log("Main-thread Pyodide ready (" + (py.version || "wasm") + ")", "ok");
    return py;
  })();
  try {
    return await loading;
  } finally {
    loading = null;
  }
}

function bindCanvas(canvas) {
  canvasEl = canvas;
  if (!canvas) return;
  // pygame-ce / emscripten look for Module.canvas or a #canvas element
  globalThis.Module = globalThis.Module || {};
  globalThis.Module.canvas = canvas;
  // Keep existing id (studio uses graphics-canvas). setCanvas2D does not require id="canvas".
  try {
    canvas.setAttribute("tabindex", "0");
    canvas.addEventListener("click", () => { try { canvas.focus(); } catch (_) {} }, { once: false });
  } catch (_) {}
}

function attachPyodideCanvas(canvas) {
  if (!py || !canvas) return;
  try {
    // Modern Pyodide API (0.24+)
    if (py.canvas && typeof py.canvas.setCanvas2D === "function") {
      py.canvas.setCanvas2D(canvas);
      log("Bound pygame canvas via pyodide.canvas.setCanvas2D", "ok");
      return;
    }
  } catch (e) {
    log("setCanvas2D failed: " + (e.message || e), "warn");
  }
  // Fallback Module.canvas (already set in bindCanvas)
  globalThis.Module = globalThis.Module || {};
  globalThis.Module.canvas = canvas;
}

function cleanPath(path) {
  return String(path)
    .replace(/^\/+/, "")
    .split("/")
    .filter((p) => p && p !== "." && p !== "..")
    .join("/");
}

async function mountFiles(files) {
  const root = "/home/pyodide/project";
  try {
    await py.runPythonAsync(
      "import shutil, os\nshutil.rmtree('/home/pyodide/project', ignore_errors=True)\nos.makedirs('/home/pyodide/project', exist_ok=True)"
    );
  } catch (_) {}
  try {
    py.FS.mkdirTree(root);
  } catch (_) {}
  for (const [path, content] of Object.entries(files || {})) {
    const clean = cleanPath(path);
    if (!clean) continue;
    const full = root + "/" + clean;
    const parent = full.slice(0, full.lastIndexOf("/"));
    try {
      py.FS.mkdirTree(parent);
    } catch (_) {}
    if (content && typeof content === "object" && content.__n3xn_binary__ && content.base64) {
      const binary = atob(content.base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      py.FS.writeFile(full, bytes);
    } else {
      py.FS.writeFile(full, String(content ?? ""));
    }
  }
  return root;
}

async function ensurePygame() {
  log("Installing pygame-ce (provides import pygame)…", "system");
  try {
    await py.loadPackage("pygame-ce");
  } catch (e1) {
    try {
      await py.loadPackage("micropip");
      await py.runPythonAsync(
        "import micropip\nawait micropip.install('pygame-ce')"
      );
    } catch (e2) {
      throw new Error(
        "Could not install pygame-ce: " +
          (e2?.message || e2) +
          " (first error: " +
          (e1?.message || e1) +
          ")"
      );
    }
  }
  // Soft import check
  await py.runPythonAsync("import pygame\nprint('pygame', getattr(pygame, 'version', 'ok'))");
  log("pygame ready on main thread", "ok");
}

/**
 * Detect whether project sources need a DOM-bound runtime (pygame etc.)
 */
export function needsMainThreadRuntime(files) {
  const re =
    /^\s*(?:import\s+pygame|from\s+pygame\b|import\s+pg\b)/m;
  for (const [path, content] of Object.entries(files || {})) {
    if (typeof content !== "string") continue;
    if (!path.endsWith(".py") && path !== "requirements.txt") continue;
    if (re.test(content)) return true;
    if (/pygame/i.test(content) && /requirements/i.test(path)) return true;
  }
  return false;
}

export async function installMainThreadPackage(name) {
  await ensurePyodide();
  let pkg = String(name || "").trim();
  if (!/^[A-Za-z0-9_.-]+$/.test(pkg)) {
    throw new Error("Invalid package name");
  }
  pkg = PKG_ALIASES[pkg.toLowerCase()] || pkg;
  log("Installing " + pkg + " (main thread)…", "system");
  try {
    await py.loadPackage(pkg);
  } catch {
    await py.loadPackage("micropip");
    py.globals.set("_n3xn_pkg_name", pkg);
    try {
      await py.runPythonAsync(
        "import micropip\nawait micropip.install(_n3xn_pkg_name)"
      );
    } finally {
      try {
        py.globals.delete("_n3xn_pkg_name");
      } catch (_) {}
    }
  }
  log("Installed " + pkg, "ok");
  return { name: pkg };
}

export async function runPygameProject({ files, entry, canvas }) {
  if (running) {
    throw new Error("A pygame project is already running. Stop it first.");
  }
  running = true;
  emit("status", { text: "Starting pygame host…" });
  try {
    bindCanvas(canvas);
    await ensurePyodide();
    attachPyodideCanvas(canvas);
    await ensurePygame();
    attachPyodideCanvas(canvas); // re-bind after package load (some builds reset)
    const root = await mountFiles(files);
    const entryClean = cleanPath(entry || "main.py");
    const full = root + "/" + entryClean;

    // Load declared pure deps from requirements if present
    const req =
      files["requirements.txt"] ||
      files["/requirements.txt"] ||
      files["requirements.txt"];
    if (typeof req === "string") {
      for (const line of req.split(/\r?\n/)) {
        const n = line.trim().split(/[<>=!~;\[]/)[0].trim();
        if (!n || n.startsWith("#")) continue;
        const pkg = PKG_ALIASES[n.toLowerCase()] || n;
        if (pkg === "pygame-ce" || pkg === "pygame") continue;
        try {
          await installMainThreadPackage(pkg);
        } catch (e) {
          log("Optional dep " + pkg + " failed: " + (e.message || e), "warn");
        }
      }
    }

    // Browser-friendly bootstrap: yield between frames if user uses a tight loop
    py.globals.set("_n3xn_project_root", root);
    py.globals.set("_n3xn_entry", full);
    await py.runPythonAsync(`
import os, sys, runpy, builtins, time as _time
os.chdir(_n3xn_project_root)
if _n3xn_project_root not in sys.path:
    sys.path.insert(0, _n3xn_project_root)

# Help pygame find the canvas / emscripten video driver
os.environ.setdefault("SDL_VIDEODRIVER", "emscripten")
os.environ.setdefault("SDL_AUDIODRIVER", "emscripten")
os.environ.setdefault("PYGAME_HIDE_SUPPORT_PROMPT", "1")

# Soft patch: time.sleep yields briefly so the browser can paint / handle input.
# Prefer clock.tick() in real games; this is a safety net for tight loops.
_real_sleep = _time.sleep
def _browser_sleep(seconds):
    seconds = float(seconds or 0)
    if seconds <= 0:
        return
    # Cap so a long sleep cannot freeze the tab for minutes
    if seconds > 0.05:
        seconds = min(seconds, 0.05)
    _real_sleep(seconds)
_time.sleep = _browser_sleep

print("Running", _n3xn_entry, "with pygame-ce on the main thread")
runpy.run_path(_n3xn_entry, run_name="__main__")
`);
    emit("done", {});
    log("pygame project finished", "ok");
  } catch (error) {
    const msg = error?.stack || String(error);
    emit("runError", { message: msg });
    log(msg, "err");
    throw error;
  } finally {
    running = false;
    emit("stopped", {});
  }
}

export function stopPygameHost() {
  running = false;
  // Best-effort: cannot truly kill sync Python mid-flight without restart
  try {
    if (py) {
      // Future runs get a clean slate by dropping the interpreter reference
      // Full restart next ensurePyodide if needed
    }
  } catch (_) {}
  emit("stopped", {});
}

export function isPygameRunning() {
  return running;
}
