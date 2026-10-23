/**
 * Loads a character's published sprites (public/sprites/<id>/: rig.json, sprites.json and one PNG per part).
 * The single-file build puts them all in window.__ASSETS__ instead, keyed by the same paths.
 */
import * as THREE from 'three';
import type { PuppetAssets } from './puppet';
import type { RigDef, SpriteInfo } from './rig';

declare global {
  interface Window {
    __ASSETS__?: Record<string, unknown>;
  }
}

const BASE = import.meta.env.BASE_URL;

export async function loadJson<T>(path: string): Promise<T> {
  const inline = window.__ASSETS__?.[path];
  if (inline) return inline as T;
  const res = await fetch(BASE + path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return (await res.json()) as T;
}

const loader = new THREE.TextureLoader();

/** A sprite texture with premultiplied alpha and mipmaps, ready for `spriteMaterial`. */
export async function loadTexture(path: string, renderer?: THREE.WebGLRenderer): Promise<THREE.Texture> {
  const inline = window.__ASSETS__?.[path];
  const tex = await loader.loadAsync(typeof inline === 'string' ? inline : BASE + path);
  tex.premultiplyAlpha = true;
  tex.colorSpace = THREE.NoColorSpace;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.anisotropy = renderer?.capabilities.getMaxAnisotropy() ?? 1;
  return tex;
}

export async function loadPuppet(id: string, renderer?: THREE.WebGLRenderer): Promise<PuppetAssets> {
  const dir = `sprites/${id}/`;
  const [rig, sprites] = await Promise.all([loadJson<RigDef>(dir + 'rig.json'), loadJson<Record<string, SpriteInfo>>(dir + 'sprites.json')]);
  const names = new Set(rig.parts.map((p) => p.img));
  if (rig.arrow) names.add(rig.arrow.img);
  const textures: Record<string, THREE.Texture> = {};
  await Promise.all([...names].map(async (n) => (textures[n] = await loadTexture(`${dir}${n}.png`, renderer))));
  return { rig, sprites, textures };
}
