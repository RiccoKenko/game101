import type Phaser from 'phaser';
import { GEAR, RARITIES, type GearType } from '../config/gear';
import { rgba } from './theme';
import { roundRect, slotTexture, uiTexture } from './widgets';

/** A rounded square glowing in the rarity's colour, behind an equipment icon. */
export function rarityBack(scene: Phaser.Scene, size: number, rarity: number): string {
  const P = 8;
  return uiTexture(scene, `gear_back_${rarity}_${size}`, size + P * 2, size + P * 2, (ctx) => {
    const c = RARITIES[rarity].color;
    const r = Math.max(8, Math.round(size * 0.16));
    roundRect(ctx, P, P, size, size, r);
    const g = ctx.createRadialGradient(P + size * 0.45, P + size * 0.35, 2, P + size / 2, P + size / 2, size * 0.78);
    g.addColorStop(0, rgba(c, 0.95));
    g.addColorStop(0.55, rgba(c, 0.45));
    g.addColorStop(1, 'rgba(10,14,30,0.95)');
    ctx.fillStyle = '#0b1024';
    ctx.fill();
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineWidth = Math.max(3, size * 0.035);
    ctx.strokeStyle = rgba(c, 1);
    roundRect(ctx, P + 5, P + 5, size - 10, size - 10, Math.max(4, r - 5));
    ctx.stroke();
  });
}

/** An equipment tile: rarity glow, the item, the gold slot frame. `rarity` -1 draws an empty, dimmed slot. */
export function gearTile(scene: Phaser.Scene, x: number, y: number, size: number, type: GearType, rarity: number): Phaser.GameObjects.Image[] {
  const empty = rarity < 0;
  const back = scene.add.image(x, y, empty ? slotTexture(scene, size, 'weapon', 'back') : rarityBack(scene, size, rarity));
  const img = scene.add.image(x, y, GEAR[type].icon);
  img.setScale((size * 0.84) / Math.max(img.width, img.height));
  if (empty) img.setTint(0x2a3350).setAlpha(0.7);
  return [back, img, scene.add.image(x, y, slotTexture(scene, size, 'weapon', 'frame'))];
}
