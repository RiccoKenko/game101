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

export const DIFFICULTY: Record<Difficulty, DifficultyDef> = {
  easy: { name: 'Easy', blurb: 'Fewer, softer pirates and more gold', hp: 0.75, gold: 1.25, count: 0.8 },
  normal: { name: 'Normal', blurb: 'The battle as designed', hp: 1, gold: 1, count: 1 },
  hard: { name: 'Hard', blurb: 'Tougher pirates, and more of them', hp: 1.3, gold: 0.9, count: 1.2 },
};

/** The level's waves with each group's size scaled; a group never drops below one pirate. */
export function scaleWaves(waves: WaveDef[], count: number, isBoss: (enemy: WaveDef['groups'][number]['enemy']) => boolean): WaveDef[] {
  if (count === 1) return waves;
  return waves.map((w) => ({
    ...w,
    groups: w.groups.map((g) => (isBoss(g.enemy) ? g : { ...g, count: Math.max(1, Math.round(g.count * count)) })),
  }));
}
