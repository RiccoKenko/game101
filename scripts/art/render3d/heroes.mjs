/**
 * node scripts/art/render3d/heroes.mjs [hero ...] [--preview <file.png>]
 *
 * Renders the three heroes from the KayKit Adventurers models (CC0, art/models/kaykit) into the animated sheets the
 * game plays: public/art/hero/<id>.webp + <id>.json (frames, feet, animations; see HeroMeta in src/art/textures.ts)
 * and the menu picture public/art/hero/<id>_menu.webp. Every frame is photographed big, shrunk for smooth edges and
 * outlined like a classic sprite; heroes face right (the game mirrors them).
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { openStudio, spritify } from './studio.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../../..');
const OUT = join(ROOT, 'public/art/hero');

/** Final frame size, where the feet stand in it, and pixels per metre. Rendered twice as big, then shrunk. */
const FRAME = [256, 240];
const FEET = [128, 216];
const PX = 62;
const DOWN = 2;
/** Height of a hero's body in the frame (px), for the game's scale: the models are about 2.45 m to the crown. */
const BODY = Math.round(2.45 * PX);
/** The camera: a little above the field, the hero turned towards the right. */
const VIEW = { yaw: 62, elev: 22 };

/** Bones that follow the attack while the legs keep running. */
const UPPER = ['chest', 'upperarml', 'lowerarml', 'wristl', 'handl', 'handslotl', 'upperarmr', 'lowerarmr', 'wristr', 'handr', 'handslotr', 'head', 'elbowIKl', 'handIKl', 'elbowIKr', 'handIKr'];

const K = '/art/models/kaykit/';
const body = (who) => ['ArmLeft', 'ArmRight', 'Body', 'LegLeft', 'LegRight'].map((p) => `${who}_${p}`);

export const HEROES = {
  swordman: {
    url: `${K}Knight.glb`,
    show: [...body('Knight'), 'Knight_Head', '1H_Sword', 'Round_Shield', 'Knight_Cape'],
    ready: { clip: 'Blocking', time: 0.3 },
    attack: { clip: '1H_Melee_Attack_Slice_Diagonal', release: 0.45 },
  },
  archer: {
    url: `${K}Rogue.glb`,
    show: [...body('Rogue'), 'Rogue_Head', '2H_Crossbow', 'Rogue_Cape'],
    ready: { clip: '2H_Ranged_Aiming', time: 0.3 },
    attack: { clip: '2H_Ranged_Shoot', release: 0.3 },
  },
  mage: {
    url: `${K}Mage.glb`,
    show: [...body('Mage'), 'Mage_Head', '2H_Staff', 'Mage_Hat', 'Mage_Cape'],
    ready: { clip: 'Spellcasting', time: 0.2 },
    attack: { clip: 'Spellcast_Shoot', release: 0.45 },
  },
};

/** Each animation the game plays: how many frames, at what speed, and how to pose them. */
function animations(h) {
  const run = { clip: 'Running_A', span: [0, 0.8] };
  return {
    idle: { count: 8, fps: 8, loop: true, clip: 'Idle', span: [0, 1.07] },
    run: { count: 8, fps: 14, loop: true, ...run },
    runaim: { count: 8, fps: 14, loop: true, ...run, over: h.ready.clip, overTime: h.ready.time },
    runrelease: { count: 8, fps: 14, loop: true, ...run, over: h.attack.clip, overTime: h.attack.release },
    shoot: { count: 8, fps: 16, loop: false, clip: h.attack.clip, span: [0, 'end'] },
    hurt: { count: 6, fps: 12, loop: false, clip: 'Hit_A', span: [0, 'end'] },
    ko: { count: 8, fps: 12, loop: false, clip: 'Death_A', span: [0, 'end'], last: true },
    cheer: { count: 10, fps: 12, loop: false, clip: 'Cheer', span: [0, 'end'] },
  };
}

