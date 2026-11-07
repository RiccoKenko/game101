import Phaser from 'phaser';
import { heroMetaKey, type HeroMeta } from '../art/textures';
import { type CharacterDef } from '../config/characters';
import { PLAYER_BASE } from '../config/game';
import { type WeaponId } from '../config/weapons';
import { type PlayerStats } from '../core/stats';

/** On-screen height of the painted hero, in game px. */
const HERO_HEIGHT = 150;
/** Seconds the hero takes to get up to speed, and to stop (a short ease, so starts and stops aren't robotic). */
const ACCEL = 0.06;
const DECEL = 0.045;
/** The running loops' frame rate is scaled so the feet keep pace with the ground: x this at the base speed. */
const STRIDE_RATE = 1.45;
const BASE_SPEED = 340;
/**
 * The run bounce over one step, frame by frame (0 low, 1 high), for a step drawn in 2 frames (footfall, passing)
 * or in 4 (contact, down, passing, up).
 */
const STEP_BOB: Record<number, number[]> = { 2: [0, 1], 4: [0.3, 0, 0.7, 1] };
/** How far past the edge of its eighth of the circle the look must turn before the hero turns (no flicker). */
const TURN_SLACK = 0.14;
/** The running loops, which share their legs frame by frame. */
const STRIDES = ['run', 'runaim', 'runrelease'];
/**
 * A sheet drawn from five sides has each animation once per side (`idle_s`, `run_ne`...): which side to show for
 * each of the eight ways the hero can look (east, then clockwise on screen), and whether to mirror it.
 */
const FACINGS = [
  { dir: 'e', flip: false },
  { dir: 'se', flip: false },
  { dir: 's', flip: false },
  { dir: 'se', flip: true },
  { dir: 'e', flip: true },
  { dir: 'ne', flip: true },
  { dir: 'n', flip: false },
  { dir: 'ne', flip: false },
];

export class Player {
  x = 0;
  y = 0;
  /** Current velocity (px/s), eased toward where the stick points. */
  vx = 0;
  vy = 0;
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
  /** The last shot's direction (unit vector), for a sheet drawn from five sides. */
  private aimX = 1;
  private aimY = 0;
  /** A sheet drawn from five sides (see FACINGS): where the hero looks, and whether the side shown is mirrored. */
  private readonly directional: boolean;
  /** Which of the eight ways the hero faces (index into FACINGS); it turns only past a little slack. */
  private octant = 0;
  private flip = false;
  /** A turn impulse (the body pinches as it swings round), easing back to 0. */
  private turn = 0;
  /** The run bounce: up on the passing frames, down on the footfalls, eased (0-1). */
  private bob = 0;
  /** How much the idle breathing shows (fades in when standing). */
  private breath = 0;
  /** A small kick back from a standing shot, easing back to 0. */
  private kick = 0;
  private lastStep = -1;
  /** The animation key the current one-shot action plays. */
  private actionKey = '';
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
  /** Seconds of the Swordman's Berserk left: more damage, a red glow. */
  berserk = 0;
  private shieldWait = 0;
  private bubble: Phaser.GameObjects.Image;
  /** The colour a hero borrowing another's sheet is drawn in (0 = none). */
  private readonly tint: number;

  constructor(scene: Phaser.Scene, public stats: PlayerStats, character: CharacterDef) {
    this.hp = stats.maxHp;
    this.primary = character.start;
    this.muzzle = character.muzzle;
    this.tint = character.tint ?? 0;
    this.shadow = scene.add.image(0, 0, 'shadow').setDisplaySize(84, 26).setDepth(4);
    // Anchored at the feet so the run bounce and squash pivot on the ground. A character whose sheet didn't load
    // falls back to the archer's.
    const loaded = (key: string) => {
      const m = scene.cache.json.get(heroMetaKey(key)) as HeroMeta | undefined;
      return !!m && scene.anims.exists(`${key}_idle${m.directions ? '_s' : ''}`);
    };
    const sheet = loaded(character.sheet) ? character.sheet : 'archer';
    this.sheet = sheet;
    this.strides = new Set(STRIDES.map((s) => `${sheet}_${s}`));
    const meta = scene.cache.json.get(heroMetaKey(sheet)) as HeroMeta | undefined;
    this.painted = loaded(sheet);
    this.directional = !!meta?.directions;
    if (this.painted && meta) {
      this.baseScale = HERO_HEIGHT / (meta.bodyHeight ?? meta.frameHeight * 0.82);
      this.sprite = scene.add.sprite(0, 0, sheet, 0).setDepth(20);
      this.sprite.setOrigin(meta.feet[0] / meta.frameWidth, meta.feet[1] / meta.frameHeight).play(this.key('idle'));
      this.sprite.on(Phaser.Animations.Events.ANIMATION_COMPLETE, (anim: Phaser.Animations.Animation) => {
        if (this.action && this.action !== 'ko' && anim.key === this.actionKey) this.action = null;
      });
    } else {
      this.baseScale = 1;
      this.sprite = scene.add.sprite(0, 0, 'hero_0').setDepth(20).setOrigin(0.5, 1);
    }
    this.restoreTint();
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
    const m = this.moving ? Math.min(1, len) * this.stats.speed : 0;
    const tx = this.moving ? (dx / len) * m : 0;
    const ty = this.moving ? (dy / len) * m : 0;
    const k = 1 - Math.exp(-dt / (this.moving ? ACCEL : DECEL));
    this.vx += (tx - this.vx) * k;
    this.vy += (ty - this.vy) * k;
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.moving) {
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
    // Standing, the hero flinches; running, she keeps her stride (a flinch would freeze her legs mid-slide).
    if (this.moving) this.squash = Math.max(this.squash, 0.6);
    else this.playAction('hurt', true);
  }

