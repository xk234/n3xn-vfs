/* n3xn Dreamland SW v20 — Dynamic Template Caching + Clean Non-Redirected Responses */
const SHELL = "n3xn-dreamland-shell-v22";
const MONACO = "n3xn-dreamland-monaco-v22";
const CDN = "n3xn-dreamland-cdn-v22";
const VER = "monaco-editor@0.52.0";

const BASE_PATH = new URL("./", self.location.href).pathname;
const MONACO_PREFIX = BASE_PATH + "__monaco__/";
const CDN_PREFIX = BASE_PATH + "__cdn__/";

const JSDELIVR = "https://cdn.jsdelivr.net/";
const ESM = "https://esm.sh/";
const UNPKG = "https://unpkg.com/";
const CDNJS = "https://cdnjs.cloudflare.com/";

// Only core studio shell files — templates are discovered dynamically via ./templates/index.json
const SHELL_URLS = [
  "./",
  "./index.html",
  "./playground",
  "./playground.html",
  "./playground.css",
  "./js/vfs.js",
  "./js/monaco.js",
  "./js/compiler.js",
  "./js/playground.js",
  "./templates/index.json",
  "./sw.js",
];

const MONACO_CORE = [
  "npm/" + VER + "/min/vs/loader.js",
  "npm/" + VER + "/min/vs/editor/editor.main.js",
  "npm/" + VER + "/min/vs/editor/editor.main.css",
  "npm/" + VER + "/min/vs/editor/editor.main.nls.js",
  "npm/" + VER + "/min/vs/base/worker/workerMain.js",
  "npm/" + VER + "/min/vs/language/typescript/tsMode.js",
  "npm/" + VER + "/min/vs/language/typescript/tsWorker.js",
  "npm/" + VER + "/min/vs/language/json/jsonMode.js",
  "npm/" + VER + "/min/vs/language/json/jsonWorker.js",
  "npm/" + VER + "/min/vs/language/css/cssMode.js",
  "npm/" + VER + "/min/vs/language/css/cssWorker.js",
  "npm/" + VER + "/min/vs/language/html/htmlMode.js",
  "npm/" + VER + "/min/vs/language/html/htmlWorker.js",
  "npm/" + VER + "/min/vs/basic-languages/typescript/typescript.js",
  "npm/" + VER + "/min/vs/basic-languages/javascript/javascript.js",
  "npm/" + VER + "/min/vs/basic-languages/css/css.js",
  "npm/" + VER + "/min/vs/basic-languages/html/html.js",
  "npm/" + VER + "/min/vs/basic-languages/json/json.js",
];

const EXTERNAL_WARM = [
  JSDELIVR + "npm/esbuild-wasm@0.24.2/esm/browser.min.js",
  JSDELIVR + "npm/esbuild-wasm@0.24.2/esbuild.wasm",
  JSDELIVR + "npm/@babel/standalone@7.26.4/+esm",
  JSDELIVR + "npm/dreamland@0.1.3/dist/index.d.ts",
  JSDELIVR + "npm/dreamland@0.1.3/dist/core.d.ts",
  ESM + "dreamland@0.1.3",
  ESM + "dreamland@0.1.3/core",
  ESM + "dreamland@0.1.3/router",
  ESM + "dreamland@0.1.3/jsx-runtime",
  ESM + "dreamland@0.1.3/jsx-dev-runtime",
  ESM + "dreamland@0.1.3/ssr",
];

async function cleanResponse(res, fallbackMime) {
  const buf = await res.arrayBuffer();
  const ct = res.headers.get("Content-Type") || fallbackMime;
  return new Response(buf, {
    status: 200,
    headers: {
      "Content-Type": ct,
      "Cache-Control": "no-cache",
    },
  });
}

function mimeFor(path) {
  const p = String(path).split("?")[0].toLowerCase();
  if (p.endsWith(".wasm")) return "application/wasm";
  if (p.endsWith(".css")) return "text/css; charset=utf-8";
  if (p.endsWith(".js") || p.endsWith(".mjs")) return "application/javascript; charset=utf-8";
  if (p.endsWith(".d.ts") || p.endsWith(".ts") || p.endsWith(".tsx") || p.endsWith(".jsx")) {
    return "text/plain; charset=utf-8";
  }
  if (p.endsWith(".json")) return "application/json";
  if (p.endsWith(".svg")) return "image/svg+xml";
  if (p.endsWith(".png")) return "image/png";
  if (p.endsWith(".jpg") || p.endsWith(".jpeg")) return "image/jpeg";
  if (p.endsWith(".webp")) return "image/webp";
  if (p.endsWith(".mp3")) return "audio/mpeg";
  if (p.endsWith(".wav")) return "audio/wav";
  if (p.endsWith(".ogg")) return "audio/ogg";
  if (p.endsWith(".woff2")) return "font/woff2";
  if (p.endsWith(".html") || p.endsWith("/playground") || p.endsWith("/")) return "text/html; charset=utf-8";
  return "application/octet-stream";
}

