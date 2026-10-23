/**
 * Captain's orders: after some waves the battle pauses and offers three cards; the one picked boosts the
 * defence for the rest of the level. Every card changes the battle's modifiers (or pays out at once).
 */
import type { Battle } from './battle';
import type { Rng } from '../core/rng';
import type { TowerKind } from './units';

/** Multipliers and bonuses the cards stack up; all start neutral. */
export interface Modifiers {
  /** Damage multiplier per tower kind, and for the hero's arrows. */
  damage: Record<TowerKind | 'hero', number>;
  range: number;
  /** Multiplier on seconds between attacks (lower is faster). */
  rate: number;
  splash: number;
  /** Multiplier on how much frost slows (1 − slow), and extra seconds a chill lasts. */
  slowPower: number;
  slowFor: number;
  bounty: number;
  /** Multiplier on tower prices. */
  cost: number;
  heroRange: number;
  /** Multipliers on the companions' cooldowns. */
  talon: number;
  mochi: number;
}

export function neutralModifiers(): Modifiers {
  return {
    damage: { archer: 1, cannon: 1, storm: 1, frost: 1, hero: 1 },
    range: 1,
    rate: 1,
    splash: 1,
    slowPower: 1,
    slowFor: 0,
    bounty: 1,
    cost: 1,
    heroRange: 1,
    talon: 1,
    mochi: 1,
  };
}

export type CardId =
  | 'arrows' | 'powder' | 'storm' | 'frost' | 'spyglass' | 'drill' | 'chest' | 'bounty' | 'shipwrights' | 'hero' | 'talon' | 'mochi' | 'magnet';

export interface CardDef {
  id: CardId;
  name: string;
  /** One short line for the card. */
  text: string;
  /** A picture for the card face (an emoji until drawn art arrives). */
  icon: string;
  apply(b: Battle): void;
}

export const CARDS: CardDef[] = [
  { id: 'arrows', name: 'Sharpened Arrows', icon: '🏹', text: 'Archer towers and Little Archer hit 25% harder.', apply: (b) => { b.mods.damage.archer *= 1.25; b.mods.damage.hero *= 1.25; } },
  { id: 'powder', name: 'Double Powder', icon: '💣', text: 'Cannons hit 25% harder and blast 20% wider.', apply: (b) => { b.mods.damage.cannon *= 1.25; b.mods.splash *= 1.2; } },
  { id: 'storm', name: 'Storm Surge', icon: '⚡', text: 'Storm Crystals hit 30% harder.', apply: (b) => { b.mods.damage.storm *= 1.3; } },
  { id: 'frost', name: 'Bitter Cold', icon: '❄️', text: 'Frost slows 30% more and lasts a second longer.', apply: (b) => { b.mods.slowPower *= 1.3; b.mods.slowFor += 1; } },
  { id: 'spyglass', name: 'Spyglasses', icon: '🔭', text: 'Every tower reaches 12% farther.', apply: (b) => { b.mods.range *= 1.12; } },
  { id: 'drill', name: 'Drill Practice', icon: '🥁', text: 'Every tower attacks 12% faster.', apply: (b) => { b.mods.rate *= 0.88; } },
  { id: 'chest', name: 'War Chest', icon: '💰', text: '+150 gold right now.', apply: (b) => b.purse.earn(150) },
  { id: 'bounty', name: 'Bounty Posters', icon: '📜', text: 'Pirates drop 40% more gold.', apply: (b) => { b.mods.bounty *= 1.4; } },
  { id: 'shipwrights', name: 'Shipwrights', icon: '🔨', text: 'Towers and upgrades cost 15% less.', apply: (b) => { b.mods.cost *= 0.85; } },
  { id: 'hero', name: "Hero's Resolve", icon: '⭐', text: 'Little Archer hits 40% harder and shoots 20% farther.', apply: (b) => { b.mods.damage.hero *= 1.4; b.mods.heroRange *= 1.2; } },
  { id: 'talon', name: "Talon's Training", icon: '🦅', text: 'Talon is ready now and recharges 35% faster.', apply: (b) => { b.mods.talon *= 0.65; b.talon.cooldown = 0; } },
  { id: 'mochi', name: 'Mochi Snack', icon: '🐋', text: 'Mochi is ready now and recharges 30% faster.', apply: (b) => { b.mods.mochi *= 0.7; b.mochi.cooldown = 0; } },
  { id: 'magnet', name: 'Crystal Magnet', icon: '💎', text: 'Dropped crystals float home three times faster.', apply: (b) => { b.vault.floatSpeed *= 3; } },
];

/** Three different cards, drawn at random. */
export function dealHand(rng: Rng, size = 3): CardDef[] {
  const pool = [...CARDS];
  const hand: CardDef[] = [];
  while (hand.length < size && pool.length) hand.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  return hand;
}
