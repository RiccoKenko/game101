/**
 * Turns AI-drawn character sheets into separate transparent parts.
 * Pure pixel code on RGBA buffers (no file IO) so it is easy to test; `slice.ts` does the reading and writing.
 */

export interface RgbaImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export type Rgb = [number, number, number];

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** One or more connected blobs of pixels that belong to the same part. */
export interface Piece extends Box {
  area: number;
  labels: number[];
}

const distTo = (d: Uint8Array, i: number, c: Rgb) => Math.hypot(d[i] - c[0], d[i + 1] - c[1], d[i + 2] - c[2]);

function eachBorder(w: number, h: number, fn: (p: number) => void) {
  for (let x = 0; x < w; x++) {
    fn(x);
    fn((h - 1) * w + x);
  }
  for (let y = 1; y < h - 1; y++) {
    fn(y * w);
    fn(y * w + w - 1);
  }
}

/** The most common colour along the image border (5-bit buckets, averaged), i.e. the flat background. */
export function borderColor(img: RgbaImage): Rgb {
  const { data, width: w, height: h } = img;
  const buckets = new Map<number, number[]>();
  eachBorder(w, h, (p) => {
    const i = p * 4;
    const key = ((data[i] >> 3) << 10) | ((data[i + 1] >> 3) << 5) | (data[i + 2] >> 3);
    const b = buckets.get(key) ?? [0, 0, 0, 0];
    b[0] += data[i];
    b[1] += data[i + 1];
    b[2] += data[i + 2];
    b[3]++;
    buckets.set(key, b);
  });
  let best = [0, 0, 0, 1];
  for (const b of buckets.values()) if (b[3] > best[3]) best = b;
  return [best[0] / best[3], best[1] / best[3], best[2] / best[3]];
}

/**
 * Tidies an image that came with its own transparency. AI cut-outs leave the art about 98% opaque
 * (alpha 246–253) and a faint, often tinted haze (alpha 1–7) around it: the art becomes fully opaque
 * and the haze goes, while soft edges and thin see-through details (a bowstring) keep their alpha.
 * Stray specks further out are left to `groupPieces`.
 */
export function cleanAlpha(img: RgbaImage): RgbaImage {
  const { data, width: w, height: h } = img;
  const n = w * h;
  const counts = new Array<number>(256).fill(0);
  for (let p = 0; p < n; p++) counts[data[p * 4 + 3]]++;
  // "Solid" = the level that 95% of the clearly visible pixels reach.
  const visible = counts.slice(128).reduce((s, c) => s + c, 0);
  let solid = 255;
  for (let a = 128, seen = 0; a < 256; a++) {
    seen += counts[a];
    if (seen > visible * 0.05) {
      solid = Math.max(a, 160);
      break;
    }
  }
  const LO = 8;
  const out = new Uint8Array(n * 4);
  for (let p = 0; p < n; p++) {
    const a = Math.round(Math.min(1, Math.max(0, (data[p * 4 + 3] - LO) / (solid - LO))) * 255);
    if (a === 0) continue;
    out.set(data.subarray(p * 4, p * 4 + 3), p * 4);
    out[p * 4 + 3] = a;
  }
  return { data: out, width: w, height: h };
}

/**
 * Makes the flat background transparent. Returns `background: null` when the image already has one
 * (then it is only tidied by `cleanAlpha`).
 *
 * - Background = everything reachable from the border through pixels close to the border colour.
 *   A saturated key colour (magenta) never appears in the art, so enclosed pockets of it go too.
 * - Edge pixels are a blend of the art and the background. Each one is un-mixed against the most
 *   art-like neighbour, which gives a soft alpha edge without a pink fringe.
 */
