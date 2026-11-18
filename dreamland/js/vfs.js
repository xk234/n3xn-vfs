import { REFLEX_TEMPLATE } from "../templates/demo/reflex.js";

const STORAGE_KEY = "n3xn_dreamland_vfs_v9";

export const DEFAULT_FILES = REFLEX_TEMPLATE.files;

export function loadFiles() {
  const savedRaw = localStorage.getItem(STORAGE_KEY);
  const files = savedRaw ? JSON.parse(savedRaw) : structuredClone(DEFAULT_FILES);
  saveFiles(files);
  return files;
}

export function saveFiles(files) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export function resolveVfsPath(importer, rel) {
  const cleanImporter = String(importer || "/src/main.tsx")
    .replace(/^vfs:/, "")
    .replace(/^file:\/\//, "");
  if (rel.startsWith("/")) return rel;
  const segs = cleanImporter.split("/").filter(Boolean);
  segs.pop();
  for (const seg of rel.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") segs.pop();
    else segs.push(seg);
  }
  return "/" + segs.join("/");
}

export function findVfsFile(files, base) {
  for (const ext of ["", ".tsx", ".ts", ".jsx", ".js", ".json"]) {
    if (files[base + ext] !== undefined) return base + ext;
  }
  return null;
}
