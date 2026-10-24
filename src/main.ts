import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './style.css';
import Phaser from 'phaser';
import { DEFAULT_GAME_HEIGHT, GAME_WIDTH, MAX_GAME_HEIGHT, MIN_GAME_HEIGHT } from './config/game';
import { BootScene } from './scenes/BootScene';
import { ChestScene } from './scenes/ChestScene';
import { GameOverScene } from './scenes/GameOverScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { LevelUpScene } from './scenes/LevelUpScene';
import { MenuScene } from './scenes/MenuScene';
import { PauseScene } from './scenes/PauseScene';
import { QuestsScene } from './scenes/QuestsScene';
import { ShrineScene } from './scenes/ShrineScene';
import { ShopScene } from './scenes/ShopScene';

/** Game height follows the phone's aspect ratio so portrait screens are filled edge to edge. */
function gameHeight(): number {
  const w = window.innerWidth;
  const h = window.innerHeight;
  if (w <= 0 || h <= w) return DEFAULT_GAME_HEIGHT;
  return Math.round(Phaser.Math.Clamp((GAME_WIDTH * h) / w, MIN_GAME_HEIGHT, MAX_GAME_HEIGHT));
}

async function start(): Promise<void> {
  try {
    await Promise.all(['500', '600', '700'].map((w) => document.fonts.load(`${w} 40px Fredoka`)));
  } catch {
    // Fall back to the system font.
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#1d1630',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: gameHeight(),
    },
    input: { activePointers: 3 },
    render: { antialias: true, powerPreference: 'high-performance' },
    scene: [BootScene, MenuScene, ShopScene, QuestsScene, GameScene, HudScene, LevelUpScene, ChestScene, ShrineScene, PauseScene, GameOverScene],
  });
  (window as unknown as { __game: Phaser.Game }).__game = game;
}

start();
