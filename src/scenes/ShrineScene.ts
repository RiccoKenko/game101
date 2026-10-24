import Phaser from 'phaser';
import { type ShrineOffer } from '../config/events';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { Button, dimmer, gradientText, panelTexture, ribbon, slotIcon, text } from '../ui/widgets';

interface ShrineData {
  offers: ShrineOffer[];
  onPick: (o: ShrineOffer) => void;
  onLeave: () => void;
}

/** The shrine's choice: a free blessing, or a pact that costs something first and pays more. */
export class ShrineScene extends Phaser.Scene {
  private data_!: ShrineData;
  private ready = false;
  private done = false;

  constructor() {
    super('Shrine');
  }

  init(data: ShrineData): void {
    this.data_ = data;
    this.ready = this.done = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    dimmer(this, 0.72);
    const titleY = top + Math.max(140, (height - top - bottom) * 0.12);
    const title = gradientText(text(this, width / 2, titleY, 'SHRINE OF FATE', 96, { strokeColor: '#0d2440' }), ['#f2fbff', '#bfe8ff', '#6fb8ff']);
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    ribbon(this, width / 2, titleY + 100, 700, 78);
    text(this, width / 2, titleY + 98, 'Take a blessing, or make a pact', 38, { color: CSS.cream });

    const w = 960;
    const h = 230;
    const gap = 30;
    const startY = titleY + 190 + h / 2;
    let pressed: Phaser.GameObjects.Container | null = null;
    this.input.on('pointerup', () => (pressed = null));
    this.data_.offers.forEach((o, i) => {
      const y = startY + i * (h + gap);
      const card = this.add.container(width / 2, y);
      const bg = this.add.image(0, 0, panelTexture(this, w, h, { style: 'parchment', radius: 24 }));
      const d = 140;
      const ix = -w / 2 + 36 + d / 2;
      const slot = slotIcon(this, ix, 0, d, o.icon, o.pact ? 'evolved' : 'passive');
      const tx = ix + d / 2 + 32;
      const name = text(this, tx, -h / 2 + 52, o.name, 46, { color: o.pact ? '#9a2a2a' : CSS.ink, stroke: false, originX: 0 });
      const tag = text(this, w / 2 - 34, -h / 2 + 52, o.pact ? 'PACT' : 'BLESSING', 28, { color: o.pact ? '#c0392b' : '#2f7d32', stroke: false, originX: 1 });
      const desc = text(this, tx, -h / 2 + 96, o.text, 34, { color: CSS.inkSoft, stroke: false, weight: '600', originX: 0, originY: 0, align: 'left', wrap: w / 2 - tx - 30 });
      card.add([bg, ...slot, name, tag, desc]);
      card.setSize(w, h).setInteractive({ useHandCursor: true });
      card.on('pointerdown', () => {
        if (!this.ready) return;
        pressed = card;
        card.setScale(0.97);
      });
      card.on('pointerout', () => {
        card.setScale(1);
        if (pressed === card) pressed = null;
      });
      card.on('pointerup', () => {
        card.setScale(1);
        if (pressed !== card || !this.ready || this.done) return;
        this.done = true;
        this.data_.onPick(o);
      });
      card.setAlpha(0).setScale(0.8);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, delay: 80 + i * 90, duration: 260, ease: 'Back.easeOut' });
    });

    new Button(this, width / 2, Math.min(height - bottom - 120, startY + 3 * (h + gap) + 30), {
      w: 480,
      h: 110,
      color: BUTTON.system,
      label: 'Walk away',
      fontSize: 44,
      onClick: () => {
        if (!this.ready || this.done) return;
        this.done = true;
        this.data_.onLeave();
      },
    });
    this.time.delayedCall(380, () => (this.ready = true));
  }
}
