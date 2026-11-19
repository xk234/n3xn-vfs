import { css, type Component } from "dreamland/core";

export const HUD: Component<{ score: number; best: number; timeLeft: number }> = function () {
  return (
    <header>
      <h3>⚡ Dreamland Reflex</h3>
      <div class="meta">
        <span>Score: <strong>{use(this.score)}</strong></span>
        <span>Best: <strong>{use(this.best)}</strong></span>
        <span>Time: <strong>{use(this.timeLeft)}s</strong></span>
      </div>
    </header>
  );
};

HUD.style = css`
  :scope { display: flex; justify-content: space-between; align-items: center; gap: 0.5rem; }
  .meta { display: flex; gap: 0.85rem; color: #94a3b8; font-size: 0.9rem; }
  strong { color: #38bdf8; }
`;
