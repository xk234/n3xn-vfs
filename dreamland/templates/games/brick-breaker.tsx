import { css, type Component } from "dreamland/core";

export const App: Component<{}, {}, { score: number; lives: number; msg: string }> = function (cx) {
  this.score = 0;
  this.lives = 3;
  this.msg = "Move mouse or touch to steer paddle";

  let canvas: HTMLCanvasElement | null = null;
  let paddleX = 165;
  let ballX = 200;
  let ballY = 230;
  let dx = 3;
  let dy = -3;
  let bricks: { x: number; y: number; alive: boolean; color: string }[] = [];
  let raf = 0;

  const initBricks = () => {
    const colors = ["#f43f5e", "#f59e0b", "#10b981", "#38bdf8"];
    bricks = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 7; c++) {
        bricks.push({ x: 14 + c * 54, y: 28 + r * 22, alive: true, color: colors[r] });
      }
    }
  };

  const resetBall = () => {
    ballX = 200;
    ballY = 230;
    dx = 3 * (Math.random() > 0.5 ? 1 : -1);
    dy = -3.2;
  };

  const frame = () => {
    const ctx = canvas?.getContext("2d");
    if (!ctx || !canvas) return;

    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    for (const b of bricks) {
      if (!b.alive) continue;
      ctx.fillStyle = b.color;
      ctx.fillRect(b.x, b.y, 48, 14);
      if (ballX > b.x && ballX < b.x + 48 && ballY > b.y && ballY < b.y + 14) {
        dy = -dy;
        b.alive = false;
        this.score += 25;
      }
    }

    if (bricks.every((b) => !b.alive)) {
      this.msg = "Stage Cleared! Next Wave!";
      initBricks();
      resetBall();
    }

    ctx.fillStyle = "#38bdf8";
    ctx.fillRect(paddleX, 272, 74, 10);

    ctx.fillStyle = "#f8fafc";
    ctx.beginPath();
    ctx.arc(ballX, ballY, 6, 0, Math.PI * 2);
    ctx.fill();

    ballX += dx;
    ballY += dy;

    if (ballX < 6 || ballX > canvas.width - 6) dx = -dx;
    if (ballY < 6) dy = -dy;

    if (ballY > 266 && ballY < 278 && ballX > paddleX && ballX < paddleX + 74) {
      const hitOffset = (ballX - (paddleX + 37)) / 37;
      dx = hitOffset * 4.5;
      dy = -Math.abs(dy);
    } else if (ballY > canvas.height) {
      this.lives--;
      if (this.lives <= 0) {
        this.msg = "Game Over! Click Restart";
        return;
      }
      resetBall();
    }

    raf = requestAnimationFrame(frame);
  };

  const restart = () => {
    cancelAnimationFrame(raf);
    this.score = 0;
    this.lives = 3;
    this.msg = "Playing";
    initBricks();
    resetBall();
    raf = requestAnimationFrame(frame);
  };

  cx.mount = () => {
    canvas = cx.root.querySelector("canvas");
    if (!canvas) return;
    restart();
    const move = (clientX: number) => {
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      paddleX = Math.max(0, Math.min(canvas.width - 74, clientX - rect.left - 37));
    };
    canvas.addEventListener("mousemove", (e) => move(e.clientX));
    canvas.addEventListener("touchmove", (e) => {
      if (e.touches[0]) move(e.touches[0].clientX);
    });
  };

  return (
    <div class="box">
      <div class="top">
        <span>🧱 Score: <strong>{use(this.score)}</strong></span>
        <span>Lives: <strong>{use(this.lives)}</strong></span>
        <button on:click={restart}>Restart</button>
      </div>
      <canvas width="400" height="300" />
      <p>{use(this.msg)}</p>
    </div>
  );
};

App.style = css`
  :scope { max-width: 430px; margin: 1.5rem auto; background: #0f172a; border: 1px solid #1e293b; border-radius: 14px; padding: 1rem; text-align: center; user-select: none; }
  .top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.75rem; }
  strong { color: #38bdf8; }
  canvas { border: 1px solid #1e293b; border-radius: 8px; width: 100%; cursor: none; }
  button { background: #38bdf8; color: #090d16; border: none; padding: 0.35rem 0.8rem; border-radius: 6px; font-weight: 700; cursor: pointer; }
  p { margin-top: 0.6rem; font-size: 0.85rem; color: #94a3b8; }
`;

export default App;
