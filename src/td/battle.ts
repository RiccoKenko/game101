/**
 * One battle as plain data and rules, with no drawing. The play screen calls `step`, draws the state, and
 * turns `drain()`'s events into animations, sounds and effects. The same seed and the same player inputs
 * always give the same battle, which the tests rely on.
 */
import { mulberry32, type Rng } from '../core/rng';
import { nextCost, Purse, sellValue } from './economy';
import type { LevelDef } from './levels';
import { closedCurve, insidePolygon, Path, type Pt } from './path';
import { intercept, pickTarget, type TargetMode } from './targeting';
import { afterArmor, ENEMIES, HERO, TOWERS, type DamageType, type EnemyDef, type EnemyKind, type TowerKind } from './units';
import { stars, Vault } from './vault';
import { WaveRunner } from './waves';

/** How close (along the road) a pirate must pass to grab a dropped crystal. */
const PICKUP = 24;
/** Arrows leave a tower this far above its spot, and the hero's bow this far above the feet. */
export const TOWER_TOP = 80;
const HERO_BOW = 55;
/** The longest step simulated at once; longer frames are split. */
const MAX_STEP = 1 / 30;

export interface Enemy {
  id: number;
  kind: EnemyKind;
  def: EnemyDef;
  hp: number;
  /** Distance along the road from the dock. */
  d: number;
  /** +1 walking to the vault, −1 walking back to the dock. */
  heading: 1 | -1;
  /** Sideways offset from the road's centre line (mirrored on the way back, so pirates pass each other). */
  lane: number;
  /** Id of the crystal it carries. */
  crystal: number | null;
  /** Feet position on the map, and velocity. */
  pos: Pt;
  vel: Pt;
  progress: number;
  carrying: boolean;
  flying: boolean;
  /** Speed multiplier from frost (1 when not chilled), and seconds the chill has left. */
  slow: number;
  slowFor: number;
}

export interface Tower {
  id: number;
  slot: number;
  kind: TowerKind;
  level: number;
  mode: TargetMode;
  cooldown: number;
  /** Direction of the last shot, in radians (map axes, y down). */
  aim: number;
}

export interface Shot {
  id: number;
  by: 'hero' | 'tower';
  /** Arrows home in on their target; shells fly to a spot on the ground and burst there. */
  kind: 'arrow' | 'shell';
  /** Where it was fired from (map, at ground level for shells, which the screen draws on an arc). */
  start: Pt;
  pos: Pt;
  /** Unit direction of flight. */
  dir: Pt;
  /** The enemy an arrow follows; -1 for shells. */
  target: number;
  /** Where the target was last seen (an arrow lands there if the target is gone), or a shell's landing spot. */
  aimAt: Pt;
  speed: number;
  damage: number;
  damageType: DamageType;
  /** Shells: blast radius. */
  splash: number;
  crit: boolean;
}

export interface HeroState {
  pos: Pt;
  goal: Pt | null;
  facing: 1 | -1;
  cooldown: number;
  /** Drawing the bow at a target; the arrow leaves after HERO.windup. */
  drawing: { target: number; t: number } | null;
}

export type BattleEvent =
  | { type: 'wave'; index: number; bonus: number }
  | { type: 'spawn'; enemy: Enemy }
  | { type: 'draw'; target: Enemy }
  | { type: 'shoot'; shot: Shot; from: Pt; tower: Tower | null }
  /** `blocked`: damage the armour stopped. */
  | { type: 'hit'; enemy: Enemy; damage: number; blocked: number; crit: boolean; at: Pt }
  | { type: 'boom'; shot: Shot; at: Pt; radius: number }
  | { type: 'zap'; tower: Tower; from: Pt; to: Pt; enemy: Enemy }
  | { type: 'pulse'; tower: Tower; at: Pt; radius: number; enemies: Enemy[] }
  | { type: 'kill'; enemy: Enemy; bounty: number }
  | { type: 'land'; shot: Shot }
  | { type: 'steal'; enemy: Enemy }
  | { type: 'drop'; enemy: Enemy; at: Pt }
  | { type: 'recover' }
  | { type: 'escape'; enemy: Enemy; lost: boolean }
  | { type: 'build' | 'upgrade'; tower: Tower }
  | { type: 'sell'; slot: number; refund: number }
  | { type: 'win'; stars: 1 | 2 | 3 }
  | { type: 'lose' };

