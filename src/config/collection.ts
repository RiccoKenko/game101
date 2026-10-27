import { formatTime } from '../core/format';
import { BOSSES, ENEMIES, type BossId, type EnemyId } from './enemies';
import { type PassiveId, type RuneId, type WeaponId } from './weapons';

/** Anything the Collection keeps a kill count of: monsters, leaders and bosses. */
export type MonsterId = EnemyId | BossId;

/** Lifetime numbers a goal can ask for, besides kills of one kind of monster. */
export type GoalStat = 'level' | 'time' | 'chests' | 'elites' | 'evolutions' | 'shrines' | 'deaths';

export type Goal = { monster: MonsterId; n: number } | { stat: GoalStat; n: number };

export type UnlockDef =
  | { kind: 'weapon'; id: WeaponId; goal: Goal }
  | { kind: 'passive'; id: PassiveId; goal: Goal }
  | { kind: 'rune'; id: RuneId; goal: Goal };

/**
 * Skills, items and cards (runes in the code) that start locked, and what opens each one, in about the order a new
 * player gets them. Everything else is open from the first run: each class starts with four of its seven skills and
 * opens the other three across the maps. The first unlocks come from Greenhill Fields within a run or two; then each
 * map has its own, so reaching a new map opens a new batch to chase.
 */
export const UNLOCKS: UnlockDef[] = [
  // Greenhill Fields: one skill for each class, and the first items and cards.
  { kind: 'passive', id: 'clover', goal: { monster: 'slime', n: 400 } },
  { kind: 'passive', id: 'cap', goal: { stat: 'level', n: 15 } },
  { kind: 'weapon', id: 'shuriken', goal: { monster: 'bat', n: 800 } },
  { kind: 'weapon', id: 'spear', goal: { monster: 'mushroom', n: 600 } },
  { kind: 'rune', id: 'split', goal: { monster: 'puff', n: 300 } },
  { kind: 'weapon', id: 'beam', goal: { stat: 'chests', n: 5 } },
  // Falling in battle opens the defensive items: a struggling player gets help soonest.
  { kind: 'passive', id: 'spring', goal: { stat: 'deaths', n: 1 } },
  { kind: 'passive', id: 'shield', goal: { stat: 'deaths', n: 3 } },
  { kind: 'passive', id: 'feather', goal: { stat: 'deaths', n: 5 } },
  { kind: 'passive', id: 'charm', goal: { stat: 'shrines', n: 3 } },
  { kind: 'weapon', id: 'twister', goal: { monster: 'bee', n: 200 } },
  { kind: 'rune', id: 'homing', goal: { monster: 'goblin', n: 2 } },
  { kind: 'rune', id: 'giant', goal: { monster: 'boss_slime', n: 1 } },
  { kind: 'rune', id: 'echo', goal: { stat: 'evolutions', n: 3 } },
  // Lantern Pines
  { kind: 'weapon', id: 'axes', goal: { monster: 'skeleton', n: 1000 } },
  { kind: 'weapon', id: 'traps', goal: { monster: 'ghost', n: 1200 } },
  { kind: 'passive', id: 'ring', goal: { monster: 'zombie', n: 1000 } },
  { kind: 'weapon', id: 'firetrail', goal: { monster: 'pumpkin', n: 200 } },
  { kind: 'weapon', id: 'wisps', goal: { monster: 'wraith', n: 150 } },
  { kind: 'rune', id: 'reaper', goal: { monster: 'boss_lich', n: 1 } },
  // Sunscar Desert
  { kind: 'rune', id: 'nova', goal: { monster: 'imp', n: 1000 } },
  { kind: 'weapon', id: 'ward', goal: { monster: 'knight', n: 800 } },
  { kind: 'passive', id: 'thorns', goal: { monster: 'gargoyle', n: 800 } },
];

/** The same key a level-up card has ('weapon:shuriken'), so locked items can simply be left out of the deal. */
export const unlockKey = (u: { kind: string; id: string }): string => `${u.kind}:${u.id}`;
export const UNLOCK_KEYS = UNLOCKS.map(unlockKey);

/** The bestiary, map by map: the regular monsters, then the extras and swarm, the leader and the boss. */
export const BESTIARY: { map: number | null; ids: MonsterId[] }[] = [
  { map: 0, ids: ['slime', 'bat', 'mushroom', 'puff', 'bee', 'boss_boar', 'boss_slime'] },
  { map: 1, ids: ['skeleton', 'ghost', 'zombie', 'pumpkin', 'wraith', 'boss_captain', 'boss_lich'] },
  { map: 2, ids: ['imp', 'knight', 'gargoyle', 'mimic', 'wisp', 'boss_ogre', 'boss_demon'] },
  { map: null, ids: ['goblin'] },
];

export const isBoss = (id: MonsterId): id is BossId => id in BOSSES;
export const monsterName = (id: MonsterId): string => (isBoss(id) ? BOSSES[id].name : ENEMIES[id].name);
/** Texture of the monster's picture (the first frame of a regular monster). */
export const monsterTexture = (id: MonsterId): string => (isBoss(id) ? BOSSES[id].texture : `${ENEMIES[id].texture}_0`);

const count = (n: number) => n.toLocaleString('en-US');
/** "Gummies", "Greyfangs". */
const plural = (name: string) => (/[^aeiou]y$/.test(name) ? `${name.slice(0, -1)}ies` : `${name}s`);

export function describeGoal(g: Goal): string {
  if ('monster' in g) {
    const name = monsterName(g.monster);
    if (g.monster === 'goblin') return g.n === 1 ? 'Catch a Coin Thief' : `Catch ${g.n} Coin Thieves`;
    if (isBoss(g.monster)) return g.n === 1 ? `Defeat the ${name}` : `Defeat the ${name} ${g.n} times`;
    return `Defeat ${count(g.n)} ${plural(name)}`;
  }
  switch (g.stat) {
    case 'level':
      return `Reach level ${g.n} in one run`;
    case 'time':
      return `Survive ${formatTime(g.n)} in one run`;
    case 'chests':
      return `Open ${g.n} chests`;
    case 'elites':
      return `Defeat ${g.n} elite monsters`;
    case 'evolutions':
      return `Evolve skills ${g.n} times`;
    case 'shrines':
      return `Accept ${g.n} shrine offers`;
    case 'deaths':
      return `Fall in battle ${g.n} times`;
  }
}
