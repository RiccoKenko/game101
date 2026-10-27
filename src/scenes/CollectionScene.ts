import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { PLAYABLE, type CharacterDef } from '../config/characters';
import { BESTIARY, describeGoal, isBoss, monsterName, monsterTexture, UNLOCKS, unlockKey, type MonsterId, type UnlockDef } from '../config/collection';
import { BOSSES } from '../config/enemies';
import { MAPS } from '../config/maps';
import { describeReward, MASTERY, MASTERY_REWARDS, rewardIcon } from '../config/mastery';
import {
  EVOLUTIONS,
  PASSIVE_IDS,
  PASSIVES,
  requirementName,
  RUNE_IDS,
  RUNES,
  WEAPON_IDS,
  WEAPONS,
  type PassiveId,
  type RuneId,
} from '../config/weapons';
import { goalValue, isUnlocked, masteryPerks, masteryState, records, unseen, type Records } from '../core/collection';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { badge, Bar, Button, gradientText, panel, panelTexture, slotIcon, text, type SlotKind } from '../ui/widgets';
import { menuBackground } from './MenuScene';

export type CollectionTab = 'weapons' | 'runes' | 'items' | 'monsters' | 'heroes';

const TABS: { tab: CollectionTab; label: string }[] = [
  { tab: 'weapons', label: 'Skills' },
  { tab: 'runes', label: 'Cards' },
  { tab: 'items', label: 'Items' },
  { tab: 'monsters', label: 'Monsters' },
  { tab: 'heroes', label: 'Heroes' },
];

/** What the panel under the grid says about the picked tile. */
interface Detail {
  title: string;
  sub: string;
  body: string;
  /** How to unlock it, and how far along that is. */
  goal?: { text: string; value: number; target: number };
  /** One more line with a small picture: what it evolves, how many were defeated... */
  extra?: { icon: string; text: string };
}

interface Entry {
  key: string;
  icon: string;
  kind: SlotKind;
  /** An item not unlocked yet, or a monster never met. */
  locked: boolean;
  isNew: boolean;
  /** Toward unlocking, 0..1 (locked items only). */
  progress: number;
  /** Under the tile (kill counts). */
  caption?: string;
  detail: () => Detail;
}

const DETAIL_H = 330;
const LOCKED_TINT = 0x4a5068;
const count = (n: number) => Math.floor(n).toLocaleString('en-US');

/** Every weapon, item, rune and monster: what is unlocked, what isn't and how to get it, and each hero's mastery. */
export class CollectionScene extends Phaser.Scene {
  private tab: CollectionTab = 'weapons';
  private tabs = {} as Record<CollectionTab, Button>;
  private content: Phaser.GameObjects.GameObject[] = [];
  /** The detail panel and the selection ring, redrawn when another tile is picked. */
  private detail: Phaser.GameObjects.GameObject[] = [];
  private subtitle!: Phaser.GameObjects.Text;
  private rec!: Records;
  private listTop = 0;
  private listBottom = 0;

  constructor() {
    super('Collection');
  }

  init(data: { tab?: CollectionTab }): void {
    this.tab = data.tab ?? 'weapons';
  }

  create(): void {
    this.content = [];
    this.detail = [];
    this.rec = records(saveStore.data);
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    menuBackground(this);
    gradientText(text(this, width / 2, top + 88, 'COLLECTION', 92, { strokeColor: '#2a1606' }));
    this.subtitle = text(this, width / 2, top + 166, '', 34, { color: CSS.cream, weight: '600' });

    const tabY = top + 262;
    const tw = (width - 36 - 4 * 11) / 5;
    TABS.forEach(({ tab, label }, i) => {
      this.tabs[tab] = new Button(this, 18 + tw / 2 + i * (tw + 11), tabY, { w: tw, h: 92, label, fontSize: 31, color: BUTTON.system, onClick: () => this.show(tab) });
    });
    const winTop = tabY + 66;
    const winBottom = height - bottom - 222;
    panel(this, width / 2, (winTop + winBottom) / 2, width - 36, winBottom - winTop, { gem: true });
    this.listTop = winTop + 26;
    this.listBottom = winBottom - 24;
    new Button(this, width / 2, height - bottom - 120, {
      w: 520,
      h: 130,
      color: BUTTON.secondary,
      label: 'Back',
      icon: 'icon_home',
      onClick: () => this.scene.start('Menu'),
    });
    this.show(this.tab);
  }

