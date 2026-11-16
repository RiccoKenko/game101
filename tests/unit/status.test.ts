import { describe, expect, it } from 'vitest';
import { JOB_CHANGE, MASTERY, SECOND_JOBS, STAT_CAP, STAT_RESET_GOLD } from '../../src/config/mastery';
import { masteryPerks, xpForLevel } from '../../src/core/collection';
import { defaultSave, sanitize } from '../../src/core/save';
import { addStat, changeJob, freePoints, jobChangeNeeds, jobName, resetStats, statPoints, statusBonus } from '../../src/core/status';

describe('stat points', () => {
  it('one point a Job Lv, spent one at a time, each stat capped', () => {
    const save = defaultSave();
    expect(statPoints(save, 'archer')).toBe(0);
    expect(addStat(save, 'archer', 'str')).toBe(false);
    save.mastery.archer = xpForLevel(MASTERY.maxLevel);
    expect(statPoints(save, 'archer')).toBe(MASTERY.maxLevel - 1);
    for (let i = 0; i < STAT_CAP; i++) expect(addStat(save, 'archer', 'str')).toBe(true);
    expect(addStat(save, 'archer', 'str')).toBe(false);
    expect(freePoints(save, 'archer')).toBe(MASTERY.maxLevel - 1 - STAT_CAP);
    // Points belong to one hero.
    expect(statPoints(save, 'mage')).toBe(0);
    expect(statusBonus(save, 'archer').damage).toBeCloseTo(STAT_CAP * 0.02);
  });

  it('a reset gives every point back for gold', () => {
    const save = defaultSave();
    save.mastery.mage = xpForLevel(10);
    addStat(save, 'mage', 'int');
    expect(resetStats(save, 'mage')).toBe(false);
    save.gold = STAT_RESET_GOLD;
    expect(resetStats(save, 'mage')).toBe(true);
    expect(save.gold).toBe(0);
    expect(freePoints(save, 'mage')).toBe(9);
  });

  it('Job Lv past 15 gives points, not the flat damage and HP', () => {
    expect(masteryPerks('archer', 50).damage).toBeCloseTo(masteryPerks('archer', MASTERY.flatUntil).damage);
  });
});

describe('job change', () => {
  it('needs Job Lv 40 and a Nightmare clear, then brings its name, power and points', () => {
    const save = defaultSave();
    save.mastery.archer = xpForLevel(JOB_CHANGE.level);
    expect(jobChangeNeeds(save, 'archer')).toEqual(['Clear any map on Nightmare']);
    expect(changeJob(save, 'archer')).toBe(false);
    save.clears[1] = 3;
    expect(jobChangeNeeds(save, 'archer')).toEqual([]);
    const before = statPoints(save, 'archer');
    expect(changeJob(save, 'archer')).toBe(true);
    expect(jobName(save, 'archer', 'Archer')).toBe(SECOND_JOBS.archer.name);
    expect(statPoints(save, 'archer')).toBe(before + JOB_CHANGE.points);
    const b = statusBonus(save, 'archer');
    expect(b.projectiles).toBe(1);
    expect(b.damage).toBeCloseTo(JOB_CHANGE.damage);
    // Two points a level after the change.
    save.mastery.archer = xpForLevel(JOB_CHANGE.level + 5);
    expect(statPoints(save, 'archer')).toBe(before + 5 + JOB_CHANGE.points + 5);
  });

  it('saves keep points and jobs, cleaned', () => {
    const s = sanitize({ points: { archer: { str: 5, agi: 99, nope: 3 } }, jobs: { mage: 1, archer: 0 } });
    expect(s.points.archer.str).toBe(5);
    expect(s.points.archer.agi).toBe(STAT_CAP);
    expect(s.jobs).toMatchObject({ mage: 1, archer: 0 });
  });
});
