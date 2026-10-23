/**
 * Dev viewer for 2D rigs: /dev/rig.html?c=hero&clip=shoot&t=0,0.3,0.45&overlay=0.5&joints=1
 * Each time in `t` gets its own copy of the character, side by side; `frames=dodge@0.2,hit@0.1` mixes clips.
 * `overlay` shows the rig-pose picture behind the rest pose (to line parts up), `joints` marks every bone,
 * `play=1` animates the first copy, `cell` and `height` set the room each copy gets (rig pixels).
 */
import * as THREE from 'three';
import { deckhandClips } from '../puppet/clips/deckhand';
import { heroClips } from '../puppet/clips/hero';
import { loadPuppet, loadTexture } from '../puppet/loader';
import type { Clip2D } from '../puppet/pose';
import { Puppet, spriteGeometry, spriteMaterial } from '../puppet/puppet';
import { createStage2D } from '../stage/stage2d';

const params = new URLSearchParams(location.search);
const id = params.get('c') ?? 'hero';
const clips: Record<string, Clip2D[]> = { hero: heroClips, deckhand: deckhandClips };
const clipName = params.get('clip');
const frames: [string | null, number][] = params.has('frames')
  ? params.get('frames')!.split(',').map((f) => [f.split('@')[0], Number(f.split('@')[1] ?? 0)])
  : (params.get('t') ?? '0').split(',').map((t) => [clipName, Number(t)]);
const overlay = Number(params.get('overlay') ?? 0);
const joints = params.get('joints') === '1';
const play = params.get('play') === '1';
const flip = params.get('flip') === '1';

const host = document.getElementById('stage')!;
const stage = createStage2D(host);
const assets = await loadPuppet(id, stage.renderer);
const findClip = (name: string | null) => {
  if (!name) return undefined;
  const c = clips[id]?.find((c) => c.name === name);
  if (!c) throw new Error(`No clip "${name}"`);
  return c;
};

const height = Number(params.get('height') ?? 1500);
const cell = Number(params.get('cell') ?? 820);
const size = Math.min(stage.height / height, stage.width / (cell * frames.length)) * 0.94;
const puppets: Puppet[] = [];
for (const [i, [name, t]] of frames.entries()) {
  const clip = findClip(name);
  const p = new Puppet(assets);
  p.size = size;
  p.facing = flip ? -1 : 1;
  p.root.position.set((i - (frames.length - 1) / 2) * cell * size, -stage.height / 2 + 30 * size, 0);
  p.setPose(clip ? clip.pose(t) : {});
  p.update(0);
  stage.scene.add(p.root);
  puppets.push(p);
  if (overlay > 0) {
    const tex = await loadTexture(`../art/sliced/${id}/rigpose.png`, stage.renderer);
    const img = tex.image as HTMLImageElement;
    const mat = spriteMaterial(tex, { value: 0 });
    mat.uniforms.opacity.value = overlay;
    const mesh = new THREE.Mesh(spriteGeometry(img.width, img.height), mat);
    mesh.position.set(-assets.rig.ground[0], assets.rig.ground[1], 0);
    mesh.renderOrder = -1;
    p.root.add(mesh);
  }
  if (joints)
    for (const b of assets.rig.bones) {
      const dot = new THREE.Mesh(new THREE.CircleGeometry(9, 12), new THREE.MeshBasicMaterial({ color: 0xff2266, depthTest: false, transparent: true }));
      dot.renderOrder = 1000;
      dot.userData.bone = b.name;
      p.root.add(dot);
    }
  const tag = document.createElement('div');
  tag.className = 'tag';
  tag.textContent = clip ? `${clip.name} @ ${t}` : 'rest';
  tag.style.left = `${stage.width / 2 + p.root.position.x}px`;
  document.body.appendChild(tag);
}

const placeJoints = (p: Puppet) =>
  p.root.children.forEach((o) => {
    if (o.userData.bone) {
      const [x, y] = p.skeleton.joint(o.userData.bone);
      o.position.set(x, y, 0);
    }
  });
puppets.forEach(placeJoints);

let last = performance.now();
let time = frames[0][1];
const clip = findClip(frames[0][0]);
function frame(now: number) {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (play && clip) {
    time = (time + dt) % clip.duration;
    puppets[0].setPose(clip.pose(time));
  }
  for (const p of puppets) {
    p.update(play ? dt : 0);
    placeJoints(p);
  }
  stage.render();
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
Object.assign(window, { __ready: true, __puppets: puppets });
