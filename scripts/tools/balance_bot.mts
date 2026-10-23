// Balance bot: plays level 1 with a few build plans over several seeds and prints crystals left.
import { Battle } from '../../src/td/battle';
import { LEVEL1, type LevelDef } from '../../src/td/levels';
import type { TowerKind } from '../../src/td/units';

const ORDER = [5, 3, 1, 7, 4, 0, 2, 6];
type Plan = Partial<Record<number, TowerKind>>;
const PLANS: Record<string, Plan | null> = {
  hero: null,
  archers: Object.fromEntries(ORDER.map((s) => [s, 'archer'])),
  mixed: { 5: 'archer', 3: 'cannon', 1: 'archer', 7: 'storm', 4: 'frost', 0: 'cannon', 2: 'storm', 6: 'archer' },
  noStorm: { 5: 'archer', 3: 'cannon', 1: 'archer', 7: 'cannon', 4: 'frost', 0: 'cannon', 2: 'archer', 6: 'archer' },
  cannons: Object.fromEntries(ORDER.map((s) => [s, 'cannon'])),
  storms: Object.fromEntries(ORDER.map((s) => [s, 'storm'])),
};
const maxTowers = Number(process.argv[2] ?? 8);

function play(level: LevelDef, plan: Plan | null, seed: number) {
  const b = new Battle(level, seed);
  b.callWave();
  let waveLost: number[] = [];
  const escaped: Record<string, number> = {};
  let prev = b.vault.remaining;
  for (let t = 0; t < 1500 && !b.over; t += 1 / 30) {
    if (b.choice) b.choose(Number(process.env.PICK ?? 0));
    if (plan) {
      const slots = ORDER.slice(0, maxTowers);
      const empty = slots.find((s) => !b.towers[s]);
      if (empty !== undefined) b.build(empty, plan[empty]!);
      else {
        const low = slots.map((s) => b.towers[s]!).sort((x, y) => x.level - y.level)[0];
        if (low.level === 3) { if (process.env.BRANCH) b.upgrade(low.slot, (low.slot % 2) as 0 | 1); }
        else b.upgrade(low.slot);
      }
    }
    b.step(1 / 30);
    for (const ev of b.drain()) if (ev.type === 'escape' && ev.lost) escaped[ev.enemy.kind] = (escaped[ev.enemy.kind] ?? 0) + 1;
    if (b.vault.remaining !== prev) {
      waveLost.push(b.waves.wave + 1);
      prev = b.vault.remaining;
    }
  }
  return { state: b.state, left: b.vault.remaining, waves: [...new Set(waveLost)].join(','), t: b.time.toFixed(0), gold: b.purse.gold, escaped, levels: b.towers.map((t) => t?.level ?? 0).join('') };
}

for (const [name, plan] of Object.entries(PLANS)) {
  const rows = [1, 2, 3, 4, 5, 7].map((seed) => play(LEVEL1, plan, seed));
  console.log(name.padEnd(8), rows.map((r) => `${r.state[0]}${String(r.left).padStart(2)}`).join(' '), ' lost in waves', rows.map((r) => r.waves || '-').join(' | '), ' t', rows[0].t, 'gold', rows[0].gold, JSON.stringify(rows[0].escaped), rows[0].levels);
}
