/**
 * Battle maps. Coordinates are pixels on the map picture (1536 × 1024, y down), the same picture ChatGPT
 * paints over the layout sketch, so the road and tower spots line up with the art.
 */
import type { Pt } from './path';

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
};
