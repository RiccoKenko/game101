import { svg, type ArtSet } from './types';

// ---------------------------------------------------------------------------
// Shared drawing helpers
// ---------------------------------------------------------------------------

const O = '#2a1f3d';
const WHITE = '#ffffff';
const GOLD = '#ffcc33';
const GOLD_D = '#e09a1c';
const BLUSH = '#ff7fa0';

/** Outline stroke attributes (round joins/caps are inherited from the wrapper group in `art`). */
const st = (w = 4): string => `stroke="${O}" stroke-width="${w}"`;

/** Like `svg()`, but every shape inherits round line joins/caps from one wrapper group. */
const art = (w: number, h: number, body: string) =>
  svg(w, h, `<g stroke-linejoin="round" stroke-linecap="round">${body}</g>`);

/** Filled + outlined path. */
const P = (d: string, fill: string, w = 4, extra = ''): string =>
  `<path d="${d}" fill="${fill}" ${st(w)}${extra}/>`;

/** Fill-only path (shading / highlights / details). */
const F = (d: string, fill: string, op?: number): string =>
  `<path d="${d}" fill="${fill}"${op !== undefined ? ` opacity="${op}"` : ''}/>`;

/** Outline-only line. */
const L = (d: string, w = 3, color = O): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}"/>`;

/** Thick outlined "tube" (limbs, bones, shafts): dark wide stroke + colored narrower stroke. */
const tube = (d: string, color: string, w: number, ow = 4): string =>
  L(d, w + ow * 2 - 1, O) + L(d, w, color);

/** Ellipse as a path (so it can go through the cel-shading helper). */
const E = (cx: number, cy: number, rx: number, ry = rx): string =>
  `M${cx - rx} ${cy}a${rx} ${ry} 0 1 0 ${rx * 2} 0a${rx} ${ry} 0 1 0 ${-rx * 2} 0Z`;

const ell = (cx: number, cy: number, rx: number, ry: number, fill: string, w = 4, extra = ''): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${fill}"${w ? ` ${st(w)}` : ''}${extra}/>`;

const r1 = (n: number): number => Math.round(n * 10) / 10;

/**
 * Cel-shaded part: base fill, a darker crescent on the lower-right (the base shape shifted up-left
 * and clipped), optional extra detail clipped inside, then the outline on top.
 */
function cel(
  id: string,
  d: string,
  base: string,
  shade: string,
  o: { dx?: number; dy?: number; w?: number; inner?: string } = {},
): string {
  const dx = o.dx ?? -4;
  const dy = o.dy ?? -5;
  return (
    `<clipPath id="${id}"><path d="${d}"/></clipPath>` +
    `<g clip-path="url(#${id})"><rect x="-9" y="-9" width="999" height="999" fill="${shade}"/>` +
    `<path d="${d}" fill="${base}" transform="translate(${dx} ${dy})"/>${o.inner ?? ''}</g>` +
    `<path d="${d}" fill="none" ${st(o.w ?? 4)}/>`
  );
}

/** Soft white highlight blob. */
const hl = (cx: number, cy: number, rx: number, ry: number, rot = -30, op = 0.7): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${WHITE}" opacity="${op}" transform="rotate(${rot} ${cx} ${cy})"/>`;

/** Cute eye: white sclera + dark pupil (looking right) + glint. */
function eye(cx: number, cy: number, rx: number, ry: number, w = 3, pupil = O): string {
  const px = r1(cx + rx * 0.22);
  const py = r1(cy + ry * 0.08);
  return (
    ell(cx, cy, rx, ry, WHITE, w) +
    ell(px, py, r1(rx * 0.62), r1(ry * 0.66), pupil, 0) +
    `<circle cx="${r1(px - rx * 0.2)}" cy="${r1(py - ry * 0.28)}" r="${r1(Math.max(1.2, rx * 0.26))}" fill="${WHITE}"/>`
  );
}

/** Solid dark "bead" eye with glint (ghosts, skulls). */
const bead = (cx: number, cy: number, rx: number, ry: number, fill = O): string =>
  ell(cx, cy, rx, ry, fill, 0) +
  `<circle cx="${r1(cx - rx * 0.3)}" cy="${r1(cy - ry * 0.35)}" r="${r1(rx * 0.38)}" fill="${WHITE}"/>`;

const blush = (cx: number, cy: number, rx = 4, ry = 2.6): string =>
  `<ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${BLUSH}" opacity="0.55"/>`;

/** Mirror a path's x coordinates around canvas width W (only absolute M/L/C/Q commands with x y pairs). */
function mirrorX(d: string, W: number): string {
  return d.replace(/(-?\d+(?:\.\d+)?)[ ,](-?\d+(?:\.\d+)?)/g, (_m, x: string, y: string) => `${r1(W - Number(x))} ${y}`);
}

// ---------------------------------------------------------------------------
// Hero — chibi archer (100 x 116)
// ---------------------------------------------------------------------------

const H_BLUE = '#3d7bff';
const H_BLUE_D = '#2350c8';
const SKIN = '#ffd9b3';
const SKIN_D = '#f1b38a';
const HAIR = '#8a4b22';
const TUNIC = '#7aa83c';
const TUNIC_D = '#56802a';
const LEATHER = '#8b5a2b';
const LEATHER_D = '#5e3a1a';
const WOOD = '#c27c34';
const WOOD_D = '#8a5220';

function heroLeg(x: number, lift: number): string {
  const y = 110 - lift;
  return (
    P(`M${x - 5} 90L${x + 5} 90L${x + 5} ${y - 8}L${x - 5} ${y - 8}Z`, LEATHER_D, 4) +
    P(`M${x - 6} ${y - 10}L${x + 3} ${y - 10}C${x + 11} ${y - 10} ${x + 12} ${y} ${x + 5} ${y}L${x - 6} ${y}Z`, LEATHER, 4) +
    L(`M${x - 3} ${y - 7}L${x + 3} ${y - 7}`, 2, '#b07a44')
  );
}

