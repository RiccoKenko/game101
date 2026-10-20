export type WeaponId = 'bow' | 'daggers' | 'axes' | 'aura' | 'lightning' | 'bomb' | 'boomerang';
export type EvolutionId = 'stormbow' | 'blades' | 'titanaxes' | 'sanctuary';
export type PassiveId = 'heart' | 'boots' | 'powergem' | 'hourglass' | 'quiver' | 'magnet' | 'tome';

/** Absolute stats of a weapon at one level. Area is a multiplier on the weapon's base size. */
export interface WeaponStats {
  damage: number;
  /** Seconds between attacks (for Axes: rest time between spins). */
  cooldown: number;
  /** Projectiles / strikes / axes per attack. */
  amount: number;
  /** Extra enemies a projectile can pass through (0 = stops at first hit). */
  pierce: number;
  area: number;
  /** Projectile speed in px/s (Axes: radians per second). */
  speed: number;
  /** Seconds the attack lasts (Axes spin time). 0 = not used. */
  duration: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  description: string;
  /** levels[0] = Lv1 ... levels[4] = Lv5. */
  levels: WeaponStats[];
  /** Card text for reaching Lv2..Lv5 (index 0 = Lv2). */
  upgrades: string[];
  evolution?: { into: EvolutionId; requires: PassiveId };
}

export interface EvolutionDef {
  id: EvolutionId;
  base: WeaponId;
  name: string;
  icon: string;
  description: string;
  stats: WeaponStats;
}

const s = (p: Partial<WeaponStats>, base: WeaponStats): WeaponStats => ({ ...base, ...p });

const bow1: WeaponStats = { damage: 10, cooldown: 0.85, amount: 1, pierce: 1, area: 1, speed: 950, duration: 0 };
const bow2 = s({ amount: 2 }, bow1);
const bow3 = s({ damage: 15 }, bow2);
const bow4 = s({ pierce: 3, cooldown: 0.7 }, bow3);
const bow5 = s({ amount: 3, damage: 20 }, bow4);

const dag1: WeaponStats = { damage: 8, cooldown: 1.0, amount: 1, pierce: 0, area: 1, speed: 1050, duration: 0 };
const dag2 = s({ amount: 2 }, dag1);
const dag3 = s({ damage: 12, cooldown: 0.85 }, dag2);
const dag4 = s({ amount: 3 }, dag3);
const dag5 = s({ damage: 16, pierce: 1 }, dag4);

const axe1: WeaponStats = { damage: 12, cooldown: 2.6, amount: 2, pierce: 0, area: 1, speed: 3.4, duration: 3 };
const axe2 = s({ amount: 3 }, axe1);
const axe3 = s({ damage: 18, area: 1.2 }, axe2);
const axe4 = s({ amount: 4, duration: 4 }, axe3);
const axe5 = s({ damage: 26, speed: 4.2 }, axe4);

const aura1: WeaponStats = { damage: 5, cooldown: 0.5, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0 };
const aura2 = s({ area: 1.2 }, aura1);
const aura3 = s({ damage: 8 }, aura2);
const aura4 = s({ area: 1.4, cooldown: 0.42 }, aura3);
const aura5 = s({ damage: 12, area: 1.6 }, aura4);

const lit1: WeaponStats = { damage: 20, cooldown: 2.2, amount: 2, pierce: 0, area: 1, speed: 0, duration: 0 };
const lit2 = s({ amount: 3 }, lit1);
const lit3 = s({ damage: 30 }, lit2);
const lit4 = s({ amount: 4, cooldown: 1.8 }, lit3);
const lit5 = s({ damage: 42, amount: 5 }, lit4);

const bomb1: WeaponStats = { damage: 26, cooldown: 2.6, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0 };
const bomb2 = s({ area: 1.2 }, bomb1);
const bomb3 = s({ amount: 2 }, bomb2);
const bomb4 = s({ damage: 38, cooldown: 2.2 }, bomb3);
const bomb5 = s({ amount: 3, area: 1.4 }, bomb4);