  /**
   * The bow fires toward `angle`: a little kick, and the painted hero shows the shot. Standing, it plays the whole
   * shot; running, the arms snap to the released pose for a moment while the legs keep their stride.
   */
  shootAt(angle: number): void {
    this.squash = Math.max(this.squash, 0.5);
    this.aimFace = Math.cos(angle) < 0 ? -1 : 1;
    this.aimX = Math.cos(angle);
    this.aimY = Math.sin(angle);
    if (!this.moving) this.look(this.aimX, this.aimY);
    this.sinceShot = 0;
    if (!this.moving) this.kick = 1;
    if (!this.moving) this.playAction('shoot', this.action === 'shoot');
    else if (!this.action && !this.directional && this.hasAnim('runrelease')) {
      this.release = 0.19;
      this.playStride('runrelease');
    }
  }

  /**
   * Plays one of the running loops (run, runaim, runrelease) from the frame the current one is on: they share
   * the same legs frame by frame, so swapping them changes only the arms.
   */
  private playStride(name: string): void {
    const key = this.key(name);
    const anims = this.sprite.anims;
    const current = anims.currentAnim?.key ?? '';
    if (current === key && anims.isPlaying) return;
    // Every running loop (run, runshoot) shares its legs frame by frame, so the stride carries over between them.
    const stride = this.directional ? current.startsWith(`${this.sheet}_run`) : this.strides.has(current);
    // The same point of the stride, even if the loops have different numbers of frames (4 and 8).
    const from = anims.currentAnim?.frames.length ?? 1;
    const to = this.sprite.scene.anims.get(key)?.frames.length ?? 1;
    const i = stride && anims.currentFrame ? Math.round(((anims.currentFrame.index - 1) * to) / from) % to : 0;
    this.sprite.play({ key, startFrame: i });
    this.flip = this.facing().flip;
  }

  /**
   * The animation key for `name`. On a sheet drawn from five sides it is the side the hero looks toward (the
   * running variants share the plain run there).
   */
  private key(name: string): string {
    if (!this.directional) return `${this.sheet}_${name}`;
    return `${this.sheet}_${STRIDES.includes(name) ? 'run' : name}_${this.facing().dir}`;
  }

  /** Which side of a five-sided sheet to show, and mirrored or not, for where the hero looks (one of 8 ways). */
  private facing(): { dir: string; flip: boolean } {
    return FACINGS[this.octant];
  }

