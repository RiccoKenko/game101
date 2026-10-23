/**
 * Stand-in battle pieces painted in code (pirates, archer tower, crystal, range ring), in the characters'
 * style: warm brown outlines and soft cel shading. They make way for drawn art as it arrives.
 */
import * as THREE from 'three';
import type { Painted } from '../showcase/art';

const INK = '#3b2a2a';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  g.lineJoin = 'round';
  g.lineCap = 'round';
  return [c, g];
}

function texture(c: HTMLCanvasElement): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.premultiplyAlpha = true;
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

const painted = (c: HTMLCanvasElement): Painted => ({ texture: texture(c), w: c.width, h: c.height });

function ellipse(g: CanvasRenderingContext2D, x: number, y: number, rx: number, ry: number, fill: string, line = 0): void {
  g.beginPath();
  g.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  g.fillStyle = fill;
  g.fill();
  if (line) {
    g.lineWidth = line;
    g.strokeStyle = INK;
    g.stroke();
  }
}

/** A round pirate facing right, feet at the bottom centre. Deckhand: red shirt and bandana; Powder Monkey: small and brown. */
export function paintPirate(kind: 'deckhand' | 'powderMonkey'): Painted {
  const monkey = kind === 'powderMonkey';
  const [c, g] = canvas(128, 140);
  const body = monkey ? '#9a6a44' : '#d9473b';
  const shade = monkey ? '#7a4f30' : '#a8322c';
  // Feet.
  ellipse(g, 50, 128, 13, 8, '#4a3328', 4);
  ellipse(g, 80, 128, 13, 8, '#4a3328', 4);
  // Body: a round bean with a striped shirt.
  ellipse(g, 64, 80, 46, 46, body, 6);
  g.save();
  g.beginPath();
  g.ellipse(64, 80, 43, 43, 0, 0, Math.PI * 2);
  g.clip();
  ellipse(g, 54, 96, 46, 40, shade);
  ellipse(g, 64, 80, 40, 38, body);
  if (!monkey) {
    g.fillStyle = '#f6efe2';
    for (const y of [92, 108]) g.fillRect(0, y, 128, 7);
  }
  g.restore();
  g.lineWidth = 6;
  g.strokeStyle = INK;
  g.beginPath();
  g.ellipse(64, 80, 46, 46, 0, 0, Math.PI * 2);
  g.stroke();
  // Bandana (deckhand) or powder-keg cap (monkey), knot trailing behind.
  g.fillStyle = monkey ? '#e0902f' : '#2f5fa8';
  g.beginPath();
  g.ellipse(64, 50, 44, 22, 0, Math.PI, Math.PI * 2);
  g.fill();
  g.lineWidth = 5;
  g.stroke();
  ellipse(g, 20, 54, 9, 7, monkey ? '#e0902f' : '#2f5fa8', 4);
  // Eyes looking right, and a cheeky grin.
  ellipse(g, 74, 70, 10, 12, '#fff', 3);
  ellipse(g, 98, 70, 9, 11, '#fff', 3);
  ellipse(g, 77, 72, 5, 7, INK);
  ellipse(g, 100, 72, 4.5, 6.5, INK);
  g.lineWidth = 4;
  g.strokeStyle = INK;
  g.beginPath();
  g.arc(90, 84, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  g.stroke();
  return painted(c);
}

/** An archer tower that sits on a round stone spot, bottom centre at the spot's centre. Roof colour by level. */
export function paintTower(level: number): Painted {
  const [c, g] = canvas(150, 190);
  const roof = ['#a0522d', '#3f74c4', '#e0a821'][level - 1] ?? '#a0522d';
  // Stone base.
  ellipse(g, 75, 170, 58, 16, '#8b8b98', 5);
  g.fillStyle = '#b9b9c6';
  g.beginPath();
  g.moveTo(25, 168);
  g.lineTo(32, 96);
  g.lineTo(118, 96);
  g.lineTo(125, 168);
  g.closePath();
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = INK;
  g.stroke();
  g.lineWidth = 3;
  for (const [x, y, w] of [[40, 120, 30], [80, 118, 28], [55, 145, 32], [92, 146, 24]]) g.strokeRect(x, y, w, 14);
  // Wooden lookout with a window slit.
  g.fillStyle = '#a8763f';
  g.fillRect(30, 70, 90, 32);
  g.lineWidth = 5;
  g.strokeRect(30, 70, 90, 32);
  ellipse(g, 75, 86, 7, 10, '#2c1d18');
  // Pointy roof and a pennant; one pip per level.
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(18, 74);
  g.lineTo(75, 14);
  g.lineTo(132, 74);
  g.closePath();
  g.fill();
  g.stroke();
  g.beginPath();
  g.moveTo(75, 14);
  g.lineTo(75, 2);
  g.stroke();
  g.fillStyle = '#f4c34f';
  g.beginPath();
  g.moveTo(77, 2);
  g.lineTo(100, 8);
  g.lineTo(77, 14);
  g.closePath();
  g.fill();
  g.lineWidth = 3;
  g.stroke();
  for (let i = 0; i < level; i++) ellipse(g, 60 + i * 15, 56, 5, 5, '#fff7d6', 3);
  return painted(c);
}

/** A glowing Sky Crystal, centred. */
export function paintCrystal(): Painted {
  const [c, g] = canvas(64, 80);
  const glow = g.createRadialGradient(32, 40, 4, 32, 40, 32);
  glow.addColorStop(0, 'rgba(120, 255, 250, 0.6)');
  glow.addColorStop(1, 'rgba(120, 255, 250, 0)');
  g.fillStyle = glow;
  g.fillRect(0, 0, 64, 80);
  g.beginPath();
  g.moveTo(32, 6);
  g.lineTo(52, 36);
  g.lineTo(32, 74);
  g.lineTo(12, 36);
  g.closePath();
  g.fillStyle = '#6ff0ff';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#1d6f7a';
  g.stroke();
  g.fillStyle = 'rgba(255, 255, 255, 0.75)';
  g.beginPath();
  g.moveTo(32, 12);
  g.lineTo(42, 34);
  g.lineTo(32, 40);
  g.closePath();
  g.fill();
  return painted(c);
}

/** A soft ring showing a tower's reach. */
export function paintRing(): Painted {
  const [c, g] = canvas(256, 256);
  const fill = g.createRadialGradient(128, 128, 90, 128, 128, 126);
  fill.addColorStop(0, 'rgba(255, 255, 255, 0.05)');
  fill.addColorStop(0.9, 'rgba(255, 255, 255, 0.22)');
  fill.addColorStop(1, 'rgba(255, 255, 255, 0)');
  g.fillStyle = fill;
  g.fillRect(0, 0, 256, 256);
  g.lineWidth = 4;
  g.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  g.setLineDash([14, 10]);
  g.beginPath();
  g.arc(128, 128, 122, 0, Math.PI * 2);
  g.stroke();
  return painted(c);
}
