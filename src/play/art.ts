/**
 * Stand-in battle pieces painted in code (pirates, towers, cannonball, crystal, range ring), in the characters'
 * style: warm brown outlines and soft cel shading. They make way for drawn art as it arrives.
 */
import * as THREE from 'three';
import type { Painted } from '../showcase/art';
import type { EnemyKind, TowerKind } from '../td/units';

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

function stroke(g: CanvasRenderingContext2D, width: number): void {
  g.lineWidth = width;
  g.strokeStyle = INK;
  g.stroke();
}

/** Eyes looking right and a cheeky grin, shared by the round pirates. */
function face(g: CanvasRenderingContext2D, y = 70): void {
  ellipse(g, 74, y, 10, 12, '#fff', 3);
  ellipse(g, 98, y, 9, 11, '#fff', 3);
  ellipse(g, 77, y + 2, 5, 7, INK);
  ellipse(g, 100, y + 2, 4.5, 6.5, INK);
  g.beginPath();
  g.arc(90, y + 14, 9, 0.15 * Math.PI, 0.85 * Math.PI);
  stroke(g, 4);
}

/** A round bean body with a darker underside, clipped to its outline; `inside` adds shirt stripes or rivets. */
function bean(g: CanvasRenderingContext2D, body: string, shade: string, inside?: () => void): void {
  ellipse(g, 64, 80, 46, 46, body, 6);
  g.save();
  g.beginPath();
  g.ellipse(64, 80, 43, 43, 0, 0, Math.PI * 2);
  g.clip();
  ellipse(g, 54, 96, 46, 40, shade);
  ellipse(g, 64, 80, 40, 38, body);
  inside?.();
  g.restore();
  g.beginPath();
  g.ellipse(64, 80, 46, 46, 0, 0, Math.PI * 2);
  stroke(g, 6);
}

/**
 * A pirate facing right, feet at the bottom centre.
 * - Deckhand: red striped shirt and blue bandana.
 * - Powder Monkey: small, brown, orange cap.
 * - Ironclad: a steel barrel of a pirate with a riveted helmet.
 * - Parrot Raider: a green parrot in a pirate hat, wings spread (it flies, so no feet).
 */
export function paintPirate(kind: EnemyKind): Painted {
  const [c, g] = canvas(128, 140);
  if (kind === 'parrot') return paintParrot(c, g);
  const monkey = kind === 'powderMonkey';
  const iron = kind === 'ironclad';
  // Feet.
  for (const x of [50, 80]) ellipse(g, x, 128, 13, 8, iron ? '#3d4250' : '#4a3328', 4);
  if (iron)
    bean(g, '#8e9aab', '#69758a', () => {
      g.fillStyle = '#5b6578';
      g.fillRect(0, 100, 128, 8);
      for (const x of [34, 54, 74, 94]) ellipse(g, x, 104, 3, 3, '#c9d2de');
    });
  else
    bean(g, monkey ? '#9a6a44' : '#d9473b', monkey ? '#7a4f30' : '#a8322c', () => {
      if (monkey) return;
      g.fillStyle = '#f6efe2';
      for (const y of [92, 108]) g.fillRect(0, y, 128, 7);
    });
  if (iron) {
    // Helmet with a visor slit the eyes peek through.
    g.beginPath();
    g.ellipse(64, 56, 46, 30, 0, Math.PI, Math.PI * 2);
    g.closePath();
    g.fillStyle = '#b5bfcc';
    g.fill();
    stroke(g, 5);
    g.fillStyle = '#2c3240';
    g.fillRect(58, 62, 56, 18);
    g.strokeRect(58, 62, 56, 18);
    ellipse(g, 78, 71, 5, 5, '#ffd36b');
    ellipse(g, 100, 71, 4.5, 4.5, '#ffd36b');
    ellipse(g, 64, 26, 8, 8, '#d9473b', 4);
    return painted(c);
  }
  // Bandana (deckhand) or powder-keg cap (monkey), knot trailing behind.
  const cap = monkey ? '#e0902f' : '#2f5fa8';
  g.fillStyle = cap;
  g.beginPath();
  g.ellipse(64, 50, 44, 22, 0, Math.PI, Math.PI * 2);
  g.fill();
  stroke(g, 5);
  ellipse(g, 20, 54, 9, 7, cap, 4);
  face(g);
  return painted(c);
}

