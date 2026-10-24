/**
 * npm run map:chapter
 *
 * Draws the Chapter 1 level-select map from CHAPTER1_MAP in src/play/chapterMap.ts: a soft sky, three floating
 * islands centred on the level buttons (Sky Haven with the crystal vault, Windmill Terraces, Lighthouse Point),
 * the dotted sky route through `route`, and the storm with the pirates' airship at `storm` (Chapter 2, locked).
 * Codex paints the finished map over it, so the islands stay under the buttons the game puts on top. Until then
 * the level-select screen shows this sketch, so it is drawn to look pleasant, not just as flat blocks.
 * Writes art/maps/chapter1-sketch.png and public/maps/chapter1-sketch.png.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { CHAPTER1_MAP, type ChapterMapDef } from '../../src/play/chapterMap';
import { catmullRom, closedCurve, type Pt } from '../../src/td/path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');

const INK = '#3b2a2a';
const f1 = (n: number) => n.toFixed(1);
const pts = (p: Pt[]) => p.map(([x, y]) => `${f1(x)},${f1(y)}`).join(' ');
const pathD = (p: Pt[], close = false) => `M ${p.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L ')}${close ? ' Z' : ''}`;

/** A small seeded random generator, so the sketch comes out the same every run. */
function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A wobbly oval outline: the grassy top of an island. */
function blob(cx: number, cy: number, rx: number, ry: number, seed: number, wobble = 0.08, n = 14): Pt[] {
  const r = rng(seed);
  const ring: Pt[] = [];
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    const k = 1 + (r() - 0.5) * 2 * wobble;
    ring.push([cx + Math.cos(a) * rx * k, cy + Math.sin(a) * ry * k]);
  }
  return closedCurve(ring, 8);
}

/** A puffy cloud: a row of overlapping circles on a flat-ish base, with a soft shade underneath. */
function cloud(cx: number, cy: number, s: number, opts: { fill?: string; shade?: string; line?: string; opacity?: number } = {}): string {
  const { fill = '#ffffff', shade = '#d6ecfb', line = 'none', opacity = 1 } = opts;
  const puffs: [number, number, number][] = [
    [-1.0, 0.18, 0.42], [-0.55, -0.12, 0.55], [0.0, -0.3, 0.68], [0.55, -0.1, 0.56], [1.0, 0.16, 0.42],
  ];
  const circles = (dy: number, color: string, stroke: string) =>
    puffs.map(([x, y, r]) => `<circle cx="${f1(cx + x * s)}" cy="${f1(cy + y * s + dy)}" r="${f1(r * s)}" fill="${color}" stroke="${stroke}" stroke-width="${stroke === 'none' ? 0 : 4}"/>`).join('') +
    `<ellipse cx="${f1(cx)}" cy="${f1(cy + 0.2 * s + dy)}" rx="${f1(1.25 * s)}" ry="${f1(0.32 * s)}" fill="${color}" stroke="${stroke}" stroke-width="${stroke === 'none' ? 0 : 4}"/>`;
  // Outline pass first (if any), then the shade, then the lit top nudged up, so the outline only shows outside.
  return `<g opacity="${opacity}">${line === 'none' ? '' : circles(0, line, line)}${circles(0, shade, 'none')}${circles(-0.12 * s, fill, 'none')}</g>`;
}

function tree(x: number, y: number, s = 1, leaf = '#3f8a3c', light = '#5fae4a'): string {
  return `<rect x="${f1(x - 5 * s)}" y="${f1(y - 6 * s)}" width="${f1(10 * s)}" height="${f1(18 * s)}" rx="3" fill="#7a4f30" stroke="${INK}" stroke-width="3"/>
  <circle cx="${f1(x)}" cy="${f1(y - 22 * s)}" r="${f1(22 * s)}" fill="${leaf}" stroke="${INK}" stroke-width="4"/>
  <circle cx="${f1(x - 6 * s)}" cy="${f1(y - 28 * s)}" r="${f1(10 * s)}" fill="${light}"/>`;
}

