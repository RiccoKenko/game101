import Phaser from 'phaser';
import { audio } from '../audio/audio';
import {
  EVENTS,
  EVENT_FIRST,
  EVENT_GAP,
  EVENT_LAST,
  EVENT_QUIET,
  GOLDEN_HOUR,
  METEOR_SHOWER,
  SHRINE_LIFE,
  type EventId,
} from '../config/events';
import { BOSS_INTERVAL } from '../config/game';
import { MAPS } from '../config/maps';
import { weightedPick } from '../core/rng';
import { type GameCtx } from './context';
import { type Enemy } from './Enemies';

/** A countdown shown in the HUD while an event lasts. */
export interface EventTimer {
  label: string;
  until: number;
  color: string;
}

/** What the run events need from the game scene. */
export interface EventHost {
  ctx: GameCtx;
  toast(msg: string): void;
  /** The hero walked into a shrine. */
  openShrine(): void;
  /** Every monster of an elite pack is down. */
  packDefeated(x: number, y: number): void;
  /** The treasure goblin was caught. */
  goblinCaught(x: number, y: number): void;
}

/**
 * Picks a random event every minute or so (never two of a kind in a row, never next to a boss) and runs it:
 * places the shrine, sends the goblin, rains meteors, calls an elite pack, starts a golden hour.
 */
export class RunEvents {
  readonly timers: EventTimer[] = [];
  /** Coins are worth more and drop more often until this time (a golden hour). */
  goldenUntil = -1;
  private next = EVENT_FIRST;
  private last: EventId | null = null;
  private shrine: Phaser.GameObjects.Container | null = null;
  private shrineLeft = 0;
  private meteorsLeft = 0;
  private meteorTimer = 0;
  private pack = new Set<number>();
  private goblin: Enemy | null = null;

  constructor(private host: EventHost) {
    host.ctx.enemies.onEscape = (e) => {
      if (e === this.goblin) {
        this.goblin = null;
        this.host.toast('The goblin got away!');
      }
    };
  }

  /** Starts an event at once (testing: `?event=shrine`). */
  force(id: EventId): void {
    this.forced = id;
    this.next = this.host.ctx.runTime + 2;
  }

  private forced: EventId | null = null;

  get golden(): boolean {
    return this.host.ctx.runTime < this.goldenUntil;
  }

  update(dt: number): void {
    const ctx = this.host.ctx;
    const t = ctx.runTime;
    for (let i = this.timers.length - 1; i >= 0; i--) if (t >= this.timers[i].until) this.timers.splice(i, 1);
    if (t >= this.next) this.trigger(t);
    this.updateShrine(dt);
    this.updateMeteors(dt);
  }

  /** Called for every defeated monster: tracks the elite pack and the goblin. */
  onKilled(e: Enemy): void {
    if (this.pack.delete(e.uid) && this.pack.size === 0) this.host.packDefeated(e.x, e.y);
    if (e === this.goblin) {
      this.goblin = null;
      this.host.goblinCaught(e.x, e.y);
    }
  }

