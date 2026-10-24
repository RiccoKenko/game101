// Measures how far the painted road and stone spots sit from the level data.
import { readFileSync } from 'node:fs';
import { LEVELS } from '../../src/td/levels';
import { Path } from '../../src/td/path';
const raw = readFileSync(process.argv[2]);
const LEVEL = LEVELS[process.argv[3] ?? 'level1'];
const W = 1536, H = 1024, C = 3;
const px = (x: number, y: number) => { const i = (Math.round(y) * W + Math.round(x)) * C; return [raw[i], raw[i + 1], raw[i + 2]]; };
// Road: warm tan / beige (red > green > blue, not green-dominant).
const isRoad = (x: number, y: number) => { const [r, g, b] = px(x, y); return r > 150 && r > g + 8 && g > b + 15 && r - b > 50 && g > 110; };
const road = new Path(LEVEL.route);
const out: string[] = [];
let sum = 0, n = 0, widths: number[] = [];
for (let d = 60; d < road.length - 60; d += 40) {
  const [x, y] = road.at(d);
  const [dx, dy] = road.dirAt(d);
  const nx = -dy, ny = dx;
  let lo = 0, hi = 0;
  for (let s = 0; s < 80 && isRoad(x + nx * -s, y + ny * -s); s++) lo = s;
  for (let s = 0; s < 80 && isRoad(x + nx * s, y + ny * s); s++) hi = s;
  const off = (hi - lo) / 2;
  widths.push(lo + hi);
  sum += Math.abs(off); n++;
  out.push(`d=${d.toFixed(0)} (${x.toFixed(0)},${y.toFixed(0)}) width=${lo + hi} offset=${off.toFixed(1)}`);
}
console.log(out.join('\n'));
console.log('mean |offset|', (sum / n).toFixed(1), 'median width', widths.sort((a, b) => a - b)[widths.length >> 1]);
// Stone spots: grey (low saturation, mid brightness) pixels near each slot; centroid.
const isStone = (x: number, y: number) => { const [r, g, b] = px(x, y); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return mx - mn < 40 && mx > 120 && mx < 235; };
for (const [i, [sx, sy]] of LEVEL.slots.entries()) {
  let cx = 0, cy = 0, k = 0, minX = 1e9, maxX = -1e9, minY = 1e9, maxY = -1e9;
  for (let y = sy - 80; y <= sy + 80; y++) for (let x = sx - 80; x <= sx + 80; x++) if (Math.hypot(x - sx, y - sy) < 75 && isStone(x, y)) { cx += x; cy += y; k++; minX = Math.min(minX, x); maxX = Math.max(maxX, x); minY = Math.min(minY, y); maxY = Math.max(maxY, y); }
  console.log(`slot ${i} data (${sx},${sy}) painted centre (${(cx / k).toFixed(0)},${(cy / k).toFixed(0)}) box ${maxX - minX}x${maxY - minY}`);
}
