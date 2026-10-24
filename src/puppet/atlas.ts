/**
 * Packs a character's part pictures into one texture, so a puppet can draw all its parts in a single draw call
 * (see Puppet's batched mode). The battle draws pirates small, so the atlas stores them at a reduced scale.
 */
import * as THREE from 'three';
import type { PuppetAssets } from './puppet';

export interface Atlas {
  texture: THREE.Texture;
  /** Per picture: u0, v0 (bottom), u1, v1 (top) in the atlas. */
  rects: Record<string, [number, number, number, number]>;
}

/** Transparent border around each picture, so smaller mipmaps don't bleed neighbours into it. */
const PAD = 6;

/** Shelf-packs pictures of these sizes into a strip `width` wide; returns their corners and the height used. */
export function packShelves(sizes: { w: number; h: number }[], width: number): { at: [number, number][]; height: number } {
  const order = sizes.map((_, i) => i).sort((a, b) => sizes[b].h - sizes[a].h);
  const at: [number, number][] = sizes.map(() => [0, 0]);
  let x = 0;
  let y = 0;
  let shelf = 0;
  for (const i of order) {
    const { w, h } = sizes[i];
    if (x + w > width) {
      x = 0;
      y += shelf;
      shelf = 0;
    }
    at[i] = [x, y];
    x += w;
    shelf = Math.max(shelf, h);
  }
  return { at, height: y + shelf };
}

/** Draws every part picture at `scale` (of its sprites.json size) into one canvas texture. */
export function buildAtlas(assets: PuppetAssets, scale: number, renderer?: THREE.WebGLRenderer): Atlas {
  const names = [...new Set(assets.rig.parts.map((p) => p.img))];
  const sizes = names.map((n) => {
    const s = assets.sprites[n];
    return { w: Math.ceil(s.w * scale) + PAD * 2, h: Math.ceil(s.h * scale) + PAD * 2 };
  });
  const area = sizes.reduce((sum, s) => sum + s.w * s.h, 0);
  const widest = Math.max(...sizes.map((s) => s.w));
  const width = Math.max(widest, 2 ** Math.ceil(Math.log2(Math.sqrt(area * 1.15))));
  const { at, height } = packShelves(sizes, width);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  const rects: Atlas['rects'] = {};
  names.forEach((n, i) => {
    const [x, y] = at[i];
    const w = sizes[i].w - PAD * 2;
    const h = sizes[i].h - PAD * 2;
    ctx.drawImage(assets.textures[n].image as CanvasImageSource, x + PAD, y + PAD, w, h);
    rects[n] = [(x + PAD) / width, 1 - (y + PAD + h) / height, (x + PAD + w) / width, 1 - (y + PAD) / height];
  });
  const texture = new THREE.CanvasTexture(canvas);
  texture.premultiplyAlpha = true;
  texture.colorSpace = THREE.NoColorSpace;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1;
  return { texture, rects };
}
