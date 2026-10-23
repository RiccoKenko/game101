/**
 * Stand-in battle pieces painted in code (pirates, towers, cannonball, crystal, range ring), in the characters'
 * style: warm brown outlines and soft cel shading. They make way for drawn art as it arrives.
 */
import * as THREE from 'three';
import type { Painted } from '../showcase/art';
import type { Branch, EnemyKind, TowerKind } from '../td/units';

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
 * - First Mate: the boss, a broad pirate in a long red coat and tricorn hat, with an eyepatch and a big beard.
 */
export function paintPirate(kind: EnemyKind): Painted {
  const [c, g] = canvas(128, 140);
  if (kind === 'parrot') return paintParrot(c, g);
  if (kind === 'firstMate') return paintFirstMate(c, g);
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

function paintFirstMate(c: HTMLCanvasElement, g: CanvasRenderingContext2D): Painted {
  // Boots planted wide.
  for (const x of [44, 84]) ellipse(g, x, 129, 15, 9, '#2f2a2e', 4);
  // Long coat flaring out below a round body.
  g.beginPath();
  g.moveTo(22, 124);
  g.quadraticCurveTo(14, 70, 64, 52);
  g.quadraticCurveTo(114, 70, 106, 124);
  g.closePath();
  g.fillStyle = '#b8322b';
  g.fill();
  stroke(g, 6);
  // Shirt and belt in the coat's opening, gold buttons down both sides.
  g.beginPath();
  g.moveTo(52, 124);
  g.lineTo(58, 66);
  g.lineTo(70, 66);
  g.lineTo(76, 124);
  g.closePath();
  g.fillStyle = '#f6efe2';
  g.fill();
  stroke(g, 4);
  g.fillStyle = '#4a3328';
  g.fillRect(24, 96, 80, 11);
  g.strokeRect(24, 96, 80, 11);
  g.fillStyle = '#f4c34f';
  g.fillRect(57, 94, 14, 15);
  g.strokeRect(57, 94, 14, 15);
  for (const [x, y] of [[44, 78], [42, 116], [84, 78], [86, 116]]) ellipse(g, x, y, 4, 4, '#f4c34f', 2);
  // Big round head with a beard.
  ellipse(g, 66, 42, 30, 28, '#f2c393', 5);
  g.beginPath();
  g.moveTo(40, 46);
  g.quadraticCurveTo(44, 84, 70, 82);
  g.quadraticCurveTo(96, 80, 94, 46);
  g.quadraticCurveTo(80, 60, 68, 56);
  g.quadraticCurveTo(54, 60, 40, 46);
  g.fillStyle = '#3b2a22';
  g.fill();
  stroke(g, 4);
  // Eye, eyepatch and a scowl.
  ellipse(g, 82, 38, 6, 7, '#fff', 3);
  ellipse(g, 84, 39, 3, 4, INK);
  g.beginPath();
  g.moveTo(76, 30);
  g.lineTo(90, 33);
  stroke(g, 4);
  ellipse(g, 62, 38, 8, 7, '#2b2b38', 3);
  g.beginPath();
  g.moveTo(40, 30);
  g.lineTo(94, 46);
  stroke(g, 3);
  // Tricorn hat with a gold trim and a skull.
  g.beginPath();
  g.moveTo(26, 28);
  g.quadraticCurveTo(66, -6, 108, 26);
  g.quadraticCurveTo(66, 14, 26, 28);
  g.fillStyle = '#2b2b38';
  g.fill();
  stroke(g, 5);
  g.beginPath();
  g.moveTo(30, 26);
  g.quadraticCurveTo(66, 12, 104, 24);
  g.lineWidth = 3;
  g.strokeStyle = '#f4c34f';
  g.stroke();
  ellipse(g, 66, 12, 6, 5, '#f6efe2', 2);
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

/**
 * A tower on its stone spot, bottom centre at the spot's centre; one pip per level. Level 4 is drawn as its
 * specialisation (`branch`), with a gold star instead of pips.
 */
export function paintTower(kind: TowerKind, level: number, branch: Branch | null = null): Painted {
  const [c, g] = canvas(150, 190);
  ({ archer: archerTop, cannon: cannonTop, storm: stormTop, frost: frostTop })[kind](g, level, level >= 4 ? branch : null);
  return painted(c);
}

/** Roof / trim colour per level; specialisations have their own. */
const TRIM = ['#a0522d', '#3f74c4', '#e0a821'];

function star(g: CanvasRenderingContext2D, x: number, y: number, r = 9): void {
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const k = i % 2 ? r * 0.45 : r;
    g.lineTo(x + Math.cos(a) * k, y + Math.sin(a) * k);
  }
  g.closePath();
  g.fillStyle = '#ffd23f';
  g.fill();
  stroke(g, 3);
}

function flag(g: CanvasRenderingContext2D, x: number, y: number, color: string): void {
  g.beginPath();
  g.moveTo(x, y + 12);
  g.lineTo(x, y);
  stroke(g, 5);
  g.fillStyle = color;
  g.beginPath();
  g.moveTo(x + 2, y);
  g.lineTo(x + 25, y + 6);
  g.lineTo(x + 2, y + 12);
  g.closePath();
  g.fill();
  stroke(g, 3);
}

function archerTop(g: CanvasRenderingContext2D, level: number, branch: Branch | null): void {
  towerBase(g);
  if (branch === 0) {
    // Sniper Nest: a tall, narrow lookout with a long spyglass, purple roof.
    g.fillStyle = '#a8763f';
    g.fillRect(44, 52, 62, 60);
    g.lineWidth = 5;
    g.strokeRect(44, 52, 62, 60);
    ellipse(g, 75, 76, 6, 9, '#2c1d18');
    g.fillStyle = '#c9a36b';
    g.fillRect(84, 66, 52, 9);
    g.strokeRect(84, 66, 52, 9);
    ellipse(g, 138, 70, 5, 8, '#9fd8ff', 3);
    g.fillStyle = '#7b4fb8';
    g.beginPath();
    g.moveTo(34, 56);
    g.lineTo(75, 2);
    g.lineTo(116, 56);
    g.closePath();
    g.fill();
    stroke(g, 5);
    star(g, 75, 98);
    return;
  }
  if (branch === 1) {
    // Volley Tower: a wide lookout with three slits and three flags.
    g.fillStyle = '#a8763f';
    g.fillRect(18, 70, 114, 42);
    g.lineWidth = 5;
    g.strokeRect(18, 70, 114, 42);
    for (const x of [44, 75, 106]) ellipse(g, x, 90, 6, 10, '#2c1d18');
    g.fillStyle = '#c8402f';
    g.beginPath();
    g.moveTo(8, 74);
    g.lineTo(40, 30);
    g.lineTo(110, 30);
    g.lineTo(142, 74);
    g.closePath();
    g.fill();
    stroke(g, 5);
    for (const x of [44, 75, 106]) flag(g, x, 18, '#f4c34f');
    star(g, 75, 52);
    return;
  }
  const roof = TRIM[level - 1] ?? TRIM[0];
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
  flag(g, 75, 2, '#f4c34f');
  pips(g, level, 56);
}

function cannonTop(g: CanvasRenderingContext2D, level: number, branch: Branch | null): void {
  const band = branch === 0 ? '#8a2b22' : branch === 1 ? '#2a8f8a' : (TRIM[level - 1] ?? TRIM[0]);
  towerBase(g);
  // Wooden deck with a rim.
  g.fillStyle = '#a8763f';
  g.fillRect(22, 92, 106, 24);
  g.lineWidth = 5;
  g.strokeRect(22, 92, 106, 24);
  g.fillStyle = band;
  g.fillRect(22, 92, 106, 7);
  g.strokeRect(22, 92, 106, 7);
  if (branch === 0) {
    // Mortar: a squat, wide-mouthed pot aimed at the sky.
    g.fillStyle = '#3a3f4b';
    g.beginPath();
    g.moveTo(40, 94);
    g.lineTo(48, 40);
    g.lineTo(102, 40);
    g.lineTo(110, 94);
    g.closePath();
    g.fill();
    stroke(g, 5);
    ellipse(g, 75, 40, 30, 10, '#5b6375', 5);
    ellipse(g, 75, 40, 20, 6, '#14161c');
    g.fillStyle = band;
    g.fillRect(44, 64, 62, 9);
    g.strokeRect(44, 64, 62, 9);
    star(g, 75, 106);
    return;
  }
  if (branch === 1) {
    // Flak Cannon: two long barrels pointing steeply up.
    for (const [x, a] of [[60, -1.15], [90, -1.35]] as const) {
      g.save();
      g.translate(x, 86);
      g.rotate(a);
      g.fillStyle = '#3a3f4b';
      g.beginPath();
      g.roundRect(-8, -11, 80, 22, 8);
      g.fill();
      stroke(g, 5);
      g.fillStyle = band;
      g.fillRect(56, -12, 9, 24);
      g.strokeRect(56, -12, 9, 24);
      g.restore();
    }
    ellipse(g, 75, 90, 22, 14, '#5b6375', 5);
    star(g, 75, 106);
    return;
  }
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

function stormTop(g: CanvasRenderingContext2D, level: number, branch: Branch | null): void {
  towerBase(g, '#a9a3c9', '#7d76a3');
  if (branch === 0) return lightningSpire(g);
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
  glow.addColorStop(0, branch === 1 ? 'rgba(255, 150, 220, 0.75)' : 'rgba(200, 160, 255, 0.75)');
  glow.addColorStop(1, 'rgba(200, 160, 255, 0)');
  g.fillStyle = glow;
  g.fillRect(20, 0, 110, 80);
  const k = 0.85 + Math.min(level, 3) * 0.1;
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
  if (branch === 1) {
    // Arcane Lens: a gold ring holding a lens in front of the crystal.
    g.lineWidth = 7;
    g.strokeStyle = INK;
    g.beginPath();
    g.ellipse(100, 44, 16, 22, 0.2, 0, Math.PI * 2);
    g.stroke();
    g.lineWidth = 4;
    g.strokeStyle = '#f4c34f';
    g.stroke();
    g.fillStyle = 'rgba(255, 190, 235, 0.45)';
    g.fill();
    star(g, 75, 94);
    return;
  }
  pips(g, level, 94);
}

function lightningSpire(g: CanvasRenderingContext2D): void {
  // A tall copper spire wound with coils, a crystal at the very top.
  g.fillStyle = '#c5bfe3';
  g.beginPath();
  g.moveTo(50, 112);
  g.lineTo(66, 30);
  g.lineTo(84, 30);
  g.lineTo(100, 112);
  g.closePath();
  g.fill();
  stroke(g, 5);
  for (const [y, w] of [[96, 30], [74, 24], [52, 19]]) ellipse(g, 75, y, w, 6, '#d08a3c', 4);
  const glow = g.createRadialGradient(75, 18, 2, 75, 18, 30);
  glow.addColorStop(0, 'rgba(200, 160, 255, 0.8)');
  glow.addColorStop(1, 'rgba(200, 160, 255, 0)');
  g.fillStyle = glow;
  g.fillRect(40, 0, 70, 50);
  g.beginPath();
  g.moveTo(75, 0);
  g.lineTo(88, 18);
  g.lineTo(75, 36);
  g.lineTo(62, 18);
  g.closePath();
  g.fillStyle = '#b48cff';
  g.fill();
  g.lineWidth = 4;
  g.strokeStyle = '#4b2a8a';
  g.stroke();
  // Little sparks crackling off the coils.
  g.strokeStyle = '#fff3a0';
  g.lineWidth = 3;
  for (const [x, y, d] of [[44, 70, -1], [106, 60, 1]]) {
    g.beginPath();
    g.moveTo(x, y);
    g.lineTo(x + 8 * d, y - 6);
    g.lineTo(x + 4 * d, y - 10);
    g.lineTo(x + 14 * d, y - 18);
    g.stroke();
  }
  star(g, 75, 104);
}

function frostTop(g: CanvasRenderingContext2D, level: number, branch: Branch | null): void {
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
  if (branch === 1) {
    // Ice Shard: a cluster of sharp ice crystals.
    for (const [x, h, a] of [[52, 52, -0.35], [98, 56, 0.35], [75, 78, 0], [62, 40, -0.15], [88, 44, 0.15]] as const) {
      g.save();
      g.translate(x, 90);
      g.rotate(a);
      g.beginPath();
      g.moveTo(-11, 0);
      g.lineTo(0, -h);
      g.lineTo(11, 0);
      g.closePath();
      g.fillStyle = '#bff0ff';
      g.fill();
      stroke(g, 4);
      g.fillStyle = 'rgba(255, 255, 255, 0.8)';
      g.beginPath();
      g.moveTo(-4, -4);
      g.lineTo(0, -h + 8);
      g.lineTo(2, -4);
      g.closePath();
      g.fill();
      g.restore();
    }
    star(g, 75, 100);
    return;
  }
  // A fat cloud (a dark storm cloud for Blizzard), one more puff per level, with a snowflake.
  const blizzard = branch === 0;
  const puffs: [number, number, number][] = blizzard
    ? [[44, 56, 26], [106, 56, 26], [75, 40, 32], [26, 72, 18], [124, 72, 18]]
    : [[52, 56, 22], [98, 56, 22], [75, 44, 28], [40, 70, 16], [110, 70, 16]];
  const n = blizzard ? 5 : 3 + Math.min(2, level - 1);
  for (const [x, y, r] of puffs.slice(0, n)) ellipse(g, x, y, r, r * 0.86, blizzard ? '#8fa6c4' : '#ffffff', 5);
  for (const [x, y, r] of puffs.slice(0, n)) ellipse(g, x, y + 2, r - 4, (r - 4) * 0.8, blizzard ? '#b3c6de' : '#eef8ff');
  if (blizzard) for (const [x, y] of [[30, 98], [56, 104], [96, 100], [122, 96], [76, 110]]) ellipse(g, x, y, 4, 4, '#ffffff', 2);
  g.lineWidth = 4;
  g.strokeStyle = '#4fa8d8';
  for (let i = 0; i < 3; i++) {
    const a = (i * Math.PI) / 3;
    g.beginPath();
    g.moveTo(75 - Math.cos(a) * 12, 52 - Math.sin(a) * 12);
    g.lineTo(75 + Math.cos(a) * 12, 52 + Math.sin(a) * 12);
    g.stroke();
  }
  if (blizzard) star(g, 75, 98);
  else pips(g, level, 98);
}

/** An ice shard flying point-first to the right, centred. */
export function paintShard(): Painted {
  const [c, g] = canvas(56, 24);
  g.beginPath();
  g.moveTo(4, 12);
  g.lineTo(18, 4);
  g.lineTo(52, 12);
  g.lineTo(18, 20);
  g.closePath();
  g.fillStyle = '#bff0ff';
  g.fill();
  g.lineWidth = 3;
  g.strokeStyle = '#2f7fa8';
  g.stroke();
  return painted(c);
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
