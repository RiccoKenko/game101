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
 * Weapons, items and runes that start locked, and what opens each one, in about the order a new player gets them.
 * Everything else is open from the first run. The first ones come from the Meadow within a run or two; then each
 * map has its own, so reaching a new map opens a new batch to chase.
 */
export const UNLOCKS: UnlockDef[] = [
  // Sunny Meadow
  { kind: 'passive', id: 'clover', goal: { monster: 'slime', n: 400 } },
  { kind: 'passive', id: 'cap', goal: { stat: 'level', n: 15 } },
  { kind: 'weapon', id: 'shuriken', goal: { monster: 'bat', n: 800 } },
  { kind: 'weapon', id: 'flask', goal: { monster: 'mushroom', n: 600 } },
  { kind: 'rune', id: 'split', goal: { monster: 'puff', n: 300 } },
  { kind: 'weapon', id: 'beam', goal: { stat: 'chests', n: 5 } },
  { kind: 'passive', id: 'feather', goal: { stat: 'deaths', n: 5 } },
  { kind: 'passive', id: 'charm', goal: { stat: 'shrines', n: 3 } },
  { kind: 'weapon', id: 'twister', goal: { monster: 'bee', n: 200 } },
  { kind: 'rune', id: 'homing', goal: { monster: 'goblin', n: 2 } },
  { kind: 'weapon', id: 'turret', goal: { monster: 'boss_boar', n: 3 } },
  { kind: 'rune', id: 'giant', goal: { monster: 'boss_slime', n: 1 } },
  { kind: 'passive', id: 'spring', goal: { stat: 'time', n: 600 } },
  { kind: 'passive', id: 'ring', goal: { stat: 'elites', n: 60 } },
  { kind: 'rune', id: 'echo', goal: { stat: 'evolutions', n: 3 } },
  // Spooky Graveyard
  { kind: 'weapon', id: 'traps', goal: { monster: 'skeleton', n: 1000 } },
  { kind: 'weapon', id: 'wisps', goal: { monster: 'ghost', n: 1200 } },
  { kind: 'passive', id: 'mask', goal: { monster: 'zombie', n: 1000 } },
  { kind: 'weapon', id: 'firetrail', goal: { monster: 'pumpkin', n: 200 } },
  { kind: 'weapon', id: 'ward', goal: { monster: 'wraith', n: 150 } },
  { kind: 'rune', id: 'reaper', goal: { monster: 'boss_lich', n: 1 } },
  // Dark Castle
  { kind: 'rune', id: 'nova', goal: { monster: 'imp', n: 1000 } },
  { kind: 'weapon', id: 'spear', goal: { monster: 'knight', n: 800 } },
  { kind: 'passive', id: 'thorns', goal: { monster: 'gargoyle', n: 800 } },
  { kind: 'passive', id: 'shield', goal: { monster: 'mimic', n: 5 } },
  { kind: 'weapon', id: 'quake', goal: { monster: 'boss_demon', n: 1 } },
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

export function describeGoal(g: Goal): string {
  if ('monster' in g) {
    const name = monsterName(g.monster);
    if (g.monster === 'goblin') return g.n === 1 ? 'Catch a Treasure Goblin' : `Catch ${g.n} Treasure Goblins`;
    if (isBoss(g.monster)) return g.n === 1 ? `Defeat the ${name}` : `Defeat the ${name} ${g.n} times`;
    return `Defeat ${count(g.n)} ${name}s`;
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
      return `Evolve weapons ${g.n} times`;
    case 'shrines':
      return `Accept ${g.n} shrine offers`;
    case 'deaths':
      return `Fall in battle ${g.n} times`;
  }
}
