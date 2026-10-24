import Phaser from 'phaser';
import { FONT } from '../ui/theme';
import { CHARACTERS_ART } from './characters';
import { ENVIRONMENT_ART } from './environment';
import { ICONS_ART } from './icons';
import { ITEMS_ART } from './items';
import { type ArtDef } from './types';

export const ALL_ART: Record<string, ArtDef> = { ...CHARACTERS_ART, ...ITEMS_ART, ...ICONS_ART, ...ENVIRONMENT_ART };

/** Every texture key gameplay code uses, with a fallback size if the art is missing. */
const REQUIRED: Record<string, [number, number]> = {};
const need = (keys: string[], w: number, h = w) => keys.forEach((k) => (REQUIRED[k] = [w, h]));
need(['hero_0', 'hero_1'], 100, 116);
for (const e of ['slime', 'bat', 'mushroom', 'skeleton', 'ghost', 'zombie', 'imp', 'knight', 'gargoyle']) need([`${e}_0`, `${e}_1`], 90, 100);
need(['boss_slime', 'boss_lich', 'boss_demon'], 280);
need(['fireball', 'orb', 'gem_s', 'gem_m', 'gem_l', 'coin', 'meat', 'magnet', 'bomb', 'spark'], 40);
need(['arrow', 'arrow_storm', 'dagger', 'dagger_gold'], 64, 20);
need(['axe', 'boomerang', 'chest'], 68);
need(['axe_titan'], 104);
need(['aura', 'aura_holy', 'ground_meadow', 'ground_graveyard', 'ground_castle'], 256);
need(['explosion'], 220);
need(['bolt'], 72, 300);
need(['tree', 'bush', 'rock', 'flowers', 'grave', 'grave_cross', 'dead_tree', 'bones', 'pillar', 'pillar_broken', 'brazier', 'rubble'], 80);
need(
  [
    'icon_bow', 'icon_daggers', 'icon_axes', 'icon_aura', 'icon_lightning', 'icon_bomb', 'icon_boomerang',
    'icon_stormbow', 'icon_blades', 'icon_titanaxes', 'icon_sanctuary', 'icon_heart', 'icon_boots',
    'icon_powergem', 'icon_hourglass', 'icon_quiver', 'icon_magnet', 'icon_tome', 'icon_might', 'icon_armor',
    'icon_greed', 'icon_growth', 'icon_revival', 'icon_pause', 'icon_play', 'icon_music', 'icon_music_off',
    'icon_sfx', 'icon_sfx_off', 'icon_lock', 'icon_skull', 'icon_clock', 'icon_coin', 'icon_shop', 'icon_home', 'icon_retry',
  ],
  96,
);

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('svg failed'));
    img.src = src;
  });
}

