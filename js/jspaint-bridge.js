/**
 * n3xn VFS v3.0.9-beta — JSPaint bridge
 * Reads fs.readFile records as { content, mime } → Blob
 */
const JSPAINT_URL = "/jspaint/index.html";
const HANDLE_PREFIX = "n3xn:";

function allowAll() {
  return (
    "accelerometer; ambient-light-sensor; autoplay; battery; bluetooth; camera; " +
    "clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; " +
    "gamepad; geolocation; gyroscope; hid; idle-detection; local-fonts; magnetometer; " +
    "microphone; midi; payment; picture-in-picture; publickey-credentials-get; " +
    "screen-wake-lock; serial; speaker-selection; storage-access; usb; " +
    "web-share; window-management; xr-spatial-tracking"
  );
}

function pathFromHandle(handle) {
  if (handle == null) return null;
  if (typeof handle === "string") {
    return handle.startsWith(HANDLE_PREFIX) ? handle.slice(HANDLE_PREFIX.length) : handle;
  }
  if (typeof handle === "object" && handle.path) return handle.path;
  return String(handle);
}

function toHandle(path) {
  return HANDLE_PREFIX + String(path || "");
}

function guessName(path, fallback) {
  if (!path) return fallback || "untitled.png";
  const s = String(path).replace(/\/+$/, "");
  const i = s.lastIndexOf("/");
  return (i >= 0 ? s.slice(i + 1) : s) || fallback || "untitled.png";
}

function recordToBlob(rec, path) {
  if (!rec) throw new Error("No such file: " + path);
  if (rec instanceof Blob) return rec;
  const mime = rec.mime || "application/octet-stream";
  const content = rec.content != null ? rec.content : rec;
  if (content instanceof Blob) return content;
  if (content instanceof ArrayBuffer) return new Blob([content], { type: mime });
  if (content instanceof Uint8Array) return new Blob([content], { type: mime });
  if (typeof content === "string") return new Blob([content], { type: mime });
  if (content && content.buffer instanceof ArrayBuffer) return new Blob([content], { type: mime });
  throw new Error("Unsupported VFS payload for " + path);
}

async function vfsReadBlob(path) {
  path = String(path || "");
  if (!path.startsWith("/")) path = "/" + path;

  if (window.__n3xnFS?.readBlob) {
    try {
      return await window.__n3xnFS.readBlob(path);
    } catch (e) {
      console.warn("[n3xn jspaint] __n3xnFS.readBlob failed, trying fs.js", e);
    }
  }

  try {
    const fs = await import("./fs.js");
    const rec = await fs.readFile(path);
    return recordToBlob(rec, path);
  } catch (e) {
    if (window.__n3xnFS?.readFile) {
      const data = await window.__n3xnFS.readFile(path);
      return recordToBlob(data, path);
    }
    throw e instanceof Error ? e : new Error("VFS read failed for " + path + ": " + e);
  }
}

async function vfsWriteBlob(path, blob) {
  path = String(path || "");
  if (!path.startsWith("/")) path = "/" + path;
  const mime = (blob && blob.type) || "application/octet-stream";

  if (window.__n3xnFS?.writeBlob) {
    await window.__n3xnFS.writeBlob(path, blob);
    return true;
  }

  const fs = await import("./fs.js");
  const buf = new Uint8Array(await blob.arrayBuffer());
  await fs.writeFile(path, buf, { mime });
  return true;
}

function waitFor(fn, interval = 50, timeout = 20000) {
  const t0 = Date.now();
  return new Promise((resolve, reject) => {
    const tick = () => {
      try {
        if (fn()) return resolve(true);
      } catch (_) {}
      if (Date.now() - t0 > timeout) return reject(new Error("timeout waiting for JSPaint"));
      setTimeout(tick, interval);
    };
    tick();
  });
}

let hostEl = null;
let frameEl = null;
let onCloseCb = null;

function ensureHost() {
  if (hostEl && document.body.contains(hostEl)) return hostEl;
  hostEl = document.createElement("div");
  hostEl.id = "n3xn-jspaint-host";
  hostEl.setAttribute("data-n3xn", "safe");
  Object.assign(hostEl.style, {
    position: "fixed",
    inset: "0",
    zIndex: "12000",
    background: "rgba(5,5,8,.92)",
    display: "flex",
    flexDirection: "column",
  });
  hostEl.innerHTML =
    '<div data-n3xn="safe" style="flex:0 0 auto;display:flex;align-items:center;gap:10px;padding:8px 12px;border-bottom:1px solid #1a1a28;background:#0a0a0f;color:#e8e8f0;font:13px system-ui,sans-serif">' +
    '<strong style="letter-spacing:.04em">JSPaint · n3xn VFS</strong><span style="flex:1"></span>' +
    '<button type="button" id="n3xn-jspaint-close" style="cursor:pointer;padding:6px 12px;border-radius:6px;border:1px solid #333;background:#1a1a28;color:#fff">Close</button></div>' +
    '<div id="n3xn-jspaint-frame-wrap" data-n3xn="safe" style="flex:1;position:relative;min-height:0"></div>';
  document.body.appendChild(hostEl);
  hostEl.querySelector("#n3xn-jspaint-close").onclick = () => closeImageEditor();
  return hostEl;
}

