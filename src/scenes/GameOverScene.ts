import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { DIFFICULTIES } from '../config/difficulty';
import { MAPS } from '../config/maps';
import { formatTime } from '../core/format';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { Button, dimmer, dividerTexture, gradientText, panel, slotIcon, text } from '../ui/widgets';
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
    const title = s.won ? 'STAGE CLEAR!' : s.quit ? 'RUN ENDED' : s.bossesKilled > 0 ? 'WELL FOUGHT!' : 'GAME OVER';
    const good = s.won || s.quit || s.bossesKilled > 0;
    const t = gradientText(
      text(this, width / 2, cy - 640, title, 104, { strokeColor: good ? '#2a1606' : '#3a0610' }),
      good ? undefined : ['#fff0ea', '#ff9a8a', '#e0443e', '#a8202a'],
    );
    t.setScale(0.4);
    this.tweens.add({ targets: t, scale: 1, duration: 420, ease: 'Back.easeOut' });

    panel(this, width / 2, cy - 60, 900, 960, { header: 112, gem: true });
    const diff = DIFFICULTIES[s.difficulty];
    const where = [MAPS[s.mapIndex].name, ...(s.difficulty > 0 ? [diff.name] : []), ...(s.heat > 0 ? [`Heat ${s.heat}`] : [])].join(' · ');
    text(this, width / 2, cy - 484, where, s.heat > 0 ? 42 : 48, { color: s.heat > 0 ? '#d9c2ff' : s.difficulty > 0 ? diff.color : CSS.gold });
    if (s.newBestHeat) {
      const n = text(this, width / 2, cy - 430, 'New best heat on this map!', 32, { color: CSS.green });
      this.tweens.add({ targets: n, scale: 1.08, duration: 450, yoyo: true, repeat: -1 });
    }

    const m = s.mastery;
    const levelUp = m.to > m.from;
    const rows: { label: string; value: string; note?: string; good?: boolean }[] = [
      { label: 'Time survived', value: formatTime(s.time), note: s.newBest ? 'NEW BEST!' : `Best ${formatTime(s.bestTime)}`, good: s.newBest },
      { label: 'Level reached', value: String(s.level) },
      { label: 'Monsters defeated', value: String(s.kills) },
      { label: 'Gold collected', value: String(s.collected) },
      s.won ? { label: 'Survival + victory bonus', value: `+${s.bonus + s.victoryBonus}` } : { label: 'Survival bonus', value: `+${s.bonus}` },
      { label: `${m.hero} mastery`, value: `+${m.xp} XP`, note: levelUp ? `LEVEL UP! Mastery ${m.to}` : `Mastery ${m.to}`, good: levelUp },
    ];
    rows.forEach(({ label, value, note, good }, i) => {
      const y = cy - 372 + i * 100;
      text(this, width / 2 - 390, y, label, 38, { color: CSS.soft, weight: '600', originX: 0, shadow: false, stroke: false });
      text(this, width / 2 + 390, y, value, 46, { color: CSS.cream, originX: 1 });
      if (note) {
        const n = text(this, width / 2 + 390, y + 42, note, 28, { color: good ? CSS.green : CSS.muted, stroke: !!good, originX: 1 });
        if (good) this.tweens.add({ targets: n, scale: 1.12, duration: 400, yoyo: true, repeat: -1 });
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

    // News under the panel (a relic or map, unlocks, quests), shrunk to fit above the buttons when there is a lot.
    const by = height - bottom - 140;
    const news = this.add.container(width / 2, 0);
    let y = 0;
    const gap = 18;
    if (s.relic || s.unlockedMap !== null) {
      const u = s.relic
        ? text(this, 0, y + 58, `New relic: ${s.relic}!\nWear it from the Relics menu`, 46, { color: CSS.gold })
        : text(this, 0, y + 58, `New map unlocked:\n${MAPS[s.unlockedMap!].name}!`, 50, { color: CSS.green });
      news.add(u);
      this.tweens.add({ targets: u, scale: 1.07, duration: 500, yoyo: true, repeat: -1 });
      y += 116 + gap;
    }
    if (s.unlocks.length) {
      this.unlockNote(news, y + 75);
      y += 150 + gap;
    }
    if (s.quests.length || s.achievements.length) {
      this.questNote(news, y + 66);
      y += 132 + gap;
    }
    const newsTop = cy + 448;
    const room = by - 92 - newsTop;
    const k = y > 0 ? Math.min(1, room / (y - gap)) : 1;
    news.setScale(k).setY(newsTop);
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
  private questNote(c: Phaser.GameObjects.Container, y: number): void {
    const s = this.summary;
    const bits = [];
    if (s.quests.length) bits.push(s.quests.length === 1 ? '1 quest complete' : `${s.quests.length} quests complete`);
    if (s.achievements.length) bits.push(s.achievements.length === 1 ? '1 achievement' : `${s.achievements.length} achievements`);
    const w = 860;
    const icon = this.add.image(-w / 2 + 72, y, s.quests.length ? 'icon_scroll' : 'icon_trophy').setDisplaySize(86, 86);
    this.tweens.add({ targets: icon, angle: { from: -8, to: 8 }, duration: 600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    c.add([
      panel(this, 0, y, w, 132, { style: 'selected', radius: 30 }),
      icon,
      text(this, -w / 2 + 132, y - 24, bits.join('  ·  '), 40, { color: CSS.gold, originX: 0 }),
      text(this, -w / 2 + 132, y + 28, 'Claim your gold in Quests', 32, { color: CSS.cream, weight: '600', originX: 0 }),
    ]);
  }

  /** The weapons, items and runes this run unlocked: their icons, names, and where to see them. */
  private unlockNote(c: Phaser.GameObjects.Container, y: number): void {
    const list = this.summary.unlocks;
    const w = 860;
    const h = 150;
    c.add(panel(this, 0, y, w, h, { style: 'selected', radius: 30 }));
    const shown = list.slice(0, 3);
    const size = 84;
    const step = 66;
    shown.forEach((u, i) => {
      const x = -w / 2 + 28 + size / 2 + i * step;
      const icon = slotIcon(this, x, y, size, u.icon, 'evolved');
      c.add(icon);
      const sparkle = icon[1];
      this.tweens.add({ targets: sparkle, scale: sparkle.scale * 1.1, duration: 450, delay: i * 150, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    });
    const tx = -w / 2 + 28 + size + (shown.length - 1) * step + 24;
    const title = list.length === 1 ? 'NEW UNLOCK!' : `${list.length} NEW UNLOCKS!`;
    let names = list.map((u) => u.name).join(', ');
    if (names.length > 34) names = `${names.slice(0, 32).replace(/,? ?[^,]*$/, '')} and more`;
    c.add([
      text(this, tx, y - 38, title, 42, { color: CSS.gold, originX: 0 }),
      text(this, tx, y + 8, names, 30, { color: CSS.cream, weight: '600', originX: 0, shadow: false }),
      text(this, tx, y + 46, 'See them in the Collection', 28, { color: CSS.soft, weight: '600', originX: 0, shadow: false, stroke: false }),
    ]);
  }
}
