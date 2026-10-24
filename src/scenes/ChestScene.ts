import Phaser from 'phaser';
import { EVOLUTIONS } from '../config/weapons';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { Button, dimmer, gradientText, panel, slotIcon, text } from '../ui/widgets';
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
    gradientText(text(this, width / 2, top + 170, 'TREASURE!', 110, { strokeColor: '#2a1606' }));

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
      const icon = this.add.container(width / 2, cy - 30, slotIcon(this, 0, 0, 240, evo.icon, 'evolved')).setScale(0);
      this.tweens.add({ targets: icon, scale: 1, duration: 400, ease: 'Back.easeOut' });
      panel(this, width / 2, cy + 310, 920, 300, { gem: true });
      gradientText(text(this, width / 2, cy + 212, 'EVOLUTION!', 60, { strokeColor: '#0d3a10' }), ['#f4ffe8', '#9cf58a', '#3fbf3a']);
      text(this, width / 2, cy + 290, evo.name, 58, { color: CSS.gold });
      text(this, width / 2, cy + 378, evo.description, 36, { color: CSS.cream, wrap: 820, shadow: false });
      y = cy + 480;
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
    const amount = text(this, 0, goldY + 1, `+${this.data_.gold} gold`, 52, { color: CSS.gold, originX: 0 });
    const groupW = 70 + 16 + amount.width;
    panel(this, width / 2, goldY, Math.ceil((groupW + 90) / 20) * 20, 92, { radius: 46 });
    this.add.image(width / 2 - groupW / 2 + 35, goldY, 'icon_coin').setDisplaySize(70, 70);
    this.children.bringToTop(amount.setX(width / 2 - groupW / 2 + 86));
    const btn = new Button(this, width / 2, height - bottom - 150, {
      w: 560,
      h: 140,
      color: BUTTON.primary,
      label: 'Collect',
      onClick: () => this.data_.onClose(),
    });
    btn.setAlpha(0);
    this.tweens.add({ targets: btn, alpha: 1, delay: 400, duration: 200 });
  }
}
