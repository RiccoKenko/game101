import Phaser from 'phaser';
import { heroMetaKey, type HeroMeta } from '../art/textures';
import { type CharacterDef } from '../config/characters';
import { PLAYER_BASE } from '../config/game';
import { type WeaponId } from '../config/weapons';
import { type PlayerStats } from '../core/stats';

/** On-screen height of the painted hero, in game px. */
const HERO_HEIGHT = 150;
/** The running loops, which share their legs frame by frame. */
const STRIDES = ['run', 'runaim', 'runrelease'];

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
  /** Seconds since the bow last fired: running soon after a shot keeps the bow drawn (runaim). */
  private sinceShot = 99;
  /** Seconds left of the just-released arms while running (runrelease), before drawing again. */
  private release = 0;
  /** The hero's own weapon: its shots come from the bow or hand and play the shooting animation. */
  readonly primary: WeaponId;
  /** Animation keys are `<sheet>_<name>` (hero_run, mage_run...). */
  private readonly sheet: string;
  private readonly strides: Set<string>;
  private readonly muzzle: [number, number];
  /** Mana Shield (the mage): up and ready to block a hit, or seconds until it comes back. */
  shieldUp = false;
  private shieldWait = 0;
  private bubble: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene, public stats: PlayerStats, character: CharacterDef) {
    this.hp = stats.maxHp;
    this.primary = character.start;
    this.muzzle = character.muzzle;
    this.shadow = scene.add.image(0, 0, 'shadow').setDisplaySize(84, 26).setDepth(4);
    // Anchored at the feet so the run bounce and squash pivot on the ground. A character whose sheet didn't load
    // falls back to the archer's.
    const sheet = scene.anims.exists(`${character.sheet}_idle`) ? character.sheet : 'hero';
    this.sheet = sheet;
    this.strides = new Set(STRIDES.map((s) => `${sheet}_${s}`));
    const meta = scene.cache.json.get(heroMetaKey(sheet)) as HeroMeta | undefined;
    this.painted = !!meta && scene.anims.exists(`${sheet}_idle`);
    if (this.painted && meta) {
      this.baseScale = HERO_HEIGHT / (meta.frameHeight * 0.82);
      this.sprite = scene.add.sprite(0, 0, sheet, 0).setDepth(20);
      this.sprite.setOrigin(meta.feet[0] / meta.frameWidth, meta.feet[1] / meta.frameHeight).play(`${sheet}_idle`);
      this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
        if (anim.key !== `${sheet}_ko` && `${sheet}_${this.action}` === anim.key) this.action = null;
      });
    } else {
      this.baseScale = 1;
      this.sprite = scene.add.sprite(0, 0, 'hero_0').setDepth(20).setOrigin(0.5, 1);
    }
    this.bubble = scene.add.image(0, 0, 'ring').setDepth(23).setTint(0x8fd8ff).setVisible(false);
    this.shieldUp = stats.shieldTime > 0;
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

  /** The Mana Shield takes a hit if it is up: it breaks (and starts coming back). Returns true if it blocked. */
  blockHit(): boolean {
    if (!this.shieldUp) return false;
    this.shieldUp = false;
    this.shieldWait = this.stats.shieldTime;
    this.bubble.setVisible(false);
    return true;
  }

  heal(amount: number): void {
    this.hp = Math.min(this.stats.maxHp, this.hp + amount * this.stats.healMult);
  }

  hitFlash(): void {
    this.flash = 0.12;
    this.playAction('hurt', true);
  }

  /**
   * The bow fires toward `angle`: a little kick, and the painted hero shows the shot. Standing, it plays the whole
   * shot; running, the arms snap to the released pose for a moment while the legs keep their stride.
   */
  shootAt(angle: number): void {
    this.squash = Math.max(this.squash, 0.5);
    this.aimFace = Math.cos(angle) < 0 ? -1 : 1;
    this.sinceShot = 0;
    if (!this.moving) this.playAction('shoot', this.action === 'shoot');
    else if (!this.action && this.hasAnim('runrelease')) {
      this.release = 0.19;
      this.playStride('runrelease');
    }
  }

  /**
   * Plays one of the running loops (run, runaim, runrelease) from the frame the current one is on: they share
   * the same legs frame by frame, so swapping them changes only the arms.
   */
  private playStride(name: string): void {
    const key = `${this.sheet}_${name}`;
    const anims = this.sprite.anims;
    const current = anims.currentAnim?.key ?? '';
    if (current === key && anims.isPlaying) return;
    const i = this.strides.has(current) && anims.currentFrame ? anims.currentFrame.index - 1 : 0;
    this.sprite.play({ key, startFrame: i });
  }

  /**
   * Where the hero's shots leave the bow (or the casting hand) when shooting toward `angle`: in front of the chest,
   * not the middle of the body.
   */
  attackPoint(angle: number): { x: number; y: number } {
    const [fx, fy] = this.muzzle;
    return { x: this.x + Math.cos(angle) * fx, y: this.y + 44 - fy + Math.sin(angle) * 22 };
  }

  private hasAnim(name: string): boolean {
    return this.painted && this.sprite.scene.anims.exists(`${this.sheet}_${name}`);
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
    if (!this.painted || this.action === 'ko' || !this.hasAnim(name)) return;
    if (this.action && !force) return;
    this.action = name;
    this.sprite.play(`${this.sheet}_${name}`);
  }

  update(dt: number): void {
    this.iframes = Math.max(0, this.iframes - dt);
    if (this.stats.shieldTime > 0 && !this.shieldUp) {
      this.shieldWait -= dt;
      if (this.shieldWait <= 0) {
        this.shieldUp = true;
        this.bubble.setScale(0.2).setAlpha(1);
      }
    }
    // The shield shows as a soft blue ring that breathes around the hero.
    this.bubble.setVisible(this.shieldUp);
    if (this.shieldUp) {
      const k = Math.min(1.45, this.bubble.scaleX + dt * 6);
      this.bubble.setPosition(this.x, this.y + 2).setScale(k * (1 + 0.03 * Math.sin(this.anim * 5))).setAlpha(0.45 + 0.15 * Math.sin(this.anim * 3));
    }
    this.anim += dt;
    if (this.painted) {
      this.sinceShot += dt;
      // Starting to run mid-shot cuts the standing shot short.
      if (this.moving && this.action === 'shoot') this.action = null;
      if (!this.action) {
        if (!this.moving) {
          this.release = 0;
          this.sprite.play(`${this.sheet}_idle`, true);
        } else if (this.release > 0) {
          this.release -= dt;
          if (this.release <= 0) this.playStride('runaim');
        } else {
          // Fighting: run with the bow drawn; nothing to shoot for a while: run with it lowered.
          this.playStride(this.sinceShot < 1.2 && this.hasAnim('runaim') ? 'runaim' : 'run');
        }
      }
    } else if (this.moving && this.anim > 0.16) {
      this.anim = 0;
      this.frame ^= 1;
      this.sprite.setTexture(this.frame ? 'hero_1' : 'hero_0');
    } else if (!this.moving && this.frame) {
      this.frame = 0;
      this.sprite.setTexture('hero_0');
    }
    const key = this.sprite.anims.currentAnim?.key;
    const aiming = this.action === 'shoot' || (!this.action && (key === `${this.sheet}_runaim` || key === `${this.sheet}_runrelease`));
    if (aiming) this.sprite.setFlipX(this.aimFace < 0);
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
