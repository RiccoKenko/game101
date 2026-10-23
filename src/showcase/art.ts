/**
 * Stand-in scenery painted in code (floating island, clouds, coin) in the characters' style:
 * warm brown outlines and soft cel shading. They make way for ChatGPT-painted art once the map is drawn.
 */
import * as THREE from 'three';

const INK = '#3b2a2a';

function canvas(w: number, h: number): [HTMLCanvasElement, CanvasRenderingContext2D] {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return [c, c.getContext('2d')!];
}

/** Canvas → texture with premultiplied alpha, matching `spriteMaterial`. */
function texture(c: HTMLCanvasElement): THREE.Texture {
  const t = new THREE.CanvasTexture(c);
  t.premultiplyAlpha = true;
  t.colorSpace = THREE.NoColorSpace;
  t.minFilter = THREE.LinearMipmapLinearFilter;
  return t;
}

export interface Painted {
  texture: THREE.Texture;
  w: number;
  h: number;
}

/** A grassy floating island seen from the side and a little above. The grass top's centre is at (600, 130). */
export function paintIsland(): Painted {
  const [c, g] = canvas(1200, 560);
  g.lineJoin = 'round';
  // Rocky underside: a jagged cone hanging below the turf.
  const rock = new Path2D();
  rock.moveTo(40, 150);
  const pts: [number, number][] = [[90, 230], [150, 260], [190, 330], [260, 350], [300, 420], [380, 430], [430, 500], [520, 520], [560, 548], [620, 530], [680, 545], [740, 500], [810, 470], [860, 410], [930, 395], [980, 330], [1040, 300], [1100, 230], [1160, 150]];
  for (const [x, y] of pts) rock.lineTo(x, y);
  rock.closePath();
  const rockFill = g.createLinearGradient(0, 150, 0, 550);
  rockFill.addColorStop(0, '#9b7650');
  rockFill.addColorStop(0.5, '#7a5a3e');
  rockFill.addColorStop(1, '#5c4433');
  g.fillStyle = rockFill;
  g.fill(rock);
  // Strata and cracks.
  g.save();
  g.clip(rock);
  g.strokeStyle = 'rgba(59, 42, 42, 0.35)';
  g.lineWidth = 5;
  for (const [x1, y1, x2, y2] of [[160, 250, 420, 300], [520, 330, 860, 300], [300, 380, 620, 420], [700, 420, 900, 380], [480, 470, 640, 480]]) {
    g.beginPath();
    g.moveTo(x1, y1);
    g.quadraticCurveTo((x1 + x2) / 2, y1 + 18, x2, y2);
    g.stroke();
  }
  // Light from the upper left: lift the left faces of the rock.
  const lit = g.createLinearGradient(0, 0, 1200, 0);
  lit.addColorStop(0, 'rgba(255, 236, 200, 0.28)');
  lit.addColorStop(0.5, 'rgba(255, 236, 200, 0)');
  lit.addColorStop(1, 'rgba(40, 20, 60, 0.2)');
  g.fillStyle = lit;
  g.fillRect(0, 0, 1200, 560);
  g.restore();
  g.strokeStyle = INK;
  g.lineWidth = 7;
  g.stroke(rock);
  // Soil lip under the grass.
  g.beginPath();
  g.ellipse(600, 150, 565, 100, 0, 0, Math.PI);
  g.fillStyle = '#8f5f36';
  g.fill();
  g.stroke();
  // Turf.
  const turf = new Path2D();
  turf.ellipse(600, 130, 570, 100, 0, 0, Math.PI * 2);
  const grass = g.createRadialGradient(470, 90, 40, 600, 130, 600);
  grass.addColorStop(0, '#9be06b');
  grass.addColorStop(0.55, '#74c255');
  grass.addColorStop(1, '#4f9a3c');
  g.fillStyle = grass;
  g.fill(turf);
  g.save();
  g.clip(turf);
  // Darker blades along the near rim and a few lighter tufts and flowers on top.
  g.fillStyle = 'rgba(46, 110, 40, 0.5)';
  for (let x = 50; x < 1160; x += 22) {
    g.beginPath();
    g.moveTo(x, 232);
    g.lineTo(x + 8, 200 - (x % 3) * 6);
    g.lineTo(x + 16, 232);
    g.fill();
  }
  for (const [x, y, r] of [[300, 70, 26], [760, 60, 30], [960, 110, 22], [520, 150, 24], [180, 140, 18]]) {
    g.fillStyle = 'rgba(190, 240, 140, 0.55)';
    g.beginPath();
    g.ellipse(x, y, r * 1.6, r * 0.6, 0, 0, Math.PI * 2);
    g.fill();
  }
  for (const [x, y, col] of [[240, 95, '#fff4f4'], [270, 110, '#ffd7e6'], [830, 85, '#fff4f4'], [870, 140, '#ffe27a'], [650, 70, '#ffd7e6'], [420, 175, '#fff4f4']] as [number, number, string][]) {
    g.fillStyle = col;
    g.beginPath();
    g.arc(x, y, 7, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = '#f4c34f';
    g.beginPath();
    g.arc(x, y, 2.5, 0, Math.PI * 2);
    g.fill();
  }
  g.restore();
  g.lineWidth = 7;
  g.strokeStyle = INK;
  g.stroke(turf);
  return { texture: texture(c), w: 1200, h: 560 };
}

/** A puffy cartoon cloud. */
export function paintCloud(seed: number): Painted {
  const [c, g] = canvas(520, 240);
  const puffs: [number, number, number][] = [];
  let s = seed * 9301 + 49297;
  const rnd = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  for (let i = 0; i < 7; i++) puffs.push([90 + i * 55 + rnd() * 20, 150 - Math.sin((i / 6) * Math.PI) * 60 - rnd() * 20, 50 + Math.sin((i / 6) * Math.PI) * 35 + rnd() * 12]);
  const path = new Path2D();
  for (const [x, y, r] of puffs) path.arc(x, y, r, 0, Math.PI * 2);
  path.rect(90, 150, 330, 50);
  g.fillStyle = '#ffffff';
  g.fill(path);
  g.save();
  g.clip(path);
  const shade = g.createLinearGradient(0, 80, 0, 210);
  shade.addColorStop(0, 'rgba(255,255,255,0)');
  shade.addColorStop(1, 'rgba(150, 190, 230, 0.55)');
  g.fillStyle = shade;
  g.fillRect(0, 0, 520, 240);
  g.restore();
  return { texture: texture(c), w: 520, h: 240 };
}

/** A gold coin with a star stamp. */
export function paintCoin(): Painted {
  const [c, g] = canvas(96, 96);
  const body = g.createRadialGradient(36, 30, 6, 48, 48, 44);
  body.addColorStop(0, '#fff3b0');
  body.addColorStop(0.35, '#f7cf55');
  body.addColorStop(1, '#c98a17');
  g.fillStyle = body;
  g.beginPath();
  g.arc(48, 48, 40, 0, Math.PI * 2);
  g.fill();
  g.lineWidth = 5;
  g.strokeStyle = INK;
  g.stroke();
  g.lineWidth = 3;
  g.strokeStyle = 'rgba(160, 100, 20, 0.8)';
  g.beginPath();
  g.arc(48, 48, 29, 0, Math.PI * 2);
  g.stroke();
  g.fillStyle = 'rgba(255, 250, 220, 0.9)';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 ? 7 : 16;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    g.lineTo(48 + Math.cos(a) * r, 48 + Math.sin(a) * r);
  }
  g.fill();
  return { texture: texture(c), w: 96, h: 96 };
}
