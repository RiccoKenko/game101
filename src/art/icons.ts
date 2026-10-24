import { svg, type ArtSet } from './types';

/*
 * UI / item icons. All 96x96, transparent, centred, drawn to stay readable at ~40 CSS px.
 * Technique: every solid shape is drawn as
 *   1. an "under" outline (shape filled + stroked with #2a1f3d at 2x the visible width),
 *   2. its shade colour,
 *   3. its base colour shifted up-left and clipped to the shape -> cel-shade band on the lower-right,
 *   4. optional white highlight on the upper-left.
 * Drawing the outline underneath lets overlapping parts of one object merge cleanly.
 * Evolved weapons carry a small four-point sparkle; nothing else uses it.
 */

const O = '#2a1f3d';
const SW = 4.5;
const S = 96;

type Pt = [number, number];
type Off = [number, number];

const f = (n: number): number => Math.round(n * 10) / 10;
const rad = (deg: number): number => (deg * Math.PI) / 180;
const pt = (cx: number, cy: number, r: number, deg: number): Pt => [
  f(cx + r * Math.cos(rad(deg))),
  f(cy + r * Math.sin(rad(deg))),
];

// ---------- path builders (clockwise, so compound paths union under nonzero) ----------
const circ = (cx: number, cy: number, r: number): string =>
  `M${f(cx - r)} ${f(cy)}A${r} ${r} 0 1 1 ${f(cx + r)} ${f(cy)}A${r} ${r} 0 1 1 ${f(cx - r)} ${f(cy)}Z`;
const ell = (cx: number, cy: number, rx: number, ry: number, rot = 0): string => {
  const [x1, y1] = pt(cx, cy, rx, rot + 180);
  const [x2, y2] = pt(cx, cy, rx, rot);
  return `M${x1} ${y1}A${rx} ${ry} ${rot} 1 1 ${x2} ${y2}A${rx} ${ry} ${rot} 1 1 ${x1} ${y1}Z`;
};
const rr = (x: number, y: number, w: number, h: number, r: number): string =>
  `M${f(x + r)} ${f(y)}H${f(x + w - r)}A${r} ${r} 0 0 1 ${f(x + w)} ${f(y + r)}V${f(y + h - r)}` +
  `A${r} ${r} 0 0 1 ${f(x + w - r)} ${f(y + h)}H${f(x + r)}A${r} ${r} 0 0 1 ${f(x)} ${f(y + h - r)}` +
  `V${f(y + r)}A${r} ${r} 0 0 1 ${f(x + r)} ${f(y)}Z`;
const poly = (pts: Pt[]): string => 'M' + pts.map(([x, y]) => `${f(x)} ${f(y)}`).join('L') + 'Z';
const star = (cx: number, cy: number, R: number, r: number, n = 5, rot = -90): string => {
  const pts: Pt[] = [];
  for (let i = 0; i < n * 2; i++) pts.push(pt(cx, cy, i % 2 ? r : R, rot + (i * 180) / n));
  return poly(pts);
};
/** Open path along a circle from a0 to a1 (degrees; clockwise on screen when a1 > a0). */
const arc = (cx: number, cy: number, r: number, a0: number, a1: number): string => {
  const [x0, y0] = pt(cx, cy, r, a0);
  const [x1, y1] = pt(cx, cy, r, a1);
  const large = Math.abs(a1 - a0) > 180 ? 1 : 0;
  const sweep = a1 > a0 ? 1 : 0;
  return `M${x0} ${y0}A${r} ${r} 0 ${large} ${sweep} ${x1} ${y1}`;
};

/** Local shift (inside a group rotated by `deg`) that moves the base colour up-left by `k` in world space. */
const lo = (deg: number, k: number): Off => {
  const c = Math.cos(rad(deg));
  const s = Math.sin(rad(deg));
  return [f(-k * (c + s)), f(-k * (c - s))];
};

// ---------- painters ----------
const ruleAttr = (rule?: string): string => (rule ? ` fill-rule="${rule}"` : '');

/** Dark outline drawn underneath a shape (visible width = sw). */
const under = (d: string, sw = SW, rule?: string): string =>
  `<path d="${d}" fill="${O}" stroke="${O}" stroke-width="${f(sw * 2)}" stroke-linejoin="round"${ruleAttr(rule)}/>`;

/** Base + cel shade (lower-right band) for a shape. */
const paint = (id: string, d: string, base: string, shade?: string, off: Off = [-5, -5], rule?: string): string => {
  if (!shade || shade === base) return `<path d="${d}" fill="${base}"${ruleAttr(rule)}/>`;
  const cr = rule ? ` clip-rule="${rule}"` : '';
  return (
    `<clipPath id="${id}"><path d="${d}"${cr}/></clipPath>` +
    `<path d="${d}" fill="${shade}"${ruleAttr(rule)}/>` +
    `<g clip-path="url(#${id})"><path d="${d}" fill="${base}"${ruleAttr(rule)} transform="translate(${off[0]} ${off[1]})"/></g>`
  );
};

const cel = (id: string, d: string, base: string, shade?: string, off: Off = [-5, -5], sw = SW, rule?: string): string =>
  under(d, sw, rule) + paint(id, d, base, shade, off, rule);

/** A thick outlined stroke (limbs, handles, shafts...). */
const tube = (d: string, w: number, color: string, sw = SW, cap = 'round'): string =>
  `<path d="${d}" fill="none" stroke="${O}" stroke-width="${f(w + sw * 2)}" stroke-linecap="${cap}" stroke-linejoin="round"/>` +
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="${cap}" stroke-linejoin="round"/>`;

/** Plain stroked line (details, highlights). */
const ln = (d: string, color: string, w: number, op = 1): string =>
  `<path d="${d}" fill="none" stroke="${color}" stroke-width="${w}" stroke-linecap="round" stroke-linejoin="round"${
    op < 1 ? ` opacity="${op}"` : ''
  }/>`;

/** White highlight blob. */
const hl = (d: string, op = 0.75): string => `<path d="${d}" fill="#fff" opacity="${op}"/>`;

const g = (transform: string, body: string): string => `<g transform="${transform}">${body}</g>`;

/** Four-point twinkle: marks evolved weapons. */
const sparkle = (x: number, y: number, r: number, color = '#fff6a8'): string => {
  const k = r * 0.22;
  return (
    `<path d="M${f(x)} ${f(y - r)}Q${f(x + k)} ${f(y - k)} ${f(x + r)} ${f(y)}Q${f(x + k)} ${f(y + k)} ${f(x)} ${f(y + r)}` +
    `Q${f(x - k)} ${f(y + k)} ${f(x - r)} ${f(y)}Q${f(x - k)} ${f(y - k)} ${f(x)} ${f(y - r)}Z" fill="${color}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`
  );
};

