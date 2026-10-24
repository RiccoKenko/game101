/**
 * Easy, Normal and Hard: the same level with tougher or softer pirates, more or fewer of them, and more or
 * less gold to start with. Stars and the map stay the same.
 */
import type { WaveDef } from './waves';

export type Difficulty = 'easy' | 'normal' | 'hard';
export const DIFFICULTIES: Difficulty[] = ['easy', 'normal', 'hard'];

export interface DifficultyDef {
  name: string;
  blurb: string;
  /** Multiplier on every pirate's hit points. */
  hp: number;
  /** Multiplier on the gold the level starts with. */
  gold: number;
  /** Multiplier on how many pirates each group sends (bosses always come alone). */
  count: number;
}

/**
 * Tuned with scripts/tools/balance_bot.mts (a bot that never moves the hero or calls the companions):
 * - Easy: half the spots with towers upgraded once still wins every level with all 3 stars.
 * - Normal: a mixed defence that upgrades gets 3 stars; one tower kind alone struggles from level 2 on.
 * - Hard: the same mixed defence still wins, usually losing a few crystals (2 stars is typical, 3 possible).
 * Pirate hit points weigh the most: they make every pirate harder without paying more gold for it.
 */
export const DIFFICULTY: Record<Difficulty, DifficultyDef> = {
  easy: { name: 'Easy', blurb: 'Fewer, softer pirates and more gold', hp: 0.8, gold: 1.2, count: 0.85 },
  normal: { name: 'Normal', blurb: 'The battle as designed', hp: 1, gold: 1, count: 1 },
  hard: { name: 'Hard', blurb: 'Tougher pirates, and more of them', hp: 1.2, gold: 0.95, count: 1.1 },
};

/** The level's waves with each group's size scaled; a group never drops below one pirate. */
export function scaleWaves(waves: WaveDef[], count: number, isBoss: (enemy: WaveDef['groups'][number]['enemy']) => boolean): WaveDef[] {
  if (count === 1) return waves;
  return waves.map((w) => ({
    ...w,
    groups: w.groups.map((g) => (isBoss(g.enemy) ? g : { ...g, count: Math.max(1, Math.round(g.count * count)) })),
  }));
}
