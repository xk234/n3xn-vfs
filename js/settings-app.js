
/**
 * n3xn VFS v3.0.0-beta — Settings hub (Monaco advanced + themes + editor engine)
 */
import { listThemes, applyAppTheme, loadSavedAppTheme, APP_THEMES } from "./themes-catalog.js";
import { getCompressionLevel, setCompressionLevel, LEVELS } from "./compress.js";
import { VERSION_LABEL } from "./version.js";

const MONACO_DEFAULTS = {
  fontSize: 13,
  fontFamily: "'JetBrains Mono', 'Share Tech Mono', monospace",
  lineHeight: 20,
  minimap: true,
  wordWrap: "off",
  tabSize: 2,
  cursorBlinking: "smooth",
  smoothScrolling: true,
  renderWhitespace: "selection",
  lineNumbers: "on",
  editors: "monaco", // monaco | codemirror
};

function loadMonacoPrefs() {
  try {
    return { ...MONACO_DEFAULTS, ...JSON.parse(localStorage.getItem("n3xn_monaco_prefs") || "{}") };
  } catch {
    return { ...MONACO_DEFAULTS };
  }
}

function saveMonacoPrefs(p) {
  localStorage.setItem("n3xn_monaco_prefs", JSON.stringify(p));
  try {
    if (window.__n3xnEditor && window.monaco) {
      window.__n3xnEditor.updateOptions({
        fontSize: p.fontSize,
        fontFamily: p.fontFamily,
        lineHeight: p.lineHeight,
        minimap: { enabled: !!p.minimap },
        wordWrap: p.wordWrap,
        tabSize: p.tabSize,
        cursorBlinking: p.cursorBlinking,
        smoothScrolling: !!p.smoothScrolling,
        renderWhitespace: p.renderWhitespace,
        lineNumbers: p.lineNumbers,
      });
    }
  } catch (_) {}
}

/** Register many Monaco themes from APP_THEMES (best-effort colors) */
export function registerMonacoThemesFromCatalog() {
  if (!window.monaco) return;
  Object.entries(APP_THEMES).forEach(([id, t]) => {
    const mid = t.monaco || id;
    try {
      monaco.editor.defineTheme(mid, {
        base: /light|latte|paper|arctic|quiet|classic-light/i.test(id) ? "vs" : "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": t.vars["--bg"] || "#1e1e1e",
          "editor.foreground": t.vars["--text"] || "#d4d4d4",
          "editorLineNumber.foreground": t.vars["--muted"] || "#858585",
          "editorCursor.foreground": t.vars["--accent"] || "#ffffff",
          "editor.selectionBackground": (t.vars["--accent"] || "#ffffff") + "33",
          "editor.lineHighlightBackground": t.vars["--panel"] || "#2a2a2a",
        },
      });
    } catch (_) {}
  });
}

