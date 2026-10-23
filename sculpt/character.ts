/**
 * Builds a rigged, animated GLB from a character recipe: mesh every piece, skin it to the bones,
 * bake the clips, compress.
 */
import { Document, NodeIO, type Material, type Node } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune, resample } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import * as THREE from 'three';
import type { ClipDef } from './anim';
import { meshShape, triangleCount, type MeshPart } from './mesher';
import type { Finish, Shape, Vec3 } from './sdf';
import { SkeletonEval } from './skeleton';

export interface BoneDef {
  name: string;
  parent?: string;
  /** Joint position in the bind pose (world space). */
  head: Vec3;
  /** End of the bone for skin weighting; defaults to the first child's head. */
  tail?: Vec3;
}

export interface PieceDef {
  name: string;
  shape: Shape;
  /** Mesh grid cell size. */
  cell: number;
  maxTris?: number;
  /** Rigidly attached to one bone... */
  bone?: string;
  /** ...or smoothly skinned across these bones. */
  skin?: string[];
  /** Higher = sharper transitions between bones when skinning (default 6). */
  sharpness?: number;
  /** Hand-written weights (e.g. a bow string that bends at the nock). */
  weigh?: (p: Vec3) => [string, number][];
}

export interface CharacterDef {
  name: string;
  bones: BoneDef[];
  pieces: PieceDef[];
  clips: ClipDef[];
}

const FPS = 30;

export const FINISH: Record<Finish, { roughness: number; metalness: number; emissive?: [number, number, number] }> = {
  soft: { roughness: 0.55, metalness: 0 },
  cloth: { roughness: 0.82, metalness: 0 },
  gloss: { roughness: 0.12, metalness: 0 },
  metal: { roughness: 0.32, metalness: 0.85 },
  glow: { roughness: 0.3, metalness: 0, emissive: [0.55, 0.55, 0.55] },
};

export async function buildCharacter(def: CharacterDef, outFile: string): Promise<{ tris: number; bytes: number }> {
  const t0 = performance.now();
  const boneIndex = new Map(def.bones.map((b, i) => [b.name, i]));
  const tails: Vec3[] = def.bones.map((b): Vec3 => b.tail ?? def.bones.find((c) => c.parent === b.name)?.head ?? [b.head[0], b.head[1] + 0.04, b.head[2]]);

  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene(def.name);
  doc.getRoot().setDefaultScene(scene);
  const root = doc.createNode(def.name);
  scene.addChild(root);

  // Bones: identity rotation in the bind pose, so clip rotations read as "relative to rest".
  const joints: Node[] = def.bones.map((b) => doc.createNode(b.name));
  def.bones.forEach((b, i) => {
    const parent = b.parent ? def.bones[boneIndex.get(b.parent)!] : undefined;
    const t = parent ? sub(b.head, parent.head) : b.head;
    joints[i].setTranslation(t);
    if (parent) joints[boneIndex.get(b.parent!)!].addChild(joints[i]);
    else root.addChild(joints[i]);
  });
  const ibm = new Float32Array(def.bones.length * 16);
  def.bones.forEach((b, i) => ibm.set(new THREE.Matrix4().makeTranslation(-b.head[0], -b.head[1], -b.head[2]).toArray(), i * 16));
  const skin = doc.createSkin('skin').setSkeleton(joints[0]);
  joints.forEach((j) => skin.addJoint(j));
  skin.setInverseBindMatrices(doc.createAccessor('ibm').setType('MAT4').setArray(ibm).setBuffer(buffer));

  const materials = new Map<Finish, Material>();
  const material = (f: Finish) => {
    if (!materials.has(f)) {
      const m = doc.createMaterial(`${def.name}_${f}`).setRoughnessFactor(FINISH[f].roughness).setMetallicFactor(FINISH[f].metalness);
      if (FINISH[f].emissive) m.setEmissiveFactor(FINISH[f].emissive!);
      materials.set(f, m);
    }
    return materials.get(f)!;
  };

  let tris = 0;
  for (const piece of def.pieces) {
    const parts = meshShape(piece.shape, { cell: piece.cell, maxTris: piece.maxTris });
    tris += triangleCount(parts);
    const mesh = doc.createMesh(piece.name);
    for (const part of parts) {
      const { joints: J, weights: W } = skinWeights(part, piece, def.bones, tails, boneIndex);
      const prim = doc
        .createPrimitive()
        .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(part.positions).setBuffer(buffer))
        .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(part.normals).setBuffer(buffer))
        .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(srgbToLinear(part.colors)).setBuffer(buffer))
        .setAttribute('JOINTS_0', doc.createAccessor().setType('VEC4').setArray(J).setBuffer(buffer))
        .setAttribute('WEIGHTS_0', doc.createAccessor().setType('VEC4').setArray(W).setBuffer(buffer))
        .setIndices(doc.createAccessor().setType('SCALAR').setArray(part.indices).setBuffer(buffer))
        .setMaterial(material(part.finish));
      mesh.addPrimitive(prim);
    }
    root.addChild(doc.createNode(piece.name).setMesh(mesh).setSkin(skin));
  }

  for (const clip of def.clips) bakeClip(doc, clip, def.bones, joints, buffer);

  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  await MeshoptEncoder.ready;
  await doc.transform(dedup(), prune({ keepLeaves: true }), resample({ tolerance: 1e-4 }), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const bin = await io.writeBinary(doc);
  const fs = await import('node:fs');
  fs.writeFileSync(outFile, bin);
  console.log(`${def.name.padEnd(12)} ${String(tris).padStart(6)} tris  ${(bin.byteLength / 1024).toFixed(0).padStart(4)} KB  ${def.clips.length} clips  ${((performance.now() - t0) / 1000).toFixed(1)}s`);
  return { tris, bytes: bin.byteLength };
}

