/**
 * n3xn VFS v3.0.2-beta — Image Editor entry (JSPaint only)
 *
 * The old canvas "image studio" is not used for raster editing.
 * All image edit requests go through /jspaint/ via jspaint-bridge.
 */
export {
  openImageEditor,
  closeImageEditor,
  isImageEditorOpen,
  openJspaintStandalone,
} from "./jspaint-bridge.js";

/** Detect image paths for explorer / tree double-click */
export function isImagePath(path) {
  return /\.(png|jpe?g|gif|webp|bmp|ico|svg)$/i.test(String(path || ""));
}

/**
 * Default handler for "edit this file" from FS / explorer
 */
export async function editImageFile(path) {
  const { openImageEditor } = await import("./jspaint-bridge.js");
  return openImageEditor({ path });
}

if (typeof window !== "undefined") {
  window.__n3xnImageEditor = {
    isImagePath,
    editImageFile,
    open: (...args) => import("./jspaint-bridge.js").then((m) => m.openImageEditor(...args)),
  };
}
