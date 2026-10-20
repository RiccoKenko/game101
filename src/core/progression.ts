import { MAX_PASSIVES, MAX_WEAPONS } from '../config/game';
import {
  MAX_WEAPON_LEVEL,
  PASSIVES,
  PASSIVE_IDS,
  WEAPONS,
  WEAPON_IDS,
  type EvolutionId,
  type PassiveId,
  type WeaponId,
} from '../config/weapons';
import { type Rng, weightedPick } from './rng';

export interface OwnedWeapon {
  id: WeaponId;
  level: number;
  evolved: EvolutionId | null;
}

export interface OwnedPassive {
  id: PassiveId;
  level: number;
}

export interface Inventory {
  weapons: OwnedWeapon[];
  passives: OwnedPassive[];
}

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'heal'; amount: number };

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (level < 20) return 6 + (level - 1) * 11;
  if (level < 40) return 215 + (level - 20) * 16;
  return 535 + (level - 40) * 20;
}

export function newInventory(): Inventory {
  return { weapons: [{ id: 'bow', level: 1, evolved: null }], passives: [] };
}

export function passiveLevels(inv: Inventory): Partial<Record<PassiveId, number>> {
  const out: Partial<Record<PassiveId, number>> = {};
  for (const p of inv.passives) out[p.id] = p.level;
  return out;
}

/** Every upgrade currently offerable, with its weight. */
function upgradePool(inv: Inventory): { item: Choice; weight: number }[] {
  const pool: { item: Choice; weight: number }[] = [];
  for (const w of inv.weapons) {
    if (!w.evolved && w.level < MAX_WEAPON_LEVEL) pool.push({ item: { kind: 'weapon', id: w.id, level: w.level + 1 }, weight: 1.3 });
  }
  if (inv.weapons.length < MAX_WEAPONS) {
    for (const id of WEAPON_IDS) {
      if (!inv.weapons.some((w) => w.id === id)) pool.push({ item: { kind: 'weapon', id, level: 1 }, weight: 1 });
    }
  }
  for (const p of inv.passives) {
    if (p.level < PASSIVES[p.id].maxLevel) pool.push({ item: { kind: 'passive', id: p.id, level: p.level + 1 }, weight: 1.1 });
  }
  if (inv.passives.length < MAX_PASSIVES) {
    for (const id of PASSIVE_IDS) {
      if (!inv.passives.some((p) => p.id === id)) pool.push({ item: { kind: 'passive', id, level: 1 }, weight: 0.8 });
    }
  }
  return pool;
}

/** Picks up to `count` distinct level-up choices; tops up with gold/heal when everything is maxed. */
export function rollChoices(inv: Inventory, rng: Rng, count = 3): Choice[] {
  const pool = upgradePool(inv);
  const out: Choice[] = [];
  while (out.length < count && pool.length > 0) {
    const choice = weightedPick(rng, pool);
    out.push(choice);
    pool.splice(pool.findIndex((p) => p.item === choice), 1);
  }
  if (out.length < count) out.push({ kind: 'gold', amount: 25 });
  if (out.length < count) out.push({ kind: 'heal', amount: 0.3 });
  return out;
}

export function applyChoice(inv: Inventory, choice: Choice): void {
  if (choice.kind === 'weapon') {
    const owned = inv.weapons.find((w) => w.id === choice.id);
    if (owned) owned.level = Math.min(MAX_WEAPON_LEVEL, owned.level + 1);
    else if (inv.weapons.length < MAX_WEAPONS) inv.weapons.push({ id: choice.id, level: 1, evolved: null });
  } else if (choice.kind === 'passive') {
    const owned = inv.passives.find((p) => p.id === choice.id);
    if (owned) owned.level = Math.min(PASSIVES[owned.id].maxLevel, owned.level + 1);
    else if (inv.passives.length < MAX_PASSIVES) inv.passives.push({ id: choice.id, level: 1 });
  }
}

/** Weapons that are max level, not evolved, and whose required passive is owned. */
export function evolvableWeapons(inv: Inventory): WeaponId[] {
  return inv.weapons
    .filter((w) => {
      const evo = WEAPONS[w.id].evolution;
      return !w.evolved && w.level >= MAX_WEAPON_LEVEL && !!evo && inv.passives.some((p) => p.id === evo.requires);
    })
    .map((w) => w.id);
}

export function evolve(inv: Inventory, id: WeaponId): EvolutionId | null {
  const w = inv.weapons.find((x) => x.id === id);
  const evo = WEAPONS[id].evolution;
  if (!w || !evo) return null;
  w.evolved = evo.into;
  return evo.into;
}
