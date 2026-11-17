/**
 * n3xn FS bridge — expose module fs as window.__n3xnFS / window.fs
 */
let ready = null;
let fsMod = null;

function decodeContent(rec) {
  if (rec == null) return "";
  const content = rec.content !== undefined ? rec.content : rec;
  if (typeof content === "string") return content;
  if (content instanceof ArrayBuffer) return new TextDecoder().decode(content);
  if (content instanceof Uint8Array) return new TextDecoder().decode(content);
  try {
    return new TextDecoder().decode(content);
  } catch (_) {
    return String(content);
  }
}

export async function ensureFsBridge() {
  if (ready) return ready;
  ready = (async () => {
    fsMod = await import("./fs.js");
    try {
      await fsMod.loadTree();
    } catch (e) {
      console.warn("[fs-bridge] loadTree", e);
    }

    const bridge = {
      async listDir(path) {
        path = path || "/";
        try {
          const rows = fsMod.ls(path);
          return rows.map((r) => ({
            name: r.name,
            type: r.type === "dir" ? "dir" : "file",
            size: r.size || 0,
            modified: r.modified,
          }));
        } catch (e) {
          if (path !== "/") return [{ name: "..", type: "dir" }];
          throw e;
        }
      },
      async readText(path) {
        const rec = await fsMod.readFile(path);
        if (!rec) throw new Error("No such file: " + path);
        const content = rec.content !== undefined ? rec.content : rec;
        if (content instanceof Blob) return await content.text();
        return decodeContent(rec);
      },
      async readFile(path) {
        return fsMod.readFile(path);
      },
      async writeText(path, text) {
        await fsMod.writeFile(path, text, { mime: "text/plain; charset=utf-8" });
      },
      async writeFile(path, content, meta) {
        return fsMod.writeFile(path, content, meta || {});
      },
      async mkdir(path) {
        return fsMod.mkdir(path, { parents: true });
      },
      async remove(path) {
        return fsMod.remove(path);
      },
      async removeRecursive(path) {
        if (fsMod.removeRecursive) return fsMod.removeRecursive(path);
        return fsMod.remove(path);
      },
      flatten(path) {
        return fsMod.flatten(path || "/");
      },
      exists(path) {
        return fsMod.exists(path);
      },
      isDir(path) {
        return fsMod.isDir(path);
      },
      async loadTree() {
        return fsMod.loadTree();
      },
      async rebuildTreeFromFiles() {
        return fsMod.rebuildTreeFromFiles();
      },
      getTree() {
        return fsMod.getTree();
      },
      _mod: fsMod,
    };

    if (typeof window !== "undefined") {
      window.__n3xnFS = bridge;
      window.fs = bridge;
    }
    return bridge;
  })();
  return ready;
}

if (typeof window !== "undefined") {
  window.__n3xnEnsureFs = ensureFsBridge;
}
