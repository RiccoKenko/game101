import Phaser from 'phaser';
import { DEBUG } from '../core/debug';
import { formatTime } from '../core/format';
import { resetStick, stick } from '../game/stick';
import { buildRows } from '../ui/build';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS, rgba, WINDOW } from '../ui/theme';
import { Bar, Button, gradientText, heartTexture, panel, starTexture, text, uiTexture, vGradient } from '../ui/widgets';
import { type GameScene } from './GameScene';

const STICK_RADIUS = 110;
/** Top panel: HP and XP bars on the left, level and timer on the right. */
const PANEL_H = 132;
const PAUSE_D = 116;
const SLOT = 62;

export class HudScene extends Phaser.Scene {
  private game_!: GameScene;
  private hpBar!: Bar;
  private xpBar!: Bar;
  private bossBar!: Bar;
  private bossPanel!: Phaser.GameObjects.Image;
  private levelText!: Phaser.GameObjects.Text;
  private timeText!: Phaser.GameObjects.Text;
  private killText!: Phaser.GameObjects.Text;
  private goldText!: Phaser.GameObjects.Text;
  private bossName!: Phaser.GameObjects.Text;
  private fpsText?: Phaser.GameObjects.Text;
  private rows?: Phaser.GameObjects.Container;
  private toastBox?: Phaser.GameObjects.Container;
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
    const y0 = (this.y0 = safeInsets(this).top + 16);
    this.hurt = 0;
    vignetteTexture(this, width, height);
    this.add.image(0, 0, 'vignette').setOrigin(0).setTint(0x0a1028).setAlpha(0.5);
    this.redEdge = this.add.image(0, 0, 'vignette').setOrigin(0).setTint(0xff1f3d).setAlpha(0);

    // Top panel, with the round pause button to its right.
    const pauseX = width - 22 - PAUSE_D / 2;
    const left = 18;
    const right = pauseX - PAUSE_D / 2 - 14;
    const cy = y0 + PANEL_H / 2;
    panel(this, (left + right) / 2, cy, right - left, PANEL_H);
    const rowA = y0 + 44;
    const rowB = y0 + 88;
    this.add.image(62, rowA, heartTexture(this, 52));
    this.add.image(62, rowB, starTexture(this, 50));
    this.hpBar = new Bar(this, 100, rowA - 13, 420, 26, COLORS.hp);
    this.xpBar = new Bar(this, 100, rowB - 13, 420, 26, COLORS.xp);
    this.levelText = text(this, 612, cy, 'Lv 1', 50, { color: CSS.cream });
    this.add.image(688, cy, vDivider(this, 78));
    this.add.image(734, cy, 'icon_clock').setDisplaySize(50, 50);
    this.timeText = text(this, 764, cy + 1, '00:00', 52, { color: CSS.cream, originX: 0 });
    new Button(this, pauseX, cy - 4, {
      w: PAUSE_D,
      h: PAUSE_D,
      shape: 'round',
      color: COLORS.navy,
      icon: 'icon_pause',
      iconSize: 58,
      onClick: () => this.game_.openPause(),
    });

    // Kills and gold as small pills under the pause button; gear slots on the left.
    const y1 = y0 + PANEL_H + 16;
    const pillW = 200;
    const pillH = 58;
    const pill = (x: number, icon: string, color: string) => {
      panel(this, x, y1 + pillH / 2, pillW, pillH, { radius: pillH / 2 });
      this.add.image(x - pillW / 2 + 34, y1 + pillH / 2, icon).setDisplaySize(46, 46);
      return text(this, x - pillW / 2 + 66, y1 + pillH / 2 + 1, '0', 38, { color, originX: 0 });
    };
    const goldX = width - 20 - pillW / 2;
    this.goldText = pill(goldX, 'icon_coin', CSS.gold);
    this.killText = pill(goldX - pillW - 12, 'icon_skull', CSS.cream);