const boo1: WeaponStats = { damage: 14, cooldown: 1.8, amount: 1, pierce: 999, area: 1, speed: 900, duration: 0 };
const boo2 = s({ damage: 18 }, boo1);
const boo3 = s({ amount: 2 }, boo2);
const boo4 = s({ area: 1.25, speed: 1050 }, boo3);
const boo5 = s({ damage: 26, amount: 3 }, boo4);

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  bow: {
    id: 'bow',
    name: 'Bow',
    icon: 'icon_bow',
    description: 'Shoots piercing arrows at the nearest enemy.',
    levels: [bow1, bow2, bow3, bow4, bow5],
    upgrades: ['+1 arrow', 'Damage +5', 'Pierce +2, faster', '+1 arrow, damage +5'],
    evolution: { into: 'stormbow', requires: 'quiver' },
  },
  daggers: {
    id: 'daggers',
    name: 'Magic Daggers',
    icon: 'icon_daggers',
    description: 'Throws fast daggers at several nearby enemies.',
    levels: [dag1, dag2, dag3, dag4, dag5],
    upgrades: ['+1 dagger', 'Damage +4, faster', '+1 dagger', 'Damage +4, pierce +1'],
    evolution: { into: 'blades', requires: 'hourglass' },
  },
  axes: {
    id: 'axes',
    name: 'Spinning Axes',
    icon: 'icon_axes',
    description: 'Axes orbit around you, chopping anything close.',
    levels: [axe1, axe2, axe3, axe4, axe5],
    upgrades: ['+1 axe', 'Damage +6, bigger orbit', '+1 axe, spins longer', 'Damage +8, spins faster'],
    evolution: { into: 'titanaxes', requires: 'powergem' },
  },
  aura: {
    id: 'aura',
    name: 'Holy Aura',
    icon: 'icon_aura',
    description: 'A ring of holy light hurts nearby enemies.',
    levels: [aura1, aura2, aura3, aura4, aura5],
    upgrades: ['Area +20%', 'Damage +3', 'Area +20%, faster ticks', 'Damage +4, area +20%'],
    evolution: { into: 'sanctuary', requires: 'heart' },
  },
  lightning: {
    id: 'lightning',
    name: 'Lightning',
    icon: 'icon_lightning',
    description: 'Lightning strikes random enemies on screen.',
    levels: [lit1, lit2, lit3, lit4, lit5],
    upgrades: ['+1 strike', 'Damage +10', '+1 strike, faster', 'Damage +12, +1 strike'],
  },
  bomb: {
    id: 'bomb',
    name: 'Fire Bomb',
    icon: 'icon_bomb',
    description: 'Lobs a bomb that explodes in a wide area.',
    levels: [bomb1, bomb2, bomb3, bomb4, bomb5],
    upgrades: ['Area +20%', '+1 bomb', 'Damage +12, faster', '+1 bomb, area +20%'],
  },
  boomerang: {
    id: 'boomerang',
    name: 'Boomerang',
    icon: 'icon_boomerang',
    description: 'Flies out and comes back, hitting everything twice.',
    levels: [boo1, boo2, boo3, boo4, boo5],
    upgrades: ['Damage +4', '+1 boomerang', 'Bigger and faster', 'Damage +8, +1 boomerang'],
  },
};

export const EVOLUTIONS: Record<EvolutionId, EvolutionDef> = {
  stormbow: {
    id: 'stormbow',
    base: 'bow',
    name: 'Storm Bow',
    icon: 'icon_stormbow',
    description: 'Rapid volleys of storm arrows that pierce everything.',
    stats: { damage: 24, cooldown: 0.32, amount: 3, pierce: 999, area: 1.3, speed: 1150, duration: 0 },
  },
  blades: {
    id: 'blades',
    base: 'daggers',
    name: 'Thousand Blades',
    icon: 'icon_blades',
    description: 'An endless stream of golden daggers.',
    stats: { damage: 16, cooldown: 0.1, amount: 1, pierce: 3, area: 1.1, speed: 1300, duration: 0 },
  },
  titanaxes: {
    id: 'titanaxes',
    base: 'axes',
    name: 'Titan Axes',
    icon: 'icon_titanaxes',
    description: 'Huge axes spin forever and knock enemies away.',
    stats: { damage: 34, cooldown: 0, amount: 5, pierce: 0, area: 1.45, speed: 4.4, duration: 0 },
  },
  sanctuary: {
    id: 'sanctuary',
    base: 'aura',
    name: 'Sanctuary',
    icon: 'icon_sanctuary',
    description: 'Huge healing light: slows enemies and restores your HP.',
    stats: { damage: 16, cooldown: 0.35, amount: 1, pierce: 0, area: 2.0, speed: 0, duration: 0 },
  },
};

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  /** Effect per level, e.g. 0.2 = +20%. */
  perLevel: number;
}

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  heart: { id: 'heart', name: 'Heart', icon: 'icon_heart', description: 'Max HP +20%', maxLevel: 5, perLevel: 0.2 },
  boots: { id: 'boots', name: 'Winged Boots', icon: 'icon_boots', description: 'Move speed +10%', maxLevel: 5, perLevel: 0.1 },
  powergem: { id: 'powergem', name: 'Power Gem', icon: 'icon_powergem', description: 'Damage +10%', maxLevel: 5, perLevel: 0.1 },
  hourglass: { id: 'hourglass', name: 'Hourglass', icon: 'icon_hourglass', description: 'Attack cooldown -8%', maxLevel: 5, perLevel: 0.08 },
  quiver: { id: 'quiver', name: 'Quiver', icon: 'icon_quiver', description: '+1 projectile for all weapons', maxLevel: 2, perLevel: 1 },
  magnet: { id: 'magnet', name: 'Magnet', icon: 'icon_magnet', description: 'Pickup range +30%', maxLevel: 5, perLevel: 0.3 },
  tome: { id: 'tome', name: 'Spell Tome', icon: 'icon_tome', description: 'Attack area +10%', maxLevel: 5, perLevel: 0.1 },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];
export const MAX_WEAPON_LEVEL = 5;

/** Weapons whose attack count is boosted by the Quiver passive. */
export const AMOUNT_BOOSTED: ReadonlySet<WeaponId> = new Set<WeaponId>(['bow', 'daggers', 'axes', 'lightning', 'bomb', 'boomerang']);
