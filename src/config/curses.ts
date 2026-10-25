/**
 * Curses are picked in the menu before a run: each one makes runs harder and adds "heat", and every point of heat
 * adds to the gold earned. For players whose upgrades have made a map easy. They open after the first boss.
 */
export type CurseId = 'horde' | 'frenzy' | 'iron' | 'mutation' | 'fragile' | 'famine' | 'fewer' | 'tyrant';

export interface CurseDef {
  id: CurseId;
  name: string;
  icon: string;
  text: string;
  heat: number;
}

export const CURSES: CurseDef[] = [
  { id: 'horde', name: 'Horde', icon: 'icon_skull', text: '30% more monsters', heat: 1 },
  { id: 'frenzy', name: 'Frenzy', icon: 'icon_boots', text: 'Monsters move 20% faster', heat: 1 },
  { id: 'iron', name: 'Iron Hide', icon: 'icon_armor', text: 'Monsters have 50% more HP', heat: 2 },
  { id: 'mutation', name: 'Mutation', icon: 'icon_crown', text: 'Elites come twice as often, with one more power', heat: 2 },
  { id: 'fragile', name: 'Glass Bones', icon: 'icon_heart', text: 'You take 30% more damage', heat: 1 },
  { id: 'famine', name: 'Famine', icon: 'meat', text: 'All healing is halved', heat: 1 },
  { id: 'fewer', name: 'Narrow Path', icon: 'icon_scroll', text: 'Level-ups offer 2 cards instead of 3', heat: 1 },
  { id: 'tyrant', name: 'Tyrant', icon: 'icon_trophy', text: 'Bosses and leaders: 50% more HP, enraged from the start', heat: 2 },
];

export const CURSE_IDS = CURSES.map((c) => c.id);

/** Gold earned goes up this much per point of heat. */
export const HEAT_GOLD = 0.15;
/** Curses open once this many maps are unlocked (the first boss is beaten). */
export const CURSE_UNLOCK_MAPS = 2;

/** How strong each curse is. */
export const CURSE = {
  horde: 1.3,
  frenzy: 1.2,
  iron: 1.5,
  mutationElites: 2,
  fragile: 1.3,
  famine: 0.5,
  tyrantHp: 1.5,
};

export function curseDef(id: CurseId): CurseDef {
  return CURSES.find((c) => c.id === id)!;
}

export function heatOf(ids: readonly CurseId[]): number {
  return ids.reduce((sum, id) => sum + curseDef(id).heat, 0);
}

export const MAX_HEAT = heatOf(CURSE_IDS);
