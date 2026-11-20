const VERSION="n3xn-python-shell-v5";
const PYODIDE_CACHE="n3xn-python-pyodide-0262";
const BASE=new URL("./",self.location.href);
const PY_PREFIX=new URL("__pyodide__/",BASE).pathname;
const PY_REMOTE="https://cdn.jsdelivr.net/pyodide/v0.26.2/full/";
const MONACO_PREFIX=new URL("__cdn__/monaco/",BASE).pathname;
const MONACO_CACHE="n3xn-python-monaco-0520";
const SHELL=["./","./index.html","./playground.html","./playground.css","./js/vfs.js","./js/monaco.js","./js/runtime.js","./js/runtime.worker.js","./js/audio.js","./js/playground.js","./js/singlefile.js","./templates/index.json","./templates/basics/hello.py","./templates/data/number-lab.py","./templates/data/csv-lab.py","./templates/data/sales.csv","./templates/graphics/clicker.py","./templates/graphics/mandelbrot.py","./templates/games/README.md","./templates/games/geometry_dash/main.py","./templates/games/geometry_dash/__init__.py","./templates/games/geometry_dash/config.py","./templates/games/geometry_dash/levels.py","./templates/games/geometry_dash/effects.py","./templates/games/geometry_dash/engine.py","./sw.js"];
const CORE=["pyodide.js","pyodide.asm.js","pyodide.asm.wasm","pyodide-lock.json","python_stdlib.zip"];
self.addEventListener("install",event=>event.waitUntil((async()=>{const cache=await caches.open(VERSION);await Promise.allSettled(SHELL.map(async path=>{const url=new URL(path,BASE).href;const res=await fetch(url);if(res.ok)await cache.put(url,res);}));await self.skipWaiting();})()));
self.addEventListener("activate",event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith("n3xn-python-")&&k!==VERSION&&k!==PYODIDE_CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
async function pyodideFetch(request,url){
 const cache=await caches.open(PYODIDE_CACHE),hit=await cache.match(request);if(hit)return hit;
 const relative=url.pathname.slice(PY_PREFIX.length)+url.search;
 try{const res=await fetch(PY_REMOTE+relative,{mode:"cors",credentials:"omit"});if(res.ok)await cache.put(request,res.clone());return res;}
 catch(error){return new Response("Pyodide asset unavailable offline: "+relative,{status:503,headers:{"Content-Type":"text/plain"}});}
}
async function monacoFetch(request,url){
 const cache=await caches.open(MONACO_CACHE),hit=await cache.match(request);if(hit)return hit;
 const relative=url.pathname.slice(MONACO_PREFIX.length);
 try{const res=await fetch("https://cdn.jsdelivr.net/"+relative,{mode:"cors",credentials:"omit"});if(res.ok)await cache.put(request,res.clone());return res;}
 catch(_){return new Response("Monaco asset unavailable offline: "+relative,{status:503});}
}
async function warmMonaco(){
 const cache=await caches.open(MONACO_CACHE);
 const core=["npm/monaco-editor@0.52.0/min/vs/loader.js","npm/monaco-editor@0.52.0/min/vs/editor/editor.main.js","npm/monaco-editor@0.52.0/min/vs/editor/editor.main.css","npm/monaco-editor@0.52.0/min/vs/base/worker/workerMain.js"];
 await Promise.allSettled(core.map(async path=>{const url=new URL("__cdn__/monaco/"+path,BASE).href;if(await cache.match(url))return;const res=await fetch("https://cdn.jsdelivr.net/"+path,{mode:"cors",credentials:"omit"});if(res.ok)await cache.put(url,res);}));
}
async function warm(){
 const cache=await caches.open(PYODIDE_CACHE);
 await Promise.allSettled(CORE.map(async name=>{const url=new URL("__pyodide__/"+name,BASE).href;if(await cache.match(url))return;const res=await fetch(PY_REMOTE+name,{mode:"cors",credentials:"omit"});if(res.ok)await cache.put(url,res);}));
 await warmMonaco();
}
self.addEventListener("message",event=>{if(event.data?.type==="WARM_PYODIDE")event.waitUntil(warm());});
self.addEventListener("fetch",event=>{
 const request=event.request;if(request.method!=="GET")return;const url=new URL(request.url);
 if(url.origin===self.location.origin&&url.pathname.startsWith(PY_PREFIX)){event.respondWith(pyodideFetch(request,url));return;}
 if(url.origin===self.location.origin&&url.pathname.startsWith(MONACO_PREFIX)){event.respondWith(monacoFetch(request,url));return;}
 if(url.origin===self.location.origin&&url.pathname.startsWith(BASE.pathname)){
  event.respondWith((async()=>{const cache=await caches.open(VERSION);try{const res=await fetch(request);if(res.ok)cache.put(request,res.clone());return res;}catch(_){return (await cache.match(request))||new Response("Offline file unavailable",{status:503});}})());
 }
});
