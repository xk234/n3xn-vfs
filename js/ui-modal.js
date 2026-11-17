/**
 * n3xn polished modals — replace alert / confirm / prompt
 * import { uiAlert, uiConfirm, uiPrompt, uiPick } from "./ui-modal.js"
 * window.__n3xnUI after first import
 */

const CSS_ID = "n3xn-ui-modal-css";

function ensureCss() {
  if (typeof document === "undefined") return;
  if (document.getElementById(CSS_ID)) return;
  const s = document.createElement("style");
  s.id = CSS_ID;
  s.textContent = `
.n3xn-modal-root{position:fixed;inset:0;z-index:2147483600;display:flex;align-items:center;justify-content:center;padding:16px;background:rgba(0,0,0,.55);backdrop-filter:blur(6px);font-family:var(--font-ui,"JetBrains Mono",system-ui,monospace);color:var(--text,#e8e8f0)}
.n3xn-modal{width:min(420px,100%);background:var(--bg-panel,#0a0a0f);border:1px solid var(--border,#1a1a28);border-radius:12px;box-shadow:0 0 0 1px rgba(255,255,255,.04),0 20px 50px rgba(0,0,0,.55),0 0 30px rgba(255,255,255,.06);padding:16px 16px 14px;animation:n3xnModalIn .16s ease}
@keyframes n3xnModalIn{from{opacity:0;transform:translateY(6px) scale(.98)}to{opacity:1;transform:none}}
.n3xn-modal-title{font-size:13px;font-weight:700;letter-spacing:.04em;text-transform:uppercase;color:#c8c8d8;margin:0 0 8px}
.n3xn-modal-body{font-size:13px;line-height:1.45;color:var(--text,#e8e8f0);margin:0 0 14px;white-space:pre-wrap;word-break:break-word}
.n3xn-modal-input,.n3xn-modal-select{width:100%;box-sizing:border-box;margin:0 0 14px;padding:9px 11px;border-radius:8px;border:1px solid var(--border,#1a1a28);background:#050508;color:var(--text,#e8e8f0);font:inherit;font-size:13px;outline:none}
.n3xn-modal-input:focus,.n3xn-modal-select:focus{border-color:rgba(255,255,255,.35);box-shadow:0 0 0 1px rgba(255,255,255,.12)}
.n3xn-modal-actions{display:flex;gap:8px;justify-content:flex-end;flex-wrap:wrap}
.n3xn-modal-btn{font:inherit;font-size:12px;padding:8px 14px;border-radius:8px;border:1px solid var(--border,#1a1a28);background:var(--bg-elevated,#0f0f16);color:var(--text,#e8e8f0);cursor:pointer}
.n3xn-modal-btn:hover{border-color:rgba(255,255,255,.25)}
.n3xn-modal-btn.primary{background:#fff;color:#0a0a0f;border-color:#fff;font-weight:600}
.n3xn-modal-btn.danger{border-color:rgba(255,107,107,.45);color:#ff8a8a}
.n3xn-modal-btn:focus-visible{outline:2px solid #fff;outline-offset:2px}
`;
  document.head.appendChild(s);
}

function openModal(opts) {
  ensureCss();
  return new Promise((resolve) => {
    const root = document.createElement("div");
    root.className = "n3xn-modal-root";
    root.setAttribute("data-n3xn", "safe");
    root.innerHTML = `
      <div class="n3xn-modal" role="dialog" aria-modal="true" data-n3xn="safe">
        <h2 class="n3xn-modal-title"></h2>
        <p class="n3xn-modal-body"></p>
        <div class="n3xn-modal-field"></div>
        <div class="n3xn-modal-actions"></div>
      </div>`;
    const titleEl = root.querySelector(".n3xn-modal-title");
    const bodyEl = root.querySelector(".n3xn-modal-body");
    const fieldEl = root.querySelector(".n3xn-modal-field");
    const actions = root.querySelector(".n3xn-modal-actions");
    titleEl.textContent = opts.title || "n3xn";
    bodyEl.textContent = opts.message || "";
    if (!opts.message) bodyEl.style.display = "none";

    let input = null;
    if (opts.kind === "prompt") {
      input = document.createElement("input");
      input.className = "n3xn-modal-input";
      input.type = "text";
      input.value = opts.defaultValue != null ? String(opts.defaultValue) : "";
      input.placeholder = opts.placeholder || "";
      fieldEl.appendChild(input);
    } else if (opts.kind === "pick") {
      input = document.createElement("select");
      input.className = "n3xn-modal-select";
      (opts.options || []).forEach((o) => {
        const opt = document.createElement("option");
        opt.value = o.value;
        opt.textContent = o.label;
        if (o.value === opts.defaultValue) opt.selected = true;
        input.appendChild(opt);
      });
      fieldEl.appendChild(input);
    } else {
      fieldEl.remove();
    }

    function close(val) {
      root.remove();
      document.removeEventListener("keydown", onKey);
      resolve(val);
    }

    function onKey(e) {
      if (e.key === "Escape") {
        e.preventDefault();
        close(opts.kind === "confirm" ? false : null);
      } else if (e.key === "Enter" && opts.kind !== "alert") {
        if (e.target && e.target.tagName === "TEXTAREA") return;
        e.preventDefault();
        if (opts.kind === "confirm") close(true);
        else if (input) close(input.value);
      }
    }
    document.addEventListener("keydown", onKey);

    (opts.buttons || []).forEach((b) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className =
        "n3xn-modal-btn" + (b.primary ? " primary" : "") + (b.danger ? " danger" : "");
      btn.textContent = b.label;
      btn.onclick = () => {
        if (b.role === "ok") {
          if (opts.kind === "confirm") close(true);
          else if (input) close(input.value);
          else close(true);
        } else if (b.role === "cancel") {
          close(opts.kind === "confirm" ? false : null);
        } else {
          close(b.value);
        }
      };
      actions.appendChild(btn);
    });

    document.body.appendChild(root);
    if (input) {
      setTimeout(() => {
        input.focus();
        if (input.select) input.select();
      }, 30);
    } else {
      const primary = actions.querySelector(".primary") || actions.querySelector("button");
      if (primary) primary.focus();
    }
  });
}

export function uiAlert(message, title) {
  return openModal({
    kind: "alert",
    title: title || "Notice",
    message: String(message ?? ""),
    buttons: [{ label: "OK", primary: true, role: "ok" }],
  });
}

export function uiConfirm(message, title) {
  return openModal({
    kind: "confirm",
    title: title || "Confirm",
    message: String(message ?? ""),
    buttons: [
      { label: "Cancel", role: "cancel" },
      { label: "OK", primary: true, role: "ok" },
    ],
  });
}

export function uiPrompt(message, defaultValue, title) {
  return openModal({
    kind: "prompt",
    title: title || "Input",
    message: String(message ?? ""),
    defaultValue: defaultValue != null ? defaultValue : "",
    buttons: [
      { label: "Cancel", role: "cancel" },
      { label: "OK", primary: true, role: "ok" },
    ],
  });
}

export function uiPick(message, options, defaultValue, title) {
  return openModal({
    kind: "pick",
    title: title || "Choose",
    message: String(message ?? ""),
    options: options || [],
    defaultValue,
    buttons: [
      { label: "Cancel", role: "cancel" },
      { label: "OK", primary: true, role: "ok" },
    ],
  });
}

const api = { alert: uiAlert, confirm: uiConfirm, prompt: uiPrompt, pick: uiPick, openModal };
if (typeof window !== "undefined") window.__n3xnUI = api;
export default api;
