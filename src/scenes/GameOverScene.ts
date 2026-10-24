import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { MAPS } from '../config/maps';
import { formatTime } from '../core/format';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
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

    panel(this, width / 2, cy - 60, 900, 960, { header: 112, gem: true });
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
    // Centre coin + amount on the final value; the counter then grows to the right.
    const total = text(this, 0, cy + 306, `+${s.total}`, 76, { color: CSS.gold, originX: 0 });
    const groupW = 84 + 20 + total.width;
    this.add.image(width / 2 - groupW / 2 + 42, cy + 306, 'icon_coin').setDisplaySize(84, 84);
    total.setX(width / 2 - groupW / 2 + 104).setText('+0');
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
    if (s.quests.length || s.achievements.length) this.questNote(width / 2, s.unlockedMap !== null ? cy + 650 : cy + 530);

    const by = height - bottom - 140;
    new Button(this, width / 2 - 225, by, {
      w: 420,
      h: 140,
      color: BUTTON.primary,
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
      color: BUTTON.secondary,
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

  /** "2 quests complete · 1 achievement": a gold strip pointing to the Quests screen, where the gold is claimed. */
  private questNote(x: number, y: number): void {
    const s = this.summary;
    const bits = [];
    if (s.quests.length) bits.push(s.quests.length === 1 ? '1 quest complete' : `${s.quests.length} quests complete`);
    if (s.achievements.length) bits.push(s.achievements.length === 1 ? '1 achievement' : `${s.achievements.length} achievements`);
    const w = 860;
    panel(this, x, y, w, 132, { style: 'selected', radius: 30 });
    const icon = this.add.image(x - w / 2 + 72, y, s.quests.length ? 'icon_scroll' : 'icon_trophy').setDisplaySize(86, 86);
    this.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    text(this, x - w / 2 + 132, y - 24, bits.join('  ·  '), 40, { color: CSS.gold, originX: 0 });
    text(this, x - w / 2 + 132, y + 28, 'Claim your gold in Quests', 32, { color: CSS.cream, weight: '600', originX: 0 });
  }
}
