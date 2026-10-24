export type WeaponId = 'bow' | 'daggers' | 'axes' | 'aura' | 'lightning' | 'bomb' | 'boomerang' | 'bolt' | 'frost' | 'slash' | 'flask';
export type EvolutionId =
  | 'stormbow' | 'blades' | 'titanaxes' | 'sanctuary' | 'starfall' | 'blizzard'
  | 'thunder' | 'meteor' | 'twinmoon' | 'flameslash' | 'plague';
/** Runes change how every weapon's hits behave (set on fire, freeze, chain...). */
export type RuneId = 'burn' | 'freeze' | 'chain' | 'ricochet' | 'blast' | 'leech';
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
  /** Seconds the attack lasts (Axes spin time, a Poison Flask puddle). 0 = not used. */
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
  /** Evolves in a chest once at max level, while holding this passive or rune. */
  evolution?: { into: EvolutionId; requires: PassiveId | RuneId };
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

const bolt1: WeaponStats = { damage: 9, cooldown: 0.8, amount: 1, pierce: 0, area: 1, speed: 620, duration: 0 };
const bolt2 = s({ amount: 2 }, bolt1);
const bolt3 = s({ damage: 13 }, bolt2);
const bolt4 = s({ amount: 3, cooldown: 0.68 }, bolt3);
const bolt5 = s({ damage: 18, amount: 4 }, bolt4);

const frost1: WeaponStats = { damage: 7, cooldown: 1.4, amount: 3, pierce: 1, area: 1, speed: 800, duration: 0 };
const frost2 = s({ amount: 4 }, frost1);
const frost3 = s({ damage: 11 }, frost2);
const frost4 = s({ amount: 6, pierce: 2 }, frost3);
const frost5 = s({ damage: 15, cooldown: 1.1 }, frost4);

const slash1: WeaponStats = { damage: 16, cooldown: 1.3, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0 };
const slash2 = s({ damage: 22 }, slash1);
const slash3 = s({ amount: 2 }, slash2);
const slash4 = s({ area: 1.25, cooldown: 1.1 }, slash3);
const slash5 = s({ damage: 32 }, slash4);

const flask1: WeaponStats = { damage: 5, cooldown: 2.6, amount: 1, pierce: 0, area: 1, speed: 0, duration: 3 };
const flask2 = s({ area: 1.2 }, flask1);
const flask3 = s({ amount: 2 }, flask2);
const flask4 = s({ damage: 8, duration: 4 }, flask3);
const flask5 = s({ amount: 3, area: 1.4 }, flask4);

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
    evolution: { into: 'thunder', requires: 'chain' },
  },
  bomb: {
    id: 'bomb',
    name: 'Fire Bomb',
    icon: 'icon_bomb',
    description: 'Lobs a bomb that explodes in a wide area.',
    levels: [bomb1, bomb2, bomb3, bomb4, bomb5],
    upgrades: ['Area +20%', '+1 bomb', 'Damage +12, faster', '+1 bomb, area +20%'],
    evolution: { into: 'meteor', requires: 'blast' },
  },
  boomerang: {
    id: 'boomerang',
    name: 'Boomerang',
    icon: 'icon_boomerang',
    description: 'Flies out and comes back, hitting everything twice.',
    levels: [boo1, boo2, boo3, boo4, boo5],
    upgrades: ['Damage +4', '+1 boomerang', 'Bigger and faster', 'Damage +8, +1 boomerang'],
    evolution: { into: 'twinmoon', requires: 'ricochet' },
  },
  bolt: {
    id: 'bolt',
    name: 'Magic Bolt',
    icon: 'icon_bolt',
    description: 'Fires magic bolts that chase down enemies.',
    levels: [bolt1, bolt2, bolt3, bolt4, bolt5],
    upgrades: ['+1 bolt', 'Damage +4', '+1 bolt, faster', 'Damage +5, +1 bolt'],
    evolution: { into: 'starfall', requires: 'tome' },
  },
  frost: {
    id: 'frost',
    name: 'Frost Shards',
    icon: 'icon_frost',
    description: 'A fan of ice shards that slows what it hits.',
    levels: [frost1, frost2, frost3, frost4, frost5],
    upgrades: ['+1 shard', 'Damage +4', '+2 shards, pierce +1', 'Damage +4, faster'],
    evolution: { into: 'blizzard', requires: 'boots' },
  },
  slash: {
    id: 'slash',
    name: 'Moon Slash',
    icon: 'icon_slash',
    description: 'A wide sword swing in front of you that knocks enemies back.',
    levels: [slash1, slash2, slash3, slash4, slash5],
    upgrades: ['Damage +6', 'Also swings behind you', 'Area +25%, faster', 'Damage +10'],
    evolution: { into: 'flameslash', requires: 'burn' },
  },
  flask: {
    id: 'flask',
    name: 'Poison Flask',
    icon: 'icon_flask',
    description: 'Throws a flask that leaves a puddle of poison.',
    levels: [flask1, flask2, flask3, flask4, flask5],
    upgrades: ['Area +20%', '+1 flask', 'Damage +3, lasts longer', '+1 flask, area +20%'],
    evolution: { into: 'plague', requires: 'leech' },
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
  starfall: {
    id: 'starfall',
    base: 'bolt',
    name: 'Starfall',
    icon: 'icon_starfall',
    description: 'Shooting stars rain down on every enemy in sight.',
    stats: { damage: 26, cooldown: 0.45, amount: 3, pierce: 0, area: 1.2, speed: 0, duration: 0 },
  },
  blizzard: {
    id: 'blizzard',
    base: 'frost',
    name: 'Blizzard',
    icon: 'icon_blizzard',
    description: 'A howling snowstorm around you freezes and grinds down enemies.',
    stats: { damage: 10, cooldown: 0.3, amount: 1, pierce: 0, area: 1.5, speed: 0, duration: 0 },
  },
  thunder: {
    id: 'thunder',
    base: 'lightning',
    name: 'Thunderstorm',
    icon: 'icon_thunder',
    description: 'A storm of bolts; every strike jumps on to two more enemies.',
    stats: { damage: 46, cooldown: 1.4, amount: 6, pierce: 0, area: 1.3, speed: 0, duration: 0 },
  },
  meteor: {
    id: 'meteor',
    base: 'bomb',
    name: 'Meteor',
    icon: 'icon_meteor',
    description: 'Meteors crash from the sky in huge blasts that set enemies on fire.',
    stats: { damage: 70, cooldown: 2.0, amount: 3, pierce: 0, area: 1.6, speed: 0, duration: 0 },
  },
  twinmoon: {
    id: 'twinmoon',
    base: 'boomerang',
    name: 'Twin Moons',
    icon: 'icon_twinmoon',
    description: 'Huge silver boomerangs that fly out in pairs and cut through everything.',
    stats: { damage: 34, cooldown: 1.2, amount: 4, pierce: 999, area: 1.5, speed: 1150, duration: 0 },
  },
  flameslash: {
    id: 'flameslash',
    base: 'slash',
    name: 'Flame Crescent',
    icon: 'icon_flameslash',
    description: 'Blazing swings on both sides that set enemies on fire.',
    stats: { damage: 44, cooldown: 0.9, amount: 2, pierce: 0, area: 1.5, speed: 0, duration: 0 },
  },
  plague: {
    id: 'plague',
    base: 'flask',
    name: 'Plague Cloud',
    icon: 'icon_plague',
    description: 'Big, lasting poison pools that slow and melt enemies.',
    stats: { damage: 12, cooldown: 1.8, amount: 3, pierce: 0, area: 1.6, speed: 0, duration: 6 },
  },
};

