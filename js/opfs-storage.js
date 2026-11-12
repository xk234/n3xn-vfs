/**
 * n3xn OPFS storage backend (v3.0.7-beta experimental)
 *
 * Origin Private File System is often better than pure IndexedDB for:
 *  - large binary blobs (games packs, media, MC clients)
 *  - sequential read/write throughput
 *  - less structured-clone overhead
 *
 * Keep IDB for: account index, crypto keys, small metadata.
 * Beta users only — no migration promise from older IDB trees.
 *
 * Usage (future db.js wire-up):
 *   const root = await opfsGetRoot();
 *   await opfsWrite(root, "files/foo.bin", uint8);
 *   const data = await opfsRead(root, "files/foo.bin");
 */
export async function opfsSupported() {
  try {
    return !!(navigator.storage && navigator.storage.getDirectory);
  } catch {
    return false;
  }
}

export async function opfsGetRoot() {
  if (!(await opfsSupported())) throw new Error("OPFS not available");
  return navigator.storage.getDirectory();
}

export async function opfsEnsureDir(root, path) {
  const parts = String(path)
    .split("/")
    .filter(Boolean);
  let dir = root;
  for (const p of parts) {
    dir = await dir.getDirectoryHandle(p, { create: true });
  }
  return dir;
}

export async function opfsWrite(root, path, data) {
  const parts = String(path)
    .split("/")
    .filter(Boolean);
  const name = parts.pop();
  const dir = parts.length ? await opfsEnsureDir(root, parts.join("/")) : root;
  const fh = await dir.getFileHandle(name, { create: true });
  const w = await fh.createWritable();
  await w.write(data);
  await w.close();
}

export async function opfsRead(root, path) {
  const parts = String(path)
    .split("/")
    .filter(Boolean);
  const name = parts.pop();
  let dir = root;
  for (const p of parts) {
    dir = await dir.getDirectoryHandle(p);
  }
  const fh = await dir.getFileHandle(name);
  const file = await fh.getFile();
  return new Uint8Array(await file.arrayBuffer());
}

export async function opfsRemove(root, path) {
  const parts = String(path)
    .split("/")
    .filter(Boolean);
  const name = parts.pop();
  let dir = root;
  for (const p of parts) {
    dir = await dir.getDirectoryHandle(p);
  }
  await dir.removeEntry(name);
}

export async function opfsEstimate() {
  try {
    if (navigator.storage && navigator.storage.estimate) {
      return await navigator.storage.estimate();
    }
  } catch (_) {}
  return null;
}

if (typeof window !== "undefined") {
  window.__n3xnOpfs = {
    opfsSupported,
    opfsGetRoot,
    opfsWrite,
    opfsRead,
    opfsRemove,
    opfsEstimate,
  };
}