function skinWeights(
  part: MeshPart,
  piece: PieceDef,
  bones: BoneDef[],
  tails: Vec3[],
  boneIndex: Map<string, number>,
): { joints: Uint16Array; weights: Float32Array } {
  const n = part.positions.length / 3;
  const joints = new Uint16Array(n * 4);
  const weights = new Float32Array(n * 4);
  if (piece.bone) {
    const bi = boneIndex.get(piece.bone);
    if (bi === undefined) throw new Error(`${piece.name}: unknown bone ${piece.bone}`);
    for (let v = 0; v < n; v++) {
      joints[v * 4] = bi;
      weights[v * 4] = 1;
    }
    return { joints, weights };
  }
  if (piece.weigh) {
    for (let v = 0; v < n; v++) {
      const list = piece.weigh([part.positions[v * 3], part.positions[v * 3 + 1], part.positions[v * 3 + 2]]).slice(0, 4);
      const total = list.reduce((s, [, w]) => s + w, 0) || 1;
      list.forEach(([name, w], k) => {
        joints[v * 4 + k] = boneIndex.get(name)!;
        weights[v * 4 + k] = w / total;
      });
    }
    return { joints, weights };
  }
  const cands = (piece.skin ?? []).map((name) => {
    const bi = boneIndex.get(name);
    if (bi === undefined) throw new Error(`${piece.name}: unknown bone ${name}`);
    return bi;
  });
  const power = piece.sharpness ?? 6;
  for (let v = 0; v < n; v++) {
    const p: Vec3 = [part.positions[v * 3], part.positions[v * 3 + 1], part.positions[v * 3 + 2]];
    const scored = cands
      .map((bi) => ({ bi, w: 1 / (segmentDistance(p, bones[bi].head, tails[bi]) ** power + 1e-12) }))
      .sort((a, b) => b.w - a.w)
      .slice(0, 4);
    const total = scored.reduce((s, x) => s + x.w, 0);
    scored.forEach((x, k) => {
      joints[v * 4 + k] = x.bi;
      weights[v * 4 + k] = x.w / total;
    });
  }
  return { joints, weights };
}

function bakeClip(doc: Document, clip: ClipDef, bones: BoneDef[], joints: Node[], buffer: ReturnType<Document['createBuffer']>): void {
  const frames = Math.max(2, Math.round(clip.duration * FPS) + 1);
  const times = new Float32Array(frames);
  const rot = bones.map(() => new Float32Array(frames * 4));
  const pos = bones.map(() => new Float32Array(frames * 3));
  const scl = bones.map(() => new Float32Array(frames * 3));
  const skel = new SkeletonEval(bones);
  const prev: (THREE.Quaternion | null)[] = bones.map(() => null);
  for (let f = 0; f < frames; f++) {
    // Looping clips end exactly on their first frame so the loop is seamless.
    const t = (f / (frames - 1)) * clip.duration;
    times[f] = t;
    skel.apply(clip.pose(clip.loop && f === frames - 1 ? 0 : t));
    bones.forEach((b, bi) => {
      const { t: tr, q, s } = skel.local(b.name);
      const qq = q.clone();
      // Keep successive quaternions in the same hemisphere so interpolation takes the short way round.
      if (prev[bi] && prev[bi]!.dot(qq) < 0) qq.set(-qq.x, -qq.y, -qq.z, -qq.w);
      prev[bi] = qq;
      rot[bi].set([qq.x, qq.y, qq.z, qq.w], f * 4);
      pos[bi].set([tr.x, tr.y, tr.z], f * 3);
      scl[bi].set([s.x, s.y, s.z], f * 3);
    });
  }
  const anim = doc.createAnimation(clip.name);
  const input = doc.createAccessor(`${clip.name}_t`).setType('SCALAR').setArray(times).setBuffer(buffer);
  bones.forEach((_, bi) => {
    const add = (path: 'rotation' | 'translation' | 'scale', type: 'VEC4' | 'VEC3', arr: Float32Array) => {
      const sampler = doc
        .createAnimationSampler()
        .setInput(input)
        .setOutput(doc.createAccessor().setType(type).setArray(arr).setBuffer(buffer))
        .setInterpolation('LINEAR');
      anim.addSampler(sampler).addChannel(doc.createAnimationChannel().setTargetNode(joints[bi]).setTargetPath(path).setSampler(sampler));
    };
    add('rotation', 'VEC4', rot[bi]);
    add('translation', 'VEC3', pos[bi]);
    add('scale', 'VEC3', scl[bi]);
  });
}

function segmentDistance(p: Vec3, a: Vec3, b: Vec3): number {
  const ab = sub(b, a);
  const ap = sub(p, a);
  const l2 = ab[0] ** 2 + ab[1] ** 2 + ab[2] ** 2;
  const t = l2 === 0 ? 0 : Math.max(0, Math.min(1, (ap[0] * ab[0] + ap[1] * ab[1] + ap[2] * ab[2]) / l2));
  return Math.hypot(ap[0] - ab[0] * t, ap[1] - ab[1] * t, ap[2] - ab[2] * t);
}

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];

export function srgbToLinear(c: Float32Array): Float32Array {
  const out = new Float32Array(c.length);
  for (let i = 0; i < c.length; i++) out[i] = c[i] <= 0.04045 ? c[i] / 12.92 : ((c[i] + 0.055) / 1.055) ** 2.4;
  return out;
}
