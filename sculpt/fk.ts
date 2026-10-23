/**
 * Forward kinematics probe for tuning poses without rendering:
 *   npx tsx sculpt/fk.ts hero shoot 0.45 arrow hand.R nock
 * prints world positions (and the +Z direction) of the named bones at that moment of the clip.
 */
import * as THREE from 'three';
import type { CharacterDef } from './character';
import { SkeletonEval } from './skeleton';
import { deckhand } from './characters/deckhand';
import { hero } from './characters/hero';

const DEFS: Record<string, CharacterDef> = { hero, deckhand };
const [name = 'hero', clipName = 'idle', time = '0', ...watch] = process.argv.slice(2);
const def = DEFS[name];
const clip = def.clips.find((c) => c.name === clipName)!;
const pose = clip.pose(Number(time));

const skel = new SkeletonEval(def.bones);
skel.apply(pose);
const nodes = skel.nodes;
for (const w of watch.length ? watch : ['arrow', 'hand.L', 'hand.R', 'nock', 'head']) {
  const o = nodes.get(w)!;
  const p = o.getWorldPosition(new THREE.Vector3());
  const fwd = new THREE.Vector3(0, 0, 1).transformDirection(o.matrixWorld);
  const up = new THREE.Vector3(0, 1, 0).transformDirection(o.matrixWorld);
  const f = (v: THREE.Vector3) => v.toArray().map((x) => x.toFixed(3).padStart(7)).join(' ');
  console.log(`${w.padEnd(12)} pos ${f(p)}   +Z ${f(fwd)}   +Y ${f(up)}`);
}
