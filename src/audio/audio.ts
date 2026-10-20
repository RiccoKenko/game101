import Phaser from 'phaser';
import { saveStore } from '../core/save';

export const SFX_KEYS = [
  'shoot', 'hit', 'enemy_die', 'xp', 'coin', 'levelup', 'hurt', 'explosion', 'zap',
  'heal', 'chest', 'boss_warning', 'click', 'gameover', 'victory',
] as const;
export type SfxKey = (typeof SFX_KEYS)[number];

export const MUSIC_KEYS = ['music_menu', 'music_meadow', 'music_graveyard', 'music_castle'] as const;
export type MusicKey = (typeof MUSIC_KEYS)[number];

/** Default volume and minimum gap (ms) between plays, so rapid-fire sounds don't stack up. */
const SFX_TUNING: Record<SfxKey, { volume: number; gap: number }> = {
  shoot: { volume: 0.22, gap: 90 },
  hit: { volume: 0.25, gap: 60 },
  enemy_die: { volume: 0.32, gap: 55 },
  xp: { volume: 0.22, gap: 45 },
  coin: { volume: 0.35, gap: 60 },
  levelup: { volume: 0.6, gap: 200 },
  hurt: { volume: 0.5, gap: 150 },
  explosion: { volume: 0.45, gap: 90 },
  zap: { volume: 0.35, gap: 80 },
  heal: { volume: 0.5, gap: 100 },
  chest: { volume: 0.6, gap: 200 },
  boss_warning: { volume: 0.7, gap: 500 },
  click: { volume: 0.5, gap: 50 },
  gameover: { volume: 0.6, gap: 500 },
  victory: { volume: 0.6, gap: 500 },
};

const MUSIC_VOLUME = 0.42;

class AudioManager {
  private game?: Phaser.Game;
  private last = new Map<string, number>();
  private music?: Phaser.Sound.BaseSound;
  private musicKey?: MusicKey;
  private wantedMusic?: MusicKey;

  init(game: Phaser.Game): void {
    this.game = game;
    // Phones pause audio when the tab is hidden; Phaser resumes it on return.
    game.sound.pauseOnBlur = true;
  }

  get sfxOn(): boolean {
    return saveStore.data.settings.sfx;
  }

  get musicOn(): boolean {
    return saveStore.data.settings.music;
  }

  sfx(key: SfxKey, volumeScale = 1): void {
    const game = this.game;
    if (!game || !this.sfxOn || !game.cache.audio.exists(key)) return;
    const now = performance.now();
    const tuning = SFX_TUNING[key];
    if (now - (this.last.get(key) ?? 0) < tuning.gap) return;
    this.last.set(key, now);
    try {
      game.sound.play(key, { volume: tuning.volume * volumeScale, detune: Phaser.Math.Between(-80, 80) });
    } catch {
      // Audio can fail before the first user gesture on iOS; ignore.
    }
  }

  /** Plays a looping track, loading it first if needed (map tracks are loaded on demand). */
  playMusic(scene: Phaser.Scene, key: MusicKey): void {
    this.wantedMusic = key;
    if (this.musicKey === key && this.music?.isPlaying) return;
    this.stopMusic();
    this.wantedMusic = key;
    if (!this.musicOn) return;
    if (scene.cache.audio.exists(key)) {
      this.startMusic(key);
      return;
    }
    scene.load.audio(key, `audio/${key}.mp3`);
    scene.load.once(`filecomplete-audio-${key}`, () => {
      if (this.wantedMusic === key && this.musicOn && !this.music) this.startMusic(key);
    });
    scene.load.start();
  }

  private startMusic(key: MusicKey): void {
    if (!this.game) return;
    this.music = this.game.sound.add(key, { loop: true, volume: MUSIC_VOLUME });
    this.musicKey = key;
    this.music.play();
  }

  stopMusic(): void {
    this.music?.stop();
    this.music?.destroy();
    this.music = undefined;
    this.musicKey = undefined;
  }

  setMusicEnabled(scene: Phaser.Scene, on: boolean): void {
    saveStore.data.settings.music = on;
    saveStore.save();
    if (!on) {
      const wanted = this.wantedMusic;
      this.stopMusic();
      this.wantedMusic = wanted;
    } else if (this.wantedMusic) {
      this.playMusic(scene, this.wantedMusic);
    }
  }

  setSfxEnabled(on: boolean): void {
    saveStore.data.settings.sfx = on;
    saveStore.save();
  }

  /** Lowers music while a menu is open over gameplay. */
  duck(on: boolean): void {
    const m = this.music as Phaser.Sound.WebAudioSound | undefined;
    if (m && 'setVolume' in m) m.setVolume(on ? MUSIC_VOLUME * 0.45 : MUSIC_VOLUME);
  }
}

export const audio = new AudioManager();
