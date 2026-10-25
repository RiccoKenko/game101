import { type MonsterId } from '../config/collection';
import { MAPS } from '../config/maps';
import {
  ACHIEVEMENTS,
  DAILY_BONUS,
  DAILY_COUNT,
  QUESTS,
  questDef,
  type AchievementDef,
  type AchievementId,
  type Lifetime,
  type RunReport,
} from '../config/quests';
import { mulberry32 } from './rng';
import type { DailyQuest, SaveData } from './save';

/** Local calendar day, YYYY-MM-DD: the daily quests change at local midnight. */
export function dayKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Milliseconds until the next local midnight. */
export function msToNextDay(d = new Date()): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1).getTime() - d.getTime();
}

/** FNV-1a: turns the day into a seed. */
function hash(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  return h >>> 0;
}

/** Quest difficulty: 0, 1 or 2 by the number of maps unlocked. */
const tierOf = (maps: number) => Math.min(2, Math.max(0, maps - 1));

/** The day's quests. Everyone with the same number of maps unlocked gets the same ones on the same day. */
export function rollDaily(day: string, unlockedMaps: number): DailyQuest[] {
  const rng = mulberry32(hash(day));
  const t = tierOf(unlockedMaps);
  let pool = QUESTS.filter((q) => (q.minMaps ?? 1) <= unlockedMaps);
  const out: DailyQuest[] = [];
  while (out.length < DAILY_COUNT && pool.length) {
    const def = pool[Math.floor(rng() * pool.length)];
    pool = pool.filter((q) => q !== def && !def.excludes?.includes(q.id));
    const map = def.perMap ? Math.floor(rng() * Math.min(unlockedMaps, MAPS.length)) : 0;
    out.push({ id: def.id, map, target: def.targets[t], reward: def.rewards[t], progress: 0, claimed: false });
  }
  return out;
}

/**
 * Rolls new quests when the day has changed. Rewards finished but not claimed the day before are paid out
 * rather than lost. Returns that gold (0 when nothing changed).
 */
export function ensureDaily(save: SaveData, now = new Date()): number {
  const day = dayKey(now);
  if (save.daily.day === day) return 0;
  let paid = 0;
  for (let i = 0; i < save.daily.quests.length; i++) paid += claimQuest(save, i);
  paid += claimBonus(save);
  save.daily = { day, quests: rollDaily(day, save.unlockedMaps), bonus: DAILY_BONUS[tierOf(save.unlockedMaps)], bonusClaimed: false };
  return paid;
}

export const questDone = (q: DailyQuest): boolean => q.progress >= q.target;

/** The quest's progress if this run were added to it. */
export function progressWith(q: DailyQuest, run: RunReport): number {
  const def = questDef(q.id);
  const v = def.measure(run, q.map);
  return def.mode === 'sum' ? q.progress + v : Math.max(q.progress, v);
}

export function describeQuest(q: DailyQuest): string {
  return questDef(q.id).describe(q.target, MAPS[q.map].name);
}

export function claimQuest(save: SaveData, index: number): number {
  const q = save.daily.quests[index];
  if (!q || q.claimed || !questDone(q)) return 0;
  q.claimed = true;
  save.gold += q.reward;
  return q.reward;
}

export const bonusReady = (save: SaveData): boolean =>
  !save.daily.bonusClaimed && save.daily.quests.length > 0 && save.daily.quests.every(questDone);

export function claimBonus(save: SaveData): number {
  if (!bonusReady(save)) return 0;
  save.daily.bonusClaimed = true;
  save.gold += save.daily.bonus;
  return save.daily.bonus;
}

/** Lifetime numbers, with a run in progress added. Boss kills and unlocked maps are saved the moment they happen. */
export function lifetime(save: SaveData, run?: RunReport): Lifetime {
  const s = save.stats;
  return {
    kills: s.kills + (run?.kills ?? 0),
    eliteKills: s.eliteKills + (run?.eliteKills ?? 0),
    bossKills: save.bossKills.reduce((a, b) => a + b, 0),
    bestTime: Math.max(0, ...save.bestTimes, run?.time ?? 0),
    bestLevel: Math.max(s.bestLevel, run?.level ?? 0),
    maps: save.unlockedMaps,
    chests: s.chests + (run?.chests ?? 0),
    evolutions: s.evolutions + (run?.evolutions ?? 0),
    gold: s.gold + (run?.gold ?? 0),
    clears: save.clears.reduce((a, b) => a + b, 0),
    heat: Math.max(0, ...save.bestHeat),
  };
}

/** How many tiers of each achievement the numbers reach (claimed or not). */
export function tiersReached(values: Lifetime): Record<AchievementId, number> {
  const out = {} as Record<AchievementId, number>;
  for (const a of ACHIEVEMENTS) out[a.id] = a.tiers.filter((t) => values[a.stat] >= t.target).length;
  return out;
}

/**
 * Adds a finished run to the day's quests and the lifetime numbers. `bonus` is the end-of-run gold on top of
 * what was picked up. Returns the quests this run finished.
 */
export function applyRun(save: SaveData, run: RunReport, bonus = 0, now = new Date()): DailyQuest[] {
  ensureDaily(save, now);
  const finished: DailyQuest[] = [];
  for (const q of save.daily.quests) {
    const was = questDone(q);
    q.progress = progressWith(q, run);
    if (!was && questDone(q)) finished.push(q);
  }
  const s = save.stats;
  s.runs++;
  s.kills += run.kills;
  s.eliteKills += run.eliteKills;
  s.chests += run.chests;
  s.evolutions += run.evolutions;
  s.gold += Math.floor(run.gold) + bonus;
  s.bestLevel = Math.max(s.bestLevel, run.level);
  s.shrines += run.shrines;
  if (run.died) s.deaths++;
  for (const [id, n] of Object.entries(run.monsters) as [MonsterId, number][]) save.bestiary[id] = (save.bestiary[id] ?? 0) + n;
  return finished;
}

export interface AchievementState {
  def: AchievementDef;
  value: number;
  /** Tiers claimed so far. */
  claimed: number;
  /** The next tier to work toward or claim; null once every tier is claimed. */
  next: { target: number; reward: number } | null;
  claimable: boolean;
}

export function achievementState(save: SaveData, def: AchievementDef, values = lifetime(save)): AchievementState {
  const claimed = save.achievements[def.id];
  const next = def.tiers[claimed] ?? null;
  const value = values[def.stat];
  return { def, value, claimed, next, claimable: !!next && value >= next.target };
}

export function claimAchievement(save: SaveData, id: AchievementId): number {
  const def = ACHIEVEMENTS.find((a) => a.id === id)!;
  const st = achievementState(save, def);
  if (!st.claimable || !st.next) return 0;
  save.achievements[id]++;
  save.gold += st.next.reward;
  return st.next.reward;
}

/** Rewards waiting to be claimed: the number on the menu's Quests button. */
export function claimableCount(save: SaveData): number {
  const values = lifetime(save);
  return (
    save.daily.quests.filter((q) => !q.claimed && questDone(q)).length +
    (bonusReady(save) ? 1 : 0) +
    ACHIEVEMENTS.filter((a) => achievementState(save, a, values).claimable).length
  );
}

export const ROMAN = ['I', 'II', 'III', 'IV', 'V', 'VI'];
