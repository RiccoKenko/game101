import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { SHOP, shopCost, type ShopDef } from '../config/shop';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { Button, gradientText, panel, panelTexture, pipTexture, slotIcon, text } from '../ui/widgets';
import { menuBackground } from './MenuScene';

export class ShopScene extends Phaser.Scene {
  private goldText!: Phaser.GameObjects.Text;
  private refreshers: (() => void)[] = [];

  constructor() {
    super('Shop');
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    menuBackground(this);
    this.refreshers = [];

    gradientText(text(this, width / 2, top + 88, 'UPGRADE SHOP', 92, { strokeColor: '#2a1606' }));
    text(this, width / 2, top + 166, 'Permanent bonuses for every run', 36, { color: CSS.cream, weight: '600' });
    panel(this, width / 2, top + 238, 280, 76, { radius: 38 });
    this.add.image(width / 2 - 140 + 44, top + 238, 'icon_coin').setDisplaySize(58, 58);
    this.goldText = text(this, width / 2 - 140 + 84, top + 240, '0', 50, { color: CSS.gold, originX: 0 });

    // Item cards on parchment inside one navy window.
    const winTop = top + 296;
    const winBottom = height - bottom - 222;
    panel(this, width / 2, (winTop + winBottom) / 2, width - 36, winBottom - winTop, { gem: true });
    const listTop = winTop + 22;
    const rowH = Math.min(176, (winBottom - 22 - listTop) / SHOP.length);
    SHOP.forEach((def, i) => this.row(def, width / 2, listTop + rowH * i + rowH / 2, width - 96, rowH - 12));

    new Button(this, width / 2, height - bottom - 120, {
      w: 520,
      h: 130,
      color: COLORS.blue,
      label: 'Back',
      icon: 'icon_home',
      onClick: () => this.scene.start('Menu'),
    });
    this.refresh();
  }

  private row(def: ShopDef, x: number, y: number, w: number, h: number): void {
    const c = this.add.container(x, y);
    const bg = this.add.image(0, 0, panelTexture(this, w, h, { style: 'parchment', radius: 20 }));
    const iconSize = Math.round(Math.min(104, h - 28));
    const ix = -w / 2 + 22 + iconSize / 2;
    const slot = slotIcon(this, ix, 0, iconSize, def.icon);
    const tx = ix + iconSize / 2 + 24;
    const name = text(this, tx, -h / 2 + 30, def.name, 40, { color: CSS.ink, stroke: false, originX: 0 });
    const desc = text(this, tx, -h / 2 + 68, def.describe(def.perLevel), 28, { color: CSS.inkSoft, stroke: false, weight: '600', originX: 0 });
    const pipSize = 30;
    const pips = Array.from({ length: def.maxLevel }, (_, i) => this.add.image(tx + pipSize / 2 + i * (pipSize + 8), h / 2 - 26, pipTexture(this, pipSize, false)));
    const btn = new Button(this, w / 2 - 136, -4, {
      w: 236,
      h: Math.min(96, h - 44),
      color: COLORS.green,
      icon: 'icon_coin',
      iconSize: 52,
      label: '0',
      fontSize: 40,
      onClick: () => this.buy(def),
    });
    c.add([bg, ...slot, name, desc, ...pips, btn]);

    this.refreshers.push(() => {
      const save = saveStore.data;
      const level = save.shop[def.id];
      pips.forEach((p, i) => p.setTexture(pipTexture(this, pipSize, i < level)));
      if (level >= def.maxLevel) {
        btn.setLabel('MAX').setEnabled(false);
        btn.iconImage?.setVisible(false);
        btn.labelText?.setX(0);
      } else {
        const cost = shopCost(def, level);
        btn.setLabel(String(cost)).setEnabled(save.gold >= cost);
      }
    });
  }

  private buy(def: ShopDef): void {
    const save = saveStore.data;
    const level = save.shop[def.id];
    if (level >= def.maxLevel) return;
    const cost = shopCost(def, level);
    if (save.gold < cost) return;
    save.gold -= cost;
    save.shop[def.id] = level + 1;
    saveStore.save();
    audio.sfx('coin');
    this.refresh();
  }

  private refresh(): void {
    this.goldText.setText(String(saveStore.data.gold));
    this.refreshers.forEach((r) => r());
  }
}
