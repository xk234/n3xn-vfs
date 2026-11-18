const BASE_URL = new URL("./", window.location.href).href;
const MONACO_MIN = BASE_URL + "__monaco__/npm/monaco-editor@0.52.0/min";
const MONACO_VS = MONACO_MIN + "/vs";
const JSDELIVR_PROXY = BASE_URL + "__cdn__/jsdelivr/";
const ESM_PROXY = BASE_URL + "__cdn__/esm/";
const ANY_PROXY = BASE_URL + "__cdn__/any/";
const STORAGE_KEY = "n3xn_dreamland_vfs_v6";

const statusBadge = document.getElementById("status-badge");
const consoleOut = document.getElementById("console-out");
const previewFrame = document.getElementById("preview");
const fileListEl = document.getElementById("file-list");

function log(msg, cls = "") {
  const line = document.createElement("div");
  if (cls) line.className = cls;
  line.textContent = "[" + new Date().toLocaleTimeString() + "] " + msg;
  consoleOut.appendChild(line);
  consoleOut.scrollTop = consoleOut.scrollHeight;
}

// Ensure ./sw.js controls this page before requesting __monaco__/ or __cdn__/
if ("serviceWorker" in navigator) {
  await navigator.serviceWorker.register("./sw.js", { scope: "./" });
  await navigator.serviceWorker.ready;
  if (!navigator.serviceWorker.controller) {
    statusBadge.textContent = "Activating SW…";
    if (!sessionStorage.getItem("dl_sw_booted_v6")) {
      sessionStorage.setItem("dl_sw_booted_v6", "1");
      location.reload();
      await new Promise(() => {});
    }
  }
  navigator.serviceWorker.addEventListener("message", (e) => {
    if (e.data?.type === "WARM_DREAMLAND_OK") {
      log("Offline cache warmed (Monaco + esbuild + Dreamland)", "log-ok");
      statusBadge.textContent = "Offline Ready";
    }
  });
}

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load " + src));
    document.head.appendChild(s);
  });
}

async function pickEsmBase() {
  try {
    const r = await fetch(ESM_PROXY + "dreamland/core", { method: "GET" });
    const ct = (r.headers.get("content-type") || "").toLowerCase();
    if (r.ok && !ct.includes("text/html")) {
      const t = await r.clone().text();
      if (!t.trimStart().startsWith("<!")) return ESM_PROXY;
    }
  } catch (_) {}
  return "https://esm.sh/";
}

let esmBase = await pickEsmBase();
log("ESM base: " + esmBase, "log-ok");

// Load Monaco via loader.js (SW-proxied)
await loadScript(MONACO_VS + "/loader.js");
window.MonacoEnvironment = {
  getWorkerUrl: function (_id, label) {
    const map = {
      json: "language/json/jsonWorker.js",
      css: "language/css/cssWorker.js",
      html: "language/html/htmlWorker.js",
      typescript: "language/typescript/tsWorker.js",
      javascript: "language/typescript/tsWorker.js",
    };
    return MONACO_VS + "/" + (map[label] || "base/worker/workerMain.js");
  },
};
window.require.config({ paths: { vs: MONACO_VS } });
await new Promise((resolve, reject) => {
  window.require(["vs/editor/editor.main"], resolve, reject);
});

let esbuild;
try {
  esbuild = await import(JSDELIVR_PROXY + "npm/esbuild-wasm@0.24.2/esm/browser.min.js");
} catch {
  esbuild = await import("https://cdn.jsdelivr.net/npm/esbuild-wasm@0.24.2/esm/browser.min.js");
}

