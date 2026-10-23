import { describe, expect, it } from 'vitest';
import { ease, key } from '../../src/anim/curves';
import { heroClips } from '../../src/puppet/clips/hero';
import { poseKeys } from '../../src/puppet/pose';
import rig from '../../public/sprites/hero/rig.json';

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

describe('hero clips', () => {
  const bones = new Set(rig.bones.map((b) => b.name));
  const parts = new Map(rig.parts.map((p) => [p.name, p]));
  for (const clip of heroClips)
    it(`${clip.name}: only uses bones, slots and parts the rig has`, () => {
      for (let t = 0; t <= clip.duration; t += clip.duration / 8) {
        const pose = clip.pose(t);
        for (const b of [...Object.keys(pose.bones ?? {}), ...Object.keys(pose.ik ?? {})]) expect(bones.has(b), `${clip.name}: bone ${b}`).toBe(true);
        for (const [slot, part] of Object.entries(pose.slots ?? {})) expect(parts.get(part)?.slot, `${clip.name}: ${slot}=${part}`).toBe(slot);
        for (const part of Object.keys(pose.z ?? {})) expect(parts.has(part), `${clip.name}: z ${part}`).toBe(true);
      }
    });
});