/** An arrow sticking out of the quiver: shaft from (x1,y1) to the fletched end (x2,y2). */
function quiverArrow(x1: number, y1: number, x2: number, y2: number, feather: string): string {
  const len = Math.hypot(x2 - x1, y2 - y1);
  const ux = (x2 - x1) / len;
  const uy = (y2 - y1) / len;
  const pt = (a: number, b: number): string => `${r1(x2 + ux * a - uy * b)} ${r1(y2 + uy * a + ux * b)}`;
  return (
    tube(`M${x1} ${y1}L${x2} ${y2}`, '#e0b884', 2, 3) +
    P(`M${pt(-12, 0)}L${pt(-8, 4.5)}L${pt(1, 4.5)}L${pt(-1, 0)}L${pt(1, -4.5)}L${pt(-8, -4.5)}Z`, feather, 2.5)
  );
}

function hero(legs: [number, number, number, number]): string {
  const [ax, al, bx, bl] = legs;
  const arrows = quiverArrow(16, 56, 6, 37, '#ff5a5a') + quiverArrow(21, 55, 14, 33, WHITE);
  const cape =
    cel('hero_cape', 'M44 60C32 68 22 84 14 100C26 104 40 103 48 98L50 64Z', H_BLUE, H_BLUE_D, { dx: 4, dy: -4 }) +
    L('M16 99C26 103 40 102 47 97', 3, GOLD);
  const quiver =
    `<g transform="rotate(-28 26 70)">` +
    P('M19 52L33 52L33 86C33 89 19 89 19 86Z', LEATHER, 4) +
    F('M28 54L31 54L31 85L28 86Z', LEATHER_D) +
    L('M19 58L33 58', 3) +
    L('M20.5 55L31.5 55', 2, GOLD) +
    `</g>`;
  const body =
    cel('hero_body', 'M39 62L69 62C73 72 75 84 75 94L35 94C35 84 36 72 39 62Z', TUNIC, TUNIC_D, { dx: -4, dy: -3 }) +
    P('M36 80L74 80L75 87L35 87Z', LEATHER, 3) +
    P('M52 79L60 79L60 88L52 88Z', GOLD, 3);
  const arm = tube('M62 70C68 76 76 78 82 78', TUNIC, 7, 4);
  const bow =
    L('M80 50L80 106', 1.6, '#fff4d6') +
    P('M80 50Q102 78 80 106L77 104Q94 78 77 52Z', WOOD, 3) +
    F('M88 64Q92 78 88 92L86.5 91Q89.5 78 86.5 65Z', WOOD_D) +
    ell(87, 78, 6, 6, SKIN, 3);
  const hood =
    cel(
      'hero_hood',
      'M24 52C20 44 19 34 20 26C17 20 14 15 11 9C19 10 27 10 35 10C43 7 53 7 61 8C75 11 85 23 85 40C85 52 81 60 75 66L31 66C27 62 25 57 24 52Z',
      H_BLUE,
      H_BLUE_D,
      { dx: -4, dy: -5, inner: hl(31, 21, 8, 4, -35, 0.5) },
    );
  const face =
    ell(58, 41, 24, 22.5, GOLD, 3.5) +
    cel('hero_face', E(58, 42, 18, 17.5), SKIN, SKIN_D, { dx: -3, dy: -3, w: 3 }) +
    P('M40 38C41 28 49 24 59 24C69 24 75 30 76 38C71 34 67 35 64 31C60 35 54 35 50 32C46 36 43 36 40 38Z', HAIR, 3) +
    eye(52, 45, 4.6, 6) +
    eye(66, 45, 4.2, 5.8) +
    blush(46, 53) +
    blush(73, 53, 3, 2.4) +
    L('M56 54Q60 57.5 64 54', 2.5);
  return arrows + cape + quiver + heroLeg(ax, al) + heroLeg(bx, bl) + body + arm + hood + face + bow;
}

// ---------------------------------------------------------------------------
// Meadow enemies
// ---------------------------------------------------------------------------

const SLIME = '#ff5fae';
const SLIME_D = '#d83a8c';

function slime(squish: boolean, id: string): string {
  const d = squish
    ? 'M5 58C2 42 20 24 42 24C64 24 82 42 79 58C64 63 20 63 5 58Z'
    : 'M9 58C5 38 20 12 42 12C64 12 79 38 75 58C62 63 22 63 9 58Z';
  const ey = squish ? 42 : 36;
  const eye2 = squish
    ? eye(49, ey, 5.4, 6) + eye(64, ey, 5, 5.6)
    : eye(48, ey, 5, 7) + eye(62, ey, 4.6, 6.6);
  const mouth = squish ? 'M52 51Q56.5 56 61 51Z' : 'M51 47Q55.5 53 60 47Z';
  return (
    cel(id, d, SLIME, SLIME_D, {
      dx: -5,
      dy: -5,
      inner: squish
        ? hl(22, 34, 8, 4, -25) + `<circle cx="14" cy="42" r="2.5" fill="${WHITE}" opacity="0.7"/>`
        : hl(24, 24, 7, 4.5, -40) + `<circle cx="16" cy="34" r="2.5" fill="${WHITE}" opacity="0.7"/>`,
    }) +
    eye2 +
    P(mouth, '#8a1f4a', 2.5) +
    blush(squish ? 41 : 40, squish ? 50 : 46) +
    blush(squish ? 71 : 69, squish ? 50 : 46, 3)
  );
}

const BAT = '#9b5de5';
const BAT_D = '#7340b8';
const BAT_W = '#5b2d91';
const BAT_W_D = '#43206e';

