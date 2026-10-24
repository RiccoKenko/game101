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

type ProjKind = 'arrow' | 'dagger' | 'boomerang' | 'bomb' | 'bolt' | 'star' | 'shard' | 'flask';

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
  /** Magic Bolt: the enemy it is homing on. */
  target: Enemy | null = null;
  /** Poison Flask: how long its puddle lasts. */
  duration = 0;
  /** A motion streak behind arrows and daggers; the ground shadow under a bomb. */
  constructor(readonly sprite: Phaser.GameObjects.Image, readonly trail: Phaser.GameObjects.Image) {}
}

/** Streak colour, length and thickness per projectile texture. */
const TRAILS: Record<string, [number, number, number]> = {
  arrow: [0xffffff, 90, 10],
  arrow_storm: [0x9fdcff, 140, 16],
  dagger: [0xd8e8ff, 70, 8],
  dagger_gold: [0xffd36b, 84, 10],
  bolt: [0x8fd8ff, 80, 16],
  star_bolt: [0xffe08a, 110, 14],
  ice_shard: [0xd4f4ff, 60, 8],
};

/** A Poison Flask puddle: hurts what stands in it every so often, then dries up. */
interface Zone {
  x: number;
  y: number;
  r: number;
  damage: number;
  left: number;
  tick: number;
  img: Phaser.GameObjects.Image;
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
  // Afterimages trailing each axe.
  ghosts: Phaser.GameObjects.Image[];
  // Aura (and Blizzard's frosty disc, with `ring` as its edge)
  aura?: Phaser.GameObjects.Image;
  ring?: Phaser.GameObjects.Image;
  auraSize: number;
  /** 1 on each damage tick, easing back to 0 (the aura swells). */
  pulse: number;
}

const AXE_RADIUS = 175;
const AURA_RADIUS = 135;
const BOMB_RADIUS = 150;
const BOLT_RADIUS = 75;
const SLASH_RADIUS = 150;
const PUDDLE_RADIUS = 95;
const BLIZZARD_RADIUS = 190;
const STAR_RADIUS = 80;
/** How fast a Magic Bolt turns toward its target (radians per second). */
const BOLT_TURN = 7;

export class WeaponSystem {
  private runtimes: WeaponRuntime[] = [];
  private projectiles: Projectile[] = [];
  private zones: Zone[] = [];
  private clock = 0;
  /** HP per second healed by Sanctuary. */
  regen = 0;

  constructor(private ctx: GameCtx) {}

