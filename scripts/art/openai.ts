/**
 * npm run art:openai -- <out.png> --prompt <file.txt | "text"> [--ref <picture>]... [--quality medium|high]
 *                        [--size 1536x1024] [--transparent] [--model gpt-image-2]
 * npm run art:openai -- --spent
 *
 * Asks OpenAI's image model (the same family Codex draws with, so it keeps the cast's style) for one picture,
 * with reference pictures attached (a layout sketch, a character's master art, a sheet drawn earlier), and saves
 * it as PNG. `--transparent` asks for a real transparent background (sprite sheets).
 *
 * The key is a network secret on the cloud environment for api.openai.com: the environment's proxy adds it to the
 * requests, so it never shows inside the session (OPENAI_API_KEY, if set, is used instead). It is never pasted
 * into the chat. The owner's limit is $5 in all: every picture's real cost, worked out from the token counts
 * OpenAI returns, is logged to art/openai-log.jsonl, and a picture is refused when the logged total plus a
 * cautious guess at its cost would pass OPENAI_BUDGET_USD (default 5). The prepaid OpenAI balance (no
 * auto-recharge) is the second, hard stop.
 */
import { appendFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const API = 'https://api.openai.com/v1';
const LOG = join(ROOT, 'art/openai-log.jsonl');
const DEFAULT_MODEL = 'gpt-image-2';

/** US dollars per 1M tokens (OpenAI's pricing page, October 2026). */
const RATES: Record<string, { imageIn: number; textIn: number; imageOut: number }> = {
  'gpt-image-2': { imageIn: 8, textIn: 5, imageOut: 30 },
  'gpt-image-2.5-sunburst': { imageIn: 8, textIn: 5, imageOut: 30 },
  'gpt-image-2.5-flare': { imageIn: 8, textIn: 5, imageOut: 30 },
  'gpt-image-1.5': { imageIn: 8, textIn: 5, imageOut: 32 },
};

/** gpt-image-2's price per picture by quality for a 1536 × 1024 or 1024 × 1536 picture (square costs a little more). */
const PER_PICTURE: Record<string, number> = { low: 0.006, medium: 0.053, high: 0.211 };
/** A cautious allowance per reference picture (gpt-image-2 always reads them at high fidelity). */
const PER_REFERENCE = 0.03;

export interface Usage {
  input_tokens?: number;
  output_tokens?: number;
  input_tokens_details?: { image_tokens?: number; text_tokens?: number };
}

/** What a picture really cost, from the usage OpenAI returned with it. */
export function costOf(model: string, usage: Usage): number {
  const r = RATES[model] ?? RATES[DEFAULT_MODEL];
  const image = usage.input_tokens_details?.image_tokens ?? 0;
  const text = usage.input_tokens_details?.text_tokens ?? Math.max(0, (usage.input_tokens ?? 0) - image);
  return (image * r.imageIn + text * r.textIn + (usage.output_tokens ?? 0) * r.imageOut) / 1e6;
}

/** A guess on the high side, to decide before calling whether a picture still fits the budget. */
export const guessCost = (quality: string, refs: number) => (PER_PICTURE[quality] ?? PER_PICTURE.high) + refs * PER_REFERENCE;

interface Options {
  out: string;
  prompt: string;
  refs: string[];
  quality: string;
  size: string;
  transparent: boolean;
  model: string;
}

function parseArgs(argv: string[]): Options | 'spent' {
  if (argv.includes('--spent')) return 'spent';
  const o: Options = { out: '', prompt: '', refs: [], quality: 'medium', size: '1536x1024', transparent: false, model: process.env.OPENAI_IMAGE_MODEL ?? DEFAULT_MODEL };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    const next = () => argv[++i] ?? '';
    if (a === '--prompt') {
      const p = next();
      o.prompt = existsSync(p) ? readFileSync(p, 'utf8') : p;
    } else if (a === '--ref') o.refs.push(next());
    else if (a === '--quality') o.quality = next();
    else if (a === '--size') o.size = next();
    else if (a === '--model') o.model = next();
    else if (a === '--transparent') o.transparent = true;
    else if (!a.startsWith('--')) o.out = a;
  }
  if (!o.out || !o.prompt) throw new Error('Usage: npm run art:openai -- <out.png> --prompt <file|text> [--ref <picture>]... [--quality medium|high] (or --spent)');
  if (!['low', 'medium', 'high'].includes(o.quality)) throw new Error('--quality must be low, medium or high.');
  return o;
}

