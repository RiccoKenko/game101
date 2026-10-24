import Phaser from 'phaser';

interface Floater {
  text: Phaser.GameObjects.BitmapText;
  life: number;
  age: number;
  vx: number;
  vy: number;
  pop: number;
}

/** A defeated enemy's sprite playing its last moment: a white pop, then a spinning shrink. */
interface Corpse {
  img: Phaser.GameObjects.Image;
  life: number;
  scale: number;
  spin: number;
  tint: number;
}

/** A mark on the ground (scorch, splat, target circle) that fades away. */
interface Decal {
  img: Phaser.GameObjects.Image;
  life: number;
  dur: number;
  alpha: number;
}

/** A short-lived soft light: muzzle flashes, pickup glints, impact cores. */
interface Glow {
  img: Phaser.GameObjects.Image;
  life: number;
  dur: number;
  from: number;
  to: number;
  alpha: number;
}

interface Bolt {
  g: Phaser.GameObjects.Graphics;
  life: number;
}

const CORPSE_TIME = 0.28;
const BOLT_TIME = 0.2;

/** Visual feedback: damage numbers, death pops, sparks, ground marks, glows, shock rings, lightning. */
export class Effects {
  private floaters: Floater[] = [];
  private corpses: Corpse[] = [];
  private decals: Decal[] = [];
  private glows: Glow[] = [];
  private bolts: Bolt[] = [];
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs: Phaser.GameObjects.Particles.ParticleEmitter;
  private dusts: Phaser.GameObjects.Particles.ParticleEmitter;
  private stars: Phaser.GameObjects.Particles.ParticleEmitter;
  private embers: Phaser.GameObjects.Particles.ParticleEmitter;
  private budget = 0;
  private corpseBudget = 0;
  private decalNext = 0;

