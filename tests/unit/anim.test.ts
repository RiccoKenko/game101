import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { ease, key } from '../../src/anim/curves';
import { CLIPS } from '../../src/puppet/clips';
import { poseKeys } from '../../src/puppet/pose';
import type { RigDef } from '../../src/puppet/rig';

describe('keyframes', () => {
  it('holds the ends and interpolates between keys', () => {
    const keys: [number, number][] = [[0, 0], [1, 10]];
    expect(key(-1, keys)).toBe(0);
    expect(key(2, keys)).toBe(10);
    expect(key(0.5, keys.map(([t, v]) => [t, v, ease.linear]))).toBeCloseTo(5);
  });

  it('back easing overshoots before settling', () => {
    const samples = Array.from({ length: 21 }, (_, i) => ease.back(i / 20));
    expect(Math.max(...samples)).toBeGreaterThan(1);
    expect(ease.back(1)).toBeCloseTo(1);
  });

  it('poseKeys walks through whole poses', () => {
    const at = (t: number) => poseKeys(t, [[0, { bones: { a: { r: 0 } } }], [1, { bones: { a: { r: 90 } } }, ease.linear]]);
    expect(at(0.5).bones!.a.r).toBeCloseTo(45);
  });
});

// Every character with a published rig: its clips may only name what that rig has ('none' empties a slot).
for (const [id, clips] of Object.entries(CLIPS)) {
  const file = `public/sprites/${id}/rig.json`;
  if (!existsSync(file) || !clips.length) continue;
  const rig = JSON.parse(readFileSync(file, 'utf8')) as RigDef;
  describe(`${id} clips`, () => {
    const bones = new Set(rig.bones.map((b) => b.name));
    const parts = new Map(rig.parts.map((p) => [p.name, p]));
    const slots = new Set(rig.parts.map((p) => p.slot));
    for (const clip of clips)
      it(`${clip.name}: only uses bones, slots and parts the rig has`, () => {
        for (let t = 0; t <= clip.duration; t += clip.duration / 8) {
          const pose = clip.pose(t);
          for (const b of [...Object.keys(pose.bones ?? {}), ...Object.keys(pose.ik ?? {})]) expect(bones.has(b), `${clip.name}: bone ${b}`).toBe(true);
          for (const [slot, part] of Object.entries(pose.slots ?? {}))
            if (part === 'none') expect(slots.has(slot), `${clip.name}: slot ${slot}`).toBe(true);
            else expect(parts.get(part)?.slot, `${clip.name}: ${slot}=${part}`).toBe(slot);
          for (const part of Object.keys(pose.z ?? {})) expect(parts.has(part), `${clip.name}: z ${part}`).toBe(true);
        }
      });
  });
}
