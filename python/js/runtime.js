let worker=null,readyPromise=null,sequence=0,handlers={},activeReject=null;
const BASE=new URL("../",import.meta.url).href;
function emit(type,data={}){handlers[type]?.(data);}
function boot(){
  if(worker&&readyPromise)return readyPromise;
  worker=new Worker(new URL("./runtime.worker.js",import.meta.url),{type:"classic"});
  readyPromise=new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("Pyodide startup timed out. Check the runtime cache and reload.")),90000);
    worker.onmessage=(event)=>{
      const msg=event.data||{};
      if(msg.type==="ready"){clearTimeout(timer);emit("ready",msg);resolve(msg);}
      else if(msg.type==="init-error"){clearTimeout(timer);reject(new Error(msg.message||"Pyodide failed to initialize."));}
      else emit(msg.type,msg);
    };
    worker.onerror=(event)=>{clearTimeout(timer);const error=new Error(event.message||"Python worker crashed");emit("error",{message:error.message});if(activeReject)activeReject(error);reject(error);};
  }).catch(error=>{if(worker){worker.terminate();worker=null;}readyPromise=null;throw error;});
  worker.postMessage({type:"init",base:BASE});
  return readyPromise;
}
export function setRuntimeHandlers(next){handlers=next||{};}
export async function ensureRuntime(){return boot();}
export async function runProject(files,entry){
  await boot();const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{if(worker){worker.terminate();worker=null;readyPromise=null;}activeReject=null;handlers.done=null;handlers.runError=null;reject(new Error("Execution exceeded 60 seconds. The Python worker was stopped and can be restarted."));},60000);
    activeReject=error=>{clearTimeout(timer);activeReject=null;reject(error);};
    const previous=handlers.done;
    handlers.done=(msg)=>{if(msg.id!==id)return;clearTimeout(timer);activeReject=null;handlers.done=previous;resolve(msg);};
    const previousError=handlers.runError;
    handlers.runError=(msg)=>{if(msg.id!==id)return;clearTimeout(timer);activeReject=null;handlers.runError=previousError;reject(new Error(msg.message||"Python execution failed"));};
    worker.postMessage({type:"run",id,files,entry});
  });
}
export async function installPackage(name){
  await boot();const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("Package installation timed out.")),120000);
    const prev=handlers.packageDone,prevErr=handlers.packageError;
    handlers.packageDone=msg=>{if(msg.id!==id)return;clearTimeout(timer);handlers.packageDone=prev;try{const saved=JSON.parse(localStorage.getItem("n3xn_python_packages_v1")||"{}");saved[msg.name]=msg.installMode||"pyodide";localStorage.setItem("n3xn_python_packages_v1",JSON.stringify(saved));}catch(_){}resolve(msg);};
    handlers.packageError=msg=>{if(msg.id!==id)return;clearTimeout(timer);handlers.packageError=prevErr;reject(new Error(msg.message||"Package installation failed"));};
    worker.postMessage({type:"install",id,name});
  });
}
export async function runConsole(code){
  await boot();const id=++sequence;
  return new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>reject(new Error("Console command timed out.")),30000);
    const prev=handlers.replResult,prevErr=handlers.replError;
    handlers.replResult=msg=>{if(msg.id!==id)return;clearTimeout(timer);handlers.replResult=prev;resolve(msg.result||"");};
    handlers.replError=msg=>{if(msg.id!==id)return;clearTimeout(timer);handlers.replError=prevErr;reject(new Error(msg.message||"Python console error"));};
    worker.postMessage({type:"repl",id,code});
  });
}
export function sendCanvasClick(x,y){worker?.postMessage({type:"click",x,y});}
export function stopRuntime(){if(activeReject)activeReject(new Error("Execution stopped by user."));handlers.done=null;handlers.runError=null;if(worker)worker.terminate();worker=null;readyPromise=null;emit("stopped",{});}

export async function exportRuntimeAssets(){
  await boot();const id=++sequence;
  const live=await new Promise((resolve,reject)=>{
    const timer=setTimeout(()=>{handlers.exportAssets=previous;reject(new Error("Timed out collecting installed Python packages."));},30000);
    const previous=handlers.exportAssets;
    handlers.exportAssets=msg=>{if(msg.id!==id)return;clearTimeout(timer);handlers.exportAssets=previous;resolve(msg);};
    worker.postMessage({type:"export-assets",id});
  });
  const assets=new Map((live.assets||[]).map(a=>[a.name,a]));
  try{
    const cache=await caches.open("n3xn-python-export-assets");
    for(const request of await cache.keys()){
      const response=await cache.match(request);if(!response)continue;
      const name=decodeURIComponent(new URL(request.url).pathname.split("/").pop());
      if(!assets.has(name))assets.set(name,{name,url:response.headers.get("X-N3XN-Original-URL")||request.url,type:response.headers.get("content-type")||"application/octet-stream",bytes:await response.arrayBuffer()});
    }
  }catch(_){}
  let packages={};
  try{packages=JSON.parse(localStorage.getItem("n3xn_python_packages_v1")||"{}");}catch(_){}
  packages={...packages,...(live.packages||{})};
  return {assets:[...assets.values()],packages};
}
