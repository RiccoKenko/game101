import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { BAG_SIZE, CHEST, describeStat, GEAR, GEAR_TYPES, LEGENDARY, RARITIES, SLOTS, STAT_NAMES, type GearStat } from '../config/gear';
import {
  bonusStat,
  equip,
  gearBonus,
  isEquipped,
  mainStat,
  maxLevel,
  merge,
  mergePartners,
  openChest,
  salvage,
  salvageValue,
  slotOf,
  sortedItems,
  unequip,
  upgrade,
  upgradeCost,
  type GearItem,
} from '../core/gear';
import { saveStore } from '../core/save';
import { gearTile } from '../ui/gear';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { Button, dimmer, gradientText, panel, text } from '../ui/widgets';
import { menuBackground } from './MenuScene';

const COLS = 6;

/** Equipment: what is worn in the four slots, the bag, gear chests, and a pop-up to equip, level, merge or salvage. */
export class GearScene extends Phaser.Scene {
  private content: Phaser.GameObjects.GameObject[] = [];
  private popup: Phaser.GameObjects.GameObject[] = [];
  private goldText!: Phaser.GameObjects.Text;
  /** Items to tag NEW this visit (found since the last one). */
  private fresh = new Set<number>();
  private top = 0;
  private bottom = 0;

  constructor() {
    super('Gear');
  }