export function removeBackground(img: RgbaImage, tolerance = 56): { image: RgbaImage; background: Rgb | null } {
  const { data, width: w, height: h } = img;
  const n = w * h;

  let clear = 0;
  let border = 0;
  eachBorder(w, h, (p) => {
    border++;
    if (data[p * 4 + 3] < 128) clear++;
  });
  if (clear > border / 2) return { image: cleanAlpha(img), background: null };

  const bg = borderColor(img);
  const isBg = new Uint8Array(n);
  const stack = new Int32Array(n);
  let top = 0;
  eachBorder(w, h, (p) => {
    if (!isBg[p] && distTo(data, p * 4, bg) < tolerance) {
      isBg[p] = 1;
      stack[top++] = p;
    }
  });
  while (top > 0) {
    const p = stack[--top];
    const x = p % w;
    const y = (p - x) / w;
    const visit = (q: number) => {
      if (!isBg[q] && distTo(data, q * 4, bg) < tolerance) {
        isBg[q] = 1;
        stack[top++] = q;
      }
    };
    if (x > 0) visit(p - 1);
    if (x < w - 1) visit(p + 1);
    if (y > 0) visit(p - w);
    if (y < h - 1) visit(p + w);
  }
  const saturation = (Math.max(...bg) - Math.min(...bg)) / 255;
  if (saturation > 0.5) for (let p = 0; p < n; p++) if (!isBg[p] && distTo(data, p * 4, bg) < tolerance * 0.8) isBg[p] = 1;

  const out = new Uint8Array(n * 4);
  const BAND = 2;
  const SEARCH = 3;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const p = y * w + x;
      if (isBg[p]) continue;
      const i = p * 4;
      let edge = false;
      for (let dy = -BAND; dy <= BAND && !edge; dy++)
        for (let dx = -BAND; dx <= BAND; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx >= 0 && yy >= 0 && xx < w && yy < h && isBg[yy * w + xx]) {
            edge = true;
            break;
          }
        }
      if (!edge) {
        out[i] = data[i];
        out[i + 1] = data[i + 1];
        out[i + 2] = data[i + 2];
        out[i + 3] = 255;
        continue;
      }
      // Treat the pixel as a mix of the background and a more solid neighbour (usually the outline). Among the
      // neighbours whose colour explains the mix, the most solid one is the true art colour. If none explains it,
      // it is not a mix (e.g. a highlight next to the outline) and stays opaque.
      const pr = data[i] - bg[0];
      const pg = data[i + 1] - bg[1];
      const pb = data[i + 2] - bg[2];
      const pd = Math.hypot(pr, pg, pb);
      const fits = Math.max(8, pd * 0.25);
      let a = 1;
      let solid = 0;
      for (let dy = -SEARCH; dy <= SEARCH; dy++)
        for (let dx = -SEARCH; dx <= SEARCH; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || isBg[yy * w + xx]) continue;
          const q = (yy * w + xx) * 4;
          const fr = data[q] - bg[0];
          const fg = data[q + 1] - bg[1];
          const fb = data[q + 2] - bg[2];
          const ff = fr * fr + fg * fg + fb * fb;
          const qd = Math.sqrt(ff);
          if (qd < pd + 8 || qd <= solid) continue;
          const t = Math.min(1, Math.max(0, (pr * fr + pg * fg + pb * fb) / ff));
          if (Math.hypot(pr - t * fr, pg - t * fg, pb - t * fb) < fits) {
            solid = qd;
            a = t;
          }
        }
      if (a < 0.04) continue;
      out[i] = Math.round(Math.min(255, Math.max(0, bg[0] + pr / a)));
      out[i + 1] = Math.round(Math.min(255, Math.max(0, bg[1] + pg / a)));
      out[i + 2] = Math.round(Math.min(255, Math.max(0, bg[2] + pb / a)));
      out[i + 3] = Math.round(a * 255);
    }
  return { image: { data: out, width: w, height: h }, background: bg };
}

/**
 * Finds every blob of visible pixels (8-connected). `labels` maps each pixel to its blob, or -1.
 * Faint edge pixels below `alphaMin` join the blob next to them so cut-outs keep their soft edges.
 */
