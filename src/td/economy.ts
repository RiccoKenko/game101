/** Gold during a level: towers cost gold, pirates and early waves pay it, selling gives some back. */
import type { Branch, TowerDef } from './units';

/** Share of the gold spent on a tower that selling it returns. */
export const SELL_REFUND = 0.6;

export class Purse {
  constructor(public gold: number) {}

  canAfford(cost: number): boolean {
    return this.gold >= cost;
  }

  /** Pays `cost` if there is enough gold. */
  spend(cost: number): boolean {
    if (!this.canAfford(cost)) return false;
    this.gold -= cost;
    return true;
  }

  earn(amount: number): void {
    this.gold += amount;
  }
}

/** Gold to build the tower (level 0 → 1) or upgrade it from `level` up to level 3; null from level 3 (see `branchCost`). */
export function nextCost(def: TowerDef, level: number): number | null {
  return def.levels[level]?.cost ?? null;
}

/** Gold to specialise a level-3 tower. */
export function branchCost(def: TowerDef, branch: Branch): number {
  return def.branches[branch].level.cost;
}

/** Everything paid for a tower at `level` (and its specialisation, if any). */
export function spentOn(def: TowerDef, level: number, branch: Branch | null = null): number {
  const levels = def.levels.slice(0, level).reduce((sum, l) => sum + l.cost, 0);
  return levels + (branch !== null ? branchCost(def, branch) : 0);
}

export function sellValue(def: TowerDef, level: number, branch: Branch | null = null): number {
  return Math.floor(spentOn(def, level, branch) * SELL_REFUND);
}
