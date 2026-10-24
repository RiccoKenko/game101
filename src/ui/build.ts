import Phaser from 'phaser';
import { EVOLUTIONS, PASSIVES, WEAPONS } from '../config/weapons';
import { type Inventory } from '../core/progression';
import { COLORS } from './theme';
import { text } from './widgets';

export function weaponIcon(w: Inventory['weapons'][number]): string {
  return w.evolved ? EVOLUTIONS[w.evolved].icon : WEAPONS[w.id].icon;
}

/**
 * Draws the player's weapons and passives as two rows of small icon tiles with level badges.
 * Returns a container positioned with its top-left at (x, y).
 */
export function buildRows(scene: Phaser.Scene, x: number, y: number, inv: Inventory, size = 64, gap = 10): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const rows: { icon: string; label: string; color: number }[][] = [
    inv.weapons.map((w) => ({ icon: weaponIcon(w), label: w.evolved ? '★' : String(w.level), color: w.evolved ? COLORS.gold : COLORS.blue })),
    inv.passives.map((p) => ({ icon: PASSIVES[p.id].icon, label: String(p.level), color: COLORS.purple })),
  ];
  rows.forEach((row, r) => {
    row.forEach((item, i) => {
      const cx = i * (size + gap) + size / 2;
      const cy = r * (size + gap + 6) + size / 2;
      const g = scene.add.graphics();
      g.fillStyle(COLORS.outline, 0.85);
      g.fillRoundedRect(cx - size / 2, cy - size / 2, size, size, 12);
      g.lineStyle(4, item.color, 1);
      g.strokeRoundedRect(cx - size / 2, cy - size / 2, size, size, 12);
      const img = scene.add.image(cx, cy, item.icon).setDisplaySize(size * 0.82, size * 0.82);
      const badge = text(scene, cx + size / 2 - 6, cy + size / 2 - 6, item.label, Math.round(size * 0.36));
      c.add([g, img, badge]);
    });
  });
  return c;
}
