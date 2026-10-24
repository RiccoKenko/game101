import { describe, expect, it } from 'vitest';
import { SHOP, shopCost } from '../../src/config/shop';
import { SpatialHash } from '../../src/core/spatial';
import { computeStats } from '../../src/core/stats';
import { formatTime } from '../../src/core/format';
import { bossesDue, enemyWeights, hpMultiplier, ringEventsDue, spawnRate } from '../../src/core/waves';
import { defaultSave } from '../../src/core/save';

describe('waves', () => {
  it('ramps difficulty over time', () => {
    for (let t = 0; t < 1200; t += 30) {
      expect(hpMultiplier(t + 30)).toBeGreaterThan(hpMultiplier(t));
      expect(spawnRate(t + 30)).toBeGreaterThan(spawnRate(t));
    }
  });

  it('schedules bosses every five minutes', () => {
    expect(bossesDue(299)).toBe(0);
    expect(bossesDue(300)).toBe(1);
    expect(bossesDue(600)).toBe(2);
  });

  it('starts with only the first enemy type', () => {
    expect(enemyWeights(10)).toEqual([1, 0, 0]);
    expect(ringEventsDue(50)).toBe(0);
    expect(ringEventsDue(100)).toBe(1);
  });
});

describe('stats', () => {
  it('base stats with no upgrades', () => {
    const s = computeStats(defaultSave().shop, {});
    expect(s.maxHp).toBe(100);
    expect(s.damageMult).toBe(1);
    expect(s.revivals).toBe(0);
  });

  it('shop and passives stack', () => {
    const shop = { ...defaultSave().shop, maxhp: 2, might: 1, revival: 1 };
    const s = computeStats(shop, { heart: 1, powergem: 2, quiver: 1 });
    expect(s.maxHp).toBe(Math.round(100 * 1.2 * 1.2));
    expect(s.damageMult).toBeCloseTo(1 + 0.06 + 0.2);
    expect(s.amountBonus).toBe(1);
    expect(s.revivals).toBe(1);
  });

  it('shop prices rise with level', () => {
    for (const def of SHOP) {
      for (let l = 0; l < def.maxLevel - 1; l++) expect(shopCost(def, l + 1)).toBeGreaterThan(shopCost(def, l));
    }
  });
});

describe('spatial hash', () => {
  it('finds nearby ids across cell borders', () => {
    const h = new SpatialHash(100);
    h.insert(1, 95, 95);
    h.insert(2, 105, 105);
    h.insert(3, 1000, 1000);
    h.insert(4, -50, -50);
    const found: number[] = [];
    h.query(100, 100, 20, (id) => found.push(id));
    expect(found.sort()).toEqual([1, 2]);
    h.clear();
    const after: number[] = [];
    h.query(100, 100, 20, (id) => after.push(id));
    expect(after).toEqual([]);
  });
});

describe('format', () => {
  it('formats mm:ss', () => {
    expect(formatTime(0)).toBe('00:00');
    expect(formatTime(65.9)).toBe('01:05');
    expect(formatTime(600)).toBe('10:00');
  });
});
