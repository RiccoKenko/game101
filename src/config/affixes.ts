/**
 * Elite monsters carry powers ("affixes") that change how they fight. Each shows as a coloured glow under the
 * monster and its name over it, so the player can tell at a glance what is coming.
 */
export type AffixId = 'shielded' | 'swift' | 'vampiric' | 'volatile' | 'summoner' | 'blinker';

export interface AffixDef {
  id: AffixId;
  name: string;
  /** Glow under the monster, and its name's colour. */
  color: number;
  css: string;
}

export const AFFIXES: AffixDef[] = [
  { id: 'shielded', name: 'Shielded', color: 0x6ff3ff, css: '#8ff6ff' },
  { id: 'swift', name: 'Swift', color: 0xfff27a, css: '#fff27a' },
  { id: 'vampiric', name: 'Vampiric', color: 0xff4d6a, css: '#ff8a9c' },
  { id: 'volatile', name: 'Volatile', color: 0xff9a3d, css: '#ffb36b' },
  { id: 'summoner', name: 'Summoner', color: 0x9dff8a, css: '#b8ffa8' },
  { id: 'blinker', name: 'Blinker', color: 0xc9a8ff, css: '#d9c2ff' },
];

export const AFFIX_IDS = AFFIXES.map((a) => a.id);

export function affixDef(id: AffixId): AffixDef {
  return AFFIXES.find((a) => a.id === id)!;
}

export const AFFIX = {
  /** Shielded: a shield worth this share of max HP soaks up hits, and comes back after this long unhit. */
  shield: 0.6,
  shieldBack: 4,
  /** Swift: this much faster. */
  swift: 1.6,
  /** Vampiric: every second, it and the monsters near it heal this share of their max HP. */
  vampHeal: 0.04,
  vampRadius: 230,
  /** Volatile: bursts into this many shots when defeated. */
  volatileShots: 10,
  /** Summoner: calls this many of the map's weakest monster every so often. */
  summonEvery: 5.5,
  summonCount: 3,
  /** Blinker: every so often marks a spot next to the hero, then appears there. */
  blinkEvery: 4.5,
  blinkWarn: 0.7,
  blinkDistance: 170,
};

/** How many affixes an elite carries: one, two after 8:00, one more on Nightmare (and a curse can add one). */
export function affixCount(t: number, difficulty: number, extra = 0): number {
  return Math.min(3, 1 + (t >= 480 ? 1 : 0) + (difficulty >= 2 ? 1 : 0) + extra);
}