function pine(x: number, y: number, s = 1): string {
  return `<rect x="${f1(x - 4 * s)}" y="${f1(y - 8 * s)}" width="${f1(8 * s)}" height="${f1(14 * s)}" fill="#6b4428" stroke="${INK}" stroke-width="3"/>
  <polygon points="${pts([[x, y - 58 * s], [x + 20 * s, y - 6 * s], [x - 20 * s, y - 6 * s]])}" fill="#2f7a4a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <polygon points="${pts([[x - 3 * s, y - 50 * s], [x - 12 * s, y - 16 * s], [x - 2 * s, y - 16 * s]])}" fill="#4f9c62"/>`;
}

function cottage(x: number, y: number, roof = '#d0603a', s = 1): string {
  const w = 44 * s;
  const h = 30 * s;
  return `<rect x="${f1(x - w / 2)}" y="${f1(y - h)}" width="${f1(w)}" height="${f1(h)}" fill="#f6ead2" stroke="${INK}" stroke-width="4"/>
  <rect x="${f1(x - 6 * s)}" y="${f1(y - 16 * s)}" width="${f1(12 * s)}" height="${f1(16 * s)}" fill="#8c5a33" stroke="${INK}" stroke-width="3"/>
  <rect x="${f1(x + 10 * s)}" y="${f1(y - 22 * s)}" width="${f1(9 * s)}" height="${f1(8 * s)}" fill="#ffe08a" stroke="${INK}" stroke-width="2"/>
  <polygon points="${pts([[x - w / 2 - 7 * s, y - h + 2], [x, y - h - 26 * s], [x + w / 2 + 7 * s, y - h + 2]])}" fill="${roof}" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="${f1(x + 9 * s)}" y="${f1(y - h - 22 * s)}" width="${f1(8 * s)}" height="${f1(14 * s)}" fill="#a9a9b8" stroke="${INK}" stroke-width="3"/>`;
}

function crystal(x: number, y: number, h: number, w: number): string {
  return `<polygon points="${pts([[x, y - h], [x + w / 2, y - h * 0.35], [x, y], [x - w / 2, y - h * 0.35]])}" fill="#6ff0ff" stroke="#1d7f8a" stroke-width="4" stroke-linejoin="round"/>
  <polygon points="${pts([[x, y - h * 0.9], [x + w * 0.18, y - h * 0.38], [x, y - h * 0.2]])}" fill="#e6fdff"/>`;
}

/** The crystal vault: a round stone shrine holding a cluster of glowing Sky Crystals. */
function vault(x: number, y: number): string {
  return `<circle cx="${x}" cy="${y - 36}" r="58" fill="url(#crystalGlow)"/>
  <ellipse cx="${x}" cy="${y}" rx="44" ry="18" fill="#a9a9b8" stroke="${INK}" stroke-width="4"/>
  <ellipse cx="${x}" cy="${y - 5}" rx="34" ry="12" fill="#c8c8d4"/>
  ${crystal(x - 18, y - 4, 40, 20)}${crystal(x + 18, y - 4, 44, 22)}${crystal(x, y - 2, 70, 30)}`;
}

/** A windmill: a stone tower with a cone roof and four sails. */
function windmill(x: number, y: number, s = 1, turn = 0.3): string {
  const hub: Pt = [x, y - 64 * s];
  const sails = [0, 1, 2, 3]
    .map((i) => {
      const a = turn + (i * Math.PI) / 2;
      const [c, d] = [Math.cos(a), Math.sin(a)];
      const len = 50 * s;
      const wid = 9 * s;
      const p: Pt[] = [
        [hub[0] + c * 8 * s - d * 2, hub[1] + d * 8 * s + c * 2],
        [hub[0] + c * len - d * 2, hub[1] + d * len + c * 2],
        [hub[0] + c * len - d * wid * 1.6, hub[1] + d * len + c * wid * 1.6],
        [hub[0] + c * 14 * s - d * wid * 1.6, hub[1] + d * 14 * s + c * wid * 1.6],
      ];
      return `<line x1="${f1(hub[0])}" y1="${f1(hub[1])}" x2="${f1(hub[0] + c * len)}" y2="${f1(hub[1] + d * len)}" stroke="#7a4f30" stroke-width="5" stroke-linecap="round"/>
      <polygon points="${pts(p)}" fill="#fbf4e2" stroke="${INK}" stroke-width="3" stroke-linejoin="round"/>`;
    })
    .join('');
  return `<polygon points="${pts([[x - 22 * s, y], [x - 15 * s, y - 60 * s], [x + 15 * s, y - 60 * s], [x + 22 * s, y]])}" fill="#efe2c4" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="${f1(x - 6 * s)}" y="${f1(y - 18 * s)}" width="${f1(12 * s)}" height="${f1(18 * s)}" fill="#8c5a33" stroke="${INK}" stroke-width="3"/>
  <polygon points="${pts([[x - 20 * s, y - 58 * s], [x, y - 84 * s], [x + 20 * s, y - 58 * s]])}" fill="#b5523a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  ${sails}<circle cx="${f1(hub[0])}" cy="${f1(hub[1])}" r="${f1(6 * s)}" fill="#7a4f30" stroke="${INK}" stroke-width="3"/>`;
}