const DEFAULT_FILES = {
  "/src/main.tsx": `import { css, type Component } from "dreamland/core";\nimport { HUD } from "./HUD.tsx";\n\nexport const App: Component<{}, { score: number; timeLeft: number; active: boolean; x: number; y: number }> = function () {\n  this.score = 0; this.timeLeft = 15; this.active = false; this.x = 50; this.y = 50;\n  let timer;\n  const move = () => { this.x = 12 + Math.floor(Math.random() * 76); this.y = 15 + Math.floor(Math.random() * 70); };\n  const start = () => { clearInterval(timer); this.score = 0; this.timeLeft = 15; this.active = true; move();\n    timer = setInterval(() => { this.timeLeft--; if (this.timeLeft <= 0) { clearInterval(timer); this.active = false; } }, 1000); };\n  return (\n    <div class=\"card\"><HUD score={use(this.score)} timeLeft={use(this.timeLeft)} />\n      <div class=\"arena\">{use(this.active).map((on) => on ? (\n        <button class=\"orb\" style={use\`left: \${this.x}%; top: \${this.y}%;\`} on:click={() => { this.score++; move(); }}>+1</button>\n      ) : (\n        <div class=\"center\"><p>{this.score > 0 ? \`Final: \${this.score}\` : \"Dreamland Studio\"}</p>\n        <button class=\"btn\" on:click={start}>{this.score > 0 ? \"Again\" : \"Start\"}</button></div>\n      ))}</div></div>\n  );\n};\nApp.style = css\`:scope{max-width:460px;margin:2rem auto;background:#0f172a;border:1px solid #1e293b;border-radius:12px;padding:1.25rem}.arena{position:relative;height:260px;background:#020617;border-radius:8px;margin-top:1rem}.orb{position:absolute;transform:translate(-50%,-50%);width:44px;height:44px;border-radius:50%;border:none;background:#38bdf8;font-weight:800;cursor:pointer}.center{height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:.75rem}.btn{background:#38bdf8;color:#090d16;border:none;padding:.6rem 1.2rem;border-radius:8px;font-weight:700;cursor:pointer}\`;\nexport default App;\n`,
  "/src/HUD.tsx": `import { css, type Component } from "dreamland/core";\nexport const HUD: Component<{ score: number; timeLeft: number }> = function (cx) {\n  return (<header><h3>\u26a1 Dreamland Reflex</h3><div class=\"meta\"><span>Score: <strong>{use(cx.score)}</strong></span><span>Time: <strong>{use(cx.timeLeft)}s</strong></span></div></header>);\n};\nHUD.style = css\`:scope{display:flex;justify-content:space-between;align-items:center}.meta{display:flex;gap:1rem;color:#94a3b8}strong{color:#38bdf8}\`;\n`,
};

let files = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null") || {};
for (const [k, v] of Object.entries(DEFAULT_FILES)) if (!files[k]) files[k] = v;
if (files["/src/main.tsx"] && files["/src/main.tsx"].includes('from "./HUD"') && !files["/src/main.tsx"].includes('from "./HUD.tsx"')) {
  files["/src/main.tsx"] = files["/src/main.tsx"].replace('from "./HUD"', 'from "./HUD.tsx"');
}
localStorage.setItem(STORAGE_KEY, JSON.stringify(files));

let activeFile = files["/src/main.tsx"] ? "/src/main.tsx" : Object.keys(files)[0];
let editor = null;
let lastBuiltHtml = "";
let debounceTimer = null;

function saveVFS() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

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
      del.textContent = "\u00d7";
      del.onclick = (e) => {
        e.stopPropagation();
        delete files[path];
        saveVFS();
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

function getOrCreateModel(path, content) {
  const uri = monaco.Uri.parse("file://" + path);
  let model = monaco.editor.getModel(uri);
  const lang = path.endsWith(".tsx") || path.endsWith(".ts") ? "typescript" : "javascript";
  if (!model) model = monaco.editor.createModel(content, lang, uri);
  else if (model.getValue() !== content) model.setValue(content);
  return model;
}

function switchFile(path) {
  activeFile = path;
  editor.setModel(getOrCreateModel(path, files[path]));
  renderSidebar();
}

monaco.languages.typescript.typescriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2022,
  module: monaco.languages.typescript.ModuleKind.ESNext,
  jsx: monaco.languages.typescript.JsxEmit.Preserve,
  jsxImportSource: "dreamland",
  allowNonTsExtensions: true,
});
monaco.languages.typescript.typescriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: true,
  noSyntaxValidation: false,
});

for (const [p, code] of Object.entries(files)) getOrCreateModel(p, code);
editor = monaco.editor.create(document.getElementById("monaco-root"), {
  model: getOrCreateModel(activeFile, files[activeFile]),
  theme: "vs-dark",
  automaticLayout: true,
  fontSize: 13,
  minimap: { enabled: false },
});
editor.onDidChangeModelContent(() => {
  files[activeFile] = editor.getValue();
  saveVFS();
  if (document.getElementById("autorun-chk").checked) {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(buildAndRun, 350);
  }
});
window.addEventListener("keydown", (e) => {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
    e.preventDefault();
    buildAndRun();
  }
});

try {
  await esbuild.initialize({
    wasmURL: "https://cdn.jsdelivr.net/npm/esbuild-wasm@0.24.2/esbuild.wasm",
    worker: false,
  });
} catch {
  await esbuild.initialize({
    wasmURL: JSDELIVR_PROXY + "npm/esbuild-wasm@0.24.2/esbuild.wasm",
    worker: false,
  });
}

