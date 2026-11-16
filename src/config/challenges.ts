import { type CurseId } from './curses';

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
