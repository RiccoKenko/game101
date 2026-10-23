import * as THREE from 'three';

/** Vertical gradient sky as the scene background. */
export function skyBackground(top = '#6fc3ff', mid = '#bfe7ff', bottom = '#e9f8ff'): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 4;
  c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, top);
  grad.addColorStop(0.55, mid);
  grad.addColorStop(1, bottom);
  g.fillStyle = grad;
  g.fillRect(0, 0, 4, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Soft cartoon cloud drawn from overlapping puffs, used on billboards. */
function cloudTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = 256;
  c.height = 128;
  const g = c.getContext('2d')!;
  const puff = (x: number, y: number, r: number) => {
    const grad = g.createRadialGradient(x, y - r * 0.3, r * 0.1, x, y, r);
    grad.addColorStop(0, 'rgba(255,255,255,1)');
    grad.addColorStop(0.75, 'rgba(250,252,255,0.95)');
    grad.addColorStop(1, 'rgba(235,244,255,0)');
    g.fillStyle = grad;
    g.beginPath();
    g.arc(x, y, r, 0, Math.PI * 2);
    g.fill();
  };
  for (const [x, y, r] of [[60, 82, 40], [110, 64, 52], [165, 74, 44], [205, 88, 32], [90, 96, 34], [145, 98, 36]]) puff(x, y, r);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

/** Drifting clouds around (mostly below) the stage, for that floating-in-the-sky feeling. */
export class Clouds {
  readonly group = new THREE.Group();
  private sprites: { s: THREE.Sprite; speed: number }[] = [];

  constructor(count = 14, spread = 14, low = -4, high = 1.5) {
    const map = cloudTexture();
    for (let i = 0; i < count; i++) {
      const mat = new THREE.SpriteMaterial({ map, transparent: true, depthWrite: false, opacity: 0.85 + Math.random() * 0.15 });
      const s = new THREE.Sprite(mat);
      const scale = 2.5 + Math.random() * 3.5;
      s.scale.set(scale * 2, scale, 1);
      const a = Math.random() * Math.PI * 2;
      const r = spread * (0.45 + Math.random() * 0.55);
      s.position.set(Math.cos(a) * r, low + Math.random() * (high - low), Math.sin(a) * r - spread * 0.3);
      this.group.add(s);
      this.sprites.push({ s, speed: 0.08 + Math.random() * 0.15 });
    }
  }

  update(dt: number, spread = 14): void {
    for (const c of this.sprites) {
      c.s.position.x += c.speed * dt;
      if (c.s.position.x > spread) c.s.position.x = -spread;
    }
  }
}
