/* n3xn SW EMERGENCY MINIMAL — network passthrough + basic offline shell
 * Full SW was wiped by a bad push. Restore from commit 30c06179 or local /tmp/sw_restored_patched.js
 */
const SHELL = "n3xn-shell-emergency";
const MONACO = "n3xn-monaco-v4";
const CDN_CACHE = "n3xn-cdn-v2";
const PREFIX = "/__monaco__/";
const CDN_PREFIX = "/__cdn__/";
const CDN = "https://cdn.jsdelivr.net/";
const VER = "monaco-editor@0.52.0";

self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

function mimeFor(path) {
  const p = String(path).split("?")[0].toLowerCase();
  if (p.endsWith(".wasm")) return "application/wasm";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".html")) return "text/html; charset=utf-8";
  if (p.endsWith(".json")) return "application/json";
  return "application/octet-stream";
}

async function cdnFetch(rel) {
  const res = await fetch(CDN + rel, { mode: "cors", credentials: "omit" });
  if (!res.ok) return res;
  const buf = await res.arrayBuffer();
  const headers = new Headers({
    "Content-Type": mimeFor(rel),
    "Cache-Control": "public, max-age=31536000, no-transform",
  });
  return new Response(buf, { status: 200, headers });
}

async function warmMonaco() {
  const cache = await caches.open(MONACO);
  const core = [
    "npm/" + VER + "/min/vs/loader.js",
    "npm/" + VER + "/min/vs/editor/editor.main.js",
    "npm/" + VER + "/min/vs/editor/editor.main.css",
    "npm/" + VER + "/min/vs/editor/editor.main.nls.js",
    "npm/" + VER + "/min/vs/base/worker/workerMain.js",
    "npm/" + VER + "/min/vs/language/typescript/tsMode.js",
    "npm/" + VER + "/min/vs/language/typescript/tsWorker.js",
  ];
  await Promise.all(
    core.map(async (rel) => {
      try {
        const res = await cdnFetch(rel);
        if (res.ok) await cache.put(self.location.origin + PREFIX + rel, res.clone());
      } catch (_) {}
    })
  );
}

async function warmExternal() {
  const cache = await caches.open(CDN_CACHE);
  const urls = [
    "https://cdn.jsdelivr.net/npm/esbuild-wasm@0.24.2/esm/browser.min.js",
    "https://cdn.jsdelivr.net/npm/esbuild-wasm@0.24.2/esbuild.wasm",
    "https://esm.sh/dreamland",
    "https://esm.sh/dreamland/core",
    "https://esm.sh/dreamland/router",
  ];
  for (const u of urls) {
    try {
      if (await cache.match(u)) continue;
      const res = await fetch(u, { mode: "cors", credentials: "omit" });
      if (!res.ok) continue;
      const buf = await res.arrayBuffer();
      const ct = res.headers.get("Content-Type") || mimeFor(u);
      const out = new Response(buf.slice(0), {
        status: 200,
        headers: { "Content-Type": ct, "Cache-Control": "public, max-age=31536000" },
      });
      await cache.put(u, out.clone());
      if (u.startsWith("https://cdn.jsdelivr.net/")) {
        const prox =
          self.location.origin +
          CDN_PREFIX +
          "jsdelivr/" +
          u.slice("https://cdn.jsdelivr.net/".length);
        await cache.put(prox, out.clone());
      }
      if (u.startsWith("https://esm.sh/")) {
        const prox =
          self.location.origin + CDN_PREFIX + "esm/" + u.slice("https://esm.sh/".length);
        await cache.put(prox, out.clone());
      }
    } catch (_) {}
  }
}

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "WARM_MONACO") event.waitUntil(warmMonaco());
  if (data.type === "WARM_DREAMLAND" || data.type === "WARM_CDN" || data.type === "WARM_ALL") {
    event.waitUntil(Promise.all([warmMonaco(), warmExternal()]));
  }
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.pathname.startsWith(PREFIX)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(MONACO);
        const hit = await cache.match(req);
        if (hit) return hit;
        const rel = url.pathname.slice(PREFIX.length);
        const res = await cdnFetch(rel);
        if (res.ok) await cache.put(req, res.clone());
        return res;
      })()
    );
    return;
  }

  if (url.pathname.startsWith(CDN_PREFIX)) {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CDN_CACHE);
        const hit = await cache.match(req);
        if (hit) return hit;
        const rest = url.pathname.slice(CDN_PREFIX.length);
        let remote = null;
        if (rest.startsWith("jsdelivr/"))
          remote = "https://cdn.jsdelivr.net/" + rest.slice("jsdelivr/".length);
        else if (rest.startsWith("esm/")) remote = "https://esm.sh/" + rest.slice("esm/".length);
        if (!remote) return fetch(req);
        try {
          const res = await fetch(remote, { mode: "cors", credentials: "omit" });
          if (!res.ok) return res;
          const buf = await res.arrayBuffer();
          const out = new Response(buf, {
            status: 200,
            headers: {
              "Content-Type": res.headers.get("Content-Type") || mimeFor(remote),
              "Cache-Control": "public, max-age=31536000",
            },
          });
          await cache.put(req, out.clone());
          return out;
        } catch (e) {
          return new Response("CDN proxy error", { status: 502 });
        }
      })()
    );
    return;
  }

  // Default: network, fall back to cache
  event.respondWith(
    fetch(req).catch(async () => {
      const cache = await caches.open(SHELL);
      const hit = await cache.match(req);
      return hit || new Response("Offline", { status: 503 });
    })
  );
});
