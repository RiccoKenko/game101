import Phaser from 'phaser';
import { DIFFICULTIES } from '../config/difficulty';
import { MAPS } from '../config/maps';
import { MAX_RELICS, RELICS, type RelicDef } from '../config/relics';
import { audio } from '../audio/audio';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { Button, gradientText, panel, panelTexture, slotIcon, text } from '../ui/widgets';
import { menuBackground } from './MenuScene';

/** Relics won from clearing maps: tap one to wear it (two at most) or take it off. */
export class RelicsScene extends Phaser.Scene {
  private content: Phaser.GameObjects.GameObject[] = [];

  constructor() {
    super('Relics');
  }

  /** Where Back goes (the Gear screen opens this one). */
  private back = 'Menu';

  init(data: { back?: string }): void {
    this.back = data.back ?? 'Menu';
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    menuBackground(this);
    gradientText(text(this, width / 2, top + 88, 'RELICS', 92, { strokeColor: '#2a1606' }));
    text(this, width / 2, top + 166, `Clear maps to win relics. Wear up to ${MAX_RELICS}.`, 36, { color: CSS.cream, weight: '600' });
    const winTop = top + 220;
    const winBottom = height - bottom - 222;
    panel(this, width / 2, (winTop + winBottom) / 2, width - 36, winBottom - winTop, { gem: true });
    new Button(this, width / 2, height - bottom - 120, {
      w: 520,
      h: 130,
      color: BUTTON.secondary,
      label: 'Back',
      icon: 'icon_home',
      onClick: () => this.scene.start(this.back),
    });
    this.draw(winTop + 24, winBottom - 24);
  }

  private draw(top: number, bottom: number): void {
    this.content.forEach((o) => o.destroy());
    this.content = [];
    const { width } = this.scale;
    const save = saveStore.data;
    const gap = 12;
    const h = Math.min(190, (bottom - top - gap * (RELICS.length - 1)) / RELICS.length);
    RELICS.forEach((r, i) => this.row(r, top + i * (h + gap) + h / 2, width - 96, h, save.relics.includes(r.id), save.equipped.includes(r.id), () => this.draw(top, bottom)));
  }

  private row(r: RelicDef, cy: number, w: number, h: number, owned: boolean, worn: boolean, redraw: () => void): void {
    const { width } = this.scale;
    const x0 = (width - w) / 2;
    const keep = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.content.push(o);
      return o;
    };
    const bg = keep(this.add.image(width / 2, cy, panelTexture(this, w, h, { style: worn ? 'selected' : owned ? 'parchment' : 'locked', radius: 20 })));
    const size = Math.round(Math.min(120, h - 26));
    const ix = x0 + 20 + size / 2;
    const icons = slotIcon(this, ix, cy, size, r.icon, worn ? 'evolved' : 'passive').map(keep);
    if (!owned) icons[1].setTint(0x20242f);
    const tx = ix + size / 2 + 24;
    const ink = worn ? CSS.gold : owned ? CSS.ink : CSS.muted;
    keep(text(this, tx, cy - h * 0.2, r.name, 40, { color: ink, stroke: worn, originX: 0 }));
    const how = `Clear ${MAPS[r.map].name} on ${DIFFICULTIES[r.difficulty].name}`;
    keep(text(this, tx, cy + h * 0.16, owned ? r.text : how, 28, { color: worn ? CSS.cream : owned ? CSS.inkSoft : CSS.muted, stroke: false, weight: '600', originX: 0, align: 'left', wrap: w - (tx - x0) - 200 }));
    if (owned) keep(text(this, x0 + w - 30, cy, worn ? 'WORN' : 'Tap to wear', 30, { color: worn ? CSS.green : CSS.inkSoft, stroke: worn, originX: 1 }));
    else keep(this.add.image(x0 + w - 70, cy, 'icon_lock').setDisplaySize(64, 64));
    if (!owned) return;
    bg.setInteractive({ useHandCursor: true }).on('pointerup', () => {
      const eq = saveStore.data.equipped;
      if (worn) eq.splice(eq.indexOf(r.id), 1);
      else {
        // A third relic replaces the one worn longest.
        if (eq.length >= MAX_RELICS) eq.shift();
        eq.push(r.id);
      }
      saveStore.save();
      audio.sfx('click');
      redraw();
    });
  }
}
