const DREAMLAND_GLOBAL_DTS = `
declare global {
  function use<T>(value: T): any;
  function use(strings: TemplateStringsArray, ...values: any[]): any;
}
export {};
`;

const DREAMLAND_FALLBACK_DTS = `
declare module "dreamland/core" {
  export type ComponentContext<Props = {}, Private = {}, Public = {}> = {
    state: Props & Private & Public;
    children?: any;
    root: HTMLElement;
    mount?: () => void;
    init?: () => void;
    load?: () => void;
  };
  export type Component<Props = {}, Private = {}, Public = {}> = (
    this: Props & Private & Public,
    cx: ComponentContext<Props, Private, Public>
  ) => Node | null | undefined;
  export function h(tag: any, props: any, ...children: any[]): Node;
  export namespace h {
    type Element = Node;
    interface IntrinsicElements { [name: string]: any; }
    interface ElementChildrenAttribute { children: {}; }
  }
  export function Fragment(props: any): DocumentFragment;
  export function css(strings: TemplateStringsArray, ...values: any[]): string;
}
declare module "dreamland" {
  export * from "dreamland/core";
}
declare module "dreamland/router" {
  import type { Component } from "dreamland/core";
  export const Router: Component<{ children?: any }>;
  export const Route: Component<{ path: string; show?: any; children?: any }>;
  export const Link: Component<{ href: string; children?: any }>;
  export function navigate(path: string): void;
}
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
          moduleResolution: monaco.languages.typescript.ModuleResolutionKind.Bundler,
          jsx: monaco.languages.typescript.JsxEmit.React,
          jsxFactory: "h",
          jsxFragmentFactory: "Fragment",
          allowImportingTsExtensions: true,
          allowNonTsExtensions: true,
          noEmit: true,
          strict: false,
          skipLibCheck: true,
        });
        tsDefaults.setDiagnosticsOptions({
          noSemanticValidation: false,
          noSyntaxValidation: false,
        });
        tsDefaults.setEagerModelSync(true);

        // Mirror the published package layout so TypeScript can resolve the
        // package export "dreamland/core" exactly as the runtime bundler does.
        let loadedPinnedTypes = false;
        try {
          const [pkgRes, dtsRes] = await Promise.all([
            fetch(jsdelivrProxy + "npm/dreamland@0.1.3/package.json"),
            fetch(jsdelivrProxy + "npm/dreamland@0.1.3/dist/core.d.ts"),
          ]);
          if (pkgRes.ok && dtsRes.ok) {
            const packageJson = await pkgRes.text();
            const upstreamDts = await dtsRes.text();
            if (
              packageJson.trim().startsWith("{") &&
              upstreamDts.trim() &&
              !upstreamDts.trimStart().startsWith("<")
            ) {
              tsDefaults.addExtraLib(packageJson, "file:///node_modules/dreamland/package.json");
              tsDefaults.addExtraLib(upstreamDts, "file:///node_modules/dreamland/dist/core.d.ts");
              loadedPinnedTypes = true;
            }
          }
        } catch (error) {
          console.warn("Could not load pinned Dreamland package metadata/types; using editor fallback types.", error);
        }

        tsDefaults.addExtraLib(DREAMLAND_GLOBAL_DTS, "file:///node_modules/@types/dreamland-globals/index.d.ts");
        if (!loadedPinnedTypes) {
          tsDefaults.addExtraLib(DREAMLAND_FALLBACK_DTS, "file:///node_modules/@types/dreamland-fallback/index.d.ts");
        }

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
