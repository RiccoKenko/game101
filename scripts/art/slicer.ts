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

/** An ellipse in sheet pixels: centre, radii and turn in degrees. */
export type Ellipse = [number, number, number, number, number?];

/**
 * Clears the pixels inside each ellipse. Used for the flat skin-coloured "cut ends" some sheets draw where a
 * part meets the next one: hidden under that part in the rig pose, they show as holes once limbs move.
 * `ox`, `oy`: where the image's top-left corner sits on the sheet.
 */
export function eraseEllipses(img: RgbaImage, ox: number, oy: number, ellipses: Ellipse[]): RgbaImage {
  const out = new Uint8Array(img.data);
  for (const [cx, cy, rx, ry, deg = 0] of ellipses) {
    const c = Math.cos((deg * Math.PI) / 180);
    const s = Math.sin((deg * Math.PI) / 180);
    const r = Math.max(rx, ry);
    for (let y = Math.max(0, Math.floor(cy - r - oy)); y < Math.min(img.height, Math.ceil(cy + r - oy)); y++)
      for (let x = Math.max(0, Math.floor(cx - r - ox)); x < Math.min(img.width, Math.ceil(cx + r - ox)); x++) {
        const dx = x + ox - cx;
        const dy = y + oy - cy;
        const u = (dx * c + dy * s) / rx;
        const v = (-dx * s + dy * c) / ry;
        if (u * u + v * v <= 1) out.fill(0, (y * img.width + x) * 4, (y * img.width + x) * 4 + 4);
      }
  }
  return { data: out, width: img.width, height: img.height };
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
