import { describe, expect, it } from 'vitest';
import { seamless } from '../../scripts/art/seamless';

/** A test picture whose red channel is the column and green channel the row. */
function ramp(w: number, h: number) {
  const data = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) data.set([x, y, 0, 255], (y * w + x) * 4);
  return { data, width: w, height: h };
}

describe('seamless ground tiles', () => {
  it('shrinks by the band and wraps each edge into the next tile', () => {
    const tile = seamless(ramp(40, 30), 8);
    expect([tile.width, tile.height]).toEqual([32, 22]);
    const px = (x: number, y: number) => Array.from(tile.data.subarray((y * 32 + x) * 4, (y * 32 + x) * 4 + 4));
    // The first column shows the source column just past the tile's right edge (32), so the last column (31)
    // runs straight into it; likewise for rows.
    expect(px(0, 15)[0]).toBe(32);
    expect(px(31, 15)[0]).toBe(31);
    expect(px(10, 0)[1]).toBe(22);
    expect(px(10, 21)[1]).toBe(21);
    expect(px(10, 15)).toEqual([10, 15, 0, 255]);
  });
});
