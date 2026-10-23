/** A soft oval shadow on the ground under a character; it shrinks and fades as they leave the ground. */
import * as THREE from 'three';

let texture: THREE.CanvasTexture | undefined;

function shadowTexture(): THREE.CanvasTexture {
  if (texture) return texture;
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(30, 40, 30, 0.42)');
  grad.addColorStop(0.6, 'rgba(30, 40, 30, 0.22)');
  grad.addColorStop(1, 'rgba(30, 40, 30, 0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  texture = new THREE.CanvasTexture(c);
  return texture;
}

export class Shadow {
  readonly mesh: THREE.Mesh;

  /** `width` in world units at rest. */
  constructor(private width: number) {
    this.mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(1, 1),
      new THREE.MeshBasicMaterial({ map: shadowTexture(), transparent: true, depthTest: false, depthWrite: false }),
    );
    this.mesh.renderOrder = -10;
  }

  /** Put it at the feet; `lift` is how high they are off the ground (world units). */
  place(x: number, y: number, lift = 0): void {
    const k = Math.max(0.45, 1 - lift / (this.width * 2.2));
    this.mesh.position.set(x, y, 0);
    this.mesh.scale.set(this.width * k, this.width * 0.28 * k, 1);
    (this.mesh.material as THREE.MeshBasicMaterial).opacity = k;
  }
}
