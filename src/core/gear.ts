import {
  BAG_SIZE,
  BONUS_FROM,
  CHEST,
  dropWeights,
  GEAR,
  GEAR_TYPES,
  LOOT,
  TOP_RARITY,
  RARITIES,
  REFINE,
  refineGold,
  refineOre,
  SLOTS,
  type GearSlot,
  type GearStat,
  type GearType,
} from '../config/gear';
import { type Rng } from './rng';
import { type SaveData } from './save';

export interface GearItem {
  uid: number;
  type: GearType;
  /** 0 Common ... 4 Legendary, 5 Mythic. */
  rarity: number;
  /** +0 ... +10. */
  refine: number;
  /** Gold and ore put into refining it (half comes back when it is salvaged). */
  spent: number;
  oreSpent: number;
  /** Not looked at in the Gear screen yet. */
  fresh?: boolean;
}

export interface GearState {
  items: GearItem[];
  equipped: Partial<Record<GearSlot, number>>;
  /** The next item's uid. */
  next: number;
}

export const emptyGear = (): GearState => ({ items: [], equipped: {}, next: 1 });

export const slotOf = (item: GearItem): GearSlot => GEAR[item.type].slot;

export function mainStat(item: GearItem): { stat: GearStat; value: number } {
  const slot = SLOTS.find((s) => s.id === slotOf(item))!;
  return { stat: slot.main, value: slot.base * RARITIES[item.rarity].mult * REFINE.mult[item.refine] };
}

/** The second stat (Rare and up), or null. */
export function bonusStat(item: GearItem): { stat: GearStat; value: number } | null {
  if (item.rarity < BONUS_FROM) return null;
  const def = GEAR[item.type];
  return { stat: def.bonus, value: def.bonusValues[item.rarity - BONUS_FROM] };
}

/** "+7". */
export const refineLabel = (n: number): string => `+${n}`;

/** What the next refine costs and how likely it is to work, or null at +10. */
export function refineCost(item: GearItem): { gold: number; ore: number; chance: number } | null {
  if (item.refine >= REFINE.max) return null;
  return { gold: refineGold(item.refine, item.rarity), ore: refineOre(item.refine, item.rarity), chance: REFINE.chance[item.refine] };
}

/** Gold and ore salvaging gives back: the rarity's worth and half of what went into refining it. */
export const salvageValue = (item: GearItem): { gold: number; ore: number } => ({
  gold: RARITIES[item.rarity].salvage + Math.floor(item.spent / 2),
  ore: RARITIES[item.rarity].ore + Math.floor(item.oreSpent / 2),
});

export type GearBonus = Record<GearStat, number>;

/** Everything the worn items add up to. */
export function gearBonus(gear: GearState): GearBonus {
  const out: GearBonus = { damage: 0, maxHp: 0, haste: 0, speed: 0, crit: 0, area: 0, xp: 0, armor: 0, duration: 0, gold: 0, magnet: 0 };
  for (const uid of Object.values(gear.equipped)) {
    const item = gear.items.find((i) => i.uid === uid);
    if (!item) continue;
    const m = mainStat(item);
    out[m.stat] += m.value;
    const b = bonusStat(item);
    if (b) out[b.stat] += b.value;
  }
  return out;
}

export const isEquipped = (gear: GearState, item: GearItem): boolean => gear.equipped[slotOf(item)] === item.uid;

export function rollRarity(rng: Rng, weights: readonly number[], min = 0): number {
  const w = weights.map((x, i) => (i < min ? 0 : x));
  const total = w.reduce((a, b) => a + b, 0);
  if (total <= 0) return Math.min(TOP_RARITY, min);
  let r = rng() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r < 0) return i;
  }
  return w.length - 1;
}

/** A fresh +0 item of a random kind (uid is given when it goes in the bag). */
export function rollItem(rng: Rng, weights: readonly number[], min = 0): Omit<GearItem, 'uid'> {
  return { type: GEAR_TYPES[Math.floor(rng() * GEAR_TYPES.length)], rarity: rollRarity(rng, weights, min), refine: 0, spent: 0, oreSpent: 0 };
}

/** Puts an item in the bag, or salvages it if the bag is full. Returns the stored item, or the gold it fetched. */
export function addItem(gear: GearState, item: Omit<GearItem, 'uid'>, save?: SaveData): GearItem | number {
  if (gear.items.length >= BAG_SIZE) {
    const gold = RARITIES[item.rarity].salvage;
    if (save) {
      save.gold += gold;
      save.ore += RARITIES[item.rarity].ore;
    }
    return gold;
  }
  const stored: GearItem = { ...item, uid: gear.next++, fresh: true };
  gear.items.push(stored);
  return stored;
}

/** The loot tier of a run: the map's number plus its difficulty. */
export const lootTier = (map: number, difficulty: number): number => map + difficulty;

/** An item dropped by an elite, a leader or an MVP boss on a run of this tier. */
export function fieldDrop(rng: Rng, tier: number, source: 'elite' | 'leader' | 'boss'): Omit<GearItem, 'uid'> {
  const o = LOOT[source];
  return rollItem(rng, dropWeights(tier + o.boost), o.min);
}

/** What the end of a run adds to the gear found on the way: one item for lasting a while, a Rare or better for a clear. */
export function runDrops(rng: Rng, o: { map: number; difficulty: number; time: number; won: boolean }) {
  const tier = lootTier(o.map, o.difficulty);
  const out = o.time >= LOOT.surviveSeconds ? [rollItem(rng, dropWeights(tier))] : [];
  if (o.won) out.push(rollItem(rng, dropWeights(tier + LOOT.clear.boost), Math.max(BONUS_FROM, LOOT.clear.min)));
  return out;
}

