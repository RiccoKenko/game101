import Phaser from 'phaser';
import { type MapDef } from '../config/maps';
import { mulberry32 } from '../core/rng';

const CHUNK = 640;
/** Decorations that sway in the wind (pivoting at their base). */
const SWAYS = new Set(['tree', 'bush', 'dead_tree', 'flowers']);

/** Infinite scrolling ground plus deterministic scattered decorations. */
export class World {
  private ground: Phaser.GameObjects.TileSprite;
  private chunks = new Map<string, Phaser.GameObjects.Image[]>();
  private timer = 0;
  private clock = 0;

  constructor(private scene: Phaser.Scene, private map: MapDef) {
    const { width, height } = scene.scale;
    this.ground = scene.add.tileSprite(0, 0, width, height, map.ground).setOrigin(0).setScrollFactor(0).setDepth(0);
  }

  update(dt: number): void {
    const cam = this.scene.cameras.main;
    this.ground.setTilePosition(cam.scrollX, cam.scrollY);
    this.clock += dt;
    for (const imgs of this.chunks.values()) {
      for (const img of imgs) {
        if (SWAYS.has(img.texture.key)) img.setRotation(Math.sin(this.clock * 1.3 + img.x * 0.013) * 0.03);
      }
    }
    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = 0.25;
    const view = cam.worldView;
    const x0 = Math.floor((view.x - CHUNK) / CHUNK);
    const x1 = Math.floor((view.right + CHUNK) / CHUNK);
    const y0 = Math.floor((view.y - CHUNK) / CHUNK);
    const y1 = Math.floor((view.bottom + CHUNK) / CHUNK);
    const keep = new Set<string>();
    for (let cx = x0; cx <= x1; cx++) {
      for (let cy = y0; cy <= y1; cy++) {
        const key = `${cx},${cy}`;
        keep.add(key);
        if (!this.chunks.has(key)) this.chunks.set(key, this.populate(cx, cy));
      }
    }
    for (const [key, imgs] of this.chunks) {
      if (keep.has(key)) continue;
      imgs.forEach((i) => i.destroy());
      this.chunks.delete(key);
    }
  }

  private populate(cx: number, cy: number): Phaser.GameObjects.Image[] {
    const rng = mulberry32((cx * 73856093) ^ (cy * 19349663) ^ (this.map.index * 83492791));
    const count = Math.floor(rng() * 3);
    const out: Phaser.GameObjects.Image[] = [];
    for (let i = 0; i < count; i++) {
      const x = cx * CHUNK + 60 + rng() * (CHUNK - 120);
      const y = cy * CHUNK + 60 + rng() * (CHUNK - 120);
      // Keep the starting spot clear.
      if (Math.abs(x) < 220 && Math.abs(y) < 220) continue;
      const key = this.map.decor[Math.floor(rng() * this.map.decor.length)];
      const img = this.scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(2);
      if (rng() < 0.5) img.setFlipX(true);
      out.push(img);
    }
    return out;
  }
}
