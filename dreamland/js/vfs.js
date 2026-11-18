const STORAGE_KEY = "n3xn_dreamland_vfs_v10";

const FALLBACK_FILES = {
  "/src/main.tsx": `import { type Component } from "dreamland/core";
export const App: Component = function () {
  return <div style="padding:2rem"><h2>⚡ Dreamland Studio</h2><p>Select a template from the top bar.</p></div>;
};
export default App;
`,
};

export async function fetchTemplateManifest(baseUrl) {
  const res = await fetch(baseUrl + "templates/index.json");
  if (!res.ok) return [];
  const data = await res.json();
  return Array.isArray(data?.templates) ? data.templates : [];
}

export async function fetchTemplateFiles(baseUrl, tpl) {
  const out = {};
  if (!tpl?.files) return structuredClone(FALLBACK_FILES);
  await Promise.all(
    Object.entries(tpl.files).map(async ([vfsPath, relSrc]) => {
      const cleanRel = String(relSrc).replace(/^\.?\//, "");
      const res = await fetch(baseUrl + "templates/" + cleanRel);
      if (!res.ok) throw new Error(`Failed to load template file: ${cleanRel}`);
      out[vfsPath] = await res.text();
    })
  );
  return out;
}

export async function loadInitialFiles(baseUrl, templates) {
  const savedRaw = localStorage.getItem(STORAGE_KEY);
  if (savedRaw) {
    try {
      const parsed = JSON.parse(savedRaw);
      if (parsed && Object.keys(parsed).length > 0) return parsed;
    } catch (_) {}
  }
  const defaultTpl = templates[0];
  const files = defaultTpl ? await fetchTemplateFiles(baseUrl, defaultTpl) : structuredClone(FALLBACK_FILES);
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
