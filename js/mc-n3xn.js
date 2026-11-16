/**
 * n3xn Minecraft overlay v3.0.10-beta
 * Eagler Public relays primary + public server list (copy IP)
 */
(function n3xnMc() {
  "use strict";
  if (window.__n3xnMcBooted) return;
  window.__n3xnMcBooted = true;

  var PUBLIC_RELAYS = [
    { addr: "wss://relay.deev.is/", comment: "Eagler Public · shared worlds (primary)", primary: true },
    { addr: "wss://relay.lax1dude.net/", comment: "Eagler Public #2", primary: false },
    { addr: "wss://relay.shhnowisnottheti.me/", comment: "Eagler Public #3 (ayunami)", primary: false },
  ];

  var PUBLIC_SERVERS = [
    { name: "WebMC", addr: "wss://play.webmc.fun", motd: "WebMC | [1.7 - 26.2] dsc.webmc.fun", status: "online", players: "24/500" },
    { name: "TotalFreedom", addr: "wss://sus.shhnowisnottheti.me", motd: "The original all-op server!", status: "online", players: "47/200" },
    { name: "VanillaMC", addr: "wss://vanillamc.org", motd: "VanillaMC 1.8x-1.21x Survival", status: "online", players: "115/600" },
    { name: "xenaMC", addr: "wss://xena.wtf", motd: "xenaMC | CHAPTER 9", status: "online", players: "156/1000" },
    { name: "Arch", addr: "wss://mc.arch.lol", motd: "—", status: "offline", players: "—" },
    { name: "Zentic", addr: "wss://zentic.cc", motd: "—", status: "offline", players: "—" },
    { name: "Zyth", addr: "wss://mc.zyth.me", motd: "—", status: "offline", players: "—" },
    { name: "AsianF4rmer", addr: "wss://asianf4rmer.minecraft.pe", motd: "—", status: "offline", players: "—" },
    { name: "Aeon", addr: "wss://aeon-network.net", motd: "—", status: "offline", players: "—" },
    { name: "Adderall", addr: "wss://adderall.ir", motd: "—", status: "offline", players: "—" },
    { name: "Lamplifesteal", addr: "wss://mc.lamplifesteal.xyz", motd: "—", status: "offline", players: "—" },
    { name: "Voidsent", addr: "wss://mc.voidsent.net", motd: "—", status: "offline", players: "—" },
    { name: "DSSX", addr: "wss://mc.dssx.uk", motd: "—", status: "offline", players: "—" },
    { name: "Tuff", addr: "wss://tuff.ws", motd: "—", status: "offline", players: "—" },
  ];

  function applyRelays() {
    try {
      window.eaglercraftXOpts = window.eaglercraftXOpts || {};
      window.eaglercraftXOpts.container = window.eaglercraftXOpts.container || "game_frame";
      window.eaglercraftXOpts.worldsDB = window.eaglercraftXOpts.worldsDB || "worlds";
      window.eaglercraftXOpts.relays = PUBLIC_RELAYS.map(function (r) {
        return { addr: r.addr, comment: r.comment, primary: !!r.primary };
      });
      console.info("[n3xn-mc] relays → Eagler Public primary", PUBLIC_RELAYS[0].addr);
    } catch (e) {
      console.warn("[n3xn-mc] relay patch failed", e);
    }
  }

  function brandTitle() {
    try {
      document.title = "n3xn · Minecraft 1.8 (EaglercraftX WASM-GC)";
    } catch (_) {}
  }

  function killBlocksiLight() {
    try {
      var n = document.getElementById("blocksi-notifications");
      if (n) n.remove();
      n = document.getElementById("__blocksi_iframe_blocked__");
      if (n) n.remove();
      document.querySelectorAll("[id*=blocksi],[class*=blocksi]").forEach(function (el) {
        try {
          el.remove();
        } catch (e) {}
      });
    } catch (e) {}
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

  function buildPanel() {
    if (document.getElementById("n3xn-mc-panel")) return;
    var panel = document.createElement("div");
    panel.id = "n3xn-mc-panel";
    panel.setAttribute("data-n3xn", "safe");
    panel.innerHTML =
      '<div data-n3xn="safe" style="position:fixed;z-index:2147483000;right:10px;bottom:10px;max-width:min(360px,94vw);max-height:min(52vh,420px);overflow:auto;' +
      "background:rgba(10,10,15,.94);color:#e8e8f0;border:1px solid #2a2a3a;border-radius:10px;font:12px/1.4 system-ui,sans-serif;" +
      'box-shadow:0 8px 28px rgba(0,0,0,.45);padding:10px 12px">' +
      '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">' +
      "<strong>n3xn · Public servers</strong>" +
      '<span style="opacity:.65;font-size:11px">copy IP · join in Multiplayer</span>' +
      '<button type="button" id="n3xn-mc-hide" style="margin-left:auto;cursor:pointer;border:1px solid #444;background:#1a1a28;color:#fff;border-radius:6px;padding:2px 8px">Hide</button>' +
      "</div>" +
      '<p style="margin:0 0 8px;opacity:.75;font-size:11px">This client may not direct-connect. Copy WSS, then Direct Connect / Add Server in-game. Shared worlds use <b>Eagler Public</b> (<code style="color:#9cf">wss://relay.deev.is/</code>).</p>' +
      '<div id="n3xn-mc-list"></div>' +
      '<p style="margin:8px 0 0;opacity:.55;font-size:10px">Anti-Blocksi · install as ChromeOS app for max cloak</p>' +
      "</div>";
    document.documentElement.appendChild(panel);

    var list = panel.querySelector("#n3xn-mc-list");
    PUBLIC_SERVERS.forEach(function (s) {
      var row = document.createElement("div");
      row.setAttribute("data-n3xn", "safe");
      row.style.cssText = "display:flex;flex-direction:column;gap:2px;padding:6px 0;border-top:1px solid #1e1e2a";
      var online = s.status === "online";
      row.innerHTML =
        '<div style="display:flex;align-items:center;gap:6px">' +
        '<span style="width:8px;height:8px;border-radius:50%;background:' +
        (online ? "#44ff88" : "#666") +
        '"></span><strong>' +
        s.name +
        '</strong><span style="opacity:.6;margin-left:auto;font-size:11px">' +
        s.players +
        "</span></div>" +
        '<div style="opacity:.7;font-size:11px">' +
        (s.motd || "") +
        "</div>" +
        '<div style="display:flex;gap:6px;align-items:center;margin-top:2px">' +
        '<code style="font-size:10px;color:#9cf;word-break:break-all">' +
        s.addr +
        '</code><button type="button" data-copy="' +
        s.addr +
        '" style="margin-left:auto;cursor:pointer;border:1px solid #444;background:#222;color:#fff;border-radius:4px;padding:2px 6px;font-size:11px">Copy</button></div>';
      list.appendChild(row);
    });

    panel.querySelector("#n3xn-mc-hide").onclick = function () {
      panel.style.display = "none";
      var show = document.createElement("button");
      show.id = "n3xn-mc-show";
      show.setAttribute("data-n3xn", "safe");
      show.textContent = "n3xn servers";
      show.style.cssText =
        "position:fixed;z-index:2147483000;right:10px;bottom:10px;cursor:pointer;border:1px solid #444;background:#0a0a0f;color:#fff;border-radius:8px;padding:6px 10px;font:12px system-ui";
      show.onclick = function () {
        panel.style.display = "block";
        show.remove();
      };
      document.documentElement.appendChild(show);
    };

    panel.addEventListener("click", function (ev) {
      var t = ev.target;
      if (t && t.getAttribute && t.getAttribute("data-copy")) {
        var ip = t.getAttribute("data-copy");
        copyText(ip).then(function () {
          t.textContent = "Copied";
          setTimeout(function () {
            t.textContent = "Copy";
          }, 1200);
        });
      }
    });
  }

  applyRelays();
  brandTitle();
  killBlocksiLight();
  setInterval(killBlocksiLight, 2000);
  setTimeout(applyRelays, 100);
  setTimeout(applyRelays, 1000);
  setTimeout(applyRelays, 3000);

  function onReady() {
    buildPanel();
    applyRelays();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onReady);
  else onReady();
  window.addEventListener("load", function () {
    applyRelays();
    buildPanel();
  });

  window.__n3xnMc = { PUBLIC_RELAYS: PUBLIC_RELAYS, PUBLIC_SERVERS: PUBLIC_SERVERS, applyRelays: applyRelays };
})();
