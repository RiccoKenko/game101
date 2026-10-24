// Builds the game as ONE self-contained HTML fragment (JS, CSS and fonts inlined) for a claude.ai artifact.
// Usage: node scripts/build-artifact.mjs <out.html>
import { build } from 'vite';
import { mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
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
const page = `<title>Little Archer: Monster Rush</title>
<meta name="theme-color" content="#1d1630">
<style>
:root { color-scheme: dark; }
${css}
</style>
<div id="game"></div>
<div id="rotate">Please turn your phone upright to play</div>
<div id="safe-probe"></div>
<script type="module">
${js}
</script>
`;
writeFileSync(out, page);
console.log(`Wrote ${out} (${(page.length / 1024 / 1024).toFixed(2)} MB)`);
