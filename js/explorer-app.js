/**
 * n3xn VFS v3.0.1-beta — /explorer full-page Files-style browser
 * Tabbed previews · Monaco + CodeMirror coexistence · folder navigation
 *
 * Expects optional window.__n3xnFS with: listDir(path), readText(path), writeText(path, text)
 * Falls back to demo listing when FS API not injected yet.
 */

const state = {
  cwd: "/",
  tabs: [], // { id, path, name, kind: 'code'|'image'|'text'|'unknown', engine: 'monaco'|'codemirror' }
  active: null,
};

function uid() {
  return "t" + Math.random().toString(36).slice(2, 9);
}

function basename(p) {
  const s = String(p || "/").replace(/\/+$/, "");
  const i = s.lastIndexOf("/");
  return i >= 0 ? s.slice(i + 1) || "/" : s;
}

function joinPath(a, b) {
  if (b === "..") {
    const parts = a.split("/").filter(Boolean);
    parts.pop();
    return "/" + parts.join("/");
  }
  if (!a || a === "/") return "/" + b.replace(/^\//, "");
  return (a.replace(/\/+$/, "") + "/" + b.replace(/^\//, "")).replace(/\/+/g, "/");
}

async function listDir(path) {
  try {
    if (window.__n3xnFS?.listDir) return await window.__n3xnFS.listDir(path);
    if (window.fs?.listDir) return await window.fs.listDir(path);
    if (window.fs?.ls) return await window.fs.ls(path);
  } catch (e) {
    console.warn("[explorer] listDir", e);
  }
  return [
    { name: "..", type: "dir" },
    { name: "(open n3xn session for live FS)", type: "file" },
  ];
}

async function readText(path) {
  try {
    if (window.__n3xnFS?.readText) return await window.__n3xnFS.readText(path);
    if (window.fs?.readFile) {
      const v = await window.fs.readFile(path);
      return typeof v === "string" ? v : new TextDecoder().decode(v);
    }
  } catch (e) {
    return "// failed to read " + path + "\n// " + e;
  }
  return "// no FS bridge";
}

function kindFor(name) {
  const n = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return "image";
  if (/\.(js|mjs|cjs|ts|tsx|jsx|json|css|html?|md|py|rs|go|java|c|cpp|h|txt|sh|yml|yaml|toml|xml|svg)$/.test(n))
    return "code";
  return "text";
}

function renderChrome(root) {
  root.innerHTML = `
    <div class="exp-app">
      <aside class="exp-sidebar">
        <div class="exp-side-head">
          <strong>Explorer</strong>
          <span class="n3xn-version muted"></span>
        </div>
        <div class="exp-path" id="exp-path"></div>
        <div class="exp-list" id="exp-list"></div>
      </aside>
      <main class="exp-main">
        <div class="exp-tabs" id="exp-tabs"></div>
        <div class="exp-toolbar">
          <button type="button" data-act="engine-monaco" class="btn">Monaco</button>
          <button type="button" data-act="engine-cm" class="btn">CodeMirror</button>
          <button type="button" data-act="save" class="btn primary">Save</button>
          <a class="btn" href="/">VFS</a>
          <a class="btn" href="/settings/">Settings</a>
        </div>
        <div class="exp-stage" id="exp-stage"></div>
      </main>
    </div>`;
}

async function refreshList() {
  const list = document.getElementById("exp-list");
  const pathEl = document.getElementById("exp-path");
  if (!list) return;
  pathEl.textContent = state.cwd;
  list.innerHTML = "";
  let entries = await listDir(state.cwd);
  if (!Array.isArray(entries)) entries = [];
  // normalize
  entries = entries.map((e) =>
    typeof e === "string"
      ? { name: e, type: e.endsWith("/") ? "dir" : "file" }
      : {
          name: e.name || e.path || String(e),
          type: e.type || e.kind || (e.isDirectory ? "dir" : "file"),
        }
  );
  if (state.cwd !== "/" && !entries.some((e) => e.name === "..")) {
    entries.unshift({ name: "..", type: "dir" });
  }
  entries.forEach((e) => {
    const row = document.createElement("button");
    row.type = "button";
    row.className = "exp-row " + (e.type === "dir" ? "is-dir" : "is-file");
    row.textContent = (e.type === "dir" ? "📁 " : "📄 ") + e.name;
    row.onclick = () => onEntry(e);
    list.appendChild(row);
  });
}

async function onEntry(e) {
  if (e.type === "dir" || e.name === "..") {
    state.cwd = joinPath(state.cwd, e.name);
    await refreshList();
    return;
  }
  const path = joinPath(state.cwd, e.name);
  openTab(path);
}

function openTab(path) {
  let tab = state.tabs.find((t) => t.path === path);
  if (!tab) {
    tab = {
      id: uid(),
      path,
      name: basename(path),
      kind: kindFor(path),
      engine: "monaco",
    };
    state.tabs.push(tab);
  }
  state.active = tab.id;
  renderTabs();
  renderStage();
}

function renderTabs() {
  const el = document.getElementById("exp-tabs");
  if (!el) return;
  el.innerHTML = "";
  state.tabs.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "exp-tab" + (t.id === state.active ? " active" : "");
    b.textContent = t.name;
    b.onclick = () => {
      state.active = t.id;
      renderTabs();
      renderStage();
    };
    const x = document.createElement("span");
    x.textContent = " ×";
    x.onclick = (ev) => {
      ev.stopPropagation();
      state.tabs = state.tabs.filter((z) => z.id !== t.id);
      if (state.active === t.id) state.active = state.tabs[0]?.id || null;
      renderTabs();
      renderStage();
    };
    b.appendChild(x);
    el.appendChild(b);
  });
}

async function renderStage() {
  const stage = document.getElementById("exp-stage");
  if (!stage) return;
  const tab = state.tabs.find((t) => t.id === state.active);
  stage.innerHTML = "";
  if (!tab) {
    stage.innerHTML = '<p class="muted exp-empty">Open a file from the sidebar</p>';
    return;
  }
  if (tab.kind === "image") {
    const img = document.createElement("img");
    img.alt = tab.name;
    img.style.maxWidth = "100%";
    img.style.maxHeight = "100%";
    // bridge may later set blob URL
    img.src = tab.path;
    stage.appendChild(img);
    return;
  }
  const text = await readText(tab.path);
  if (tab.engine === "codemirror" && window.__n3xnCodeMirror?.mountCodeMirror) {
    const host = document.createElement("div");
    host.className = "exp-cm-host";
    stage.appendChild(host);
    try {
      tab._cm = await window.__n3xnCodeMirror.mountCodeMirror(host, { doc: text });
    } catch (e) {
      host.textContent = "CodeMirror failed: " + e;
    }
    return;
  }
  // Monaco if present
  if (window.monaco?.editor) {
    const host = document.createElement("div");
    host.className = "exp-monaco-host";
    stage.appendChild(host);
    tab._monaco = window.monaco.editor.create(host, {
      value: text,
      language: guessLang(tab.name),
      automaticLayout: true,
      theme: "vs-dark",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      minimap: { enabled: true },
    });
    return;
  }
  // textarea fallback
  const ta = document.createElement("textarea");
  ta.className = "exp-fallback";
  ta.value = text;
  stage.appendChild(ta);
  tab._ta = ta;
}

function guessLang(name) {
  const n = name.toLowerCase();
  if (n.endsWith(".js") || n.endsWith(".mjs")) return "javascript";
  if (n.endsWith(".ts")) return "typescript";
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".css")) return "css";
  if (n.endsWith(".html") || n.endsWith(".htm")) return "html";
  if (n.endsWith(".md")) return "markdown";
  if (n.endsWith(".py")) return "python";
  return "plaintext";
}

