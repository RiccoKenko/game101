/**
 * Battle maps. Coordinates are pixels on the map picture (1536 × 1024, y down), the same picture ChatGPT
 * paints over the layout sketch, so the road and tower spots line up with the art.
 */
import { closedCurve, insidePolygon, Path, type Pt } from './path';
import type { WaveDef } from './waves';

export interface LevelDef {
  id: string;
  name: string;
  /** One line for the level-select card. */
  blurb?: string;
  map: { w: number; h: number; art?: string; sketch: string };
  /** Road control points, from the airship dock to the crystal vault. */
  route: Pt[];
  /** Road width (for drawing and for keeping props off it). */
  roadWidth: number;
  /** Empty tower spots. */
  slots: Pt[];
  slotRadius: number;
  dock: Pt;
  vault: Pt;
  heroStart: Pt;
  /** Outline of the island's top, where the hero can walk. */
  island: Pt[];
  startGold: number;
  /** Sky Crystals in the vault at the start. */
  crystals: number;
  waves: WaveDef[];
  /** Waves (counting from 1) after whose last pirate arrives the captain offers orders (a card to pick). */
  ordersAfter?: number[];
}

export const LEVEL1: LevelDef = {
  id: 'level1',
  name: 'The First Raid',
  blurb: 'The first raid on Sky Haven. Guard the crystal vault!',
  // Painted by Codex over the sketch; the road and spots below were measured on the painting.
  map: { w: 1536, h: 1024, art: 'maps/level1.webp', sketch: 'maps/level1-sketch.png' },
  route: [
    [1500, 300], [1330, 300], [1180, 330], [1090, 430], [1080, 560], [1120, 680], [1040, 780], [880, 800],
    [740, 740], [680, 620], [600, 500], [470, 450], [360, 480], [272, 520],
  ],
  roadWidth: 92,
  slots: [
    [1251, 436], [961, 463], [1235, 650], [925, 655], [566, 697], [803, 555], [561, 338], [404, 614],
  ],
  slotRadius: 52,
  dock: [1440, 300],
  vault: [218, 508],
  heroStart: [300, 640],
  island: [
    [150, 430], [215, 270], [380, 195], [600, 170], [820, 190], [1000, 170], [1200, 200], [1365, 250], [1420, 340],
    [1440, 520], [1400, 700], [1300, 820], [1100, 885], [820, 905], [560, 885], [340, 825], [200, 705], [140, 560],
  ],
  startGold: 220,
  crystals: 20,
  ordersAfter: [2, 4, 6],
  // New pirates arrive one kind at a time: flyers in wave 4 (cannons can't reach them), armour in wave 6
  // (arrows bounce off, lightning doesn't), and the First Mate at the end of the last wave.
  waves: [
    { groups: [{ enemy: 'deckhand', count: 6, gap: 1.6 }] },
    { groups: [{ enemy: 'deckhand', count: 9, gap: 1.3 }] },
    { groups: [{ enemy: 'powderMonkey', count: 6, gap: 0.8 }, { enemy: 'deckhand', count: 5, gap: 1.4, delay: 4 }] },
    { groups: [{ enemy: 'parrot', count: 6, gap: 1.2 }, { enemy: 'deckhand', count: 8, gap: 1.1, delay: 3 }] },
    { groups: [{ enemy: 'deckhand', count: 13, gap: 1 }, { enemy: 'powderMonkey', count: 10, gap: 0.6, delay: 5 }] },
    { groups: [{ enemy: 'ironclad', count: 3, gap: 3 }, { enemy: 'deckhand', count: 10, gap: 1, delay: 2 }] },
    { groups: [{ enemy: 'parrot', count: 8, gap: 1 }, { enemy: 'powderMonkey', count: 10, gap: 0.6, delay: 4 }, { enemy: 'ironclad', count: 3, gap: 3, delay: 8 }] },
    {
      groups: [
        { enemy: 'deckhand', count: 12, gap: 0.9 },
        { enemy: 'powderMonkey', count: 8, gap: 0.6, delay: 6 },
        { enemy: 'ironclad', count: 4, gap: 2.5, delay: 10 },
        { enemy: 'parrot', count: 6, gap: 1.1, delay: 15 },
        { enemy: 'firstMate', count: 1, gap: 1, delay: 20 },
      ],
    },
  ],
};