function isHtmlPoison(buf, ct, expectsHtml = false) {
  if (expectsHtml) return false;
  const c = (ct || "").toLowerCase();
  if (c.includes("text/html")) return true;
  try {
    const sample = new TextDecoder().decode(buf.slice(0, 200)).toLowerCase();
    if (sample.includes("<!doctype") || sample.includes("<html")) return true;
  } catch (_) {}
  return false;
}

// Dynamically reads ./templates/index.json and caches every referenced .tsx/.jsx/.ts/.css file
async function warmTemplates() {
  const shell = await caches.open(SHELL);
  const indexUrl = new URL("./templates/index.json", self.location.href).href;
  try {
    const res = await fetch(indexUrl, { redirect: "follow", cache: "no-store" });
    if (!res.ok) return;
    const cleanIndex = await cleanResponse(res, "application/json");
    await shell.put(indexUrl, cleanIndex.clone());
    const manifest = await cleanIndex.json();
    const list = Array.isArray(manifest?.templates) ? manifest.templates : [];
    const fileUrls = new Set();
    for (const tpl of list) {
      if (tpl?.files && typeof tpl.files === "object") {
        for (const relSrc of Object.values(tpl.files)) {
          fileUrls.add(new URL("./templates/" + String(relSrc).replace(/^\.?\//, ""), self.location.href).href);
        }
      }
    }
    await Promise.allSettled(
      [...fileUrls].map(async (u) => {
        const fRes = await fetch(u, { redirect: "follow", cache: "no-store" });
        if (fRes.ok) {
          await shell.put(u, await cleanResponse(fRes, mimeFor(u)));
        }
      })
    );
  } catch (_) {}
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const shell = await caches.open(SHELL);
      await Promise.allSettled(
        SHELL_URLS.map(async (rel) => {
          const fullUrl = new URL(rel, self.location.href).href;
          const res = await fetch(fullUrl, { redirect: "follow", cache: "no-store" });
          if (res.ok) {
            await shell.put(fullUrl, await cleanResponse(res, mimeFor(rel)));
          }
        })
      );
      await Promise.allSettled([warmTemplates(), warmMonaco(), warmExternal()]);
      await self.skipWaiting();
    })()
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keep = new Set([SHELL, MONACO, CDN]);
      const keys = await caches.keys();
      await Promise.all(
        keys.filter((k) => k.startsWith("n3xn-dreamland-") && !keep.has(k)).map((k) => caches.delete(k))
      );
      await self.clients.claim();
    })()
  );
});

async function warmMonaco() {
  const cache = await caches.open(MONACO);
  await Promise.allSettled(
    MONACO_CORE.map(async (rel) => {
      const localKey = self.location.origin + MONACO_PREFIX + rel;
      if (await cache.match(localKey)) return;
      const res = await fetch(JSDELIVR + rel, { mode: "cors", credentials: "omit", redirect: "follow" });
      if (!res.ok) return;
      const buf = await res.arrayBuffer();
      const headers = new Headers({
        "Content-Type": mimeFor(rel),
        "Cache-Control": "public, max-age=31536000",
        "Access-Control-Allow-Origin": "*",
      });
      await cache.put(localKey, new Response(buf, { status: 200, headers }));
    })
  );
}

async function cacheRemoteUrl(cache, remoteUrl, localProxyUrl = null) {
  const res = await fetch(remoteUrl, { mode: "cors", credentials: "omit", redirect: "follow" });
  if (!res.ok) return null;
  const buf = await res.arrayBuffer();
  let ct = res.headers.get("Content-Type") || mimeFor(remoteUrl);
  const expectsHtml = /\.html?($|\?)/i.test(remoteUrl);
  if (isHtmlPoison(buf, ct, expectsHtml)) return null;

  if (
    (remoteUrl.includes("esm.sh") || remoteUrl.includes("unpkg.com")) &&
    !ct.includes("javascript") &&
    !ct.includes("wasm") &&
    !ct.includes("json") &&
    !ct.includes("css")
  ) {
    ct = "application/javascript; charset=utf-8";
  }

  const headers = new Headers({
    "Content-Type": ct,
    "Cache-Control": "public, max-age=31536000",
    "Access-Control-Allow-Origin": "*",
  });
  const out = new Response(buf.slice(0), { status: 200, headers });
  await cache.put(remoteUrl, out.clone());
  await cache.put(self.location.origin + CDN_PREFIX + "any/" + encodeURIComponent(remoteUrl), out.clone());
  if (localProxyUrl) await cache.put(localProxyUrl, out.clone());
  return out;
}

async function warmExternal() {
  const cache = await caches.open(CDN);
  await Promise.allSettled(
    EXTERNAL_WARM.map(async (u) => {
      let localProxy = null;
      if (u.startsWith(JSDELIVR)) localProxy = self.location.origin + CDN_PREFIX + "jsdelivr/" + u.slice(JSDELIVR.length);
      else if (u.startsWith(ESM)) localProxy = self.location.origin + CDN_PREFIX + "esm/" + u.slice(ESM.length);
      await cacheRemoteUrl(cache, u, localProxy);
    })
  );
}

