import { describe, expect, it } from 'vitest';
import { ACHIEVEMENTS, DAILY_COUNT, QUESTS, type RunReport } from '../../src/config/quests';
import {
  achievementState,
  applyRun,
  claimAchievement,
  claimBonus,
  claimQuest,
  claimableCount,
  dayKey,
  ensureDaily,
  lifetime,
  msToNextDay,
  rollDaily,
  tiersReached,
} from '../../src/core/quests';
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

const MONDAY = new Date(2026, 9, 26, 10, 30);
const TUESDAY = new Date(2026, 9, 27, 0, 5);

describe('daily quests', () => {
  it('rolls the same quests for the same day, different ones on other days', () => {
    expect(rollDaily('2026-10-26', 1)).toEqual(rollDaily('2026-10-26', 1));
    const days = Array.from({ length: 10 }, (_, i) => rollDaily(`2026-11-${String(i + 1).padStart(2, '0')}`, 3).map((q) => q.id).join());
    expect(new Set(days).size).toBeGreaterThan(3);
  });

  it('rolls distinct quests a new player can do, never two exclusive ones together', () => {
    for (let d = 1; d <= 28; d++) {
      for (const maps of [1, 2, 3]) {
        const qs = rollDaily(`2026-02-${String(d).padStart(2, '0')}`, maps);
        expect(qs).toHaveLength(DAILY_COUNT);
        expect(new Set(qs.map((q) => q.id)).size).toBe(DAILY_COUNT);
        const ids = qs.map((q) => q.id);
        expect(ids.includes('kills') && ids.includes('mapKills')).toBe(false);
        for (const q of qs) {
          const def = QUESTS.find((x) => x.id === q.id)!;
          expect(def.minMaps ?? 1).toBeLessThanOrEqual(maps);
          expect(q.map).toBeLessThan(maps);
        }
      }
    }
  });

  it('day keys use the local date and roll over at midnight', () => {
    expect(dayKey(MONDAY)).toBe('2026-10-26');
    expect(msToNextDay(new Date(2026, 9, 26, 23, 59, 0))).toBe(60_000);
    const save = defaultSave();
    ensureDaily(save, MONDAY);
    const first = save.daily.quests;
    expect(save.daily.day).toBe('2026-10-26');
    expect(ensureDaily(save, MONDAY)).toBe(0);
    expect(save.daily.quests).toBe(first);
    ensureDaily(save, TUESDAY);
    expect(save.daily.day).toBe('2026-10-27');
  });

  it('adds runs up for sum quests and keeps the best run for best quests', () => {
    const save = defaultSave();
    ensureDaily(save, MONDAY);
    save.daily.quests = [
      { id: 'kills', map: 0, target: 300, reward: 60, progress: 0, claimed: false },
      { id: 'survive', map: 0, target: 180, reward: 60, progress: 0, claimed: false },
      { id: 'runs', map: 0, target: 3, reward: 40, progress: 0, claimed: false },
    ];
    expect(applyRun(save, run({ kills: 200, time: 150 }), 0, MONDAY)).toEqual([]);
    const done = applyRun(save, run({ kills: 120, time: 30 }), 0, MONDAY);
    expect(done.map((q) => q.id)).toEqual(['kills']);
    expect(save.daily.quests[1].progress).toBe(150);
    // The 30 s run was too short to count as a played run.
    expect(save.daily.quests[2].progress).toBe(1);
    expect(applyRun(save, run({ time: 200 }), 0, MONDAY).map((q) => q.id)).toEqual(['survive']);
  });

  it('pays each finished quest once, then the bonus when all are done', () => {
    const save = defaultSave();
    ensureDaily(save, MONDAY);
    save.daily.quests.forEach((q) => (q.progress = q.target));
    expect(claimBonus(save)).toBe(save.daily.bonus);
    const total = save.daily.quests.reduce((a, q) => a + q.reward, 0) + save.daily.bonus;
    save.gold = 0;
    save.daily.bonusClaimed = false;
    expect(claimableCount(save)).toBe(DAILY_COUNT + 1);
    const got = [0, 1, 2].map((i) => claimQuest(save, i)).reduce((a, b) => a + b, 0) + claimBonus(save);
    expect(got).toBe(total);
    expect(save.gold).toBe(total);
    expect(claimQuest(save, 0)).toBe(0);
    expect(claimBonus(save)).toBe(0);
  });

  it("pays yesterday's unclaimed rewards when the day rolls over", () => {
    const save = defaultSave();
    ensureDaily(save, MONDAY);
    save.daily.quests[0].progress = save.daily.quests[0].target;
    const owed = save.daily.quests[0].reward;
    expect(ensureDaily(save, TUESDAY)).toBe(owed);
    expect(save.gold).toBe(owed);
  });

  it('survives a save round trip and drops broken quest lists', () => {
    const save = defaultSave();
    ensureDaily(save, MONDAY);
    save.daily.quests[0].progress = 7;
    expect(sanitize(JSON.parse(JSON.stringify(save))).daily).toEqual(save.daily);
    expect(sanitize({ daily: { day: '2026-10-26', quests: [{ id: 'nope' }] } }).daily.day).toBe('');
    expect(sanitize({ daily: { day: 'yesterday', quests: save.daily.quests } }).daily.day).toBe('');
  });
});

describe('achievements', () => {
  it('counts lifetime numbers with a run in progress', () => {
    const save = defaultSave();
    save.stats.kills = 450;
    save.bossKills = [1, 0, 0];
    save.bestTimes = [200, 0, 0];
    const v = lifetime(save, run({ kills: 60, time: 320, level: 12 }));
    expect(v).toMatchObject({ kills: 510, bossKills: 1, bestTime: 320, bestLevel: 12 });
    expect(tiersReached(v)).toMatchObject({ hunter: 1, boss: 1, survivor: 1, level: 1 });
  });

  it('claims tiers one by one, each once', () => {
    const save = defaultSave();
    save.stats.kills = 3000;
    const hunter = ACHIEVEMENTS.find((a) => a.id === 'hunter')!;
    expect(achievementState(save, hunter)).toMatchObject({ claimed: 0, claimable: true, next: hunter.tiers[0] });
    expect(claimAchievement(save, 'hunter')).toBe(hunter.tiers[0].reward);
    expect(claimAchievement(save, 'hunter')).toBe(hunter.tiers[1].reward);
    expect(claimAchievement(save, 'hunter')).toBe(0);
    expect(achievementState(save, hunter)).toMatchObject({ claimed: 2, claimable: false, next: hunter.tiers[2] });
    expect(save.gold).toBe(hunter.tiers[0].reward + hunter.tiers[1].reward);
  });

  it('a finished run updates the lifetime numbers', () => {
    const save = defaultSave();
    applyRun(save, run({ kills: 100, eliteKills: 3, chests: 1, evolutions: 1, gold: 55.7, level: 14 }), 20, MONDAY);
    expect(save.stats).toEqual({ runs: 1, kills: 100, eliteKills: 3, chests: 1, evolutions: 1, gold: 75, bestLevel: 14, shrines: 0, deaths: 0 });
  });

  it('old saves keep their kills and runs and get the new fields', () => {
    const s = sanitize({ stats: { runs: 4, kills: 900 }, achievements: { hunter: 9, bogus: 2 } });
    expect(s.stats).toEqual({ runs: 4, kills: 900, eliteKills: 0, chests: 0, evolutions: 0, gold: 0, bestLevel: 0, shrines: 0, deaths: 0 });
    expect(s.achievements.hunter).toBe(4);
    expect(s.daily.day).toBe('');
  });
});
