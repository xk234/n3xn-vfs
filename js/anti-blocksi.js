/**
 * n3xn VFS v3.0.1-beta — Anti-Blocksi (iframe cloak, NOT app HTML snapshot)
 *
 * Why iframe (not blob-of-app-HTML):
 *  Snapshotting the live app into a blob document breaks modules, SW, auth, IDB, runners.
 *
 * Model:
 *  - Only in installed-app / standalone / ?n3xn_app=1
 *  - Top frame only; skip if already framed (?n3xn_framed=1 or parent marker)
 *  - On hostile inject (Blocksi / chrome-extension / securly / …):
 *      location.replace(blob:) where blob is a *thin shell* that hosts
 *      <iframe src="real-app-url?n3xn_framed=1"> with FULL allow=, NO sandbox
 *  - Top URL becomes blob: (not http/https). Real app keeps working inside iframe.
 *  - Title/favicon of shell stay synced from iframe when possible.
 */

(function n3xnAntiBlocksiIframe() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const FLAG = "__n3xnCloaked";
  const FRAMED_PARAM = "n3xn_framed";
  const SCRIPT_MARK = "anti-blocksi";

  if (window[FLAG]) return;

  // Already inside our cloak iframe — do nothing
  try {
    const q = new URLSearchParams(location.search);
    if (q.get(FRAMED_PARAM) === "1") {
      window[FLAG] = true;
      window.__n3xnFramed = true;
      return;
    }
  } catch (_) {}

  try {
    if (window.top !== window.self) {
      // Nested frame that is not our framed app — stay idle
      return;
    }
  } catch (_) {}

  try {
    if (location.protocol === "blob:") {
      window[FLAG] = true;
      return;
    }
  } catch (_) {}

  const ALLOW_ALL =
    "accelerometer; ambient-light-sensor; autoplay; battery; bluetooth; camera; " +
    "clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; " +
    "gamepad; geolocation; gyroscope; hid; idle-detection; local-fonts; magnetometer; " +
    "microphone; midi; payment; picture-in-picture; publickey-credentials-get; " +
    "screen-wake-lock; serial; speaker-selection; storage-access; usb; " +
    "web-share; window-management; xr-spatial-tracking";

  function isAppMode() {
    try {
      if (new URLSearchParams(location.search).get("n3xn_app") === "1") return true;
    } catch (_) {}
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    } catch (_) {}
    if (navigator.standalone === true) return true;
    return false;
  }

  const SUSPECT_RE =
    /blocksi|securly|goguardian|chromebook.?app|chrome-extension|moz-extension|safari-extension|ms-browser-extension|iboss|lightspeed|hapara|classroom\.cloud|go.?guardian/i;

  function elementLooksHostile(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (el.getAttribute && el.getAttribute("data-n3xn") === "safe") return false;
      if (el.tagName === "SCRIPT") {
        const src = el.src || el.getAttribute("src") || "";
        if (src.indexOf(SCRIPT_MARK) !== -1) return false;
        if (/^(chrome|moz|safari|ms-browser)-extension:\/\//i.test(src)) return true;
      }
      const id = el.id || "";
      const cls = (el.className && String(el.className)) || "";
      const html = (el.outerHTML || "").slice(0, 400);
      return SUSPECT_RE.test(id) || SUSPECT_RE.test(cls) || SUSPECT_RE.test(html);
    } catch (_) {
      return false;
    }
  }

  function scanHostile() {
    try {
      const nodes = document.querySelectorAll("div, script, iframe, object, embed, span, section");
      for (let i = 0; i < nodes.length; i++) {
        if (elementLooksHostile(nodes[i])) return true;
      }
    } catch (_) {}
    return false;
  }

  function appUrlForFrame() {
    // Real app origin+path — NOT a blob snapshot
    const u = new URL(location.href);
    u.searchParams.set(FRAMED_PARAM, "1");
    // Avoid nesting n3xn_app loop noise
    return u.toString();
  }

  function shellHtml(frameSrc, title, favHref) {
    const t = (title || "n3xn").replace(/</g, "<");
    const fav = favHref
      ? '<link rel="icon" href="' + String(favHref).replace(/"/g, "") + '">'
      : "";
    return (
      "<!DOCTYPE html><html data-n3xn=\"cloak-shell\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" +
      t +
      "</title>" +
      fav +
      "<style>html,body{margin:0;height:100%;background:#0a0a0f;overflow:hidden}" +
      "iframe{position:fixed;inset:0;width:100%;height:100%;border:0;margin:0;padding:0;background:#0a0a0f}" +
      ".hint{position:fixed;bottom:6px;right:8px;z-index:2;font:11px system-ui;color:#8888a0;opacity:.5;pointer-events:none}" +
      "</style></head><body data-n3xn=\"safe\">" +
      "<iframe data-n3xn=\"safe\" id=\"n3xn-app-frame\" src=\"" +
      frameSrc.replace(/"/g, """) +
      "\" allow=\"" +
      ALLOW_ALL +
      "\" referrerpolicy=\"no-referrer-when-downgrade\"></iframe>" +
      "<div class=\"hint\" data-n3xn=\"safe\">n3xn app shell · blob top URL · install-as-app recommended · Blocksi not welcome</div>" +
      "<script>(function(){window.__n3xnCloaked=true;" +
      "window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';});" +
      "try{var f=document.getElementById('n3xn-app-frame');" +
      "window.addEventListener('message',function(ev){" +
      "if(!ev||!ev.data||ev.data.type!=='n3xn-title')return;" +
      "if(typeof ev.data.title==='string')document.title=ev.data.title;" +
      "});}catch(e){}" +
      "})();</script></body></html>"
    );
  }

  function favHref() {
    const link =
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]');
    return link ? link.href : "";
  }

  function cloakWithIframe() {
    if (window[FLAG]) return;
    window[FLAG] = true;
    try {
      const src = appUrlForFrame();
      const html = shellHtml(src, document.title || "n3xn", favHref());
      const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      location.replace(blobUrl);
    } catch (e) {
      console.warn("[n3xn anti-blocksi] iframe cloak failed", e);
      window[FLAG] = false;
    }
  }

  function softCloseGuard() {
    window.addEventListener("beforeunload", function (e) {
      if (!isAppMode()) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  // Framed app can post title up (optional)
  function publishTitle() {
    try {
      if (window.__n3xnFramed && window.parent) {
        window.parent.postMessage({ type: "n3xn-title", title: document.title }, "*");
      }
    } catch (_) {}
  }

  function boot() {
    if (window.__n3xnFramed) {
      publishTitle();
      return;
    }
    if (!isAppMode()) {
      try {
        console.info(
          "[n3xn] Anti-Blocksi idle (not installed as app). Install as ChromeOS/PWA app for extension isolation."
        );
      } catch (_) {}
      return;
    }

    softCloseGuard();

    if (scanHostile()) {
      cloakWithIframe();
      return;
    }

    try {
      const mo = new MutationObserver(function () {
        if (window[FLAG]) return;
        if (scanHostile()) cloakWithIframe();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}

    setInterval(function () {
      if (window[FLAG]) return;
      if (scanHostile()) cloakWithIframe();
    }, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.__n3xnAntiBlocksi = {
    scan: scanHostile,
    cloak: cloakWithIframe,
    isAppMode: isAppMode,
    version: "3.0.1-beta",
    mode: "iframe-shell",
  };
})();
