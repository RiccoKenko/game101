import { describe, expect, it } from 'vitest';
import { Battle, type BattleEvent } from '../../src/td/battle';
import { branchCost, nextCost, Purse, sellValue } from '../../src/td/economy';
import { checkLevel, LEVEL1, type LevelDef } from '../../src/td/levels';
import { closedCurve, insidePolygon, Path } from '../../src/td/path';
import { intercept, pickTarget, type Targetable } from '../../src/td/targeting';
import { afterArmor, ENEMIES, SKILLS, TOWERS, type Branch, type EnemyKind, type TowerKind } from '../../src/td/units';
import { CARDS, type CardId } from '../../src/td/cards';
import { stars, Vault } from '../../src/td/vault';
import { WaveRunner } from '../../src/td/waves';

/** Steps the battle in frames until `done` or `seconds` pass; returns every event seen. Takes the first order offered. */
function run(b: Battle, seconds: number, done: (e: BattleEvent[]) => boolean = () => false, each?: () => void): BattleEvent[] {
  const all: BattleEvent[] = [];
  for (let t = 0; t < seconds && !b.over; t += 1 / 30) {
    if (b.choice) b.choose(0);
    each?.();
    b.step(1 / 30);
    all.push(...b.drain());
    if (done(all)) break;
  }
  return all;
}

const FAR_AWAY: LevelDef = { ...LEVEL1, heroStart: [-5000, -5000] };
/** Level 1 with the hero out of the way and one made-up wave. */
const only = (enemy: EnemyKind, count = 1, gap = 1): LevelDef => ({ ...FAR_AWAY, waves: [{ groups: [{ enemy, count, gap }] }] });
/** Slot 0 sits beside the first bend after the dock. */
const NEAR_DOCK = 0;

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
    expect(v.escape(1).map((c) => c.state)).toEqual(['lost']);
    expect(v.escape(3)).toEqual([]);
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

describe('armour', () => {
  it('cuts physical damage, never below 1, and lets magic through', () => {
    expect(afterArmor(10, 'physical', 0.5)).toBe(5);
    expect(afterArmor(1, 'physical', 0.5)).toBe(1);
    expect(afterArmor(10, 'magic', 0.5)).toBe(10);
    expect(afterArmor(10, 'physical', 0)).toBe(10);
  });
});

describe('towers', () => {
  const firstHit = (kind: 'archer' | 'storm') => {
    const b = new Battle(only('ironclad'));
    b.build(NEAR_DOCK, kind);
    b.callWave();
    const hit = run(b, 60, (e) => e.some((x) => x.type === 'hit')).find((e) => e.type === 'hit');
    return hit?.type === 'hit' ? hit : null;
  };

  it('arrows bounce off an Ironclad, lightning does not', () => {
    const arrow = firstHit('archer')!;
    expect(arrow.blocked).toBeGreaterThan(0);
    expect(arrow.damage + arrow.blocked).toBeGreaterThanOrEqual(4);
    const zap = firstHit('storm')!;
    expect(zap.blocked).toBe(0);
    expect(zap.damage).toBeGreaterThanOrEqual(9);
  });

  it('a cannon ignores flyers and blasts pirates walking close together', () => {
    const air = new Battle(only('parrot', 4, 0.5));
    air.build(NEAR_DOCK, 'cannon');
    air.callWave();
    expect(run(air, 40).some((e) => e.type === 'shoot' && e.tower)).toBe(false);

    const ground = new Battle(only('deckhand', 6, 0.3));
    ground.build(NEAR_DOCK, 'cannon');
    ground.callWave();
    const events = run(ground, 40);
    const booms = events.flatMap((e, i) => (e.type === 'boom' ? [i] : []));
    expect(booms.length).toBeGreaterThan(0);
    // Hits that follow a blast in the same step belong to it.
    const hitsAfter = booms.map((i) => {
      let n = 0;
      while (events[i + 1 + n]?.type === 'hit') n++;
      return n;
    });
    expect(Math.max(...hitsAfter)).toBeGreaterThanOrEqual(2);
  });

  it('lightning reaches flyers', () => {
    const b = new Battle(only('parrot'));
    b.build(NEAR_DOCK, 'storm');
    b.callWave();
    const zap = run(b, 40, (e) => e.some((x) => x.type === 'zap')).find((e) => e.type === 'zap');
    expect(zap?.type === 'zap' && zap.enemy.flying).toBe(true);
  });

  it('frost slows pirates in range for a while', () => {
    const b = new Battle(only('deckhand'));
    b.build(NEAR_DOCK, 'frost');
    b.callWave();
    run(b, 60, (e) => e.some((x) => x.type === 'pulse'));
    const e = b.enemies[0];
    expect(e.slow).toBeCloseTo(0.6);
    const d0 = e.d;
    b.step(0.5);
    expect((e.d - d0) / 0.5).toBeCloseTo(52 * 0.6, 0);
    b.sell(NEAR_DOCK);
    b.step(2);
    expect(e.slow).toBe(1);
  });
});

