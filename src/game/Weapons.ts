import Phaser from 'phaser';
import { audio } from '../audio/audio';
import {
  AMOUNT_BOOSTED,
  ECHO_DELAY,
  EVOLUTIONS,
  RUNE_POWER,
  WEAPONS,
  type WeaponStats,
} from '../config/weapons';
import { TALENT, type TalentId } from '../config/talents';
import { type OwnedWeapon } from '../core/progression';
import { type PlayerStats } from '../core/stats';
import { type GameCtx } from './context';
import { type Enemy } from './Enemies';

type ProjKind = 'arrow' | 'dagger' | 'boomerang' | 'bomb' | 'bolt' | 'star' | 'shard' | 'flask' | 'splinter' | 'shuriken' | 'spear' | 'wisp';

/** Projectiles that the Seeker Rune bends toward monsters. */
const SEEKERS: ReadonlySet<ProjKind> = new Set<ProjKind>(['arrow', 'dagger', 'shard', 'splinter', 'shuriken', 'spear']);

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
  /** Poison Flask: how long its puddle lasts; Plague Cloud's puddles also slow. */
  duration = 0;
  plague = false;
  /** Bounce Rune: enemies it can still bounce on to after its last pierce. */
  bounces = 0;
  /** A falling Meteor (bomb evolved) rather than a Starfall star. */
  meteor = false;
  /** Split Rune: bursts into splinters on its first hit (arrows, daggers, bolts, shards; never a splinter). */
  canSplit = false;
  /** Turn rate toward enemies (Star Storm, Seeker Rune), radians per second; 0 = flies straight. */
  homing = 0;
  /** Dragon Lance (finishes off the wounded), Soul Harvest (bursts heal the hero). */
  lance = false;
  harvest = false;
  /** Spirit Wisp: the speed it dives at. */
  speed = 0;
  /** A motion streak behind arrows and daggers; the ground shadow under a bomb. */
  constructor(readonly sprite: Phaser.GameObjects.Image, readonly trail: Phaser.GameObjects.Image) {}
}

/** Streak colour, length and thickness per projectile texture. */
const TRAILS: Record<string, [number, number, number]> = {
  arrow: [0xffffff, 90, 10],
  arrow_storm: [0x9fdcff, 140, 16],
  dagger: [0xd8e8ff, 70, 8],
  dagger_gold: [0xffd36b, 84, 10],
  spear: [0xffffff, 120, 12],
  spear_dragon: [0xff8a3d, 160, 18],
  bolt: [0x8fd8ff, 80, 16],
  star_bolt: [0xffe08a, 110, 14],
  ice_shard: [0xd4f4ff, 60, 8],
  meteor: [0xff8a3d, 170, 30],
};

/** A Prism Beam: a line of light from the hero that hit everything along it as it fired, now fading. */
interface Beam {
  glow: Phaser.GameObjects.Image;
  core: Phaser.GameObjects.Image;
  angle: number;
  len: number;
  width: number;
  life: number;
  dur: number;
}

/** A Whirlwind wandering about, dragging monsters in and grinding them down. */
interface Twister {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  vx: number;
  vy: number;
  age: number;
  life: number;
  r: number;
  damage: number;
  tick: number;
  target: Enemy | null;
}

/** A Spike Trap waiting on the ground for a monster to step on it. */
interface Trap {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  /** Seconds until it is armed, and until it rusts away untouched. */
  arm: number;
  life: number;
  r: number;
  damage: number;
  /** Glacier Mines: the burst freezes. */
  frost: boolean;
}

/** A Poison Flask puddle: hurts what stands in it every so often, then dries up. */
interface Zone {
  x: number;
  y: number;
  r: number;
  damage: number;
  left: number;
  tick: number;
  slow: boolean;
  /** A Flame Trail patch (flickers; Inferno Road's set monsters on fire). */
  fire: boolean;
  burn: boolean;
  img: Phaser.GameObjects.Image;
}

/** A Sentry Turret set down on the ground, shooting at the nearest monster until it wears out. */
interface Turret {
  img: Phaser.GameObjects.Image;
  x: number;
  y: number;
  life: number;
  shot: number;
  stats: WeaponStats;
  /** Golden Ballista: twin piercing bolts. */
  gold: boolean;
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
  /** Things that circle the hero: Ward Orbs, a Cyclone's twisters, a Rainbow Ray's beams (with `cores`). */
  orbs: Phaser.GameObjects.Image[];
  cores: Phaser.GameObjects.Image[];
  orbAngle: number;
  /** Enemy uid -> time it may be hit again by this weapon's orbs, beams or twisters. */
  orbHits: Map<number, number>;
  /** Echo Rune: seconds until the last attack goes off again (0 = none waiting). */
  echo: number;
  /** Attacks made (the Giant Rune makes every n-th one giant). */
  shots: number;
}

const AXE_RADIUS = 175;
const AURA_RADIUS = 135;
const BOMB_RADIUS = 150;
const BOLT_RADIUS = 75;
const SLASH_RADIUS = 150;
const PUDDLE_RADIUS = 95;
const BLIZZARD_RADIUS = 190;
const STAR_RADIUS = 80;
const BEAM_LENGTH = 820;
const BEAM_WIDTH = 34;
const RAINBOW_LENGTH = 520;
/** Beam colours, one per beam. */
const PRISM = [0x8fe8ff, 0xff8ab0, 0xffe07a, 0x9dff8a, 0xc9a8ff];
const TWISTER_RADIUS = 85;
/** Monsters this many radii from a whirlwind's middle are dragged in, this hard (px/s of pull). */
const TWISTER_PULL = 2.3;
const TWISTER_FORCE = 1500;
const TWISTER_TICK = 0.3;
const CYCLONE_ORBIT = 240;
const TRAP_RADIUS = 100;
/** A trap goes off when a monster comes this close to its middle. */
const TRAP_TRIGGER = 22;
const TRAP_ARM = 0.35;
const MAX_TRAPS = 18;
const WARD_RADIUS = 120;
const WARD_HIT = 28;
const QUAKE_RADIUS = 210;
const FLAME_RADIUS = 55;
const MAX_FLAMES = 40;
const TURRET_EVERY = 0.45;
const TURRET_RANGE = 750;
const WISP_RADIUS = 70;
/** Seconds a wisp drifts out before it picks a monster and dives. */
const WISP_DRIFT = 0.4;
/** How fast a Magic Bolt turns toward its target (radians per second). */
const BOLT_TURN = 7;

