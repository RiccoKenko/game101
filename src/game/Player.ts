import Phaser from 'phaser';
import { PLAYER_BASE } from '../config/game';
import { type PlayerStats } from '../core/stats';

export class Player {
  x = 0;
  y = 0;
  hp: number;
  /** Unit vector of the last movement direction (the Bow shoots this way). */
  faceX = 1;
  faceY = 0;
  moving = false;
  iframes = 0;
  readonly radius = PLAYER_BASE.radius;
  readonly sprite: Phaser.GameObjects.Sprite;
  private shadow: Phaser.GameObjects.Image;
  private hpBack: Phaser.GameObjects.Image;
  private hpFill: Phaser.GameObjects.Image;
  private anim = 0;
  private frame = 0;
  private flash = 0;
  private lean = 0;
  /** A squash impulse (starting, stopping, firing) easing back to 0. */
  private squash = 0;
  private stepTimer = 0;
  private wasMoving = false;
  /** Called at each footfall while running (for dust puffs). */
  onStep?: (x: number, y: number) => void;

  constructor(scene: Phaser.Scene, public stats: PlayerStats) {
    this.hp = stats.maxHp;
    this.shadow = scene.add.image(0, 0, 'shadow').setDisplaySize(84, 26).setDepth(4);
    // Anchored at the feet so the run bounce and squash pivot on the ground.
    this.sprite = scene.add.sprite(0, 0, 'hero_0').setDepth(20).setOrigin(0.5, 1);
    this.hpBack = scene.add.image(0, 0, 'px').setTint(0x2a1f3d).setDisplaySize(92, 16).setDepth(21);
    this.hpFill = scene.add.image(0, 0, 'px').setTint(0xff4d5e).setOrigin(0, 0.5).setDepth(22);
  }

  setStats(stats: PlayerStats): void {
    const ratio = this.hp / this.stats.maxHp;
    this.stats = stats;
    this.hp = Math.min(stats.maxHp, Math.max(this.hp, ratio * stats.maxHp));
  }

  move(dx: number, dy: number, dt: number): void {
    const len = Math.hypot(dx, dy);
    this.moving = len > 0.05;
    if (this.moving) {
      const m = Math.min(1, len);
      this.x += (dx / len) * m * this.stats.speed * dt;
      this.y += (dy / len) * m * this.stats.speed * dt;
      this.faceX = dx / len;
      this.faceY = dy / len;
    }
  }

  heal(amount: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount);
  }

  hitFlash(): void {
    this.flash = 0.12;
  }

  /** A little kick when the bow fires. */
  recoil(): void {
    this.squash = Math.max(this.squash, 0.5);
  }

  update(dt: number): void {
    this.iframes = Math.max(0, this.iframes - dt);
    this.anim += dt;
    if (this.moving && this.anim > 0.16) {
      this.anim = 0;
      this.frame ^= 1;
      this.sprite.setTexture(this.frame ? 'hero_1' : 'hero_0');
    } else if (!this.moving && this.frame) {
      this.frame = 0;
      this.sprite.setTexture('hero_0');
    }
    if (Math.abs(this.faceX) > 0.15) this.sprite.setFlipX(this.faceX < 0);
    if (this.moving !== this.wasMoving) {
      this.wasMoving = this.moving;
      this.squash = Math.max(this.squash, 0.8);
    }
    this.squash *= Math.exp(-10 * dt);
    const lean = this.moving ? this.faceX * 0.13 : 0;
    this.lean += (lean - this.lean) * Math.min(1, dt * 12);
    const stride = this.moving ? Math.abs(Math.sin((this.anim * Math.PI) / 0.16)) : 0;
    const bob = stride * 6;
    const sx = 1 + 0.12 * this.squash - stride * 0.03;
    const sy = 1 - 0.1 * this.squash + stride * 0.05;
    this.sprite.setScale(sx, sy).setRotation(this.lean);
    this.sprite.setPosition(this.x, this.y + 44 - bob);
    this.shadow.setPosition(this.x, this.y + 42).setDisplaySize(84 * (1 - bob / 40), 26 * (1 - bob / 40));
    if (this.moving) {
      this.stepTimer += dt;
      if (this.stepTimer > 0.16) {
        this.stepTimer = 0;
        this.onStep?.(this.x - this.faceX * 18, this.y + 40);
      }
    }
    if (this.flash > 0) {
      this.flash -= dt;
      this.sprite.setTintFill(0xffffff);
      if (this.flash <= 0) this.sprite.clearTint();
    }
    // Blink while invulnerable.
    this.sprite.setAlpha(this.iframes > 0 && this.flash <= 0 ? (Math.floor(this.iframes * 20) % 2 ? 0.55 : 1) : 1);
    const ratio = Phaser.Math.Clamp(this.hp / this.stats.maxHp, 0, 1);
    this.hpBack.setPosition(this.x, this.y + 62);
    this.hpFill.setPosition(this.x - 42, this.y + 62).setDisplaySize(84 * ratio, 8);
  }
}