type Stop = [number, string, number];
const stops = (s: Stop[]): string => s.map(([o, c, a]) => `<stop offset="${o}" stop-color="${c}" stop-opacity="${a}"/>`).join('');
const radial = (id: string, s: Stop[]): string => `<defs><radialGradient id="${id}">${stops(s)}</radialGradient></defs>`;
const vertical = (id: string, s: Stop[]): string =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops(s)}</linearGradient></defs>`;

// ---------- palette ----------
const GOLD = '#ffcc33';
const GOLD_D = '#e39b1b';
const STEEL = '#eef3fa';
const STEEL_D = '#a9b6cc';
const WHITE_D = '#cdd6ea';
const BLUE = '#3d7bff';
const BLUE_D = '#2850c8';
const XP = '#3fa9ff';
const XP_D = '#2a7fd6';
const RED = '#ff4d5e';
const RED_D = '#cc2a45';
const WOOD = '#d98b4a';
const WOOD_D = '#a8602c';
const CYAN = '#6ff3ff';
const CYAN_D = '#25bfdc';

// ---------- shared pieces ----------
function coin(id: string, cx: number, cy: number, r: number, sw = SW): string {
  const k = r / 38;
  return (
    cel(`${id}_c`, circ(cx, cy, r), GOLD, GOLD_D, [-6 * k, -6 * k], sw) +
    `<circle cx="${cx}" cy="${cy}" r="${f(r * 0.72)}" fill="none" stroke="${GOLD_D}" stroke-width="${f(3.5 * k)}"/>` +
    `<path d="${star(cx + 1.5 * k, cy + 2 * k, r * 0.44, r * 0.22)}" fill="${GOLD_D}" stroke="${GOLD_D}" stroke-width="${f(3 * k)}" stroke-linejoin="round"/>` +
    `<path d="${star(cx, cy, r * 0.44, r * 0.22)}" fill="#fff1a8" stroke="#fff1a8" stroke-width="${f(3 * k)}" stroke-linejoin="round"/>` +
    ln(arc(cx, cy, r * 0.86, 195, 245), '#fff', f(4 * k), 0.8)
  );
}

interface BowStyle {
  id: string;
  wood: string;
  woodD: string;
  grip: string;
  gripD: string;
  cap: string;
  capD: string;
  head: string;
  headD: string;
  fletch: string;
  fletchD: string;
  shaft: string;
  str: string;
}

/** Bow in local coords: arrow points +x. Wrapped in a rotate(-45) group so it aims up-right. */
function bowBody(s: BowStyle): string {
  const off = lo(-45, 4);
  const limb = 'M-8 -38C8 -36 22 -20 22 0C22 20 8 36 -8 38';
  const limbIn = 'M-8.3 -35.5C7.7 -33.6 19.5 -19.5 19.5 0C19.5 19.5 7.7 33.6 -8.3 35.5';
  return (
    ln('M-8 -38L-24 0L-8 38', O, 6) +
    ln('M-8 -38L-24 0L-8 38', s.str, 2.2) +
    tube(limb, 9, s.wood) +
    ln(limbIn, s.woodD, 3.4) +
    ln('M2 -34C12 -29 21 -19 24 -7', '#fff', 2.2, 0.65) +
    cel(`${s.id}_c1`, circ(-8, -38, 5), s.cap, s.capD, off, 3) +
    cel(`${s.id}_c2`, circ(-8, 38, 5), s.cap, s.capD, off, 3) +
    cel(`${s.id}_v1`, 'M-8 -2L-16 -11L-29 -11L-24 -2Z', s.fletch, s.fletchD, off, 3) +
    cel(`${s.id}_v2`, 'M-8 2L-24 2L-29 11L-16 11Z', s.fletch, s.fletchD, off, 3) +
    tube('M-25 0L30 0', 3.6, s.shaft, 3) +
    cel(`${s.id}_gr`, rr(15.5, -9, 13, 18, 3), s.grip, s.gripD, off, 3.5) +
    tube('M14 0L30 0', 3.6, s.shaft, 3, 'butt') +
    cel(`${s.id}_hd`, 'M27 -8L46 0L27 8Q30.5 0 27 -8Z', s.head, s.headD, off, 3.5)
  );
}

/** Dagger in local coords, tip up at y=-44, pommel at y=+24. */
function dagger(id: string, rot: number): string {
  const off = lo(rot, 3.5);
  return (
    cel(`${id}_b`, 'M0 -44C6.5 -35 8 -20 7 -6L-7 -6C-8 -20 -6.5 -35 0 -44Z', STEEL, STEEL_D, off, 4) +
    ln('M0 -35L0 -12', '#58b8ff', 3) +
    ln('M0 -35L0 -12', '#c8f0ff', 1.2) +
    ln('M-3.5 -32C-4.5 -24 -4.5 -16 -4 -10', '#fff', 2, 0.85) +
    cel(`${id}_h`, rr(-4.5, -3, 9, 18, 3), BLUE, BLUE_D, off, 3.5) +
    cel(`${id}_g`, rr(-13, -10, 26, 8, 4), BLUE, BLUE_D, off, 4) +
    cel(`${id}_p`, circ(0, 19, 5.5), GOLD, GOLD_D, off, 3.5)
  );
}

interface AxeStyle {
  id: string;
  steel: string;
  steelD: string;
  edge: string;
  hub: string;
  hubD: string;
  handle: string;
  handleD: string;
}

/** Double-headed axe in local coords, head up (y < 0), handle down. */
function axeBody(s: AxeStyle, rot: number): string {
  const off = lo(rot, 4);
  const right = 'M5 -33C12 -33 18 -37 23 -43C34 -31 34 -15 23 -3C18 -9 12 -13 5 -13Z';
  const left = 'M-5 -33L-5 -13C-12 -13 -18 -9 -23 -3C-34 -15 -34 -31 -23 -43C-18 -37 -12 -33 -5 -33Z';
  return (
    tube('M0 -20L0 34', 8, s.handle) +
    ln('M2.2 -14L2.2 32', s.handleD, 3) +
    cel(`${s.id}_e`, rr(-6.5, 32, 13, 9, 3.5), s.hub, s.hubD, off, 3.5) +
    cel(`${s.id}_r`, right, s.steel, s.steelD, off) +
    cel(`${s.id}_l`, left, s.steel, s.steelD, off) +
    ln('M25.5 -37C31 -29 31 -17 25.5 -9', s.edge, 3, 0.9) +
    ln('M-25.5 -37C-31 -29 -31 -17 -25.5 -9', s.edge, 3, 0.9) +
    cel(`${s.id}_h`, rr(-7, -37, 14, 28, 4), s.hub, s.hubD, off, 4)
  );
}

/** Tilted halo ring (seen from slightly above). */
function halo(id: string, cx: number, cy: number, base: string, shade: string): string {
  const d = ell(cx, cy, 38, 15) + ell(cx, cy, 25, 7.5);
  return (
    cel(id, d, base, shade, [-2, -4], SW, 'evenodd') +
    ln(`M${cx - 33} ${cy - 2}Q${cx - 28} ${cy - 10} ${cx - 12} ${cy - 12.5}`, '#fff', 3, 0.85) +
    ln(`M${cx + 14} ${cy + 11}Q${cx + 22} ${cy + 10} ${cx + 27} ${cy + 7}`, '#fff', 2.4, 0.45)
  );
}

/** Soft column of light rising from a halo. */
function lightColumn(id: string, cx: number, cy: number, color: string): string {
  return (
    vertical(id, [
      [0, color, 0],
      [1, color, 0.85],
    ]) +
    `<path d="M${cx - 30} ${cy}L${cx - 40} 4L${cx + 40} 4L${cx + 30} ${cy}Z" fill="url(#${id})"/>` +
    `<path d="M${cx - 14} ${cy}L${cx - 18} 4L${cx + 18} 4L${cx + 14} ${cy}Z" fill="url(#${id})"/>`
  );
}

function notes(id: string, color: string, shade: string): string {
  const d =
    ell(29, 71, 12, 9, -20) +
    ell(67, 63, 12, 9, -20) +
    'M36 72L36 24L41.5 24L41.5 72Z' +
    'M74 64L74 15L79.5 15L79.5 64Z' +
    'M36 17L79.5 8L79.5 21L36 30Z';
  return cel(id, d, color, shade, [-4, -4]) + hl(ell(24, 67, 4, 2.6, -20), 0.8) + ln('M40 21L76 13.5', '#fff', 2.5, 0.7);
}

function speaker(id: string): string {
  const d = 'M14 34L27 34L44 18Q50 14 50 21L50 75Q50 82 44 78L27 62L14 62Q10 62 10 58L10 38Q10 34 14 34Z';
  return cel(id, d, '#ffffff', WHITE_D, [-4, -4]);
}

/** Small filled lightning bolt (local size ~ 16x26), centred at x,y. */
const zap = (x: number, y: number, s: number, rot: number): string =>
  g(
    `translate(${x} ${y}) rotate(${rot}) scale(${s})`,
    under('M3 -13L-7 2L-1 2L-4 13L8 -3L2 -3L6 -13Z', 3) +
      `<path d="M3 -13L-7 2L-1 2L-4 13L8 -3L2 -3L6 -13Z" fill="${CYAN}"/>` +
      ln('M3.5 -10L-3 0', '#fff', 1.8, 0.9),
  );

// ---------- styles ----------
const bowStd: BowStyle = {
  id: 'icon_bow',
  wood: WOOD,
  woodD: WOOD_D,
  grip: BLUE,
  gripD: BLUE_D,
  cap: GOLD,
  capD: GOLD_D,
  head: STEEL,
  headD: STEEL_D,
  fletch: XP,
  fletchD: XP_D,
  shaft: '#f3cf8e',
  str: '#fff6e0',
};

const bowStorm: BowStyle = {
  id: 'icon_stormbow',
  wood: '#5a5ff0',
  woodD: '#3a37b8',
  grip: GOLD,
  gripD: GOLD_D,
  cap: CYAN,
  capD: CYAN_D,
  head: '#c8fbff',
  headD: '#45d2ec',
  fletch: CYAN,
  fletchD: CYAN_D,
  shaft: '#fff1c4',
  str: '#d8fcff',
};

// ---------- icons ----------
export const ICONS_ART: ArtSet = {
  // ======================= weapons =======================
  icon_bow: svg(S, S, g('translate(48 49) rotate(-45) scale(1.02)', bowBody(bowStd))),

  icon_daggers: svg(
    S,
    S,
    g('translate(48 44) rotate(-40) translate(0 16)', dagger('icon_daggers_a', -40)) +
      g('translate(48 44) rotate(40) translate(0 16)', dagger('icon_daggers_b', 40)),
  ),

  icon_axes: svg(
    S,
    S,
    tube(arc(48, 48, 38, 195, 252), 5, '#ffffff', 3.2) +
      tube(arc(48, 48, 38, 15, 72), 5, '#ffffff', 3.2) +
      g(
        'translate(48 49) rotate(32) scale(0.72)',
        axeBody(
          {
            id: 'icon_axes',
            steel: '#e4eaf3',
            steelD: '#97a5bb',
            edge: '#ffffff',
            hub: '#8a93ad',
            hubD: '#5d6684',
            handle: WOOD,
            handleD: WOOD_D,
          },
          32,
        ),
      ) +
      ln(arc(48, 48, 30.5, 200, 228), O, 3) +
      ln(arc(48, 48, 30.5, 20, 48), O, 3),
  ),

  icon_aura: svg(
    S,
    S,
    radial('icon_aura_g', [
      [0, '#fff7b8', 0.95],
      [0.6, '#ffe066', 0.45],
      [1, '#ffd23f', 0],
    ]) +
      `<ellipse cx="48" cy="58" rx="46" ry="34" fill="url(#icon_aura_g)"/>` +
      lightColumn('icon_aura_l', 48, 58, '#fff1a0') +
      halo('icon_aura_r', 48, 60, GOLD, GOLD_D) +
      `<path d="${circ(22, 30, 2.6)}${circ(72, 22, 3)}${circ(60, 38, 2.2)}${circ(34, 16, 2.2)}" fill="#fff6c0" stroke="${O}" stroke-width="2"/>`,
  ),

  icon_lightning: svg(
    S,
    S,
    cel('icon_lightning_b', 'M54 6L20 54L44 54L33 90L79 37L55 37L74 6Z', '#ffe23b', '#f5a623', [-5, -5]) +
      ln('M54 13L30 47', '#fff', 3.5, 0.75) +
      ln('M50 60L41 80', '#fff', 2.5, 0.5),
  ),

  icon_bomb: svg(
    S,
    S,
    g('rotate(40 62 36)', cel('icon_bomb_cap', rr(52, 29, 20, 15, 4), '#9aa5c6', '#66708f', [-3, -4], 4)) +
      cel('icon_bomb_b', circ(42, 58, 30), '#4357a6', '#2b376e', [-6, -6]) +
      hl(ell(30, 45, 6, 10, 40), 0.8) +
      hl(circ(23, 59, 3), 0.6) +
      tube('M64 31Q70 18 80 17', 4.2, '#e8c58a', 3) +
      `<path d="${star(80, 16, 11, 5, 8, -90)}" fill="#ff8a2b" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="${star(80, 16, 6, 3, 8, -67.5)}" fill="#fff3a0"/>`,
  ),

  icon_boomerang: svg(
    S,
    S,
    g(
      'translate(48 52) rotate(-12) scale(0.92)',
      (() => {
        const d = 'M-38 18Q-24 -14 -4 -28Q0 -31 4 -28Q24 -14 38 18Q41 26 33 27Q30 27 28 23Q16 2 0 -8Q-16 2 -28 23Q-30 27 -33 27Q-41 26 -38 18Z';
        const off = lo(-12, 5);
        const band = (x: number, y: number, a: number): string =>
          `<rect x="-20" y="-3.2" width="40" height="6.4" fill="#fff" transform="translate(${x} ${y}) rotate(${a})"/>`;
        return (
          under(d) +
          paint('icon_boomerang_c', d, '#ff8a2b', '#d9452b', off) +
          `<g clip-path="url(#icon_boomerang_c)">${band(19, 4, -38)}${band(26.5, 14, -38)}${band(-19, 4, 38)}${band(-26.5, 14, 38)}</g>` +
          ln('M-31 8Q-20 -12 -5 -22', '#fff', 3, 0.7)
        );
      })(),
    ),
  ),

  // ======================= evolved weapons =======================
  icon_stormbow: svg(
    S,
    S,
    radial('icon_stormbow_g', [
      [0, '#bdfaff', 0.9],
      [1, CYAN, 0],
    ]) +
      `<circle cx="48" cy="48" r="46" fill="url(#icon_stormbow_g)"/>` +
      g('translate(48 49) rotate(-45) scale(1.02)', bowBody(bowStorm)) +
      zap(22, 13, 0.85, 15) +
      zap(85, 64, 0.85, 25) +
      zap(52, 44, 0.6, 20) +
      sparkle(15, 81, 8),
  ),

  icon_blades: svg(
    S,
    S,
    (() => {
      const angs = [-50, 50, -25, 25, 0];
      let out = '';
      angs.forEach((a, i) => {
        const off = lo(a, 3);
        out += g(
          `translate(48 66) rotate(${a})`,
          cel(`icon_blades_${i}`, 'M0 -50C5.5 -42 7 -28 6 -12L-6 -12C-7 -28 -5.5 -42 0 -50Z', '#ffdc4a', '#e3971b', off, 3.8) +
            ln('M0 -43L0 -18', '#fff5c0', 2.2, 0.9) +
            cel(`icon_blades_g${i}`, rr(-10, -17, 20, 7, 3.5), '#e0379f', '#9c1f70', off, 3.2),
        );
      });
      return (
        out +
        cel('icon_blades_ring', circ(48, 70, 16), GOLD, GOLD_D, [-3, -3]) +
        cel('icon_blades_gem', circ(48, 70, 10.5), '#ff4fc3', '#b8197f', [-3, -3], 3) +
        `<path d="${star(48, 70, 7, 4, 4, -90)}" fill="#ff9be0"/>` +
        hl(circ(44.5, 66.5, 2.6), 0.95) +
        sparkle(84, 13, 7.5)
      );
    })(),
  ),

  icon_titanaxes: svg(
    S,
    S,
    radial('icon_titanaxes_g', [
      [0, '#ffb347', 0.85],
      [1, '#ff7a1a', 0],
    ]) +
      `<circle cx="54" cy="36" r="38" fill="url(#icon_titanaxes_g)"/>` +
      g(
        'translate(47 51) rotate(30) scale(0.9)',
        axeBody(
          {
            id: 'icon_titanaxes',
            steel: '#7d87a6',
            steelD: '#525b7a',
            edge: '#ffd27a',
            hub: GOLD,
            hubD: GOLD_D,
            handle: '#8b5a34',
            handleD: '#5f3a1f',
          },
          30,
        ) +
          ln('M12 -31L17 -23L12 -16M17 -23L22 -23', '#ff9a2e', 3.4) +
          ln('M12 -31L17 -23L12 -16M17 -23L22 -23', '#fff2b0', 1.3) +
          ln('M-12 -31L-17 -23L-12 -16M-17 -23L-22 -23', '#ff9a2e', 3.4) +
          ln('M-12 -31L-17 -23L-12 -16M-17 -23L-22 -23', '#fff2b0', 1.3) +
          cel('icon_titanaxes_gem', 'M0 -30L4.5 -23L0 -16L-4.5 -23Z', '#ff7a1a', '#c94d0c', [-1.5, -2], 2.5) +
          ln('M0 4L0 12M0 18L0 26', '#ff9a2e', 2.8),
      ) +
      sparkle(84, 82, 8) +
      sparkle(13, 15, 5.5, '#ffffff'),
  ),

  icon_sanctuary: svg(
    S,
    S,
    radial('icon_sanctuary_g', [
      [0, '#ffffff', 1],
      [0.6, '#fff6c8', 0.6],
      [1, '#ffe680', 0],
    ]) +
      `<ellipse cx="48" cy="56" rx="47" ry="38" fill="url(#icon_sanctuary_g)"/>` +
      lightColumn('icon_sanctuary_l', 48, 60, '#ffffff') +
      halo('icon_sanctuary_r', 48, 64, GOLD, GOLD_D) +
      `<path d="${ell(48, 64, 31.5, 11.3)}" fill="none" stroke="#ffffff" stroke-width="4"/>` +
      `<path d="${star(10.5, 64, 3.5, 2, 4, -90)}${star(85.5, 64, 3.5, 2, 4, -90)}${star(48, 78.5, 3.5, 2, 4, -90)}" fill="#7ff0b0" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>` +
      cel('icon_sanctuary_x', 'M42 24H54V36H66V48H54V60H42V48H30V36H42Z', '#b4f5a8', '#58bf68', [-3, -3], 4) +
      hl('M44.5 27H48V38H44.5Z', 0.75) +
      sparkle(81, 18, 8) +
      sparkle(15, 22, 5.5, '#ffffff'),
  ),

  // ======================= passives =======================
  icon_heart: svg(
    S,
    S,
    cel(
      'icon_heart_b',
      'M48 84C40 78 10 60 10 36C10 20 22 12 32 12C40 12 46 18 48 24C50 18 56 12 64 12C74 12 86 20 86 36C86 60 56 78 48 84Z',
      RED,
      RED_D,
      [-6, -6],
    ) +
      hl(ell(26, 32, 5.5, 9, 35), 0.8) +
      hl(circ(35, 21, 3), 0.7),
  ),

  icon_boots: svg(
    S,
    S,
    ln('M6 62L18 62M10 72L22 72', O, 4.5) +
      cel(
        'icon_boots_b',
        'M34 20L60 20L60 50C76 50 88 56 88 68L88 74Q88 80 82 80L32 80Q26 80 26 74L30 24Q30 20 34 20Z',
        '#c6763e',
        '#94502a',
        [-5, -5],
      ) +
      cel('icon_boots_s', 'M27 70L88 70L88 74Q88 80 82 80L32 80Q26 80 26 74Z', '#6b3f24', '#4a2a17', [-2, -2], 3.5) +
      cel('icon_boots_cuff', rr(27, 16, 37, 12, 5), GOLD, GOLD_D, [-3, -3], 4) +
      hl('M36 32L40 32L39 58L35 58Z', 0.45) +
      cel(
        'icon_boots_w',
        'M32 44C24 44 18 42 12 36C16 36 18 35 19 34C12 32 8 26 6 18C11 21 16 22 19 22C14 18 12 14 12 8C20 12 28 18 34 30Z',
        '#ffffff',
        WHITE_D,
        [-3, -3],
        4,
      ) +
      ln('M18 22C23 26 27 30 30 34M19 34C24 36 28 38 31 40', WHITE_D, 2.4),
  ),

  icon_powergem: svg(
    S,
    S,
    (() => {
      const T1: Pt = [28, 16];
      const T2: Pt = [68, 16];
      const Tm: Pt = [48, 16];
      const G1: Pt = [8, 38];
      const G2: Pt = [88, 38];
      const M1: Pt = [30, 38];
      const M2: Pt = [66, 38];
      const B: Pt = [48, 86];
      const facet = (pts: Pt[], c: string): string => `<path d="${poly(pts)}" fill="${c}"/>`;
      return (
        under(poly([T1, T2, G2, B, G1])) +
        facet([T1, G1, M1], '#ff9aa8') +
        facet([T1, M1, Tm], '#ff6478') +
        facet([Tm, M1, M2], '#ffb1bb') +
        facet([Tm, M2, T2], '#ff5c70') +
        facet([T2, M2, G2], '#e2384f') +
        facet([G1, M1, B], '#ff4a5f') +
        facet([M1, M2, B], '#dd2c46') +
        facet([M2, G2, B], '#a91a35') +
        `<path d="M${G1.join(' ')}L${G2.join(' ')}M${T1.join(' ')}L${M1.join(' ')}L${Tm.join(' ')}L${M2.join(' ')}L${T2.join(' ')}M${M1.join(' ')}L${B.join(' ')}L${M2.join(' ')}" fill="none" stroke="#8c1430" stroke-width="2" stroke-linejoin="round" opacity="0.7"/>` +
        hl('M33 21L42 21L36 33Z', 0.85) +
        hl('M24 44L28 44L40 68Z', 0.45)
      );
    })(),
  ),

  icon_hourglass: svg(
    S,
    S,
    tube('M22 16L22 80M74 16L74 80', 5, '#b8733d', 3.5) +
      under('M28 20C28 36 40 42 44 48C40 54 28 60 28 76L68 76C68 60 56 54 52 48C56 42 68 36 68 20Z', 3.5) +
      `<path d="M28 20C28 36 40 42 44 48C40 54 28 60 28 76L68 76C68 60 56 54 52 48C56 42 68 36 68 20Z" fill="#d9f4ff"/>` +
      `<path d="M34.5 37L61.5 37C58 41 54 45 52 48L44 48C42 45 38 41 34.5 37Z" fill="${GOLD}"/>` +
      `<path d="M48 37L61.5 37C58 41 54 45 52 48L48 48Z" fill="${GOLD_D}"/>` +
      ln('M48 49L48 70', GOLD, 3) +
      `<path d="M30 76C33 66 42 61 48 61C54 61 63 66 66 76Z" fill="${GOLD}"/>` +
      `<path d="M50 61.3C56 62.5 63 67 66 76L54 76C54 70 53 65 50 61.3Z" fill="${GOLD_D}"/>` +
      ln('M33 24C33 32 37 36 40 39', '#fff', 3, 0.85) +
      ln('M33 70C34 66 35 64 36 63', '#fff', 3, 0.85) +
      `<path d="M28 20C28 36 40 42 44 48C40 54 28 60 28 76L68 76C68 60 56 54 52 48C56 42 68 36 68 20Z" fill="none" stroke="${O}" stroke-width="3.5" stroke-linejoin="round"/>` +
      cel('icon_hourglass_t', rr(16, 9, 64, 12, 5), '#d08a4c', '#9c5b2c', [-3, -3]) +
      cel('icon_hourglass_b', rr(16, 75, 64, 12, 5), '#d08a4c', '#9c5b2c', [-3, -3]) +
      hl(rr(22, 11.5, 22, 3, 1.5), 0.6),
  ),

  icon_quiver: svg(
    S,
    S,
    g(
      'translate(50 50) rotate(20)',
      (() => {
        const off = lo(20, 4);
        const arrow = (a: number, len: number, c: string, cd: string, i: number): string =>
          g(
            `translate(0 10) rotate(${a})`,
            tube(`M0 0L0 ${-len + 6}`, 3.4, '#f3cf8e', 3) +
              cel(
                `icon_quiver_f${i}`,
                `M0 ${-len + 10}L7 ${-len + 4}L7 ${-len - 8}L0 ${-len - 2}L-7 ${-len - 8}L-7 ${-len + 4}Z`,
                c,
                cd,
                lo(20 + a, 3),
                3.2,
              ) +
              ln(`M0 ${-len - 1}L0 ${-len + 8}`, cd, 1.8),
          );
        return (
          tube('M-19 -6C-33 4 -33 26 -16 34', 4.5, '#7a3f1f', 3.5) +
          arrow(-17, 38, XP, XP_D, 0) +
          arrow(17, 38, XP, XP_D, 1) +
          arrow(0, 44, '#ffffff', WHITE_D, 2) +
          cel('icon_quiver_b', 'M-20 -10L20 -10L17 32Q16 40 8 40L-8 40Q-16 40 -17 32Z', '#b5643a', '#82411f', off) +
          cel('icon_quiver_t', rr(-22, -15, 44, 11, 4.5), GOLD, GOLD_D, off, 4) +
          cel('icon_quiver_m', rr(-19, 22, 38, 7, 3), GOLD, GOLD_D, off, 3.5) +
          hl('M-13 -2L-9 -2L-10 18L-13 18Z', 0.45)
        );
      })(),
    ),
  ),

  icon_magnet: svg(
    S,
    S,
    g(
      'translate(46 50) rotate(45) scale(0.9)',
      (() => {
        const off = lo(45, 5);
        const u = 'M-30 -12L-10 -12L-10 6A10 10 0 0 0 10 6L10 -12L30 -12L30 6A30 30 0 0 1 -30 6Z';
        return (
          cel('icon_magnet_u', u, '#ff4a4a', '#c8243a', off) +
          cel('icon_magnet_t1', rr(-30, -32, 20, 20, 3), STEEL, STEEL_D, off) +
          cel('icon_magnet_t2', rr(10, -32, 20, 20, 3), STEEL, STEEL_D, off) +
          hl('M-25 -8L-20 -8L-20 8L-25 8Z', 0.6) +
          hl('M-25 -28L-20 -28L-20 -16L-25 -16Z', 0.9)
        );
      })(),
    ) +
      ln('M70 10C76 12 82 18 84 24M78 4C84 6 90 12 92 18', O, 3.5),
  ),

  icon_tome: svg(
    S,
    S,
    radial('icon_tome_g', [
      [0, '#bffaff', 1],
      [1, CYAN, 0],
    ]) +
      cel('icon_tome_p', rr(22, 16, 62, 72, 6), '#fff4dc', '#e2c99a', [-3, -3]) +
      ln('M80 24L80 82M76 84L28 84', '#d9bd8a', 2) +
      cel('icon_tome_c', rr(12, 8, 64, 72, 7), '#8a5cf0', '#5e37c2', [-5, -5]) +
      cel('icon_tome_s', rr(12, 8, 13, 72, 6), '#6a40d0', '#4e2ca8', [-2, -2], 3.5) +
      ln('M12 20L25 20M12 68L25 68', GOLD, 3.5) +
      `<circle cx="51" cy="44" r="22" fill="url(#icon_tome_g)"/>` +
      `<circle cx="51" cy="44" r="15" fill="none" stroke="${O}" stroke-width="7"/>` +
      `<circle cx="51" cy="44" r="15" fill="none" stroke="${CYAN}" stroke-width="3"/>` +
      `<path d="M51 33L57 44L51 55L45 44Z" fill="#e9feff" stroke="${O}" stroke-width="2.6" stroke-linejoin="round"/>` +
      ln('M42 44L60 44', CYAN_D, 2.2) +
      cel('icon_tome_k1', 'M64 8L76 8L76 20Z', GOLD, GOLD_D, [-1, -1], 3) +
      cel('icon_tome_k2', 'M76 68L76 80L64 80Z', GOLD, GOLD_D, [-1, -1], 3) +
      cel('icon_tome_r', 'M58 78L66 78L66 92L62 88L58 92Z', RED, RED_D, [-1.5, -1.5], 3) +
      hl(rr(30, 13, 26, 3.5, 1.75), 0.5),
  ),

  // ======================= shop / permanent =======================
  icon_might: svg(
    S,
    S,
    g(
      'translate(47 49) rotate(45)',
      (() => {
        const off = lo(45, 4);
        return (
          cel('icon_might_b', 'M0 -46L8 -35L8 6L-8 6L-8 -35Z', STEEL, STEEL_D, off) +
          ln('M0 -36L0 0', '#c6d2e4', 3) +
          ln('M-4 -34L-4 0', '#fff', 2.4, 0.8) +
          cel('icon_might_h', rr(-5, 10, 10, 22, 3), '#e2483f', '#a92e2e', off, 4) +
          cel('icon_might_g', rr(-20, 3, 40, 10, 5), GOLD, GOLD_D, off) +
          cel('icon_might_p', circ(0, 36, 6.5), GOLD, GOLD_D, off, 4)
        );
      })(),
    ),
  ),

  icon_armor: svg(
    S,
    S,
    cel('icon_armor_rim', circ(48, 48, 40), GOLD, GOLD_D, [-5, -5]) +
      cel('icon_armor_f', circ(48, 48, 31), BLUE, BLUE_D, [-5, -5], 3.5) +
      `<clipPath id="icon_armor_fc"><path d="${circ(48, 48, 31)}"/></clipPath>` +
      `<g clip-path="url(#icon_armor_fc)"><path d="M42 10H54V86H42ZM10 42H86V54H10Z" fill="${GOLD}" stroke="${O}" stroke-width="3.5"/></g>` +
      ln(arc(48, 48, 25, 195, 250), '#fff', 3.5, 0.55) +
      cel('icon_armor_boss', circ(48, 48, 10), STEEL, STEEL_D, [-3, -3], 4) +
      hl(circ(45, 45, 3), 0.9) +
      [45, 135, 225, 315].map((a) => cel(`icon_armor_rv${a}`, circ(...pt(48, 48, 35.5, a), 3), STEEL, STEEL, [0, 0], 2.5)).join('') +
      ln(arc(48, 48, 35.5, 160, 215), '#fff', 3, 0.75),
  ),

  icon_greed: svg(
    S,
    S,
    cel('icon_greed_b', 'M34 32C14 46 10 62 13 74C16 86 30 89 48 89C66 89 80 86 83 74C86 62 82 46 62 32Z', '#d9a35b', '#a87035', [-6, -6]) +
      cel('icon_greed_n', 'M35 33C27 24 28 14 34 10L42 16L48 8L54 16L62 10C68 14 69 24 61 33Z', '#d9a35b', '#a87035', [-3, -3]) +
      tube('M33 32Q48 38 63 32', 5, GOLD, 3.5) +
      hl(ell(26, 56, 5, 11, 20), 0.5) +
      coin('icon_greed_c', 66, 70, 17, 4),
  ),

  icon_growth: svg(
    S,
    S,
    cel('icon_growth_s', 'M10 86C14 72 26 66 40 66C54 66 66 72 70 86Z', '#a8683a', '#7a4524', [-3, -3]) +
      tube('M40 70C40 60 38 52 40 44', 5, '#4fbf3a', 3.5) +
      cel('icon_growth_l1', 'M39 47C32 32 18 28 8 33C12 47 28 53 39 47Z', '#7ad84e', '#3fa52e', [-3, -3], 4) +
      cel('icon_growth_l2', 'M41 45C42 28 52 18 66 17C67 32 56 44 41 45Z', '#7ad84e', '#3fa52e', [-3, -3], 4) +
      ln('M37 45C30 39 22 36 14 35M43 42C49 35 55 29 61 23', '#3fa52e', 2.4) +
      cel('icon_growth_a', 'M72 88L82 88L82 44L91 44L77 24L63 44L72 44Z', XP, XP_D, [-3, -3], 4) +
      hl('M74 46L77 46L77 84L74 84Z', 0.6),
  ),

  icon_revival: svg(
    S,
    S,
    g(
      'translate(47 50) rotate(38)',
      (() => {
        const off = lo(38, 4);
        const vane = 'M0 -44C16 -32 21 -8 13 14C9 24 5 30 0 34C-5 30 -9 24 -13 14C-21 -8 -16 -32 0 -44Z';
        return (
          under(vane) +
          paint('icon_revival_v', vane, GOLD, '#ff9a2b', off) +
          `<g clip-path="url(#icon_revival_v)">` +
          `<path d="M-30 -60L30 -60L30 -18C22 -26 14 -14 6 -22C-2 -14 -10 -26 -30 -16Z" fill="#ff7a3d"/>` +
          `<path d="M-30 -60L30 -60L30 -34C22 -40 14 -30 6 -36C-2 -30 -10 -40 -30 -32Z" fill="#e8402e"/>` +
          `<path d="M14 -6L5 -1L14 2ZM15 8L6 12L13 15ZM-15 -4L-6 1L-15 4ZM-14 10L-6 14L-12 18Z" fill="${O}"/></g>` +
          tube('M0 -34L0 46', 2.6, '#fff1c4', 2.4) +
          hl('M-8 -26C-12 -14 -13 -2 -11 8L-8 8C-9 -2 -8 -14 -5 -26Z', 0.6)
        );
      })(),
    ) +
      `<path d="M79 24C74 20 75 13 80 8C80 13 86 15 86 21C86 25 83 27 79 24Z" fill="#ff8a2b" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>` +
      `<path d="M81 22C79 20 80 18 81 16C82 18 83 19 83 21Z" fill="#fff3a0"/>` +
      `<path d="M15 34C12 31 13 27 16 24C16 28 20 28 20 32C20 35 17 36 15 34Z" fill="${GOLD}" stroke="${O}" stroke-width="3" stroke-linejoin="round"/>`,
  ),

  // ======================= UI =======================
  icon_pause: svg(
    S,
    S,
    cel('icon_pause_a', rr(20, 16, 21, 64, 8), '#ffffff', WHITE_D, [-4, -4]) +
      cel('icon_pause_b', rr(55, 16, 21, 64, 8), '#ffffff', WHITE_D, [-4, -4]),
  ),

  icon_play: svg(
    S,
    S,
    cel('icon_play_a', 'M28 22Q28 13 36 17.5L76 42Q84 48 76 54L36 78.5Q28 83 28 74Z', '#ffffff', WHITE_D, [-5, -5]),
  ),

  icon_music: svg(S, S, notes('icon_music_n', '#ffffff', WHITE_D)),

  icon_music_off: svg(S, S, notes('icon_music_off_n', '#e4e8f2', '#b9c1d6') + tube('M14 14L82 82', 8, '#ff4040')),

  icon_sfx: svg(
    S,
    S,
    speaker('icon_sfx_s') + tube(arc(50, 48, 15, -45, 45), 6, '#ffffff', 3.5) + tube(arc(50, 48, 29, -45, 45), 6, '#ffffff', 3.5),
  ),

  icon_sfx_off: svg(S, S, speaker('icon_sfx_off_s') + tube('M62 36L86 60M86 36L62 60', 7, '#ff4040')),

  icon_lock: svg(
    S,
    S,
    tube('M30 46L30 32C30 8 66 8 66 32L66 46', 9, '#cfd8e6') +
      ln('M33 28C34 18 40 14 46 13', '#fff', 2.4, 0.8) +
      cel('icon_lock_b', rr(16, 40, 64, 48, 11), GOLD, GOLD_D, [-6, -6]) +
      `<path d="${circ(48, 58, 7)}M44 60L52 60L54 76L42 76Z" fill="${O}"/>` +
      hl(rr(22, 45, 26, 4, 2), 0.7) +
      hl(circ(25.5, 54, 2.2), 0.7),
  ),

  icon_skull: svg(
    S,
    S,
    cel(
      'icon_skull_b',
      'M48 10C26 10 12 26 12 46C12 58 18 66 26 70L26 80Q26 86 32 86L64 86Q70 86 70 80L70 70C78 66 84 58 84 46C84 26 70 10 48 10Z',
      '#fbf7ef',
      '#d6cce3',
      [-6, -6],
    ) +
      `<path d="${ell(33, 48, 10.5, 12)}${ell(63, 48, 10.5, 12)}" fill="${O}"/>` +
      hl(circ(30, 44, 3.4), 0.95) +
      hl(circ(60, 44, 3.4), 0.95) +
      `<path d="M48 59L52.5 67Q48 69.5 43.5 67Z" fill="${O}" stroke="${O}" stroke-width="2" stroke-linejoin="round"/>` +
      ln('M40 76L40 85M48 76L48 85M56 76L56 85', O, 3) +
      hl(ell(28, 24, 6, 4, -35), 0.8),
  ),

  icon_clock: svg(
    S,
    S,
    cel('icon_clock_k', rr(41, 4, 14, 10, 3), GOLD, GOLD_D, [-2, -2], 3.5) +
      cel('icon_clock_r', circ(48, 52, 37), BLUE, BLUE_D, [-5, -5]) +
      cel('icon_clock_f', circ(48, 52, 28), '#fffaf0', '#e6dccb', [-3, -3], 3.5) +
      `<path d="${circ(48, 30, 2.6)}${circ(70, 52, 2.6)}${circ(48, 74, 2.6)}${circ(26, 52, 2.6)}" fill="${O}"/>` +
      ln('M48 52L48 33', O, 5) +
      ln('M48 52L60 58', O, 5) +
      cel('icon_clock_c', circ(48, 52, 4.5), GOLD, GOLD, [0, 0], 2) +
      ln(arc(48, 52, 32.5, 195, 240), '#fff', 3.5, 0.7),
  ),

  icon_coin: svg(S, S, coin('icon_coin', 48, 48, 39)),

  icon_shop: svg(
    S,
    S,
    (() => {
      const awn = 'M18 10L78 10L88 34A8 8 0 0 1 72 34A8 8 0 0 1 56 34A8 8 0 0 1 40 34A8 8 0 0 1 24 34A8 8 0 0 1 8 34Z';
      let stripes = '';
      for (let i = 0; i < 5; i += 2) {
        stripes += `<path d="${poly([
          [18 + 12 * i, 6],
          [18 + 12 * (i + 1), 6],
          [8 + 16 * (i + 1), 46],
          [8 + 16 * i, 46],
        ])}" fill="#ff5a4f"/>`;
      }
      return (
        tube('M20 40L20 72M76 40L76 72', 6, '#b8733d', 3.5) +
        `<path d="M20 38L76 38L76 66L20 66Z" fill="#ffe2b8"/>` +
        cel('icon_shop_po', 'M30 52Q30 46 34 46L34 42L40 42L40 46Q44 46 44 52Q44 62 37 62Q30 62 30 52Z', '#ff5aa8', '#c42d7a', [-2, -2], 3) +
        hl(circ(34, 51, 1.8), 0.8) +
        coin('icon_shop_cn', 60, 56, 9, 3) +
        cel('icon_shop_c', rr(10, 62, 76, 26, 5), '#d08a4c', '#9c5b2c', [-4, -4]) +
        ln('M30 66L30 84M48 66L48 84M66 66L66 84', '#9c5b2c', 2.5) +
        hl(rr(14, 65, 30, 3.5, 1.75), 0.5) +
        under(awn) +
        `<path d="${awn}" fill="#ffffff"/>` +
        `<clipPath id="icon_shop_aw"><path d="${awn}"/></clipPath>` +
        `<g clip-path="url(#icon_shop_aw)">${stripes}<path d="M0 30L96 30L96 50L0 50Z" fill="${O}" opacity="0.14"/></g>`
      );
    })(),
  ),

  icon_home: svg(
    S,
    S,
    cel('icon_home_ch', rr(62, 14, 12, 24, 2.5), '#b0503f', '#7e3428', [-2, -2], 4) +
      cel('icon_home_w', rr(20, 42, 56, 44, 4), '#fff1d6', '#e2c99a', [-5, -5]) +
      cel('icon_home_r', 'M48 8L90 44Q92 50 86 50L10 50Q4 50 6 44Z', '#ff5a4f', '#cf3b3b', [-4, -4]) +
      cel('icon_home_d', 'M39 86L39 68Q39 59 48 59Q57 59 57 68L57 86Z', BLUE, BLUE_D, [-3, -3], 4) +
      `<circle cx="53" cy="74" r="2" fill="${GOLD}"/>` +
      cel('icon_home_wl', rr(25, 59, 9, 10, 2), '#bfe9ff', '#8dcff5', [-2, -2], 3.5) +
      cel('icon_home_wr', rr(62, 59, 9, 10, 2), '#bfe9ff', '#8dcff5', [-2, -2], 3.5) +
      ln('M24 40L46 20', '#fff', 3, 0.6),
  ),

  icon_retry: svg(
    S,
    S,
    (() => {
      const cx = 48;
      const cy = 51;
      const R = 27;
      const a0 = -40;
      const a1 = 210;
      const w = 12;
      const [ex, ey] = pt(cx, cy, R, a1);
      // tangent (clockwise travel), bent slightly toward the centre so the head follows the curve
      const tx0 = -Math.sin(rad(a1));
      const ty0 = Math.cos(rad(a1));
      const nx = Math.cos(rad(a1));
      const ny = Math.sin(rad(a1));
      const bx = tx0 - nx * 0.35;
      const by = ty0 - ny * 0.35;
      const bl = Math.hypot(bx, by);
      const tx = bx / bl;
      const ty = by / bl;
      const head = poly([
        [ex + tx * 19, ey + ty * 19],
        [ex + nx * 15 - tx * 3, ey + ny * 15 - ty * 3],
        [ex - nx * 15 - tx * 3, ey - ny * 15 - ty * 3],
      ]);
      const body = arc(cx, cy, R, a0, a1);
      return (
        `<path d="${body}" fill="none" stroke="${O}" stroke-width="${w + 9}" stroke-linecap="round"/>` +
        under(head) +
        `<path d="${body}" fill="none" stroke="#ffffff" stroke-width="${w}" stroke-linecap="round"/>` +
        `<path d="${head}" fill="#ffffff"/>` +
        `<path d="${arc(cx, cy, R + 2.5, a0 + 20, a1 - 110)}" fill="none" stroke="${WHITE_D}" stroke-width="5" stroke-linecap="round"/>`
      );
    })(),
  ),

  // ======================= quests =======================
  icon_scroll: svg(
    S,
    S,
    cel('icon_scroll_p', rr(22, 16, 52, 64, 5), '#fbeccb', '#e2c99a', [-5, -5]) +
      ln('M32 34L64 34M32 45L64 45M32 56L54 56', '#b48f55', 4) +
      cel('icon_scroll_t', rr(14, 9, 68, 15, 7.5), '#e9cf98', '#c09a5a', [-3, -3]) +
      cel('icon_scroll_b', rr(14, 72, 68, 15, 7.5), '#e9cf98', '#c09a5a', [-3, -3]) +
      `<path d="${circ(14, 16.5, 4)}${circ(82, 16.5, 4)}${circ(14, 79.5, 4)}${circ(82, 79.5, 4)}" fill="#a8783e"/>` +
      cel('icon_scroll_s', circ(66, 64, 11), RED, RED_D, [-3, -3], 3.5) +
      `<path d="${star(66, 64, 5.5, 2.6)}" fill="#ffd0d4"/>` +
      hl(rr(19, 12, 26, 3.5, 1.75), 0.7) +
      hl(rr(27, 22, 3.5, 30, 1.75), 0.5),
  ),

  icon_trophy: svg(
    S,
    S,
    tube('M27 24Q8 22 12 38Q15 48 30 50', 6, GOLD_D, 3.5) +
      tube('M69 24Q88 22 84 38Q81 48 66 50', 6, GOLD_D, 3.5) +
      cel('icon_trophy_st', rr(41, 56, 14, 16, 3), GOLD_D, '#b8741a', [-2, -2], 3.5) +
      cel('icon_trophy_c', 'M22 12L74 12L72 38Q70 60 48 62Q26 60 24 38Z', GOLD, GOLD_D, [-6, -6]) +
      `<path d="${star(48, 34, 12, 5.2)}" fill="#fff6c8" stroke="${GOLD_D}" stroke-width="2.5" stroke-linejoin="round"/>` +
      cel('icon_trophy_b', rr(24, 70, 48, 17, 5), WOOD, WOOD_D, [-3, -3]) +
      cel('icon_trophy_pl', rr(38, 74, 20, 8, 2), GOLD, GOLD_D, [-1.5, -1.5], 2) +
      ln('M30 18L30 36', '#fff', 4, 0.8) +
      hl(circ(31, 42, 2.4), 0.7),
  ),

  icon_crown: svg(
    S,
    S,
    cel('icon_crown_c', 'M14 72L10 32L32 50L48 20L64 50L86 32L82 72Z', GOLD, GOLD_D, [-5, -5]) +
      `<path d="${circ(10, 30, 6)}${circ(48, 17, 6.5)}${circ(86, 30, 6)}" fill="${GOLD}" stroke="${O}" stroke-width="3.5"/>` +
      cel('icon_crown_b', rr(13, 64, 70, 18, 5), GOLD_D, '#b8741a', [-3, -3]) +
      cel('icon_crown_g1', circ(48, 73, 6), RED, RED_D, [-2, -2], 3) +
      cel('icon_crown_g2', circ(29, 73, 4.5), XP, XP_D, [-1.5, -1.5], 3) +
      cel('icon_crown_g3', circ(67, 73, 4.5), XP, XP_D, [-1.5, -1.5], 3) +
      ln('M20 40L22 60', '#fff', 3.5, 0.75) +
      hl(circ(46, 15, 2), 0.9),
  ),

  icon_check: svg(S, S, tube('M20 50L40 70L78 28', 15, '#5ad15a', 5) + ln('M24 49L39 63', '#c6ffb8', 4, 0.8)),
};
