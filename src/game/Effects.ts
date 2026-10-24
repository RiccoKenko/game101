import Phaser from 'phaser';

interface Floater {
  text: Phaser.GameObjects.BitmapText;
  life: number;
  vy: number;
}

/** Cheap visual feedback: damage numbers, puffs, sparks, shock rings and explosions. */
export class Effects {
  private floaters: Floater[] = [];
  private sparks: Phaser.GameObjects.Particles.ParticleEmitter;
  private puffs: Phaser.GameObjects.Particles.ParticleEmitter;
  private budget = 0;

  constructor(private scene: Phaser.Scene) {
    this.sparks = scene.add.particles(0, 0, 'spark', {
      speed: { min: 120, max: 320 },
      lifespan: 320,
      scale: { start: 1.1, end: 0 },
      rotate: { min: 0, max: 360 },
      emitting: false,
    });
    this.sparks.setDepth(40);
    this.puffs = scene.add.particles(0, 0, 'puff', {
      speed: { min: 40, max: 160 },
      lifespan: 380,
      scale: { start: 1.1, end: 0.2 },
      alpha: { start: 0.85, end: 0 },
      emitting: false,
    });
    this.puffs.setDepth(39);
    for (let i = 0; i < 50; i++) {
      const text = scene.add.bitmapText(0, 0, 'dmg', '0', 44).setOrigin(0.5).setDepth(60).setVisible(false);
      text.setLetterSpacing(-14);
      this.floaters.push({ text, life: 0, vy: 0 });
    }
  }

  damageNumber(x: number, y: number, amount: number, color = 0xffffff): void {
    // Limit how many numbers pop per frame so huge crowds stay readable.
    if (this.budget <= 0) return;
    const f = this.floaters.find((o) => o.life <= 0);
    if (!f) return;
    this.budget--;
    const value = Math.max(1, Math.round(amount));
    const size = value >= 100 ? 54 : value >= 30 ? 48 : 40;
    f.life = 0.55;
    f.vy = -110;
    f.text
      .setText(String(value))
      .setFontSize(size)
      .setTint(color)
      .setPosition(x + Phaser.Math.Between(-14, 14), y)
      .setAlpha(1)
      .setVisible(true);
  }

  sparksAt(x: number, y: number, count = 5): void {
    this.sparks.explode(count, x, y);
  }

  deathPuff(x: number, y: number, scale = 1): void {
    this.puffs.explode(Math.round(5 * scale), x, y);
    this.sparks.explode(Math.round(3 * scale), x, y);
  }

  /** Expanding ring, e.g. for boss summons or revive blasts. */
  ring(x: number, y: number, radius: number, color: number): void {
    const img = this.scene.add.image(x, y, 'ring').setTint(color).setDepth(35).setScale(0.2).setAlpha(0.9);
    this.scene.tweens.add({
      targets: img,
      scale: (radius * 2) / 128,
      alpha: 0,
      duration: 420,
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
    this.puffs.explode(8, x, y);
  }

  bolt(x: number, y: number): void {
    const img = this.scene.add.image(x, y, 'bolt').setOrigin(0.5, 0.92).setDepth(37);
    this.scene.tweens.add({ targets: img, alpha: 0, duration: 260, delay: 60, onComplete: () => img.destroy() });
    this.sparks.explode(6, x, y);
  }

  update(dt: number): void {
    this.budget = 6;
    for (const f of this.floaters) {
      if (f.life <= 0) continue;
      f.life -= dt;
      f.text.y += f.vy * dt;
      f.vy *= 0.9;
      if (f.life < 0.2) f.text.setAlpha(Math.max(0, f.life / 0.2));
      if (f.life <= 0) f.text.setVisible(false);
    }
  }
}
