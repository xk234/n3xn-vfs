const DB_NAME = "n3xn-python-studio";
const DB_VERSION = 1;
const STORE = "projects";
const PROJECT_KEY = "default";
const LEGACY_KEY = "n3xn_python_studio_v1";
const FALLBACK = {"/main.py":"print('Welcome to n3xn Python Studio')\n"};

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => { if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE); };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
export async function saveProject(files, entry) {
  const payload = {files, entry, updatedAt: Date.now()};
  try {
    const db = await openDB();
    await new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, "readwrite");
      tx.objectStore(STORE).put(payload, PROJECT_KEY);
      tx.oncomplete = resolve; tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch (error) {
    try { localStorage.setItem(LEGACY_KEY, JSON.stringify(payload)); }
    catch (_) { throw new Error("Project storage is full. Export your project and remove unused files."); }
  }
}
export async function loadProject() {
  try {
    const db = await openDB();
    const payload = await new Promise((resolve, reject) => {
      const req = db.transaction(STORE, "readonly").objectStore(STORE).get(PROJECT_KEY);
      req.onsuccess = () => resolve(req.result); req.onerror = () => reject(req.error);
    });
    db.close();
    if (payload && payload.files && Object.keys(payload.files).length) return payload;
  } catch (_) {}
  try {
    const old = JSON.parse(localStorage.getItem(LEGACY_KEY) || "null");
    if (old?.files) return old;
    if (old && typeof old === "object") return {files:old, entry:"/main.py"};
  } catch (_) {}
  return {files:{...FALLBACK}, entry:"/main.py"};
}
export async function fetchManifest(base) {
  const res = await fetch(base + "templates/index.json");
  if (!res.ok) throw new Error("Could not load Python template manifest (" + res.status + ")");
  const data = await res.json();
  return Array.isArray(data.templates) ? data.templates : [];
}
export async function fetchTemplate(base, template) {
  const files = {};
  await Promise.all(Object.entries(template.files || {}).map(async ([path, source]) => {
    const res = await fetch(base + "templates/" + source);
    if (!res.ok) throw new Error("Template file failed: " + source + " (" + res.status + ")");
    files[path] = await res.text();
  }));
  return {files, entry:template.entry || "/main.py"};
}
export function normalizePath(path) {
  const parts = [];
  for (const item of String(path).replace(/\\/g,"/").split("/")) {
    if (!item || item === ".") continue;
    if (item === "..") parts.pop(); else parts.push(item);
  }
  return "/" + parts.join("/");
}
export function downloadProject(payload) {
  const blob = new Blob([JSON.stringify({format:"n3xn-python-project",version:1,...payload},null,2)],{type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a"); a.href=url; a.download="python-project.n3py.json"; a.click();
  setTimeout(()=>URL.revokeObjectURL(url),1000);
}