export function renderSettingsUI(root) {
  if (!root) return;
  loadSavedAppTheme();
  const prefs = loadMonacoPrefs();
  const themes = listThemes();
  const compress = getCompressionLevel();

  root.innerHTML = `
    <div class="settings-wrap">
      <header class="settings-head">
        <h1>Settings <small class="n3xn-version">${VERSION_LABEL}</small></h1>
        <p class="muted">App theme · Monaco · CodeMirror · Compression · Editor engine</p>
        <p class="muted">Install as <strong>ChromeOS / PWA app</strong> so Anti-Blocksi can isolate the surface from extensions.</p>
      </header>

      <section class="settings-section">
        <h2>App theme (${themes.length})</h2>
        <div class="theme-grid" id="theme-grid"></div>
      </section>

      <section class="settings-section">
        <h2>Editor engine</h2>
        <label><input type="radio" name="engine" value="monaco" ${
          prefs.editors === "monaco" ? "checked" : ""
        }/> Monaco (default)</label>
        <label><input type="radio" name="engine" value="codemirror" ${
          prefs.editors === "codemirror" ? "checked" : ""
        }/> CodeMirror 6 (offline via SW CDN cache)</label>
      </section>

      <section class="settings-section">
        <h2>Monaco advanced</h2>
        <div class="form-group"><label>Font size</label>
          <input type="number" id="m-fontSize" min="10" max="28" value="${prefs.fontSize}"/></div>
        <div class="form-group"><label>Font family</label>
          <input type="text" id="m-fontFamily" value="${prefs.fontFamily.replace(/"/g, "&quot;")}"/></div>
        <div class="form-group"><label>Line height</label>
          <input type="number" id="m-lineHeight" min="14" max="40" value="${prefs.lineHeight}"/></div>
        <div class="form-group"><label>Tab size</label>
          <input type="number" id="m-tabSize" min="1" max="8" value="${prefs.tabSize}"/></div>
        <div class="form-group"><label>Word wrap</label>
          <select id="m-wordWrap">
            <option value="off">off</option><option value="on">on</option><option value="wordWrapColumn">wordWrapColumn</option>
          </select></div>
        <div class="form-group"><label>Line numbers</label>
          <select id="m-lineNumbers">
            <option value="on">on</option><option value="off">off</option><option value="relative">relative</option>
          </select></div>
        <label><input type="checkbox" id="m-minimap" ${prefs.minimap ? "checked" : ""}/> Minimap</label>
        <label><input type="checkbox" id="m-smooth" ${prefs.smoothScrolling ? "checked" : ""}/> Smooth scrolling</label>
        <button type="button" class="btn primary" id="btn-save-monaco">Apply Monaco</button>
      </section>

      <section class="settings-section">
        <h2>Storage compression</h2>
        <p class="muted">Default <strong>off</strong> — v2 data stays readable. Enable only for new heavy writes.</p>
        <select id="compress-level">
          ${Object.entries(LEVELS)
            .map(
              ([k, v]) =>
                `<option value="${k}" ${k === compress ? "selected" : ""}>${v.label}</option>`
            )
            .join("")}
        </select>
      </section>

      <section class="settings-section">
        <h2>Minecraft</h2>
        <p>Offline EaglerCraft 1.8 WASM client:</p>
        <a class="btn primary" href="/mc/index.html">Open Minecraft (mc/index.html)</a>
        <p class="muted">Upload your client to <code>mc/index.html</code>. Anti-Blocksi is injected on that path.</p>
      </section>

      <section class="settings-section">
        <h2>Links</h2>
        <a class="btn" href="/connectors/">Connectors</a>
        <a class="btn" href="/">Back to VFS</a>
      </section>
    </div>
  `;

  const grid = root.querySelector("#theme-grid");
  themes.forEach((t) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "theme-swatch";
    b.textContent = t.label;
    b.onclick = () => {
      applyAppTheme(t.id);
      try {
        registerMonacoThemesFromCatalog();
        if (window.monaco) monaco.editor.setTheme(APP_THEMES[t.id].monaco);
      } catch (_) {}
    };
    grid.appendChild(b);
  });

  const ww = root.querySelector("#m-wordWrap");
  if (ww) ww.value = prefs.wordWrap;
  const ln = root.querySelector("#m-lineNumbers");
  if (ln) ln.value = prefs.lineNumbers;

  root.querySelector("#btn-save-monaco")?.addEventListener("click", () => {
    const next = {
      ...prefs,
      fontSize: Number(root.querySelector("#m-fontSize").value) || 13,
      fontFamily: root.querySelector("#m-fontFamily").value,
      lineHeight: Number(root.querySelector("#m-lineHeight").value) || 20,
      tabSize: Number(root.querySelector("#m-tabSize").value) || 2,
      wordWrap: root.querySelector("#m-wordWrap").value,
      lineNumbers: root.querySelector("#m-lineNumbers").value,
      minimap: root.querySelector("#m-minimap").checked,
      smoothScrolling: root.querySelector("#m-smooth").checked,
      editors: root.querySelector('input[name="engine"]:checked')?.value || "monaco",
    };
    saveMonacoPrefs(next);
    alert("Monaco prefs applied");
  });

  root.querySelector("#compress-level")?.addEventListener("change", (e) => {
    setCompressionLevel(e.target.value);
  });

  root.querySelectorAll('input[name="engine"]').forEach((r) => {
    r.addEventListener("change", () => {
      const p = loadMonacoPrefs();
      p.editors = r.value;
      saveMonacoPrefs(p);
    });
  });
}

if (typeof window !== "undefined") {
  window.__n3xnSettings = { renderSettingsUI, registerMonacoThemesFromCatalog, loadMonacoPrefs };
}
