import Phaser from 'phaser';
import { DEBUG } from '../core/debug';
import { formatTime } from '../core/format';
import { resetStick, stick } from '../game/stick';
import { buildRows } from '../ui/build';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { Bar, Button, text } from '../ui/widgets';
import { type GameScene } from './GameScene';

const STICK_RADIUS = 110;

export class HudScene extends Phaser.Scene {
  private game_!: GameScene;
  private xpBar!: Bar;
  private bossBar!: Bar;
  private levelText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;
  private rows?: Phaser.GameObjects.Container;
  private toastText?: Phaser.GameObjects.Text;
  private joyBase!: Phaser.GameObjects.Image;
  private joyKnob!: Phaser.GameObjects.Image;
  private joyPointer: number | null = null;
  private y0 = 0;
  private last = { time: -1, kills: -1, gold: -1, level: -1 };
  /** Dark edges for depth, and a red one that flashes on hits and pulses at low HP. */
  private redEdge!: Phaser.GameObjects.Image;
  private hurt = 0;
  private clock = 0;

  constructor() {
    super('Hud');
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.last = { time: -1, kills: -1, gold: -1, level: -1 };
    this.joyPointer = null;
    const { width, height } = this.scale;
    const y0 = (this.y0 = safeInsets(this).top + 18);
    this.hurt = 0;
    vignetteTexture(this, width, height);
    this.add.image(0, 0, 'vignette').setOrigin(0).setTint(0x140a28).setAlpha(0.5);
    this.redEdge = this.add.image(0, 0, 'vignette').setOrigin(0).setTint(0xff1f3d).setAlpha(0);

    this.xpBar = new Bar(this, 24, y0, width - 48, 36, COLORS.xp);
    this.levelText = text(this, width - 44, y0 + 18, 'LV 1', 32, { originX: 1 });
    this.timeText = text(this, width / 2, y0 + 112, '00:00', 72);
    this.add.image(62, y0 + 96, 'icon_skull').setDisplaySize(58, 58);
    this.killText = text(this, 100, y0 + 98, '0', 42, { originX: 0 });
    this.add.image(62, y0 + 160, 'icon_coin').setDisplaySize(54, 54);
    this.goldText = text(this, 100, y0 + 162, '0', 42, { originX: 0, color: CSS.gold });
    new Button(this, width - 82, y0 + 118, {
      w: 112,
      h: 100,
      color: COLORS.purple,
      icon: 'icon_pause',
      iconSize: 72,
      onClick: () => this.game_.openPause(),
    });

    this.bossName = text(this, width / 2, y0 + 196, '', 38, { color: '#ffd0d0' }).setVisible(false);
    this.bossBar = new Bar(this, width / 2 - 270, y0 + 222, 540, 28, COLORS.hp);
    this.bossBar.setVisible(false);
    this.rebuildRows();

    if (DEBUG.enabled) this.fpsText = text(this, width / 2, this.scale.height - 60, '', 30);

    this.joyBase = this.add.image(0, 0, 'joy_base').setVisible(false).setDepth(100);
    this.joyKnob = this.add.image(0, 0, 'joy_knob').setVisible(false).setDepth(101);
    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);

