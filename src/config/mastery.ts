import { type CharacterId } from './characters';
import { talentDef, type TalentId } from './talents';

/** A hero's lasting rank (shown as Job Lv), earned by playing that hero, and what each level adds. */
export const MASTERY = {
  maxLevel: 15,
  /** Damage and max HP per level above 1. */
  damage: 0.02,
  maxHp: 0.02,
  /** Mastery XP from a run: per second survived, one per this many monsters, per boss or leader defeated. */
  perSecond: 1,
  killsPerPoint: 25,
  perBoss: 60,
  /** What the "Master" reward at the top level adds to gold. */
  masterGold: 0.1,
};

/** Mastery XP needed to go from `level` to `level + 1`. */
export function masteryToNext(level: number): number {
  return 200 + 150 * (level - 1);
}

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
