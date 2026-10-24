/**
 * Draws a 2D cut-out character with Three.js: one flat, unlit sprite per part, placed every frame from the
 * skeleton. Adds what makes cut-outs feel alive: spring-swung cloth, blinking, a real bowstring and hit flashes.
 * Given an atlas of its pictures (and no bowstring), a puppet draws all its parts as one mesh: one draw call
 * instead of one per part, which keeps a road full of pirates smooth on phones.
 */
import * as THREE from 'three';
import type { Atlas } from './atlas';
import type { Pose2D } from './pose';
import { apply, fitAffine, mul, partMatrix, Skeleton2D, spritePoint, type Affine, type PartDef, type RigDef, type SpriteInfo, type Vec2 } from './rig';

export interface PuppetAssets {
  rig: RigDef;
  sprites: Record<string, SpriteInfo>;
  textures: Record<string, THREE.Texture>;
  /** All the pictures in one texture: puppets made from these assets draw in one call. */
  atlas?: Atlas;
}

// Textures hold premultiplied alpha, so edges filter cleanly and the flash can whiten without halos.
const VERT = `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const FRAG = `
uniform sampler2D map;
uniform vec3 tint;
uniform float opacity;
uniform float flash;
varying vec2 vUv;
void main() {
  vec4 t = texture2D(map, vUv);
  vec3 rgb = mix(t.rgb * tint, vec3(t.a), flash);
  gl_FragColor = vec4(rgb, t.a) * opacity;
}`;

export function spriteMaterial(map: THREE.Texture, flash: { value: number }, shade = 1): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: VERT,
    fragmentShader: FRAG,
    uniforms: { map: { value: map }, tint: { value: new THREE.Color(shade, shade, shade) }, opacity: { value: 1 }, flash },
    transparent: true,
    depthTest: false,
    depthWrite: false,
    blending: THREE.CustomBlending,
    blendSrc: THREE.OneFactor,
    blendDst: THREE.OneMinusSrcAlphaFactor,
    blendSrcAlpha: THREE.OneFactor,
    blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
  });
}

// The batched mesh: the same shading, with each part's darkening (far limbs) carried per vertex.
const BATCH_VERT = `
attribute float shade;
varying vec2 vUv;
varying float vShade;
void main() {
  vUv = uv;
  vShade = shade;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}`;
const BATCH_FRAG = `
uniform sampler2D map;
uniform vec3 tint;
uniform float opacity;
uniform float flash;
varying vec2 vUv;
varying float vShade;
void main() {
  vec4 t = texture2D(map, vUv);
  vec3 rgb = mix(t.rgb * tint * vShade, vec3(t.a), flash);
  gl_FragColor = vec4(rgb, t.a) * opacity;
}`;

/** A plane whose vertices are the sprite's own pixels, y-up, top-left at the origin. */
export function spriteGeometry(w: number, h: number): THREE.PlaneGeometry {
  return new THREE.PlaneGeometry(w, h).translate(w / 2, -h / 2, 0);
}

const toMatrix4 = (m: Affine, out: THREE.Matrix4) => out.set(m[0], m[2], 0, m[4], m[1], m[3], 0, m[5], 0, 0, 1, 0, 0, 0, 0, 1);

interface PartNode {
  def: PartDef;
  /** Its own mesh, unless the puppet draws batched. */
  mesh?: THREE.Mesh;
  visible: boolean;
  /** The part image in its bone's space. */
  local: Affine;
  /** Batched: where its picture sits in the atlas, and its darkening. */
  uv?: [number, number, number, number];
  shade: number;
}

/** One mesh holding a quad per part, rewritten every frame in drawing order. */
interface Batch {
  mesh: THREE.Mesh;
  material: THREE.ShaderMaterial;
  pos: THREE.BufferAttribute;
  uv: THREE.BufferAttribute;
  shade: THREE.BufferAttribute;
}

interface Spring {
  bone: string;
  tip: Vec2;
  gain: number;
  freq: number;
  damping: number;
  max: number;
  angle: number;
  vel: number;
  last?: Vec2;
}

const DEG = 180 / Math.PI;
const v3 = new THREE.Vector3();

export class Puppet {
  /** Place it at the character's feet; `scale` sets the size and `facing` mirrors it. */
  readonly root = new THREE.Group();
  readonly skeleton: Skeleton2D;
  facing: 1 | -1 = 1;
  size = 1;
  private parts = new Map<string, PartNode>();
  private slots = new Map<string, PartNode[]>();
  private flashU = { value: 0 };
  private order = 0;
  private springs: Spring[];
  private pose: Pose2D = {};
  private blinkIn = 2 + Math.random() * 3;
  private blinkT = -1;
  private string?: THREE.Mesh;
  private arrow?: { mesh: THREE.Mesh; sprite: SpriteInfo };
  private batch?: Batch;
  private drawList: PartNode[] = [];

  constructor(private assets: PuppetAssets) {
    const { rig, textures } = assets;
    this.skeleton = new Skeleton2D(rig);
    // A bowstring weaves between the parts, so a puppet with one keeps a mesh per part.
    const atlas = rig.string || rig.arrow ? undefined : assets.atlas;
    for (const def of rig.parts) {
      const sprite = this.sprite(def.img);
      const node: PartNode = { def, visible: true, local: partMatrix(def, sprite, this.skeleton.bone(def.bone).at), shade: def.shade ?? 1 };
      if (atlas) node.uv = atlas.rects[def.img];
      else {
        node.mesh = new THREE.Mesh(spriteGeometry(sprite.w, sprite.h), spriteMaterial(textures[def.img], this.flashU, def.shade));
        node.mesh.matrixAutoUpdate = false;
        node.mesh.frustumCulled = false;
        this.root.add(node.mesh);
      }
      this.parts.set(def.name, node);
      if (def.slot) {
        const list = this.slots.get(def.slot) ?? [];
        this.setVisible(node, list.length === 0);
        list.push(node);
        this.slots.set(def.slot, list);
      }
    }
    if (atlas) this.batch = this.makeBatch(atlas);
    this.springs = (rig.springs ?? []).map((s) => ({ ...s, angle: 0, vel: 0 }));
    if (rig.string) {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(8 * 3), 3).setUsage(THREE.DynamicDrawUsage));
      geo.setIndex([0, 1, 2, 1, 3, 2, 4, 5, 6, 5, 7, 6]);
      this.string = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ color: rig.string.color, depthTest: false, depthWrite: false, transparent: true }));
      this.string.frustumCulled = false;
      this.root.add(this.string);
    }
    if (rig.arrow) {
      const sprite = this.sprite(rig.arrow.img);
      const mesh = new THREE.Mesh(spriteGeometry(sprite.w, sprite.h), spriteMaterial(textures[rig.arrow.img], this.flashU));
      mesh.matrixAutoUpdate = false;
      mesh.frustumCulled = false;
      this.arrow = { mesh, sprite };
      this.root.add(mesh);
    }
    this.setOrder(0);
  }

  private makeBatch(atlas: Atlas): Batch {
    const n = this.parts.size;
    const geo = new THREE.BufferGeometry();
    const pos = new THREE.BufferAttribute(new Float32Array(n * 4 * 3), 3).setUsage(THREE.DynamicDrawUsage);
    const uv = new THREE.BufferAttribute(new Float32Array(n * 4 * 2), 2).setUsage(THREE.DynamicDrawUsage);
    const shade = new THREE.BufferAttribute(new Float32Array(n * 4), 1).setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute('position', pos);
    geo.setAttribute('uv', uv);
    geo.setAttribute('shade', shade);
    // Corners 0-3 of each quad: top left, top right, bottom left, bottom right.
    const index: number[] = [];
    for (let i = 0; i < n; i++) index.push(i * 4, i * 4 + 2, i * 4 + 1, i * 4 + 2, i * 4 + 3, i * 4 + 1);
    geo.setIndex(index);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), Infinity);
    const material = new THREE.ShaderMaterial({
      vertexShader: BATCH_VERT,
      fragmentShader: BATCH_FRAG,
      uniforms: { map: { value: atlas.texture }, tint: { value: new THREE.Color(1, 1, 1) }, opacity: { value: 1 }, flash: this.flashU },
      transparent: true,
      depthTest: false,
      depthWrite: false,
      blending: THREE.CustomBlending,
      blendSrc: THREE.OneFactor,
      blendDst: THREE.OneMinusSrcAlphaFactor,
      blendSrcAlpha: THREE.OneFactor,
      blendDstAlpha: THREE.OneMinusSrcAlphaFactor,
    });
    const mesh = new THREE.Mesh(geo, material);
    mesh.frustumCulled = false;
    this.root.add(mesh);
    return { mesh, material, pos, uv, shade };
  }

  /** Whether it draws all its parts in one call. */
  get batched(): boolean {
    return !!this.batch;
  }

  private setVisible(node: PartNode, visible: boolean): void {
    node.visible = visible;
    if (node.mesh) node.mesh.visible = visible;
  }

  /** How many pictures it is made of. */
  get partCount(): number {
    return this.parts.size;
  }

  /** How many pictures a slot switches between (e.g. its eye pieces). */
  slotSize(slot: string): number {
    return this.slots.get(slot)?.length ?? 0;
  }

  private sprite(img: string): SpriteInfo {
    const s = this.assets.sprites[img];
    if (!s) throw new Error(`Rig ${this.assets.rig.id}: no sprite "${img}"`);
    return s;
  }

  /** Base draw order, so characters lower on screen can draw over those behind them. */
  setOrder(base: number): void {
    this.order = base;
  }

  setPose(pose: Pose2D): void {
    this.pose = pose;
  }

  /** Colours the whole character (e.g. icy blue while chilled); white is its own colours. */
  tint(color: THREE.Color): void {
    if (this.batch) this.batch.material.uniforms.tint.value.copy(color);
    for (const n of this.parts.values())
      if (n.mesh) (n.mesh.material as THREE.ShaderMaterial).uniforms.tint.value.setRGB(color.r * n.shade, color.g * n.shade, color.b * n.shade);
  }

  /** Fades the whole character (0 = gone). */
  opacity(value: number): void {
    if (this.batch) this.batch.material.uniforms.opacity.value = value;
    for (const n of this.parts.values()) if (n.mesh) (n.mesh.material as THREE.ShaderMaterial).uniforms.opacity.value = value;
    if (this.arrow) (this.arrow.mesh.material as THREE.ShaderMaterial).uniforms.opacity.value = value;
  }

  /** Whitens the whole character for a moment (hit feedback). */
  hitFlash(amount = 1): void {
    this.flashU.value = Math.max(this.flashU.value, amount);
  }

  /** Shows one part of a slot (e.g. eyes "eyes-happy"). */
  showSlot(slot: string, part: string): void {
    for (const n of this.slots.get(slot) ?? []) this.setVisible(n, n.def.name === part);
  }

  /** A named point (see RigDef.points) in character space, from the last update. */
  point(name: string): Vec2 {
    const p = this.assets.rig.points?.[name];
    if (!p) throw new Error(`Rig ${this.assets.rig.id}: no point "${name}"`);
    const node = this.parts.get(p.part)!;
    return apply(mul(this.skeleton.world.get(node.def.bone)!, node.local), spritePoint(this.sprite(node.def.img), p.at));
  }

  /** The same point in world space. */
  worldPoint(name: string, out = new THREE.Vector3()): THREE.Vector3 {
    const [x, y] = this.point(name);
    this.root.updateMatrixWorld();
    return out.set(x, y, 0).applyMatrix4(this.root.matrixWorld);
  }

  update(dt: number): void {
    const rig = this.assets.rig;
    this.root.scale.set(this.size * this.facing, this.size, 1);

    // Cloth on springs: add their swing on top of the clip's pose.
    const pose: Pose2D = { ...this.pose, bones: { ...this.pose.bones } };
    for (const s of this.springs) {
      const b = (pose.bones![s.bone] = { ...pose.bones![s.bone] });
      b.r = (b.r ?? 0) + s.angle;
    }
    this.skeleton.solve(pose);
    this.swing(dt);

    // Slots and blinking.
    for (const [slot, part] of Object.entries(pose.slots ?? {})) this.showSlot(slot, part);
    if (rig.blink) this.blink(dt, pose.slots?.[rig.blink.slot] ?? rig.blink.open);

    if (this.batch) this.fillBatch(this.batch, pose);
    else
      for (const node of this.parts.values()) {
        toMatrix4(mul(this.skeleton.world.get(node.def.bone)!, node.local), node.mesh!.matrix);
        node.mesh!.renderOrder = this.order + (pose.z?.[node.def.name] ?? node.def.z);
      }
    this.updateString(pose);
    this.updateArrow(pose);
    this.flashU.value = Math.max(0, this.flashU.value - dt * 9);
  }

  /** Writes the shown parts' quads back to front (the same order separate meshes would draw in). */
  private fillBatch(b: Batch, pose: Pose2D): void {
    const list = this.drawList;
    list.length = 0;
    for (const n of this.parts.values()) if (n.visible) list.push(n);
    const z = (n: PartNode) => pose.z?.[n.def.name] ?? n.def.z;
    list.sort((p, q) => z(p) - z(q));
    const pos = b.pos.array as Float32Array;
    const uv = b.uv.array as Float32Array;
    const shade = b.shade.array as Float32Array;
    list.forEach((n, i) => {
      const m = mul(this.skeleton.world.get(n.def.bone)!, n.local);
      const { w, h } = this.sprite(n.def.img);
      // Part space is the picture's pixels, y up, top left at the origin: corners (0, 0), (w, 0), (0, -h), (w, -h).
      const o = i * 12;
      pos[o] = m[4];
      pos[o + 1] = m[5];
      pos[o + 3] = m[0] * w + m[4];
      pos[o + 4] = m[1] * w + m[5];
      pos[o + 6] = -m[2] * h + m[4];
      pos[o + 7] = -m[3] * h + m[5];
      pos[o + 9] = m[0] * w - m[2] * h + m[4];
      pos[o + 10] = m[1] * w - m[3] * h + m[5];
      const [u0, v0, u1, v1] = n.uv!;
      uv.set([u0, v1, u1, v1, u0, v0, u1, v0], i * 8);
      shade.fill(n.shade, i * 4, i * 4 + 4);
    });
    b.pos.needsUpdate = b.uv.needsUpdate = b.shade.needsUpdate = true;
    b.mesh.geometry.setDrawRange(0, list.length * 6);
    b.mesh.renderOrder = this.order;
  }

  private swing(dt: number): void {
    if (dt <= 0) return;
    this.root.updateMatrixWorld();
    for (const s of this.springs) {
      // Follow a point a little way down the bone, so turning the parent swings it as well as moving.
      const world = this.skeleton.world.get(s.bone)!;
      const at = this.skeleton.bone(s.bone).at;
      const dir: Vec2 = [s.tip[0] - at[0], at[1] - s.tip[1]];
      const len = Math.hypot(dir[0], dir[1]) || 1;
      const tip = apply(world, [(dir[0] / len) * 100, (dir[1] / len) * 100]);
      v3.set(tip[0], tip[1], 0).applyMatrix4(this.root.matrixWorld);
      const now: Vec2 = [v3.x / (this.size * this.facing), v3.y / this.size];
      if (s.last) {
        const vx = (now[0] - s.last[0]) / dt;
        const vy = (now[1] - s.last[1]) / dt;
        const a = this.skeleton.angle.get(s.bone)! + Math.atan2(dir[1], dir[0]);
        // Dragged behind the motion: turn away from the velocity.
        const target = Math.max(-s.max, Math.min(s.max, -s.gain * (Math.cos(a) * vy - Math.sin(a) * vx)));
        const w = 2 * Math.PI * s.freq;
        s.vel += (w * w * (target - s.angle) - 2 * s.damping * w * s.vel) * dt;
        s.angle += s.vel * dt;
      }
      s.last = now;
    }
  }

  private blink(dt: number, eyes: string): void {
    const b = this.assets.rig.blink!;
    if (eyes !== b.open) {
      this.blinkT = -1;
      return;
    }
    if (this.blinkT < 0) {
      this.blinkIn -= dt;
      if (this.blinkIn <= 0) this.blinkT = 0;
      return;
    }
    this.blinkT += dt;
    const t = this.blinkT;
    const show = t < 0.04 || (t > 0.12 && t < 0.17) ? (b.half ?? b.closed) : t < 0.12 ? b.closed : b.open;
    this.showSlot(b.slot, show);
    if (t >= 0.17) {
      this.blinkT = -1;
      this.blinkIn = 1.8 + Math.random() * 3.5;
    }
  }

  private updateString(pose: Pose2D): void {
    const s = this.assets.rig.string;
    if (!s || !this.string) return;
    const top = this.point(s.top);
    const bottom = this.point(s.bottom);
    const draw = pose.draw ?? 0;
    const rest: Vec2 = [(top[0] + bottom[0]) / 2, (top[1] + bottom[1]) / 2];
    const hand = this.point(s.nock);
    const nock: Vec2 = [rest[0] + (hand[0] - rest[0]) * draw, rest[1] + (hand[1] - rest[1]) * draw];
    const pos = (this.string.geometry.getAttribute('position') as THREE.BufferAttribute).array as Float32Array;
    const seg = (i: number, a: Vec2, b: Vec2) => {
      const l = Math.hypot(b[0] - a[0], b[1] - a[1]) || 1;
      const nx = (-(b[1] - a[1]) / l) * (s.width / 2);
      const ny = ((b[0] - a[0]) / l) * (s.width / 2);
      pos.set([a[0] + nx, a[1] + ny, 0, a[0] - nx, a[1] - ny, 0, b[0] + nx, b[1] + ny, 0, b[0] - nx, b[1] - ny, 0], i * 12);
    };
    seg(0, top, nock);
    seg(1, nock, bottom);
    this.string.geometry.getAttribute('position').needsUpdate = true;
    this.string.renderOrder = this.order + (draw > 0.05 ? s.drawnZ : s.z);
  }

  private updateArrow(pose: Pose2D): void {
    const a = this.assets.rig.arrow;
    const s = this.assets.rig.string;
    if (!a || !s || !this.arrow) return;
    const shown = (pose.arrow ?? 0) > 0.5;
    this.arrow.mesh.visible = shown;
    if (!shown) return;
    const top = this.point(s.top);
    const bottom = this.point(s.bottom);
    const hand = this.point(s.nock);
    const draw = pose.draw ?? 0;
    const nock: Vec2 = [(top[0] + bottom[0]) / 2 + (hand[0] - (top[0] + bottom[0]) / 2) * draw, (top[1] + bottom[1]) / 2 + (hand[1] - (top[1] + bottom[1]) / 2) * draw];
    const toward = this.point(a.toward);
    const l = Math.hypot(toward[0] - nock[0], toward[1] - nock[1]) || 1;
    const tip: Vec2 = [nock[0] + ((toward[0] - nock[0]) / l) * a.length, nock[1] + ((toward[1] - nock[1]) / l) * a.length];
    const m = fitAffine(spritePoint(this.arrow.sprite, a.nock), spritePoint(this.arrow.sprite, a.tip), nock, tip);
    toMatrix4(m, this.arrow.mesh.matrix);
    this.arrow.mesh.renderOrder = this.order + a.z;
  }

  /** The angle (degrees, character space) the bow is pointing, from the string to the grip. */
  aimAngle(): number {
    const a = this.assets.rig.arrow;
    if (!a) return 0;
    const s = this.assets.rig.string!;
    const top = this.point(s.top);
    const bottom = this.point(s.bottom);
    const g = this.point(a.toward);
    return Math.atan2(g[1] - (top[1] + bottom[1]) / 2, g[0] - (top[0] + bottom[0]) / 2) * DEG;
  }

  dispose(): void {
    this.root.traverse((o) => {
      if (o instanceof THREE.Mesh) {
        o.geometry.dispose();
        (o.material as THREE.Material).dispose();
      }
    });
  }
}
