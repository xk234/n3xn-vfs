// Template descriptors for consumers that import the registry directly.
// Keep this list aligned with ./index.json, which the browser playground loads.
export const REFLEX_TEMPLATE = {
  id: "demo-reflex",
  category: "Demo",
  name: "⚡ Dreamland Reflex",
  description: "Multi-component reflex orb clicker with a live countdown, high score persistence, and reactive HUD.",
  files: {
    "/src/main.tsx": "demo/main.tsx",
    "/src/HUD.tsx": "demo/HUD.tsx",
  },
};

export const SNAKE_TEMPLATE = {
  id: "game-snake",
  category: "Games",
  name: "🐍 Neon Grid Snake",
  description: "Canvas snake game with keyboard and touch controls and a saved best score.",
  files: { "/src/main.tsx": "games/snake.tsx" },
};

export const BRICK_BREAKER_TEMPLATE = {
  id: "game-bricks",
  category: "Games",
  name: "🧱 Cyber Brick Breaker",
  description: "Canvas brick breaker with mouse and touch paddle controls, waves, and lives.",
  files: { "/src/main.tsx": "games/brick-breaker.tsx" },
};

export const SYNTH_PAD_TEMPLATE = {
  id: "app-synth",
  category: "Apps",
  name: "🎹 WebAudio Pocket Synth",
  description: "Eight-pad WebAudio synthesizer with selectable waveforms and keyboard shortcuts.",
  files: { "/src/main.tsx": "apps/synth-pad.tsx" },
};

export const TASK_BOARD_TEMPLATE = {
  id: "app-tasks",
  category: "Apps",
  name: "📋 Offline Task Tracker",
  description: "Offline task list with completion toggles and local persistence.",
  files: { "/src/main.tsx": "apps/task-board.tsx" },
};

export const TEMPLATES = [
  REFLEX_TEMPLATE,
  SNAKE_TEMPLATE,
  BRICK_BREAKER_TEMPLATE,
  SYNTH_PAD_TEMPLATE,
  TASK_BOARD_TEMPLATE,
];

export function getTemplateById(id) {
  return TEMPLATES.find((template) => template.id === id) || REFLEX_TEMPLATE;
}