export function findPieces(img: RgbaImage, alphaMin = 24): { pieces: Piece[]; labels: Int32Array } {
  const { data, width: w, height: h } = img;
  const n = w * h;
  const labels = new Int32Array(n).fill(-1);
  const pieces: Piece[] = [];
  const stack = new Int32Array(n);
  for (let s = 0; s < n; s++) {
    if (labels[s] >= 0 || data[s * 4 + 3] < alphaMin) continue;
    const id = pieces.length;
    let minX = w;
    let minY = h;
    let maxX = -1;
    let maxY = -1;
    let area = 0;
    let top = 0;
    labels[s] = id;
    stack[top++] = s;
    while (top > 0) {
      const p = stack[--top];
      const x = p % w;
      const y = (p - x) / w;
      area++;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = yy * w + xx;
          if (labels[q] < 0 && data[q * 4 + 3] >= alphaMin) {
            labels[q] = id;
            stack[top++] = q;
          }
        }
    }
    pieces.push({ x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1, area, labels: [id] });
  }
  for (let pass = 0; pass < 2; pass++)
    for (let p = 0; p < n; p++) {
      if (labels[p] >= 0 || data[p * 4 + 3] === 0) continue;
      const x = p % w;
      const y = (p - x) / w;
      for (let dy = -1; dy <= 1 && labels[p] < 0; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h || labels[yy * w + xx] < 0) continue;
          const piece = pieces[labels[yy * w + xx]];
          labels[p] = piece.labels[0];
          const right = Math.max(piece.x + piece.w, x + 1);
          const bottom = Math.max(piece.y + piece.h, y + 1);
          piece.x = Math.min(piece.x, x);
          piece.y = Math.min(piece.y, y);
          piece.w = right - piece.x;
          piece.h = bottom - piece.y;
          break;
        }
    }
  return { pieces, labels };
}

/** Empty space between two boxes (0 when they overlap). */
export const boxGap = (a: Box, b: Box) =>
  Math.hypot(Math.max(0, b.x - (a.x + a.w), a.x - (b.x + b.w)), Math.max(0, b.y - (a.y + a.h), a.y - (b.y + b.h)));

function merge(a: Piece, b: Piece): Piece {
  const x = Math.min(a.x, b.x);
  const y = Math.min(a.y, b.y);
  return {
    x,
    y,
    w: Math.max(a.x + a.w, b.x + b.w) - x,
    h: Math.max(a.y + a.h, b.y + b.h) - y,
    area: a.area + b.area,
    labels: [...a.labels, ...b.labels],
  };
}

/**
 * Joins blobs into parts. With `count` (the number of parts the prompt asked for), the closest blobs
 * merge until that many remain, so both eyes of an eye piece end up together. Without it, blobs closer
 * than `gap` merge. Tiny specks join the part they touch; far-away ones are dropped as noise.
 */
export function groupPieces(pieces: Piece[], count?: number, gap = 12): { groups: Piece[]; dropped: number } {
  const largest = Math.max(0, ...pieces.map((p) => p.area));
  const isSpeck = (p: Piece) => p.area < Math.max(24, largest * 0.002);
  const specks = pieces.filter(isSpeck);
  const groups = pieces.filter((p) => !isSpeck(p));
  for (;;) {
    if (count !== undefined && groups.length <= count) break;
    let bi = -1;
    let bj = -1;
    let best = Infinity;
    for (let i = 0; i < groups.length; i++)
      for (let j = i + 1; j < groups.length; j++) {
        const d = boxGap(groups[i], groups[j]);
        if (d < best) {
          best = d;
          bi = i;
          bj = j;
        }
      }
    if (bi < 0 || (count === undefined && best > gap)) break;
    groups[bi] = merge(groups[bi], groups[bj]);
    groups.splice(bj, 1);
  }
  let dropped = 0;
  for (const s of specks) {
    let k = -1;
    let best = Infinity;
    groups.forEach((g, i) => {
      const d = boxGap(g, s);
      if (d < best) {
        best = d;
        k = i;
      }
    });
    if (k >= 0 && best <= gap) groups[k] = merge(groups[k], s);
    else dropped++;
  }
  return { groups, dropped };
}

/**
 * Joins blobs into parts by hand-drawn boxes, for sheets where parts sit closer together than their own
 * pieces (an eye piece is two eyes and two brows): each blob joins the box its centre falls in. Returns one
 * entry per box (null when nothing landed in it) and how many blobs fell outside every box.
 */
