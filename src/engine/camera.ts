import * as THREE from 'three';

export interface GroundBounds {
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
}

const ray = new THREE.Raycaster();
const ndc = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const hit = new THREE.Vector3();

/**
 * Tilted strategy camera: looks at `target` on the ground from a fixed pitch and yaw.
 * Players can pan and zoom (pinch) but not rotate, so the board always reads the same way.
 */
export class CameraRig {
  readonly camera = new THREE.PerspectiveCamera(34, 1, 0.5, 400);
  readonly target = new THREE.Vector3();
  distance = 60;
  minDistance = 18;
  maxDistance = 80;
  pitch = THREE.MathUtils.degToRad(54);
  yaw = 0;
  bounds: GroundBounds = { minX: -20, maxX: 20, minZ: -15, maxZ: 15 };
  private width = 1;
  private height = 1;
  /** Fling speed after a drag (world units / s). */
  private velocity = new THREE.Vector3();

  resize(width: number, height: number): void {
    this.width = Math.max(1, width);
    this.height = Math.max(1, height);
    this.camera.aspect = this.width / this.height;
    this.camera.updateProjectionMatrix();
    this.apply();
  }

  /** Distance at which the whole bounds rectangle fits on screen. */
  fitDistance(margin = 1.08): number {
    const w = (this.bounds.maxX - this.bounds.minX) * margin;
    const d = (this.bounds.maxZ - this.bounds.minZ) * margin;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const hFov = 2 * Math.atan(Math.tan(vFov / 2) * this.camera.aspect);
    const byWidth = w / 2 / Math.tan(hFov / 2);
    // Ground depth is foreshortened by sin(pitch) when seen from the camera.
    const byDepth = (d * Math.sin(this.pitch)) / 2 / Math.tan(vFov / 2);
    return Math.max(byWidth, byDepth);
  }

  apply(): void {
    this.clampTarget();
    const { camera, target, distance, pitch, yaw } = this;
    camera.position.set(
      target.x + Math.sin(yaw) * Math.cos(pitch) * distance,
      target.y + Math.sin(pitch) * distance,
      target.z + Math.cos(yaw) * Math.cos(pitch) * distance,
    );
    camera.lookAt(target);
    camera.updateMatrixWorld();
  }

  /** World point on the horizontal plane y = `y` under a screen pixel, or null when looking above it. */
  groundAt(px: number, py: number, y = 0): THREE.Vector3 | null {
    ndc.set((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1);
    ray.setFromCamera(ndc, this.camera);
    plane.constant = -y;
    return ray.ray.intersectPlane(plane, hit) ? hit.clone() : null;
  }

  raycaster(px: number, py: number): THREE.Raycaster {
    ndc.set((px / this.width) * 2 - 1, -(py / this.height) * 2 + 1);
    ray.setFromCamera(ndc, this.camera);
    return ray;
  }

  /** Keeps the ground point under the finger fixed while it moves from (px, py) to (x, y). */
  drag(x: number, y: number, px: number, py: number, dt = 1 / 60): void {
    const a = this.groundAt(px, py);
    const b = this.groundAt(x, y);
    if (!a || !b) return;
    const delta = a.sub(b);
    this.target.add(delta);
    this.velocity.copy(delta).divideScalar(Math.max(dt, 1 / 120));
    this.apply();
  }

  /** Zooms by `scale` (>1 = closer) around a screen point, and follows a moving pinch midpoint. */
  pinch(scale: number, cx: number, cy: number, pcx = cx, pcy = cy): void {
    const anchor = this.groundAt(pcx, pcy);
    this.distance = THREE.MathUtils.clamp(this.distance / scale, this.minDistance, this.maxDistance);
    this.apply();
    const now = this.groundAt(cx, cy);
    if (anchor && now) this.target.add(anchor.sub(now));
    this.velocity.set(0, 0, 0);
    this.apply();
  }

  release(): void {
    // Short flicks glide a little; long drags stop where the finger lifts.
    if (this.velocity.length() > 80) this.velocity.setLength(80);
  }

  stop(): void {
    this.velocity.set(0, 0, 0);
  }

  update(dt: number): void {
    if (this.velocity.lengthSq() < 0.01) return;
    this.target.addScaledVector(this.velocity, dt);
    this.velocity.multiplyScalar(Math.exp(-6 * dt));
    this.apply();
  }

  private clampTarget(): void {
    const b = this.bounds;
    // The further out we are, the less the player needs to pan; fully zoomed out the board is centred.
    const zoomOut = THREE.MathUtils.clamp((this.distance - this.minDistance) / (this.maxDistance - this.minDistance), 0, 1);
    const cx = (b.minX + b.maxX) / 2;
    const cz = (b.minZ + b.maxZ) / 2;
    const slackX = ((b.maxX - b.minX) / 2) * (1 - zoomOut);
    const slackZ = ((b.maxZ - b.minZ) / 2) * (1 - zoomOut);
    this.target.x = THREE.MathUtils.clamp(this.target.x, cx - slackX, cx + slackX);
    this.target.z = THREE.MathUtils.clamp(this.target.z, cz - slackZ, cz + slackZ);
  }
}
