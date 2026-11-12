/**
 * n3xn VFS v3.0.2-beta
 */
export const VERSION = "3.0.2-beta";
export const VERSION_LABEL = "v" + VERSION;
export const CODENAME =
  "JSPaint image editor · /jspaint/ · systemHooks VFS bridge";

export function applyVersionToDom() {
  document.querySelectorAll(".n3xn-version, #n3xn-version").forEach((el) => {
    el.textContent = VERSION_LABEL;
  });
  try {
    document.title = "n3xn Virtual FileSystem " + VERSION_LABEL;
  } catch (_) {}
}

if (typeof window !== "undefined") {
  window.__N3XN_VERSION = VERSION;
  window.__N3XN_VERSION_LABEL = VERSION_LABEL;
}
