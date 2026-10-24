import { MAPS } from '../config/maps';
import { SHOP, type ShopId } from '../config/shop';

export interface Settings {
  music: boolean;
  sfx: boolean;
  /** Screen shake on hits and explosions. */
  shake: boolean;
}

export interface SaveData {
  version: 1;
  gold: number;
  shop: Record<ShopId, number>;
  /** Number of maps the player can pick (1..MAPS.length). */
  unlockedMaps: number;
  /** Best survival time in seconds, per map. */
  bestTimes: number[];
  bossKills: number[];
  settings: Settings;
  stats: { runs: number; kills: number };
}

export interface KeyValueStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

const KEY = 'little-archer-save-v1';

export function defaultSave(): SaveData {
  const shop = {} as Record<ShopId, number>;
  for (const d of SHOP) shop[d.id] = 0;
  return {
    version: 1,
    gold: 0,
    shop,
    unlockedMaps: 1,
    bestTimes: MAPS.map(() => 0),
    bossKills: MAPS.map(() => 0),
    settings: { music: true, sfx: true, shake: true },
    stats: { runs: 0, kills: 0 },
  };
}

const num = (v: unknown, fallback: number, min = 0, max = Number.MAX_SAFE_INTEGER): number =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, v)) : fallback;

/** Accepts anything (corrupt JSON, old versions, hand-edited data) and returns a valid SaveData. */
export function sanitize(raw: unknown): SaveData {
  const out = defaultSave();
  if (!raw || typeof raw !== 'object') return out;
  const r = raw as Partial<Record<keyof SaveData, unknown>>;
  out.gold = Math.floor(num(r.gold, 0));
  if (r.shop && typeof r.shop === 'object') {
    const shop = r.shop as Record<string, unknown>;
    for (const d of SHOP) out.shop[d.id] = Math.floor(num(shop[d.id], 0, 0, d.maxLevel));
  }
  out.unlockedMaps = Math.floor(num(r.unlockedMaps, 1, 1, MAPS.length));
  for (const key of ['bestTimes', 'bossKills'] as const) {
    const arr = r[key];
    if (Array.isArray(arr)) out[key] = MAPS.map((_, i) => num(arr[i], 0));
  }
  if (r.settings && typeof r.settings === 'object') {
    const s = r.settings as Record<string, unknown>;
    out.settings.music = s.music !== false;
    out.settings.sfx = s.sfx !== false;
    out.settings.shake = s.shake !== false;
  }
  if (r.stats && typeof r.stats === 'object') {
    const s = r.stats as Record<string, unknown>;
    out.stats.runs = Math.floor(num(s.runs, 0));
    out.stats.kills = Math.floor(num(s.kills, 0));
  }
  return out;
}

function browserStorage(): KeyValueStorage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export class SaveStore {
  data: SaveData;

  constructor(private storage: KeyValueStorage | null = browserStorage()) {
    this.data = this.load();
  }

  load(): SaveData {
    try {
      const text = this.storage?.getItem(KEY);
      return text ? sanitize(JSON.parse(text)) : defaultSave();
    } catch {
      return defaultSave();
    }
  }

  save(): void {
    try {
      this.storage?.setItem(KEY, JSON.stringify(this.data));
    } catch {
      // Private mode / storage full: progress just isn't persisted.
    }
  }

  reset(): void {
    this.data = defaultSave();
    this.save();
  }
}

export const saveStore = new SaveStore();