export interface RuneDef {
  id: RuneId;
  name: string;
  icon: string;
  maxLevel: number;
  /** Card text for each level (index 0 = Lv1). */
  levels: string[];
}

/** Rune strength per level (index 0 = Lv1). */
export const RUNE_POWER = {
  /** Burn per second, as a share of the hit that lit it, for BURN_TIME seconds. */
  burn: [0.2, 0.3, 0.4],
  /** Chance a hit freezes for FREEZE_TIME seconds. */
  freeze: [0.08, 0.13, 0.18],
  /** Chance a hit arcs on, and to how many enemies (at half damage). */
  chain: [0.15, 0.22, 0.3],
  chainTargets: [2, 2, 3],
  /** Extra enemies each projectile bounces on to. */
  ricochet: [1, 2, 3],
  /** A killed enemy blows up for this share of its max HP. */
  blast: [0.3, 0.4, 0.5],
  /** HP healed per kill. */
  leech: [0.3, 0.5, 0.8],
};
export const BURN_TIME = 3;
export const FREEZE_TIME = 1.2;

export const RUNES: Record<RuneId, RuneDef> = {
  burn: { id: 'burn', name: 'Ember Rune', icon: 'icon_rune_burn', maxLevel: 3, levels: ['Hits set enemies on fire', 'Fire burns hotter', 'Fire burns hottest'] },
  freeze: { id: 'freeze', name: 'Frost Rune', icon: 'icon_rune_freeze', maxLevel: 3, levels: ['Hits may freeze enemies solid (8%)', 'Freeze chance 13%', 'Freeze chance 18%'] },
  chain: { id: 'chain', name: 'Storm Rune', icon: 'icon_rune_chain', maxLevel: 3, levels: ['Hits may arc lightning to 2 more enemies', 'Arcs more often', 'Arcs to 3 enemies, even more often'] },
  ricochet: { id: 'ricochet', name: 'Bounce Rune', icon: 'icon_rune_ricochet', maxLevel: 3, levels: ['Projectiles bounce on to 1 more enemy', 'Bounce 2 times', 'Bounce 3 times'] },
  blast: { id: 'blast', name: 'Blast Rune', icon: 'icon_rune_blast', maxLevel: 3, levels: ['Defeated enemies explode', 'Bigger explosions', 'Biggest explosions'] },
  leech: { id: 'leech', name: 'Leech Rune', icon: 'icon_rune_leech', maxLevel: 3, levels: ['Heal a little for every defeat', 'Heal more per defeat', 'Heal the most per defeat'] },
};
export const RUNE_IDS = Object.keys(RUNES) as RuneId[];

/** The passive or rune a weapon needs to evolve, by name. */
export function requirementName(id: PassiveId | RuneId): string {
  return id in RUNES ? RUNES[id as RuneId].name : PASSIVES[id as PassiveId].name;
}

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
  tome: { id: 'tome', name: 'Spell Tome', icon: 'icon_tome', description: 'Attack area +10%: bigger projectiles, blasts, slashes, puddles and auras', maxLevel: 5, perLevel: 0.1 },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];
export const MAX_WEAPON_LEVEL = 5;

/** Weapons whose attack count is boosted by the Quiver passive. */
export const AMOUNT_BOOSTED: ReadonlySet<WeaponId> = new Set<WeaponId>(['bow', 'daggers', 'axes', 'lightning', 'bomb', 'boomerang', 'bolt', 'frost', 'flask']);
