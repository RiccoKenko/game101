// Builds the character showcase as ONE self-contained HTML fragment (JS, CSS, fonts, models, sounds inlined)
// for a claude.ai artifact. Usage: node scripts/build-showcase.mjs <out.html>
import { build } from 'vite';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = process.argv[2] ?? 'sky-pirates-cast.html';
const outDir = mkdtempSync(join(tmpdir(), 'showcase-'));
await build({
  base: './',
  logLevel: 'warn',
  build: { outDir, emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false },
});
const assets = join(outDir, 'assets');
const files = readdirSync(assets);
const js = readFileSync(join(assets, files.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(assets, files.find((f) => f.endsWith('.css'))), 'utf8');
const b64 = (path) => readFileSync(path).toString('base64');
const models = Object.fromEntries(['hero', 'deckhand', 'props'].map((n) => [n, b64(`public/models/${n}.glb`)]));
const sounds = Object.fromEntries(['shoot', 'hit', 'enemy_die', 'coin', 'explosion', 'click', 'zap', 'levelup', 'xp'].map((n) => [n, b64(`public/audio/${n}.mp3`)]));

const page = `<title>Sky Pirates Cast</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="theme-color" content="#bfe7ff">
<style>
${css}
</style>
<script>window.__MODELS__=${JSON.stringify(models)};window.__SOUNDS__=${JSON.stringify(sounds)};</script>
<script type="module">
${js}
</script>
`;
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);
