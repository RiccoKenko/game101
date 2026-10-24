import Phaser from 'phaser';
import { PASSIVES, WEAPONS } from '../config/weapons';
import { type Choice, type Inventory } from '../core/progression';
import { buildRows } from '../ui/build';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { dimmer, drawPanel, text } from '../ui/widgets';

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

/** A tappable upgrade card: icon on the left, name + tag + description on the right. */
export function choiceCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, c: Choice): Phaser.GameObjects.Container {
  const info = describeChoice(c);
  const card = scene.add.container(x, y);
  const g = scene.add.graphics();
  drawPanel(g, -w / 2, -h / 2, w, h, COLORS.cream, 30);
  const ix = -w / 2 + 120;
  g.fillStyle(COLORS.outline, 1);
  g.fillCircle(ix, -4, 92);
  g.fillStyle(info.color, 1);
  g.fillCircle(ix, -4, 84);
  g.fillStyle(0xffffff, 0.25);
  g.fillCircle(ix - 20, -30, 34);
  const icon = scene.add.image(ix, -4, info.icon).setDisplaySize(130, 130);
  const tx = ix + 120;
  const name = text(scene, tx, -h / 2 + 50, info.name, 50, { color: CSS.dark, stroke: false, originX: 0 });
  const desc = text(scene, tx, -h / 2 + 92, info.desc, 34, {
    color: '#5a4a6e',
    stroke: false,
    weight: '600',
    originX: 0,
    originY: 0,
    align: 'left',
    wrap: w / 2 - tx - 30,
  });
  card.add([g, icon, name, desc]);
  if (info.tag) {
    const isNew = info.tag === 'NEW!';
    const tag = text(scene, w / 2 - 36, -h / 2 + 46, info.tag, 36, { originX: 1, color: isNew ? '#7dff8a' : '#9fd3ff' });
    card.add(tag);
  }
  card.setSize(w, h);
  return card;
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
    const titleY = top + usable * 0.13;
    const title = text(this, width / 2, titleY, 'LEVEL UP!', 110, { color: CSS.gold });
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    text(this, width / 2, titleY + 100, `Level ${this.data_.level} · choose one`, 44);

    const cardW = 960;
    const cardH = 270;
    const gap = 46;
    const startY = titleY + 190 + cardH / 2;
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

    const rowsY = startY + 3 * (cardH + gap) - cardH / 2 + 10;
    if (rowsY + 160 < height - bottom) {
      text(this, width / 2, rowsY, 'Your gear', 38, { color: '#d9ccff' });
      const size = 70;
      const count = Math.max(this.data_.inventory.weapons.length, this.data_.inventory.passives.length);
      const rowW = count * (size + 10) - 10;
      buildRows(this, width / 2 - rowW / 2, rowsY + 40, this.data_.inventory, size, 10);
    }
    // Ignore the tap that may still be in flight from steering.
    this.time.delayedCall(380, () => (this.ready = true));
  }
}
