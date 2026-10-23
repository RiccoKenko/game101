/**
 * A flat 2D stage on Three.js: orthographic camera, y-up, one world unit = one CSS pixel at zoom 1.
 * The canvas is transparent so the page can paint the sky behind it.
 */
import * as THREE from 'three';

export interface Stage2D {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  camera: THREE.OrthographicCamera;
  /** Viewport size in CSS pixels. */
  readonly width: number;
  readonly height: number;
  resize(): void;
  render(): void;
}

export function createStage2D(host: HTMLElement): Stage2D {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 3));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.setClearColor(0x000000, 0);
  host.appendChild(renderer.domElement);
  const scene = new THREE.Scene();
  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  camera.position.set(0, 0, 1000);
  const stage: Stage2D = {
    renderer,
    scene,
    camera,
    width: 1,
    height: 1,
    resize() {
      const w = host.clientWidth || window.innerWidth;
      const h = host.clientHeight || window.innerHeight;
      (stage as { width: number }).width = w;
      (stage as { height: number }).height = h;
      renderer.setSize(w, h);
      camera.left = -w / 2;
      camera.right = w / 2;
      camera.top = h / 2;
      camera.bottom = -h / 2;
      camera.updateProjectionMatrix();
    },
    render() {
      renderer.render(scene, camera);
    },
  };
  stage.resize();
  window.addEventListener('resize', () => stage.resize());
  return stage;
}
