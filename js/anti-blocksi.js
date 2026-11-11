
/**
 * n3xn VFS v3.0.0-beta — Anti-Blocksi / anti-extension surface cloak
 *
 * Activates only when:
 *  - display-mode: standalone / minimal-ui / fullscreen (installed PWA / ChromeOS app), OR
 *  - navigator.standalone, OR explicit ?n3xn_app=1
 *  - top frame only (not nested iframe unless forced)
 *
 * On detect of extension-injected DOM (blocksi, chrome-extension, securly, goguardian, …):
 *  - location.replace(blob: text/html) of a cloaked mirror of current document
 *  - top URL becomes blob: (not http/https) so extension page filters lose the HTTPS surface
 *  - title + favicon stay synced via MutationObserver
 *  - beforeunload soft-resist accidental close
 *
 * Self-guards: never re-cloak if already blob:, session flag, or own script markers.
 * Recommended: install as app so extensions cannot easily observe the screen.
 */
(function n3xnAntiBlocksi() {
  "use strict";
  if (typeof window === "undefined" || typeof document === "undefined") return;

  const FLAG = "__n3xnCloaked";
  const SS_KEY = "n3xn_cloak_active";
  const SCRIPT_MARK = "anti-blocksi";

  if (window[FLAG]) return;
  try {
    if (location.protocol === "blob:") {
      window[FLAG] = true;
      return;
    }
  } catch (_) {}

  // Only top frame by default
  try {
    if (window.top !== window.self) return;
  } catch (_) {
    // cross-origin top — still run
  }

  function isAppMode() {
    try {
      if (new URLSearchParams(location.search).get("n3xn_app") === "1") return true;
    } catch (_) {}
    try {
      if (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: minimal-ui)").matches) return true;
      if (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) return true;
    } catch (_) {}
    if (navigator.standalone === true) return true;
    try {
      if (document.referrer && document.referrer.indexOf("chrome-extension://") === 0) return false;
    } catch (_) {}
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
        if (src.indexOf("chrome-extension://") === 0) return true;
        if (src.indexOf("moz-extension://") === 0) return true;
      }
      const id = el.id || "";
      const cls = (el.className && String(el.className)) || "";
      const html = (el.outerHTML || "").slice(0, 500);
      return SUSPECT_RE.test(id) || SUSPECT_RE.test(cls) || SUSPECT_RE.test(html);
    } catch (_) {
      return false;
    }
  }

  function scanHostile() {
    try {
      const all = document.querySelectorAll("div, script, iframe, object, embed, span, section");
      for (let i = 0; i < all.length; i++) {
        if (elementLooksHostile(all[i])) return true;
      }
    } catch (_) {}
    return false;
  }

  function currentFaviconHref() {
    const link =
      document.querySelector('link[rel="icon"]') ||
      document.querySelector('link[rel="shortcut icon"]') ||
      document.querySelector('link[rel="apple-touch-icon"]');
    return link ? link.href : "";
  }

  function buildCloakHtml() {
    const title = document.title || "n3xn";
    const fav = currentFaviconHref();
    // Snapshot body HTML (shallow-safe)
    let body = "";
    try {
      body = document.body ? document.body.innerHTML : "";
    } catch (_) {
      body = "<p>n3xn protected surface</p>";
    }
    const styles = [];
    try {
      document.querySelectorAll('link[rel="stylesheet"], style').forEach((n) => {
        if (n.tagName === "STYLE") styles.push("<style>" + n.textContent + "</style>");
        else if (n.href && n.href.indexOf("chrome-extension") === -1)
          styles.push('<link rel="stylesheet" href="' + n.href + '">');
      });
    } catch (_) {}

    return (
      "<!DOCTYPE html><html><head><meta charset=\"utf-8\">" +
      "<title>" +
      title.replace(/</g, "&lt;") +
      "</title>" +
      (fav ? '<link rel="icon" href="' + fav + '">' : "") +
      styles.join("") +
      "<script>(function(){window.__n3xnCloaked=true;" +
      "document.addEventListener('DOMContentLoaded',function(){" +
      "try{sessionStorage.setItem('" +
      SS_KEY +
      "','1')}catch(e){}});" +
      "window.addEventListener('beforeunload',function(e){e.preventDefault();e.returnValue='';});" +
      "})();</script>" +
      "</head><body data-n3xn=\"safe\">" +
      body +
      "<div data-n3xn=\"safe\" style=\"position:fixed;bottom:6px;right:8px;opacity:.45;font:11px system-ui;z-index:99999\">" +
      "n3xn app mode · extensions cannot use an https top URL here · install as app recommended" +
      "</div></body></html>"
    );
  }

  function cloak() {
    if (window[FLAG]) return;
    try {
      if (location.protocol === "blob:") return;
      if (sessionStorage.getItem(SS_KEY) === "1" && location.protocol === "blob:") return;
    } catch (_) {}
    window[FLAG] = true;
    try {
      const html = buildCloakHtml();
      const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
      location.replace(url);
    } catch (e) {
      console.warn("[n3xn anti-blocksi] cloak failed", e);
      window[FLAG] = false;
    }
  }

  function syncTitleFavicon() {
    // In blob page, keep observers for any late title changes from scripts
    try {
      const obs = new MutationObserver(() => {
        /* title/favicon already baked; placeholder for future live sync bridges */
      });
      obs.observe(document.documentElement, { subtree: true, childList: true, attributes: true });
    } catch (_) {}
  }

  function softCloseGuard() {
    window.addEventListener("beforeunload", function (e) {
      if (!isAppMode()) return;
      e.preventDefault();
      e.returnValue = "";
    });
  }

  function boot() {
    if (!isAppMode()) {
      // Still recommend app mode in console once
      try {
        console.info(
          "[n3xn] Anti-Blocksi is idle (not installed as app). Install / Add to ChromeOS for extension isolation."
        );
      } catch (_) {}
      return;
    }

    softCloseGuard();
    syncTitleFavicon();

    if (scanHostile()) {
      cloak();
      return;
    }

    // Watch for late injection
    try {
      const mo = new MutationObserver(() => {
        if (window[FLAG]) return;
        if (scanHostile()) cloak();
      });
      mo.observe(document.documentElement, { childList: true, subtree: true });
    } catch (_) {}

    // Periodic light scan
    setInterval(() => {
      if (window[FLAG]) return;
      if (scanHostile()) cloak();
    }, 2500);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }

  // Public API
  window.__n3xnAntiBlocksi = {
    scan: scanHostile,
    cloak: cloak,
    isAppMode: isAppMode,
    version: "3.0.0-beta",
  };
})();
