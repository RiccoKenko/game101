import Phaser from 'phaser';
import { DASH, ULTIMATES } from '../config/abilities';
import { DEBUG } from '../core/debug';
import { formatTime } from '../core/format';
import { resetStick, stick } from '../game/stick';
import { buildRows } from '../ui/build';
import { safeInsets } from '../ui/safe';
import { BUTTON, COLORS, CSS, rgba, WINDOW } from '../ui/theme';
import { Bar, Button, gradientText, heartTexture, panel, starTexture, text, uiTexture, vGradient } from '../ui/widgets';
import { type GameScene, type QuestNotice } from './GameScene';

const STICK_RADIUS = 110;
/** A touch that starts this close to the joystick's centre grabs it. */
const STICK_GRAB = 250;
/** Top panel: HP and XP bars on the left, level and timer on the right. */
const PANEL_H = 132;
const PAUSE_D = 116;
const SLOT = 62;
/** The round dash and ultimate buttons either side of the joystick. */
const ABILITY_D = 164;
const ABILITY_X = 150;

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
  /** Countdowns of running events (meteor shower, golden hour...), under the gold pill. */
  private timerTexts: Phaser.GameObjects.Text[] = [];
  /** Points at the treasure goblin while it is off screen. */
  private goblinArrow!: Phaser.GameObjects.Image;
  /** Quest and achievement banners wait their turn here. */
  private notices: QuestNotice[] = [];
  private noticeBusy = false;
  private joyBase!: Phaser.GameObjects.Image;
  private joyKnob!: Phaser.GameObjects.Image;
  private joyPointer: number | null = null;
  private y0 = 0;
  private last = { time: -1, kills: -1, gold: -1, level: -1 };
  /** Dark edges for depth, and a red one that flashes on hits and pulses at low HP. */
  private redEdge!: Phaser.GameObjects.Image;
  private hurt = 0;
  private clock = 0;
  private dashBtn!: Button;
  private ultBtn!: Button;
  private dashRing!: Phaser.GameObjects.Graphics;
  private ultRing!: Phaser.GameObjects.Graphics;
  private dashText!: Phaser.GameObjects.Text;
  private ultPulse?: Phaser.Tweens.Tween;
  private rings = { dash: -1, ult: -1 };

  constructor() {
    super('Hud');
  }

  create(): void {
    this.game_ = this.scene.get('Game') as GameScene;
    this.last = { time: -1, kills: -1, gold: -1, level: -1 };
    this.joyPointer = null;
    this.notices = [];
    this.noticeBusy = false;
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
      color: BUTTON.system,
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
    this.timerTexts = [0, 1].map((i) => text(this, width - 24, y1 + pillH + 30 + i * 46, '', 34, { originX: 1 }).setDepth(55));
    this.goblinArrow = this.add.image(0, 0, 'icon_arrow').setTint(0xc8f08a).setDisplaySize(84, 84).setDepth(56).setVisible(false);

    // Boss name and HP, centred under the gear rows.
    const by = y1 + SLOT * 2 + 12 + 18;
    this.bossPanel = panel(this, width / 2, by + 52, 700, 104);
    this.bossName = text(this, width / 2, by + 30, '', 34, { color: '#ffd9d0' });
    this.bossBar = new Bar(this, width / 2 - 310, by + 60, 620, 26, COLORS.danger);
    this.setBossVisible(false);
    this.rebuildRows();

    if (DEBUG.enabled) this.fpsText = text(this, width / 2, this.scale.height - 60, '', 30);

    // A fixed joystick, centred near the bottom of the screen; it stays put while the thumb steers.
    const joyY = this.scale.height - safeInsets(this).bottom - 270;
    this.joyBase = this.add.image(width / 2, joyY, 'joy_base').setDepth(100).setAlpha(0.6);
    this.joyKnob = this.add.image(width / 2, joyY, 'joy_knob').setDepth(101).setAlpha(0.75);
    // Ultimate on the left, dash on the right, level with the joystick (a second finger can press them).
    const ult = ULTIMATES[this.game_.heroId];
    this.ultBtn = new Button(this, ABILITY_X, joyY, {
      w: ABILITY_D,
      h: ABILITY_D,
      shape: 'round',
      color: BUTTON.warning,
      icon: ult.icon,
      iconSize: 104,
      onClick: () => this.game_.ultimate(),
    }).setDepth(100);
    this.dashBtn = new Button(this, width - ABILITY_X, joyY, {
      w: ABILITY_D,
      h: ABILITY_D,
      shape: 'round',
      color: BUTTON.secondary,
      icon: 'icon_dash',
      iconSize: 100,
      onClick: () => this.game_.dash(),
    }).setDepth(100);
    this.ultRing = this.add.graphics().setDepth(102);
    this.dashRing = this.add.graphics().setDepth(102);
    this.dashText = text(this, width - ABILITY_X, joyY - 2, '', 60).setDepth(103);
    const cap = { color: CSS.cream, weight: '600' } as const;
    text(this, ABILITY_X, joyY + ABILITY_D / 2 + 38, ult.name, 28, cap).setDepth(100);
    text(this, width - ABILITY_X, joyY + ABILITY_D / 2 + 38, ULTIMATES[this.game_.heroId].dash, 28, cap).setDepth(100);
    this.ultPulse = undefined;
    this.rings = { dash: -1, ult: -1 };

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointermove', this.onMove, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointerupoutside', this.onUp, this);

    const ev = this.game_.events;
    const onBoss = (name: string) => this.warning(name);
    const onToast = (msg: string) => this.toast(msg);
    const onInv = () => this.rebuildRows();
    const onHurt = () => (this.hurt = 1);
    const onQuest = (n: QuestNotice) => this.queueNotice(n);
    ev.on('boss', onBoss);
    ev.on('toast', onToast);
    ev.on('quest', onQuest);
    ev.on('inventory', onInv);
    ev.on('hurt', onHurt);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      ev.off('boss', onBoss);
      ev.off('toast', onToast);
      ev.off('quest', onQuest);
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
    if (Phaser.Math.Distance.Between(pointer.x, pointer.y, this.joyBase.x, this.joyBase.y) > STICK_GRAB) return;
    this.joyPointer = pointer.id;
    this.joyBase.setAlpha(0.95);
    this.joyKnob.setAlpha(1);
    stick.active = true;
    this.onMove(pointer);
  }

  private onMove(pointer: Phaser.Input.Pointer): void {
    if (pointer.id !== this.joyPointer) return;
    const dx = pointer.x - this.joyBase.x;
    const dy = pointer.y - this.joyBase.y;
    const l = Math.hypot(dx, dy);
    // The knob stays inside the ring; the base never moves.
    const k = l > STICK_RADIUS ? STICK_RADIUS / l : 1;
    this.joyKnob.setPosition(this.joyBase.x + dx * k, this.joyBase.y + dy * k);
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
    this.joyBase.setAlpha(0.6);
    this.joyKnob.setAlpha(0.75).setPosition(this.joyBase.x, this.joyBase.y);
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
    const box = (this.toastBox = this.add.container(width / 2, Math.max(height * 0.27, this.y0 + 520), [panel(this, 0, 0, w, h, { radius: 30 }), t]).setDepth(60));
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

  /** An arrow at the screen edge toward the treasure goblin while it is out of sight. */
  private pointAtGoblin(): void {
    const target = this.game_.runEvents?.goblinTarget;
    const cam = this.game_.cameras.main;
    const { width, height } = this.scale;
    if (!target) {
      this.goblinArrow.setVisible(false);
      return;
    }
    const sx = (target.x - cam.worldView.x) * cam.zoom;
    const sy = (target.y - cam.worldView.y) * cam.zoom;
    const m = 70;
    const onScreen = sx > m && sx < width - m && sy > m + 300 && sy < height - m;
    this.goblinArrow.setVisible(!onScreen);
    if (onScreen) return;
    const cx = width / 2;
    const cy = height / 2;
    const a = Math.atan2(sy - cy, sx - cx);
    // Push out from the centre to the screen edge (keeping clear of the top panel).
    const k = Math.min(Math.abs((width / 2 - m) / Math.cos(a) || 1e9), Math.abs((height / 2 - m - 150) / Math.sin(a) || 1e9));
    this.goblinArrow.setPosition(cx + Math.cos(a) * k, cy + 75 + Math.sin(a) * k).setRotation(a);
    this.goblinArrow.setScale((84 / 96) * (1 + 0.12 * Math.sin(this.clock * 10)));
  }

  private queueNotice(n: QuestNotice): void {
    this.notices.push(n);
    if (!this.noticeBusy) this.nextNotice();
  }

  /** A gold-framed banner that slides in under the toasts: icon, "QUEST COMPLETE!" and what was done. */
  private nextNotice(): void {
    const n = this.notices.shift();
    this.noticeBusy = !!n;
    if (!n) return;
    const { width, height } = this.scale;
    const w = 800;
    const left = -w / 2 + 132;
    const line = text(this, left, 0, n.line, 36, { color: CSS.cream, originX: 0, wrap: w - 170 });
    const h = Math.ceil((line.height + 74) / 20) * 20;
    line.setY(h / 2 - 18 - line.height / 2);
    const title = text(this, left, -h / 2 + 34, n.title.toUpperCase(), 30, { color: CSS.gold, originX: 0 });
    const icon = this.add.image(-w / 2 + 70, 0, n.icon);
    icon.setScale(84 / Math.max(icon.width, icon.height));
    const y = Math.max(height * 0.27, this.y0 + 520) + 160;
    const box = this.add.container(-w / 2, y, [panel(this, 0, 0, w, h, { style: 'selected', radius: 28 }), icon, title, line]).setDepth(61);
    this.tweens.add({ targets: box, x: width / 2, duration: 380, ease: 'Back.easeOut' });
    this.tweens.add({ targets: icon, scale: icon.scale * 1.25, duration: 160, delay: 380, yoyo: true, ease: 'Quad.easeOut' });
    this.tweens.add({
      targets: box,
      alpha: 0,
      y: y - 50,
      delay: 2600,
      duration: 400,
      onComplete: () => {
        box.destroy();
        this.nextNotice();
      },
    });
  }

  /** Cooldown on the dash button, charge on the ultimate, and a pulse when the ultimate is ready. */
  private updateAbilities(): void {
    const ab = this.game_.abilities;
    if (!ab) return;
    const r = ABILITY_D / 2 + 10;
    const dash = Math.round((1 - ab.dashWait / DASH.cooldown) * 60) / 60;
    if (dash !== this.rings.dash) {
      this.rings.dash = dash;
      chargeRing(this.dashRing, this.dashBtn.x, this.dashBtn.y, r, dash, 0x8fe8ff);
      this.dashText.setText(ab.dashWait > 0 ? String(Math.ceil(ab.dashWait)) : '');
      this.dashBtn.iconImage?.setAlpha(ab.dashWait > 0 ? 0.35 : 1);
    }
    const ult = Math.round(Math.min(1, ab.energy / ab.cost) * 60) / 60;
    if (ult !== this.rings.ult) {
      this.rings.ult = ult;
      chargeRing(this.ultRing, this.ultBtn.x, this.ultBtn.y, r, ult, ab.ready ? 0xffe27a : 0xffb347);
      this.ultBtn.iconImage?.setAlpha(ab.ready ? 1 : 0.45);
    }
    if (ab.ready && !this.ultPulse) {
      this.ultPulse = this.tweens.add({ targets: this.ultBtn, scale: 1.1, duration: 380, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    } else if (!ab.ready && this.ultPulse) {
      this.ultPulse.stop();
      this.ultPulse = undefined;
      this.ultBtn.setScale(1);
    }
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
    // Event countdowns.
    const timers = g.runEvents?.timers ?? [];
    this.timerTexts.forEach((t, i) => {
      const tm = timers[i];
      t.setVisible(!!tm);
      if (tm) t.setText(`${tm.label} ${Math.ceil(tm.until - run.time)}s`).setColor(tm.color);
    });
    this.pointAtGoblin();
    this.updateAbilities();
    if (this.fpsText) this.fpsText.setText(`${Math.round(this.game.loop.actualFps)} fps · ${g.ctx.enemies.alive.length} foes`);
  }
}

/** A ring around a round button that fills up clockwise from the top. */
function chargeRing(g: Phaser.GameObjects.Graphics, x: number, y: number, r: number, ratio: number, color: number): void {
  g.clear();
  g.lineStyle(11, 0x0b1430, 0.85).strokeCircle(x, y, r);
  if (ratio <= 0) return;
  g.lineStyle(9, color, 1).beginPath();
  g.arc(x, y, r, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, ratio));
  g.strokePath();
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
