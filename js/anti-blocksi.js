/**
 * n3xn VFS v3.0.5-beta — Anti-Blocksi (aggressive)
 * Always strip Blocksi overlays. Cloak only when detected.
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

  function isHostileNode(el) {
    if (!el || el.nodeType !== 1) return false;
    try {
      if (el.getAttribute && el.getAttribute("data-n3xn") === "safe") return false;
      var id = el.id || "";
      var cls = (typeof el.className === "string" ? el.className : "") || "";
      if (id === "blocksi-notifications" || id === "__blocksi_iframe_blocked__") return true;
      if (/blocksi/i.test(id) || /blocksi/i.test(cls)) return true;
      if (/__blocksi/i.test(id)) return true;
      if (el.tagName === "IMG") {
        var src = el.getAttribute("src") || el.src || "";
        if (/chrome-extension:.*blocksi|iframe-denied|blocked_content/i.test(src)) return true;
      }
      if (el.tagName === "SCRIPT") {
        var s = el.src || el.getAttribute("src") || "";
        if (s.indexOf("anti-blocksi") !== -1) return false;
        if (/chrome-extension:|moz-extension:|blocksi/i.test(s)) return true;
      }
      if (el.style && (el.style.zIndex === "2147483647" || el.style.zIndex === 2147483647)) {
        var t = (el.textContent || "").slice(0, 200);
        if (/blocked by your administrator|This content is unavailable/i.test(t)) return true;
      }
    } catch (e) {}
    return false;
  }

  function stripHostile() {
    var removed = 0;
    try {
      ["blocksi-notifications", "__blocksi_iframe_blocked__"].forEach(function (id) {
        var n = document.getElementById(id);
        if (n) {
          try {
            n.remove();
            removed++;
          } catch (e) {}
        }
      });
      document
        .querySelectorAll(
          "[id*='blocksi' i], [class*='blocksi' i], [id*='__blocksi'], img[src*='iframe-denied'], img[src*='blocked_content'], img[src*='chrome-extension']"
        )
        .forEach(function (el) {
          if (isHostileNode(el) || (el.id && /blocksi/i.test(el.id))) {
            try {
              el.remove();
              removed++;
            } catch (e) {}
          }
        });
      document.querySelectorAll("div").forEach(function (el) {
        if (isHostileNode(el)) {
          try {
            el.remove();
            removed++;
          } catch (e) {}
        }
      });
    } catch (e) {}
    return removed;
  }

  function scanDetected() {
    try {
      if (document.getElementById("blocksi-notifications")) return true;
      if (document.getElementById("__blocksi_iframe_blocked__")) return true;
      if (document.querySelector("div.blocksi-notifications")) return true;
      if (document.querySelector("[id*='blocksi' i], [class*='blocksi' i]")) return true;
      if (document.querySelector("img[src*='iframe-denied'], img[src*='blocked_content']")) return true;
      if (document.querySelector("img[src^='chrome-extension://']")) return true;
      var scripts = document.querySelectorAll("script[src]");
      for (var i = 0; i < scripts.length; i++) {
        var src = scripts[i].src || "";
        if (src.indexOf("anti-blocksi") !== -1) continue;
        if (/blocksi|chrome-extension:\/\/.*blocksi/i.test(src)) return true;
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
    var favTag = fav ? '<link rel="icon" id="n3xn-shell-fav" href="' + escAttr(fav) + '">' : "";
    return (
      "<!DOCTYPE html><html data-n3xn=\"cloak-shell\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" +
      escAttr(title || "n3xn") +
      "</title>" +
      favTag +
      "<style>html,body{margin:0;height:100%;background:#0a0a0f;overflow:hidden}" +
      "iframe{position:fixed;inset:0;width:100%;height:100%;border:0;background:#0a0a0f}" +
      ".hint{position:fixed;bottom:6px;right:8px;z-index:2;font:11px system-ui;color:#888;opacity:.45;pointer-events:none}" +
      "</style></head><body data-n3xn=\"safe\">" +
      '<iframe data-n3xn="safe" id="n3xn-app-frame" src="' +
      escAttr(frameSrc) +
      '" allow="' +
      ALLOW +
      '" referrerpolicy="no-referrer-when-downgrade"></iframe>' +
      '<div class="hint" data-n3xn="safe">n3xn cloak · blob top · Blocksi stripped</div>' +
      "<script>(function(){" +
      "window.__n3xnCloaked=true;" +
      "window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';});" +
      "function setFav(u){if(!u)return;var l=document.getElementById('n3xn-shell-fav');" +
      "if(!l){l=document.createElement('link');l.id='n3xn-shell-fav';l.rel='icon';document.head.appendChild(l);}l.href=u;}" +
      "window.addEventListener('message',function(ev){" +
      "if(!ev||!ev.data)return;" +
      "if(ev.data.type==='n3xn-title'&&typeof ev.data.title==='string')document.title=ev.data.title;" +
      "if(ev.data.type==='n3xn-favicon'&&typeof ev.data.href==='string')setFav(ev.data.href);" +
      "if(ev.data.type==='n3xn-meta'){" +
      "if(typeof ev.data.title==='string')document.title=ev.data.title;" +
      "if(typeof ev.data.favicon==='string')setFav(ev.data.favicon);}" +
      "});" +
      "function scrub(){try{['blocksi-notifications','__blocksi_iframe_blocked__'].forEach(function(id){" +
      "var n=document.getElementById(id);if(n)n.remove();});" +
      "document.querySelectorAll(\"[id*='blocksi' i],[class*='blocksi' i]\").forEach(function(el){try{el.remove()}catch(e){}});" +
      "}catch(e){}}scrub();" +
      "new MutationObserver(scrub).observe(document.documentElement,{childList:true,subtree:true});" +
      "setInterval(scrub,800);" +
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
    stripHostile();
    publishMeta();
    try {
      new MutationObserver(function () {
        stripHostile();
        publishMeta();
      }).observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["href"],
      });
    } catch (e) {}
    setInterval(function () {
      stripHostile();
      publishMeta();
    }, 1000);
  }

  function tick() {
    stripHostile();
    if (!isTop || window[FLAG] || cloaking) return;
    if (scanDetected()) {
      stripHostile();
      if (scanDetected()) cloak();
    }
  }

  function boot() {
    stripHostile();
    try {
      new MutationObserver(function () {
        tick();
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}

    var n = 0;
    var early = setInterval(function () {
      tick();
      n++;
      if (n > 40 || window[FLAG]) clearInterval(early);
    }, 250);

    setInterval(tick, 1500);

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
    stripHostile();
  } catch (e) {}

  window.__n3xnAntiBlocksi = {
    scan: scanDetected,
    strip: stripHostile,
    cloak: cloak,
    version: "3.0.5-beta",
    mode: "iframe-shell+scrub",
  };
})();
