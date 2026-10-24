import type { RgbaImage } from './slicer';

/**
 * Makes a texture tile without visible seams by cross-fading a band of `band` px at its left and top edges with
 * the pixels just past the right and bottom edges. The result is `band` px smaller in each direction; its last
 * column runs straight into its first (and its last row into its first) when repeated.
 */
export function seamless(img: RgbaImage, band: number): RgbaImage {
  return wrapY(wrapX(img, band), band);
}

function wrapX(img: RgbaImage, band: number): RgbaImage {
  const { data, width, height } = img;
  const w = width - band;
  const out = new Uint8Array(w * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < w; x++) {
      const o = (y * w + x) * 4;
      const a = (y * width + x) * 4;
      if (x >= band) {
        out.set(data.subarray(a, a + 4), o);
        continue;
      }
      // At x = 0 the tile shows the pixel just past its right edge, so it continues from its own last column.
      const t = x / band;
      const b = (y * width + x + w) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(data[a + c] * t + data[b + c] * (1 - t));
    }
  }
  return { data: out, width: w, height };
}

function wrapY(img: RgbaImage, band: number): RgbaImage {
  const { data, width, height } = img;
  const h = height - band;
  const out = new Uint8Array(width * h * 4);
  for (let y = 0; y < h; y++) {
    const t = y / band;
    for (let x = 0; x < width; x++) {
      const o = (y * width + x) * 4;
      const a = (y * width + x) * 4;
      if (y >= band) {
        out.set(data.subarray(a, a + 4), o);
        continue;
      }
      const b = ((y + h) * width + x) * 4;
      for (let c = 0; c < 4; c++) out[o + c] = Math.round(data[a + c] * t + data[b + c] * (1 - t));
    }
  }
  return { data: out, width, height: h };
}
