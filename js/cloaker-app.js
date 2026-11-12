/**
 * n3xn /cloaker/ — proxy-free advanced cloak launcher
 * Matches n3xn theme; blob shells; history sentinel; anti-close; Blocksi kill
 */
import { CLOAK_PRESETS, enrichPreset, presetsByGroup, gFav, listGroups } from "./cloak-presets.js";
import { VERSION_LABEL } from "./version.js";

const ALLOW =
  "accelerometer; ambient-light-sensor; autoplay; battery; bluetooth; camera; " +
  "clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; " +
  "gamepad; geolocation; gyroscope; hid; idle-detection; local-fonts; magnetometer; " +
  "microphone; midi; payment; picture-in-picture; publickey-credentials-get; " +
  "screen-wake-lock; serial; speaker-selection; storage-access; usb; " +
  "web-share; window-management; xr-spatial-tracking";

const SPOOF_KEY = "n3xn_spoof_sentinel";
const SPOOF_URL_KEY = "n3xn_spoof_url";
const LS_MODE = "n3xn_cloak_mode"; // always | on-detect | off

function $(id) {
  return document.getElementById(id);
}

function log(msg) {
  const el = $("log");
  if (!el) return;
  const t = new Date().toLocaleTimeString();
  el.textContent = `[${t}] ${msg}\n` + el.textContent.slice(0, 4000);
}

function escAttr(s) {
  return String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;");
}

function antiCloseScript(msg) {
  const m = JSON.stringify(msg || "Stay on this page?");
  return `(function(){if(window.__n3xnAtc)return;window.__n3xnAtc=1;var MSG=${m};
function rebind(){window.onbeforeunload=function(e){e.preventDefault();e.returnValue=MSG;return MSG;};
window.addEventListener("beforeunload",function(e){e.preventDefault();e.returnValue=MSG;});
try{history.pushState(0,document.title,location.href);}catch(x){}
window.addEventListener("popstate",function(){try{history.pushState(0,document.title,location.href);}catch(x){}});}
rebind();setInterval(rebind,1500);})();`;
}

function killBlocksiScript() {
  return `(function(){if(window.__abGuard)return;window.__abGuard=1;
function kill(){try{var n=document.getElementById("__blocksi_iframe_blocked__");if(n)n.remove();
n=document.getElementById("blocksi-notifications");if(n)n.remove();
document.querySelectorAll("[id*=blocksi],[class*=blocksi]").forEach(function(el){try{
var id=(el.id||"").toLowerCase();
if(id.indexOf("blocksi")!==-1||id.indexOf("blocked")!==-1)el.remove();}catch(e){}});
document.querySelectorAll("img[src*='iframe-denied'],img[src*='chrome-extension']").forEach(function(el){try{el.remove()}catch(e){}});
}catch(e){}}kill();setInterval(kill,250);
try{new MutationObserver(kill).observe(document.documentElement,{childList:true,subtree:true});}catch(e){}})();`;
}

function buildBlobShell(opts) {
  const title = opts.title || "n3xn";
  const fav = opts.favicon || gFav("https://www.google.com/", 64);
  const real = opts.realUrl || location.origin + "/";
  const atc = opts.antiClose ? `<script>${antiCloseScript(opts.atcMsg)}</script>` : "";
  const kill = `<script>${killBlocksiScript()}</script>`;
  const sync =
    `<script>(function(){window.__n3xnCloaked=true;try{window.opener=null}catch(e){}
function setFav(u){if(!u)return;["icon","shortcut icon"].forEach(function(rel){
var l=document.querySelector('link[rel="'+rel+'"]');
if(!l){l=document.createElement("link");l.rel=rel;document.head.appendChild(l);}l.href=u;});}
window.addEventListener("message",function(ev){if(!ev||!ev.data)return;
if(ev.data.type==="n3xn-title"&&typeof ev.data.title==="string")document.title=ev.data.title;
if(ev.data.type==="n3xn-favicon"&&typeof ev.data.href==="string")setFav(ev.data.href);
if(ev.data.type==="n3xn-meta"){if(typeof ev.data.title==="string")document.title=ev.data.title;
if(typeof ev.data.favicon==="string")setFav(ev.data.favicon);}});})();</script>`;

  // Note: cross-origin targets may refuse iframe (XFO). User is told in UI.
  return `<!DOCTYPE html><html data-n3xn="cloak-shell"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escAttr(title)}</title>
<link rel="shortcut icon" href="${escAttr(fav)}">
<link rel="icon" href="${escAttr(fav)}">
<style>html,body{margin:0;height:100%;background:#050508;overflow:hidden}
iframe{position:fixed;inset:0;width:100%;height:100%;border:0}
.hint{position:fixed;bottom:6px;right:8px;font:11px system-ui;color:#666;opacity:.5;pointer-events:none;z-index:2}
</style></head><body data-n3xn="safe">
<iframe id="main" data-n3xn="safe" src="${escAttr(real)}"
 allow="${ALLOW}" referrerpolicy="no-referrer"
 data-blocksi-src="https://www.google.com" data-blocksi-processed="true" loading="eager"></iframe>
<div class="hint" data-n3xn="safe">n3xn cloaker · blob top</div>
${kill}${sync}${atc}
</body></html>`;
}