/** The old lighthouse that keeps a crystal vault in its lamp room. */
function lighthouse(x: number, y: number): string {
  const body: Pt[] = [[x - 26, y], [x - 17, y - 118], [x + 17, y - 118], [x + 26, y]];
  const stripe = (y0: number, y1: number) => {
    const at = (yy: number) => 26 - ((y - yy) / 118) * 9;
    return `<polygon points="${pts([[x - at(y0), y0], [x - at(y1), y1], [x + at(y1), y1], [x + at(y0), y0]])}" fill="#e2574c"/>`;
  };
  return `<ellipse cx="${x}" cy="${y}" rx="40" ry="13" fill="#9c9484" stroke="${INK}" stroke-width="4"/>
  <polygon points="${pts(body)}" fill="#f7f1e6"/>
  ${stripe(y - 30, y - 52)}${stripe(y - 78, y - 100)}
  <polygon points="${pts(body)}" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <rect x="${x - 6}" y="${y - 24}" width="12" height="20" rx="5" fill="#8c5a33" stroke="${INK}" stroke-width="3"/>
  <rect x="${x - 26}" y="${y - 124}" width="52" height="9" fill="#5b6375" stroke="${INK}" stroke-width="3"/>
  <circle cx="${x}" cy="${y - 140}" r="40" fill="url(#crystalGlow)"/>
  <rect x="${x - 17}" y="${y - 154}" width="34" height="30" fill="#2f3e66" stroke="${INK}" stroke-width="4"/>
  ${crystal(x, y - 127, 26, 18)}
  <polygon points="${pts([[x - 24, y - 152], [x, y - 178], [x + 24, y - 152]])}" fill="#b5523a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
  <circle cx="${x}" cy="${y - 181}" r="5" fill="#f4c34f" stroke="${INK}" stroke-width="2"/>`;
}

interface IslandStyle {
  grass: string;
  grassLight: string;
  rock: string;
  rockShade: string;
  /** How far the cliff hangs below the island's top. */
  depth: number;
  seed: number;
}

