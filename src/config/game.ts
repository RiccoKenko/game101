/** Global tuning constants. Distances are in world pixels (the screen is 1080 px wide). */
export const GAME_WIDTH = 1080;
export const MIN_GAME_HEIGHT = 1700;
export const MAX_GAME_HEIGHT = 2400;
export const DEFAULT_GAME_HEIGHT = 1920;

export const PLAYER_BASE = {
  maxHp: 100,
  speed: 340,
  magnet: 200,
  armor: 0,
  radius: 32,
  /** Seconds of invulnerability after taking a hit. */
  iframes: 0.45,
};

export const MAX_WEAPONS = 4;
export const MAX_PASSIVES = 4;

/** A boss appears every BOSS_INTERVAL seconds (5:00, 10:00, ...). */
export const BOSS_INTERVAL = 300;
/** Cap on regular enemies alive at once (bosses don't count). */
export const MAX_ENEMIES = 220;
/** Cap on XP gems lying on the ground; extra XP merges into existing gems. */
export const MAX_GEMS = 320;

export const XP_GEM_TIERS = [
  { key: 'gem_s', min: 0 },
  { key: 'gem_m', min: 4 },
  { key: 'gem_l', min: 15 },
] as const;

/** Gold value of one coin on each map (index 0 = Meadow). */
export const COIN_VALUE = [1, 2, 3];
/** Bonus gold at the end of a run: per second survived and per kill. */
export const RUN_BONUS = { perSecond: 0.1, perKill: 0.1 };
export const BOSS_GOLD = [100, 160, 240];

export const DROP_CHANCE = {
  meat: 0.006,
  magnet: 0.003,
};
