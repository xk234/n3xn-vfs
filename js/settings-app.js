/**
 * n3xn VFS v3.0.4-beta — expanded Settings (Monaco + CodeMirror advanced)
 */
import { listThemes, applyAppTheme, loadSavedAppTheme, APP_THEMES } from "./themes-catalog.js";
import { getCompressionLevel, setCompressionLevel, LEVELS } from "./compress.js";
import { VERSION_LABEL } from "./version.js";

const LS_MONACO = "n3xn_monaco_prefs";
const LS_CM = "n3xn_cm_prefs";

const MONACO_DEFAULTS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', 'Share Tech Mono', ui-monospace, monospace",
  fontLigatures: true,
  lineHeight: 22,
  letterSpacing: 0,
  minimap: true,
  minimapScale: 1,
  minimapSide: "right",
  wordWrap: "off",
  tabSize: 2,
  insertSpaces: true,
  cursorBlinking: "smooth",
  cursorStyle: "line",
  cursorWidth: 2,
  smoothScrolling: true,
  renderWhitespace: "selection",
  renderLineHighlight: "all",
  lineNumbers: "on",
  glyphMargin: true,
  folding: true,
  bracketPairColorization: true,
  guidesIndentation: true,
  guidesBracketPairs: true,
  stickyScroll: true,
  mouseWheelZoom: true,
  formatOnPaste: false,
  formatOnType: false,
  autoClosingBrackets: "languageDefined",
  autoClosingQuotes: "languageDefined",
  quickSuggestions: true,
  suggestOnTriggerCharacters: true,
  parameterHints: true,
  wordBasedSuggestions: true,
  scrollBeyondLastLine: false,
  linkedEditing: true,
  rulers: "",
  paddingTop: 8,
  editors: "monaco",
};

const CM_DEFAULTS = {
  fontSize: 14,
  fontFamily: "'JetBrains Mono', ui-monospace, monospace",
  lineNumbers: true,
  lineWrapping: false,
  tabSize: 2,
  highlightActiveLine: true,
  highlightSelectionMatches: true,
  bracketMatching: true,
  foldGutter: true,
  autocompletion: true,
  closeBrackets: true,
  search: true,
  dark: true,
};

function loadPrefs(key, defaults) {
  try {
    return { ...defaults, ...JSON.parse(localStorage.getItem(key) || "{}") };
  } catch {
    return { ...defaults };
  }
}

function savePrefs(key, p) {
  localStorage.setItem(key, JSON.stringify(p));
}

export function loadMonacoPrefs() {
  return loadPrefs(LS_MONACO, MONACO_DEFAULTS);
}

export function loadCmPrefs() {
  return loadPrefs(LS_CM, CM_DEFAULTS);
}

export function applyMonacoToEditor(editor, prefs) {
  if (!editor || !prefs) return;
  try {
    editor.updateOptions({
      fontSize: Number(prefs.fontSize) || 14,
      fontFamily: prefs.fontFamily,
      fontLigatures: !!prefs.fontLigatures,
      lineHeight: Number(prefs.lineHeight) || 22,
      letterSpacing: Number(prefs.letterSpacing) || 0,
      minimap: {
        enabled: !!prefs.minimap,
        scale: Number(prefs.minimapScale) || 1,
        side: prefs.minimapSide || "right",
      },
      wordWrap: prefs.wordWrap || "off",
      tabSize: Number(prefs.tabSize) || 2,
      insertSpaces: prefs.insertSpaces !== false,
      cursorBlinking: prefs.cursorBlinking || "smooth",
      cursorStyle: prefs.cursorStyle || "line",
      cursorWidth: Number(prefs.cursorWidth) || 2,
      smoothScrolling: !!prefs.smoothScrolling,
      renderWhitespace: prefs.renderWhitespace || "selection",
      renderLineHighlight: prefs.renderLineHighlight || "all",
      lineNumbers: prefs.lineNumbers || "on",
      glyphMargin: !!prefs.glyphMargin,
      folding: !!prefs.folding,
      bracketPairColorization: { enabled: !!prefs.bracketPairColorization },
      guides: {
        indentation: !!prefs.guidesIndentation,
        bracketPairs: !!prefs.guidesBracketPairs,
      },
      stickyScroll: { enabled: !!prefs.stickyScroll },
      mouseWheelZoom: !!prefs.mouseWheelZoom,
      formatOnPaste: !!prefs.formatOnPaste,
      formatOnType: !!prefs.formatOnType,
      autoClosingBrackets: prefs.autoClosingBrackets || "languageDefined",
      autoClosingQuotes: prefs.autoClosingQuotes || "languageDefined",
      quickSuggestions: !!prefs.quickSuggestions,
      suggestOnTriggerCharacters: !!prefs.suggestOnTriggerCharacters,
      parameterHints: { enabled: !!prefs.parameterHints },
      wordBasedSuggestions: prefs.wordBasedSuggestions ? "currentDocument" : "off",
      scrollBeyondLastLine: !!prefs.scrollBeyondLastLine,
      linkedEditing: !!prefs.linkedEditing,
      padding: { top: Number(prefs.paddingTop) || 8 },
      rulers: String(prefs.rulers || "")
        .split(",")
        .map((x) => parseInt(x.trim(), 10))
        .filter((n) => !isNaN(n)),
    });
  } catch (e) {
    console.warn("[settings] monaco apply", e);
  }
}

