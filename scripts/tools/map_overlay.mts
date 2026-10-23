// Draws the level's road, spots, dock, vault, hero start and island outline over the painted map.
import sharp from 'sharp';
import { LEVEL1 } from '../../src/td/levels';
import { closedCurve, Path } from '../../src/td/path';
const [mapFile, out] = process.argv.slice(2);
const L = LEVEL1;
const road = new Path(L.route);
const pts = road.points.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const island = closedCurve(L.island).map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L.map.w}" height="${L.map.h}">
<polyline points="${pts}" fill="none" stroke="rgba(255,0,0,0.35)" stroke-width="${L.roadWidth}" stroke-linejoin="round"/>
<polyline points="${pts}" fill="none" stroke="red" stroke-width="3"/>
${L.route.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="6" fill="yellow" stroke="black"/>`).join('')}
${L.slots.map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${L.slotRadius}" fill="none" stroke="magenta" stroke-width="4"/><text x="${x}" y="${y + 8}" font-size="26" text-anchor="middle" fill="magenta" font-family="sans-serif" font-weight="bold">${i}</text>`).join('')}
<polygon points="${island}" fill="none" stroke="blue" stroke-width="3" stroke-dasharray="10 6"/>
<circle cx="${L.dock[0]}" cy="${L.dock[1]}" r="12" fill="orange" stroke="black" stroke-width="3"/>
<circle cx="${L.vault[0]}" cy="${L.vault[1]}" r="12" fill="cyan" stroke="black" stroke-width="3"/>
<circle cx="${L.heroStart[0]}" cy="${L.heroStart[1]}" r="12" fill="lime" stroke="black" stroke-width="3"/>
</svg>`;
await sharp(mapFile).resize(L.map.w, L.map.h).composite([{ input: Buffer.from(svg) }]).png().toFile(out);
console.log('wrote', out);