async function rasterize(scene: Phaser.Scene, key: string, art: ArtDef): Promise<void> {
  const img = await loadImage('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(art.svg));
  const canvas = document.createElement('canvas');
  canvas.width = art.w;
  canvas.height = art.h;
  canvas.getContext('2d')!.drawImage(img, 0, 0, art.w, art.h);
  scene.textures.addCanvas(key, canvas);
}

function canvasTexture(scene: Phaser.Scene, key: string, w: number, h: number, draw: (ctx: CanvasRenderingContext2D) => void): void {
  if (scene.textures.exists(key)) return;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  draw(canvas.getContext('2d')!);
  scene.textures.addCanvas(key, canvas);
}

function placeholder(scene: Phaser.Scene, key: string, w: number, h: number): void {
  canvasTexture(scene, key, w, h, (ctx) => {
    ctx.fillStyle = '#ff3fd0';
    ctx.strokeStyle = '#2a1f3d';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.ellipse(w / 2, h / 2, w / 2 - 4, h / 2 - 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
}

/** Builds the digit font used for floating damage numbers. */
function damageFont(scene: Phaser.Scene): void {
  const cw = 44;
  const ch = 56;
  const chars = '0123456789';
  canvasTexture(scene, 'dmgfont', cw * chars.length, ch, (ctx) => {
    ctx.font = `700 46px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 9;
    ctx.strokeStyle = '#2a1f3d';
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < chars.length; i++) {
      ctx.strokeText(chars[i], cw * i + cw / 2, ch / 2 + 2);
      ctx.fillText(chars[i], cw * i + cw / 2, ch / 2 + 2);
    }
  });
  // In Phaser 3.90 Parse() already returns the full cache entry ({ data, frame, texture }).
  const entry = Phaser.GameObjects.RetroFont.Parse(scene, {
    image: 'dmgfont',
    width: cw,
    height: ch,
    chars,
    charsPerRow: chars.length,
    'offset.x': 0,
    'offset.y': 0,
    'spacing.x': 0,
    'spacing.y': 0,
    lineSpacing: 0,
  });
  scene.cache.bitmapFont.add('dmg', entry);
}

function generated(scene: Phaser.Scene): void {
  canvasTexture(scene, 'shadow', 96, 32, (ctx) => {
    ctx.fillStyle = 'rgba(20, 10, 40, 0.28)';
    ctx.beginPath();
    ctx.ellipse(48, 16, 46, 14, 0, 0, Math.PI * 2);
    ctx.fill();
  });
  canvasTexture(scene, 'puff', 48, 48, (ctx) => {
    const g = ctx.createRadialGradient(24, 24, 2, 24, 24, 23);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.6, 'rgba(255,255,255,0.7)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 48, 48);
  });
  canvasTexture(scene, 'joy_base', 260, 260, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    ctx.strokeStyle = 'rgba(255,255,255,0.75)';
    ctx.lineWidth = 8;
    ctx.beginPath();
    ctx.arc(130, 130, 120, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  canvasTexture(scene, 'joy_knob', 120, 120, (ctx) => {
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.strokeStyle = 'rgba(42,31,61,0.8)';
    ctx.lineWidth = 6;
    ctx.beginPath();
    ctx.arc(60, 60, 52, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  });
  canvasTexture(scene, 'ring', 128, 128, (ctx) => {
    ctx.strokeStyle = 'rgba(255,255,255,1)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(64, 64, 56, 0, Math.PI * 2);
    ctx.stroke();
  });
  canvasTexture(scene, 'px', 4, 4, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.fillRect(0, 0, 4, 4);
  });
  effectTextures(scene);
  damageFont(scene);
}

/** Soft shapes the effects tint and stretch: glows, motion streaks, sparkles, ground marks, petals. */
function effectTextures(scene: Phaser.Scene): void {
  canvasTexture(scene, 'glow', 64, 64, (ctx) => {
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(0.35, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 64, 64);
  });
  // A motion streak: fades in from the tail (left) to a bright head (right).
  canvasTexture(scene, 'streak', 128, 16, (ctx) => {
    const g = ctx.createLinearGradient(0, 0, 128, 0);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.75, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(0, 8);
    ctx.quadraticCurveTo(64, 1, 120, 2);
    ctx.arc(120, 8, 6, -Math.PI / 2, Math.PI / 2);
    ctx.quadraticCurveTo(64, 15, 0, 8);
    ctx.fill();
  });
  canvasTexture(scene, 'star', 48, 48, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
      const r = i % 2 ? 6 : 23;
      ctx.lineTo(24 + Math.cos(a) * r, 24 + Math.sin(a) * r);
    }
    ctx.closePath();
    ctx.fill();
  });
  // Ground marks are drawn flattened, as if seen from above at an angle.
  canvasTexture(scene, 'scorch', 128, 64, (ctx) => {
    const g = ctx.createRadialGradient(64, 32, 2, 64, 32, 62);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.save();
    ctx.scale(1, 0.5);
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  canvasTexture(scene, 'splat', 96, 48, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(48, 24, 30, 13, 0, 0, Math.PI * 2);
    ctx.fill();
    for (let i = 0; i < 7; i++) {
      const a = (i / 7) * Math.PI * 2 + 0.4;
      ctx.beginPath();
      ctx.ellipse(48 + Math.cos(a) * 34, 24 + Math.sin(a) * 15, 6 + (i % 3) * 2, 4 + (i % 2) * 2, a, 0, Math.PI * 2);
      ctx.fill();
    }
  });
  canvasTexture(scene, 'shock', 128, 128, (ctx) => {
    const g = ctx.createRadialGradient(64, 64, 34, 64, 64, 62);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.7, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, 128, 128);
  });
  canvasTexture(scene, 'petal', 22, 14, (ctx) => {
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(11, 7, 10, 5, 0.3, 0, Math.PI * 2);
    ctx.fill();
  });
  // Light rays turning slowly behind a treasure chest.
  canvasTexture(scene, 'rays', 256, 256, (ctx) => {
    const g = ctx.createRadialGradient(128, 128, 10, 128, 128, 128);
    g.addColorStop(0, 'rgba(255,255,255,0.9)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(128, 128);
      ctx.arc(128, 128, 128, a - 0.13, a + 0.13);
      ctx.closePath();
      ctx.fill();
    }
  });
}

/** Rasterizes all SVG art into textures, generating placeholders for anything missing. */
export async function createTextures(scene: Phaser.Scene, onProgress?: (p: number) => void): Promise<void> {
  const entries = Object.entries(ALL_ART);
  let done = 0;
  await Promise.all(
    entries.map(async ([key, art]) => {
      try {
        await rasterize(scene, key, art);
      } catch {
        console.warn(`Art "${key}" failed to render`);
      }
      onProgress?.(++done / entries.length);
    }),
  );
  for (const [key, [w, h]] of Object.entries(REQUIRED)) {
    if (!scene.textures.exists(key)) placeholder(scene, key, w, h);
  }
  generated(scene);
}