    const ev = this.game_.events;
    const onBoss = (name: string) => this.warning(name);
    const onToast = (msg: string) => this.toast(msg);
    const onInv = () => this.rebuildRows();
    const onHurt = () => (this.hurt = 1);
    ev.on('boss', onBoss);
    ev.on('toast', onToast);
    ev.on('inventory', onInv);
    ev.on('hurt', onHurt);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off('boss', onBoss);
      ev.off('toast', onToast);
      ev.off('inventory', onInv);
      ev.off('hurt', onHurt);
      resetStick();
    });
  }

  private rebuildRows(): void {
    this.rows?.destroy();
    this.rows = buildRows(this, 28, this.y0 + 210, this.game_.run.inventory, 58, 8);
  }

  private onDown(pointer: Phaser.Input.Pointer, over: Phaser.GameObjects.GameObject[]): void {
    if (over.length > 0 || this.joyPointer !== null) return;
    this.joyPointer = pointer.id;
    this.joyBase.setPosition(pointer.x, pointer.y).setVisible(true);
    this.joyKnob.setPosition(pointer.x, pointer.y).setVisible(true);
    stick.active = true;
    stick.x = stick.y = 0;
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joyPointer) return;
    let dx = pointer.x - this.joyBase.x;
    let dy = pointer.y - this.joyBase.y;
    const len = Math.hypot(dx, dy);
    if (len > STICK_RADIUS) {
      // Drag the base along so the stick never "sticks" at the edge.
      const over = len - STICK_RADIUS;
      this.joyBase.x += (dx / len) * over;
      this.joyBase.y += (dy / len) * over;
      dx = pointer.x - this.joyBase.x;
      dy = pointer.y - this.joyBase.y;
    }
    this.joyKnob.setPosition(pointer.x, pointer.y);
    const l = Math.hypot(dx, dy);
    const mag = l < 14 ? 0 : Math.min(1, l / (STICK_RADIUS * 0.7));
    stick.x = l ? (dx / l) * mag : 0;
    stick.y = l ? (dy / l) * mag : 0;
  }

  private onUp(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joyPointer) return;
    this.releaseStick();
  }

  private releaseStick(): void {
    this.joyPointer = null;
    this.joyBase.setVisible(false);
    this.joyKnob.setVisible(false);
    resetStick();
  }

  private warning(name: string): void {
    const { width, height } = this.scale;
    const y = height * 0.34;
    const band = this.add.rectangle(width / 2, y, width, 190, 0x7a0d1e, 0.82).setDepth(50);
    const t1 = text(this, width / 2, y - 34, 'WARNING!', 84, { color: '#ffdf5d' }).setDepth(51);
    const t2 = text(this, width / 2, y + 48, `${name} approaches!`, 46).setDepth(51);
    const all = [band, t1, t2];
    this.tweens.add({ targets: t1, alpha: 0.3, duration: 250, yoyo: true, repeat: 4 });
    this.tweens.add({
      targets: all,
      alpha: 0,
      delay: 2400,
      duration: 400,
      onComplete: () => all.forEach((o) => o.destroy()),
    });
  }

  /** A quick pop to draw the eye to a number that changed. */
  private bump(t: Phaser.GameObjects.Text, scale: number): void {
    if (this.tweens.isTweening(t)) return;
    this.tweens.add({ targets: t, scale, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
  }

  private toast(msg: string): void {
    const { width, height } = this.scale;
    this.toastText?.destroy();
    const t = (this.toastText = text(this, width / 2, height * 0.24, msg, 50, { color: CSS.gold, wrap: width - 120 }).setDepth(60));
    t.setScale(0.6);
    this.tweens.add({ targets: t, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: t,
      alpha: 0,
      y: t.y - 60,
      delay: 2200,
      duration: 500,
      onComplete: () => t.destroy(),
    });
  }

  update(_time: number, delta: number): void {
    const g = this.game_;
    const run = g.run;
    if (!run) return;
    const dt = Math.min(delta, 50) / 1000;
    this.clock += dt;
    this.hurt = Math.max(0, this.hurt - dt * 3);
    const hp = g.player.hp / run.stats.maxHp;
    const low = hp < 0.3 && !run.ended ? 0.22 + 0.16 * Math.sin(this.clock * 6) : 0;
    this.redEdge.setAlpha(Math.max(this.hurt * 0.75, low));
    if (!stick.active && this.joyPointer !== null) this.releaseStick();

    this.xpBar.set(run.xp / run.xpNext);
    const sec = Math.floor(run.time);
    if (sec !== this.last.time) {
      this.last.time = sec;
      this.timeText.setText(formatTime(sec));
    }
    if (run.kills !== this.last.kills) {
      this.last.kills = run.kills;
      this.killText.setText(String(run.kills));
    }
    const gold = Math.floor(run.gold);
    if (gold !== this.last.gold) {
      if (this.last.gold >= 0) this.bump(this.goldText, 1.25);
      this.last.gold = gold;
      this.goldText.setText(String(gold));
    }
    if (run.level !== this.last.level) {
      if (this.last.level >= 0) this.bump(this.levelText, 1.5);
      this.last.level = run.level;
      this.levelText.setText(`LV ${run.level}`);
    }
    const boss = run.boss;
    const showBoss = !!boss && boss.active;
    this.bossBar.setVisible(showBoss);
    this.bossName.setVisible(showBoss);
    if (showBoss) {
      this.bossName.setText(boss.boss!.name);
      this.bossBar.set(boss.hp / boss.maxHp);
    }
    if (this.fpsText) this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps · ${g.ctx.enemies.alive.length} foes`);
  }
}

/** White, transparent in the middle and solid at the edges, so tinting gives any colour of vignette. */
function vignetteTexture(scene: Phaser.Scene, w: number, h: number): void {
  if (scene.textures.exists('vignette')) {
    const src = scene.textures.get('vignette').getSourceImage();
    if (src.width === w && src.height === h) return;
    scene.textures.remove('vignette');
  }
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d')!;
  const r = Math.hypot(w, h) / 2;
  const g = ctx.createRadialGradient(w / 2, h / 2, r * 0.45, w / 2, h / 2, r);
  g.addColorStop(0, 'rgba(255,255,255,0)');
  g.addColorStop(0.6, 'rgba(255,255,255,0.35)');
  g.addColorStop(1, 'rgba(255,255,255,1)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  scene.textures.addCanvas('vignette', canvas);
}
