/** Static (unrigged) models: islands, projectiles, pickups... One root node per prop, cloned by name at runtime. */
import { Document, NodeIO, type Material } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, meshopt, prune } from '@gltf-transform/functions';
import { MeshoptEncoder } from 'meshoptimizer';
import fs from 'node:fs';
import { FINISH, srgbToLinear } from './character';
import { meshShape, triangleCount } from './mesher';
import type { Finish, Shape } from './sdf';

export interface PropDef {
  name: string;
  pieces: { shape: Shape; cell: number; maxTris?: number }[];
}

export async function buildProps(file: string, props: PropDef[]): Promise<void> {
  const t0 = performance.now();
  const doc = new Document();
  const buffer = doc.createBuffer();
  const scene = doc.createScene('props');
  doc.getRoot().setDefaultScene(scene);
  const materials = new Map<Finish, Material>();
  const material = (f: Finish) => {
    if (!materials.has(f)) {
      const m = doc.createMaterial(`prop_${f}`).setRoughnessFactor(FINISH[f].roughness).setMetallicFactor(FINISH[f].metalness);
      if (FINISH[f].emissive) m.setEmissiveFactor(FINISH[f].emissive!);
      materials.set(f, m);
    }
    return materials.get(f)!;
  };
  let tris = 0;
  for (const prop of props) {
    const node = doc.createNode(prop.name);
    scene.addChild(node);
    const mesh = doc.createMesh(prop.name);
    for (const piece of prop.pieces) {
      const parts = meshShape(piece.shape, { cell: piece.cell, maxTris: piece.maxTris });
      tris += triangleCount(parts);
      for (const part of parts) {
        mesh.addPrimitive(
          doc
            .createPrimitive()
            .setAttribute('POSITION', doc.createAccessor().setType('VEC3').setArray(part.positions).setBuffer(buffer))
            .setAttribute('NORMAL', doc.createAccessor().setType('VEC3').setArray(part.normals).setBuffer(buffer))
            .setAttribute('COLOR_0', doc.createAccessor().setType('VEC3').setArray(srgbToLinear(part.colors)).setBuffer(buffer))
            .setIndices(doc.createAccessor().setType('SCALAR').setArray(part.indices).setBuffer(buffer))
            .setMaterial(material(part.finish)),
        );
      }
    }
    node.setMesh(mesh);
  }
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ 'meshopt.encoder': MeshoptEncoder });
  await MeshoptEncoder.ready;
  await doc.transform(dedup(), prune(), meshopt({ encoder: MeshoptEncoder, level: 'medium' }));
  const bin = await io.writeBinary(doc);
  fs.writeFileSync(file, bin);
  console.log(`${file.split('/').pop()!.padEnd(16)} ${String(tris).padStart(6)} tris  ${(bin.byteLength / 1024).toFixed(0).padStart(4)} KB  ${props.length} props  ${((performance.now() - t0) / 1000).toFixed(1)}s`);
}
