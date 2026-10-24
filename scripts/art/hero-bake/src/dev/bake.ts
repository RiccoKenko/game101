/**
 * Bakes a puppet (the archer, or the old hero) into sprite frames: /dev/bake.html, driven by scripts/bake-hero.mjs.
 * Renders ONLY the puppet on a fully transparent canvas (premultiplied alpha, cleared to 0), facing right,
 * through an orthographic camera whose origin is the puppet's feet, so every frame has the same scale and
 * baseline. Time is stepped in small fixed substeps (springy hood and capelet stay deterministic) and a frame is
 * read back raw (premultiplied RGBA, rows bottom-up) whenever the driver asks for one.
 */
import * as THREE from 'three';
import { CLIPS } from '../puppet/clips';
import { heroClips, STAND } from '../puppet/clips/hero';
import { loadPuppet } from '../puppet/loader';
import { ease, key } from '../anim/curves';
import { blend, layer, type Clip2D, type Pose2D } from '../puppet/pose';
import { Puppet, type PuppetAssets } from '../puppet/puppet';

const osc = (t: number, period: number, phase = 0) => Math.sin(2 * Math.PI * (t / period + phase));
let id = 'hero';
const clip = (name: string) => {
  const c = (id === 'hero' ? heroClips : CLIPS[id] ?? []).find((k) => k.name === name);
  if (!c) throw new Error(`No ${id} clip "${name}"`);
  return c;
};

/**
 * hero.ts's breathing, re-timed so one bob and one sway fill `period` (a short loop closes seamlessly). The bob
 * lowers the torso instead of the hips, so the feet stay planted on the baseline.
 */
const breathe = (t: number, period: number, amount: number): Pose2D => ({
  bones: {
    torso: { y: -3 * amount * (1 + osc(t, period)), sy: 1 + 0.012 * amount * osc(t, period, 0.15), r: 1.2 * amount * osc(t, period, 0.6) },
    head: { r: 2 * amount * osc(t, period, 0.75) },
    'upperArm.r': { r: 2 * amount * osc(t, period, 0.4) },
    'upperArm.l': { r: -1.5 * amount * osc(t, period, 0.45) },
    hoodTip: { r: 3 * amount * osc(t, period, 0.9) },
  },
});

interface AnimOpts {
  /** Loop length in seconds (breathing loops). */
  period?: number;
  /** Breathing strength (1 = hero.ts's idle). */
  amount?: number;
  /** Cheer: fraction of the clip's jump height to keep (its full hop lifts the raised bow out of the frame). */
  hop?: number;
  /** Run: rig px to raise the body, so the planted foot lands on the standing soles' line. */
  raise?: number;
}

interface Anim {
  pose: (t: number) => Pose2D;
  /** Loops pre-roll with their own motion; one-shots hold their first pose so the springs settle. */
  loop: boolean;
}

const clamp = (t: number, d: number) => Math.min(d, Math.max(0, t));

function anim(name: string, o: AnimOpts): Anim {
  if (id !== 'hero') return plain(clip(name));
  const period = o.period ?? 1.6;
  const amount = o.amount ?? 1;
  const rapid = clip('rapid');
  /** `rapid` at full draw, arrow nocked: the ready-to-fire hold. */
  const FULL_DRAW = 0.22;
  /** Idle's first frame offsets, so one-shots out of the aiming idle start and end exactly on it. */
  const rest = breathe(0, period, amount);
  switch (name) {
    // Calm idle: hero.ts's idle (STAND + breathing), re-timed to one breath per loop.
    case 'idle':
      return { loop: true, pose: (t) => layer(STAND, breathe(t, period, amount)) };
    // Ready/aiming idle: `rapid` held at full draw with the same breathing.
    case 'idleAim':
      return { loop: true, pose: (t) => layer(rapid.pose(FULL_DRAW), breathe(t, period, amount)) };
    // One `rapid` cycle from its release: snap, hand back to the string, re-draw to full (= idleAim).
    case 'shootRapid':
      return { loop: false, pose: (t) => layer(rapid.pose(t < 0 ? FULL_DRAW : (0.25 + t) % 0.5), rest) };
    // `shoot`'s release (string snaps, hand flies back and opens, body rocks), then `rapid`'s re-draw to full.
    case 'shootFling': {
      const shoot = clip('shoot');
      return {
        loop: false,
        pose: (t) => {
          if (t < 0) return layer(rapid.pose(FULL_DRAW), rest);
          if (t < 0.15) return layer(shoot.pose(0.5 + t), rest);
          const u = t - 0.15;
          const w = key(u, [[0, 0], [0.08, 1, ease.inOut]]);
          return layer(blend(shoot.pose(0.5 + t), rapid.pose(clamp(u - 0.05, FULL_DRAW - 0.02)), w), rest);
        },
      };
    }
    case 'run': {
      const run = clip('run');
      const lift: Pose2D = { bones: { hips: { y: o.raise ?? 0 } } };
      return { loop: true, pose: (t) => layer(run.pose(((t % run.duration) + run.duration) % run.duration), lift) };
    }
    case 'cheer': {
      const cheer = clip('cheer');
      const hop = o.hop ?? 1;
      return {
        loop: false,
        pose: (t) => {
          t = clamp(t, cheer.duration);
          const p = cheer.pose(t);
          // hero.ts's cheer lifts the hips by 150 * air; keep `hop` of that.
          const air = key(t, [[0.18, 0], [0.42, 1, ease.out], [0.66, 0, ease.in]]);
          p.bones!.hips.y = (p.bones!.hips.y ?? 0) - (1 - hop) * 150 * air;
          return p;
        },
      };
    }
    default:
      return plain(clip(name));
  }
}