/** The rocky underside of a floating island: the top outline dropped down and tapered to a point. */
function underside(top: Pt[], cx: number, cy: number, rx: number, ry: number, st: IslandStyle): string {
  const lip = top.map(([x, y]): Pt => [x, y + 28]);
  const r = rng(st.seed + 7);
  const taper: Pt[] = [];
  const n = 9;
  for (let i = 0; i <= n; i++) {
    const t = i / n;
    const x = cx - rx * 0.96 + t * rx * 1.92;
    const bulge = Math.sin(t * Math.PI);
    taper.push([x + (r() - 0.5) * 18, cy + ry * 0.55 + bulge * st.depth + (i % 2 ? 22 : 0) * bulge]);
  }
  const left = lip.reduce((a, b) => (b[0] < a[0] ? b : a));
  const right = lip.reduce((a, b) => (b[0] > a[0] ? b : a));
  const body = closedCurve([left, ...taper.slice(1, -1), right, [cx, cy]], 6);
  // Rock layers and hanging roots across the cliff face.
  const strata = [0.35, 0.62]
    .map((k) => {
      const y = cy + ry * 0.6 + st.depth * k;
      const w = rx * (1 - k * 0.55);
      return `<path d="M ${f1(cx - w)} ${f1(y)} Q ${f1(cx)} ${f1(y + 22)} ${f1(cx + w)} ${f1(y - 4)}" fill="none" stroke="${st.rockShade}" stroke-width="5" stroke-linecap="round"/>`;
    })
    .join('');
  const roots = [-0.6, -0.25, 0.15, 0.5, 0.75]
    .map((k, i) => {
      const x = cx + rx * k;
      const y0 = cy + ry * Math.sqrt(Math.max(0, 1 - k * k)) + 18;
      const len = 30 + ((i * 37) % 45);
      return `<path d="M ${f1(x)} ${f1(y0)} q 8 ${f1(len * 0.5)} -3 ${f1(len)}" fill="none" stroke="#4f8a3a" stroke-width="4" stroke-linecap="round"/>`;
    })
    .join('');
  return `<polygon points="${pts(body)}" fill="${st.rock}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <polygon points="${pts(lip)}" fill="${st.rockShade}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  ${strata}${roots}`;
}

function island(cx: number, cy: number, rx: number, ry: number, st: IslandStyle): { back: string; top: Pt[] } {
  const top = blob(cx, cy, rx, ry, st.seed);
  const highlight = blob(cx - rx * 0.06, cy - ry * 0.12, rx * 0.82, ry * 0.66, st.seed + 3, 0.06);
  const back = `${underside(top, cx, cy, rx, ry, st)}
  <polygon points="${pts(top)}" fill="${st.grass}" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
  <polygon points="${pts(highlight)}" fill="${st.grassLight}"/>`;
  return { back, top };
}

/** The pirates' airship, seen from the side with the bow to the left (heading for Sky Haven). */
function airship(x: number, y: number, s = 1): string {
  const hull: Pt[] = [[x - 70 * s, y], [x + 58 * s, y], [x + 70 * s, y - 14 * s], [x + 50 * s, y + 26 * s], [x - 42 * s, y + 26 * s]];
  return `<g>
  <ellipse cx="${f1(x)}" cy="${f1(y - 58 * s)}" rx="${f1(78 * s)}" ry="${f1(30 * s)}" fill="#2f3150" stroke="#1d1e33" stroke-width="5"/>
  <path d="M ${f1(x - 70 * s)} ${f1(y - 58 * s)} Q ${f1(x)} ${f1(y - 44 * s)} ${f1(x + 74 * s)} ${f1(y - 58 * s)}" fill="none" stroke="#4a4d74" stroke-width="4"/>
  <polygon points="${pts([[x + 72 * s, y - 60 * s], [x + 100 * s, y - 84 * s], [x + 98 * s, y - 40 * s]])}" fill="#2f3150" stroke="#1d1e33" stroke-width="4" stroke-linejoin="round"/>
  ${[-40, 0, 40].map((d) => `<line x1="${f1(x + d * s)}" y1="${f1(y - 30 * s)}" x2="${f1(x + d * 0.8 * s)}" y2="${f1(y)}" stroke="#1d1e33" stroke-width="3"/>`).join('')}
  <polygon points="${pts(hull)}" fill="#2a2b45" stroke="#1d1e33" stroke-width="5" stroke-linejoin="round"/>
  <line x1="${f1(x - 60 * s)}" y1="${f1(y + 8 * s)}" x2="${f1(x + 56 * s)}" y2="${f1(y + 8 * s)}" stroke="#4a4d74" stroke-width="3"/>
  ${[-30, 0, 30].map((d) => `<circle cx="${f1(x + d * s)}" cy="${f1(y + 15 * s)}" r="${f1(4 * s)}" fill="#ffd36b"/>`).join('')}
  <polygon points="${pts([[x - 70 * s, y + 2 * s], [x - 96 * s, y - 8 * s], [x - 70 * s, y - 4 * s]])}" fill="#2a2b45" stroke="#1d1e33" stroke-width="3"/>
  <line x1="${f1(x + 8 * s)}" y1="${f1(y)}" x2="${f1(x + 8 * s)}" y2="${f1(y - 26 * s)}" stroke="#1d1e33" stroke-width="4"/>
  <polygon points="${pts([[x + 10 * s, y - 26 * s], [x + 34 * s, y - 20 * s], [x + 10 * s, y - 13 * s]])}" fill="#8e2a2a" stroke="#1d1e33" stroke-width="2"/>
  </g>`;
}

