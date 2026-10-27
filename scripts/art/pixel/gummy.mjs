/**
 * Gummy, the peach jelly of the first code-drawn style sample (scripts/art/pixel/sample.mjs). The game's monsters
 * are rendered from 3D models now (scripts/art/render3d); this one stays for the sample page.
 */
import { Sprite } from './engine.mjs';
import { C, EYE } from './palette.mjs';

/** Gummy on its own 32 x 28 sprite; `squash` widens and lowers it, for a hop. */
export function gummy(squash = 0) {
  const s = new Sprite(32, 28);
  drawGummy(s, squash);
  return s;
}

/** Gummy on any sprite, in a 32 x 28 box from the current origin (its feet at about 16, 27). */
export function drawGummy(s, squash = 0) {
  const top = 7 + squash;
  s.capsule(16, top, 16, top - 3.5, 0.8, C.leaf);
  s.ellipse(12.5, top - 4.5, 3.4, 2, C.leaf, 0.2).ellipse(19.5, top - 4.5, 3.4, 2, C.leaf, 0.2);
  // A jelly sits flat on the ground.
  s.clip(0, -10, 32, 36);
  s.ellipse(16, 18 + squash / 2, 12 + squash, 9.5 - squash / 2, C.peach);
  s.unclip();
  const ey = 15 + squash;
  s.spot(10.6, ey + 4.3, 1.8, 0.9, '#f59a86').spot(21.4, ey + 4.3, 1.8, 0.9, '#f59a86');
  s.spot(13, ey + 1.5, 1.15, 1.6, EYE).spot(20, ey + 1.5, 1.15, 1.6, EYE);
  s.spot(13.4, ey + 0.8, 0.45, 0.5, '#ffffff').spot(20.4, ey + 0.8, 0.45, 0.5, '#ffffff');
  s.line(15.4, ey + 4.4, 16.5, ey + 5.3, 0.32, '#a5503c').line(16.5, ey + 5.3, 17.6, ey + 4.4, 0.32, '#a5503c');
  s.spot(9.6, 12.8 + squash, 1.3, 0.95, '#fff4ea');
}