export type BattleState = 'ready' | 'playing' | 'won' | 'lost';

export class Battle {
  readonly path: Path;
  readonly island: Pt[];
  readonly vault: Vault;
  readonly waves: WaveRunner;
  readonly purse: Purse;
  readonly towers: (Tower | null)[];
  enemies: Enemy[] = [];
  shots: Shot[] = [];
  readonly hero: HeroState;
  state: BattleState = 'ready';
  time = 0;
  private events: BattleEvent[] = [];
  private nextId = 1;
  private rng: Rng;

  constructor(readonly level: LevelDef, seed = 1) {
    this.rng = mulberry32(seed);
    this.path = new Path(level.route);
    this.island = closedCurve(level.island);
    this.vault = new Vault(level.crystals);
    this.waves = new WaveRunner(level.waves);
    this.purse = new Purse(level.startGold);
    this.towers = level.slots.map(() => null);
    this.hero = { pos: [...level.heroStart], goal: null, facing: 1, cooldown: 0, drawing: null };
  }

  get over(): boolean {
    return this.state === 'won' || this.state === 'lost';
  }

  /** Events since the last call, oldest first. */
  drain(): BattleEvent[] {
    const out = this.events;
    this.events = [];
    return out;
  }

  // ---------------------------------------------------------------- player actions

  /** Starts the next wave now (the first wave waits for this). */
  callWave(): boolean {
    if (this.over || !this.waves.canCall) return false;
    const bonus = this.waves.callNext();
    this.purse.earn(bonus);
    this.state = 'playing';
    this.events.push({ type: 'wave', index: this.waves.wave, bonus });
    return true;
  }

  build(slot: number, kind: TowerKind = 'archer'): Tower | null {
    if (this.over || slot < 0 || slot >= this.towers.length || this.towers[slot]) return null;
    if (!this.purse.spend(nextCost(TOWERS[kind], 0)!)) return null;
    const tower: Tower = { id: this.nextId++, slot, kind, level: 1, mode: 'first', cooldown: 0, aim: -Math.PI / 2 };
    this.towers[slot] = tower;
    this.events.push({ type: 'build', tower });
    return tower;
  }

  upgrade(slot: number): Tower | null {
    const tower = this.towers[slot];
    if (this.over || !tower) return null;
    const cost = nextCost(TOWERS[tower.kind], tower.level);
    if (cost === null || !this.purse.spend(cost)) return null;
    tower.level++;
    this.events.push({ type: 'upgrade', tower });
    return tower;
  }

  sell(slot: number): number {
    const tower = this.towers[slot];
    if (this.over || !tower) return 0;
    const refund = sellValue(TOWERS[tower.kind], tower.level);
    this.purse.earn(refund);
    this.towers[slot] = null;
    this.events.push({ type: 'sell', slot, refund });
    return refund;
  }

  /** Sends the hero walking to `p`. False if `p` is off the island. */
  moveHero(p: Pt): boolean {
    if (this.over || !insidePolygon(this.island, p)) return false;
    this.hero.goal = [p[0], p[1]];
    this.hero.drawing = null;
    return true;
  }

  // ---------------------------------------------------------------- simulation

  step(dt: number): void {
    while (dt > 1e-9 && !this.over) {
      const h = Math.min(dt, MAX_STEP);
      this.tick(h);
      dt -= h;
    }
  }