export class WeaponSystem {
  private runtimes: WeaponRuntime[] = [];
  private projectiles: Projectile[] = [];
  private zones: Zone[] = [];
  private beams: Beam[] = [];
  private twisters: Twister[] = [];
  private traps: Trap[] = [];
  private turrets: Turret[] = [];
  private clock = 0;
  /** HP per second healed by Sanctuary. */
  regen = 0;
  /** The hero's talents (some add attacks of their own: Arrow Rain, Starcaller). */
  talents: readonly TalentId[] = [];
  private rainT = 0;
  private starsT = 0;

  constructor(private ctx: GameCtx) {}

  /** Re-derives effective weapon stats after any level-up, evolution or stat change. */
  sync(weapons: OwnedWeapon[], stats: PlayerStats): void {
    for (const owned of weapons) {
      let rt = this.runtimes.find((r) => r.owned.id === owned.id);
      if (!rt) {
        rt = {
          owned,
          stats: WEAPONS[owned.id].levels[0],
          timer: 0.3,
          axes: [],
          axeAngle: 0,
          axeActive: false,
          axeHits: new Map(),
          ghosts: [],
          auraSize: 0,
          pulse: 0,
          orbs: [],
          cores: [],
          orbAngle: 0,
          orbHits: new Map(),
          echo: 0,
          shots: 0,
        };
        this.runtimes.push(rt);
      }
      rt.owned = owned;
      const base = owned.evolved ? EVOLUTIONS[owned.evolved].stats : WEAPONS[owned.id].levels[owned.level - 1];
      rt.stats = {
        ...base,
        damage: base.damage * stats.damageMult,
        cooldown: base.cooldown * stats.cooldownMult,
        area: base.area * stats.areaMult,
        duration: base.duration * stats.durationMult,
        pierce: base.pierce >= 999 ? base.pierce : base.pierce + stats.pierceBonus,
        amount:
          base.amount +
          (AMOUNT_BOOSTED.has(owned.id) && !(owned.id === 'daggers' && owned.evolved) ? stats.amountBonus : 0) +
          (owned.id === this.ctx.player.primary ? stats.primaryAmount : 0),
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
    // Ward Orbs, a Cyclone's two twisters and a Rainbow Ray's beams are always out, so they live on the runtime.
    const circling = id === 'ward' ? rt.stats.amount : rt.owned.evolved && (id === 'twister' || id === 'beam') ? rt.stats.amount : 0;
    if (circling > 0) {
      const tex = id === 'ward' ? (rt.owned.evolved ? 'ward_holy' : 'ward') : id === 'twister' ? 'twister' : 'beam';
      while (rt.orbs.length < circling) rt.orbs.push(scene.add.image(0, 0, tex).setDepth(id === 'beam' ? 27 : 26));
      while (rt.orbs.length > circling) rt.orbs.pop()!.destroy();
      rt.orbs.forEach((o, i) => {
        o.setTexture(tex);
        if (id === 'ward') o.setScale(1.4 * rt.stats.area);
        if (id === 'twister') o.setOrigin(0.5, 0.9).setScale((TWISTER_RADIUS * rt.stats.area) / 60).setAlpha(0.85);
        if (id === 'beam') o.setOrigin(0, 0.5).setTint(PRISM[i % PRISM.length]);
      });
      const cores = id === 'beam' ? circling : 0;
      while (rt.cores.length < cores) rt.cores.push(scene.add.image(0, 0, 'beam').setDepth(28).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD));
      while (rt.cores.length > cores) rt.cores.pop()!.destroy();
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
    p.bounces = 0;
    p.meteor = p.plague = p.canSplit = p.lance = p.harvest = false;
    p.homing = 0;
    p.sprite.clearTint();
    p.sprite.setTexture(texture).setVisible(true).setScale(1).setRotation(0);
    if (kind === 'bomb' || kind === 'flask') {
      p.trail.setTexture('shadow').setOrigin(0.5).setBlendMode(Phaser.BlendModes.NORMAL).clearTint().setAlpha(1).setVisible(true);
    } else if (kind === 'boomerang' || kind === 'shuriken' || kind === 'wisp') {
      // It spins (or floats), so a straight streak would look wrong.
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
    // Run and Gun (the archer): weapons reload faster while the hero is on the move.
    const cdt = dt * (player.moving ? 1 + player.stats.moveHaste : 1);
    for (const rt of this.runtimes) {
      const s = rt.stats;
      switch (rt.owned.id) {
        case 'axes':
          this.updateAxes(rt, dt);
          break;
        case 'frost':
          if (!rt.owned.evolved) {
            this.fireOnCooldown(rt, cdt);
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
          rt.timer -= cdt;
          if (rt.timer <= 0) {
            rt.timer = s.cooldown;
            this.auraTick(rt);
            this.rollEcho(rt);
          }
          if (rt.echo > 0) {
            rt.echo -= dt;
            if (rt.echo <= 0) this.auraTick(rt);
          }
          break;
        case 'ward':
          this.updateWard(rt, dt);
          break;
        case 'beam':
          if (rt.owned.evolved) {
            this.updateRainbow(rt, dt);
            break;
          }
          this.fireOnCooldown(rt, cdt);
          break;
        case 'twister':
          if (rt.owned.evolved) {
            this.updateCyclone(rt, dt);
            break;
          }
          this.fireOnCooldown(rt, cdt);
          break;
        default:
          this.fireOnCooldown(rt, cdt);
      }
    }
    this.updateTalents(dt);
    this.updateProjectiles(dt);
    this.updateZones(dt);
    this.updateBeams(dt);
    this.updateTwisters(dt);
    this.updateTraps(dt);
    this.updateTurrets(dt);
  }

  /** Attacks every `cooldown` seconds; with the Echo Rune an attack may go off again a moment later. */
  private fireOnCooldown(rt: WeaponRuntime, dt: number): void {
    rt.timer -= dt;
    if (rt.timer <= 0) {
      rt.timer = rt.stats.cooldown;
      this.fireMaybeGiant(rt);
      this.rollEcho(rt);
    }
    if (rt.echo > 0) {
      rt.echo -= dt;
      if (rt.echo <= 0) {
        this.fire(rt);
        const { player } = this.ctx;
        this.ctx.fx.ring(player.x, player.y - 10, 70, 0xc9a8ff, 'ring', 35, 240);
      }
    }
  }

  /** Giant Rune: every n-th attack hits twice as hard and comes out half again as big. */
  private fireMaybeGiant(rt: WeaponRuntime): void {
    const lv = this.ctx.runes.giant;
    rt.shots++;
    if (!lv || rt.shots % RUNE_POWER.giant[lv - 1] !== 0) {
      this.fire(rt);
      return;
    }
    const normal = rt.stats;
    rt.stats = { ...normal, damage: normal.damage * 2, area: normal.area * 1.5 };
    this.fire(rt);
    rt.stats = normal;
    const { player } = this.ctx;
    this.ctx.fx.ring(player.x, player.y - 10, 90, 0xffcc33, 'ring', 35, 260);
  }

  private rollEcho(rt: WeaponRuntime): void {
    const lv = this.ctx.runes.echo;
    const chance = (lv ? RUNE_POWER.echo[lv - 1] : 0) + this.ctx.player.stats.echoBonus;
    if (chance > 0 && rt.echo <= 0 && this.ctx.rng() < chance) rt.echo = ECHO_DELAY;
  }

  /** Talents that attack on their own: Arrow Rain (the archer) and Starcaller (the mage). */
  private updateTalents(dt: number): void {
    const st = this.ctx.player.stats;
    if (this.talents.includes('rain')) {
      this.rainT += dt;
      if (this.rainT >= TALENT.rainEvery) {
        this.rainT = 0;
        // As strong as the Bow is now (or a base Bow if it was evolved away... it never is).
        const bow = this.runtimes.find((r) => r.owned.id === 'bow');
        const damage = (bow ? bow.stats.damage : 10 * st.damageMult) * 1.5;
        this.starfall({ damage, cooldown: 0, amount: TALENT.rainArrows, pierce: 0, area: st.areaMult, speed: 0, duration: 0 }, 'arrow');
      }
    }
    if (this.talents.includes('stars')) {
      this.starsT += dt;
      if (this.starsT >= TALENT.starsEvery) {
        this.starsT = 0;
        this.starfall({ damage: 30 * st.damageMult, cooldown: 0, amount: 1, pierce: 0, area: st.areaMult, speed: 0, duration: 0 });
      }
    }
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
        for (let i = 0; i < s.amount; i++) this.swing(i % 2 ? -dir : dir, s, i * 0.12, !!evolved);
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
          p.plague = !!evolved;
          p.life = 0.55 + i * 0.08;
          if (evolved) p.sprite.setTint(0xb8f0a0);
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
          // Twin Moons fly out evenly all around; the plain boomerang fans toward the nearest enemy.
          const a = evolved ? base + (i / s.amount) * Math.PI * 2 : base + (i - (s.amount - 1) / 2) * 0.5;
          const p = this.shoot('boomerang', 'boomerang', a, s, 30 * s.area);
          p.outTime = evolved ? 0.6 : 0.5;
          p.life = 4;
          p.sprite.setScale(s.area * (evolved ? 1.15 : 1));
          if (evolved) p.sprite.setTint(0xd8ecff);
        }
        audio.sfx('shoot', 0.8);
        break;
      }
      case 'bomb': {
        if (evolved) {
          this.meteors(s);
          break;
        }
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
          // Thunderstorm: each strike jumps on to the two nearest enemies.
          if (evolved) {
            for (const n of enemies.nearestN(x, y, 3, 320).filter((e) => e !== t).slice(0, 2)) {
              this.ctx.fx.arc(x, y - 20, n.x, n.y - 20, 0xe2c8ff);
              enemies.damage(n, s.damage * 0.6, x, y, 0.3, false);
            }
          }
        }
        if (targets.length) audio.sfx('zap');
        break;
      }
      case 'beam':
        this.fireBeams(s);
        break;
      case 'twister': {
        // Each whirlwind heads for a different enemy on screen (or off in a random direction).
        const inView = enemies.inRect(this.ctx.view());
        for (let i = 0; i < s.amount; i++) {
          const target: Enemy | null = inView.length ? inView[Math.floor(this.ctx.rng() * inView.length)] : null;
          const a = target ? Math.atan2(target.y - player.y, target.x - player.x) : this.ctx.rng() * Math.PI * 2;
          this.addTwister(player.x, player.y + 10, a, s, target);
        }
        audio.sfx('shoot', 0.5);
        break;
      }
      case 'traps':
        for (let i = 0; i < s.amount; i++) this.setTrap(s, !!evolved);
        break;
      case 'shuriken': {
        // Each star goes for its own enemy (the boss first) and bounces on from there.
        const targets = enemies.nearestN(player.x, player.y, s.amount, 850);
        const boss = this.bossInRange(850);
        if (boss) targets.unshift(boss);
        const face = Math.atan2(player.faceY, player.faceX);
        for (let i = 0; i < s.amount; i++) {
          const t = targets.length ? targets[i % targets.length] : null;
          const a = t ? Math.atan2(t.y - player.y, t.x - player.x) + (i >= targets.length ? 0.35 : 0) : face + (i - (s.amount - 1) / 2) * 0.4;
          const p = this.shoot('shuriken', 'shuriken', a, s, 22 * s.area);
          p.pierce = 0;
          p.bounces += s.pierce;
          p.life = 2;
          p.sprite.setScale(s.area * (evolved ? 1.35 : 1));
          if (evolved) {
            p.sprite.setTint(0xffe08a);
            p.homing = 5;
          }
        }
        audio.sfx('shoot', 0.6);
        break;
      }
      case 'quake':
        for (let i = 0; i < s.amount; i++) this.ctx.scene.time.delayedCall(i * 320, () => this.shockwave(s, !!evolved));
        break;
      case 'firetrail':
        this.dropFlame(s, !!evolved);
        break;
      case 'turret':
        for (let i = 0; i < s.amount; i++) this.setTurret(s, i, !!evolved);
        break;
      case 'spear': {
        // Thrown the way the hero is walking (or last walked): aim by moving.
        const base = Math.atan2(player.faceY, player.faceX);
        const from = { x: player.x + Math.cos(base) * 30, y: player.y - 16 };
        for (let i = 0; i < s.amount; i++) {
          const a = base + (i - (s.amount - 1) / 2) * 0.16;
          const p = this.shoot('spear', evolved ? 'spear_dragon' : 'spear', a, s, 26 * s.area, from);
          p.knockback = 2.4;
          p.life = 1.2;
          p.lance = !!evolved;
          p.sprite.setScale(s.area * (evolved ? 1.25 : 1));
        }
        this.ctx.fx.muzzle(from.x, from.y, evolved ? 0xff8a3d : 0xffffff);
        audio.sfx('shoot', 0.9);
        break;
      }
      case 'wisps':
        for (let i = 0; i < s.amount; i++) this.releaseWisp(s, i, !!evolved);
        break;
      default:
        break;
    }
  }

