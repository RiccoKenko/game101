import * as THREE from 'three';

/**
 * Trauma-based camera shake: add trauma on impacts; the visible shake is trauma² so small bumps stay
 * subtle and big hits really rattle. Apply right before rendering and undo right after.
 */
export class Shake {
  enabled = true;
  private trauma = 0;
  private t = 0;
  private offset = new THREE.Vector3();
  private applied = false;

  constructor(private maxOffset = 0.08, private decay = 1.6) {}

  add(amount: number): void {
    if (this.enabled) this.trauma = Math.min(1, this.trauma + amount);
  }

  update(dt: number): void {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - this.decay * dt);
  }

  apply(camera: THREE.Camera): void {
    const s = this.trauma * this.trauma * this.maxOffset;
    if (s <= 0) return;
    const t = this.t * 38;
    this.offset.set(Math.sin(t * 1.1) + Math.sin(t * 2.3) * 0.5, Math.sin(t * 1.7 + 1) + Math.sin(t * 2.9) * 0.5, 0).multiplyScalar(s);
    this.offset.applyQuaternion(camera.quaternion);
    camera.position.add(this.offset);
    camera.updateMatrixWorld();
    this.applied = true;
  }

  restore(camera: THREE.Camera): void {
    if (!this.applied) return;
    camera.position.sub(this.offset);
    camera.updateMatrixWorld();
    this.applied = false;
  }
}
