import { formatTime } from '../core/format';
import { type MonsterId } from './collection';

/** What one run did, measured when it ends (or live, for the "quest complete" toasts during a run). */
export interface RunReport {
  mapIndex: number;
  /** Seconds survived. */
  time: number;
  level: number;
  kills: number;
  eliteKills: number;
  bossKills: number;
  /** Gold picked up during the run (coins, chests, gold cards), before the end-of-run bonus. */
  gold: number;
  chests: number;
  evolutions: number;
  /** Kills by kind of monster (bosses and leaders too), for the Collection. */
  monsters: Partial<Record<MonsterId, number>>;
  /** Shrine offers accepted, and whether the run ended with the hero falling (not a clear, not a quit). */
  shrines: number;
  died: boolean;
}

/** A run only counts for "play N runs" if it lasted this long (so quitting at once doesn't farm it). */
export const MIN_RUN_SECONDS = 60;

export type QuestId = 'kills' | 'elites' | 'survive' | 'level' | 'gold' | 'runs' | 'boss' | 'mapKills' | 'evolve';

export interface QuestDef {
  id: QuestId;
  icon: string;
  /** 'sum' adds up over all of the day's runs; 'best' is the best single run. */
  mode: 'sum' | 'best';
  /** Target and gold reward for a player with 1, 2 or 3 maps unlocked. */
  targets: [number, number, number];
  rewards: [number, number, number];
  /** Rolled only once this many maps are unlocked. */
  minMaps?: number;
  /** Tied to one map (picked from the unlocked ones when rolled). */
  perMap?: boolean;
  /** Never rolled on the same day as these. */
  excludes?: QuestId[];
  measure: (r: RunReport, map: number) => number;
  describe: (target: number, mapName: string) => string;
}

export const QUESTS: QuestDef[] = [
  {
    id: 'kills',
    icon: 'icon_skull',
    mode: 'sum',
    targets: [300, 500, 800],
    rewards: [60, 90, 120],
    excludes: ['mapKills'],
    measure: (r) => r.kills,
    describe: (n) => `Defeat ${n} monsters`,
  },
  {
    id: 'elites',
    icon: 'icon_crown',
    mode: 'sum',
    targets: [5, 12, 20],
    rewards: [70, 100, 140],
    measure: (r) => r.eliteKills,
    describe: (n) => `Defeat ${n} elite monsters`,
  },
  {
    id: 'survive',
    icon: 'icon_clock',
    mode: 'best',
    targets: [180, 300, 480],
    rewards: [60, 90, 130],
    measure: (r) => r.time,
    describe: (n) => `Survive ${formatTime(n)} in one run`,
  },
  {
    id: 'level',
    icon: 'icon_growth',
    mode: 'best',
    targets: [10, 15, 20],
    rewards: [60, 90, 120],
    measure: (r) => r.level,
    describe: (n) => `Reach level ${n} in one run`,
  },
  {
    id: 'gold',
    icon: 'icon_coin',
    mode: 'sum',
    targets: [80, 200, 400],
    rewards: [50, 80, 110],
    measure: (r) => r.gold,
    describe: (n) => `Collect ${n} gold`,
  },
  {
    id: 'runs',
    icon: 'icon_bow',
    mode: 'sum',
    targets: [3, 3, 3],
    rewards: [40, 50, 60],
    measure: (r) => (r.time >= MIN_RUN_SECONDS ? 1 : 0),
    describe: (n) => `Play ${n} runs (${MIN_RUN_SECONDS / 60} minute or longer)`,
  },
  {
    id: 'boss',
    icon: 'icon_trophy',
    mode: 'sum',
    targets: [1, 1, 2],
    rewards: [100, 120, 160],
    minMaps: 2,
    measure: (r) => r.bossKills,
    describe: (n) => (n === 1 ? 'Defeat a boss' : `Defeat ${n} bosses`),
  },
  {
    id: 'mapKills',
    icon: 'icon_skull',
    mode: 'sum',
    targets: [200, 300, 400],
    rewards: [70, 100, 130],
    minMaps: 2,
    perMap: true,
    excludes: ['kills'],
    measure: (r, map) => (r.mapIndex === map ? r.kills : 0),
    describe: (n, map) => `Defeat ${n} monsters in ${map}`,
  },
  {
    id: 'evolve',
    icon: 'icon_stormbow',
    mode: 'sum',
    targets: [1, 1, 1],
    rewards: [120, 120, 150],
    minMaps: 2,
    measure: (r) => r.evolutions,
    describe: () => 'Evolve a skill',
  },
];

