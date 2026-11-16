import { type CharacterId } from './characters';
import { talentDef, type TalentId } from './talents';

/** A hero's lasting rank (shown as Job Lv), earned by playing that hero, and what each level adds. */
export const MASTERY = {
  maxLevel: 50,
  /** Damage and max HP per level above 1, up to this level (past it, stat points do the work). */
  damage: 0.02,
  maxHp: 0.02,
  flatUntil: 15,
  /** Mastery XP from a run: per second survived, one per this many monsters, per boss or leader defeated. */
  perSecond: 1,
  killsPerPoint: 25,
  perBoss: 60,
  /** What the "Master" reward at the top level adds to gold. */
  masterGold: 0.1,
};

/** Mastery XP needed to go from `level` to `level + 1` (about 65 runs to Job Lv 40, 100 to 50). */
export function masteryToNext(level: number): number {
  return 200 + 100 * (level - 1);
}

/**
 * Stat points, the classic six: one point per Job Lv, spent per hero in the Status screen. Each point adds
 * `per` to what it raises, up to `STAT_CAP` points in one stat.
 */
export type StatId = 'str' | 'agi' | 'vit' | 'int' | 'dex' | 'luk';
export interface StatDef {
  id: StatId;
  name: string;
  /** What one point does, for the screen. */
  text: string;
  per: number;
}
export const STATS: StatDef[] = [
  { id: 'str', name: 'STR', text: 'Damage +2%', per: 0.02 },
  { id: 'agi', name: 'AGI', text: 'Attack speed +1.5%', per: 0.015 },
  { id: 'vit', name: 'VIT', text: 'Max HP +3%', per: 0.03 },
  { id: 'int', name: 'INT', text: 'Attack area +1.5%', per: 0.015 },
  { id: 'dex', name: 'DEX', text: 'Move speed +1%', per: 0.01 },
  { id: 'luk', name: 'LUK', text: 'Crit +0.5%, gold +1%', per: 0.005 },
];
export const STAT_IDS = STATS.map((s) => s.id);
export const STAT_CAP = 30;
/** Gold to take every point back and spend them again. */
export const STAT_RESET_GOLD = 500;

/**
 * The job change: at Job Lv 40, a hero who has cleared a map on Nightmare can take its second job. It brings
 * a new name, its own power, damage and max HP, ten stat points at once and two a level after.
 */
export const JOB_CHANGE = { level: 40, nightmare: 2, points: 10, damage: 0.1, maxHp: 0.1 };

export interface SecondJob {
  name: string;
  /** What the job adds, for the screen. */
  text: string;
  /** Extra projectiles, crit chance, area and cooldown (0.9 = 10% faster), armor, max HP. */
  projectiles: number;
  crit: number;
  area: number;
  cooldown: number;
  armor: number;
  maxHp: number;
}
export const SECOND_JOBS: Record<CharacterId, SecondJob> = {
  swordman: { name: 'Knight', text: 'Armor +2, max HP +20%', projectiles: 0, crit: 0, area: 0, cooldown: 1, armor: 2, maxHp: 0.2 },
  archer: { name: 'Hunter', text: '+1 arrow on every skill, crit +5%', projectiles: 1, crit: 0.05, area: 0, cooldown: 1, armor: 0, maxHp: 0 },
  mage: { name: 'Wizard', text: 'Attack area +20%, skills 10% faster', projectiles: 0, crit: 0, area: 0.2, cooldown: 0.9, armor: 0, maxHp: 0 },
};

export type MasteryReward =
  /** A talent the hero can't be dealt before this level. */
  | { level: number; kind: 'talent'; talent: TalentId }
  /** One more card reroll, or one more banish, every run. */
  | { level: number; kind: 'reroll' }
  | { level: number; kind: 'banish' }
  /** The hero's own weapon starts a level higher. */
  | { level: number; kind: 'start' }
  /** A golden title in the menu, and more gold. */
  | { level: number; kind: 'master' };

export const MASTERY_REWARDS: Record<CharacterId, MasteryReward[]> = {
  swordman: [
    { level: 3, kind: 'talent', talent: 'concentration' },
    { level: 5, kind: 'reroll' },
    { level: 7, kind: 'talent', talent: 'spirit' },
    { level: 9, kind: 'banish' },
    { level: 11, kind: 'talent', talent: 'guts' },
    { level: 13, kind: 'start' },
    { level: 15, kind: 'master' },
  ],
  archer: [
    { level: 3, kind: 'talent', talent: 'rain' },
    { level: 5, kind: 'reroll' },
    { level: 7, kind: 'talent', talent: 'trick' },
    { level: 9, kind: 'banish' },
    { level: 11, kind: 'talent', talent: 'mark' },
    { level: 13, kind: 'start' },
    { level: 15, kind: 'master' },
  ],
  mage: [
    { level: 3, kind: 'talent', talent: 'stars' },
    { level: 5, kind: 'reroll' },
    { level: 7, kind: 'talent', talent: 'stormcall' },
    { level: 9, kind: 'banish' },
    { level: 11, kind: 'talent', talent: 'arcecho' },
    { level: 13, kind: 'start' },
    { level: 15, kind: 'master' },
  ],
};

export function describeReward(r: MasteryReward): string {
  switch (r.kind) {
    case 'talent':
      return `New talent: ${talentDef(r.talent).name}`;
    case 'reroll':
      return '+1 card reroll every run';
    case 'banish':
      return '+1 card banish every run';
    case 'start':
      return 'Start skill begins a level higher';
    case 'master':
      return `Master title, gold +${Math.round(MASTERY.masterGold * 100)}%`;
  }
}

export function rewardIcon(r: MasteryReward): string {
  switch (r.kind) {
    case 'talent':
      return talentDef(r.talent).icon;
    case 'reroll':
      return 'icon_retry';
    case 'banish':
      return 'icon_banish';
    case 'start':
      return 'icon_might';
    case 'master':
      return 'icon_crown';
  }
}
