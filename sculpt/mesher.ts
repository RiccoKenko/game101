/**
 * Turns an SDF shape into a triangle mesh: Surface Nets on a regular grid, vertices projected onto the
 * true surface, normals from the field gradient (so the clay looks perfectly smooth), then simplified
 * while keeping colour seams crisp.
 */
import { MeshoptSimplifier } from 'meshoptimizer';
import type { Finish, Shape } from './sdf';

export interface MeshPart {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
  finish: Finish;
}

export interface MeshOptions {
  /** Grid cell size in world units (smaller = more detail, slower). */
  cell: number;
  /** Upper bound on triangles after simplification. */
  maxTris?: number;
  /** Largest allowed surface deviation when simplifying, in world units. Default: 30% of a cell. */
  maxError?: number;
}

await MeshoptSimplifier.ready;
MeshoptSimplifier.useExperimentalFeatures = true;

export function meshShape(shape: Shape, opts: MeshOptions): MeshPart[] {
  const { cell } = opts;
  const b = shape.bounds();
  const pad = cell * 2;
  const ox = b.min[0] - pad;
  const oy = b.min[1] - pad;
  const oz = b.min[2] - pad;
  const nx = Math.ceil((b.max[0] - b.min[0] + 2 * pad) / cell) + 1;
  const ny = Math.ceil((b.max[1] - b.min[1] + 2 * pad) / cell) + 1;
  const nz = Math.ceil((b.max[2] - b.min[2] + 2 * pad) / cell) + 1;
  const idx = (i: number, j: number, k: number) => i + nx * (j + ny * k);

  // 1. Sample the field. A coarse pass skips the empty space far from the surface.
  const field = new Float32Array(nx * ny * nz).fill(1e3);
  const step = 4;
  const reach = cell * step * 1.8;
  for (let k = 0; k < nz; k += step)
    for (let j = 0; j < ny; j += step)
      for (let i = 0; i < nx; i += step) {
        const cx = ox + (i + step / 2) * cell;
        const cy = oy + (j + step / 2) * cell;
        const cz = oz + (k + step / 2) * cell;
        const d = shape.dist(cx, cy, cz);
        const near = Math.abs(d) < reach;
        for (let kk = k; kk < Math.min(k + step + 1, nz); kk++)
          for (let jj = j; jj < Math.min(j + step + 1, ny); jj++)
            for (let ii = i; ii < Math.min(i + step + 1, nx); ii++) {
              const at = idx(ii, jj, kk);
              if (near) {
                if (field[at] === 1e3 || field[at] === -1e3) field[at] = shape.dist(ox + ii * cell, oy + jj * cell, oz + kk * cell);
              } else if (field[at] === 1e3) field[at] = d < 0 ? -1e3 : 1e3;
            }
      }

  // 2. One vertex per cell that the surface crosses, at the mean of its edge crossings.
  const cellIndex = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cidx = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos: number[] = [];
  const corner = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0], [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7], [0, 2], [1, 3], [4, 6], [5, 7], [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const v = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          v[c] = field[idx(i + corner[c][0], j + corner[c][1], k + corner[c][2])];
          if (v[c] < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0;
        let sy = 0;
        let sz = 0;
        let n = 0;
        for (const [a, bb] of edges) {
          if (v[a] < 0 === v[bb] < 0) continue;
          const t = v[a] / (v[a] - v[bb]);
          sx += corner[a][0] + (corner[bb][0] - corner[a][0]) * t;
          sy += corner[a][1] + (corner[bb][1] - corner[a][1]) * t;
          sz += corner[a][2] + (corner[bb][2] - corner[a][2]) * t;
          n++;
        }
        cellIndex[cidx(i, j, k)] = pos.length / 3;
        pos.push(ox + (i + sx / n) * cell, oy + (j + sy / n) * cell, oz + (k + sz / n) * cell);
      }

  // 3. A quad around every grid edge the surface crosses.
  const tri: number[] = [];
  const quad = (a: number, b2: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b2 < 0 || c < 0 || d < 0) return;
    const q = flip ? [a, d, c, b2] : [a, b2, c, d];
    // Split along the shorter diagonal.
    const d02 = dist2(pos, q[0], q[2]);
    const d13 = dist2(pos, q[1], q[3]);
    if (d02 <= d13) tri.push(q[0], q[1], q[2], q[0], q[2], q[3]);
    else tri.push(q[0], q[1], q[3], q[1], q[2], q[3]);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const f0 = field[idx(i, j, k)] < 0;
        if (i < nx - 1 && f0 !== field[idx(i + 1, j, k)] < 0)
          quad(cellIndex[cidx(i, j - 1, k - 1)], cellIndex[cidx(i, j, k - 1)], cellIndex[cidx(i, j, k)], cellIndex[cidx(i, j - 1, k)], !f0);
        if (j < ny - 1 && f0 !== field[idx(i, j + 1, k)] < 0)
          quad(cellIndex[cidx(i - 1, j, k - 1)], cellIndex[cidx(i - 1, j, k)], cellIndex[cidx(i, j, k)], cellIndex[cidx(i, j, k - 1)], !f0);
        if (k < nz - 1 && f0 !== field[idx(i, j, k + 1)] < 0)
          quad(cellIndex[cidx(i - 1, j - 1, k)], cellIndex[cidx(i, j - 1, k)], cellIndex[cidx(i, j, k)], cellIndex[cidx(i - 1, j, k)], !f0);
      }

  // 4. Snap vertices onto the exact surface and take normals from the gradient.
  const count = pos.length / 3;
  const positions = new Float32Array(pos);
  const normals = new Float32Array(count * 3);
  const e = cell * 0.25;
  const grad = (x: number, y: number, z: number): [number, number, number] => [
    shape.dist(x + e, y, z) - shape.dist(x - e, y, z),
    shape.dist(x, y + e, z) - shape.dist(x, y - e, z),
    shape.dist(x, y, z + e) - shape.dist(x, y, z - e),
  ];
  for (let vi = 0; vi < count; vi++) {
    let x = positions[vi * 3];
    let y = positions[vi * 3 + 1];
    let z = positions[vi * 3 + 2];
    for (let it = 0; it < 3; it++) {
      const d = shape.dist(x, y, z);
      const g = grad(x, y, z);
      const gl2 = g[0] * g[0] + g[1] * g[1] + g[2] * g[2];
      if (gl2 < 1e-12) break;
      const s = (d * 2 * e) / gl2; // gradient was computed over 2e
      const move = Math.min(Math.abs(s) * Math.sqrt(gl2), cell * 0.6);
      const gl = Math.sqrt(gl2);
      x -= (Math.sign(s) * move * g[0]) / gl;
      y -= (Math.sign(s) * move * g[1]) / gl;
      z -= (Math.sign(s) * move * g[2]) / gl;
    }
    positions[vi * 3] = x;
    positions[vi * 3 + 1] = y;
    positions[vi * 3 + 2] = z;
    const g = grad(x, y, z);
    const gl = Math.hypot(g[0], g[1], g[2]) || 1;
    normals[vi * 3] = g[0] / gl;
    normals[vi * 3 + 1] = g[1] / gl;
    normals[vi * 3 + 2] = g[2] / gl;
  }

  // 5. Paint.
  const colors = new Float32Array(count * 3);
  const finishes: Finish[] = new Array(count);
  for (let vi = 0; vi < count; vi++) {
    const s = shape.shade(positions[vi * 3], positions[vi * 3 + 1], positions[vi * 3 + 2]);
    colors.set(s.color, vi * 3);
    finishes[vi] = s.finish;
  }

  // 6. Simplify, protecting colour seams and finish boundaries.
  let indices: Uint32Array = new Uint32Array(tri);
  const attrs = new Float32Array(count * 6);
  for (let vi = 0; vi < count; vi++) {
    attrs.set(colors.subarray(vi * 3, vi * 3 + 3), vi * 6);
    attrs.set(normals.subarray(vi * 3, vi * 3 + 3), vi * 6 + 3);
  }
  const lock = new Uint8Array(count);
  for (let t = 0; t < indices.length; t += 3) {
    const a = indices[t];
    const b1 = indices[t + 1];
    const c = indices[t + 2];
    if (finishes[a] !== finishes[b1] || finishes[a] !== finishes[c]) lock[a] = lock[b1] = lock[c] = 1;
  }
  const target = opts.maxTris ? Math.min(indices.length, opts.maxTris * 3) : Math.floor(indices.length * 0.25);
  const [simplified] = MeshoptSimplifier.simplifyWithAttributes(
    indices, positions, 3, attrs, 6, [1.5, 1.5, 1.5, 0.4, 0.4, 0.4], lock, target, opts.maxError ?? cell * 0.3, ['ErrorAbsolute'],
  );
  indices = simplified;

  // 7. Split by finish (one glTF primitive per material), compacting vertices.
  const groups = new Map<Finish, number[]>();
  for (let t = 0; t < indices.length; t += 3) {
    const f = finishes[indices[t]];
    if (!groups.has(f)) groups.set(f, []);
    groups.get(f)!.push(indices[t], indices[t + 1], indices[t + 2]);
  }
  const parts: MeshPart[] = [];
  for (const [finish, list] of groups) {
    const remap = new Map<number, number>();
    const out: number[] = [];
    for (const vi of list) {
      if (!remap.has(vi)) remap.set(vi, remap.size);
      out.push(remap.get(vi)!);
    }
    const n = remap.size;
    const p = new Float32Array(n * 3);
    const no = new Float32Array(n * 3);
    const co = new Float32Array(n * 3);
    for (const [old, nw] of remap) {
      p.set(positions.subarray(old * 3, old * 3 + 3), nw * 3);
      no.set(normals.subarray(old * 3, old * 3 + 3), nw * 3);
      co.set(colors.subarray(old * 3, old * 3 + 3), nw * 3);
    }
    parts.push({ positions: p, normals: no, colors: co, indices: new Uint32Array(out), finish });
  }
  return parts;
}

function dist2(p: number[], a: number, b: number): number {
  return (p[a * 3] - p[b * 3]) ** 2 + (p[a * 3 + 1] - p[b * 3 + 1]) ** 2 + (p[a * 3 + 2] - p[b * 3 + 2]) ** 2;
}

export function triangleCount(parts: MeshPart[]): number {
  return parts.reduce((s, p) => s + p.indices.length / 3, 0);
}
