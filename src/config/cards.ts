import { type EnemyId } from './enemies';
import { type RuneId } from './weapons';

/**
 * Monster cards for gear, the classic way: a monster very rarely drops its card, and a card slotted into a piece
 * of worn gear gives its power from the first second of every run. Each card is the same power as the level-up
 * card with its name (Gummy Card heals on defeats, and so on), at level 1, and two of the same card make level 2.
 * Cards in gear don't take the run's own card places, so they add to a build instead of filling it.
 */

/** Which monster drops which card. */
export const CARD_OF: Partial<Record<EnemyId, RuneId>> = {
  slime: 'leech',
  bat: 'ricochet',
  mushroom: 'giant',
  puff: 'split',
  bee: 'homing',
  ghost: 'echo',
  zombie: 'freeze',
  pumpkin: 'blast',
  wraith: 'chain',
  imp: 'burn',
  gargoyle: 'reaper',
  wisp: 'nova',
};

/**
 * Drop chance per defeat: a card is a rare find (roughly one card every two or three runs, a particular card
 * every ten or so). Elites drop theirs far more often; deeper tiers add `tierBonus` of the chance per tier.
 */
export const CARD_DROP = { normal: 1 / 40000, elite: 1 / 800, tierBonus: 0.2 };

/** Card slots on an item: Rare and Epic have one, Legendary and Mythic two. */
export const cardSlots = (rarity: number): number => (rarity >= 4 ? 2 : rarity >= 2 ? 1 : 0);

/** Two of the same card in worn gear make level 2, three level 3 (the most a card goes). */
export const CARD_MAX_LEVEL = 3;
