import { type CharacterId } from '../config/characters';
import { JOB_CHANGE, SECOND_JOBS, STAT_CAP, STAT_IDS, STAT_RESET_GOLD, STATS, type StatId } from '../config/mastery';
import { masteryState } from './collection';
import { emptyStats, type SaveData } from './save';

/** Stat points a hero has earned: one per Job Lv, plus the job change's ten and one more a level after it. */
export function statPoints(save: SaveData, hero: CharacterId): number {
  const level = masteryState(save.mastery[hero]).level;
  const changed = save.jobs[hero] > 0;
  return level - 1 + (changed ? JOB_CHANGE.points + Math.max(0, level - JOB_CHANGE.level) : 0);
}

export const spentPoints = (save: SaveData, hero: CharacterId): number => STAT_IDS.reduce((a, s) => a + save.points[hero][s], 0);
export const freePoints = (save: SaveData, hero: CharacterId): number => Math.max(0, statPoints(save, hero) - spentPoints(save, hero));

/** Puts one point into a stat: false if none are free or the stat is full. */
export function addStat(save: SaveData, hero: CharacterId, stat: StatId): boolean {
  if (freePoints(save, hero) <= 0 || save.points[hero][stat] >= STAT_CAP) return false;
  save.points[hero][stat]++;
  return true;
}

/** Takes every point back, for gold: false if there is nothing to take back or not enough gold. */
export function resetStats(save: SaveData, hero: CharacterId): boolean {
  if (spentPoints(save, hero) === 0 || save.gold < STAT_RESET_GOLD) return false;
  save.gold -= STAT_RESET_GOLD;
  save.points[hero] = emptyStats();
  return true;
}

/** What still stands between the hero and its second job (empty when it can change now). */
export function jobChangeNeeds(save: SaveData, hero: CharacterId): string[] {
  if (save.jobs[hero] > 0) return [];
  const needs: string[] = [];
  const level = masteryState(save.mastery[hero]).level;
  if (level < JOB_CHANGE.level) needs.push(`Job Lv ${JOB_CHANGE.level} (now ${level})`);
  if (!save.clears.some((c) => c > JOB_CHANGE.nightmare)) needs.push('Clear any map on Nightmare');
  return needs;
}

export function changeJob(save: SaveData, hero: CharacterId): boolean {
  if (save.jobs[hero] > 0 || jobChangeNeeds(save, hero).length) return false;
  save.jobs[hero] = 1;
  return true;
}

/** The hero's name: its second job's once it has taken it. */
export const jobName = (save: SaveData, hero: CharacterId, base: string): string => (save.jobs[hero] > 0 ? SECOND_JOBS[hero].name : base);

export interface StatusBonus {
  damage: number;
  /** Attack cooldown multiplier (below 1 is faster). */
  cooldown: number;
  maxHp: number;
  area: number;
  speed: number;
  crit: number;
  gold: number;
  projectiles: number;
  armor: number;
}

/** What the hero's stat points and second job add to a run. */
export function statusBonus(save: SaveData, hero: CharacterId): StatusBonus {
  const pts = save.points[hero];
  const per = (id: StatId) => STATS.find((s) => s.id === id)!.per * pts[id];
  const job = save.jobs[hero] > 0 ? SECOND_JOBS[hero] : null;
  return {
    damage: per('str') + (job ? JOB_CHANGE.damage : 0),
    cooldown: (1 - per('agi')) * (job ? job.cooldown : 1),
    maxHp: per('vit') + (job ? JOB_CHANGE.maxHp + job.maxHp : 0),
    area: per('int') + (job ? job.area : 0),
    speed: per('dex'),
    crit: per('luk') + (job ? job.crit : 0),
    gold: pts.luk * 0.01,
    projectiles: job ? job.projectiles : 0,
    armor: job ? job.armor : 0,
  };
}
