/* n3xn Dreamland SW — scoped to ./ (/dreamland/ on CF Pages, /n3xn-vfs/dreamland/ on GH Pages) */
const SHELL = "n3xn-dreamland-shell-v2";
const MONACO = "n3xn-dreamland-monaco-v2";
const CDN = "n3xn-dreamland-cdn-v2";
const VER = "monaco-editor@0.52.0";

// Dynamically resolves "/dreamland/" on CF Pages OR "/n3xn-vfs/dreamland/" on GitHub Pages
const BASE_PATH = new URL("./", self.location.href).pathname;
const MONACO_PREFIX = BASE_PATH + "__monaco__/";
const CDN_PREFIX = BASE_PATH + "__cdn__/";

const JSDELIVR = "https://cdn.jsdelivr.net/";
const ESM = "https://esm.sh/";

const SHELL_URLS = ["./", "./index.html", "./playground.html", "./sw.js"];

const MONACO_CORE = [
  "npm/" + VER + "/min/vs/loader.js",
  "npm/" + VER + "/min/vs/editor/editor.main.js",
  "npm/" + VER + "/min/vs/editor/editor.main.css",
  "npm/" + VER + "/min/vs/editor/editor.main.nls.js",
  "npm/" + VER + "/min/vs/base/worker/workerMain.js",
  "npm/" + VER + "/min/vs/language/typescript/tsMode.js",
  "npm/" + VER + "/min/vs/language/typescript/tsWorker.js",
  "npm/" + VER + "/min/vs/language/json/jsonWorker.js",
  "npm/" + VER + "/min/vs/language/css/cssWorker.js",
  "npm/" + VER + "/min/vs/language/html/htmlWorker.js",
  "npm/" + VER + "/min/vs/basic-languages/typescript/typescript.js",
  "npm/" + VER + "/min/vs/basic-languages/javascript/javascript.js",
  "npm/" + VER + "/min/vs/basic-languages/css/css.js",
  "npm/" + VER + "/min/vs/basic-languages/html/html.js",
  "npm/" + VER + "/min/vs/basic-languages/json/json.js",
];

const EXTERNAL = [
  JSDELIVR + "npm/esbuild-wasm@0.24.2/esm/browser.min.js",
  JSDELIVR + "npm/esbuild-wasm@0.24.2/esbuild.wasm",
  ESM + "dreamland",
  ESM + "dreamland/core",
  ESM + "dreamland/router",
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(SHELL);
    await Promise.all(SHELL_URLS.map((u) => cache.add(u).catch(() => null)));
    await warmMonaco();
    await warmExternal();
    await self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keep = new Set([SHELL, MONACO, CDN]);
    const keys = await caches.keys();
    await Promise.all(
      keys.filter((k) => k.startsWith("n3xn-dreamland-") && !keep.has(k)).map((k) => caches.delete(k))
    );
    await self.clients.claim();
  })());
});

function mimeFor(path) {
  const p = String(path).split("?")[0].toLowerCase();
  if (p.endsWith(".wasm")) return "application/wasm";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".json")) return "application/json";
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function isHtmlPoison(buf, ct) {
  const c = (ct || "").toLowerCase();
  if (c.includes("text/html")) return true;
  try {
    const sample = new TextDecoder().decode(buf.slice(0, 200)).toLowerCase();
    if (sample.includes("<!doctype") || sample.includes("<html")) return true;
  } catch (_) {}
  return false;
}

async function warmMonaco() {
  const cache = await caches.open(MONACO);
  await Promise.all(MONACO_CORE.map(async (rel) => {
    try {
      const localKey = self.location.origin + MONACO_PREFIX + rel;
      if (await cache.match(localKey)) return;
      const res = await fetch(JSDELIVR + rel, { mode: "cors", credentials: "omit" });
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const headers = new Headers({
        "Content-Type": mimeFor(rel),
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      });
      await cache.put(localKey, new Response(buf, { status: 200, headers }));
    } catch (_) {}
  }));
}

