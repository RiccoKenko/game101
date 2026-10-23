/** Evaluates a pose on the bone hierarchy: keyframed rotations, then IK reaches and aim goals. */
import * as THREE from 'three';
import type { Pose } from './anim';
import type { BoneDef } from './character';

const v1 = new THREE.Vector3();
const v2 = new THREE.Vector3();
const qa = new THREE.Quaternion();
const m4 = new THREE.Matrix4();

export class SkeletonEval {
  readonly root = new THREE.Object3D();
  readonly nodes = new Map<string, THREE.Object3D>();
  private bind = new Map<string, THREE.Vector3>();
  private parentOf = new Map<string, string | undefined>();

  constructor(private bones: BoneDef[]) {
    for (const b of bones) {
      const o = new THREE.Object3D();
      o.name = b.name;
      this.nodes.set(b.name, o);
      this.bind.set(b.name, new THREE.Vector3(...b.head));
      this.parentOf.set(b.name, b.parent);
      (b.parent ? this.nodes.get(b.parent)! : this.root).add(o);
    }
  }

  apply(pose: Pose): void {
    for (const b of this.bones) {
      const o = this.nodes.get(b.name)!;
      const base = this.bind.get(b.name)!.clone();
      if (b.parent) base.sub(this.bind.get(b.parent)!);
      const bp = pose[b.name] ?? {};
      o.position.copy(base);
      if (bp.p) o.position.add(v1.set(...bp.p));
      const r = bp.r ?? [0, 0, 0];
      o.rotation.set(THREE.MathUtils.degToRad(r[0]), THREE.MathUtils.degToRad(r[1]), THREE.MathUtils.degToRad(r[2]), 'YXZ');
      const s = bp.s ?? 1;
      if (typeof s === 'number') o.scale.setScalar(s);
      else o.scale.set(...s);
    }
    this.root.updateMatrixWorld(true);
    for (const b of this.bones) {
      const bp = pose[b.name];
      if (bp?.ik && (bp.ik.w ?? 1) > 0) this.solveIk(b.name, bp.ik.target, bp.ik.pole, bp.ik.w ?? 1);
      if (bp?.aim && (bp.aim.w ?? 1) > 0) this.solveAim(b.name, bp.aim.fwd, bp.aim.up, bp.aim.w ?? 1);
    }
  }

  local(name: string): { t: THREE.Vector3; q: THREE.Quaternion; s: THREE.Vector3 } {
    const o = this.nodes.get(name)!;
    return { t: o.position, q: o.quaternion, s: o.scale };
  }

  world(name: string): THREE.Vector3 {
    return this.nodes.get(name)!.getWorldPosition(new THREE.Vector3());
  }

  private solveIk(endName: string, target: [number, number, number], pole: [number, number, number], w: number): void {
    const lowerName = this.parentOf.get(endName)!;
    const upperName = this.parentOf.get(lowerName)!;
    const upper = this.nodes.get(upperName)!;
    const lower = this.nodes.get(lowerName)!;
    const bindA = this.bind.get(upperName)!;
    const bindB = this.bind.get(lowerName)!;
    const bindC = this.bind.get(endName)!;
    const l1 = bindB.distanceTo(bindA);
    const l2 = bindC.distanceTo(bindB);

    const a = upper.getWorldPosition(new THREE.Vector3());
    const T = new THREE.Vector3(...target);
    const toT = T.clone().sub(a);
    const d = THREE.MathUtils.clamp(toT.length(), Math.abs(l1 - l2) + 1e-4, l1 + l2 - 1e-4);
    const u = toT.normalize();
    const pv = new THREE.Vector3(...pole).sub(a);
    const v = pv.sub(u.clone().multiplyScalar(pv.dot(u)));
    if (v.lengthSq() < 1e-10) v.set(0, 0, 1).sub(u.clone().multiplyScalar(u.z));
    v.normalize();
    const cosA = THREE.MathUtils.clamp((l1 * l1 + d * d - l2 * l2) / (2 * l1 * d), -1, 1);
    const sinA = Math.sqrt(1 - cosA * cosA);
    const elbow = a.clone().addScaledVector(u, l1 * cosA).addScaledVector(v, l1 * sinA);
    const hand = a.clone().addScaledVector(u, d);

    const orient = (node: THREE.Object3D, bindDir: THREE.Vector3, worldDir: THREE.Vector3) => {
      const parentQ = node.parent!.getWorldQuaternion(new THREE.Quaternion());
      const localDir = worldDir.clone().applyQuaternion(parentQ.invert()).normalize();
      qa.setFromUnitVectors(bindDir.clone().normalize(), localDir);
      node.quaternion.slerp(qa, w);
      node.updateMatrixWorld(true);
    };
    orient(upper, v1.copy(bindB).sub(bindA), v2.copy(elbow).sub(a));
    const b = lower.getWorldPosition(new THREE.Vector3());
    orient(lower, v1.copy(bindC).sub(bindB), v2.copy(hand).sub(b));
  }

  private solveAim(name: string, fwd: [number, number, number], up: [number, number, number], w: number): void {
    const node = this.nodes.get(name)!;
    const z = new THREE.Vector3(...fwd).normalize();
    const x = new THREE.Vector3(...up).cross(z).normalize();
    const y = z.clone().cross(x);
    const wanted = new THREE.Quaternion().setFromRotationMatrix(m4.makeBasis(x, y, z));
    const parentQ = node.parent!.getWorldQuaternion(new THREE.Quaternion());
    const local = parentQ.invert().multiply(wanted);
    node.quaternion.slerp(local, w);
    node.updateMatrixWorld(true);
  }
}
