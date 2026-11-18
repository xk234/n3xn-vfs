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

function transformDreamlandMacros(src) {
  // 1. Transform `use(target.prop)` -> `__dl_ptr(target, "prop")`
  let out = src.replace(
    /\buse\(\s*([a-zA-Z_$][\w$.]*?)\.([a-zA-Z_$][\w$]*)\s*\)/g,
    (_match, target, prop) => `__dl_ptr(${target}, "${prop}")`
  );
  // 2. Transform `use\`...\`` template literals -> reactive Pointer bound via stateListen
  out = out.replace(/\buse`([^`]*)`/g, (_match, tpl) => {
    const deps = [];
    tpl.replace(/\$\{\s*([a-zA-Z_$][\w$.]*?)\.([a-zA-Z_$][\w$]*)\s*\}/g, (_m, obj, prop) => {
      deps.push(`[${obj}, "${prop}"]`);
      return "";
    });
    return `__dl_tpl(() => \`${tpl}\`, [${deps.join(", ")}])`;
  });
  return out;
}

export async function bundleProject({ files, proxies, onWarn }) {
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
        // Pass the PROXY object (NOT unwrapped) to new Pointer(proxy, prop) — Pointer reads proxy[stateProxy].listen internally!
        const prefix =
          loader === "tsx" || loader === "jsx"
            ? `import { h as __dl_h, Fragment as __dl_Frag, Pointer as __dl_Pointer, createState as __dl_createState, stateListen as __dl_stateListen, stateProxy as __dl_stateProxy } from "dreamland/core";
const __dl_isStateProxy = (obj) => Boolean(obj && typeof obj === "object" && obj[__dl_stateProxy] && typeof obj[__dl_stateProxy].listen === "function");
const __dl_attachMap = (ptr, stateProxyObj, prop) => {
  if (ptr && typeof ptr.map !== "function") {
    ptr.map = (mapFn) => {
      const box = __dl_createState({ val: mapFn(stateProxyObj[prop]) });
      try {
        __dl_stateListen(stateProxyObj, prop, (v) => { box.val = mapFn(v); });
      } catch (_) {}
      return new __dl_Pointer(box, "val");
    };
  }
  return ptr;
};
const __dl_ptr = (obj, prop) => {
  if (!obj) return undefined;
  if (obj instanceof __dl_Pointer) return obj;
  if (obj[prop] instanceof __dl_Pointer) return obj[prop];
  if (__dl_isStateProxy(obj)) {
    const ptr = new __dl_Pointer(obj, prop);
    return __dl_attachMap(ptr, obj, prop);
  }
  // Component props (`cx`): bridge via createState box + getter sync
  const box = __dl_createState({ val: obj[prop] });
  if (__dl_isStateProxy(obj)) {
    __dl_stateListen(obj, prop, (v) => { box.val = v; });
  }
  const ptr = new __dl_Pointer(box, "val");
  return __dl_attachMap(ptr, box, "val");
};
const __dl_tpl = (fn, deps) => {
  const box = __dl_createState({ val: fn() });
  for (const [depObj, depProp] of deps) {
    if (__dl_isStateProxy(depObj)) {
      try {
        __dl_stateListen(depObj, depProp, () => { box.val = fn(); });
      } catch (_) {}
    }
  }
  return new __dl_Pointer(box, "val");
};\n`
            : "";
        return { contents: prefix + transformed, loader };
      });
    },
  };

  const virtualEntry = `
    import * as Entry from "/src/main.tsx";
    import { h } from "dreamland/core";
    const root = document.getElementById("app");
    if (root && root.childNodes.length === 0) {
      const C = Entry.default || Entry.App;
      if (typeof C === "function") root.appendChild(h(C, {}));
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

  if (out.warnings?.length && onWarn) {
    out.warnings.forEach((w) => onWarn(w.text));
  }

  const js = out.outputFiles[0].text;

  const runtimeShim = `<script>(()=>{
    try{localStorage.getItem("_")}catch{
      const m=new Map(),s={getItem:k=>m.has(k)?m.get(k):null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k),clear:()=>m.clear()};
      Object.defineProperty(window,"localStorage",{value:s});
      Object.defineProperty(window,"sessionStorage",{value:s});
    }
    const fmt = (v) => {
      if (v instanceof Error) return v.stack || (v.name + ": " + v.message);
      if (typeof v === "object" && v !== null) {
        try { return JSON.stringify(v, null, 2); } catch { return Object.prototype.toString.call(v); }
      }
      return String(v);
    };
    const send = (level, msg, stack = "") => {
      parent.postMessage({ type: "dl-console", level, msg, stack }, "*");
    };
    window.addEventListener("error", (e) => {
      const loc = e.filename ? \` (\${e.filename}:\${e.lineno}:\${e.colno})\` : "";
      send("err", (e.message || "Runtime Error") + loc, e.error?.stack || "");
    });
    window.addEventListener("unhandledrejection", (e) => {
      send("err", "Unhandled Promise Rejection: " + fmt(e.reason), e.reason?.stack || "");
    });
    ["log", "info", "warn", "error", "debug"].forEach((fn) => {
      const orig = console[fn];
      console[fn] = (...args) => {
        orig.apply(console, args);
        const level = fn === "error" ? "err" : fn === "warn" ? "warn" : "log";
        send(level, args.map(fmt).join(" "));
      };
    });
  })();<\/script>`;

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