  private tick(dt: number): void {
    this.time += dt;
    const before = this.waves.wave;
    for (const kind of this.waves.update(dt)) this.spawn(kind);
    if (this.waves.wave !== before) {
      this.state = 'playing';
      this.events.push({ type: 'wave', index: this.waves.wave, bonus: 0 });
    }
    this.moveEnemies(dt);
    for (let n = this.vault.update(dt, this.path.length).length; n > 0; n--) this.events.push({ type: 'recover' });
    this.updateHero(dt);
    this.updateTowers(dt);
    this.moveShots(dt);
    if (this.vault.remaining === 0) {
      this.state = 'lost';
      this.events.push({ type: 'lose' });
    } else if (this.waves.finished && this.enemies.length === 0 && this.vault.dropped().length === 0 && this.state === 'playing') {
      this.state = 'won';
      this.events.push({ type: 'win', stars: stars(this.vault.remaining, this.vault.total) });
    }
  }

  private spawn(kind: EnemyKind): void {
    const def = ENEMIES[kind];
    const lane = (this.rng() - 0.5) * 0.55 * this.level.roadWidth;
    const enemy: Enemy = {
      id: this.nextId++, kind, def, hp: def.hp, d: 0, heading: 1, lane, crystal: null,
      pos: [0, 0], vel: [0, 0], progress: 0, carrying: false, flying: def.flying, slow: 1, slowFor: 0,
    };
    this.place(enemy, def.speed);
    this.enemies.push(enemy);
    this.events.push({ type: 'spawn', enemy });
  }

  /** Sets the enemy's map position, velocity and progress from its place on the road. */
  private place(e: Enemy, speed: number): void {
    const L = this.path.length;
    const [x, y] = this.path.at(e.d);
    const [dx, dy] = this.path.dirAt(e.d);
    const side = e.lane * e.heading;
    e.pos = [x - dy * side, y + dx * side];
    e.vel = [dx * speed * e.heading, dy * speed * e.heading];
    e.progress = e.heading === 1 ? e.d : 2 * L - e.d;
    e.carrying = e.crystal !== null;
  }

  private moveEnemies(dt: number): void {
    const L = this.path.length;
    const gone: Enemy[] = [];
    for (const e of this.enemies) {
      e.slowFor = Math.max(0, e.slowFor - dt);
      if (e.slowFor === 0) e.slow = 1;
      const speed = e.def.speed * (e.crystal !== null ? e.def.carrySpeed : 1) * e.slow;
      e.d += speed * dt * e.heading;
      if (e.crystal === null) {
        const c = this.vault.dropped().find((x) => Math.abs(x.d - e.d) < PICKUP);
        if (c) {
          this.vault.pickUp(c, e.id);
          e.crystal = c.id;
          e.heading = -1;
          this.events.push({ type: 'steal', enemy: e });
        }
      }
      if (e.heading === 1 && e.d >= L) {
        e.d = L;
        e.heading = -1;
        const c = this.vault.take(e.id);
        e.crystal = c?.id ?? null;
        if (c) this.events.push({ type: 'steal', enemy: e });
      }
      if (e.heading === -1 && e.d <= 0) {
        e.d = 0;
        const lost = this.vault.escape(e.id) !== null;
        this.events.push({ type: 'escape', enemy: e, lost });
        gone.push(e);
        continue;
      }
      this.place(e, speed);
    }
    if (gone.length) this.enemies = this.enemies.filter((e) => !gone.includes(e));
  }

  private enemy(id: number): Enemy | undefined {
    return this.enemies.find((e) => e.id === id);
  }

  /** The middle of its body, high above the road for flyers. */
  private aimPoint(e: Enemy): Pt {
    return [e.pos[0], e.pos[1] - e.def.altitude - e.def.radius];
  }

  private roll([lo, hi]: [number, number]): number {
    return lo + Math.floor(this.rng() * (hi - lo + 1));
  }