  create(): void {
    this.content = [];
    this.popup = [];
    const save = saveStore.data;
    this.fresh = new Set(save.gear.items.filter((i) => i.fresh).map((i) => i.uid));
    for (const i of save.gear.items) delete i.fresh;
    saveStore.save();
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    this.top = top;
    this.bottom = height - bottom;
    menuBackground(this);
    gradientText(text(this, width / 2, top + 88, 'GEAR', 92, { strokeColor: '#2a1606' }));
    panel(this, width / 2, top + 184, 280, 76, { radius: 38 });
    this.add.image(width / 2 - 140 + 44, top + 184, 'icon_coin').setDisplaySize(58, 58);
    this.goldText = text(this, width / 2 - 140 + 84, top + 186, String(save.gold), 50, { color: CSS.gold, originX: 0 });
    new Button(this, width / 2, height - bottom - 120, {
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
    const gear = save.gear;
    const { width } = this.scale;
    this.goldText.setText(String(save.gold));

    // The four worn slots.
    const sy = this.top + 330;
    const size = 176;
    SLOTS.forEach((slot, i) => {
      const x = width / 2 + (i - 1.5) * 236;
      const item = gear.items.find((it) => it.uid === gear.equipped[slot.id]);
      const type = item ? item.type : GEAR_TYPES.find((t) => GEAR[t].slot === slot.id)!;
      gearTile(this, x, sy, size, type, item ? item.rarity : -1).forEach((o) => this.keep(o));
      if (item) this.keep(text(this, x + size / 2 - 12, sy + size / 2 - 22, `Lv${item.level}`, 28, { originX: 1 }));
      this.keep(text(this, x, sy + size / 2 + 34, slot.name, 32, { color: item ? RARITIES[item.rarity].css : CSS.muted }));
      if (item) {
        const hit = this.keep(this.add.zone(x, sy, size, size).setInteractive({ useHandCursor: true }));
        hit.on('pointerup', () => this.open(item));
      }
    });

    // What it all adds up to.
    const b = gearBonus(gear);
    const parts = (Object.keys(b) as GearStat[]).filter((k) => b[k] > 0).map((k) => describeStat(k, b[k]));
    this.keep(
      text(this, width / 2, this.top + 540, parts.length ? parts.join('  ·  ') : 'Nothing worn yet: open a chest, or find gear by beating bosses', 28, {
        color: parts.length ? CSS.green : CSS.soft,
        weight: '600',
        wrap: width - 120,
      }),
    );

    // Gear chest and relics.
    const by = this.top + 640;
    const chest = this.keep(
      new Button(this, width / 2 - 250, by, {
        w: 460,
        h: 110,
        color: BUTTON.primary,
        icon: 'chest',
        iconSize: 76,
        label: `Chest  ${CHEST.price}`,
        fontSize: 40,
        onClick: () => this.buyChest(chest),
      }),
    );
    chest.setEnabled(save.gold >= CHEST.price);
    this.keep(
      new Button(this, width / 2 + 250, by, {
        w: 460,
        h: 110,
        color: BUTTON.system,
        icon: save.equipped.length ? `relic_${save.equipped[0]}` : 'relic_slime',
        iconSize: 76,
        label: 'Relics',
        fontSize: 40,
        onClick: () => this.scene.start('Relics', { back: 'Gear' }),
      }),
    );

    // The bag.
    const bagTop = by + 90;
    const bagBottom = this.bottom - 222;
    this.keep(panel(this, width / 2, (bagTop + bagBottom) / 2, width - 36, bagBottom - bagTop, { gem: true }));
    this.keep(text(this, 60, bagTop + 40, `Bag  ${gear.items.length} / ${BAG_SIZE}`, 34, { color: CSS.cream, originX: 0 }));
    this.keep(text(this, width - 60, bagTop + 40, 'Merge 3 of a kind for a rarer one', 26, { color: CSS.soft, weight: '600', originX: 1, shadow: false }));
    const items = sortedItems(gear);
    const gridTop = bagTop + 80;
    const pitch = (width - 96) / COLS;
    const rows = Math.ceil(BAG_SIZE / COLS);
    const rowH = Math.min(pitch, (bagBottom - 20 - gridTop) / rows);
    const tile = Math.min(150, pitch - 16, rowH - 12);
    if (!items.length) this.keep(text(this, width / 2, (gridTop + bagBottom) / 2, 'Empty: gear drops at the end of a run', 32, { color: CSS.muted }));
    items.forEach((item, i) => {
      const x = 48 + pitch * ((i % COLS) + 0.5);
      const y = gridTop + Math.floor(i / COLS) * rowH + rowH / 2;
      gearTile(this, x, y, tile, item.type, item.rarity).forEach((o) => this.keep(o));
      this.keep(text(this, x + tile / 2 - 8, y + tile / 2 - 18, `${item.level}`, 26, { originX: 1 }));
      if (isEquipped(gear, item)) this.keep(this.add.image(x - tile / 2 + 22, y - tile / 2 + 22, 'icon_check').setDisplaySize(40, 40));
      if (this.fresh.has(item.uid)) this.newTag(x + tile / 2 - 30, y - tile / 2 + 6);
      const hit = this.keep(this.add.zone(x, y, tile, tile).setInteractive({ useHandCursor: true }));
      hit.on('pointerup', () => this.open(item));
    });
  }

  private newTag(x: number, y: number): void {
    const c = this.keep(this.add.container(x, y));
    const g = this.add.graphics();
    g.fillStyle(0x5a0a12, 1).fillRoundedRect(-34, -16, 68, 32, 16);
    g.fillStyle(0xe8434f, 1).fillRoundedRect(-31, -13, 62, 26, 13);
    c.add([g, text(this, 0, 1, 'NEW', 20, { strokeColor: '#5a0a12', shadow: false })]);
  }

  private buyChest(btn: Button): void {
    const save = saveStore.data;
    const got = openChest(save, Math.random);
    if (got === false) {
      this.tweens.add({ targets: btn, x: btn.x + 12, duration: 50, yoyo: true, repeat: 3 });
      return;
    }
    saveStore.save();
    audio.sfx('chest');
    // Redraw after the tap is handled (it would destroy the button handling it).
    this.time.delayedCall(1, () => {
      this.draw();
      if (typeof got === 'number') this.flash(`Bag full: salvaged for ${got} gold`);
      else {
        this.fresh.add(got.uid);
        this.open(got, true);
      }
    });
  }

  private flash(msg: string): void {
    const t = text(this, this.scale.width / 2, this.top + 470, msg, 36, { color: CSS.gold }).setDepth(80);
    this.tweens.add({ targets: t, y: t.y - 40, alpha: 0, delay: 1200, duration: 500, onComplete: () => t.destroy() });
  }

  private closePopup(): void {
    this.popup.forEach((o) => o.destroy());
    this.popup = [];
  }

  /** The item's card: its stats, and what can be done with it. */
  private open(item: GearItem, found = false): void {
    this.closePopup();
    const save = saveStore.data;
    const gear = save.gear;
    const { width, height } = this.scale;
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.popup.push(o);
      return o;
    };
    const dim = add(dimmer(this, 0.72).setDepth(90));
    dim.on('pointerup', () => this.closePopup());
    const cy = height / 2 - 40;
    const w = 940;
    const h = 900;
    const x0 = width / 2 - w / 2;
    const top = cy - h / 2;
    const def = GEAR[item.type];
    const rar = RARITIES[item.rarity];
    const box = add(panel(this, width / 2, cy, w, h, { gem: true }).setDepth(91));
    box.setInteractive(); // taps on the card don't close it
    const d = <T extends Phaser.GameObjects.GameObject & { setDepth(v: number): unknown }>(o: T): T => {
      o.setDepth(92);
      return add(o);
    };
    if (found) d(text(this, width / 2, top - 46, 'You got:', 44, { color: CSS.gold }));
    gearTile(this, x0 + 60 + 100, top + 150, 200, item.type, item.rarity).forEach((o) => d(o));
    const tx = x0 + 300;
    d(text(this, tx, top + 80, def.name, 48, { color: rar.css, originX: 0 }));
    const slotName = SLOTS.find((s) => s.id === def.slot)!.name;
    d(text(this, tx, top + 134, `${rar.name} ${slotName}`, 32, { color: CSS.soft, weight: '600', originX: 0, shadow: false }));
    d(text(this, tx, top + 186, `Level ${item.level} / ${maxLevel(item)}`, 34, { color: CSS.cream, originX: 0 }));
    if (isEquipped(gear, item)) d(text(this, tx, top + 232, 'Worn', 30, { color: CSS.green, originX: 0 }));

    const m = mainStat(item);
    const bonus = bonusStat(item);
    let y = top + 320;
    d(text(this, x0 + 60, y, describeStat(m.stat, m.value), 40, { color: CSS.green, originX: 0 }));
    y += 56;
    d(
      text(this, x0 + 60, y, bonus ? describeStat(bonus.stat, bonus.value) : `Rare and better: ${STAT_NAMES[def.bonus]} too`, 34, {
        color: bonus ? CSS.green : CSS.muted,
        weight: '600',
        originX: 0,
        shadow: false,
      }),
    );
    y += 56;
    const cost = upgradeCost(item);
    if (cost !== null) {
      const next = mainStat({ ...item, level: item.level + 1 });
      d(text(this, x0 + 60, y, `Next level: ${describeStat(next.stat, next.value)}`, 30, { color: CSS.soft, weight: '600', originX: 0, shadow: false }));
    } else d(text(this, x0 + 60, y, 'Highest level for this rarity: merge to go further', 30, { color: CSS.soft, weight: '600', originX: 0, shadow: false }));
    y += 50;
    const partners = mergePartners(gear, item);
    const same = gear.items.filter((i) => slotOf(i) === slotOf(item) && i.rarity === item.rarity).length;
    const mergeText =
      item.rarity >= LEGENDARY
        ? 'Legendary is the rarest'
        : `Merge: 3 ${rar.name} ${slotName} → 1 ${RARITIES[item.rarity + 1].name} (you have ${Math.min(same, 3)}/3)`;
    d(text(this, x0 + 60, y, mergeText, 28, { color: partners.length ? CSS.gold : CSS.muted, weight: '600', originX: 0, shadow: false, wrap: w - 120, align: 'left' }));

    // Buttons, two by two.
    const bw = 400;
    const bh = 112;
    const bx = (i: number) => width / 2 + (i === 0 ? -1 : 1) * (bw / 2 + 14);
    const row1 = top + h - 230;
    const row2 = top + h - 96;
    const act = (fn: () => boolean | number) => () => {
      if (!fn()) return;
      saveStore.save();
      this.time.delayedCall(1, () => {
        this.draw();
        if (gear.items.includes(item)) this.open(item);
        else this.closePopup();
      });
    };
    const worn = isEquipped(gear, item);
    d(
      new Button(this, bx(0), row1, {
        w: bw,
        h: bh,
        color: worn ? BUTTON.system : BUTTON.primary,
        label: worn ? 'Take off' : 'Equip',
        fontSize: 42,
        onClick: act(() => {
          if (worn) unequip(gear, slotOf(item));
          else equip(gear, item);
          audio.sfx('click');
          return true;
        }),
      }),
    );
    const up = d(
      new Button(this, bx(1), row1, {
        w: bw,
        h: bh,
        color: BUTTON.warning,
        icon: 'icon_coin',
        iconSize: 52,
        label: cost === null ? 'Max level' : `Level up  ${cost}`,
        fontSize: 38,
        onClick: act(() => {
          const ok = upgrade(save, item);
          if (ok) audio.sfx('levelup');
          return ok;
        }),
      }),
    );
    up.setEnabled(cost !== null && save.gold >= cost);
    const mg = d(
      new Button(this, bx(0), row2, {
        w: bw,
        h: bh,
        color: BUTTON.purple,
        label: 'Merge',
        fontSize: 42,
        onClick: act(() => {
          const ok = merge(gear, item);
          if (ok) {
            audio.sfx('victory');
            this.cameras.main.flash(200, 255, 240, 200);
          }
          return ok;
        }),
      }),
    );
    mg.setEnabled(partners.length === 2);
    d(
      new Button(this, bx(1), row2, {
        w: bw,
        h: bh,
        color: BUTTON.danger,
        icon: 'icon_coin',
        iconSize: 52,
        label: `Salvage  +${salvageValue(item)}`,
        fontSize: 36,
        onClick: act(() => {
          audio.sfx('coin');
          return salvage(save, item);
        }),
      }),
    );
    d(
      new Button(this, x0 + w - 50, top + 46, {
        w: 84,
        h: 84,
        shape: 'round',
        color: BUTTON.system,
        icon: 'icon_banish',
        iconSize: 46,
        onClick: () => this.time.delayedCall(1, () => this.closePopup()),
      }),
    );
  }
}