  /** An elite pack (an event, or a Pact of Trials). */
  spawnPack(): void {
    const { enemies, player, rng, mapIndex } = this.host.ctx;
    const ids = MAPS[mapIndex].enemies;
    const n = 5;
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + rng();
      const e = enemies.spawn(ids[1 + (i % 2)], player.x + Math.cos(a) * 620, player.y + Math.sin(a) * 620, true);
      if (e) this.pack.add(e.uid);
    }
  }

  private trigger(t: number): void {
    const [lo, hi] = EVENT_GAP;
    const rng = this.host.ctx.rng;
    // Keep clear of bosses (every 5:00) and leaders (2:30 after them).
    const phase = t % (BOSS_INTERVAL / 2);
    if (!this.forced && (t > EVENT_LAST || phase > BOSS_INTERVAL / 2 - EVENT_QUIET || phase < EVENT_QUIET)) {
      this.next = t + 10;
      return;
    }
    this.next = t + lo + rng() * (hi - lo);
    const pool = EVENTS.filter((e) => t >= e.from && e.id !== this.last && !(e.id === 'shrine' && this.shrine) && !(e.id === 'goblin' && this.goblin));
    if (!pool.length) return;
    const ev = EVENTS.find((e) => e.id === this.forced) ?? weightedPick(rng, pool.map((e) => ({ item: e, weight: e.weight })));
    this.forced = null;
    this.last = ev.id;
    this.host.toast(ev.toast);
    audio.sfx('boss_warning');
    switch (ev.id) {
      case 'shrine':
        this.placeShrine();
        break;
      case 'goblin':
        this.sendGoblin();
        break;
      case 'meteors':
        this.meteorsLeft = METEOR_SHOWER.seconds;
        this.meteorTimer = 0.5;
        this.timers.push({ label: 'Meteor shower', until: t + METEOR_SHOWER.seconds, color: '#ff9a6a' });
        break;
      case 'elites':
        this.spawnPack();
        break;
      case 'golden':
        this.goldenUntil = t + GOLDEN_HOUR.seconds;
        this.timers.push({ label: 'Golden hour', until: this.goldenUntil, color: '#ffd66b' });
        break;
    }
  }

  // ------------------------------------------------------------ shrine

  private placeShrine(): void {
    const { scene, player, rng } = this.host.ctx;
    const a = rng() * Math.PI * 2;
    const x = player.x + Math.cos(a) * 380;
    const y = player.y + Math.sin(a) * 300;
    const glow = scene.add.image(0, 0, 'glow').setTint(0x8fd8ff).setAlpha(0.5).setDisplaySize(260, 160).setY(20);
    const img = scene.add.image(0, 0, 'shrine').setOrigin(0.5, 0.8);
    img.setScale(150 / Math.max(img.width, img.height));
    this.shrine = scene.add.container(x, y, [glow, img]).setDepth(9);
    scene.tweens.add({ targets: glow, alpha: { from: 0.3, to: 0.7 }, duration: 700, yoyo: true, repeat: -1 });
    scene.tweens.add({ targets: img, y: -8, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.host.ctx.fx.ring(x, y, 160, 0x8fd8ff);
    this.shrineLeft = SHRINE_LIFE;
  }

  private updateShrine(dt: number): void {
    const s = this.shrine;
    if (!s) return;
    this.shrineLeft -= dt;
    const { player } = this.host.ctx;
    if (Math.hypot(player.x - s.x, player.y - s.y) < 80) {
      this.removeShrine();
      this.host.openShrine();
      return;
    }
    if (this.shrineLeft < 3) s.setAlpha(Math.max(0, this.shrineLeft / 3));
    if (this.shrineLeft <= 0) this.removeShrine();
  }

  private removeShrine(): void {
    this.shrine?.destroy();
    this.shrine = null;
  }

  // ------------------------------------------------------------ goblin

  private sendGoblin(): void {
    const { enemies, spawnPoint } = this.host.ctx;
    const p = spawnPoint();
    this.goblin = enemies.spawn('goblin', p.x, p.y);
    if (this.goblin) this.timers.push({ label: 'Goblin escapes', until: this.host.ctx.runTime + 16, color: '#c8f08a' });
  }

  /** The goblin while it is around (the HUD points an arrow at it). */
  get goblinTarget(): Enemy | null {
    return this.goblin && this.goblin.active ? this.goblin : null;
  }

  // ------------------------------------------------------------ meteors

  private updateMeteors(dt: number): void {
    if (this.meteorsLeft <= 0) return;
    this.meteorsLeft -= dt;
    this.meteorTimer -= dt;
    if (this.meteorTimer > 0) return;
    this.meteorTimer = METEOR_SHOWER.every;
    const { player, rng } = this.host.ctx;
    // Every third meteor aims right at the hero; the rest land around.
    const aimed = rng() < 0.34;
    const a = rng() * Math.PI * 2;
    const r = aimed ? 0 : 120 + rng() * 420;
    this.meteor(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r);
  }

  private meteor(x: number, y: number): void {
    const { scene, fx, enemies } = this.host.ctx;
    const R = METEOR_SHOWER.radius;
    const T = METEOR_SHOWER.telegraph;
    fx.decal('shock', x, y, R * 2, R, 0xff3a2a, 0.6, T + 0.05);
    const rock = scene.add.image(x + 300, y - 650, 'meteor').setDepth(40).setScale(1.2);
    rock.setRotation(Math.atan2(650, -300));
    scene.tweens.add({
      targets: rock,
      x,
      y,
      duration: T * 1000,
      ease: 'Quad.easeIn',
      onComplete: () => {
        rock.destroy();
        fx.explosion(x, y, R);
        this.host.ctx.shake(120, 0.005);
        audio.sfx('explosion');
        const { player } = this.host.ctx;
        if (Math.hypot(player.x - x, player.y - y) < R + player.radius) this.host.ctx.hurtPlayer(METEOR_SHOWER.damage * this.host.ctx.monsterDamage);
        enemies.forEachInRadius(x, y, R, (e) => enemies.damage(e, METEOR_SHOWER.monsterDamage, x, y, 1.2, false));
      },
    });
  }

  destroy(): void {
    this.removeShrine();
  }
}
