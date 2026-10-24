import { describe, expect, it } from 'vitest';
import { defaultSave, sanitize, SaveStore, type KeyValueStorage } from '../../src/core/save';

class MemoryStorage implements KeyValueStorage {
  data = new Map<string, string>();
  getItem(k: string) {
    return this.data.get(k) ?? null;
  }
  setItem(k: string, v: string) {
    this.data.set(k, v);
  }
}

describe('save data', () => {
  it('returns defaults for garbage', () => {
    expect(sanitize(null)).toEqual(defaultSave());
    expect(sanitize('nope')).toEqual(defaultSave());
    expect(sanitize({ gold: 'lots', unlockedMaps: 99, shop: { maxhp: 42 } })).toMatchObject({
      gold: 0,
      unlockedMaps: 3,
      shop: { maxhp: 5 },
    });
  });

  it('round-trips through storage', () => {
    const storage = new MemoryStorage();
    const a = new SaveStore(storage);
    a.data.gold = 123;
    a.data.shop.might = 2;
    a.data.bestTimes[0] = 301.5;
    a.save();
    const b = new SaveStore(storage);
    expect(b.data.gold).toBe(123);
    expect(b.data.shop.might).toBe(2);
    expect(b.data.bestTimes[0]).toBe(301.5);
  });

  it('keeps screen shake on unless it was turned off (older saves have no setting)', () => {
    expect(sanitize({ settings: { music: false } }).settings).toEqual({ music: false, sfx: true, shake: true });
    expect(sanitize({ settings: { shake: false } }).settings.shake).toBe(false);
  });

  it('survives corrupt JSON and missing storage', () => {
    const storage = new MemoryStorage();
    storage.setItem('little-archer-save-v1', '{broken');
    expect(new SaveStore(storage).data).toEqual(defaultSave());
    const none = new SaveStore(null);
    none.data.gold = 5;
    expect(() => none.save()).not.toThrow();
  });
});