describe('level 4 specialisations', () => {
  /** A battle with one tower on the spot near the dock, raised to level 4 as `branch`. */
  const special = (kind: TowerKind, branch: Branch, level: LevelDef) => {
    const b = new Battle(level);
    b.purse.gold = 5000;
    b.build(NEAR_DOCK, kind);
    b.upgrade(NEAR_DOCK);
    b.upgrade(NEAR_DOCK);
    expect(b.upgrade(NEAR_DOCK)).toBeNull();
    expect(b.upgrade(NEAR_DOCK, branch)?.level).toBe(4);
    expect(b.upgrade(NEAR_DOCK, branch)).toBeNull();
    b.callWave();
    return b;
  };

  it('costs the branch price and sells for 60% of everything paid', () => {
    const b = special('archer', 0, only('deckhand'));
    expect(b.purse.gold).toBe(5000 - 70 - 110 - 160 - branchCost(TOWERS.archer, 0));
    expect(b.sell(NEAR_DOCK)).toBe(Math.floor((70 + 110 + 160 + 250) * 0.6));
  });

  it('a Volley Tower shoots three pirates at once', () => {
    const b = special('archer', 1, only('deckhand', 5, 0.4));
    run(b, 60, (e) => e.filter((x) => x.type === 'shoot').length >= 3 && b.enemies.length >= 3);
    const volley = run(b, 5, (e) => e.some((x) => x.type === 'shoot'));
    const shots = volley.filter((e) => e.type === 'shoot');
    expect(new Set(shots.map((e) => e.type === 'shoot' && e.shot.target)).size).toBe(3);
  });

  it('Lightning Spire bolts jump between pirates', () => {
    const b = special('storm', 0, only('deckhand', 5, 0.4));
    const zaps = run(b, 60, (e) => e.some((x) => x.type === 'zap' && x.jump >= 2)).filter((e) => e.type === 'zap');
    expect(Math.max(...zaps.map((e) => (e.type === 'zap' ? e.jump : 0)))).toBeGreaterThanOrEqual(2);
  });

  it('Arcane Lens burns hotter the longer it holds a pirate', () => {
    const b = special('storm', 1, only('ironclad'));
    const hits = run(b, 60, (e) => e.filter((x) => x.type === 'zap').length >= 8).filter((e) => e.type === 'hit');
    const dmg = hits.map((e) => (e.type === 'hit' ? e.damage : 0));
    expect(dmg.at(-1)!).toBeGreaterThan(dmg[0] * 2);
  });

  it('Ice Shard freezes a pirate in place', () => {
    const b = special('frost', 1, only('ironclad'));
    run(b, 60, (e) => e.some((x) => x.type === 'freeze'));
    const e = b.enemies[0];
    const d0 = e.d;
    b.step(0.5);
    expect(e.d).toBe(d0);
  });

  it('Flak bursts reach flyers, plain cannon shells do not', () => {
    const b = special('cannon', 1, only('parrot', 3, 0.6));
    const hits = run(b, 60, (e) => e.some((x) => x.type === 'hit'));
    expect(hits.some((e) => e.type === 'hit' && e.enemy.flying)).toBe(true);
  });

  it('towers can be told which pirate to pick', () => {
    const b = new Battle(only('deckhand'));
    b.build(NEAR_DOCK, 'archer');
    expect(b.setMode(NEAR_DOCK, 'carrier')).toBe(true);
    expect(b.towers[NEAR_DOCK]!.mode).toBe('carrier');
    expect(b.setMode(1, 'nearest')).toBe(false);
  });
});

