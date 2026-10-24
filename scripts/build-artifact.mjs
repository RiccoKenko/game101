// Builds the game as ONE self-contained HTML fragment (JS, CSS and fonts inlined) for a claude.ai artifact.
// Usage: node scripts/build-artifact.mjs <out.html>
import { build } from 'vite';
import { existsSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const out = process.argv[2] ?? 'little-archer.html';
const outDir = mkdtempSync(join(tmpdir(), 'artifact-'));
await build({
  base: './',
  logLevel: 'warn',
  define: { 'import.meta.env.VITE_AUDIO': '"off"' },
  build: { outDir, emptyOutDir: true, assetsInlineLimit: 100_000_000, cssCodeSplit: false, modulePreload: false },
});
const assets = join(outDir, 'assets');
const files = readdirSync(assets);
const js = readFileSync(join(assets, files.find((f) => f.endsWith('.js'))), 'utf8').replace(/<\/script/gi, '<\\/script');
const css = readFileSync(join(assets, files.find((f) => f.endsWith('.css'))), 'utf8');
// The painted art in public/art/ goes inline too: pictures as data URIs, JSON parsed (see src/art/assets.ts).
const assetsInline = {};
const walk = (dir, rel) => {
  if (!existsSync(dir)) return;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = `${rel}/${entry.name}`;
    if (entry.isDirectory()) walk(join(dir, entry.name), path);
    else if (entry.name.endsWith('.json')) assetsInline[path] = JSON.parse(readFileSync(join(dir, entry.name), 'utf8'));
    else if (/\.(webp|png)$/.test(entry.name))
      assetsInline[path] = `data:image/${entry.name.endsWith('.png') ? 'png' : 'webp'};base64,${readFileSync(join(dir, entry.name)).toString('base64')}`;
  }
};
walk(join(process.cwd(), 'public/art'), 'art');
const page = `<title>Little Archer: Monster Rush</title>
<meta name="theme-color" content="#1d1630">
<style>
:root { color-scheme: dark; }
${css}
</style>
<div id="game"></div>
<div id="rotate">Please turn your phone upright to play</div>
<div id="safe-probe"></div>
<script>window.__ASSETS__ = ${JSON.stringify(assetsInline)};</script>
<script type="module">
${js}
</script>
`;
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);
