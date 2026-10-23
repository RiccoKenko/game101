import * as THREE from 'three';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

/** Highest pixel ratio we render at. iPhones report 3; 2 looks the same at this content density and costs half. */
export const MAX_PIXEL_RATIO = 2;

export interface Stage {
  renderer: THREE.WebGLRenderer;
  scene: THREE.Scene;
  sun: THREE.DirectionalLight;
}

/** Renderer, scene and lights shared by every screen. */
export function createStage(parent: HTMLElement): Stage {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
  renderer.setSize(parent.clientWidth, parent.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NeutralToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  parent.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  // Soft image-based light so the low-poly facets read as shaded volumes, not flat colour.
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.55;
  pmrem.dispose();

  const hemi = new THREE.HemisphereLight(0xdff3ff, 0x6d8f5a, 1.1);
  scene.add(hemi);

  const sun = new THREE.DirectionalLight(0xfff1d6, 2.6);
  sun.position.set(-30, 50, 25);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.bias = -0.0004;
  sun.shadow.normalBias = 0.03;
  sun.shadow.radius = 3;
  const cam = sun.shadow.camera;
  cam.left = -45;
  cam.right = 45;
  cam.top = 35;
  cam.bottom = -35;
  cam.near = 1;
  cam.far = 160;
  scene.add(sun, sun.target);

  return { renderer, scene, sun };
}