function openBlobCloak(opts) {
  const html = buildBlobShell(opts);
  const url = URL.createObjectURL(new Blob([html], { type: "text/html" }));
  const w = window.open(url, "_blank");
  if (!w) {
    log("Popup blocked — allow popups for cloaker");
    return null;
  }
  try {
    w.opener = null;
  } catch (e) {}
  log("Blob cloak opened · " + (opts.title || ""));
  return w;
}

function openAboutBlankCloak(opts) {
  const pack =
    opts.spoofHash && opts.spoofUrl
      ? "about:blank#" + String(opts.spoofUrl).replace(/\s+/g, "").slice(0, 180)
      : "about:blank";
  const w = window.open(pack, "_blank");
  if (!w) {
    log("Popup blocked");
    return null;
  }
  try {
    w.opener = null;
  } catch (e) {}

  const title = opts.title || "Google";
  const fav = opts.favicon || gFav("https://www.google.com/", 64);
  const real = opts.realUrl || "/";

  function paint() {
    try {
      w.document.title = title;
      const head = w.document.head || w.document.getElementsByTagName("head")[0];
      if (head) {
        head.querySelectorAll("link[rel*=icon]").forEach((n) => n.remove());
        ["shortcut icon", "icon"].forEach((rel) => {
          const l = w.document.createElement("link");
          l.rel = rel;
          l.href = fav;
          head.appendChild(l);
        });
      }
      const body = w.document.body;
      if (!body) return false;
      body.style.cssText = "margin:0;background:#050508;overflow:hidden";
      body.innerHTML =
        `<iframe id="main" src="${escAttr(real)}" style="position:fixed;inset:0;width:100%;height:100%;border:0"
 allow="${ALLOW}" referrerpolicy="no-referrer"
 data-blocksi-src="https://www.google.com" data-blocksi-processed="true"></iframe>`;
      const s = w.document.createElement("script");
      s.textContent = killBlocksiScript() + (opts.antiClose ? antiCloseScript(opts.atcMsg) : "");
      body.appendChild(s);
      return true;
    } catch (e) {
      log("paint fail: " + e.message);
      return false;
    }
  }

  let tries = 0;
  (function wait() {
    tries++;
    if (paint()) {
      log("about:blank cloak ready · " + title);
      return;
    }
    if (tries < 40) setTimeout(wait, 25);
  })();
  return w;
}

function spoofAlive() {
  try {
    const t = parseInt(localStorage.getItem(SPOOF_KEY) || "0", 10);
    return isFinite(t) && Date.now() - t < 4000;
  } catch {
    return false;
  }
}

