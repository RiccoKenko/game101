import type Phaser from 'phaser';
import { type RuneId } from '../config/weapons';
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
  /** Rune levels the hero holds (they change what every weapon hit does). */
  runes: Partial<Record<RuneId, number>>;
  /** Seconds since the run started. */
  runTime: number;
  /** Multipliers on monster HP and damage (the difficulty, a Pact of Greed). */
  monsterHp(): number;
  monsterDamage: number;
  onEnemyKilled(e: Enemy): void;
  hurtPlayer(amount: number): void;
  /** A random point just outside the visible area, where enemies appear. */
  spawnPoint(): { x: number; y: number };
  view(): Phaser.Geom.Rectangle;
  /** Freezes the action for a moment so a big hit lands with weight. */
  hitStop(seconds: number): void;
  /** Camera shake (skipped when the player turned shaking off). */
  shake(ms: number, intensity: number): void;
  /** Runs the game at `scale` speed for `seconds` of real time. */
  slowMo(scale: number, seconds: number): void;
}
