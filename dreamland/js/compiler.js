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
  // 2. Transform `use\`...\`` template literals -> reactive Pointer
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
        // Clean reactive Pointer bridge that tracks property mutations without misusing stateListen's signature
        const prefix =
          loader === "tsx" || loader === "jsx"
            ? `import { h as __dl_h, Fragment as __dl_Frag, Pointer as __dl_Pointer, stateProxy as __dl_stateProxy } from "dreamland/core";
class __dl_ReactivePointer extends __dl_Pointer {
  constructor(getFn, setFn) {
    super(getFn, setFn);
    this._subs = [];
    this._val = getFn();
  }
  get value() { return this._val; }
  set value(v) {
    if (Object.is(this._val, v)) return;
    this._val = v;
    for (const fn of this._subs) fn(v);
  }
  get val() { return this._val; }
  set val(v) { this.value = v; }
  listen(fn) {
    if (typeof fn === "function") this._subs.push(fn);
  }
  map(mapFn) {
    const child = new __dl_ReactivePointer(() => mapFn(this._val), () => {});
    this.listen((v) => { child.value = mapFn(v); });
    return child;
  }
}
const __dl_watchers = new WeakMap();
const __dl_watchProp = (obj, prop, cb) => {
  if (!obj || (typeof obj !== "object" && typeof obj !== "function")) return;
  let propMap = __dl_watchers.get(obj);
  if (!propMap) {
    propMap = new Map();
    __dl_watchers.set(obj, propMap);
  }
  let subs = propMap.get(prop);
  if (!subs) {
    subs = new Set();
    propMap.set(prop, subs);
    const target = (typeof obj === "object" && __dl_stateProxy in obj) ? obj[__dl_stateProxy] : obj;
    let cur = target[prop];
    const desc = Object.getOwnPropertyDescriptor(target, prop);
    if (!desc || desc.configurable) {
      Object.defineProperty(target, prop, {
        configurable: true,
        enumerable: true,
        get() { return desc && desc.get ? desc.get.call(this) : cur; },
        set(next) {
          if (desc && desc.set) desc.set.call(this, next);
          else cur = next;
          for (const fn of subs) fn(next);
        }
      });
    }
  }
  subs.add(cb);
};
const __dl_ptr = (obj, prop) => {
  if (!obj) return undefined;
  if (obj instanceof __dl_Pointer) return obj;
  if (obj[prop] instanceof __dl_Pointer) return obj[prop];
  const ptr = new __dl_ReactivePointer(() => obj[prop], (v) => { obj[prop] = v; });
  __dl_watchProp(obj, prop, (v) => { ptr.value = v; });
  return ptr;
};
const __dl_tpl = (fn, deps) => {
  const ptr = new __dl_ReactivePointer(() => fn(), () => {});
  for (const [depObj, depProp] of deps) {
    __dl_watchProp(depObj, depProp, () => { ptr.value = fn(); });
  }
  return ptr;
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