async function saveActive() {
  const tab = state.tabs.find((t) => t.id === state.active);
  if (!tab) return;
  let value = "";
  if (tab._monaco) value = tab._monaco.getValue();
  else if (tab._cm) value = tab._cm.getValue();
  else if (tab._ta) value = tab._ta.value;
  try {
    if (window.__n3xnFS?.writeText) await window.__n3xnFS.writeText(tab.path, value);
    else if (window.fs?.writeFile) await window.fs.writeFile(tab.path, value);
    else alert("No FS write bridge yet — open from main VFS session.");
  } catch (e) {
    alert("Save failed: " + e);
  }
}

export async function mountExplorer(root) {
  if (!root) return;
  renderChrome(root);
  try {
    const { applyVersionToDom } = await import("./version.js");
    applyVersionToDom();
  } catch (_) {}
  root.querySelector('[data-act="save"]')?.addEventListener("click", saveActive);
  root.querySelector('[data-act="engine-monaco"]')?.addEventListener("click", () => {
    const tab = state.tabs.find((t) => t.id === state.active);
    if (tab) {
      tab.engine = "monaco";
      renderStage();
    }
  });
  root.querySelector('[data-act="engine-cm"]')?.addEventListener("click", () => {
    const tab = state.tabs.find((t) => t.id === state.active);
    if (tab) {
      tab.engine = "codemirror";
      renderStage();
    }
  });
  await refreshList();
}

if (typeof window !== "undefined") {
  window.__n3xnExplorer = { mountExplorer, openTab, state };
}
