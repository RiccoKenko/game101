import { type GameCtx } from './context';

/** Test autopilot (?bot): plays like a cautious casual player — dodges crowds and walks over loot. */
export function botSteer(ctx: GameCtx, t: number): { x: number; y: number } {
  const { player, enemies, pickups } = ctx;
  let rx = 0;
  let ry = 0;
  let nearest = Infinity;
  for (const e of enemies.alive) {
    if (!e.active) continue;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) - e.radius;
    const range = e.isBoss ? 650 : 380;
    if (d > range) continue;
    nearest = Math.min(nearest, d);
    const w = (e.isBoss ? 3 : 1) / Math.max(30, d) ** 2;
    rx += dx * w;
    ry += dy * w;
  }
  const danger = Math.hypot(rx, ry);
  // Slow circular drift so the bot doesn't stand still.
  let x = Math.cos(t * 0.35) * 0.25;
  let y = Math.sin(t * 0.35) * 0.25;
  const fleeWeight = nearest < 200 ? 1.4 : 0.5;
  if (danger > 0) {
    x += (rx / danger) * fleeWeight;
    y += (ry / danger) * fleeWeight;
  }
  const loot = pickups.chestOnGround ?? pickups.nearestLoot(player.x, player.y, 700);
  if (loot) {
    const dx = loot.x - player.x;
    const dy = loot.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    const w = nearest < 200 ? 0.35 : 1;
    x += (dx / d) * w;
    y += (dy / d) * w;
  }
  const len = Math.hypot(x, y) || 1;
  return { x: x / len, y: y / len };
}