/** Register Monaco themes from APP_THEMES catalog with richer color maps */
export function registerMonacoThemesFromCatalog() {
  if (!window.monaco?.editor) return;
  Object.entries(APP_THEMES).forEach(([id, t]) => {
    const mid = t.monaco || id;
    const light = /light|latte|paper|arctic|quiet|classic-light/i.test(id);
    try {
      monaco.editor.defineTheme(mid, {
        base: light ? "vs" : "vs-dark",
        inherit: true,
        rules: [
          { token: "comment", foreground: (t.vars["--muted"] || "#6a6a80").replace("#", ""), fontStyle: "italic" },
          { token: "keyword", foreground: (t.vars["--accent"] || "#8b9cff").replace("#", "") },
          { token: "string", foreground: (t.vars["--ok"] || "#6bffb8").replace("#", "") },
          { token: "number", foreground: (t.vars["--danger"] || "#ff6b9a").replace("#", "") },
        ],
        colors: {
          "editor.background": t.vars["--bg"] || "#0b0b14",
          "editor.foreground": t.vars["--text"] || "#e8e8f0",
          "editorLineNumber.foreground": t.vars["--muted"] || "#6a6a80",
          "editorLineNumber.activeForeground": t.vars["--text"] || "#e8e8f0",
          "editorCursor.foreground": t.vars["--accent"] || "#8b9cff",
          "editor.selectionBackground": (t.vars["--accent"] || "#8b9cff") + "44",
          "editor.inactiveSelectionBackground": (t.vars["--accent"] || "#8b9cff") + "22",
          "editor.lineHighlightBackground": t.vars["--panel"] || "#151522",
          "editor.lineHighlightBorder": "#00000000",
          "editorWidget.background": t.vars["--panel"] || "#151522",
          "editorWidget.border": t.vars["--border"] || "#22223a",
          "editorSuggestWidget.background": t.vars["--panel"] || "#151522",
          "editorSuggestWidget.selectedBackground": (t.vars["--accent"] || "#8b9cff") + "33",
          "editorGutter.background": t.vars["--bg"] || "#0b0b14",
          "editorIndentGuide.background": t.vars["--border"] || "#22223a",
          "editorIndentGuide.activeBackground": t.vars["--muted"] || "#6a6a80",
          "editorBracketMatch.background": (t.vars["--accent"] || "#8b9cff") + "33",
          "editorBracketMatch.border": t.vars["--accent"] || "#8b9cff",
          "scrollbarSlider.background": (t.vars["--accent"] || "#8b9cff") + "33",
          "scrollbarSlider.hoverBackground": (t.vars["--accent"] || "#8b9cff") + "55",
          "minimap.background": t.vars["--bg2"] || t.vars["--bg"] || "#10101a",
        },
      });
    } catch (_) {}
  });
}