export function groupByBoxes(pieces: Piece[], boxes: Box[]): { groups: (Piece | null)[]; dropped: number } {
  const groups: (Piece | null)[] = boxes.map(() => null);
  let dropped = 0;
  for (const p of pieces) {
    const cx = p.x + p.w / 2;
    const cy = p.y + p.h / 2;
    const k = boxes.findIndex((b) => cx >= b.x && cx < b.x + b.w && cy >= b.y && cy < b.y + b.h);
    if (k < 0) dropped++;
    else groups[k] = groups[k] ? merge(groups[k]!, p) : p;
  }
  // A box nothing landed in: its part touches a neighbour's (e.g. two portraits elbow to elbow), so both came out
  // as one blob. Share the blob that overlaps the box most: each part keeps the blob's pixels inside its own box,
  // as `cropPiece` copies only a piece's bounding box. Put the boxes' common edge on the gap between the parts.
  const overlap = (a: Box, b: Box) =>
    Math.max(0, Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x)) * Math.max(0, Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y));
  const clip = (g: Piece, b: Box): Piece => {
    const x = Math.max(g.x, b.x);
    const y = Math.max(g.y, b.y);
    return { ...g, x, y, w: Math.min(g.x + g.w, b.x + b.w) - x, h: Math.min(g.y + g.h, b.y + b.h) - y };
  };
  boxes.forEach((box, k) => {
    if (groups[k]) return;
    let best: Piece | undefined;
    for (const p of pieces) if (overlap(p, box) > (best ? overlap(best, box) : 0)) best = p;
    if (!best) return;
    const shared = best;
    groups[k] = clip(shared, box);
    const owner = groups.findIndex((g, i) => i !== k && g?.labels.includes(shared.labels[0]));
    if (owner >= 0) groups[owner] = clip(groups[owner]!, boxes[owner]);
  });
  return { groups, dropped };
}

/**
 * Puts parts in reading order: region by region (fractions of the width, e.g. the head column then the
 * face grid), and inside a region row by row, left to right.
 */
export function orderPieces(groups: Piece[], width: number, regions: [number, number][] = [[0, 1]]): Piece[] {
  const cy = (g: Piece) => g.y + g.h / 2;
  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;
  const out: Piece[] = [];
  regions.forEach(([x0, x1], r) => {
    const last = r === regions.length - 1;
    const inside = groups
      .filter((g) => {
        const cx = (g.x + g.w / 2) / width;
        return cx >= x0 && (cx < x1 || last);
      })
      .sort((a, b) => cy(a) - cy(b));
    const rows: Piece[][] = [];
    for (const g of inside) {
      const row = rows[rows.length - 1];
      if (row && Math.abs(cy(g) - mean(row.map(cy))) < 0.45 * Math.max(g.h, mean(row.map((p) => p.h)))) row.push(g);
      else rows.push([g]);
    }
    for (const row of rows) out.push(...row.sort((a, b) => a.x - b.x));
  });
  return out;
}

/** Copies one part (only its own pixels, not a neighbour poking into its box) with `pad` empty pixels around it. */
export function cropPiece(img: RgbaImage, labels: Int32Array, piece: Piece, pad = 8): RgbaImage {
  const keep = new Set(piece.labels);
  const w = piece.w + pad * 2;
  const h = piece.h + pad * 2;
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < piece.h; y++)
    for (let x = 0; x < piece.w; x++) {
      const p = (piece.y + y) * img.width + piece.x + x;
      if (!keep.has(labels[p])) continue;
      data.set(img.data.subarray(p * 4, p * 4 + 4), ((y + pad) * w + x + pad) * 4);
    }
  return { data, width: w, height: h };
}

/** An ellipse in sheet pixels: centre, radii, turn in degrees and, optionally, `'heal'` (see `eraseEllipses`). */
export type Ellipse = [number, number, number, number, number?, 'heal'?];

/**
 * Clears the pixels inside each ellipse. Used for the flat skin-coloured "cut ends" some sheets draw where a
 * part meets the next one: hidden under that part in the rig pose, they show as holes once limbs move.
 * An ellipse marked `'heal'` keeps its pixels but repaints them (see `healEllipse`).
 * `ox`, `oy`: where the image's top-left corner sits on the sheet.
 */
