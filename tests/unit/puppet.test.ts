import { describe, expect, it } from 'vitest';
import { blend, layer } from '../../src/puppet/pose';
import { apply, fitAffine, fitAffine3, mul, partMatrix, Skeleton2D, spritePoint, type RigDef, type Vec2 } from '../../src/puppet/rig';

const close = (a: Vec2, b: Vec2, digits = 3) => {
  expect(a[0]).toBeCloseTo(b[0], digits);
  expect(a[1]).toBeCloseTo(b[1], digits);
};

// A toy arm on a rig pose (y-down pixels): shoulder, elbow, wrist hanging straight down from a body.
const rig: RigDef = {
  id: 'toy',
  ground: [100, 400],
  bones: [
    { name: 'body', at: [100, 300] },
    { name: 'upper', parent: 'body', at: [100, 100] },
    { name: 'lower', parent: 'upper', at: [100, 160] },
    { name: 'hand', parent: 'lower', at: [100, 220] },
  ],
  parts: [],
};

describe('part fitting', () => {
  it('carries two image points onto their rig-pose points', () => {
    const m = fitAffine([0, 0], [10, 0], [5, 5], [5, 25]);
    close(apply(m, [0, 0]), [5, 5]);
    close(apply(m, [10, 0]), [5, 25]);
    close(apply(m, [0, 10]), [-15, 5]); // turned 90° and scaled 2×, proportions kept
  });

  it('squashes lengthwise only when given a width', () => {
    const m = fitAffine([0, 0], [100, 0], [0, 0], [50, 0], 1);
    close(apply(m, [100, 0]), [50, 0]);
    close(apply(m, [0, 30]), [0, 30]);
  });

  it('skews a part with three points', () => {
    const m = fitAffine3([[0, 0], [10, 0], [0, 10]], [[1, 1], [21, 1], [3, 11]]);
    close(apply(m, [10, 0]), [21, 1]);
    close(apply(m, [0, 10]), [3, 11]);
    close(apply(m, [10, 10]), [23, 11]);
  });

  it('pins a sprite to its bone in y-up bone space', () => {
    const sprite = { w: 40, h: 120, ox: 500, oy: 600 };
    // The sprite's top and bottom ball, on its sheet, land on the shoulder and elbow.
    const part = { name: 'upper', img: 'upper', bone: 'upper', z: 0, from: [[520, 610], [520, 710]] as [Vec2, Vec2], to: [[100, 100], [100, 160]] as [Vec2, Vec2] };
    const m = partMatrix(part, sprite, [100, 100]);
    close(apply(m, spritePoint(sprite, [520, 610])), [0, 0]);
    close(apply(m, spritePoint(sprite, [520, 710])), [0, -60]);
  });
});

describe('2D skeleton', () => {
  it('places joints at rest relative to the ground', () => {
    const s = new Skeleton2D(rig);
    s.solve({});
    close(s.joint('body'), [0, 100]);
    close(s.joint('upper'), [0, 300]);
    close(s.joint('hand'), [0, 180]);
  });

  it('turns children around a rotated joint', () => {
    const s = new Skeleton2D(rig);
    s.solve({ bones: { upper: { r: 90 } } });
    // The arm hung down; turning it 90° counter-clockwise swings it out to the right.
    close(s.joint('lower'), [60, 300]);
    close(s.joint('hand'), [120, 300]);
  });

  it('puts the hand on an IK target and keeps a world angle goal', () => {
    const s = new Skeleton2D(rig);
    const target: Vec2 = [70, 260];
    s.solve({ ik: { hand: { target, bend: 1 } }, bones: { hand: { wr: 30 } } });
    close(s.joint('hand'), target, 2);
    expect((s.angle.get('hand')! * 180) / Math.PI).toBeCloseTo(30, 3);
    // Unreachable targets stretch the arm straight towards them.
    s.solve({ ik: { hand: { target: [0, 1000] } } });
    expect(s.joint('hand')[1]).toBeCloseTo(300 + 120, 1);
  });

  it('applies offsets and squash through the hierarchy', () => {
    const s = new Skeleton2D(rig);
    s.solve({ bones: { body: { y: 10, sy: 0.5 } } });
    close(s.joint('upper'), [0, 110 + 100]);
    const m = mul(s.world.get('body')!, [1, 0, 0, 1, 0, 0]);
    expect(m[3]).toBeCloseTo(0.5);
  });
});

describe('poses', () => {
  it('layers rotations and blends numbers while switching slots halfway', () => {
    const a = layer({ bones: { upper: { r: 10 } }, slots: { eyes: 'open' } }, { bones: { upper: { r: 5, sy: 0.9 } } });
    expect(a.bones!.upper).toMatchObject({ r: 15, sy: 0.9 });
    const b = { bones: { upper: { r: 35 } }, slots: { eyes: 'happy' }, draw: 1 };
    const mid = blend(a, b, 0.25);
    expect(mid.bones!.upper.r).toBeCloseTo(20);
    expect(mid.slots!.eyes).toBe('open');
    expect(mid.draw).toBeCloseTo(0.25);
    expect(blend(a, b, 0.75).slots!.eyes).toBe('happy');
  });
});