const PRESETS = {
  "n3xn-pro": {
    label: "n3xn Pro",
    monaco: {
      fontSize: 14,
      lineHeight: 22,
      minimap: true,
      fontLigatures: true,
      stickyScroll: true,
      bracketPairColorization: true,
      cursorBlinking: "smooth",
      renderWhitespace: "selection",
    },
  },
  compact: {
    label: "Compact",
    monaco: {
      fontSize: 12,
      lineHeight: 18,
      minimap: false,
      stickyScroll: false,
      glyphMargin: false,
    },
  },
  presentation: {
    label: "Presentation",
    monaco: {
      fontSize: 18,
      lineHeight: 28,
      minimap: false,
      wordWrap: "on",
      mouseWheelZoom: true,
    },
  },
  pure: {
    label: "Distraction-free",
    monaco: {
      minimap: false,
      lineNumbers: "off",
      glyphMargin: false,
      folding: false,
      stickyScroll: false,
      renderLineHighlight: "none",
    },
  },
};

function el(html) {
  const d = document.createElement("div");
  d.innerHTML = html.trim();
  return d.firstChild;
}

function field(label, controlHtml) {
  return `<div class="form-group"><label>${label}</label>${controlHtml}</div>`;
}

function check(id, label, on) {
  return `<label class="check-row"><input type="checkbox" id="${id}" ${on ? "checked" : ""}/> ${label}</label>`;
}