export function eraseEllipses(img: RgbaImage, ox: number, oy: number, ellipses: Ellipse[]): RgbaImage {
  const out = new Uint8Array(img.data);
  for (const [cx, cy, rx, ry, deg = 0, mode] of ellipses) {
    const c = Math.cos((deg * Math.PI) / 180);
    const s = Math.sin((deg * Math.PI) / 180);
    const r = Math.max(rx, ry);
    const inside: number[] = [];
    for (let y = Math.max(0, Math.floor(cy - r - oy)); y < Math.min(img.height, Math.ceil(cy + r - oy)); y++)
      for (let x = Math.max(0, Math.floor(cx - r - ox)); x < Math.min(img.width, Math.ceil(cx + r - ox)); x++) {
        const dx = x + ox - cx;
        const dy = y + oy - cy;
        const u = (dx * c + dy * s) / rx;
        const v = (-dx * s + dy * c) / ry;
        if (u * u + v * v <= 1) inside.push(y * img.width + x);
      }
    if (mode === 'heal') healEllipse(out, img.width, img.height, inside);
    else for (const p of inside) out.fill(0, p * 4, p * 4 + 4);
  }
  return { data: out, width: img.width, height: img.height };
}

/** Clears the pixels inside each polygon (corners in sheet pixels): strays drawn into a part, like a roof from another sheet. */
export function cutPolygons(img: RgbaImage, ox: number, oy: number, polygons: [number, number][][]): RgbaImage {
  const out = new Uint8Array(img.data);
  for (const poly of polygons)
    for (let y = 0; y < img.height; y++)
      for (let x = 0; x < img.width; x++) {
        const px = x + ox + 0.5;
        const py = y + oy + 0.5;
        let inside = false;
        for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
          const [xi, yi] = poly[i];
          const [xj, yj] = poly[j];
          if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
        }
        if (inside) out.fill(0, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
      }
  return { data: out, width: img.width, height: img.height };
}

/**
 * Glows, snow and haze painted over the coloured background come out as opaque pink: each such pixel is really
 * `colour` laid over the background at some strength. Starting from the transparent surroundings, walks through
 * pixels that lie near the mix of `bg` and `colour` and turns each into `colour` at that strength, so a pink
 * halo becomes a soft violet glow and pink-smeared snow becomes white streaks. Art inside the part, cut off from
 * the surroundings by ordinary pixels (e.g. glowing runes carved into stone), is left alone, unless `everywhere`
 * (for art that has no pink of its own, so spill trapped inside it is cleaned too).
 */
export function unmixSpill(img: RgbaImage, bg: Rgb, colour: Rgb, near = 48, everywhere = false): RgbaImage {
  const { width: w, height: h } = img;
  const out = new Uint8Array(img.data);
  const dir: Rgb = [colour[0] - bg[0], colour[1] - bg[1], colour[2] - bg[2]];
  const len2 = dir[0] ** 2 + dir[1] ** 2 + dir[2] ** 2 || 1;
  /** Strength of `colour` in the pixel if it lies near the mix line, else -1. */
  const strength = (p: number) => {
    const c = [out[p * 4] - bg[0], out[p * 4 + 1] - bg[1], out[p * 4 + 2] - bg[2]];
    const t = (c[0] * dir[0] + c[1] * dir[1] + c[2] * dir[2]) / len2;
    if (t >= 0.97) return -1;
    const k = Math.max(0, t);
    return Math.hypot(c[0] - dir[0] * k, c[1] - dir[1] * k, c[2] - dir[2] * k) < near ? k : -1;
  };
  const seen = new Uint8Array(w * h);
  const queue: number[] = [];
  for (let p = 0; p < w * h; p++) {
    if (out[p * 4 + 3] === 0) {
      seen[p] = 1;
      queue.push(p);
    } else if (everywhere) {
      const k = strength(p);
      if (k >= 0) out.set([colour[0], colour[1], colour[2], Math.round(out[p * 4 + 3] * k)], p * 4);
    }
  }
  while (queue.length) {
    const p = queue.pop()!;
    const x = p % w;
    const y = (p - x) / w;
    for (const q of [x > 0 ? p - 1 : -1, x < w - 1 ? p + 1 : -1, y > 0 ? p - w : -1, y < h - 1 ? p + w : -1]) {
      if (q < 0 || seen[q]) continue;
      seen[q] = 1;
      const k = strength(q);
      if (k < 0) continue;
      out.set([colour[0], colour[1], colour[2], Math.round(out[q * 4 + 3] * k)], q * 4);
      queue.push(q);
    }
  }
  return { data: out, width: w, height: h };
}

