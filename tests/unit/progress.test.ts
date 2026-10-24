import { describe, expect, it } from 'vitest';
import { LEVEL1, type LevelDef } from '../../src/td/levels';
import { chapterStars, emptyProgress, loadProgress, markSeen, PROGRESS_KEY, recordWin, saveProgress, unlockedCount, type KeyValueStore } from '../../src/play/progress';

const memory = (): KeyValueStore & { data: Map<string, string> } => {
  const data = new Map<string, string>();
  return { data, getItem: (k) => data.get(k) ?? null, setItem: (k, v) => void data.set(k, v) };
};
const chapter: LevelDef[] = ['a', 'b', 'c'].map((id) => ({ ...LEVEL1, id }));

describe('chapter progress', () => {
  it('starts with only the first level open, and opens one more per level won in order', () => {
    const p = emptyProgress();
    expect(unlockedCount(chapter, p)).toBe(1);
    recordWin(p, 'a', 2, 'normal');
    expect(unlockedCount(chapter, p)).toBe(2);
    recordWin(p, 'c', 3, 'normal');
    expect(unlockedCount(chapter, p)).toBe(2);
    recordWin(p, 'b', 1, 'easy');
    expect(unlockedCount(chapter, p)).toBe(3);
    expect(chapterStars(chapter, p)).toBe(6);
  });

  it('keeps the best stars and the hardest difficulty won, and says when either improved', () => {
    const p = emptyProgress();
    expect(recordWin(p, 'a', 2, 'hard')).toBe(true);
    expect(recordWin(p, 'a', 1, 'easy')).toBe(false);
    expect(p.levels.a).toEqual({ stars: 2, best: 'hard' });
    expect(recordWin(p, 'a', 3, 'easy')).toBe(true);
    expect(p.levels.a).toEqual({ stars: 3, best: 'hard' });
  });

  it('saves and loads through the store', () => {
    const store = memory();
    const p = emptyProgress();
    recordWin(p, 'a', 3, 'normal');
    p.difficulty = 'hard';
    markSeen(p, 'a:before');
    markSeen(p, 'a:before');
    expect(saveProgress(store, p)).toBe(true);
    expect(loadProgress(store)).toEqual({ levels: { a: { stars: 3, best: 'normal' } }, difficulty: 'hard', seen: ['a:before'] });
  });

  it('survives missing, broken or odd saves, and stores that throw', () => {
    expect(loadProgress(null)).toEqual(emptyProgress());
    const store = memory();
    store.data.set(PROGRESS_KEY, '{not json');
    expect(loadProgress(store)).toEqual(emptyProgress());
    store.data.set(PROGRESS_KEY, JSON.stringify({ levels: { a: { stars: 9, best: 'brutal' }, b: { stars: 0 } }, difficulty: 'nightmare', seen: [1, 'x'] }));
    expect(loadProgress(store)).toEqual({ levels: { a: { stars: 3, best: 'normal' } }, difficulty: 'normal', seen: ['x'] });
    const broken: KeyValueStore = {
      getItem: () => {
        throw new Error('blocked');
      },
      setItem: () => {
        throw new Error('full');
      },
    };
    expect(loadProgress(broken)).toEqual(emptyProgress());
    expect(saveProgress(broken, emptyProgress())).toBe(false);
  });
});
