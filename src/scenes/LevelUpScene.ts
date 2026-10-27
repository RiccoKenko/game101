import Phaser from 'phaser';
import { talentDef } from '../config/talents';
import { PASSIVES, requirementName, RUNES, WEAPONS } from '../config/weapons';
import { MAXED, type Choice, type Inventory } from '../core/progression';
import { buildRows } from '../ui/build';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS, hex, lighten, PARCHMENT, rgba, shade } from '../ui/theme';
import { BUTTON } from '../ui/theme';
import { Button, dimmer, gradientText, panel, panelTexture, ribbon, roundRect, slotIcon, text, uiTexture, vGradient } from '../ui/widgets';

interface LevelUpData {
  choices: Choice[];
  inventory: Inventory;
  level: number;
  onPick: (c: Choice) => void;
  /** Rerolls and banishes left this run. */
  counts: () => { rerolls: number; banishes: number };
  /** New cards in place of these, or null when none are left. */
  reroll: (current: Choice[]) => Choice[] | null;
  /** Removes `c` from the run's pool for good and deals a new card in its place, or null when none are left. */
  banish: (c: Choice, current: Choice[]) => Choice[] | null;
}

export function describeChoice(c: Choice): { icon: string; name: string; tag: string; desc: string } {
  if (c.kind === 'weapon') {
    const def = WEAPONS[c.id];
    let desc = c.level === 1 ? def.description : def.upgrades[c.level - 2];
    if (c.level === 5 && def.evolution) desc += `\nMax level! Evolves with ${requirementName(def.evolution.requires)}.`;
    return { icon: def.icon, name: def.name, tag: c.level === 1 ? 'NEW!' : `LV ${c.level}`, desc };
  }
  if (c.kind === 'passive') {
    const def = PASSIVES[c.id];
    return { icon: def.icon, name: def.name, tag: c.level === 1 ? 'NEW!' : `LV ${c.level}`, desc: def.description };
  }
  if (c.kind === 'rune') {
    const def = RUNES[c.id];
    return { icon: def.icon, name: def.name, tag: c.level === 1 ? 'RUNE' : `LV ${c.level}`, desc: def.levels[c.level - 1] };
  }
  if (c.kind === 'talent') {
    const def = talentDef(c.id);
    return { icon: def.icon, name: def.name, tag: 'HERO', desc: def.text };
  }
  if (c.kind === 'might') return { icon: 'icon_might', name: 'Power Up', tag: '', desc: `Damage +${MAXED.might * 100}% for the rest of the run` };
  if (c.kind === 'tough') return { icon: 'icon_heart', name: 'Toughness', tag: '', desc: `Max HP +${MAXED.tough * 100}% for the rest of the run` };
  return { icon: 'meat', name: 'White Potion', tag: '', desc: 'Restore 30% of your HP' };
}

/** A tappable upgrade card on parchment: framed icon on the left, name + tag + description on the right. */
export function choiceCard(scene: Phaser.Scene, x: number, y: number, w: number, h: number, c: Choice): Phaser.GameObjects.Container {
  const info = describeChoice(c);
  const card = scene.add.container(x, y);
  const bg = scene.add.image(0, 0, panelTexture(scene, w, h, { style: 'parchment', radius: 24 }));
  const d = Math.min(150, h - 70);
  const ix = -w / 2 + 40 + d / 2;
  const kind = c.kind === 'weapon' ? 'weapon' : c.kind === 'passive' ? 'passive' : c.kind === 'rune' ? 'rune' : 'evolved';
  const tagColor = info.tag === 'NEW!' ? COLORS.green : info.tag === 'RUNE' ? 0x2fae8f : info.tag === 'HERO' ? 0xd9861c : COLORS.blue;
  const slot = slotIcon(scene, ix, 0, d, info.icon, kind);
  const tx = ix + d / 2 + 36;
  const name = text(scene, tx, -h / 2 + 52, info.name, 50, { color: CSS.ink, stroke: false, originX: 0 });
  const rule = scene.add.image(tx - 4, -h / 2 + 88, ruleTexture(scene, w / 2 - tx - 30)).setOrigin(0, 0.5);
  const desc = text(scene, tx, -h / 2 + 100, info.desc, 34, {
    color: CSS.inkSoft,
    stroke: false,
    weight: '600',
    originX: 0,
    originY: 0,
    align: 'left',
    wrap: w / 2 - tx - 30,
  });
  card.add([bg, ...slot, name, rule, desc]);
  if (info.tag) {
    const isNew = info.tag === 'NEW!';
    const tw = isNew ? 132 : 112;
    const tagX = w / 2 - 30 - tw / 2;
    const tagY = -h / 2 + 50;
    const pill = scene.add.image(tagX, tagY, tagTexture(scene, tw, 54, tagColor));
    const tag = text(scene, tagX, tagY, info.tag, 30, { strokeColor: isNew ? '#174d14' : info.tag === 'HERO' ? '#5a2e06' : '#123a6b', shadow: false });
    card.add([pill, tag]);
  }
  card.setSize(w, h);
  return card;
}

/** Small glossy capsule for card tags. */
function tagTexture(scene: Phaser.Scene, w: number, h: number, color: number): string {
  return uiTexture(scene, `tag_${w}x${h}_${color.toString(16)}`, w + 6, h + 6, (ctx) => {
    roundRect(ctx, 3, 3, w, h, h / 2);
    ctx.fillStyle = rgba(PARCHMENT.rim, 1);
    ctx.fill();
    roundRect(ctx, 5.5, 5.5, w - 5, h - 5, h / 2 - 2.5);
    ctx.fillStyle = vGradient(ctx, 5, h, ['#fff1c4', '#c9973e']);
    ctx.fill();
    roundRect(ctx, 8, 8, w - 10, h - 10, h / 2 - 5);
    ctx.fillStyle = vGradient(ctx, 8, h - 2, [hex(lighten(color, 0.3)), hex(color), hex(shade(color, 0.72))]);
    ctx.fill();
  });
}

