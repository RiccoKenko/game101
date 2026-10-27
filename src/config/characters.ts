import { WEAPON_IDS, type WeaponId } from './weapons';

export type CharacterId = 'swordman' | 'archer' | 'mage';

export interface CharacterDef {
  id: CharacterId;
  name: string;
  /** What kind of fighter, shown next to the name in the menu. */
  title: string;
  /** Strengths and weaknesses, one line each in the menu. */
  pros: string;
  cons: string;
  /** The skill each run starts with; it fires from the bow or the casting hand and plays the shot. */
  start: WeaponId;
  /** The class's own skills (the start skill first): the only ones its level-up cards offer. */
  skills: WeaponId[];
  /** Texture key of the animated sheet (public/art/hero/<sheet>.webp + .json) and of the menu picture. */
  sheet: string;
  menu: string;
  /** Colours the borrowed sheet of a hero whose own art isn't painted yet. */
  tint?: number;
  /** Fights up close (the test autopilot walks in instead of keeping away). */
  melee?: boolean;
  /** Multipliers on the base stats (cooldown < 1 is faster), and extra critical hit chance. */
  maxHp: number;
  area: number;
  speed: number;
  cooldown: number;
  crit: number;
  /** Damage taken off every hit. */
  armor: number;
  /** Run and Gun: attacks come this much faster while the hero is moving (0 = no). */
  moveHaste: number;
  /** Safety Wall: blocks one hit, and comes back this many seconds after it breaks (0 = no shield). */
  shield: number;
  /** Where shots leave the bow or hand, from the feet in game px, when aiming right (x forward, y up). */
  muzzle: [number, number];
  /** Not offered in the menu yet (its art is being redrawn); `?hero=` still plays it. */
  hidden?: boolean;
}

export const CHARACTERS: CharacterDef[] = [
  {
    id: 'swordman',
    name: 'Swordman',
    title: 'Vanguard',
    pros: 'HP +30%, armor +1, Bash stuns what it hits',
    cons: 'Close range, a little slower',
    start: 'slash',
    skills: ['slash', 'bash', 'quake', 'aura', 'spear', 'ward', 'axes'],
    sheet: 'swordman',
    menu: 'swordman_menu',
    hidden: true,
    melee: true,
    maxHp: 1.3,
    area: 1,
    speed: 0.95,
    cooldown: 1,
    crit: 0,
    armor: 1,
    moveHaste: 0,
    shield: 0,
    muzzle: [40, 84],
  },
  {
    id: 'archer',
    name: 'Archer',
    title: 'Ranger',
    pros: 'Fast, sharp-eyed (+5% crit), shoots 15% faster on the move',
    cons: 'Attack area -10%',
    start: 'bow',
    skills: ['bow', 'daggers', 'flask', 'boomerang', 'traps', 'wisps', 'twister'],
    sheet: 'archer',
    menu: 'archer_menu',
    maxHp: 1,
    area: 0.9,
    speed: 1.1,
    cooldown: 1,
    crit: 0.05,
    armor: 0,
    moveHaste: 0.15,
    shield: 0,
    muzzle: [40, 84],
  },
  {
    id: 'mage',
    name: 'Mage',
    title: 'Arcanist',
    pros: 'Area +20%, spells 10% faster, Safety Wall blocks one hit',
    cons: 'HP -20%, a little slower',
    start: 'bolt',
    skills: ['bolt', 'lightning', 'frost', 'shuriken', 'bomb', 'firetrail', 'beam'],
    sheet: 'mage',
    menu: 'mage_menu',
    hidden: true,
    maxHp: 0.8,
    area: 1.2,
    speed: 0.95,
    cooldown: 0.9,
    crit: 0,
    armor: 0,
    moveHaste: 0,
    shield: 10,
    muzzle: [38, 96],
  },
];

export const CHARACTER_IDS = CHARACTERS.map((c) => c.id);

/** The classes the menu offers. */
export const PLAYABLE = CHARACTERS.filter((c) => !c.hidden);

/** Every skill this class doesn't learn: its level-up cards never offer them. */
export function otherSkills(c: CharacterDef): WeaponId[] {
  return WEAPON_IDS.filter((id) => !c.skills.includes(id));
}

export function characterDef(id: CharacterId): CharacterDef {
  return CHARACTERS.find((c) => c.id === id) ?? CHARACTERS.find((c) => c.id === 'archer')!;
}