  // ---------------------------------------------------------------- Shockwave / Earthquake

  /** A wave stomped out around the hero: hurts and shoves back everything in it (Earthquake also stuns). */
  private shockwave(s: WeaponStats, quake: boolean): void {
    const { player, enemies, fx } = this.ctx;
    const R = QUAKE_RADIUS * s.area;
    const x = player.x;
    const y = player.y + 30;
    fx.shockwave(x, y, R, quake ? 0xffb36b : 0xe8dcc0);
    fx.ring(x, y - 30, R, quake ? 0xff9a3d : 0xfff4d6, 'ring', 35, 320);
    fx.dust(x - 40, y, 4);
    fx.dust(x + 40, y, 4);
    enemies.forEachInRadius(player.x, player.y, R, (e) => {
      enemies.damage(e, s.damage, player.x, player.y, 2.2);
      if (quake) enemies.freezeSolid(e, 0.6);
    });
    this.ctx.shake(quake ? 160 : 90, quake ? 0.006 : 0.003);
    audio.sfx('explosion', quake ? 0.7 : 0.4);
  }

  // ---------------------------------------------------------------- Flame Trail / Inferno Road

  /** A burning footprint where the hero is (only one at a time while standing still). */
  private dropFlame(s: WeaponStats, inferno: boolean): void {
    const { player } = this.ctx;
    const x = player.x - player.faceX * 18;
    const y = player.y + 34;
    if (!player.moving && this.zones.some((z) => z.fire && Math.abs(z.x - x) < 40 && Math.abs(z.y - y) < 30)) return;
    const r = FLAME_RADIUS * s.area;
    const img = this.ctx.scene.add.image(x, y, 'flame').setDepth(2).setDisplaySize(r * 2.2, r * 1.2);
    if (inferno) img.setTint(0xffd0a0);
    this.zones.push({ x, y, r, damage: s.damage, left: s.duration, tick: 0, slow: false, fire: true, burn: inferno, img });
    const fires = this.zones.filter((z) => z.fire);
    if (fires.length > MAX_FLAMES) {
      const old = fires[0];
      old.img.destroy();
      this.zones.splice(this.zones.indexOf(old), 1);
    }
  }