/** Buys a gear chest: false if there isn't enough gold. */
export function openChest(save: SaveData, rng: Rng): GearItem | number | false {
  if (save.gold < CHEST.price) return false;
  save.gold -= CHEST.price;
  return addItem(save.gear, rollItem(rng, CHEST.weights), save);
}

export function equip(gear: GearState, item: GearItem): void {
  gear.equipped[slotOf(item)] = item.uid;
}

export function unequip(gear: GearState, slot: GearSlot): void {
  delete gear.equipped[slot];
}

/**
 * Tries to refine the item one step: 'ok' (it went up), 'fail' (it didn't, and what was paid is gone), 'down'
 * (it failed high up and dropped a step), or false when it can't be paid for or is already +10.
 */
export function tryRefine(save: SaveData, item: GearItem, rng: Rng): 'ok' | 'fail' | 'down' | false {
  const cost = refineCost(item);
  if (!cost || save.gold < cost.gold || save.ore < cost.ore) return false;
  save.gold -= cost.gold;
  save.ore -= cost.ore;
  item.spent += cost.gold;
  item.oreSpent += cost.ore;
  if (rng() < cost.chance) {
    item.refine++;
    return 'ok';
  }
  if (item.refine >= REFINE.dropFrom) {
    item.refine--;
    return 'down';
  }
  return 'fail';
}

/** The two items a merge would use up: same slot and rarity, the ones not worn and least refined first. */
export function mergePartners(gear: GearState, item: GearItem): GearItem[] {
  if (item.rarity >= TOP_RARITY) return [];
  const others = gear.items
    .filter((i) => i !== item && slotOf(i) === slotOf(item) && i.rarity === item.rarity)
    .sort((a, b) => Number(isEquipped(gear, a)) - Number(isEquipped(gear, b)) || a.refine - b.refine);
  return others.length >= 2 ? others.slice(0, 2) : [];
}

/** Three of a rarity in one slot become one of the next rarity (keeping this item's kind and the highest refine). */
export function merge(gear: GearState, item: GearItem): boolean {
  const partners = mergePartners(gear, item);
  if (partners.length < 2) return false;
  const wasWorn = partners.some((p) => isEquipped(gear, p));
  for (const p of partners) {
    gear.items.splice(gear.items.indexOf(p), 1);
    if (isEquipped(gear, p)) unequip(gear, slotOf(p));
  }
  item.rarity++;
  item.refine = Math.max(item.refine, ...partners.map((p) => p.refine));
  item.spent += partners.reduce((a, p) => a + p.spent, 0);
  item.oreSpent += partners.reduce((a, p) => a + p.oreSpent, 0);
  if (wasWorn && gear.equipped[slotOf(item)] === undefined) equip(gear, item);
  return true;
}

/** Breaks an item down for gold and ore; returns the gold (0 if it isn't in the bag). */
export function salvage(save: SaveData, item: GearItem): number {
  const gear = save.gear;
  const i = gear.items.indexOf(item);
  if (i < 0) return 0;
  gear.items.splice(i, 1);
  if (isEquipped(gear, item)) unequip(gear, slotOf(item));
  const v = salvageValue(item);
  save.gold += v.gold;
  save.ore += v.ore;
  return v.gold;
}

/** The bag in display order: by slot, then rarity (best first), then refine. */
export function sortedItems(gear: GearState): GearItem[] {
  const slotIndex = (i: GearItem) => SLOTS.findIndex((s) => s.id === slotOf(i));
  return [...gear.items].sort((a, b) => slotIndex(a) - slotIndex(b) || b.rarity - a.rarity || b.refine - a.refine || a.uid - b.uid);
}

/** Cleans saved gear: unknown kinds dropped, numbers clamped, worn uids that no longer exist forgotten. */
export function sanitizeGear(raw: unknown): GearState {
  const out = emptyGear();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Record<string, unknown>;
  const n = (v: unknown, lo: number, hi: number) => (typeof v === 'number' && Number.isFinite(v) ? Math.floor(Math.min(hi, Math.max(lo, v))) : lo);
  if (Array.isArray(r.items)) {
    for (const x of r.items as unknown[]) {
      if (!x || typeof x !== 'object' || out.items.length >= BAG_SIZE) continue;
      const it = x as Record<string, unknown>;
      if (!GEAR_TYPES.includes(it.type as GearType)) continue;
      const rarity = n(it.rarity, 0, TOP_RARITY);
      const uid = n(it.uid, 1, Number.MAX_SAFE_INTEGER);
      if (out.items.some((o) => o.uid === uid)) continue;
      // Saves from before refining kept a level (1 = +0); it carries over as a refine, capped at +10.
      const refine = typeof it.refine === 'number' ? n(it.refine, 0, REFINE.max) : n(n(it.level, 1, 999) - 1, 0, REFINE.max);
      out.items.push({ uid, type: it.type as GearType, rarity, refine, spent: n(it.spent, 0, 1e9), oreSpent: n(it.oreSpent, 0, 1e9), fresh: it.fresh === true });
    }
  }
  if (r.equipped && typeof r.equipped === 'object') {
    const eq = r.equipped as Record<string, unknown>;
    for (const s of SLOTS) {
      const item = out.items.find((i) => i.uid === eq[s.id]);
      if (item && slotOf(item) === s.id) out.equipped[s.id] = item.uid;
    }
  }
  out.next = Math.max(n(r.next, 1, Number.MAX_SAFE_INTEGER), ...out.items.map((i) => i.uid + 1));
  return out;
}
