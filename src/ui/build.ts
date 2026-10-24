import Phaser from 'phaser';
import { EVOLUTIONS, PASSIVES, RUNES, WEAPONS } from '../config/weapons';
import { type Inventory } from '../core/progression';
import { slotIcon, type SlotKind, text } from './widgets';

export function weaponIcon(w: Inventory['weapons'][number]): string {
  return w.evolved ? EVOLUTIONS[w.evolved].icon : WEAPONS[w.id].icon;
}

/**
 * Draws the player's weapons, then passives and runes, as two rows of gold-framed square slots with level badges.
 * Returns a container positioned with its top-left at (x, y).
 */
export function buildRows(scene: Phaser.Scene, x: number, y: number, inv: Inventory, size = 64, gap = 10): Phaser.GameObjects.Container {
  const c = scene.add.container(x, y);
  const rows: { icon: string; label: string; kind: SlotKind }[][] = [
    inv.weapons.map((w) => ({ icon: weaponIcon(w), label: w.evolved ? '★' : String(w.level), kind: w.evolved ? 'evolved' : 'weapon' })),
    [
      ...inv.passives.map((p) => ({ icon: PASSIVES[p.id].icon, label: String(p.level), kind: 'passive' as SlotKind })),
      ...inv.runes.map((r) => ({ icon: RUNES[r.id].icon, label: String(r.level), kind: 'rune' as SlotKind })),
    ],
  ];
  const badge = Math.round(size * 0.34);
  rows.forEach((row, r) => {
    row.forEach((item, i) => {
      const cx = i * (size + gap) + size / 2;
      const cy = r * (size + gap + 4) + size / 2;
      const lv = text(scene, cx + size / 2 - 4, cy + size / 2 - 4, item.label, badge, {
        color: item.kind === 'evolved' ? '#ffe28a' : '#ffffff',
        originX: 1,
        originY: 1,
        shadow: false,
      });
      c.add([...slotIcon(scene, cx, cy, size, item.icon, item.kind), lv]);
    });
  });
  return c;
}