describe('the First Mate', () => {
  it('carries three crystals off at once', () => {
    const b = new Battle(only('firstMate'));
    b.callWave();
    const events = run(b, 400);
    const escape = events.find((e) => e.type === 'escape');
    expect(escape?.type === 'escape' && escape.lost).toBe(3);
    expect(b.vault.lost).toBe(3);
  });

  it('drops all three when brought down', () => {
    const b = new Battle(only('firstMate'));
    b.callWave();
    run(b, 400, (e) => e.some((x) => x.type === 'steal'));
    const boss = b.enemies[0];
    expect(boss.load).toBe(3);
    boss.hp = 1;
    b.hero.pos = [boss.pos[0] - 120, boss.pos[1]];
    const events = run(b, 60, (e) => e.some((x) => x.type === 'drop'));
    const drop = events.find((e) => e.type === 'drop');
    expect(drop?.type === 'drop' && drop.count).toBe(3);
    expect(b.vault.dropped()).toHaveLength(3);
  });

  it('shouts to hurry the pirates around it', () => {
    const b = new Battle({ ...FAR_AWAY, waves: [{ groups: [{ enemy: 'firstMate', count: 1, gap: 1 }, { enemy: 'deckhand', count: 3, gap: 0.3 }] }] });
    b.callWave();
    const events = run(b, 30, (e) => e.some((x) => x.type === 'shout'));
    const shout = events.find((e) => e.type === 'shout');
    expect(shout?.type === 'shout' && shout.rallied.length).toBeGreaterThanOrEqual(2);
    const deckhand = b.enemies.find((e) => e.kind === 'deckhand')!;
    expect(deckhand.haste).toBe(1.5);
    expect(deckhand.vel[0] ** 2 + deckhand.vel[1] ** 2).toBeCloseTo((52 * 1.5) ** 2, -1);
  });

  it('shrugs off frost: half-strength slows and no freezing', () => {
    const b = new Battle(only('firstMate'));
    b.purse.gold = 5000;
    b.build(NEAR_DOCK, 'frost');
    b.upgrade(NEAR_DOCK);
    b.upgrade(NEAR_DOCK);
    b.upgrade(NEAR_DOCK, 1);
    b.callWave();
    const events = run(b, 60, (e) => e.filter((x) => x.type === 'hit').length >= 2);
    expect(events.some((e) => e.type === 'freeze')).toBe(false);
    const boss = b.enemies[0];
    boss.slow = 0.4;
    boss.slowFor = 5;
    // No shout in the way of the measurement.
    Object.assign(boss, { shoutIn: Infinity, haste: 1, hasteFor: 0 });
    b.sell(NEAR_DOCK);
    const d0 = boss.d;
    b.step(1);
    expect(boss.d - d0).toBeCloseTo(ENEMIES.firstMate.speed * 0.7, 0);
  });
});

describe('companions', () => {
  it('Talon snatches the crystals back from the carrier furthest along and stuns it', () => {
    const b = new Battle(only('deckhand', 3, 2));
    expect(b.useTalon()).toBe(false); // not before the battle starts
    b.callWave();
    run(b, 200, (e) => e.some((x) => x.type === 'steal'));
    const carrier = b.enemies.find((e) => e.carrying)!;
    expect(b.vault.stored).toBe(19);
    expect(b.useTalon()).toBe(true);
    expect(b.useTalon()).toBe(false); // cooling down
    const events = run(b, 2, (e) => e.some((x) => x.type === 'talonStrike'));
    const strike = events.find((e) => e.type === 'talonStrike');
    expect(strike?.type === 'talonStrike' && strike.enemy).toBe(carrier);
    expect(strike?.type === 'talonStrike' && strike.rescued).toBe(1);
    expect(b.vault.stored).toBe(20);
    expect(carrier.carrying).toBe(false);
    expect(carrier.stun).toBeGreaterThan(1);
    const d0 = carrier.d;
    b.step(0.5);
    expect(carrier.d).toBe(d0);
    expect(b.talon.cooldown).toBeGreaterThan(SKILLS.talon.cooldown - 3);
  });

  it('Mochi waits a while at the start, then hits and stuns every pirate, flyers and bosses too', () => {
    const b = new Battle({
      ...FAR_AWAY,
      waves: [{ groups: [{ enemy: 'deckhand', count: 3, gap: 1 }, { enemy: 'parrot', count: 2, gap: 1 }, { enemy: 'firstMate', count: 1, gap: 1 }] }],
    });
    b.callWave();
    expect(b.useMochi()).toBe(false);
    run(b, SKILLS.mochi.firstWait + 0.1);
    expect(b.enemies.length).toBe(6);
    expect(b.useMochi()).toBe(true);
    const events = run(b, SKILLS.mochi.sweep + 0.2);
    const hit = new Set(events.flatMap((e) => (e.type === 'hit' ? [e.enemy.id] : [])));
    expect(hit.size).toBe(6);
    // Hit right to left: the pirate furthest east is hit first.
    const first = events.find((e) => e.type === 'hit');
    const eastmost = [...b.enemies].sort((a, c) => c.pos[0] - a.pos[0])[0];
    expect(first?.type === 'hit' && first.enemy.pos[0]).toBeGreaterThanOrEqual(eastmost.pos[0] - 200);
    const boss = b.enemies.find((e) => e.kind === 'firstMate')!;
    expect(boss.hp).toBe(ENEMIES.firstMate.hp - Math.round(SKILLS.mochi.damage));
    expect(b.mochi.sweep).toBeNull();
    expect(b.canUse('mochi')).toBe(false);
  });
});