  /**
   * Looks toward (x, y). The hero turns to another of the eight ways only once the look is a little past the edge
   * of the current one, so walking along a diagonal doesn't flicker between two sides.
   */
  private look(x: number, y: number): void {
    if (Math.hypot(x, y) < 0.15) return;
    const a = Math.atan2(y, x);
    const off = Math.abs(Phaser.Math.Angle.Wrap(a - (this.octant * Math.PI) / 4));
    if (off <= Math.PI / 8 + TURN_SLACK) return;
    const next = (Math.round(a / (Math.PI / 4)) + 8) % 8;
    if (next !== this.octant) {
      this.octant = next;
      this.turn = 1;
    }
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
    return this.painted && this.sprite.scene.anims.exists(this.key(name));
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
    this.actionKey = this.key(name);
    this.flip = this.facing().flip;
    this.sprite.play(this.actionKey);
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
      // A sheet drawn from five sides looks where the hero walks, or where it shoots: walking while the bow keeps
      // firing, it walks and shoots that way (runshoot).
      const runShoot = this.directional && this.moving && this.sinceShot < 0.9 && this.hasAnim('runshoot');
      if (!this.action && (runShoot || (!this.moving && this.sinceShot < 1.2))) this.look(this.aimX, this.aimY);
      else if (!this.action && this.moving) this.look(this.faceX, this.faceY);
      if (!this.action) {
        if (runShoot) this.playStride('runshoot');
        else if (!this.moving) {
          this.release = 0;
          this.sprite.play(this.key('idle'), true);
          this.flip = this.facing().flip;
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
    const key = this.sprite.anims.currentAnim?.key ?? '';
    const aiming = this.action === 'shoot' || (!this.action && (key === `${this.sheet}_runaim` || key === `${this.sheet}_runrelease`));
    if (this.directional) this.sprite.setFlipX(this.flip);
    else if (aiming) this.sprite.setFlipX(this.aimFace < 0);
    else if (Math.abs(this.faceX) > 0.15) this.sprite.setFlipX(this.faceX < 0);
    if (this.moving !== this.wasMoving) {
      this.wasMoving = this.moving;
      this.squash = Math.max(this.squash, 0.8);
    }
    this.squash *= Math.exp(-10 * dt);
    this.turn *= Math.exp(-14 * dt);
    this.kick *= Math.exp(-16 * dt);
    const speed = Math.hypot(this.vx, this.vy);
    const lean = Phaser.Math.Clamp(this.vx / BASE_SPEED, -1, 1) * 0.13;
    this.lean += (lean - this.lean) * Math.min(1, dt * 12);
    // A painted running loop: the legs keep pace with the ground (faster when the hero is faster), the body rises on
    // the passing frames and settles on each footfall, where a puff of dust kicks up.
    const running = this.painted && !this.action && key.startsWith(`${this.sheet}_run`);
    this.sprite.anims.timeScale = running ? Phaser.Math.Clamp((speed / BASE_SPEED) * STRIDE_RATE, 0.6, 2.2) : 1;
    const frame = running ? (this.sprite.anims.currentFrame?.index ?? 1) - 1 : -1;
    const step = (this.sprite.anims.currentAnim?.frames.length ?? 4) / 2;
    const bobs = STEP_BOB[step] ?? STEP_BOB[2];
    this.bob += ((running ? bobs[frame % step] ?? 0 : 0) - this.bob) * (1 - Math.exp(-28 * dt));
    if (running && frame % step === 0 && frame !== this.lastStep) this.onStep?.(this.x - this.faceX * 18, this.y + 40);
    this.lastStep = frame;
    // Standing still, the hero breathes.
    const idle = this.painted && !this.moving && !this.action;
    this.breath += ((idle ? 1 : 0) - this.breath) * Math.min(1, dt * 4);
    const inhale = Math.sin(this.anim * 2.6) * this.breath;
    // The two-frame fallback hero bounces in code.
    const stride = this.moving && !this.painted ? Math.abs(Math.sin((this.anim * Math.PI) / 0.16)) : 0;
    const bob = this.painted ? this.bob * 5 : stride * 6;
    const sx = (1 + 0.12 * this.squash - stride * 0.03 - this.bob * 0.012 - inhale * 0.007) * (1 - 0.14 * this.turn);
    const sy = 1 - 0.1 * this.squash + stride * 0.05 + this.bob * 0.025 + inhale * 0.014;
    this.sprite.setScale(sx * this.baseScale, sy * this.baseScale).setRotation(this.painted ? this.lean * 0.5 : this.lean);
    this.sprite.setPosition(this.x - this.aimX * this.kick * 5, this.y + 44 - bob - this.aimY * this.kick * 3);
    this.shadow.setPosition(this.x, this.y + 42).setDisplaySize(84 * (1 - bob / 40), 26 * (1 - bob / 40));
    if (this.moving && !this.painted) {
      this.stepTimer += dt;
      if (this.stepTimer > 0.16) {
        this.stepTimer = 0;
        this.onStep?.(this.x - this.faceX * 18, this.y + 40);
      }
    }
    const calmed = this.berserk > 0 && this.berserk <= dt;
    this.berserk = Math.max(0, this.berserk - dt);
    if (this.flash > 0) {
      this.flash -= dt;
      this.sprite.setTintFill(0xffffff);
      if (this.flash <= 0) this.restoreTint();
    } else if (this.berserk > 0) this.sprite.setTint(Math.floor(this.berserk * 8) % 2 ? 0xff6a4a : 0xff9a6a);
    else if (calmed) this.restoreTint();
    // Blink while invulnerable.
    this.sprite.setAlpha(this.iframes > 0 && this.flash <= 0 ? (Math.floor(this.iframes * 20) % 2 ? 0.55 : 1) : 1);
    const ratio = Phaser.Math.Clamp(this.hp / this.stats.maxHp, 0, 1);
    this.hpBack.setPosition(this.x, this.y + 62);
    this.hpFill.setPosition(this.x - 45, this.y + 62).setDisplaySize(90 * ratio, 9).setTint(ratio < 0.3 ? 0xff4d5e : 0x5ad15a);
  }

  /** Back to normal colours after a hit flash (or the borrowed sheet's colour). */
  private restoreTint(): void {
    if (this.tint) this.sprite.setTint(this.tint);
    else this.sprite.clearTint();
  }
}