  /** An arrow homing in on `target`. */
  private fire(by: Shot['by'], from: Pt, target: Enemy, speed: number, damage: number, crit: boolean, tower: Tower | null): void {
    const aimAt = this.aimPoint(target);
    this.launch({ by, kind: 'arrow', start: [...from], target: target.id, aimAt, speed, damage, damageType: 'physical', splash: 0, crit }, from, tower);
  }

  private launch(s: Omit<Shot, 'id' | 'pos' | 'dir'>, from: Pt, tower: Tower | null): void {
    const len = Math.hypot(s.aimAt[0] - s.start[0], s.aimAt[1] - s.start[1]) || 1;
    const shot: Shot = { ...s, id: this.nextId++, pos: [...s.start], dir: [(s.aimAt[0] - s.start[0]) / len, (s.aimAt[1] - s.start[1]) / len] };
    this.shots.push(shot);
    this.events.push({ type: 'shoot', shot, from: [...from], tower });
  }

  private updateHero(dt: number): void {
    const h = this.hero;
    h.cooldown = Math.max(0, h.cooldown - dt);
    if (h.goal) {
      const dx = h.goal[0] - h.pos[0];
      const dy = h.goal[1] - h.pos[1];
      const dist = Math.hypot(dx, dy);
      const stepLen = HERO.speed * dt;
      if (Math.abs(dx) > 1) h.facing = dx > 0 ? 1 : -1;
      if (dist <= stepLen) {
        h.pos = h.goal;
        h.goal = null;
      } else h.pos = [h.pos[0] + (dx / dist) * stepLen, h.pos[1] + (dy / dist) * stepLen];
      return;
    }
    if (h.drawing) {
      const target = this.enemy(h.drawing.target);
      h.drawing.t += dt;
      if (!target || Math.hypot(target.pos[0] - h.pos[0], target.pos[1] - h.pos[1]) > HERO.range * 1.15) {
        h.drawing = null;
        return;
      }
      h.facing = target.pos[0] >= h.pos[0] ? 1 : -1;
      if (h.drawing.t >= HERO.windup) {
        h.drawing = null;
        const crit = this.rng() < HERO.critChance;
        const damage = this.roll(HERO.damage) * (crit ? HERO.critMultiplier : 1);
        this.fire('hero', [h.pos[0] + h.facing * 20, h.pos[1] - HERO_BOW], target, HERO.projectileSpeed, damage, crit, null);
      }
      return;
    }
    if (h.cooldown > 0) return;
    const target = pickTarget(h.pos, HERO.range, this.enemies, 'nearest');
    if (!target) return;
    h.drawing = { target: target.id, t: 0 };
    h.cooldown = HERO.rate;
    h.facing = target.pos[0] >= h.pos[0] ? 1 : -1;
    this.events.push({ type: 'draw', target });
  }

