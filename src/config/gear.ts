/**
 * Equipment: four slots, two kinds of item for each, six rarities. Items drop in the field (elites, leaders and
 * bosses), at the end of a run, or come out of a gear chest; they level up with gold, and three of a rarity in one
 * slot merge into the next rarity.
 */
export type GearSlot = 'gloves' | 'helmet' | 'cloak' | 'boots';
export type GearStat = 'damage' | 'maxHp' | 'haste' | 'speed' | 'crit' | 'area' | 'xp' | 'armor' | 'duration' | 'gold' | 'magnet';
export type GearType = 'hunterGloves' | 'runeBracers' | 'featherHat' | 'ironHelm' | 'windCloak' | 'mysticRobe' | 'sprintBoots' | 'luckyBoots';

export interface RarityDef {
  name: string;
  color: number;
  css: string;
  /** Main stat multiplier, highest level, and gold for salvaging an item that was never levelled. */
  mult: number;
  maxLevel: number;
  salvage: number;
}

export const RARITIES: RarityDef[] = [
  { name: 'Common', color: 0xb8c2d6, css: '#d6dce8', mult: 1, maxLevel: 10, salvage: 20 },
  { name: 'Uncommon', color: 0x4fc45a, css: '#86ea6e', mult: 1.6, maxLevel: 20, salvage: 50 },
  { name: 'Rare', color: 0x3f8fff, css: '#8fd0ff', mult: 2.5, maxLevel: 30, salvage: 120 },
  { name: 'Epic', color: 0xa86bff, css: '#c9a8ff', mult: 3.8, maxLevel: 40, salvage: 300 },
  { name: 'Legendary', color: 0xffa51f, css: '#ffd66b', mult: 5.5, maxLevel: 50, salvage: 800 },
  { name: 'Mythic', color: 0xff3b4e, css: '#ff8a8a', mult: 8, maxLevel: 60, salvage: 2000 },
];
/** The rarest rarity: nothing merges past it. */
export const TOP_RARITY = RARITIES.length - 1;
/** Items from Rare up carry a second stat. */
export const BONUS_FROM = 2;

export interface SlotDef {
  id: GearSlot;
  name: string;
  main: GearStat;
  /** Main stat of a Common item at level 1. */
  base: number;
}

export const SLOTS: SlotDef[] = [
  { id: 'gloves', name: 'Headgear', main: 'damage', base: 0.012 },
  { id: 'helmet', name: 'Armor', main: 'maxHp', base: 0.015 },
  { id: 'cloak', name: 'Garment', main: 'haste', base: 0.008 },
  { id: 'boots', name: 'Shoes', main: 'speed', base: 0.008 },
];

export interface GearDef {
  id: GearType;
  slot: GearSlot;
  name: string;
  icon: string;
  /** The second stat, at Rare, Epic, Legendary and Mythic. */
  bonus: GearStat;
  bonusValues: [number, number, number, number];
}

export const GEAR: Record<GearType, GearDef> = {
  hunterGloves: { id: 'hunterGloves', slot: 'gloves', name: 'Horned Helm', icon: 'gear_gloves', bonus: 'crit', bonusValues: [0.02, 0.035, 0.05, 0.08] },
  runeBracers: { id: 'runeBracers', slot: 'gloves', name: 'Magic Circlet', icon: 'gear_bracers', bonus: 'area', bonusValues: [0.04, 0.07, 0.1, 0.15] },
  featherHat: { id: 'featherHat', slot: 'helmet', name: 'Sage Robe', icon: 'gear_hat', bonus: 'xp', bonusValues: [0.05, 0.08, 0.12, 0.18] },
  ironHelm: { id: 'ironHelm', slot: 'helmet', name: 'Plate Mail', icon: 'gear_helm', bonus: 'armor', bonusValues: [1, 1, 2, 3] },
  windCloak: { id: 'windCloak', slot: 'cloak', name: 'Wind Muffler', icon: 'gear_cloak', bonus: 'speed', bonusValues: [0.03, 0.05, 0.08, 0.12] },
  mysticRobe: { id: 'mysticRobe', slot: 'cloak', name: 'Mystic Manteau', icon: 'gear_robe', bonus: 'duration', bonusValues: [0.06, 0.1, 0.15, 0.22] },
  sprintBoots: { id: 'sprintBoots', slot: 'boots', name: 'Sprint Sandals', icon: 'gear_boots', bonus: 'magnet', bonusValues: [0.1, 0.18, 0.25, 0.4] },
  luckyBoots: { id: 'luckyBoots', slot: 'boots', name: 'Lucky Boots', icon: 'gear_boots_lucky', bonus: 'gold', bonusValues: [0.05, 0.08, 0.12, 0.18] },
};
export const GEAR_TYPES = Object.keys(GEAR) as GearType[];

/** Main stat grows this much (of its level-1 value) per level. */
export const PER_LEVEL = 0.05;
/** Items the bag holds; a drop into a full bag is salvaged for gold. */
export const BAG_SIZE = 42;
/** A gear chest in the Gear screen: its price and rarity odds (Common..Mythic). */
export const CHEST = { price: 300, weights: [60, 30, 9, 1, 0, 0] };

/**
 * Rarity odds (Common..Mythic) by tier: the map's number plus the difficulty (Greenhill Normal 0, Sunscar Nightmare
 * 4, and each Abyss step one more). Past the last row the odds stay at the last row's.
 */
export const DROP_WEIGHTS = [
  [70, 25, 5, 0, 0, 0],
  [50, 35, 13, 2, 0, 0],
  [35, 38, 20, 6, 1, 0],
  [20, 35, 30, 12, 3, 0],
  [10, 30, 35, 19, 6, 0],
  [5, 22, 35, 26, 11, 1],
  [0, 15, 34, 32, 17, 2],
  [0, 8, 30, 36, 22, 4],
  [0, 4, 24, 38, 28, 6],
  [0, 0, 20, 38, 33, 9],
];
export const dropWeights = (tier: number): number[] => DROP_WEIGHTS[Math.max(0, Math.min(DROP_WEIGHTS.length - 1, tier))];

/**
 * Who drops what, kept scarce so every drop matters (about 3-4 pieces in a 9-minute run). Each source rolls on the
 * tier's row plus `boost` rows, never below `min` (the rarity index), with this `chance`. An MVP always drops, and
 * always Rare or better.
 */
export const LOOT = {
  elite: { chance: 0.005, boost: 1, min: 1 },
  leader: { chance: 0.5, boost: 2, min: 1 },
  boss: { chance: 1, boost: 3, min: 2 },
  /** At the end of a run: one item for lasting this long, and a Rare or better for a clear. */
  surviveSeconds: 180,
  clear: { boost: 3, min: 2 },
};

export const STAT_NAMES: Record<GearStat, string> = {
  damage: 'Damage',
  maxHp: 'Max HP',
  haste: 'Attack speed',
  speed: 'Move speed',
  crit: 'Crit chance',
  area: 'Attack area',
  xp: 'XP gained',
  armor: 'Armor',
  duration: 'Effect time',
  gold: 'Gold',
  magnet: 'Pickup range',
};

/** "+4.5% Damage", "+1 Armor". */
export function describeStat(stat: GearStat, v: number): string {
  if (stat === 'armor') return `+${v} ${STAT_NAMES[stat]}`;
  const pct = Math.round(v * 1000) / 10;
  return `+${pct}% ${STAT_NAMES[stat]}`;
}
