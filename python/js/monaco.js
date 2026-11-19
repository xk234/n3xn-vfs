const CDN = new URL("../__cdn__/monaco/npm/monaco-editor@0.52.0/min", import.meta.url).href;
let editor;
const themes = {
  midnight:{base:"vs-dark",background:"#0b1220",foreground:"#dbeafe",line:"#1d2a40",accent:"#a78bfa"},
  dracula:{base:"vs-dark",background:"#282a36",foreground:"#f8f8f2",line:"#44475a",accent:"#bd93f9"},
  nord:{base:"vs-dark",background:"#2e3440",foreground:"#eceff4",line:"#434c5e",accent:"#88c0d0"},
  monokai:{base:"vs-dark",background:"#1e1f1c",foreground:"#f8f8f2",line:"#3e3d32",accent:"#a6e22e"},
  light:{base:"vs",background:"#ffffff",foreground:"#1f2937",line:"#e5e7eb",accent:"#6d28d9"}
};
export function getThemeNames(){return Object.keys(themes);}
export function setEditorTheme(name){
  if(!window.monaco || !editor) return;
  const t=themes[name]||themes.midnight;
  monaco.editor.defineTheme("n3xn-"+name,{base:t.base,inherit:true,rules:[],colors:{"editor.background":t.background,"editor.foreground":t.foreground,"editorLineNumber.foreground":t.line,"editorCursor.foreground":t.accent,"editor.selectionBackground":"#8b5cf655","editorLineHighlightBackground":"#64748b18"}});
  monaco.editor.setTheme("n3xn-"+name);
}
export async function initMonaco({container,files,initialFile,onChange,onRun,onCursor}){
  await new Promise((resolve,reject)=>{
    if(window.require && window.monaco){resolve();return;}
    const script=document.createElement("script");script.src=CDN+"/vs/loader.js";script.onload=resolve;script.onerror=()=>reject(new Error("Monaco editor failed to load. Check network or offline cache."));document.head.appendChild(script);
  });
  return new Promise((resolve,reject)=>{
    const vs=CDN+"/vs";
    window.MonacoEnvironment={getWorker(){const code='self.MonacoEnvironment={baseUrl:"'+CDN+'/"};importScripts("'+vs+'/base/worker/workerMain.js");';return new Worker(URL.createObjectURL(new Blob([code],{type:"application/javascript"})));}};
    window.require.config({paths:{vs}});
    window.require(["vs/editor/editor.main"],()=>{
      try{
        monaco.languages.register({id:"python"});
        monaco.languages.setMonarchTokensProvider("python",{
          defaultToken:"",tokenPostfix:".py",
          keywords:["and","as","assert","async","await","break","class","continue","def","del","elif","else","except","False","finally","for","from","global","if","import","in","is","lambda","None","nonlocal","not","or","pass","raise","return","True","try","while","with","yield"],
          tokenizer:{root:[
            [/#.*$/,"comment"],[/@\w+/,"annotation"],[/[a-zA-Z_]\w*(?=\s*\()/,"function"],
            [/[a-zA-Z_]\w*/,{cases:{"@keywords":"keyword","@default":"identifier"}}],
            [/[0-9]+(\.[0-9]+)?/,"number"],[/"([^"\\]|\\.)*$/,"string.invalid"],[/'([^'\\]|\\.)*$/,"string.invalid"],
            [/"""/,"string", "@stringDouble"],[/'''/,"string","@stringSingle"],[/"/,"string","@double"],[/'/,"string","@single"],
            [/[{}()\[\]]/,"@brackets"],[/[,:.]/,"delimiter"],[/[+\-*\/%=<>!&|^~]+/,"operator"]
          ],
          stringDouble:[[/"""/,"string","@pop"],[/./,"string"]],stringSingle:[[/'''/,"string","@pop"],[/./,"string"]],
          double:[[/\\./,"string.escape"],[/"/,"string","@pop"],[/./,"string"]],single:[[/\\./,"string.escape"],[/'/,"string","@pop"],[/./,"string"]]
        }});
        monaco.languages.setLanguageConfiguration("python",{comments:{lineComment:"#"},brackets:[["{","}"],["[","]"],["(",")"]],autoClosingPairs:[{open:"(",close:")"},{open:"[",close:"]"},{open:"{",close:"}"},{open:"'",close:"'"},{open:'"',close:'"'}],surroundingPairs:[["(",")"],["[","]"],["{","}"],["'","'"],['"','"']]});
        monaco.languages.registerCompletionItemProvider("python",{provideCompletionItems:(model,pos)=>{
          const words=model.getWordUntilPosition(pos),range={startLineNumber:pos.lineNumber,endLineNumber:pos.lineNumber,startColumn:words.startColumn,endColumn:words.endColumn};
          const suggestions=["print","len","range","enumerate","zip","sum","min","max","sorted","list","dict","set","tuple","str","int","float","bool","open","self","async","await","import","from","def","class"].map((label)=>({label,kind:monaco.languages.CompletionItemKind.Function,insertText:label,range}));
          return {suggestions};
        }});
        const uri=path=>monaco.Uri.parse("file://"+path);
        const models={};
        for(const [path,code] of Object.entries(files)) models[path]=monaco.editor.createModel(code,"python",uri(path));
        editor=monaco.editor.create(container,{model:models[initialFile],theme:"vs-dark",automaticLayout:true,fontSize:13,fontFamily:"'JetBrains Mono',Consolas,monospace",minimap:{enabled:false},scrollBeyondLastLine:false,wordWrap:"on",tabSize:4,insertSpaces:true,bracketPairColorization:{enabled:true},quickSuggestions:true,suggestOnTriggerCharacters:true,padding:{top:12}});
        editor.onDidChangeModelContent(()=>onChange(editor.getValue()));
        editor.onDidChangeCursorPosition(e=>onCursor?.(e.position));
        editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.Enter,onRun);
        editor.addCommand(monaco.KeyMod.CtrlCmd|monaco.KeyCode.KeyS,()=>{onChange(editor.getValue());onRun(false);});
        editor.__models=models;editor.__uri=uri;
        setEditorTheme("midnight");
        resolve(editor);
      }catch(e){reject(e);}
    },reject);
  });
}
export function switchModel(path,content){
  if(!editor)return;
  let model=editor.__models[path];
  if(!model){model=monaco.editor.createModel(content,"python",editor.__uri(path));editor.__models[path]=model;}
  else if(model.getValue()!==content)model.setValue(content);
  editor.setModel(model);
}
export function removeModel(path){const model=editor?.__models?.[path];if(model){model.dispose();delete editor.__models[path];}}
export function setPythonMarkers(path,message){
  if(!editor||!window.monaco)return;
  const model=editor.__models[path];if(!model)return;
  const markers=[];
  const regex=/File \"[^\"]+\", line (\d+)/g;let match;
  while((match=regex.exec(message))!==null){const line=Number(match[1]);markers.push({severity:monaco.MarkerSeverity.Error,message:"Python runtime error",startLineNumber:line,endLineNumber:line,startColumn:1,endColumn:Math.max(2,model.getLineMaxColumn(line))});}
  monaco.editor.setModelMarkers(model,"n3xn-python",markers);
}
export function clearPythonMarkers(){if(!window.monaco||!editor)return;for(const model of Object.values(editor.__models))monaco.editor.setModelMarkers(model,"n3xn-python",[]);}
export function getEditor(){return editor;}
