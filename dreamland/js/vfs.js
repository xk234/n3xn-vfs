const STORAGE_KEY = "n3xn_dreamland_vfs_v8";

export const DEFAULT_FILES = {
  "/src/main.tsx": `import { css, type Component } from "dreamland/core";
import { HUD } from "./HUD.tsx";

export const App: Component<{}, { score: number; timeLeft: number; active: boolean; x: number; y: number }> = function () {
  this.score = 0;
  this.timeLeft = 15;
  this.active = false;
  this.x = 50;
  this.y = 50;

  let timer: number | undefined;

  const move = () => {
    this.x = 12 + Math.floor(Math.random() * 76);
    this.y = 15 + Math.floor(Math.random() * 70);
  };

  const start = () => {
    clearInterval(timer);
    this.score = 0;
    this.timeLeft = 15;
    this.active = true;
    move();
    timer = window.setInterval(() => {
      this.timeLeft--;
      if (this.timeLeft <= 0) {
        clearInterval(timer);
        this.active = false;
      }
    }, 1000);
  };

  return (
    <div class="card">
      <HUD score={use(this.score)} timeLeft={use(this.timeLeft)} />
      <div class="arena">
        {use(this.active).map((on) =>
          on ? (
            <button
              class="orb"
              style={use\`left: \${this.x}%; top: \${this.y}%;\`}
              on:click={() => { this.score++; move(); }}
            >
              +1
            </button>
          ) : (
            <div class="center">
              <p>{this.score > 0 ? \`Final Score: \${this.score}\` : "Offline-First Dreamland Studio"}</p>
              <button class="btn" on:click={start}>{this.score > 0 ? "Play Again" : "Start Game"}</button>
            </div>
          )
        )}
      </div>
    </div>
  );
};

App.style = css\`
  :scope { max-width: 460px; margin: 2rem auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 12px; padding: 1.25rem; user-select: none; }
  .arena { position: relative; height: 260px; background: #020617; border-radius: 8px; border: 1px solid #1e293b; overflow: hidden; margin-top: 1rem; }
  .orb { position: absolute; transform: translate(-50%, -50%); width: 44px; height: 44px; border-radius: 50%; border: none; background: #38bdf8; color: #090d16; font-weight: 800; cursor: pointer; }
  .center { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; }
  .btn { background: #38bdf8; color: #090d16; border: none; padding: 0.6rem 1.2rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
\`;

export default App;
`,
  "/src/HUD.tsx": `import { css, type Component } from "dreamland/core";

export const HUD: Component<{ score: number; timeLeft: number }> = function (cx) {
  return (
    <header>
      <h3>⚡ Dreamland Reflex</h3>
      <div class="meta">
        <span>Score: <strong>{use(cx.score)}</strong></span>
        <span>Time: <strong>{use(cx.timeLeft)}s</strong></span>
      </div>
    </header>
  );
};

HUD.style = css\`
  :scope { display: flex; justify-content: space-between; align-items: center; }
  .meta { display: flex; gap: 1rem; color: #94a3b8; }
  strong { color: #38bdf8; }
\`;
`,
};

export function loadFiles() {
  const savedRaw = localStorage.getItem(STORAGE_KEY);
  const files = savedRaw ? JSON.parse(savedRaw) : structuredClone(DEFAULT_FILES);
  saveFiles(files);
  return files;
}

export function saveFiles(files) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(files));
}

export function resolveVfsPath(importer, rel) {
  const cleanImporter = String(importer || "/src/main.tsx")
    .replace(/^vfs:/, "")
    .replace(/^file:\/\//, "");
  if (rel.startsWith("/")) return rel;
  const segs = cleanImporter.split("/").filter(Boolean);
  segs.pop();
  for (const seg of rel.split("/")) {
    if (!seg || seg === ".") continue;
    if (seg === "..") segs.pop();
    else segs.push(seg);
  }
  return "/" + segs.join("/");
}

export function findVfsFile(files, base) {
  for (const ext of ["", ".tsx", ".ts", ".jsx", ".js", ".json"]) {
    if (files[base + ext] !== undefined) return base + ext;
  }
  return null;
}
