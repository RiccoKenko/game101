// Builds one page of the game (the character showcase, or the test battle) as ONE self-contained HTML fragment
// (JS, CSS, fonts, sprites, maps, sounds inlined) for a claude.ai artifact.
// Usage: node scripts/build-showcase.mjs <out.html> [index|play]
import { build } from 'vite';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = process.argv[2] ?? 'sky-pirates-cast.html';
const pageName = process.argv[3] ?? 'index';
const TITLES = { index: 'Sky Pirates Cast', play: 'Sky Pirates Test Battle' };
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
// Sprites keyed by the paths the game loads them from; PNGs as data URLs, JSON as objects.
const SKIP = new Set(['master.png']);
const spriteAssets = {};
for (const id of readdirSync('public/sprites'))
  for (const f of readdirSync(`public/sprites/${id}`)) {
    if (SKIP.has(f)) continue;
    const path = `public/sprites/${id}/${f}`;
    spriteAssets[`sprites/${id}/${f}`] = f.endsWith('.json') ? JSON.parse(readFileSync(path, 'utf8')) : `data:image/png;base64,${b64(path)}`;
  }
if (pageName === 'play')
  for (const f of readdirSync('public/maps')) spriteAssets[`maps/${f}`] = `data:image/png;base64,${b64(`public/maps/${f}`)}`;
const sounds = Object.fromEntries(['shoot', 'hit', 'enemy_die', 'coin', 'explosion', 'click', 'zap', 'levelup', 'xp'].map((n) => [n, b64(`public/audio/${n}.mp3`)]));

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
