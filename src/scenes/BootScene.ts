import Phaser from 'phaser';
import { assetUrl, inlinedJson } from '../art/assets';
import manifest from '../art/manifest.json';
import { createTextures, heroAnimations, heroMetaKey, type HeroMeta } from '../art/textures';
import { audio, AUDIO_ENABLED, SFX_KEYS } from '../audio/audio';
import { CHARACTERS } from '../config/characters';
import { MAPS } from '../config/maps';
import { DEBUG } from '../core/debug';
import { COLORS } from '../ui/theme';

export class BootScene extends Phaser.Scene {
  private bar!: Phaser.GameObjects.Graphics;
  private progress = { files: 0, art: 0 };

  constructor() {
    super('Boot');
  }

  preload(): void {
    const { width, height } = this.scale;
    this.add
      .text(width / 2, height / 2 - 90, 'Little Archer', { fontFamily: 'Fredoka, sans-serif', fontSize: '72px', fontStyle: '700', color: '#ffcc33' })
      .setOrigin(0.5);
    this.bar = this.add.graphics();
    this.drawBar();
    if (AUDIO_ENABLED) {
      for (const key of SFX_KEYS) this.load.audio(key, `audio/${key}.mp3`);
      this.load.audio('music_menu', 'audio/music_menu.mp3');
    }
    // Painted art (public/art/); anything missing falls back to the SVG art drawn in code.
    for (const key of manifest.keys) this.load.image(key, assetUrl(`art/${key}.webp`));
    // Each playable hero: an animated sheet described by a JSON file, and a still for the menu.
    for (const c of CHARACTERS) {
      const key = heroMetaKey(c.sheet);
      this.load.image(c.menu, assetUrl(`art/hero/${c.menu}.webp`));
      const loadHero = (meta: HeroMeta) =>
        this.load.spritesheet(c.sheet, assetUrl(`art/hero/${c.sheet}.webp`), { frameWidth: meta.frameWidth, frameHeight: meta.frameHeight });
      const meta = inlinedJson<HeroMeta>(`art/hero/${c.sheet}.json`);
      if (meta) {
        this.cache.json.add(key, meta);
        loadHero(meta);
      } else {
        this.load.json(key, `art/hero/${c.sheet}.json`);
        this.load.once(`filecomplete-json-${key}`, (_key: string, _type: string, m: HeroMeta) => loadHero(m));
      }
    }
    this.load.on('progress', (p: number) => {
      this.progress.files = p;
      this.drawBar();
    });
    this.load.on('loaderror', (file: Phaser.Loader.File) => console.warn(`Could not load ${file.key}`));
  }

  private drawBar(): void {
    const { width, height } = this.scale;
    const p = (this.progress.files + this.progress.art) / 2;
    const w = 640;
    this.bar.clear();
    this.bar.fillStyle(COLORS.outline, 1);
    this.bar.fillRoundedRect(width / 2 - w / 2 - 6, height / 2 - 6, w + 12, 48, 24);
    this.bar.fillStyle(COLORS.gold, 1);
    this.bar.fillRoundedRect(width / 2 - w / 2, height / 2, Math.max(36, w * p), 36, 18);
  }

  create(): void {
    audio.init(this.game);
    createTextures(this, (p) => {
      this.progress.art = p;
      this.drawBar();
    }).then(() => {
      for (const c of CHARACTERS) heroAnimations(this, c.sheet);
      if (DEBUG.autostart) {
        this.scene.start('Game', { map: Phaser.Math.Clamp(DEBUG.map - 1, 0, MAPS.length - 1) });
      } else {
        this.scene.start('Menu');
      }
    });
  }
}
