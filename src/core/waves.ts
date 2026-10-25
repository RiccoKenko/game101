import { BOSS_INTERVAL } from '../config/game';

const minutes = (t: number) => t / 60;

/** Minutes past the point where enemies start to "enrage" and outscale a fully built hero. */
const ENRAGE_START = 8;
const overtime = (m: number) => Math.max(0, m - ENRAGE_START);

/** Enemy HP multiplier at time t (seconds). */
export function hpMultiplier(t: number): number {
  const m = minutes(t);
  return (1 + 0.35 * m + 0.07 * m * m) * 1.3 ** overtime(m);
}

export function damageMultiplier(t: number): number {
  const m = minutes(t);
  return (1 + 0.1 * m) * 1.15 ** overtime(m);
}

/** Regular enemies spawned per second at time t. */
export function spawnRate(t: number): number {
  const m = minutes(t);
  return 1.3 + 1.1 * m + 0.1 * m * m;
}

/**
 * Coins drop less often as the crowds grow, so gold comes in at a steady pace (about COIN_FLOW drops' worth a
 * second) rather than snowballing with the number of monsters late in a run.
 */
export const COIN_FLOW = 3;
export function coinFactor(t: number): number {
  return Math.min(1, COIN_FLOW / spawnRate(t));
}

/** Relative weights of the map's [early, mid, late] enemy types at time t. */
export function enemyWeights(t: number): [number, number, number] {
  const m = minutes(t);
  if (m < 1) return [1, 0, 0];
  if (m < 2) return [0.6, 0.4, 0];
  if (m < 3) return [0.4, 0.4, 0.2];
  if (m < 5) return [0.3, 0.35, 0.35];
  return [0.25, 0.35, 0.4];
}

/** Chance that a spawned enemy is an elite (bigger, tougher, better loot). */
/** Enemies get a little faster over time (capped). */
export function speedMultiplier(t: number): number {
  const m = minutes(t);
  return Math.min(1.6, 1 + 0.03 * m + 0.04 * overtime(m));
}

export function eliteChance(t: number): number {
  const m = minutes(t);
  return m < 3 ? 0 : Math.min(0.06, 0.012 * (m - 2));
}

/** How many bosses should have appeared by time t (1 at 5:00, 2 at 10:00, ...). */
export function bossesDue(t: number): number {
  return Math.floor(t / BOSS_INTERVAL);
}

/** How many leaders (the smaller bosses) should have appeared by time t: one at 2:30, 7:30, 12:30... */
export function leadersDue(t: number): number {
  return t < BOSS_INTERVAL / 2 ? 0 : 1 + Math.floor((t - BOSS_INTERVAL / 2) / BOSS_INTERVAL);
}

/** How many monsters fly in with the k-th swarm (0-based). */
export function swarmSize(base: number, k: number): number {
  return base + Math.floor(k / 3);
}

/** HP multiplier for the k-th boss appearance (0-based), on top of hpMultiplier. */
export function bossHpMultiplier(k: number): number {
  return 1 + 0.8 * k;
}

/** Times (seconds) of "surround" events where a ring of enemies spawns around the player. */
export function ringEventsDue(t: number): number {
  return t < 100 ? 0 : 1 + Math.floor((t - 100) / 120);
}

export function ringSize(k: number): number {
  return 18 + 4 * k;
}
