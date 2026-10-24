import { type WeaponId } from './weapons';

export type CharacterId = 'archer' | 'mage';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  /** One line under the name in the menu. */
  perk: string;
  /** The weapon each run starts with; it fires from the bow or the casting hand and plays the shot. */
  start: WeaponId;
  /** Gold to unlock (0 = free from the start). */
  price: number;
  /** Texture key of the animated sheet (public/art/hero/<sheet>.webp + .json) and of the menu picture. */
  sheet: string;
  menu: string;
  /** Multipliers on the base stats. */
  maxHp: number;
  area: number;
  /** Where shots leave the bow or hand, from the feet in game px, when aiming right (x forward, y up). */
  muzzle: [number, number];
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'archer',
    name: 'Little Archer',
    perk: 'Starts with the Bow. Steady and sure.',
    start: 'bow',
    price: 0,
    sheet: 'hero',
    menu: 'hero_menu',
    maxHp: 1,
    area: 1,
    muzzle: [40, 84],
  },
  {
    id: 'mage',
    name: 'Little Mage',
    perk: 'Starts with Magic Bolt. Area +15%, HP -10%.',
    start: 'bolt',
    price: 600,
    sheet: 'mage',
    menu: 'mage_menu',
    maxHp: 0.9,
    area: 1.15,
    muzzle: [44, 92],
  },
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);

export function characterDef(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
