import Phaser from 'phaser';
import { MAX_GEMS, XP_GEM_TIERS } from '../config/game';
import { type GameCtx } from './context';

export type PickupKind = 'xp' | 'coin' | 'meat' | 'magnet' | 'chest';

export class Pickup {
  active = false;
  kind: PickupKind = 'xp';
  value = 0;
  x = 0;
  y = 0;
  pulled = false;
  speed = 0;
  age = 0;
  // Popping out of a defeated enemy: sliding along the ground (gx, gy) while bouncing up (h, vh).
  gx = 0;
  gy = 0;
  h = 0;
  vh = 0;
  bounces = 0;
  constructor(readonly sprite: Phaser.GameObjects.Image) {}
}

/** Glow colour when each kind is collected. */
const COLLECT_GLOW: Partial<Record<PickupKind, number>> = { xp: 0x7fd0ff, coin: 0xffd36b, meat: 0x7dff8a, magnet: 0xff7eb6 };

export interface PickupHandlers {
  onXp(value: number): void;
  onCoin(value: number): void;
  onMeat(): void;
  onMagnet(): void;
  onChest(): void;
}

function gemTexture(value: number): string {
  let key: string = XP_GEM_TIERS[0].key;
  for (const t of XP_GEM_TIERS) if (value >= t.min) key = t.key;
  return key;
}

export class PickupManager {
  private list: Pickup[] = [];
  private gems = 0;
  private glowBudget = 0;
  /** Light rays turning behind a boss chest. */
  private rays: Phaser.GameObjects.Image;

  constructor(private ctx: GameCtx, private handlers: PickupHandlers) {
    this.rays = ctx.scene.add.image(0, 0, 'rays').setDepth(5).setTint(0xffe08a).setAlpha(0.7).setVisible(false).setBlendMode(Phaser.BlendModes.ADD);
  }

  /** Sends a fresh pickup flying a little way out from where it dropped. */
  private pop(p: Pickup, spread: number, height: number): void {
    const a = Math.random() * Math.PI * 2;
    const v = spread * (0.4 + Math.random() * 0.6);
    p.gx = Math.cos(a) * v;
    p.gy = Math.sin(a) * v * 0.6;
    p.h = 0;
    p.vh = height * (0.8 + Math.random() * 0.4);
    p.bounces = 0;
  }

  private obtain(kind: PickupKind, x: number, y: number, texture: string): Pickup {
    let p = this.list.find((o) => !o.active);
    if (!p) {
      p = new Pickup(this.ctx.scene.add.image(0, 0, texture));
      this.list.push(p);
    }
    p.active = true;
    p.kind = kind;
    p.x = x;
    p.y = y;
    p.pulled = false;
    p.speed = 0;
    p.age = 0;
    p.gx = p.gy = p.h = p.vh = 0;
    p.sprite.setTexture(texture).setVisible(true).setPosition(x, y).setScale(1).setDepth(kind === 'chest' ? 6 : 5);
    return p;
  }

  dropXp(x: number, y: number, value: number): void {
    if (this.gems >= MAX_GEMS) {
      // Too many gems lying around: fold the XP into the closest existing one.
      let target: Pickup | null = null;
      let best = Infinity;
      for (const p of this.list) {
        if (!p.active || p.kind !== 'xp' || p.pulled) continue;
        const d = (p.x - x) ** 2 + (p.y - y) ** 2;
        if (d < best) {
          best = d;
          target = p;
        }
      }
      if (target) {
        target.value += value;
        target.sprite.setTexture(gemTexture(target.value));
        return;
      }
    }
    const p = this.obtain('xp', x, y, gemTexture(value));
    p.value = value;
    this.pop(p, 150, 420);
    this.gems++;
  }

  drop(kind: Exclude<PickupKind, 'xp'>, x: number, y: number, value = 0): void {
    const tex = kind === 'chest' ? 'chest' : kind;
    const p = this.obtain(kind, x, y, tex);
    p.value = value;
    if (kind === 'chest') {
      p.sprite.setScale(0.2);
      this.ctx.scene.tweens.add({ targets: p.sprite, scale: 1.15, duration: 500, ease: 'Back.easeOut' });
      this.rays.setPosition(x, y).setScale(0.2).setVisible(true);
      this.ctx.scene.tweens.add({ targets: this.rays, scale: 1.3, duration: 600, ease: 'Back.easeOut' });
    } else {
      this.pop(p, kind === 'coin' ? 220 : 120, kind === 'coin' ? 560 : 460);
    }
  }

