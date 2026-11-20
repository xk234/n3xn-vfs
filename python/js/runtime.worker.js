let py=null,clickHandler=null,frameHandler=null,keyHandler=null,baseURL="";
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
      show_html:(html)=>send("html",{html:String(html)}),
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
function cleanProjectPath(path){return String(path).replace(/^\/+/, "").split("/").filter(p=>p&&p!=="."&&p!=="..").join("/");}
async function syncFiles(files){
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
    const clean=cleanProjectPath(entry||"/main.py"),full="/home/pyodide/project/"+clean;
    py.globals.set("_n3xn_entry",full);
    await py.runPythonAsync("import os, sys, runpy\nos.chdir(_n3xn_project_root)\nsys.path.insert(0, _n3xn_project_root)\nrunpy.run_path(_n3xn_entry, run_name='__main__')");
    send("done",{id});
  }catch(error){
    releaseCallbacks();send("runError",{id,message:error?.stack||String(error)});
  }
}
async function install(id,name){
  try{
    const pkg=String(name||"").trim();
    if(!/^[A-Za-z0-9_.-]+$/.test(pkg))throw new Error("Use a package name such as numpy or requests.");
    py.globals.set("_n3xn_pkg_name",pkg);
    try{await py.loadPackage(pkg);}catch(_){await py.runPythonAsync("import micropip\nawait micropip.install(_n3xn_pkg_name)");}
    py.globals.delete("_n3xn_pkg_name");send("packageDone",{id,name:pkg});
  }catch(error){send("packageError",{id,name,message:error?.stack||String(error)});}
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
