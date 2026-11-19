let py=null,clickHandler=null,baseURL="";
const send=(type,data={})=>self.postMessage({type,...data});
const downloadedWheels=new Map();
const installedPackages=new Set();
const nativeFetch=self.fetch.bind(self);
self.fetch=async(input,init)=>{
  const response=await nativeFetch(input,init);
  const url=typeof input==="string"?input:input?.url||String(input);
  const method=init?.method||input?.method||"GET";
  if(method==="GET"&&response.ok&&/\\.whl(?:[?#]|$)/i.test(url)){
    try{
      const bytes=await response.clone().arrayBuffer();
      const name=decodeURIComponent(new URL(url).pathname.split("/").pop());
      downloadedWheels.set(name,{name,url,type:response.headers.get("content-type")||"application/octet-stream",bytes});
    }catch(_){}
  }
  return response;
};

function releaseClickHandler(){
  const previous=clickHandler;
  clickHandler=null;
  if(previous&&typeof previous.destroy==="function"){
    try{previous.destroy();}catch(_){}
  }
}

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
      show_html:(html)=>send("html",{html:String(html)}),
      on_click:(callback)=>{
        if(!callback||typeof callback!=="function")throw new TypeError("n3xn.on_click() expects a callable Python function.");
        // Pyodide 0.26 automatically destroys temporary PyProxy arguments after
        // the Python-to-JavaScript call returns. Keep our own reference because
        // this callback is invoked later by a separate worker message.
        const retained=typeof callback.copy==="function"?callback.copy():null;
        if(!retained)throw new TypeError("Could not retain the Python click callback. Pass a normal Python function.");
        releaseClickHandler();
        clickHandler=retained;
      }
    });
    send("ready",{version:py.version||"CPython / WebAssembly"});
  }catch(error){send("init-error",{message:error?.stack||String(error)});}
}
function cleanProjectPath(path){return String(path).replace(/^\/+/, "").split("/").filter(p=>p&&p!=="."&&p!=="..").join("/");}
async function syncFiles(files){
  const root="/home/pyodide/project";
  try{await py.runPythonAsync("import shutil, os\nshutil.rmtree('/home/pyodide/project', ignore_errors=True)\nos.makedirs('/home/pyodide/project', exist_ok=True)");}catch(_){}
  try{py.FS.mkdirTree(root);}catch(_){}
  for(const [path,content] of Object.entries(files||{})){
    const clean=cleanProjectPath(path);
    if(!clean)continue;
    const full=root+"/"+clean;
    const parent=full.slice(0,full.lastIndexOf("/"));
    try{py.FS.mkdirTree(parent);}catch(_){}
    py.FS.writeFile(full,String(content));
  }
  py.globals.set("_n3xn_project_root",root);
}
async function run(id,files,entry){
  releaseClickHandler();
  try{
    await syncFiles(files);
    const clean=cleanProjectPath(entry||"/main.py");
    const full="/home/pyodide/project/"+clean;
    py.globals.set("_n3xn_entry",full);
    await py.runPythonAsync("import os, sys, runpy\nos.chdir(_n3xn_project_root)\nsys.path.insert(0, _n3xn_project_root)\nrunpy.run_path(_n3xn_entry, run_name='__main__')");
    send("done",{id});
  }catch(error){
    releaseClickHandler();
    send("runError",{id,message:error?.stack||String(error)});
  }
}
async function install(id,name){
  try{
    const pkg=String(name||"").trim();
    if(!/^[A-Za-z0-9_.-]+$/.test(pkg))throw new Error("Use a package name such as numpy or requests.");
    py.globals.set("_n3xn_pkg_name",pkg);
    try{await py.loadPackage(pkg);}
    catch(_){await py.runPythonAsync("import micropip\nawait micropip.install(_n3xn_pkg_name)");}
    py.globals.delete("_n3xn_pkg_name");
    installedPackages.add(pkg);
    send("packageDone",{id,name:pkg});
  }catch(error){send("packageError",{id,name,message:error?.stack||String(error)});}
}
self.onmessage=async(event)=>{
  const msg=event.data||{};
  if(msg.type==="init"){await initialize(msg.base);return;}
  if(msg.type==="run"){if(!py){send("runError",{id:msg.id,message:"Python runtime is not initialized."});return;}await run(msg.id,msg.files,msg.entry);return;}
  if(msg.type==="install"){if(!py){send("packageError",{id:msg.id,message:"Python runtime is not initialized."});return;}await install(msg.id,msg.name);return;}
  if(msg.type==="export-assets"){
    const assets=[...downloadedWheels.values()].map(asset=>({name:asset.name,url:asset.url,type:asset.type,bytes:asset.bytes.slice(0)}));
    const transfer=assets.map(asset=>asset.bytes);
    self.postMessage({type:"exportAssets",id:msg.id,assets,packages:[...installedPackages]},transfer);
    return;
  }
  if(msg.type==="repl"){
    try{const result=await py.runPythonAsync(msg.code);let value="";if(result!==undefined&&result!==null){value=String(result);if(result&&typeof result.destroy==="function")result.destroy();}send("replResult",{id:msg.id,result:value});}
    catch(error){send("replError",{id:msg.id,message:error?.stack||String(error)});}
    return;
  }
  if(msg.type==="click"&&clickHandler){
    try{const result=clickHandler(msg.x,msg.y);if(result&&typeof result.destroy==="function")result.destroy();}
    catch(error){send("stderr",{text:error?.stack||String(error)});}
  }
};
