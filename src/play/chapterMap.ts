/**
 * The Chapter 1 level-select map: three islands joined by a dotted sky route, from Sky Haven on the left to the
 * storm clouds on the right where the Thunder Armada waits (Chapter 2). Coordinates are pixels on a 1536 × 1024
 * picture (y down), the same picture Codex paints over the sketch, so the level buttons sit on its islands.
 */
import type { Pt } from '../td/path';

export interface ChapterMapDef {
  w: number;
  h: number;
  /** The painted map, once Codex has drawn it; until then the screen draws a stand-in. */
  art?: string;
  sketch: string;
  /** Where each level's button sits, in the chapter's level order. */
  nodes: Pt[];
  /** The dotted route through the nodes (and on toward the storm, for the chapter still to come). */
  route: Pt[];
  /** The storm on the horizon: Chapter 2, locked. */
  storm: Pt;
}

export const CHAPTER1_MAP: ChapterMapDef = {
  w: 1536,
  h: 1024,
  sketch: 'maps/chapter1-sketch.png',
  nodes: [
    [330, 650],
    [760, 470],
    [1150, 640],
  ],
  route: [
    [330, 650], [460, 640], [560, 560], [660, 490], [760, 470], [880, 480], [990, 560], [1070, 620], [1150, 640],
    [1260, 560], [1330, 430], [1350, 300],
  ],
  storm: [1340, 230],
};
