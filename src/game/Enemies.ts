import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { BERSERK } from '../config/abilities';
import { AFFIX, AFFIX_IDS, affixCount, affixDef, type AffixId } from '../config/affixes';
import { MAX_ENEMIES } from '../config/game';
import { MAPS } from '../config/maps';
import { BOSSES, ENEMIES, ENEMY_SHOTS, type BossDef, type BossId, type EnemyDef, type EnemyId } from '../config/enemies';
import { GOBLIN_ESCAPE } from '../config/events';
import { BURN_TIME, FREEZE_TIME, RUNE_POWER } from '../config/weapons';
import { SpatialHash } from '../core/spatial';
import { damageMultiplier, hpMultiplier, speedMultiplier } from '../core/waves';
import { FONT } from '../ui/theme';
import { type GameCtx } from './context';

export class Enemy {
  uid = 0;
  active = false;
  def: EnemyDef | null = null;
  boss: BossDef | null = null;
  readonly sprite: Phaser.GameObjects.Sprite;
  readonly shadow: Phaser.GameObjects.Image;
  x = 0;
  y = 0;
  hp = 0;
  maxHp = 0;
  speed = 0;
  damage = 0;
  radius = 0;
  xp = 0;
  coinChance = 0;
  kbResist = 0;
  kx = 0;
  ky = 0;
  flash = 0;
  anim = 0;
  frame = 0;
  tex = '';
  elite = false;
  scale = 1;
  /** Behaviour timers/state (meaning depends on the enemy type). */
  timer = 0;
  timer2 = 0;
  timer3 = 0;
  state = 0;
  dirX = 0;
  dirY = 0;
  phase = 0;
  slow = 0;
  thresholds = 0;
  /** 1 right after a hit, easing back to 0: the sprite squashes from the blow. */
  hitSquash = 0;
  /** 0 -> 1 while popping into the world. */
  spawnT = 1;
  /** Seconds left of a boss's drop from the sky (it can't act or be hurt until it lands). */
  enter = 0;
  /** Facing (-1 left, 1 right); only flips on a clear change of direction so sprites don't jitter. */
  face = 1;
  lean = 0;
  /** A small copy left behind by a splitter (it doesn't split again). */
  small = false;
  /** Blew itself up (an exploder): no reward, and it doesn't count as a kill. */
  selfDestructed = false;
  /** On fire: damage per second and seconds left (Ember Rune, Flame Crescent, Meteor). */
  burnDps = 0;
  burnLeft = 0;
  burnTick = 0;
  /** Frozen solid for this many seconds (Frost Rune): can't move or hurt. */
  frozen = 0;
  /** The hold is a stun (Bash), not ice: shown yellow instead of blue. */
  stunned = false;
  /** An elite's powers (config/affixes.ts) and their state. */
  affixes: AffixId[] = [];
  shield = 0;
  shieldMax = 0;
  /** Seconds since the shield was last hit (it comes back after a while). */
  shieldIdle = 0;
  vampT = 0;
  summonT = 0;
  blinkT = 0;
  /** A Blinker's next spot, marked on the ground for `blinkWarn` seconds before it appears there. */
  blinkWarn = 0;
  blinkX = 0;
  blinkY = 0;
  /** Seconds until Thorn Mail can hurt this monster again. */
  thornT = 0;
  /** A boss in its angry phase (under half HP, or from the start late in a run): it adds a new attack. */
  enraged = false;
  /** The enraged attack's timer, shots left in a burst, and spin angle. */
  ptimer = 0;
  pcount = 0;
  pangle = 0;
  /** Coloured glow underneath (an elite's power, an enraged boss), the powers' names, an elite's shield bubble. */
  aura?: Phaser.GameObjects.Image;
  label?: Phaser.GameObjects.Text;
  bubble?: Phaser.GameObjects.Image;

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(4);
    // Anchored at the feet so squash, hops and waddles pivot on the ground.
    this.sprite = scene.add.sprite(0, 0, 'slime_0').setDepth(10).setOrigin(0.5, 1);
  }

  get isBoss(): boolean {
    return this.boss !== null;
  }

  /** Colour of its sparks and splats. */
  get color(): number {
    return this.boss ? this.boss.color : (this.def?.color ?? 0xffffff);
  }
}

interface Shot {
  active: boolean;
  sprite: Phaser.GameObjects.Image;
  /** A pulsing red glow under every monster shot, so it never looks like one of the hero's. */
  halo: Phaser.GameObjects.Image;
  age: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  damage: number;
  life: number;
  spin: number;
}

const ELITE_TINT = 0xffd36b;
const ENRAGED_GLOW = 0xff3a3a;
/** Monster shots: a red glow underneath, and orbs tinted red-pink. */
const SHOT_DANGER = 0xff2a4a;
const SHOT_TINT = 0xff7aa8;
/** An exploder's blast radius, and how long its fuse burns once lit. */
const EXPLODE_RADIUS = 130;
const FUSE = 0.8;
/** Seconds a boss takes to drop in from the sky. */
const BOSS_DROP = 0.9;

export class EnemyManager {
  readonly alive: Enemy[] = [];
  readonly hash = new SpatialHash(128);
  private pool: Enemy[] = [];
  private shots: Shot[] = [];
  private nextUid = 1;
  private regularCount = 0;
  private blastsThisFrame = 0;
  private novasThisFrame = 0;
  /** Telegraphed ground attacks (an enraged boss's stomps and splashes): a red circle, then the hit. */
  private strikes: { x: number; y: number; r: number; t: number; damage: number; color: number }[] = [];

  constructor(private ctx: GameCtx) {}

  get count(): number {
    return this.regularCount;
  }

  private obtain(): Enemy {
    const e = this.pool.pop() ?? new Enemy(this.ctx.scene);
    e.uid = this.nextUid++;
    e.active = true;
    e.kx = e.ky = e.flash = e.anim = e.frame = 0;
    e.timer = e.timer2 = e.timer3 = e.state = e.slow = e.thresholds = 0;
    e.hitSquash = e.enter = e.lean = 0;
    e.small = e.selfDestructed = false;
    e.burnDps = e.burnLeft = e.burnTick = e.frozen = 0;
    e.stunned = false;
    e.affixes = [];
    e.shield = e.shieldMax = e.shieldIdle = e.vampT = e.summonT = e.blinkT = e.blinkWarn = 0;
    e.enraged = false;
    e.ptimer = e.pcount = e.pangle = e.thornT = 0;
    this.hideExtras(e);
    e.spawnT = 0;
    e.face = 1;
    e.phase = this.ctx.rng() * Math.PI * 2;
    e.sprite.setVisible(true).setAlpha(1).clearTint().setFlipX(false).setScale(1).setRotation(0);
    e.shadow.setVisible(true).setAlpha(1);
    this.alive.push(e);
    return e;
  }

