/**
 * n3xn Explorer — VS Code–style file tree + tabbed editor
 */
import { ensureFsBridge } from "./fs-bridge.js";

const state = {
  tabs: [],
  active: null,
  expanded: { "/": true },
  filter: "",
  selectedPath: null,
  status: "Loading…",
  treePaths: [],
};

let rootEl = null;

function uid() {
  return "t" + Math.random().toString(36).slice(2, 9);
}

function basename(p) {
  const s = String(p || "/").replace(/\/+$/, "");
  const i = s.lastIndexOf("/");
  return i >= 0 ? s.slice(i + 1) || "/" : s;
}

function dirname(p) {
  const s = String(p || "/").replace(/\/+$/, "");
  const i = s.lastIndexOf("/");
  if (i <= 0) return "/";
  return s.slice(0, i) || "/";
}

function joinPath(a, b) {
  if (!a || a === "/") return "/" + String(b).replace(/^\//, "");
  return (a.replace(/\/+$/, "") + "/" + String(b).replace(/^\//, "")).replace(/\/+/g, "/");
}

async function ui() {
  if (!window.__n3xnUI) await import("./ui-modal.js");
  return window.__n3xnUI;
}

function setStatus(msg) {
  state.status = msg;
  const el = rootEl?.querySelector("#exp-status");
  if (el) el.textContent = msg;
}

function badgeFor(name, type) {
  if (type === "dir") return { label: "DIR", color: "#a78bfa" };
  const n = name.toLowerCase();
  if (n.endsWith(".tsx")) return { label: "TSX", color: "#38bdf8" };
  if (n.endsWith(".ts")) return { label: "TS", color: "#60a5fa" };
  if (n.endsWith(".jsx")) return { label: "JSX", color: "#fbbf24" };
  if (n.endsWith(".js") || n.endsWith(".mjs")) return { label: "JS", color: "#facc15" };
  if (n.endsWith(".css")) return { label: "CSS", color: "#c084fc" };
  if (n.endsWith(".html") || n.endsWith(".htm")) return { label: "HTML", color: "#fb923c" };
  if (n.endsWith(".json")) return { label: "{}", color: "#4ade80" };
  if (n.endsWith(".md")) return { label: "MD", color: "#94a3b8" };
  if (n.endsWith(".py")) return { label: "PY", color: "#34d399" };
  if (n.endsWith(".wasm")) return { label: "WASM", color: "#f43f5e" };
  if (/\.(png|jpe?g|gif|webp|svg)$/.test(n)) return { label: "IMG", color: "#f472b6" };
  return { label: "FILE", color: "#94a3b8" };
}

function guessLang(name) {
  const n = name.toLowerCase();
  if (n.endsWith(".js") || n.endsWith(".mjs") || n.endsWith(".cjs")) return "javascript";
  if (n.endsWith(".ts") || n.endsWith(".tsx")) return "typescript";
  if (n.endsWith(".jsx")) return "javascript";
  if (n.endsWith(".json")) return "json";
  if (n.endsWith(".css")) return "css";
  if (n.endsWith(".html") || n.endsWith(".htm")) return "html";
  if (n.endsWith(".md")) return "markdown";
  if (n.endsWith(".py")) return "python";
  if (n.endsWith(".xml") || n.endsWith(".svg")) return "xml";
  return "plaintext";
}

function kindFor(name) {
  const n = name.toLowerCase();
  if (/\.(png|jpe?g|gif|webp|bmp|svg)$/.test(n)) return "image";
  return "code";
}

function buildTree(flat) {
  const root = { name: "", path: "/", type: "dir", children: [] };
  for (const item of flat) {
    const parts = item.path.replace(/^\/+/, "").split("/").filter(Boolean);
    let level = root;
    let cur = "";
    parts.forEach((part, idx) => {
      cur += "/" + part;
      const isLast = idx === parts.length - 1;
      let node = level.children.find((c) => c.name === part);
      if (!node) {
        node = {
          name: part,
          path: cur,
          type: isLast ? item.type : "dir",
          size: isLast ? item.size : 0,
          children: isLast && item.type === "file" ? undefined : [],
        };
        level.children.push(node);
      }
      if (node.children) level = node;
    });
  }
  const sortNodes = (nodes) => {
    nodes.sort((a, b) => {
      if (a.type !== b.type) return a.type === "dir" ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    nodes.forEach((n) => n.children && sortNodes(n.children));
  };
  sortNodes(root.children);
  return root;
}

function filterTree(node, q) {
  if (!q) return node;
  const ql = q.toLowerCase();
  const walk = (n) => {
    if (n.type === "file") return n.name.toLowerCase().includes(ql) ? { ...n } : null;
    const kids = (n.children || []).map(walk).filter(Boolean);
    if (kids.length || n.name.toLowerCase().includes(ql) || n.path === "/") return { ...n, children: kids };
    return null;
  };
  return walk(node) || { ...node, children: [] };
}

async function refreshTree() {
  const fs = window.__n3xnFS;
  if (!fs) {
    state.treePaths = [];
    setStatus("No FS bridge");
    renderTree();
    return;
  }
  try {
    await fs.loadTree?.();
    let flat = fs.flatten ? fs.flatten("/") || [] : [];
    if (!flat.length && fs.listDir) {
      async function walk(p) {
        const rows = await fs.listDir(p);
        for (const r of rows) {
          if (r.name === "..") continue;
          const full = joinPath(p, r.name);
          flat.push({ path: full, name: r.name, type: r.type, size: r.size || 0 });
          if (r.type === "dir") await walk(full);
        }
      }
      await walk("/");
    }
    state.treePaths = flat;
    const nFiles = flat.filter((x) => x.type === "file").length;
    const nDirs = flat.filter((x) => x.type === "dir").length;
    setStatus(nFiles + " files · " + nDirs + " folders");
  } catch (e) {
    console.warn("[explorer] refresh", e);
    setStatus("Tree error: " + (e.message || e));
  }
  renderTree();
}

function renderTree() {
  const host = rootEl?.querySelector("#exp-tree");
  if (!host) return;
  host.innerHTML = "";
  const tree = filterTree(buildTree(state.treePaths), state.filter);
  const renderNodes = (nodes, depth) => {
    nodes.forEach((node) => {
      const pad = 8 + depth * 12;
      if (node.type === "dir") {
        const open = !!state.expanded[node.path];
        const row = document.createElement("div");
        row.className = "tree-row folder-row";
        row.style.paddingLeft = pad + "px";
        row.innerHTML =
          '<span class="chev">' +
          (open ? "▾" : "▸") +
          '</span><span class="badge" style="color:#a78bfa">DIR</span><span class="name"></span>' +
          '<div class="row-acts"><button type="button" data-act="new-file" title="New file">+</button>' +
          '<button type="button" data-act="new-folder" title="New folder">📁</button>' +
          '<button type="button" data-act="delete" title="Delete">×</button></div>';
        row.querySelector(".name").textContent = node.name || "/";
        row.onclick = (e) => {
          if (e.target.closest(".row-acts")) return;
          state.expanded[node.path] = !open;
          state.selectedPath = node.path;
          renderTree();
        };
        row.querySelector('[data-act="new-file"]').onclick = (e) => {
          e.stopPropagation();
          createFile(node.path);
        };
        row.querySelector('[data-act="new-folder"]').onclick = (e) => {
          e.stopPropagation();
          createFolder(node.path);
        };
        row.querySelector('[data-act="delete"]').onclick = (e) => {
          e.stopPropagation();
          deletePath(node.path, true);
        };
        host.appendChild(row);
        if (open && node.children) renderNodes(node.children, depth + 1);
      } else {
        const b = badgeFor(node.name, "file");
        const row = document.createElement("div");
        row.className = "tree-row file-row" + (state.selectedPath === node.path ? " active" : "");
        row.style.paddingLeft = pad + 10 + "px";
        row.innerHTML =
          '<span class="chev"></span><span class="badge" style="color:' +
          b.color +
          '">' +
          b.label +
          '</span><span class="name"></span>' +
          '<div class="row-acts"><button type="button" data-act="rename" title="Rename">✎</button>' +
          '<button type="button" data-act="delete" title="Delete">×</button></div>';
        row.querySelector(".name").textContent = node.name;
        row.onclick = (e) => {
          if (e.target.closest(".row-acts")) return;
          state.selectedPath = node.path;
          openTab(node.path);
        };
        row.querySelector('[data-act="rename"]').onclick = (e) => {
          e.stopPropagation();
          renamePath(node.path);
        };
        row.querySelector('[data-act="delete"]').onclick = (e) => {
          e.stopPropagation();
          deletePath(node.path, false);
        };
        host.appendChild(row);
      }
    });
  };
  if (!tree.children?.length) {
    host.innerHTML =
      "<div class=\"exp-empty\" style=\"padding:16px\"><p>No files yet.</p><p class=\"muted\">Use + to create a file.</p></div>";
    return;
  }
  renderNodes(tree.children, 0);
}

function renderTabs() {
  const bar = rootEl?.querySelector("#exp-tabs");
  if (!bar) return;
  bar.innerHTML = "";
  state.tabs.forEach((tab) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "exp-tab" + (tab.id === state.active ? " active" : "");
    btn.innerHTML =
      (tab.dirty ? '<span class="dirty">●</span>' : "") +
      '<span class="label"></span><span class="x" title="Close">×</span>';
    btn.querySelector(".label").textContent = tab.name;
    btn.onclick = (e) => {
      if (e.target.classList.contains("x")) {
        closeTab(tab.id);
        return;
      }
      state.active = tab.id;
      state.selectedPath = tab.path;
      renderTabs();
      renderStage();
      renderTree();
    };
    bar.appendChild(btn);
  });
}

async function readText(path) {
  const fs = window.__n3xnFS;
  if (!fs?.readText) throw new Error("No FS");
  return fs.readText(path);
}

export async function openTab(path) {
  const existing = state.tabs.find((t) => t.path === path);
  if (existing) {
    state.active = existing.id;
    state.selectedPath = path;
    renderTabs();
    renderStage();
    renderTree();
    return;
  }
  const name = basename(path);
  const kind = kindFor(name);
  const tab = { id: uid(), path, name, kind, engine: "auto", dirty: false, text: "" };
  try {
    tab.text = kind === "image" ? "" : await readText(path);
  } catch (e) {
    tab.text = "// failed to read\n// " + e;
  }
  state.tabs.push(tab);
  state.active = tab.id;
  state.selectedPath = path;
  renderTabs();
  renderStage();
  renderTree();
}

function closeTab(id) {
  const idx = state.tabs.findIndex((t) => t.id === id);
  if (idx < 0) return;
  const tab = state.tabs[idx];
  if (tab._monaco) try { tab._monaco.dispose(); } catch (_) {}
  state.tabs.splice(idx, 1);
  if (state.active === id) state.active = state.tabs[idx]?.id || state.tabs[idx - 1]?.id || null;
  renderTabs();
  renderStage();
}

function getActive() {
  return state.tabs.find((t) => t.id === state.active) || null;
}

function markDirty(tab) {
  if (!tab.dirty) {
    tab.dirty = true;
    renderTabs();
  }
}

async function renderStage() {
  const stage = rootEl?.querySelector("#exp-stage");
  if (!stage) return;
  stage.innerHTML = "";
  const tab = getActive();
  if (!tab) {
    stage.innerHTML =
      '<div class="exp-empty"><h2>No file open</h2><p>Select a file in the tree, or create one with +.</p></div>';
    return;
  }
  if (tab.kind === "image") {
    const wrap = document.createElement("div");
    wrap.className = "exp-img-wrap";
    const img = document.createElement("img");
    img.alt = tab.name;
    try {
      const rec = await window.__n3xnFS.readFile(tab.path);
      const content = rec?.content ?? rec;
      const blob =
        content instanceof Blob
          ? content
          : new Blob([content instanceof Uint8Array || content instanceof ArrayBuffer ? content : content]);
      img.src = URL.createObjectURL(blob);
    } catch (e) {
      wrap.textContent = "Image load failed: " + e;
    }
    wrap.appendChild(img);
    stage.appendChild(wrap);
    return;
  }
  if (window.monaco?.editor && (tab.engine === "auto" || tab.engine === "monaco")) {
    const host = document.createElement("div");
    host.className = "exp-monaco-host";
    stage.appendChild(host);
    if (tab._monaco) try { tab._monaco.dispose(); } catch (_) {}
    tab._monaco = window.monaco.editor.create(host, {
      value: tab.text,
      language: guessLang(tab.name),
      automaticLayout: true,
      theme: "vs-dark",
      fontFamily: "'JetBrains Mono', monospace",
      fontSize: 13,
      minimap: { enabled: true },
      wordWrap: "on",
    });
    tab._monaco.onDidChangeModelContent(() => {
      tab.text = tab._monaco.getValue();
      markDirty(tab);
    });
    return;
  }
  const ta = document.createElement("textarea");
  ta.className = "exp-fallback";
  ta.value = tab.text;
  ta.spellcheck = false;
  ta.addEventListener("input", () => {
    tab.text = ta.value;
    markDirty(tab);
  });
  stage.appendChild(ta);
  tab._ta = ta;
}

async function saveActive() {
  const tab = getActive();
  if (!tab || tab.kind === "image") return;
  let value = tab.text;
  if (tab._monaco) value = tab._monaco.getValue();
  else if (tab._ta) value = tab._ta.value;
  try {
    await window.__n3xnFS.writeText(tab.path, value);
    tab.text = value;
    tab.dirty = false;
    renderTabs();
    setStatus("Saved " + tab.path);
  } catch (e) {
    const u = await ui();
    await u.alert("Save failed: " + e, "Save");
  }
}

async function createFile(parentPath) {
  const u = await ui();
  const name = await u.prompt("New file name", "untitled.txt", "New file");
  if (!name || !name.trim()) return;
  const path = joinPath(parentPath || "/", name.trim());
  try {
    await window.__n3xnFS.writeText(path, "");
    state.expanded[parentPath || "/"] = true;
    await refreshTree();
    await openTab(path);
  } catch (e) {
    await u.alert(String(e), "Create file");
  }
}

async function createFolder(parentPath) {
  const u = await ui();
  const name = await u.prompt("New folder name", "folder", "New folder");
  if (!name || !name.trim()) return;
  const path = joinPath(parentPath || "/", name.trim());
  try {
    await window.__n3xnFS.mkdir(path);
    state.expanded[parentPath || "/"] = true;
    state.expanded[path] = true;
    await refreshTree();
  } catch (e) {
    await u.alert(String(e), "Create folder");
  }
}

async function deletePath(path, isDir) {
  const u = await ui();
  const ok = await u.confirm("Delete " + path + "?", "Delete");
  if (!ok) return;
  try {
    try {
      await window.__n3xnFS.remove(path);
    } catch (_) {
      if (isDir && window.__n3xnFS.removeRecursive) await window.__n3xnFS.removeRecursive(path);
      else throw _;
    }
    state.tabs
      .filter((t) => t.path === path || t.path.startsWith(path + "/"))
      .forEach((t) => closeTab(t.id));
    await refreshTree();
    setStatus("Deleted " + path);
  } catch (e) {
    await u.alert(String(e), "Delete");
  }
}

async function renamePath(path) {
  const u = await ui();
  const name = await u.prompt("New name", basename(path), "Rename");
  if (!name || !name.trim() || name.trim() === basename(path)) return;
  const dest = joinPath(dirname(path), name.trim());
  try {
    const text = await readText(path);
    await window.__n3xnFS.writeText(dest, text);
    await window.__n3xnFS.remove(path);
    const tab = state.tabs.find((t) => t.path === path);
    if (tab) {
      tab.path = dest;
      tab.name = basename(dest);
      tab.dirty = false;
    }
    await refreshTree();
    renderTabs();
    setStatus("Renamed → " + dest);
  } catch (e) {
    await u.alert(String(e), "Rename");
  }
}

function renderChrome(root) {
  root.innerHTML =
    '<div class="exp-app" data-n3xn="safe">' +
    '<aside class="exp-sidebar">' +
    '<div class="exp-side-head"><span>Explorer</span><span class="n3xn-version" style="font-weight:500;letter-spacing:0"></span>' +
    '<div class="actions">' +
    '<button type="button" class="exp-icon-btn" data-act="new-file-root" title="New file">+</button>' +
    '<button type="button" class="exp-icon-btn" data-act="new-folder-root" title="New folder">📁</button>' +
    '<button type="button" class="exp-icon-btn" data-act="refresh" title="Refresh">↻</button>' +
    "</div></div>" +
    '<input class="exp-filter" id="exp-filter" placeholder="Filter files…" spellcheck="false" />' +
    '<div class="exp-tree" id="exp-tree"></div>' +
    '<div class="exp-status" id="exp-status">…</div></aside>' +
    '<main class="exp-main">' +
    '<div class="exp-toolbar">' +
    '<button type="button" class="btn primary" data-act="save">Save</button>' +
    '<button type="button" class="btn" data-act="reload">Reload file</button>' +
    '<span class="spacer"></span></div>' +
    '<div class="exp-tabs" id="exp-tabs"></div>' +
    '<div class="exp-stage" id="exp-stage"></div></main></div>';
}

function bindChrome() {
  rootEl.querySelector('[data-act="save"]')?.addEventListener("click", saveActive);
  rootEl.querySelector('[data-act="reload"]')?.addEventListener("click", async () => {
    const tab = getActive();
    if (!tab) return;
    try {
      tab.text = await readText(tab.path);
      tab.dirty = false;
      if (tab._monaco) tab._monaco.setValue(tab.text);
      else if (tab._ta) tab._ta.value = tab.text;
      else renderStage();
      renderTabs();
      setStatus("Reloaded " + tab.path);
    } catch (e) {
      const u = await ui();
      await u.alert(String(e), "Reload");
    }
  });
  rootEl.querySelector('[data-act="new-file-root"]')?.addEventListener("click", () => createFile("/"));
  rootEl.querySelector('[data-act="new-folder-root"]')?.addEventListener("click", () => createFolder("/"));
  rootEl.querySelector('[data-act="refresh"]')?.addEventListener("click", () => refreshTree());
  rootEl.querySelector("#exp-filter")?.addEventListener("input", (e) => {
    state.filter = e.target.value || "";
    renderTree();
  });
  window.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === "s") {
      e.preventDefault();
      saveActive();
    }
  });
}

export async function mountExplorer(root) {
  if (!root) return;
  rootEl = root;
  renderChrome(root);
  bindChrome();
  try {
    const { applyVersionToDom } = await import("./version.js");
    applyVersionToDom();
  } catch (_) {}
  setStatus("Connecting to VFS…");
  try {
    await ensureFsBridge();
    await refreshTree();
  } catch (e) {
    console.error("[explorer] mount", e);
    setStatus("FS bridge failed: " + (e.message || e));
    const stage = root.querySelector("#exp-stage");
    if (stage) {
      stage.innerHTML =
        '<div class="exp-empty"><h2>Filesystem unavailable</h2><p>' +
        String(e.message || e) +
        "</p><p>Sign in on the main VFS, then reopen Explorer.</p></div>";
    }
  }
  renderTabs();
  renderStage();
}

if (typeof window !== "undefined") {
  window.__n3xnExplorer = { mountExplorer, openTab, state, refreshTree };
}
