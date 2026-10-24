import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { Battle } from '../../src/td/battle';
import { DIFFICULTIES, DIFFICULTY, scaleWaves, type Difficulty } from '../../src/td/difficulty';
import { CHAPTER1, checkLevel, LEVEL1, LEVELS, type LevelDef } from '../../src/td/levels';
import { ENEMIES, type TowerKind } from '../../src/td/units';
import type { WaveDef } from '../../src/td/waves';

const dist = (a: [number, number], b: [number, number]) => Math.hypot(a[0] - b[0], a[1] - b[1]);
const isBoss = (k: WaveDef['groups'][number]['enemy']) => !!ENEMIES[k].boss;
const pirates = (waves: WaveDef[]) => waves.reduce((n, w) => n + w.groups.reduce((m, g) => m + g.count, 0), 0);

describe('chapter 1 levels', () => {
  it('has the three levels in order, each with its own id', () => {
    expect(CHAPTER1.map((l) => l.id)).toEqual(['level1', 'level2', 'level3']);
    expect(Object.keys(LEVELS)).toEqual(['level1', 'level2', 'level3']);
    for (const l of CHAPTER1) expect(l.name.length).toBeGreaterThan(0);
  });

  it.each(CHAPTER1.map((l) => [l.id, l] as const))('%s is laid out cleanly', (_, level) => {
    expect(checkLevel(level)).toEqual([]);
    // The road runs from the dock to the vault, and the hero starts near the vault.
    expect(dist(level.route[0], level.dock)).toBeLessThan(90);
    expect(dist(level.route[level.route.length - 1], level.vault)).toBeLessThan(90);
    expect(dist(level.heroStart, level.vault)).toBeLessThan(250);
    // Its sketch is there for the game to show until the painted map arrives.
    expect(existsSync(new URL(`../../public/${level.map.sketch}`, import.meta.url))).toBe(true);
  });

  it.each(CHAPTER1.map((l) => [l.id, l] as const))('%s has real waves and orders between them', (_, level) => {
    expect(level.waves.length).toBeGreaterThan(0);
    for (const w of level.waves) {
      expect(w.groups.length).toBeGreaterThan(0);
      for (const g of w.groups) expect(g.count).toBeGreaterThan(0);
    }
    for (const n of level.ordersAfter ?? []) {
      expect(Number.isInteger(n)).toBe(true);
      expect(n).toBeGreaterThanOrEqual(1);
      expect(n).toBeLessThan(level.waves.length);
    }
  });

  it('the chapter ends with the First Mate', () => {
    const last = CHAPTER1[CHAPTER1.length - 1];
    expect(last.waves[last.waves.length - 1].groups.some((g) => g.enemy === 'firstMate')).toBe(true);
  });
});

describe('difficulty', () => {
  it('scaling waves never touches a boss and never empties a group', () => {
    for (const count of [0.01, 0.5, 0.85, 1.1, 2]) {
      for (const level of CHAPTER1) {
        const scaled = scaleWaves(level.waves, count, isBoss);
        scaled.forEach((w, i) =>
          w.groups.forEach((g, j) => {
            expect(g.count).toBeGreaterThanOrEqual(1);
            if (isBoss(g.enemy)) expect(g.count).toBe(level.waves[i].groups[j].count);
          }),
        );
      }
    }
    expect(pirates(scaleWaves(LEVEL1.waves, DIFFICULTY.hard.count, isBoss))).toBeGreaterThan(pirates(LEVEL1.waves));
    expect(pirates(scaleWaves(LEVEL1.waves, DIFFICULTY.easy.count, isBoss))).toBeLessThan(pirates(LEVEL1.waves));
  });

  it('Hard pirates arrive with more hit points, Easy ones with fewer', () => {
    const level: LevelDef = { ...LEVEL1, heroStart: [-5000, -5000], waves: [{ groups: [{ enemy: 'deckhand', count: 1, gap: 1 }] }] };
    const firstPirate = (difficulty: Difficulty) => {
      const b = new Battle(level, 1, difficulty);
      b.callWave();
      b.step(0.1);
      return b.enemies[0];
    };
    const [easy, normal, hard] = DIFFICULTIES.map(firstPirate);
    expect(normal.maxHp).toBe(ENEMIES.deckhand.hp);
    expect(hard.maxHp).toBeGreaterThan(normal.maxHp);
    expect(easy.maxHp).toBeLessThan(normal.maxHp);
    for (const e of [easy, normal, hard]) expect(e.hp).toBe(e.maxHp);
  });

  it('Easy starts with more gold, Hard with less', () => {
    const gold = (d: Difficulty) => new Battle(LEVEL1, 1, d).purse.gold;
    expect(gold('normal')).toBe(LEVEL1.startGold);
    expect(gold('easy')).toBeGreaterThan(gold('normal'));
    expect(gold('hard')).toBeLessThan(gold('normal'));
  });
});

/**
 * A sensible mixed defence per level (as in scripts/tools/balance_bot.mts): the spots in build order and the
 * tower for each. The bot builds as soon as it can pay, then keeps upgrading its lowest tower to level 3.
 */
const MIXED: Record<string, [number, TowerKind][]> = {
  level1: [[5, 'archer'], [3, 'cannon'], [1, 'archer'], [7, 'storm'], [4, 'frost'], [0, 'cannon'], [2, 'storm'], [6, 'archer']],
  level2: [[4, 'archer'], [3, 'cannon'], [2, 'storm'], [1, 'cannon'], [5, 'frost'], [0, 'archer'], [6, 'storm'], [7, 'archer'], [8, 'storm'], [9, 'archer']],
  level3: [[2, 'archer'], [0, 'cannon'], [3, 'storm'], [1, 'frost'], [4, 'cannon'], [6, 'storm'], [5, 'archer'], [8, 'archer'], [9, 'storm'], [7, 'archer']],
};

describe('balance', () => {
  it.each(CHAPTER1.map((l) => [l.id, l] as const))('a mixed defence wins %s on Normal with three stars', (id, level) => {
    const b = new Battle(level, 1, 'normal');
    const plan = MIXED[id];
    b.callWave();
    let won: number | null = null;
    for (let t = 0; t < 900 && !b.over; t += 1 / 30) {
      if (b.choice) b.choose(0);
      const next = plan.find(([s]) => !b.towers[s]);
      if (next) b.build(next[0], next[1]);
      else {
        const low = plan.map(([s]) => b.towers[s]!).sort((x, y) => x.level - y.level)[0];
        if (low.level < 3) b.upgrade(low.slot);
      }
      b.step(1 / 30);
      for (const e of b.drain()) if (e.type === 'win') won = e.stars;
    }
    expect(b.state).toBe('won');
    expect(won).toBe(3);
  });
});
