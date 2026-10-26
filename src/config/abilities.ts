import { type CharacterId } from './characters';

/** The dash button: a quick burst out of trouble, untouchable on the way. */
export const DASH = {
  cooldown: 4,
  distance: 290,
  /** Seconds the dash takes (the Mage blinks there at once). */
  time: 0.16,
  iframes: 0.45,
};

/** The ultimate button: charged by defeating monsters, then a screen-wide attack in slow motion. */
export const ULT = {
  /** Energy needed: this much, plus this much per minute of the run (so it keeps a steady pace as crowds grow). */
  base: 60,
  perMinute: 12,
  /** Energy per regular monster, elite, and leader or boss. */
  kill: 1,
  elite: 4,
  boss: 25,
  slowScale: 0.35,
  slowTime: 0.9,
  iframes: 1.4,
  /** One hit is worth this much HP of a starting monster, grown like monster HP so it never falls behind. */
  hit: 45,
  /** Leaders and bosses on screen also lose this share of their max HP at once. */
  bossShare: 0.06,
};

export const ARROW_STORM = { time: 3, every: 0.12, arrows: 5 };
export const METEOR = { radius: 560, fall: 0.75, hits: 3, freeze: 2.5 };

export interface UltimateDef {
  name: string;
  icon: string;
  text: string;
}

export const ULTIMATES: Record<CharacterId, UltimateDef> = {
  archer: { name: 'Arrow Storm', icon: 'icon_arrowstorm', text: 'Arrows rain on the monsters on screen for 3 seconds' },
  mage: { name: 'Meteor', icon: 'icon_meteor', text: 'A huge meteor crashes down around you, freezing what survives' },
};

/** Energy one ultimate costs at time t (seconds). */
export function ultCost(t: number): number {
  return Math.round(ULT.base + ULT.perMinute * (t / 60));
}
