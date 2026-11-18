import { fetchTemplateManifest, fetchTemplateFiles, loadInitialFiles, saveFiles } from "./vfs.js";
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
const templateSelect = document.getElementById("template-select");

function log(msg, level = "log", stack = "") {
  const entry = document.createElement("div");
  entry.className = "log-entry log-" + level;

  const header = document.createElement("div");
  header.className = "log-line";
  const badge = level === "err" ? "✖" : level === "warn" ? "⚠" : level === "ok" ? "✔" : "›";
  header.textContent = `[${new Date().toLocaleTimeString()}] ${badge} ${msg}`;
  entry.appendChild(header);

  if (stack) {
    const pre = document.createElement("pre");
    pre.className = "log-stack";
    pre.textContent = stack;
    entry.appendChild(pre);
  }

  consoleOut.appendChild(entry);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

window.addEventListener("error", (e) => {
  log(`Studio Error: ${e.message}`, "err", e.error?.stack || "");
});
window.addEventListener("unhandledrejection", (e) => {
  log(`Studio Rejection: ${e.reason}`, "err", e.reason?.stack || "");
});

if ("serviceWorker" in navigator) {
  await navigator.serviceWorker.register(BASE_URL + "sw.js", { scope: BASE_URL });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    statusBadge.textContent = "Activating SW…";
    if (!sessionStorage.getItem("dl_sw_booted_v20")) {
      sessionStorage.setItem("dl_sw_booted_v20", "1");
      location.reload();
      await new Promise(() => {});
    }
  }
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "WARM_DREAMLAND_OK") {
      log("Offline cache warmed (Templates + Monaco + TS Worker + esbuild + Dreamland 0.1.3)", "ok");
      statusBadge.textContent = "Offline Ready";
    }
  });
}

const templates = await fetchTemplateManifest(BASE_URL);
let files = await loadInitialFiles(BASE_URL, templates);
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

async function applyTemplate(tpl) {
  if (!tpl) return;
  try {
    const nextFiles = await fetchTemplateFiles(BASE_URL, tpl);
    for (const oldPath of Object.keys(files)) disposeModel(oldPath);
    files = nextFiles;
    saveFiles(files);
    Object.entries(files).forEach(([p, c]) => getOrCreateModel(p, c));
    switchFile(files["/src/main.tsx"] ? "/src/main.tsx" : Object.keys(files)[0]);
    await buildAndRun();
    log(`${tpl.name} — ${tpl.description || ""}`, "ok");
  } catch (e) {
    log(String(e.message || e), "err");
  }
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
      onWarn: (w) => log(w, "warn"),
    });
    previewFrame.srcdoc = lastBuiltHtml;
    const ms = Math.round(performance.now() - t0);
    statusBadge.textContent = (navigator.onLine ? "Offline-First SW" : "Offline") + " · " + ms + "ms";
    log(`Bundled offline-ready in ${ms}ms`, "ok");
  } catch (err) {
    statusBadge.textContent = "Build Error";
    if (err?.errors) {
      err.errors.forEach((e) => {
        const loc = e.location ? ` (${e.location.file}:${e.location.line}:${e.location.column})` : "";
        log(e.text + loc, "err");
      });
    } else {
      log(String(err), "err", err?.stack || "");
    }
  }
}

for (const tpl of templates) {
  const opt = document.createElement("option");
  opt.value = tpl.id;
  opt.textContent = `[${tpl.category}] ${tpl.name}`;
  opt.title = tpl.description || "";
  templateSelect.appendChild(opt);
}
templateSelect.onchange = () => {
  const tpl = templates.find((t) => t.id === templateSelect.value);
  applyTemplate(tpl);
};

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
  if (e.data?.type === "dl-console") {
    log(e.data.msg, e.data.level, e.data.stack);
  }
});

document.getElementById("run-btn").onclick = buildAndRun;
document.getElementById("warm-btn").onclick = async () => {
  statusBadge.textContent = "Warming SW…";
  const reg = await navigator.serviceWorker?.ready;
  reg?.active?.postMessage({ type: "WARM_DREAMLAND" });
  log("Sent WARM_DREAMLAND to offline SW", "ok");
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
  const currentTpl = templates.find((t) => t.id === templateSelect.value) || templates[0];
  applyTemplate(currentTpl);
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
