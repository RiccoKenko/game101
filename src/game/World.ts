import Phaser from 'phaser';
import { type MapDef } from '../config/maps';
import { mulberry32 } from '../core/rng';

const CHUNK = 640;
/** Decorations that sway in the wind (pivoting at their base). */
const SWAYS = new Set(['tree', 'bush', 'flowers', 'pine', 'palm', 'paper_lantern']);
/** Decorations that grow in groups: trees in groves (2-4), small things in clumps (2-3); the rest stand alone. */
const GROVES = new Set(['tree', 'pine', 'palm']);
const CLUMPS = new Set(['bush', 'flowers', 'rock', 'fern_rock', 'stump', 'cactus', 'skull', 'pots']);
/** Cloud shadows drifting over the ground (not under the forest's canopy): how many, and their wind. */
const CLOUDS = 3;
const WIND = { x: 22, y: 9 };

/** Infinite scrolling ground plus deterministic scattered decorations. */
export class World {
  private ground: Phaser.GameObjects.TileSprite;
  private chunks = new Map<string, Phaser.GameObjects.Image[]>();
  private clouds: Phaser.GameObjects.Image[] = [];
  private timer = 0;
  private clock = 0;

  constructor(private scene: Phaser.Scene, private map: MapDef) {
    const { width, height } = scene.scale;
    this.ground = scene.add.tileSprite(0, 0, width, height, map.ground).setOrigin(0).setScrollFactor(0).setDepth(0);
    if (map.index !== 1) {
      for (let i = 0; i < CLOUDS; i++) {
        const c = scene.add.image(0, 0, 'glow').setDepth(9).setTint(0x1c2618).setAlpha(map.index === 2 ? 0.12 : 0.16);
        c.setDisplaySize(760 + i * 180, 420 + i * 90).setData('placed', false);
        this.clouds.push(c);
      }
    }
  }

  /** Cloud shadows drift with the wind; one that has blown out of sight comes back in from the upwind side. */
  private driftClouds(dt: number): void {
    const v = this.scene.cameras.main.worldView;
    this.clouds.forEach((c, i) => {
      const w = c.displayWidth;
      if (!c.getData('placed')) {
        c.setPosition(v.x + ((i + 0.5) / CLOUDS) * v.width + (i % 2 ? 120 : -80), v.y + ((i * 0.37 + 0.2) % 1) * v.height).setData('placed', true);
      }
      c.x += WIND.x * dt;
      c.y += WIND.y * dt;
      if (c.x - w / 2 > v.right + 200 || c.y - c.displayHeight / 2 > v.bottom + 200 || c.x + w / 2 < v.x - 600 || c.y + c.displayHeight / 2 < v.y - 600) {
        c.setPosition(v.x - w / 2 - Math.random() * 200, v.y + Math.random() * v.height);
      }
    });
  }

  update(dt: number): void {
    const cam = this.scene.cameras.main;
    this.ground.setTilePosition(cam.scrollX, cam.scrollY);
    this.clock += dt;
    this.driftClouds(dt);
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
    const out: Phaser.GameObjects.Image[] = [];
    // Ground details: flat painted pieces lying on the ground, under everything else.
    const details = 5 + Math.floor(rng() * 4);
    for (let i = 0; i < details; i++) {
      const x = cx * CHUNK + 40 + rng() * (CHUNK - 80);
      const y = cy * CHUNK + 40 + rng() * (CHUNK - 80);
      const key = this.map.details[Math.floor(rng() * this.map.details.length)];
      const img = this.scene.add.image(x, y, key).setDepth(1).setScale(0.8 + rng() * 0.45);
      if (rng() < 0.5) img.setFlipX(true);
      // The meadow's pieces are painted a touch brighter than its grass.
      if (this.map.index === 0) img.setTint(0xe6ecd8);
      out.push(img);
    }
    // Decorations, in groups: groves of trees, clumps of bushes and stones, a lone signpost or shrine.
    const groups = 1 + Math.floor(rng() * 2.4);
    for (let g = 0; g < groups; g++) {
      const gx = cx * CHUNK + 80 + rng() * (CHUNK - 160);
      const gy = cy * CHUNK + 80 + rng() * (CHUNK - 160);
      const key = this.map.decor[Math.floor(rng() * this.map.decor.length)];
      const count = GROVES.has(key) ? 2 + Math.floor(rng() * 3) : CLUMPS.has(key) ? 2 + Math.floor(rng() * 2) : 1;
      const spread = GROVES.has(key) ? 150 : 90;
      for (let i = 0; i < count; i++) {
        const a = rng() * Math.PI * 2;
        const d = i === 0 ? 0 : spread * (0.5 + rng() * 0.5);
        const x = gx + Math.cos(a) * d;
        const y = gy + Math.sin(a) * d * 0.6;
        // Keep the starting spot clear.
        if (Math.abs(x) < 220 && Math.abs(y) < 220) continue;
        // Farther down the screen is nearer: drawn over what stands behind it.
        const img = this.scene.add.image(x, y, key).setOrigin(0.5, 1).setDepth(2 + y / 1e6);
        img.setScale(i === 0 ? 1 : 0.8 + rng() * 0.25);
        if (rng() < 0.5) img.setFlipX(true);
        out.push(img);
      }
    }
    return out;
  }
}
