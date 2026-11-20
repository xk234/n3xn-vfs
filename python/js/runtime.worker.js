let py=null,clickHandler=null,frameHandler=null,keyHandler=null,baseURL="",projectFiles={};
const send=(type,data={})=>self.postMessage({type,...data});

function releaseProxy(proxy){
  if(proxy&&typeof proxy.destroy==="function"){
    try{proxy.destroy();}catch(_){}
  }
}
function retainCallback(callback,label){
  if(!callback||typeof callback!=="function")throw new TypeError(label+" expects a callable Python function.");
  const retained=typeof callback.copy==="function"?callback.copy():null;
  if(!retained)throw new TypeError("Could not retain the Python callback. Pass a normal Python function.");
  return retained;
}
function releaseClickHandler(){
  const previous=clickHandler;clickHandler=null;releaseProxy(previous);
}
function releaseGameHandlers(){
  const oldFrame=frameHandler,oldKey=keyHandler;
  frameHandler=null;keyHandler=null;
  releaseProxy(oldFrame);releaseProxy(oldKey);
  send("gameLoop",{enabled:false});
  send("gameInput",{enabled:false});
}
function releaseCallbacks(){releaseClickHandler();releaseGameHandlers();}

async function initialize(base){
  baseURL=base;
  try{
    importScripts(baseURL+"__pyodide__/pyodide.js");
    py=await loadPyodide({indexURL:baseURL+"__pyodide__/",stdout:(text)=>send("stdout",{text}),stderr:(text)=>send("stderr",{text})});
    py.registerJsModule("n3xn",{
      write:(text,level)=>send("stdout",{text:String(text),level:level||"out"}),
      clear:(color)=>send("clear",{color:color||"#080f20"}),
      draw:(kind,x,y,w,h,color,label)=>send("draw",{kind,x,y,w,h,color,label}),
      draw_batch:(operations)=>{
        const converted=operations.toJs?operations.toJs({create_pyproxies:false}):operations;
        if(operations.destroy)operations.destroy();
        send("drawBatch",{operations:converted});
      },
      show_html:(html)=>send("html",{html:inlineProjectAssets(html)}),
      on_click:(callback)=>{clickHandler=retainCallback(callback,"n3xn.on_click()");},
      play_sound:(kind)=>send("sound",{kind:String(kind)}),
      on_frame:(callback)=>{
        releaseProxy(frameHandler);frameHandler=retainCallback(callback,"n3xn.on_frame()");
        send("gameLoop",{enabled:true});
      },
      on_key:(callback)=>{
        releaseProxy(keyHandler);keyHandler=retainCallback(callback,"n3xn.on_key()");
        send("gameInput",{enabled:true});
      }
    });
    send("ready",{version:py.version||"CPython / WebAssembly"});
  }catch(error){send("init-error",{message:error?.stack||String(error)});}
}
function assetDataURI(path){
  let value=String(path).split(/[?#]/)[0].replace(/\\/g,"/");
  const parts=[];for(const item of value.split("/")){if(!item||item===".")continue;if(item===".."){parts.pop();continue;}parts.push(item);}
  const key="/"+parts.join("/");let asset=projectFiles[key]??projectFiles[key.slice(1)];
  if(asset&&typeof asset==="object"&&asset.__n3xn_binary__&&asset.base64)return "data:"+(asset.mime||"application/octet-stream")+";base64,"+asset.base64;
  if(typeof asset!=="string")return null;
  const ext=key.split(".").pop().toLowerCase(),mime=({css:"text/css",js:"text/javascript",mjs:"text/javascript",svg:"image/svg+xml",html:"text/html",htm:"text/html",txt:"text/plain",json:"application/json",xml:"application/xml",woff:"font/woff",woff2:"font/woff2",ttf:"font/ttf",otf:"font/otf"})[ext]||"text/plain";
  const bytes=new TextEncoder().encode(asset);let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));
  return "data:"+mime+";charset=utf-8;base64,"+btoa(binary);
}
function inlineProjectAssets(html){
  const replace=(path)=>assetDataURI(path)||path;
  return String(html)
    .replace(/(\b(?:src|href)\s*=\s*["'])(?!data:|https?:|\/\/|#|javascript:|mailto:)([^"']+)(["'])/gi,(all,a,path,z)=>a+replace(path)+z)
    .replace(/url\(\s*(["']?)(?!data:|https?:|\/\/|#)([^)'"]+)\1\s*\)/gi,(all,q,path)=>"url("+q+replace(path)+q+")");
}
function cleanProjectPath(path){return String(path).replace(/^\/+/, "").split("/").filter(p=>p&&p!=="."&&p!=="..").join("/");}
async function syncFiles(files){
  projectFiles=files||{};
  const root="/home/pyodide/project";
  try{await py.runPythonAsync("import shutil, os\nshutil.rmtree('/home/pyodide/project', ignore_errors=True)\nos.makedirs('/home/pyodide/project', exist_ok=True)");}catch(_){}
  try{py.FS.mkdirTree(root);}catch(_){}
  for(const [path,content] of Object.entries(files||{})){
    const clean=cleanProjectPath(path);if(!clean)continue;
    const full=root+"/"+clean,parent=full.slice(0,full.lastIndexOf("/"));
    try{py.FS.mkdirTree(parent);}catch(_){}
    if(content&&typeof content==="object"&&content.__n3xn_binary__&&content.base64){const binary=atob(content.base64),bytes=new Uint8Array(binary.length);for(let i=0;i<binary.length;i++)bytes[i]=binary.charCodeAt(i);py.FS.writeFile(full,bytes);}else py.FS.writeFile(full,String(content));
  }
  py.globals.set("_n3xn_project_root",root);
}
async function run(id,files,entry){
  releaseCallbacks();
  try{
    await syncFiles(files);
    const pythonSources=Object.entries(files||{}).filter(([path,content])=>path.endsWith(".py")&&typeof content==="string").map(([,content])=>content).join("\n");
    if(pythonSources&&typeof py.loadPackagesFromImports==="function"){
      try{const loaded=await py.loadPackagesFromImports(pythonSources);if(loaded?.length)send("stdout",{text:"Auto-loaded Pyodide packages: "+loaded.join(", "),level:"system"});}
      catch(error){send("stdout",{text:"Automatic package preloading skipped: "+(error.message||error),level:"warn"});}
    }
    const clean=cleanProjectPath(entry||"/main.py"),full="/home/pyodide/project/"+clean;
    py.globals.set("_n3xn_entry",full);
    await py.runPythonAsync("import os, sys, runpy\nos.chdir(_n3xn_project_root)\nsys.path.insert(0, _n3xn_project_root)\nrunpy.run_path(_n3xn_entry, run_name='__main__')");
    send("done",{id});
  }catch(error){
    releaseCallbacks();send("runError",{id,message:error?.stack||String(error)});
  }
}
async function install(id,name){
  let pkg=String(name||"").trim();
  try{
    if(!/^[A-Za-z0-9_.-]+$/.test(pkg))throw new Error("Use a package name such as numpy or requests.");
    const aliases={pygame:"pygame-ce"};pkg=aliases[pkg.toLowerCase()]||pkg;
    try{await py.loadPackage(pkg);}
    catch(loadError){
      await py.loadPackage("micropip");
      py.globals.set("_n3xn_pkg_name",pkg);
      try{await py.runPythonAsync("import micropip\\nawait micropip.install(_n3xn_pkg_name)");}
      finally{py.globals.delete("_n3xn_pkg_name");}
    }
    send("packageDone",{id,name:pkg});
  }catch(error){
    const detail=error?.message||String(error);
    const hint=/pygame-ce|pygame/i.test(pkg)?" In Pyodide, install pygame-ce (it provides the pygame import); desktop pygame wheels are not interchangeable.":" Pyodide can install pure-Python wheels and WebAssembly-compatible wheels, but not ordinary desktop/native wheels.";
    send("packageError",{id,name:pkg,message:detail+hint});
  }
}
function invoke(proxy,args){
  if(!proxy)return;
  try{const result=proxy(...args);releaseProxy(result);}
  catch(error){send("stderr",{text:error?.stack||String(error)});}
}
self.onmessage=async(event)=>{
  const msg=event.data||{};
  if(msg.type==="init"){await initialize(msg.base);return;}
  if(msg.type==="run"){if(!py){send("runError",{id:msg.id,message:"Python runtime is not initialized."});return;}await run(msg.id,msg.files,msg.entry);return;}
  if(msg.type==="install"){if(!py){send("packageError",{id:msg.id,message:"Python runtime is not initialized."});return;}await install(msg.id,msg.name);return;}
  if(msg.type==="repl"){
    try{const result=await py.runPythonAsync(msg.code);let value="";if(result!==undefined&&result!==null){value=String(result);releaseProxy(result);}send("replResult",{id:msg.id,result:value});}
    catch(error){send("replError",{id:msg.id,message:error?.stack||String(error)});}
    return;
  }
  if(msg.type==="click"){invoke(clickHandler,[msg.x,msg.y]);return;}
  if(msg.type==="frame"){invoke(frameHandler,[msg.dt]);send("frameDone",{});return;}
  if(msg.type==="key"){invoke(keyHandler,[msg.key,msg.pressed]);}
};
