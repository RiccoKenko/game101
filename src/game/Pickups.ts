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
  constructor(readonly sprite: Phaser.GameObjects.Image) {}
}

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

  constructor(private ctx: GameCtx, private handlers: PickupHandlers) {}

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
    this.gems++;
  }

  drop(kind: Exclude<PickupKind, 'xp'>, x: number, y: number, value = 0): void {
    const tex = kind === 'chest' ? 'chest' : kind;
    const p = this.obtain(kind, x, y, tex);
    p.value = value;
    if (kind === 'chest') {
      p.sprite.setScale(0.2);
      this.ctx.scene.tweens.add({ targets: p.sprite, scale: 1.15, duration: 500, ease: 'Back.easeOut' });
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
    for (const p of this.list) {
      if (!p.active) continue;
      p.age += dt;
      const dx = player.x - p.x;
      const dy = player.y - p.y;
      const d2 = dx * dx + dy * dy;
      if (!p.pulled && p.kind !== 'chest' && d2 < mr2) p.pulled = true;
      if (p.pulled) {
        const d = Math.sqrt(d2) || 1;
        p.speed = Math.min(1700, p.speed + 2600 * dt);
        const step = Math.min(d, p.speed * dt);
        p.x += (dx / d) * step;
        p.y += (dy / d) * step;
      }
      if ((player.x - p.x) ** 2 + (player.y - p.y) ** 2 < grab * grab) {
        this.collect(p);
        continue;
      }
      const bob = p.kind === 'xp' ? 0 : Math.sin(p.age * 5) * 4;
      p.sprite.setPosition(p.x, p.y + bob);
    }
  }

  private collect(p: Pickup): void {
    p.active = false;
    p.sprite.setVisible(false);
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
