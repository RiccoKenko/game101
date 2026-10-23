import * as THREE from 'three';

const VERT = `
attribute float aAlpha;
varying float vAlpha;
void main() {
  vAlpha = aAlpha;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
uniform vec3 uColor;
varying float vAlpha;
void main() { gl_FragColor = vec4(uColor, vAlpha * 0.9); }`;

const side = new THREE.Vector3();
const dir = new THREE.Vector3();
const toCam = new THREE.Vector3();

/** A bright ribbon that follows a moving point (arrows, dashes, dives) and fades from the tail. */
export class Trail {
  readonly mesh: THREE.Mesh;
  private pts: THREE.Vector3[] = [];
  private pos: Float32Array;
  private alpha: Float32Array;
  /** Once detached, the ribbon shrinks from the tail and the trail can be removed when `done`. */
  private detached = false;

  constructor(color: THREE.Color, private width = 0.06, private length = 14, private maxLength = Infinity) {
    this.pos = new Float32Array(length * 2 * 3);
    this.alpha = new Float32Array(length * 2);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    const index: number[] = [];
    for (let i = 0; i < length - 1; i++) index.push(i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2);
    geo.setIndex(index);
    this.mesh = new THREE.Mesh(
      geo,
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: FRAG,
        uniforms: { uColor: { value: color } },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    this.mesh.frustumCulled = false;
    this.mesh.renderOrder = 3;
  }

  get done(): boolean {
    return this.detached && this.pts.length < 2;
  }

  push(p: THREE.Vector3): void {
    if (this.detached) return;
    this.pts.unshift(p.clone());
    if (this.pts.length > this.length) this.pts.pop();
    // Keep the ribbon to a fixed length in world units, whatever the frame rate.
    let total = 0;
    for (let i = 1; i < this.pts.length; i++) {
      total += this.pts[i].distanceTo(this.pts[i - 1]);
      if (total > this.maxLength) {
        this.pts.length = i + 1;
        break;
      }
    }
  }

  detach(): void {
    this.detached = true;
  }

  update(camera: THREE.Camera): void {
    if (this.detached && this.pts.length) this.pts.pop();
    const n = this.pts.length;
    const geo = this.mesh.geometry;
    geo.setDrawRange(0, Math.max(0, (n - 1) * 6));
    if (n < 2) return;
    for (let i = 0; i < n; i++) {
      const a = this.pts[Math.max(0, i - 1)];
      const b = this.pts[Math.min(n - 1, i + 1)];
      dir.subVectors(a, b).normalize();
      toCam.subVectors(camera.position, this.pts[i]).normalize();
      side.crossVectors(dir, toCam).normalize();
      const k = 1 - i / (this.length - 1);
      const w = this.width * k;
      const p = this.pts[i];
      this.pos.set([p.x + side.x * w, p.y + side.y * w, p.z + side.z * w, p.x - side.x * w, p.y - side.y * w, p.z - side.z * w], i * 6);
      this.alpha[i * 2] = this.alpha[i * 2 + 1] = k * k;
    }
    (geo.getAttribute('position') as THREE.BufferAttribute).needsUpdate = true;
    (geo.getAttribute('aAlpha') as THREE.BufferAttribute).needsUpdate = true;
  }

  dispose(): void {
    this.mesh.geometry.dispose();
    (this.mesh.material as THREE.Material).dispose();
  }
}
