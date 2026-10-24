import { type BossId, type EnemyId } from './enemies';

export interface MapDef {
  index: number;
  name: string;
  ground: string;
  decor: string[];
  music: string;
  /** [early, mid, late] enemy types. */
  enemies: [EnemyId, EnemyId, EnemyId];
  boss: BossId;
  /** A smaller boss that leads the monsters at 2:30, 7:30, 12:30... */
  leader: BossId;
  /** More monster types, joining the regular spawns from `from` seconds with this share of them. */
  extras: { id: EnemyId; from: number; weight: number; max?: number }[];
  /** A flock of fast flyers arriving together every `every` seconds from `from`. */
  swarm?: { id: EnemyId; from: number; every: number; size: number };
  /** Background tint used behind UI cards. */
  color: number;
}

export const MAPS: MapDef[] = [
  {
    index: 0,
    name: 'Sunny Meadow',
    ground: 'ground_meadow',
    decor: ['tree', 'bush', 'rock', 'flowers', 'flowers'],
    music: 'music_meadow',
    enemies: ['slime', 'bat', 'mushroom'],
    boss: 'boss_slime',
    leader: 'boss_boar',
    extras: [{ id: 'puff', from: 75, weight: 0.22 }],
    swarm: { id: 'bee', from: 40, every: 35, size: 6 },
    color: 0x5cb85c,
  },
  {
    index: 1,
    name: 'Spooky Graveyard',
    ground: 'ground_graveyard',
    decor: ['grave', 'grave_cross', 'dead_tree', 'bones', 'grave'],
    music: 'music_graveyard',
    enemies: ['skeleton', 'ghost', 'zombie'],
    boss: 'boss_lich',
    leader: 'boss_captain',
    extras: [
      { id: 'pumpkin', from: 60, weight: 0.2 },
      { id: 'wraith', from: 120, weight: 0.16 },
    ],
    color: 0x7a8a7a,
  },
  {
    index: 2,
    name: 'Dark Castle',
    ground: 'ground_castle',
    decor: ['pillar', 'pillar_broken', 'brazier', 'rubble', 'rubble'],
    music: 'music_castle',
    enemies: ['imp', 'knight', 'gargoyle'],
    boss: 'boss_demon',
    leader: 'boss_ogre',
    // Mimics wait in the world looking like treasure: a few at a time, never a crowd.
    extras: [{ id: 'mimic', from: 80, weight: 0.012, max: 2 }],
    swarm: { id: 'wisp', from: 50, every: 30, size: 6 },
    color: 0x6a5a8a,
  },
];
