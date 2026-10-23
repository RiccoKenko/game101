/**
 * Battle maps. Coordinates are pixels on the map picture (1536 × 1024, y down), the same picture ChatGPT
 * paints over the layout sketch, so the road and tower spots line up with the art.
 */
import { closedCurve, insidePolygon, Path, type Pt } from './path';
import type { WaveDef } from './waves';

export interface LevelDef {
  id: string;
  name: string;
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
}

export const LEVEL1: LevelDef = {
  id: 'level1',
  name: 'Pirates on the Horizon',
  map: { w: 1536, h: 1024, sketch: 'maps/level1-sketch.png' },
  route: [
    [1500, 300], [1330, 300], [1180, 330], [1090, 430], [1080, 560], [1120, 680], [1040, 780], [880, 800],
    [740, 740], [680, 620], [600, 500], [470, 450], [360, 480], [272, 520],
  ],
  roadWidth: 84,
  slots: [
    [1250, 440], [960, 470], [1235, 650], [920, 660], [560, 700], [800, 560], [560, 340], [400, 615],
  ],
  slotRadius: 52,
  dock: [1440, 300],
  vault: [222, 520],
  heroStart: [300, 640],
  island: [
    [150, 430], [215, 270], [380, 195], [600, 170], [820, 190], [1000, 170], [1200, 200], [1365, 250], [1420, 340],
    [1440, 520], [1400, 700], [1300, 820], [1100, 885], [820, 905], [560, 885], [340, 825], [200, 705], [140, 560],
  ],
  startGold: 220,
  crystals: 20,
  waves: [
    { groups: [{ enemy: 'deckhand', count: 6, gap: 1.6 }] },
    { groups: [{ enemy: 'deckhand', count: 9, gap: 1.3 }] },
    { groups: [{ enemy: 'powderMonkey', count: 6, gap: 0.8 }, { enemy: 'deckhand', count: 5, gap: 1.4, delay: 4 }] },
    { groups: [{ enemy: 'deckhand', count: 13, gap: 1 }] },
    { groups: [{ enemy: 'powderMonkey', count: 10, gap: 0.6 }, { enemy: 'deckhand', count: 9, gap: 1.1, delay: 3 }] },
    { groups: [{ enemy: 'deckhand', count: 16, gap: 0.8 }, { enemy: 'powderMonkey', count: 12, gap: 0.5, delay: 6 }] },
  ],
};

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
