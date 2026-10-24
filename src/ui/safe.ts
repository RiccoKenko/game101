import Phaser from 'phaser';

/** iPhone notch / home-indicator insets converted into game pixels. */
export function safeInsets(scene: Phaser.Scene): { top: number; bottom: number } {
  const probe = document.getElementById('safe-probe');
  const canvas = scene.game.canvas;
  if (!probe || !canvas) return { top: 0, bottom: 0 };
  const style = getComputedStyle(probe);
  const rect = canvas.getBoundingClientRect();
  if (rect.width === 0) return { top: 0, bottom: 0 };
  const scale = scene.scale.width / rect.width;
  const top = parseFloat(style.paddingTop) || 0;
  const bottom = parseFloat(style.paddingBottom) || 0;
  const overlapTop = Math.max(0, top - rect.top);
  const overlapBottom = Math.max(0, bottom - (window.innerHeight - rect.bottom));
  return { top: overlapTop * scale, bottom: overlapBottom * scale };
}
