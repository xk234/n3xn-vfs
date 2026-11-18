/* n3xn VFS SW v3.0.2-beta — root shell; /dreamland/ is independent */
const SHELL = "n3xn-shell-v3-0-2";

self.addEventListener("install", (e) => e.waitUntil(self.skipWaiting()));
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k.startsWith("n3xn-shell-") && k !== SHELL)
          .map((k) => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  )
);

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
    return; // do not intercept
  }

  // Network-first with cache fallback for same-origin
  if (url.origin !== self.location.origin) return;

  event.respondWith(
    (async () => {
      try {
        const net = await fetch(req);
        if (net.ok) {
          const cache = await caches.open(SHELL);
          cache.put(req, net.clone()).catch(() => {});
          return net;
        }
        return net;
      } catch {
        const cache = await caches.open(SHELL);
        return (
          (await cache.match(req)) ||
          (await cache.match("./index.html")) ||
          new Response("offline", { status: 503 })
        );
      }
    })()
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