/** A clip as it is: loops wrap (and pre-roll through their own motion), one-shots hold their ends. */
function plain(c: Clip2D): Anim {
  return { loop: c.loop, pose: (t) => c.pose(c.loop ? ((t % c.duration) + c.duration) % c.duration : clamp(t, c.duration)) };
}

const SUBSTEP = 1 / 240;
let renderer: THREE.WebGLRenderer | undefined;
let camera: THREE.OrthographicCamera | undefined;
const scene = new THREE.Scene();
let assets: PuppetAssets;
let puppet: Puppet | undefined;
let current: Anim | undefined;
let time = 0;
let size = 0;
let scaleK = 1;
let pixels = new Uint8Array(0);

/** Steps the puppet to clip time `to` in equal substeps of at most SUBSTEP; the last one lands exactly on `to`. */
function advance(to: number) {
  const n = Math.ceil((to - time) / SUBSTEP - 1e-6);
  if (n <= 0) return;
  const from = time;
  const dt = (to - from) / n;
  for (let i = 1; i <= n; i++) {
    time = i === n ? to : from + i * dt;
    puppet!.setPose(current!.pose(time));
    puppet!.update(dt);
  }
}

async function toBase64(buf: Uint8Array): Promise<string> {
  const url = await new Promise<string>((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result as string);
    fr.onerror = () => reject(fr.error);
    fr.readAsDataURL(new Blob([buf.buffer as ArrayBuffer]));
  });
  return url.slice(url.indexOf(',') + 1);
}

const api = {
  /**
   * `id`: the character (public/sprites/<id>/, clips from CLIPS). `size`: square canvas in render px. `feet`: where
   * the puppet's ground point lands, render px from the top left. `scale`: render px per rig px. `stringWidth`:
   * bowstring thickness in rig px (the rigs' own is 4).
   */
  async setup(o: { id?: string; size: number; feet: [number, number]; scale: number; stringWidth: number }) {
    if (!renderer) {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, premultipliedAlpha: true, preserveDrawingBuffer: true });
      renderer.setPixelRatio(1);
      renderer.toneMapping = THREE.NoToneMapping;
      renderer.setClearColor(0x000000, 0);
      document.body.appendChild(renderer.domElement);
    }
    if (!assets || (o.id ?? 'hero') !== id) {
      id = o.id ?? 'hero';
      assets = await loadPuppet(id, renderer);
    }
    size = o.size;
    scaleK = o.scale;
    renderer.setSize(size, size);
    camera = new THREE.OrthographicCamera(-o.feet[0], size - o.feet[0], o.feet[1], o.feet[1] - size, 0.1, 2000);
    camera.position.set(0, 0, 1000);
    assets.rig.string!.width = o.stringWidth;
    pixels = new Uint8Array(size * size * 4);
  },

  /** A fresh puppet playing `name`, pre-rolled so its springs are settled (loops: in their periodic motion). */
  start(name: string, o: AnimOpts = {}) {
    if (puppet) {
      scene.remove(puppet.root);
      puppet.dispose();
    }
    puppet = new Puppet(assets);
    puppet.facing = 1;
    puppet.size = scaleK;
    // No random blinks: the frames must be reproducible.
    (puppet as unknown as { blinkIn: number }).blinkIn = Infinity;
    scene.add(puppet.root);
    current = anim(name, o);
    const pre = current.loop ? 3 * (o.period ?? 1) + 2 : 1.5;
    time = -pre;
    puppet.setPose(current.pose(time));
    puppet.update(0);
    advance(0);
  },

  /** World transforms of some bones (after the last frame), to prove clips share a body frame for frame. */
  bones(names: string[]): Record<string, number[]> {
    return Object.fromEntries(names.map((n) => [n, [...puppet!.skeleton.world.get(n)!]]));
  },

  /** Steps to clip time `t` (never backwards), renders and returns the raw premultiplied RGBA as base64. */
  async frame(t: number): Promise<string> {
    advance(t);
    renderer!.setClearColor(0x000000, 0);
    renderer!.clear(true, true, true);
    renderer!.render(scene, camera!);
    const gl = renderer!.getContext();
    gl.readPixels(0, 0, size, size, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
    return toBase64(pixels);
  },
};

Object.assign(window, { __bake: api, __ready: true });
