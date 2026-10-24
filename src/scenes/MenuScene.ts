import Phaser from 'phaser';
import { audio, AUDIO_ENABLED, MUSIC_KEYS } from '../audio/audio';
import { BOSSES } from '../config/enemies';
import { MAPS } from '../config/maps';
import { DEBUG } from '../core/debug';
import { formatTime } from '../core/format';
import { saveStore } from '../core/save';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { Button, drawPanel, text } from '../ui/widgets';

export class MenuScene extends Phaser.Scene {
  private selected = 0;
  private cards: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super('Menu');
  }

  create(): void {
    const save = saveStore.data;
    if (DEBUG.gold >= 0) save.gold = DEBUG.gold;
    if (DEBUG.unlock) save.unlockedMaps = MAPS.length;
    this.selected = save.unlockedMaps - 1;

    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    menuBackground(this);

    // Title block.
    const title = text(this, width / 2, top + 200, 'Little Archer', 124, { color: CSS.gold });
    this.tweens.add({ targets: title, angle: { from: -1.5, to: 1.5 }, duration: 1600, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const sub = this.add.graphics();
    sub.fillStyle(COLORS.outline, 1);
    sub.fillRoundedRect(width / 2 - 300, top + 275, 600, 96, 48);
    sub.fillStyle(COLORS.red, 1);
    sub.fillRoundedRect(width / 2 - 292, top + 281, 584, 84, 42);
    text(this, width / 2, top + 323, 'MONSTER RUSH', 64);

    const heroY = top + 540;
    const hero = this.add.image(width / 2, heroY, 'hero_0').setScale(1.9);
    this.tweens.add({ targets: hero, y: heroY - 16, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    const slime = this.add.image(width / 2 - 270, heroY + 40, 'slime_0').setScale(1.5);
    const bat = this.add.image(width / 2 + 270, heroY - 30, 'bat_0').setScale(1.5).setFlipX(true);
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

    // Gold and sound toggles.
    this.add.image(width - 250, top + 50, 'icon_coin').setDisplaySize(64, 64);
    text(this, width - 205, top + 52, String(save.gold), 48, { color: CSS.gold, originX: 0 });
    const music = new Button(this, 80, top + 52, {
      w: 110,
      h: 90,
      color: COLORS.blue,
      icon: audio.musicOn ? 'icon_music' : 'icon_music_off',
      iconSize: 66,
      onClick: () => {
        audio.setMusicEnabled(this, !audio.musicOn);
        music.setIcon(audio.musicOn ? 'icon_music' : 'icon_music_off');
      },
    });
    const sfx = new Button(this, 210, top + 52, {
      w: 110,
      h: 90,
      color: COLORS.blue,
      icon: audio.sfxOn ? 'icon_sfx' : 'icon_sfx_off',
      iconSize: 66,
      onClick: () => {
        audio.setSfxEnabled(!audio.sfxOn);
        sfx.setIcon(audio.sfxOn ? 'icon_sfx' : 'icon_sfx_off');
      },
    });

    // Map cards, centred between the hero and the buttons.
    const playY = height - bottom - 300;
    const cardH = 200;
    const gap = 34;
    const blockH = 70 + MAPS.length * cardH + (MAPS.length - 1) * gap;
    const areaTop = heroY + 140;
    const blockTop = areaTop + Math.max(0, (playY - 110 - areaTop - blockH) / 2);
    text(this, width / 2, blockTop + 20, 'Choose your adventure', 48);
    this.cards = [];
    MAPS.forEach((map, i) => {
      const y = blockTop + 70 + cardH / 2 + i * (cardH + gap);
      this.mapCard(map.index, width / 2, y, 940, cardH);
    });
    this.highlight();

    new Button(this, width / 2, playY, { w: 640, h: 150, color: COLORS.green, label: 'PLAY', fontSize: 76, onClick: () => this.play() });
    new Button(this, width / 2, height - bottom - 120, {
      w: 640,
      h: 110,
      color: COLORS.orange,
      label: 'Upgrade Shop',
      icon: 'icon_shop',
      iconSize: 80,
      fontSize: 46,
      onClick: () => this.scene.start('Shop'),
    });

    audio.playMusic(this, 'music_menu');
    // Warm up map music in the background so a run starts with its track.
    if (AUDIO_ENABLED) {
      for (const key of MUSIC_KEYS) if (key !== 'music_menu' && !this.cache.audio.exists(key)) this.load.audio(key, `audio/${key}.mp3`);
      this.load.start();
    }
  }

  private mapCard(index: number, x: number, y: number, w: number, h: number): void {
    const save = saveStore.data;
    const map = MAPS[index];
    const locked = index >= save.unlockedMaps;
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    this.cards[index] = g;
    const tile = this.add.tileSprite(-w / 2 + 110, 0, 180, h - 40, map.ground).setTileScale(0.5);
    const frame = this.add.graphics();
    frame.lineStyle(6, COLORS.outline, 1);
    frame.strokeRoundedRect(-w / 2 + 20, -h / 2 + 20, 180, h - 40, 18);
    const boss = BOSSES[map.boss];
    const bossImg = this.add.image(-w / 2 + 110, 6, boss.texture);
    bossImg.setScale(Math.min(150 / bossImg.width, (h - 50) / bossImg.height));
    const name = text(this, -w / 2 + 240, -42, map.name, 52, { color: CSS.dark, stroke: false, originX: 0 });
    const best = save.bestTimes[index];
    const info = locked
      ? `Defeat the ${BOSSES[MAPS[index - 1].boss].name} to unlock`
      : best > 0
        ? `Best time ${formatTime(best)}${save.bossKills[index] > 0 ? '  ·  Boss beaten' : ''}`
        : `Boss: ${boss.name} at 5:00`;
    const sub = text(this, -w / 2 + 240, 30, info, 34, { color: '#5a4a6e', stroke: false, weight: '600', originX: 0, align: 'left', wrap: w - 280 });
    c.add([g, tile, frame, bossImg, name, sub]);
    if (locked) {
      const shade = this.add.graphics();
      shade.fillStyle(COLORS.outline, 0.45);
      shade.fillRoundedRect(-w / 2, -h / 2, w, h, 28);
      const lock = this.add.image(w / 2 - 80, -10, 'icon_lock').setDisplaySize(90, 90);
      bossImg.setTint(0x000000).setAlpha(0.7);
      c.add([shade, lock]);
    }
    c.setSize(w, h).setInteractive({ useHandCursor: true });
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
    const w = 940;
    const h = 200;
    this.cards.forEach((g, i) => {
      g.clear();
      const selected = i === this.selected;
      if (selected) {
        g.fillStyle(COLORS.gold, 1);
        g.fillRoundedRect(-w / 2 - 16, -h / 2 - 16, w + 32, h + 42, 40);
      }
      drawPanel(g, -w / 2, -h / 2, w, h, selected ? 0xfffbe8 : COLORS.cream, 28);
    });
  }

  private play(): void {
    this.scene.start('Game', { map: this.selected });
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
  shade.fillGradientStyle(0x1d1630, 0x1d1630, 0x1d1630, 0x1d1630, 0.55, 0.55, 0.2, 0.2);
  shade.fillRect(0, 0, width, height * 0.5);
  shade.fillGradientStyle(0x1d1630, 0x1d1630, 0x1d1630, 0x1d1630, 0.2, 0.2, 0.6, 0.6);
  shade.fillRect(0, height * 0.5, width, height * 0.5);
}