    // Boss name and HP, centred under the gear rows.
    const by = y1 + SLOT * 2 + 12 + 18;
    this.bossPanel = panel(this, width / 2, by + 52, 700, 104);
    this.bossName = text(this, width / 2, by + 30, '', 34, { color: '#ffd9d0' });
    this.bossBar = new Bar(this, width / 2 - 310, by + 60, 620, 26, COLORS.danger);
    this.setBossVisible(false);
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
    this.rows = buildRows(this, 20, this.y0 + PANEL_H + 16, this.game_.run.inventory, SLOT, 8);
  }

  private setBossVisible(v: boolean): void {
    this.bossPanel.setVisible(v);
    this.bossName.setVisible(v);
    this.bossBar.setVisible(v);
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
    const band = this.add.image(width / 2, y, warningBand(this, width, 200)).setDepth(50);
    const t1 = gradientText(text(this, width / 2, y - 34, 'WARNING!', 84, { strokeColor: '#3a0610' }), ['#fff6c8', '#ffd84a', '#ff9a2a']).setDepth(51);
    const t2 = text(this, width / 2, y + 48, `${name} approaches!`, 46, { strokeColor: '#3a0610' }).setDepth(51);
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
    this.toastBox?.destroy();
    const t = text(this, 0, 0, msg, 48, { color: CSS.gold, wrap: width - 200 });
    // Sizes snap to 20 px so a handful of panel textures cover every message.
    const w = Math.ceil((t.width + 80) / 20) * 20;
    const h = Math.ceil((t.height + 28) / 20) * 20;
    const box = (this.toastBox = this.add.container(width / 2, Math.max(height * 0.25, this.y0 + 470), [panel(this, 0, 0, w, h, { radius: 30 }), t]).setDepth(60));
    box.setScale(0.6);
    this.tweens.add({ targets: box, scale: 1, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({
      targets: box,
      alpha: 0,
      y: box.y - 60,
      delay: 2200,
      duration: 500,
      onComplete: () => box.destroy(),
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

    this.hpBar.setColor(hp < 0.3 ? COLORS.danger : COLORS.hp);
    this.hpBar.set(hp);
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
      if (this.last.level >= 0) this.bump(this.levelText, 1.4);
      this.last.level = run.level;
      this.levelText.setText(`Lv ${run.level}`);
    }
    const boss = run.boss;
    const showBoss = !!boss && boss.active;
    if (showBoss !== this.bossPanel.visible) this.setBossVisible(showBoss);
    if (showBoss) {
      this.bossName.setText(boss.boss!.name);
      this.bossBar.set(boss.hp / boss.maxHp);
    }
    if (this.fpsText) this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps · ${g.ctx.enemies.alive.length} foes`);
  }
}

/** Thin vertical gold line that fades at both ends. */
function vDivider(scene: Phaser.Scene, h: number): string {
  return uiTexture(scene, `vdiv_${h}`, 4, h, (ctx) => {
    ctx.fillStyle = vGradient(ctx, 0, h, [rgba(WINDOW.gold, 0), rgba(WINDOW.gold, 0.85), rgba(WINDOW.gold, 0)]);
    ctx.fillRect(1, 0, 2, h);
  });
}

/** Dark red glass band with gold edges for the boss warning. */
function warningBand(scene: Phaser.Scene, w: number, h: number): string {
  return uiTexture(scene, `warn_${w}x${h}`, w, h, (ctx) => {
    ctx.fillStyle = vGradient(ctx, 0, h, ['rgba(120,14,34,0.9)', 'rgba(80,6,20,0.9)', 'rgba(52,4,14,0.92)']);
    ctx.fillRect(0, 10, w, h - 20);
    ctx.fillStyle = vGradient(ctx, 10, h * 0.5, ['rgba(255,255,255,0.14)', 'rgba(255,255,255,0)']);
    ctx.fillRect(0, 10, w, h * 0.4);
    for (const y of [10, h - 10]) {
      ctx.fillStyle = rgba(WINDOW.rim, 1);
      ctx.fillRect(0, y - 4, w, 8);
      ctx.fillStyle = vGradient(ctx, y - 2, y + 2, [rgba(WINDOW.goldLight), rgba(WINDOW.gold), rgba(WINDOW.goldDark)]);
      ctx.fillRect(0, y - 2, w, 4);
    }
  });
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
