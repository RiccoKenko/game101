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
    color: 0x6a5a8a,
  },
];
