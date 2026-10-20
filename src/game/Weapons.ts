import Phaser from 'phaser';
import { audio } from '../audio/audio';
import {
  AMOUNT_BOOSTED,
  EVOLUTIONS,
  WEAPONS,
  type WeaponStats,
} from '../config/weapons';
import { type OwnedWeapon } from '../core/progression';
import { type PlayerStats } from '../core/stats';
import { type GameCtx } from './context';
import { type Enemy } from './Enemies';

type ProjKind = 'arrow' | 'dagger' | 'boomerang' | 'bomb';

class Projectile {
  active = false;
  kind: ProjKind = 'arrow';
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  damage = 0;
  pierce = 0;
  radius = 0;
  life = 0;
  age = 0;
  knockback = 1;
  /** Enemy uid -> time it may be hit again (Infinity = never again). */
  hits = new Map<number, number>();
  // Boomerang
  returning = false;
  outTime = 0;
  // Bomb
  sx = 0;
  sy = 0;
  tx = 0;
  ty = 0;
  area = 1;
  constructor(readonly sprite: Phaser.GameObjects.Image) {}
}

interface WeaponRuntime {
  owned: OwnedWeapon;
  stats: WeaponStats;
  timer: number;
  // Axes
  axes: Phaser.GameObjects.Image[];
  axeAngle: number;
  axeActive: boolean;
  axeHits: Map<number, number>;
  // Aura
  aura?: Phaser.GameObjects.Image;
}

const AXE_RADIUS = 175;
const AURA_RADIUS = 135;
const BOMB_RADIUS = 150;
const BOLT_RADIUS = 75;

export class WeaponSystem {
  private runtimes: WeaponRuntime[] = [];
  private projectiles: Projectile[] = [];
  private clock = 0;
  /** HP per second healed by Sanctuary. */
  regen = 0;

  constructor(private ctx: GameCtx) {}

  /** Re-derives effective weapon stats after any level-up, evolution or stat change. */
  sync(weapons: OwnedWeapon[], stats: PlayerStats): void {
    for (const owned of weapons) {
      let rt = this.runtimes.find((r) => r.owned.id === owned.id);
      if (!rt) {
        rt = { owned, stats: WEAPONS[owned.id].levels[0], timer: 0.3, axes: [], axeAngle: 0, axeActive: false, axeHits: new Map() };
        this.runtimes.push(rt);
      }
      rt.owned = owned;
      const base = owned.evolved ? EVOLUTIONS[owned.evolved].stats : WEAPONS[owned.id].levels[owned.level - 1];
      rt.stats = {
        ...base,
        damage: base.damage * stats.damageMult,
        cooldown: base.cooldown * stats.cooldownMult,
        area: base.area * stats.areaMult,
        amount: base.amount + (AMOUNT_BOOSTED.has(owned.id) && !(owned.id === 'daggers' && owned.evolved) ? stats.amountBonus : 0),
      };
      this.syncVisuals(rt);
    }
    this.regen = weapons.some((w) => w.evolved === 'sanctuary') ? 0.8 : 0;
  }