  // ---------------------------------------------------------------- Sentry Turret / Golden Ballista

  private setTurret(s: WeaponStats, i: number, gold: boolean): void {
    const { player } = this.ctx;
    const a = (i / Math.max(1, s.amount)) * Math.PI * 2 + this.clock;
    const x = player.x + Math.cos(a) * 70;
    const y = player.y + 10 + Math.sin(a) * 50;
    const img = this.ctx.scene.add.image(x, y, gold ? 'turret_gold' : 'turret').setDepth(9).setScale(0).setOrigin(0.5, 0.85);
    this.ctx.scene.tweens.add({ targets: img, scale: 1.2 * Math.sqrt(s.area), duration: 260, ease: 'Back.easeOut' });
    this.ctx.fx.dust(x, y + 10, 3);
    this.turrets.push({ img, x, y, life: s.duration, shot: 0.3, stats: s, gold });
    while (this.turrets.length > s.amount * 2) {
      const old = this.turrets.shift()!;
      old.img.destroy();
    }
  }

  private updateTurrets(dt: number): void {
    const { enemies } = this.ctx;
    for (let i = this.turrets.length - 1; i >= 0; i--) {
      const t = this.turrets[i];
      t.life -= dt;
      t.shot -= dt;
      if (t.life <= 0) {
        this.ctx.fx.deathPuff(t.x, t.y, 0.8, 0xd9c9a3);
        t.img.destroy();
        this.turrets.splice(i, 1);
        continue;
      }
      if (t.life < 0.5) t.img.setAlpha(t.life / 0.5);
      if (t.shot > 0) continue;
      const target = enemies.nearest(t.x, t.y, TURRET_RANGE);
      if (!target) continue;
      t.shot = TURRET_EVERY;
      const a = Math.atan2(target.y - t.y, target.x - t.x);
      const from = { x: t.x + Math.cos(a) * 20, y: t.y - 34 };
      for (const off of t.gold ? [-0.07, 0.07] : [0]) {
        const p = this.shoot('arrow', t.gold ? 'arrow_storm' : 'arrow', a + off, t.stats, 20, from);
        p.life = 1;
      }
      t.img.setFlipX(Math.cos(a) < 0);
      this.ctx.fx.muzzle(from.x, from.y, t.gold ? 0xffe08a : 0xfff1b8);
    }
  }

  // ---------------------------------------------------------------- Spirit Wisps / Soul Harvest

  private releaseWisp(s: WeaponStats, i: number, harvest: boolean): void {
    const { player } = this.ctx;
    const a = (i / Math.max(1, s.amount)) * Math.PI * 2 + this.ctx.rng() * 0.6;
    const p = this.obtain('wisp', 'wisp');
    p.x = player.x;
    p.y = player.y - 30;
    p.vx = Math.cos(a) * s.speed * 0.7;
    p.vy = Math.sin(a) * s.speed * 0.7;
    p.damage = s.damage;
    p.area = s.area;
    p.speed = s.speed;
    p.life = 3.5;
    p.harvest = harvest;
    p.sprite.setScale(0.9 + 0.2 * s.area);
    if (harvest) p.sprite.setTint(0xd8ffe0);
  }

