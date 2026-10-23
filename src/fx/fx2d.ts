/** Ready-made particle bursts for the flat 2D stage (y-up world units, camera 1000 units away). */
import * as THREE from 'three';
import { Particles } from './particles';

const rand = (a: number, b: number) => a + Math.random() * (b - a);
const CAMERA_DISTANCE = 1000;

export class Fx2D {
  readonly glow = new Particles(1400, true);
  readonly soft = new Particles(700, false);
  readonly group = new THREE.Group();

  /** `u`: world units per "metre" (the presets were tuned for a hero about 0.9 m tall). */
  constructor(private u: number) {
    this.group.add(this.soft.points, this.glow.points);
  }

  /** `pixelsPerUnit`: drawing-buffer pixels per world unit. */
  update(dt: number, pixelsPerUnit: number): void {
    this.glow.update(dt, pixelsPerUnit * CAMERA_DISTANCE);
    this.soft.update(dt, pixelsPerUnit * CAMERA_DISTANCE);
  }

  private dir(x: number, y: number): THREE.Vector3 {
    return new THREE.Vector3(x, y, 0).normalize();
  }

  /** Hit sparks flying back along the impact direction, with a flash at the centre. */
  sparks(at: THREE.Vector3, color: THREE.Color, dir?: THREE.Vector3, count = 14): void {
    const u = this.u;
    for (let i = 0; i < count; i++) {
      const v = this.dir(rand(-1, 1), rand(-0.4, 1));
      if (dir) v.addScaledVector(dir, -1.3).normalize();
      this.glow.emit({
        pos: at,
        vel: v.multiplyScalar(rand(1.4, 3.6) * u),
        color,
        colorEnd: new THREE.Color(1, 0.45, 0.15),
        life: rand(0.18, 0.38),
        size: [rand(0.05, 0.09) * u, 0.01 * u],
        gravity: 5 * u,
        drag: 3,
      });
    }
    this.glow.emit({ pos: at, vel: new THREE.Vector3(), color: new THREE.Color(1, 0.95, 0.8), life: 0.12, size: [0.35 * u, 0.55 * u], alpha: [1, 0] });
  }

  /** Cartoon smoke puff. */
  poof(at: THREE.Vector3, scale = 1, count = 18): void {
    const u = this.u * scale;
    for (let i = 0; i < count; i++) {
      const v = this.dir(rand(-1, 1), rand(-0.2, 1));
      const g = rand(0.86, 1);
      this.soft.emit({
        pos: at.clone().addScaledVector(v, 0.08 * u),
        vel: v.clone().multiplyScalar(rand(0.5, 1.4) * u),
        color: new THREE.Color(g, g, g * 1.02),
        colorEnd: new THREE.Color(0.85, 0.86, 0.95),
        life: rand(0.45, 0.8),
        size: [rand(0.2, 0.3) * u, rand(0.45, 0.65) * u],
        alpha: [0.95, 0],
        drag: 3.2,
        gravity: -0.4 * u,
      });
    }
  }

  /** Kicked-up dust behind running feet. */
  dust(at: THREE.Vector3, back = -1): void {
    const u = this.u;
    this.soft.emit({
      pos: at,
      vel: new THREE.Vector3(back * rand(0.1, 0.4) * u, rand(0.15, 0.4) * u, 0),
      color: new THREE.Color(0.93, 0.89, 0.8),
      life: rand(0.35, 0.5),
      size: [0.07 * u, 0.18 * u],
      alpha: [0.65, 0],
      drag: 2,
    });
  }

  /** A ring of light spreading over the ground (skills), plus motes rising from it. */
  ring(at: THREE.Vector3, color: THREE.Color, radius = 1.4, count = 56): void {
    const u = this.u;
    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2;
      this.glow.emit({
        pos: at,
        vel: new THREE.Vector3(Math.cos(a), Math.sin(a) * 0.32, 0).multiplyScalar(radius * 2.6 * u),
        color,
        colorEnd: new THREE.Color(1, 1, 1),
        life: 0.45,
        size: [0.15 * u, 0.02 * u],
        drag: 4,
      });
    }
    for (let i = 0; i < 26; i++)
      this.glow.emit({
        pos: at.clone().add(new THREE.Vector3(rand(-0.4, 0.4) * u, rand(-0.05, 0.1) * u, 0)),
        vel: new THREE.Vector3(rand(-0.3, 0.3) * u, rand(1.5, 3.2) * u, 0),
        color,
        life: rand(0.5, 0.9),
        size: [rand(0.05, 0.1) * u, 0.01 * u],
        drag: 1.5,
      });
  }

  /** Glittering motes rising. */
  glitter(at: THREE.Vector3, color: THREE.Color, count = 6): void {
    const u = this.u;
    for (let i = 0; i < count; i++)
      this.glow.emit({
        pos: at.clone().add(new THREE.Vector3(rand(-0.1, 0.1) * u, rand(-0.06, 0.1) * u, 0)),
        vel: new THREE.Vector3(rand(-0.15, 0.15) * u, rand(0.2, 0.55) * u, 0),
        color,
        life: rand(0.5, 0.9),
        size: [rand(0.03, 0.055) * u, 0],
        drag: 1,
      });
  }

  /** Short flash where an arrow leaves the bow. */
  flash(at: THREE.Vector3, color: THREE.Color): void {
    this.glow.emit({ pos: at, vel: new THREE.Vector3(), color, life: 0.1, size: [0.2 * this.u, 0.32 * this.u], alpha: [0.9, 0] });
  }
}
