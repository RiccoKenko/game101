import { describe, expect, it } from 'vitest';
import { cropPiece, findPieces, groupPieces, orderPieces, removeBackground, type RgbaImage } from '../../scripts/art/slicer';

type Rgb = [number, number, number];
const MAGENTA: Rgb = [255, 0, 255];
const OUTLINE: Rgb = [59, 42, 42];

/** A fake ChatGPT parts sheet: slightly noisy magenta with anti-aliased, outlined discs and a ring. */
function makeSheet(): RgbaImage {
  const W = 600;
  const H = 400;
  const data = new Uint8Array(W * H * 4);
  let seed = 7;
  const noise = () => ((seed = (seed * 16807) % 2147483647) % 13) - 6;
  for (let p = 0; p < W * H; p++) {
    data[p * 4] = 255 + Math.min(0, noise());
    data[p * 4 + 1] = Math.max(0, noise());
    data[p * 4 + 2] = 255 + Math.min(0, noise());
    data[p * 4 + 3] = 255;
  }
  // Each shape: centre, outer radius, inner (hole) radius, fill colour.
  const shapes: [number, number, number, number, Rgb][] = [
    [80, 70, 40, 0, [62, 154, 79]],
    [205, 70, 14, 0, [246, 234, 210]], // left eye  } one eye piece: 7 px apart
    [240, 70, 14, 0, [246, 234, 210]], // right eye }
    [380, 70, 40, 18, [226, 66, 59]], // ring with a magenta hole
    [520, 70, 30, 0, [47, 75, 143]],
    [80, 200, 35, 0, [242, 193, 78]],
    [220, 200, 45, 0, [62, 154, 79]],
    [380, 200, 25, 0, [226, 66, 59]],
    [520, 200, 40, 0, [246, 234, 210]],
    [120, 330, 38, 0, [47, 75, 143]],
    [300, 330, 30, 0, [242, 193, 78]],
  ];
  for (const [cx, cy, r, hole, fill] of shapes)
    for (let y = cy - r - 2; y <= cy + r + 2; y++)
      for (let x = cx - r - 2; x <= cx + r + 2; x++) {
        // 4x4 supersampling for soft edges, like a real drawing.
        let cover = 0;
        let ink = 0;
        for (let sy = 0; sy < 4; sy++)
          for (let sx = 0; sx < 4; sx++) {
            const d = Math.hypot(x + (sx + 0.5) / 4 - cx, y + (sy + 0.5) / 4 - cy);
            if (d <= r && d >= hole) {
              cover++;
              if (d > r - 4 || (hole && d < hole + 4)) ink++;
            }
          }
        if (!cover) continue;
        const a = cover / 16;
        const t = ink / cover;
        const i = (y * W + x) * 4;
        for (let c = 0; c < 3; c++) {
          const art = OUTLINE[c] * t + fill[c] * (1 - t);
          data[i + c] = Math.round(art * a + data[i + c] * (1 - a));
        }
      }
  return { data, width: W, height: H };
}

describe('art slicer', () => {
  const sheet = makeSheet();
  const { image, background } = removeBackground(sheet);
  const alpha = (x: number, y: number) => image.data[(y * image.width + x) * 4 + 3];

  it('finds the magenta background and clears it, including enclosed holes', () => {
    expect(background).not.toBeNull();
    expect(Math.hypot(...background!.map((v, c) => v - MAGENTA[c]))).toBeLessThan(10);
    expect(alpha(0, 0)).toBe(0);
    expect(alpha(150, 140)).toBe(0);
    expect(alpha(380, 70)).toBe(0); // centre of the ring
    expect(alpha(80, 70)).toBe(255);
  });

  it('keeps soft edges without a pink fringe', () => {
    let soft = 0;
    for (let p = 0; p < image.width * image.height; p++) {
      const i = p * 4;
      const a = image.data[i + 3];
      if (a > 0 && a < 255) soft++;
      if (a >= 32) expect(Math.min(image.data[i], image.data[i + 2]) - image.data[i + 1]).toBeLessThan(60);
    }
    expect(soft).toBeGreaterThan(100);
  });

  it('groups both eyes into one part and orders parts row by row', () => {
    const { pieces, labels } = findPieces(image);
    expect(pieces.length).toBe(11);
    const { groups, dropped } = groupPieces(pieces, 10);
    expect(dropped).toBe(0);
    const ordered = orderPieces(groups, image.width);
    const centres = ordered.map((g) => [Math.round(g.x + g.w / 2), Math.round(g.y + g.h / 2)]);
    expect(centres.map(([x]) => x)).toEqual([80, 223, 380, 520, 80, 220, 380, 520, 120, 300].map((x) => expect.closeTo(x, -1)));
    expect(ordered[1].w).toBeGreaterThan(60); // the eye pair
    const eyes = cropPiece(image, labels, ordered[1], 8);
    expect(eyes.width).toBe(ordered[1].w + 16);
    // A neighbour never leaks into another part's crop.
    const disc = cropPiece(image, labels, ordered[0], 0);
    expect(disc.data[3]).toBe(0);
  });

  it('reads an already transparent image as is', () => {
    const clear: RgbaImage = { data: new Uint8Array(20 * 20 * 4), width: 20, height: 20 };
    clear.data.set([10, 20, 30, 255], (10 * 20 + 10) * 4);
    const out = removeBackground(clear);
    expect(out.background).toBeNull();
    expect(out.image.data[(10 * 20 + 10) * 4 + 3]).toBe(255);
  });

  it('copes with fewer parts than expected', () => {
    const { pieces } = findPieces(image);
    expect(groupPieces(pieces, 20).groups.length).toBe(11);
  });
});