  /** Scatter coins around a point (boss loot). */
  burstCoins(x: number, y: number, count: number, value: number): void {
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      const r = 60 + this.ctx.rng() * 120;
      this.drop('coin', x + Math.cos(a) * r, y + Math.sin(a) * r, value);
    }
  }

  magnetizeAllXp(): void {
    for (const p of this.list) if (p.active && p.kind === 'xp') p.pulled = true;
  }

  clear(): void {
    for (const p of this.list) {
      p.active = false;
      p.sprite.setVisible(false);
    }
    this.rays.setVisible(false);
    this.gems = 0;
  }

  /** Nearest gem/coin to a point (used by the test autopilot). */
  nearestLoot(x: number, y: number, maxDist: number): Pickup | null {
    let best: Pickup | null = null;
    let bestD = maxDist * maxDist;
    for (const p of this.list) {
      if (!p.active || p.kind === 'chest') continue;
      const d = (p.x - x) ** 2 + (p.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = p;
      }
    }
    return best;
  }

  get chestOnGround(): Pickup | null {
    return this.list.find((p) => p.active && p.kind === 'chest') ?? null;
  }

  update(dt: number, magnetRadius: number): void {
    const { player } = this.ctx;
    const grab = player.radius + 26;
    const mr2 = magnetRadius * magnetRadius;
    this.glowBudget = 2;
    if (this.rays.visible) this.rays.rotation += dt * 0.6;
    for (const p of this.list) {
      if (!p.active) continue;
      p.age += dt;
      if (p.vh !== 0 || p.h > 0) {
        // Still flying out: slide, fall, bounce once, settle.
        const damp = Math.exp(-3 * dt);
        p.x += p.gx * dt;
        p.y += p.gy * dt;
        p.gx *= damp;
        p.gy *= damp;
        p.vh -= 1900 * dt;
        p.h += p.vh * dt;
        if (p.h <= 0) {
          p.h = 0;
          if (p.bounces === 0 && p.vh < -250) {
            p.vh = -p.vh * 0.35;
            p.bounces = 1;
          } else {
            p.vh = 0;
          }
        }
      }
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (!p.pulled && p.kind !== 'chest' && d2 < mr2) p.pulled = true;
      if (!p.pulled && p.kind === 'xp' && p.age > 6) {
        // Old gems slowly drift toward the hero so XP isn't lost far behind.
        const d = Math.sqrt(d2) || 1;
        const drift = Math.min(160, (p.age - 6) * 30) * dt;
        p.x += (dx / d) * drift;
        p.y += (dy / d) * drift;
      }
      if (p.pulled) {
        const d = Math.sqrt(d2) || 1;
        p.h = Math.max(0, p.h - 600 * dt);
        p.vh = 0;
        p.speed = Math.min(1700, p.speed + 2600 * dt);
        const step = Math.min(d, p.speed * dt);
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
      if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 < grab * grab) {
        this.collect(p);
        continue;
      }
      const bob = p.kind === 'xp' || p.h > 0 ? 0 : Math.sin(p.age * 5) * 4;
      p.sprite.setPosition(p.x, p.y + bob - p.h);
      if (p.kind === 'coin') p.sprite.setScale(0.3 + 0.7 * Math.abs(Math.cos(p.age * 4)), 1);
      else if (p.kind === 'xp') {
        p.sprite.setScale(p.pulled ? 1.15 : 1);
        // Big gems glint now and then.
        if (p.value >= 15 && Math.random() < dt * 0.9) this.ctx.fx.sparkle(p.x + 8, p.y - 12 - p.h, 1, 0xbfe6ff);
      }
    }
  }

  private collect(p: Pickup): void {
    p.active = false;
    p.sprite.setVisible(false);
    const color = COLLECT_GLOW[p.kind];
    if (color !== undefined && this.glowBudget > 0) {
      this.glowBudget--;
      const { player } = this.ctx;
      this.ctx.fx.glow(player.x, player.y - 10, 30, 110, color, 0.16, 0.6);
    }
    if (p.kind === 'chest') this.rays.setVisible(false);
    switch (p.kind) {
      case 'xp':
        this.gems--;
        this.handlers.onXp(p.value);
        break;
      case 'coin':
        this.handlers.onCoin(p.value);
        break;
      case 'meat':
        this.handlers.onMeat();
        break;
      case 'magnet':
        this.handlers.onMagnet();
        break;
      case 'chest':
        this.handlers.onChest();
        break;
    }
  }
}