function openSentinel(fakeUrl) {
  const fake = fakeUrl || "https://classroom.google.com/";
  try {
    localStorage.setItem(SPOOF_URL_KEY, fake);
    localStorage.setItem(SPOOF_KEY, String(Date.now()));
  } catch (e) {}

  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>n3xn History Sentinel</title>
<style>body{margin:0;min-height:100%;background:#050508;color:#e8e8f0;font-family:JetBrains Mono,system-ui,sans-serif}
.box{max-width:520px;margin:12vh auto;padding:1.25rem;border:1px solid #1a1a28;border-radius:8px;background:#0a0a0f}
h1{font-size:1rem;margin:0 0 .75rem}p{font-size:.85rem;color:#8888a0;line-height:1.5}
code{color:#fff;word-break:break-all}.live{color:#44ff88;font-size:.75rem}</style></head>
<body><div class="box"><h1>n3xn History Spoof Sentinel</h1>
<p>Keep this tab open. Cloaked launches can tag recently-closed labels.</p>
<p>False URL: <code id="fu"></code></p>
<p class="live">SENTINEL LIVE</p></div>
<script>(function(){var K="${SPOOF_KEY}",U="${SPOOF_URL_KEY}",fake=${JSON.stringify(fake)};
document.getElementById("fu").textContent=fake;
function beat(){try{localStorage.setItem(K,String(Date.now()));localStorage.setItem(U,fake)}catch(e){}}
beat();setInterval(beat,1500);
window.addEventListener("beforeunload",function(){try{localStorage.removeItem(K)}catch(e){}});})();</script>
</body></html>`;

  const w = window.open("about:blank", "_blank");
  if (!w) {
    log("Sentinel popup blocked");
    return;
  }
  try {
    w.document.open();
    w.document.write(html);
    w.document.close();
  } catch (e) {
    log("Sentinel write fail");
  }
  log("Sentinel open · " + fake);
}

export function renderCloakerUI(root) {
  if (!root) return;
  const groups = presetsByGroup();
  const groupNames = listGroups();

  root.innerHTML = `
    <header class="settings-top" style="position:sticky;top:0">
      <strong>Cloaker <small class="n3xn-version">${VERSION_LABEL}</small></strong>
      <span class="muted" style="font-size:12px">proxy-free · blob / about:blank · education presets</span>
      <span style="flex:1"></span>
      <a href="/settings/">Settings</a>
      <a href="/">VFS</a>
    </header>
    <div class="settings-scroll">
      <div id="cloaker-body" style="max-width:980px;margin:0 auto;padding:1rem 1.25rem 3rem"></div>
    </div>`;

  // Ensure parent has scroll shell classes if opened standalone
  const body = root.querySelector("#cloaker-body") || root;
  const shell = root.querySelector(".settings-scroll") ? root : null;

  const target = root.querySelector("#cloaker-body") || root;
  target.innerHTML = `
    <section class="settings-section">
      <h2>Destination (no proxies)</h2>
      <p class="muted">Embeds the URL in a cloaked shell. Sites that send <code>X-Frame-Options</code> may refuse the iframe — use same-origin n3xn paths for full control.</p>
      <div class="form-group"><label>Real URL or path</label>
        <input type="url" id="realUrl" placeholder="https://… or /settings/" value="${location.origin}/" /></div>
      <div class="form-group"><label>Tab title</label>
        <input type="text" id="tabTitle" value="Classes" /></div>
      <div class="form-group"><label>Favicon URL</label>
        <input type="text" id="tabFav" value="${gFav("https://classroom.google.com/", 64)}" /></div>
      <div class="checks" style="display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:10px 0">
        <label class="check-row"><input type="checkbox" id="useBlob" checked/> Blob URL top (recommended vs Blocksi)</label>
        <label class="check-row"><input type="checkbox" id="antiClose" checked/> Anti tab-close</label>
        <label class="check-row"><input type="checkbox" id="spoofHash"/> about:blank# history label</label>
        <label class="check-row"><input type="checkbox" id="doubleIcon" checked/> Dual icon links</label>
      </div>
      <div class="form-group"><label>History spoof label (recently closed)</label>
        <input type="text" id="spoofUrl" value="https://classroom.google.com/" /></div>
      <div class="form-group"><label>Anti-close message</label>
        <input type="text" id="atcMsg" value="Stay on this page?" /></div>
      <button type="button" class="btn primary" id="btnLaunch">Launch cloak</button>
      <button type="button" class="btn" id="btnSentinel">Open history sentinel</button>
      <button type="button" class="btn" id="btnCloakSelf">Cloak THIS n3xn tab (blob)</button>
    </section>

    <section class="settings-section">
      <h2>VFS cloak mode (anti-blocksi)</h2>
      <p class="muted">Controls <code>js/anti-blocksi.js</code> on the main app. Blocksi notifications → auto-cloak.</p>
      <select id="cloakMode">
        <option value="always">Always blob-cloak n3xn (max)</option>
        <option value="on-detect">Cloak when Blocksi detected (default balanced)</option>
        <option value="off">Off (strip overlays only)</option>
      </select>
      <p class="muted" id="modeHint" style="margin-top:8px"></p>
    </section>

    <section class="settings-section">
      <h2>Presets (${CLOAK_PRESETS.length})</h2>
      <p class="muted">Click a preset to fill title + gstatic favicon. Then Launch.</p>
      <input type="search" id="presetFilter" placeholder="Filter presets…" style="width:100%;margin-bottom:10px;padding:8px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text)" />
      <div id="presetGroups"></div>
    </section>

    <section class="settings-section">
      <h2>Log</h2>
      <pre id="log" style="white-space:pre-wrap;font-size:11px;max-height:180px;overflow:auto;color:#8fdf9f;background:rgba(0,20,8,.4);padding:10px;border-radius:8px"></pre>
    </section>
  `;

  // Mode
  const modeSel = target.querySelector("#cloakMode");
  try {
    modeSel.value = localStorage.getItem(LS_MODE) || "on-detect";
  } catch (_) {}
  const updateHint = () => {
    const v = modeSel.value;
    target.querySelector("#modeHint").textContent =
      v === "always"
        ? "Main VFS will replace top with blob shell on load (title/favicon stay synced)."
        : v === "off"
          ? "Only strip Blocksi overlays; no blob cloak."
          : "Blob cloak when #blocksi-notifications / overlays appear.";
  };
  updateHint();
  modeSel.onchange = () => {
    try {
      localStorage.setItem(LS_MODE, modeSel.value);
    } catch (_) {}
    updateHint();
    log("Cloak mode → " + modeSel.value);
  };

  // Presets UI
  const pg = target.querySelector("#presetGroups");
  function renderPresets(filter = "") {
    pg.innerHTML = "";
    const f = filter.trim().toLowerCase();
    groupNames.forEach((g) => {
      const items = groups[g].filter(
        (p) => !f || p.label.toLowerCase().includes(f) || p.title.toLowerCase().includes(f) || p.group.toLowerCase().includes(f)
      );
      if (!items.length) return;
      const h = document.createElement("h3");
      h.textContent = g;
      h.style.cssText = "margin:1rem 0 .5rem;font-size:.75rem;letter-spacing:.12em;text-transform:uppercase;color:var(--text-dim,#888)";
      pg.appendChild(h);
      const grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(160px,1fr));gap:8px";
      items.forEach((p) => {
        const b = document.createElement("button");
        b.type = "button";
        b.className = "theme-swatch";
        b.innerHTML = `<div style="display:flex;gap:8px;align-items:center"><img src="${p.favicon}" width="20" height="20" style="border-radius:4px;background:#111" alt=""/><div><strong style="font-size:12px">${p.label}</strong><div class="muted" style="font-size:10px">${p.title.slice(0, 28)}</div></div></div>`;
        b.onclick = () => {
          target.querySelector("#tabTitle").value = p.title;
          target.querySelector("#tabFav").value = p.favicon;
          target.querySelector("#spoofUrl").value = p.site;
          // If n3xn path, use as real url relative
          if (p.group === "n3xn") target.querySelector("#realUrl").value = p.site;
          log("Preset · " + p.label);
        };
        grid.appendChild(b);
      });
      pg.appendChild(grid);
    });
  }
  renderPresets();
  target.querySelector("#presetFilter").oninput = (e) => renderPresets(e.target.value);

  function collectOpts() {
    return {
      title: target.querySelector("#tabTitle").value || "Google",
      favicon: target.querySelector("#tabFav").value.trim() || gFav("https://www.google.com/", 64),
      realUrl: target.querySelector("#realUrl").value.trim() || location.origin + "/",
      antiClose: target.querySelector("#antiClose").checked,
      atcMsg: target.querySelector("#atcMsg").value,
      spoofHash: target.querySelector("#spoofHash").checked,
      spoofUrl: target.querySelector("#spoofUrl").value.trim(),
    };
  }

  target.querySelector("#btnLaunch").onclick = () => {
    const opts = collectOpts();
    if (target.querySelector("#useBlob").checked) openBlobCloak(opts);
    else openAboutBlankCloak(opts);
  };

  target.querySelector("#btnSentinel").onclick = () => {
    openSentinel(target.querySelector("#spoofUrl").value.trim());
  };

  target.querySelector("#btnCloakSelf").onclick = () => {
    const opts = collectOpts();
    opts.realUrl = location.href.split("#")[0];
    if (!opts.realUrl.includes("n3xn_framed")) {
      try {
        const u = new URL(opts.realUrl);
        u.searchParams.set("n3xn_framed", "1");
        opts.realUrl = u.toString();
      } catch (_) {}
    }
    // Replace this tab
    const html = buildBlobShell(opts);
    const blobUrl = URL.createObjectURL(new Blob([html], { type: "text/html" }));
    location.replace(blobUrl);
  };

  log(`Cloaker ready · ${CLOAK_PRESETS.length} presets · proxy-free`);
}

if (typeof window !== "undefined") {
  window.__n3xnCloaker = { renderCloakerUI, openBlobCloak, gFav, CLOAK_PRESETS };
}