function stormCloud(cx: number, cy: number): string {
  const puffs: [number, number, number][] = [
    [-200, 70, 50], [-150, 30, 66], [-95, -40, 74], [-30, 40, 92], [0, -75, 80], [70, -20, 92], [135, 50, 74], [180, -60, 70], [200, 30, 64],
  ];
  const layer = (dy: number, fill: string, grow = 0) => puffs.map(([x, y, r]) => `<circle cx="${cx + x}" cy="${cy + y + dy}" r="${r + grow}" fill="${fill}"/>`).join('');
  const bolt: Pt[] = [[cx - 120, cy + 70], [cx - 140, cy + 118], [cx - 120, cy + 114], [cx - 146, cy + 170], [cx - 100, cy + 104], [cx - 120, cy + 108], [cx - 102, cy + 70]];
  return `<circle cx="${cx}" cy="${cy}" r="330" fill="url(#stormTint)"/>
  ${layer(0, '#1f2038', 5)}${layer(0, '#43466e')}${layer(-14, '#5a5e8c', -12)}${layer(-26, '#7377a6', -34)}
  <polygon points="${pts(bolt)}" fill="#ffe066" stroke="#8a6a1c" stroke-width="3" stroke-linejoin="round"/>`;
}

/** A faraway islet, pale with distance. */
function islet(x: number, y: number, s: number): string {
  return `<path d="M ${f1(x - 46 * s)} ${f1(y)} Q ${f1(x - 30 * s)} ${f1(y + 40 * s)} ${f1(x)} ${f1(y + 62 * s)} Q ${f1(x + 34 * s)} ${f1(y + 36 * s)} ${f1(x + 46 * s)} ${f1(y)} Z" fill="#9dbfdc"/>
  <ellipse cx="${f1(x)}" cy="${f1(y)}" rx="${f1(46 * s)}" ry="${f1(14 * s)}" fill="#b4d6c2"/>
  <circle cx="${f1(x - 12 * s)}" cy="${f1(y - 10 * s)}" r="${f1(11 * s)}" fill="#9cc8b4"/><circle cx="${f1(x + 8 * s)}" cy="${f1(y - 8 * s)}" r="${f1(8 * s)}" fill="#9cc8b4"/>`;
}

/** A waterfall pouring off an island's edge and fading into the sky below. */
function waterfall(x: number, y: number, width: number, length: number): string {
  return `<rect x="${f1(x - width / 2)}" y="${f1(y)}" width="${f1(width)}" height="${f1(length)}" rx="${f1(width / 2)}" fill="url(#fall)"/>
  <rect x="${f1(x - width / 2 + 4)}" y="${f1(y + 4)}" width="${f1(Math.max(4, width * 0.22))}" height="${f1(length * 0.8)}" rx="3" fill="url(#fallLight)"/>`;
}

/** A cluster of jagged grey rocks. */
function crag(x: number, y: number, s = 1): string {
  const rocks: [number, number, number, number][] = [[-22, 4, 22, 46], [6, 0, 26, 64], [30, 8, 18, 34]];
  return rocks
    .map(([dx, dy, w, h]) => {
      const bx = x + dx * s;
      const by = y + dy * s;
      const p: Pt[] = [[bx - w * s, by], [bx - w * 0.6 * s, by - h * 0.7 * s], [bx - 2 * s, by - h * s], [bx + w * 0.7 * s, by - h * 0.55 * s], [bx + w * s, by]];
      return `<polygon points="${pts(p)}" fill="#a39a8a" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
      <polygon points="${pts([p[1], p[2], [bx - 4 * s, by - 4 * s], [bx - w * 0.7 * s, by - 4 * s]])}" fill="#c6bead"/>`;
    })
    .join('');
}

