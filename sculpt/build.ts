/**
 * Builds our own hand-sculpted models into public/models/.
 *   npx tsx sculpt/build.ts            all models
 *   npx tsx sculpt/build.ts hero       just one
 */
import fs from 'node:fs';
import { buildCharacter, type CharacterDef } from './character';
import { deckhand } from './characters/deckhand';
import { hero } from './characters/hero';
import { buildProps } from './props';
import { arrow, coin, islet, shard } from './props/showcase';

const ALL: Record<string, CharacterDef> = { hero, deckhand };

const wanted = process.argv.slice(2);
fs.mkdirSync('public/models', { recursive: true });
for (const [name, def] of Object.entries(ALL)) {
  if (wanted.length && !wanted.includes(name)) continue;
  await buildCharacter(def, `public/models/${name}.glb`);
}
if (!wanted.length || wanted.includes('props')) await buildProps('public/models/props.glb', [islet(), arrow(), coin(), shard()]);
