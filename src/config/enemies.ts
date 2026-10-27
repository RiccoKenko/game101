export type EnemyId =
  | 'slime' | 'bat' | 'mushroom' | 'bee' | 'puff'
  | 'skeleton' | 'ghost' | 'zombie' | 'pumpkin' | 'wraith'
  | 'imp' | 'knight' | 'gargoyle' | 'mimic' | 'wisp'
  | 'goblin';
/** The three map bosses (every 5:00) and the three leaders, smaller bosses that come at 2:30, 7:30... */
export type BossId = 'boss_slime' | 'boss_lich' | 'boss_demon' | 'boss_boar' | 'boss_captain' | 'boss_ogre';

/**
 * chase: walks straight at the player. bat: chase with a side-to-side wobble.
 * ranged: keeps distance and shoots (fireballs, or its `shot`). charge: periodically dashes at the player.
 * swarm: a fast wobbling flyer that comes in groups. splitter: bursts into two small copies when killed.
 * exploder: runs up, lights its fuse and blows up (hurting the hero and other monsters nearby).
 * ambush: sits still looking like loot until the hero comes close (or hits it), then chases fast.
 * flee: runs away from the hero (the treasure goblin), and escapes after a while.
 */
export type EnemyBehavior = 'chase' | 'bat' | 'ranged' | 'charge' | 'swarm' | 'splitter' | 'exploder' | 'ambush' | 'flee';

/**
 * How the sprite moves on top of its two-frame flip. hop: bounces along, squashing on landing. flap: hovers
 * with a wingbeat bob. float: drifts and sways. walk: waddles side to side. heavy: a slow, rolling stomp.
 */
export type EnemyMotion = 'hop' | 'flap' | 'float' | 'walk' | 'heavy';

export interface EnemyDef {
  id: EnemyId;
  name: string;
  /** Texture prefix; frames are `${texture}_0` and `${texture}_1`. */
  texture: string;
  hp: number;
  speed: number;
  /** Contact damage. */
  damage: number;
  radius: number;
  xp: number;
  /** Chance to drop a coin. */
  coinChance: number;
  behavior: EnemyBehavior;
  /** 0..1, how much knockback is resisted. */
  knockbackResist: number;
  alpha?: number;
  motion: EnemyMotion;
  /** Colour of its hit sparks, death burst and ground splat. */
  color: number;
  /** What a ranged enemy shoots (default fireball), and every how many seconds (default 2.6). */
  shot?: keyof typeof ENEMY_SHOTS;
  shotEvery?: number;
}

