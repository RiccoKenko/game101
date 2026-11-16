import { type CurseId } from './curses';
import { type BossId } from './enemies';

/**
 * The daily challenge: one run a day on a map with two curses and a twist, the same for everyone on the same day
 * (the day picks the seed). Played once; the longer it lasts the better the reward.
 */
export type TwistId = 'glass' | 'vampire' | 'arsenal' | 'swift' | 'giants';

export interface TwistDef {
  id: TwistId;
  name: string;
  text: string;
}

export const TWISTS: TwistDef[] = [
  { id: 'glass', name: 'Glass Cannon', text: 'You deal double damage, with half the max HP' },
  { id: 'vampire', name: 'Blood Moon', text: 'Start with Gummy Card Lv 3 (heal on defeats); no healing items' },
  { id: 'arsenal', name: 'Arsenal', text: 'Start with two more skills at Lv 3' },
  { id: 'swift', name: 'Quickstep', text: 'You move 30% faster, and so do the monsters' },
  { id: 'giants', name: 'Elite Hunt', text: 'Elites come three times as often, and drop more' },
];

/** Curses a daily challenge can draw (Narrow Path and Tyrant are left out: they make the twists unfair). */
export const DAILY_CURSES: CurseId[] = ['horde', 'frenzy', 'iron', 'mutation', 'fragile', 'famine'];

export const DAILY = {
  curses: 2,
  /** Ore per full minute lasted; a card for lasting this long; gear (Epic or better) for a clear. */
  orePerMinute: 4,
  cardAt: 600,
  swift: 1.3,
  giantsElites: 3,
};

/**
 * The weekly boss: each week one boss wakes up (Awakened: far more HP, bigger, its signature moves faster; enraged
 * from half HP; every boss hits as hard as the others, so no week is unfair). The hero comes in at Lv 20 and has five minutes to bring it down. The first win of the week
 * gives the boss's MVP card (or Legendary gear if it is already owned), ore and a monster card.
 */
export const WEEKLY = { level: 25, timeLimit: 300, hp: 16000, damage: 14, moveSpeed: 1.15, scale: 1.25, spawn: 0.5, ore: 50 };
/** The order the bosses come round in, a week each. */
export const WEEKLY_BOSSES: BossId[] = ['boss_boar', 'boss_slime', 'boss_captain', 'boss_lich', 'boss_ogre', 'boss_demon'];
