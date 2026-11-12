/**
 * n3xn VFS v3.0.1-beta — safer run environments
 *
 * Goals:
 * - JS / HTML runners must NOT depend on SW offline URL rewrites of the payload
 * - Prefer srcdoc / Blob module workers with explicit UTF-8
 * - Avoid double-encoding and brittle regex transforms of user code
 * - Preview iframes: optional sandbox ONLY for untrusted HTML preview
 */

import { applyIframePolicy, ALLOW_ALL, ALLOW_PREVIEW } from "./iframe-policy.js";

function utf8Blob(text, type) {
  // Explicit UTF-8 — fixes encoding drift from string→blob in some browsers
  return new Blob([typeof text === "string" ? text : String(text ?? "")], {
    type: type + ";charset=utf-8",
  });
}

/**
 * Run JS in a classic Worker from a UTF-8 blob (no SW rewrite of code body).
 * Returns { worker, url, terminate }
 */
export function runJsInWorker(code, { type = "classic", onMessage, onError } = {}) {
  const blob = utf8Blob(code, type === "module" ? "text/javascript" : "text/javascript");
  const url = URL.createObjectURL(blob);
  const worker = new Worker(url, type === "module" ? { type: "module" } : undefined);
  if (onMessage) worker.onmessage = onMessage;
  if (onError) worker.onerror = onError;
  return {
    worker,
    url,
    terminate() {
      try {
        worker.terminate();
      } catch (_) {}
      try {
        URL.revokeObjectURL(url);
      } catch (_) {}
    },
  };
}

/**
 * HTML preview via srcdoc (no navigation, no offline HTML rewrite of the document).
 * sandboxed=true for untrusted user HTML.
 */
export function mountHtmlPreview(container, html, { sandboxed = true } = {}) {
  if (!container) return null;
  container.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.setAttribute("data-n3xn", "preview");
  applyIframePolicy(iframe, { preview: true, sandboxed });
  // srcdoc keeps payload out of network/SW path
  iframe.srcdoc = String(html ?? "");
  iframe.style.width = "100%";
  iframe.style.height = "100%";
  iframe.style.border = "0";
  container.appendChild(iframe);
  return iframe;
}

/**
 * Trusted full app frame (MC, jspaint, etc.) — no sandbox, full allow=
 */
export function mountTrustedApp(container, src) {
  if (!container) return null;
  container.innerHTML = "";
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.setAttribute("data-n3xn", "safe");
  applyIframePolicy(iframe, { preview: false, sandboxed: false });
  Object.assign(iframe.style, {
    width: "100%",
    height: "100%",
    border: "0",
  });
  container.appendChild(iframe);
  return iframe;
}

/**
 * Eval-like for small snippets inside a function scope (still not a sandbox).
 * Prefer runJsInWorker for anything untrusted.
 */
export function runJsInFunctionScope(code, helpers = {}) {
  const keys = Object.keys(helpers);
  const vals = keys.map((k) => helpers[k]);
  // eslint-disable-next-line no-new-func
  const fn = new Function(...keys, `"use strict";\n` + String(code ?? ""));
  return fn(...vals);
}

if (typeof window !== "undefined") {
  window.__n3xnRunnerEnv = {
    runJsInWorker,
    mountHtmlPreview,
    mountTrustedApp,
    runJsInFunctionScope,
    ALLOW_ALL,
    ALLOW_PREVIEW,
  };
}
