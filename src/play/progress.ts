/**
 * Chapter progress kept on this device: the best stars per level (and the hardest difficulty beaten), the
 * difficulty last picked, and which story scenes have been seen. Storage can be missing or throw (private
 * windows, blocked site data), so every read and write is guarded and the game works without it.
 */
import { DIFFICULTIES, type Difficulty } from '../td/difficulty';
import type { LevelDef } from '../td/levels';

export const PROGRESS_KEY = 'sky-pirates.progress.v1';

export interface LevelRecord {
  stars: number;
  /** The hardest difficulty this level has been won on. */
  best: Difficulty;
}

export interface Progress {
  levels: Record<string, LevelRecord>;
  difficulty: Difficulty;
  /** Story scenes already shown (they play once; the level card can replay them). */
  seen: string[];
}

/** The parts of `Storage` the game uses (a plain object stands in for it in tests). */
export type KeyValueStore = Pick<Storage, 'getItem' | 'setItem'>;

export const emptyProgress = (): Progress => ({ levels: {}, difficulty: 'normal', seen: [] });

/** The browser's local storage, or null where it is unavailable. */
export function deviceStore(): KeyValueStore | null {
  try {
    return window.localStorage;
  } catch {
    return null;
  }
}

const rank = (d: Difficulty) => DIFFICULTIES.indexOf(d);

export function loadProgress(store: KeyValueStore | null): Progress {
  const p = emptyProgress();
  try {
    const raw = store?.getItem(PROGRESS_KEY);
    if (!raw) return p;
    const data = JSON.parse(raw) as Partial<Progress>;
    if (data.difficulty && DIFFICULTIES.includes(data.difficulty)) p.difficulty = data.difficulty;
    if (Array.isArray(data.seen)) p.seen = data.seen.filter((s): s is string => typeof s === 'string');
    for (const [id, rec] of Object.entries(data.levels ?? {})) {
      const stars = Math.max(0, Math.min(3, Math.round(Number(rec?.stars) || 0)));
      if (stars > 0) p.levels[id] = { stars, best: DIFFICULTIES.includes(rec.best) ? rec.best : 'normal' };
    }
  } catch {
    // Unreadable or corrupt: start fresh.
  }
  return p;
}

export function saveProgress(store: KeyValueStore | null, p: Progress): boolean {
  try {
    store?.setItem(PROGRESS_KEY, JSON.stringify(p));
    return !!store;
  } catch {
    return false;
  }
}

/** Records a win, keeping the best stars and the hardest difficulty; returns whether either improved. */
export function recordWin(p: Progress, levelId: string, stars: number, difficulty: Difficulty): boolean {
  const old = p.levels[levelId];
  if (!old) {
    p.levels[levelId] = { stars, best: difficulty };
    return true;
  }
  const better = stars > old.stars || rank(difficulty) > rank(old.best);
  old.stars = Math.max(old.stars, stars);
  if (rank(difficulty) > rank(old.best)) old.best = difficulty;
  return better;
}

/** How many of the chapter's levels can be played: the first, plus one more for each level won in a row. */
export function unlockedCount(chapter: LevelDef[], p: Progress): number {
  let n = 1;
  while (n < chapter.length && p.levels[chapter[n - 1].id]) n++;
  return n;
}

export function chapterStars(chapter: LevelDef[], p: Progress): number {
  return chapter.reduce((sum, l) => sum + (p.levels[l.id]?.stars ?? 0), 0);
}

export function markSeen(p: Progress, scene: string): void {
  if (!p.seen.includes(scene)) p.seen.push(scene);
}
