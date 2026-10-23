import { describe, expect, it } from 'vitest';
import { deckhand } from '../../sculpt/characters/deckhand';
import { hero } from '../../sculpt/characters/hero';
import { SkeletonEval } from '../../sculpt/skeleton';

describe('two-bone IK', () => {
  it('puts the hand on a reachable target', () => {
    const skel = new SkeletonEval(hero.bones);
    // Within arm's reach of the left shoulder (upper + lower arm ≈ 0.22).
    const target: [number, number, number] = [0.15, 0.4, 0.12];
    skel.apply({ 'hand.L': { ik: { target, pole: [0.4, 0.3, 0] } } });
    const hand = skel.world('hand.L');
    expect(hand.distanceTo({ x: target[0], y: target[1], z: target[2] } as never)).toBeLessThan(0.002);
  });
});

describe('hero shot', () => {
  it('points the nocked arrow straight ahead at full draw', () => {
    const skel = new SkeletonEval(hero.bones);
    const clip = hero.clips.find((c) => c.name === 'shoot')!;
    skel.apply(clip.pose(0.47));
    const arrow = skel.nodes.get('arrow')!;
    arrow.updateWorldMatrix(true, false);
    const e = arrow.matrixWorld.elements;
    // Third column = the bone's +Z axis in world space.
    expect(e[10]).toBeGreaterThan(0.99);
  });
});

describe('clips', () => {
  for (const def of [hero, deckhand])
    it(`${def.name}: every clip only animates bones that exist`, () => {
      const names = new Set(def.bones.map((b) => b.name));
      for (const clip of def.clips)
        for (const t of [0, clip.duration / 2, clip.duration])
          for (const bone of Object.keys(clip.pose(t))) expect(names.has(bone), `${clip.name}: ${bone}`).toBe(true);
    });
});
