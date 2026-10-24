import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { COLORS, CSS, FONT, hex, lighten, PARCHMENT, rgba, shade, WINDOW } from './theme';

export interface TextOpts {
  color?: string;
  stroke?: boolean;
  strokeColor?: string;
  /** Soft drop shadow under the outline; on by default for outlined text. */
  shadow?: boolean;
  weight?: '500' | '600' | '700';
  align?: 'left' | 'center' | 'right';
  wrap?: number;
  originX?: number;
  originY?: number;
}

export function text(scene: Phaser.Scene, x: number, y: number, str: string, size: number, opts: TextOpts = {}): Phaser.GameObjects.Text {
  const stroke = opts.stroke ?? true;
  const drop = (opts.shadow ?? stroke) ? Math.max(2, Math.round(size / 14)) : 0;
  const t = scene.add
    .text(x, y, str, {
      fontFamily: FONT,
      fontSize: `${size}px`,
      fontStyle: opts.weight ?? '700',
      color: opts.color ?? CSS.white,
      stroke: opts.strokeColor ?? CSS.dark,
      strokeThickness: stroke ? Math.max(4, Math.round(size / 6)) : 0,
      align: opts.align ?? 'center',
      wordWrap: opts.wrap ? { width: opts.wrap, useAdvancedWrap: true } : undefined,
      padding: { x: 4, y: 4 + drop },
    })
    .setOrigin(opts.originX ?? 0.5, opts.originY ?? 0.5);
  if (drop) t.setShadow(0, drop, 'rgba(3,6,18,0.6)', 0, true, false);
  return t;
}

export const GOLD_STOPS = ['#fffbea', '#ffe9a6', '#f7c652', '#d68a1e'];

/** Vertical gradient fill (cream to gold by default) for titles. Call again after setText. */
export function gradientText(t: Phaser.GameObjects.Text, stops: string[] = GOLD_STOPS): Phaser.GameObjects.Text {
  const top = t.padding.top ?? 0;
  const g = t.context.createLinearGradient(0, top, 0, t.height - (t.padding.bottom ?? 0));
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return t.setFill(g);
}

// ------------------------------------------------------------------ canvas painting

type Ctx = CanvasRenderingContext2D;
/** Builds the outline of a shape shrunk by `inset` px (negative grows it) as the current path. */
type ShapePath = (inset: number) => void;

/** Draws into a cached canvas texture once and returns its key. Textures outlive scenes, so keys carry sizes. */
export function uiTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: Ctx) => void): string {
  const k = `ui_${key}`;
  if (!scene.textures.exists(k)) {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w);
    canvas.height = Math.ceil(h);
    draw(canvas.getContext('2d')!);
    scene.textures.addCanvas(k, canvas);
  }
  return k;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  r = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function vGradient(ctx: Ctx, y0: number, y1: number, stops: string[]): CanvasGradient {
  const g = ctx.createLinearGradient(0, y0, 0, y1);
  stops.forEach((c, i) => g.addColorStop(i / (stops.length - 1), c));
  return g;
}

function rectShape(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): ShapePath {
  return (i) => roundRect(ctx, x + i, y + i, w - 2 * i, h - 2 * i, r - i);
}

function roundShape(ctx: Ctx, x: number, y: number, w: number, h: number): ShapePath {
  return (i) => {
    ctx.beginPath();
    ctx.ellipse(x + w / 2, y + h / 2, Math.max(1, w / 2 - i), Math.max(1, h / 2 - i), 0, 0, Math.PI * 2);
  };
}

const goldStroke = (ctx: Ctx, y: number, h: number, bright = false) =>
  vGradient(ctx, y, y + h, bright ? ['#fffbe6', '#ffe08a', '#f4c45a', '#ffe7a3'] : [hex(WINDOW.goldLight), hex(WINDOW.gold), hex(WINDOW.goldDark), hex(WINDOW.gold)]);

