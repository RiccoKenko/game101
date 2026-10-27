import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { ARROW_STORM, BERSERK, DASH, METEOR, SHIELD_CHARGE, ULT, ultCost } from '../config/abilities';
import { type CharacterDef } from '../config/characters';
import { hpMultiplier } from '../core/waves';
import { type GameCtx } from './context';
import { type Enemy } from './Enemies';
import { type WeaponSystem } from './Weapons';

/** The hero's two buttons: the dash, and the ultimate charged by defeating monsters. */
export class Abilities {
  /** Seconds until the dash is ready again. */
  dashWait = 0;
  /** Ultimate energy gathered (ready at `cost`). */
  energy = 0;
  private dashLeft = 0;
  private dashVX = 0;
  private dashVY = 0;
  private ghostT = 0;
  private stormLeft = 0;
  private stormT = 0;
  /** Seconds the ultimate is still going: what it defeats doesn't charge the next one. */
  private ulting = 0;
  /** Until the Swordman's next Berserk sweep. */
  private sweepT = 0;
  /** Monsters the Swordman's Shield Charge has already hit on this dash. */
  private charged = new Set<number>();

  constructor(
    private ctx: GameCtx,
    private hero: CharacterDef,
    private weapons: WeaponSystem,
  ) {}

  get dashing(): boolean {
    return this.dashLeft > 0;
  }

  get cost(): number {
    return ultCost(this.ctx.runTime);
  }

  get ready(): boolean {
    return this.energy >= this.cost;
  }

  /** Called for every defeated monster. */
  onKill(e: Enemy): void {
    if (this.ulting > 0) return;
    this.energy = Math.min(this.cost, this.energy + (e.isBoss ? ULT.boss : e.elite ? ULT.elite : ULT.kill));
  }

  /** Dashes the way the hero is steering (or facing). Returns false while it is cooling down. */
  dash(dx: number, dy: number): boolean {
    if (this.dashWait > 0 || this.dashing) return false;
    const p = this.ctx.player;
    const len = Math.hypot(dx, dy);
    const ux = len > 0.1 ? dx / len : p.faceX;
    const uy = len > 0.1 ? dy / len : p.faceY;
    this.dashWait = DASH.cooldown;
    p.iframes = Math.max(p.iframes, DASH.iframes);
    const { fx } = this.ctx;
    if (this.hero.id === 'mage') {
      // The Mage blinks: gone in a puff, there at once.
      fx.deathPuff(p.x, p.y - 30, 1.1, 0xc9a8ff);
      fx.ring(p.x, p.y, 120, 0xc9a8ff);
      p.x += ux * DASH.distance;
      p.y += uy * DASH.distance;
      fx.deathPuff(p.x, p.y - 30, 1.1, 0xc9a8ff);
      fx.sparkle(p.x, p.y - 30, 6, 0xe2d0ff);
      audio.sfx('zap', 0.6);
      return true;
    }
    this.dashLeft = DASH.time;
    this.charged.clear();
    this.dashVX = (ux * DASH.distance) / DASH.time;
    this.dashVY = (uy * DASH.distance) / DASH.time;
    this.ghostT = 0;
    fx.dust(p.x, p.y, 4);
    audio.sfx('click', 0.8);
    return true;
  }

  /** Fires the ultimate if it is charged. */
  ultimate(): boolean {
    if (!this.ready) return false;
    this.energy = 0;
    const { player: p, fx, enemies, scene } = this.ctx;
    p.iframes = Math.max(p.iframes, ULT.iframes);
    this.ctx.slowMo(ULT.slowScale, ULT.slowTime);
    this.ctx.shake(380, 0.01);
    scene.cameras.main.flash(220, 255, 244, 214);
    fx.ring(p.x, p.y, 420, this.hero.id === 'archer' ? 0xfff1b8 : 0xff9a3d);
    audio.sfx('levelup');
    // Leaders and bosses in sight take a share of their health at once, so the ultimate matters against them too.
    for (const e of enemies.inRect(this.ctx.view())) {
      if (e.isBoss) enemies.damage(e, e.maxHp * ULT.bossShare, p.x, p.y, 0, false);
    }
    if (this.hero.id === 'mage') {
      this.ulting = METEOR.fall + 0.6;
      this.meteor();
    } else if (this.hero.id === 'swordman') {
      // Berserk: a red rage, double damage and sword sweeps all around for a few seconds.
      this.ulting = BERSERK.time + 0.6;
      p.berserk = BERSERK.time;
      this.sweepT = 0;
    } else {
      this.ulting = ARROW_STORM.time + 0.6;
      this.stormLeft = ARROW_STORM.time;
      this.stormT = 0;
    }
    return true;
  }