function resolvePath(importer, rel) {
  const cleanImporter = String(importer || "/src/main.tsx")
    .replace(/^vfs:/, "")
    .replace(/^file:\/\//, "");
  if (rel.startsWith("/")) return rel;
  const segs = cleanImporter.split("/").filter(Boolean);
  segs.pop();
  for (const seg of rel.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") segs.pop();
    else segs.push(seg);
  }
  return "/" + segs.join("/");
}

function findFile(base) {
  for (const ext of ["", ".tsx", ".ts", ".jsx", ".js"]) {
    if (files[base + ext] !== undefined) return base + ext;
  }
  return null;
}

async function buildAndRun() {
  const t0 = performance.now();
  consoleOut.innerHTML = "";
  const cssChunks = [];
  esmBase = await pickEsmBase();
  const vfsPlugin = {
    name: "n3xn-vfs",
    setup(build) {
      build.onResolve({ filter: /^[^./]/ }, (args) => {
        if (args.path.startsWith("http")) return { path: args.path, external: true };
        return { path: esmBase + args.path, external: true };
      });
      build.onResolve({ filter: /^(\.|\/)/ }, (args) => {
        const importer = String(args.importer || "/src/main.tsx").replace(/^vfs:/, "");
        const base = resolvePath(importer, args.path);
        const found = findFile(base);
        if (found) return { path: found, namespace: "vfs" };
        return { errors: [{ text: "Not found: " + args.path + " (resolved " + base + ")" }] };
      });
      build.onLoad({ filter: /.*/, namespace: "vfs" }, (args) => {
        const src = files[args.path] ?? "";
        if (args.path.endsWith(".css")) {
          cssChunks.push(src);
          return { contents: "", loader: "js" };
        }
        const loader = args.path.endsWith(".tsx")
          ? "tsx"
          : args.path.endsWith(".ts")
          ? "ts"
          : "jsx";
        return { contents: src, loader };
      });
    },
  };
  try {
    const virtualEntry =
      'import * as Entry from "/src/main.tsx";\n' +
      'import { h } from "' +
      esmBase +
      'dreamland/core";\n' +
      'const root = document.getElementById("app");\n' +
      "if (root) { while (root.firstChild) root.removeChild(root.firstChild); const C = Entry.default || Entry.App; if (typeof C === \"function\") root.appendChild(h(C, {})); else root.textContent = \"No App export\"; }\n";
    const out = await esbuild.build({
      stdin: { contents: virtualEntry, resolveDir: "/", loader: "tsx" },
      bundle: true,
      write: false,
      format: "esm",
      target: "es2022",
      jsx: "transform",
      jsxFactory: "h",
      jsxFragment: "Fragment",
      plugins: [vfsPlugin],
    });
    const js = out.outputFiles[0].text;
    lastBuiltHtml =
      "<!doctype html><html><head><meta charset=UTF-8><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#090d16;color:#f8fafc;font-family:system-ui}" +
      cssChunks.join("\n") +
      "</style></head><body><div id=app></div><script type=module>" +
      js +
      "</" +
      "script></body></html>";
    previewFrame.srcdoc = lastBuiltHtml;
    const ms = Math.round(performance.now() - t0);
    statusBadge.textContent = (navigator.onLine ? "Online" : "Offline") + " \u00b7 " + ms + "ms";
    log("Compiled in " + ms + "ms", "log-ok");
  } catch (err) {
    statusBadge.textContent = "Build Error";
    (err?.errors ? err.errors.map((e) => e.text) : [String(err)]).forEach((m) =>
      log(m, "log-err")
    );
  }
}

document.getElementById("run-btn").onclick = buildAndRun;
document.getElementById("warm-btn").onclick = async () => {
  const reg = await navigator.serviceWorker?.ready;
  reg?.active?.postMessage({ type: "WARM_DREAMLAND" });
  log("WARM_DREAMLAND sent to dreamland/sw.js", "log-ok");
};
document.getElementById("new-file-btn").onclick = () => {
  const name = prompt("New file path:", "/src/Component.tsx");
  if (!name) return;
  const clean = name.startsWith("/") ? name : "/" + name;
  if (!files[clean]) {
    files[clean] =
      'import { type Component } from "dreamland/core";\nexport const NewComp: Component = function () { return <div>' +
      clean +
      "</div>; };\n";
    saveVFS();
  }
  switchFile(clean);
};
document.getElementById("reset-btn").onclick = () => {
  files = structuredClone(DEFAULT_FILES);
  saveVFS();
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