export const LEVEL2: LevelDef = {
  id: 'level2',
  name: 'Windmill Terraces',
  blurb: "Raiders on Sky Haven's farm island. Hold the bend!",
  // Laid out on the sketch (no painting yet). The dock is on the west edge; the road runs east along the top
  // terrace, swings round a U-bend and comes back west a terrace lower, then drops to the vault. The spots between
  // the two stretches (and the one inside the bend) reach both; a stream crosses the road under two bridges.
  map: { w: 1536, h: 1024, art: 'maps/level2.webp', sketch: 'maps/level2-sketch.png' },
  route: [
    [36, 330], [200, 330], [380, 305], [560, 320], [740, 340], [920, 325], [1080, 330], [1200, 370], [1280, 450],
    [1290, 540], [1230, 620], [1110, 660], [960, 655], [800, 640], [640, 655], [500, 690], [400, 750], [340, 785],
  ],
  roadWidth: 92,
  slots: [
    [290, 490], [520, 485], [745, 490], [990, 495], [1150, 500], [520, 805], [760, 805], [1020, 800], [1250, 770], [330, 200],
  ],
  slotRadius: 52,
  dock: [96, 330],
  vault: [282, 792],
  heroStart: [420, 860],
  island: [
    [110, 330], [160, 190], [340, 130], [600, 115], [860, 128], [1110, 120], [1320, 165], [1425, 290], [1450, 470],
    [1430, 650], [1350, 800], [1170, 885], [920, 915], [660, 912], [420, 900], [235, 875], [130, 770], [100, 540],
  ],
  startGold: 260,
  crystals: 20,
  ordersAfter: [2, 4, 6],
  // Flyers already in wave 3 and armour in wave 4, powder-monkey swarms all along; the last waves are big, so
  // a few towers left at level 2 no longer hold them.
  waves: [
    { groups: [{ enemy: 'deckhand', count: 8, gap: 1.4 }, { enemy: 'powderMonkey', count: 5, gap: 0.8, delay: 8 }] },
    { groups: [{ enemy: 'powderMonkey', count: 12, gap: 0.55 }, { enemy: 'deckhand', count: 6, gap: 1.2, delay: 5 }] },
    { groups: [{ enemy: 'parrot', count: 6, gap: 1.2 }, { enemy: 'deckhand', count: 10, gap: 1, delay: 3 }] },
    {
      groups: [
        { enemy: 'ironclad', count: 3, gap: 3 },
        { enemy: 'powderMonkey', count: 14, gap: 0.5, delay: 4 },
        { enemy: 'deckhand', count: 6, gap: 1, delay: 8 },
      ],
    },
    {
      groups: [
        { enemy: 'deckhand', count: 18, gap: 0.85 },
        { enemy: 'parrot', count: 8, gap: 1, delay: 6 },
        { enemy: 'powderMonkey', count: 12, gap: 0.45, delay: 10 },
      ],
    },
    {
      groups: [
        { enemy: 'ironclad', count: 6, gap: 2.5 },
        { enemy: 'powderMonkey', count: 18, gap: 0.45, delay: 3 },
        { enemy: 'parrot', count: 10, gap: 0.9, delay: 10 },
      ],
    },
    {
      groups: [
        { enemy: 'deckhand', count: 22, gap: 0.75 },
        { enemy: 'ironclad', count: 8, gap: 2.2, delay: 6 },
        { enemy: 'powderMonkey', count: 18, gap: 0.45, delay: 10 },
        { enemy: 'parrot', count: 12, gap: 0.9, delay: 14 },
      ],
    },
    {
      groups: [
        { enemy: 'powderMonkey', count: 24, gap: 0.4 },
        { enemy: 'deckhand', count: 22, gap: 0.7, delay: 4 },
        { enemy: 'ironclad', count: 12, gap: 1.9, delay: 9 },
        { enemy: 'parrot', count: 16, gap: 0.8, delay: 14 },
      ],
    },
  ],
};

