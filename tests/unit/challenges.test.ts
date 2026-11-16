import { describe, expect, it } from 'vitest';
import { DAILY, DAILY_CURSES } from '../../src/config/challenges';
import { dailyPlayed, dailyReward, dailySpec, startDaily } from '../../src/core/challenges';
import { defaultSave, sanitize } from '../../src/core/save';

describe('daily challenge', () => {
  it('is the same all day for everyone, and changes the next day', () => {
    const a = dailySpec(3, new Date(2026, 10, 16, 8));
    const b = dailySpec(3, new Date(2026, 10, 16, 23));
    expect(b).toEqual(a);
    const days = Array.from({ length: 10 }, (_, i) => dailySpec(3, new Date(2026, 10, 17 + i)));
    expect(new Set(days.map((d) => `${d.map}:${d.curses.join()}:${d.twist.id}`)).size).toBeGreaterThan(5);
    for (const d of days) {
      expect(d.curses).toHaveLength(DAILY.curses);
      expect(new Set(d.curses).size).toBe(DAILY.curses);
      for (const c of d.curses) expect(DAILY_CURSES).toContain(c);
      expect(d.map).toBeGreaterThanOrEqual(0);
      expect(d.map).toBeLessThan(3);
    }
    // Only maps the player has opened.
    for (let i = 0; i < 20; i++) expect(dailySpec(1, new Date(2026, 0, 1 + i)).map).toBe(0);
  });

  it('can be played once a day', () => {
    const save = defaultSave();
    const now = new Date(2026, 10, 16, 10);
    expect(dailyPlayed(save, now)).toBe(false);
    expect(startDaily(save, now)).toBe(true);
    expect(startDaily(save, now)).toBe(false);
    expect(dailyPlayed(save, new Date(2026, 10, 17, 1))).toBe(false);
    expect(sanitize({ challenge: { day: '2026-11-16', best: 532 } }).challenge).toEqual({ day: '2026-11-16', best: 532 });
  });

  it('pays by the minute, a card for ten minutes, gear for a clear', () => {
    expect(dailyReward(59, false)).toEqual({ ore: 0, card: false, gear: false });
    expect(dailyReward(9 * 60 + 30, false)).toEqual({ ore: 36, card: false, gear: false });
    expect(dailyReward(900, true)).toEqual({ ore: 60, card: true, gear: true });
  });
});