  private show(tab: CollectionTab): void {
    this.tab = tab;
    for (const t of TABS) this.tabs[t.tab].setColor(t.tab === tab ? BUTTON.warning : BUTTON.system);
    this.content.forEach((o) => o.destroy());
    this.content = [];
    this.clearDetail();
    const save = saveStore.data;
    const open = save.unlocked.length;
    const met = BESTIARY.flatMap((g) => g.ids).filter((id) => (this.rec.monsters[id] ?? 0) > 0).length;
    this.subtitle.setText(
      tab === 'heroes'
        ? 'Play a hero to raise its Job Lv'
        : `Unlocked ${open} / ${UNLOCKS.length}  ·  Monsters met ${met} / ${BESTIARY.flatMap((g) => g.ids).length}`,
    );
    if (tab === 'heroes') this.drawHeroes();
    else if (tab === 'monsters') this.drawMonsters();
    else this.drawItems(tab);
    this.drawTabBadges();
  }

  private keep<T extends Phaser.GameObjects.GameObject>(o: T): T {
    this.content.push(o);
    return o;
  }

  // ---------------------------------------------------------------- weapons, runes, items

  private drawItems(tab: 'weapons' | 'runes' | 'items'): void {
    const save = saveStore.data;
    const fresh = unseen(save);
    const entries: Entry[] = [];
    const add = (kind: UnlockDef['kind'], id: string, name: string, icon: string, slot: SlotKind, detail: (locked: boolean) => Detail) => {
      const key = unlockKey({ kind, id });
      const u = UNLOCKS.find((x) => unlockKey(x) === key);
      const locked = !isUnlocked(save, { kind, id });
      const progress = u && locked ? Math.min(1, goalValue(u.goal, this.rec) / u.goal.n) : 0;
      entries.push({
        key,
        icon,
        kind: slot,
        locked,
        isNew: fresh.includes(key),
        progress,
        caption: name,
        detail: () => {
          const d = detail(locked);
          if (u && locked) d.goal = { text: describeGoal(u.goal), value: goalValue(u.goal, this.rec), target: u.goal.n };
          return d;
        },
      });
    };
    if (tab === 'weapons') {
      // Skill by skill, class by class (a mechanic no class uses stays out of the book).
      for (const owner of PLAYABLE) {
        for (const id of owner.skills) {
          const w = WEAPONS[id];
          add('weapon', id, w.name, w.icon, 'weapon', (locked) => {
            const evo = w.evolution!;
            return {
              title: w.name,
              sub: `${owner.name} skill${id === owner.start ? ' · start' : locked ? ' · locked' : ''}`,
              body: w.description,
              extra: { icon: EVOLUTIONS[evo.into].icon, text: `Evolves into ${EVOLUTIONS[evo.into].name} with ${requirementName(evo.requires)}` },
            };
          });
        }
      }
    } else if (tab === 'runes') {
      for (const id of RUNE_IDS) {
        const r = RUNES[id];
        add('rune', id, r.name, r.icon, 'rune', (locked) => ({ title: r.name, sub: locked ? 'Card · locked' : 'Card: changes every skill\'s hits', body: r.levels[0], extra: this.evolves(id) }));
      }
    } else {
      for (const id of PASSIVE_IDS) {
        const p = PASSIVES[id];
        add('passive', id, p.name, p.icon, 'passive', (locked) => ({
          title: p.name,
          sub: `${locked ? 'Item · locked' : 'Item'}${p.maxLevel > 1 ? ` · up to Lv ${p.maxLevel}` : ''}`,
          body: p.description,
          extra: this.evolves(id),
        }));
      }
    }
    const cols = tab === 'weapons' ? 6 : 4;
    const tiles = this.grid(entries, cols, this.listTop, this.listBottom - DETAIL_H - 20);
    // Start on something new, else the locked item closest to unlocking, else the first.
    const pick =
      entries.findIndex((e) => e.isNew) >= 0
        ? entries.findIndex((e) => e.isNew)
        : entries.some((e) => e.locked)
          ? entries.reduce((best, e, i) => (e.locked && (!entries[best].locked || e.progress > entries[best].progress) ? i : best), 0)
          : 0;
    this.select(entries[pick], tiles[pick]);
    // Looking counts as seeing: the NEW tags go next time.
    const seen = entries.filter((e) => e.isNew).map((e) => e.key);
    if (seen.length) {
      save.seen.push(...seen);
      saveStore.save();
    }
  }

  /** Which weapon this rune or item evolves, as a detail line. */
  private evolves(id: RuneId | PassiveId): Detail['extra'] {
    const w = WEAPON_IDS.map((x) => WEAPONS[x]).find((x) => x.evolution?.requires === id);
    if (!w) return undefined;
    const evo = EVOLUTIONS[w.evolution!.into];
    return { icon: evo.icon, text: `Evolves the ${w.name} into ${evo.name}` };
  }

