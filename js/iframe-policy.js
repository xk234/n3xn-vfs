/**
 * n3xn VFS v3.0.1-beta — iframe allow policy
 *
 * Rules:
 * - Always set a full allow= list (covers fullscreen, etc.)
 * - Do NOT set allowfullscreen separately (avoid conflicts)
 * - Do NOT set sandbox unless this is a code/HTML preview runner
 */

/** Full permission list for trusted app surfaces (MC, jspaint host, cloak frame, etc.) */
export const ALLOW_ALL =
  "accelerometer; ambient-light-sensor; autoplay; battery; bluetooth; camera; " +
  "clipboard-read; clipboard-write; display-capture; encrypted-media; fullscreen; " +
  "gamepad; geolocation; gyroscope; hid; idle-detection; local-fonts; magnetometer; " +
  "microphone; midi; payment; picture-in-picture; publickey-credentials-get; " +
  "screen-wake-lock; serial; speaker-selection; storage-access; usb; " +
  "web-share; window-management; xr-spatial-tracking";

/** Stricter allow for untrusted preview (still no sandbox unless requested) */
export const ALLOW_PREVIEW =
  "autoplay; clipboard-read; clipboard-write; fullscreen; picture-in-picture";

/**
 * Apply policy to an iframe element.
 * @param {HTMLIFrameElement} iframe
 * @param {{ preview?: boolean, sandboxed?: boolean }} opts
 *   preview: use ALLOW_PREVIEW
 *   sandboxed: only for code preview — adds sandbox="allow-scripts allow-forms allow-modals allow-popups allow-same-origin"
 */
export function applyIframePolicy(iframe, opts = {}) {
  if (!iframe) return iframe;
  const preview = !!opts.preview;
  const sandboxed = !!opts.sandboxed && preview;

  iframe.setAttribute("allow", preview ? ALLOW_PREVIEW : ALLOW_ALL);
  // Never set allowfullscreen — already in allow=
  iframe.removeAttribute("allowfullscreen");
  iframe.removeAttribute("allowFullScreen");

  if (sandboxed) {
    iframe.setAttribute(
      "sandbox",
      "allow-scripts allow-forms allow-modals allow-popups allow-same-origin allow-downloads"
    );
  } else {
    iframe.removeAttribute("sandbox");
  }

  iframe.setAttribute("referrerpolicy", "no-referrer-when-downgrade");
  return iframe;
}

/** Create a full-bleed trusted iframe */
export function createTrustedFrame(src) {
  const iframe = document.createElement("iframe");
  iframe.src = src;
  iframe.setAttribute("data-n3xn", "safe");
  applyIframePolicy(iframe, { preview: false, sandboxed: false });
  Object.assign(iframe.style, {
    position: "fixed",
    inset: "0",
    width: "100%",
    height: "100%",
    border: "0",
    margin: "0",
    padding: "0",
    background: "#0a0a0f",
  });
  return iframe;
}

if (typeof window !== "undefined") {
  window.__n3xnIframePolicy = { ALLOW_ALL, ALLOW_PREVIEW, applyIframePolicy, createTrustedFrame };
}
