import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { ACHIEVEMENTS, questDef, type AchievementDef } from '../config/quests';
import { formatTime } from '../core/format';
import {
  achievementState,
  bonusReady,
  claimAchievement,
  claimBonus,
  claimQuest,
  dayKey,
  describeQuest,
  ensureDaily,
  lifetime,
  msToNextDay,
  questDone,
  ROMAN,
} from '../core/quests';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { badge, Bar, Button, gradientText, panel, panelTexture, pipTexture, slotIcon, text } from '../ui/widgets';
import { menuBackground } from './MenuScene';

type Tab = 'daily' | 'achievements';

interface RowSpec {
  icon: string;
  title: string;
  /** Smaller line under the title (what the next achievement tier asks for). */
  sub?: string;
  value: number;
  target: number;
  progress: string;
  reward: number;
  state: 'progress' | 'ready' | 'claimed';
  /** Achievement tiers: how many there are and how many are claimed. */
  pips?: [number, number];
  claim: () => number;
}

const ROW_GAP = 12;
const BUTTON_W = 210;

const count = (n: number) => Math.floor(n).toLocaleString('en-US');

/** Daily quests and achievements: progress bars, and gold to claim. */
export class QuestsScene extends Phaser.Scene {
  private tab: Tab = 'daily';
  private tabs!: Record<Tab, Button>;
  /** Everything drawn for the open tab, destroyed when it is drawn again. */
  private content: Phaser.GameObjects.GameObject[] = [];
  private badges: Phaser.GameObjects.Container[] = [];
  private goldText!: Phaser.GameObjects.Text;
  private goldIcon!: Phaser.GameObjects.Image;
  private shownGold = 0;
  private timerText?: Phaser.GameObjects.Text;
  private listTop = 0;
  private listBottom = 0;
  private day = '';

  constructor() {
    super('Quests');
  }

  init(data: { tab?: Tab }): void {
    this.tab = data.tab ?? 'daily';
  }

  create(): void {
    const save = saveStore.data;
    ensureDaily(save);
    saveStore.save();
    this.day = save.daily.day;
    this.content = [];
    this.badges = [];
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    menuBackground(this);

    gradientText(text(this, width / 2, top + 88, 'QUESTS', 92, { strokeColor: '#2a1606' }));
    panel(this, width / 2, top + 184, 280, 76, { radius: 38 });
    this.goldIcon = this.add.image(width / 2 - 140 + 44, top + 184, 'icon_coin').setDisplaySize(58, 58);
    this.shownGold = save.gold;
    this.goldText = text(this, width / 2 - 140 + 84, top + 186, String(save.gold), 50, { color: CSS.gold, originX: 0 });

    const tabY = top + 290;
    const tab = (t: Tab, x: number, label: string, icon: string) =>
      new Button(this, x, tabY, { w: 470, h: 100, label, icon, iconSize: 72, fontSize: 42, color: BUTTON.system, onClick: () => this.show(t) });
    this.tabs = {
      daily: tab('daily', width / 2 - 245, 'Daily', 'icon_scroll'),
      achievements: tab('achievements', width / 2 + 245, 'Achievements', 'icon_trophy'),
    };

    const winTop = tabY + 72;
    const winBottom = height - bottom - 222;
    panel(this, width / 2, (winTop + winBottom) / 2, width - 36, winBottom - winTop, { gem: true });
    this.listTop = winTop + 24;
    this.listBottom = winBottom - 24;

    new Button(this, width / 2, height - bottom - 120, {
      w: 520,
      h: 130,
      color: BUTTON.secondary,
      label: 'Back',
      icon: 'icon_home',
      onClick: () => this.scene.start('Menu'),
    });

    this.time.addEvent({ delay: 1000, loop: true, callback: () => this.tick() });
    this.show(this.tab);
  }

  private show(tab: Tab): void {
    this.tab = tab;
    this.tabs.daily.setColor(tab === 'daily' ? BUTTON.warning : BUTTON.system);
    this.tabs.achievements.setColor(tab === 'achievements' ? BUTTON.warning : BUTTON.system);
    this.draw();
  }

  private draw(): void {
    this.content.forEach((o) => o.destroy());
    this.content = [];
    this.timerText = undefined;
    if (this.tab === 'daily') this.drawDaily();
    else this.drawAchievements();
    this.drawBadges();
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.content.push(o);
    return o;
  }

