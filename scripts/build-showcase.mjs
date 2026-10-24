// Builds one page of the game (the character showcase, or the test battle) as ONE self-contained HTML fragment
// (JS, CSS, fonts, sprites, maps, sounds inlined) for a claude.ai artifact.
// Usage: node scripts/build-showcase.mjs <out.html> [index|play]
import { build } from 'vite';
import sharp from 'sharp';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = process.argv[2] ?? 'sky-pirates-cast.html';
const pageName = process.argv[3] ?? 'index';
const TITLES = { index: 'Sky Pirates Cast', play: 'Sky Pirates Chapter 1' };
const outDir = mkdtempSync(join(tmpdir(), 'showcase-'));
await build({
  configFile: false,
  base: './',
  logLevel: 'warn',
  build: {
    outDir,
    emptyOutDir: true,
    target: 'es2022',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    rollupOptions: { input: `${pageName}.html`, output: { inlineDynamicImports: true } },
  },
});
const assets = join(outDir, 'assets');
const files = readdirSync(assets);
const js = readFileSync(join(assets, files.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(assets, files.find((f) => f.endsWith('.css'))), 'utf8');
const b64 = (path) => readFileSync(path).toString('base64');
// Sprites keyed by the paths the game loads them from; JSON as objects, pictures as WebP data URLs (a fraction of
// the PNGs' size, so every character fits the artifact limit). The battle draws characters small, so its copy also
// halves them; the game sizes sprites from sprites.json, not from the picture, so a smaller picture just looks softer.
const SKIP = new Set(['master.png']);
const spriteScale = pageName === 'play' ? 0.5 : 1;
const spriteAssets = {};
for (const id of readdirSync('public/sprites')) {
  // Only the battle page has towers.
  if (id === 'towers' && pageName !== 'play') continue;
  for (const f of readdirSync(`public/sprites/${id}`)) {
    if (SKIP.has(f)) continue;
    const path = `public/sprites/${id}/${f}`;
    if (f.endsWith('.json')) {
      spriteAssets[`sprites/${id}/${f}`] = JSON.parse(readFileSync(path, 'utf8'));
      continue;
    }
    let img = sharp(path);
    if (spriteScale < 1) {
      const { width, height } = await img.metadata();
      img = img.resize(Math.max(1, Math.round(width * spriteScale)), Math.max(1, Math.round(height * spriteScale)));
    }
    const webp = await img.webp({ quality: 88, alphaQuality: 95, effort: 5 }).toBuffer();
    spriteAssets[`sprites/${id}/${f}`] = `data:image/webp;base64,${webp.toString('base64')}`;
  }
}
if (pageName === 'play')
  for (const f of readdirSync('public/maps')) spriteAssets[`maps/${f}`] = `data:image/${f.endsWith('.webp') ? 'webp' : 'png'};base64,${b64(`public/maps/${f}`)}`;
const sounds = Object.fromEntries(['shoot', 'hit', 'enemy_die', 'coin', 'explosion', 'click', 'zap', 'levelup', 'xp', 'boss_warning', 'chest'].map((n) => [n, b64(`public/audio/${n}.mp3`)]));

const page = `<title>${TITLES[pageName]}</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#bfe7ff">
<style>
${css}
</style>
<script>window.__ASSETS__=${JSON.stringify(spriteAssets)};window.__SOUNDS__=${JSON.stringify(sounds)};</script>
<script type="module">
${js}
</script>
`;
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);
