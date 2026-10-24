import { MAX_PASSIVES, MAX_RUNES, MAX_WEAPONS } from '../config/game';
import {
  MAX_WEAPON_LEVEL,
  PASSIVES,
  PASSIVE_IDS,
  RUNES,
  RUNE_IDS,
  WEAPONS,
  WEAPON_IDS,
  type EvolutionId,
  type PassiveId,
  type RuneId,
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

export interface OwnedRune {
  id: RuneId;
  level: number;
}

export interface Inventory {
  weapons: OwnedWeapon[];
  passives: OwnedPassive[];
  runes: OwnedRune[];
  /** Never offered this run: other heroes' own weapons, and anything banished (keys like 'weapon:bow'). */
  banned: string[];
}

export const choiceKey = (c: Choice): string => ('id' in c ? `${c.kind}:${c.id}` : c.kind);

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'rune'; id: RuneId; level: number }
  | { kind: 'gold'; amount: number }
  | { kind: 'heal'; amount: number };

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (level < 20) return 8 + (level - 1) * 14;
  if (level < 40) return 280 + (level - 20) * 22;
  return 720 + (level - 40) * 30;
}

/** A run's starting kit: the hero's own weapon at level 1. */
export function newInventory(start: WeaponId = 'bow', banned: string[] = []): Inventory {
  return { weapons: [{ id: start, level: 1, evolved: null }], passives: [], runes: [], banned: [...banned] };
}

export function passiveLevels(inv: Inventory): Partial<Record<PassiveId, number>> {
  const out: Partial<Record<PassiveId, number>> = {};
  for (const p of inv.passives) out[p.id] = p.level;
  return out;
}

export function runeLevels(inv: Inventory): Partial<Record<RuneId, number>> {
  const out: Partial<Record<RuneId, number>> = {};
  for (const r of inv.runes) out[r.id] = r.level;
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
  for (const r of inv.runes) {
    if (r.level < RUNES[r.id].maxLevel) pool.push({ item: { kind: 'rune', id: r.id, level: r.level + 1 }, weight: 1 });
  }
  if (inv.runes.length < MAX_RUNES) {
    for (const id of RUNE_IDS) {
      if (!inv.runes.some((r) => r.id === id)) pool.push({ item: { kind: 'rune', id, level: 1 }, weight: 0.7 });
    }
  }
  return pool.filter((p) => !inv.banned.includes(choiceKey(p.item)));
}

/**
 * Picks up to `count` distinct level-up choices (none of `avoid`, e.g. the cards being rerolled away); tops up
 * with gold/heal when everything is maxed.
 */
export function rollChoices(inv: Inventory, rng: Rng, count = 3, avoid: Choice[] = []): Choice[] {
  const skip = new Set(avoid.map(choiceKey));
  const pool = upgradePool(inv).filter((p) => !skip.has(choiceKey(p.item)));
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
  } else if (choice.kind === 'rune') {
    const owned = inv.runes.find((r) => r.id === choice.id);
    if (owned) owned.level = Math.min(RUNES[owned.id].maxLevel, owned.level + 1);
    else if (inv.runes.length < MAX_RUNES) inv.runes.push({ id: choice.id, level: 1 });
  }
}

/** Weapons that are max level, not evolved, and whose required passive or rune is owned. */
export function evolvableWeapons(inv: Inventory): WeaponId[] {
  return inv.weapons
    .filter((w) => {
      const evo = WEAPONS[w.id].evolution;
      const has = !!evo && (inv.passives.some((p) => p.id === evo.requires) || inv.runes.some((r) => r.id === evo.requires));
      return !w.evolved && w.level >= MAX_WEAPON_LEVEL && has;
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
