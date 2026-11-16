/**
 * Each map can be played harder once it has been cleared: Hard after clearing Normal, Nightmare after Hard, then
 * Abyss 1, 2, 3... Monsters get more HP and hit harder; gold and loot get better.
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

/** Abyss steps go on forever in principle; this is just a sane ceiling for saves. */
export const MAX_DIFFICULTY = 99;
/** Each Abyss step past Nightmare: monster HP and damage multiply by these, gold goes up by this much. */
export const ABYSS = { hp: 1.3, damage: 1.1, gold: 0.4 };

/**
 * Difficulty `d`: Normal, Hard, Nightmare, then Abyss 1, 2, 3... with no end, each clear opening the next. For
 * players who have outgrown Nightmare: harder every step, and the loot gets better with it.
 */
export function difficultyDef(d: number): DifficultyDef {
  if (d < DIFFICULTIES.length) return DIFFICULTIES[Math.max(0, d)];
  const n = d - DIFFICULTIES.length + 1;
  const top = DIFFICULTIES[DIFFICULTIES.length - 1];
  return { name: `Abyss ${n}`, icon: 'icon_nightmare', hp: top.hp * ABYSS.hp ** n, damage: top.damage * ABYSS.damage ** n, gold: top.gold + ABYSS.gold * n, color: '#ff6b6b' };
}

/** Hardest difficulty open on a map that has been cleared up to `cleared` (0 = never). */
export const maxDifficulty = (cleared: number): number => Math.min(MAX_DIFFICULTY, Math.max(0, cleared));
