import { DEFAULT_FILES, loadFiles, saveFiles } from "./vfs.js";
import { initMonaco, getOrCreateModel, disposeModel } from "./monaco.js";
import { initCompiler, bundleProject } from "./compiler.js";

const BASE_URL = new URL("../", import.meta.url).href;
const MONACO_MIN = BASE_URL + "__monaco__/npm/monaco-editor@0.52.0/min";
const JSDELIVR_PROXY = BASE_URL + "__cdn__/jsdelivr/";
const ESM_PROXY = BASE_URL + "__cdn__/esm/";
const ANY_PROXY = BASE_URL + "__cdn__/any/";

const statusBadge = document.getElementById("status-badge");
const consoleOut = document.getElementById("console-out");
const previewFrame = document.getElementById("preview");
const fileListEl = document.getElementById("file-list");

function log(msg, cls = "") {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = `[${new Date().toLocaleTimeString()}] ${msg}`;
  consoleOut.appendChild(line);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

// 1. Ensure scoped SW controls ./dreamland/ before loading local proxy assets
if ("serviceWorker" in navigator) {
  await navigator.serviceWorker.register(BASE_URL + "sw.js", { scope: BASE_URL });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    statusBadge.textContent = "Activating SW…";
    if (!sessionStorage.getItem("dl_sw_booted_v7")) {
      sessionStorage.setItem("dl_sw_booted_v7", "1");
      location.reload();
      await new Promise(() => {});
    }
  }
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "WARM_DREAMLAND_OK") {
      log("Offline cache warmed (Monaco + TS Worker + esbuild + Dreamland plugins)", "log-ok");
      statusBadge.textContent = "Offline Ready";
    }
  });
}

let files = loadFiles();
let activeFile = files["/src/main.tsx"] ? "/src/main.tsx" : Object.keys(files)[0];
let editor = null;
let lastBuiltHtml = "";
let debounceTimer = null;

function renderSidebar() {
  fileListEl.innerHTML = "";
  for (const path of Object.keys(files).sort()) {
    const row = document.createElement("div");
    row.className = "file-item" + (path === activeFile ? " active" : "");
    const label = document.createElement("span");
    label.textContent = path;
    row.appendChild(label);

    if (path !== "/src/main.tsx") {
      const del = document.createElement("span");
      del.className = "file-del";
      del.textContent = "×";
      del.onclick = (e) => {
        e.stopPropagation();
        delete files[path];
        disposeModel(path);
        saveFiles(files);
        if (activeFile === path) switchFile("/src/main.tsx");
        else renderSidebar();
        buildAndRun();
      };
      row.appendChild(del);
    }
    row.onclick = () => switchFile(path);
    fileListEl.appendChild(row);
  }
}

function switchFile(path) {
  activeFile = path;
  editor.setModel(getOrCreateModel(path, files[path]));
  renderSidebar();
}

async function buildAndRun() {
  const t0 = performance.now();
  consoleOut.innerHTML = "";
  try {
    lastBuiltHtml = await bundleProject({
      files,
      proxies: {
        esmProxy: ESM_PROXY,
        jsdelivrProxy: JSDELIVR_PROXY,
        anyProxy: ANY_PROXY,
      },
    });
    previewFrame.srcdoc = lastBuiltHtml;
    const ms = Math.round(performance.now() - t0);
    statusBadge.textContent = (navigator.onLine ? "Offline-First SW" : "Offline") + " · " + ms + "ms";
    log(`Bundled offline-ready in ${ms}ms`, "log-ok");
  } catch (err) {
    statusBadge.textContent = "Build Error";
    (err?.errors ? err.errors.map((e) => e.text) : [String(err)]).forEach((m) => log(m, "log-err"));
  }
}

// Boot Compiler + Monaco in parallel
await initCompiler(JSDELIVR_PROXY);
editor = await initMonaco({
  monacoMin: MONACO_MIN,
  jsdelivrProxy: JSDELIVR_PROXY,
  container: document.getElementById("monaco-root"),
  files,
  initialFile: activeFile,
  onChange: (value) => {
    files[activeFile] = value;
    saveFiles(files);
    if (document.getElementById("autorun-chk").checked) {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(buildAndRun, 350);
    }
  },
  onRun: buildAndRun,
});

window.addEventListener("message", (e) => {
  if (e.data?.type === "err") log(e.data.msg, "log-err");
  if (e.data?.type === "log") log(e.data.msg);
});

document.getElementById("run-btn").onclick = buildAndRun;
document.getElementById("warm-btn").onclick = async () => {
  statusBadge.textContent = "Warming SW…";
  const reg = await navigator.serviceWorker?.ready;
  reg?.active?.postMessage({ type: "WARM_DREAMLAND" });
  log("Sent WARM_DREAMLAND to offline SW", "log-ok");
};
document.getElementById("new-file-btn").onclick = () => {
  const name = prompt("New file path:", "/src/Component.tsx");
  if (!name) return;
  const clean = name.startsWith("/") ? name : "/" + name;
  if (!files[clean]) {
    files[clean] = `import { type Component } from "dreamland/core";\nexport const NewComp: Component = function () { return <div>${clean}</div>; };\n`;
    saveFiles(files);
  }
  switchFile(clean);
};
document.getElementById("reset-btn").onclick = () => {
  files = structuredClone(DEFAULT_FILES);
  saveFiles(files);
  Object.entries(files).forEach(([p, c]) => getOrCreateModel(p, c));
  switchFile("/src/main.tsx");
  buildAndRun();
};
document.getElementById("export-btn").onclick = () => {
  if (!lastBuiltHtml) return;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([lastBuiltHtml], { type: "text/html" }));
  a.download = "dreamland-app.html";
  a.click();
};

renderSidebar();
statusBadge.textContent = "Ready";
buildAndRun();
