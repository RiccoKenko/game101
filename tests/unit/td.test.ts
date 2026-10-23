import { describe, expect, it } from 'vitest';
import { Battle, type BattleEvent } from '../../src/td/battle';
import { nextCost, Purse, sellValue } from '../../src/td/economy';
import { checkLevel, LEVEL1, type LevelDef } from '../../src/td/levels';
import { closedCurve, insidePolygon, Path } from '../../src/td/path';
import { intercept, pickTarget, type Targetable } from '../../src/td/targeting';
import { TOWERS } from '../../src/td/units';
import { stars, Vault } from '../../src/td/vault';
import { WaveRunner } from '../../src/td/waves';

/** Steps the battle in frames until `done` or `seconds` pass; returns every event seen. */
function run(b: Battle, seconds: number, done: (e: BattleEvent[]) => boolean = () => false, each?: () => void): BattleEvent[] {
  const all: BattleEvent[] = [];
  for (let t = 0; t < seconds && !b.over; t += 1 / 30) {
    each?.();
    b.step(1 / 30);
    all.push(...b.drain());
    if (done(all)) break;
  }
  return all;
}

const FAR_AWAY: LevelDef = { ...LEVEL1, heroStart: [-5000, -5000] };

describe('road', () => {
  it('measures a straight road and finds points along it', () => {
    const p = new Path([[0, 0], [100, 0], [200, 0]]);
    expect(p.length).toBeCloseTo(200);
    expect(p.at(50)[0]).toBeCloseTo(50);
    expect(p.at(-10)).toEqual([0, 0]);
    expect(p.dirAt(120)[0]).toBeCloseTo(1);
    const n = p.nearest([150, 30]);
    expect(n.d).toBeCloseTo(150);
    expect(n.dist).toBeCloseTo(30);
  });

  it('tells inside from outside of a smooth outline', () => {
    const blob = closedCurve([[0, 0], [100, 0], [100, 100], [0, 100]]);
    expect(insidePolygon(blob, [50, 50])).toBe(true);
    expect(insidePolygon(blob, [150, 50])).toBe(false);
  });

  it('level 1 is laid out cleanly', () => {
    expect(checkLevel(LEVEL1)).toEqual([]);
  });
});

describe('vault', () => {
  it('gives out crystals until empty, and loses the escaped ones', () => {
    const v = new Vault(2);
    expect(v.take(1)?.carrier).toBe(1);
    expect(v.take(2)?.carrier).toBe(2);
    expect(v.take(3)).toBeNull();
    expect(v.escape(1)?.state).toBe('lost');
    expect(v.escape(3)).toBeNull();
    expect(v.remaining).toBe(1);
  });

  it('a dropped crystal floats back home', () => {
    const v = new Vault(1, 100);
    v.take(7);
    v.drop(7, 400);
    expect(v.dropped()).toHaveLength(1);
    expect(v.update(1, 600)).toHaveLength(0);
    expect(v.update(1.5, 600)).toHaveLength(1);
    expect(v.stored).toBe(1);
  });

  it('stars follow the crystals left', () => {
    expect(stars(20, 20)).toBe(3);
    expect(stars(18, 20)).toBe(3);
    expect(stars(12, 20)).toBe(2);
    expect(stars(3, 20)).toBe(1);
  });
});

describe('waves', () => {
  const waves = () => new WaveRunner([
    { groups: [{ enemy: 'deckhand', count: 3, gap: 1 }], rest: 10 },
    { groups: [{ enemy: 'powderMonkey', count: 2, gap: 0.5 }, { enemy: 'deckhand', count: 1, gap: 1, delay: 0.25 }] },
  ]);

  it('waits for the player, then spawns on schedule', () => {
    const w = waves();
    expect(w.update(30)).toEqual([]);
    expect(w.callNext()).toBe(0);
    expect(w.update(0)).toEqual(['deckhand']);
    expect(w.update(0.5)).toEqual([]);
    expect(w.update(0.5)).toEqual(['deckhand']);
    expect(w.canCall).toBe(false);
    expect(w.update(1)).toEqual(['deckhand']);
    expect(w.countdown).toBe(10);
  });

  it('calling early pays for the time skipped; otherwise the next wave starts by itself', () => {
    const early = waves();
    early.callNext();
    early.update(2);
    early.update(4);
    expect(early.callNext()).toBe(6);
    expect(early.update(0.6)).toEqual(['powderMonkey', 'deckhand', 'powderMonkey']);
    expect(early.finished).toBe(true);

    const patient = waves();
    patient.callNext();
    patient.update(2);
    patient.update(9.9);
    expect(patient.wave).toBe(0);
    expect(patient.update(0.2)).toEqual(['powderMonkey']);
    expect(patient.wave).toBe(1);
  });
});

