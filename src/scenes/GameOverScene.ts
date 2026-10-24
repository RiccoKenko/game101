import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { MAPS } from '../config/maps';
import { formatTime } from '../core/format';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { Button, dimmer, dividerTexture, gradientText, panel, text } from '../ui/widgets';
import { type RunSummary } from './GameScene';

export class GameOverScene extends Phaser.Scene {
  private summary!: RunSummary;

  constructor() {
    super('GameOver');
  }

  init(summary: RunSummary): void {
    this.summary = summary;
  }

  create(): void {
    const s = this.summary;
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    dimmer(this, 0.78);
    const cy = top + (height - top - bottom) * 0.46;
    const title = s.quit ? 'RUN ENDED' : s.bossesKilled > 0 ? 'WELL FOUGHT!' : 'GAME OVER';
    const good = s.quit || s.bossesKilled > 0;
    const t = gradientText(
      text(this, width / 2, cy - 640, title, 104, { strokeColor: good ? '#2a1606' : '#3a0610' }),
      good ? undefined : ['#fff0ea', '#ff9a8a', '#e0443e', '#a8202a'],
    );
    t.setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 420, ease: 'Back.easeOut' });

    panel(this, width / 2, cy - 40, 900, 1000, { header: 112, gem: true });
    text(this, width / 2, cy - 484, MAPS[s.mapIndex].name, 48, { color: CSS.gold });

    const rows: [string, string, string?][] = [
      ['Time survived', formatTime(s.time), s.newBest ? 'NEW BEST!' : `Best ${formatTime(s.bestTime)}`],
      ['Level reached', String(s.level)],
      ['Monsters defeated', String(s.kills)],
      ['Gold collected', String(s.collected)],
      ['Survival bonus', `+${s.bonus}`],
    ];
    rows.forEach(([label, value, note], i) => {
      const y = cy - 360 + i * 115;
      text(this, width / 2 - 390, y, label, 40, { color: CSS.soft, weight: '600', originX: 0, shadow: false, stroke: false });
      text(this, width / 2 + 390, y, value, 48, { color: CSS.cream, originX: 1 });
      if (note) {
        const n = text(this, width / 2 + 390, y + 46, note, 30, { color: s.newBest ? CSS.green : CSS.muted, stroke: s.newBest, originX: 1 });
        if (s.newBest) this.tweens.add({ targets: n, scale: 1.12, duration: 400, yoyo: true, repeat: -1 });
      }
    });
    this.add.image(width / 2, cy + 220, dividerTexture(this, 800));
    this.add.image(width / 2 - 200, cy + 300, 'icon_coin').setDisplaySize(84, 84);
    const total = text(this, width / 2 - 140, cy + 300, '+0', 76, { color: CSS.gold, originX: 0 });
    this.tweens.addCounter({
      from: 0,
      to: s.total,
      duration: 900,
      delay: 300,
      onUpdate: (tw) => total.setText(`+${Math.round(tw.getValue() ?? 0)}`),
    });
    if (s.total > 0) this.time.delayedCall(1250, () => audio.sfx('coin'));

    if (s.unlockedMap !== null) {
      const u = text(this, width / 2, cy + 520, `New map unlocked:\n${MAPS[s.unlockedMap].name}!`, 50, { color: CSS.green });
      this.tweens.add({ targets: u, scale: 1.08, duration: 500, yoyo: true, repeat: -1 });
    }

    const by = height - bottom - 140;
    new Button(this, width / 2 - 225, by, {
      w: 420,
      h: 140,
      color: COLORS.green,
      label: 'Play Again',
      icon: 'icon_retry',
      fontSize: 50,
      onClick: () => {
        this.scene.stop('Hud');
        this.scene.start('Game', { map: s.mapIndex });
      },
    });
    new Button(this, width / 2 + 225, by, {
      w: 420,
      h: 140,
      color: COLORS.blue,
      label: 'Menu',
      icon: 'icon_home',
      fontSize: 50,
      onClick: () => {
        this.scene.stop('Hud');
        this.scene.stop('Game');
        this.scene.start('Menu');
      },
    });
  }
}
