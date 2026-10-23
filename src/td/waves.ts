/**
 * The wave schedule. The first wave waits for the player. After a wave has fully arrived, the next one
 * starts after a rest; calling it early pays a gold bonus for the time skipped.
 */
import type { EnemyKind } from './units';

export interface SpawnGroup {
  enemy: EnemyKind;
  count: number;
  /** Seconds between two pirates of this group. */
  gap: number;
  /** Seconds after the wave starts before this group's first pirate. */
  delay?: number;
}

export interface WaveDef {
  groups: SpawnGroup[];
  /** Seconds of rest after this wave has fully arrived. */
  rest?: number;
}

export class WaveRunner {
  /** The wave now arriving or last arrived; -1 before the first. */
  wave = -1;
  /** Seconds until the next wave starts on its own; Infinity while the game waits for the player. */
  countdown = Infinity;
  private queue: { at: number; enemy: EnemyKind }[] = [];
  private clock = 0;

  constructor(readonly waves: WaveDef[], readonly bonusPerSecond = 1, readonly defaultRest = 14) {}

  /** Pirates of the current wave still to arrive. */
  get pending(): number {
    return this.queue.length;
  }

  /** Every wave has fully arrived. */
  get finished(): boolean {
    return this.wave === this.waves.length - 1 && this.queue.length === 0;
  }

  /** The next wave can be called now (between waves, or before the first). */
  get canCall(): boolean {
    return this.wave < this.waves.length - 1 && this.queue.length === 0;
  }

  /** Starts the next wave now. Returns the bonus gold for the rest skipped (none for the first wave). */
  callNext(): number {
    if (!this.canCall) return 0;
    const bonus = Number.isFinite(this.countdown) ? Math.round(this.countdown * this.bonusPerSecond) : 0;
    this.start();
    return bonus;
  }

  private start(): void {
    this.wave++;
    this.countdown = Infinity;
    for (const g of this.waves[this.wave].groups)
      for (let i = 0; i < g.count; i++) this.queue.push({ at: this.clock + (g.delay ?? 0) + i * g.gap, enemy: g.enemy });
    this.queue.sort((a, b) => a.at - b.at);
  }

  /** Advances time; returns the pirates that arrive in this step, in order. */
  update(dt: number): EnemyKind[] {
    this.clock += dt;
    if (this.queue.length === 0 && Number.isFinite(this.countdown)) {
      this.countdown -= dt;
      if (this.countdown <= 0) this.start();
    }
    const out: EnemyKind[] = [];
    while (this.queue.length && this.queue[0].at <= this.clock) out.push(this.queue.shift()!.enemy);
    if (out.length && this.queue.length === 0 && this.wave < this.waves.length - 1)
      this.countdown = this.waves[this.wave].rest ?? this.defaultRest;
    return out;
  }
}