  /** Re-derives effective weapon stats after any level-up, evolution or stat change. */
  sync(weapons: OwnedWeapon[], stats: PlayerStats): void {
    for (const owned of weapons) {
      let rt = this.runtimes.find((r) => r.owned.id === owned.id);
      if (!rt) {
        rt = { owned, stats: WEAPONS[owned.id].levels[0], timer: 0.3, axes: [], axeAngle: 0, axeActive: false, axeHits: new Map(), ghosts: [], auraSize: 0, pulse: 0 };
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
      while (rt.ghosts.length < rt.axes.length * 2) rt.ghosts.push(scene.add.image(0, 0, tex).setDepth(24).setTintFill(0xfff4d6));
      while (rt.ghosts.length > rt.axes.length * 2) rt.ghosts.pop()!.destroy();
      const scale = rt.owned.evolved ? 1 : 0.9 + (rt.stats.area - 1) * 0.5;
      for (const a of [...rt.axes, ...rt.ghosts]) a.setTexture(tex).setScale(scale);
      if (rt.owned.evolved) rt.axeActive = true;
    }
    if (id === 'frost' && rt.owned.evolved) {
      // Blizzard: a pale frosty disc around the hero with an icy edge.
      if (!rt.aura) {
        rt.aura = scene.add.image(0, 0, 'glow').setDepth(3).setTint(0x9fd8ff).setAlpha(0.3);
        rt.ring = scene.add.image(0, 0, 'ring').setDepth(3).setTint(0xd8f4ff).setAlpha(0.5);
        scene.tweens.add({ targets: rt.ring, alpha: { from: 0.35, to: 0.6 }, duration: 600, yoyo: true, repeat: -1 });
      }
      rt.auraSize = BLIZZARD_RADIUS * rt.stats.area * 2;
      rt.aura.setDisplaySize(rt.auraSize * 1.1, rt.auraSize * 1.1);
      rt.ring?.setDisplaySize(rt.auraSize, rt.auraSize);
    }
    if (id === 'aura') {
      const tex = rt.owned.evolved ? 'aura_holy' : 'aura';
      if (!rt.aura) {
        rt.aura = scene.add.image(0, 0, tex).setDepth(3);
        scene.tweens.add({ targets: rt.aura, alpha: { from: 0.75, to: 1 }, duration: 700, yoyo: true, repeat: -1 });
      }
      rt.auraSize = AURA_RADIUS * rt.stats.area * 2;
      rt.aura.setTexture(tex).setDisplaySize(rt.auraSize, rt.auraSize);
    }
  }

  private obtain(kind: ProjKind, texture: string): Projectile {
    let p = this.projectiles.find((o) => !o.active);
    if (!p) {
      const scene = this.ctx.scene;
      p = new Projectile(scene.add.image(0, 0, texture).setDepth(28), scene.add.image(0, 0, 'streak').setDepth(27));
      this.projectiles.push(p);
    }
    p.active = true;
    p.kind = kind;
    p.age = 0;
    p.returning = false;
    p.knockback = 1;
    p.hits.clear();
    p.target = null;
    p.sprite.setTexture(texture).setVisible(true).setScale(1).setRotation(0);
    if (kind === 'bomb' || kind === 'flask') {
      p.trail.setTexture('shadow').setOrigin(0.5).setBlendMode(Phaser.BlendModes.NORMAL).clearTint().setAlpha(1).setVisible(true);
    } else if (kind === 'boomerang') {
      // It spins, so a straight streak would look wrong.
      p.trail.setVisible(false);
    } else {
      const [color, , thick] = TRAILS[texture] ?? TRAILS.arrow;
      p.trail.setTexture('streak').setOrigin(1, 0.5).setBlendMode(Phaser.BlendModes.NORMAL).setTint(color).setAlpha(0.6);
      p.trail.setDisplaySize(1, thick).setVisible(true);
    }
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
        case 'frost':
          if (!rt.owned.evolved) {
            rt.timer -= dt;
            if (rt.timer <= 0) {
              rt.timer = s.cooldown;
              this.fire(rt);
            }
            break;
          }
          this.updateBlizzard(rt, dt);
          break;
        case 'aura':
          rt.pulse *= Math.exp(-8 * dt);
          if (rt.aura) {
            const size = rt.auraSize * (1 + 0.07 * rt.pulse);
            rt.aura.setPosition(player.x, player.y + 10).setDisplaySize(size, size);
            rt.aura.rotation += dt * 0.5;
            if (rt.owned.evolved && Math.random() < dt * 6) {
              const a = Math.random() * Math.PI * 2;
              const r = Math.random() * rt.auraSize * 0.45;
              this.ctx.fx.sparkle(player.x + Math.cos(a) * r, player.y + 10 + Math.sin(a) * r, 1, 0xffe9a3);
            }
          }
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
    this.updateZones(dt);
  }

  /** The active boss if it's within range of the hero (weapons focus it so crowds can't shield it). */
  private bossInRange(range: number): Enemy | undefined {
    const { player, enemies } = this.ctx;
    return enemies.alive.find((e) => e.isBoss && e.active && Math.hypot(e.x - player.x, e.y - player.y) < range);
  }

  private fire(rt: WeaponRuntime): void {
    const { player, enemies } = this.ctx;
    const s = rt.stats;
    const evolved = rt.owned.evolved;
    switch (rt.owned.id) {
      case 'bow': {
        // Arrows go for the boss when it's in range, otherwise the closest enemy.
        const target = this.bossInRange(950) ?? enemies.nearest(player.x, player.y, 950);
        const base = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.faceY, player.faceX);
        const spread = evolved ? 0.22 : 0.16;
        const bow = this.launchPoint(rt, base);
        for (let i = 0; i < s.amount; i++) {
          const a = base + (i - (s.amount - 1) / 2) * spread;
          this.shoot('arrow', evolved ? 'arrow_storm' : 'arrow', a, s, 22 * s.area, bow);
        }
        this.ctx.fx.muzzle(bow.x, bow.y, evolved ? 0x9fdcff : 0xfff1b8);
        audio.sfx('shoot');
        break;
      }
      case 'bolt': {
        if (evolved) {
          this.starfall(s);
          break;
        }
        // Each bolt picks its own target (the boss first), flies out in a fan and curves in on it.
        const targets = enemies.nearestN(player.x, player.y, s.amount, 900);
        const boss = this.bossInRange(900);
        if (boss) targets.unshift(boss);
        const first = targets[0];
        const base = first ? Math.atan2(first.y - player.y, first.x - player.x) : Math.atan2(player.faceY, player.faceX);
        const from = this.launchPoint(rt, base);
        for (let i = 0; i < s.amount; i++) {
          const a = base + (i - (s.amount - 1) / 2) * 0.55;
          const p = this.shoot('bolt', 'bolt', a, s, 24 * s.area, from);
          p.target = targets.length ? targets[i % targets.length] : null;
          p.life = 2;
        }
        if (player.primary === 'bolt') this.ctx.fx.cast(from.x, from.y, player.x, player.y + 42, 0x8fd8ff);
        else this.ctx.fx.muzzle(from.x, from.y, 0x8fd8ff);
        audio.sfx('zap', 0.6);
        break;
      }
      case 'frost': {
        const target = this.bossInRange(850) ?? enemies.nearest(player.x, player.y, 850);
        const base = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.faceY, player.faceX);
        const from = this.launchPoint(rt, base);
        for (let i = 0; i < s.amount; i++) {
          const a = base + (i - (s.amount - 1) / 2) * 0.17;
          this.shoot('shard', 'ice_shard', a, s, 18 * s.area, from);
        }
        audio.sfx('shoot', 0.7);
        break;
      }
      case 'slash': {
        // In front first (the way the hero last moved), then behind.
        const dir = player.faceX < 0 ? -1 : 1;
        for (let i = 0; i < s.amount; i++) this.swing(i % 2 ? -dir : dir, s, i * 0.12);
        break;
      }
      case 'flask': {
        const inView = enemies.inRect(this.ctx.view());
        for (let i = 0; i < s.amount; i++) {
          const target: Enemy | undefined = inView.length ? inView[Math.floor(this.ctx.rng() * inView.length)] : undefined;
          const a = this.ctx.rng() * Math.PI * 2;
          const p = this.obtain('flask', 'flask');
          p.sx = p.x = player.x;
          p.sy = p.y = player.y - 30;
          p.tx = target ? target.x : player.x + Math.cos(a) * 260;
          p.ty = target ? target.y : player.y + Math.sin(a) * 260;
          p.damage = s.damage;
          p.area = s.area;
          p.duration = s.duration;
          p.life = 0.55 + i * 0.08;
        }
        break;
      }
      case 'daggers': {
        const targets = enemies.nearestN(player.x, player.y, evolved ? 3 : s.amount, 900);
        const boss = this.bossInRange(900);
        if (boss) targets.unshift(boss);
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
        const boss = inView.find((e) => e.isBoss);
        for (let i = 0; i < s.amount; i++) {
          const target: Enemy | undefined = i === 0 && boss ? boss : inView.length ? inView[Math.floor(this.ctx.rng() * inView.length)] : undefined;
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
          // Where it will land: a red circle on the ground.
          const r = BOMB_RADIUS * s.area;
          this.ctx.fx.decal('shock', tx, ty, r * 2, r, 0xff5a3c, 0.55, 0.75);
        }
        break;
      }
      case 'lightning': {
        const view = this.ctx.view();
        const inView = enemies.inRect(view);
        Phaser.Utils.Array.Shuffle(inView);
        const bossIdx = inView.findIndex((e) => e.isBoss);
        if (bossIdx > 0) inView.unshift(...inView.splice(bossIdx, 1));
        const targets = inView.slice(0, s.amount);
        for (const t of targets) {
          const x = t.x;
          const y = t.y;
          this.ctx.fx.lightning(x, y, evolved ? 0xc9a8ff : 0x9fdcff);
          enemies.forEachInRadius(x, y, BOLT_RADIUS * s.area, (e) => enemies.damage(e, s.damage, x, y, 0.5));
        }
        if (targets.length) audio.sfx('zap');
        break;
      }
      default:
        break;
    }
  }

  /**
   * Where the hero's own weapon (the Bow for the archer, Magic Bolt for the mage) shoots from: the bow or the
   * casting hand, and the hero plays the shot. Any other weapon fires from the body without an animation.
   */
  private launchPoint(rt: WeaponRuntime, angle: number): { x: number; y: number } {
    const { player } = this.ctx;
    if (player.primary !== rt.owned.id) return { x: player.x + Math.cos(angle) * 30, y: player.y - 10 + Math.sin(angle) * 30 };
    player.shootAt(angle);
    return player.attackPoint(angle);
  }

  /** Moon Slash: a crescent sweep on one side of the hero, hitting everything in a half circle. */
  private swing(dir: number, s: WeaponStats, delay: number): void {
    const scene = this.ctx.scene;
    scene.time.delayedCall(delay * 1000, () => {
      const { player, enemies, fx } = this.ctx;
      const R = SLASH_RADIUS * s.area;
      const cx = player.x + dir * R * 0.55;
      const cy = player.y - 10;
      const img = scene.add.image(cx, cy, 'slash').setDepth(26);
      const k = (R * 2) / img.height;
      img.setScale(dir * k * 0.75, k * 0.75);
      scene.tweens.add({ targets: img, scaleX: dir * k, scaleY: k, alpha: 0, x: cx + dir * 24, duration: 340, ease: 'Cubic.easeIn', onComplete: () => img.destroy() });
      enemies.forEachInRadius(cx, cy, R * 0.8, (e) => {
        if ((e.x - player.x) * dir < -20) return;
        enemies.damage(e, s.damage, player.x, player.y, 1.8);
        fx.sparksAt(e.x, e.y, 3, 0xe8f4ff);
      });
      audio.sfx('shoot', 0.6);
    });
  }

  /** Starfall: stars streak down from the sky onto enemies on screen (the boss first) and burst. */
  private starfall(s: WeaponStats): void {
    const { enemies, player } = this.ctx;
    const inView = enemies.inRect(this.ctx.view());
    Phaser.Utils.Array.Shuffle(inView);
    const bossIdx = inView.findIndex((e) => e.isBoss);
    if (bossIdx > 0) inView.unshift(...inView.splice(bossIdx, 1));
    for (let i = 0; i < s.amount; i++) {
      const t = inView[i];
      const a = this.ctx.rng() * Math.PI * 2;
      const tx = t ? t.x : player.x + Math.cos(a) * 280;
      const ty = t ? t.y : player.y + Math.sin(a) * 280;
      const p = this.obtain('star', 'star_bolt');
      p.sx = tx + 260;
      p.sy = ty - 620;
      p.tx = tx;
      p.ty = ty;
      p.vx = p.tx - p.sx;
      p.vy = p.ty - p.sy;
      p.x = p.sx;
      p.y = p.sy;
      p.damage = s.damage;
      p.area = s.area;
      p.life = 0.32 + i * 0.07;
      p.sprite.setRotation(Math.atan2(p.vy, p.vx)).setScale(1.2);
    }
  }

  /** Blizzard: a storm around the hero that damages and slows everything in it, with snow whirling about. */
  private updateBlizzard(rt: WeaponRuntime, dt: number): void {
    const s = rt.stats;
    const { player, enemies, fx } = this.ctx;
    const R = BLIZZARD_RADIUS * s.area;
    rt.aura?.setPosition(player.x, player.y + 10);
    rt.ring?.setPosition(player.x, player.y + 10);
    if (Math.random() < dt * 22) {
      const a = Math.random() * Math.PI * 2;
      const r = R * (0.3 + Math.random() * 0.65);
      fx.sparkle(player.x + Math.cos(a) * r, player.y + 10 + Math.sin(a) * r, 1, Math.random() < 0.5 ? 0xffffff : 0xbfe8ff);
    }
    rt.timer -= dt;
    if (rt.timer > 0) return;
    rt.timer = s.cooldown;
    enemies.forEachInRadius(player.x, player.y, R, (e) => {
      enemies.damage(e, s.damage, player.x, player.y, 0.2);
      e.slow = Math.max(e.slow, 0.8);
    });
  }

  private updateZones(dt: number): void {
    const { enemies, fx } = this.ctx;
    for (let i = this.zones.length - 1; i >= 0; i--) {
      const z = this.zones[i];
      z.left -= dt;
      z.tick -= dt;
      z.img.setAlpha(Math.min(0.6, z.left / 0.4));
      if (z.tick <= 0) {
        z.tick = 0.4;
        enemies.forEachInRadius(z.x, z.y, z.r, (e) => {
          enemies.damage(e, z.damage, z.x, z.y, 0, false);
          if (Math.random() < 0.3) fx.sparksAt(e.x, e.y, 1, 0x9be64a);
        });
      }
      if (z.left <= 0) {
        z.img.destroy();
        this.zones.splice(i, 1);
      }
    }
  }

  /** Launches a projectile from `from` (default: just off the hero's body). */
  private shoot(kind: ProjKind, texture: string, angle: number, s: WeaponStats, radius: number, from?: { x: number; y: number }): Projectile {
    const { player } = this.ctx;
    const p = this.obtain(kind, texture);
    p.x = from?.x ?? player.x + Math.cos(angle) * 30;
    p.y = from?.y ?? player.y - 10 + Math.sin(angle) * 30;
    p.vx = Math.cos(angle) * s.speed;
    p.vy = Math.sin(angle) * s.speed;
    p.damage = s.damage;
    p.pierce = s.pierce;
    p.radius = radius;
    p.life = 1.4;
    // Attack area (Spell Tome, the mage's perk) makes projectiles bigger as well as hitting wider.
    p.area = s.area;
    p.sprite.setRotation(angle).setScale(Math.max(kind === 'arrow' ? 1 : 0.8, s.area * (kind === 'arrow' ? 0.9 : 1)));
    if (p.trail.visible) p.trail.displayHeight *= Math.max(1, s.area);
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
    for (const g of rt.ghosts) g.setVisible(rt.axeActive);
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
      // Two fading afterimages lag behind each axe along its circle.
      for (let k = 1; k <= 2; k++) {
        const g = rt.ghosts[i * 2 + k - 1];
        const ga = ang - k * 0.2 * Math.sign(s.speed || 1);
        g.setPosition(player.x + Math.cos(ga) * R, player.y + Math.sin(ga) * R)
          .setRotation(this.clock * 14 - k * 0.5)
          .setAlpha(img.alpha * (k === 1 ? 0.3 : 0.13));
      }
      enemies.forEachInRadius(x, y, hitR, (e) => {
        const next = rt.axeHits.get(e.uid) ?? 0;
        if (this.clock < next) return;
        rt.axeHits.set(e.uid, this.clock + 0.45);
        enemies.damage(e, s.damage, player.x, player.y, evolved ? 2.2 : 1.2);
        this.ctx.fx.sparksAt(e.x, e.y, 3, e.color);
      });
    }
    if (rt.axeHits.size > 600) rt.axeHits.clear();
  }

  private auraTick(rt: WeaponRuntime): void {
    const s = rt.stats;
    const { player, enemies } = this.ctx;
    const evolved = !!rt.owned.evolved;
    rt.pulse = 1;
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
        const gx = Phaser.Math.Linear(p.sx, p.tx, u);
        const gy = Phaser.Math.Linear(p.sy, p.ty, u);
        const sw = 30 + 30 * (1 - Math.sin(u * Math.PI));
        p.trail.setPosition(gx, gy + 18).setDisplaySize(sw, sw * 0.32);
        if (u >= 1) {
          const r = BOMB_RADIUS * p.area;
          this.ctx.fx.explosion(p.tx, p.ty, r);
          enemies.forEachInRadius(p.tx, p.ty, r, (e) => enemies.damage(e, p.damage, p.tx, p.ty, 1.6));
          audio.sfx('explosion');
          this.ctx.shake(110, 0.004);
          this.release(p);
        }
        continue;
      }

      if (p.kind === 'flask') {
        const dur = 0.55;
        const u = Math.min(1, p.age / dur);
        p.x = Phaser.Math.Linear(p.sx, p.tx, u);
        p.y = Phaser.Math.Linear(p.sy, p.ty, u) - Math.sin(u * Math.PI) * 150;
        p.sprite.setPosition(p.x, p.y).setRotation(p.age * 12);
        const sw = 24 + 24 * (1 - Math.sin(u * Math.PI));
        p.trail.setPosition(Phaser.Math.Linear(p.sx, p.tx, u), Phaser.Math.Linear(p.sy, p.ty, u) + 18).setDisplaySize(sw, sw * 0.32);
        if (u >= 1) {
          const r = PUDDLE_RADIUS * p.area;
          const img = this.ctx.scene.add.image(p.tx, p.ty, 'puddle').setDepth(2).setDisplaySize(r * 2, r * 1.05);
          this.zones.push({ x: p.tx, y: p.ty, r, damage: p.damage, left: p.duration, tick: 0, img });
          this.ctx.fx.sparksAt(p.tx, p.ty, 6, 0xb6f26a);
          audio.sfx('hit', 0.6);
          this.release(p);
        }
        continue;
      }

      if (p.kind === 'star') {
        const u = Math.min(1, p.age / p.life);
        p.x = Phaser.Math.Linear(p.sx, p.tx, u);
        p.y = Phaser.Math.Linear(p.sy, p.ty, u);
        p.sprite.setPosition(p.x, p.y);
        p.trail.setPosition(p.x, p.y).setRotation(Math.atan2(p.vy, p.vx));
        p.trail.displayWidth = 110 * Math.min(1, p.age / 0.07);
        if (u >= 1) {
          const r = STAR_RADIUS * p.area;
          this.ctx.fx.ring(p.tx, p.ty, r * 1.3, 0xffe08a);
          this.ctx.fx.sparkle(p.tx, p.ty, 4, 0xfff1b8);
          enemies.forEachInRadius(p.tx, p.ty, r, (e) => enemies.damage(e, p.damage, p.tx, p.ty, 0.8));
          audio.sfx('zap', 0.5);
          this.release(p);
        }
        continue;
      }

      if (p.kind === 'bolt') {
        // A shimmering orb that leaves sparkles behind.
        p.sprite.setScale(p.area * (1 + 0.14 * Math.sin(p.age * 32)));
        if (Math.random() < dt * 22) this.ctx.fx.sparkle(p.x, p.y, 1, Math.random() < 0.5 ? 0xffffff : 0x8fd8ff);
        // Steer toward the target; if it died, find the next one nearby.
        if (!p.target || !p.target.active) p.target = enemies.nearest(p.x, p.y, 600);
        if (p.target) {
          const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
          const cur = Math.atan2(p.vy, p.vx);
          const turn = Phaser.Math.Angle.Wrap(want - cur);
          const a = cur + Phaser.Math.Clamp(turn, -BOLT_TURN * dt, BOLT_TURN * dt);
          const sp = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(a) * sp;
          p.vy = Math.sin(a) * sp;
          p.sprite.setRotation(a);
        }
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
      const len = (TRAILS[p.sprite.texture.key] ?? TRAILS.arrow)[1] * Math.min(1, p.age / 0.07);
      p.trail.setPosition(p.x, p.y).setRotation(Math.atan2(p.vy, p.vx));
      p.trail.displayWidth = Math.max(1, len);
      if (p.life <= 0) {
        this.release(p);
        continue;
      }

      enemies.forEachInRadius(p.x, p.y, p.radius, (e) => {
        if (!p.active) return;
        const until = p.hits.get(e.uid);
        if (until !== undefined && this.clock < until) return;
        p.hits.set(e.uid, p.kind === 'boomerang' ? this.clock + 0.35 : Infinity);
        enemies.damage(e, p.damage, p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.kind === 'boomerang' ? 0.6 : p.kind === 'shard' ? 0.4 : 1);
        this.ctx.fx.sparksAt(p.x, p.y, 3, p.kind === 'shard' ? 0xd4f4ff : p.kind === 'bolt' ? 0x8fd8ff : e.color);
        if (p.kind === 'bolt') {
          this.ctx.fx.ring(p.x, p.y, 46 * p.area, 0x8fd8ff, 'ring', 35, 240);
          this.ctx.fx.sparkle(p.x, p.y, 2, 0xffffff);
        }
        if (p.kind === 'shard') e.slow = Math.max(e.slow, 1.6);
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
    p.trail.setVisible(false);
  }

  destroy(): void {
    for (const rt of this.runtimes) {
      rt.axes.forEach((a) => a.destroy());
      rt.ghosts.forEach((g) => g.destroy());
      rt.aura?.destroy();
      rt.ring?.destroy();
    }
    this.runtimes = [];
    this.zones.forEach((z) => z.img.destroy());
    this.zones = [];
  }
}