function wireSystemHooks(win, session) {
  if (!win.systemHooks) win.systemHooks = {};
  const hooks = win.systemHooks;

  hooks.readBlobFromHandle = async (handle) => {
    const path = pathFromHandle(handle) || session.path;
    if (!path) throw new Error("No path for handle");
    return vfsReadBlob(path);
  };

  hooks.writeBlobToHandle = async (handle, blob) => {
    const path = pathFromHandle(handle) || session.path;
    if (!path) throw new Error("No path for handle");
    await vfsWriteBlob(path, blob);
    session.path = path;
    session.fileName = guessName(path, session.fileName);
  };

  hooks.showSaveFilePicker =
    hooks.showSaveFilePicker ||
    (async (opts = {}) => {
      const name = opts.suggestedName || session.fileName || "untitled.png";
      let path = session.path || "/images/" + name;
      const entered = window.prompt("Save to VFS path", path);
      if (!entered) throw new Error("Save cancelled");
      path = entered.startsWith("/") ? entered : "/" + entered;
      return toHandle(path);
    });

  hooks.showOpenFilePicker =
    hooks.showOpenFilePicker ||
    (async () => {
      const entered = window.prompt("Open VFS path", session.path || "/");
      if (!entered) throw new Error("Open cancelled");
      const path = entered.startsWith("/") ? entered : "/" + entered;
      return [toHandle(path)];
    });
}

export async function openImageEditor(opts = {}) {
  const session = {
    path: opts.path || null,
    fileName: opts.fileName || guessName(opts.path, "untitled.png"),
  };
  onCloseCb = opts.onClose || null;

  const host = ensureHost();
  const wrap = host.querySelector("#n3xn-jspaint-frame-wrap");
  wrap.innerHTML = "";

  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-n3xn", "safe");
  iframe.setAttribute("allow", allowAll());
  iframe.removeAttribute("allowfullscreen");
  iframe.removeAttribute("sandbox");
  const bust = "n3xn_t=" + Date.now();
  const q = opts.path
    ? "?n3xn_path=" + encodeURIComponent(opts.path) + "&" + bust
    : "?" + bust;
  iframe.src = JSPAINT_URL + q;
  Object.assign(iframe.style, {
    position: "absolute",
    inset: "0",
    width: "100%",
    height: "100%",
    border: "0",
    background: "#1a1a1a",
  });
  wrap.appendChild(iframe);
  frameEl = iframe;

  await new Promise((res) => {
    iframe.addEventListener("load", () => res(), { once: true });
    setTimeout(res, 8000);
  });

  const win = iframe.contentWindow;
  if (!win) throw new Error("JSPaint iframe blocked");

  try {
    await waitFor(() => !!(win.systemHooks || win.open_from_file || win.$ || win.canvas), 80, 25000);
  } catch (e) {
    console.warn("[n3xn jspaint] hooks wait:", e.message);
  }
  if (!win.systemHooks) win.systemHooks = {};
  wireSystemHooks(win, session);

  let blob = opts.blob || null;
  if (!blob && session.path) {
    try {
      blob = await vfsReadBlob(session.path);
      console.info("[n3xn jspaint] loaded", session.path, blob.size, blob.type);
    } catch (e) {
      console.warn("[n3xn jspaint] initial read failed", e);
    }
  }

  if (blob) {
    try {
      if (typeof win.open_from_file === "function") {
        const file = new File([blob], session.fileName, { type: blob.type || "image/png" });
        await win.open_from_file(file, session.fileName);
      } else if (typeof win.systemHooks?.loadBlob === "function") {
        await win.systemHooks.loadBlob(blob);
      }
    } catch (e) {
      console.warn("[n3xn jspaint] open_from_file failed", e);
    }
  }

  host.style.display = "flex";
  return session;
}

export function closeImageEditor() {
  if (frameEl) {
    try {
      frameEl.src = "about:blank";
    } catch (_) {}
    frameEl = null;
  }
  if (hostEl) {
    try {
      hostEl.remove();
    } catch (_) {}
    hostEl = null;
  }
  const cb = onCloseCb;
  onCloseCb = null;
  try {
    if (typeof cb === "function") cb();
  } catch (_) {}
}

export function isImageEditorOpen() {
  return !!(hostEl && document.body.contains(hostEl));
}

export async function installN3xnFsBridge() {
  const fs = await import("./fs.js");
  window.__n3xnFS = {
    async readBlob(path) {
      return recordToBlob(await fs.readFile(path), path);
    },
    async writeBlob(path, blob) {
      const buf = new Uint8Array(await blob.arrayBuffer());
      await fs.writeFile(path, buf, { mime: blob.type || "application/octet-stream" });
    },
    readFile: (p) => fs.readFile(p),
    writeFile: (p, d, m) => fs.writeFile(p, d, m || {}),
    listDir: (p) => fs.ls(p || "/"),
    ls: (p) => fs.ls(p || "/"),
    async readText(path) {
      const rec = await fs.readFile(path);
      if (rec?.text) return rec.text();
      if (typeof rec?.content === "string") return rec.content;
      if (rec?.content) return new TextDecoder().decode(rec.content);
      return "";
    },
  };
  return window.__n3xnFS;
}

if (typeof window !== "undefined") {
  window.__n3xnJSPaint = { openImageEditor, closeImageEditor, isImageEditorOpen, installN3xnFsBridge };
  window.openImageEditor = openImageEditor;
}
