import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { COLORS, CSS, FONT, shade } from './theme';

export interface TextOpts {
  color?: string;
  stroke?: boolean;
  weight?: '500' | '600' | '700';
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  originX?: number;
  originY?: number;
}

export function text(scene: Phaser.Scene, x: number, y: number, str: string, size: number, opts: TextOpts = {}): Phaser.GameObjects.Text {
  const stroke = opts.stroke ?? true;
  return scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: opts.weight ?? '700',
      color: opts.color ?? CSS.white,
      stroke: CSS.dark,
      strokeThickness: stroke ? Math.max(4, Math.round(size / 6)) : 0,
      align: opts.align ?? 'center',
      wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
      padding: { x: 4, y: 4 },
    })
    .setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
}

/** Cartoon panel: dark outline, drop "depth" and an optional highlight strip. */
export function drawPanel(
  g: Phaser.GameObjects.Graphics,
  x: number,
  y: number,
  w: number,
  h: number,
  fill: number = COLORS.cream,
  radius = 28,
  depth = 10,
): void {
  g.fillStyle(COLORS.outline, 1);
  g.fillRoundedRect(x - 6, y - 6 + depth, w + 12, h + 12, radius + 6);
  g.fillStyle(shade(fill, 0.78), 1);
  g.fillRoundedRect(x, y + depth, w, h, radius);
  g.fillStyle(COLORS.outline, 1);
  g.fillRoundedRect(x - 6, y - 6, w + 12, h + 12, radius + 6);
  g.fillStyle(shade(fill, 0.78), 1);
  g.fillRoundedRect(x, y, w, h, radius);
  g.fillStyle(fill, 1);
  g.fillRoundedRect(x, y, w, h - Math.min(14, h * 0.12), radius);
  g.fillStyle(0xffffff, 0.25);
  g.fillRoundedRect(x + 14, y + 10, w - 28, Math.min(16, h * 0.14), Math.min(8, radius));
}

export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, fill: number = COLORS.cream, radius = 28): Phaser.GameObjects.Graphics {
  const g = scene.add.graphics();
  drawPanel(g, x - w / 2, y - h / 2, w, h, fill, radius);
  return g;
}

export interface ButtonOpts {
  w: number;
  h: number;
  color?: number;
  label?: string;
  fontSize?: number;
  icon?: string;
  iconSize?: number;
  onClick: () => void;
}

export class Button extends Phaser.GameObjects.Container {
  private bg: Phaser.GameObjects.Graphics;
  private face: Phaser.GameObjects.Container;
  labelText?: Phaser.GameObjects.Text;
  iconImage?: Phaser.GameObjects.Image;
  private enabled = true;
  private pressed = false;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, private opts: ButtonOpts) {
    super(scene, x, y);
    this.color = opts.color ?? COLORS.green;
    this.bg = scene.add.graphics();
    this.face = scene.add.container(0, 0);
    this.add([this.bg, this.face]);
    const hasLabel = !!opts.label;
    if (opts.icon) {
      const size = opts.iconSize ?? Math.min(opts.h * 0.7, 96);
      const ix = hasLabel ? -opts.w / 2 + size / 2 + 30 : 0;
      this.iconImage = scene.add.image(ix, -4, opts.icon).setDisplaySize(size, size);
      this.face.add(this.iconImage);
    }
    if (hasLabel) {
      const lx = opts.icon ? (opts.iconSize ?? Math.min(opts.h * 0.7, 96)) / 2 + 10 : 0;
      this.labelText = text(scene, lx, -4, opts.label!, opts.fontSize ?? Math.round(opts.h * 0.42));
      this.face.add(this.labelText);
    }
    this.draw();
    this.setSize(opts.w, opts.h + 12);
    this.setInteractive({ useHandCursor: true });
    this.on('pointerdown', () => {
      if (!this.enabled) return;
      this.pressed = true;
      this.draw();
    });
    this.on('pointerout', () => {
      if (!this.pressed) return;
      this.pressed = false;
      this.draw();
    });
    this.on('pointerup', () => {
      if (!this.pressed || !this.enabled) return;
      this.pressed = false;
      this.draw();
      audio.sfx('click');
      opts.onClick();
    });
    scene.add.existing(this);
  }

  private draw(): void {
    const { w, h } = this.opts;
    const g = this.bg;
    const color = this.enabled ? this.color : COLORS.grey;
    const r = Math.min(30, h / 2.6);
    const lift = this.pressed ? 6 : 0;
    g.clear();
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(-w / 2 - 6, -h / 2 - 6 + 10, w + 12, h + 12, r + 6);
    g.fillStyle(shade(color, 0.7), 1);
    g.fillRoundedRect(-w / 2, -h / 2 + 10, w, h, r);
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(-w / 2 - 6, -h / 2 - 6 + lift, w + 12, h + 12, r + 6);
    g.fillStyle(color, 1);
    g.fillRoundedRect(-w / 2, -h / 2 + lift, w, h, r);
    g.fillStyle(0xffffff, 0.3);
    g.fillRoundedRect(-w / 2 + 16, -h / 2 + 10 + lift, w - 32, Math.min(14, h * 0.14), 7);
    this.face.y = lift;
    this.face.setAlpha(this.enabled ? 1 : 0.7);
  }

  setEnabled(enabled: boolean): this {
    this.enabled = enabled;
    this.pressed = false;
    this.draw();
    return this;
  }

  setColor(color: number): this {
    this.color = color;
    this.draw();
    return this;
  }

  setLabel(str: string): this {
    this.labelText?.setText(str);
    return this;
  }

  setIcon(key: string): this {
    this.iconImage?.setTexture(key);
    return this;
  }
}

/** Horizontal progress bar drawn with Graphics; call set(ratio) to update. */
export class Bar {
  readonly g: Phaser.GameObjects.Graphics;
  private ratio = -1;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    private h: number,
    private color: number,
    private back = 0x2a1f3d,
  ) {
    this.g = scene.add.graphics();
    this.set(0);
  }

  set(ratio: number): void {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    if (Math.abs(r - this.ratio) < 0.002) return;
    this.ratio = r;
    const { g, x, y, w, h } = this;
    const rad = h / 2;
    g.clear();
    g.fillStyle(COLORS.outline, 1);
    g.fillRoundedRect(x - 5, y - 5, w + 10, h + 10, rad + 5);
    g.fillStyle(this.back, 1);
    g.fillRoundedRect(x, y, w, h, rad);
    const fw = w * r;
    if (fw > 2) {
      g.fillStyle(this.color, 1);
      g.fillRoundedRect(x, y, Math.max(fw, h), h, rad);
      g.fillStyle(0xffffff, 0.35);
      g.fillRoundedRect(x + 6, y + 4, Math.max(fw - 12, 4), h * 0.28, h * 0.14);
    }
  }

  setVisible(v: boolean): void {
    this.g.setVisible(v);
  }
}

/** Full-screen dimmer that swallows taps so nothing behind it reacts. */
export function dimmer(scene: Phaser.Scene, alpha = 0.6): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add.rectangle(width / 2, height / 2, width, height, 0x120c22, alpha).setInteractive();
}
