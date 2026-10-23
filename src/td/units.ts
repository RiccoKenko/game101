/**
 * Numbers for everything that fights. Distances are map pixels (the road is 84 px wide), times are seconds.
 */

export type EnemyKind = 'deckhand' | 'powderMonkey' | 'ironclad' | 'parrot';

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
  /** How high a flyer is above the road (its shadow stays on the road). */
  altitude: number;
  /** Share of physical damage (arrows, cannonballs) its armour stops; magic goes straight through. */
  armor: number;
  /** Body radius, for drawing and for arrows to hit. */
  radius: number;
}

export const ENEMIES: Record<EnemyKind, EnemyDef> = {
  // Pirates pass the towers twice (in to the vault, out to the dock), so they need more health than a road-once TD.
  deckhand: { name: 'Deckhand', hp: 65, speed: 52, carrySpeed: 0.8, bounty: 5, flying: false, altitude: 0, armor: 0, radius: 22 },
  powderMonkey: { name: 'Powder Monkey', hp: 35, speed: 86, carrySpeed: 0.75, bounty: 3, flying: false, altitude: 0, armor: 0, radius: 16 },
  ironclad: { name: 'Ironclad', hp: 140, speed: 36, carrySpeed: 0.85, bounty: 14, flying: false, altitude: 0, armor: 0.5, radius: 26 },
  parrot: { name: 'Parrot Raider', hp: 42, speed: 72, carrySpeed: 0.8, bounty: 7, flying: true, altitude: 70, armor: 0, radius: 18 },
};

export type DamageType = 'physical' | 'magic';

/** Damage left after armour: physical damage is cut by the armour share (never below 1), magic is not. */
export function afterArmor(damage: number, type: DamageType, armor: number): number {
  if (type === 'magic' || armor <= 0 || damage <= 0) return damage;
  return Math.max(1, Math.round(damage * (1 - armor)));
}

export type TowerKind = 'archer' | 'cannon' | 'storm' | 'frost';

export interface TowerLevel {
  /** Gold to build (level 1) or to upgrade to this level. */
  cost: number;
  range: number;
  damage: [number, number];
  /** Seconds between shots (or frost pulses). */
  rate: number;
  /** Cannon: blast radius where the ball lands. */
  splash?: number;
  /** Frost: speed multiplier while chilled, and how long a chill lasts. */
  slow?: number;
  slowFor?: number;
}

export interface TowerDef {
  name: string;
  /** A few words for the build menu. */
  blurb: string;
  /**
   * - arrow: a homing arrow.
   * - shell: a cannonball lobbed at where the target will be; it bursts on the ground and hits everyone near.
   * - zap: lightning that strikes at once.
   * - pulse: a cold wave that chills everyone in range.
   */
  attack: 'arrow' | 'shell' | 'zap' | 'pulse';
  damageType: DamageType;
  hitsFlying: boolean;
  projectileSpeed: number;
  levels: TowerLevel[];
}

export const TOWERS: Record<TowerKind, TowerDef> = {
  archer: {
    name: 'Archer Tower',
    blurb: 'Fast · hits flyers',
    attack: 'arrow',
    damageType: 'physical',
    hitsFlying: true,
    projectileSpeed: 820,
    levels: [
      { cost: 70, range: 240, damage: [4, 7], rate: 0.8 },
      { cost: 110, range: 260, damage: [7, 11], rate: 0.7 },
      { cost: 160, range: 285, damage: [11, 16], rate: 0.6 },
    ],
  },
  cannon: {
    name: 'Cannon',
    blurb: 'Blast · ground only',
    attack: 'shell',
    damageType: 'physical',
    hitsFlying: false,
    projectileSpeed: 430,
    levels: [
      { cost: 90, range: 210, damage: [10, 18], rate: 2, splash: 75 },
      { cost: 130, range: 225, damage: [18, 28], rate: 1.9, splash: 82 },
      { cost: 190, range: 240, damage: [28, 42], rate: 1.8, splash: 90 },
    ],
  },
  storm: {
    name: 'Storm Crystal',
    blurb: 'Pierces armour',
    attack: 'zap',
    damageType: 'magic',
    hitsFlying: true,
    projectileSpeed: Infinity,
    levels: [
      { cost: 100, range: 220, damage: [9, 14], rate: 1.4 },
      { cost: 140, range: 235, damage: [16, 24], rate: 1.3 },
      { cost: 200, range: 250, damage: [27, 38], rate: 1.2 },
    ],
  },
  frost: {
    name: 'Frost Cloud',
    blurb: 'Slows everyone',
    attack: 'pulse',
    damageType: 'magic',
    hitsFlying: true,
    projectileSpeed: Infinity,
    levels: [
      { cost: 80, range: 170, damage: [0, 0], rate: 1, slow: 0.6, slowFor: 1.6 },
      { cost: 110, range: 185, damage: [0, 0], rate: 1, slow: 0.5, slowFor: 1.8 },
      { cost: 150, range: 200, damage: [0, 0], rate: 1, slow: 0.4, slowFor: 2 },
    ],
  },
};

export const TOWER_KINDS = Object.keys(TOWERS) as TowerKind[];

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
