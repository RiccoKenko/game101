import { describe, expect, it } from 'vitest';
import { CHARACTERS } from '../../src/config/characters';
import { BESTIARY, describeGoal, UNLOCK_KEYS, UNLOCKS } from '../../src/config/collection';
import { BOSSES, ENEMIES } from '../../src/config/enemies';
import { MASTERY, MASTERY_REWARDS } from '../../src/config/mastery';
import { type RunReport } from '../../src/config/quests';
import { TALENTS, TALENT_LEVELS } from '../../src/config/talents';
import { PASSIVES, RUNES, WEAPON_IDS, WEAPONS } from '../../src/config/weapons';
import {
  claimUnlocks,
  isUnlocked,
  lockedKeys,
  lockedTalents,
  masteryPerks,
  masteryState,
  masteryXp,
  reachedUnlocks,
  records,
} from '../../src/core/collection';
import { applyRun } from '../../src/core/quests';
import { defaultSave, sanitize } from '../../src/core/save';

const run = (r: Partial<RunReport> = {}): RunReport => ({
  mapIndex: 0,
  time: 120,
  level: 8,
  kills: 150,
  eliteKills: 2,
  bossKills: 0,
  gold: 40,
  chests: 0,
  evolutions: 0,
  monsters: {},
  shrines: 0,
  died: false,
  ...r,
});

describe('collection content', () => {
  it('locks each item once, never a hero starting weapon', () => {
    expect(new Set(UNLOCK_KEYS).size).toBe(UNLOCKS.length);
    for (const u of UNLOCKS) {
      const table: Record<string, object> = u.kind === 'weapon' ? WEAPONS : u.kind === 'rune' ? RUNES : PASSIVES;
      expect(table[u.id], u.id).toBeDefined();
    }
    for (const c of CHARACTERS) expect(UNLOCK_KEYS).not.toContain(`weapon:${c.start}`);
  });

  it('every weapon open from the start can evolve with things also open from the start', () => {
    const save = defaultSave();
    for (const id of WEAPON_IDS) {
      if (!isUnlocked(save, { kind: 'weapon', id })) continue;
      const req = WEAPONS[id].evolution!.requires;
      expect(isUnlocked(save, { kind: req in RUNES ? 'rune' : 'passive', id: req }), `${id} needs ${req}`).toBe(true);
    }
  });

  it('the bestiary lists every monster and boss once, and every goal names one of them', () => {
    const ids = BESTIARY.flatMap((g) => g.ids);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...Object.keys(ENEMIES), ...Object.keys(BOSSES)].sort());
    for (const u of UNLOCKS) if ('monster' in u.goal) expect(ids).toContain(u.goal.monster);
  });

  it('describes goals in plain words', () => {
    expect(describeGoal({ monster: 'bat', n: 800 })).toBe('Defeat 800 Bats');
    expect(describeGoal({ monster: 'skeleton', n: 1000 })).toBe('Defeat 1,000 Skeletons');
    expect(describeGoal({ monster: 'boss_slime', n: 1 })).toBe('Defeat the King Slime');
    expect(describeGoal({ monster: 'boss_boar', n: 3 })).toBe('Defeat the Boar Chief 3 times');
    expect(describeGoal({ monster: 'goblin', n: 2 })).toBe('Catch 2 Treasure Goblins');
    expect(describeGoal({ stat: 'time', n: 600 })).toBe('Survive 10:00 in one run');
  });
});

describe('unlocking', () => {
  it('a new save has every listed item locked', () => {
    const save = defaultSave();
    expect(lockedKeys(save)).toEqual(UNLOCK_KEYS);
    expect(claimUnlocks(save)).toEqual([]);
  });

  it('counts a run in progress on top of the save, and kills per monster add up', () => {
    const save = defaultSave();
    save.bestiary.slime = 300;
    expect(reachedUnlocks(save, records(save, run({ monsters: { slime: 99 } })))).toEqual([]);
    expect(reachedUnlocks(save, records(save, run({ monsters: { slime: 100 } }))).map((u) => u.id)).toEqual(['clover']);
  });

  it('old saves get what their lifetime numbers already earned', () => {
    const save = sanitize({ stats: { chests: 7, bestLevel: 22, eliteKills: 80 }, bossKills: [2, 0, 0], bestTimes: [640, 0, 0] });
    const got = claimUnlocks(save).map((u) => u.id);
    expect(got).toEqual(expect.arrayContaining(['cap', 'beam', 'giant', 'spring', 'ring']));
    expect(got).not.toContain('reaper');
    expect(lockedKeys(save)).not.toContain('weapon:beam');
    expect(claimUnlocks(save)).toEqual([]);
  });

  it('a finished run adds its kills, shrines and fall to the save', () => {
    const save = defaultSave();
    applyRun(save, run({ monsters: { bat: 30, boss_boar: 1 }, shrines: 2, died: true }));
    applyRun(save, run({ monsters: { bat: 5 }, shrines: 1 }));
    expect(save.bestiary).toEqual({ bat: 35, boss_boar: 1 });
    expect(save.stats.shrines).toBe(3);
    expect(save.stats.deaths).toBe(1);
  });

  it('cleans bad data out of old or hand-edited saves', () => {
    const s = sanitize({ bestiary: { slime: 12.7, dragon: 5, bat: -3 }, unlocked: ['weapon:beam', 'weapon:nope', 3], mastery: { archer: 500, mage: 'x' } });
    expect(s.bestiary).toEqual({ slime: 12 });
    expect(s.unlocked).toEqual(['weapon:beam']);
    expect(s.mastery).toEqual({ archer: 500, mage: 0 });
  });
});

describe('hero mastery', () => {
  it('levels up with XP and stops at the top', () => {
    expect(masteryState(0)).toEqual({ level: 1, into: 0, need: 300 });
    expect(masteryState(299).level).toBe(1);
    expect(masteryState(300)).toEqual({ level: 2, into: 0, need: 450 });
    expect(masteryState(10_000_000)).toEqual({ level: MASTERY.maxLevel, into: 0, need: 0 });
  });

  it('a long run is worth a few levels, a short one a fraction of one', () => {
    expect(masteryXp(900, 10_000, 3)).toBe(900 + 400 + 180);
    expect(masteryXp(150, 300, 0)).toBe(162);
  });

  it('keeps some talents back until the hero earns them, but always enough for every talent level', () => {
    for (const c of CHARACTERS) {
      const own = TALENTS.filter((t) => t.hero === c.id).map((t) => t.id);
      const locked = lockedTalents(c.id, 1);
      expect(locked.length).toBeGreaterThan(0);
      for (const t of locked) expect(own).toContain(t);
      expect(own.length - locked.length).toBeGreaterThanOrEqual(TALENT_LEVELS.length);
      expect(lockedTalents(c.id, MASTERY.maxLevel)).toEqual([]);
      expect(MASTERY_REWARDS[c.id].every((r) => r.level >= 2 && r.level <= MASTERY.maxLevel)).toBe(true);
    }
  });

  it('adds a little power per level and the rewards reached', () => {
    expect(masteryPerks('archer', 1)).toEqual({ damage: 0, maxHp: 0, rerolls: 0, banishes: 0, startLevels: 0, gold: 0 });
    const top = masteryPerks('mage', MASTERY.maxLevel);
    expect(top.damage).toBeCloseTo(0.14);
    expect(top).toMatchObject({ rerolls: 1, banishes: 1, startLevels: 1, gold: MASTERY.masterGold });
  });
});
