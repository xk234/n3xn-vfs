/**
 * n3xn MC loader-2 — EPW assets pointer (no embedded base64).
 * Binary: mc/assets.epw (raw EAG$WASM). Pages serves Brotli on the wire.
 * launch.js may set assetsURI to a blob: ObjectURL after Cache API prefetch.
 */
"use strict";
(function () {
  window.eaglercraftXOpts = window.eaglercraftXOpts || {};
  var href;
  try {
    var scripts = document.getElementsByTagName("script");
    var here = scripts[scripts.length - 1];
    var base = (here && here.src) || location.href;
    href = new URL("assets.epw", base).href;
  } catch (e) {
    href = "assets.epw";
  }
  if (!window.eaglercraftXOpts.assetsURI || String(window.eaglercraftXOpts.assetsURI).indexOf("blob:") !== 0) {
    window.eaglercraftXOpts.assetsURI = href;
  }
  console.info("[n3xn-mc] assetsURI →", window.eaglercraftXOpts.assetsURI);
})();
