import * as THREE from 'three';

/** Per-instance knobs added to a standard material: soft rim light and a white hit flash. */
export interface ToyUniforms {
  rim: { value: THREE.Color };
  flash: { value: number };
}

/**
 * Gives a MeshStandardMaterial the soft-toy look: a gentle fresnel rim so characters separate from the
 * ground, and a `flash` uniform (0..1) that washes the surface to white when something gets hit.
 */
export function toyMaterial(source: THREE.Material, rim = new THREE.Color(0.22, 0.2, 0.18)): THREE.MeshStandardMaterial {
  const m = (source as THREE.MeshStandardMaterial).clone();
  const uniforms: ToyUniforms = { rim: { value: rim.clone() }, flash: { value: 0 } };
  m.userData.toy = uniforms;
  m.onBeforeCompile = (shader) => {
    shader.uniforms.uRim = uniforms.rim;
    shader.uniforms.uFlash = uniforms.flash;
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', '#include <common>\nuniform vec3 uRim;\nuniform float uFlash;')
      .replace(
        '#include <opaque_fragment>',
        `float rimF = pow(1.0 - saturate(dot(normal, normalize(vViewPosition))), 2.6);
outgoingLight += uRim * rimF;
outgoingLight = mix(outgoingLight, vec3(1.0), uFlash);
#include <opaque_fragment>`,
      );
  };
  // Same shader for every toy material, different uniforms.
  m.customProgramCacheKey = () => 'toy';
  return m;
}

/** Clones and toy-patches every material under `root`, so this instance can flash on its own. */
export function makeToy(root: THREE.Object3D): ToyUniforms[] {
  const out: ToyUniforms[] = [];
  const done = new Map<THREE.Material, THREE.Material>();
  root.traverse((o) => {
    const mesh = o as THREE.Mesh;
    if (!mesh.isMesh) return;
    const swap = (mat: THREE.Material) => {
      if (!done.has(mat)) {
        const toy = toyMaterial(mat);
        done.set(mat, toy);
        out.push(toy.userData.toy as ToyUniforms);
      }
      return done.get(mat)!;
    };
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material);
  });
  return out;
}
