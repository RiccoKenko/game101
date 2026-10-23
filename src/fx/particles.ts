import * as THREE from 'three';

export interface Emit {
  pos: THREE.Vector3;
  vel: THREE.Vector3;
  color: THREE.Color;
  /** Colour at the end of life (defaults to `color`). */
  colorEnd?: THREE.Color;
  life: number;
  /** World-space size at birth and at death. */
  size: [number, number];
  alpha?: [number, number];
  gravity?: number;
  /** Fraction of speed lost per second. */
  drag?: number;
}

const VERT = `
attribute float aSize;
attribute float aAlpha;
attribute vec3 aColor;
uniform float uScale;
varying vec3 vColor;
varying float vAlpha;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  gl_Position = projectionMatrix * mv;
  gl_PointSize = aSize * uScale / max(0.001, -mv.z);
  vColor = aColor;
  vAlpha = aAlpha;
}`;

const FRAG_ADD = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.0, d) * vAlpha;
  float core = smoothstep(0.22, 0.0, d);
  gl_FragColor = vec4((vColor + core * 0.6) * a, a);
}`;

const FRAG_SOFT = `
varying vec3 vColor;
varying float vAlpha;
void main() {
  float d = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.18, d) * vAlpha;
  gl_FragColor = vec4(vColor, a);
}`;

/**
 * A pool of camera-facing soft particles drawn in one call. `additive` pools glow (sparks, magic);
 * soft pools are for smoke, dust and puffs.
 */
export class Particles {
  readonly points: THREE.Points;
  private material: THREE.ShaderMaterial;
  private n = 0;
  private pos: Float32Array;
  private col: Float32Array;
  private size: Float32Array;
  private alpha: Float32Array;
  private vel: Float32Array;
  private age: Float32Array;
  private life: Float32Array;
  private grav: Float32Array;
  private drag: Float32Array;
  private s0: Float32Array;
  private s1: Float32Array;
  private a0: Float32Array;
  private a1: Float32Array;
  private c0: Float32Array;
  private c1: Float32Array;

  constructor(private max: number, additive: boolean) {
    this.pos = new Float32Array(max * 3);
    this.col = new Float32Array(max * 3);
    this.size = new Float32Array(max);
    this.alpha = new Float32Array(max);
    this.vel = new Float32Array(max * 3);
    this.age = new Float32Array(max);
    this.life = new Float32Array(max);
    this.grav = new Float32Array(max);
    this.drag = new Float32Array(max);
    this.s0 = new Float32Array(max);
    this.s1 = new Float32Array(max);
    this.a0 = new Float32Array(max);
    this.a1 = new Float32Array(max);
    this.c0 = new Float32Array(max * 3);
    this.c1 = new Float32Array(max * 3);
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.pos, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aColor', new THREE.BufferAttribute(this.col, 3).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1).setUsage(THREE.DynamicDrawUsage));
    geo.setAttribute('aAlpha', new THREE.BufferAttribute(this.alpha, 1).setUsage(THREE.DynamicDrawUsage));
    this.material = new THREE.ShaderMaterial({
      vertexShader: VERT,
      fragmentShader: additive ? FRAG_ADD : FRAG_SOFT,
      uniforms: { uScale: { value: 500 } },
      transparent: true,
      depthWrite: false,
      blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    });
    this.points = new THREE.Points(geo, this.material);
    this.points.frustumCulled = false;
    this.points.renderOrder = additive ? 3 : 2;
  }

  emit(e: Emit): void {
    if (this.n >= this.max) return;
    const i = this.n++;
    this.pos.set([e.pos.x, e.pos.y, e.pos.z], i * 3);
    this.vel.set([e.vel.x, e.vel.y, e.vel.z], i * 3);
    this.age[i] = 0;
    this.life[i] = e.life;
    this.grav[i] = e.gravity ?? 0;
    this.drag[i] = e.drag ?? 0;
    this.s0[i] = e.size[0];
    this.s1[i] = e.size[1];
    this.a0[i] = e.alpha?.[0] ?? 1;
    this.a1[i] = e.alpha?.[1] ?? 0;
    const end = e.colorEnd ?? e.color;
    this.c0.set([e.color.r, e.color.g, e.color.b], i * 3);
    this.c1.set([end.r, end.g, end.b], i * 3);
  }

  /** `scale` converts world size to pixels for a particle one unit from the camera (sizes shrink with depth). */
  update(dt: number, scale: number): void {
    this.material.uniforms.uScale.value = scale;
    let i = 0;
    while (i < this.n) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        this.swapRemove(i);
        continue;
      }
      const k = this.age[i] / this.life[i];
      const damp = Math.exp(-this.drag[i] * dt);
      this.vel[i * 3] *= damp;
      this.vel[i * 3 + 1] = this.vel[i * 3 + 1] * damp - this.grav[i] * dt;
      this.vel[i * 3 + 2] *= damp;
      this.pos[i * 3] += this.vel[i * 3] * dt;
      this.pos[i * 3 + 1] += this.vel[i * 3 + 1] * dt;
      this.pos[i * 3 + 2] += this.vel[i * 3 + 2] * dt;
      this.size[i] = this.s0[i] + (this.s1[i] - this.s0[i]) * k;
      this.alpha[i] = this.a0[i] + (this.a1[i] - this.a0[i]) * k;
      for (let c = 0; c < 3; c++) this.col[i * 3 + c] = this.c0[i * 3 + c] + (this.c1[i * 3 + c] - this.c0[i * 3 + c]) * k;
      i++;
    }
    const geo = this.points.geometry;
    geo.setDrawRange(0, this.n);
    for (const name of ['position', 'aColor', 'aSize', 'aAlpha']) (geo.getAttribute(name) as THREE.BufferAttribute).needsUpdate = true;
  }

  private swapRemove(i: number): void {
    const j = --this.n;
    if (i === j) return;
    const copy = (arr: Float32Array, w: number) => arr.copyWithin(i * w, j * w, j * w + w);
    for (const [arr, w] of [
      [this.pos, 3], [this.col, 3], [this.vel, 3], [this.c0, 3], [this.c1, 3], [this.size, 1], [this.alpha, 1], [this.age, 1],
      [this.life, 1], [this.grav, 1], [this.drag, 1], [this.s0, 1], [this.s1, 1], [this.a0, 1], [this.a1, 1],
    ] as [Float32Array, number][])
      copy(arr, w);
  }
}
