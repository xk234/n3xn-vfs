/**
 * n3xn VFS v3.0.12-beta — Anti-Blocksi
 * Modes: always | on-detect | off
 * Installed app / standalone → force always cloak (+ about:blank if blob blocked)
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

  function isInstalledApp() {
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: minimal-ui)").matches) return true;
      if (window.navigator.standalone === true) return true;
      if (document.referrer && document.referrer.indexOf("android-app://") === 0) return true;
    } catch (e) {}
    return false;
  }

  function cloakMode() {
    try {
      if (isInstalledApp()) {
        var forced = localStorage.getItem("n3xn_cloak_mode");
        if (forced === "off") return "off";
        return "always";
      }
      return localStorage.getItem("n3xn_cloak_mode") || "always";
    } catch (e) {
      return "always";
    }
  }

  function killBlocksiOverlays() {
    try {
      var n = document.getElementById("__blocksi_iframe_blocked__");
      if (n) n.remove();
      n = document.getElementById("blocksi-notifications");
      if (n) n.remove();
      document.querySelectorAll("[id*=blocksi],[class*=blocksi],[id*=__blocksi]").forEach(function (el) {
        try {
          if (el.getAttribute && el.getAttribute("data-n3xn") === "safe") return;
          el.remove();
        } catch (e) {}
      });
      document
        .querySelectorAll("img[src*='iframe-denied'],img[src*='blocked_content'],img[src^='chrome-extension://']")
        .forEach(function (el) {
          try {
            el.remove();
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
    } catch (e) {}
    return false;
  }

  function escAttr(s) {
    return String(s || "")
      .replace(/&/g, "&")
      .replace(/"/g, """)
      .replace(/</g, "<")
      .replace(/>/g, ">");
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
        '"><link rel="icon" href="' +
        escAttr(fav) +
        '">' 
      : "";
    var killInline =
      "(function(){if(window.__abGuard)return;window.__abGuard=1;" +
      "function kill(){try{var n=document.getElementById('__blocksi_iframe_blocked__');if(n)n.remove();" +
      "n=document.getElementById('blocksi-notifications');if(n)n.remove();" +
      "document.querySelectorAll('[id*=blocksi],[class*=blocksi]').forEach(function(el){try{el.remove()}catch(e){}});" +
      "}catch(e){}}kill();setInterval(kill,250);" +
      "try{new MutationObserver(kill).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}})();";

    return (
      "<!DOCTYPE html><html data-n3xn=\"cloak-shell\"><head><meta charset=\"utf-8\">" +
      "<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">" +
      "<title>" +
      escAttr(title || "n3xn") +
      "</title>" +
      favTags +
      "<style>html,body{margin:0;height:100%;background:#050508;overflow:hidden}" +
      "iframe{position:fixed;inset:0;width:100%;height:100%;border:0}</style></head><body data-n3xn=\"safe\">" +
      '<iframe data-n3xn="safe" id="main" src="' +
      escAttr(frameSrc) +
      '" allow="' +
      ALLOW +
      '" referrerpolicy="no-referrer" data-blocksi-src="https://www.google.com" data-blocksi-processed="true"></iframe>' +
      "<script>(function(){window.__n3xnCloaked=true;try{window.opener=null;}catch(e){}" +
      "window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';});" +
      "function setFav(u){if(!u)return;['icon','shortcut icon'].forEach(function(rel){" +
      "var l=document.querySelector('link[rel=\"'+rel+'\"]');" +
      "if(!l){l=document.createElement('link');l.rel=rel;document.head.appendChild(l);}l.href=u;});}" +
      "window.addEventListener('message',function(ev){if(!ev||!ev.data)return;" +
      "if(ev.data.type==='n3xn-title'&&typeof ev.data.title==='string')document.title=ev.data.title;" +
      "if(ev.data.type==='n3xn-favicon'&&typeof ev.data.href==='string')setFav(ev.data.href);" +
      "if(ev.data.type==='n3xn-meta'){if(typeof ev.data.title==='string')document.title=ev.data.title;" +
      "if(typeof ev.data.favicon==='string')setFav(ev.data.favicon);}});" +
      killInline +
      "})();</script></body></html>"
    );
  }

  function cloakAboutBlank(frameSrc, title, fav) {
    try {
      var html = buildShell(frameSrc, title, fav);
      location.replace("about:blank");
      setTimeout(function () {
        try {
          document.open();
          document.write(html);
          document.close();
        } catch (e) {
          console.warn("[anti-blocksi] about:blank write failed", e);
          cloaking = false;
          window[FLAG] = false;
        }
      }, 30);
    } catch (e) {
      cloaking = false;
      window[FLAG] = false;
    }
  }

  function cloak() {
    if (window[FLAG] || cloaking || !isTop) return;
    if (location.protocol === "blob:") return;
    cloaking = true;
    window[FLAG] = true;
    try {
      var u = new URL(location.href);
      u.searchParams.set(FRAMED, "1");
      var frameSrc = u.toString();
      var title = document.title || "n3xn";
      var fav = favHref();
      var html = buildShell(frameSrc, title, fav);
      var blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      try {
        location.replace(blobUrl);
      } catch (e1) {
        console.warn("[anti-blocksi] blob replace failed, about:blank fallback", e1);
        cloakAboutBlank(frameSrc, title, fav);
      }
      setTimeout(function () {
        try {
          if (location.protocol !== "blob:" && !window.__n3xnFramed) {
            console.warn("[anti-blocksi] still on https — about:blank fallback");
            cloaking = false;
            window[FLAG] = false;
            cloakAboutBlank(frameSrc, title, fav);
          }
        } catch (e) {}
      }, 400);
    } catch (e) {
      console.warn("[anti-blocksi] cloak error", e);
      cloaking = false;
      window[FLAG] = false;
    }
  }

  function publishMeta() {
    try {
      if (!window.__n3xnFramed || !window.parent) return;
      window.parent.postMessage(
        { type: "n3xn-meta", title: document.title || "n3xn", favicon: favHref() },
        "*"
      );
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
    var mode = cloakMode();
    if (mode === "off") return;
    if (mode === "always" || scanDetected()) cloak();
  }

  function boot() {
    killBlocksiOverlays();
    try {
      new MutationObserver(tick).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}

    var mode = cloakMode();
    if (mode === "always" && isTop) {
      setTimeout(function () {
        if (!window[FLAG]) cloak();
      }, isInstalledApp() ? 20 : 50);
      if (isInstalledApp()) {
        setTimeout(function () {
          if (!window[FLAG] && location.protocol !== "blob:") {
            cloaking = false;
            cloak();
          }
        }, 500);
        setTimeout(function () {
          if (!window[FLAG] && location.protocol !== "blob:") {
            cloaking = false;
            cloak();
          }
        }, 1500);
      }
    }

    var n = 0;
    var early = setInterval(function () {
      tick();
      n++;
      if (n > 80 || window[FLAG]) clearInterval(early);
    }, 250);
    setInterval(tick, 1000);

    if (isTop) {
      window.addEventListener("beforeunload", function (e) {
        if (cloakMode() === "off" && !scanDetected()) return;
        if (!window[FLAG] && !scanDetected() && cloakMode() !== "always") return;
        e.preventDefault();
        e.returnValue = "";
      });
    }
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot);
  else boot();
  try {
    killBlocksiOverlays();
  } catch (e) {}

  window.__n3xnAntiBlocksi = {
    scan: scanDetected,
    strip: killBlocksiOverlays,
    cloak: cloak,
    mode: cloakMode,
    isInstalledApp: isInstalledApp,
    version: "3.0.12-beta",
  };
})();