  spawn(id: EnemyId, x: number, y: number, elite = false): Enemy | null {
    if (this.regularCount >= MAX_ENEMIES) return null;
    const def = ENEMIES[id];
    const t = this.ctx.runTime;
    const e = this.obtain();
    e.def = def;
    e.boss = null;
    e.x = x;
    e.y = y;
    e.elite = elite;
    e.scale = elite ? 1.35 : 1;
    e.maxHp = e.hp = def.hp * hpMultiplier(t) * (elite ? 5 : 1) * this.ctx.monsterHp();
    e.speed = def.speed * speedMultiplier(t) * (0.92 + this.ctx.rng() * 0.16) * this.ctx.monsterSpeed;
    e.damage = def.damage * damageMultiplier(t) * (elite ? 1.3 : 1) * this.ctx.monsterDamage;
    e.radius = def.radius * e.scale;
    e.xp = def.xp * (elite ? 6 : 1);
    e.coinChance = elite ? 1 : def.coinChance;
    e.kbResist = elite ? Math.max(0.6, def.knockbackResist) : def.knockbackResist;
    e.tex = def.texture;
    e.sprite.setTexture(`${def.texture}_0`).setScale(e.scale).setDepth(10);
    if (def.alpha) e.sprite.setAlpha(def.alpha);
    if (elite) e.sprite.setTint(ELITE_TINT);
    const sw = e.sprite.displayWidth * 0.8;
    e.shadow.setDisplaySize(sw, sw * 0.3);
    this.regularCount++;
    if (elite) this.giveAffixes(e);
    return e;
  }

  /** An elite rolls its powers: shown as a glow in the first power's colour and their names over its head. */
  private giveAffixes(e: Enemy): void {
    const b = e.def!.behavior;
    // Treasure, bombs and the goblin stay as they are.
    if (b === 'ambush' || b === 'flee' || b === 'exploder') return;
    const pool = [...AFFIX_IDS];
    const n = affixCount(this.ctx.runTime, this.ctx.difficulty, this.ctx.affixBonus);
    if (n === 0) return;
    for (let k = 0; k < n && pool.length; k++) e.affixes.push(pool.splice(Math.floor(this.ctx.rng() * pool.length), 1)[0]);
    if (e.affixes.includes('swift')) e.speed *= AFFIX.swift;
    if (e.affixes.includes('shielded')) e.shield = e.shieldMax = e.maxHp * AFFIX.shield;
    e.vampT = e.summonT = e.blinkT = this.ctx.rng() * 2;
    const first = affixDef(e.affixes[0]);
    this.extras(e);
    e.aura!.setTint(first.color).setVisible(true);
    e.label!.setText(e.affixes.map((a) => affixDef(a).name).join(' · ')).setColor(first.css).setVisible(true);
    if (e.shieldMax > 0) e.bubble!.setVisible(true);
  }

  /** Creates (once per pooled enemy) the glow, name label and shield bubble. */
  private extras(e: Enemy): void {
    const scene = this.ctx.scene;
    e.aura ??= scene.add.image(0, 0, 'shock').setDepth(5).setVisible(false);
    e.label ??= scene.add
      .text(0, 0, '', { fontFamily: FONT, fontSize: '34px', fontStyle: '700', color: '#ffffff', stroke: '#2a1f3d', strokeThickness: 8 })
      .setOrigin(0.5, 1)
      .setDepth(12)
      .setVisible(false);
    e.bubble ??= scene.add.image(0, 0, 'ring').setDepth(11).setTint(0x8ff6ff).setVisible(false);
  }

  private hideExtras(e: Enemy): void {
    e.aura?.setVisible(false);
    e.label?.setVisible(false);
    e.bubble?.setVisible(false);
  }

  /** What an elite's powers do each frame: shields come back, vampires heal, summoners call, blinkers jump. */
  private updateAffixes(e: Enemy, dt: number, d: number): void {
    const { fx, player, rng } = this.ctx;
    for (const a of e.affixes) {
      switch (a) {
        case 'shielded':
          e.shieldIdle += dt;
          if (e.shield < e.shieldMax && e.shieldIdle > AFFIX.shieldBack) {
            e.shield = e.shieldMax;
            fx.ring(e.x, e.y, e.radius * 1.8, 0x6ff3ff, 'ring', 35, 320);
          }
          break;
        case 'vampiric':
          e.vampT += dt;
          if (e.vampT >= 1) {
            e.vampT = 0;
            this.forEachInRadius(e.x, e.y, AFFIX.vampRadius, (o) => {
              if (!o.isBoss && o.hp < o.maxHp) o.hp = Math.min(o.maxHp, o.hp + o.maxHp * AFFIX.vampHeal);
            });
            fx.shockwave(e.x, e.y + e.radius * 0.6, AFFIX.vampRadius * 0.9, 0xff4d6a);
          }
          break;
        case 'summoner':
          e.summonT += dt;
          if (e.summonT >= AFFIX.summonEvery && d < 900) {
            e.summonT = 0;
            this.summonAround(MAPS[this.ctx.mapIndex].enemies[0], e.x, e.y, AFFIX.summonCount, 110);
            fx.ring(e.x, e.y, 200, 0x9dff8a);
          }
          break;
        case 'blinker':
          if (e.blinkWarn > 0) {
            e.blinkWarn -= dt;
            if (e.blinkWarn <= 0) {
              fx.deathPuff(e.x, e.y, 1, 0xc9a8ff);
              e.x = e.blinkX;
              e.y = e.blinkY;
              e.spawnT = 0.5;
              fx.deathPuff(e.x, e.y, 1, 0xc9a8ff);
              fx.sparkle(e.x, e.y, 4, 0xe2d0ff);
              audio.sfx('zap', 0.5);
            }
            break;
          }
          e.blinkT += dt;
          if (e.blinkT >= AFFIX.blinkEvery && d > 260) {
            e.blinkT = 0;
            const ang = rng() * Math.PI * 2;
            e.blinkX = player.x + Math.cos(ang) * AFFIX.blinkDistance;
            e.blinkY = player.y + Math.sin(ang) * AFFIX.blinkDistance;
            e.blinkWarn = AFFIX.blinkWarn;
            fx.decal('shock', e.blinkX, e.blinkY + 20, 130, 60, 0xc9a8ff, 0.7, AFFIX.blinkWarn + 0.1);
          }
          break;
        default:
          break;
      }
    }
  }

  /** A telegraphed hit on the ground: a red circle now, and in `delay` seconds it lands. */
  strike(x: number, y: number, r: number, delay: number, damage: number, color: number): void {
    this.ctx.fx.decal('shock', x, y, r * 2, r, 0xff5a3c, 0.55, delay + 0.1);
    this.strikes.push({ x, y, r, t: delay, damage, color });
  }