/** Faded brown rule under a card title. */
function ruleTexture(scene: Phaser.Scene, w: number): string {
  w = Math.max(40, Math.round(w));
  return uiTexture(scene, `rule_${w}`, w, 4, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, w, 0);
    g.addColorStop(0, rgba(PARCHMENT.rule, 0.75));
    g.addColorStop(1, rgba(PARCHMENT.rule, 0));
    ctx.fillStyle = g;
    ctx.fillRect(0, 1, w, 2);
  });
}

export class LevelUpScene extends Phaser.Scene {
  private data_!: LevelUpData;
  private ready = false;
  private picked = false;
  /** Banish mode: the next card tapped is thrown out instead of picked. */
  private banishing = false;

  constructor() {
    super('LevelUp');
  }

  init(data: LevelUpData): void {
    this.data_ = data;
    this.ready = false;
    this.picked = false;
    this.banishing = false;
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    dimmer(this, 0.7);
    const usable = height - top - bottom;
    const titleY = top + Math.max(120, usable * 0.11);
    // Every few levels the cards are the hero's own talents.
    const talent = this.data_.choices[0]?.kind === 'talent';
    const title = gradientText(text(this, width / 2, titleY, talent ? 'HERO TALENT!' : 'LEVEL UP!', talent ? 96 : 112, { strokeColor: '#2a1606' }));
    this.tweens.add({ targets: title, scale: { from: 0.5, to: 1 }, duration: 350, ease: 'Back.easeOut' });
    ribbon(this, width / 2, titleY + 104, 640, 78);
    text(this, width / 2, titleY + 102, `Level ${this.data_.level} · choose one`, 40, { color: CSS.cream });

    const cardW = 960;
    const cardH = 264;
    const gap = 34;
    const startY = titleY + 196 + cardH / 2;
    // A card is picked only when the finger goes down and comes up on it: sliding off a card cancels.
    let pressed: Phaser.GameObjects.Container | null = null;
    this.input.on('pointerup', () => (pressed = null));
    this.data_.choices.forEach((c, i) => {
      const card = choiceCard(this, width / 2, startY + i * (cardH + gap), cardW, cardH, c);
      card.setInteractive({ useHandCursor: true });
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
        if (pressed !== card) return;
        pressed = null;
        if (!this.ready || this.picked) return;
        if (this.banishing) {
          const next = this.data_.banish(c, this.data_.choices);
          if (next) this.scene.restart({ ...this.data_, choices: next });
          return;
        }
        this.picked = true;
        this.data_.onPick(c);
      });
      card.setAlpha(0).setScale(0.8);
      this.tweens.add({ targets: card, alpha: 1, scale: 1, delay: 80 + i * 90, duration: 260, ease: 'Back.easeOut' });
    });

    // Reroll and banish, under the cards.
    const counts = this.data_.counts();
    const by = startY + 3 * (cardH + gap) - cardH / 2 - gap + 76;
    const cards = this.children.list.filter((o) => o instanceof Phaser.GameObjects.Container && o.input) as Phaser.GameObjects.Container[];
    new Button(this, width / 2 - 235, by, {
      w: 440,
      h: 104,
      color: BUTTON.secondary,
      icon: 'icon_retry',
      iconSize: 62,
      label: `Reroll (${counts.rerolls})`,
      fontSize: 40,
      onClick: () => {
        if (!this.ready || this.picked) return;
        const next = this.data_.reroll(this.data_.choices);
        if (next) this.scene.restart({ ...this.data_, choices: next });
      },
    }).setEnabled(counts.rerolls > 0);
    const banish = new Button(this, width / 2 + 235, by, {
      w: 440,
      h: 104,
      color: BUTTON.danger,
      icon: 'icon_banish',
      iconSize: 62,
      label: `Banish (${counts.banishes})`,
      fontSize: 40,
      onClick: () => {
        if (!this.ready || this.picked) return;
        this.banishing = !this.banishing;
        banish.setLabel(this.banishing ? 'Cancel' : `Banish (${counts.banishes})`);
        hint.setVisible(this.banishing);
        cards.forEach((card) => (card.list[0] as Phaser.GameObjects.Image).setTint(this.banishing ? 0xffb0a8 : 0xffffff));
      },
    }).setEnabled(counts.banishes > 0);
    const hint = text(this, width / 2, by - 76, 'Tap a card to banish it for this run', 34, { color: '#ffb0a8' }).setVisible(false);

    // Current gear in a small window under the buttons, when there is room.
    const inv = this.data_.inventory;
    const size = 70;
    const gearRows = inv.passives.length + inv.runes.length > 0 ? 2 : 1;
    const gearH = 84 + gearRows * (size + 14);
    const gearTop = by + 80;
    if (gearTop + gearH < height - bottom - 20) {
      const count = Math.max(inv.weapons.length, inv.passives.length + inv.runes.length);
      const rowW = count * (size + 10) - 10;
      panel(this, width / 2, gearTop + gearH / 2, Math.max(rowW + 120, 520), gearH, { header: 62 });
      text(this, width / 2, gearTop + 32, 'Your gear', 34, { color: CSS.gold });
      buildRows(this, width / 2 - rowW / 2, gearTop + 80, inv, size, 10);
    }
    // Ignore the tap that may still be in flight from steering.
    this.time.delayedCall(380, () => (this.ready = true));
  }
}
