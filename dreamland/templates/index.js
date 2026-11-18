import { REFLEX_TEMPLATE } from "./demo/reflex.js";
import { SNAKE_TEMPLATE } from "./games/snake.js";
import { BRICK_BREAKER_TEMPLATE } from "./games/brick-breaker.js";
import { SYNTH_PAD_TEMPLATE } from "./apps/synth-pad.js";
import { TASK_BOARD_TEMPLATE } from "./apps/task-board.js";

export const TEMPLATES = [
  REFLEX_TEMPLATE,
  SNAKE_TEMPLATE,
  BRICK_BREAKER_TEMPLATE,
  SYNTH_PAD_TEMPLATE,
  TASK_BOARD_TEMPLATE,
];

export function getTemplateById(id) {
  return TEMPLATES.find((t) => t.id === id) || REFLEX_TEMPLATE;
}