/** Daily quests a day. */
export const DAILY_COUNT = 3;
/** Extra gold for finishing all of the day's quests, by maps unlocked. */
export const DAILY_BONUS: [number, number, number] = [80, 120, 160];

export function questDef(id: QuestId): QuestDef {
  return QUESTS.find((q) => q.id === id)!;
}

// ---------------------------------------------------------------- achievements

/** Lifetime numbers the achievements are measured against. */
export interface Lifetime {
  kills: number;
  eliteKills: number;
  bossKills: number;
  bestTime: number;
  bestLevel: number;
  maps: number;
  chests: number;
  evolutions: number;
  gold: number;
  /** Map difficulties cleared (each map counts once per difficulty). */
  clears: number;
  /** The most heat (curses) a stage was ever cleared with. */
  heat: number;
}

export type AchievementId = 'hunter' | 'elite' | 'boss' | 'survivor' | 'level' | 'explorer' | 'treasure' | 'evolve' | 'gold' | 'champion' | 'cursed';

export interface AchievementDef {
  id: AchievementId;
  name: string;
  icon: string;
  stat: keyof Lifetime;
  /** Each tier is claimed in turn: I, II, III... */
  tiers: { target: number; reward: number }[];
  describe: (target: number) => string;
}

const tiers = (targets: number[], rewards: number[]) => targets.map((target, i) => ({ target, reward: rewards[i] }));

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'hunter',
    name: 'Monster Hunter',
    icon: 'icon_skull',
    stat: 'kills',
    tiers: tiers([500, 2500, 10000, 40000], [80, 200, 500, 1200]),
    describe: (n) => `Defeat ${n.toLocaleString('en-US')} monsters`,
  },
  {
    id: 'elite',
    name: 'Elite Slayer',
    icon: 'icon_crown',
    stat: 'eliteKills',
    tiers: tiers([10, 50, 200], [80, 200, 500]),
    describe: (n) => `Defeat ${n} elite monsters`,
  },
  {
    id: 'boss',
    name: 'Boss Breaker',
    icon: 'icon_trophy',
    stat: 'bossKills',
    tiers: tiers([1, 5, 15], [150, 300, 800]),
    describe: (n) => (n === 1 ? 'Defeat a boss' : `Defeat ${n} bosses`),
  },
  {
    id: 'survivor',
    name: 'Survivor',
    icon: 'icon_clock',
    stat: 'bestTime',
    tiers: tiers([300, 600, 900], [100, 250, 600]),
    describe: (n) => `Survive ${formatTime(n)} in one run`,
  },
  {
    id: 'level',
    name: 'Sharpshooter',
    icon: 'icon_growth',
    stat: 'bestLevel',
    tiers: tiers([10, 20, 30], [60, 150, 400]),
    describe: (n) => `Reach level ${n} in one run`,
  },
  {
    id: 'explorer',
    name: 'Explorer',
    icon: 'icon_boots',
    stat: 'maps',
    tiers: tiers([2, 3], [150, 300]),
    describe: (n) => `Unlock ${n} maps`,
  },
  {
    id: 'treasure',
    name: 'Treasure Hunter',
    icon: 'chest',
    stat: 'chests',
    tiers: tiers([3, 15, 50], [80, 200, 500]),
    describe: (n) => `Open ${n} chests`,
  },
  {
    id: 'evolve',
    name: 'Skill Master',
    icon: 'icon_stormbow',
    stat: 'evolutions',
    tiers: tiers([1, 5, 20], [120, 300, 700]),
    describe: (n) => (n === 1 ? 'Evolve a skill' : `Evolve skills ${n} times`),
  },
  {
    id: 'gold',
    name: 'Gold Hoarder',
    icon: 'icon_greed',
    stat: 'gold',
    tiers: tiers([1000, 5000, 20000], [80, 200, 500]),
    describe: (n) => `Earn ${n.toLocaleString('en-US')} gold`,
  },
  {
    id: 'champion',
    name: 'Champion',
    icon: 'icon_trophy',
    stat: 'clears',
    tiers: tiers([1, 3, 6, 9], [200, 400, 800, 1500]),
    describe: (n) => (n === 1 ? 'Clear a stage (beat the 15:00 boss)' : `Clear ${n} stages (map + difficulty)`),
  },
  {
    id: 'cursed',
    name: 'Curse Breaker',
    icon: 'icon_curse',
    stat: 'heat',
    tiers: tiers([2, 5, 8, 11], [200, 400, 800, 1500]),
    describe: (n) => `Clear a stage with curses of heat ${n} or more`,
  },
];

export const ACHIEVEMENT_IDS = ACHIEVEMENTS.map((a) => a.id);
