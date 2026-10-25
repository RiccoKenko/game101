import { type CharacterDef } from '../config/characters';
import { PLAYER_BASE } from '../config/game';
import { shopDef, type ShopId } from '../config/shop';
import { TALENT, type TalentId } from '../config/talents';
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
  /** How much more a critical hit deals. */
  critMult: number;
  /** Share of max HP recovered every second (Life Spring). */
  regen: number;
  /** Multiplier on how long effects last: puddles, axe spins, whirlwinds, traps, burns, freezes (Moon Charm). */
  durationMult: number;
  /** Multiplier on all healing (a curse can lower it). */
  healMult: number;
  /** Run and Gun: attacks come this much faster while moving. */
  moveHaste: number;
  /** Mana Shield: seconds it takes to come back after blocking a hit (0 = no shield). */
  shieldTime: number;
  /** Extra enemies every projectile goes through, and extra shots from the hero's own weapon (talents). */
  pierceBonus: number;
  primaryAmount: number;
  /** Extra damage against elites, leaders and bosses. */
  bigGame: number;
  /** Extra damage while under half HP (Berserker Mask). */
  rage: number;
  /** Damage dealt to monsters that touch the hero (Thorn Mail). */
  thorns: number;
  /** Added chance for an attack to go off twice (on top of the Echo Rune). */
  echoBonus: number;
}

/** The chosen hero's multipliers (see config/characters.ts). */
export type CharacterMods = Pick<CharacterDef, 'maxHp' | 'area' | 'speed' | 'cooldown' | 'crit' | 'moveHaste' | 'shield'>;

const PLAIN_HERO: CharacterMods = { maxHp: 1, area: 1, speed: 1, cooldown: 1, crit: 0, moveHaste: 0, shield: 0 };

export function computeStats(
  shop: Record<ShopId, number>,
  passives: Partial<Record<PassiveId, number>>,
  hero: CharacterMods = PLAIN_HERO,
  talents: readonly TalentId[] = [],
): PlayerStats {
  const sh = (id: ShopId) => (shop[id] ?? 0) * shopDef(id).perLevel;
  const pa = (id: PassiveId) => (passives[id] ?? 0) * PASSIVES[id].perLevel;
  const has = (id: TalentId) => talents.includes(id);
  return {
    maxHp: Math.round(PLAYER_BASE.maxHp * hero.maxHp * (1 + sh('maxhp')) * (1 + pa('heart'))),
    speed: PLAYER_BASE.speed * hero.speed * (1 + sh('speed') + pa('boots') + (has('tailwind') ? TALENT.tailwindSpeed : 0)),
    magnet: PLAYER_BASE.magnet * (1 + sh('magnet') + pa('magnet')),
    armor: PLAYER_BASE.armor + sh('armor') + pa('shield'),
    damageMult: 1 + sh('might') + pa('powergem'),
    cooldownMult: Math.max(0.4, (1 - pa('hourglass')) * hero.cooldown * (has('surge') ? TALENT.surge : 1)),
    areaMult: hero.area * (1 + pa('tome')) * (has('grand') ? TALENT.grand : 1),
    amountBonus: pa('quiver'),
    xpMult: 1 + sh('growth') + pa('cap') + (has('wisdom') ? TALENT.wisdom : 0),
    goldMult: 1 + sh('greed'),
    revivals: sh('revival') + pa('feather'),
    critChance: PLAYER_BASE.critChance + hero.crit + pa('clover') + (has('eagle') ? TALENT.eagleCrit : 0),
    critMult: has('eagle') ? TALENT.eagleCritMult : PLAYER_BASE.critMult,
    regen: pa('spring'),
    durationMult: 1 + pa('charm'),
    healMult: 1,
    moveHaste: hero.moveHaste * (has('tailwind') ? 2 : 1),
    shieldTime: hero.shield > 0 ? (has('font') ? TALENT.fontShield : hero.shield) : 0,
    pierceBonus: has('piercing') ? TALENT.piercing : 0,
    primaryAmount: has('volley') ? TALENT.volleyArrows : 0,
    bigGame: pa('ring') + (has('mark') ? TALENT.mark : 0),
    rage: pa('mask'),
    thorns: pa('thorns'),
    echoBonus: has('arcecho') ? TALENT.arcaneEcho : 0,
  };
}