describe("captain's orders", () => {
  /** A battle with the given card already picked. */
  const withCard = (id: CardId, level: LevelDef = LEVEL1) => {
    const b = new Battle(level);
    b.choice = [CARDS.find((c) => c.id === id)!];
    b.choose(0);
    return b;
  };

  it('level 1 pauses after waves 2, 4 and 6 for a pick of three different cards', () => {
    // Undefended, but with crystals to spare so it lasts all eight waves.
    const b = new Battle({ ...FAR_AWAY, crystals: 500 });
    b.callWave();
    const offers: number[] = [];
    for (let t = 0; t < 400 && !b.over; t += 1 / 30) {
      b.step(1 / 30);
      for (const e of b.drain()) if (e.type === 'orders') offers.push(b.waves.wave + 1);
      if (b.choice) {
        expect(new Set(b.choice.map((c) => c.id)).size).toBe(3);
        const time = b.time;
        b.step(5);
        expect(b.time).toBe(time); // paused while choosing
        b.choose(1);
      }
    }
    expect(offers).toEqual([2, 4, 6]);
    expect(b.orders).toHaveLength(3);
  });

  it('War Chest pays at once; Shipwrights makes towers cheaper and selling returns 60% of what was paid', () => {
    expect(withCard('chest').purse.gold).toBe(LEVEL1.startGold + 150);
    const b = withCard('shipwrights');
    expect(b.costOf('archer', 0)).toBe(Math.round(70 * 0.85));
    b.build(0);
    expect(b.purse.gold).toBe(LEVEL1.startGold - 60);
    expect(b.sell(0)).toBe(Math.floor(60 * 0.6));
  });

  it('Sharpened Arrows makes archer towers hit harder', () => {
    const plain = new Battle(only('ironclad'));
    const sharp = withCard('arrows', only('ironclad'));
    const firstHit = (b: Battle) => {
      b.build(NEAR_DOCK, 'archer');
      b.callWave();
      const h = run(b, 60, (e) => e.some((x) => x.type === 'hit')).find((e) => e.type === 'hit');
      return h?.type === 'hit' ? h.damage + h.blocked : 0;
    };
    expect(firstHit(sharp)).toBeGreaterThan(firstHit(plain));
  });

  it("Talon's Training readies Talon and shortens his cooldown", () => {
    const b = withCard('talon', only('deckhand'));
    b.callWave();
    run(b, 3);
    expect(b.useTalon()).toBe(true);
    expect(b.talon.cooldown).toBeCloseTo(SKILLS.talon.cooldown * 0.65);
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

  it.each([
    ['archers only', {} as Record<number, TowerKind>],
    ['a mix of towers', { 3: 'cannon', 7: 'storm', 4: 'frost', 0: 'cannon', 2: 'storm' } as Record<number, TowerKind>],
  ])('level 1 can be won with the hero and %s', (_, kinds) => {
    const b = new Battle(LEVEL1, 7);
    const order = [5, 3, 1, 7, 4, 0, 2, 6];
    b.callWave();
    const events = run(b, 900, undefined, () => {
      const empty = order.find((s) => !b.towers[s]);
      if (empty !== undefined) b.build(empty, kinds[empty] ?? 'archer');
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
