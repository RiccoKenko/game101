/**
 * MVP cards (the rewards bosses drop, textures relic_<boss>): an upright parchment card with a brass rim, a picture
 * window showing the boss, a small brass plaque under it and a ruby at the top. All three maps' cards share this
 * frame so they read as one collection.
 */
import { Sprite } from './engine.mjs';
import { C } from './palette.mjs';

/** The picture window, in the card's sprite pixels. */
export const CARD_WINDOW = { x: 5, y: 6.5, w: 27, h: 24 };

/** Corner points of a rectangle with rounded corners, for `poly`. */
export function rounded(x, y, w, h, r, steps = 4) {
  const pts = [];
  const corner = (cx, cy, from) => {
    for (let i = 0; i <= steps; i++) {
      const a = from + (i / steps) * (Math.PI / 2);
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
    }
  };
  corner(x + w - r, y + r, -Math.PI / 2);
  corner(x + w - r, y + h - r, 0);
  corner(x + r, y + h - r, Math.PI / 2);
  corner(x + r, y + r, Math.PI);
  return pts;
}

/**
 * A card 37 x 43 sprite pixels (111 x 129 in the game). `portrait(s)` draws the boss into the window, clipped to
 * it: translate and scale there yourself (CARD_WINDOW says where the window is). `backdrop` is the window's ramp.
 */
export function mvpCard(portrait, backdrop = C.slate) {
  const s = new Sprite(37, 43);
  const { x, y, w, h } = CARD_WINDOW;
  s.poly(rounded(1.5, 1.5, 34, 40, 3.5), C.ivory);
  s.poly(rounded(3, 3, 31, 37, 2.5), C.cream, -0.05);
  s.rect(x, y, w, h, backdrop, { bias: 0.15, outline: false });
  s.save();
  s.clip(x, y, w, h);
  portrait(s);
  s.unclip();
  s.restore();
  // The brass frame around the window, the plaque, the ruby.
  s.capsule(x, y, x + w, y, 0.7, C.brass).capsule(x, y + h, x + w, y + h, 0.7, C.brass);
  s.capsule(x, y, x, y + h, 0.7, C.brass).capsule(x + w, y, x + w, y + h, 0.7, C.brass);
  s.rect(9, 33.5, 19, 4.6, C.brass);
  s.line(11.5, 35.8, 25.5, 35.8, 0.35, C.brass[2]);
  s.ellipse(18.5, 3.6, 2.4, 2.2, C.brass).ellipse(18.5, 3.6, 1.5, 1.4, C.ruby, 0.1);
  return s;
}
