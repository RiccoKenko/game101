// Balance bot: plays a level with a few build plans over several seeds and prints the crystals left.
//
//   npx tsx scripts/tools/balance_bot.mts [level|all] [easy|normal|hard|all] [maxTowers]
//
// The bot never moves the hero and never calls Talon or Mochi, so a real player has it easier. It builds the
// plan's towers in its spot order as soon as it can pay, then keeps upgrading its lowest tower (to level 3, or
// on to a specialisation with BRANCH=1). PICK=n picks that order card (default the first).
import { fileURLToPath } from 'node:url';
import { Battle } from '../../src/td/battle';
import { DIFFICULTIES, type Difficulty } from '../../src/td/difficulty';
import { LEVELS, type LevelDef } from '../../src/td/levels';
import type { TowerKind } from '../../src/td/units';
import { stars } from '../../src/td/vault';

/** Per level: the spots in the order the bot builds on them, and the kinds a sensible mixed defence puts there. */
export const SETUPS: Record<string, { order: number[]; mixed: TowerKind[] }> = {
  level1: { order: [5, 3, 1, 7, 4, 0, 2, 6], mixed: ['archer', 'cannon', 'archer', 'storm', 'frost', 'cannon', 'storm', 'archer'] },
  level2: { order: [4, 3, 2, 1, 5, 0, 6, 7, 8, 9], mixed: ['archer', 'cannon', 'storm', 'cannon', 'frost', 'archer', 'storm', 'archer', 'storm', 'archer'] },
  level3: { order: [2, 0, 3, 1, 4, 6, 5, 8, 9, 7], mixed: ['archer', 'cannon', 'storm', 'frost', 'cannon', 'storm', 'archer', 'archer', 'storm', 'archer'] },
};

export interface Plan {
  /** Tower kind for each spot in build order; null for the hero alone. */
  kinds: TowerKind[] | null;
  /** How many spots it uses (default all). */
  towers?: number;
  /** Highest level it upgrades to (default 3, or 4 with BRANCH=1). */
  maxLevel?: number;
}

export function plans(level: LevelDef): Record<string, Plan> {
  const { order, mixed } = SETUPS[level.id];
  const all = (k: TowerKind) => order.map(() => k);
  return {
    hero: { kinds: null },
    // Easy's lazy player: half the spots, upgraded once.
    lazy: { kinds: mixed, towers: Math.ceil(order.length / 2), maxLevel: 2 },
    mixed: { kinds: mixed },
    archers: { kinds: all('archer') },
    cannons: { kinds: all('cannon') },
    storms: { kinds: all('storm') },
  };
}

export const SEEDS = [1, 2, 3, 4, 5, 7];

export function play(level: LevelDef, plan: Plan, seed: number, difficulty: Difficulty = 'normal', maxTowers = 99) {
  const b = new Battle(level, seed, difficulty);
  const { order } = SETUPS[level.id];
  b.callWave();
  const waveLost: number[] = [];
  const escaped: Record<string, number> = {};
  let prev = b.vault.remaining;
  const slots = order.slice(0, Math.min(maxTowers, plan.towers ?? order.length));
  const top = plan.maxLevel ?? (process.env.BRANCH ? 4 : 3);
  for (let t = 0; t < 2400 && !b.over; t += 1 / 30) {
    if (b.choice) b.choose(Number(process.env.PICK ?? 0));
    if (plan.kinds) {
      const empty = slots.find((s) => !b.towers[s]);
      if (empty !== undefined) b.build(empty, plan.kinds[order.indexOf(empty)]);
      else {
        const low = slots.map((s) => b.towers[s]!).sort((x, y) => x.level - y.level)[0];
        if (low.level === 3 && top > 3) b.upgrade(low.slot, (low.slot % 2) as 0 | 1);
        else if (low.level < Math.min(top, 3)) b.upgrade(low.slot);
      }
    }
    b.step(1 / 30);
    for (const ev of b.drain()) if (ev.type === 'escape' && ev.lost) escaped[ev.enemy.kind] = (escaped[ev.enemy.kind] ?? 0) + 1;
    if (b.vault.remaining !== prev) {
      waveLost.push(b.waves.wave + 1);
      prev = b.vault.remaining;
    }
  }
  return {
    state: b.state, left: b.vault.remaining, stars: b.state === 'won' ? stars(b.vault.remaining, b.vault.total) : 0,
    waves: [...new Set(waveLost)].join(','), t: b.time.toFixed(0), gold: b.purse.gold, escaped, levels: b.towers.map((t) => t?.level ?? 0).join(''),
  };
}

function main() {
  const [which = 'all', diffArg = 'normal', towersArg] = process.argv.slice(2);
  const levels = which === 'all' ? Object.values(LEVELS) : [LEVELS[which]];
  if (!levels[0]) throw new Error(`No level "${which}" (try ${Object.keys(LEVELS).join(', ')} or all)`);
  const diffs: Difficulty[] = diffArg === 'all' ? DIFFICULTIES : [diffArg as Difficulty];
  const maxTowers = Number(towersArg ?? 99);
  const only = process.env.PLANS?.split(',');

  console.log('level   diff    plan     seeds (w/l + crystals left)   stars  lost in waves                  escaped (seed 1)  tower levels');
  for (const level of levels)
    for (const difficulty of diffs)
      for (const [name, plan] of Object.entries(plans(level))) {
        if (only && !only.includes(name)) continue;
        const rows = SEEDS.map((seed) => play(level, plan, seed, difficulty, maxTowers));
        const wins = rows.filter((r) => r.state === 'won').length;
        console.log(
          level.id.padEnd(7), difficulty.padEnd(7), name.padEnd(8),
          rows.map((r) => `${r.state[0]}${String(r.left).padStart(2)}`).join(' ').padEnd(29),
          `${wins}/6 ${rows.map((r) => r.stars || '-').join('')}`.padEnd(10),
          rows.map((r) => r.waves || '-').join('|').padEnd(30),
          JSON.stringify(rows[0].escaped).padEnd(17), rows[0].levels, `t${rows[0].t}`,
        );
      }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
