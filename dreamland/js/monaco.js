const DREAMLAND_AMBIENT_DTS = `
declare module "dreamland/core" {
  export type Stateful<T> = T;
  export type ComponentContext<Props = {}, State = {}> = Props & {
    root: HTMLElement;
    mount?: () => void;
  };
  export type Component<Props = {}, State = {}> = (
    this: State & Props & { root: HTMLElement; mount?: () => void },
    cx: ComponentContext<Props, State>
  ) => HTMLElement | any;
  export function h(tag: any, props: any, ...children: any[]): HTMLElement;
  export function Fragment(props: any): DocumentFragment;
  export function css(strings: TemplateStringsArray, ...values: any[]): string;
  export function use<T>(val: T): any;
  export function use(strings: TemplateStringsArray, ...values: any[]): string;
}
declare module "dreamland" {
  export * from "dreamland/core";
}
declare module "dreamland/router" {
  import { Component } from "dreamland/core";
  export const Router: Component<{ children?: any }>;
  export const Route: Component<{ path: string; show?: any; children?: any }>;
  export const Link: Component<{ href: string; children?: any }>;
  export function navigate(path: string): void;
}
declare module "dreamland/jsx-runtime" {
  export const jsx: any;
  export const jsxs: any;
  export const Fragment: any;
}
declare module "dreamland/jsx-dev-runtime" {
  export const jsxDEV: any;
  export const Fragment: any;
}
declare global {
  const h: any;
  const Fragment: any;
  function use<T>(val: T): any;
  function use(strings: TemplateStringsArray, ...values: any[]): string;
  namespace JSX {
    interface IntrinsicElements {
      [elemName: string]: any;
    }
  }
}
export {};
`;

export function langForPath(path) {
  if (path.endsWith(".tsx") || path.endsWith(".ts")) return "typescript";
  if (path.endsWith(".css")) return "css";
  if (path.endsWith(".json")) return "json";
  return "javascript";
}

export function getOrCreateModel(path, content) {
  const uri = monaco.Uri.parse("file://" + path);
  let model = monaco.editor.getModel(uri);
  if (!model) {
    model = monaco.editor.createModel(content, langForPath(path), uri);
  } else if (model.getValue() !== content) {
    model.setValue(content);
  }
  return model;
}

export function disposeModel(path) {
  monaco.editor.getModel(monaco.Uri.parse("file://" + path))?.dispose();
}

export async function initMonaco({ monacoMin, jsdelivrProxy, container, files, initialFile, onChange, onRun }) {
  const monacoVs = monacoMin + "/vs";

  await new Promise((res, rej) => {
    const s = document.createElement("script");
    s.src = monacoVs + "/loader.js";
    s.onload = res;
    s.onerror = rej;
    document.head.appendChild(s);
  });

  return new Promise((resolve, reject) => {
    window.MonacoEnvironment = {
      getWorker() {
        const workerCode = `
          self.MonacoEnvironment = { baseUrl: "${monacoMin}/" };
          importScripts("${monacoVs}/base/worker/workerMain.js");
        `;
        return new Worker(URL.createObjectURL(new Blob([workerCode], { type: "application/javascript" })));
      },
    };

    window.require.config({ paths: { vs: monacoVs } });
    window.require(
      ["vs/editor/editor.main"],
      async () => {
        const tsDefaults = monaco.languages.typescript.typescriptDefaults;
        tsDefaults.setCompilerOptions({
          target: monaco.languages.typescript.ScriptTarget.ES2022,
          module: monaco.languages.typescript.ModuleKind.ESNext,
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
          jsx: monaco.languages.typescript.JsxEmit.React,
          jsxFactory: "h",
          jsxFragmentFactory: "Fragment",
          allowImportingTsExtensions: true,
          noEmit: true,
          strict: false,
          allowNonTsExtensions: true,
        });
        tsDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });
        tsDefaults.setEagerModelSync(true);

        tsDefaults.addExtraLib(DREAMLAND_AMBIENT_DTS, "file:///node_modules/@types/dreamland-ambient/index.d.ts");
        try {
          const dtsRes = await fetch(jsdelivrProxy + "npm/dreamland@latest/dist/core.d.ts");
          if (dtsRes.ok) {
            const upstreamDts = await dtsRes.text();
            if (!upstreamDts.trimStart().startsWith("<!")) {
              tsDefaults.addExtraLib(upstreamDts, "file:///node_modules/dreamland/core.d.ts");
            }
          }
        } catch (_) {}

        for (const [p, code] of Object.entries(files)) {
          getOrCreateModel(p, code);
        }

        const editor = monaco.editor.create(container, {
          model: getOrCreateModel(initialFile, files[initialFile]),
          theme: "vs-dark",
          automaticLayout: true,
          fontSize: 13,
          minimap: { enabled: false },
          quickSuggestions: true,
          suggestOnTriggerCharacters: true,
          parameterHints: { enabled: true },
        });

        editor.onDidChangeModelContent(() => onChange(editor.getValue()));
        window.addEventListener("keydown", (e) => {
          if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
            e.preventDefault();
            onRun();
          }
        });

        resolve(editor);
      },
      reject
    );
  });
}