function paintParrot(c: HTMLCanvasElement, g: CanvasRenderingContext2D): Painted {
  // Wings behind the body, spread like it is mid-flap.
  for (const [x, a] of [[34, -0.5], [92, 0.5]] as const) {
    g.save();
    g.translate(x, 78);
    g.rotate(a);
    ellipse(g, 0, -16, 16, 34, '#2f9e5a', 5);
    ellipse(g, 0, -30, 10, 14, '#3fbf6e');
    g.restore();
  }
  // Tail feathers.
  g.beginPath();
  g.moveTo(52, 112);
  g.lineTo(40, 138);
  g.lineTo(62, 128);
  g.lineTo(70, 138);
  g.lineTo(72, 112);
  g.closePath();
  g.fillStyle = '#d9473b';
  g.fill();
  stroke(g, 4);
  ellipse(g, 64, 88, 32, 34, '#3fbf6e', 6);
  ellipse(g, 64, 98, 20, 20, '#c8f0a8');
  // Head, beak, and a pirate hat.
  ellipse(g, 74, 56, 26, 24, '#d9473b', 5);
  g.beginPath();
  g.moveTo(94, 52);
  g.quadraticCurveTo(118, 54, 108, 74);
  g.quadraticCurveTo(100, 66, 92, 66);
  g.closePath();
  g.fillStyle = '#f4c34f';
  g.fill();
  stroke(g, 4);
  ellipse(g, 82, 52, 7, 8, '#fff', 3);
  ellipse(g, 84, 53, 3.5, 4.5, INK);
  g.beginPath();
  g.moveTo(42, 40);
  g.quadraticCurveTo(74, 4, 104, 38);
  g.quadraticCurveTo(74, 30, 42, 40);
  g.fillStyle = '#2b2b38';
  g.fill();
  stroke(g, 4);
  ellipse(g, 74, 26, 5, 4, '#f6efe2');
  return painted(c);
}

/** The round stone footing every tower stands on. */
function towerBase(g: CanvasRenderingContext2D, stone = '#b9b9c6', edge = '#8b8b98'): void {
  ellipse(g, 75, 170, 58, 16, edge, 5);
  g.fillStyle = stone;
  g.beginPath();
  g.moveTo(25, 168);
  g.lineTo(32, 110);
  g.lineTo(118, 110);
  g.lineTo(125, 168);
  g.closePath();
  g.fill();
  stroke(g, 5);
  g.lineWidth = 3;
  for (const [x, y, w] of [[40, 126, 30], [80, 124, 28], [55, 148, 32], [92, 149, 24]]) g.strokeRect(x, y, w, 13);
}

function pips(g: CanvasRenderingContext2D, level: number, y: number): void {
  for (let i = 0; i < level; i++) ellipse(g, 60 + i * 15, y, 5, 5, '#fff7d6', 3);
}

/** A tower on its stone spot, bottom centre at the spot's centre; one pip per level. */
export function paintTower(kind: TowerKind, level: number): Painted {
  const [c, g] = canvas(150, 190);
  ({ archer: archerTop, cannon: cannonTop, storm: stormTop, frost: frostTop })[kind](g, level);
  return painted(c);
}

function archerTop(g: CanvasRenderingContext2D, level: number): void {
  const roof = ['#a0522d', '#3f74c4', '#e0a821'][level - 1] ?? '#a0522d';
  towerBase(g);
  // Wooden lookout with a window slit.
  g.fillStyle = '#a8763f';
  g.fillRect(30, 70, 90, 42);
  g.lineWidth = 5;
  g.strokeRect(30, 70, 90, 42);
  ellipse(g, 75, 90, 7, 10, '#2c1d18');
  // Pointy roof and a pennant.
  g.fillStyle = roof;
  g.beginPath();
  g.moveTo(18, 74);
  g.lineTo(75, 14);
  g.lineTo(132, 74);
  g.closePath();
  g.fill();
  stroke(g, 5);
  g.beginPath();
  g.moveTo(75, 14);
  g.lineTo(75, 2);
  stroke(g, 5);
  g.fillStyle = '#f4c34f';
  g.beginPath();
  g.moveTo(77, 2);
  g.lineTo(100, 8);
  g.lineTo(77, 14);
  g.closePath();
  g.fill();
  stroke(g, 3);
  pips(g, level, 56);
}