  private updateTowers(dt: number): void {
    for (const t of this.towers) {
      if (!t) continue;
      t.cooldown = Math.max(0, t.cooldown - dt);
      if (t.cooldown > 0) continue;
      const def = TOWERS[t.kind];
      const stats = def.levels[t.level - 1];
      const spot = this.level.slots[t.slot];
      const target = pickTarget(spot, stats.range, this.enemies, t.mode, def.hitsFlying);
      if (!target) continue;
      t.cooldown = stats.rate;
      const from: Pt = [spot[0], spot[1] - TOWER_TOP];
      t.aim = Math.atan2(target.pos[1] - from[1], target.pos[0] - from[0]);
      switch (def.attack) {
        case 'arrow':
          this.fire('tower', from, target, def.projectileSpeed, this.roll(stats.damage), false, t);
          break;
        case 'shell': {
          // Lobbed at the ground where the target will be when the ball comes down.
          const land = intercept(spot, target.pos, target.vel, def.projectileSpeed);
          this.launch(
            { by: 'tower', kind: 'shell', start: [...spot], target: -1, aimAt: land, speed: def.projectileSpeed, damage: this.roll(stats.damage), damageType: def.damageType, splash: stats.splash ?? 0, crit: false },
            from,
            t,
          );
          break;
        }
        case 'zap': {
          const to = this.aimPoint(target);
          this.events.push({ type: 'zap', tower: t, from, to, enemy: target });
          this.damage(target, this.roll(stats.damage), def.damageType, false, to);
          break;
        }
        case 'pulse': {
          const chilled = this.enemies.filter((e) => (def.hitsFlying || !e.flying) && Math.hypot(e.pos[0] - spot[0], e.pos[1] - spot[1]) <= stats.range);
          for (const e of chilled) {
            e.slow = Math.min(e.slowFor > 0 ? e.slow : 1, stats.slow ?? 1);
            e.slowFor = Math.max(e.slowFor, stats.slowFor ?? 0);
          }
          this.events.push({ type: 'pulse', tower: t, at: [...spot], radius: stats.range, enemies: chilled });
          const dmg = this.roll(stats.damage);
          if (dmg > 0) for (const e of chilled) this.damage(e, dmg, def.damageType, false, this.aimPoint(e));
          break;
        }
      }
    }
  }

  private moveShots(dt: number): void {
    const done: Shot[] = [];
    for (const s of this.shots) {
      const target = s.kind === 'arrow' ? this.enemy(s.target) : undefined;
      if (target) s.aimAt = this.aimPoint(target);
      const dx = s.aimAt[0] - s.pos[0];
      const dy = s.aimAt[1] - s.pos[1];
      const dist = Math.hypot(dx, dy);
      const stepLen = s.speed * dt;
      const reach = target ? target.def.radius * 0.6 : 0;
      if (dist <= stepLen + reach) {
        s.pos = [...s.aimAt];
        done.push(s);
        if (s.kind === 'shell') this.burst(s);
        else if (target) this.damage(target, s.damage, s.damageType, s.crit, [...s.pos]);
        else this.events.push({ type: 'land', shot: s });
        continue;
      }
      s.dir = [dx / dist, dy / dist];
      s.pos = [s.pos[0] + s.dir[0] * stepLen, s.pos[1] + s.dir[1] * stepLen];
    }
    if (done.length) this.shots = this.shots.filter((s) => !done.includes(s));
  }

  /** A cannonball bursts: full damage near the middle, half at the edge, and only to pirates on foot. */
  private burst(s: Shot): void {
    this.events.push({ type: 'boom', shot: s, at: [...s.pos], radius: s.splash });
    for (const e of [...this.enemies]) {
      if (e.flying) continue;
      const d = Math.hypot(e.pos[0] - s.pos[0], e.pos[1] - s.pos[1]);
      if (d > s.splash + e.def.radius) continue;
      const falloff = 1 - 0.5 * Math.max(0, Math.min(1, (d - s.splash * 0.4) / (s.splash * 0.6)));
      this.damage(e, Math.max(1, Math.round(s.damage * falloff)), s.damageType, false, this.aimPoint(e));
    }
  }

  private damage(e: Enemy, raw: number, type: DamageType, crit: boolean, at: Pt): void {
    if (!this.enemies.includes(e)) return;
    const dealt = afterArmor(raw, type, e.def.armor);
    e.hp -= dealt;
    this.events.push({ type: 'hit', enemy: e, damage: dealt, blocked: raw - dealt, crit, at });
    if (e.hp > 0) return;
    this.purse.earn(e.def.bounty);
    this.events.push({ type: 'kill', enemy: e, bounty: e.def.bounty });
    if (e.crystal !== null) {
      this.vault.drop(e.id, e.d);
      e.crystal = null;
      this.events.push({ type: 'drop', enemy: e, at: [...e.pos] });
    }
    this.enemies = this.enemies.filter((x) => x !== e);
  }
}
