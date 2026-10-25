import { type CharacterId } from '../config/characters';
import { MAX_PASSIVES, MAX_RUNES, MAX_WEAPONS } from '../config/game';
import { TALENTS, type TalentId } from '../config/talents';
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
  /** Hero talents learned this run. */
  talents: TalentId[];
  /** Never offered this run: other heroes' own weapons, and anything banished (keys like 'weapon:bow'). */
  banned: string[];
}

export const choiceKey = (c: Choice): string => ('id' in c ? `${c.kind}:${c.id}` : c.kind);

export type Choice =
  | { kind: 'weapon'; id: WeaponId; level: number }
  | { kind: 'passive'; id: PassiveId; level: number }
  | { kind: 'rune'; id: RuneId; level: number }
  | { kind: 'talent'; id: TalentId }
  /** Once everything is maxed: a little more damage, a little more max HP, or a meal. */
  | { kind: 'might' }
  | { kind: 'tough' }
  | { kind: 'heal'; amount: number };

/** What the "everything maxed" cards give. */
export const MAXED = { might: 0.04, tough: 0.05 };

/** XP needed to go from `level` to `level + 1`. */
export function xpToNext(level: number): number {
  if (level < 20) return 8 + (level - 1) * 14;
  if (level < 40) return 280 + (level - 20) * 22;
  return 720 + (level - 40) * 30;
}

/** A run's starting kit: the hero's own weapon at level 1. */
export function newInventory(start: WeaponId = 'bow', banned: string[] = []): Inventory {
  return { weapons: [{ id: start, level: 1, evolved: null }], passives: [], runes: [], talents: [], banned: [...banned] };
}

export function passiveLevels(inv: Inventory): Partial<Record<PassiveId, number>> {
  const out: Partial<Record<PassiveId, number>> = {};
  for (const p of inv.passives) out[p.id] = p.level;
  return out;
}

/** Talents that work like a rune (without taking a rune slot), and how many levels they add. */
const TALENT_RUNES: Partial<Record<TalentId, [RuneId, number]>> = {
  pyro: ['burn', 2],
  cryo: ['freeze', 2],
  stormcall: ['chain', 2],
  trick: ['ricochet', 1],
};

/** Rune strength the hero fights with: runes held plus rune-like talents (3 at most). */
export function runeLevels(inv: Inventory): Partial<Record<RuneId, number>> {
  const out: Partial<Record<RuneId, number>> = {};
  for (const r of inv.runes) out[r.id] = r.level;
  for (const t of inv.talents) {
    const add = TALENT_RUNES[t];
    if (add) out[add[0]] = Math.min(3, (out[add[0]] ?? 0) + add[1]);
  }
  return out;
}

/** Up to `count` talents this hero hasn't learned (or banished), none of `avoid`. */
export function rollTalents(inv: Inventory, hero: CharacterId, rng: Rng, count = 3, avoid: Choice[] = []): Choice[] {
  const skip = new Set(avoid.map(choiceKey));
  const pool: Choice[] = TALENTS.filter((t) => t.hero === hero && !inv.talents.includes(t.id))
    .map((t): Choice => ({ kind: 'talent', id: t.id }))
    .filter((c) => !inv.banned.includes(choiceKey(c)) && !skip.has(choiceKey(c)));
  const out: Choice[] = [];
  while (out.length < count && pool.length) out.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return out;
}

/**
 * Total weight of all the new weapons, passives and runes on offer, shared out among them: adding more kinds of
 * item makes each one rarer but doesn't make upgrades for what you already hold any rarer.
 */
const NEW_WEIGHT = { weapon: 10, passive: 5.6, rune: 4.2 };

/** Every upgrade currently offerable, with its weight. */
function upgradePool(inv: Inventory): { item: Choice; weight: number }[] {
  const pool: { item: Choice; weight: number }[] = [];
  const allowed = (item: Choice) => !inv.banned.includes(choiceKey(item));
  const addNew = (items: Choice[], total: number) => {
    const open = items.filter(allowed);
    for (const item of open) pool.push({ item, weight: total / Math.max(open.length, 8) });
  };
  for (const w of inv.weapons) {
    if (!w.evolved && w.level < MAX_WEAPON_LEVEL) pool.push({ item: { kind: 'weapon', id: w.id, level: w.level + 1 }, weight: 1.3 });
  }
  if (inv.weapons.length < MAX_WEAPONS) {
    addNew(WEAPON_IDS.filter((id) => !inv.weapons.some((w) => w.id === id)).map((id) => ({ kind: 'weapon', id, level: 1 })), NEW_WEIGHT.weapon);
  }
  for (const p of inv.passives) {
    if (p.level < PASSIVES[p.id].maxLevel) pool.push({ item: { kind: 'passive', id: p.id, level: p.level + 1 }, weight: 1.1 });
  }
  if (inv.passives.length < MAX_PASSIVES) {
    addNew(PASSIVE_IDS.filter((id) => !inv.passives.some((p) => p.id === id)).map((id) => ({ kind: 'passive', id, level: 1 })), NEW_WEIGHT.passive);
  }
  for (const r of inv.runes) {
    if (r.level < RUNES[r.id].maxLevel) pool.push({ item: { kind: 'rune', id: r.id, level: r.level + 1 }, weight: 1 });
  }
  if (inv.runes.length < MAX_RUNES) {
    addNew(RUNE_IDS.filter((id) => !inv.runes.some((r) => r.id === id)).map((id) => ({ kind: 'rune', id, level: 1 })), NEW_WEIGHT.rune);
  }
  return pool.filter((p) => allowed(p.item));
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
  for (const extra of [{ kind: 'might' }, { kind: 'tough' }, { kind: 'heal', amount: 0.3 }] as Choice[]) {
    if (out.length < count && !skip.has(choiceKey(extra))) out.push(extra);
  }
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
  } else if (choice.kind === 'talent') {
    if (!inv.talents.includes(choice.id)) inv.talents.push(choice.id);
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