async function warmExternal() {
  const cache = await caches.open(CDN);
  for (const u of EXTERNAL) {
    try {
      if (await cache.match(u)) continue;
      const res = await fetch(u, { mode: "cors", credentials: "omit", redirect: "follow" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      let ct = res.headers.get("Content-Type") || mimeFor(u);
      if (isHtmlPoison(buf, ct)) continue;
      if (u.includes("esm.sh") && !ct.includes("javascript") && !ct.includes("wasm"))
        ct = "application/javascript; charset=utf-8";
      const headers = new Headers({
        "Content-Type": ct,
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      });
      const out = new Response(buf.slice(0), { status: 200, headers });
      await cache.put(u, out.clone());
      if (u.startsWith(JSDELIVR))
        await cache.put(self.location.origin + CDN_PREFIX + "jsdelivr/" + u.slice(JSDELIVR.length), out.clone());
      else if (u.startsWith(ESM))
        await cache.put(self.location.origin + CDN_PREFIX + "esm/" + u.slice(ESM.length), out.clone());
    } catch (_) {}
  }
}

async function monacoProxy(req, url) {
  const cache = await caches.open(MONACO);
  const hit = await cache.match(req);
  if (hit) return hit;
  const rel = url.pathname.slice(MONACO_PREFIX.length) + url.search;
  try {
    const res = await fetch(JSDELIVR + rel, { mode: "cors", credentials: "omit" });
    if (!res.ok) return res;
    const buf = await res.arrayBuffer();
    const headers = new Headers({
      "Content-Type": mimeFor(rel),
      "Cache-Control": "public, max-age=31536000",
      "Access-Control-Allow-Origin": "*",
    });
    const out = new Response(buf, { status: 200, headers });
    await cache.put(req, out.clone());
    return out;
  } catch {
    return new Response("/* dreamland monaco miss */", {
      status: 503,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
}

async function cdnProxy(req, url) {
  const rest = url.pathname.slice(CDN_PREFIX.length);
  let remote;
  if (rest.startsWith("jsdelivr/")) remote = JSDELIVR + rest.slice(9) + url.search;
  else if (rest.startsWith("esm/")) remote = ESM + rest.slice(4) + url.search;
  else return new Response("bad dreamland __cdn__ path", { status: 400 });

  const cache = await caches.open(CDN);
  const hit = (await cache.match(req)) || (await cache.match(remote));
  if (hit) {
    const buf = await hit.clone().arrayBuffer();
    const ct = hit.headers.get("Content-Type") || "";
    if (!isHtmlPoison(buf, ct)) return hit;
    try { await cache.delete(req); } catch (_) {}
    try { await cache.delete(remote); } catch (_) {}
  }
  try {
    const res = await fetch(remote, { mode: "cors", credentials: "omit", redirect: "follow" });
    if (!res.ok) {
      return new Response("/* upstream " + res.status + " */", {
        status: res.status,
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    }
    const buf = await res.arrayBuffer();
    let ct = res.headers.get("Content-Type") || mimeFor(remote);
    if (isHtmlPoison(buf, ct)) {
      return new Response("/* refused html */", {
        status: 502,
        headers: { "Content-Type": "application/javascript; charset=utf-8" },
      });
    }
    if (rest.startsWith("esm/") && !ct.includes("javascript") && !ct.includes("wasm"))
      ct = "application/javascript; charset=utf-8";
    const headers = new Headers({
      "Content-Type": ct,
      "Cache-Control": "public, max-age=31536000",
      "Access-Control-Allow-Origin": "*",
    });
    const out = new Response(buf.slice(0), { status: 200, headers });
    await cache.put(req, out.clone());
    await cache.put(remote, out.clone());
    return out;
  } catch {
    return new Response("/* cdn offline */", {
      status: 503,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(MONACO_PREFIX)) {
    event.respondWith(monacoProxy(req, url));
    return;
  }
  if (url.pathname.startsWith(CDN_PREFIX)) {
    event.respondWith(cdnProxy(req, url));
    return;
  }

  if (url.pathname.startsWith(BASE_PATH)) {
    event.respondWith((async () => {
      try {
        const net = await fetch(req);
        if (net.ok) {
          const cache = await caches.open(SHELL);
          cache.put(req, net.clone()).catch(() => {});
          return net;
        }
      } catch (_) {}
      const cache = await caches.open(SHELL);
      return (
        (await cache.match(req)) ||
        (await cache.match(url.pathname)) ||
        (await cache.match("./playground.html")) ||
        new Response("Dreamland offline", { status: 503 })
      );
    })());
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "WARM_DREAMLAND" || data.type === "WARM_ALL") {
    event.waitUntil(
      Promise.all([warmMonaco(), warmExternal()]).then(() => {
        event.source?.postMessage?.({ type: "WARM_DREAMLAND_OK" });
      })
    );
  }
});