function bat(up: boolean): string {
  const wing = up
    ? 'M34 32C28 22 18 12 6 8C8 18 8 26 9 34C14 30 18 31 20 37C24 33 29 34 32 41Z'
    : 'M34 34C26 40 16 48 6 60C12 58 16 58 18 63C22 57 26 56 29 59C30 52 33 48 36 45Z';
  const ribs = up ? 'M33 33L10 14M32 37L14 32' : 'M33 37L10 57M33 41L22 59';
  const wings =
    P(wing, BAT_W, 4) + L(ribs, 2, BAT_W_D) + P(mirrorX(wing, 92), BAT_W, 4) + L(mirrorX(ribs, 92), 2, BAT_W_D);
  return (
    wings +
    P('M35 27L33 10L44 22Z', BAT, 4) +
    P('M50 21L60 9L59 27Z', BAT, 4) +
    F('M37 23L36 15L41 21Z', '#e6a6ff') +
    F('M53 20L58 14L57 23Z', '#e6a6ff') +
    ell(41, 52, 3, 3, BAT_D, 3) +
    ell(51, 52, 3, 3, BAT_D, 3) +
    cel('bat_b', E(46, 36, 17, 16), BAT, BAT_D, { dx: -4, dy: -4, inner: hl(37, 27, 5, 3, -40, 0.6) }) +
    F('M44 40C46 47 56 48 59 42C56 51 46 51 44 40Z', '#c9a3f5', 0.9) +
    eye(48, 34, 4.4, 5.4) +
    eye(59, 34, 4, 5) +
    L('M51 43Q55 46 59 43', 2.2) +
    F('M52 43.5L53.6 47.5L55 44.4Z', WHITE) +
    F('M56 44.4L57 47.5L58.2 43.6Z', WHITE)
  );
}

const MUSH_CAP = '#ef4848';
const MUSH_CAP_D = '#bf2c38';
const MUSH_STEM = '#fbe9cf';
const MUSH_STEM_D = '#e3c49c';

function mushroom(a: number, b: number): string {
  const foot = (x: number, lift: number): string => ell(x, 85 - lift, 9, 6, '#a8683c', 4);
  return (
    foot(32, a) +
    foot(54, b) +
    ell(22, 75, 3.8, 6, MUSH_STEM_D, 3.5, ' transform="rotate(20 22 75)"') +
    cel('mushroom_stem', 'M24 46C21 58 21 70 25 78C33 83 53 83 61 78C65 70 65 58 62 46Z', MUSH_STEM, MUSH_STEM_D, {
      dx: -4,
      dy: -2,
    }) +
    ell(65, 76, 3.8, 6, MUSH_STEM, 3.5, ' transform="rotate(-20 65 76)"') +
    cel('mushroom_cap', 'M6 44C4 22 22 6 42 6C62 6 80 22 78 44C70 52 14 52 6 44Z', MUSH_CAP, MUSH_CAP_D, {
      dx: -4,
      dy: -5,
      inner:
        ell(25, 22, 6, 5.5, WHITE, 0) +
        ell(45, 15, 7, 4.5, WHITE, 0) +
        ell(64, 26, 5, 5, WHITE, 0) +
        ell(13, 36, 3.5, 4, WHITE, 0) +
        ell(41, 33, 4.5, 4, WHITE, 0) +
        ell(72, 40, 3, 3, WHITE, 0),
    }) +
    F('M10 45C24 51 60 51 74 45C66 53 18 53 10 45Z', '#9e2430', 0.5) +
    eye(45, 63, 4.4, 5.2) +
    eye(57, 63, 4, 5) +
    L('M38 56L49 59.5M63 56L53 59.5', 3) +
    L('M47 73Q51 70 55 73', 2.5) +
    blush(38, 69, 3.2, 2) +
    blush(62, 69, 2.8, 2)
  );
}

// ---------------------------------------------------------------------------
// Graveyard enemies
// ---------------------------------------------------------------------------

const BONE = '#f6f2e6';
const BONE_D = '#cdc5ae';

function skeleton(a: number, al: number, b: number, bl: number): string {
  const leg = (x: number, lift: number): string =>
    tube(`M${x} 88L${x} ${100 - lift}`, BONE, 5, 3.5) +
    P(`M${x - 5} ${101 - lift}L${x + 5} ${101 - lift}C${x + 11} ${101 - lift} ${x + 11} ${106 - lift} ${x + 6} ${106 - lift}L${x - 5} ${106 - lift}C${x - 8} ${106 - lift} ${x - 8} ${101 - lift} ${x - 5} ${101 - lift}Z`, BONE, 3.5);
  return (
    tube('M34 64C28 70 26 76 28 82', BONE, 5, 3.5) +
    ell(28, 84, 4.5, 4.5, BONE, 3.5) +
    leg(a, al) +
    leg(b, bl) +
    P('M33 82L57 82C58 88 54 91 45 91C36 91 32 88 33 82Z', BONE, 3.5) +
    tube('M45 58L45 82', BONE, 6, 3.5) +
    P('M33 63C33 60 57 60 57 63L55 76C51 79 39 79 35 76Z', BONE, 3.5) +
    L('M37 67.5L53 67.5M38 72.5L52 72.5', 3) +
    tube('M55 64C62 68 66 72 70 72', BONE, 5, 3.5) +
    ell(72, 71, 4.5, 4.5, BONE, 3.5) +
    cel(
      'skeleton_head',
      'M18 32C18 16 30 6 45 6C61 6 72 16 72 32C72 42 68 48 62 51L62 57C62 59 32 59 32 57L32 51C23 48 18 42 18 32Z',
      BONE,
      BONE_D,
      { dx: -4, dy: -4, inner: hl(28, 18, 7, 4, -35, 0.8) },
    ) +
    bead(48, 31, 6.5, 7.5) +
    bead(62, 31, 5.5, 7) +
    P('M54 41L57 45L51 45Z', O, 2) +
    L('M38 51L60 51M44 48L44 56M50 48L50 56M56 48L56 56', 2.5)
  );
}

const GHOST = '#c8f6ff';
const GHOST_D = '#8fd6ea';