/** Dark rim with a shadow (or glow) that falls outside the shape only, leaving the inside clear for glass. */
function paintRim(ctx: Ctx, path: ShapePath, glow?: number): void {
  ctx.save();
  ctx.shadowColor = glow !== undefined ? rgba(glow, 0.95) : rgba(WINDOW.shadow, 0.55);
  ctx.shadowBlur = glow !== undefined ? 20 : 14;
  ctx.shadowOffsetY = glow !== undefined ? 0 : 6;
  path(-2);
  ctx.fillStyle = rgba(WINDOW.rim, 1);
  ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.globalCompositeOperation = 'destination-out';
  path(1.5);
  ctx.fill();
  ctx.restore();
}

export type PanelStyle = 'window' | 'selected' | 'locked' | 'parchment' | 'danger' | 'inset';

export interface PanelOpts {
  style?: PanelStyle;
  radius?: number;
  /** Height of a darker title band across the top, with a gold divider under it. */
  header?: number;
  /** A small gold-set gem on the top edge, for dialog windows. */
  gem?: boolean;
}

/** Space around every panel texture for its shadow or glow. */
export const PANEL_PAD = 24;

function paintWindow(ctx: Ctx, x: number, y: number, w: number, h: number, r: number, o: PanelOpts): void {
  const path = rectShape(ctx, x, y, w, h, r);
  const style = o.style ?? 'window';
  const selected = style === 'selected';
  const [top, bottom] =
    style === 'locked' ? [0x1f2534, 0x141822] : style === 'danger' ? [0x6a1424, 0x3a0812] : selected ? [0x2b4675, 0x16254a] : [WINDOW.fillTop, WINDOW.fillBottom];
  paintRim(ctx, path, selected ? 0xffd66b : undefined);
  path(1);
  ctx.fillStyle = vGradient(ctx, y, y + h, [rgba(top, WINDOW.alpha), rgba(bottom, WINDOW.alpha + 0.04)]);
  ctx.fill();
  ctx.save();
  path(1);
  ctx.clip();
  if (o.header) {
    ctx.fillStyle = 'rgba(2,6,20,0.28)';
    ctx.fillRect(x, y, w, o.header);
  }
  const sheen = Math.min(h * 0.5, 120);
  ctx.fillStyle = vGradient(ctx, y, y + sheen, ['rgba(255,255,255,0.13)', 'rgba(255,255,255,0)']);
  ctx.fillRect(x, y, w, sheen);
  ctx.restore();
  if (o.header) divider(ctx, x + 24, y + o.header, w - 48);
  path(7);
  ctx.strokeStyle = rgba(WINDOW.highlight, selected ? 0.3 : 0.18);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  const bw = selected ? 4.5 : 3;
  path(bw / 2 + 0.5);
  ctx.strokeStyle = style === 'locked' ? vGradient(ctx, y, y + h, ['#a8a69c', '#77746b']) : goldStroke(ctx, y, h, selected);
  ctx.lineWidth = bw;
  ctx.stroke();
  if (o.gem) gem(ctx, x + w / 2, y + 1, 13);
}

