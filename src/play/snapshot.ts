/**
 * A still picture of a puppet, rendered once off-screen: the skill buttons' icons and stand-in story portraits
 * for characters whose portraits aren't drawn yet.
 */
import * as THREE from 'three';
import { Animator2D } from '../puppet/animator';
import type { Clip2D } from '../puppet/pose';
import { Puppet, type PuppetAssets } from '../puppet/puppet';

export interface SnapshotOptions {
  /** Pose to hold: a clip and a time into it (the rest pose if left out). */
  clip?: string;
  t?: number;
  /** The square to frame, in character space (rig px, facing right, y up from the feet): centre and half-size. */
  centre: [number, number];
  radius: number;
  /** Output size in pixels. */
  size: number;
  facing?: 1 | -1;
}

/** Renders the puppet into a transparent square canvas. */
export function snapshotPuppet(renderer: THREE.WebGLRenderer, assets: PuppetAssets, clips: Clip2D[], o: SnapshotOptions): HTMLCanvasElement {
  const puppet = new Puppet(assets);
  puppet.size = 1;
  puppet.facing = o.facing ?? 1;
  if (o.clip) {
    const anim = new Animator2D(clips);
    anim.play(o.clip, { fade: 0 });
    puppet.setPose(anim.update(o.t ?? 0));
  }
  puppet.update(0);
  const scene = new THREE.Scene();
  scene.add(puppet.root);
  const [cx, cy] = o.centre;
  const x = cx * (o.facing ?? 1);
  const camera = new THREE.OrthographicCamera(x - o.radius, x + o.radius, cy + o.radius, cy - o.radius, 0.1, 2000);
  camera.position.z = 1000;
  const target = new THREE.WebGLRenderTarget(o.size, o.size, { samples: 4 });
  const clear = renderer.getClearColor(new THREE.Color());
  const alpha = renderer.getClearAlpha();
  renderer.setRenderTarget(target);
  renderer.setClearColor(0x000000, 0);
  renderer.clear();
  renderer.render(scene, camera);
  const pixels = new Uint8Array(o.size * o.size * 4);
  renderer.readRenderTargetPixels(target, 0, 0, o.size, o.size, pixels);
  renderer.setRenderTarget(null);
  renderer.setClearColor(clear, alpha);
  target.dispose();
  puppet.dispose();

  // The sprites draw premultiplied and WebGL rows run bottom-up: flip, and divide the colour back out.
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = o.size;
  const ctx = canvas.getContext('2d')!;
  const image = ctx.createImageData(o.size, o.size);
  for (let row = 0; row < o.size; row++) {
    const from = (o.size - 1 - row) * o.size * 4;
    for (let i = 0; i < o.size * 4; i += 4) {
      const a = pixels[from + i + 3];
      const k = a ? 255 / a : 0;
      const to = row * o.size * 4 + i;
      image.data[to] = Math.min(255, pixels[from + i] * k);
      image.data[to + 1] = Math.min(255, pixels[from + i + 1] * k);
      image.data[to + 2] = Math.min(255, pixels[from + i + 2] * k);
      image.data[to + 3] = a;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}