  private updateStrikes(dt: number): void {
    const { player, fx } = this.ctx;
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const s = this.strikes[i];
      s.t -= dt;
      if (s.t > 0) continue;
      fx.shockwave(s.x, s.y, s.r, s.color);
      fx.sparksAt(s.x, s.y, 6, s.color);
      fx.decal('splat', s.x, s.y, s.r * 1.6, s.r * 0.8, s.color, 0.35, 1.5);
      if (Math.hypot(player.x - s.x, player.y - s.y) < s.r + player.radius * 0.6) this.ctx.hurtPlayer(s.damage);
      this.strikes.splice(i, 1);
    }
  }

  /** A splitter's half: smaller, weaker, worth little, and it won't split again. */
  private spawnSmall(parent: Enemy, x: number, y: number): void {
    const e = this.spawn(parent.def!.id, x, y);
    if (!e) return;
    e.small = true;
    e.scale = 0.62;
    e.maxHp = e.hp = parent.maxHp * 0.3;
    e.radius = parent.def!.radius * e.scale;
    e.xp = 1;
    e.coinChance = 0.03;
    e.speed *= 1.25;
    e.sprite.setScale(e.scale);
    const sw = e.sprite.displayWidth * 0.8;
    e.shadow.setDisplaySize(sw, sw * 0.3);
    // Thrown out of the burst.
    e.kx = (x - parent.x) * 6;
    e.ky = (y - parent.y) * 6;
  }

  spawnBoss(id: BossId, x: number, y: number, hpMult: number, enraged = false): Enemy {
    const def = BOSSES[id];
    const e = this.obtain();
    e.def = null;
    e.boss = def;
    e.x = x;
    e.y = y;
    e.elite = false;
    e.scale = 1;
    e.maxHp = e.hp = def.hp * hpMult * this.ctx.monsterHp();
    e.speed = def.speed;
    e.damage = def.damage * damageMultiplier(this.ctx.runTime) * this.ctx.monsterDamage;
    e.radius = def.radius;
    e.xp = 0;
    e.coinChance = 0;
    e.kbResist = 0.97;
    e.tex = def.texture;
    e.spawnT = 1;
    e.enter = BOSS_DROP;
    if (enraged) this.enrage(e, false);
    e.sprite.setTexture(def.texture).setDepth(11);
    const sw = e.sprite.displayWidth * 0.75;
    e.shadow.setDisplaySize(sw, sw * 0.28);
    return e;
  }

  /** The boss hits the ground: shock ring, dust, a jolt. */
  private land(e: Enemy): void {
    const fx = this.ctx.fx;
    const feet = e.y + e.sprite.height * 0.42;
    fx.shockwave(e.x, feet, e.radius * 3, e.boss!.color);
    fx.ring(e.x, feet, e.radius * 2.2, 0xffffff, 'shock', 3, 520);
    fx.dust(e.x - e.radius * 0.6, feet, 6);
    fx.dust(e.x + e.radius * 0.6, feet, 6);
    fx.decal('scorch', e.x, feet, e.radius * 3, e.radius * 1.4, 0x2a1f3d, 0.3, 3);
    this.ctx.shake(280, 0.01);
    this.ctx.hitStop(0.08);
    audio.sfx('explosion');
  }

  /** Sets an enemy on fire (the stronger burn wins; either way the timer restarts). */
  ignite(e: Enemy, dps: number): void {
    if (!e.active) return;
    e.burnDps = Math.max(e.burnDps * (e.burnLeft > 0 ? 1 : 0), dps);
    e.burnLeft = BURN_TIME * this.ctx.player.stats.durationMult;
  }

  /**
   * What the hero's runes add to a weapon hit: fire, a freeze, a lightning arc. Secondary damage (burns, arcs,
   * blasts, puddle ticks) never triggers runes, so nothing loops.
   */
  private runeProcs(e: Enemy, amount: number): void {
    const r = this.ctx.runes;
    const rng = this.ctx.rng;
    if (r.burn) this.ignite(e, amount * RUNE_POWER.burn[r.burn - 1]);
    if (r.freeze && rng() < RUNE_POWER.freeze[r.freeze - 1]) this.freezeSolid(e, FREEZE_TIME);
    if (r.chain && rng() < RUNE_POWER.chain[r.chain - 1]) {
      let from = e;
      const hit = new Set<number>([e.uid]);
      for (let k = 0; k < RUNE_POWER.chainTargets[r.chain - 1]; k++) {
        let next: Enemy | null = null;
        let best = 230 * 230;
        this.forEachInRadius(from.x, from.y, 230, (o) => {
          if (hit.has(o.uid)) return;
          const d = (o.x - from.x) ** 2 + (o.y - from.y) ** 2;
          if (d < best) {
            best = d;
            next = o;
          }
        });
        if (!next) break;
        const n: Enemy = next;
        hit.add(n.uid);
        this.ctx.fx.arc(from.x, from.y - 20, n.x, n.y - 20);
        this.damage(n, amount * 0.5, from.x, from.y, 0.3, false);
        from = n;
      }
    }
  }

  /** Freezes an enemy solid for `seconds` (longer with the Moon Charm); bosses are only slowed. */
  freezeSolid(e: Enemy, seconds: number): void {
    const t = seconds * this.ctx.player.stats.durationMult;
    if (e.isBoss) e.slow = Math.max(e.slow, t);
    else if (e.frozen <= 0) {
      e.frozen = t;
      e.stunned = false;
      this.ctx.fx.sparksAt(e.x, e.y, 4, 0xd4f4ff);
    }
  }

  /** Stuns an enemy (Bash): held still like a freeze, but not ice; bosses are only slowed. */
  stun(e: Enemy, seconds: number): void {
    const t = seconds * this.ctx.player.stats.durationMult;
    if (e.isBoss) e.slow = Math.max(e.slow, t);
    else if (e.frozen < t) {
      e.frozen = t;
      e.stunned = true;
    }
  }

  /** Deals damage (sometimes a critical hit, unless `canCrit` is false); returns true if the enemy died. */
  damage(e: Enemy, amount: number, fromX: number, fromY: number, knockback = 1, canCrit = true): boolean {
    if (!e.active || e.enter > 0) return false;
    const st = this.ctx.player.stats;
    // Hunter's Ring / Hunter's Mark against the big ones; the Berserker Mask when the hero is hurt.
    if (st.bigGame > 0 && (e.elite || e.isBoss)) amount *= 1 + st.bigGame;
    if (st.rage > 0 && this.ctx.player.hp < st.maxHp * 0.5) amount *= 1 + st.rage;
    // The Swordman's Berserk.
    if (this.ctx.player.berserk > 0) amount *= BERSERK.damage;
    const crit = canCrit && this.ctx.rng() < st.critChance;
    if (crit) {
      amount *= this.ctx.player.stats.critMult;
      knockback *= 1.5;
      this.ctx.fx.sparksAt(e.x, e.y, 5, 0xffd36b);
    }
    // A shield soaks up the hit first; the number shows blue while it does.
    const shown = amount;
    let soaked = 0;
    if (e.shield > 0) {
      soaked = Math.min(e.shield, amount);
      e.shield -= soaked;
      e.shieldIdle = 0;
      amount -= soaked;
      if (e.shield <= 0) {
        this.ctx.fx.ring(e.x, e.y, e.radius * 2.2, 0x6ff3ff, 'ring', 35, 260);
        this.ctx.fx.sparksAt(e.x, e.y, 8, 0x8ff6ff);
      }
    }
    e.hp -= amount;
    e.flash = 0.08;
    e.hitSquash = crit ? 1.4 : 1;
    this.ctx.fx.damageNumber(e.x, e.y - e.radius - 10, shown, soaked > 0 ? 0x8ff6ff : 0xffffff, crit);
    if (knockback > 0) {
      const dx = e.x - fromX;
      const dy = e.y - fromY;
      const d = Math.hypot(dx, dy) || 1;
      const k = 240 * knockback * (1 - e.kbResist);
      e.kx += (dx / d) * k;
      e.ky += (dy / d) * k;
    }
    audio.sfx('hit');
    // Nova Rune: a critical hit bursts onto the monsters around it (a few per frame at most).
    const nova = this.ctx.runes.nova;
    if (crit && nova && this.novasThisFrame < 8) {
      this.novasThisFrame++;
      const share = RUNE_POWER.nova[nova - 1];
      this.ctx.fx.ring(e.x, e.y, 90, 0xffd36b, 'ring', 35, 220);
      this.forEachInRadius(e.x, e.y, 90, (o) => {
        if (o !== e) this.damage(o, amount * share, e.x, e.y, 0.5, false);
      });
    }
    if (canCrit && e.hp > 0) this.runeProcs(e, amount);
    // Reaper Rune: a weapon hit finishes off a monster that is nearly dead.
    const reaper = this.ctx.runes.reaper;
    if (reaper && canCrit && e.hp > 0 && !e.isBoss && e.hp < e.maxHp * RUNE_POWER.reaper[reaper - 1]) {
      e.hp = 0;
      this.ctx.fx.sparksAt(e.x, e.y - 10, 6, 0xc9a8ff);
      this.ctx.fx.glow(e.x, e.y - 10, 30, 110, 0xb07aff, 0.2, 0.8);
    }
    if (e.hp <= 0) {
      this.kill(e);
      return true;
    }
    return false;
  }

  kill(e: Enemy): void {
    if (!e.active) return;
    e.active = false;
    e.sprite.setVisible(false);
    e.shadow.setVisible(false);
    this.hideExtras(e);
    if (!e.isBoss) this.regularCount--;
    const fx = this.ctx.fx;
    const color = e.color;
    // Volatile: bursts into a ring of shots (from where it died, so there is a moment to step aside).
    if (e.affixes.includes('volatile') && !e.selfDestructed) {
      const off = this.ctx.rng() * Math.PI;
      for (let k = 0; k < AFFIX.volatileShots; k++) this.fireShot('spirit', e.x, e.y, off + (k / AFFIX.volatileShots) * Math.PI * 2);
      fx.explosion(e.x, e.y, 70);
    }
    fx.corpse(e.sprite.texture.key, e.sprite.x, e.sprite.y, e.sprite.scaleY, e.sprite.flipX, e.elite ? ELITE_TINT : 0);
    fx.deathPuff(e.x, e.y, e.isBoss ? 3 : e.scale, color);
    if (!e.isBoss) fx.decal('splat', e.x, e.y + e.radius * 0.7, e.radius * 2.2, e.radius * 1.1, color, 0.32, 1.8);
    if (e.elite) {
      fx.sparkle(e.x, e.y, 6, ELITE_TINT);
      this.ctx.hitStop(0.05);
      this.ctx.shake(90, 0.003);
    }
    audio.sfx('enemy_die');
    this.ctx.onEnemyKilled(e);
    if (e.def?.behavior === 'splitter' && !e.small && !e.selfDestructed) {
      for (const side of [-1, 1]) this.spawnSmall(e, e.x + side * 34, e.y + side * 10);
    }
    const r = this.ctx.runes;
    if (r.leech && !e.selfDestructed) this.ctx.player.heal(RUNE_POWER.leech[r.leech - 1]);
    // Blast Rune: the body bursts (a few per frame at most, so chain reactions stay cheap).
    if (r.blast && !e.isBoss && !e.selfDestructed && this.blastsThisFrame < 6) {
      this.blastsThisFrame++;
      const radius = 70 + 15 * r.blast;
      const dmg = Math.min(150, e.maxHp * RUNE_POWER.blast[r.blast - 1]);
      this.ctx.fx.explosion(e.x, e.y, radius * 0.8);
      this.forEachInRadius(e.x, e.y, radius, (o) => this.damage(o, dmg, e.x, e.y, 0.8, false));
    }
  }

  /** An exploder's fuse runs out: a blast that hurts the hero and the monsters around it. */
  private explode(e: Enemy): void {
    const r = EXPLODE_RADIUS;
    const { player, fx } = this.ctx;
    fx.explosion(e.x, e.y, r);
    this.ctx.shake(160, 0.006);
    audio.sfx('explosion');
    if (Math.hypot(player.x - e.x, player.y - e.y) < r + player.radius) this.ctx.hurtPlayer(e.damage * 1.5);
    e.selfDestructed = true;
    this.forEachInRadius(e.x, e.y, r, (o) => {
      if (o !== e) this.damage(o, 25, e.x, e.y, 1.4, false);
    });
    this.kill(e);
  }

  /** Called when a fleeing enemy gets away. */
  onEscape?: (e: Enemy) => void;

  /** Takes an enemy out of the world quietly: no death, no reward. */
  remove(e: Enemy): void {
    if (!e.active) return;
    e.active = false;
    e.sprite.setVisible(false);
    e.shadow.setVisible(false);
    this.hideExtras(e);
    if (!e.isBoss) this.regularCount--;
  }

  /** Removes every enemy and shot without drops (used when a run ends). */
  clear(): void {
    for (const e of this.alive) {
      e.active = false;
      e.sprite.setVisible(false);
      e.shadow.setVisible(false);
      this.hideExtras(e);
    }
    this.compact();
    this.regularCount = 0;
    this.strikes = [];
    for (const s of this.shots) {
      s.active = false;
      s.sprite.setVisible(false);
      s.halo.setVisible(false);
    }
  }

  fireShot(kind: keyof typeof ENEMY_SHOTS, x: number, y: number, angle: number): void {
    const def = ENEMY_SHOTS[kind];
    let s = this.shots.find((o) => !o.active);
    if (!s) {
      const scene = this.ctx.scene;
      s = {
        active: false,
        sprite: scene.add.image(0, 0, def.texture).setDepth(30),
        halo: scene.add.image(0, 0, 'glow').setDepth(29).setTint(SHOT_DANGER),
        age: 0,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        radius: 0,
        damage: 0,
        life: 0,
        spin: 0,
      };
      this.shots.push(s);
    }
    s.active = true;
    s.age = 0;
    s.sprite.setTexture(def.texture).setVisible(true).setRotation(angle);
    // Monster magic is red-pink; the hero's is blue, white and gold.
    if (kind === 'fireball') s.sprite.clearTint();
    else s.sprite.setTint(SHOT_TINT);
    s.halo.setVisible(true).setDisplaySize(def.radius * 5, def.radius * 5);
    s.x = x;
    s.y = y;
    s.vx = Math.cos(angle) * def.speed;
    s.vy = Math.sin(angle) * def.speed;
    s.radius = def.radius;
    s.damage = def.damage * damageMultiplier(this.ctx.runTime) * this.ctx.monsterDamage;
    s.life = 4;
    s.spin = kind === 'fireball' ? 0 : 6;
  }

  /** Every enemy touching the line from (x1, y1) to (x2, y2), thickened to `halfWidth` either side. */
  forEachOnSegment(x1: number, y1: number, x2: number, y2: number, halfWidth: number, fn: (e: Enemy) => void): void {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const len2 = dx * dx + dy * dy || 1;
    const alive = this.alive;
    for (let i = 0; i < alive.length; i++) {
      const e = alive[i];
      if (!e.active || e.enter > 0) continue;
      const t = Phaser.Math.Clamp(((e.x - x1) * dx + (e.y - y1) * dy) / len2, 0, 1);
      const px = x1 + dx * t - e.x;
      const py = y1 + dy * t - e.y;
      const r = halfWidth + e.radius;
      if (px * px + py * py <= r * r) fn(e);
    }
  }

  /** Destroys monster shots within `r` of (x, y) (Ward Orbs), calling `onBlock` with where each one was. */
  blockShots(x: number, y: number, r: number, onBlock?: (sx: number, sy: number) => void): void {
    for (const s of this.shots) {
      if (!s.active) continue;
      const rr = r + s.radius;
      if ((s.x - x) ** 2 + (s.y - y) ** 2 > rr * rr) continue;
      s.active = false;
      s.sprite.setVisible(false);
      s.halo.setVisible(false);
      this.ctx.fx.sparksAt(s.x, s.y, 4, 0xfff1b8);
      onBlock?.(s.x, s.y);
    }
  }

  forEachInRadius(x: number, y: number, r: number, fn: (e: Enemy) => void): void {
    const alive = this.alive;
    this.hash.query(x, y, r + 140, (i) => {
      const e = alive[i];
      if (!e || !e.active) return;
      const rr = r + e.radius;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= rr * rr) fn(e);
    });
    // Bosses are kept out of the hash (they're bigger than a cell); check them directly.
    for (const e of alive) {
      if (!e.isBoss || !e.active) continue;
      const rr = r + e.radius;
      const dx = e.x - x;
      const dy = e.y - y;
      if (dx * dx + dy * dy <= rr * rr) fn(e);
    }
  }

  nearest(x: number, y: number, maxDist: number): Enemy | null {
    let best: Enemy | null = null;
    let bestD = maxDist * maxDist;
    for (const e of this.alive) {
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < bestD) {
        bestD = d;
        best = e;
      }
    }
    return best;
  }

  /** Up to n closest enemies within maxDist, nearest first. */
  nearestN(x: number, y: number, n: number, maxDist: number): Enemy[] {
    const max2 = maxDist * maxDist;
    const list: { e: Enemy; d: number }[] = [];
    for (const e of this.alive) {
      if (!e.active) continue;
      const d = (e.x - x) ** 2 + (e.y - y) ** 2;
      if (d < max2) list.push({ e, d });
    }
    list.sort((a, b) => a.d - b.d);
    return list.slice(0, n).map((o) => o.e);
  }

  inRect(rect: Phaser.Geom.Rectangle): Enemy[] {
    return this.alive.filter((e) => e.active && rect.contains(e.x, e.y));
  }

  private compact(): void {
    let j = 0;
    for (let i = 0; i < this.alive.length; i++) {
      const e = this.alive[i];
      if (e.active) this.alive[j++] = e;
      else this.pool.push(e);
    }
    this.alive.length = j;
  }

  update(dt: number): void {
    const { player } = this.ctx;
    const px = player.x;
    const py = player.y;
    const view = this.ctx.view();
    const relocate = Math.hypot(view.width, view.height) * 0.75 + 300;
    let contact = 0;
    this.blastsThisFrame = 0;
    this.novasThisFrame = 0;

    for (let i = 0; i < this.alive.length; i++) {
      const e = this.alive[i];
      if (!e.active) continue;
      if (e.enter > 0) {
        this.dropIn(e, dt);
        continue;
      }
      let dx = px - e.x;
      let dy = py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      e.slow -= dt;
      if (e.burnLeft > 0) {
        e.burnLeft -= dt;
        e.burnTick -= dt;
        if (e.burnTick <= 0) {
          e.burnTick = 0.5;
          this.damage(e, e.burnDps * 0.5, e.x, e.y, 0, false);
          if (Math.random() < 0.6) this.ctx.fx.sparksAt(e.x, e.y - 10, 2, 0xff8a3d);
          if (!e.active) continue;
        }
      }
      if (e.frozen > 0) {
        // Frozen solid: no moving, no hurting, just the knockback it already had.
        e.frozen -= dt;
        e.x += e.kx * dt;
        e.y += e.ky * dt;
        e.kx *= Math.exp(-9 * dt);
        e.ky *= Math.exp(-9 * dt);
        this.animate(e, dt, 0, 0);
        continue;
      }
      if (e.affixes.length) this.updateAffixes(e, dt, d);
      const speed = e.speed * (e.slow > 0 ? 0.6 : 1);
      let vx = dx * speed;
      let vy = dy * speed;
      let faceX = dx;
      e.timer += dt;

      if (e.boss) {
        const v = this.updateBoss(e, dt, d, dx, dy, speed);
        vx = v.x;
        vy = v.y;
        if (e.state === 2) faceX = e.dirX;
      } else {
        switch (e.def!.behavior) {
          case 'bat': {
            const w = Math.sin(e.timer * 3.2 + e.phase) * 0.8;
            const c = Math.cos(w);
            const s = Math.sin(w);
            vx = (dx * c - dy * s) * speed;
            vy = (dx * s + dy * c) * speed;
            break;
          }
          case 'ranged': {
            const side = e.phase > Math.PI ? 1 : -1;
            if (d < 330) {
              vx = -dx * speed * 0.8;
              vy = -dy * speed * 0.8;
            } else if (d < 470) {
              vx = dy * side * speed * 0.5;
              vy = -dx * side * speed * 0.5;
            }
            e.timer2 += dt;
            if (e.timer2 > (e.def!.shotEvery ?? 2.6) && d < 760) {
              e.timer2 = 0;
              this.fireShot(e.def!.shot ?? 'fireball', e.x, e.y, Math.atan2(dy, dx));
            }
            break;
          }
          case 'swarm': {
            // Faster, tighter weave than a bat, so a flock reads as a buzzing cloud.
            const w = Math.sin(e.timer * 5 + e.phase) * 0.55;
            const c = Math.cos(w);
            const s = Math.sin(w);
            vx = (dx * c - dy * s) * speed;
            vy = (dx * s + dy * c) * speed;
            break;
          }
          case 'exploder': {
            if (e.state === 0 && d < 125) {
              // Fuse lit: it stops, flashes and swells, and a red ring shows the blast.
              e.state = 1;
              e.timer2 = 0;
              this.ctx.fx.decal('shock', e.x, e.y, EXPLODE_RADIUS * 2, EXPLODE_RADIUS, 0xff5a3c, 0.5, FUSE + 0.1);
            }
            if (e.state === 1) {
              vx = vy = 0;
              e.timer2 += dt;
              if (e.timer2 >= FUSE) {
                this.explode(e);
                continue;
              }
            }
            break;
          }
          case 'flee': {
            // Runs from the hero with a zig-zag, and slips away for good after a while.
            const w = Math.sin(e.timer * 2.4 + e.phase) * 0.7;
            vx = (-dx * Math.cos(w) + dy * Math.sin(w)) * speed;
            vy = (-dy * Math.cos(w) - dx * Math.sin(w)) * speed;
            faceX = -dx;
            if (e.timer > GOBLIN_ESCAPE) {
              this.ctx.fx.deathPuff(e.x, e.y, 1, 0xd8d0b0);
              this.remove(e);
              this.onEscape?.(e);
              continue;
            }
            break;
          }
          case 'ambush': {
            if (e.state === 0) {
              vx = vy = 0;
              if (d < 270 || e.hp < e.maxHp) {
                // Wakes up: a jump, a snap of the jaws, then it runs at the hero.
                e.state = 1;
                e.spawnT = 0.4;
                this.ctx.fx.sparksAt(e.x, e.y - 20, 6, 0xffd36b);
                this.ctx.shake(120, 0.004);
                audio.sfx('hit');
              }
            }
            break;
          }
          case 'charge': {
            const v = this.updateCharge(e, dt, d, dx, dy, 560, 0.45, 3);
            vx = v.x * (v.charging ? 1 : speed);
            vy = v.y * (v.charging ? 1 : speed);
            if (e.state === 2) faceX = e.dirX;
            break;
          }
          default:
            break;
        }
      }

      const decay = Math.exp(-9 * dt);
      e.x += (vx + e.kx) * dt;
      e.y += (vy + e.ky) * dt;
      e.kx *= decay;
      e.ky *= decay;

      const sleeping = e.def?.behavior === 'ambush' && e.state === 0;
      e.thornT -= dt;
      if (d < e.radius + player.radius * 0.85 && !sleeping) {
        contact = Math.max(contact, e.damage);
        // Thorn Mail pricks whatever touches the hero and shoves it away.
        const thorns = player.stats.thorns;
        if (thorns > 0 && e.thornT <= 0) {
          e.thornT = 0.6;
          this.ctx.fx.sparksAt(e.x, e.y, 3, 0xc8e070);
          this.damage(e, thorns * player.stats.damageMult, px, py, 2.5, false);
        }
      }

      if (!e.boss && d > relocate && e.def?.behavior === 'flee') {
        // Ran clean off the screen: gone.
        this.remove(e);
        this.onEscape?.(e);
        continue;
      }
      if (!e.boss && d > relocate) {
        const p = this.ctx.spawnPoint();
        e.x = p.x;
        e.y = p.y;
      }

      this.animate(e, dt, vx, faceX);
    }

    // Rebuild the spatial hash, then push overlapping enemies apart.
    this.hash.clear();
    for (let i = 0; i < this.alive.length; i++) {
      const e = this.alive[i];
      if (e.active && !e.isBoss) this.hash.insert(i, e.x, e.y);
    }
    this.separate();

    if (contact > 0) this.ctx.hurtPlayer(contact);
    this.updateShots(dt);
    this.updateStrikes(dt);
    this.compact();
    // Indices changed during compaction: rebuild so weapons query current indices.
    this.hash.clear();
    for (let i = 0; i < this.alive.length; i++) {
      const e = this.alive[i];
      if (!e.isBoss) this.hash.insert(i, e.x, e.y);
    }
  }

  /** Two-frame flip plus procedural motion on top: hops, wingbeats, waddles, lean, hit squash, pop-in. */
  private animate(e: Enemy, dt: number, vx: number, faceX: number): void {
    e.anim += dt;
    const sleeping = e.def?.behavior === 'ambush' && e.state === 0;
    if (!e.boss && e.anim > 0.2 && !sleeping) {
      e.anim = 0;
      e.frame ^= 1;
      e.sprite.setTexture(`${e.tex}_${e.frame}`);
    }
    if (Math.abs(faceX) > 0.25) e.face = faceX < 0 ? -1 : 1;
    e.sprite.setFlipX(e.face < 0);
    e.hitSquash *= Math.exp(-12 * dt);
    const leanTarget = Phaser.Math.Clamp(vx / Math.max(1, e.speed), -1, 1) * 0.1;
    e.lean += (leanTarget - e.lean) * Math.min(1, dt * 10);

    const t = e.timer + e.phase;
    let lift = 0;
    let sx = 1;
    let sy = 1;
    let rot = 0;
    if (e.boss) {
      const breathe = 1 + Math.sin(e.timer * 3) * 0.03;
      const squash = e.state === 1 ? 0.9 : 1;
      sx = (2 - breathe) * (2 - squash);
      sy = breathe * squash;
      rot = e.lean * 0.5;
      if (e.state === 2 && Math.random() < dt * 30) this.ctx.fx.dust(e.x, e.y + e.radius * 0.8, 2);
    } else {
      switch (e.def!.motion) {
        case 'hop': {
          const u = (t * 1.8) % 1;
          if (u < 0.7) {
            lift = Math.sin((u / 0.7) * Math.PI) * 22;
            sx = 0.92;
            sy = 1.1;
          } else {
            const k = Math.sin(((u - 0.7) / 0.3) * Math.PI);
            sx = 1 + 0.2 * k;
            sy = 1 - 0.17 * k;
          }
          break;
        }
        case 'flap':
          lift = 18 + Math.sin(t * 10) * 7;
          rot = Math.sin(t * 10) * 0.06;
          break;
        case 'float':
          lift = 18 + Math.sin(t * 3) * 9;
          rot = Math.sin(t * 2.2) * 0.08;
          break;
        case 'walk': {
          const w = Math.sin(t * 9);
          lift = Math.abs(w) * 6;
          rot = w * 0.09;
          sx = 1 - Math.abs(w) * 0.03;
          sy = 1 + Math.abs(w) * 0.04;
          break;
        }
        case 'heavy': {
          const w = Math.sin(t * 5.5);
          lift = Math.abs(w) * 4;
          rot = w * 0.06;
          sx = 1 + (1 - Math.abs(w)) * 0.05;
          sy = 1 - (1 - Math.abs(w)) * 0.05;
          break;
        }
      }
      rot += e.lean;
      if (sleeping) {
        // Playing dead as treasure: still, with a tiny rattle of the lid every few seconds.
        lift = 0;
        sx = sy = 1;
        rot = (e.timer + e.phase) % 3 < 0.3 ? Math.sin(e.timer * 40) * 0.04 : 0;
      } else if (e.def!.behavior === 'exploder' && e.state === 1) {
        const k = e.timer2 / FUSE;
        sx = sy = 1 + 0.25 * k;
        rot = Math.sin(e.timer * 50) * 0.05;
      } else if (e.def!.behavior === 'ambush') {
        // Awake: no charge wind-up, just the heavy stomp.
      } else if (e.state === 1) {
        // Winding up a charge: crouch.
        sx *= 1.12;
        sy *= 0.86;
      } else if (e.state === 2 && e.def!.behavior === 'charge') {
        // Dashing: stretch out and kick up dust.
        sx *= 1.2;
        sy *= 0.86;
        rot = 0;
        if (Math.random() < dt * 30) this.ctx.fx.dust(e.x, e.y + e.radius * 0.8);
      }
    }
    sx *= 1 + 0.22 * e.hitSquash;
    sy *= 1 - 0.18 * e.hitSquash;
    if (e.spawnT < 1) {
      e.spawnT = Math.min(1, e.spawnT + dt / 0.3);
      const k = Phaser.Math.Easing.Back.Out(e.spawnT);
      sx *= k;
      sy *= k;
    }
    e.sprite.setScale(e.scale * sx, e.scale * sy).setRotation(rot);
    if (e.flash > 0) {
      e.flash -= dt;
      if (e.flash > 0) e.sprite.setTintFill(0xffffff);
      else if (e.elite) e.sprite.setTint(ELITE_TINT);
      else e.sprite.clearTint();
    }
    // Ice blue while frozen, a flickering orange while on fire, back to normal (or elite gold) after.
    if (e.flash <= 0) {
      if (e.frozen > 0) e.sprite.setTint(e.stunned ? 0xfff0a0 : 0x9fdcff);
      else if (e.burnLeft > 0) e.sprite.setTint(Math.floor(e.timer * 10) % 2 ? 0xffb38a : 0xff8a5a);
      else if (e.elite) {
        if (e.sprite.tintTopLeft !== ELITE_TINT) e.sprite.setTint(ELITE_TINT);
      } else if (e.sprite.isTinted) e.sprite.clearTint();
    }
    // A lit fuse blinks white and red.
    if (e.def?.behavior === 'exploder' && e.state === 1) e.sprite.setTintFill(Math.floor(e.timer2 * 14) % 2 ? 0xffffff : 0xff5a3c);
    const halfH = e.sprite.height * e.scale * 0.5;
    const wind = e.state === 1 ? Math.sin(e.timer * 60) * 4 : 0;
    e.sprite.setPosition(e.x + wind, e.y + halfH - lift);
    e.shadow.setPosition(e.x, e.y + halfH * 0.84).setAlpha(Phaser.Math.Clamp(1 - lift / 70, 0.4, 1));
    if (e.aura?.visible) {
      const r = e.radius * (e.isBoss ? 2.6 : 3);
      e.aura.setPosition(e.x, e.y + halfH * 0.75).setDisplaySize(r * (1 + 0.08 * Math.sin(e.timer * 6)), r * 0.5).setAlpha(0.75 + 0.25 * Math.sin(e.timer * 6));
    }
    if (e.label?.visible) e.label.setPosition(e.x, e.y + halfH - e.sprite.displayHeight - 6 - lift);
    if (e.bubble) {
      const on = e.shield > 0;
      e.bubble.setVisible(on);
      if (on) e.bubble.setPosition(e.x, e.y + halfH * 0.1 - lift).setDisplaySize(e.radius * 2.7, e.radius * 2.7).setAlpha(0.35 + 0.5 * (e.shield / e.shieldMax));
    }
  }

  /** A boss falling from the sky onto its spot, its shadow growing beneath it. */
  private dropIn(e: Enemy, dt: number): void {
    e.enter -= dt;
    const u = 1 - Math.max(0, e.enter) / BOSS_DROP;
    const halfH = e.sprite.height * 0.5;
    const fall = (1 - u) * (1 - u) * 1100;
    e.sprite.setScale(1 - 0.12 * (1 - u), 1 + 0.12 * (1 - u)).setRotation(0);
    e.sprite.setPosition(e.x, e.y + halfH - fall);
    e.shadow.setPosition(e.x, e.y + halfH * 0.84).setAlpha(0.2 + 0.8 * u);
    if (e.enter <= 0) {
      e.enter = 0;
      this.land(e);
    }
  }

  private separate(): void {
    const alive = this.alive;
    for (let i = 0; i < alive.length; i++) {
      const a = alive[i];
      if (!a.active) continue;
      let checks = 0;
      this.hash.query(a.x, a.y, a.radius * 2, (j) => {
        if (j === i || checks > 8) return;
        const b = alive[j];
        if (!b.active) return;
        checks++;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const min = (a.radius + b.radius) * 0.8;
        const d2 = dx * dx + dy * dy;
        if (d2 >= min * min || d2 === 0) return;
        const d = Math.sqrt(d2);
        const push = ((min - d) / d) * 0.25;
        a.x += dx * push;
        a.y += dy * push;
      });
      if (a.isBoss) continue;
      // Bosses shove regular enemies out of the way.
      for (const b of alive) {
        if (!b.isBoss || !b.active) continue;
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const min = a.radius + b.radius * 0.8;
        const d2 = dx * dx + dy * dy;
        if (d2 < min * min && d2 > 0) {
          const d = Math.sqrt(d2);
          a.x += (dx / d) * (min - d) * 0.5;
          a.y += (dy / d) * (min - d) * 0.5;
        }
      }
    }
  }

  /** Shared dash logic: chase -> wind-up (shake) -> dash in a locked direction. */
  private updateCharge(e: Enemy, dt: number, d: number, dx: number, dy: number, dashSpeed: number, windup: number, every: number) {
    e.timer2 += dt;
    if (e.state === 0) {
      if (e.timer2 > every && d < 650) {
        e.state = 1;
        e.timer2 = 0;
        e.dirX = dx;
        e.dirY = dy;
      }
      return { x: dx, y: dy, charging: false };
    }
    if (e.state === 1) {
      if (e.timer2 > windup) {
        e.state = 2;
        e.timer2 = 0;
      }
      return { x: 0, y: 0, charging: true };
    }
    if (e.timer2 > 0.6) {
      e.state = 0;
      e.timer2 = 0;
    }
    return { x: e.dirX * dashSpeed, y: e.dirY * dashSpeed, charging: true };
  }

  /**
   * The Ogre Warden: plods after the hero, then stops, raises its club (a red ring marks the ground) and slams,
   * hurting the hero if still inside the ring.
   */
  private updateSlam(e: Enemy, dt: number, d: number, dx: number, dy: number, speed: number): { x: number; y: number } {
    const R = 250;
    e.timer2 += dt;
    if (e.state === 0) {
      if (e.timer2 > 3.4 && d < R + 140) {
        e.state = 1;
        e.timer2 = 0;
        this.ctx.fx.decal('shock', e.x, e.y + e.radius * 0.6, R * 2, R, 0xff5a3c, 0.5, 0.95);
      }
      return { x: dx * speed, y: dy * speed };
    }
    if (e.timer2 > 0.85) {
      e.state = 0;
      e.timer2 = 0;
      const { player, fx } = this.ctx;
      const feet = e.y + e.radius * 0.6;
      fx.shockwave(e.x, feet, R * 1.1, e.boss!.color);
      fx.dust(e.x - 60, feet, 6);
      fx.dust(e.x + 60, feet, 6);
      this.ctx.shake(260, 0.01);
      audio.sfx('explosion');
      if (Math.hypot(player.x - e.x, player.y - feet) < R + player.radius) this.ctx.hurtPlayer(e.damage * 1.4);
      if (e.enraged) {
        const off = this.ctx.rng() * Math.PI;
        for (let k = 0; k < 12; k++) this.fireShot('orb', e.x, feet, off + (k / 12) * Math.PI * 2);
      }
    }
    return { x: 0, y: 0 };
  }

  private summonAround(id: EnemyId, cx: number, cy: number, n: number, r: number): void {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + this.ctx.rng();
      this.spawn(id, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  }

  /** Called once when a boss turns angry (to tell the player). */
  onEnrage?: (e: Enemy) => void;

  /** A boss turns angry: faster, a red glow underneath, and a new attack (see enragedAttack). */
  private enrage(e: Enemy, announce = true): void {
    e.enraged = true;
    e.speed *= 1.15;
    e.ptimer = 0;
    this.extras(e);
    e.aura!.setTint(ENRAGED_GLOW).setVisible(true);
    if (announce) {
      this.ctx.fx.ring(e.x, e.y, e.radius * 2.6, ENRAGED_GLOW);
      this.ctx.shake(200, 0.006);
      audio.sfx('boss_warning');
      this.onEnrage?.(e);
    }
  }

  /** Each boss's extra attack while enraged. */
  private enragedAttack(e: Enemy, dt: number, dx: number, dy: number): void {
    const { player, rng } = this.ctx;
    e.ptimer += dt;
    switch (e.boss!.id) {
      case 'boss_slime':
        // Goo rains down around the hero.
        if (e.ptimer > 5.5) {
          e.ptimer = 0;
          for (let k = 0; k < 6; k++) {
            const a = rng() * Math.PI * 2;
            const r = k === 0 ? 0 : 90 + rng() * 170;
            this.strike(player.x + Math.cos(a) * r, player.y + Math.sin(a) * r, 95, 1 + k * 0.08, e.damage * 0.9, 0xff7eb6);
          }
        }
        break;
      case 'boss_lich':
        // A two-armed spiral of orbs.
        if (e.pcount > 0) {
          if (e.ptimer >= 0.16) {
            e.ptimer = 0;
            e.pcount--;
            e.pangle += 0.42;
            this.fireShot('orb', e.x, e.y, e.pangle);
            this.fireShot('orb', e.x, e.y, e.pangle + Math.PI);
          }
        } else if (e.ptimer > 5) {
          e.ptimer = 0;
          e.pcount = 18;
          e.pangle = rng() * Math.PI * 2;
        }
        break;
      case 'boss_demon':
        // A full ring of fireballs.
        if (e.ptimer > 4.5) {
          e.ptimer = 0;
          const off = rng() * Math.PI;
          for (let k = 0; k < 14; k++) this.fireShot('fireball', e.x, e.y, off + (k / 14) * Math.PI * 2);
        }
        break;
      case 'boss_boar':
        // Stomps the ground where it stands.
        if (e.ptimer > 3.2) {
          e.ptimer = 0;
          this.strike(e.x, e.y + e.radius * 0.5, 190, 0.65, e.damage * 1.2, 0xc89a5a);
        }
        break;
      case 'boss_captain':
        // Hurls a fan of spirit shots at the hero.
        if (e.ptimer > 3.5) {
          e.ptimer = 0;
          const base = Math.atan2(dy, dx);
          for (let k = -2; k <= 2; k++) this.fireShot('spirit', e.x, e.y, base + k * 0.22);
        }
        break;
      default:
        // The Ogre Warden's slam throws out a ring of shots (see updateSlam).
        break;
    }
  }

  private updateBoss(e: Enemy, dt: number, d: number, dx: number, dy: number, speed: number): { x: number; y: number } {
    const id = e.boss!.id;
    const ratio = e.hp / e.maxHp;
    if (!e.enraged && ratio < 0.5) this.enrage(e);
    if (e.enraged) this.enragedAttack(e, dt, dx, dy);
    if (id === 'boss_boar') {
      // Charges again and again, faster when hurt.
      const v = this.updateCharge(e, dt, d, dx, dy, 680, 0.5, ratio < 0.5 ? 2 : 2.8);
      return v.charging ? { x: v.x, y: v.y } : { x: v.x * speed, y: v.y * speed };
    }
    if (id === 'boss_captain') {
      e.timer3 += dt;
      if (e.timer3 > 8) {
        e.timer3 = 0;
        this.summonAround('skeleton', e.x, e.y, 3, 150);
        this.ctx.fx.ring(e.x, e.y, 220, 0xf2ead3);
      }
      const v = this.updateCharge(e, dt, d, dx, dy, 600, 0.55, 4);
      return v.charging ? { x: v.x, y: v.y } : { x: v.x * speed, y: v.y * speed };
    }
    if (id === 'boss_ogre') return this.updateSlam(e, dt, d, dx, dy, speed);
    if (id === 'boss_slime') {
      e.timer2 += dt;
      if (e.timer2 > 4.5) {
        e.timer2 = 0;
        this.summonAround('slime', e.x, e.y, 4, 170);
        this.ctx.fx.ring(e.x, e.y, 260, 0xff7eb6);
      }
      if (e.thresholds < 2 && ratio < (e.thresholds === 0 ? 0.66 : 0.33)) {
        e.thresholds++;
        this.summonAround('slime', e.x, e.y, 8 + e.thresholds * 2, 220);
        this.ctx.fx.ring(e.x, e.y, 340, 0xff7eb6);
      }
      return { x: dx * speed, y: dy * speed };
    }
    if (id === 'boss_lich') {
      e.timer2 += dt;
      e.timer3 += dt;
      if (e.timer2 > 3.2) {
        e.timer2 = 0;
        const n = ratio < 0.5 ? 14 : 10;
        const off = this.ctx.rng() * Math.PI;
        for (let k = 0; k < n; k++) this.fireShot('orb', e.x, e.y, off + (k / n) * Math.PI * 2);
      }
      if (e.timer3 > 7) {
        e.timer3 = 0;
        this.summonAround('skeleton', this.ctx.player.x, this.ctx.player.y, 5, 520);
      }
      if (d < 380) return { x: -dx * speed, y: -dy * speed };
      if (d < 520) return { x: dy * speed * 0.6, y: -dx * speed * 0.6 };
      return { x: dx * speed, y: dy * speed };
    }
    // Demon Lord: dashes and fireball fans.
    e.timer3 += dt;
    if (e.timer3 > (ratio < 0.5 ? 2.4 : 3.4) && e.state === 0) {
      e.timer3 = 0;
      const base = Math.atan2(dy, dx);
      for (let k = -2; k <= 2; k++) this.fireShot('fireball', e.x, e.y, base + k * 0.24);
    }
    const v = this.updateCharge(e, dt, d, dx, dy, 720, 0.6, 4.5);
    return v.charging ? { x: v.x, y: v.y } : { x: v.x * speed, y: v.y * speed };
  }

  private updateShots(dt: number): void {
    const { player } = this.ctx;
    for (const s of this.shots) {
      if (!s.active) continue;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.life -= dt;
      if (s.spin) s.sprite.rotation += s.spin * dt;
      s.sprite.setPosition(s.x, s.y);
      s.age += dt;
      s.halo.setPosition(s.x, s.y).setAlpha(0.45 + 0.25 * Math.sin(s.age * 18));
      const rr = s.radius + player.radius * 0.8;
      if ((s.x - player.x) ** 2 + (s.y - player.y) ** 2 < rr * rr) {
        this.ctx.hurtPlayer(s.damage);
        s.life = 0;
      }
      if (s.life <= 0) {
        s.active = false;
        s.sprite.setVisible(false);
        s.halo.setVisible(false);
      }
    }
  }
}
