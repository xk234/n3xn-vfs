/**
 * n3xn VFS v3.0.5-beta
 */
export const VERSION = "3.0.5-beta";
export const VERSION_LABEL = "v" + VERSION;
export const CODENAME =
  "Anti-Blocksi scrub+cloak · no auto DevTools · title/fav sync";

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
