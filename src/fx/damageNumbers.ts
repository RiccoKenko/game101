import * as THREE from 'three';

export type NumberStyle = 'hit' | 'crit' | 'heal' | 'gold';

interface Live {
  el: HTMLDivElement;
  world: THREE.Vector3;
  age: number;
  drift: number;
}

const LIFE = 0.9;
const v = new THREE.Vector3();

/**
 * Archero-style popping numbers, as HTML so they stay razor sharp at any zoom.
 * Crits are bigger, orange and punch in; numbers drift up, wobble sideways and fade.
 */
export class DamageNumbers {
  private live: Live[] = [];

  constructor(private layer: HTMLElement) {}

  spawn(text: string, at: THREE.Vector3, style: NumberStyle = 'hit'): void {
    const el = document.createElement('div');
    el.className = `dmg dmg-${style}`;
    el.textContent = text;
    this.layer.appendChild(el);
    this.live.push({ el, world: at.clone(), age: 0, drift: (Math.random() - 0.5) * 40 });
  }

  update(dt: number, camera: THREE.Camera, width: number, height: number): void {
    for (let i = this.live.length - 1; i >= 0; i--) {
      const n = this.live[i];
      n.age += dt;
      if (n.age >= LIFE) {
        n.el.remove();
        this.live.splice(i, 1);
        continue;
      }
      v.copy(n.world).project(camera);
      const k = n.age / LIFE;
      const x = ((v.x + 1) / 2) * width + n.drift * k;
      const y = ((1 - v.y) / 2) * height - 70 * (1 - (1 - k) ** 2);
      n.el.style.transform = `translate(${x.toFixed(1)}px, ${y.toFixed(1)}px) translate(-50%, -50%)`;
      n.el.style.opacity = String(k < 0.7 ? 1 : 1 - (k - 0.7) / 0.3);
    }
  }
}
