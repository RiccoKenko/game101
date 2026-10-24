import Phaser from 'phaser';
import { PASSIVES, WEAPONS } from '../config/weapons';
import { type Choice, type Inventory } from '../core/progression';
import { buildRows } from '../ui/build';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS, hex, lighten, PARCHMENT, rgba, shade } from '../ui/theme';
import { dimmer, gradientText, medalTexture, panel, panelTexture, ribbon, roundRect, text, uiTexture, vGradient } from '../ui/widgets';

interface LevelUpData {
  choices: Choice[];
  inventory: Inventory;
  level: number;
  onPick: (c: Choice) => void;
}

export function describeChoice(c: Choice): { icon: string; name: string; tag: string; desc: string; color: number } {
  if (c.kind === 'weapon') {
    const def = WEAPONS[c.id];
    let desc = c.level === 1 ? def.description : def.upgrades[c.level - 2];
    if (c.level === 5 && def.evolution) desc += `\nMax level! Evolves with ${PASSIVES[def.evolution.requires].name}.`;
    return { icon: def.icon, name: def.name, tag: c.level === 1 ? 'NEW!' : `LV ${c.level}`, desc, color: COLORS.blue };
  }
  if (c.kind === 'passive') {
    const def = PASSIVES[c.id];
    return { icon: def.icon, name: def.name, tag: c.level === 1 ? 'NEW!' : `LV ${c.level}`, desc: def.description, color: COLORS.purple };
  }
  if (c.kind === 'gold') return { icon: 'icon_coin', name: 'Gold Pouch', tag: '', desc: `+${c.amount} gold`, color: COLORS.gold };
  return { icon: 'meat', name: 'Roast Meat', tag: '', desc: 'Restore 30% of your HP', color: COLORS.red };
}

/** A tappable upgrade card on parchment: medallion icon on the left, name + tag + description on the right. */
export function choiceCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, c: Choice): Phaser.GameObjects.Container {
  const info = describeChoice(c);
  const card = scene.add.container(x, y);
  const bg = scene.add.image(0, 0, panelTexture(scene, w, h, { style: 'parchment', radius: 24 }));
  const d = Math.min(176, h - 64);
  const ix = -w / 2 + 34 + d / 2;
  const medal = scene.add.image(ix, 0, medalTexture(scene, d, info.color));
  const icon = scene.add.image(ix, -2, info.icon).setDisplaySize(d * 0.72, d * 0.72);
  const tx = ix + d / 2 + 34;
  const name = text(scene, tx, -h / 2 + 52, info.name, 50, { color: CSS.ink, stroke: false, originX: 0 });
  const rule = scene.add.image(tx - 4, -h / 2 + 88, ruleTexture(scene, w / 2 - tx - 30)).setOrigin(0, 0.5);
  const desc = text(scene, tx, -h / 2 + 100, info.desc, 34, {
    color: CSS.inkSoft,
    stroke: false,
    weight: '600',
    originX: 0,
    originY: 0,
    align: 'left',
    wrap: w / 2 - tx - 30,
  });
  card.add([bg, medal, icon, name, rule, desc]);
  if (info.tag) {
    const isNew = info.tag === 'NEW!';
    const tw = isNew ? 132 : 112;
    const tagX = w / 2 - 30 - tw / 2;
    const tagY = -h / 2 + 50;
    const pill = scene.add.image(tagX, tagY, tagTexture(scene, tw, 54, isNew ? COLORS.green : COLORS.blue));
    const tag = text(scene, tagX, tagY, info.tag, 30, { strokeColor: isNew ? '#174d14' : '#123a6b', shadow: false });
    card.add([pill, tag]);
  }
  card.setSize(w, h);
  return card;
}

/** Small glossy capsule for card tags. */
function tagTexture(scene: Phaser.Scene, w: number, h: number, color: number): string {
  return uiTexture(scene, `tag_${w}x${h}_${color.toString(16)}`, w + 6, h + 6, (ctx) => {
    roundRect(ctx, 3, 3, w, h, h / 2);
    ctx.fillStyle = rgba(PARCHMENT.rim, 1);
    ctx.fill();
    roundRect(ctx, 5.5, 5.5, w - 5, h - 5, h / 2 - 2.5);
    ctx.fillStyle = vGradient(ctx, 5, h, ['#fff1c4', '#c9973e']);
    ctx.fill();
    roundRect(ctx, 8, 8, w - 10, h - 10, h / 2 - 5);
    ctx.fillStyle = vGradient(ctx, 8, h - 2, [hex(lighten(color, 0.3)), hex(color), hex(shade(color, 0.72))]);
    ctx.fill();
  });
}

/** Faded brown rule under a card title. */
function ruleTexture(scene: Phaser.Scene, w: number): string {
  w = Math.max(40, Math.round(w));
  return uiTexture(scene, `rule_${w}`, w, 4, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, rgba(PARCHMENT.rule, 0.75));
    g.addColorStop(1, rgba(PARCHMENT.rule, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 1, w, 2);
  });
}

export class LevelUpScene extends Phaser.Scene {
  private data_!: LevelUpData;
  private ready = false;
  private picked = false;

  constructor() {
    super('LevelUp');
  }

  init(data: LevelUpData): void {
    this.data_ = data;
    this.ready = false;
    this.picked = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    dimmer(this, 0.7);
    const usable = height - top - bottom;
    const titleY = top + Math.max(120, usable * 0.11);
    const title = gradientText(text(this, width / 2, titleY, 'LEVEL UP!', 112, { strokeColor: '#2a1606' }));
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    ribbon(this, width / 2, titleY + 104, 640, 78);
    text(this, width / 2, titleY + 102, `Level ${this.data_.level} · choose one`, 40, { color: CSS.cream });

    const cardW = 960;
    const cardH = 264;
    const gap = 34;
    const startY = titleY + 196 + cardH / 2;
    this.data_.choices.forEach((c, i) => {
      const card = choiceCard(this, width / 2, startY + i * (cardH + gap), cardW, cardH, c);
      card.setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => this.ready && card.setScale(0.97));
      card.on('pointerout', () => card.setScale(1));
      card.on('pointerup', () => {
        card.setScale(1);
        if (!this.ready || this.picked) return;
        this.picked = true;
        this.data_.onPick(c);
      });
      card.setAlpha(0).setScale(0.8);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, delay: 80 + i * 90, duration: 260, ease: 'Back.easeOut' });
    });

    // Current gear in a small window under the cards, when there is room.
    const inv = this.data_.inventory;
    const size = 70;
    const gearRows = inv.passives.length > 0 ? 2 : 1;
    const gearH = 84 + gearRows * (size + 14);
    const gearTop = startY + 3 * (cardH + gap) - cardH / 2 - gap + 30;
    if (gearTop + gearH < height - bottom - 20) {
      const count = Math.max(inv.weapons.length, inv.passives.length);
      const rowW = count * (size + 10) - 10;
      panel(this, width / 2, gearTop + gearH / 2, Math.max(rowW + 120, 520), gearH, { header: 62 });
      text(this, width / 2, gearTop + 32, 'Your gear', 34, { color: CSS.gold });
      buildRows(this, width / 2 - rowW / 2, gearTop + 80, inv, size, 10);
    }
    // Ignore the tap that may still be in flight from steering.
    this.time.delayedCall(380, () => (this.ready = true));
  }
}
