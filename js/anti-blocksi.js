/**
 * n3xn VFS v3.0.3-beta — Anti-Blocksi (iframe shell, no app snapshot)
 *
 * Detects Blocksi via #blocksi-notifications.blocksi-notifications and related markers.
 * Cloak only in installed-app mode. No re-entry loops.
 */
(function n3xnAntiBlocksi() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var FLAG = "__n3xnCloaked";
  var FRAMED = "n3xn_framed";
  if (window[FLAG]) return;

  try {
    if (new URLSearchParams(location.search).get(FRAMED) === "1") {
      window[FLAG] = true;
      window.__n3xnFramed = true;
      return;
    }
  } catch (e) {}

  try {
    if (window.top !== window.self) return;
  } catch (e) {}

  try {
    if (location.protocol === "blob:") {
      window[FLAG] = true;
      return;
    }
  } catch (e) {}

  var ALLOW =
    "accelerometer; ambient-light-sensor; autoplay; battery; bluetooth; camera; " +
    "clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; " +
    "gamepad; geolocation; gyroscope; hid; idle-detection; local-fonts; magnetometer; " +
    "microphone; midi; payment; picture-in-picture; publickey-credentials-get; " +
    "screen-wake-lock; serial; speaker-selection; storage-access; usb; " +
    "web-share; window-management; xr-spatial-tracking";

  function isAppMode() {
    try {
      if (new URLSearchParams(location.search).get("n3xn_app") === "1") return true;
    } catch (e) {}
    try {
      if (window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia("(display-mode: minimal-ui)").matches) return true;
      if (window.matchMedia("(display-mode: fullscreen)").matches) return true;
    } catch (e) {}
    return navigator.standalone === true;
  }

  function scanBlocksi() {
    try {
      if (document.getElementById("blocksi-notifications")) return true;
      if (document.querySelector("div.blocksi-notifications")) return true;
      if (document.querySelector("[id*='blocksi' i], [class*='blocksi' i]")) return true;
      if (document.querySelector("[id*='securly' i], [class*='securly' i]")) return true;
      if (document.querySelector("[id*='goguardian' i], [class*='goguardian' i]")) return true;
      var scripts = document.querySelectorAll("script[src]");
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || "";
        if (src.indexOf("anti-blocksi") !== -1) continue;
        if (/chrome-extension:|moz-extension:|blocksi|securly|goguardian/i.test(src)) return true;
      }
    } catch (e) {}
    return false;
  }

  function escAttr(s) {
    return String(s || "").replace(/&/g, "&").replace(/"/g, """).replace(/</g, "<");
  }

  function buildShell(frameSrc, title, fav) {
    var favTag = fav ? '<link rel="icon" href="' + escAttr(fav) + '">' : "";
    return (
      "<!DOCTYPE html><html data-n3xn=\"cloak-shell\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" +
      escAttr(title || "n3xn") +
      "</title>" +
      favTag +
      "<style>html,body{margin:0;height:100%;background:#0a0a0f;overflow:hidden}" +
      "iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#0a0a0f}" +
      ".hint{position:fixed;bottom:6px;right:8px;z-index:2;font:11px system-ui;color:#888;opacity:.5;pointer-events:none}" +
      "</style></head><body data-n3xn=\"safe\">" +
      '<iframe data-n3xn="safe" id="n3xn-app-frame" src="' +
      escAttr(frameSrc) +
      '" allow="' +
      ALLOW +
      '" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
      '<div class="hint" data-n3xn="safe">n3xn app shell · blob top · Blocksi not welcome</div>' +
      "<script>(function(){window.__n3xnCloaked=true;" +
      "window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';});" +
      "window.addEventListener('message',function(ev){" +
      "if(ev&&ev.data&&ev.data.type==='n3xn-title'&&typeof ev.data.title==='string')document.title=ev.data.title;" +
      "});})();</script></body></html>"
    );
  }

  var cloaking = false;
  function cloak() {
    if (window[FLAG] || cloaking) return;
    cloaking = true;
    window[FLAG] = true;
    try {
      var u = new URL(location.href);
      u.searchParams.set(FRAMED, "1");
      var favEl =
        document.querySelector('link[rel="icon"]') ||
        document.querySelector('link[rel="shortcut icon"]');
      var html = buildShell(u.toString(), document.title || "n3xn", favEl ? favEl.href : "");
      var blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      location.replace(blobUrl);
    } catch (e) {
      cloaking = false;
      window[FLAG] = false;
      try {
        if (window.__n3xnConsole) window.__n3xnConsole.warn("[anti-blocksi] cloak failed", e);
      } catch (e2) {}
    }
  }

  function boot() {
    if (window.__n3xnFramed) {
      try {
        if (window.parent) {
          window.parent.postMessage({ type: "n3xn-title", title: document.title }, "*");
        }
      } catch (e) {}
      return;
    }
    if (!isAppMode()) return;

    window.addEventListener("beforeunload", function (e) {
      e.preventDefault();
      e.returnValue = "";
    });

    if (scanBlocksi()) {
      cloak();
      return;
    }

    try {
      var mo = new MutationObserver(function () {
        if (window[FLAG] || cloaking) return;
        if (scanBlocksi()) cloak();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}

    setInterval(function () {
      if (window[FLAG] || cloaking) return;
      if (scanBlocksi()) cloak();
    }, 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  window.__n3xnAntiBlocksi = {
    scan: scanBlocksi,
    cloak: cloak,
    isAppMode: isAppMode,
    version: "3.0.3-beta",
    mode: "iframe-shell",
  };
})();
