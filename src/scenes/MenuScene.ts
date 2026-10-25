import Phaser from 'phaser';
import { audio, AUDIO_ENABLED, MUSIC_KEYS } from '../audio/audio';
import { CHARACTERS } from '../config/characters';
import { CURSE_UNLOCK_MAPS, heatOf } from '../config/curses';
import { DIFFICULTIES, maxDifficulty } from '../config/difficulty';
import { BOSSES } from '../config/enemies';
import { MAPS } from '../config/maps';
import { DEBUG } from '../core/debug';
import { formatTime } from '../core/format';
import { claimableCount, ensureDaily } from '../core/quests';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { BUTTON, CSS } from '../ui/theme';
import { badge, Button, gradientText, panel, panelTexture, ribbon, slotTexture, text } from '../ui/widgets';

const CARD_W = 960;
const CARD_H = 152;
const THUMB = 118;
/** Tallest the hero picture in the menu gets. */
const HERO_H = 620;

interface MapCard {
  bg: Phaser.GameObjects.Image;
  name: Phaser.GameObjects.Text;
  locked: boolean;
}

export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private cards: MapCard[] = [];
  /** The hero shown between the title and the map cards (one of CHARACTERS). */
  private heroIndex = 0;
  private heroImg?: Phaser.GameObjects.Image;
  private heroName!: Phaser.GameObjects.Text;
  private heroPerk!: Phaser.GameObjects.Text;
  private heroLock!: Phaser.GameObjects.Image;
  private heroBox = { x: 0, top: 0, bottom: 0 };
  private playButton!: Button;
  private goldText!: Phaser.GameObjects.Text;

  constructor() {
    super('Menu');
  }

  create(): void {
    const save = saveStore.data;
    if (DEBUG.gold >= 0) save.gold = DEBUG.gold;
    if (DEBUG.unlock) save.unlockedMaps = MAPS.length;
    // New day: new quests (and any reward left unclaimed yesterday is paid now, so the gold shown is right).
    ensureDaily(save);
    saveStore.save();
    this.selected = save.unlockedMaps - 1;
    this.heroIndex = Math.max(0, CHARACTERS.findIndex((c) => c.id === save.character));

    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    menuBackground(this);

    // Title block.
    const title = gradientText(text(this, width / 2, top + 178, 'Little Archer', 128, { strokeColor: '#2a1606' }));
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    ribbon(this, width / 2, top + 300, 660, 92);
    gradientText(text(this, width / 2, top + 298, 'MONSTER RUSH', 58), ['#ffffff', '#fff1c8', '#f2c25a']);

    // Bottom buttons first: the map cards and the hero fill the space between them and the title.
    const playY = height - bottom - 300;
    const gap = 18;
    const blockH = 56 + MAPS.length * CARD_H + (MAPS.length - 1) * gap;
    const blockTop = playY - 75 - 34 - blockH;
    const heroTop = top + 362;
    this.hero(width / 2, heroTop, blockTop - 4);

    // Gold and sound toggles.
    const pillX = width - 24 - 120;
    panel(this, pillX, top + 56, 240, 72, { radius: 36 });
    this.add.image(pillX - 120 + 40, top + 56, 'icon_coin').setDisplaySize(54, 54);
    this.goldText = text(this, pillX - 120 + 78, top + 57, String(save.gold), 44, { color: CSS.gold, originX: 0 });
    const music = new Button(this, 78, top + 52, {
      w: 104,
      h: 88,
      color: BUTTON.system,
      icon: audio.musicOn ? 'icon_music' : 'icon_music_off',
      iconSize: 60,
      onClick: () => {
        audio.setMusicEnabled(this, !audio.musicOn);
        music.setIcon(audio.musicOn ? 'icon_music' : 'icon_music_off');
      },
    });
    const sfx = new Button(this, 200, top + 52, {
      w: 104,
      h: 88,
      color: BUTTON.system,
      icon: audio.sfxOn ? 'icon_sfx' : 'icon_sfx_off',
      iconSize: 60,
      onClick: () => {
        audio.setSfxEnabled(!audio.sfxOn);
        sfx.setIcon(audio.sfxOn ? 'icon_sfx' : 'icon_sfx_off');
      },
    });

    text(this, width / 2, blockTop + 22, 'Choose your adventure', 40, { color: CSS.cream });
    this.cards = [];
    MAPS.forEach((map, i) => {
      const y = blockTop + 56 + CARD_H / 2 + i * (CARD_H + gap);
      this.mapCard(map.index, width / 2, y);
    });
    this.highlight();

    this.playButton = new Button(this, width / 2, playY, { w: 640, h: 150, color: BUTTON.primary, label: 'PLAY', fontSize: 76, onClick: () => this.play() });
    // Curses (after the first boss): a round button beside PLAY, with the heat picked on a badge.
    if (save.unlockedMaps >= CURSE_UNLOCK_MAPS) {
      const cx = width / 2 + 320 + (width / 2 - 320) / 2;
      new Button(this, cx, playY, { w: 150, h: 150, shape: 'round', color: BUTTON.purple, icon: 'icon_curse', iconSize: 92, onClick: () => this.scene.start('Curses') });
      const heat = heatOf(save.curses);
      if (heat > 0) badge(this, cx + 52, playY - 52, heat);
    }
    this.showHero();
    const by = height - bottom - 120;
    const third = (i: number, label: string, icon: string, color: number, scene: string) =>
      new Button(this, width / 2 + (i - 1) * 330, by, { w: 310, h: 110, color, label, icon, iconSize: 66, fontSize: 40, onClick: () => this.scene.start(scene) });
    third(0, 'Shop', 'icon_shop', BUTTON.warning, 'Shop');
    const quests = third(1, 'Quests', 'icon_scroll', BUTTON.purple, 'Quests');
    third(2, 'Relics', save.equipped.length ? `relic_${save.equipped[0]}` : 'relic_slime', BUTTON.system, 'Relics');
    const waiting = claimableCount(save);
    if (waiting > 0) {
      const b = badge(this, quests.x + 155 - 16, by - 55 + 4, waiting);
      this.tweens.add({ targets: b, scale: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    }

    audio.playMusic(this, 'music_menu');
    // Warm up map music in the background so a run starts with its track.
    if (AUDIO_ENABLED) {
      for (const key of MUSIC_KEYS) if (key !== 'music_menu' && !this.cache.audio.exists(key)) this.load.audio(key, `audio/${key}.mp3`);
      this.load.start();
    }
  }

  /**
   * The hero standing between the title and the map cards, with arrows to switch heroes and a plate with the
   * hero's name and perk under it. Falls back to the drawn two-frame hero when there is no painted art.
   */
  private hero(x: number, areaTop: number, areaBottom: number): void {
    const plateH = 92;
    const bottom = areaBottom - plateH - 6;
    this.heroBox = { x, top: areaTop, bottom };
    if (this.textures.exists('hero_menu')) {
      this.add.ellipse(x, bottom - 14, 300, 46, 0x050a18, 0.35);
      const py = areaBottom - plateH / 2;
      panel(this, x, py, 720, plateH, { radius: 28 });
      this.heroName = text(this, x, py - 18, '', 40, { color: CSS.gold });
      this.heroPerk = text(this, x, py + 22, '', 27, { color: CSS.soft, weight: '600', shadow: false });
      const ay = bottom - Math.min(HERO_H, bottom - areaTop - 6) / 2;
      this.heroLock = this.add.image(x, ay, 'icon_lock').setDisplaySize(120, 120).setDepth(2);
      for (const dir of [-1, 1]) {
        const b = new Button(this, x + dir * 410, ay, {
          w: 104,
          h: 104,
          shape: 'round',
          color: BUTTON.system,
          icon: 'icon_arrow',
          iconSize: 56,
          onClick: () => this.switchHero(dir),
        });
        b.iconImage?.setFlipX(dir < 0);
      }
      return;
    }
    const avail = areaBottom - areaTop;
    const shadow = this.add.ellipse(x, areaBottom - 14, 300, 46, 0x050a18, 0.35);
    const heroY = areaTop + avail * 0.48;
    shadow.setY(heroY + 104).setSize(220, 36);
    const hero = this.add.image(x, heroY, 'hero_0').setScale(1.9);
    this.tweens.add({ targets: hero, y: heroY - 16, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const slime = this.add.image(x - 270, heroY + 40, 'slime_0').setScale(1.5);
    const bat = this.add.image(x + 270, heroY - 30, 'bat_0').setScale(1.5).setFlipX(true);
    this.tweens.add({ targets: slime, scaleY: 1.3, duration: 400, yoyo: true, repeat: -1 });
    this.tweens.add({ targets: bat, y: heroY - 60, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    let frame = 0;
    this.time.addEvent({
      delay: 200,
      loop: true,
      callback: () => {
        frame ^= 1;
        bat.setTexture(`bat_${frame}`);
        slime.setTexture(`slime_${frame}`);
      },
    });
  }

  private mapCard(index: number, x: number, y: number): void {
    const save = saveStore.data;
    const map = MAPS[index];
    const locked = index >= save.unlockedMaps;
    const w = CARD_W;
    const h = CARD_H;
    const c = this.add.container(x, y);
    const bg = this.add.image(0, 0, '__DEFAULT');
    const tx = -w / 2 + 26 + THUMB / 2;
    const back = this.add.image(tx, 0, slotTexture(this, THUMB, 'weapon', 'back'));
    const tile = this.add.tileSprite(tx, 0, THUMB - 6, THUMB - 6, map.ground).setTileScale(0.5);
    const boss = BOSSES[map.boss];
    const bossImg = this.add.image(tx, 4, boss.texture);
    bossImg.setScale(Math.min((THUMB - 18) / bossImg.width, (THUMB - 14) / bossImg.height));
    const frame = this.add.image(tx, 0, slotTexture(this, THUMB, 'weapon', 'frame'));
    const left = tx + THUMB / 2 + 30;
    const name = text(this, left, -28, map.name, 46, { originX: 0 });
    const best = save.bestTimes[index];
    const info = locked
      ? `Defeat the ${BOSSES[MAPS[index - 1].boss].name} to unlock`
      : best > 0
        ? `Best time ${formatTime(best)}${save.bestHeat[index] > 0 ? `  ·  Heat ${save.bestHeat[index]} cleared` : save.bossKills[index] > 0 ? '  ·  Boss beaten' : ''}`
        : `Boss: ${boss.name} at 5:00`;
    const sub = text(this, left, 28, info, 30, { color: locked ? CSS.muted : CSS.soft, weight: '600', originX: 0, align: 'left', wrap: w / 2 - left - 110, shadow: false });
    c.add([bg, back, tile, bossImg, frame, name, sub]);
    if (locked) {
      tile.setTint(0x555a66);
      bossImg.setTint(0x000000).setAlpha(0.7);
      c.add(this.add.image(w / 2 - 70, -4, 'icon_lock').setDisplaySize(78, 78));
    }
    this.cards[index] = { bg, name, locked };
    c.setSize(w, h).setInteractive({ useHandCursor: true });
    // Once the map is cleared, a pill on the card picks Normal / Hard / Nightmare.
    const top = maxDifficulty(save.clears[index]);
    if (!locked && top > 0) {
      const pill = this.add.container(w / 2 - 130, 0);
      const pbg = this.add.image(0, 0, panelTexture(this, 210, 96, { style: 'inset', radius: 26 }));
      const pic = this.add.image(-66, 0, 'icon_skull').setDisplaySize(58, 58);
      const ptx = text(this, 20, 1, '', 30, { originX: 0.5 });
      const show = () => {
        const d = DIFFICULTIES[save.difficulty[index]];
        pic.setTexture(d.icon).setDisplaySize(58, 58);
        ptx.setText(d.name).setColor(d.color).setFontSize(d.name.length > 6 ? 24 : 30);
      };
      show();
      pill.add([pbg, pic, ptx]).setSize(210, 96).setInteractive({ useHandCursor: true });
      pill.on('pointerup', () => {
        save.difficulty[index] = (save.difficulty[index] + 1) % (top + 1);
        saveStore.save();
        audio.sfx('click');
        show();
        this.selected = index;
        this.highlight();
      });
      c.add(pill);
    }
    c.on('pointerup', () => {
      if (locked) {
        this.tweens.add({ targets: c, x: x + 14, duration: 50, yoyo: true, repeat: 3 });
        return;
      }
      audio.sfx('click');
      this.selected = index;
      this.highlight();
    });
  }

  private highlight(): void {
    this.cards.forEach((card, i) => {
      const selected = i === this.selected;
      const style = card.locked ? 'locked' : selected ? 'selected' : 'window';
      card.bg.setTexture(panelTexture(this, CARD_W, CARD_H, { style, radius: 24 }));
      card.name.setColor(card.locked ? '#a3a9b8' : selected ? CSS.gold : CSS.cream);
    });
  }

  private switchHero(dir: number): void {
    this.heroIndex = (this.heroIndex + dir + CHARACTERS.length) % CHARACTERS.length;
    const c = CHARACTERS[this.heroIndex];
    const save = saveStore.data;
    if (save.characters.includes(c.id)) {
      save.character = c.id;
      saveStore.save();
    }
    this.showHero(dir);
  }

  /** Shows the selected hero; a locked one is a dark silhouette with a padlock, and PLAY becomes "Unlock". */
  private showHero(dir = 0): void {
    if (!this.heroName) return;
    const c = CHARACTERS[this.heroIndex];
    const locked = !saveStore.data.characters.includes(c.id);
    const { x, top, bottom } = this.heroBox;
    this.heroImg?.destroy();
    const key = this.textures.exists(c.menu) ? c.menu : 'hero_menu';
    const img = (this.heroImg = this.add.image(x + dir * 120, bottom - 6, key).setOrigin(0.5, 1).setAlpha(dir ? 0 : 1));
    img.setScale(Math.min(HERO_H, bottom - top - 6) / img.height);
    if (locked) img.setTint(0x262a40);
    this.tweens.add({ targets: img, x, alpha: 1, duration: 220, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: img, y: img.y - 10, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.heroLock.setVisible(locked).setDepth(img.depth + 1);
    this.heroName.setText(c.name);
    this.heroPerk.setText(c.perk);
    if (locked) this.playButton.setLabel(`Unlock ${c.price}`).setColor(BUTTON.warning);
    else this.playButton.setLabel('PLAY').setColor(BUTTON.primary);
  }

  private play(): void {
    const c = CHARACTERS[this.heroIndex];
    const save = saveStore.data;
    if (save.characters.includes(c.id)) {
      save.character = c.id;
      saveStore.save();
      this.scene.start('Game', { map: this.selected });
      return;
    }
    if (save.gold < c.price) {
      this.tweens.add({ targets: this.playButton, x: this.playButton.x + 14, duration: 50, yoyo: true, repeat: 3 });
      this.heroPerk.setText(`Not enough gold: you need ${c.price}.`);
      return;
    }
    save.gold -= c.price;
    save.characters.push(c.id);
    save.character = c.id;
    saveStore.save();
    audio.sfx('victory');
    this.goldText.setText(String(save.gold));
    this.cameras.main.flash(250, 255, 244, 214);
    this.showHero();
  }
}

/** Shared animated meadow background for the menu and shop. */
export function menuBackground(scene: Phaser.Scene): void {
  const { width, height } = scene.scale;
  const bg = scene.add.tileSprite(0, 0, width, height, 'ground_meadow').setOrigin(0);
  scene.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, dt: number) => {
    bg.tilePositionX += dt * 0.02;
    bg.tilePositionY += dt * 0.012;
  });
  const shade = scene.add.graphics();
  const navy = 0x0b1430;
  shade.fillGradientStyle(navy, navy, navy, navy, 0.6, 0.6, 0.15, 0.15);
  shade.fillRect(0, 0, width, height * 0.45);
  shade.fillGradientStyle(navy, navy, navy, navy, 0.15, 0.15, 0.65, 0.65);
  shade.fillRect(0, height * 0.45, width, height * 0.55);
}
