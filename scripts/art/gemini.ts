/**
 * npm run art:gemini -- <out.png> --prompt <file.txt | "text"> [--ref <picture>]... [--aspect 16:9] [--size 2K]
 *                        [--model <id>] [--count <n>]
 * npm run art:gemini -- --list
 *
 * Asks Gemini's image model (Nano Banana) for a picture, with reference pictures attached (a layout sketch, a
 * character's master art, a sheet drawn earlier) so the result keeps the game's style, and saves it as PNG.
 * The key comes from the GEMINI_API_KEY environment secret (set in the cloud environment's settings; never pasted
 * into the chat). Image output has no free tier, so every call is logged to art/gemini-log.jsonl with its price,
 * and a run that would take the logged total over GEMINI_BUDGET_USD (default 5) is refused.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, extname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://generativelanguage.googleapis.com/v1beta';
const LOG = join(ROOT, 'art/gemini-log.jsonl');
const DEFAULT_MODEL = 'gemini-nano-banana-2.1';

/** US dollars per picture by size, from Google's pricing page (October 2026). */
const PRICE: Record<string, Record<string, number>> = {
  'gemini-nano-banana-2.1': { '1K': 0.0336, '2K': 0.0504 },
  'gemini-3.1-flash-lite-image': { '1K': 0.0336 },
  'gemini-3.1-flash-image': { '1K': 0.067, '2K': 0.101 },
  'gemini-3-pro-image': { '1K': 0.134, '2K': 0.134, '4K': 0.24 },
};
const price = (model: string, size: string) => PRICE[model]?.[size] ?? 0.25;

interface Options {
  out: string;
  prompt: string;
  refs: string[];
  aspect: string;
  size: string;
  model: string;
  count: number;
}

function parseArgs(argv: string[]): Options | 'list' {
  if (argv.includes('--list')) return 'list';
  const o: Options = { out: '', prompt: '', refs: [], aspect: '16:9', size: '2K', model: process.env.GEMINI_IMAGE_MODEL ?? DEFAULT_MODEL, count: 1 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--prompt') {
      const p = next();
      o.prompt = existsSync(p) ? readFileSync(p, 'utf8') : p;
    } else if (a === '--ref') o.refs.push(next());
    else if (a === '--aspect') o.aspect = next();
    else if (a === '--size') o.size = next();
    else if (a === '--model') o.model = next();
    else if (a === '--count') o.count = Math.max(1, Math.min(4, Number(next()) || 1));
    else if (!a.startsWith('--')) o.out = a;
  }
  if (!o.out || !o.prompt) throw new Error('Usage: npm run art:gemini -- <out.png> --prompt <file|text> [--ref <picture>]... (or --list)');
  return o;
}

function key(): string {
  const k = process.env.GEMINI_API_KEY;
  if (!k) throw new Error('GEMINI_API_KEY is not set: add it as a secret in the cloud environment settings, then start a new session.');
  return k;
}

async function call(path: string, body?: unknown): Promise<unknown> {
  const res = await fetch(`${API}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { 'x-goog-api-key': key(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw Object.assign(new Error(`Gemini ${res.status}: ${text.slice(0, 600)}`), { status: res.status });
  return JSON.parse(text);
}

/** Every base64 picture anywhere in a response (the API has carried them under several shapes over time). */
export function findImages(node: unknown, out: string[] = []): string[] {
  if (!node || typeof node !== 'object') return out;
  const o = node as Record<string, unknown>;
  const inline = (o.inlineData ?? o.inline_data) as { data?: string; mimeType?: string; mime_type?: string } | undefined;
  if (inline?.data && /^image\//.test(inline.mimeType ?? inline.mime_type ?? 'image/')) out.push(inline.data);
  else if (o.type === 'image' && typeof o.data === 'string') out.push(o.data);
  else if (typeof o.data === 'string' && /^image\//.test(String(o.mime_type ?? o.mimeType ?? ''))) out.push(o.data);
  for (const v of Object.values(o)) if (v && typeof v === 'object') findImages(v, out);
  return [...new Set(out)];
}

async function refPart(path: string): Promise<{ mime: string; data: string }> {
  // Reference pictures go up as PNG no larger than 2048 px (WebP and huge sheets are converted).
  const png = await sharp(join(ROOT, path)).resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
  return { mime: 'image/png', data: png.toString('base64') };
}

async function generate(o: Options): Promise<string[]> {
  const refs = await Promise.all(o.refs.map(refPart));
  try {
    const res = await call('interactions', {
      model: o.model,
      input: [{ type: 'text', text: o.prompt }, ...refs.map((r) => ({ type: 'image', mime_type: r.mime, data: r.data }))],
      response_format: { type: 'image', mime_type: 'image/png', aspect_ratio: o.aspect, image_size: o.size },
    });
    return findImages(res);
  } catch (e) {
    if ((e as { status?: number }).status !== 404) throw e;
    // Older API surface: generateContent with image output.
    const res = await call(`models/${o.model}:generateContent`, {
      contents: [{ parts: [{ text: o.prompt }, ...refs.map((r) => ({ inlineData: { mimeType: r.mime, data: r.data } }))] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: o.aspect, imageSize: o.size } },
    });
    return findImages(res);
  }
}

function spent(): number {
  if (!existsSync(LOG)) return 0;
  return readFileSync(LOG, 'utf8').split('\n').filter(Boolean).reduce((sum, l) => sum + (JSON.parse(l).usd ?? 0), 0);
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  if (o === 'list') {
    const res = (await call('models?pageSize=200')) as { models?: { name: string; displayName?: string }[] };
    for (const m of res.models ?? []) if (/image|banana/i.test(m.name)) console.log(m.name.replace('models/', ''), '·', m.displayName ?? '');
    return;
  }
  const budget = Number(process.env.GEMINI_BUDGET_USD ?? 5);
  const cost = price(o.model, o.size) * o.count;
  const before = spent();
  if (before + cost > budget)
    throw new Error(`Budget: $${before.toFixed(2)} spent of $${budget}; this run would cost about $${cost.toFixed(2)}. Raise GEMINI_BUDGET_USD to go on.`);
  mkdirSync(dirname(join(ROOT, o.out)), { recursive: true });
  const saved: string[] = [];
  for (let i = 0; i < o.count; i++) {
    const images = await generate(o);
    if (!images.length) throw new Error('Gemini answered without a picture (maybe refused the prompt). Nothing was saved.');
    const file = o.count > 1 ? o.out.replace(extname(o.out), `-${i + 1}${extname(o.out) || '.png'}`) : o.out;
    writeFileSync(join(ROOT, file), await sharp(Buffer.from(images[images.length - 1], 'base64')).png().toBuffer());
    saved.push(file);
    appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), model: o.model, size: o.size, out: file, refs: o.refs, usd: price(o.model, o.size) }) + '\n');
  }
  console.log(`Saved ${saved.join(', ')}. Spent so far about $${spent().toFixed(2)} of the $${budget} budget.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