/** Clears blobs smaller than `minArea` pixels (left-over specks after cutting strays away). */
export function despeck(img: RgbaImage, minArea: number, alphaMin = 24): RgbaImage {
  const { pieces, labels } = findPieces(img, alphaMin);
  const small = new Set(pieces.filter((p) => p.area < minArea).flatMap((p) => p.labels));
  if (!small.size) return img;
  const out = new Uint8Array(img.data);
  for (let p = 0; p < img.width * img.height; p++) if (small.has(labels[p])) out.fill(0, p * 4, p * 4 + 4);
  return { data: out, width: img.width, height: img.height };
}

/**
 * Paints over the lines and highlights inside an area (pixel indices `inside`) with the colour of the skin
 * around it, keeping the outline along the part's silhouette (pixels within `edge` of transparency) and the
 * alpha. For the round "ball joints" some sheets draw at the ends of limbs: healed, the ball reads as the
 * rounded end of the limb instead of a separate ball.
 * The new colours are a smooth fill (repeated averaging) from the opaque, skin-like pixels just outside.
 */
function healEllipse(data: Uint8Array, w: number, h: number, inside: number[], edge = 4, iterations = 400) {
  const clearAt = (x: number, y: number) => x < 0 || y < 0 || x >= w || y >= h || data[(y * w + x) * 4 + 3] < 128;
  const nearClear = (p: number) => {
    const x = p % w;
    const y = (p - x) / w;
    for (let dy = -edge; dy <= edge; dy++) for (let dx = -edge; dx <= edge; dx++) if (clearAt(x + dx, y + dy)) return true;
    return false;
  };
  const region = inside.filter((p) => data[p * 4 + 3] > 0 && !nearClear(p));
  if (!region.length) return;
  const lum = (p: number) => 0.299 * data[p * 4] + 0.587 * data[p * 4 + 1] + 0.114 * data[p * 4 + 2];
  const light = region.filter((p) => lum(p) > 150);
  const median = (ps: number[], k: number) => {
    const vs = ps.map((p) => data[p * 4 + k]).sort((a, b) => a - b);
    return vs.length % 2 ? vs[(vs.length - 1) / 2] : (vs[vs.length / 2 - 1] + vs[vs.length / 2]) / 2;
  };
  const ref = [0, 1, 2].map((k) => median(light.length ? light : region, k));
  const inRegion = new Set(region);
  const value = new Map<number, number[]>();
  for (const p of region) value.set(p, [...ref]);
  // Neighbours that feed the fill: the region itself and opaque skin-like pixels around it (not outlines or cloth).
  const sources = new Map<number, number[]>();
  const feeds = region.map((p) => {
    const x = p % w;
    const y = (p - x) / w;
    const ns: number[] = [];
    for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const q = ny * w + nx;
      if (inRegion.has(q)) ns.push(q);
      else if (data[q * 4 + 3] >= 250) {
        const rgb = [data[q * 4], data[q * 4 + 1], data[q * 4 + 2]];
        if (Math.hypot(rgb[0] - ref[0], rgb[1] - ref[1], rgb[2] - ref[2]) < 70) {
          sources.set(q, rgb);
          ns.push(q);
        }
      }
    }
    return ns;
  });
  const at = (q: number) => value.get(q) ?? sources.get(q)!;
  for (let it = 0; it < iterations; it++) {
    const next = region.map((_, i) => {
      const ns = feeds[i];
      if (!ns.length) return value.get(region[i])!;
      const sum = [0, 0, 0];
      for (const q of ns) for (let k = 0; k < 3; k++) sum[k] += at(q)[k];
      return sum.map((v) => v / ns.length);
    });
    region.forEach((p, i) => value.set(p, next[i]));
  }
  for (const p of region) {
    const v = value.get(p)!;
    for (let k = 0; k < 3; k++) data[p * 4 + k] = Math.round(v[k]);
  }
}

