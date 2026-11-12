/**
 * n3xn VFS v3.0.2-beta — JSPaint / XK Paint bridge
 *
 * Uses the real app at /jspaint/ (exact tree you uploaded).
 * Embeds it in a full-allow iframe and wires jspaint systemHooks to n3xn VFS.
 *
 * Public API:
 *   openImageEditor({ path?, blob?, fileName?, onClose? })
 *   closeImageEditor()
 *   isImageEditorOpen()
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
  return HANDLE_PREFIX + path;
}

async function vfsReadBlob(path) {
  if (window.__n3xnFS?.readBlob) return window.__n3xnFS.readBlob(path);
  if (window.__n3xnFS?.readFile) {
    const data = await window.__n3xnFS.readFile(path);
    if (data instanceof Blob) return data;
    if (data instanceof ArrayBuffer) return new Blob([data]);
    if (data instanceof Uint8Array) return new Blob([data]);
    if (typeof data === "string") return new Blob([data]);
  }
  try {
    const fs = await import("./fs.js");
    if (fs.readFile) {
      const data = await fs.readFile(path);
      if (data instanceof Blob) return data;
      if (data instanceof ArrayBuffer || data instanceof Uint8Array) return new Blob([data]);
      if (typeof data === "string") return new Blob([data], { type: "text/plain" });
    }
  } catch (_) {}
  throw new Error("VFS read not available for " + path);
}

async function vfsWriteBlob(path, blob) {
  if (window.__n3xnFS?.writeBlob) {
    await window.__n3xnFS.writeBlob(path, blob);
    return true;
  }
  if (window.__n3xnFS?.writeFile) {
    const buf = await blob.arrayBuffer();
    await window.__n3xnFS.writeFile(path, new Uint8Array(buf));
    return true;
  }
  try {
    const fs = await import("./fs.js");
    if (fs.writeFile) {
      const buf = await blob.arrayBuffer();
      await fs.writeFile(path, new Uint8Array(buf));
      return true;
    }
  } catch (_) {}
  try {
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = path.split("/").pop() || "image.png";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  } catch (_) {}
  return false;
}

function guessName(path, fallback) {
  if (path) {
    const n = path.split("/").filter(Boolean).pop();
    if (n) return n;
  }
  return fallback || "untitled.png";
}

function waitFor(pred, interval = 100, timeout = 20000) {
  return new Promise((resolve, reject) => {
    const t0 = Date.now();
    const id = setInterval(() => {
      try {
        if (pred()) {
          clearInterval(id);
          resolve(true);
          return;
        }
      } catch (_) {}
      if (Date.now() - t0 > timeout) {
        clearInterval(id);
        reject(new Error("timeout waiting for JSPaint"));
      }
    }, interval);
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
    zIndex: "99990",
    background: "#0a0a0f",
    display: "flex",
    flexDirection: "column",
  });
  hostEl.innerHTML = `
    <div data-n3xn="safe" style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#050508;border-bottom:1px solid #22223a;color:#e8e8f0;font:13px system-ui">
      <strong style="letter-spacing:.02em">n3xn × JSPaint</strong>
      <span style="opacity:.65;font-size:12px">/jspaint/ · VFS-linked · ${window.__N3XN_VERSION_LABEL || "v3"}</span>
      <span style="flex:1"></span>
      <a href="/jspaint/" target="_blank" rel="noopener" style="color:#a0b0ff;text-decoration:none">Open /jspaint/ ↗</a>
      <button type="button" id="n3xn-jspaint-close" style="background:linear-gradient(135deg,#7c8cff,#b07cff);color:#0a0a12;border:0;border-radius:8px;padding:6px 12px;font-weight:600;cursor:pointer">Close</button>
    </div>
    <div id="n3xn-jspaint-frame-wrap" style="flex:1;min-height:0;position:relative"></div>
  `;
  document.body.appendChild(hostEl);
  hostEl.querySelector("#n3xn-jspaint-close").onclick = () => closeImageEditor();
  return hostEl;
}

function wireSystemHooks(win, session) {
  if (!win.systemHooks) win.systemHooks = {};
  const hooks = win.systemHooks;

  hooks.readBlobFromHandle = async (fileHandle) => {
    const path = pathFromHandle(fileHandle);
    if (!path) throw new Error("No file handle");
    const blob = await vfsReadBlob(path);
    try {
      return new File([blob], guessName(path), { type: blob.type || "image/png" });
    } catch {
      return blob;
    }
  };

  hooks.writeBlobToHandle = async (fileHandle, blob) => {
    const path = pathFromHandle(fileHandle) || session.path;
    if (!path) return false;
    const ok = await vfsWriteBlob(path, blob);
    if (ok) session.path = path;
    return !!ok;
  };

  hooks.showOpenFileDialog = async ({ formats }) => {
    if (typeof window.__n3xnPickFile === "function") {
      const picked = await window.__n3xnPickFile({ formats, accept: "image/*" });
      if (!picked) return;
      const path = picked.path || picked;
      const blob = picked.blob || (await vfsReadBlob(path));
      session.path = path;
      session.fileName = guessName(path);
      return { file: blob, fileHandle: toHandle(path) };
    }
    return new Promise((resolve) => {
      const input = document.createElement("input");
      input.type = "file";
      input.accept = "image/*,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg";
      input.onchange = async () => {
        const f = input.files && input.files[0];
        if (!f) {
          resolve(undefined);
          return;
        }
        const path = `/images/${f.name}`;
        try {
          await vfsWriteBlob(path, f);
        } catch (_) {}
        session.path = path;
        session.fileName = f.name;
        resolve({ file: f, fileHandle: toHandle(path) });
      };
      input.click();
    });
  };

  hooks.showSaveFileDialog = async ({
    formats,
    defaultFileName,
    defaultFileFormatID,
    getBlob,
    savedCallbackUnreliable,
    dialogTitle,
  }) => {
    const name = defaultFileName || session.fileName || "untitled.png";
    let path = session.path || `/images/${name}`;
    if (typeof window.__n3xnPickSavePath === "function") {
      const picked = await window.__n3xnPickSavePath({
        defaultFileName: name,
        defaultPath: path,
        dialogTitle,
        formats,
      });
      if (!picked) return;
      path = picked.path || picked;
    } else {
      const entered = window.prompt(dialogTitle || "Save as VFS path", path);
      if (!entered) return;
      path = entered.startsWith("/") ? entered : `/${entered}`;
    }
    const formatId = defaultFileFormatID || "image/png";
    const blob = await getBlob(formatId);
    await vfsWriteBlob(path, blob);
    session.path = path;
    session.fileName = guessName(path, name);
    if (typeof savedCallbackUnreliable === "function") {
      try {
        savedCallbackUnreliable({
          newFileName: session.fileName,
          newFileFormatID: formatId,
          newFileHandle: toHandle(path),
          newBlob: blob,
        });
      } catch (_) {}
    }
  };
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
  iframe.src = JSPAINT_URL + (opts.path ? `?n3xn_path=${encodeURIComponent(opts.path)}` : "");
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
  });

  const win = iframe.contentWindow;
  if (!win) throw new Error("JSPaint iframe blocked");

  await waitFor(() => !!(win.systemHooks || win.open_from_file), 100, 25000);
  if (!win.systemHooks) win.systemHooks = {};
  wireSystemHooks(win, session);

  let blob = opts.blob || null;
  if (!blob && session.path) {
    try {
      blob = await vfsReadBlob(session.path);
    } catch (e) {
      console.warn("[n3xn jspaint] initial read failed", e);
    }
  }
  if (blob) {
    const handle = session.path ? toHandle(session.path) : toHandle(`/images/${session.fileName}`);
    try {
      if (typeof win.open_from_file === "function") {
        win.open_from_file(blob, handle);
      }
    } catch (e) {
      console.warn("[n3xn jspaint] open_from_file failed", e);
    }
  }

  return { iframe, session };
}

export function closeImageEditor() {
  if (hostEl) {
    try {
      hostEl.remove();
    } catch (_) {}
  }
  hostEl = null;
  frameEl = null;
  const cb = onCloseCb;
  onCloseCb = null;
  try {
    if (typeof cb === "function") cb();
  } catch (_) {}
}

export function isImageEditorOpen() {
  return !!(hostEl && document.body.contains(hostEl));
}

export function openJspaintStandalone(path) {
  const url = path
    ? `/jspaint/index.html?n3xn_path=${encodeURIComponent(path)}`
    : "/jspaint/";
  window.open(url, "_blank", "noopener");
}

if (typeof window !== "undefined") {
  window.__n3xnJSPaint = {
    openImageEditor,
    closeImageEditor,
    isImageEditorOpen,
    openJspaintStandalone,
    JSPAINT_URL,
  };
  window.openImageStudio = (p) =>
    openImageEditor(typeof p === "string" ? { path: p } : p || {});
  window.openImageEditor = openImageEditor;
}
