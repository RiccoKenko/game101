/**
 * Relics are won by clearing maps (Normal, then Hard) and change the rules of every run. Two can be worn.
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
  { id: 'slime', name: 'Slime Crown', icon: 'relic_slime', text: '+1 card reroll each run, XP +10%', map: 0, difficulty: 0 },
  { id: 'lich', name: 'Lich Lantern', icon: 'relic_lich', text: 'Pickup range +40%, gold +15%', map: 1, difficulty: 0 },
  { id: 'demon', name: 'Demon Horn', icon: 'relic_demon', text: 'Crit chance +8%, critical hits deal x2.5', map: 2, difficulty: 0 },
  { id: 'boar', name: 'Boar Tusk', icon: 'relic_boar', text: 'Start with your weapon at Lv 2 and a random rune', map: 0, difficulty: 1 },
  { id: 'captain', name: "Captain's Medal", icon: 'relic_captain', text: 'Once a run, rise again with full HP', map: 1, difficulty: 1 },
  { id: 'ogre', name: 'Ogre Key', icon: 'relic_ogre', text: 'Chests give one more upgrade and double gold', map: 2, difficulty: 1 },
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