function ghost(f: number): string {
  const d =
    f === 0
      ? 'M26 56C20 32 32 8 56 8C76 8 86 24 84 44C83 62 74 76 62 84C56 88 52 84 47 89C42 94 36 88 30 93C24 97 14 96 6 90C14 88 18 82 18 75C20 68 28 66 26 56Z'
      : 'M26 56C20 32 32 8 56 8C76 8 86 24 84 44C83 62 76 74 66 82C58 88 56 82 50 87C44 92 40 85 33 89C26 93 16 86 8 80C16 79 18 74 18 70C20 64 28 64 26 56Z';
  return (
    `<g opacity="0.9">` +
    cel(`ghost_b${f}`, d, GHOST, GHOST_D, { dx: -5, dy: -5, inner: hl(40, 20, 8, 4.5, -40, 0.8) }) +
    P(f === 0 ? 'M70 62C73 55 82 54 83 60C84 65 77 68 72 67Z' : 'M70 60C72 53 81 51 83 56C85 62 78 65 72 65Z', GHOST, 3.5) +
    `</g>` +
    bead(56, 37, 5.5, 7.5) +
    bead(71, 37, 5, 7) +
    ell(65, 51, 3.5, 4.2, '#5a3a6a', 2.5) +
    blush(48, 47, 4, 2.5) +
    blush(78, 47, 3, 2.2)
  );
}

const Z_SKIN = '#8fd06a';
const Z_SKIN_D = '#63a347';
const Z_SHIRT = '#8a55c9';
const Z_SHIRT_D = '#6a3da3';
const Z_PANTS = '#4f6a8f';

function zombie(a: number, al: number, b: number, bl: number): string {
  const leg = (x: number, lift: number): string =>
    P(`M${x - 6} 84L${x + 6} 84L${x + 6} ${100 - lift}L${x - 6} ${100 - lift}Z`, Z_PANTS, 4) +
    P(`M${x - 7} ${99 - lift}L${x + 4} ${99 - lift}C${x + 12} ${99 - lift} ${x + 13} ${109 - lift} ${x + 6} ${109 - lift}L${x - 7} ${109 - lift}Z`, '#5a3f2e', 4);
  const arm = (y: number, front: boolean): string =>
    tube(`M48 ${y}L80 ${y + 2}`, Z_SKIN, 8, 4) +
    tube(`M48 ${y}L62 ${y + 1}`, front ? Z_SHIRT : Z_SHIRT_D, 9, 4) +
    ell(83, y + 2, 5.5, 5, Z_SKIN, 3.5);
  return (
    arm(62, false) +
    leg(a, al) +
    leg(b, bl) +
    cel('zombie_body', 'M30 56L62 56C66 66 66 76 66 88L60 84L54 90L48 84L42 90L36 84L29 88C28 76 28 66 30 56Z', Z_SHIRT, Z_SHIRT_D, {
      dx: -4,
      dy: -3,
    }) +
    L('M36 64L40 70M58 72L55 77', 2.5) +
    arm(70, true) +
    cel('zombie_head', 'M20 34C18 17 30 8 46 8C62 8 72 18 72 33C72 48 63 57 46 57C30 57 21 49 20 34Z', Z_SKIN, Z_SKIN_D, {
      dx: -4,
      dy: -4,
      inner: hl(30, 22, 6, 3, -35, 0.5),
    }) +
    P('M22 24C22 12 36 4 48 8C56 3 68 10 69 20C63 15 58 18 55 13C51 20 43 15 39 20C35 15 28 20 22 24Z', '#4a3550', 3.5) +
    L('M25 36L33 32M26 32L28 37M30 30L32 35', 2) +
    eye(51, 33, 6.4, 6.4) +
    eye(65, 34, 4.2, 4.2) +
    P('M50 45C54 50 62 50 66 44C62 46 56 46 50 45Z', '#5a2a3a', 2.5) +
    F('M57 46.5L59 49L60.5 46.4Z', WHITE)
  );
}

// ---------------------------------------------------------------------------
// Castle enemies
// ---------------------------------------------------------------------------

const IMP = '#ee4a3c';
const IMP_D = '#b92e2e';
const IMP_W = '#8e2340';
const IMP_W_D = '#6a1830';

function imp(up: boolean, a: number, b: number): string {
  const wing = up
    ? 'M36 50C28 36 18 21 6 8C10 21 9 32 6 44C12 41 17 43 19 50C24 46 28 48 31 56Z'
    : 'M36 52C28 54 18 60 6 70C14 72 16 76 16 82C22 78 26 78 28 82C30 76 34 72 38 62Z';
  const ribs = up ? 'M33 50L8 12M30 52L9 42' : 'M35 56L9 70';
  const leg = (x: number, lift: number): string =>
    tube(`M${x} 78L${x} ${84 - lift}`, IMP, 5, 3.5) + ell(x + 2, 86 - lift, 5.5, 3.5, '#3a2a3a', 3);
  return (
    `<g transform="${up ? 'translate(11 1)' : 'translate(9 -5)'}">${P(wing, IMP_W_D, 3.5)}</g>` +
    P(wing, IMP_W, 4) +
    L(ribs, 2, IMP_W_D) +
    tube('M30 74C20 80 12 76 12 66', IMP, 3, 3) +
    P('M12 66L7 61L13 56L17 62Z', IMP, 3) +
    leg(37, a) +
    leg(48, b) +
    cel('imp_body', E(42, 68, 13, 12), IMP, IMP_D, { dx: -3, dy: -3 }) +
    F('M38 65C38 60 50 60 50 66C50 74 38 74 38 65Z', '#ff9a7a', 0.7) +
    tube('M72 24L72 88', '#8a5a33', 3, 3) +
    P('M64 30L64 20L66 18L68 30L70 30L70 16L72 12L74 16L74 30L76 30L78 18L80 20L80 30C80 34 64 34 64 30Z', GOLD, 3) +
    tube('M50 64C58 66 64 66 70 62', IMP, 5, 3.5) +
    ell(71, 61, 5, 5, IMP, 3.5) +
    P('M26 22C22 14 22 8 26 4C30 10 34 13 35 19Z', '#f6e3c0', 3.5) +
    P('M47 17C49 10 53 6 58 5C57 11 56 15 54 20Z', '#f6e3c0', 3.5) +
    P('M22 40C17 37 13 35 10 35C12 40 16 44 22 46Z', IMP, 3) +
    cel('imp_head', E(40, 38, 20, 19), IMP, IMP_D, { dx: -4, dy: -4, inner: hl(30, 26, 6, 3.5, -35, 0.55) }) +
    eye(45, 37, 5, 6) +
    eye(57, 37, 4.4, 5.6) +
    L('M40 29L49 31M61 30L54 31.5', 2.5) +
    L('M44 48Q51 53 58 47', 2.5) +
    F('M47 49.4L48.6 53L50.5 50.4Z', WHITE)
  );
}