export const LEVEL3: LevelDef = {
  id: 'level3',
  name: 'Lighthouse Point',
  blurb: "The First Mate's big assault on the old lighthouse.",
  // Laid out on the sketch (no painting yet). The pirates land on the south-east side; the road climbs in two
  // hairpins to the top of the cliffs, then runs down west to the vault at the foot of the lighthouse on the point.
  map: { w: 1536, h: 1024, art: 'maps/level3.webp', sketch: 'maps/level3-sketch.png' },
  route: [
    [1500, 800], [1320, 805], [1150, 790], [1000, 740], [910, 650], [930, 545], [1050, 500], [1200, 470], [1290, 390],
    [1250, 290], [1120, 240], [940, 230], [770, 255], [640, 320], [560, 430], [470, 520], [370, 555], [290, 550],
  ],
  roadWidth: 92,
  slots: [
    [1100, 650], [1290, 650], [1100, 365], [890, 385], [730, 455], [760, 620], [430, 410], [400, 680], [860, 810], [1370, 520],
  ],
  slotRadius: 52,
  dock: [1440, 800],
  vault: [225, 540],
  heroStart: [300, 660],
  island: [
    [55, 500], [80, 420], [180, 380], [320, 375], [430, 260], [600, 165], [860, 130], [1100, 140], [1320, 190], [1425, 330],
    [1445, 560], [1430, 730], [1385, 880], [1150, 910], [880, 905], [620, 885], [440, 810], [300, 720], [170, 660], [80, 600],
  ],
  startGold: 340,
  crystals: 20,
  ordersAfter: [2, 4, 6, 8],
  // A gentle start, then every kind together; from wave 5 the waves come faster (12 s rests instead of 14), and
  // the First Mate leads the whole crew in the last one.
  waves: [
    { groups: [{ enemy: 'deckhand', count: 10, gap: 1.3 }] },
    { groups: [{ enemy: 'powderMonkey', count: 10, gap: 0.7 }, { enemy: 'parrot', count: 3, gap: 1.2, delay: 6 }] },
    { groups: [{ enemy: 'ironclad', count: 2, gap: 3 }, { enemy: 'deckhand', count: 10, gap: 1.1, delay: 2 }] },
    { groups: [{ enemy: 'parrot', count: 8, gap: 1 }, { enemy: 'powderMonkey', count: 12, gap: 0.5, delay: 5 }] },
    {
      groups: [
        { enemy: 'ironclad', count: 4, gap: 2.5 },
        { enemy: 'deckhand', count: 12, gap: 0.9, delay: 3 },
        { enemy: 'powderMonkey', count: 10, gap: 0.4, delay: 10 },
      ],
      rest: 12,
    },
    {
      groups: [
        { enemy: 'parrot', count: 10, gap: 1 },
        { enemy: 'ironclad', count: 5, gap: 2.5, delay: 5 },
        { enemy: 'powderMonkey', count: 18, gap: 0.4, delay: 9 },
      ],
      rest: 12,
    },
    {
      groups: [
        { enemy: 'deckhand', count: 20, gap: 0.8 },
        { enemy: 'ironclad', count: 6, gap: 2.2, delay: 6 },
        { enemy: 'parrot', count: 8, gap: 1, delay: 12 },
        { enemy: 'powderMonkey', count: 12, gap: 0.4, delay: 16 },
      ],
      rest: 12,
    },
    {
      groups: [
        { enemy: 'parrot', count: 12, gap: 0.9 },
        { enemy: 'powderMonkey', count: 24, gap: 0.4, delay: 5 },
        { enemy: 'ironclad', count: 7, gap: 2.4, delay: 10 },
        { enemy: 'deckhand', count: 12, gap: 0.8, delay: 14 },
      ],
      rest: 12,
    },
    {
      groups: [
        { enemy: 'deckhand', count: 22, gap: 0.75 },
        { enemy: 'ironclad', count: 9, gap: 2, delay: 5 },
        { enemy: 'parrot', count: 14, gap: 0.9, delay: 10 },
        { enemy: 'powderMonkey', count: 24, gap: 0.4, delay: 16 },
      ],
      rest: 12,
    },
    {
      groups: [
        { enemy: 'deckhand', count: 20, gap: 0.75 },
        { enemy: 'powderMonkey', count: 24, gap: 0.4, delay: 6 },
        { enemy: 'ironclad', count: 10, gap: 2.2, delay: 10 },
        { enemy: 'parrot', count: 16, gap: 0.85, delay: 16 },
        { enemy: 'firstMate', count: 1, gap: 1, delay: 24 },
      ],
    },
  ],
};

/** Chapter 1's levels, in order: each one unlocks the next. */
export const CHAPTER1: LevelDef[] = [LEVEL1, LEVEL2, LEVEL3];

export const LEVELS: Record<string, LevelDef> = Object.fromEntries(CHAPTER1.map((l) => [l.id, l]));

/** Problems that would make a level unplayable: tower spots on the road, off the island, or overlapping. */
export function checkLevel(level: LevelDef): string[] {
  const road = new Path(level.route);
  const island = closedCurve(level.island);
  const problems: string[] = [];
  level.slots.forEach((s, i) => {
    const gap = road.nearest(s).dist - level.roadWidth / 2 - level.slotRadius;
    if (gap < 8) problems.push(`slot ${i + 1} touches the road (gap ${gap.toFixed(0)} px)`);
    if (!insidePolygon(island, s)) problems.push(`slot ${i + 1} is off the island`);
    level.slots.forEach((t, j) => {
      if (j > i && Math.hypot(s[0] - t[0], s[1] - t[1]) < level.slotRadius * 2 + 20) problems.push(`slots ${i + 1} and ${j + 1} overlap`);
    });
  });
  if (!insidePolygon(island, level.heroStart)) problems.push('hero starts off the island');
  return problems;
}
