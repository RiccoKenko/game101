# Code-drawn art (Ricco Rush)

The heroes and monsters are rendered from free 3D models (see `scripts/art/render3d/`); the map grounds,
decorations, pickups and MVP card frames are drawn by code here, from simple shapes, in the look of a 2000s Korean online RPG: small,
smooth sprites (anti-aliased, not blocky), soft light from the upper left, thin outlines in each colour's own dark
tone, and muted earthy colours with a few warm accents. The game only borrows that era's look and systems: every
character, monster, place and item is our own design. Never copy or name a real game's monsters, characters, towns,
logos or items.

## Files
- `engine.mjs`: the painter (`Sprite`).
- `palette.mjs`: the shared colour ramps (`C`) and face colours (`EYE`, `BLUSH`, `SHEEN`).
- `heroes.mjs`, `gummy.mjs`, `sample.mjs`: the code-drawn style sample shown to the boss (heroes and Gummy).
- `sets/*.mjs`: everything else, one file per group. Each exports `ART = { textureKey: () => Sprite | Buffer }`.
- `build.mjs`: `node scripts/art/pixel/build.mjs [set ...] [--preview sheet.png] [--dry]` writes each key to
  `public/art/<key>.webp` (sprites trimmed to what was drawn) and lists it in `src/art/manifest.json`.
  `--dry --preview <png>` only draws a contact sheet to look at.
- `sample.mjs`: the style sample page shown to the boss.

## Sizes
- `new Sprite(w, h)` is `w` x `h` sprite pixels, written 3 times larger: one sprite pixel is 3 game pixels.
- Keep each texture about the size of the picture it replaces (see `public/art/<key>.webp`), because the game shows
  textures at their own size. A regular monster is about 3 x its `radius` in `src/config/enemies.ts` wide
  (80-130 px, so 27-43 sprite px); a boss 250-380 px.

## Drawing
- Shapes, in sprite pixels, each filled from a 4-tone ramp `[highlight, base, shade, outline]` and shaded as if
  round: `ellipse(cx, cy, rx, ry, ramp, opts)` (a ball), `capsule(x1, y1, x2, y2, r, ramp, opts)` (a rod),
  `taper(x1, y1, x2, y2, r1, r2, ramp, opts)` (a rod narrowing to a point: hair, horns, tails, flames),
  `poly(points, ramp, opts)` and `rect(x, y, w, h, ramp, opts)` (shaded like an upright cylinder).
- Flat details with no outline: `spot(cx, cy, rx, ry, '#hex')`, `line(x1, y1, x2, y2, r, '#hex')`.
  `clear(x, y, w, h)` erases.
- `opts` is a number (brighter if positive, darker if negative, about -0.3..0.3) or
  `{ bias, outline: false, flat: '#hex', rot }` (`rot` tilts an ellipse).
- Canvas-like transforms: `save()`, `restore()`, `translate(x, y)`, `rotate(t)`, `pivot(x, y, t)` (turn around a
  point); `where(x, y)` says where a point ends up.
- Later shapes cover earlier ones. Where a shape meets empty space it gets an outline in its darkest tone; where it
  lies over an earlier shape of a different ramp it gets a softer line; shapes sharing a ramp merge into one mass
  with no line between them (build hair, a body, a cloud from several shapes this way).

## Look
- Faces: small dark eyes with a white glint, a soft blush, a tiny mouth (see `heroes.mjs` and `gummy.mjs`).
- Draw anything that faces a way facing right or the viewer; the game mirrors it.
- Stay in the palette's muted tones; save the bright colours (ruby, brass, leaf) for small accents.
