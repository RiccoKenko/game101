import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { MAPS } from '../config/maps';
import { formatTime } from '../core/format';
import { saveStore } from '../core/save';
import { buildRows } from '../ui/build';
import { safeInsets } from '../ui/safe';
import { COLORS, CSS } from '../ui/theme';
import { Button, dimmer, panel, text } from '../ui/widgets';
import { type RunState } from './GameScene';

interface PauseData {
  run: RunState;
  onResume: () => void;
  onQuit: () => void;
}

export class PauseScene extends Phaser.Scene {
  private data_!: PauseData;

  constructor() {
    super('Pause');
  }

  init(data: PauseData): void {
    this.data_ = data;
  }

  create(): void {
    const { width, height } = this.scale;
    const { top, bottom } = safeInsets(this);
    const run = this.data_.run;
    dimmer(this, 0.72);
    const cy = top + (height - top - bottom) / 2;
    panel(this, width / 2, cy - 60, 900, 1180);
    text(this, width / 2, cy - 560, 'PAUSED', 96, { color: CSS.gold });
    text(this, width / 2, cy - 460, MAPS[run.mapIndex].name, 44, { color: CSS.dark, stroke: false });
    text(this, width / 2, cy - 395, `${formatTime(run.time)}   ·   Level ${run.level}   ·   ${run.kills} defeated`, 38, {
      color: '#5a4a6e',
      stroke: false,
      weight: '600',
    });
    const size = 84;
    const count = Math.max(run.inventory.weapons.length, run.inventory.passives.length, 1);
    const rowW = count * (size + 12) - 12;
    buildRows(this, width / 2 - rowW / 2, cy - 330, run.inventory, size, 12);

    new Button(this, width / 2, cy - 20, { w: 600, h: 140, color: COLORS.green, label: 'Resume', icon: 'icon_play', onClick: () => this.data_.onResume() });

    const music = new Button(this, width / 2 - 270, cy + 160, {
      w: 230,
      h: 130,
      color: COLORS.blue,
      icon: audio.musicOn ? 'icon_music' : 'icon_music_off',
      iconSize: 90,
      onClick: () => {
        audio.setMusicEnabled(this, !audio.musicOn);
        music.setIcon(audio.musicOn ? 'icon_music' : 'icon_music_off');
      },
    });
    const sfx = new Button(this, width / 2, cy + 160, {
      w: 230,
      h: 130,
      color: COLORS.blue,
      icon: audio.sfxOn ? 'icon_sfx' : 'icon_sfx_off',
      iconSize: 90,
      onClick: () => {
        audio.setSfxEnabled(!audio.sfxOn);
        sfx.setIcon(audio.sfxOn ? 'icon_sfx' : 'icon_sfx_off');
      },
    });
    const settings = saveStore.data.settings;
    const shakeLabel = () => (settings.shake ? 'Shake: On' : 'Shake: Off');
    const shake: Button = new Button(this, width / 2 + 270, cy + 160, {
      w: 230,
      h: 130,
      color: COLORS.blue,
      label: shakeLabel(),
      fontSize: 38,
      onClick: () => {
        settings.shake = !settings.shake;
        saveStore.save();
        shake.setLabel(shakeLabel());
      },
    });

    let armed = false;
    const quit: Button = new Button(this, width / 2, cy + 340, {
      w: 600,
      h: 120,
      color: COLORS.red,
      label: 'End Run',
      onClick: () => {
        if (armed) {
          this.data_.onQuit();
          return;
        }
        armed = true;
        quit.setLabel('Tap again to end');
        this.time.delayedCall(2500, () => {
          armed = false;
          quit.setLabel('End Run');
        });
      },
    });
    text(this, width / 2, cy + 450, 'Gold you collected is kept.', 32, { color: '#5a4a6e', stroke: false, weight: '600' });
  }
}