const STEEL = '#6f7b9c';
const STEEL_D = '#4a5272';
const STEEL_L = '#b7c0dc';
const PLUME = '#ef3b45';
const PLUME_D = '#b52436';

function knight(a: number, al: number, b: number, bl: number): string {
  const leg = (x: number, lift: number): string =>
    P(`M${x - 7} 96L${x + 7} 96L${x + 6} ${110 - lift}L${x - 6} ${110 - lift}Z`, STEEL_D, 4) +
    P(`M${x - 8} ${108 - lift}L${x + 4} ${108 - lift}C${x + 13} ${108 - lift} ${x + 14} ${119 - lift} ${x + 7} ${119 - lift}L${x - 8} ${119 - lift}Z`, STEEL, 4);
  return (
    P('M52 20C44 6 28 2 14 8C22 10 26 14 28 18C20 18 14 24 10 32C20 28 30 28 38 32C30 34 26 40 24 46C34 40 44 36 52 34Z', PLUME, 4) +
    L('M46 22C36 14 26 12 20 12M44 28C34 26 24 28 16 30', 2.5, PLUME_D) +
    tube('M34 74C28 82 26 90 28 96', STEEL_D, 8, 4) +
    leg(a, al) +
    leg(b, bl) +
    cel('knight_body', 'M33 68L73 68C77 80 77 92 73 100L33 100C29 92 29 80 33 68Z', STEEL, STEEL_D, {
      dx: -4,
      dy: -3,
      inner: hl(40, 76, 4, 8, 10, 0.5),
    }) +
    P('M31 90L75 90L75 97L31 97Z', '#5a3a2a', 3) +
    P('M50 89L58 89L58 98L50 98Z', GOLD, 2.5) +
    cel(
      'knight_head',
      'M26 42C26 24 38 13 54 13C70 13 82 24 82 42C82 56 76 66 68 70L40 70C32 66 26 56 26 42Z',
      STEEL,
      STEEL_D,
      { dx: -4, dy: -4, inner: hl(38, 24, 8, 4, -35, 0.75) + hl(33, 42, 3, 9, 8, 0.45) },
    ) +
    L('M48 15C44 30 44 52 48 69', 3, STEEL_D) +
    P('M52 36L80 36C83 40 83 46 80 50L52 50C50 46 50 40 52 36Z', '#1c1430', 3.5) +
    L('M57 43L77 43', 3.5, '#ff9a1f') +
    L('M58 43L76 43', 1.6, '#fff2a0') +
    ell(62, 43, 2.6, 2.6, '#fff6c0', 0) +
    ell(73, 43, 2.4, 2.4, '#fff6c0', 0) +
    ell(36, 56, 2, 2, STEEL_L, 0) +
    ell(44, 62, 2, 2, STEEL_L, 0) +
    cel('knight_shield', 'M64 62L98 62C98 82 92 96 81 106C70 96 64 82 64 62Z', '#d23a44', '#a52634', {
      dx: -3,
      dy: -4,
      w: 4,
    }) +
    L('M68 66L94 66C94 82 89 94 81 101C73 94 68 82 68 66Z', 3, GOLD) +
    P('M78 72L84 72L84 78L90 78L90 84L84 84L84 94L78 94L78 84L72 84L72 78L78 78Z', GOLD, 2.5)
  );
}

const GARG = '#5fa7ab';
const GARG_D = '#3e7c86';
const GARG_W = '#4a8a96';
const GARG_W_D = '#336470';

function gargoyle(up: boolean): string {
  const wing = up
    ? 'M48 48C40 32 28 18 12 6C16 18 14 28 10 38C16 36 22 38 24 44C28 40 34 42 36 50C38 48 42 50 44 56Z'
    : 'M48 48C36 46 20 52 4 66C12 66 16 70 16 76C20 70 26 70 28 74C30 66 36 64 40 66C40 58 44 54 48 54Z';
  const ribs = up ? 'M46 50L14 10M42 52L24 42' : 'M46 50L8 66M44 54L28 72';
  const far = up ? 'translate(16 -2)' : 'translate(12 -12)';
  return (
    `<g transform="${far}">${P(wing, GARG_W_D, 3.5)}</g>` +
    P(wing, GARG_W, 4) +
    L(ribs, 2, GARG_W_D) +
    tube('M30 84C18 90 10 88 9 80', GARG, 4, 3.5) +
    P('M9 80L4 74L10 68L15 75Z', GARG, 3.5) +
    cel('gargoyle_thigh', E(38, 78, 15, 13), GARG, GARG_D, { dx: -3, dy: -3 }) +
    P('M30 88L46 88C52 88 52 96 46 96L28 96C24 96 24 88 30 88Z', GARG, 3.5) +
    L('M40 92L40 96M46 91L46 96', 2) +
    cel('gargoyle_body', 'M30 70C28 54 40 42 56 42C70 42 80 52 80 64C80 78 72 88 58 90C44 92 32 84 30 70Z', GARG, GARG_D, {
      dx: -4,
      dy: -4,
      inner: F('M56 60C66 58 74 64 72 76C68 84 58 86 54 80C52 72 52 64 56 60Z', '#8fcfcb', 0.6),
    }) +
    tube('M70 74L74 86', GARG, 8, 4) +
    P('M66 86L82 86C88 86 88 95 82 95L64 95C60 95 60 86 66 86Z', GARG, 3.5) +
    L('M74 90L74 95M80 90L80 95', 2) +
    P('M64 24C58 14 50 10 42 10C48 16 52 22 54 30Z', '#e7e0cf', 3.5) +
    P('M58 32C50 30 46 26 44 20C50 22 56 24 62 26Z', GARG, 3.5) +
    cel(
      'gargoyle_head',
      'M56 42C54 28 62 20 74 20C86 20 94 28 94 38C100 40 102 48 98 52C94 58 84 60 74 60C62 60 56 52 56 42Z',
      GARG,
      GARG_D,
      { dx: -3, dy: -4, inner: hl(64, 28, 5, 3, -35, 0.55) },
    ) +
    L('M68 33L78 36M94 32L86 35', 3) +
    ell(75, 40, 5.4, 4.6, '#ff8a1f', 2.5) +
    ell(89, 40, 4.4, 4, '#ff8a1f', 2.5) +
    ell(75.5, 40, 2.4, 2, '#fff2a0', 0) +
    ell(89.5, 40, 2, 1.8, '#fff2a0', 0) +
    L('M80 52Q88 55 96 50', 2.5) +
    F('M84 52.6L85.5 56L87.5 53.4Z', WHITE) +
    F('M91 52.4L92.4 55.6L94 52Z', WHITE)
  );
}