  /** Damage of one ultimate hit right now. */
  private hit(): number {
    return ULT.hit * hpMultiplier(this.ctx.runTime) * this.ctx.monsterHp() * this.ctx.player.stats.damageMult;
  }

  /** The Mage's Meteor: a huge rock falls on the hero's spot, blasts everything around and freezes the survivors. */
  private meteor(): void {
    const { scene, player, fx, enemies } = this.ctx;
    const x = player.x;
    const y = player.y;
    const rock = scene.add.image(x + 520, y - 1150, 'meteor').setDepth(60).setScale(3.2);
    rock.setRotation(Math.atan2(1150, -520));
    fx.decal('shock', x, y, METEOR.radius * 2, METEOR.radius, 0xff5a3c, 0.5, METEOR.fall + 0.1);
    scene.tweens.add({
      targets: rock,
      x,
      y,
      duration: METEOR.fall * 1000,
      ease: 'Quad.easeIn',
      onComplete: () => {
        rock.destroy();
        const damage = this.hit() * METEOR.hits;
        fx.explosion(x, y, METEOR.radius * 0.7);
        fx.shockwave(x, y, METEOR.radius, 0xffb36b);
        for (const [ms, dx, dy] of [[90, -180, -60], [180, 170, 50], [270, -40, 150]]) {
          scene.time.delayedCall(ms, () => fx.explosion(x + dx, y + dy, 200));
        }
        enemies.forEachInRadius(x, y, METEOR.radius, (e) => {
          if (!enemies.damage(e, damage, x, y, 2.5, false) && e.active) enemies.freezeSolid(e, METEOR.freeze);
        });
        audio.sfx('explosion');
        this.ctx.shake(420, 0.014);
        this.ctx.hitStop(0.08);
      },
    });
  }

  update(dt: number): void {
    this.dashWait = Math.max(0, this.dashWait - dt);
    this.ulting = Math.max(0, this.ulting - dt);
    const p = this.ctx.player;
    if (this.dashLeft > 0) {
      const step = Math.min(dt, this.dashLeft);
      this.dashLeft -= step;
      p.x += this.dashVX * step;
      p.y += this.dashVY * step;
      this.ghostT -= dt;
      if (this.ghostT <= 0) {
        this.ghostT = 0.035;
        this.ghost();
      }
      if (this.hero.id === 'swordman') this.shieldCharge();
    }
    if (p.berserk > 0) {
      this.sweepT -= dt;
      if (this.sweepT <= 0) {
        this.sweepT = BERSERK.every;
        this.sweep();
      }
    }
    if (this.stormLeft > 0) {
      this.stormLeft -= dt;
      this.stormT -= dt;
      if (this.stormT <= 0) {
        this.stormT = ARROW_STORM.every;
        this.weapons.rain(this.hit(), ARROW_STORM.arrows, 'arrow_storm');
      }
    }
  }

  /** Shield Charge: monsters in the Swordman's way are hit once and shoved aside. */
  private shieldCharge(): void {
    const { player: p, enemies, fx } = this.ctx;
    const damage = this.hit() * SHIELD_CHARGE.hits;
    enemies.forEachInRadius(p.x, p.y, SHIELD_CHARGE.radius, (e) => {
      if (this.charged.has(e.uid)) return;
      this.charged.add(e.uid);
      enemies.damage(e, damage, p.x - this.dashVX * 0.05, p.y - this.dashVY * 0.05, SHIELD_CHARGE.knockback, false);
      fx.sparksAt(e.x, e.y - 20, 4, 0xd8e6ff);
    });
  }

  /** One Berserk sweep: a red ring of sword cuts all around the Swordman. */
  private sweep(): void {
    const { player: p, enemies, fx } = this.ctx;
    const damage = this.hit() * BERSERK.hits;
    fx.ring(p.x, p.y - 20, BERSERK.radius, 0xff5a3c, 'ring', 35, 300);
    enemies.forEachInRadius(p.x, p.y, BERSERK.radius, (e) => {
      enemies.damage(e, damage, p.x, p.y, 1.2, false);
    });
    audio.sfx('hit', 0.6);
  }

  /** A fading copy of the hero left behind on the dash. */
  private ghost(): void {
    const s = this.ctx.player.sprite;
    const g = this.ctx.scene.add
      .image(s.x, s.y, s.texture.key, s.frame.name)
      .setOrigin(s.originX, s.originY)
      .setScale(s.scaleX, s.scaleY)
      .setFlipX(s.flipX)
      .setDepth(19)
      .setTint(this.hero.id === 'swordman' ? 0xd8e6ff : 0x8fd8ff)
      .setAlpha(0.55);
    g.setBlendMode(Phaser.BlendModes.ADD);
    this.ctx.scene.tweens.add({ targets: g, alpha: 0, duration: 260, onComplete: () => g.destroy() });
  }
}
