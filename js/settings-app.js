/**
 * n3xn VFS v3.0.8-beta — Settings (Monaco + CodeMirror)
 * Fixed: corrupted .replace(/"/g, """) broke module parse
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
      minimap: { enabled: !!prefs.minimap, scale: Number(prefs.minimapScale) || 1, side: prefs.minimapSide || "right" },
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
      guides: { indentation: !!prefs.guidesIndentation, bracketPairs: !!prefs.guidesBracketPairs },
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
      rulers: String(prefs.rulers || "").split(",").map((x) => parseInt(x.trim(), 10)).filter((n) => !isNaN(n)),
    });
  } catch (e) {
    console.warn("[settings] monaco apply", e);
  }
}

export function registerMonacoThemesFromCatalog() {
  if (!window.monaco?.editor) return;
  Object.entries(APP_THEMES).forEach(([id, t]) => {
    const mid = t.monaco || id;
    const light = /light|latte|paper|arctic|quiet|classic-light/i.test(id);
    try {
      monaco.editor.defineTheme(mid, {
        base: light ? "vs" : "vs-dark",
        inherit: true,
        rules: [],
        colors: {
          "editor.background": t.vars["--bg"] || "#0b0b14",
          "editor.foreground": t.vars["--text"] || "#e8e8f0",
          "editorCursor.foreground": t.vars["--accent"] || "#8b9cff",
          "editor.selectionBackground": (t.vars["--accent"] || "#8b9cff") + "44",
        },
      });
    } catch (_) {}
  });
}

const PRESETS = {
  "n3xn-pro": { label: "n3xn Pro", monaco: { fontSize: 14, lineHeight: 22, minimap: true, fontLigatures: true, stickyScroll: true } },
  compact: { label: "Compact", monaco: { fontSize: 12, lineHeight: 18, minimap: false } },
  presentation: { label: "Presentation", monaco: { fontSize: 18, lineHeight: 28, minimap: false, wordWrap: "on" } },
  pure: { label: "Distraction-free", monaco: { minimap: false, lineNumbers: "off", glyphMargin: false, folding: false } },
};

function escVal(s) {
  return String(s ?? "").replace(/&/g, "\u0026amp;").replace(/"/g, "\u0026quot;").replace(/</g, "\u0026lt;");
}
function field(label, controlHtml) {
  return "<div class=\"form-group\"><label>" + label + "</label>" + controlHtml + "</div>";
}
function check(id, label, on) {
  return "<label class=\"check-row\"><input type=\"checkbox\" id=\"" + id + "\" " + (on ? "checked" : "") + "/> " + label + "</label>";
}

export function renderSettingsUI(root) {
  if (!root) return;
  loadSavedAppTheme();
  let m = loadMonacoPrefs();
  let c = loadCmPrefs();
  const themes = listThemes();
  const compress = getCompressionLevel();
  let savedTheme = "n3xn-dark";
  try { savedTheme = localStorage.getItem("n3xn_app_theme") || savedTheme; } catch (_) {}

  root.innerHTML =
    "<section class=\"settings-section\" id=\"sec-theme\"><h2>App + editor themes (" + themes.length + ")</h2>" +
    "<p class=\"muted\">Themes map CSS vars + Monaco colors.</p><div class=\"theme-grid\" id=\"theme-grid\"></div></section>" +
    "<section class=\"settings-section\" id=\"sec-engine\"><h2>Default editor engine</h2>" +
    "<label class=\"check-row\"><input type=\"radio\" name=\"engine\" value=\"monaco\" " + (m.editors === "monaco" ? "checked" : "") + "/> Monaco</label>" +
    "<label class=\"check-row\"><input type=\"radio\" name=\"engine\" value=\"codemirror\" " + (m.editors === "codemirror" ? "checked" : "") + "/> CodeMirror 6</label>" +
    "<div class=\"preset-row\" id=\"preset-row\"></div></section>" +
    "<section class=\"settings-section\" id=\"sec-monaco\"><h2>Monaco — advanced</h2>" +
    "<div class=\"settings-grid\" id=\"monaco-fields\"></div>" +
    "<div class=\"settings-grid\" id=\"monaco-checks\" style=\"margin-top:10px\"></div>" +
    "<button type=\"button\" class=\"btn primary\" id=\"btn-save-monaco\">Apply Monaco settings</button>" +
    "<button type=\"button\" class=\"btn\" id=\"btn-reset-monaco\">Reset Monaco defaults</button></section>" +
    "<section class=\"settings-section\" id=\"sec-cm\"><h2>CodeMirror 6 — advanced</h2>" +
    "<div class=\"settings-grid\" id=\"cm-fields\"></div>" +
    "<div class=\"settings-grid\" id=\"cm-checks\"></div>" +
    "<button type=\"button\" class=\"btn primary\" id=\"btn-save-cm\">Apply CodeMirror settings</button>" +
    "<button type=\"button\" class=\"btn\" id=\"btn-reset-cm\">Reset CM defaults</button></section>" +
    "<section class=\"settings-section\" id=\"sec-compress\"><h2>Storage compression</h2>" +
    "<p class=\"muted\">Default off.</p><select id=\"compress-level\"></select></section>" +
    "<section class=\"settings-section\" id=\"sec-cloak\"><h2>Anti-Blocksi / cloak mode</h2>" +
    "<p class=\"muted\">Default is always blob-cloak. Change if needed.</p>" +
    "<select id=\"cloak-mode\"><option value=\"always\">Always blob-cloak</option>" +
    "<option value=\"on-detect\">On Blocksi detect</option><option value=\"off\">Off (strip only)</option></select></section>" +
    "<section class=\"settings-section\" id=\"sec-mc\"><h2>Links</h2>" +
    "<a class=\"btn primary\" href=\"/mc/index.html\">Minecraft</a> " +
    "<a class=\"btn primary\" href=\"/jspaint/\">JSPaint</a> " +
    "<a class=\"btn\" href=\"/cloaker/\">Cloaker</a> " +
    "<a class=\"btn\" href=\"/explorer/\">Explorer</a> " +
    "<a class=\"btn\" href=\"/connectors/\">Connectors</a> " +
    "<a class=\"btn\" href=\"/\">Back to VFS</a></section>";

  // Monaco fields
  const mf = root.querySelector("#monaco-fields");
  mf.innerHTML =
    field("Font size", "<input type=\"number\" id=\"m-fontSize\" min=\"10\" max=\"32\" value=\"" + m.fontSize + "\"/>") +
    field("Line height", "<input type=\"number\" id=\"m-lineHeight\" min=\"14\" max=\"48\" value=\"" + m.lineHeight + "\"/>") +
    field("Tab size", "<input type=\"number\" id=\"m-tabSize\" min=\"1\" max=\"8\" value=\"" + m.tabSize + "\"/>") +
    field("Font family", "<input type=\"text\" id=\"m-fontFamily\" value=\"" + escVal(m.fontFamily) + "\"/>") +
    field("Word wrap", "<select id=\"m-wordWrap\"><option value=\"off\">off</option><option value=\"on\">on</option></select>") +
    field("Line numbers", "<select id=\"m-lineNumbers\"><option value=\"on\">on</option><option value=\"off\">off</option><option value=\"relative\">relative</option></select>");
  const mc = root.querySelector("#monaco-checks");
  mc.innerHTML =
    check("m-fontLigatures", "Font ligatures", m.fontLigatures) +
    check("m-minimap", "Minimap", m.minimap) +
    check("m-smooth", "Smooth scrolling", m.smoothScrolling) +
    check("m-sticky", "Sticky scroll", m.stickyScroll) +
    check("m-brackets", "Bracket pair colorization", m.bracketPairColorization) +
    check("m-wheelZoom", "Mouse-wheel zoom", m.mouseWheelZoom);

  const cf = root.querySelector("#cm-fields");
  cf.innerHTML =
    field("Font size", "<input type=\"number\" id=\"c-fontSize\" min=\"10\" max=\"32\" value=\"" + c.fontSize + "\"/>") +
    field("Tab size", "<input type=\"number\" id=\"c-tabSize\" min=\"1\" max=\"8\" value=\"" + c.tabSize + "\"/>") +
    field("Font family", "<input type=\"text\" id=\"c-fontFamily\" value=\"" + escVal(c.fontFamily) + "\"/>");
  const cc = root.querySelector("#cm-checks");
  cc.innerHTML =
    check("c-lineNumbers", "Line numbers", c.lineNumbers) +
    check("c-lineWrapping", "Line wrapping", c.lineWrapping) +
    check("c-activeLine", "Highlight active line", c.highlightActiveLine) +
    check("c-fold", "Fold gutter", c.foldGutter) +
    check("c-auto", "Autocompletion", c.autocompletion) +
    check("c-dark", "Dark theme", c.dark);

  const sel = root.querySelector("#compress-level");
  Object.entries(LEVELS).forEach(([k, v]) => {
    const o = document.createElement("option");
    o.value = k;
    o.textContent = v.label;
    if (k === compress) o.selected = true;
    sel.appendChild(o);
  });

  const cloakSel = root.querySelector("#cloak-mode");
  try {
    cloakSel.value = localStorage.getItem("n3xn_cloak_mode") || "always";
  } catch (_) {
    cloakSel.value = "always";
  }
  cloakSel.onchange = () => {
    try { localStorage.setItem("n3xn_cloak_mode", cloakSel.value); } catch (_) {}
  };

  const pr = root.querySelector("#preset-row");
  Object.entries(PRESETS).forEach(([id, p]) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "btn";
    b.textContent = p.label;
    b.onclick = () => {
      m = { ...m, ...p.monaco };
      savePrefs(LS_MONACO, m);
      renderSettingsUI(root);
    };
    pr.appendChild(b);
  });

  const grid = root.querySelector("#theme-grid");
  themes.forEach((t) => {
    const theme = APP_THEMES[t.id];
    const b = document.createElement("button");
    b.type = "button";
    b.className = "theme-swatch" + (t.id === savedTheme ? " active" : "");
    const a = (theme && theme.vars && theme.vars["--accent"]) || "#8b9cff";
    const o = (theme && theme.vars && theme.vars["--ok"]) || "#6bffb8";
    b.innerHTML =
      '<div class="swatch-bar" style="background:linear-gradient(90deg,' + a + "," + o + ')"></div><strong>' +
      t.label + "</strong>";
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

  const setSel = (id, val) => {
    const n = root.querySelector("#" + id);
    if (n && val != null) n.value = val;
  };
  setSel("m-wordWrap", m.wordWrap);
  setSel("m-lineNumbers", m.lineNumbers);

  root.querySelector("#btn-save-monaco").onclick = () => {
    const g = (id) => root.querySelector("#" + id);
    m = {
      ...m,
      fontSize: Number(g("m-fontSize").value) || 14,
      fontFamily: g("m-fontFamily").value,
      lineHeight: Number(g("m-lineHeight").value) || 22,
      tabSize: Number(g("m-tabSize").value) || 2,
      wordWrap: g("m-wordWrap").value,
      lineNumbers: g("m-lineNumbers").value,
      fontLigatures: g("m-fontLigatures").checked,
      minimap: g("m-minimap").checked,
      smoothScrolling: g("m-smooth").checked,
      stickyScroll: g("m-sticky").checked,
      bracketPairColorization: g("m-brackets").checked,
      mouseWheelZoom: g("m-wheelZoom").checked,
      editors: root.querySelector('input[name="engine"]:checked')?.value || "monaco",
    };
    savePrefs(LS_MONACO, m);
    try {
      if (window.__n3xnEditor) applyMonacoToEditor(window.__n3xnEditor, m);
    } catch (_) {}
  };
  root.querySelector("#btn-reset-monaco").onclick = () => {
    m = { ...MONACO_DEFAULTS };
    savePrefs(LS_MONACO, m);
    renderSettingsUI(root);
  };
  root.querySelector("#btn-save-cm").onclick = () => {
    const g = (id) => root.querySelector("#" + id);
    c = {
      ...c,
      fontSize: Number(g("c-fontSize").value) || 14,
      tabSize: Number(g("c-tabSize").value) || 2,
      fontFamily: g("c-fontFamily").value,
      lineNumbers: g("c-lineNumbers").checked,
      lineWrapping: g("c-lineWrapping").checked,
      highlightActiveLine: g("c-activeLine").checked,
      foldGutter: g("c-fold").checked,
      autocompletion: g("c-auto").checked,
      dark: g("c-dark").checked,
    };
    savePrefs(LS_CM, c);
  };
  root.querySelector("#btn-reset-cm").onclick = () => {
    c = { ...CM_DEFAULTS };
    savePrefs(LS_CM, c);
    renderSettingsUI(root);
  };
  root.querySelector("#compress-level").onchange = (e) => setCompressionLevel(e.target.value);
}

if (typeof window !== "undefined") {
  window.__n3xnSettings = { renderSettingsUI, registerMonacoThemesFromCatalog, loadMonacoPrefs, loadCmPrefs, applyMonacoToEditor };
}