  // ---------------------------------------------------------------- monsters

  private drawMonsters(): void {
    const { width } = this.scale;
    const save = saveStore.data;
    const cols = 7;
    const pitch = (width - 96) / cols;
    const tile = Math.min(150, pitch - 18);
    const groupH = 44 + tile + 40;
    const gridBottom = this.listBottom - DETAIL_H - 20;
    const gap = Math.max(0, (gridBottom - this.listTop - groupH * BESTIARY.length) / (BESTIARY.length - 1));
    let first: [Entry, { x: number; y: number; size: number }] | null = null;
    BESTIARY.forEach((group, gi) => {
      const top = this.listTop + gi * (groupH + gap);
      const open = group.map === null || group.map < save.unlockedMaps;
      const label = group.map === null ? 'Wanderers' : MAPS[group.map].name;
      this.keep(text(this, 48, top + 18, open ? label : `${label} (locked)`, 32, { color: open ? CSS.gold : CSS.muted, originX: 0 }));
      const entries = group.ids.map((id): Entry => {
        const n = this.rec.monsters[id] ?? 0;
        return {
          key: `monster:${id}`,
          icon: monsterTexture(id),
          kind: isBoss(id) ? 'evolved' : 'weapon',
          locked: n === 0,
          isNew: false,
          progress: 0,
          caption: n > 0 ? count(n) : '?',
          detail: () => this.monsterDetail(id, group.map, n),
        };
      });
      const tiles = this.grid(entries, cols, top + 44, top + 44 + tile + 40, tile);
      if (!first) first = [entries[0], tiles[0]];
    });
    if (first) this.select(...(first as [Entry, { x: number; y: number; size: number }]));
  }

  private monsterDetail(id: MonsterId, map: number | null, n: number): Detail {
    const where = map === null ? '' : MAPS[map].name;
    const boss = isBoss(id) ? BOSSES[id] : null;
    const sub = boss ? (boss.leader ? `Leader · ${where} · 2:30, 7:30, 12:30` : `Boss · ${where} · 5:00, 10:00, 15:00`) : id === 'goblin' ? 'Comes with a treasure event, on any map' : `Monster · ${where}`;
    const d: Detail = { title: n > 0 ? monsterName(id) : '???', sub, body: n > 0 ? `Defeated ${count(n)} ${n === 1 ? 'time' : 'times'}` : 'Not met yet' };
    // A goal that counts this monster: show the way to it.
    const u = UNLOCKS.find((x) => 'monster' in x.goal && x.goal.monster === id && !saveStore.data.unlocked.includes(unlockKey(x)));
    if (u) {
      const item = u.kind === 'weapon' ? WEAPONS[u.id] : u.kind === 'rune' ? RUNES[u.id] : PASSIVES[u.id];
      d.goal = { text: `${describeGoal(u.goal)} to unlock ${item.name}`, value: n, target: u.goal.n };
    }
    return d;
  }

  // ---------------------------------------------------------------- grid + detail

  /** Lays the tiles out in rows, centred, and makes them pickable. Returns where each one is. */
  private grid(entries: Entry[], cols: number, top: number, bottom: number, size?: number): { x: number; y: number; size: number }[] {
    const { width } = this.scale;
    const pitch = (width - 96) / cols;
    const rows = Math.ceil(entries.length / cols);
    const captionH = 58;
    const rowH = Math.min(pitch + captionH, (bottom - top) / rows);
    const tile = size ?? Math.min(170, pitch - 20, rowH - captionH - 6);
    // A short grid sits in the middle of its space rather than at the top.
    if (size === undefined) top += Math.max(0, (bottom - top - rows * rowH) / 2);
    return entries.map((e, i) => {
      const row = Math.floor(i / cols);
      const inRow = Math.min(cols, entries.length - row * cols);
      const x = width / 2 + ((i % cols) - (inRow - 1) / 2) * pitch;
      const y = top + row * rowH + tile / 2 + 4;
      const parts = slotIcon(this, x, y, tile, e.icon, e.kind).map((p) => this.keep(p));
      if (e.locked) {
        if (e.key.startsWith('monster:')) parts[1].setTint(0x05070f).setAlpha(0.75);
        else {
          parts[1].setTint(LOCKED_TINT);
          this.keep(this.add.image(x, y, 'icon_lock').setDisplaySize(tile * 0.42, tile * 0.42).setAlpha(0.95));
        }
      }
      if (e.caption) {
        const cap = text(this, x, y + tile / 2 + 8, e.caption, 23, { color: e.locked ? CSS.muted : CSS.cream, weight: '600', shadow: false, wrap: pitch - 8 });
        this.keep(cap.setOrigin(0.5, 0).setLineSpacing(-4));
      }
      if (e.locked && e.progress > 0) {
        const g = this.keep(this.add.graphics());
        const bw = tile - 30;
        const by = y + tile / 2 - 24;
        g.fillStyle(0x050a18, 0.9).fillRoundedRect(x - bw / 2 - 3, by - 3, bw + 6, 14, 7);
        g.fillStyle(0x5ad15a, 1).fillRoundedRect(x - bw / 2, by, Math.max(8, bw * e.progress), 8, 4);
      }
      if (e.isNew) this.newTag(x + tile / 2 - 34, y - tile / 2 + 8);
      const hit = this.keep(this.add.zone(x, y, tile, tile).setInteractive({ useHandCursor: true }));
      const at = { x, y, size: tile };
      hit.on('pointerup', () => {
        audio.sfx('click');
        this.select(e, at);
      });
      return at;
    });
  }

