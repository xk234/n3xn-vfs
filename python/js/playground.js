import {loadProject,saveProject,fetchManifest,fetchTemplate,normalizePath,downloadProject} from "./vfs.js";
import {initMonaco,switchModel,removeModel,setEditorTheme,setPythonMarkers,getEditor,clearPythonMarkers} from "./monaco.js";
import {setRuntimeHandlers,ensureRuntime,runProject,runConsole,installPackage,stopRuntime,sendCanvasClick,sendFrame,sendKey} from "./runtime.js";
import {unlockAudio,playGameSound,stopGameMusic} from "./audio.js";
import {exportSingleHTML} from "./singlefile.js";
const $=id=>document.getElementById(id);
const BASE=new URL("../",import.meta.url).href;
const status=$("runtime-status"),consoleOut=$("console-out"),fileList=$("file-list"),canvas=$("graphics-canvas"),ctx=canvas.getContext("2d");
let files={},entry="/main.py",activeFile="",templates=[],editor=null,saveTimer=null,runStarted=0;
let gameFrame=0,lastFrame=0,frameAccumulator=0,framePending=false,gameLoopActive=false,gameInputActive=false;
function log(text,level="out"){
 const row=document.createElement("div");row.className="log "+level;row.textContent=String(text);consoleOut.appendChild(row);consoleOut.scrollTop=consoleOut.scrollHeight;
}
function setStatus(text,state=""){
 status.className="status "+state;status.lastChild?.remove();status.appendChild(document.createTextNode(" "+text));
}
function saveSoon(){ $("save-state").textContent="Saving…";clearTimeout(saveTimer);saveTimer=setTimeout(async()=>{try{await saveProject(files,entry);$("save-state").textContent="Saved";}catch(e){$("save-state").textContent="Save failed";log(e.message,"err");}},250);}
function renderFiles(){
 fileList.innerHTML="";
 Object.keys(files).sort().forEach(path=>{
  const row=document.createElement("div");row.className="file-item"+(path===activeFile?" active":"");
  const name=document.createElement("span");name.className="file-name";name.textContent=path.replace(/^\//,"");row.appendChild(name);
  const ext=document.createElement("span");ext.className="file-ext";ext.textContent=path.split(".").pop();row.appendChild(ext);
  if(path!==entry){const del=document.createElement("span");del.className="file-delete";del.textContent="×";del.title="Delete file";del.onclick=e=>{e.stopPropagation();if(!confirm("Delete "+path+"?"))return;delete files[path];removeModel(path);if(activeFile===path)openFile(entry);renderFiles();saveSoon();};row.appendChild(del);}
  row.onclick=()=>openFile(path);fileList.appendChild(row);
 });
 $("file-count").textContent=Object.keys(files).length+" files";
}
function openFile(path){
 if(!files[path])return;
 if(typeof files[path]!=="string"){log("Asset "+path+" is bundled with the project. Open it from Python with a binary file mode.", "system");return;}
 activeFile=path;switchModel(path,files[path]);$("active-file").textContent=path;renderFiles();
}
function onEditorChange(value){files[activeFile]=value;saveSoon();}
async function loadTemplate(tpl){
 try{
  const project=await fetchTemplate(BASE,tpl);files=project.files;entry=project.entry;
  Object.keys(files).forEach(path=>{if(getEditor()?.__models?.[path])removeModel(path);});
  for(const [path,code] of Object.entries(files)){if(getEditor())switchModel(path,code);}
  activeFile=entry;openFile(entry);renderFiles();await saveProject(files,entry);
  log("Loaded "+tpl.name+" — "+tpl.description,"ok");clearOutput();
 }catch(error){log(error.message,"err");}
}
function clearOutput(){consoleOut.replaceChildren();ctx.clearRect(0,0,canvas.width,canvas.height);ctx.fillStyle="#080f20";ctx.fillRect(0,0,canvas.width,canvas.height);$("web-preview").srcdoc="<!doctype html><body style='font:14px system-ui;padding:24px;color:#64748b'>Python HTML output appears here when your script calls n3xn.show_html(...).</body>";}
function drawShape(msg){
 const {kind,x=0,y=0,w=0,h=0,color="#fff",label=""}=msg;
 if(kind==="clear"){ctx.fillStyle=String(x||"#080f20");ctx.fillRect(0,0,canvas.width,canvas.height);return;}
 ctx.fillStyle=color;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.lineJoin="round";
 if(kind==="rect")ctx.fillRect(x,y,w,h);
 else if(kind==="roundrect"){ctx.beginPath();if(ctx.roundRect)ctx.roundRect(x,y,w,h,Math.min(Number(label)||5,w/2,h/2));else ctx.rect(x,y,w,h);ctx.fill();}
 else if(kind==="gradient"){const gradient=ctx.createLinearGradient(0,y,0,y+h);gradient.addColorStop(0,color);gradient.addColorStop(1,String(label||"#17283c"));ctx.fillStyle=gradient;ctx.fillRect(x,y,w,h);}
 else if(kind==="poly"){const points=String(label).split(";").map(pair=>pair.split(",").map(Number)).filter(p=>p.length===2&&p.every(Number.isFinite));if(points.length>=3){ctx.beginPath();ctx.moveTo(points[0][0],points[0][1]);for(const point of points.slice(1))ctx.lineTo(point[0],point[1]);ctx.closePath();ctx.fill();}}
 else if(kind==="circle"){ctx.beginPath();ctx.arc(x,y,w,0,Math.PI*2);ctx.fill();}
 else if(kind==="line"){ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(w,h);ctx.stroke();}
 else if(kind==="text"){ctx.font="16px ui-monospace,monospace";ctx.fillText(String(label),x,y);}
}
function stopGameLoop(){
 if(gameFrame)cancelAnimationFrame(gameFrame);
 gameFrame=0;gameLoopActive=false;lastFrame=0;frameAccumulator=0;framePending=false;
}
function startGameLoop(){
 if(gameLoopActive)return;
 gameLoopActive=true;lastFrame=0;frameAccumulator=0;framePending=false;
 const tick=now=>{
  if(!gameLoopActive)return;
  if(!lastFrame)lastFrame=now;
  frameAccumulator+=Math.min((now-lastFrame)/1000,0.1);lastFrame=now;
  // Keep Python game callbacks to a predictable 30 FPS on low-power devices.
  if(!framePending&&frameAccumulator>=1/30){const step=Math.min(frameAccumulator,0.1);frameAccumulator=0;framePending=true;sendFrame(step);}else if(framePending){frameAccumulator=Math.min(frameAccumulator,0.1);}
  gameFrame=requestAnimationFrame(tick);
 };
 gameFrame=requestAnimationFrame(tick);
}
setRuntimeHandlers({
 ready:msg=>{setStatus("Pyodide "+msg.version,"ready");log("CPython WebAssembly runtime ready.","ok");},
 frameDone:()=>{framePending=false;},
 sound:msg=>playGameSound(msg.kind),
 stdout:msg=>log(msg.text,msg.level==="warn"?"warn":msg.level==="ok"?"ok":"out"),
 stderr:msg=>log(msg.text,"err"),
 clear:msg=>{ctx.fillStyle=msg.color||"#080f20";ctx.fillRect(0,0,canvas.width,canvas.height);},
 draw:drawShape,
 drawBatch:msg=>{for(const op of msg.operations||[])drawShape({kind:op[0],x:op[1],y:op[2],w:op[3],h:op[4],color:op[5],label:op[6]});},
 html:msg=>{$("web-preview").srcdoc=msg.html;document.querySelector('[data-panel="preview-panel"]').click();},
 gameLoop:msg=>{if(msg.enabled){startGameLoop();$("graphics-hint").textContent="Game controls: Space / Up / W / click · P pause · R restart · C practice · H hitboxes · 1–3 levels";document.querySelector('[data-panel="graphics-panel"]').click();}else{stopGameLoop();stopGameMusic();$("graphics-hint").textContent="Python demos can draw here with the n3xn graphics bridge."; }},
 gameInput:msg=>{gameInputActive=!!msg.enabled;},
 error:msg=>{setStatus("Runtime error","error");log(msg.message,"err");},
 stopped:()=>{stopGameLoop();gameInputActive=false;setStatus("Stopped");$("stop-btn").disabled=true;log("Python worker stopped. Runtime will reload on next run.","system");},
});
async function startRuntime(){
 setStatus("Loading Pyodide…");$("run-btn").disabled=true;
 try{await ensureRuntime();$("run-btn").disabled=false;return true;}
 catch(error){setStatus("Runtime failed","error");log(error.message,"err");$("run-btn").disabled=false;return false;}
}
async function run(){
 if(!files[activeFile])return;
 files[activeFile]=editor.getValue();saveSoon();clearPythonMarkers();
 if(!(await startRuntime()))return;
 runStarted=performance.now();$("execution-time").textContent="Running…";$("run-btn").disabled=true;$("stop-btn").disabled=false;
 log("▶ Running "+entry+" with "+Object.keys(files).length+" project files…","system");
 try{
  await runProject(files,entry);
  $("execution-time").textContent=Math.round(performance.now()-runStarted)+" ms";
  log("Process finished.","ok");
 }catch(error){
  $("execution-time").textContent="Failed";
  const message=error.message||String(error);log(message,"err");setPythonMarkers(entry,message);
 }finally{$("run-btn").disabled=false;$("stop-btn").disabled=true;}
}
async function importFile(file,relativePath=file.name){
 try{
  const decodeUTF8=async source=>new TextDecoder("utf-8",{fatal:true}).decode(await source.arrayBuffer());
  if(file.name.endsWith(".n3py.json")){
   const data=JSON.parse(await decodeUTF8(file));
   if(data.format!=="n3xn-python-project"||!data.files)throw new Error("Not a valid n3xn Python project export.");
   files=data.files;entry=data.entry||"/main.py";
  }else{
   const path=normalizePath("/"+relativePath.replace(/\\/g,"/"));
   const textExtensions=/\.(py|txt|csv|json|toml|ya?ml|md|html?|css|js|svg|xml|ini|cfg|tsv)$/i;
   if(textExtensions.test(file.name)){files[path]=await decodeUTF8(file);}
   else{const bytes=new Uint8Array(await file.arrayBuffer());let binary="";for(let i=0;i<bytes.length;i+=32768)binary+=String.fromCharCode(...bytes.subarray(i,i+32768));files[path]={__n3xn_binary__:true,mime:file.type||"application/octet-stream",base64:btoa(binary)};}
   if(typeof files[entry]!=="string")entry=Object.keys(files).find(p=>typeof files[p]==="string")||path;
  }
  for(const [path,value] of Object.entries(files))if(typeof value==="string")switchModel(path,value);
  openFile(entry);renderFiles();await saveProject(files,entry);log("Imported "+file.name,"ok");
 }catch(error){log("Import failed: "+error.message,"err");}
}
async function init(){
 try{
  if("serviceWorker" in navigator){
   const reg=await navigator.serviceWorker.register(BASE+"sw.js",{scope:BASE});
   await navigator.serviceWorker.ready;
   if((!navigator.serviceWorker.controller||!navigator.serviceWorker.controller.scriptURL.includes("/python/sw.js"))&&!sessionStorage.getItem("n3xn_python_sw_reload")){
    sessionStorage.setItem("n3xn_python_sw_reload","1");location.reload();return;
   }
  }
  templates=await fetchManifest(BASE);
  const saved=await loadProject();files=saved.files;entry=saved.entry||"/main.py";
  if(!Object.keys(files).length)files={"/main.py":"print('Hello from n3xn Python Studio')\n"};
  if(!files[entry])entry=Object.keys(files)[0];
  for(const tpl of templates){const option=document.createElement("option");option.value=tpl.id;option.textContent="["+tpl.category+"] "+tpl.name;option.title=tpl.description||"";$("template-select").appendChild(option);}
  $("template-select").onchange=()=>loadTemplate(templates.find(t=>t.id===$("template-select").value));
  editor=await initMonaco({container:$("monaco-root"),files,initialFile:entry,onChange:onEditorChange,onRun:run,onCursor:pos=>$("cursor-label").textContent="Ln "+pos.lineNumber+", Col "+pos.column});
  setEditorTheme(savedTheme);openFile(entry);renderFiles();setStatus("Editor ready","ready");log("Python project restored. Press Run to start the WebAssembly runtime.","system");
 }catch(error){setStatus("Startup failed","error");log(error.stack||error.message,"err");}
}
$("run-btn").onclick=run;
$("stop-btn").onclick=()=>{stopRuntime();stopGameLoop();gameInputActive=false;$("run-btn").disabled=false;$("stop-btn").disabled=true;};
$("clear-output-btn").onclick=clearOutput;
$("game-fullscreen").onclick=()=>toggleFullscreen($("graphics-panel"));
function toggleFullscreen(element){if(document.fullscreenElement){document.exitFullscreen?.();}else{element.requestFullscreen?.().catch(error=>log("Fullscreen unavailable: "+error.message,"warn"));}}
$("terminal-fullscreen").onclick=()=>toggleFullscreen($("console-panel"));
$("html-fullscreen").onclick=()=>toggleFullscreen($("preview-panel"));
async function sendConsoleCommand(){
 const input=$("console-input"),code=input.value.trim();if(!code)return;input.value="";log(">>> "+code,"system");
 try{const result=await runConsole(code);if(result)log(result,"ok");}catch(error){log(error.message||String(error),"err");}
}
$("console-send-btn").onclick=sendConsoleCommand;
$("console-input").addEventListener("keydown",event=>{if(event.key==="Enter"){event.preventDefault();sendConsoleCommand();}});
$("new-file-btn").onclick=()=>{const path=normalizePath(prompt("New project file path:","/src/module.py")||"");if(path==="/")return;if(files[path]){log("File already exists: "+path,"warn");return;}files[path]="# "+path.split("/").pop()+"\n";switchModel(path,files[path]);openFile(path);renderFiles();saveSoon();};
$("import-btn").onclick=()=>$("file-input").click();
$("import-folder-btn").onclick=()=>$("folder-input").click();
$("file-input").onchange=async e=>{for(const file of Array.from(e.target.files||[]))await importFile(file);e.target.value="";};
$("folder-input").onchange=async e=>{for(const file of Array.from(e.target.files||[]))await importFile(file,file.webkitRelativePath||file.name);e.target.value="";};
$("export-btn").onclick=()=>{files[activeFile]=editor.getValue();downloadProject({files,entry});log("Project export created.","ok");};
$("export-html-btn").onclick=async()=>{files[activeFile]=editor.getValue();$("export-html-btn").disabled=true;try{await exportSingleHTML({files,entry,log});}catch(error){log("Single-file export failed: "+(error.message||error),"err");}finally{$("export-html-btn").disabled=false;}};
$("set-entry-btn").onclick=()=>{entry=activeFile;$("project-name").textContent=entry.split("/").pop();saveSoon();log("Run entry point set to "+entry,"ok");};
$("packages-btn").onclick=()=>{
 $("dialog-title").textContent="Python packages";
 $("dialog-description").textContent="Install packages into this browser's Pyodide runtime. Popular Pyodide packages include numpy, pandas, matplotlib, scipy, pillow, sympy and scikit-learn. First install requires network access.";
 $("dialog-content").innerHTML='<input id="package-name" placeholder="Package name, e.g. numpy" autocomplete="off">';
 $("dialog-confirm").textContent="Install package";$("dialog").classList.remove("hidden");$("package-name").focus();
};
$("dialog-close").onclick=$("dialog-cancel").onclick=()=>$("dialog").classList.add("hidden");
$("dialog-confirm").onclick=async()=>{
 const name=$("package-name")?.value?.trim();if(!name)return;
 $("dialog-confirm").disabled=true;$("dialog-confirm").textContent="Installing…";log("Installing "+name+"…","system");
 try{await startRuntime();await installPackage(name);log("Installed "+name+".","ok");}
 catch(error){log(error.message,"err");}
 finally{$("dialog-confirm").disabled=false;$("dialog-confirm").textContent="Install";$("dialog").classList.add("hidden");}
};
$("warm-btn").onclick=async()=>{
 setStatus("Warming offline cache…");log("Downloading and caching the Pyodide runtime. This may take a while on first use.","system");
 try{const reg=await navigator.serviceWorker.ready;reg.active?.postMessage({type:"WARM_PYODIDE"});await startRuntime();setStatus("Runtime cached","ready");log("Pyodide initialized; runtime files are cached for offline use.","ok");}
 catch(error){setStatus("Cache failed","error");log(error.message,"err");}
};
$("theme-select").onchange=e=>{document.body.dataset.theme=e.target.value;setEditorTheme(e.target.value);localStorage.setItem("n3xn_python_theme",e.target.value);};
const savedTheme=localStorage.getItem("n3xn_python_theme")||"midnight";$("theme-select").value=savedTheme;document.body.dataset.theme=savedTheme;
document.querySelectorAll(".tab").forEach(tab=>tab.onclick=()=>{document.querySelectorAll(".tab").forEach(t=>t.classList.toggle("active",t===tab));document.querySelectorAll(".output-panel").forEach(p=>p.classList.toggle("active",p.id===tab.dataset.panel));});
$("editor-fullscreen").onclick=()=>document.querySelector(".editor-pane").classList.toggle("focus");
$("format-btn").onclick=()=>{const model=editor.getModel();const actions=editor.getActions();const action=actions.find(a=>a.id==="editor.action.formatDocument");if(action)action.run();else log("No Python formatter is installed. Install black or autopep8 to format from Python.","warn");};
canvas.addEventListener("click",event=>{unlockAudio();const rect=canvas.getBoundingClientRect();sendCanvasClick((event.clientX-rect.left)*canvas.width/rect.width,(event.clientY-rect.top)*canvas.height/rect.height);});
window.addEventListener("keydown",event=>{
 const target=event.target;
 if(target?.closest?.(".monaco-editor")||["INPUT","TEXTAREA","SELECT"].includes(target?.tagName))return;
 if(gameInputActive){
  unlockAudio();
  const key=event.key.toLowerCase();
  if([" ","arrowup","w","r","p","c","escape","1","2","3","h"].includes(key)){event.preventDefault();sendKey(event.key,event.repeat?false:true);}
 }
});
window.addEventListener("keyup",event=>{if(gameInputActive)sendKey(event.key,false);});
window.addEventListener("blur",()=>{if(gameInputActive)for(const key of [" ","ArrowUp","w"])sendKey(key,false);});
window.addEventListener("beforeunload",()=>{stopGameLoop();if(editor&&activeFile)files[activeFile]=editor.getValue();saveProject(files,entry);});
await init();