  private drawDaily(): void {
    const save = saveStore.data;
    const { width } = this.scale;
    this.timerText = this.keep(text(this, width / 2, this.listTop + 24, '', 34, { color: CSS.soft, weight: '600' }));
    this.updateTimer();
    const top = this.listTop + 66;
    const rows = save.daily.quests.length + 1;
    const h = Math.min(210, (this.listBottom - top - 90 - ROW_GAP * (rows - 1)) / rows);
    const y = (i: number) => top + i * (h + ROW_GAP) + h / 2;
    save.daily.quests.forEach((q, i) => {
      const shown = Math.min(q.progress, q.target);
      this.row(y(i), h, {
        icon: questDef(q.id).icon,
        title: describeQuest(q),
        value: shown,
        target: q.target,
        progress: q.id === 'survive' ? `${formatTime(shown)} / ${formatTime(q.target)}` : `${count(shown)} / ${count(q.target)}`,
        reward: q.reward,
        state: q.claimed ? 'claimed' : questDone(q) ? 'ready' : 'progress',
        claim: () => claimQuest(save, i),
      });
    });
    const done = save.daily.quests.filter(questDone).length;
    this.row(y(rows - 1), h, {
      icon: 'chest',
      title: 'Bonus: finish all daily quests',
      value: done,
      target: save.daily.quests.length,
      progress: `${done} / ${save.daily.quests.length}`,
      reward: save.daily.bonus,
      state: save.daily.bonusClaimed ? 'claimed' : bonusReady(save) ? 'ready' : 'progress',
      claim: () => claimBonus(save),
    });
    const total = save.daily.quests.reduce((a, q) => a + q.reward, save.daily.bonus);
    const fy = Math.min(this.listBottom - 40, y(rows - 1) + h / 2 + 90);
    this.keep(text(this, width / 2, fy - 22, `Today's rewards: ${total} gold`, 36, { color: CSS.gold }));
    this.keep(text(this, width / 2, fy + 24, 'Every run on any map counts', 30, { color: CSS.soft, weight: '600', shadow: false }));
  }

  private drawAchievements(): void {
    const save = saveStore.data;
    const values = lifetime(save);
    // Rewards to claim first, finished achievements last.
    const rank = (s: ReturnType<typeof achievementState>) => (s.claimable ? 0 : s.next ? 1 : 2);
    const states = ACHIEVEMENTS.map((a) => achievementState(save, a, values)).sort((a, b) => rank(a) - rank(b));
    const n = states.length;
    const h = Math.min(170, (this.listBottom - this.listTop - ROW_GAP * (n - 1)) / n);
    states.forEach((st, i) => {
      const tier = st.next ? st.claimed : st.def.tiers.length - 1;
      const t = st.def.tiers[tier];
      const shown = Math.min(st.value, t.target);
      this.row(this.listTop + i * (h + ROW_GAP) + h / 2, h, {
        icon: st.def.icon,
        title: `${st.def.name} ${ROMAN[tier]}`,
        sub: st.def.describe(t.target),
        value: shown,
        target: t.target,
        progress: progressText(st.def, shown, t.target),
        reward: t.reward,
        state: !st.next ? 'claimed' : st.claimable ? 'ready' : 'progress',
        pips: [st.def.tiers.length, st.claimed],
        claim: () => claimAchievement(save, st.def.id),
      });
    });
  }

