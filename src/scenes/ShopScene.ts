import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { SHOP, shopCost, type ShopDef } from '../config/shop';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { Button, drawPanel, text } from '../ui/widgets';
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

    text(this, width / 2, top + 90, 'UPGRADE SHOP', 92, { color: CSS.gold });
    text(this, width / 2, top + 170, 'Permanent bonuses for every run', 38, { color: '#e6dcff', weight: '600' });
    this.add.image(width / 2 - 90, top + 245, 'icon_coin').setDisplaySize(70, 70);
    this.goldText = text(this, width / 2 - 40, top + 248, '0', 60, { color: CSS.gold, originX: 0 });

    const listTop = top + 320;
    const listBottom = height - bottom - 230;
    const rowH = Math.min(176, (listBottom - listTop) / SHOP.length);
    SHOP.forEach((def, i) => this.row(def, width / 2, listTop + rowH * i + rowH / 2, 980, rowH - 18));

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
    const g = this.add.graphics();
    drawPanel(g, -w / 2, -h / 2, w, h, COLORS.cream, 26);
    const iconSize = Math.min(110, h - 20);
    const icon = this.add.image(-w / 2 + 30 + iconSize / 2, -4, def.icon).setDisplaySize(iconSize, iconSize);
    const tx = -w / 2 + 60 + iconSize;
    const name = text(this, tx, -h / 2 + 36, def.name, 44, { color: CSS.dark, stroke: false, originX: 0 });
    const desc = text(this, tx, -h / 2 + 76, def.describe(def.perLevel), 30, { color: '#5a4a6e', stroke: false, weight: '600', originX: 0 });
    const pips = this.add.graphics();
    const btn = new Button(this, w / 2 - 150, -6, {
      w: 250,
      h: Math.min(100, h - 40),
      color: COLORS.green,
      icon: 'icon_coin',
      iconSize: 56,
      label: '0',
      fontSize: 42,
      onClick: () => this.buy(def),
    });
    c.add([g, icon, name, desc, pips, btn]);

    this.refreshers.push(() => {
      const save = saveStore.data;
      const level = save.shop[def.id];
      pips.clear();
      for (let i = 0; i < def.maxLevel; i++) {
        const px = tx + 18 + i * 44;
        const py = h / 2 - 34;
        pips.fillStyle(COLORS.outline, 1);
        pips.fillCircle(px, py, 15);
        pips.fillStyle(i < level ? COLORS.gold : 0xd8c9a6, 1);
        pips.fillCircle(px, py, 11);
      }
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