function cannonTop(g: CanvasRenderingContext2D, level: number): void {
  const band = ['#a0522d', '#3f74c4', '#e0a821'][level - 1] ?? '#a0522d';
  towerBase(g);
  // Wooden deck with a rim.
  g.fillStyle = '#a8763f';
  g.fillRect(22, 92, 106, 24);
  g.lineWidth = 5;
  g.strokeRect(22, 92, 106, 24);
  g.fillStyle = band;
  g.fillRect(22, 92, 106, 7);
  g.strokeRect(22, 92, 106, 7);
  // A fat barrel tilted up to the right, on a wheel.
  g.save();
  g.translate(70, 78);
  g.rotate(-0.55);
  g.fillStyle = '#3a3f4b';
  g.beginPath();
  g.roundRect(-30, -22, 84 + level * 4, 44, 18);
  g.fill();
  stroke(g, 5);
  g.fillStyle = '#5b6375';
  g.fillRect(-12, -22, 10, 44);
  g.fillRect(36 + level * 4, -24, 12, 48);
  g.strokeRect(36 + level * 4, -24, 12, 48);
  ellipse(g, 48 + level * 4, 0, 6, 15, '#14161c');
  g.restore();
  ellipse(g, 60, 92, 18, 18, '#7a4f30', 5);
  ellipse(g, 60, 92, 6, 6, '#3b2a2a');
  pips(g, level, 104);
}

function stormTop(g: CanvasRenderingContext2D, level: number): void {
  towerBase(g, '#a9a3c9', '#7d76a3');
  // A narrowing pillar with a cup on top.
  g.fillStyle = '#c5bfe3';
  g.beginPath();
  g.moveTo(44, 112);
  g.lineTo(56, 70);
  g.lineTo(94, 70);
  g.lineTo(106, 112);
  g.closePath();
  g.fill();
  stroke(g, 5);
  ellipse(g, 75, 70, 30, 9, '#7d76a3', 4);
  // The floating crystal, bigger and brighter per level.
  const glow = g.createRadialGradient(75, 38, 4, 75, 38, 46);
  glow.addColorStop(0, 'rgba(200, 160, 255, 0.75)');
  glow.addColorStop(1, 'rgba(200, 160, 255, 0)');
  g.fillStyle = glow;
  g.fillRect(20, 0, 110, 80);
  const k = 0.85 + level * 0.1;
  g.beginPath();
  g.moveTo(75, 38 - 30 * k);
  g.lineTo(75 + 17 * k, 38);
  g.lineTo(75, 38 + 24 * k);
  g.lineTo(75 - 17 * k, 38);
  g.closePath();
  g.fillStyle = '#b48cff';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#4b2a8a';
  g.stroke();
  g.fillStyle = 'rgba(255, 255, 255, 0.7)';
  g.beginPath();
  g.moveTo(75, 38 - 24 * k);
  g.lineTo(75 + 9 * k, 34);
  g.lineTo(75, 38);
  g.closePath();
  g.fill();
  pips(g, level, 94);
}

function frostTop(g: CanvasRenderingContext2D, level: number): void {
  towerBase(g, '#cfe6f2', '#8fb4c8');
  // Icy pedestal.
  g.fillStyle = '#a9d8ef';
  g.beginPath();
  g.moveTo(40, 112);
  g.lineTo(50, 82);
  g.lineTo(100, 82);
  g.lineTo(110, 112);
  g.closePath();
  g.fill();
  stroke(g, 5);
  // A fat cloud, one more puff per level, with a snowflake.
  const puffs: [number, number, number][] = [[52, 56, 22], [98, 56, 22], [75, 44, 28], [40, 70, 16], [110, 70, 16]];
  for (const [x, y, r] of puffs.slice(0, 3 + Math.min(2, level - 1))) ellipse(g, x, y, r, r * 0.86, '#ffffff', 5);
  for (const [x, y, r] of puffs.slice(0, 3 + Math.min(2, level - 1))) ellipse(g, x, y + 2, r - 4, (r - 4) * 0.8, '#eef8ff');
  g.lineWidth = 4;
  g.strokeStyle = '#4fa8d8';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    g.beginPath();
    g.moveTo(75 - Math.cos(a) * 12, 52 - Math.sin(a) * 12);
    g.lineTo(75 + Math.cos(a) * 12, 52 + Math.sin(a) * 12);
    g.stroke();
  }
  pips(g, level, 98);
}

/** A cannonball, centred. */
export function paintBall(): Painted {
  const [c, g] = canvas(40, 40);
  ellipse(g, 20, 20, 15, 15, '#2c3038', 4);
  ellipse(g, 15, 14, 5, 4, 'rgba(255, 255, 255, 0.55)');
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

/** The cold wave a Frost Cloud sends out: a soft icy ring, centred. */
export function paintFrostWave(): Painted {
  const [c, g] = canvas(256, 256);
  const fill = g.createRadialGradient(128, 128, 60, 128, 128, 126);
  fill.addColorStop(0, 'rgba(190, 240, 255, 0)');
  fill.addColorStop(0.7, 'rgba(190, 240, 255, 0.25)');
  fill.addColorStop(0.93, 'rgba(235, 252, 255, 0.85)');
  fill.addColorStop(1, 'rgba(235, 252, 255, 0)');
  g.fillStyle = fill;
  g.fillRect(0, 0, 256, 256);
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
