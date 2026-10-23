import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { Animator } from './animator';
import { makeToy, type ToyUniforms } from './toyMaterial';

/**
 * One animated character on stage: its own skeleton clone, its own materials (so hit flashes are
 * per-character), an Animator, and a smooth "turn to face" helper.
 */
export class Actor {
  readonly root = new THREE.Group();
  readonly model: THREE.Object3D;
  readonly anim: Animator;
  private toy: ToyUniforms[];
  private flashT = 0;
  private bones = new Map<string, THREE.Object3D>();
  private yawTarget: number | null = null;

  constructor(source: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.model = cloneSkinned(source);
    this.model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        if ((m as THREE.SkinnedMesh).isSkinnedMesh) m.frustumCulled = false;
      }
      if ((o as THREE.Bone).isBone || o.type === 'Object3D') this.bones.set(o.name, o);
    });
    this.toy = makeToy(this.model);
    this.root.add(this.model);
    this.anim = new Animator(this.model, clips);
  }

  bone(name: string): THREE.Object3D | undefined {
    return this.bones.get(name);
  }

  /** World position of a bone (or the root when the bone is missing). */
  worldOf(name: string, out = new THREE.Vector3()): THREE.Vector3 {
    return (this.bones.get(name) ?? this.root).getWorldPosition(out);
  }

  flash(strength = 1): void {
    this.flashT = Math.max(this.flashT, strength);
  }

  faceYaw(yaw: number): void {
    this.yawTarget = yaw;
  }

  faceTowards(x: number, z: number): void {
    const p = this.root.position;
    this.yawTarget = Math.atan2(x - p.x, z - p.z);
  }

  update(dt: number): void {
    this.anim.update(dt);
    if (this.flashT > 0) {
      this.flashT = Math.max(0, this.flashT - dt * 9);
      const f = this.flashT > 0.5 ? 0.85 : this.flashT * 1.7;
      for (const u of this.toy) u.flash.value = f;
    }
    if (this.yawTarget !== null) {
      let d = this.yawTarget - this.root.rotation.y;
      d = Math.atan2(Math.sin(d), Math.cos(d));
      this.root.rotation.y += d * Math.min(1, dt * 12);
    }
  }
}
