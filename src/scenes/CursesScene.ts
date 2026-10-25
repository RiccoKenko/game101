import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { CURSES, HEAT_GOLD, heatOf, type CurseDef } from '../config/curses';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { Button, gradientText, panel, panelTexture, slotIcon, text } from '../ui/widgets';
import { menuBackground } from './MenuScene';

/** Curses for the next runs: tap one to turn it on or off. More heat, more gold. */
export class CursesScene extends Phaser.Scene {
  private content: Phaser.GameObjects.GameObject[] = [];
  private heatText!: Phaser.GameObjects.Text;

  constructor() {
    super('Curses');
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    menuBackground(this);
    gradientText(text(this, width / 2, top + 88, 'CURSES', 92, { strokeColor: '#1e0a33' }), ['#ffffff', '#efe2ff', '#c9a8ff', '#8a5cf0']);
    text(this, width / 2, top + 166, 'Make your runs harder to earn more gold.', 36, { color: CSS.cream, weight: '600' });
    panel(this, width / 2, top + 250, 640, 96, { radius: 40 });
    this.add.image(width / 2 - 270, top + 250, 'icon_curse').setDisplaySize(76, 76);
    this.heatText = text(this, width / 2 + 30, top + 252, '', 44, { color: '#d9c2ff' });
    const winTop = top + 320;
    const winBottom = height - bottom - 222;
    panel(this, width / 2, (winTop + winBottom) / 2, width - 36, winBottom - winTop, { gem: true });
    new Button(this, width / 2, height - bottom - 120, {
      w: 520,
      h: 130,
      color: BUTTON.secondary,
      label: 'Back',
      icon: 'icon_home',
      onClick: () => this.scene.start('Menu'),
    });
    this.draw(winTop + 24, winBottom - 24);
  }

  private draw(top: number, bottom: number): void {
    this.content.forEach((o) => o.destroy());
    this.content = [];
    const { width } = this.scale;
    const on = saveStore.data.curses;
    const heat = heatOf(on);
    this.heatText.setText(heat > 0 ? `Heat ${heat}  ·  Gold +${Math.round(HEAT_GOLD * heat * 100)}%` : 'No curses: normal runs');
    const gap = 10;
    const h = Math.min(170, (bottom - top - gap * (CURSES.length - 1)) / CURSES.length);
    CURSES.forEach((c, i) => this.row(c, top + i * (h + gap) + h / 2, width - 96, h, on.includes(c.id), () => this.draw(top, bottom)));
  }

  private row(c: CurseDef, cy: number, w: number, h: number, active: boolean, redraw: () => void): void {
    const { width } = this.scale;
    const x0 = (width - w) / 2;
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.content.push(o);
      return o;
    };
    const bg = keep(this.add.image(width / 2, cy, panelTexture(this, w, h, { style: active ? 'selected' : 'parchment', radius: 20 })));
    const size = Math.round(Math.min(110, h - 24));
    const ix = x0 + 18 + size / 2;
    slotIcon(this, ix, cy, size, c.icon, active ? 'evolved' : 'passive').map(keep);
    const tx = ix + size / 2 + 22;
    keep(text(this, tx, cy - h * 0.2, c.name, 38, { color: active ? CSS.gold : CSS.ink, stroke: active, originX: 0 }));
    keep(text(this, tx, cy + h * 0.17, c.text, 27, { color: active ? CSS.cream : CSS.inkSoft, stroke: false, weight: '600', originX: 0, align: 'left', wrap: w - (tx - x0) - 190 }));
    keep(text(this, x0 + w - 28, cy - h * 0.16, `Heat +${c.heat}`, 32, { color: active ? '#d9c2ff' : CSS.inkSoft, stroke: active, originX: 1 }));
    keep(text(this, x0 + w - 28, cy + h * 0.2, active ? 'ON' : 'Off', 32, { color: active ? CSS.green : CSS.muted, stroke: active, originX: 1 }));
    bg.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      const list = saveStore.data.curses;
      if (active) list.splice(list.indexOf(c.id), 1);
      else list.push(c.id);
      saveStore.save();
      audio.sfx(active ? 'click' : 'boss_warning', active ? 1 : 0.4);
      redraw();
    });
  }
}
