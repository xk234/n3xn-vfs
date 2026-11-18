import { css, type Component } from "dreamland/core";
import { HUD } from "./HUD.tsx";

export const App: Component<{}, {}, { score: number; best: number; timeLeft: number; active: boolean; statusText: string; btnText: string; x: number; y: number }> = function () {
  this.score = 0;
  this.best = Number(localStorage.getItem("dl_reflex_best") || 0);
  this.timeLeft = 15;
  this.active = false;
  this.statusText = "Click orbs before time runs out!";
  this.btnText = "Start Game";
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
        this.statusText = `Final Score: ${this.score}`;
        this.btnText = "Play Again";
        if (this.score > this.best) {
          this.best = this.score;
          localStorage.setItem("dl_reflex_best", String(this.best));
        }
      }
    }, 1000);
  };

  return (
    <div class="card">
      <HUD score={use(this.score)} best={use(this.best)} timeLeft={use(this.timeLeft)} />
      <div class="arena">
        <button
          class="orb"
          style={use`left: ${this.x}%; top: ${this.y}%; display: ${this.active ? "block" : "none"};`}
          on:click={() => {
            if (!this.active) return;
            this.score++;
            move();
          }}
        >
          +1
        </button>
        <div
          class="center"
          style={use`display: ${this.active ? "none" : "flex"};`}
        >
          <p>{use(this.statusText)}</p>
          <button class="btn" on:click={start}>{use(this.btnText)}</button>
        </div>
      </div>
    </div>
  );
};

App.style = css`
  :scope { max-width: 480px; margin: 2rem auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 1.25rem; user-select: none; }
  .arena { position: relative; height: 270px; background: #020617; border-radius: 10px; border: 1px solid #1e293b; overflow: hidden; margin-top: 1rem; }
  .orb { position: absolute; transform: translate(-50%, -50%); width: 46px; height: 46px; border-radius: 50%; border: none; background: #38bdf8; color: #090d16; font-weight: 800; cursor: pointer; box-shadow: 0 0 18px rgba(56, 189, 248, 0.5); transition: transform 0.08s; }
  .orb:active { transform: translate(-50%, -50%) scale(0.9); }
  .center { height: 100%; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.75rem; }
  .btn { background: #38bdf8; color: #090d16; border: none; padding: 0.6rem 1.25rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
`;

export default App;
