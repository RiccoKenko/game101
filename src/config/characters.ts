import { type WeaponId } from './weapons';

export type CharacterId = 'archer' | 'mage';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  /** What kind of fighter, shown next to the name in the menu. */
  title: string;
  /** Strengths and weaknesses, one line each in the menu. */
  pros: string;
  cons: string;
  /** The weapon each run starts with; it fires from the bow or the casting hand and plays the shot. */
  start: WeaponId;
  /** Texture key of the animated sheet (public/art/hero/<sheet>.webp + .json) and of the menu picture. */
  sheet: string;
  menu: string;
  /** Multipliers on the base stats (cooldown < 1 is faster), and extra critical hit chance. */
  maxHp: number;
  area: number;
  speed: number;
  cooldown: number;
  crit: number;
  /** Run and Gun: attacks come this much faster while the hero is moving (0 = no). */
  moveHaste: number;
  /** Mana Shield: blocks one hit, and comes back this many seconds after it breaks (0 = no shield). */
  shield: number;
  /** Where shots leave the bow or hand, from the feet in game px, when aiming right (x forward, y up). */
  muzzle: [number, number];
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'archer',
    name: 'Little Archer',
    title: 'Ranger',
    pros: 'Fast, sharp-eyed (+5% crit), shoots 15% faster on the move',
    cons: 'Attack area -10%',
    start: 'bow',
    sheet: 'hero',
    menu: 'hero_menu',
    maxHp: 1,
    area: 0.9,
    speed: 1.1,
    cooldown: 1,
    crit: 0.05,
    moveHaste: 0.15,
    shield: 0,
    muzzle: [40, 84],
  },
  {
    id: 'mage',
    name: 'Little Mage',
    title: 'Arcanist',
    pros: 'Area +20%, spells 10% faster, a Mana Shield blocks one hit',
    cons: 'HP -20%, a little slower',
    start: 'bolt',
    sheet: 'mage',
    menu: 'mage_menu',
    maxHp: 0.8,
    area: 1.2,
    speed: 0.95,
    cooldown: 0.9,
    crit: 0,
    moveHaste: 0,
    shield: 10,
    muzzle: [38, 96],
  },
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);

export function characterDef(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS[0];
}