/** The Authorization header, unless the environment's proxy adds the key itself (a network secret). */
const auth = (): Record<string, string> => (process.env.OPENAI_API_KEY ? { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` } : {});

function spent(): number {
  if (!existsSync(LOG)) return 0;
  return readFileSync(LOG, 'utf8')
    .split('\n')
    .filter(Boolean)
    .reduce((sum, l) => sum + ((JSON.parse(l) as { usd?: number }).usd ?? 0), 0);
}

/** The chat model that hands the prompt and reference pictures to the image tool (a small, cheap one). */
const MAINLINE = process.env.OPENAI_MAINLINE_MODEL ?? 'gpt-5.4-mini';
/** Its price per 1M tokens, rounded up (it only reads the prompt and the pictures and writes a line or two). */
const MAINLINE_RATES = { in: 1, out: 5 };

async function call(path: string, body?: unknown): Promise<Record<string, unknown>> {
  const res = await fetch(`${API}/${path}`, {
    method: body ? 'POST' : 'GET',
    headers: { ...auth(), 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (res.status === 401)
    throw new Error('OpenAI 401: no key reached it. Add the key as a network secret for api.openai.com in the cloud environment settings (or set OPENAI_API_KEY).');
  if (!res.ok) throw new Error(`OpenAI ${res.status}: ${text.slice(0, 600)}`);
  return JSON.parse(text) as Record<string, unknown>;
}

/**
 * Pictures take a minute or more, longer than the session's network proxy keeps a request open, so the job runs
 * in the background on OpenAI's side (Responses API, `background: true`) and is polled until it is done.
 */
async function generate(o: Options): Promise<{ png: Buffer; mainline: Usage }> {
  const images = await Promise.all(
    o.refs.map(async (ref) => {
      // Reference pictures go up as PNG no larger than 2048 px (WebP and huge sheets are converted).
      const png = await sharp(join(ROOT, ref)).resize(2048, 2048, { fit: 'inside', withoutEnlargement: true }).png().toBuffer();
      return { type: 'input_image', image_url: `data:image/png;base64,${png.toString('base64')}`, detail: 'high' };
    }),
  );
  const tool = {
    type: 'image_generation',
    model: o.model,
    quality: o.quality,
    size: o.size,
    output_format: 'png',
    background: o.transparent ? 'transparent' : 'opaque',
  };
  let job = await call('responses', {
    model: MAINLINE,
    background: true,
    input: [{ role: 'user', content: [{ type: 'input_text', text: o.prompt }, ...images] }],
    tools: [tool],
    tool_choice: { type: 'image_generation' },
  });
  const started = Date.now();
  while (job.status === 'queued' || job.status === 'in_progress') {
    if (Date.now() - started > 10 * 60_000) throw new Error(`OpenAI job ${job.id} took over 10 minutes; check it later with GET /v1/responses/${job.id}.`);
    await new Promise((r) => setTimeout(r, 5000));
    job = await call(`responses/${job.id}`);
  }
  const output = (job.output ?? []) as { type: string; result?: string }[];
  const b64 = output.find((item) => item.type === 'image_generation_call' && item.result)?.result;
  if (job.status !== 'completed' || !b64)
    throw new Error(`OpenAI job ${job.id} ended "${job.status}" without a picture: ${JSON.stringify(job.error ?? job.incomplete_details ?? output.map((i) => i.type)).slice(0, 400)}`);
  return { png: Buffer.from(b64, 'base64'), mainline: (job.usage ?? {}) as Usage };
}

async function main() {
  const o = parseArgs(process.argv.slice(2));
  const budget = Number(process.env.OPENAI_BUDGET_USD ?? 5);
  if (o === 'spent') {
    console.log(`Spent $${spent().toFixed(3)} of the $${budget} budget.`);
    return;
  }
  const before = spent();
  const guess = guessCost(o.quality, o.refs.length);
  if (before + guess > budget)
    throw new Error(`Budget: $${before.toFixed(2)} spent of $${budget}; this picture could cost up to about $${guess.toFixed(2)}. Ask the owner before raising OPENAI_BUDGET_USD.`);
  mkdirSync(dirname(join(ROOT, o.out)), { recursive: true });
  const { png, mainline } = await generate(o);
  writeFileSync(join(ROOT, o.out), await sharp(png).png().toBuffer());
  // The picture itself is billed by the image tool, which reports no token counts here: count it at the cautious
  // guess, plus what the chat model really used.
  const usd = guess + ((mainline.input_tokens ?? 0) * MAINLINE_RATES.in + (mainline.output_tokens ?? 0) * MAINLINE_RATES.out) / 1e6;
  appendFileSync(LOG, JSON.stringify({ at: new Date().toISOString(), model: o.model, quality: o.quality, size: o.size, out: o.out, refs: o.refs, mainline, usd }) + '\n');
  console.log(`Saved ${o.out} for $${usd.toFixed(3)}. Spent $${spent().toFixed(2)} of the $${budget} budget.`);
}

if (process.argv[1] === fileURLToPath(import.meta.url))
  main().catch((e) => {
    console.error(e instanceof Error ? e.message : e);
    process.exit(1);
  });
