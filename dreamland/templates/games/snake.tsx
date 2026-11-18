import { css, type Component } from "dreamland/core";

type Pt = { x: number; y: number };
const COLS = 20;
const ROWS = 20;

export const App: Component<{}, {}, { score: number; high: number; status: string }> = function () {
  this.score = 0;
  this.high = Number(localStorage.getItem("dl_snake_high") || 0);
  this.status = "Press Start or Arrow Keys";

  let canvas: HTMLCanvasElement | null = null;
  let snake: Pt[] = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
  let dir: Pt = { x: 1, y: 0 };
  let nextDir: Pt = { x: 1, y: 0 };
  let food: Pt = { x: 15, y: 10 };
  let loop: number | undefined;

  const spawnFood = () => {
    food = {
      x: Math.floor(Math.random() * COLS),
      y: Math.floor(Math.random() * ROWS),
    };
  };

  const draw = () => {
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;
    const cell = canvas.width / COLS;
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.strokeStyle = "#0f172a";
    for (let i = 0; i <= COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, canvas.height);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * cell);
      ctx.lineTo(canvas.width, i * cell);
      ctx.stroke();
    }

    ctx.fillStyle = "#f43f5e";
    ctx.beginPath();
    ctx.arc((food.x + 0.5) * cell, (food.y + 0.5) * cell, cell * 0.38, 0, Math.PI * 2);
    ctx.fill();

    snake.forEach((seg, idx) => {
      ctx.fillStyle = idx === 0 ? "#38bdf8" : "#0284c7";
      ctx.fillRect(seg.x * cell + 1, seg.y * cell + 1, cell - 2, cell - 2);
    });
  };

  const step = () => {
    dir = nextDir;
    const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y };
    const hitWall = head.x < 0 || head.x >= COLS || head.y < 0 || head.y >= ROWS;
    const hitSelf = snake.some((s) => s.x === head.x && s.y === head.y);

    if (hitWall || hitSelf) {
      clearInterval(loop);
      loop = undefined;
      this.status = "Game Over! Press Restart";
      return;
    }

    snake.unshift(head);
    if (head.x === food.x && head.y === food.y) {
      this.score += 10;
      if (this.score > this.high) {
        this.high = this.score;
        localStorage.setItem("dl_snake_high", String(this.high));
      }
      spawnFood();
    } else {
      snake.pop();
    }
    draw();
  };

  const start = () => {
    clearInterval(loop);
    snake = [{ x: 10, y: 10 }, { x: 9, y: 10 }, { x: 8, y: 10 }];
    dir = { x: 1, y: 0 };
    nextDir = { x: 1, y: 0 };
    this.score = 0;
    this.status = "Playing";
    spawnFood();
    draw();
    loop = window.setInterval(step, 110);
  };

  const setDirection = (dx: number, dy: number) => {
    if (dx === -dir.x && dy === -dir.y) return;
    nextDir = { x: dx, y: dy };
    if (!loop) start();
  };

  this.mount = () => {
    canvas = this.root.querySelector("canvas");
    draw();
    window.addEventListener("keydown", (e) => {
      if (e.key === "ArrowUp" || e.key === "w") setDirection(0, -1);
      if (e.key === "ArrowDown" || e.key === "s") setDirection(0, 1);
      if (e.key === "ArrowLeft" || e.key === "a") setDirection(-1, 0);
      if (e.key === "ArrowRight" || e.key === "d") setDirection(1, 0);
    });
  };

  return (
    <div class="wrap">
      <div class="hud">
        <span>🐍 Score: <strong>{use(this.score)}</strong></span>
        <span>Best: <strong>{use(this.high)}</strong></span>
      </div>
      <canvas width="340" height="340" />
      <p class="status">{use(this.status)}</p>
      <div class="controls">
        <button on:click={start}>Start / Restart</button>
        <div class="dpad">
          <button on:click={() => setDirection(0, -1)}>▲</button>
          <div>
            <button on:click={() => setDirection(-1, 0)}>◀</button>
            <button on:click={() => setDirection(0, 1)}>▼</button>
            <button on:click={() => setDirection(1, 0)}>▶</button>
          </div>
        </div>
      </div>
    </div>
  );
};

App.style = css`
  :scope { max-width: 380px; margin: 1.5rem auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 1rem; text-align: center; user-select: none; }
  .hud { display: flex; justify-content: space-between; margin-bottom: 0.75rem; font-size: 0.95rem; }
  strong { color: #38bdf8; }
  canvas { border: 1px solid #1e293b; border-radius: 8px; display: block; margin: 0 auto; }
  .status { margin: 0.6rem 0; font-size: 0.85rem; color: #94a3b8; }
  .controls { display: flex; justify-content: space-between; align-items: center; margin-top: 0.5rem; }
  button { background: #1e293b; color: #f8fafc; border: 1px solid #334155; padding: 0.45rem 0.8rem; border-radius: 8px; font-weight: 700; cursor: pointer; }
  button:hover { background: #38bdf8; color: #090d16; }
  .dpad { display: flex; flex-direction: column; align-items: center; gap: 3px; }
  .dpad div { display: flex; gap: 3px; }
`;

export default App;