  private newTag(x: number, y: number): void {
    const c = this.keep(this.add.container(x, y));
    const g = this.add.graphics();
    g.fillStyle(0x5a0a12, 1).fillRoundedRect(-36, -18, 72, 36, 18);
    g.fillStyle(0xe8434f, 1).fillRoundedRect(-33, -15, 66, 30, 15);
    c.add([g, text(this, 0, 1, 'NEW', 22, { strokeColor: '#5a0a12', shadow: false })]);
    this.tweens.add({ targets: c, scale: 1.12, duration: 450, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  }

  private clearDetail(): void {
    this.detail.forEach((o) => o.destroy());
    this.detail = [];
  }

  private select(e: Entry, at: { x: number; y: number; size: number }): void {
    this.clearDetail();
    const add = <T extends Phaser.GameObjects.GameObject>(o: T): T => {
      this.detail.push(o);
      return o;
    };
    const ring = add(this.add.graphics());
    ring.lineStyle(7, 0xffd66b, 1).strokeRoundedRect(at.x - at.size / 2 - 9, at.y - at.size / 2 - 9, at.size + 18, at.size + 18, 18);
    this.tweens.add({ targets: ring, alpha: 0.55, duration: 500, yoyo: true, repeat: -1 });

    const d = e.detail();
    const { width } = this.scale;
    const w = width - 96;
    const x0 = (width - w) / 2;
    const cy = this.listBottom - DETAIL_H / 2;
    const pt = cy - DETAIL_H / 2;
    add(this.add.image(width / 2, cy, panelTexture(this, w, DETAIL_H, { style: 'parchment', radius: 24 })));
    const size = 176;
    const ix = x0 + 24 + size / 2;
    const parts = slotIcon(this, ix, pt + 30 + size / 2, size, e.icon, e.kind).map(add);
    if (e.locked) parts[1].setTint(e.key.startsWith('monster:') ? 0x05070f : LOCKED_TINT);
    const tx = ix + size / 2 + 26;
    const tw = x0 + w - 28 - tx;
    add(text(this, tx, pt + 46, d.title, 44, { color: CSS.ink, stroke: false, originX: 0 }));
    add(text(this, tx, pt + 92, d.sub, 27, { color: e.locked ? '#a8402a' : CSS.inkSoft, stroke: false, weight: '600', originX: 0, shadow: false, align: 'left', wrap: tw }));
    add(text(this, tx, pt + 120, d.body, 29, { color: CSS.ink, stroke: false, weight: '600', align: 'left', wrap: tw, shadow: false }).setOrigin(0, 0));
    const by = pt + DETAIL_H - 62;
    if (d.goal) {
      const g = d.goal;
      add(this.add.image(x0 + 50, by, 'icon_lock').setDisplaySize(52, 52));
      add(text(this, x0 + 90, by - 22, g.text, 29, { color: CSS.ink, stroke: false, originX: 0, align: 'left', wrap: w - 120 }));
      const bw = w - 330;
      const bar = new Bar(this, x0 + 90, by + 12, bw, 22, g.value >= g.target ? 0xf2c14e : 0x5ad15a);
      bar.set(g.value / g.target);
      add(bar.frame);
      add(bar.g);
      add(text(this, x0 + w - 28, by + 23, `${count(Math.min(g.value, g.target))} / ${count(g.target)}`, 28, { color: CSS.ink, stroke: false, originX: 1, shadow: false }));
    } else if (d.extra) {
      add(this.add.image(x0 + 50, by, d.extra.icon).setDisplaySize(64, 64));
      add(text(this, x0 + 96, by, d.extra.text, 29, { color: CSS.inkSoft, stroke: false, weight: '600', originX: 0, align: 'left', wrap: w - 130, shadow: false }));
    }
  }

  // ---------------------------------------------------------------- heroes

  private drawHeroes(): void {
    const gap = 16;
    const h = Math.min(420, (this.listBottom - this.listTop - gap * (PLAYABLE.length - 1)) / PLAYABLE.length);
    PLAYABLE.forEach((c, i) => this.heroCard(c, this.listTop + i * (h + gap) + h / 2, h));
  }

  private heroCard(c: CharacterDef, cy: number, h: number): void {
    const { width } = this.scale;
    const w = width - 96;
    const x0 = (width - w) / 2;
    const top = cy - h / 2;
    const xp = saveStore.data.mastery[c.id];
    const st = masteryState(xp);
    const master = st.level >= MASTERY.maxLevel;
    this.keep(this.add.image(width / 2, cy, panelTexture(this, w, h, { style: master ? 'selected' : 'parchment', radius: 24 })));
    const ink = master ? CSS.cream : CSS.ink;
    const soft = master ? CSS.soft : CSS.inkSoft;
    // The hero's picture on the left.
    const key = this.textures.exists(c.menu) ? c.menu : 'archer_menu';
    if (this.textures.exists(key)) {
      const img = this.keep(this.add.image(x0 + 130, top + h - 18, key).setOrigin(0.5, 1));
      img.setScale(Math.min((h - 40) / img.height, 240 / img.width));
      if (c.tint) img.setTint(c.tint);
    }
    const tx = x0 + 270;
    const tw = x0 + w - 28 - tx;
    this.keep(text(this, tx, top + 42, `${master ? 'Master ' : ''}${c.name}`, 40, { color: master ? CSS.gold : ink, stroke: master, originX: 0 }));
    this.keep(text(this, tx, top + 88, `Job Lv ${st.level}${master ? ' (max)' : ''}`, 32, { color: master ? CSS.gold : '#7a4a10', stroke: master, originX: 0 }));
    this.keep(text(this, x0 + w - 28, top + 90, master ? 'MAX' : `${count(st.into)} / ${count(st.need)} XP`, 27, { color: soft, stroke: false, weight: '600', originX: 1, shadow: false }));
    const bar = new Bar(this, tx, top + 116, tw, 22, master ? 0xf2c14e : 0x5ad15a);
    bar.set(master ? 1 : st.into / st.need);
    this.keep(bar.frame);
    this.keep(bar.g);
    const perks = masteryPerks(c.id, st.level);
    this.keep(
      text(this, tx, top + 170, st.level > 1 ? `Damage and max HP +${Math.round(perks.damage * 100)}%` : `Each level: damage and max HP +${Math.round(MASTERY.damage * 100)}%`, 26, {
        color: soft,
        stroke: false,
        weight: '600',
        originX: 0,
        shadow: false,
      }),
    );
    const rewards = MASTERY_REWARDS[c.id];
    const listTop = top + 208;
    const rowH = Math.min(70, (h - 222) / rewards.length);
    rewards.forEach((r, i) => {
      const y = listTop + i * rowH + rowH / 2;
      const got = st.level >= r.level;
      const size = Math.min(54, rowH - 8);
      const icon = this.keep(this.add.image(tx + size / 2, y, got ? rewardIcon(r) : 'icon_lock').setDisplaySize(size, size));
      if (!got) icon.setAlpha(0.6);
      this.keep(text(this, tx + size + 14, y, `Lv ${r.level}`, 28, { color: got ? (master ? CSS.gold : '#7a4a10') : CSS.muted, stroke: false, originX: 0, shadow: false }));
      this.keep(text(this, tx + size + 104, y, describeReward(r), 28, { color: got ? ink : CSS.muted, stroke: false, weight: '600', originX: 0, shadow: false }));
      if (got) this.keep(this.add.image(x0 + w - 50, y, 'icon_check').setDisplaySize(size - 6, size - 6));
    });
  }

  private drawTabBadges(): void {
    const fresh = unseen(saveStore.data);
    for (const [tab, kind] of [['weapons', 'weapon'], ['runes', 'rune'], ['items', 'passive']] as const) {
      const n = tab === this.tab ? 0 : fresh.filter((k) => k.startsWith(`${kind}:`)).length;
      if (n) {
        const b = this.tabs[tab];
        this.keep(badge(this, b.x + b.width / 2 - 18, b.y - 44, n).setDepth(5));
      }
    }
  }
}
