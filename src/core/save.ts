import { CHARACTER_IDS, type CharacterId } from '../config/characters';
import { maxDifficulty } from '../config/difficulty';
import { MAX_RELICS, RELIC_IDS, type RelicId } from '../config/relics';
import { MAPS } from '../config/maps';
import { ACHIEVEMENTS, DAILY_COUNT, QUESTS, type AchievementId, type QuestId } from '../config/quests';
import { SHOP, type ShopId } from '../config/shop';

export interface Settings {
  music: boolean;
  sfx: boolean;
  /** Screen shake on hits and explosions. */
  shake: boolean;
}

/** One of the day's quests, as rolled: target and reward are fixed when it is rolled. */
export interface DailyQuest {
  id: QuestId;
  /** The map it is tied to (only for per-map quests; 0 otherwise). */
  map: number;
  target: number;
  reward: number;
  progress: number;
  claimed: boolean;
}

export interface DailyState {
  /** Local date the quests were rolled for, YYYY-MM-DD ('' = never). */
  day: string;
  quests: DailyQuest[];
  /** Extra gold for finishing all of them. */
  bonus: number;
  bonusClaimed: boolean;
}

export interface LifetimeStats {
  runs: number;
  kills: number;
  eliteKills: number;
  chests: number;
  evolutions: number;
  /** All gold earned, end-of-run bonus included (quest rewards not). */
  gold: number;
  bestLevel: number;
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
  stats: LifetimeStats;
  daily: DailyState;
  /** Achievement tiers already claimed, per achievement. */
  achievements: Record<AchievementId, number>;
  /** Per map, the hardest difficulty cleared (0 = never cleared, 1 = Normal, 2 = Hard, 3 = Nightmare). */
  clears: number[];
  /** Per map, the difficulty picked in the menu (never above what `clears` opens). */
  difficulty: number[];
  /** Relics won, and the (up to two) worn into runs. */
  relics: RelicId[];
  equipped: RelicId[];
  /** The hero picked in the menu, and the heroes unlocked (the archer always is). */
  character: CharacterId;
  characters: CharacterId[];
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
    stats: { runs: 0, kills: 0, eliteKills: 0, chests: 0, evolutions: 0, gold: 0, bestLevel: 0 },
    daily: { day: '', quests: [], bonus: 0, bonusClaimed: false },
    achievements: Object.fromEntries(ACHIEVEMENTS.map((a) => [a.id, 0])) as Record<AchievementId, number>,
    clears: MAPS.map(() => 0),
    difficulty: MAPS.map(() => 0),
    relics: [],
    equipped: [],
    character: 'archer',
    characters: ['archer'],
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
  if (Array.isArray(r.clears)) out.clears = MAPS.map((_, i) => Math.floor(num((r.clears as unknown[])[i], 0, 0, 3)));
  if (Array.isArray(r.difficulty)) {
    out.difficulty = MAPS.map((_, i) => Math.floor(num((r.difficulty as unknown[])[i], 0, 0, maxDifficulty(out.clears[i]))));
  }
  if (Array.isArray(r.relics)) out.relics = RELIC_IDS.filter((id) => (r.relics as unknown[]).includes(id));
  if (Array.isArray(r.equipped)) out.equipped = (r.equipped as unknown[]).filter((id): id is RelicId => out.relics.includes(id as RelicId)).slice(0, MAX_RELICS);
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
    for (const key of Object.keys(out.stats) as (keyof LifetimeStats)[]) out.stats[key] = Math.floor(num(s[key], 0));
  }
  out.daily = sanitizeDaily(r.daily);
  if (r.achievements && typeof r.achievements === 'object') {
    const a = r.achievements as Record<string, unknown>;
    for (const def of ACHIEVEMENTS) out.achievements[def.id] = Math.floor(num(a[def.id], 0, 0, def.tiers.length));
  }
  if (Array.isArray(r.characters)) {
    out.characters = CHARACTER_IDS.filter((id) => id === 'archer' || (r.characters as unknown[]).includes(id));
  }
  if (out.characters.includes(r.character as CharacterId)) out.character = r.character as CharacterId;
  return out;
}

/** Keeps the day's quests if they are all well formed; otherwise they are rolled again (day ''). */
function sanitizeDaily(raw: unknown): DailyState {
  const empty: DailyState = { day: '', quests: [], bonus: 0, bonusClaimed: false };
  if (!raw || typeof raw !== 'object') return empty;
  const d = raw as Record<string, unknown>;
  if (typeof d.day !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d.day) || !Array.isArray(d.quests)) return empty;
  const quests: DailyQuest[] = [];
  for (const q of d.quests as unknown[]) {
    if (!q || typeof q !== 'object') return empty;
    const v = q as Record<string, unknown>;
    if (!QUESTS.some((def) => def.id === v.id)) return empty;
    quests.push({
      id: v.id as QuestId,
      map: Math.floor(num(v.map, 0, 0, MAPS.length - 1)),
      target: Math.floor(num(v.target, 1, 1)),
      reward: Math.floor(num(v.reward, 0, 0, 10_000)),
      progress: num(v.progress, 0),
      claimed: v.claimed === true,
    });
  }
  if (quests.length !== DAILY_COUNT) return empty;
  return { day: d.day, quests, bonus: Math.floor(num(d.bonus, 0, 0, 10_000)), bonusClaimed: d.bonusClaimed === true };
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
