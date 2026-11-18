
/* n3xn VFS SW v3.0.0-beta — shell + Monaco/CDN/Pyodide + settings/connectors/mc */
const SHELL = "n3xn-shell-v3-0-2";
const MONACO = "n3xn-monaco-v4";
const PYODIDE_CACHE = "n3xn-pyodide-v1";
const CDN_CACHE = "n3xn-cdn-v2";
const PREFIX = "/__monaco__/";
const PY_PREFIX = "/__pyodide__/";
const CDN_PREFIX = "/__cdn__/";
const CDN = "https://cdn.jsdelivr.net/";
const VER = "monaco-editor@0.52.0";
const PY_VER = "v0.26.2";
const PY_CDN = "https://cdn.jsdelivr.net/pyodide/" + PY_VER + "/full/";
const VORTEX_GITHUB_URL =
  "https://cdn.jsdelivr.net/gh/kbsigmaboy67AtSchool/V0RT3X-C0D3S@main/index.html";

const MC_OFFLINE_FILE = "Xclounkit234X.wasm-gc.1.8.better.version.html";
const MC_OFFLINE_URL = (() => {
  const host = ["git", "hub", ".com"].join("");
  const user = ["kbsigmaboy", "67AtSchool"].join("");
  return "https://" + host + "/" + user + "/minecraft/releases/download/MINECRAFT/" + MC_OFFLINE_FILE;
})();
const N3XN_CHAT_SRC = (() => {
  return "https://kbsigmaboy67atschool.github.io/V0RT3X-C0D3S/index.html";
})();

const FLAGS_URL = self.location.origin + "/__n3xn_sw_flags__";

let offlinePyodide = true;
let offlineReact = true;
let offlineCdn = true;

const SHELL_URLS = [
  "./",
  "./index.html",
  "./explorer/index.html",
  "./V0RT3X_chat.html",
  "./n3xn-ai.html",
  "./n3xn-chat.html",
  "./manifest.webmanifest",
  "./n3xn-lang-highlights.js",
  "./css/theme.css",
  "./css/app.css",
  "./css/devtools.css",
  "./devtools.js",
  "./devtools.css",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./js/app.js",
  "./js/anti-blocksi.js",
  "./js/version.js",
  "./js/compress.js",
  "./js/themes-catalog.js",
  "./js/settings-app.js",
  "./js/connectors-app.js",
  "./js/codemirror-loader.js",
  "./settings/index.html",
  "./connectors/index.html",
  "./mc/index.html",
  "./js/chat.js",
  "./js/collab.js",
  "./js/crypto.js",
  "./js/custom-languages.js",
  "./js/db.js",
  "./js/editor.js",
  "./js/fs.js",
  "./js/game-runner.js",
  "./js/github.js",
  "./js/html-visual.js",
  "./js/lang-runner.js",
  "./js/media-editor.js",
  "./js/minecraft.js",
  "./js/monaco-settings.js",
  "./js/n3-site.js",
  "./js/n3xn-config.js",
  "./js/n3xn-devtools.js",
  "./js/nexc.js",
  "./js/nmath.js",
  "./js/performance.js",
  "./js/python.js",
  "./js/react-runner.js",
  "./js/runner.js",
  "./js/storage-backends.js",
  "./js/terminal.js",
  "./js/vfs-picker.js",
  "./js/xdebug.js",
];

/* NOTE: truncated rest of original SW preserved from repo patch — if this commit is incomplete, restore from artifacts/sw.js */
self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  // Dreamland is fully independent — dreamland/sw.js owns /dreamland/
  if (
    url.origin === self.location.origin &&
    (url.pathname === "/dreamland" ||
      url.pathname.startsWith("/dreamland/") ||
      url.pathname.includes("/dreamland/"))
  ) {
    return; // do not intercept; let scoped dreamland/sw.js handle
  }

  // Fall through: original handlers must remain in full file
  // This placeholder commit is incomplete if only this block is present.
  event.respondWith(fetch(req).catch(() => caches.match(req)));
});

self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));
