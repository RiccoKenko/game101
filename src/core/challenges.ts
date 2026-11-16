import { DAILY, DAILY_CURSES, TWISTS, WEEKLY_BOSSES, type TwistDef } from '../config/challenges';
import { type BossId } from '../config/enemies';
import { MAPS } from '../config/maps';
import { type CurseId } from '../config/curses';
import { dayKey, hash } from './quests';
import { mulberry32 } from './rng';
import { type SaveData } from './save';

export interface DailySpec {
  day: string;
  seed: number;
  map: number;
  curses: CurseId[];
  twist: TwistDef;
}

/** Today's challenge: everyone with the same maps open gets the same one on the same day. */
export function dailySpec(unlockedMaps: number, now = new Date()): DailySpec {
  const day = dayKey(now);
  const seed = hash(`daily:${day}`);
  const rng = mulberry32(seed);
  const map = Math.floor(rng() * Math.max(1, unlockedMaps));
  const pool = [...DAILY_CURSES];
  const curses: CurseId[] = [];
  while (curses.length < DAILY.curses) curses.push(pool.splice(Math.floor(rng() * pool.length), 1)[0]);
  const twist = TWISTS[Math.floor(rng() * TWISTS.length)];
  return { day, seed, map, curses, twist };
}

/** Whether today's challenge has been played already. */
export const dailyPlayed = (save: SaveData, now = new Date()): boolean => save.challenge.day === dayKey(now);

/** Marks today's challenge as taken (when the run starts, so quitting doesn't give a second try). */
export function startDaily(save: SaveData, now = new Date()): boolean {
  if (dailyPlayed(save, now)) return false;
  save.challenge = { day: dayKey(now), best: 0 };
  return true;
}

/** What a daily run earns: ore by the minute, a card for lasting ten minutes, gear for a clear. */
export function dailyReward(time: number, won: boolean): { ore: number; card: boolean; gear: boolean } {
  return { ore: Math.floor(time / 60) * DAILY.orePerMinute, card: time >= DAILY.cardAt, gear: won };
}

/** The week, Monday to Sunday, as "2026-W47" (ISO weeks: the week with the year's first Thursday is week 1). */
export function weekKey(now = new Date()): string {
  const d = new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
  const day = (d.getUTCDay() + 6) % 7;
  d.setUTCDate(d.getUTCDate() - day + 3);
  const firstThursday = new Date(Date.UTC(d.getUTCFullYear(), 0, 4));
  const week = 1 + Math.round(((d.getTime() - firstThursday.getTime()) / 86_400_000 - 3 + ((firstThursday.getUTCDay() + 6) % 7)) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, '0')}`;
}

export interface WeeklySpec {
  week: string;
  boss: BossId;
  /** The map the boss lives on. */
  map: number;
  seed: number;
}

/** This week's boss: they come round in turn, a week each. */
export function weeklySpec(now = new Date()): WeeklySpec {
  const week = weekKey(now);
  const [y, w] = week.split('-W').map(Number);
  const boss = WEEKLY_BOSSES[(y * 53 + w) % WEEKLY_BOSSES.length];
  const map = Math.max(0, MAPS.findIndex((m) => m.boss === boss || m.leader === boss));
  return { week, boss, map, seed: hash(`weekly:${week}`) };
}

/** Whether this week's boss has been beaten already (its reward is once a week). */
export const weeklyWon = (save: SaveData, now = new Date()): boolean => save.weekly.week === weekKey(now) && save.weekly.won;
