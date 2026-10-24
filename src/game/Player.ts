import Phaser from 'phaser';
import { HERO_META, type HeroMeta } from '../art/textures';
import { PLAYER_BASE } from '../config/game';
import { type PlayerStats } from '../core/stats';

/** On-screen height of the painted hero, in game px. */
const HERO_HEIGHT = 150;

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
  /** True when the painted, animated hero sheet loaded (otherwise the two-frame SVG hero is used). */
  private readonly painted: boolean;
  private readonly baseScale: number;
  /** A one-shot animation playing over the idle/run loop (shoot, runshoot, hurt, cheer, ko). */
  private action: string | null = null;
  /** Which way the last shot went (-1 left, 1 right): the hero faces it while shooting, even running the other way. */
  private aimFace = 1;

  constructor(scene: Phaser.Scene, public stats: PlayerStats) {
    this.hp = stats.maxHp;
    this.shadow = scene.add.image(0, 0, 'shadow').setDisplaySize(84, 26).setDepth(4);
    // Anchored at the feet so the run bounce and squash pivot on the ground.
    const meta = scene.cache.json.get(HERO_META) as HeroMeta | undefined;
    this.painted = !!meta && scene.anims.exists('hero_idle');
    if (this.painted && meta) {
      this.baseScale = HERO_HEIGHT / (meta.frameHeight * 0.82);
      this.sprite = scene.add.sprite(0, 0, 'hero', 0).setDepth(20);
      this.sprite.setOrigin(meta.feet[0] / meta.frameWidth, meta.feet[1] / meta.frameHeight).play('hero_idle');
      this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
        if (anim.key !== 'hero_ko' && `hero_${this.action}` === anim.key) this.action = null;
      });
    } else {
      this.baseScale = 1;
      this.sprite = scene.add.sprite(0, 0, 'hero_0').setDepth(20).setOrigin(0.5, 1);
    }
    // A small HP gauge under the hero: dark frame, green fill that turns red when low.
    this.hpBack = scene.add.image(0, 0, 'px').setTint(0x16233f).setDisplaySize(96, 15).setDepth(21);
    this.hpFill = scene.add.image(0, 0, 'px').setTint(0x5ad15a).setOrigin(0, 0.5).setDepth(22);
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
    this.playAction('hurt', true);
  }

  /** The bow fires toward `angle`: a little kick, and the painted hero plays a shot (running or standing). */
  shootAt(angle: number): void {
    this.squash = Math.max(this.squash, 0.5);
    this.aimFace = Math.cos(angle) < 0 ? -1 : 1;
    if (this.moving && this.hasAnim('runshoot')) this.playAction('runshoot', true);
    else if (!this.moving) this.playAction('shoot', this.action === 'shoot' || this.action === 'runshoot');
  }

  /** Where arrows leave the bow when shooting toward `angle` (in front of the chest, not the middle of the body). */
  bowPoint(angle: number): { x: number; y: number } {
    return { x: this.x + Math.cos(angle) * 40, y: this.y - 40 + Math.sin(angle) * 22 };
  }

  private hasAnim(name: string): boolean {
    return this.painted && this.sprite.scene.anims.exists(`hero_${name}`);
  }

  /** Throws the bow up in joy (level-ups, boss kills). */
  cheer(): void {
    this.playAction('cheer', true);
  }

  /** Falls over at the end of a run. Returns false when there is no animation for it (the caller tips the sprite). */
  knockOut(): boolean {
    if (!this.painted) return false;
    this.playAction('ko', true);
    return true;
  }

  private playAction(name: string, force: boolean): void {
    if (!this.painted || this.action === 'ko' || !this.sprite.scene.anims.exists(`hero_${name}`)) return;
    if (this.action && !force) return;
    this.action = name;
    this.sprite.play(`hero_${name}`);
  }

  update(dt: number): void {
    this.iframes = Math.max(0, this.iframes - dt);
    this.anim += dt;
    if (this.painted) {
      if (!this.action) this.sprite.play(this.moving ? 'hero_run' : 'hero_idle', true);
      // Starting or stopping mid-shot cuts the shot short (the next shot plays the right one).
      else if ((this.moving && this.action === 'shoot') || (!this.moving && this.action === 'runshoot')) {
        this.action = null;
        this.sprite.play(this.moving ? 'hero_run' : 'hero_idle', true);
      }
    } else if (this.moving && this.anim > 0.16) {
      this.anim = 0;
      this.frame ^= 1;
      this.sprite.setTexture(this.frame ? 'hero_1' : 'hero_0');
    } else if (!this.moving && this.frame) {
      this.frame = 0;
      this.sprite.setTexture('hero_0');
    }
    const shooting = this.action === 'shoot' || this.action === 'runshoot';
    if (shooting) this.sprite.setFlipX(this.aimFace < 0);
    else if (Math.abs(this.faceX) > 0.15) this.sprite.setFlipX(this.faceX < 0);
    if (this.moving !== this.wasMoving) {
      this.wasMoving = this.moving;
      this.squash = Math.max(this.squash, 0.8);
    }
    this.squash *= Math.exp(-10 * dt);
    const lean = this.moving ? this.faceX * 0.13 : 0;
    this.lean += (lean - this.lean) * Math.min(1, dt * 12);
    // The painted run cycle bounces by itself.
    const stride = this.moving && !this.painted ? Math.abs(Math.sin((this.anim * Math.PI) / 0.16)) : 0;
    const bob = stride * 6;
    const sx = 1 + 0.12 * this.squash - stride * 0.03;
    const sy = 1 - 0.1 * this.squash + stride * 0.05;
    this.sprite.setScale(sx * this.baseScale, sy * this.baseScale).setRotation(this.painted ? this.lean * 0.5 : this.lean);
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
    this.hpFill.setPosition(this.x - 45, this.y + 62).setDisplaySize(90 * ratio, 9).setTint(ratio < 0.3 ? 0xff4d5e : 0x5ad15a);
  }
}
