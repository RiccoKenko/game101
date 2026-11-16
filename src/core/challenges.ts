import { DAILY, DAILY_CURSES, TWISTS, type TwistDef } from '../config/challenges';
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
