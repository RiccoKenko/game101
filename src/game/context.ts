import type Phaser from 'phaser';
import { type Rng } from '../core/rng';
import type { Effects } from './Effects';
import type { Enemy, EnemyManager } from './Enemies';
import type { PickupManager } from './Pickups';
import type { Player } from './Player';

/** What the gameplay systems need from the running GameScene. */
export interface GameCtx {
  scene: Phaser.Scene;
  player: Player;
  enemies: EnemyManager;
  pickups: PickupManager;
  fx: Effects;
  rng: Rng;
  mapIndex: number;
  /** Seconds since the run started. */
  runTime: number;
  onEnemyKilled(e: Enemy): void;
  hurtPlayer(amount: number): void;
  /** A random point just outside the visible area, where enemies appear. */
  spawnPoint(): { x: number; y: number };
  view(): Phaser.Geom.Rectangle;
}