// ---------------------------------------------------------------------------
// Bosses
// ---------------------------------------------------------------------------

function bossSlime(): string {
  const d = 'M16 226C6 160 50 74 150 70C252 74 294 160 284 226C224 236 76 236 16 226Z';
  return (
    cel('bossSlime_b', d, SLIME, SLIME_D, {
      dx: -10,
      dy: -10,
      w: 6,
      inner:
        hl(66, 130, 22, 11, -45, 0.7) +
        `<circle cx="44" cy="166" r="7" fill="${WHITE}" opacity="0.7"/>` +
        `<circle cx="96" cy="196" r="9" fill="#ffa6d4" opacity="0.8"/>` +
        `<circle cx="120" cy="214" r="5" fill="#ffa6d4" opacity="0.8"/>` +
        `<circle cx="252" cy="196" r="6" fill="#ffa6d4" opacity="0.7"/>`,
    }) +
    // crown
    cel('bossSlime_c', 'M94 98L88 38L116 62L134 22L150 56L166 22L184 62L212 38L206 98C176 106 124 106 94 98Z', GOLD, GOLD_D, {
      dx: -5,
      dy: -5,
      w: 5,
      inner: hl(110, 62, 8, 4, -55, 0.6),
    }) +
    L('M92 80C124 88 176 88 208 80', 5) +
    ell(88, 38, 7, 7, WHITE, 4) +
    ell(134, 22, 7, 7, WHITE, 4) +
    ell(166, 22, 7, 7, WHITE, 4) +
    ell(212, 38, 7, 7, WHITE, 4) +
    ell(150, 90, 9, 8, '#e8344a', 4) +
    ell(118, 90, 6, 5.5, '#3fa9ff', 3.5) +
    ell(182, 90, 6, 5.5, '#4fd66a', 3.5) +
    // face
    eye(170, 140, 17, 23, 5) +
    eye(224, 140, 15, 21, 5) +
    L('M150 106L180 112M242 108L218 112', 5) +
    P('M172 176C182 204 222 206 236 174C216 182 192 182 172 176Z', '#8a1f4a', 5) +
    F('M190 190C198 186 214 186 222 192C214 200 198 200 190 190Z', '#ff8fb0') +
    blush(144, 172, 13, 7) +
    blush(258, 168, 9, 6)
  );
}

const ROBE = '#4b2a80';
const ROBE_D = '#33195e';
const ORB_GREEN = '#7dff6a';

function bossLich(): string {
  return (
    `<defs><radialGradient id="bossLich_g1" cx="0.4" cy="0.38" r="0.62">` +
    `<stop offset="0" stop-color="#ffffff"/><stop offset="0.35" stop-color="#b8ff9e"/>` +
    `<stop offset="0.75" stop-color="#3fd64a"/><stop offset="1" stop-color="#1f8a3a"/></radialGradient></defs>` +
    // staff
    tube('M206 74L206 300', '#6b4a2f', 9, 5) +
    L('M200 96L212 104M200 140L212 148M200 186L212 194', 3, '#8a6440') +
    `<circle cx="206" cy="48" r="38" fill="${ORB_GREEN}" opacity="0.22"/>` +
    `<circle cx="206" cy="48" r="30" fill="none" stroke="${ORB_GREEN}" stroke-width="4" opacity="0.55"/>` +
    // back sleeve & hand
    tube('M30 206L22 222M38 210L34 228M46 210L48 226', BONE, 4, 4) +
    cel('bossLich_s1', 'M82 126C60 138 40 168 24 202C34 212 50 214 58 208C62 188 74 168 94 150Z', ROBE, ROBE_D, {
      dx: -4,
      dy: -4,
      w: 5,
    }) +
    L('M27 203C36 210 49 211 56 206', 4, GOLD) +
    // robe
    cel(
      'bossLich_r',
      'M76 118C100 104 150 104 176 118C192 170 208 230 224 292L204 284L190 300L172 286L156 302L138 288L122 302L104 286L88 300L72 284L52 294L36 288C48 230 62 170 76 118Z',
      ROBE,
      ROBE_D,
      { dx: -10, dy: -6, w: 6, inner: hl(92, 150, 8, 26, 12, 0.25) },
    ) +
    L('M58 282L76 276L92 290L106 278L122 292L140 278L156 292L174 276L190 290L206 276L222 284', 5, GOLD) +
    L('M150 116C156 170 160 230 160 290', 6, GOLD) +
    // amulet
    L('M110 120C122 138 146 140 158 122', 4, GOLD) +
    P('M134 134L144 146L134 160L124 146Z', GOLD, 4) +
    ell(134, 147, 4.5, 6, ORB_GREEN, 0) +
    // hood
    cel(
      'bossLich_h',
      'M62 120C54 92 58 52 80 30C94 16 112 8 126 6C120 16 120 24 126 30C156 28 186 48 192 84C196 106 190 124 178 134C150 144 92 142 62 120Z',
      ROBE,
      ROBE_D,
      { dx: -8, dy: -6, w: 6, inner: hl(88, 46, 14, 6, -50, 0.3) },
    ) +
    P('M96 120C88 98 96 58 132 52C166 50 184 76 182 100C180 116 172 126 160 130C140 136 112 134 96 120Z', '#1d1030', 5) +
    // skull
    cel(
      'bossLich_k',
      'M108 98C108 76 124 64 144 64C164 64 178 78 178 98C178 110 172 118 164 122L164 130L120 130L120 120C112 116 108 108 108 98Z',
      BONE,
      BONE_D,
      { dx: -5, dy: -5, w: 5 },
    ) +
    ell(138, 96, 10, 11, '#1d1030', 0) +
    ell(164, 96, 8, 10, '#1d1030', 0) +
    ell(138, 96, 6, 6.5, ORB_GREEN, 0) +
    ell(164, 96, 5, 6, ORB_GREEN, 0) +
    ell(136, 94, 2.4, 2.4, WHITE, 0) +
    ell(162, 94, 2, 2, WHITE, 0) +
    P('M150 108L155 116L145 116Z', '#1d1030', 3) +
    L('M126 122L162 122M134 117L134 130M143 117L143 130M152 117L152 130', 3.5) +
    // front sleeve reaching the staff
    cel('bossLich_s2', 'M150 146C168 150 186 158 200 166L196 188C178 184 160 178 146 172Z', ROBE, ROBE_D, {
      dx: -4,
      dy: -4,
      w: 5,
    }) +
    L('M196 166L200 188', 4, GOLD) +
    tube('M197 169L214 169M197 177L215 177M198 185L213 185', BONE, 5, 3.5) +
    // staff head + orb
    P('M188 64C186 80 196 88 206 88C216 88 226 80 224 64L218 72L212 66L206 74L200 66L194 72Z', '#6b4a2f', 5) +
    `<circle cx="206" cy="48" r="20" fill="url(#bossLich_g1)" ${st(5)}/>` +
    hl(200, 41, 5, 3, -35, 0.85)
  );
}

