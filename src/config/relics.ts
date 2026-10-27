/**
 * MVP Cards (relics in the code) are won by clearing maps (Normal, then Hard) and change the rules of every run.
 * Two can be worn.
 */
export type RelicId = 'slime' | 'lich' | 'demon' | 'boar' | 'captain' | 'ogre';

export interface RelicDef {
  id: RelicId;
  name: string;
  icon: string;
  text: string;
  /** Won by clearing this map on this difficulty (0 = Normal, 1 = Hard). */
  map: number;
  difficulty: number;
}

export const RELICS: RelicDef[] = [
  { id: 'slime', name: 'Jelly Monarch Card', icon: 'relic_slime', text: '+1 card reroll each run, XP +10%', map: 0, difficulty: 0 },
  { id: 'lich', name: 'Shrine Oni Card', icon: 'relic_lich', text: 'Pickup range +40%, gold +15%', map: 1, difficulty: 0 },
  { id: 'demon', name: 'Sunscar Pharaoh Card', icon: 'relic_demon', text: 'Crit chance +8%, critical hits deal x2.5', map: 2, difficulty: 0 },
  { id: 'boar', name: 'Ironhide Boar Card', icon: 'relic_boar', text: 'Start with your skill at Lv 2 and a random monster card', map: 0, difficulty: 1 },
  { id: 'captain', name: 'Bigpaw Card', icon: 'relic_captain', text: 'Once a run, rise again with full HP', map: 1, difficulty: 1 },
  { id: 'ogre', name: 'Sandstone Golem Card', icon: 'relic_ogre', text: 'Chests give one more upgrade and double gold', map: 2, difficulty: 1 },
];

export const RELIC_IDS = RELICS.map((r) => r.id);
export const MAX_RELICS = 2;

export function relicDef(id: RelicId): RelicDef {
  return RELICS.find((r) => r.id === id)!;
}

/** The relic won by clearing `map` on `difficulty`, if any. */
export function relicFor(map: number, difficulty: number): RelicDef | undefined {
  return RELICS.find((r) => r.map === map && r.difficulty === difficulty);
}
