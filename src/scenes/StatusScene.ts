import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { CHARACTERS, type CharacterId } from '../config/characters';
import { JOB_CHANGE, MASTERY, SECOND_JOBS, STAT_CAP, STAT_RESET_GOLD, STATS } from '../config/mastery';
import { masteryState } from '../core/collection';
import { saveStore } from '../core/save';
import { addStat, changeJob, freePoints, jobChangeNeeds, jobName, resetStats, statPoints } from '../core/status';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { Bar, Button, gradientText, panel, text } from '../ui/widgets';
import { menuBackground } from './MenuScene';

/**
 * A hero's status window, the classic way: Job Lv, stat points to spend on STR / AGI / VIT / INT / DEX / LUK, and
 * the job change (Archer to Hunter, Mage to Wizard, Swordman to Knight) once the hero is ready for it.
 */
export class StatusScene extends Phaser.Scene {
  private hero: CharacterId = 'archer';
  private content: Phaser.GameObjects.GameObject[] = [];
  private top = 0;
  private bottom = 0;

  constructor() {
    super('Status');
  }

  create(data: { hero?: CharacterId }): void {
    this.hero = data?.hero ?? saveStore.data.character;
    this.content = [];
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    this.top = top;
    this.bottom = height - bottom;
    menuBackground(this);
    gradientText(text(this, width / 2, top + 88, 'STATUS', 92, { strokeColor: '#2a1606' }));
    new Button(this, width / 2, this.bottom - 120, {
      w: 520,
      h: 130,
      color: BUTTON.secondary,
      label: 'Back',
      icon: 'icon_home',
      onClick: () => this.scene.start('Menu'),
    });
    this.draw();
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.content.push(o);
    return o;
  }

  private draw(): void {
    this.content.forEach((o) => o.destroy());
    this.content = [];
    const save = saveStore.data;
    const hero = this.hero;
    const def = CHARACTERS.find((c) => c.id === hero)!;
    const { width } = this.scale;
    const st = masteryState(save.mastery[hero]);
    const changed = save.jobs[hero] > 0;
    const free = freePoints(save, hero);

    // Who, and how far along.
    let y = this.top + 210;
    this.keep(panel(this, width / 2, y + 60, 980, 190, { radius: 28 }));
    this.keep(text(this, width / 2, y + 10, `${jobName(save, hero, def.name)}${changed ? ` (was ${def.name})` : ''}`, 48, { color: changed ? '#ffd36b' : CSS.gold }));
    this.keep(text(this, width / 2 - 440, y + 82, `Job Lv ${st.level}`, 36, { color: CSS.cream, originX: 0 }));
    const bar = new Bar(this, width / 2 - 200, y + 72, 420, 22, 0x5ad15a);
    bar.set(st.need ? st.into / st.need : 1);
    this.keep(bar.g);
    this.keep(bar.frame);
    this.keep(text(this, width / 2 + 250, y + 82, st.level >= MASTERY.maxLevel ? 'MAX' : `${st.into}/${st.need}`, 26, { color: CSS.soft, weight: '600', originX: 0, shadow: false }));

    // Points and the six stats.
    y += 210;
    this.keep(text(this, width / 2, y, free ? `${free} point${free > 1 ? 's' : ''} to spend` : `All ${statPoints(save, hero)} points spent`, 40, { color: free ? '#9dff7a' : CSS.soft }));
    y += 70;
    const rowH = 118;
    STATS.forEach((s, i) => {
      const ry = y + i * rowH + rowH / 2;
      const pts = save.points[hero][s.id];
      this.keep(panel(this, width / 2, ry, 980, rowH - 14, { style: 'inset', radius: 22 }));
      this.keep(text(this, width / 2 - 450, ry, s.name, 46, { color: CSS.gold, originX: 0 }));
      this.keep(text(this, width / 2 - 300, ry, String(pts), 46, { color: CSS.cream }));
      const total = s.id === 'luk' ? `Crit +${(pts * s.per * 100).toFixed(1)}%, gold +${pts}%` : `${s.text.replace(/[+-][\d.]+%/, '')}+${+(pts * s.per * 100).toFixed(1)}%`;
      this.keep(text(this, width / 2 - 230, ry - 18, total, 30, { color: pts ? '#b4f0a0' : CSS.soft, weight: '600', originX: 0, shadow: false }));
      this.keep(text(this, width / 2 - 230, ry + 22, `each point: ${s.text}`, 22, { color: CSS.muted, weight: '600', originX: 0, shadow: false }));
      const plus = this.keep(
        new Button(this, width / 2 + 410, ry, {
          w: 110,
          h: 90,
          color: BUTTON.primary,
          label: '+',
          fontSize: 56,
          onClick: () => {
            if (!addStat(save, hero, s.id)) return;
            saveStore.save();
            audio.sfx('click');
            this.time.delayedCall(1, () => this.draw());
          },
        }),
      );
      plus.setEnabled(free > 0 && pts < STAT_CAP);
    });
    y += STATS.length * rowH + 20;

    const reset = this.keep(
      new Button(this, width / 2, y + 40, {
        w: 520,
        h: 96,
        color: BUTTON.danger,
        icon: 'icon_coin',
        iconSize: 50,
        label: `Reset points  ${STAT_RESET_GOLD}`,
        fontSize: 34,
        onClick: () => {
          if (!resetStats(save, hero)) return;
          saveStore.save();
          audio.sfx('coin');
          this.time.delayedCall(1, () => this.draw());
        },
      }),
    );
    reset.setEnabled(statPoints(save, hero) - free > 0 && save.gold >= STAT_RESET_GOLD);

    // The job change.
    y += 150;
    const job = SECOND_JOBS[hero];
    const needs = jobChangeNeeds(save, hero);
    this.keep(panel(this, width / 2, y + 110, 980, 240, { style: changed ? 'selected' : 'window', radius: 28 }));
    this.keep(text(this, width / 2, y + 30, changed ? `Second job: ${job.name}` : `Job change: ${def.name} → ${job.name}`, 40, { color: changed ? '#ffd36b' : CSS.gold }));
    this.keep(
      text(this, width / 2, y + 86, `${job.text}; damage and max HP +${Math.round(JOB_CHANGE.damage * 100)}%; +${JOB_CHANGE.points} stat points and 2 a level after`, 26, {
        color: CSS.cream,
        weight: '600',
        wrap: 900,
        shadow: false,
      }),
    );
    if (!changed) {
      if (needs.length) this.keep(text(this, width / 2, y + 170, `Needs: ${needs.join('  ·  ')}`, 28, { color: '#ff9a8a', weight: '600', wrap: 900, shadow: false }));
      else
        this.keep(
          new Button(this, width / 2, y + 172, {
            w: 520,
            h: 96,
            color: BUTTON.purple,
            label: `Become a ${job.name}!`,
            fontSize: 38,
            onClick: () => {
              if (!changeJob(save, hero)) return;
              saveStore.save();
              audio.sfx('victory');
              this.cameras.main.flash(400, 255, 236, 180);
              this.time.delayedCall(1, () => this.draw());
            },
          }),
        );
    }
  }
}
