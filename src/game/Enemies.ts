import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { MAX_ENEMIES } from '../config/game';
import { BOSSES, ENEMIES, ENEMY_SHOTS, type BossDef, type BossId, type EnemyDef, type EnemyId } from '../config/enemies';
import { SpatialHash } from '../core/spatial';
import { damageMultiplier, hpMultiplier, speedMultiplier } from '../core/waves';
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

  constructor(scene: Phaser.Scene) {
    this.shadow = scene.add.image(0, 0, 'shadow').setDepth(4);
    this.sprite = scene.add.sprite(0, 0, 'slime_0').setDepth(10);
  }

  get isBoss(): boolean {
    return this.boss !== null;
  }
}

interface Shot {
  active: boolean;
  sprite: Phaser.GameObjects.Image;
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

export class EnemyManager {
  readonly alive: Enemy[] = [];
  readonly hash = new SpatialHash(128);
  private pool: Enemy[] = [];
  private shots: Shot[] = [];
  private nextUid = 1;
  private regularCount = 0;

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
    e.phase = this.ctx.rng() * Math.PI * 2;
    e.sprite.setVisible(true).setAlpha(1).clearTint().setFlipX(false).setScale(1);
    e.shadow.setVisible(true);
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
    e.maxHp = e.hp = def.hp * hpMultiplier(t) * (elite ? 5 : 1);
    e.speed = def.speed * speedMultiplier(t) * (0.92 + this.ctx.rng() * 0.16);
    e.damage = def.damage * damageMultiplier(t) * (elite ? 1.3 : 1);
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
    return e;
  }

  spawnBoss(id: BossId, x: number, y: number, hpMult: number): Enemy {
    const def = BOSSES[id];
    const e = this.obtain();
    e.def = null;
    e.boss = def;
    e.x = x;
    e.y = y;
    e.elite = false;
    e.scale = 1;
    e.maxHp = e.hp = def.hp * hpMult;
    e.speed = def.speed;
    e.damage = def.damage * damageMultiplier(this.ctx.runTime);
    e.radius = def.radius;
    e.xp = 0;
    e.coinChance = 0;
    e.kbResist = 0.97;
    e.tex = def.texture;
    e.sprite.setTexture(def.texture).setDepth(11);
    const sw = e.sprite.displayWidth * 0.75;
    e.shadow.setDisplaySize(sw, sw * 0.28);
    return e;
  }

  /** Deals damage; returns true if the enemy died. */
  damage(e: Enemy, amount: number, fromX: number, fromY: number, knockback = 1): boolean {
    if (!e.active) return false;
    e.hp -= amount;
    e.flash = 0.08;
    this.ctx.fx.damageNumber(e.x, e.y - e.radius, amount);
    if (knockback > 0) {
      const dx = e.x - fromX;
      const dy = e.y - fromY;
      const d = Math.hypot(dx, dy) || 1;
      const k = 240 * knockback * (1 - e.kbResist);
      e.kx += (dx / d) * k;
      e.ky += (dy / d) * k;
    }
    audio.sfx('hit');
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
    if (!e.isBoss) this.regularCount--;
    this.ctx.fx.deathPuff(e.x, e.y, e.isBoss ? 3 : e.scale);
    audio.sfx('enemy_die');
    this.ctx.onEnemyKilled(e);
  }

  /** Removes every enemy and shot without drops (used when a run ends). */
  clear(): void {
    for (const e of this.alive) {
      e.active = false;
      e.sprite.setVisible(false);
      e.shadow.setVisible(false);
    }
    this.compact();
    this.regularCount = 0;
    for (const s of this.shots) {
      s.active = false;
      s.sprite.setVisible(false);
    }
  }

  fireShot(kind: keyof typeof ENEMY_SHOTS, x: number, y: number, angle: number): void {
    const def = ENEMY_SHOTS[kind];
    let s = this.shots.find((o) => !o.active);
    if (!s) {
      s = { active: false, sprite: this.ctx.scene.add.image(0, 0, def.texture).setDepth(30), x: 0, y: 0, vx: 0, vy: 0, radius: 0, damage: 0, life: 0, spin: 0 };
      this.shots.push(s);
    }
    s.active = true;
    s.sprite.setTexture(def.texture).setVisible(true).setRotation(angle);
    s.x = x;
    s.y = y;
    s.vx = Math.cos(angle) * def.speed;
    s.vy = Math.sin(angle) * def.speed;
    s.radius = def.radius;
    s.damage = def.damage * damageMultiplier(this.ctx.runTime);
    s.life = 4;
    s.spin = kind === 'orb' ? 6 : 0;
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

    for (let i = 0; i < this.alive.length; i++) {
      const e = this.alive[i];
      if (!e.active) continue;
      let dx = px - e.x;
      let dy = py - e.y;
      const d = Math.hypot(dx, dy) || 1;
      dx /= d;
      dy /= d;
      e.slow -= dt;
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
            if (e.timer2 > 2.6 && d < 760) {
              e.timer2 = 0;
              this.fireShot('fireball', e.x, e.y, Math.atan2(dy, dx));
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

      if (d < e.radius + player.radius * 0.85) contact = Math.max(contact, e.damage);

      if (!e.boss && d > relocate) {
        const p = this.ctx.spawnPoint();
        e.x = p.x;
        e.y = p.y;
      }

      // Animation.
      e.anim += dt;
      if (!e.boss && e.anim > 0.2) {
        e.anim = 0;
        e.frame ^= 1;
        e.sprite.setTexture(`${e.tex}_${e.frame}`);
      }
      if (e.boss) {
        const breathe = 1 + Math.sin(e.timer * 3) * 0.03;
        const squash = e.state === 1 ? 0.9 : 1;
        e.sprite.setScale((2 - breathe) * (2 - squash), breathe * squash);
      }
      e.sprite.setFlipX(faceX < 0);
      if (e.flash > 0) {
        e.flash -= dt;
        if (e.flash > 0) e.sprite.setTintFill(0xffffff);
        else if (e.elite) e.sprite.setTint(ELITE_TINT);
        else e.sprite.clearTint();
      }
      const wind = e.state === 1 ? Math.sin(e.timer * 60) * 4 : 0;
      e.sprite.setPosition(e.x + wind, e.y);
      e.shadow.setPosition(e.x, e.y + e.sprite.displayHeight * 0.42);
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
    this.compact();
    // Indices changed during compaction: rebuild so weapons query current indices.
    this.hash.clear();
    for (let i = 0; i < this.alive.length; i++) {
      const e = this.alive[i];
      if (!e.isBoss) this.hash.insert(i, e.x, e.y);
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

  private summonAround(id: EnemyId, cx: number, cy: number, n: number, r: number): void {
    for (let k = 0; k < n; k++) {
      const a = (k / n) * Math.PI * 2 + this.ctx.rng();
      this.spawn(id, cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    }
  }

  private updateBoss(e: Enemy, dt: number, d: number, dx: number, dy: number, speed: number): { x: number; y: number } {
    const id = e.boss!.id;
    const ratio = e.hp / e.maxHp;
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
      const rr = s.radius + player.radius * 0.8;
      if ((s.x - player.x) ** 2 + (s.y - player.y) ** 2 < rr * rr) {
        this.ctx.hurtPlayer(s.damage);
        s.life = 0;
      }
      if (s.life <= 0) {
        s.active = false;
        s.sprite.setVisible(false);
      }
    }
  }
}