  /** A wisp drifts out, then dives at the nearest monster and bursts on touching one. */
  private updateWisp(p: Projectile, dt: number): void {
    const { enemies, fx, player } = this.ctx;
    if (p.age < WISP_DRIFT) {
      const k = Math.exp(-4 * dt);
      p.vx *= k;
      p.vy *= k;
    } else {
      if (!p.target || !p.target.active) p.target = enemies.nearest(p.x, p.y, 700);
      const want = p.target ? Math.atan2(p.target.y - p.y, p.target.x - p.x) : Math.atan2(p.vy, p.vx);
      const cur = Math.atan2(p.vy, p.vx);
      const a = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - cur), -8 * dt, 8 * dt);
      const sp = Math.min(p.speed, Math.hypot(p.vx, p.vy) + p.speed * 3 * dt);
      p.vx = Math.cos(a) * sp;
      p.vy = Math.sin(a) * sp;
    }
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.sprite.setPosition(p.x, p.y + Math.sin(p.age * 9) * 4).setFlipX(p.vx < 0);
    if (Math.random() < dt * 14) fx.sparkle(p.x, p.y, 1, p.harvest ? 0xc8ffd8 : 0xbff8ff);
    let hit = false;
    if (p.age >= WISP_DRIFT * 0.5) enemies.forEachInRadius(p.x, p.y, 18, () => (hit = true));
    if (!hit && p.life > 0) return;
    // Burst.
    const r = WISP_RADIUS * p.area;
    fx.ring(p.x, p.y, r, p.harvest ? 0x9dff8a : 0x8ff0ff, 'ring', 35, 260);
    fx.sparkle(p.x, p.y, 3, 0xffffff);
    enemies.forEachInRadius(p.x, p.y, r, (e) => enemies.damage(e, p.damage, p.x, p.y, 0.6));
    if (p.harvest && hit) player.heal(player.stats.maxHp * 0.005);
    if (hit) audio.sfx('zap', 0.4);
    this.release(p);
  }

  // ---------------------------------------------------------------- Prism Beam / Rainbow Ray

  /** Prism Beam: beams fan out toward the nearest enemy (the boss first), hitting everything along them at once. */
  private fireBeams(s: WeaponStats): void {
    const { player, enemies, fx } = this.ctx;
    const target = this.bossInRange(BEAM_LENGTH) ?? enemies.nearest(player.x, player.y, BEAM_LENGTH);
    const base = target ? Math.atan2(target.y - player.y, target.x - player.x) : Math.atan2(player.faceY, player.faceX);
    const width = BEAM_WIDTH * s.area;
    for (let i = 0; i < s.amount; i++) {
      const a = base + (i - (s.amount - 1) / 2) * 0.42;
      const color = PRISM[i % PRISM.length];
      const ox = player.x + Math.cos(a) * 30;
      const oy = player.y - 10 + Math.sin(a) * 30;
      enemies.forEachOnSegment(ox, oy, ox + Math.cos(a) * BEAM_LENGTH, oy + Math.sin(a) * BEAM_LENGTH, width / 2, (e) => {
        enemies.damage(e, s.damage, ox, oy, 0.5);
        fx.sparksAt(e.x, e.y, 2, color);
      });
      const scene = this.ctx.scene;
      const glow = scene.add.image(0, 0, 'beam').setDepth(27).setOrigin(0, 0.5).setTint(color);
      const core = scene.add.image(0, 0, 'beam').setDepth(28).setOrigin(0, 0.5).setBlendMode(Phaser.BlendModes.ADD);
      this.beams.push({ glow, core, angle: a, len: BEAM_LENGTH, width, life: s.duration, dur: s.duration });
    }
    fx.muzzle(player.x + Math.cos(base) * 30, player.y - 10 + Math.sin(base) * 30, PRISM[0]);
    audio.sfx('zap', 0.6);
  }

  /** Lays a beam's two layers (coloured glow, white core) from the hero along `angle`. */
  private placeBeam(glow: Phaser.GameObjects.Image, core: Phaser.GameObjects.Image, angle: number, len: number, width: number, alpha: number): void {
    const { player } = this.ctx;
    const x = player.x + Math.cos(angle) * 30;
    const y = player.y - 10 + Math.sin(angle) * 30;
    glow.setPosition(x, y).setRotation(angle).setDisplaySize(len, width * 1.9).setAlpha(alpha * 0.8);
    core.setPosition(x, y).setRotation(angle).setDisplaySize(len, width * 0.45).setAlpha(alpha);
  }

  private updateBeams(dt: number): void {
    for (let i = this.beams.length - 1; i >= 0; i--) {
      const b = this.beams[i];
      b.life -= dt;
      // Snaps out at full width, then thins and fades.
      const u = Math.max(0, b.life / b.dur);
      this.placeBeam(b.glow, b.core, b.angle, b.len, b.width * (0.5 + 0.5 * u), Math.min(1, u * 1.6));
      if (b.life <= 0) {
        b.glow.destroy();
        b.core.destroy();
        this.beams.splice(i, 1);
      }
    }
  }

  /** Rainbow Ray: the beams spin around the hero for good, hitting whatever they sweep over. */
  private updateRainbow(rt: WeaponRuntime, dt: number): void {
    const s = rt.stats;
    const { enemies, fx } = this.ctx;
    rt.orbAngle += s.speed * dt;
    const len = RAINBOW_LENGTH * s.area;
    const width = BEAM_WIDTH * 0.9 * s.area;
    const n = rt.orbs.length;
    rt.timer -= dt;
    const hitNow = rt.timer <= 0;
    if (hitNow) rt.timer = 0.05;
    for (let i = 0; i < n; i++) {
      const a = rt.orbAngle + (i / n) * Math.PI * 2;
      this.placeBeam(rt.orbs[i], rt.cores[i], a, len, width * (1 + 0.08 * Math.sin(this.clock * 20 + i)), 0.85);
      if (!hitNow) continue;
      const { player } = this.ctx;
      const ox = player.x + Math.cos(a) * 30;
      const oy = player.y - 10 + Math.sin(a) * 30;
      enemies.forEachOnSegment(ox, oy, ox + Math.cos(a) * len, oy + Math.sin(a) * len, width / 2, (e) => {
        if (this.clock < (rt.orbHits.get(e.uid) ?? 0)) return;
        rt.orbHits.set(e.uid, this.clock + 0.3);
        enemies.damage(e, s.damage, ox, oy, 0.4);
        fx.sparksAt(e.x, e.y, 2, PRISM[i % PRISM.length]);
      });
    }
    if (rt.orbHits.size > 600) rt.orbHits.clear();
  }

  // ---------------------------------------------------------------- Whirlwind / Cyclone

  private addTwister(x: number, y: number, angle: number, s: WeaponStats, target: Enemy | null): void {
    const r = TWISTER_RADIUS * s.area;
    const img = this.ctx.scene.add.image(x, y, 'twister').setDepth(26).setOrigin(0.5, 0.9).setAlpha(0);
    this.twisters.push({ img, x, y, vx: Math.cos(angle) * s.speed, vy: Math.sin(angle) * s.speed, age: 0, life: s.duration, r, damage: s.damage, tick: 0, target });
  }

  /** Drags monsters within reach toward (x, y), and every so often hurts the ones inside radius `r`. */
  private whirl(x: number, y: number, r: number, force: number, dt: number, damage: number | null): void {
    const { enemies, fx } = this.ctx;
    enemies.forEachInRadius(x, y, r * TWISTER_PULL, (e) => {
      if (e.isBoss) return;
      const dx = x - e.x;
      const dy = y - e.y;
      const d = Math.hypot(dx, dy) || 1;
      const k = force * (1 - e.kbResist * 0.7) * dt;
      e.kx += (dx / d) * k;
      e.ky += (dy / d) * k;
    });
    if (damage === null) return;
    enemies.forEachInRadius(x, y, r, (e) => {
      enemies.damage(e, damage, x, y, 0);
      if (Math.random() < 0.3) fx.sparksAt(e.x, e.y, 1, 0xe6f0ff);
    });
  }

  /** The twister picture: spun by flipping, wobbling and swaying, with dust kicked up at its foot. */
  private spinTwister(img: Phaser.GameObjects.Image, x: number, y: number, r: number, age: number, alpha: number, dt: number): void {
    const k = r / 60;
    img.setPosition(x, y + r * 0.35).setAlpha(alpha);
    img.setScale(k * (1 + 0.07 * Math.sin(age * 19)), k * (1 - 0.04 * Math.sin(age * 19)));
    img.setFlipX(Math.floor(age / 0.07) % 2 === 0).setRotation(Math.sin(age * 5) * 0.08);
    if (Math.random() < dt * 14) this.ctx.fx.dust(x + (Math.random() - 0.5) * r, y + r * 0.3, 1);
  }

  private updateTwisters(dt: number): void {
    const { enemies } = this.ctx;
    for (let i = this.twisters.length - 1; i >= 0; i--) {
      const t = this.twisters[i];
      t.age += dt;
      t.life -= dt;
      // Drifts toward its enemy (or the nearest one once that is gone), with a lazy wander.
      if (!t.target || !t.target.active) t.target = enemies.nearest(t.x, t.y, 500);
      const cur = Math.atan2(t.vy, t.vx);
      let turn = Math.sin(t.age * 2.3 + i) * 0.9 * dt;
      if (t.target) turn += Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(Math.atan2(t.target.y - t.y, t.target.x - t.x) - cur), -1.4 * dt, 1.4 * dt);
      const sp = Math.hypot(t.vx, t.vy);
      t.vx = Math.cos(cur + turn) * sp;
      t.vy = Math.sin(cur + turn) * sp;
      t.x += t.vx * dt;
      t.y += t.vy * dt;
      t.tick -= dt;
      const hit = t.tick <= 0;
      if (hit) t.tick = TWISTER_TICK;
      this.whirl(t.x, t.y, t.r, TWISTER_FORCE, dt, hit ? t.damage : null);
      this.spinTwister(t.img, t.x, t.y, t.r, t.age, Math.min(0.85, t.age / 0.25, t.life / 0.35), dt);
      if (t.life <= 0) {
        t.img.destroy();
        this.twisters.splice(i, 1);
      }
    }
  }

  /** Cyclone: two big twisters circle the hero for good, dragging monsters in from far around. */
  private updateCyclone(rt: WeaponRuntime, dt: number): void {
    const s = rt.stats;
    const { player } = this.ctx;
    rt.orbAngle += s.speed * dt;
    rt.timer -= dt;
    const hit = rt.timer <= 0;
    if (hit) rt.timer = 0.25;
    const orbit = CYCLONE_ORBIT + 60 * (s.area - 1);
    const r = TWISTER_RADIUS * s.area;
    rt.orbs.forEach((img, i) => {
      const a = rt.orbAngle + (i / rt.orbs.length) * Math.PI * 2;
      const x = player.x + Math.cos(a) * orbit;
      const y = player.y + Math.sin(a) * orbit * 0.8;
      this.whirl(x, y, r, TWISTER_FORCE * 1.4, dt, hit ? s.damage : null);
      this.spinTwister(img, x, y, r, this.clock + i * 0.5, 0.85, dt);
    });
  }

  // ---------------------------------------------------------------- Spike Traps / Glacier Mines

  /** Drops a trap somewhere around the hero; the oldest go once there are too many. */
  private setTrap(s: WeaponStats, frost: boolean): void {
    const { player, rng } = this.ctx;
    const a = rng() * Math.PI * 2;
    const d = 60 + rng() * 140;
    const x = player.x + Math.cos(a) * d;
    const y = player.y + 20 + Math.sin(a) * d * 0.8;
    const img = this.ctx.scene.add.image(x, y, frost ? 'trap_frost' : 'trap').setDepth(3).setScale(0);
    const size = frost ? 1.15 : 0.95;
    this.ctx.scene.tweens.add({ targets: img, scale: size * Math.sqrt(s.area), duration: 260, ease: 'Back.easeOut' });
    this.traps.push({ img, x, y, arm: TRAP_ARM, life: s.duration, r: TRAP_RADIUS * s.area, damage: s.damage, frost });
    while (this.traps.length > MAX_TRAPS) this.trapGone(this.traps.shift()!);
  }

  private trapGone(t: Trap): void {
    this.ctx.scene.tweens.add({ targets: t.img, alpha: 0, duration: 300, onComplete: () => t.img.destroy() });
  }

  private updateTraps(dt: number): void {
    const { enemies, fx } = this.ctx;
    for (let i = this.traps.length - 1; i >= 0; i--) {
      const t = this.traps[i];
      t.arm -= dt;
      t.life -= dt;
      if (t.life <= 0) {
        this.trapGone(t);
        this.traps.splice(i, 1);
        continue;
      }
      if (t.arm > 0) continue;
      let stepped = false;
      enemies.forEachInRadius(t.x, t.y, TRAP_TRIGGER, () => (stepped = true));
      if (!stepped) continue;
      // Snap! Spikes burst out: damage and a stumble (Glacier Mines freeze instead).
      const color = t.frost ? 0x9fe8ff : 0xe3e9f3;
      fx.shockwave(t.x, t.y, t.r, color);
      fx.ring(t.x, t.y, t.r, color, 'ring', 35, 260);
      fx.sparksAt(t.x, t.y, 8, color);
      if (t.frost) fx.sparkle(t.x, t.y, 4, 0xffffff);
      enemies.forEachInRadius(t.x, t.y, t.r, (e) => {
        enemies.damage(e, t.damage, t.x, t.y, 0.9);
        if (t.frost) enemies.freezeSolid(e, 1.5);
        else e.slow = Math.max(e.slow, 1);
      });
      audio.sfx('hit', 0.8);
      t.img.destroy();
      this.traps.splice(i, 1);
    }
  }

  // ---------------------------------------------------------------- Ward Orbs / Aegis

  /** Orbs circle close: they hurt monsters they touch and swallow monster shots (Aegis fires them back). */
  private updateWard(rt: WeaponRuntime, dt: number): void {
    const s = rt.stats;
    const { player, enemies, fx } = this.ctx;
    const evolved = !!rt.owned.evolved;
    rt.orbAngle += s.speed * dt;
    const R = WARD_RADIUS * (1 + (s.area - 1) * 0.6);
    const hitR = WARD_HIT * s.area;
    const n = rt.orbs.length;
    for (let i = 0; i < n; i++) {
      const a = rt.orbAngle + (i / n) * Math.PI * 2;
      const x = player.x + Math.cos(a) * R;
      const y = player.y - 10 + Math.sin(a) * R;
      rt.orbs[i].setPosition(x, y).setRotation(this.clock * 3);
      if (Math.random() < dt * 5) fx.sparkle(x, y, 1, evolved ? 0xfff1a0 : 0xbff8ff);
      enemies.forEachInRadius(x, y, hitR, (e) => {
        if (this.clock < (rt.orbHits.get(e.uid) ?? 0)) return;
        rt.orbHits.set(e.uid, this.clock + 0.5);
        enemies.damage(e, s.damage, player.x, player.y, evolved ? 1.6 : 0.9);
        fx.sparksAt(e.x, e.y, 2, evolved ? 0xffe08a : 0x8ff0ff);
      });
      enemies.blockShots(x, y, hitR + 8, evolved ? (sx, sy) => this.reflect(sx, sy, s) : undefined);
    }
    if (rt.orbHits.size > 600) rt.orbHits.clear();
  }

  /** Aegis: a blocked monster shot flies back as a golden bolt that seeks out an enemy. */
  private reflect(x: number, y: number, s: WeaponStats): void {
    const target = this.ctx.enemies.nearest(x, y, 900);
    const a = target ? Math.atan2(target.y - y, target.x - x) : this.ctx.rng() * Math.PI * 2;
    const p = this.shoot('bolt', 'bolt', a, { ...s, speed: 760, pierce: 0, area: 1 }, 24, { x, y });
    p.target = target;
    p.life = 1.6;
    p.canSplit = false;
    p.sprite.setTint(0xffe08a);
  }

  // ---------------------------------------------------------------- Split Rune

  /** Split Rune: a projectile's first hit throws off splinters to either side (they skip the one it hit). */
  private splinter(p: Projectile, hit: Enemy): void {
    const lv = this.ctx.runes.split;
    if (!lv) return;
    const n = RUNE_POWER.split[lv - 1];
    const base = Math.atan2(p.vy, p.vx);
    const stats: WeaponStats = { damage: p.damage * RUNE_POWER.splitDamage[lv - 1], cooldown: 0, amount: 1, pierce: 0, area: 0.75, speed: 820, duration: 0 };
    for (let k = 0; k < n; k++) {
      const a = base + (k - (n - 1) / 2) * (n === 2 ? 0.8 : 0.6);
      const q = this.shoot('splinter', 'ice_shard', a, stats, 14, { x: p.x, y: p.y });
      q.hits.set(hit.uid, Infinity);
      q.life = 0.45;
      q.bounces = 0;
      q.sprite.setTint(0xffe08a);
      q.trail.setTint(0xffe08a);
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

  /** Meteor: flaming rocks drop on enemies on screen (the boss first), with a red ring where each will land. */
  private meteors(s: WeaponStats): void {
    const { enemies, player, fx } = this.ctx;
    const inView = enemies.inRect(this.ctx.view());
    Phaser.Utils.Array.Shuffle(inView);
    const bossIdx = inView.findIndex((e) => e.isBoss);
    if (bossIdx > 0) inView.unshift(...inView.splice(bossIdx, 1));
    for (let i = 0; i < s.amount; i++) {
      const t = inView[i];
      const a = this.ctx.rng() * Math.PI * 2;
      const p = this.obtain('star', 'meteor');
      p.meteor = true;
      p.tx = t ? t.x : player.x + Math.cos(a) * 300;
      p.ty = t ? t.y : player.y + Math.sin(a) * 300;
      p.sx = p.tx + 320;
      p.sy = p.ty - 700;
      p.vx = p.tx - p.sx;
      p.vy = p.ty - p.sy;
      p.x = p.sx;
      p.y = p.sy;
      p.damage = s.damage;
      p.area = s.area;
      p.life = 0.45 + i * 0.1;
      p.sprite.setRotation(Math.atan2(p.vy, p.vx)).setScale(1.3 * s.area);
      const r = BOMB_RADIUS * s.area;
      fx.decal('shock', p.tx, p.ty, r * 2, r, 0xff5a3c, 0.55, p.life + 0.1);
    }
  }

  /** Moon Slash: a crescent sweep on one side of the hero, hitting everything in a half circle. Flame Crescent burns. */
  private swing(dir: number, s: WeaponStats, delay: number, flame = false): void {
    const scene = this.ctx.scene;
    scene.time.delayedCall(delay * 1000, () => {
      const { player, enemies, fx } = this.ctx;
      const R = SLASH_RADIUS * s.area;
      const cx = player.x + dir * R * 0.55;
      const cy = player.y - 10;
      const img = scene.add.image(cx, cy, 'slash').setDepth(26);
      if (flame) img.setTint(0xffa24a);
      const k = (R * 2) / img.height;
      img.setScale(dir * k * 0.75, k * 0.75);
      scene.tweens.add({ targets: img, scaleX: dir * k, scaleY: k, alpha: 0, x: cx + dir * 24, duration: 340, ease: 'Cubic.easeIn', onComplete: () => img.destroy() });
      enemies.forEachInRadius(cx, cy, R * 0.8, (e) => {
        if ((e.x - player.x) * dir < -20) return;
        enemies.damage(e, s.damage, player.x, player.y, 1.8);
        if (flame) enemies.ignite(e, s.damage * 0.3);
        fx.sparksAt(e.x, e.y, 3, flame ? 0xff8a3d : 0xe8f4ff);
      });
      audio.sfx('shoot', 0.6);
    });
  }

  /** Arrows streak down onto monsters on screen and burst: the Archer's Arrow Storm. */
  rain(damage: number, count: number, texture = 'arrow'): void {
    const area = this.ctx.player.stats.areaMult;
    this.starfall({ damage, cooldown: 0, amount: count, pierce: 0, area, speed: 0, duration: 0 }, texture);
  }

  /** Starfall: stars streak down from the sky onto enemies on screen (the boss first) and burst. */
  private starfall(s: WeaponStats, texture = 'star_bolt'): void {
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
      const p = this.obtain('star', texture);
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
      if (z.fire) {
        // Flames flicker, and throw up the odd ember.
        z.img.setAlpha(Math.min(0.85, z.left / 0.4) * (0.8 + 0.2 * Math.sin(this.clock * 23 + z.x)));
        if (Math.random() < dt * 2) fx.sparkle(z.x + (Math.random() - 0.5) * z.r, z.y - 10, 1, 0xffb36b);
      } else z.img.setAlpha(Math.min(0.6, z.left / 0.4));
      if (z.tick <= 0) {
        z.tick = 0.4;
        enemies.forEachInRadius(z.x, z.y, z.r, (e) => {
          enemies.damage(e, z.damage, z.x, z.y, 0, false);
          if (z.slow) e.slow = Math.max(e.slow, 0.6);
          if (z.burn) enemies.ignite(e, z.damage);
          if (Math.random() < 0.3) fx.sparksAt(e.x, e.y, 1, z.fire ? 0xff8a3d : 0x9be64a);
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
    const ricochet = this.ctx.runes.ricochet;
    if (ricochet && kind !== 'boomerang') p.bounces = RUNE_POWER.ricochet[ricochet - 1];
    p.canSplit = kind === 'arrow' || kind === 'dagger' || kind === 'bolt' || kind === 'shard';
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
          if (p.plague) img.setTint(0x7fb86a);
          this.zones.push({ x: p.tx, y: p.ty, r, damage: p.damage, left: p.duration, tick: 0, slow: p.plague, fire: false, burn: false, img });
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
        if (u >= 1 && p.meteor) {
          // A Meteor lands: a big blast that sets everything in it on fire.
          const r = BOMB_RADIUS * p.area;
          this.ctx.fx.explosion(p.tx, p.ty, r);
          enemies.forEachInRadius(p.tx, p.ty, r, (e) => {
            enemies.damage(e, p.damage, p.tx, p.ty, 1.8);
            enemies.ignite(e, p.damage * 0.25);
          });
          audio.sfx('explosion');
          this.ctx.shake(160, 0.006);
          this.release(p);
        } else if (u >= 1) {
          const r = STAR_RADIUS * p.area;
          this.ctx.fx.ring(p.tx, p.ty, r * 1.3, 0xffe08a);
          this.ctx.fx.sparkle(p.tx, p.ty, 4, 0xfff1b8);
          enemies.forEachInRadius(p.tx, p.ty, r, (e) => enemies.damage(e, p.damage, p.tx, p.ty, 0.8));
          audio.sfx('zap', 0.5);
          this.release(p);
        }
        continue;
      }

      if (p.kind === 'wisp') {
        this.updateWisp(p, dt);
        continue;
      }

      // Star Storm and the Seeker Rune bend projectiles toward the nearest monster.
      const seek = p.homing || (SEEKERS.has(p.kind) && this.ctx.runes.homing ? RUNE_POWER.homing[this.ctx.runes.homing - 1] : 0);
      if (seek > 0) {
        if (!p.target || !p.target.active || p.hits.has(p.target.uid)) p.target = this.nearestUnhit(p, 450);
        if (p.target) {
          const cur = Math.atan2(p.vy, p.vx);
          const want = Math.atan2(p.target.y - p.y, p.target.x - p.x);
          const a = cur + Phaser.Math.Clamp(Phaser.Math.Angle.Wrap(want - cur), -seek * dt, seek * dt);
          const sp = Math.hypot(p.vx, p.vy);
          p.vx = Math.cos(a) * sp;
          p.vy = Math.sin(a) * sp;
          if (p.kind !== 'shuriken') p.sprite.setRotation(a);
        }
      }
      if (p.kind === 'shuriken') p.sprite.rotation += 18 * dt;

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
        enemies.damage(e, p.damage, p.x - p.vx * 0.05, p.y - p.vy * 0.05, p.kind === 'boomerang' ? 0.6 : p.kind === 'shard' ? 0.4 : p.knockback);
        // Dragon Lance: sets the monster alight and finishes it off if it is nearly gone.
        if (p.lance && e.active) {
          enemies.ignite(e, p.damage * 0.2);
          if (!e.isBoss && e.hp < e.maxHp * 0.2) enemies.damage(e, e.hp + 1, p.x, p.y, 0, false);
        }
        this.ctx.fx.sparksAt(p.x, p.y, 3, p.kind === 'shard' ? 0xd4f4ff : p.kind === 'bolt' ? 0x8fd8ff : e.color);
        if (p.kind === 'bolt') {
          this.ctx.fx.ring(p.x, p.y, 46 * p.area, 0x8fd8ff, 'ring', 35, 240);
          this.ctx.fx.sparkle(p.x, p.y, 2, 0xffffff);
        }
        if (p.kind === 'shard') e.slow = Math.max(e.slow, 1.6);
        if (p.canSplit) {
          p.canSplit = false;
          this.splinter(p, e);
        }
        if (p.kind !== 'boomerang') {
          p.pierce--;
          if (p.pierce < 0 && !this.bounce(p)) this.release(p);
        }
      });
    }
  }

  /** The closest active monster within `range` this projectile hasn't hit yet. */
  private nearestUnhit(p: Projectile, range: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = range * range;
    for (const e of this.ctx.enemies.alive) {
      if (!e.active || p.hits.has(e.uid)) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Bounce Rune: a spent projectile turns toward the nearest enemy it hasn't hit yet. Returns false if none. */
  private bounce(p: Projectile): boolean {
    if (p.bounces <= 0) return false;
    let next: Enemy | null = null;
    let best = 380 * 380;
    for (const e of this.ctx.enemies.alive) {
      if (!e.active || p.hits.has(e.uid)) continue;
      const d = (e.x - p.x) ** 2 + (e.y - p.y) ** 2;
      if (d < best) {
        best = d;
        next = e;
      }
    }
    if (!next) return false;
    const sp = Math.hypot(p.vx, p.vy) || 800;
    const a = Math.atan2(next.y - p.y, next.x - p.x);
    p.vx = Math.cos(a) * sp;
    p.vy = Math.sin(a) * sp;
    p.sprite.setRotation(a);
    p.target = next;
    p.bounces--;
    p.pierce = 0;
    p.life = Math.max(p.life, 0.8);
    this.ctx.fx.sparkle(p.x, p.y, 2, 0x9bf08a);
    return true;
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
      rt.orbs.forEach((o) => o.destroy());
      rt.cores.forEach((o) => o.destroy());
    }
    this.runtimes = [];
    this.zones.forEach((z) => z.img.destroy());
    this.zones = [];
    this.beams.forEach((b) => (b.glow.destroy(), b.core.destroy()));
    this.beams = [];
    this.twisters.forEach((t) => t.img.destroy());
    this.twisters = [];
    this.traps.forEach((t) => t.img.destroy());
    this.traps = [];
    this.turrets.forEach((t) => t.img.destroy());
    this.turrets = [];
  }
}
