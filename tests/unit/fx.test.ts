import { describe, expect, it } from 'vitest';
import { GameTime } from '../../src/fx/time';
import { DIRECTIONS, directionTo, hexToWorld, neighbor, worldToHex } from '../../src/world/hex';

describe('game time', () => {
  it('freezes for a hit-stop, then runs normally', () => {
    const t = new GameTime();
    t.hitStop(40);
    expect(t.step(0.016)).toBe(0);
    expect(t.step(0.016)).toBe(0);
    expect(t.step(0.016)).toBe(0);
    expect(t.step(0.016)).toBe(0.016);
  });

  it('slow motion eases back to full speed', () => {
    const t = new GameTime();
    t.slowMo(0.3, 0.9);
    expect(t.step(0.1)).toBeCloseTo(0.03);
    for (let i = 0; i < 8; i++) t.step(0.1);
    expect(t.step(0.1)).toBeCloseTo(0.1);
  });
});

describe('hex grid', () => {
  it('round-trips hex <-> world', () => {
    for (const h of [{ q: 0, r: 0 }, { q: 3, r: -2 }, { q: -4, r: 5 }]) {
      const w = hexToWorld(h, 2.5);
      expect(worldToHex(w.x, w.z, 2.5)).toEqual(h);
    }
  });

  it('knows which edge leads to each neighbour', () => {
    DIRECTIONS.forEach((_, d) => expect(directionTo({ q: 1, r: 1 }, neighbor({ q: 1, r: 1 }, d))).toBe(d));
  });
});
