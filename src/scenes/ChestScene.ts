import Phaser from 'phaser';
import { EVOLUTIONS } from '../config/weapons';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { Button, dimmer, text } from '../ui/widgets';
import { type ChestReward } from './GameScene';
import { choiceCard } from './LevelUpScene';

interface ChestData {
  reward: ChestReward;
  gold: number;
  onClose: () => void;
}

export class ChestScene extends Phaser.Scene {
  private data_!: ChestData;

  constructor() {
    super('Chest');
  }

  init(data: ChestData): void {
    this.data_ = data;
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    dimmer(this, 0.75);
    const cy = top + (height - top - bottom) * 0.42;
    text(this, width / 2, top + 170, 'TREASURE!', 110, { color: CSS.gold });

    const glow = this.add.image(width / 2, cy, 'aura').setDisplaySize(620, 620).setAlpha(0);
    const chest = this.add.image(width / 2, cy, 'chest').setScale(3);
    this.tweens.add({ targets: chest, angle: { from: -6, to: 6 }, duration: 70, yoyo: true, repeat: 6 });
    this.time.delayedCall(650, () => {
      this.tweens.add({ targets: chest, scale: 3.6, alpha: 0, duration: 260 });
      this.tweens.add({ targets: glow, alpha: 1, duration: 300 });
      this.tweens.add({ targets: glow, angle: 360, duration: 8000, repeat: -1 });
      this.showReward(cy);
    });
  }

  private showReward(cy: number): void {
    const { width, height } = this.scale;
    const { bottom } = safeInsets(this);
    const r = this.data_.reward;
    let y = cy;
    if (r.kind === 'evolution') {
      const evo = EVOLUTIONS[r.evolution];
      const icon = this.add.image(width / 2, cy, evo.icon).setDisplaySize(260, 260);
      const full = icon.scale;
      icon.setScale(0);
      this.tweens.add({ targets: icon, scale: full, duration: 400, ease: 'Back.easeOut' });
      text(this, width / 2, cy + 190, 'EVOLUTION!', 64, { color: '#7dff8a' });
      text(this, width / 2, cy + 270, evo.name, 60, { color: CSS.gold });
      text(this, width / 2, cy + 350, evo.description, 38, { wrap: width - 160 });
      y = cy + 420;
    } else {
      const h = 230;
      const startY = cy - ((r.choices.length - 1) * (h + 30)) / 2;
      r.choices.forEach((c, i) => {
        const card = choiceCard(this, width / 2, startY + i * (h + 30), 940, h, c).setScale(0);
        this.tweens.add({ targets: card, scale: 1, delay: i * 120, duration: 300, ease: 'Back.easeOut' });
      });
      y = startY + (r.choices.length - 1) * (h + 30) + h / 2 + 40;
    }
    const goldY = Math.min(y + 40, height - bottom - 300);
    this.add.image(width / 2 - 110, goldY, 'icon_coin').setDisplaySize(70, 70);
    text(this, width / 2 - 60, goldY, `+${this.data_.gold} gold`, 54, { color: CSS.gold, originX: 0 });
    const btn = new Button(this, width / 2, height - bottom - 150, {
      w: 560,
      h: 140,
      color: COLORS.green,
      label: 'Collect',
      onClick: () => this.data_.onClose(),
    });
    btn.setAlpha(0);
    this.tweens.add({ targets: btn, alpha: 1, delay: 400, duration: 200 });
  }
}
