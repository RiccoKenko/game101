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

  constructor() {
    super('Hud');
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.last = { time: -1, kills: -1, gold: -1, level: -1 };
    this.joyPointer = null;
    const { width } = this.scale;
    const y0 = (this.y0 = safeInsets(this).top + 18);

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
    ev.on('boss', onBoss);
    ev.on('toast', onToast);
    ev.on('inventory', onInv);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off('boss', onBoss);
      ev.off('toast', onToast);
      ev.off('inventory', onInv);
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

  update(): void {
    const g = this.game_;
    const run = g.run;
    if (!run) return;
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
      this.last.gold = gold;
      this.goldText.setText(String(gold));
    }
    if (run.level !== this.last.level) {
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
