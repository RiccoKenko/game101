import {
  BAG_SIZE,
  BONUS_FROM,
  CHEST,
  DROP_WEIGHTS,
  DROPS,
  GEAR,
  GEAR_TYPES,
  LEGENDARY,
  PER_LEVEL,
  RARITIES,
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
  /** 0 Common ... 4 Legendary. */
  rarity: number;
  level: number;
  /** Gold put into levelling it (half comes back when it is salvaged). */
  spent: number;
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
  return { stat: slot.main, value: slot.base * RARITIES[item.rarity].mult * (1 + PER_LEVEL * (item.level - 1)) };
}

/** The second stat (Rare and up), or null. */
export function bonusStat(item: GearItem): { stat: GearStat; value: number } | null {
  if (item.rarity < BONUS_FROM) return null;
  const def = GEAR[item.type];
  return { stat: def.bonus, value: def.bonusValues[item.rarity - BONUS_FROM] };
}

export const maxLevel = (item: GearItem): number => RARITIES[item.rarity].maxLevel;

/** Levels are shown as refining, the way the classic games count it: level 1 is +0. */
export const refine = (level: number): string => `+${level - 1}`;

/** Gold to raise the item one level, or null at its highest level. */
export function upgradeCost(item: GearItem): number | null {
  if (item.level >= maxLevel(item)) return null;
  return Math.round((20 + 8 * item.level) * (1 + 0.5 * item.rarity));
}

export const salvageValue = (item: GearItem): number => RARITIES[item.rarity].salvage + Math.floor(item.spent / 2);

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
  if (total <= 0) return Math.min(LEGENDARY, min);
  let r = rng() * total;
  for (let i = 0; i < w.length; i++) {
    r -= w[i];
    if (r < 0) return i;
  }
  return w.length - 1;
}

/** A fresh level-1 item of a random kind (uid is given when it goes in the bag). */
export function rollItem(rng: Rng, weights: readonly number[], min = 0): Omit<GearItem, 'uid'> {
  return { type: GEAR_TYPES[Math.floor(rng() * GEAR_TYPES.length)], rarity: rollRarity(rng, weights, min), level: 1, spent: 0 };
}

/** Puts an item in the bag, or salvages it if the bag is full. Returns the stored item, or the gold it fetched. */
export function addItem(gear: GearState, item: Omit<GearItem, 'uid'>, save?: SaveData): GearItem | number {
  if (gear.items.length >= BAG_SIZE) {
    const gold = RARITIES[item.rarity].salvage;
    if (save) save.gold += gold;
    return gold;
  }
  const stored: GearItem = { ...item, uid: gear.next++, fresh: true };
  gear.items.push(stored);
  return stored;
}

/** What a run brings home. */
export function runDrops(rng: Rng, o: { map: number; difficulty: number; time: number; bosses: number; leaders: number; won: boolean }) {
  const weights = DROP_WEIGHTS[Math.min(DROP_WEIGHTS.length - 1, o.map + o.difficulty)];
  const n = (o.time >= DROPS.surviveSeconds ? 1 : 0) + o.bosses * DROPS.perBoss + Math.floor(o.leaders / DROPS.perLeaders);
  const out = Array.from({ length: n }, () => rollItem(rng, weights));
  if (o.won) out.push(rollItem(rng, weights, BONUS_FROM));
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

export function upgrade(save: SaveData, item: GearItem): boolean {
  const cost = upgradeCost(item);
  if (cost === null || save.gold < cost) return false;
  save.gold -= cost;
  item.spent += cost;
  item.level++;
  return true;
}

/** The two items a merge would use up: same slot and rarity, the ones not worn and lowest level first. */
export function mergePartners(gear: GearState, item: GearItem): GearItem[] {
  if (item.rarity >= LEGENDARY) return [];
  const others = gear.items
    .filter((i) => i !== item && slotOf(i) === slotOf(item) && i.rarity === item.rarity)
    .sort((a, b) => Number(isEquipped(gear, a)) - Number(isEquipped(gear, b)) || a.level - b.level);
  return others.length >= 2 ? others.slice(0, 2) : [];
}

/** Three of a rarity in one slot become one of the next rarity (keeping this item's kind and the highest level). */
export function merge(gear: GearState, item: GearItem): boolean {
  const partners = mergePartners(gear, item);
  if (partners.length < 2) return false;
  const wasWorn = partners.some((p) => isEquipped(gear, p));
  for (const p of partners) {
    gear.items.splice(gear.items.indexOf(p), 1);
    if (isEquipped(gear, p)) unequip(gear, slotOf(p));
  }
  item.rarity++;
  item.level = Math.max(item.level, ...partners.map((p) => p.level));
  item.spent += partners.reduce((a, p) => a + p.spent, 0);
  if (wasWorn && gear.equipped[slotOf(item)] === undefined) equip(gear, item);
  return true;
}

export function salvage(save: SaveData, item: GearItem): number {
  const gear = save.gear;
  const i = gear.items.indexOf(item);
  if (i < 0) return 0;
  gear.items.splice(i, 1);
  if (isEquipped(gear, item)) unequip(gear, slotOf(item));
  const gold = salvageValue(item);
  save.gold += gold;
  return gold;
}

/** The bag in display order: by slot, then rarity (best first), then level. */
export function sortedItems(gear: GearState): GearItem[] {
  const slotIndex = (i: GearItem) => SLOTS.findIndex((s) => s.id === slotOf(i));
  return [...gear.items].sort((a, b) => slotIndex(a) - slotIndex(b) || b.rarity - a.rarity || b.level - a.level || a.uid - b.uid);
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
      const rarity = n(it.rarity, 0, LEGENDARY);
      const uid = n(it.uid, 1, Number.MAX_SAFE_INTEGER);
      if (out.items.some((o) => o.uid === uid)) continue;
      out.items.push({ uid, type: it.type as GearType, rarity, level: n(it.level, 1, RARITIES[rarity].maxLevel), spent: n(it.spent, 0, 1e9), fresh: it.fresh === true });
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