describe('targeting', () => {
  const t = (id: number, x: number, progress: number, carrying = false, flying = false): Targetable => ({ id, pos: [x, 0], progress, carrying, flying });
  const list = [t(1, 50, 100), t(2, 150, 300), t(3, 120, 200, true), t(4, 500, 900), t(5, 20, 50, false, true)];

  it('picks by mode, only in range', () => {
    expect(pickTarget([0, 0], 200, list, 'first')?.id).toBe(2);
    expect(pickTarget([0, 0], 200, list, 'nearest')?.id).toBe(5);
    expect(pickTarget([0, 0], 200, list, 'carrier')?.id).toBe(3);
    expect(pickTarget([0, 0], 200, list, 'nearest', false)?.id).toBe(1);
    expect(pickTarget([0, 0], 10, list)).toBeNull();
  });

  it('leads a moving target', () => {
    const aim = intercept([0, 0], [300, 0], [0, 100], 500);
    const tHit = Math.hypot(aim[0], aim[1]) / 500;
    expect(aim[0]).toBeCloseTo(300);
    expect(aim[1]).toBeCloseTo(100 * tHit);
    expect(intercept([0, 0], [100, 0], [1000, 0], 10)).toEqual([100, 0]);
  });
});

describe('economy', () => {
  it('spends only what it has; selling returns 60%', () => {
    const p = new Purse(100);
    expect(p.spend(70)).toBe(true);
    expect(p.spend(70)).toBe(false);
    expect(p.gold).toBe(30);
    expect(nextCost(TOWERS.archer, 0)).toBe(70);
    expect(nextCost(TOWERS.archer, 3)).toBeNull();
    expect(sellValue(TOWERS.archer, 2)).toBe(Math.floor((70 + 110) * 0.6));
  });
});

describe('battle', () => {
  it('builds, upgrades and sells on tower spots', () => {
    const b = new Battle(LEVEL1);
    expect(b.build(0)?.level).toBe(1);
    expect(b.build(0)).toBeNull();
    expect(b.purse.gold).toBe(150);
    expect(b.upgrade(0)?.level).toBe(2);
    expect(b.purse.gold).toBe(40);
    expect(b.upgrade(0)).toBeNull();
    expect(b.sell(0)).toBe(108);
    expect(b.towers[0]).toBeNull();
  });

  it('the hero walks only on the island', () => {
    const b = new Battle(LEVEL1);
    expect(b.moveHero([20, 20])).toBe(false);
    expect(b.moveHero([700, 300])).toBe(true);
    run(b, 5);
    expect(b.hero.pos[0]).toBeCloseTo(700);
    expect(b.hero.pos[1]).toBeCloseTo(300);
  });

  it('undefended, pirates carry crystals off to the dock', () => {
    const b = new Battle({ ...FAR_AWAY, waves: [LEVEL1.waves[0]] });
    b.callWave();
    const events = run(b, 300);
    expect(events.filter((e) => e.type === 'spawn')).toHaveLength(6);
    expect(events.filter((e) => e.type === 'steal')).toHaveLength(6);
    expect(b.vault.lost).toBe(6);
    expect(events.at(-1)).toEqual({ type: 'win', stars: 2 });
  });

  it('losing every crystal loses the level', () => {
    const b = new Battle({ ...FAR_AWAY, crystals: 3 });
    b.callWave();
    run(b, 200);
    expect(b.state).toBe('lost');
    expect(b.vault.remaining).toBe(0);
  });

  it('a shot-down carrier drops its crystal, which floats home', () => {
    const b = new Battle({ ...FAR_AWAY, waves: [{ groups: [{ enemy: 'deckhand', count: 1, gap: 1 }] }] });
    b.callWave();
    run(b, 200, (e) => e.some((x) => x.type === 'steal'));
    const carrier = b.enemies[0];
    expect(carrier.carrying).toBe(true);
    carrier.hp = 1;
    b.hero.pos = [carrier.pos[0] - 120, carrier.pos[1]];
    const events = run(b, 120, (e) => e.some((x) => x.type === 'recover'));
    expect(events.map((e) => e.type)).toEqual(expect.arrayContaining(['draw', 'shoot', 'hit', 'kill', 'drop', 'recover', 'win']));
    expect(b.vault.stored).toBe(20);
    expect(b.state).toBe('won');
  });

  it('level 1 can be won with towers and the hero', () => {
    const b = new Battle(LEVEL1, 7);
    const order = [5, 3, 1, 7, 4, 0, 2, 6];
    b.callWave();
    const events = run(b, 900, undefined, () => {
      const empty = order.find((s) => !b.towers[s]);
      if (empty !== undefined) b.build(empty);
      else {
        const low = order.map((s) => b.towers[s]!).sort((x, y) => x.level - y.level)[0];
        b.upgrade(low.slot);
      }
    });
    expect(b.state).toBe('won');
    const win = events.find((e) => e.type === 'win');
    expect(win && win.type === 'win' && win.stars).toBeGreaterThanOrEqual(2);
  });
});
