import { describe, expect, it } from 'vitest';
import { blend, defaults, ease, key, layer, poseKeys } from '../../sculpt/anim';

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
});

describe('poses', () => {
  it('layer adds rotations and multiplies scales', () => {
    const p = layer({ arm: { r: [10, 0, 0], s: 2 } }, { arm: { r: [5, 1, 0], s: [1, 0.5, 1] } });
    expect(p.arm.r).toEqual([15, 1, 0]);
    expect(p.arm.s).toEqual([2, 1, 2]);
  });

  it('defaults only fill what a pose leaves out', () => {
    const p = defaults({ mouthOpen: { s: 0.001 }, arrow: { s: 0.001 } }, { arrow: { s: 1 } });
    expect(p.arrow.s).toBe(1);
    expect(p.mouthOpen.s).toBe(0.001);
  });

  it('blend fades an IK goal in by weight', () => {
    const goal = { target: [0, 1, 0] as [number, number, number], pole: [0, 0, 1] as [number, number, number] };
    const p = blend({}, { hand: { ik: goal } }, 0.25);
    expect(p.hand.ik?.w).toBeCloseTo(0.25);
    expect(p.hand.ik?.target).toEqual([0, 1, 0]);
  });

  it('poseKeys walks through whole poses', () => {
    const at = (t: number) => poseKeys(t, [[0, { a: { r: [0, 0, 0] } }], [1, { a: { r: [90, 0, 0] } }, ease.linear]]);
    expect(at(0.5).a.r?.[0]).toBeCloseTo(45);
  });
});