const DEMON = '#d8343a';
const DEMON_D = '#a3202e';
const DEMON_W = '#7a1f34';
const DEMON_W_D = '#55132a';
const HORN = '#f3e2c0';
const HORN_D = '#c9ad82';

function bossDemon(): string {
  const wing =
    'M120 124C96 84 60 46 12 26C24 52 26 76 20 100C34 94 46 100 50 114C60 104 74 108 78 122C88 114 102 120 104 134Z';
  const ribs = 'M118 124L16 30M112 128L22 98M108 132L52 112';
  const horn = 'M128 72C112 62 100 42 104 12C88 30 86 56 98 78C106 90 120 92 128 86Z';
  return (
    // wings
    cel('bossDemon_w1', wing, DEMON_W, DEMON_W_D, { dx: 6, dy: -6, w: 6 }) +
    L(ribs, 4, DEMON_W_D) +
    cel('bossDemon_w2', mirrorX(wing, 330), DEMON_W, DEMON_W_D, { dx: -6, dy: -6, w: 6 }) +
    L(mirrorX(ribs, 330), 4, DEMON_W_D) +
    // tail
    tube('M120 262C80 280 50 270 42 240', DEMON, 8, 5) +
    P('M42 240L28 226L44 210L54 230Z', DEMON, 5) +
    // legs
    P('M118 250L152 250L150 300L114 300Z', DEMON, 6) +
    F('M142 252L150 252L148 298L140 298Z', DEMON_D) +
    P('M178 250L212 250L216 300L180 300Z', DEMON, 6) +
    F('M202 252L210 252L214 298L206 298Z', DEMON_D) +
    P('M108 296L152 296C164 296 166 318 152 318L108 318C98 318 98 296 108 296Z', '#3a2236', 5) +
    P('M176 296L224 296C238 296 238 318 224 318L176 318C166 318 166 296 176 296Z', '#3a2236', 5) +
    // torso
    cel(
      'bossDemon_t',
      'M100 150C100 128 130 118 166 118C204 118 232 128 232 150C232 196 222 236 212 262L118 262C108 236 100 196 100 150Z',
      DEMON,
      DEMON_D,
      { dx: -10, dy: -8, w: 6, inner: hl(124, 160, 10, 22, 10, 0.35) },
    ) +
    L('M166 168L166 210M140 176C150 184 160 184 166 178M192 176C182 184 172 184 166 178', 4, DEMON_D) +
    // belt + loincloth
    P('M140 254L192 254L184 296L148 296Z', '#3a2236', 5) +
    P('M110 236L222 236L218 262L114 262Z', GOLD, 5) +
    F('M113 254L219 254L218 260L114 260Z', GOLD_D) +
    P('M154 232L178 232L178 266L154 266Z', GOLD, 5) +
    ell(166, 249, 7, 8, '#e8344a', 4) +
    // arms
    tube('M108 152C88 176 80 204 86 228', DEMON, 24, 5) +
    tube('M224 152C248 172 262 196 262 222', DEMON, 24, 5) +
    P('M72 222L100 222L100 236L72 236Z', GOLD, 5) +
    P('M248 216L276 216L276 230L248 230Z', GOLD, 5) +
    P('M74 236C70 252 78 262 88 262C100 262 104 250 98 236Z', DEMON, 5) +
    P('M250 230C246 246 254 256 264 256C276 256 280 244 274 230Z', DEMON, 5) +
    L('M78 262L76 270M88 264L88 272M98 260L102 268M254 256L252 264M264 258L264 266M274 254L278 262', 5, HORN) +
    // pauldrons
    cel('bossDemon_p1', 'M78 160C76 130 96 116 120 120C136 124 140 140 134 154C118 152 96 156 78 160Z', GOLD, GOLD_D, {
      dx: -4,
      dy: -5,
      w: 5,
    }) +
    cel('bossDemon_p2', 'M252 160C254 130 234 116 210 120C194 124 190 140 196 154C212 152 234 156 252 160Z', GOLD, GOLD_D, {
      dx: -4,
      dy: -5,
      w: 5,
    }) +
    P('M90 130L80 110L102 122Z', HORN, 4) +
    P('M240 130L250 110L228 122Z', HORN, 4) +
    // horns
    cel('bossDemon_h1', horn, HORN, HORN_D, { dx: 4, dy: -4, w: 5 }) +
    cel('bossDemon_h2', mirrorX(horn, 344), HORN, HORN_D, { dx: -4, dy: -4, w: 5 }) +
    L('M100 50L112 54M98 66L112 68', 3.5, HORN_D) +
    L(mirrorX('M100 50L112 54M98 66L112 68', 344), 3.5, HORN_D) +
    // ears
    P('M118 98L92 86L116 116Z', DEMON, 5) +
    P('M226 96L254 82L230 114Z', DEMON, 5) +
    // head
    cel('bossDemon_hd', 'M114 96C114 64 140 50 172 50C204 50 230 64 230 96C230 128 206 146 172 146C138 146 114 128 114 96Z', DEMON, DEMON_D, {
      dx: -6,
      dy: -6,
      w: 6,
      inner: hl(138, 70, 12, 6, -35, 0.45),
    }) +
    // face (shifted toward the right so he faces right)
    `<g transform="translate(7 0)">` +
    P('M146 86C154 78 170 80 174 92C168 103 150 102 146 86Z', '#ffd23f', 4) +
    P('M190 92C194 80 210 78 216 86C213 103 194 103 190 92Z', '#ffd23f', 4) +
    F('M160 86C166 86 170 90 169 96C164 100 159 97 160 86Z', '#ff6a1a') +
    F('M204 85C210 85 213 90 211 96C206 100 201 96 204 85Z', '#ff6a1a') +
    ell(164, 89, 2.8, 2.8, WHITE, 0) +
    ell(207, 88, 2.6, 2.6, WHITE, 0) +
    L('M138 74L172 84M224 72L192 84', 6) +
    L('M178 104L184 108L190 104', 4) +
    P('M150 114C162 136 204 138 216 112C196 121 170 121 150 114Z', '#3a1028', 5) +
    F('M160 118L166 129L172 120Z', WHITE) +
    F('M196 120L202 129L207 118Z', WHITE) +
    `</g>`
  );
}

