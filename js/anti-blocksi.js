/**
 * n3xn VFS v3.0.6-beta — Anti-Blocksi
 * Techniques from AB Cloak Suite: kill-loop, data-blocksi-processed, title/fav sync.
 */
(function n3xnAntiBlocksi() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  var FLAG = "__n3xnCloaked";
  var FRAMED = "n3xn_framed";
  var cloaking = false;

  if (window[FLAG]) return;

  try {
    if (new URLSearchParams(location.search).get(FRAMED) === "1") {
      window[FLAG] = true;
      window.__n3xnFramed = true;
      bootFramed();
      return;
    }
  } catch (e) {}

  try {
    if (location.protocol === "blob:") {
      window[FLAG] = true;
      return;
    }
  } catch (e) {}

  var isTop = true;
  try {
    isTop = window.top === window.self;
  } catch (e) {
    isTop = true;
  }

  var ALLOW =
    "accelerometer; ambient-light-sensor; autoplay; battery; bluetooth; camera; " +
    "clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; " +
    "gamepad; geolocation; gyroscope; hid; idle-detection; local-fonts; magnetometer; " +
    "microphone; midi; payment; picture-in-picture; publickey-credentials-get; " +
    "screen-wake-lock; serial; speaker-selection; storage-access; usb; " +
    "web-share; window-management; xr-spatial-tracking";

  function killBlocksiOverlays() {
    try {
      var n = document.getElementById("__blocksi_iframe_blocked__");
      if (n) n.remove();
      n = document.getElementById("blocksi-notifications");
      if (n) n.remove();

      document.querySelectorAll("[id*=blocksi],[class*=blocksi],[id*=__blocksi]").forEach(function (el) {
        try {
          if (el.getAttribute && el.getAttribute("data-n3xn") === "safe") return;
          var id = (el.id || "").toLowerCase();
          var cls = String(el.className || "").toLowerCase();
          if (
            id.indexOf("blocked") !== -1 ||
            id.indexOf("overlay") !== -1 ||
            id === "__blocksi_iframe_blocked__" ||
            id === "blocksi-notifications" ||
            cls.indexOf("blocksi-notifications") !== -1 ||
            cls.indexOf("blocked") !== -1 ||
            id.indexOf("blocksi") !== -1
          ) {
            el.remove();
          }
        } catch (e) {}
      });

      document
        .querySelectorAll("img[src*='iframe-denied'],img[src*='blocked_content'],img[src^='chrome-extension://']")
        .forEach(function (el) {
          try {
            el.remove();
          } catch (e) {}
        });

      document.querySelectorAll("div,section,aside").forEach(function (el) {
        try {
          if (el.getAttribute && el.getAttribute("data-n3xn") === "safe") return;
          var z = el.style && el.style.zIndex;
          if (z === "2147483647" || z === 2147483647) {
            var t = (el.textContent || "").slice(0, 240);
            if (/blocked by your administrator|This content is unavailable|iframe-denied/i.test(t)) {
              el.remove();
            }
          }
        } catch (e) {}
      });
    } catch (e) {}
  }

  function scanDetected() {
    try {
      if (document.getElementById("blocksi-notifications")) return true;
      if (document.getElementById("__blocksi_iframe_blocked__")) return true;
      if (document.querySelector("div.blocksi-notifications")) return true;
      if (document.querySelector("[id*='blocksi' i], [class*='blocksi' i]")) return true;
      if (document.querySelector("img[src*='iframe-denied'], img[src*='blocked_content']")) return true;
      var scripts = document.querySelectorAll("script[src]");
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || "";
        if (src.indexOf("anti-blocksi") !== -1) continue;
        if (/blocksi/i.test(src) || /chrome-extension:\/\/.*blocksi/i.test(src)) return true;
      }
    } catch (e) {}
    return false;
  }

  function escAttr(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/"/g, """)
      .replace(/</g, "<");
  }

  function favHref() {
    var link =
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]');
    return link ? link.href : "";
  }

  function buildShell(frameSrc, title, fav) {
    var favTags = fav
      ? '<link rel="shortcut icon" href="' +
        escAttr(fav) +
        '"><link rel="icon" id="n3xn-shell-fav" href="' +
        escAttr(fav) +
        '">' 
      : "";
    var killInline =
      "(function(){if(window.__abGuard)return;window.__abGuard=1;" +
      "function kill(){try{" +
      "var n=document.getElementById('__blocksi_iframe_blocked__');if(n)n.remove();" +
      "n=document.getElementById('blocksi-notifications');if(n)n.remove();" +
      "document.querySelectorAll('[id*=blocksi],[class*=blocksi]').forEach(function(el){try{" +
      "var id=(el.id||'').toLowerCase();" +
      "if(id.indexOf('blocked')!==-1||id.indexOf('overlay')!==-1||id.indexOf('blocksi')!==-1)el.remove();" +
      "}catch(e){}});" +
      "document.querySelectorAll(\"img[src*='iframe-denied'],img[src*='chrome-extension']\").forEach(function(el){try{el.remove()}catch(e){}});" +
      "}catch(e){}}kill();setInterval(kill,250);" +
      "try{new MutationObserver(kill).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}})();";

    return (
      "<!DOCTYPE html><html data-n3xn=\"cloak-shell\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" +
      escAttr(title || "n3xn") +
      "</title>" +
      favTags +
      "<style>html,body{margin:0;height:100%;background:#0a0a0f;overflow:hidden}" +
      "iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#0a0a0f}" +
      ".hint{position:fixed;bottom:6px;right:8px;z-index:2;font:11px system-ui;color:#888;opacity:.4;pointer-events:none}" +
      "</style></head><body data-n3xn=\"safe\" style=\"margin:0;background:#0a0a0f;overflow:hidden\">" +
      '<iframe data-n3xn="safe" id="main" src="' +
      escAttr(frameSrc) +
      '" allow="' +
      ALLOW +
      '" referrerpolicy="no-referrer" ' +
      'data-blocksi-src="https://www.google.com" data-blocksi-processed="true" loading="eager" ' +
      'style="position:fixed;inset:0;width:100%;height:100%;border:0;margin:0"></iframe>' +
      '<div class="hint" data-n3xn="safe">n3xn · blob top · Blocksi scrub</div>' +
      "<script>(function(){window.__n3xnCloaked=true;try{window.opener=null;}catch(e){}" +
      "window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';});" +
      "function setFav(u){if(!u)return;['icon','shortcut icon'].forEach(function(rel){" +
      "var l=document.querySelector('link[rel=\"'+rel+'\"]');" +
      "if(!l){l=document.createElement('link');l.rel=rel;document.head.appendChild(l);}l.href=u;});}" +
      "window.addEventListener('message',function(ev){" +
      "if(!ev||!ev.data)return;" +
      "if(ev.data.type==='n3xn-title'&&typeof ev.data.title==='string')document.title=ev.data.title;" +
      "if(ev.data.type==='n3xn-favicon'&&typeof ev.data.href==='string')setFav(ev.data.href);" +
      "if(ev.data.type==='n3xn-meta'){" +
      "if(typeof ev.data.title==='string')document.title=ev.data.title;" +
      "if(typeof ev.data.favicon==='string')setFav(ev.data.favicon);}" +
      "});" +
      killInline +
      "})();</script></body></html>"
    );
  }

  function cloak() {
    if (window[FLAG] || cloaking || !isTop) return;
    if (location.protocol === "blob:") return;
    cloaking = true;
    window[FLAG] = true;
    try {
      var u = new URL(location.href);
      u.searchParams.set(FRAMED, "1");
      var html = buildShell(u.toString(), document.title || "n3xn", favHref());
      var blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      location.replace(blobUrl);
    } catch (e) {
      cloaking = false;
      window[FLAG] = false;
    }
  }

  function publishMeta() {
    try {
      if (!window.__n3xnFramed || !window.parent) return;
      var fav = favHref();
      window.parent.postMessage(
        { type: "n3xn-meta", title: document.title || "n3xn", favicon: fav },
        "*"
      );
      window.parent.postMessage({ type: "n3xn-title", title: document.title || "n3xn" }, "*");
      if (fav) window.parent.postMessage({ type: "n3xn-favicon", href: fav }, "*");
    } catch (e) {}
  }

  function bootFramed() {
    killBlocksiOverlays();
    publishMeta();
    try {
      new MutationObserver(function () {
        killBlocksiOverlays();
        publishMeta();
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    setInterval(function () {
      killBlocksiOverlays();
      publishMeta();
    }, 250);
  }

  function tick() {
    killBlocksiOverlays();
    if (!isTop || window[FLAG] || cloaking) return;
    if (scanDetected()) {
      killBlocksiOverlays();
      if (scanDetected()) cloak();
    }
  }

  function boot() {
    killBlocksiOverlays();
    try {
      new MutationObserver(tick).observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    } catch (e) {}

    var n = 0;
    var early = setInterval(function () {
      tick();
      n++;
      if (n > 80 || window[FLAG]) clearInterval(early);
    }, 250);

    setInterval(tick, 1000);

    if (isTop) {
      window.addEventListener("beforeunload", function (e) {
        if (!window[FLAG] && !scanDetected()) return;
        e.preventDefault();
        e.returnValue = "";
      });
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  try {
    killBlocksiOverlays();
  } catch (e) {}

  window.__n3xnAntiBlocksi = {
    scan: scanDetected,
    strip: killBlocksiOverlays,
    cloak: cloak,
    version: "3.0.6-beta",
    mode: "suite-kill+blob-shell",
  };
})();