/** Times to photograph: `count` evenly over the span (a loop leaves out the end, which equals the start). */
function times(a, durations) {
  const end = a.span[1] === 'end' ? durations[a.clip] : a.span[1];
  const n = a.loop || !a.last ? a.count : a.count - 1;
  return Array.from({ length: a.count }, (_, i) => a.span[0] + ((end - a.span[0]) * i) / n);
}

async function renderHero(studio, id) {
  const h = HEROES[id];
  const info = await studio.info(h.url);
  const durations = Object.fromEntries(info.clips.map((c) => [c.slice(0, c.lastIndexOf(' ')), Number(c.slice(c.lastIndexOf(' ') + 1))]));
  const shot = { url: h.url, show: h.show, w: FRAME[0] * DOWN, h: FRAME[1] * DOWN, feet: [FEET[0] * DOWN, FEET[1] * DOWN], px: PX * DOWN, ...VIEW, upper: UPPER };
  const frames = [];
  const meta = { frameWidth: FRAME[0], frameHeight: FRAME[1], feet: FEET, bodyHeight: BODY, animations: {} };
  for (const [name, a] of Object.entries(animations(h))) {
    const pngs = await studio.render({ ...shot, clip: a.clip, over: a.over, overTime: a.overTime, times: times(a, durations) });
    meta.animations[name] = { start: frames.length, count: pngs.length, fps: a.fps, loop: a.loop };
    for (const p of pngs) frames.push(await spritify(p, { down: DOWN }));
  }
  // The menu picture: the hero standing, bigger and turned a little more towards the viewer.
  const [menuShot] = await studio.render({ ...shot, w: 1400, h: 1800, feet: [700, 1720], px: 480, yaw: 35, elev: 12, clip: 'Idle', times: [0.2] });
  const menu = await sharp(await spritify(menuShot, { down: 2, r: 4 })).trim({ threshold: 0 }).png().toBuffer();
  return { frames, meta, menu };
}

/** Frames packed 8 to a row. */
async function sheet(frames) {
  const cols = 8;
  const rows = Math.ceil(frames.length / cols);
  return sharp({ create: { width: cols * FRAME[0], height: rows * FRAME[1], channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0 } } })
    .composite(frames.map((f, i) => ({ input: f, left: (i % cols) * FRAME[0], top: Math.floor(i / cols) * FRAME[1] })))
    .png()
    .toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  const pi = args.indexOf('--preview');
  const preview = pi >= 0 ? args.splice(pi, 2)[1] : null;
  const ids = args.length ? args : Object.keys(HEROES);
  const studio = await openStudio();
  const strips = [];
  try {
    mkdirSync(OUT, { recursive: true });
    for (const id of ids) {
      const { frames, meta, menu } = await renderHero(studio, id);
      const png = await sheet(frames);
      if (!preview) {
        await sharp(png).webp({ quality: 90, alphaQuality: 100 }).toFile(join(OUT, `${id}.webp`));
        writeFileSync(join(OUT, `${id}.json`), `${JSON.stringify(meta, null, 2)}\n`);
        await sharp(menu).webp({ quality: 90, alphaQuality: 100 }).toFile(join(OUT, `${id}_menu.webp`));
      }
      // For the preview: the middle frame of every animation, in a row.
      const firsts = Object.values(meta.animations).map((a) => frames[a.start + Math.floor(a.count / 2)]);
      strips.push(firsts);
      console.log(`${id}: ${frames.length} frames${preview ? '' : ` -> public/art/hero/${id}.webp`}`);
    }
  } finally {
    await studio.close();
  }
  if (preview) {
    const parts = strips.flatMap((row, r) => row.map((f, c) => ({ input: f, left: c * FRAME[0], top: r * FRAME[1] })));
    await sharp({ create: { width: 8 * FRAME[0], height: strips.length * FRAME[1], channels: 4, background: '#cfd8b8' } })
      .composite(parts)
      .png()
      .toFile(preview);
    console.log(`wrote ${preview}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
