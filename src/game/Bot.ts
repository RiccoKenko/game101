import { type GameCtx } from './context';

/** A melee autopilot closes in until a monster is this near (past its edge), and backs off inside the second. */
const MELEE_REACH = 110;
const MELEE_TOO_CLOSE = 45;

/**
 * Test autopilot (?bot): plays like a cautious casual player — dodges crowds and walks over loot. A melee hero walks
 * up to the nearest monster instead of keeping away, and only backs off when one is right on top of it.
 */
export function botSteer(ctx: GameCtx, t: number, melee = false): { x: number; y: number } {
  const { player, enemies, pickups } = ctx;
  let rx = 0;
  let ry = 0;
  let nearest = Infinity;
  let target: { x: number; y: number } | null = null;
  for (const e of enemies.alive) {
    if (!e.active) continue;
    const dx = player.x - e.x;
    const dy = player.y - e.y;
    const d = Math.hypot(dx, dy) - e.radius;
    const range = e.isBoss ? 650 : 380;
    if (d > range) continue;
    if (d < nearest) {
      nearest = d;
      target = e;
    }
    const w = (e.isBoss ? 3 : 1) / Math.max(30, d) ** 2;
    rx += dx * w;
    ry += dy * w;
  }
  const danger = Math.hypot(rx, ry);
  // Slow circular drift so the bot doesn't stand still.
  let x = Math.cos(t * 0.35) * 0.25;
  let y = Math.sin(t * 0.35) * 0.25;
  const fleeWeight = melee ? (nearest < MELEE_TOO_CLOSE ? 1.2 : 0.2) : nearest < 200 ? 1.4 : 0.5;
  if (danger > 0) {
    x += (rx / danger) * fleeWeight;
    y += (ry / danger) * fleeWeight;
  }
  if (melee && target && nearest > MELEE_REACH) {
    const dx = target.x - player.x;
    const dy = target.y - player.y;
    const d = Math.hypot(dx, dy) || 1;
    x += dx / d;
    y += dy / d;
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