function bird(x: number, y: number, s = 1): string {
  return `<path d="M ${f1(x - 10 * s)} ${f1(y - 4 * s)} Q ${f1(x - 5 * s)} ${f1(y - 7 * s)} ${f1(x)} ${f1(y)} Q ${f1(x + 5 * s)} ${f1(y - 7 * s)} ${f1(x + 10 * s)} ${f1(y - 4 * s)}" fill="none" stroke="#4a5a78" stroke-width="3" stroke-linecap="round"/>`;
}

export function chapterSketchSvg(map: ChapterMapDef): string {
  const { w, h, nodes, route, storm } = map;
  const [n1, n2, n3] = nodes;

  // Islands, each centred on its level button.
  const grassy = { grass: '#7cc85a', grassLight: '#93d56b', rock: '#8a6a4c', rockShade: '#6e523a', depth: 150 };
  const haven = island(n1[0], n1[1] + 5, 228, 118, { ...grassy, depth: 190, seed: 11 });
  const mills = island(n2[0], n2[1] + 5, 192, 106, { ...grassy, depth: 150, seed: 23 });
  const point = island(n3[0], n3[1] + 5, 182, 100, { grass: '#86bf5e', grassLight: '#9ccc70', rock: '#857a6c', rockShade: '#665d52', depth: 210, seed: 37 });

  // The route: a dotted line through the sky, bright up to the last level and greyed beyond it (Chapter 2).
  const curve = catmullRom(route, 20);
  let split = 0;
  curve.forEach((p, i) => {
    if (Math.hypot(p[0] - n3[0], p[1] - n3[1]) < Math.hypot(curve[split][0] - n3[0], curve[split][1] - n3[1])) split = i;
  });
  const open = curve.slice(0, split + 1);
  const locked = curve.slice(split);
  // The dots stop at each level's clearing, where the game puts the button.
  const runs = (p: Pt[]): Pt[][] => {
    const out: Pt[][] = [];
    let run: Pt[] = [];
    for (const q of p) {
      if (nodes.some((n) => Math.hypot((q[0] - n[0]) / 74, (q[1] - n[1]) / 40) < 1)) {
        if (run.length > 1) out.push(run);
        run = [];
      } else run.push(q);
    }
    if (run.length > 1) out.push(run);
    return out;
  };
  const dots = (p: Pt[], fill: string, edge: string) =>
    runs(p)
      .map(
        (r) => `<path d="${pathD(r)}" fill="none" stroke="${edge}" stroke-width="17" stroke-linecap="round" stroke-dasharray="0.1 30"/>
     <path d="${pathD(r)}" fill="none" stroke="${fill}" stroke-width="10" stroke-linecap="round" stroke-dasharray="0.1 30"/>`,
      )
      .join('');

  // Where the Windmill Terraces' stream passes under the route: a little bridge.
  const crossing = curve.reduce((best, p) => (Math.abs(p[0] - (n2[0] + 92)) < Math.abs(best[0] - (n2[0] + 92)) ? p : best), curve[0]);
  const stream = catmullRom([[n2[0] + 70, n2[1] - 95], [n2[0] + 88, n2[1] - 45], crossing, [n2[0] + 80, n2[1] + 55], [n2[0] + 70, n2[1] + 102]], 10);
  const fall: Pt = stream[stream.length - 1];

  // A clear, flat spot at each level button.
  const clearing = ([x, y]: Pt, fill: string) =>
    `<ellipse cx="${x}" cy="${y + 4}" rx="62" ry="30" fill="${fill}" stroke="#a8875a" stroke-width="4"/><ellipse cx="${x}" cy="${y + 1}" rx="48" ry="21" fill="#f3e6c4"/>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#78c0f2"/><stop offset="0.55" stop-color="#b9e2fb"/><stop offset="1" stop-color="#e8f6ff"/>
    </linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#fff6d8" stop-opacity="0.95"/><stop offset="1" stop-color="#fff6d8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="stormTint" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#3d3f66" stop-opacity="0.75"/><stop offset="0.6" stop-color="#5a5f8c" stop-opacity="0.35"/><stop offset="1" stop-color="#5a5f8c" stop-opacity="0"/>
    </radialGradient>
    <linearGradient id="fall" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#8fd8ff"/><stop offset="0.65" stop-color="#8fd8ff" stop-opacity="0.85"/><stop offset="1" stop-color="#8fd8ff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="fallLight" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffffff" stop-opacity="0.9"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="crystalGlow" cx="0.5" cy="0.5" r="0.5">
      <stop offset="0" stop-color="#bff8ff" stop-opacity="0.9"/><stop offset="1" stop-color="#bff8ff" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="150" cy="110" r="260" fill="url(#sun)"/>

  <!-- far clouds and faraway islets -->
  ${cloud(170, 150, 80, { opacity: 0.85 })}
  ${cloud(560, 120, 60, { opacity: 0.75 })}
  ${cloud(930, 190, 70, { opacity: 0.8 })}
  ${cloud(520, 300, 42, { opacity: 0.6 })}
  <g opacity="0.7">${islet(1000, 300, 0.9)}${islet(290, 385, 0.7)}${islet(640, 250, 0.5)}</g>
  ${bird(700, 120)}${bird(728, 136, 0.8)}${bird(392, 250, 0.9)}

  ${stormCloud(storm[0], storm[1])}
  ${airship(storm[0] + 5, storm[1] + 30, 0.9)}

  <!-- soft clouds drifting between the islands -->
  ${cloud(560, 790, 70, { opacity: 0.9 })}
  ${cloud(960, 820, 64, { opacity: 0.9 })}

  <!-- Sky Haven: village, crystal vault, waterfall -->
  ${haven.back}
  ${waterfall(n1[0] - 178, n1[1] + 78, 22, 250)}
  ${crystal(n1[0] + 70, n1[1] + 190, 26, 16)}${crystal(n1[0] - 70, n1[1] + 232, 22, 14)}
  ${tree(n1[0] - 118, n1[1] - 86, 0.9)}${tree(n1[0] + 30, n1[1] - 84, 0.9)}${tree(n1[0] + 190, n1[1] + 45, 0.9)}${tree(n1[0] - 30, n1[1] + 100, 0.85)}
  ${cottage(n1[0] - 58, n1[1] - 55, '#d0603a')}${cottage(n1[0] + 98, n1[1] - 50, '#3f74c4', 0.9)}${cottage(n1[0] + 95, n1[1] + 92, '#d0603a', 0.85)}
  ${vault(n1[0] - 150, n1[1] + 15)}
  ${clearing(n1, '#e2c48a')}

  <!-- Windmill Terraces: stepped fields, windmills, a stream with a bridge -->
  ${mills.back}
  <path d="${pathD(blob(n2[0], n2[1] - 30, 150, 62, 5, 0.05))} Z" fill="#a5dc78" stroke="#5f9c45" stroke-width="5"/>
  <path d="${pathD(blob(n2[0] - 10, n2[1] - 52, 96, 34, 9, 0.05))} Z" fill="#b8e68a" stroke="#5f9c45" stroke-width="5"/>
  ${[[n2[0] - 78, n2[1] + 58, 30], [n2[0] + 130, n2[1] + 50, 22]]
    .map(([x, y, half]) => [0, 1, 2, 3].map((i) => `<line x1="${x - half}" y1="${y + i * 9}" x2="${x + half}" y2="${y - 4 + i * 9}" stroke="#d9c25e" stroke-width="5" stroke-linecap="round"/>`).join(''))
    .join('')}
  <path d="${pathD(stream)}" fill="none" stroke="#5aa6d6" stroke-width="20" stroke-linecap="round" stroke-linejoin="round"/>
  <path d="${pathD(stream)}" fill="none" stroke="#8fd8ff" stroke-width="13" stroke-linecap="round" stroke-linejoin="round"/>
  <ellipse cx="${f1(stream[0][0])}" cy="${f1(stream[0][1])}" rx="22" ry="9" fill="#8fd8ff" stroke="#5aa6d6" stroke-width="4"/>
  ${waterfall(fall[0], fall[1] - 4, 16, 170)}
  <rect x="${f1(crossing[0] - 22)}" y="${f1(crossing[1] - 13)}" width="44" height="26" rx="8" fill="#b07a45" stroke="${INK}" stroke-width="4"/>
  ${[-11, 0, 11].map((d) => `<line x1="${f1(crossing[0] + d)}" y1="${f1(crossing[1] - 11)}" x2="${f1(crossing[0] + d)}" y2="${f1(crossing[1] + 11)}" stroke="#7a4f30" stroke-width="3"/>`).join('')}
  ${windmill(n2[0] - 112, n2[1] - 50, 1, 0.35)}${windmill(n2[0] + 150, n2[1] - 40, 0.85, 0.9)}
  ${tree(n2[0] - 165, n2[1] + 20, 0.75)}${tree(n2[0] + 25, n2[1] - 80, 0.7)}
  ${clearing(n2, '#e2c48a')}

  <!-- Lighthouse Point: rocky cliffs, the old lighthouse, the pirates' pier on the far side -->
  ${point.back}
  ${crystal(n3[0] + 30, n3[1] + 200, 24, 15)}
  <rect x="${n3[0] + 165}" y="${n3[1] + 36}" width="96" height="30" fill="#9a6a3c" stroke="${INK}" stroke-width="4"/>
  ${[0, 1, 2, 3].map((i) => `<line x1="${n3[0] + 183 + i * 22}" y1="${n3[1] + 36}" x2="${n3[0] + 183 + i * 22}" y2="${n3[1] + 66}" stroke="#6d4a2e" stroke-width="3"/>`).join('')}
  ${[0, 1].map((i) => `<rect x="${n3[0] + 196 + i * 56}" y="${n3[1] + 60}" width="9" height="34" fill="#6d4a2e" stroke="${INK}" stroke-width="3"/>`).join('')}
  ${[[n3[0] + 60, n3[1] + 70, 26], [n3[0] + 118, n3[1] - 18, 16], [n3[0] - 40, n3[1] + 78, 14]]
    .map(([x, y, r]) => `<ellipse cx="${x}" cy="${y}" rx="${r}" ry="${r * 0.7}" fill="#b3a996" stroke="${INK}" stroke-width="4"/><ellipse cx="${x - r * 0.25}" cy="${y - r * 0.25}" rx="${r * 0.45}" ry="${r * 0.28}" fill="#d2cab8"/>`)
    .join('')}
  ${crag(n3[0] - 112, n3[1] + 58, 0.9)}
  ${pine(n3[0] + 125, n3[1] + 40, 0.8)}${pine(n3[0] - 150, n3[1] + 10, 0.7)}
  ${lighthouse(n3[0] - 72, n3[1] - 70)}
  ${clearing(n3, '#d8c9a0')}

  <!-- the sky route -->
  ${dots(open, '#fff6da', '#8a5a2e')}
  ${dots(locked.slice(1), '#c9c4dc', '#4a4d74')}

  <!-- the sea of clouds below -->
  ${[[80, 990, 110], [300, 1010, 95], [520, 985, 120], [760, 1012, 100], [990, 990, 120], [1220, 1012, 105], [1450, 990, 120]]
    .map(([x, y, s]) => cloud(x, y, s, { shade: '#cfe6f7' }))
    .join('')}
</svg>`;
}

async function main() {
  const map = CHAPTER1_MAP;
  // A palette PNG keeps the file small; light dithering hides the banding in the sky gradient.
  const png = await sharp(Buffer.from(chapterSketchSvg(map))).png({ palette: true, colours: 256, dither: 0.6, compressionLevel: 9 }).toBuffer();
  const name = map.sketch.split('/').pop() ?? 'chapter1-sketch.png';
  for (const dir of ['art/maps', 'public/maps']) {
    mkdirSync(join(ROOT, dir), { recursive: true });
    writeFileSync(join(ROOT, dir, name), png);
  }
  console.log(`Wrote art/maps/${name} and public/maps/${name} (${Math.round(png.length / 1024)} KB)`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exit(1);
});