/** Recessed dark box inside a window (e.g. the gear area of the pause window). */
function paintInset(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const path = rectShape(ctx, x, y, w, h, r);
  path(0);
  ctx.fillStyle = 'rgba(2,5,16,0.45)';
  ctx.fill();
  ctx.save();
  path(0);
  ctx.clip();
  path(-6);
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 10;
  ctx.shadowOffsetY = 4;
  ctx.strokeStyle = 'rgba(0,0,0,0.8)';
  ctx.lineWidth = 8;
  ctx.stroke();
  ctx.restore();
  path(0.75);
  ctx.strokeStyle = rgba(WINDOW.gold, 0.35);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function paintParchment(ctx: Ctx, x: number, y: number, w: number, h: number, r: number): void {
  const path = rectShape(ctx, x, y, w, h, r);
  ctx.save();
  ctx.shadowColor = 'rgba(2,4,12,0.55)';
  ctx.shadowBlur = 14;
  ctx.shadowOffsetY = 6;
  path(-2);
  ctx.fillStyle = rgba(PARCHMENT.rim, 1);
  ctx.fill();
  ctx.restore();
  path(1);
  ctx.fillStyle = vGradient(ctx, y, y + h, [hex(PARCHMENT.fillTop), hex(PARCHMENT.fill), hex(PARCHMENT.fillBottom)]);
  ctx.fill();
  // Aged edges.
  ctx.save();
  path(1);
  ctx.clip();
  const vg = ctx.createRadialGradient(x + w / 2, y + h / 2, Math.min(w, h) * 0.3, x + w / 2, y + h / 2, Math.max(w, h) * 0.62);
  vg.addColorStop(0, 'rgba(160,110,50,0)');
  vg.addColorStop(1, 'rgba(160,110,50,0.22)');
  ctx.fillStyle = vg;
  ctx.fillRect(x, y, w, h);
  ctx.restore();
  path(10);
  ctx.strokeStyle = rgba(PARCHMENT.rule, 0.55);
  ctx.lineWidth = 1.5;
  ctx.stroke();
  path(2.5);
  ctx.strokeStyle = goldStroke(ctx, y, h);
  ctx.lineWidth = 4;
  ctx.stroke();
}

/** Gold hairline that fades out at both ends, with a small diamond in the middle. */
function divider(ctx: Ctx, x: number, y: number, w: number): void {
  const g = ctx.createLinearGradient(x, 0, x + w, 0);
  g.addColorStop(0, rgba(WINDOW.gold, 0));
  g.addColorStop(0.5, rgba(WINDOW.gold, 0.9));
  g.addColorStop(1, rgba(WINDOW.gold, 0));
  ctx.fillStyle = g;
  ctx.fillRect(x, y - 1, w, 2);
  diamond(ctx, x + w / 2, y, 7, hex(WINDOW.goldLight), hex(WINDOW.goldDark));
}

/** Texture of a horizontal gold divider `w` px wide. */
export function dividerTexture(scene: Phaser.Scene, w: number): string {
  return uiTexture(scene, `divider_${w}`, w, 20, (ctx) => divider(ctx, 0, 10, w));
}

function diamond(ctx: Ctx, cx: number, cy: number, r: number, light: string, dark: string): void {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
  ctx.fillStyle = vGradient(ctx, cy - r, cy + r, [light, dark]);
  ctx.fill();
  ctx.strokeStyle = rgba(WINDOW.rim, 0.9);
  ctx.lineWidth = 1.5;
  ctx.stroke();
}

function gem(ctx: Ctx, cx: number, cy: number, r: number): void {
  diamond(ctx, cx, cy, r + 5, hex(WINDOW.goldLight), hex(WINDOW.goldDark));
  diamond(ctx, cx, cy, r - 2, '#9fe0ff', '#2f6fd0');
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.fillRect(cx - 3, cy - r / 2, 3, 3);
}

/** Texture key for a navy glass window (or parchment card) of this size; the texture has PANEL_PAD on each side. */
export function panelTexture(scene: Phaser.Scene, w: number, h: number, opts: PanelOpts = {}): string {
  w = Math.round(w);
  h = Math.round(h);
  const style = opts.style ?? 'window';
  const r = opts.radius ?? Math.min(26, h / 2);
  const key = `panel_${style}_${w}x${h}_r${r}_h${opts.header ?? 0}${opts.gem ? '_gem' : ''}`;
  return uiTexture(scene, key, w + PANEL_PAD * 2, h + PANEL_PAD * 2, (ctx) => {
    if (style === 'parchment') paintParchment(ctx, PANEL_PAD, PANEL_PAD, w, h, r);
    else if (style === 'inset') paintInset(ctx, PANEL_PAD, PANEL_PAD, w, h, r);
    else paintWindow(ctx, PANEL_PAD, PANEL_PAD, w, h, r, opts);
  });
}

/** A navy/gold window (or parchment card) centred on (x, y). */
export function panel(scene: Phaser.Scene, x: number, y: number, w: number, h: number, opts: PanelOpts = {}): Phaser.GameObjects.Image {
  return scene.add.image(x, y, panelTexture(scene, w, h, opts));
}

/** Navy ribbon with gold edges and swallow-tail ends, centred on (x, y). */
export function ribbon(scene: Phaser.Scene, x: number, y: number, w: number, h: number): Phaser.GameObjects.Image {
  const P = 14;
  const drop = Math.round(h * 0.24);
  const tail = Math.round(h * 0.75);
  const key = uiTexture(scene, `ribbon_${w}x${h}`, w + P * 2, h + drop + P * 2, (ctx) => {
    const x0 = P;
    const y0 = P;
    const edge = (y: number, len: number, from: number) => {
      ctx.fillStyle = goldStroke(ctx, y - 2, 4);
      ctx.fillRect(from, y - 1.5, len, 3);
    };
    // Tails sit lower and behind the band.
    for (const side of [-1, 1]) {
      const outer = side < 0 ? x0 : x0 + w;
      const inner = outer - side * (tail + 24);
      const notch = outer - side * tail * 0.42;
      ctx.beginPath();
      ctx.moveTo(outer, y0 + drop);
      ctx.lineTo(inner, y0 + drop);
      ctx.lineTo(inner, y0 + drop + h);
      ctx.lineTo(outer, y0 + drop + h);
      ctx.lineTo(notch, y0 + drop + h / 2);
      ctx.closePath();
      ctx.save();
      ctx.shadowColor = 'rgba(2,4,12,0.5)';
      ctx.shadowBlur = 10;
      ctx.shadowOffsetY = 4;
      ctx.fillStyle = vGradient(ctx, y0 + drop, y0 + drop + h, ['#1b2c52', '#0c1530']);
      ctx.fill();
      ctx.restore();
      ctx.strokeStyle = rgba(WINDOW.gold, 0.85);
      ctx.lineWidth = 2.5;
      ctx.stroke();
      // Fold where the band turns under.
      const fold = outer - side * tail;
      ctx.beginPath();
      ctx.moveTo(fold, y0 + h);
      ctx.lineTo(inner, y0 + h);
      ctx.lineTo(inner, y0 + h + drop);
      ctx.closePath();
      ctx.fillStyle = '#050a18';
      ctx.fill();
    }
    const bx = x0 + tail;
    const bw = w - tail * 2;
    ctx.save();
    ctx.shadowColor = 'rgba(2,4,12,0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    ctx.fillStyle = rgba(WINDOW.rim, 1);
    ctx.fillRect(bx, y0 - 2, bw, h + 4);
    ctx.restore();
    ctx.fillStyle = vGradient(ctx, y0, y0 + h, ['#2f4c82', '#1a2b52', '#111d3a']);
    ctx.fillRect(bx, y0, bw, h);
    ctx.fillStyle = vGradient(ctx, y0, y0 + h * 0.5, ['rgba(255,255,255,0.16)', 'rgba(255,255,255,0)']);
    ctx.fillRect(bx, y0, bw, h * 0.5);
    edge(y0 + 5, bw, bx);
    edge(y0 + h - 5, bw, bx);
  });
  const img = scene.add.image(x, y, key);
  img.setOrigin(0.5, (P + h / 2) / img.height);
  return img;
}

// ------------------------------------------------------------------ icons and slots

export type SlotKind = 'weapon' | 'passive' | 'evolved';

/**
 * Square gold-framed slot in two layers: 'back' (shadow and dark socket) goes under the icon, 'frame' (gold ring
 * with a see-through middle) over it, so square painted icons tuck under the rounded frame. Textures have 8 px padding.
 */
export function slotTexture(scene: Phaser.Scene, size: number, kind: SlotKind = 'weapon', part: 'back' | 'frame' = 'back'): string {
  const P = 8;
  return uiTexture(scene, `slot_${kind}_${part}_${size}`, size + P * 2, size + P * 2, (ctx) => {
    const r = Math.max(8, Math.round(size * 0.16));
    const path = rectShape(ctx, P, P, size, size, r);
    if (part === 'back') {
      paintRim(ctx, path, kind === 'evolved' ? 0xffd25a : undefined);
      path(1.5);
      const [a, b] = kind === 'passive' ? ['#3a2d63', '#160f2c'] : kind === 'evolved' ? ['#5a3d1c', '#24160a'] : ['#2a416e', '#0e1730'];
      const g = ctx.createRadialGradient(P + size * 0.4, P + size * 0.3, 2, P + size / 2, P + size / 2, size * 0.75);
      g.addColorStop(0, a);
      g.addColorStop(1, b);
      ctx.fillStyle = g;
      ctx.fill();
      return;
    }
    path(-2);
    ctx.fillStyle = rgba(WINDOW.rim, 1);
    ctx.fill();
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    path(1.5);
    ctx.fill();
    ctx.restore();
    // Soft inner shadow so the icon sits inside the frame.
    ctx.save();
    path(3);
    ctx.clip();
    path(-1);
    ctx.shadowColor = 'rgba(0,0,0,0.6)';
    ctx.shadowBlur = 6;
    ctx.strokeStyle = 'rgba(0,0,0,0.6)';
    ctx.lineWidth = 4;
    ctx.stroke();
    ctx.restore();
    path(2);
    ctx.strokeStyle = goldStroke(ctx, P, size, kind === 'evolved');
    ctx.lineWidth = kind === 'evolved' ? 4.5 : 3.5;
    ctx.stroke();
    path(4.25);
    ctx.strokeStyle = 'rgba(255,240,200,0.25)';
    ctx.lineWidth = 1;
    ctx.stroke();
  });
}

/** A slot with an icon tucked inside, centred on (x, y). */
export function slotIcon(scene: Phaser.Scene, x: number, y: number, size: number, icon: string, kind: SlotKind = 'weapon'): Phaser.GameObjects.Image[] {
  const back = scene.add.image(x, y, slotTexture(scene, size, kind, 'back'));
  const img = scene.add.image(x, y, icon);
  // Square icons fill the slot; anything else (a chest, a monster) fits inside it without stretching.
  img.setScale((size - 6) / Math.max(img.width, img.height));
  return [back, img, scene.add.image(x, y, slotTexture(scene, size, kind, 'frame'))];
}

/** Red bubble with a count (rewards waiting), centred on (x, y). */
export function badge(scene: Phaser.Scene, x: number, y: number, n: number): Phaser.GameObjects.Container {
  const d = 52;
  const key = uiTexture(scene, `badge_${d}`, d + 8, d + 8, (ctx) => {
    const c = d / 2 + 4;
    ctx.beginPath();
    ctx.arc(c, c, d / 2, 0, Math.PI * 2);
    ctx.fillStyle = rgba(WINDOW.rim, 1);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(c, c, d / 2 - 3, 0, Math.PI * 2);
    ctx.fillStyle = vGradient(ctx, c - d / 2, c + d / 2, ['#ff9a8a', '#e8434f', '#a81e2c']);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(c - d * 0.12, c - d * 0.22, d * 0.2, d * 0.1, -0.4, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.fill();
  });
  return scene.add.container(x, y, [scene.add.image(0, 0, key), text(scene, 0, 1, String(n), 32, { strokeColor: '#5a0a12', shadow: false })]);
}

/** Glossy red heart (the HP glyph in the HUD). */
export function heartTexture(scene: Phaser.Scene, size: number, color = 0xff4a5e): string {
  return uiTexture(scene, `heart_${size}_${color.toString(16)}`, size, size, (ctx) => {
    const s = size / 100;
    ctx.save();
    ctx.scale(s, s);
    ctx.beginPath();
    ctx.moveTo(50, 88);
    ctx.bezierCurveTo(20, 68, 6, 50, 8, 32);
    ctx.bezierCurveTo(10, 16, 24, 8, 36, 10);
    ctx.bezierCurveTo(44, 11, 48, 17, 50, 22);
    ctx.bezierCurveTo(52, 17, 56, 11, 64, 10);
    ctx.bezierCurveTo(76, 8, 90, 16, 92, 32);
    ctx.bezierCurveTo(94, 50, 80, 68, 50, 88);
    ctx.closePath();
    ctx.fillStyle = vGradient(ctx, 10, 88, [hex(lighten(color, 0.35)), hex(color), hex(shade(color, 0.6))]);
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(WINDOW.rim, 1);
    ctx.lineWidth = 7;
    ctx.stroke();
    ctx.beginPath();
    ctx.ellipse(30, 30, 11, 7, -0.6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();
    ctx.restore();
  });
}

/** Five-point star icon (the XP star in the HUD). */
export function starTexture(scene: Phaser.Scene, size: number, color = 0x5cc8ff): string {
  return uiTexture(scene, `star_${size}_${color.toString(16)}`, size, size, (ctx) => {
    const c = size / 2;
    const R = size * 0.46;
    const star = (outer: number, inner: number) => {
      ctx.beginPath();
      for (let i = 0; i < 10; i++) {
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        const rr = i % 2 ? inner : outer;
        ctx.lineTo(c + Math.cos(a) * rr, c + 1 + Math.sin(a) * rr);
      }
      ctx.closePath();
    };
    ctx.lineJoin = 'round';
    star(R, R * 0.5);
    ctx.fillStyle = vGradient(ctx, c - R, c + R, [hex(lighten(color, 0.55)), hex(color), hex(shade(color, 0.65))]);
    ctx.fill();
    ctx.strokeStyle = rgba(WINDOW.rim, 1);
    ctx.lineWidth = Math.max(2.5, size * 0.07);
    ctx.stroke();
    star(R * 0.42, R * 0.2);
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.fill();
  });
}

/** Small diamond pip for upgrade levels. */
export function pipTexture(scene: Phaser.Scene, size: number, on: boolean): string {
  return uiTexture(scene, `pip_${size}_${on ? 1 : 0}`, size, size, (ctx) => {
    const c = size / 2;
    if (on) diamond(ctx, c, c, c - 2, '#fff1b8', '#d08a1e');
    else diamond(ctx, c, c, c - 2, '#6d5a44', '#3a2c1f');
    if (on) {
      ctx.fillStyle = 'rgba(255,255,255,0.75)';
      ctx.fillRect(c - c * 0.3, c - c * 0.45, c * 0.25, c * 0.25);
    }
  });
}

// ------------------------------------------------------------------ buttons

function buttonFaceTexture(scene: Phaser.Scene, w: number, h: number, r: number, color: number, round: boolean): string {
  const P = 4;
  return uiTexture(scene, `btn_${round ? 'o' : 'r'}${w}x${h}_r${r}_${color.toString(16)}`, w + P * 2, h + P * 2, (ctx) => {
    const path = round ? roundShape(ctx, P, P, w, h) : rectShape(ctx, P, P, w, h, r);
    path(0);
    ctx.fillStyle = rgba(WINDOW.rim, 1);
    ctx.fill();
    path(2.5);
    ctx.fillStyle = goldStroke(ctx, P, h);
    ctx.fill();
    path(6);
    ctx.fillStyle = vGradient(ctx, P + 6, P + h - 6, [hex(lighten(color, 0.32)), hex(color), hex(shade(color, 0.7))]);
    ctx.fill();
    ctx.save();
    path(6);
    ctx.clip();
    const gh = (h - 12) * 0.48;
    ctx.fillStyle = vGradient(ctx, P + 6, P + 6 + gh, ['rgba(255,255,255,0.42)', 'rgba(255,255,255,0.1)']);
    ctx.fillRect(P, P + 6, w, gh);
    ctx.restore();
    path(7.5);
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  });
}

function buttonLipTexture(scene: Phaser.Scene, w: number, h: number, r: number, color: number, round: boolean): string {
  const P = 14;
  return uiTexture(scene, `lip_${round ? 'o' : 'r'}${w}x${h}_r${r}_${color.toString(16)}`, w + P * 2, h + P * 2, (ctx) => {
    const path = round ? roundShape(ctx, P, P, w, h) : rectShape(ctx, P, P, w, h, r);
    ctx.save();
    ctx.shadowColor = 'rgba(2,4,12,0.55)';
    ctx.shadowBlur = 12;
    ctx.shadowOffsetY = 5;
    path(0);
    ctx.fillStyle = rgba(WINDOW.rim, 1);
    ctx.fill();
    ctx.restore();
    path(2.5);
    ctx.fillStyle = hex(shade(WINDOW.goldDark, 0.7));
    ctx.fill();
    path(6);
    ctx.fillStyle = hex(shade(color, 0.42));
    ctx.fill();
  });
}

export interface ButtonOpts {
  w: number;
  h: number;
  color?: number;
  /** 'round' draws a circle (or ellipse) instead of a rounded rectangle. */
  shape?: 'rect' | 'round';
  radius?: number;
  label?: string;
  fontSize?: number;
  icon?: string;
  iconSize?: number;
  onClick: () => void;
}

const LIP = 8;

export class Button extends Phaser.GameObjects.Container {
  private lip: Phaser.GameObjects.Image;
  private faceImg: Phaser.GameObjects.Image;
  private face: Phaser.GameObjects.Container;
  labelText?: Phaser.GameObjects.Text;
  iconImage?: Phaser.GameObjects.Image;
  private enabled = true;
  private pressed = false;
  private color: number;

  constructor(scene: Phaser.Scene, x: number, y: number, private opts: ButtonOpts) {
    super(scene, x, y);
    this.color = opts.color ?? COLORS.green;
    this.lip = scene.add.image(0, LIP, '__DEFAULT');
    this.faceImg = scene.add.image(0, 0, '__DEFAULT');
    this.face = scene.add.container(0, 0);
    this.add([this.lip, this.faceImg, this.face]);
    const hasLabel = !!opts.label;
    const iconSize = opts.iconSize ?? Math.min(opts.h * 0.7, 96);
    if (opts.icon) {
      const ix = hasLabel ? -opts.w / 2 + iconSize / 2 + 30 : 0;
      this.iconImage = scene.add.image(ix, 0, opts.icon).setDisplaySize(iconSize, iconSize);
      this.face.add(this.iconImage);
    }
    if (hasLabel) {
      const lx = opts.icon ? iconSize / 2 + 10 : 0;
      this.labelText = text(scene, lx, 0, opts.label!, opts.fontSize ?? Math.round(opts.h * 0.42));
      this.face.add(this.labelText);
    }
    this.draw();
    this.setSize(opts.w, opts.h + LIP);
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
    const round = this.opts.shape === 'round';
    const color = this.enabled ? this.color : COLORS.grey;
    const r = this.opts.radius ?? Math.round(Math.min(28, h / 3));
    this.lip.setTexture(buttonLipTexture(this.scene, w, h, r, color, round));
    this.faceImg.setTexture(buttonFaceTexture(this.scene, w, h, r, color, round));
    const lift = this.pressed ? LIP - 2 : 0;
    this.faceImg.y = lift;
    this.faceImg.setTint(this.pressed ? 0xd8d8d8 : 0xffffff);
    this.face.y = lift;
    this.face.setAlpha(this.enabled ? 1 : 0.75);
    this.labelText?.setStroke(this.enabled ? hex(shade(color, color === COLORS.navy ? 0.4 : 0.32)) : CSS.dark, this.labelText.style.strokeThickness);
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

// ------------------------------------------------------------------ bars

/** Points of the horizontal band [t0, t1] (fractions of height) of a capsule, for Graphics.fillPoints. */
function capsuleBand(x: number, y: number, w: number, h: number, t0: number, t1: number, steps = 6): Phaser.Types.Math.Vector2Like[] {
  const ry = h / 2;
  const rx = Math.min(ry, w / 2);
  const cy = y + ry;
  const half = (py: number) => rx * Math.sqrt(Math.max(0, 1 - ((py - cy) / ry) ** 2));
  const left: Phaser.Types.Math.Vector2Like[] = [];
  const right: Phaser.Types.Math.Vector2Like[] = [];
  for (let i = 0; i <= steps; i++) {
    const py = y + h * (t0 + ((t1 - t0) * i) / steps);
    const dx = half(py);
    left.push({ x: x + rx - dx, y: py });
    right.push({ x: x + w - rx + dx, y: py });
  }
  return [...left, ...right.reverse()];
}

/** Horizontal progress bar: dark inset track with a gold hairline frame and a glossy fill. Call set(ratio). */
export class Bar {
  readonly g: Phaser.GameObjects.Graphics;
  readonly frame: Phaser.GameObjects.Image;
  private ratio = -1;

  constructor(
    scene: Phaser.Scene,
    private x: number,
    private y: number,
    private w: number,
    private h: number,
    private color: number,
  ) {
    const P = 6;
    const key = uiTexture(scene, `bar_${w}x${h}`, w + P * 2, h + P * 2, (ctx) => {
      const r = h / 2;
      roundRect(ctx, P - 4.5, P - 4.5, w + 9, h + 9, r + 4.5);
      ctx.fillStyle = rgba(WINDOW.rim, 1);
      ctx.fill();
      roundRect(ctx, P - 2.5, P - 2.5, w + 5, h + 5, r + 2.5);
      ctx.strokeStyle = goldStroke(ctx, P, h);
      ctx.lineWidth = 2;
      ctx.stroke();
      roundRect(ctx, P, P, w, h, r);
      ctx.fillStyle = vGradient(ctx, P, P + h, ['#02050f', '#0b1328', '#16223f']);
      ctx.fill();
    });
    this.frame = scene.add.image(x - P, y - P, key).setOrigin(0);
    this.g = scene.add.graphics();
    this.set(0);
  }

  set(ratio: number): void {
    const r = Phaser.Math.Clamp(ratio, 0, 1);
    if (Math.abs(r - this.ratio) < 0.002) return;
    this.ratio = r;
    const { g, color } = this;
    g.clear();
    const inset = Math.max(2, Math.round(this.h * 0.1));
    const x = this.x + inset;
    const y = this.y + inset;
    const h = this.h - inset * 2;
    const w = (this.w - inset * 2) * r;
    if (w < 2) return;
    g.fillStyle(color, 1);
    g.fillPoints(capsuleBand(x, y, w, h, 0, 1), true);
    g.fillStyle(shade(color, 0.74), 1);
    g.fillPoints(capsuleBand(x, y, w, h, 0.58, 1), true);
    g.fillStyle(0xffffff, 0.4);
    g.fillPoints(capsuleBand(x + h * 0.25, y, Math.max(w - h * 0.5, 1), h, 0.12, 0.42), true);
  }

  setColor(color: number): void {
    if (color === this.color) return;
    this.color = color;
    const r = this.ratio;
    this.ratio = -1;
    this.set(r);
  }

  setVisible(v: boolean): void {
    this.g.setVisible(v);
    this.frame.setVisible(v);
  }

  setDepth(d: number): void {
    this.frame.setDepth(d);
    this.g.setDepth(d);
  }
}

/** Full-screen dimmer that swallows taps so nothing behind it reacts. */
export function dimmer(scene: Phaser.Scene, alpha = 0.6): Phaser.GameObjects.Rectangle {
  const { width, height } = scene.scale;
  return scene.add.rectangle(width / 2, height / 2, width, height, 0x050a18, alpha).setInteractive();
}
