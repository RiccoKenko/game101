/**
 * Each map can be played harder once it has been cleared: Hard after clearing Normal, Nightmare after Hard.
 * Monsters get more HP and hit harder; gold pays more.
 */
export interface DifficultyDef {
  name: string;
  icon: string;
  /** Multipliers on monster HP and damage, and on gold earned. */
  hp: number;
  damage: number;
  gold: number;
  /** Text colour of its name. */
  color: string;
}

export const DIFFICULTIES: DifficultyDef[] = [
  { name: 'Normal', icon: 'icon_skull', hp: 1, damage: 1, gold: 1, color: '#b4f0a0' },
  { name: 'Hard', icon: 'icon_hard', hp: 1.7, damage: 1.35, gold: 1.6, color: '#ff9a7a' },
  { name: 'Nightmare', icon: 'icon_nightmare', hp: 2.8, damage: 1.75, gold: 2.4, color: '#c9a8ff' },
];

/** Hardest difficulty open on a map that has been cleared up to `cleared` (0 = never). */
export const maxDifficulty = (cleared: number): number => Math.min(DIFFICULTIES.length - 1, cleared);
