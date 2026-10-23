/** A lightning bolt between two points: a jagged glowing ribbon with a white core that flickers out. */
import * as THREE from 'three';

function strip(points: THREE.Vector3[], width: number): THREE.BufferGeometry {
  const pos = new Float32Array(points.length * 2 * 3);
  const side = new THREE.Vector3();
  points.forEach((p, i) => {
    const a = points[Math.max(0, i - 1)];
    const b = points[Math.min(points.length - 1, i + 1)];
    side.set(-(b.y - a.y), b.x - a.x, 0).normalize().multiplyScalar(width / 2);
    pos.set([p.x + side.x, p.y + side.y, 0, p.x - side.x, p.y - side.y, 0], i * 6);
  });
  const index: number[] = [];
  for (let i = 0; i < points.length - 1; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setIndex(index);
  return geo;
}

export class Bolt {
  readonly group = new THREE.Group();
  private age = 0;
  private mats: THREE.MeshBasicMaterial[] = [];

  /** `from`/`to` in world units; `width` of the outer glow. */
  constructor(from: THREE.Vector3, to: THREE.Vector3, color: THREE.Color, width = 10, private life = 0.2) {
    const len = from.distanceTo(to);
    const dir = to.clone().sub(from).normalize();
    const side = new THREE.Vector3(-dir.y, dir.x, 0);
    const n = Math.max(4, Math.round(len / 22));
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= n; i++) {
      const jag = i === 0 || i === n ? 0 : (Math.random() - 0.5) * Math.min(28, len * 0.16);
      points.push(from.clone().lerp(to, i / n).addScaledVector(side, jag));
    }
    // A solid coloured glow (so it keeps its colour over grass) with an additive white-hot core.
    for (const [w, c, blending] of [[width, color, THREE.NormalBlending], [width * 0.35, new THREE.Color(1, 1, 1), THREE.AdditiveBlending]] as const) {
      const mat = new THREE.MeshBasicMaterial({ color: c, transparent: true, blending, depthTest: false, depthWrite: false });
      this.mats.push(mat);
      this.group.add(new THREE.Mesh(strip(points, w), mat));
    }
  }

  get done(): boolean {
    return this.age >= this.life;
  }

  set renderOrder(o: number) {
    this.group.children.forEach((m, i) => (m.renderOrder = o + i));
  }

  update(dt: number): void {
    this.age += dt;
    const k = Math.max(0, 1 - this.age / this.life);
    const flicker = 0.65 + 0.35 * Math.sin(this.age * 90);
    for (const m of this.mats) m.opacity = k * flicker;
  }

  dispose(): void {
    for (const m of this.group.children as THREE.Mesh[]) m.geometry.dispose();
    for (const m of this.mats) m.dispose();
  }
}