  /** One parchment card: icon, what to do, a progress bar, and the reward button (or a tick once claimed). */
  private row(cy: number, h: number, r: RowSpec): void {
    const { width } = this.scale;
    const w = width - 96;
    const x0 = (width - w) / 2;
    const claimed = r.state === 'claimed';
    const parts: (Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Graphics)[] = [];
    const add = <T extends Phaser.GameObjects.Image | Phaser.GameObjects.Text | Phaser.GameObjects.Graphics>(o: T): T => {
      this.content.push(o);
      parts.push(o);
      return o;
    };
    add(this.add.image(width / 2, cy, panelTexture(this, w, h, { style: 'parchment', radius: 20 })));
    const iconSize = Math.round(Math.min(104, h - 28));
    const ix = x0 + 18 + iconSize / 2;
    slotIcon(this, ix, cy, iconSize, r.icon).forEach(add);
    const tx = ix + iconSize / 2 + 22;
    const textW = x0 + w - BUTTON_W - 36 - tx;

    const titleY = r.sub ? cy - h * 0.3 : cy - h * 0.16;
    const title = add(text(this, tx, titleY, r.title, r.sub ? 34 : 38, { color: CSS.ink, stroke: false, originX: 0, align: 'left', wrap: textW }));
    if (r.pips) {
      const [total, on] = r.pips;
      const size = 24;
      for (let i = 0; i < total; i++) add(this.add.image(tx + title.width + 10 + size / 2 + i * (size + 4), titleY, pipTexture(this, size, i < on)));
    }
    if (r.sub) add(text(this, tx, cy + h * 0.02, r.sub, 26, { color: CSS.inkSoft, stroke: false, weight: '600', originX: 0, shadow: false }));

    const barH = r.sub ? 20 : 26;
    const barY = cy + h * 0.31 - barH / 2;
    const bar = new Bar(this, tx, barY, textW, barH, r.value >= r.target ? 0xf2c14e : 0x5ad15a);
    bar.set(r.target > 0 ? r.value / r.target : 0);
    add(bar.frame);
    add(bar.g);
    add(text(this, tx + textW, r.sub ? cy + h * 0.02 : barY - 24, r.progress, 26, { color: CSS.ink, stroke: false, originX: 1, shadow: false }));

    const bx = x0 + w - 18 - BUTTON_W / 2;
    if (claimed) {
      parts.forEach((p) => p.setAlpha(0.55));
      this.keep(this.add.image(bx - 46, cy, 'icon_check').setDisplaySize(68, 68));
      this.keep(text(this, bx + 42, cy + 2, 'Done', 38, { color: '#3f8f33', stroke: false }));
      return;
    }
    const ready = r.state === 'ready';
    const btn = this.keep(
      new Button(this, bx, cy - 4, {
        w: BUTTON_W,
        h: Math.min(92, h - 36),
        color: BUTTON.primary,
        icon: 'icon_coin',
        iconSize: 50,
        label: String(r.reward),
        fontSize: 40,
        onClick: () => this.claim(r, btn),
      }),
    );
    btn.setEnabled(ready);
    if (ready) this.tweens.add({ targets: btn, scale: 1.07, duration: 420, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private claim(r: RowSpec, btn: Button): void {
    const paid = r.claim();
    if (!paid) return;
    saveStore.save();
    audio.sfx('coin');
    this.flyCoins(btn.x, btn.y, saveStore.data.gold);
    // Redraw after the tap has finished being handled (it would destroy the button that is handling it).
    this.time.delayedCall(1, () => this.draw());
  }

  /** Coins arc from the button to the gold counter, which then counts up. */
  private flyCoins(x: number, y: number, to: number): void {
    const target = this.goldIcon;
    for (let i = 0; i < 8; i++) {
      const c = this.add.image(x + Phaser.Math.Between(-50, 50), y + Phaser.Math.Between(-20, 20), 'icon_coin').setDisplaySize(52, 52).setDepth(50);
      const midX = (c.x + target.x) / 2 + Phaser.Math.Between(-160, 160);
      const path = new Phaser.Curves.QuadraticBezier(new Phaser.Math.Vector2(c.x, c.y), new Phaser.Math.Vector2(midX, c.y - 260), new Phaser.Math.Vector2(target.x, target.y));
      const p = { t: 0 };
      this.tweens.add({
        targets: p,
        t: 1,
        delay: i * 45,
        duration: 520,
        ease: 'Quad.easeIn',
        onUpdate: () => {
          const v = path.getPoint(p.t);
          c.setPosition(v.x, v.y);
        },
        onComplete: () => {
          c.destroy();
          if (!this.tweens.isTweening(target)) this.tweens.add({ targets: target, scale: target.scale * 1.25, duration: 70, yoyo: true });
        },
      });
    }
    const from = this.shownGold;
    this.shownGold = to;
    this.tweens.addCounter({
      from,
      to,
      delay: 350,
      duration: 600,
      onUpdate: (tw) => this.goldText.setText(String(Math.round(tw.getValue() ?? to))),
    });
  }

  private drawBadges(): void {
    this.badges.forEach((b) => b.destroy());
    this.badges = [];
    const save = saveStore.data;
    const daily = save.daily.quests.filter((q) => !q.claimed && questDone(q)).length + (bonusReady(save) ? 1 : 0);
    const values = lifetime(save);
    const ach = ACHIEVEMENTS.filter((a) => achievementState(save, a, values).claimable).length;
    for (const [t, n] of [['daily', daily], ['achievements', ach]] as [Tab, number][]) {
      if (!n) continue;
      const b = this.tabs[t];
      this.badges.push(badge(this, b.x + 235 - 16, b.y - 50 + 6, n).setDepth(5));
    }
  }

  private tick(): void {
    if (dayKey() !== this.day) {
      ensureDaily(saveStore.data);
      saveStore.save();
      this.day = saveStore.data.daily.day;
      this.draw();
      return;
    }
    this.updateTimer();
  }

  private updateTimer(): void {
    if (!this.timerText) return;
    const s = Math.ceil(msToNextDay() / 1000);
    const hh = Math.floor(s / 3600);
    const mm = Math.floor((s % 3600) / 60);
    const pad = (n: number) => String(n).padStart(2, '0');
    this.timerText.setText(`New quests in ${pad(hh)}:${pad(mm)}:${pad(s % 60)}`);
  }
}

function progressText(def: AchievementDef, value: number, target: number): string {
  if (def.stat === 'bestTime') return `${formatTime(value)} / ${formatTime(target)}`;
  return `${count(value)} / ${count(target)}`;
}
