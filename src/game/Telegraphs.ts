import Phaser from 'phaser';
import { type GameCtx } from './context';

/**
 * Boss attacks you can see coming: a lane on the ground that erupts after a moment (a charge's path, a quake line),
 * and rays that sweep round a boss for a few seconds. Every one shows where it will hit before it can hurt, so a
 * player who watches can always step aside.
 */
interface Line {
  x: number;
  y: number;
  angle: number;
  len: number;
  width: number;
  t: number;
  delay: number;
  damage: number;
  color: number;
  img: Phaser.GameObjects.Image;
  /** Fills the lane from the boss outward as the moment comes. */
  fill: Phaser.GameObjects.Image;
}

/** A ray sweeping round its owner: a thin warning first, then the burning beam. */
interface Ray {
  owner: { x: number; y: number; active: boolean };
  angle: number;
  spin: number;
  len: number;
  width: number;
  warn: number;
  life: number;
  damage: number;
  tick: number;
  /** The ray's true reach, flat on the ground, so the hero can see exactly how wide it hurts. */
  band: Phaser.GameObjects.Image;
  glow: Phaser.GameObjects.Image;
  core: Phaser.GameObjects.Image;
}

/** Seconds between a ray's hits on a hero standing in it. */
const RAY_TICK = 0.35;

export class Telegraphs {
  private lines: Line[] = [];
  private rays: Ray[] = [];

  constructor(private ctx: GameCtx) {}

  /**
   * A lane from (x, y) along `angle`: red on the ground now, and in `delay` seconds it erupts, hurting the hero for
   * `damage` if still inside (0 = a warning only, e.g. the path a charge will take).
   */
  line(x: number, y: number, angle: number, len: number, width: number, delay: number, damage: number, color: number): void {
    const img = this.ctx.scene.add
      .image(x, y, 'px')
      .setOrigin(0, 0.5)
      .setDepth(3)
      .setRotation(angle)
      .setDisplaySize(len, width)
      .setTint(0xff5a3c)
      .setAlpha(0.3);
    const fill = this.ctx.scene.add.image(x, y, 'px').setOrigin(0, 0.5).setDepth(3).setRotation(angle).setTint(0xff3c28).setAlpha(0.35).setDisplaySize(1, width * 0.8);
    this.lines.push({ x, y, angle, len, width, t: delay, delay, damage, color, img, fill });
  }

  /** Rays round `owner`, starting at `angle` and turning `spin` radians a second; they warn for `warn` seconds. */
  ray(owner: Ray['owner'], angle: number, spin: number, len: number, width: number, warn: number, dur: number, damage: number, color: number): void {
    const scene = this.ctx.scene;
    const band = scene.add.image(owner.x, owner.y, 'px').setOrigin(0, 0.5).setDepth(3).setTint(0xff5a3c).setAlpha(0);
    const glow = scene.add.image(owner.x, owner.y, 'beam').setOrigin(0, 0.5).setDepth(27).setTint(color).setAlpha(0);
    const core = scene.add.image(owner.x, owner.y, 'beam').setOrigin(0, 0.5).setDepth(28).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.rays.push({ owner, angle, spin, len, width, warn, life: warn + dur, damage, tick: 0, band, glow, core });
  }

  get busy(): boolean {
    return this.rays.length > 0;
  }