/** Crops a whole picture to its visible pixels plus `pad`. */
export function trim(img: RgbaImage, pad = 8): { image: RgbaImage; box: Box } {
  const { data, width: w, height: h } = img;
  let minX = w;
  let minY = h;
  let maxX = -1;
  let maxY = -1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      if (data[(y * w + x) * 4 + 3] > 0) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
  if (maxX < 0) return { image: { data: new Uint8Array(4), width: 1, height: 1 }, box: { x: 0, y: 0, w: 0, h: 0 } };
  const box = { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 };
  const ow = box.w + pad * 2;
  const oh = box.h + pad * 2;
  const out = new Uint8Array(ow * oh * 4);
  for (let y = 0; y < box.h; y++) {
    const from = ((box.y + y) * w + box.x) * 4;
    out.set(data.subarray(from, from + box.w * 4), ((y + pad) * ow + pad) * 4);
  }
  return { image: { data: out, width: ow, height: oh }, box };
}

/**
 * Clears blobs of one flat colour (e.g. blush circles painted on eye pieces when the head already has them):
 * pixels within `tolerance` (sum of RGB differences) of `colour`, in connected blobs of at least `minArea`
 * pixels (so a small dot of the same colour stays), plus a `grow`-pixel rim to take their soft edge.
 */
export function clearColourBlobs(img: RgbaImage, colour: Rgb, tolerance: number, minArea: number, grow = 1): RgbaImage {
  const { data, width: w, height: h } = img;
  const n = w * h;
  const near = new Uint8Array(n);
  for (let p = 0; p < n; p++) {
    const o = p * 4;
    if (data[o + 3] === 0) continue;
    const d = Math.abs(data[o] - colour[0]) + Math.abs(data[o + 1] - colour[1]) + Math.abs(data[o + 2] - colour[2]);
    if (d <= tolerance) near[p] = 1;
  }
  const clear = new Uint8Array(n);
  const seen = new Uint8Array(n);
  const stack: number[] = [];
  for (let s = 0; s < n; s++) {
    if (!near[s] || seen[s]) continue;
    const blob: number[] = [];
    seen[s] = 1;
    stack.push(s);
    while (stack.length) {
      const p = stack.pop()!;
      blob.push(p);
      const x = p % w;
      const y = (p - x) / w;
      for (let dy = -1; dy <= 1; dy++)
        for (let dx = -1; dx <= 1; dx++) {
          const xx = x + dx;
          const yy = y + dy;
          if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
          const q = yy * w + xx;
          if (near[q] && !seen[q]) {
            seen[q] = 1;
            stack.push(q);
          }
        }
    }
    if (blob.length >= minArea) for (const p of blob) clear[p] = 1;
  }
  const out = new Uint8Array(data);
  for (let p = 0; p < n; p++) {
    if (!clear[p]) continue;
    const x = p % w;
    const y = (p - x) / w;
    for (let dy = -grow; dy <= grow; dy++)
      for (let dx = -grow; dx <= grow; dx++) {
        const xx = x + dx;
        const yy = y + dy;
        if (xx < 0 || yy < 0 || xx >= w || yy >= h) continue;
        const q = yy * w + xx;
        // The rim only takes pixels that are themselves blush-ish or faint, never the eye's own lines.
        const o = q * 4;
        const d = Math.abs(data[o] - colour[0]) + Math.abs(data[o + 1] - colour[1]) + Math.abs(data[o + 2] - colour[2]);
        if (clear[q] || d <= tolerance * 2.5 || data[o + 3] < 128) out.fill(0, o, o + 4);
      }
  }
  return { data: out, width: w, height: h };
}

/** Clears everything outside a polygon (sheet pixels), e.g. to lift one piece out of a whole-figure picture. */
export function keepPolygon(img: RgbaImage, ox: number, oy: number, poly: [number, number][]): RgbaImage {
  const out = new Uint8Array(img.data);
  for (let y = 0; y < img.height; y++)
    for (let x = 0; x < img.width; x++) {
      const px = x + ox + 0.5;
      const py = y + oy + 0.5;
      let inside = false;
      for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
        const [xi, yi] = poly[i];
        const [xj, yj] = poly[j];
        if (yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi) + xi) inside = !inside;
      }
      if (!inside) out.fill(0, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
    }
  return { data: out, width: img.width, height: img.height };
}
