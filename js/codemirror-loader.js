
/**
 * n3xn VFS v3.0.0-beta — CodeMirror 6 offline-capable loader
 * Uses SW-cached ESM from /__cdn__/esm/ when available, else esm.sh
 */
let cmReady = null;

export function getCmBase() {
  const useProxy = !!(navigator.serviceWorker && navigator.serviceWorker.controller);
  if (useProxy) return location.origin + "/__cdn__/esm/";
  return "https://esm.sh/";
}

export async function loadCodeMirror() {
  if (cmReady) return cmReady;
  cmReady = (async () => {
    const base = getCmBase();
    const viewMod = await import(base + "@codemirror/view");
    const stateMod = await import(base + "@codemirror/state");
    const basicMod = await import(base + "@codemirror/basic-setup");
    // basic-setup may re-export; fall back composition
    const { EditorView, keymap, lineNumbers, highlightActiveLine } = viewMod;
    const { EditorState } = stateMod;
    return {
      EditorView,
      EditorState,
      keymap,
      lineNumbers,
      highlightActiveLine,
      basicSetup: basicMod.basicSetup || basicMod.default,
    };
  })().catch((e) => {
    cmReady = null;
    throw e;
  });
  return cmReady;
}

/**
 * Mount a CodeMirror editor into el. Returns { view, getValue, setValue, destroy }
 */
export async function mountCodeMirror(el, { doc = "", language = null } = {}) {
  const cm = await loadCodeMirror();
  const extensions = [];
  if (cm.basicSetup) extensions.push(cm.basicSetup);
  else {
    if (cm.lineNumbers) extensions.push(cm.lineNumbers());
    if (cm.highlightActiveLine) extensions.push(cm.highlightActiveLine());
  }
  const state = cm.EditorState.create({
    doc,
    extensions,
  });
  const view = new cm.EditorView({ state, parent: el });
  return {
    view,
    getValue: () => view.state.doc.toString(),
    setValue: (text) =>
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: text },
      }),
    destroy: () => view.destroy(),
  };
}

if (typeof window !== "undefined") {
  window.__n3xnCodeMirror = { loadCodeMirror, mountCodeMirror };
}