async function monacoProxy(req, url) {
  const cache = await caches.open(MONACO);
  const hit = await cache.match(req);
  if (hit) return hit;

  const rel = url.pathname.slice(MONACO_PREFIX.length) + url.search;
  try {
    const res = await fetch(JSDELIVR + rel, { mode: "cors", credentials: "omit", redirect: "follow" });
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
    return new Response("/* offline monaco miss: " + rel + " */", {
      status: 503,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
}

async function cdnProxy(req, url) {
  const rest = url.pathname.slice(CDN_PREFIX.length);
  let remote;
  if (rest.startsWith("any/")) remote = decodeURIComponent(rest.slice(4));
  else if (rest.startsWith("jsdelivr/")) remote = JSDELIVR + rest.slice(9) + url.search;
  else if (rest.startsWith("esm/")) remote = ESM + rest.slice(4) + url.search;
  else if (rest.startsWith("unpkg/")) remote = UNPKG + rest.slice(6) + url.search;
  else if (rest.startsWith("cdnjs/")) remote = CDNJS + rest.slice(6) + url.search;
  else return new Response("/* invalid __cdn__ route */", { status: 400 });

  const cache = await caches.open(CDN);
  const hit = (await cache.match(req)) || (await cache.match(remote));
  if (hit) {
    const buf = await hit.clone().arrayBuffer();
    const ct = hit.headers.get("Content-Type") || "";
    const expectsHtml = /\.html?($|\?)/i.test(remote);
    if (!isHtmlPoison(buf, ct, expectsHtml)) return hit;
    await cache.delete(req).catch(() => {});
    await cache.delete(remote).catch(() => {});
  }

  try {
    const out = await cacheRemoteUrl(cache, remote, req.url);
    if (out) return out;
    return new Response("/* upstream refused or HTML returned for: " + remote + " */", {
      status: 502,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  } catch {
    return new Response("/* offline cache miss for: " + remote + " */", {
      status: 503,
      headers: { "Content-Type": "application/javascript; charset=utf-8" },
    });
  }
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    if (url.pathname.startsWith(MONACO_PREFIX)) {
      event.respondWith(monacoProxy(req, url));
      return;
    }
    if (url.pathname.startsWith(CDN_PREFIX)) {
      event.respondWith(cdnProxy(req, url));
      return;
    }

    // Dynamically caches ANY file under /dreamland/ (including any template .tsx/.jsx/.json)
    if (url.pathname.startsWith(BASE_PATH)) {
      event.respondWith(
        (async () => {
          const cache = await caches.open(SHELL);
          const isPlayground =
            url.pathname.endsWith("/playground") || url.pathname.endsWith("/playground.html");
          const isStaticAsset = /\.(css|js|mjs|ts|tsx|jsx|json|wasm|png|svg|ico)$/i.test(url.pathname);

          const lookupKeys = isPlayground
            ? [
                new URL("./playground", self.location.href).href,
                new URL("./playground.html", self.location.href).href,
              ]
            : [url.href, url.pathname];

          try {
            const net = await fetch(url.href, { redirect: "follow", cache: "no-store" });
            if (net.ok) {
              const ct = (net.headers.get("Content-Type") || "").toLowerCase();
              if (!(isStaticAsset && ct.includes("text/html"))) {
                const clean = await cleanResponse(net, mimeFor(url.pathname));
                for (const k of lookupKeys) await cache.put(k, clean.clone());
                return clean;
              }
            }
          } catch (_) {}

          for (const k of lookupKeys) {
            const hit = await cache.match(k);
            if (hit) return hit;
          }

          if (isStaticAsset) {
            return new Response("/* offline asset miss: " + url.pathname + " */", {
              status: 404,
              headers: { "Content-Type": mimeFor(url.pathname) },
            });
          }

          return (
            (await cache.match(new URL("./playground", self.location.href).href)) ||
            (await cache.match(new URL("./playground.html", self.location.href).href)) ||
            new Response("Dreamland Studio offline", { status: 503 })
          );
        })()
      );
      return;
    }
    return;
  }

  if (url.protocol === "https:" || url.protocol === "http:") {
    event.respondWith(
      (async () => {
        const cache = await caches.open(CDN);
        const hit = await cache.match(req);
        if (hit) return hit;
        try {
          const out = await cacheRemoteUrl(cache, req.url);
          if (out) return out;
          return fetch(req);
        } catch {
          return new Response("/* offline external miss: " + req.url + " */", { status: 503 });
        }
      })()
    );
  }
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
  const data = event.data;
  if (!data || typeof data !== "object") return;
  if (data.type === "WARM_DREAMLAND" || data.type === "WARM_ALL") {
    event.waitUntil(
      Promise.all([warmTemplates(), warmMonaco(), warmExternal()]).then(() => {
        event.source?.postMessage?.({ type: "WARM_DREAMLAND_OK" });
      })
    );
  }
  if (data.type === "CACHE_EXTERNAL" && typeof data.url === "string") {
    event.waitUntil(caches.open(CDN).then((cache) => cacheRemoteUrl(cache, data.url)));
  }
});