export function renderSettingsUI(root) {
  if (!root) return;
  loadSavedAppTheme();
  let m = loadMonacoPrefs();
  let c = loadCmPrefs();
  const themes = listThemes();
  const compress = getCompressionLevel();
  let savedTheme = "n3xn-dark";
  try {
    savedTheme = localStorage.getItem("n3xn_app_theme") || savedTheme;
  } catch (_) {}

  root.innerHTML = `
    <section class="settings-section" id="sec-theme">
      <h2>App + editor themes (${themes.length})</h2>
      <p class="muted">Each theme maps CSS variables and a matching Monaco color map (CodeMirror inherits dark/light).</p>
      <div class="theme-grid" id="theme-grid"></div>
    </section>

    <section class="settings-section" id="sec-engine">
      <h2>Default editor engine</h2>
      <p class="muted">Used by Explorer and future dual-pane. Main VFS still boots Monaco first.</p>
      <label class="check-row"><input type="radio" name="engine" value="monaco" ${m.editors === "monaco" ? "checked" : ""}/> Monaco (full IDE)</label>
      <label class="check-row"><input type="radio" name="engine" value="codemirror" ${m.editors === "codemirror" ? "checked" : ""}/> CodeMirror 6 (fast / offline-friendly)</label>
      <div class="preset-row">
        ${Object.entries(PRESETS)
          .map(([id, p]) => `<button type="button" class="btn" data-preset="${id}">${p.label}</button>`)
          .join("")}
      </div>
    </section>

    <section class="settings-section" id="sec-monaco">
      <h2>Monaco — advanced</h2>
      <div class="settings-grid">
        ${field("Font size", `<input type="number" id="m-fontSize" min="10" max="32" value="${m.fontSize}"/>`)}
        ${field("Line height", `<input type="number" id="m-lineHeight" min="14" max="48" value="${m.lineHeight}"/>`)}
        ${field("Letter spacing", `<input type="number" id="m-letterSpacing" min="-1" max="4" step="0.1" value="${m.letterSpacing}"/>`)}
        ${field("Tab size", `<input type="number" id="m-tabSize" min="1" max="8" value="${m.tabSize}"/>`)}
        ${field("Font family", `<input type="text" id="m-fontFamily" value="${String(m.fontFamily).replace(/"/g, "&quot;")}"/>`)}
        ${field(
          "Word wrap",
          `<select id="m-wordWrap"><option value="off">off</option><option value="on">on</option><option value="wordWrapColumn">wordWrapColumn</option><option value="bounded">bounded</option></select>`
        )}
        ${field(
          "Line numbers",
          `<select id="m-lineNumbers"><option value="on">on</option><option value="off">off</option><option value="relative">relative</option><option value="interval">interval</option></select>`
        )}
        ${field(
          "Cursor blink",
          `<select id="m-cursorBlinking"><option value="blink">blink</option><option value="smooth">smooth</option><option value="phase">phase</option><option value="expand">expand</option><option value="solid">solid</option></select>`
        )}
        ${field(
          "Cursor style",
          `<select id="m-cursorStyle"><option value="line">line</option><option value="block">block</option><option value="underline">underline</option><option value="line-thin">line-thin</option><option value="block-outline">block-outline</option></select>`
        )}
        ${field("Cursor width", `<input type="number" id="m-cursorWidth" min="1" max="8" value="${m.cursorWidth}"/>`)}
        ${field(
          "Whitespace",
          `<select id="m-renderWhitespace"><option value="none">none</option><option value="boundary">boundary</option><option value="selection">selection</option><option value="trailing">trailing</option><option value="all">all</option></select>`
        )}
        ${field(
          "Line highlight",
          `<select id="m-renderLineHighlight"><option value="none">none</option><option value="gutter">gutter</option><option value="line">line</option><option value="all">all</option></select>`
        )}
        ${field(
          "Minimap side",
          `<select id="m-minimapSide"><option value="right">right</option><option value="left">left</option></select>`
        )}
        ${field("Minimap scale", `<input type="number" id="m-minimapScale" min="1" max="3" value="${m.minimapScale}"/>`)}
        ${field("Rulers (e.g. 80,120)", `<input type="text" id="m-rulers" value="${m.rulers || ""}" placeholder="80,120"/>`)}
        ${field("Padding top", `<input type="number" id="m-paddingTop" min="0" max="48" value="${m.paddingTop}"/>`)}
        ${field(
          "Auto-close brackets",
          `<select id="m-autoClosingBrackets"><option value="always">always</option><option value="languageDefined">languageDefined</option><option value="beforeWhitespace">beforeWhitespace</option><option value="never">never</option></select>`
        )}
        ${field(
          "Auto-close quotes",
          `<select id="m-autoClosingQuotes"><option value="always">always</option><option value="languageDefined">languageDefined</option><option value="beforeWhitespace">beforeWhitespace</option><option value="never">never</option></select>`
        )}
      </div>
      <div class="settings-grid" style="margin-top:10px">
        ${check("m-fontLigatures", "Font ligatures", m.fontLigatures)}
        ${check("m-minimap", "Minimap", m.minimap)}
        ${check("m-smooth", "Smooth scrolling", m.smoothScrolling)}
        ${check("m-glyphMargin", "Glyph margin", m.glyphMargin)}
        ${check("m-folding", "Folding", m.folding)}
        ${check("m-brackets", "Bracket pair colorization", m.bracketPairColorization)}
        ${check("m-guidesIndent", "Indentation guides", m.guidesIndentation)}
        ${check("m-guidesBrackets", "Bracket pair guides", m.guidesBracketPairs)}
        ${check("m-sticky", "Sticky scroll", m.stickyScroll)}
        ${check("m-wheelZoom", "Mouse-wheel zoom", m.mouseWheelZoom)}
        ${check("m-formatPaste", "Format on paste", m.formatOnPaste)}
        ${check("m-formatType", "Format on type", m.formatOnType)}
        ${check("m-quickSuggest", "Quick suggestions", m.quickSuggestions)}
        ${check("m-triggerSuggest", "Suggest on trigger chars", m.suggestOnTriggerCharacters)}
        ${check("m-paramHints", "Parameter hints", m.parameterHints)}
        ${check("m-wordSuggest", "Word-based suggestions", m.wordBasedSuggestions)}
        ${check("m-scrollBeyond", "Scroll beyond last line", m.scrollBeyondLastLine)}
        ${check("m-linked", "Linked editing", m.linkedEditing)}
        ${check("m-insertSpaces", "Insert spaces (not tabs)", m.insertSpaces !== false)}
      </div>
      <button type="button" class="btn primary" id="btn-save-monaco">Apply Monaco settings</button>
      <button type="button" class="btn" id="btn-reset-monaco">Reset Monaco defaults</button>
    </section>

    <section class="settings-section" id="sec-cm">
      <h2>CodeMirror 6 — advanced</h2>
      <p class="muted">Used when engine is CodeMirror or Explorer switches to CM. Cached offline via SW when warmed.</p>
      <div class="settings-grid">
        ${field("Font size", `<input type="number" id="c-fontSize" min="10" max="32" value="${c.fontSize}"/>`)}
        ${field("Tab size", `<input type="number" id="c-tabSize" min="1" max="8" value="${c.tabSize}"/>`)}
        ${field("Font family", `<input type="text" id="c-fontFamily" value="${String(c.fontFamily).replace(/"/g, "&quot;")}"/>`)}
      </div>
      <div class="settings-grid">
        ${check("c-lineNumbers", "Line numbers", c.lineNumbers)}
        ${check("c-lineWrapping", "Line wrapping", c.lineWrapping)}
        ${check("c-activeLine", "Highlight active line", c.highlightActiveLine)}
        ${check("c-selMatch", "Highlight selection matches", c.highlightSelectionMatches)}
        ${check("c-brackets", "Bracket matching", c.bracketMatching)}
        ${check("c-fold", "Fold gutter", c.foldGutter)}
        ${check("c-auto", "Autocompletion", c.autocompletion)}
        ${check("c-closeBrackets", "Close brackets", c.closeBrackets)}
        ${check("c-search", "Search panel", c.search)}
        ${check("c-dark", "Dark theme preference", c.dark)}
      </div>
      <button type="button" class="btn primary" id="btn-save-cm">Apply CodeMirror settings</button>
      <button type="button" class="btn" id="btn-reset-cm">Reset CM defaults</button>
    </section>

    <section class="settings-section" id="sec-compress">
      <h2>Storage compression</h2>
      <p class="muted">Default <strong>off</strong> — keeps v2 data readable. Enable only for new heavy writes when db path is wired.</p>
      <select id="compress-level">
        ${Object.entries(LEVELS)
          .map(([k, v]) => `<option value="${k}" ${k === compress ? "selected" : ""}>${v.label}</option>`)
          .join("")}
      </select>
    </section>

    <section class="settings-section" id="sec-mc">
      <h2>Minecraft · Paint · Links</h2>
      <a class="btn primary" href="/mc/index.html">Minecraft (Eagler 1.8)</a>
      <a class="btn primary" href="/jspaint/">JSPaint / XK Paint</a>
      <a class="btn" href="/explorer/">Explorer</a>
      <a class="btn" href="/connectors/">Connectors</a>
      <a class="btn" href="/">Back to VFS</a>
    </section>
  `;

  // Theme grid
  const grid = root.querySelector("#theme-grid");
  themes.forEach((t) => {
    const theme = APP_THEMES[t.id];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "theme-swatch" + (t.id === savedTheme ? " active" : "");
    b.innerHTML = `<div class="swatch-bar" style="background:linear-gradient(90deg,${theme?.vars?.["--accent"] || "#8b9cff"},${theme?.vars?.["--ok"] || "#6bffb8"]})"></div><strong>${t.label}</strong><div class="muted" style="font-size:11px">${t.monaco || ""}</div>`;
    b.onclick = () => {
      applyAppTheme(t.id);
      savedTheme = t.id;
      grid.querySelectorAll(".theme-swatch").forEach((x) => x.classList.remove("active"));
      b.classList.add("active");
      try {
        registerMonacoThemesFromCatalog();
        if (window.monaco) monaco.editor.setTheme(APP_THEMES[t.id].monaco);
      } catch (_) {}
    };
    grid.appendChild(b);
  });

  // Selects current values
  const setSel = (id, val) => {
    const n = root.querySelector("#" + id);
    if (n && val != null) n.value = val;
  };
  setSel("m-wordWrap", m.wordWrap);
  setSel("m-lineNumbers", m.lineNumbers);
  setSel("m-cursorBlinking", m.cursorBlinking);
  setSel("m-cursorStyle", m.cursorStyle);
  setSel("m-renderWhitespace", m.renderWhitespace);
  setSel("m-renderLineHighlight", m.renderLineHighlight);
  setSel("m-minimapSide", m.minimapSide);
  setSel("m-autoClosingBrackets", m.autoClosingBrackets);
  setSel("m-autoClosingQuotes", m.autoClosingQuotes);

  function readMonacoForm() {
    const g = (id) => root.querySelector("#" + id);
    return {
      ...m,
      fontSize: Number(g("m-fontSize").value) || 14,
      fontFamily: g("m-fontFamily").value,
      lineHeight: Number(g("m-lineHeight").value) || 22,
      letterSpacing: Number(g("m-letterSpacing").value) || 0,
      tabSize: Number(g("m-tabSize").value) || 2,
      wordWrap: g("m-wordWrap").value,
      lineNumbers: g("m-lineNumbers").value,
      cursorBlinking: g("m-cursorBlinking").value,
      cursorStyle: g("m-cursorStyle").value,
      cursorWidth: Number(g("m-cursorWidth").value) || 2,
      renderWhitespace: g("m-renderWhitespace").value,
      renderLineHighlight: g("m-renderLineHighlight").value,
      minimapSide: g("m-minimapSide").value,
      minimapScale: Number(g("m-minimapScale").value) || 1,
      rulers: g("m-rulers").value,
      paddingTop: Number(g("m-paddingTop").value) || 8,
      autoClosingBrackets: g("m-autoClosingBrackets").value,
      autoClosingQuotes: g("m-autoClosingQuotes").value,
      fontLigatures: g("m-fontLigatures").checked,
      minimap: g("m-minimap").checked,
      smoothScrolling: g("m-smooth").checked,
      glyphMargin: g("m-glyphMargin").checked,
      folding: g("m-folding").checked,
      bracketPairColorization: g("m-brackets").checked,
      guidesIndentation: g("m-guidesIndent").checked,
      guidesBracketPairs: g("m-guidesBrackets").checked,
      stickyScroll: g("m-sticky").checked,
      mouseWheelZoom: g("m-wheelZoom").checked,
      formatOnPaste: g("m-formatPaste").checked,
      formatOnType: g("m-formatType").checked,
      quickSuggestions: g("m-quickSuggest").checked,
      suggestOnTriggerCharacters: g("m-triggerSuggest").checked,
      parameterHints: g("m-paramHints").checked,
      wordBasedSuggestions: g("m-wordSuggest").checked,
      scrollBeyondLastLine: g("m-scrollBeyond").checked,
      linkedEditing: g("m-linked").checked,
      insertSpaces: g("m-insertSpaces").checked,
      editors: root.querySelector('input[name="engine"]:checked')?.value || "monaco",
    };
  }

  function readCmForm() {
    const g = (id) => root.querySelector("#" + id);
    return {
      ...c,
      fontSize: Number(g("c-fontSize").value) || 14,
      tabSize: Number(g("c-tabSize").value) || 2,
      fontFamily: g("c-fontFamily").value,
      lineNumbers: g("c-lineNumbers").checked,
      lineWrapping: g("c-lineWrapping").checked,
      highlightActiveLine: g("c-activeLine").checked,
      highlightSelectionMatches: g("c-selMatch").checked,
      bracketMatching: g("c-brackets").checked,
      foldGutter: g("c-fold").checked,
      autocompletion: g("c-auto").checked,
      closeBrackets: g("c-closeBrackets").checked,
      search: g("c-search").checked,
      dark: g("c-dark").checked,
    };
  }

  root.querySelector("#btn-save-monaco")?.addEventListener("click", () => {
    m = readMonacoForm();
    savePrefs(LS_MONACO, m);
    try {
      if (window.__n3xnEditor) applyMonacoToEditor(window.__n3xnEditor, m);
      if (window.monaco?.editor?.getEditors) {
        window.monaco.editor.getEditors().forEach((ed) => applyMonacoToEditor(ed, m));
      }
    } catch (_) {}
    setStatus("Monaco settings applied");
  });

  root.querySelector("#btn-reset-monaco")?.addEventListener("click", () => {
    m = { ...MONACO_DEFAULTS };
    savePrefs(LS_MONACO, m);
    renderSettingsUI(root);
  });

  root.querySelector("#btn-save-cm")?.addEventListener("click", () => {
    c = readCmForm();
    savePrefs(LS_CM, c);
    setStatus("CodeMirror settings saved");
  });

  root.querySelector("#btn-reset-cm")?.addEventListener("click", () => {
    c = { ...CM_DEFAULTS };
    savePrefs(LS_CM, c);
    renderSettingsUI(root);
  });

  root.querySelector("#compress-level")?.addEventListener("change", (e) => {
    setCompressionLevel(e.target.value);
  });

  root.querySelectorAll("[data-preset]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const p = PRESETS[btn.getAttribute("data-preset")];
      if (!p) return;
      m = { ...m, ...p.monaco };
      savePrefs(LS_MONACO, m);
      renderSettingsUI(root);
      setStatus("Preset: " + p.label);
    });
  });

  function setStatus(msg) {
    try {
      const s = document.getElementById("status-msg");
      if (s) s.textContent = msg;
    } catch (_) {}
    console.info("[settings]", msg);
  }
}

if (typeof window !== "undefined") {
  window.__n3xnSettings = {
    renderSettingsUI,
    registerMonacoThemesFromCatalog,
    loadMonacoPrefs,
    loadCmPrefs,
    applyMonacoToEditor,
  };
}
