import { type CharacterId } from '../config/characters';
import { UNLOCKS, unlockKey, type Goal, type GoalStat, type MonsterId, type UnlockDef } from '../config/collection';
import { MAPS } from '../config/maps';
import { MASTERY, MASTERY_REWARDS, masteryToNext, type MasteryReward } from '../config/mastery';
import { type RunReport } from '../config/quests';
import { type TalentId } from '../config/talents';
import { lifetime } from './quests';
import { type SaveData } from './save';

/** Everything the unlock goals are measured against. */
export interface Records {
  monsters: Partial<Record<MonsterId, number>>;
  stats: Record<GoalStat, number>;
}

/** The save's numbers, with a run in progress (or just finished, not yet added) on top. */
export function records(save: SaveData, run?: RunReport): Records {
  const monsters: Partial<Record<MonsterId, number>> = { ...save.bestiary };
  for (const [id, n] of Object.entries(run?.monsters ?? {}) as [MonsterId, number][]) monsters[id] = (monsters[id] ?? 0) + n;
  // Boss kills were counted per map before the bestiary existed (and are saved the moment a boss falls).
  MAPS.forEach((m, i) => (monsters[m.boss] = Math.max(monsters[m.boss] ?? 0, save.bossKills[i])));
  const life = lifetime(save, run);
  return {
    monsters,
    stats: {
      level: life.bestLevel,
      time: life.bestTime,
      chests: life.chests,
      elites: life.eliteKills,
      evolutions: life.evolutions,
      shrines: save.stats.shrines + (run?.shrines ?? 0),
      deaths: save.stats.deaths + (run?.died ? 1 : 0),
    },
  };
}

export function goalValue(g: Goal, rec: Records): number {
  return 'monster' in g ? (rec.monsters[g.monster] ?? 0) : rec.stats[g.stat];
}

export const isUnlocked = (save: SaveData, u: { kind: string; id: string }): boolean => {
  const key = unlockKey(u);
  return save.unlocked.includes(key) || !UNLOCKS.some((x) => unlockKey(x) === key);
};

/** Unlocks the records reach that the save doesn't have yet. */
export function reachedUnlocks(save: SaveData, rec: Records): UnlockDef[] {
  return UNLOCKS.filter((u) => !save.unlocked.includes(unlockKey(u)) && goalValue(u.goal, rec) >= u.goal.n);
}

/** Opens everything the records reach (old saves get what their lifetime numbers already earned). */
export function claimUnlocks(save: SaveData, rec = records(save)): UnlockDef[] {
  const got = reachedUnlocks(save, rec);
  for (const u of got) save.unlocked.push(unlockKey(u));
  return got;
}

/** Keys of everything still locked: left out of the level-up cards. */
export function lockedKeys(save: SaveData): string[] {
  return UNLOCKS.map(unlockKey).filter((k) => !save.unlocked.includes(k));
}

/** Unlocked but not looked at in the Collection yet ("NEW"). */
export function unseen(save: SaveData): string[] {
  return save.unlocked.filter((k) => !save.seen.includes(k));
}

// ---------------------------------------------------------------- mastery

export interface MasteryState {
  level: number;
  /** XP into the current level, and needed for the next (0 at the top level). */
  into: number;
  need: number;
}

export function masteryState(xp: number): MasteryState {
  let level = 1;
  let left = Math.max(0, Math.floor(xp));
  while (level < MASTERY.maxLevel && left >= masteryToNext(level)) left -= masteryToNext(level++);
  return level < MASTERY.maxLevel ? { level, into: left, need: masteryToNext(level) } : { level, into: 0, need: 0 };
}

export const masteryLevel = (save: SaveData, hero: CharacterId): number => masteryState(save.mastery[hero]).level;

/** Total mastery XP at which a level is reached. */
export function xpForLevel(level: number): number {
  let xp = 0;
  for (let l = 1; l < Math.min(level, MASTERY.maxLevel); l++) xp += masteryToNext(l);
  return xp;
}

/** Mastery XP a run earns. */
export function masteryXp(seconds: number, kills: number, bosses: number): number {
  return Math.floor(seconds * MASTERY.perSecond + kills / MASTERY.killsPerPoint + bosses * MASTERY.perBoss);
}

/** The hero's mastery rewards reached at this level. */
export function masteryRewards(hero: CharacterId, level: number): MasteryReward[] {
  return MASTERY_REWARDS[hero].filter((r) => r.level <= level);
}

/** Talents the hero can't be dealt yet. */
export function lockedTalents(hero: CharacterId, level: number): TalentId[] {
  return MASTERY_REWARDS[hero].flatMap((r) => (r.kind === 'talent' && r.level > level ? [r.talent] : []));
}

/** What mastery adds to a run at this level. */
export function masteryPerks(hero: CharacterId, level: number) {
  const has = (kind: MasteryReward['kind']) => masteryRewards(hero, level).filter((r) => r.kind === kind).length;
  return {
    damage: MASTERY.damage * (level - 1),
    maxHp: MASTERY.maxHp * (level - 1),
    rerolls: has('reroll'),
    banishes: has('banish'),
    startLevels: has('start'),
    gold: has('master') ? MASTERY.masterGold : 0,
  };
}