  constructor(private scene: Phaser.Scene) {
    this.sparks = scene.add.particles(0, 0, 'spark', {
      speed: { min: 140, max: 360 },
      lifespan: 340,
      scale: { start: 1.1, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    this.sparks.setDepth(40);
    this.puffs = scene.add.particles(0, 0, 'puff', {
      speed: { min: 40, max: 170 },
      lifespan: 420,
      scale: { start: 1.15, end: 0.2 },
      alpha: { start: 0.85, end: 0 },
      emitting: false,
    });
    this.puffs.setDepth(39);
    this.dusts = scene.add.particles(0, 0, 'puff', {
      speed: { min: 10, max: 50 },
      angle: { min: 200, max: 340 },
      lifespan: 420,
      scale: { start: 0.55, end: 0.95 },
      alpha: { start: 0.45, end: 0 },
      tint: 0xd9c9a3,
      emitting: false,
    });
    this.dusts.setDepth(5);
    this.stars = scene.add.particles(0, 0, 'star', {
      speed: { min: 30, max: 140 },
      lifespan: 520,
      scale: { start: 0.7, end: 0 },
      rotate: { min: 0, max: 90 },
      emitting: false,
    });
    this.stars.setDepth(41);
    this.embers = scene.add.particles(0, 0, 'glow', {
      speed: { min: 160, max: 420 },
      lifespan: { min: 300, max: 600 },
      scale: { start: 0.45, end: 0 },
      gravityY: 500,
      blendMode: Phaser.BlendModes.ADD,
      emitting: false,
    });
    this.embers.setDepth(41);
    for (let i = 0; i < 50; i++) {
      const text = scene.add.bitmapText(0, 0, 'dmg', '0', 44).setOrigin(0.5).setDepth(60).setVisible(false);
      text.setLetterSpacing(-14);
      this.floaters.push({ text, life: 0, age: 0, vx: 0, vy: 0, pop: 1 });
    }
    for (let i = 0; i < 48; i++) {
      this.corpses.push({ img: scene.add.image(0, 0, 'px').setDepth(9).setVisible(false), life: 0, scale: 1, spin: 0, tint: 0 });
    }
    for (let i = 0; i < 40; i++) {
      this.decals.push({ img: scene.add.image(0, 0, 'scorch').setDepth(3).setVisible(false), life: 0, dur: 1, alpha: 1 });
    }
    for (let i = 0; i < 40; i++) {
      this.glows.push({ img: scene.add.image(0, 0, 'glow').setDepth(42).setVisible(false).setBlendMode(Phaser.BlendModes.ADD), life: 0, dur: 1, from: 1, to: 1, alpha: 1 });
    }
    for (let i = 0; i < 16; i++) this.bolts.push({ g: scene.add.graphics().setDepth(38).setVisible(false), life: 0 });
  }

  damageNumber(x: number, y: number, amount: number, color = 0xffffff, crit = false): void {
    // Limit how many numbers pop per frame so huge crowds stay readable (critical hits always show).
    if (this.budget <= 0 && !crit) return;
    const f = this.floaters.find((o) => o.life <= 0) ?? (crit ? this.floaters.reduce((a, b) => (a.age > b.age ? a : b)) : null);
    if (!f) return;
    this.budget--;
    const value = Math.max(1, Math.round(amount));
    const size = crit ? (value >= 100 ? 66 : 60) : value >= 100 ? 54 : value >= 30 ? 48 : 40;
    f.life = crit ? 0.8 : 0.6;
    f.age = 0;
    f.pop = crit ? 1.7 : 1.3;
    f.vx = Phaser.Math.Between(-70, 70);
    f.vy = crit ? -230 : -190;
    f.text
      .setText(String(value))
      .setFontSize(size)
      .setTint(crit ? 0xffb238 : color)
      .setPosition(x + Phaser.Math.Between(-14, 14), y)
      .setDepth(crit ? 61 : 60)
      .setScale(f.pop)
      .setAlpha(1)
      .setVisible(true);
  }

  sparksAt(x: number, y: number, count = 5, color = 0xffffff): void {
    this.sparks.setParticleTint(color);
    this.sparks.explode(count, x, y);
  }

  deathPuff(x: number, y: number, scale = 1, color = 0xffffff): void {
    this.puffs.explode(Math.round(5 * scale), x, y);
    this.sparksAt(x, y, Math.round(4 * scale), color);
  }

  /** The defeated enemy's own sprite pops white, then spins away to nothing. */
  corpse(texture: string, x: number, y: number, scale: number, flipX: boolean, tint = 0): void {
    if (this.corpseBudget <= 0) return;
    const c = this.corpses.find((o) => o.life <= 0);
    if (!c) return;
    this.corpseBudget--;
    c.life = CORPSE_TIME;
    c.scale = scale;
    c.tint = tint;
    c.spin = (Math.random() < 0.5 ? -1 : 1) * Phaser.Math.FloatBetween(4, 8);
    c.img.setTexture(texture).setOrigin(0.5, 1).setPosition(x, y).setFlipX(flipX).setScale(scale).setRotation(0).setAlpha(1).setTintFill(0xffffff).setVisible(true);
  }

  /** A mark on the ground that fades out over `dur` seconds (the oldest one is reused when all are taken). */
  decal(texture: string, x: number, y: number, w: number, h: number, color: number, alpha: number, dur: number): Phaser.GameObjects.Image {
    const d = this.decals[this.decalNext];
    this.decalNext = (this.decalNext + 1) % this.decals.length;
    d.life = d.dur = dur;
    d.alpha = alpha;
    d.img.setTexture(texture).setPosition(x, y).setDisplaySize(w, h).setTint(color).setAlpha(alpha).setRotation(0).setVisible(true);
    return d.img;
  }

  /** A soft additive light that scales from `from` to `to` (display size in px) while fading. */
  glow(x: number, y: number, from: number, to: number, color: number, dur: number, alpha = 1): void {
    const g = this.glows.find((o) => o.life <= 0);
    if (!g) return;
    g.life = g.dur = dur;
    g.from = from;
    g.to = to;
    g.alpha = alpha;
    g.img.setPosition(x, y).setTint(color).setDisplaySize(from, from).setAlpha(alpha).setVisible(true);
  }

  muzzle(x: number, y: number, color = 0xfff1b8): void {
    this.glow(x, y, 40, 110, color, 0.12, 0.9);
  }

  dust(x: number, y: number, count = 1): void {
    this.dusts.explode(count, x, y);
  }

  sparkle(x: number, y: number, count = 1, color = 0xffffff): void {
    this.stars.setParticleTint(color);
    this.stars.explode(count, x, y);
  }

  /**
   * A spell going off: a flash at the hand or crystal, a quick ring, a few sparkles, and a glowing circle on
   * the ground under the caster.
   */
  cast(x: number, y: number, feetX: number, feetY: number, color: number): void {
    this.glow(x, y, 24, 120, color, 0.22, 0.85);
    this.ring(x, y, 70, color, 'ring', 35, 260);
    this.sparkle(x, y, 4, 0xffffff);
    this.decal('ring', feetX, feetY, 170, 64, color, 0.75, 0.35);
  }

  /** Expanding ring, e.g. for boss summons or revive blasts. */
  ring(x: number, y: number, radius: number, color: number, texture = 'ring', depth = 35, dur = 420): void {
    const img = this.scene.add.image(x, y, texture).setTint(color).setDepth(depth).setScale(0.2).setAlpha(0.9);
    this.scene.tweens.add({
      targets: img,
      scale: (radius * 2) / 128,
      alpha: 0,
      duration: dur,
      ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  }

  /** A flat shock ring along the ground, for landings and blasts. */
  shockwave(x: number, y: number, radius: number, color = 0xffffff): void {
    const img = this.scene.add.image(x, y, 'shock').setTint(color).setDepth(3).setDisplaySize(40, 20).setAlpha(0.95);
    this.scene.tweens.add({
      targets: img,
      displayWidth: radius * 2.2,
      displayHeight: radius * 1.1,
      alpha: 0,
      duration: 460,
      ease: 'Cubic.easeOut',
      onComplete: () => img.destroy(),
    });
  }

  explosion(x: number, y: number, radius: number): void {
    const img = this.scene.add.image(x, y, 'explosion').setDepth(36).setScale(0.3).setAngle(Phaser.Math.Between(0, 360));
    this.scene.tweens.add({
      targets: img,
      scale: (radius * 2.1) / 220,
      alpha: { from: 1, to: 0 },
      duration: 380,
      ease: 'Quad.easeOut',
      onComplete: () => img.destroy(),
    });
    this.glow(x, y, radius * 0.6, radius * 2.4, 0xffc46b, 0.22);
    this.shockwave(x, y, radius, 0xffe2a8);
    this.puffs.explode(8, x, y);
    this.embers.setParticleTint(0xff9a3d);
    this.embers.explode(10, x, y);
    this.decal('scorch', x, y + 8, radius * 1.2, radius * 0.6, 0x2a1a14, 0.25, 1.8);
  }

  /** A jagged bolt from the sky to (x, y), with a flash where it lands. */
  lightning(x: number, y: number, color = 0x9fdcff): void {
    const b = this.bolts.find((o) => o.life <= 0);
    if (b) {
      b.life = BOLT_TIME;
      const g = b.g.clear().setVisible(true).setAlpha(1);
      const pts: { x: number; y: number }[] = [];
      const top = y - 640;
      const n = 9;
      for (let i = 0; i <= n; i++) {
        const t = i / n;
        const jitter = i === 0 || i === n ? 0 : Phaser.Math.Between(-34, 34);
        pts.push({ x: x + jitter + (1 - t) * 40, y: Phaser.Math.Linear(top, y, t) });
      }
      for (const [width, c, a] of [[26, color, 0.25], [12, color, 0.6], [5, 0xffffff, 1]] as const) {
        g.lineStyle(width, c, a);
        g.strokePoints(pts);
      }
    }
    this.glow(x, y, 60, 200, color, 0.18);
    this.sparksAt(x, y, 6, color);
    this.decal('scorch', x, y + 6, 100, 50, 0x1c2433, 0.25, 1.4);
  }

  /** A short jagged arc of lightning from one enemy to the next (Storm Rune, Thunderstorm). */
  arc(x1: number, y1: number, x2: number, y2: number, color = 0xfff27a): void {
    const b = this.bolts.find((o) => o.life <= 0);
    if (!b) return;
    b.life = BOLT_TIME;
    const g = b.g.clear().setVisible(true).setAlpha(1);
    const len = Math.hypot(x2 - x1, y2 - y1) || 1;
    const nx = -(y2 - y1) / len;
    const ny = (x2 - x1) / len;
    const n = 6;
    const pts: { x: number; y: number }[] = [];
    for (let i = 0; i <= n; i++) {
      const t = i / n;
      const j = i === 0 || i === n ? 0 : Phaser.Math.Between(-18, 18);
      pts.push({ x: Phaser.Math.Linear(x1, x2, t) + nx * j, y: Phaser.Math.Linear(y1, y2, t) + ny * j });
    }
    for (const [width, c, a] of [[14, color, 0.3], [6, color, 0.75], [2.5, 0xffffff, 1]] as const) {
      g.lineStyle(width, c, a);
      g.strokePoints(pts);
    }
    this.sparksAt(x2, y2, 3, color);
  }

  update(dt: number): void {
    this.budget = 6;
    this.corpseBudget = 10;
    for (const f of this.floaters) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.age += dt;
      f.text.x += f.vx * dt;
      f.text.y += f.vy * dt;
      f.vx *= 0.92;
      f.vy += 420 * dt;
      // Pop in big, settle to normal size.
      const k = Math.min(1, f.age / 0.12);
      f.text.setScale(f.pop + (1 - f.pop) * k);
      if (f.life < 0.2) f.text.setAlpha(Math.max(0, f.life / 0.2));
      if (f.life <= 0) f.text.setVisible(false);
    }
    for (const c of this.corpses) {
      if (c.life <= 0) continue;
      c.life -= dt;
      const u = 1 - c.life / CORPSE_TIME;
      if (u < 0.2) {
        c.img.setScale(c.scale * (1 + 0.3 * (u / 0.2)), c.scale * (1 + 0.15 * (u / 0.2)));
      } else {
        if (c.img.tintFill) {
          c.img.clearTint();
          if (c.tint) c.img.setTint(c.tint);
        }
        const k = (u - 0.2) / 0.8;
        const s = c.scale * 1.3 * (1 - k * k);
        c.img.setScale(s, s * (1 - 0.3 * k));
        c.img.rotation += c.spin * dt;
        c.img.y -= 60 * dt;
        c.img.setAlpha(1 - k);
      }
      if (c.life <= 0) c.img.setVisible(false);
    }
    for (const d of this.decals) {
      if (d.life <= 0) continue;
      d.life -= dt;
      d.img.setAlpha(d.alpha * Math.min(1, d.life / (d.dur * 0.5)));
      if (d.life <= 0) d.img.setVisible(false);
    }
    for (const g of this.glows) {
      if (g.life <= 0) continue;
      g.life -= dt;
      const u = 1 - g.life / g.dur;
      const size = g.from + (g.to - g.from) * (1 - (1 - u) * (1 - u));
      g.img.setDisplaySize(size, size).setAlpha(Math.max(0, 1 - u) * g.alpha);
      if (g.life <= 0) g.img.setVisible(false);
    }
    for (const b of this.bolts) {
      if (b.life <= 0) continue;
      b.life -= dt;
      b.g.setAlpha(Math.max(0, b.life / BOLT_TIME));
      if (b.life <= 0) b.g.setVisible(false);
    }
  }
}
