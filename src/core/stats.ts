import { PLAYER_BASE } from '../config/game';
import { shopDef, type ShopId } from '../config/shop';
import { PASSIVES, type PassiveId } from '../config/weapons';

export interface PlayerStats {
  maxHp: number;
  speed: number;
  magnet: number;
  armor: number;
  damageMult: number;
  cooldownMult: number;
  areaMult: number;
  amountBonus: number;
  xpMult: number;
  goldMult: number;
  revivals: number;
  critChance: number;
}

export function computeStats(
  shop: Record<ShopId, number>,
  passives: Partial<Record<PassiveId, number>>,
): PlayerStats {
  const sh = (id: ShopId) => (shop[id] ?? 0) * shopDef(id).perLevel;
  const pa = (id: PassiveId) => (passives[id] ?? 0) * PASSIVES[id].perLevel;
  return {
    maxHp: Math.round(PLAYER_BASE.maxHp * (1 + sh('maxhp')) * (1 + pa('heart'))),
    speed: PLAYER_BASE.speed * (1 + sh('speed') + pa('boots')),
    magnet: PLAYER_BASE.magnet * (1 + sh('magnet') + pa('magnet')),
    armor: PLAYER_BASE.armor + sh('armor'),
    damageMult: 1 + sh('might') + pa('powergem'),
    cooldownMult: Math.max(0.4, 1 - pa('hourglass')),
    areaMult: 1 + pa('tome'),
    amountBonus: pa('quiver'),
    xpMult: 1 + sh('growth'),
    goldMult: 1 + sh('greed'),
    revivals: sh('revival'),
    critChance: PLAYER_BASE.critChance,
  };
}
