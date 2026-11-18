import { resolveVfsPath, findVfsFile } from "./vfs.js";

let esbuild = null;
let Babel = null;
const pkgMemCache = new Map();

export async function initCompiler(jsdelivrProxy) {
  const [esbuildMod, babelMod] = await Promise.all([
    import(jsdelivrProxy + "npm/esbuild-wasm@0.24.2/esm/browser.min.js"),
    import(jsdelivrProxy + "npm/@babel/standalone@7.26.4/+esm"),
  ]);
  esbuild = esbuildMod;
  Babel = babelMod.default || babelMod;
  await esbuild.initialize({
    wasmURL: jsdelivrProxy + "npm/esbuild-wasm@0.24.2/esbuild.wasm",
    worker: false,
  });
}

function dreamlandBabelPlugin({ types: t }) {
  function splitMember(node) {
    if (!t.isMemberExpression(node)) return null;
    const propExpr = node.computed
      ? node.property
      : t.isIdentifier(node.property)
      ? t.stringLiteral(node.property.name)
      : null;
    if (!propExpr) return null;
    return { obj: node.object, prop: propExpr };
  }

  return {
    visitor: {
      CallExpression(path) {
        if (!t.isIdentifier(path.node.callee, { name: "use" })) return;
        if (path.node.arguments.length !== 1) return;
        const arg = path.node.arguments[0];
        const parts = splitMember(arg);
        if (parts) {
          path.replaceWith(
            t.callExpression(t.identifier("__dl_use"), [parts.obj, parts.prop])
          );
        } else if (t.isIdentifier(arg)) {
          const setter = t.arrowFunctionExpression(
            [t.identifier("__v")],
            t.assignmentExpression("=", arg, t.identifier("__v"))
          );
          const getter = t.arrowFunctionExpression([], arg);
          path.replaceWith(
            t.callExpression(t.identifier("__dl_ref"), [getter, setter])
          );
        }
      },
      TaggedTemplateExpression(path) {
        if (!t.isIdentifier(path.node.tag, { name: "use" })) return;
        const quasi = path.node.quasi;
        const deps = [];
        for (const expr of quasi.expressions) {
          if (t.isMemberExpression(expr)) {
            deps.push(expr.object);
          }
        }
        const fn = t.arrowFunctionExpression(
          [],
          t.templateLiteral(quasi.quasis, quasi.expressions)
        );
        path.replaceWith(
          t.callExpression(t.identifier("__dl_tpl"), [fn, t.arrayExpression(deps)])
        );
      },
    },
  };
}

function compileDreamlandTsx(code, filename) {
  const res = Babel.transform(code, {
    filename,
    presets: [["typescript", { isTSX: true, allExtensions: true }]],
    plugins: [dreamlandBabelPlugin],
  });

  const runtimeHeader = [
    'import {',
    '  h,',
    '  Fragment,',
    '  Pointer as __dl_Pointer,',
    '  createState as __dl_createState,',
    '  stateListen as __dl_stateListen,',
    '  stateProxy as __dl_stateProxy',
    '} from "dreamland/core";',
    '',
    'const __dl_ensureSlot = (obj, prop) => {',
    '  const internal = obj && typeof obj === "object" ? obj[__dl_stateProxy] : null;',
    '  if (internal) {',
    '    if (!internal.listeners) internal.listeners = {};',
    '    if (!Array.isArray(internal.listeners[prop])) internal.listeners[prop] = [];',
    '  }',
    '  return internal;',
    '};',
    '',
    'const __dl_use = (obj, prop) => {',
    '  if (!obj) return undefined;',
    '  if (obj instanceof __dl_Pointer) return obj;',
    '  const rawVal = obj[prop];',
    '  if (rawVal instanceof __dl_Pointer) return rawVal;',
    '  if (typeof obj === "object" && __dl_stateProxy in obj) {',
    '    __dl_ensureSlot(obj, prop);',
    '    try {',
    '      return new __dl_Pointer(obj, prop);',
    '    } catch (_) {}',
    '  }',
    '  const box = __dl_createState({ v: rawVal });',
    '  __dl_ensureSlot(box, "v");',
    '  return new __dl_Pointer(box, "v");',
    '};',
    '',
    'const __dl_ref = (getFn, setFn) => {',
    '  const box = __dl_createState({ v: getFn() });',
    '  __dl_ensureSlot(box, "v");',
    '  __dl_stateListen(box, () => {',
    '    setFn(box.v);',
    '  });',
    '  return new __dl_Pointer(box, "v");',
    '};',
    '',
    'const __dl_tpl = (fn, deps) => {',
    '  const box = __dl_createState({ v: fn() });',
    '  __dl_ensureSlot(box, "v");',
    '  const update = () => {',
    '    box.v = fn();',
    '  };',
    '  for (const dep of deps) {',
    '    if (dep && typeof dep === "object" && __dl_stateProxy in dep) {',
    '      __dl_stateListen(dep, update);',
    '    }',
    '  }',
    '  return new __dl_Pointer(box, "v");',
    '};',
  ].join("\n");

  return runtimeHeader + "\n" + res.code;
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
      build.onResolve({ filter: /^dreamland(\/.*)?$/ }, (args) => {
        const sub = args.path.slice("dreamland".length);
        return {
          path: "https://esm.sh/dreamland@0.1.3" + sub,
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
        const isTsx = args.path.endsWith(".tsx") || args.path.endsWith(".jsx");
        if (isTsx) {
          try {
            const compiled = compileDreamlandTsx(raw, args.path);
            return { contents: compiled, loader: "jsx" };
          } catch (e) {
            return { errors: [{ text: String(e.message || e) }] };
          }
        }
        return { contents: raw, loader: "ts" };
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
    jsxFactory: "h",
    jsxFragment: "Fragment",
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