  private syncVisuals(rt: WeaponRuntime): void {
    const scene = this.ctx.scene;
    const id = rt.owned.id;
    if (id === 'axes') {
      const tex = rt.owned.evolved ? 'axe_titan' : 'axe';
      while (rt.axes.length < rt.stats.amount) rt.axes.push(scene.add.image(0, 0, tex).setDepth(25));
      while (rt.axes.length > rt.stats.amount) rt.axes.pop()!.destroy();
      for (const a of rt.axes) a.setTexture(tex).setScale(rt.owned.evolved ? 1 : 0.9 + (rt.stats.area - 1) * 0.5);
      if (rt.owned.evolved) rt.axeActive = true;
    }
    if (id === 'aura') {
      const tex = rt.owned.evolved ? 'aura_holy' : 'aura';
      if (!rt.aura) {
        rt.aura = scene.add.image(0, 0, tex).setDepth(3);
        scene.tweens.add({ targets: rt.aura, alpha: { from: 0.75, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
      }
      rt.aura.setTexture(tex).setDisplaySize(AURA_RADIUS * rt.stats.area * 2, AURA_RADIUS * rt.stats.area * 2);
    }
  }

  private obtain(kind: ProjKind, texture: string): Projectile {
    let p = this.projectiles.find((o) => !o.active);
    if (!p) {
      p = new Projectile(this.ctx.scene.add.image(0, 0, texture).setDepth(28));
      this.projectiles.push(p);
    }
    p.active = true;
    p.kind = kind;
    p.age = 0;
    p.returning = false;
    p.knockback = 1;
    p.hits.clear();
    p.sprite.setTexture(texture).setVisible(true).setScale(1).setRotation(0);
    return p;
  }

  update(dt: number): void {
    this.clock += dt;
    const { player } = this.ctx;
    for (const rt of this.runtimes) {
      const s = rt.stats;
      switch (rt.owned.id) {
        case 'axes':
          this.updateAxes(rt, dt);
          break;
        case 'aura':
          rt.aura?.setPosition(player.x, player.y + 10);
          rt.timer -= dt;
          if (rt.timer <= 0) {
            rt.timer = s.cooldown;
            this.auraTick(rt);
          }
          break;
        default:
          rt.timer -= dt;
          if (rt.timer <= 0) {
            rt.timer = s.cooldown;
            this.fire(rt);
          }
      }
    }
    this.updateProjectiles(dt);
  }

  private fire(rt: WeaponRuntime): void {
    const { player, enemies } = this.ctx;
    const s = rt.stats;
    const evolved = rt.owned.evolved;
    switch (rt.owned.id) {
      case 'bow': {
        // Arrows go for the boss when it's in range, otherwise the closest enemy.
        const boss = enemies.alive.find((e) => e.isBoss && e.active && Math.hypot(e.x - player.x, e.y - player.y) < 950);
        const target = boss ?? enemies.nearest(player.x, player.y, 950);
        const base = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.faceY, player.faceX);
        const spread = evolved ? 0.22 : 0.16;
        for (let i = 0; i < s.amount; i++) {
          const a = base + (i - (s.amount - 1) / 2) * spread;
          this.shoot('arrow', evolved ? 'arrow_storm' : 'arrow', a, s, 22 * s.area);
        }
        audio.sfx('shoot');
        break;
      }
      case 'daggers': {
        const targets = enemies.nearestN(player.x, player.y, evolved ? 3 : s.amount, 900);
        for (let i = 0; i < s.amount; i++) {
          let a: number;
          if (targets.length === 0) a = Math.atan2(player.faceY, player.faceX) + (i - (s.amount - 1) / 2) * 0.15;
          else {
            const t = evolved ? targets[Math.floor(this.ctx.rng() * targets.length)] : targets[i % targets.length];
            a = Math.atan2(t.y - player.y, t.x - player.x) + (i >= targets.length ? (i - targets.length + 1) * 0.12 : 0);
          }
          this.shoot('dagger', evolved ? 'dagger_gold' : 'dagger', a, s, 18 * s.area);
        }
        if (!evolved) audio.sfx('shoot', 0.8);
        break;
      }
      case 'boomerang': {
        const target = enemies.nearest(player.x, player.y, 800);
        const base = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.faceY, player.faceX);
        for (let i = 0; i < s.amount; i++) {
          const p = this.shoot('boomerang', 'boomerang', base + (i - (s.amount - 1) / 2) * 0.5, s, 30 * s.area);
          p.outTime = 0.5;
          p.life = 4;
          p.sprite.setScale(s.area);
        }
        audio.sfx('shoot', 0.8);
        break;
      }
      case 'bomb': {
        const view = this.ctx.view();
        const inView = enemies.inRect(view);
        for (let i = 0; i < s.amount; i++) {
          const target: Enemy | undefined = inView.length ? inView[Math.floor(this.ctx.rng() * inView.length)] : undefined;
          const a = this.ctx.rng() * Math.PI * 2;
          const tx = target ? target.x : player.x + Math.cos(a) * 300;
          const ty = target ? target.y : player.y + Math.sin(a) * 300;
          const p = this.obtain('bomb', 'bomb');
          p.sx = p.x = player.x;
          p.sy = p.y = player.y;
          p.tx = tx;
          p.ty = ty;
          p.damage = s.damage;
          p.area = s.area;
          p.life = 0.6 + i * 0.08;
        }
        break;
      }
      case 'lightning': {
        const view = this.ctx.view();
        const inView = enemies.inRect(view);
        Phaser.Utils.Array.Shuffle(inView);
        const targets = inView.slice(0, s.amount);
        for (const t of targets) {
          const x = t.x;
          const y = t.y;
          this.ctx.fx.bolt(x, y);
          enemies.forEachInRadius(x, y, BOLT_RADIUS * s.area, (e) => enemies.damage(e, s.damage, x, y, 0.5));
        }
        if (targets.length) audio.sfx('zap');
        break;
      }
      default:
        break;
    }
  }

  private shoot(kind: ProjKind, texture: string, angle: number, s: WeaponStats, radius: number): Projectile {
    const { player } = this.ctx;
    const p = this.obtain(kind, texture);
    p.x = player.x + Math.cos(angle) * 30;
    p.y = player.y - 10 + Math.sin(angle) * 30;
    p.vx = Math.cos(angle) * s.speed;
    p.vy = Math.sin(angle) * s.speed;
    p.damage = s.damage;
    p.pierce = s.pierce;
    p.radius = radius;
    p.life = 1.4;
    p.sprite.setRotation(angle).setScale(kind === 'arrow' ? Math.max(1, s.area * 0.9) : 1);
    return p;
  }

  private updateAxes(rt: WeaponRuntime, dt: number): void {
    const s = rt.stats;
    const { player, enemies } = this.ctx;
    const evolved = !!rt.owned.evolved;
    rt.timer -= dt;
    if (!evolved && rt.timer <= 0) {
      rt.axeActive = !rt.axeActive;
      rt.timer = rt.axeActive ? s.duration : s.cooldown;
      if (rt.axeActive) for (const a of rt.axes) a.setAlpha(0).setVisible(true);
    }
    for (const a of rt.axes) a.setVisible(rt.axeActive);
    if (!rt.axeActive) return;
    rt.axeAngle += s.speed * dt;
    const R = AXE_RADIUS * s.area;
    const hitR = (evolved ? 46 : 32) * (evolved ? 1 : 0.9 + (s.area - 1) * 0.5);
    const n = rt.axes.length;
    for (let i = 0; i < n; i++) {
      const ang = rt.axeAngle + (i / n) * Math.PI * 2;
      const x = player.x + Math.cos(ang) * R;
      const y = player.y + Math.sin(ang) * R;
      const img = rt.axes[i];
      img.setPosition(x, y).setRotation(this.clock * 14);
      if (img.alpha < 1) img.setAlpha(Math.min(1, img.alpha + dt * 6));
      enemies.forEachInRadius(x, y, hitR, (e) => {
        const next = rt.axeHits.get(e.uid) ?? 0;
        if (this.clock < next) return;
        rt.axeHits.set(e.uid, this.clock + 0.45);
        enemies.damage(e, s.damage, player.x, player.y, evolved ? 2.2 : 1.2);
        this.ctx.fx.sparksAt(e.x, e.y, 2);
      });
    }
    if (rt.axeHits.size > 600) rt.axeHits.clear();
  }

  private auraTick(rt: WeaponRuntime): void {
    const s = rt.stats;
    const { player, enemies } = this.ctx;
    const evolved = !!rt.owned.evolved;
    enemies.forEachInRadius(player.x, player.y, AURA_RADIUS * s.area, (e) => {
      enemies.damage(e, s.damage, player.x, player.y, 0.35);
      if (evolved) e.slow = 0.6;
    });
  }

  private updateProjectiles(dt: number): void {
    const { enemies, player } = this.ctx;
    for (const p of this.projectiles) {
      if (!p.active) continue;
      p.age += dt;
      p.life -= dt;

      if (p.kind === 'bomb') {
        const dur = 0.6;
        const u = Math.min(1, p.age / dur);
        p.x = Phaser.Math.Linear(p.sx, p.tx, u);
        p.y = Phaser.Math.Linear(p.sy, p.ty, u) - Math.sin(u * Math.PI) * 170;
        p.sprite.setPosition(p.x, p.y).setRotation(p.age * 10);
        if (u >= 1) {
          const r = BOMB_RADIUS * p.area;
          this.ctx.fx.explosion(p.tx, p.ty, r);
          enemies.forEachInRadius(p.tx, p.ty, r, (e) => enemies.damage(e, p.damage, p.tx, p.ty, 1.6));
          audio.sfx('explosion');
          this.ctx.scene.cameras.main.shake(90, 0.003);
          this.release(p);
        }
        continue;
      }

      if (p.kind === 'boomerang') {
        if (!p.returning && p.age >= p.outTime) p.returning = true;
        if (!p.returning) {
          const k = Math.exp(-3.2 * dt);
          p.vx *= k;
          p.vy *= k;
        } else {
          const dx = player.x - p.x;
          const dy = player.y - p.y;
          const d = Math.hypot(dx, dy) || 1;
          const sp = Math.min(1500, Math.hypot(p.vx, p.vy) + 2600 * dt);
          p.vx = (dx / d) * sp;
          p.vy = (dy / d) * sp;
          if (d < 50) {
            this.release(p);
            continue;
          }
        }
        p.sprite.rotation += 16 * dt;
      }

      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.sprite.setPosition(p.x, p.y);
      if (p.life <= 0) {
        this.release(p);
        continue;
      }

      enemies.forEachInRadius(p.x, p.y, p.radius, (e) => {
        if (!p.active) return;
        const until = p.hits.get(e.uid);
        if (until !== undefined && this.clock < until) return;
        p.hits.set(e.uid, p.kind === 'boomerang' ? this.clock + 0.35 : Infinity);
        enemies.damage(e, p.damage, p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.kind === 'boomerang' ? 0.6 : 1);
        this.ctx.fx.sparksAt(p.x, p.y, 2);
        if (p.kind !== 'boomerang') {
          p.pierce--;
          if (p.pierce < 0) this.release(p);
        }
      });
    }
  }

  private release(p: Projectile): void {
    p.active = false;
    p.sprite.setVisible(false);
  }

  destroy(): void {
    for (const rt of this.runtimes) {
      rt.axes.forEach((a) => a.destroy());
      rt.aura?.destroy();
    }
    this.runtimes = [];
  }
}