// ---------------------------------------------------------------------------
// Enemy projectiles
// ---------------------------------------------------------------------------

function fireball(): string {
  return (
    P('M36 20C36 28 30 34 22 34C16 34 11 32 6 28C10 27 12 25 10 23C6 21 4 19 4 15C8 17 11 15 13 13C15 8 19 6 23 6C30 6 36 12 36 20Z', '#ff7a1f', 3) +
    F('M33 20C33 26 28 30 23 30C18 30 15 27 13 24C16 23 16 21 15 19C18 18 18 15 20 13C22 11 24 10 26 10C30 11 33 15 33 20Z', '#ffd23f') +
    `<circle cx="25" cy="18" r="4" fill="${WHITE}" opacity="0.9"/>`
  );
}

function orb(): string {
  return (
    `<defs><radialGradient id="orb_g1" cx="0.4" cy="0.38" r="0.65">` +
    `<stop offset="0" stop-color="#ffffff"/><stop offset="0.3" stop-color="#d6a8ff"/>` +
    `<stop offset="0.7" stop-color="#9b4dff"/><stop offset="1" stop-color="#5a1fb0"/></radialGradient>` +
    `<radialGradient id="orb_g2" cx="0.5" cy="0.5" r="0.5">` +
    `<stop offset="0.55" stop-color="#7dff6a" stop-opacity="0"/><stop offset="0.75" stop-color="#7dff6a" stop-opacity="0.75"/>` +
    `<stop offset="1" stop-color="#7dff6a" stop-opacity="0"/></radialGradient></defs>` +
    `<circle cx="22" cy="22" r="19" fill="url(#orb_g2)"/>` +
    `<circle cx="22" cy="22" r="15" fill="none" stroke="#7dff6a" stroke-width="2.5"/>` +
    `<circle cx="22" cy="22" r="10" fill="url(#orb_g1)" ${st(3)}/>`
  );
}

// ---------------------------------------------------------------------------
// Export
// ---------------------------------------------------------------------------

export const CHARACTERS_ART: ArtSet = {
  hero_0: art(100, 116, hero([43, 0, 61, 5])),
  hero_1: art(100, 116, hero([45, 5, 59, 0])),

  slime_0: art(84, 68, slime(false, 'slime0_b')),
  slime_1: art(84, 68, slime(true, 'slime1_b')),
  bat_0: art(92, 68, bat(true)),
  bat_1: art(92, 68, bat(false)),
  mushroom_0: art(84, 96, mushroom(0, 5)),
  mushroom_1: art(84, 96, mushroom(5, 0)),

  skeleton_0: art(84, 110, skeleton(39, 0, 52, 4)),
  skeleton_1: art(84, 110, skeleton(41, 4, 50, 0)),
  ghost_0: art(88, 100, ghost(0)),
  ghost_1: art(88, 100, ghost(1)),
  zombie_0: art(92, 114, zombie(36, 0, 56, 5)),
  zombie_1: art(92, 114, zombie(38, 5, 54, 0)),

  imp_0: art(84, 92, imp(true, 0, 3)),
  imp_1: art(84, 92, imp(false, 3, 0)),
  knight_0: art(104, 124, knight(42, 0, 62, 5)),
  knight_1: art(104, 124, knight(44, 5, 60, 0)),
  gargoyle_0: art(108, 100, gargoyle(true)),
  gargoyle_1: art(108, 100, gargoyle(false)),

  boss_slime: art(300, 240, bossSlime()),
  boss_lich: art(250, 310, bossLich()),
  boss_demon: art(330, 330, bossDemon()),

  fireball: art(40, 40, fireball()),
  orb: art(44, 44, orb()),
};
