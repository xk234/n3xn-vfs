/**
 * n3xn MC launch controller — slow countdown + options, then main()
 */
(function n3xnMcLaunch() {
  "use strict";

  var TOTAL_MS = 30000;
  var TICK_MS = 100;
  var remaining = TOTAL_MS;
  var paused = false;
  var launched = false;
  var timerId = null;

  var SERVERS = (window.__n3xnMc && window.__n3xnMc.PUBLIC_SERVERS) || [
    { name: "WebMC", addr: "wss://play.webmc.fun", motd: "WebMC Network", status: "online", players: "—" },
    { name: "TotalFreedom", addr: "wss://sus.shhnowisnottheti.me", motd: "All-op", status: "online", players: "—" },
    { name: "VanillaMC", addr: "wss://vanillamc.org", motd: "Survival", status: "online", players: "—" },
    { name: "xenaMC", addr: "wss://xena.wtf", motd: "CHAPTER 9", status: "online", players: "—" },
  ];

  function $(id) {
    return document.getElementById(id);
  }

  function setStatus(msg, kind) {
    var el = $("launchStatus");
    if (!el) return;
    el.textContent = msg;
    el.className = "status" + (kind ? " " + kind : "");
  }

  function applyRelayFromUi() {
    var custom = ($("optRelayCustom") && $("optRelayCustom").value.trim()) || "";
    var sel = ($("optRelay") && $("optRelay").value) || "wss://relay.shhnowisnottheti.me/";
    var primary = custom || sel;
    window.eaglercraftXOpts = window.eaglercraftXOpts || {};
    window.eaglercraftXOpts.container = "game_frame";
    window.eaglercraftXOpts.worldsDB = window.eaglercraftXOpts.worldsDB || "worlds-n3xn";
    var relays = [
      { addr: primary, comment: "n3xn primary", primary: true },
      { addr: "wss://relay.shhnowisnottheti.me/", comment: "Eagler Public (shh)", primary: false },
      { addr: "wss://relay.deev.is/", comment: "lax1dude #1", primary: false },
      { addr: "wss://relay.lax1dude.net/", comment: "lax1dude #2", primary: false },
    ];
    var seen = {};
    window.eaglercraftXOpts.relays = relays.filter(function (r) {
      if (seen[r.addr]) return false;
      seen[r.addr] = true;
      return true;
    });
  }

  function assetsUrl() {
    try {
      return new URL("assets.epw", location.href).href;
    } catch (e) {
      return "assets.epw";
    }
  }

  async function ensureAssetsUri() {
    var url = assetsUrl();
    window.eaglercraftXOpts = window.eaglercraftXOpts || {};
    var prefetch = $("optPrefetch") && $("optPrefetch").checked;

    if (!prefetch) {
      window.eaglercraftXOpts.assetsURI = url;
      return url;
    }

    setStatus("Prefetching EPW into Cache API…", "");
    try {
      var cache = await caches.open("n3xn-mc-epw-v1");
      var hit = await cache.match(url);
      var res = hit || (await fetch(url, { cache: "force-cache" }));
      if (!res || !res.ok) throw new Error("HTTP " + (res && res.status));
      if (!hit) await cache.put(url, res.clone());
      var buf = await res.arrayBuffer();
      if (buf.byteLength < 1024) throw new Error("EPW too small (" + buf.byteLength + " bytes)");
      var blob = new Blob([buf], { type: "application/octet-stream" });
      var obj = URL.createObjectURL(blob);
      window.eaglercraftXOpts.assetsURI = obj;
      setStatus("EPW ready (" + Math.round(buf.byteLength / 1048576) + " MB blob) · launching…", "ok");
      return obj;
    } catch (e) {
      console.warn("[n3xn-mc] prefetch failed, using URL", e);
      window.eaglercraftXOpts.assetsURI = url;
      setStatus("Prefetch failed — using direct URL. " + (e && e.message ? e.message : e), "err");
      return url;
    }
  }

  async function doLaunch() {
    if (launched) return;
    launched = true;
    if (timerId) clearInterval(timerId);
    ["btnLaunchNow", "btnPause", "btnReset"].forEach(function (id) {
      var b = $(id);
      if (b) b.disabled = true;
    });
    applyRelayFromUi();
    setStatus("Preparing assets…", "");
    try {
      await ensureAssetsUri();
    } catch (e) {
      setStatus("Asset error: " + e, "err");
      launched = false;
      return;
    }
    var screen = $("launch_countdown_screen");
    if (screen && screen.parentNode) screen.parentNode.removeChild(screen);
    document.body.style.backgroundColor = "black";
    document.body.style.overflow = "hidden";
    if (typeof window.main === "function") {
      setStatus("Starting EaglercraftX…", "ok");
      window.main();
    } else {
      alert("Loader not ready (window.main missing). Check loader-1.js / loader-2.js.");
      launched = false;
    }
  }

  function renderTick() {
    var sec = Math.max(0, Math.ceil(remaining / 1000));
    var num = $("launchCountdownNumber");
    var bar = $("launchCountdownProgress");
    if (num) num.textContent = String(sec);
    if (bar) {
      var pct = Math.min(100, ((TOTAL_MS - remaining) / TOTAL_MS) * 100);
      bar.style.width = pct.toFixed(1) + "%";
    }
  }

  function tick() {
    if (paused || launched) return;
    remaining -= TICK_MS;
    if (remaining <= 0) {
      remaining = 0;
      renderTick();
      var auto = !$("optAutoLaunch") || $("optAutoLaunch").checked;
      if (auto) doLaunch();
      else {
        paused = true;
        setStatus("Timer finished — press Launch now when ready.", "ok");
      }
      return;
    }
    renderTick();
  }

  function copyText(t) {
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) return navigator.clipboard.writeText(t);
    } catch (_) {}
    try {
      var ta = document.createElement("textarea");
      ta.value = t;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    } catch (_) {}
    return Promise.resolve();
  }

  function buildServers() {
    var host = $("serverList");
    if (!host) return;
    host.innerHTML = "";
    SERVERS.forEach(function (s) {
      var card = document.createElement("div");
      card.className = "server-card";
      card.setAttribute("data-n3xn", "safe");
      var on = s.status === "online";
      card.innerHTML =
        '<div class="top"><span class="dot' +
        (on ? " on" : "") +
        '"></span><span class="name"></span><span class="players"></span></div>' +
        '<div class="motd"></div>' +
        '<div class="addr-row"><code></code><button type="button" class="btn copy">Copy</button></div>';
      card.querySelector(".name").textContent = s.name;
      card.querySelector(".players").textContent = s.players || "";
      card.querySelector(".motd").textContent = s.motd || "";
      card.querySelector("code").textContent = s.addr;
      card.querySelector(".copy").onclick = function () {
        var btn = this;
        copyText(s.addr).then(function () {
          btn.textContent = "Copied";
          setTimeout(function () {
            btn.textContent = "Copy";
          }, 1000);
        });
      };
      host.appendChild(card);
    });
  }

  function bind() {
    var pathEl = $("assetsPath");
    if (pathEl) pathEl.textContent = "assets.epw";

    $("btnLaunchNow") && ($("btnLaunchNow").onclick = function () { doLaunch(); });
    $("btnPause") &&
      ($("btnPause").onclick = function () {
        paused = !paused;
        this.textContent = paused ? "Resume timer" : "Pause timer";
        setStatus(paused ? "Timer paused." : "Timer running.", "");
      });
    $("btnReset") &&
      ($("btnReset").onclick = function () {
        remaining = TOTAL_MS;
        paused = false;
        var p = $("btnPause");
        if (p) p.textContent = "Pause timer";
        renderTick();
        setStatus("Timer reset to 30s.", "");
      });

    var skip = $("skipCountdown");
    if (skip) skip.onclick = function () { doLaunch(); };

    buildServers();
    renderTick();
    timerId = setInterval(tick, TICK_MS);
    setStatus("Configure relay & servers, then launch — or wait for the timer.", "");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", bind);
  else bind();
})();
