/**
 * Numbers for everything that fights. Distances are map pixels (the road is 84 px wide), times are seconds.
 */

export type EnemyKind = 'deckhand' | 'powderMonkey';

export interface EnemyDef {
  name: string;
  hp: number;
  /** Walking speed along the road. */
  speed: number;
  /** Speed multiplier while carrying a crystal over its head. */
  carrySpeed: number;
  /** Gold for shooting it down. */
  bounty: number;
  flying: boolean;
  /** Body radius, for drawing and for arrows to hit. */
  radius: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  // Pirates pass the towers twice (in to the vault, out to the dock), so they need more health than a road-once TD.
  deckhand: { name: 'Deckhand', hp: 65, speed: 52, carrySpeed: 0.8, bounty: 5, flying: false, radius: 22 },
  powderMonkey: { name: 'Powder Monkey', hp: 35, speed: 86, carrySpeed: 0.75, bounty: 3, flying: false, radius: 16 },
};

export type TowerKind = 'archer';

export interface TowerLevel {
  /** Gold to build (level 1) or to upgrade to this level. */
  cost: number;
  range: number;
  damage: [number, number];
  /** Seconds between shots. */
  rate: number;
}

export interface TowerDef {
  name: string;
  levels: TowerLevel[];
  hitsFlying: boolean;
  projectileSpeed: number;
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    name: 'Archer Tower',
    hitsFlying: true,
    projectileSpeed: 820,
    levels: [
      { cost: 70, range: 240, damage: [4, 7], rate: 0.8 },
      { cost: 110, range: 260, damage: [7, 11], rate: 0.7 },
      { cost: 160, range: 285, damage: [11, 16], rate: 0.6 },
    ],
  },
};

export const HERO = {
  speed: 150,
  range: 250,
  damage: [6, 9] as [number, number],
  /** Seconds between shots. */
  rate: 0.55,
  /** Draw time before the arrow leaves the bow (the shoot move's release moment). */
  windup: 0.25,
  critChance: 0.15,
  critMultiplier: 2,
  projectileSpeed: 950,
};
