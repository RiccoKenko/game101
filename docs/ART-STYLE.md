# Art style guide — Little Archer: Monster Rush

All art is hand-written SVG stored as TypeScript strings and rasterized into game textures at runtime
(Image -> canvas, including on iPhone Safari). The world is 1080 px wide in portrait, so a 100 px sprite
is roughly 36 CSS px on an iPhone.

## Look
- Cute chibi cartoon, bright and saturated, friendly (fantasy hero vs monsters). Big heads, big eyes, simple shapes.
- Thick dark outline on every shape group: `stroke="#2a1f3d"`, `stroke-width="4"` (use 3 for art under ~48 px,
  5-6 for bosses), `stroke-linejoin="round"`, `stroke-linecap="round"`.
- Cel shading, light from top-left: base fill + one darker shade shape on the lower/right side + one small
  light highlight on the upper-left. No soft airbrush.
- Eyes: white sclera + dark pupil + tiny white glint reads best at small size.

## Hard technical rules (Safari rasterization)
- Use the `svg(w, h, body)` helper from `src/art/types.ts`; `body` is the inner markup only.
- NO `<filter>`, no blur/drop-shadow, no `<image>`, no `<text>`, no `<foreignObject>`, no CSS `<style>`/classes,
  no external references. Presentation attributes only (fill, stroke, opacity, transform...).
- Linear/radial gradients are allowed sparingly; give every gradient id a prefix of the art key
  (e.g. `id="bossDemon_g1"`).
- Transparent background. Keep ~4 px padding so outlines are never clipped by the canvas edge.
- Do not draw ground shadows under characters (the game draws its own shadow ellipse).
- Keep each SVG lean (target < 6 KB) — prefer paths/ellipses over hundreds of tiny shapes.

## Conventions
- Characters and projectiles face RIGHT (angle 0). The game flips/rotates them.
- Characters stand with feet at the bottom of the canvas.
- Two-frame animations (`_0`, `_1`): identical canvas size and identical body/head position; only legs, wings,
  arms, slime squish, flames etc. change, so swapping frames never jitters.

## Palette anchors
- Outline `#2a1f3d`, highlight `#ffffff` (opacity 0.6-0.8), gold `#ffcc33`, XP blue `#3fa9ff`.
- Hero hood/cape royal blue `#3d7bff` with gold trim — must pop on every map ground.
- Meadow ground: fresh mid green grass. Graveyard: muted grey-green/brown. Castle: grey-purple stone.
  Enemies must contrast with the ground of their own map.
