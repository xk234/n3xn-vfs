import { resolveVfsPath, findVfsFile } from "./vfs.js";

let esbuild = null;
const pkgMemCache = new Map();

export async function initCompiler(jsdelivrProxy) {
  esbuild = await import(jsdelivrProxy + "npm/esbuild-wasm@0.24.2/esm/browser.min.js");
  await esbuild.initialize({
    wasmURL: jsdelivrProxy + "npm/esbuild-wasm@0.24.2/esbuild.wasm",
    worker: false,
  });
}

// Transforms Dreamland's `use(...)` macro into real Dreamland Pointer / computed bindings
function transformDreamlandMacros(src) {
  // 1. Transform `use(target.prop)` -> `__dl_ptr(target, "prop")`
  let out = src.replace(
    /\buse\(\s*([a-zA-Z_$][\w$.]*?)\.([a-zA-Z_$][\w$]*)\s*\)/g,
    (_match, target, prop) => `__dl_ptr(${target}, "${prop}")`
  );
  // 2. Transform `use\`...\`` template strings -> `__dl_tpl(() => \`...\`)`
  out = out.replace(/\buse`([^`]*)`/g, (_match, tpl) => {
    return `__dl_tpl(() => \`${tpl}\`)`;
  });
  return out;
}

export async function bundleProject({ files, proxies }) {
  const { esmProxy, jsdelivrProxy, anyProxy } = proxies;
  const cssChunks = [];

  function toProxyUrl(upstreamUrl) {
    if (upstreamUrl.startsWith("https://esm.sh/")) {
      return esmProxy + upstreamUrl.slice("https://esm.sh/".length);
    }
    if (upstreamUrl.startsWith("https://cdn.jsdelivr.net/")) {
      return jsdelivrProxy + upstreamUrl.slice("https://cdn.jsdelivr.net/".length);
    }
    return anyProxy + encodeURIComponent(upstreamUrl);
  }

  function fromProxyUrl(proxyUrl) {
    if (proxyUrl.startsWith(esmProxy)) return "https://esm.sh/" + proxyUrl.slice(esmProxy.length);
    if (proxyUrl.startsWith(jsdelivrProxy)) return "https://cdn.jsdelivr.net/" + proxyUrl.slice(jsdelivrProxy.length);
    if (proxyUrl.startsWith(anyProxy)) return decodeURIComponent(proxyUrl.slice(anyProxy.length));
    return proxyUrl;
  }

  async function fetchPackageSource(upstreamUrl) {
    if (pkgMemCache.has(upstreamUrl)) return pkgMemCache.get(upstreamUrl);
    const res = await fetch(toProxyUrl(upstreamUrl));
    if (!res.ok) throw new Error(`HTTP ${res.status} for ${upstreamUrl}`);
    const ct = (res.headers.get("content-type") || "").toLowerCase();
    const text = await res.text();
    if (ct.includes("text/html") || text.trimStart().startsWith("<!")) {
      throw new Error(`Received HTML instead of JS for ${upstreamUrl}`);
    }
    pkgMemCache.set(upstreamUrl, text);
    return text;
  }

  const vfsPlugin = {
    name: "n3xn-vfs",
    setup(build) {
      build.onResolve({ filter: /^https?:\/\// }, (args) => ({
        path: args.path,
        namespace: "http-pkg",
      }));
      build.onResolve({ filter: /^(\/|\.)/, namespace: "http-pkg" }, (args) => {
        const upstreamImporter = fromProxyUrl(args.importer);
        return {
          path: new URL(args.path, upstreamImporter).href,
          namespace: "http-pkg",
        };
      });
      build.onResolve({ filter: /^[^./]/ }, (args) => ({
        path: "https://esm.sh/" + args.path,
        namespace: "http-pkg",
      }));
      build.onLoad({ filter: /.*/, namespace: "http-pkg" }, async (args) => {
        try {
          const text = await fetchPackageSource(args.path);
          const loader = args.path.endsWith(".css") ? "css" : args.path.endsWith(".json") ? "json" : "js";
          if (loader === "css") {
            cssChunks.push(text);
            return { contents: "", loader: "js" };
          }
          return { contents: text, loader };
        } catch (e) {
          return { errors: [{ text: String(e.message || e) }] };
        }
      });
      build.onResolve({ filter: /^(\.|\/)/ }, (args) => {
        const importer = String(args.importer || "/src/main.tsx").replace(/^vfs:/, "");
        const base = resolveVfsPath(importer, args.path);
        const found = findVfsFile(files, base);
        if (found) return { path: found, namespace: "vfs" };
        return { errors: [{ text: `Not found: ${args.path} (resolved ${base})` }] };
      });
      build.onLoad({ filter: /.*/, namespace: "vfs" }, (args) => {
        const raw = files[args.path] ?? "";
        if (args.path.endsWith(".css")) {
          cssChunks.push(raw);
          return { contents: "", loader: "js" };
        }
        if (args.path.endsWith(".json")) return { contents: raw, loader: "json" };
        const loader = args.path.endsWith(".tsx") ? "tsx" : args.path.endsWith(".ts") ? "ts" : "jsx";
        const transformed = transformDreamlandMacros(raw);
        // Inject Dreamland runtime helpers + real Pointer constructor
        const prefix =
          loader === "tsx" || loader === "jsx"
            ? `import * as __dl_mod from "dreamland/core";
const { h: __dl_h, Fragment: __dl_Frag } = __dl_mod;
const __dl_ptr = (obj, prop) => {
  if (__dl_mod.Pointer) return new __dl_mod.Pointer(obj, prop);
  if (__dl_mod.use) return __dl_mod.use(obj, prop);
  return obj[prop];
};
const __dl_tpl = (fn) => {
  if (__dl_mod.Pointer) {
    const s = __dl_mod.createState ? __dl_mod.createState({ val: fn() }) : { val: fn() };
    return new __dl_mod.Pointer(s, "val");
  }
  return fn();
};\n`
            : "";
        return { contents: prefix + transformed, loader };
      });
    },
  };

  const virtualEntry = `
    import * as Entry from "/src/main.tsx";
    import * as DL from "dreamland/core";
    console.log("[Dreamland runtime exports]", Object.keys(DL));
    const root = document.getElementById("app");
    if (root && root.childNodes.length === 0) {
      const C = Entry.default || Entry.App;
      if (typeof C === "function") root.appendChild(DL.h(C, {}));
    }
  `;

  const out = await esbuild.build({
    stdin: { contents: virtualEntry, resolveDir: "/", loader: "tsx" },
    bundle: true,
    write: false,
    format: "esm",
    target: "es2022",
    jsx: "transform",
    jsxFactory: "__dl_h",
    jsxFragment: "__dl_Frag",
    plugins: [vfsPlugin],
  });

  const js = out.outputFiles[0].text;
  const runtimeShim = `<script>(()=>{try{localStorage.getItem("_")}catch{const m=new Map(),s={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};Object.defineProperty(window,"localStorage",{value:s});Object.defineProperty(window,"sessionStorage",{value:s})}window.addEventListener("error",e=>parent.postMessage({type:"err",msg:e.message},"*"));["log","warn","error"].forEach(fn=>{const o=console[fn];console[fn]=(...a)=>{o(...a);parent.postMessage({type:fn==="error"?"err":"log",msg:a.join(" ")},"*")}})})();<\/script>`;

  return (
    "<!doctype html><html><head><meta charset=UTF-8><style>*{box-sizing:border-box;margin:0;padding:0}body{background:#090d16;color:#f8fafc;font-family:system-ui}" +
    cssChunks.join("\n") +
    "</style>" +
    runtimeShim +
    "</head><body><div id=app></div><script type=module>" +
    js +
    "</" +
    "script></body></html>"
  );
}