  update(dt: number): void {
    const { player, fx } = this.ctx;
    for (let i = this.lines.length - 1; i >= 0; i--) {
      const l = this.lines[i];
      l.t -= dt;
      // The warning glows brighter as the moment comes.
      const k = 1 - Math.max(0, l.t) / l.delay;
      l.img.setAlpha(0.3 + 0.2 * k + 0.08 * Math.sin(k * 30));
      l.fill.setDisplaySize(Math.max(1, l.len * k), l.width * 0.8);
      if (l.t > 0) continue;
      l.img.destroy();
      l.fill.destroy();
      this.lines.splice(i, 1);
      if (l.damage <= 0) continue;
      // Erupts: a flash along the lane, sparks, and a hit if the hero is still in it.
      const flash = this.ctx.scene.add
        .image(l.x, l.y, 'beam')
        .setOrigin(0, 0.5)
        .setDepth(27)
        .setRotation(l.angle)
        .setDisplaySize(l.len, l.width * 1.4)
        .setTint(l.color)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.ctx.scene.tweens.add({ targets: flash, alpha: 0, duration: 320, onComplete: () => flash.destroy() });
      for (let s = 0; s < 5; s++) {
        const u = (s + 0.5) / 5;
        fx.sparksAt(l.x + Math.cos(l.angle) * l.len * u, l.y + Math.sin(l.angle) * l.len * u, 2, l.color);
      }
      if (this.onLine(player.x, player.y, l.x, l.y, l.angle, l.len, l.width / 2 + player.radius * 0.6)) this.ctx.hurtPlayer(l.damage);
    }
    for (let i = this.rays.length - 1; i >= 0; i--) {
      const r = this.rays[i];
      r.life -= dt;
      if (r.warn > 0) r.warn -= dt;
      else r.angle += r.spin * dt;
      const live = r.warn <= 0;
      const { x, y } = r.owner;
      const w = r.warn > 0 ? r.width * 0.25 : r.width * (0.9 + 0.1 * Math.sin(r.life * 30));
      r.band.setPosition(x, y).setRotation(r.angle).setDisplaySize(r.len, r.width + this.ctx.player.radius).setAlpha(r.warn > 0 ? 0.3 : 0.22);
      r.glow.setPosition(x, y).setRotation(r.angle).setDisplaySize(r.len, w * 1.9).setAlpha(r.warn > 0 ? 0.35 : 0.7);
      r.core.setPosition(x, y).setRotation(r.angle).setDisplaySize(r.len, w * 0.5).setAlpha(r.warn > 0 ? 0.25 : 0.95);
      if (live) {
        r.tick -= dt;
        if (r.tick <= 0 && this.onLine(player.x, player.y, x, y, r.angle, r.len, r.width / 2 + player.radius * 0.5)) {
          r.tick = RAY_TICK;
          this.ctx.hurtPlayer(r.damage);
        }
      }
      if (r.life <= 0 || !r.owner.active) {
        r.band.destroy();
        r.glow.destroy();
        r.core.destroy();
        this.rays.splice(i, 1);
      }
    }
  }

  /** Is (px, py) within `reach` of the lane from (x, y) along `angle` for `len`? */
  private onLine(px: number, py: number, x: number, y: number, angle: number, len: number, reach: number): boolean {
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    const along = (px - x) * ux + (py - y) * uy;
    if (along < -reach || along > len + reach) return false;
    const across = Math.abs(-(px - x) * uy + (py - y) * ux);
    return across < reach;
  }

  /**
   * Which way to step to get out of every lane and ray that would catch (x, y) (zero when safe). The test bot uses
   * it, the way a player watches the ground.
   */
  escape(x: number, y: number, radius: number): { x: number; y: number } {
    let ex = 0;
    let ey = 0;
    const push = (lx: number, ly: number, angle: number, len: number, width: number) => {
      if (!this.onLine(x, y, lx, ly, angle, len, width / 2 + radius + 20)) return;
      // Step sideways, away from the lane's middle.
      const ux = Math.cos(angle);
      const uy = Math.sin(angle);
      const side = -(x - lx) * uy + (y - ly) * ux >= 0 ? 1 : -1;
      ex += -uy * side;
      ey += ux * side;
    };
    for (const l of this.lines) if (l.damage > 0) push(l.x, l.y, l.angle, l.len, l.width);
    for (const r of this.rays) push(r.owner.x, r.owner.y, r.angle + r.spin * 0.4, r.len, r.width * 1.4);
    return { x: ex, y: ey };
  }

  clear(): void {
    this.lines.forEach((l) => {
      l.img.destroy();
      l.fill.destroy();
    });
    this.rays.forEach((r) => {
      r.band.destroy();
      r.glow.destroy();
      r.core.destroy();
    });
    this.lines = [];
    this.rays = [];
  }
}