export const ENEMIES: Record<EnemyId, EnemyDef> = {
  slime: { id: 'slime', name: 'Gummy', texture: 'slime', hp: 9, speed: 105, damage: 6, radius: 30, xp: 1, coinChance: 0.1, behavior: 'chase', knockbackResist: 0, motion: 'hop', color: 0xff7eb6 },
  bat: { id: 'bat', name: 'Fluffbun', texture: 'bat', hp: 6, speed: 175, damage: 5, radius: 28, xp: 1, coinChance: 0.1, behavior: 'bat', knockbackResist: 0, motion: 'flap', color: 0xa77bff },
  mushroom: { id: 'mushroom', name: 'Capshroom', texture: 'mushroom', hp: 30, speed: 80, damage: 9, radius: 34, xp: 4, coinChance: 0.16, behavior: 'chase', knockbackResist: 0.4, motion: 'walk', color: 0xff6b5b },

  skeleton: { id: 'skeleton', name: 'Greyfang', texture: 'skeleton', hp: 22, speed: 110, damage: 9, radius: 32, xp: 2, coinChance: 0.12, behavior: 'chase', knockbackResist: 0.1, motion: 'walk', color: 0xf2ead3 },
  ghost: { id: 'ghost', name: 'Lantern Ghost', texture: 'ghost', hp: 13, speed: 180, damage: 8, radius: 32, xp: 2, coinChance: 0.12, behavior: 'bat', knockbackResist: 0, alpha: 0.85, motion: 'float', color: 0xcfe8ff },
  zombie: { id: 'zombie', name: 'Talisman Ghoul', texture: 'zombie', hp: 60, speed: 72, damage: 13, radius: 36, xp: 5, coinChance: 0.18, behavior: 'chase', knockbackResist: 0.5, motion: 'heavy', color: 0x8fc46a },

  imp: { id: 'imp', name: 'Dust Imp', texture: 'imp', hp: 30, speed: 125, damage: 10, radius: 32, xp: 3, coinChance: 0.14, behavior: 'ranged', knockbackResist: 0.1, motion: 'flap', color: 0xff8a3d },
  knight: { id: 'knight', name: 'Wrapped One', texture: 'knight', hp: 115, speed: 78, damage: 17, radius: 40, xp: 8, coinChance: 0.22, behavior: 'chase', knockbackResist: 0.8, motion: 'heavy', color: 0xb8c2d6 },
  gargoyle: { id: 'gargoyle', name: 'Stingtail', texture: 'gargoyle', hp: 52, speed: 115, damage: 14, radius: 38, xp: 5, coinChance: 0.18, behavior: 'charge', knockbackResist: 0.4, motion: 'walk', color: 0x9a8fa8 },
  bee: { id: 'bee', name: 'Buzzer', texture: 'bee', hp: 5, speed: 215, damage: 4, radius: 26, xp: 1, coinChance: 0.05, behavior: 'swarm', knockbackResist: 0, motion: 'flap', color: 0xffd23f },
  puff: { id: 'puff', name: 'Fuzzpuff', texture: 'puff', hp: 26, speed: 88, damage: 8, radius: 32, xp: 3, coinChance: 0.14, behavior: 'splitter', knockbackResist: 0.2, motion: 'walk', color: 0xfff4d6 },
  pumpkin: { id: 'pumpkin', name: 'Bomb Acorn', texture: 'pumpkin', hp: 30, speed: 128, damage: 10, radius: 32, xp: 3, coinChance: 0.15, behavior: 'exploder', knockbackResist: 0.2, motion: 'walk', color: 0xff9a3d },
  wraith: { id: 'wraith', name: 'Foxfire Kit', texture: 'wraith', hp: 24, speed: 110, damage: 8, radius: 32, xp: 3, coinChance: 0.14, behavior: 'ranged', knockbackResist: 0.1, alpha: 0.92, motion: 'float', color: 0x7fd6c8, shot: 'spirit', shotEvery: 3.8 },
  mimic: { id: 'mimic', name: 'Treasure Urn', texture: 'mimic', hp: 140, speed: 175, damage: 16, radius: 40, xp: 10, coinChance: 1, behavior: 'ambush', knockbackResist: 0.7, motion: 'heavy', color: 0xc89a4a },
  goblin: { id: 'goblin', name: 'Coin Thief', texture: 'goblin', hp: 70, speed: 250, damage: 0, radius: 34, xp: 12, coinChance: 0, behavior: 'flee', knockbackResist: 0.5, motion: 'walk', color: 0x9fbf6a },
  wisp: { id: 'wisp', name: 'Gold Scarab', texture: 'wisp', hp: 18, speed: 195, damage: 9, radius: 28, xp: 2, coinChance: 0.1, behavior: 'swarm', knockbackResist: 0, motion: 'float', color: 0xff8a3d },
};

export interface BossDef {
  id: BossId;
  name: string;
  texture: string;
  hp: number;
  speed: number;
  damage: number;
  radius: number;
  color: number;
  /** A leader: no map unlock, a smaller reward, and its name says "leader" in the HUD. */
  leader?: boolean;
}

export const BOSSES: Record<BossId, BossDef> = {
  boss_slime: { id: 'boss_slime', name: 'Jelly Monarch', texture: 'boss_slime', hp: 900, speed: 115, damage: 18, radius: 105, color: 0xff7eb6 },
  boss_lich: { id: 'boss_lich', name: 'Shrine Oni', texture: 'boss_lich', hp: 2000, speed: 75, damage: 22, radius: 90, color: 0x9fd8ff },
  boss_demon: { id: 'boss_demon', name: 'Sunscar Pharaoh', texture: 'boss_demon', hp: 4200, speed: 110, damage: 28, radius: 125, color: 0xff6a3d },
  boss_boar: { id: 'boss_boar', name: 'Ironhide Boar', texture: 'boss_boar', hp: 380, speed: 120, damage: 16, radius: 80, color: 0xa0663a, leader: true },
  boss_captain: { id: 'boss_captain', name: 'Bigpaw', texture: 'boss_captain', hp: 820, speed: 95, damage: 20, radius: 78, color: 0xf2ead3, leader: true },
  boss_ogre: { id: 'boss_ogre', name: 'Sandstone Golem', texture: 'boss_ogre', hp: 1700, speed: 82, damage: 26, radius: 96, color: 0x8aa0c0, leader: true },
};

/** Enemy projectiles (Imp, Lich, Demon Lord). */
export const ENEMY_SHOTS = {
  fireball: { texture: 'fireball', speed: 380, radius: 16, damage: 10 },
  orb: { texture: 'orb', speed: 300, radius: 18, damage: 14 },
  /** A Wraith's lantern spark: the Lich's orb, slower and weaker. */
  spirit: { texture: 'orb', speed: 260, radius: 15, damage: 7 },
};
