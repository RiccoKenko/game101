export type ShopId = 'maxhp' | 'might' | 'armor' | 'speed' | 'magnet' | 'greed' | 'growth' | 'revival';

export interface ShopDef {
  id: ShopId;
  name: string;
  icon: string;
  maxLevel: number;
  baseCost: number;
  /** Effect per level, e.g. 0.1 = +10% (armor and revival are flat). */
  perLevel: number;
  describe: (perLevel: number) => string;
}

const pct = (v: number) => `${Math.round(v * 100)}%`;

export const SHOP: ShopDef[] = [
  { id: 'maxhp', name: 'Vitality', icon: 'icon_heart', maxLevel: 5, baseCost: 50, perLevel: 0.1, describe: (v) => `Max HP +${pct(v)} per level` },
  { id: 'might', name: 'Might', icon: 'icon_might', maxLevel: 5, baseCost: 60, perLevel: 0.06, describe: (v) => `Damage +${pct(v)} per level` },
  { id: 'armor', name: 'Armor', icon: 'icon_armor', maxLevel: 3, baseCost: 80, perLevel: 1, describe: (v) => `Take ${v} less damage per hit, per level` },
  { id: 'speed', name: 'Swiftness', icon: 'icon_boots', maxLevel: 3, baseCost: 60, perLevel: 0.05, describe: (v) => `Move speed +${pct(v)} per level` },
  { id: 'magnet', name: 'Attraction', icon: 'icon_magnet', maxLevel: 3, baseCost: 40, perLevel: 0.2, describe: (v) => `Pickup range +${pct(v)} per level` },
  { id: 'greed', name: 'Greed', icon: 'icon_greed', maxLevel: 5, baseCost: 50, perLevel: 0.15, describe: (v) => `Gold gained +${pct(v)} per level` },
  { id: 'growth', name: 'Growth', icon: 'icon_growth', maxLevel: 5, baseCost: 60, perLevel: 0.06, describe: (v) => `XP gained +${pct(v)} per level` },
  { id: 'revival', name: 'Revival', icon: 'icon_revival', maxLevel: 1, baseCost: 400, perLevel: 1, describe: () => 'Come back to life once per run' },
];

export const SHOP_IDS = SHOP.map((d) => d.id);

export function shopDef(id: ShopId): ShopDef {
  return SHOP.find((d) => d.id === id)!;
}

/** Gold needed to buy the next level when the item is currently at `level`. */
export function shopCost(def: ShopDef, level: number): number {
  return Math.round((def.baseCost * (1 + level * 0.9)) / 5) * 5;
}
