/**
 * Dev viewer for sculpted models: /dev/model.html?m=hero&clip=shoot&t=0.4&views=0,35,90,180&focus=0.5&dist=2.2
 * Each angle in `views` gets its own panel, so one screenshot shows the model all the way round.
 */
import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { createStage } from '../engine/renderer';

const params = new URLSearchParams(location.search);
const names = (params.get('m') ?? 'hero').split(',');
const clipName = params.get('clip') ?? 'idle';
const times = params.has('t') ? params.get('t')!.split(',').map(Number) : null;
const freeze = times ? times[0] : null;
const views = (params.get('views') ?? '0,35,90,180').split(',').map(Number);
const focusY = Number(params.get('focus') ?? 0.5);
const dist = Number(params.get('dist') ?? 2.4);
const pitch = THREE.MathUtils.degToRad(Number(params.get('pitch') ?? 12));

const parent = document.getElementById('game')!;
const { renderer, scene, sun } = createStage(parent);
renderer.setScissorTest(true);
scene.background = new THREE.Color(0x9fd3f0);
sun.shadow.camera.left = sun.shadow.camera.bottom = -3;
sun.shadow.camera.right = sun.shadow.camera.top = 3;
sun.shadow.camera.updateProjectionMatrix();

const ground = new THREE.Mesh(new THREE.CircleGeometry(1.6, 48), new THREE.MeshStandardMaterial({ color: 0x8fd16a, roughness: 0.9 }));
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const mixers: THREE.AnimationMixer[] = [];
const clipsByModel: THREE.AnimationClip[][] = [];
const spacing = 0.9;
await Promise.all(
  names.map(async (name, i) => {
    const gltf = await loader.loadAsync(`/models/${name}.glb?v=${Date.now()}`);
    const model = gltf.scene;
    model.position.x = (i - (names.length - 1) / 2) * spacing;
    model.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.receiveShadow = true;
        m.frustumCulled = false;
      }
    });
    scene.add(model);
    const mixer = new THREE.AnimationMixer(model);
    mixers[i] = mixer;
    clipsByModel[i] = gltf.animations;
    play(i, clipName);
  }),
);

function play(i: number, name: string): void {
  const clip = clipsByModel[i].find((c) => c.name === name) ?? clipsByModel[i][0];
  if (!clip) return;
  mixers[i].stopAllAction();
  const action = mixers[i].clipAction(clip);
  action.reset().play();
  if (freeze !== null) mixers[i].setTime(freeze);
}

const bar = document.getElementById('bar')!;
for (const c of clipsByModel[0] ?? []) {
  const b = document.createElement('button');
  b.textContent = c.name;
  b.onclick = () => mixers.forEach((_, i) => play(i, c.name));
  bar.appendChild(b);
}

const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 50);
const target = new THREE.Vector3(0, focusY, 0);
const clock = performance.now();
let last = clock;

function frame(now: number): void {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (freeze === null) mixers.forEach((m) => m.update(dt));
  const w = parent.clientWidth;
  const h = parent.clientHeight;
  const panels = (times ?? [null]).flatMap((t) => views.map((deg) => ({ t, deg })));
  const pw = w / panels.length;
  camera.aspect = pw / h;
  camera.updateProjectionMatrix();
  panels.forEach(({ t, deg }, vi) => {
    if (t !== null) mixers.forEach((m) => m.setTime(t));
    const a = THREE.MathUtils.degToRad(deg);
    const d = dist * Math.max(1, names.length * 0.6);
    camera.position.set(Math.sin(a) * Math.cos(pitch) * d, focusY + Math.sin(pitch) * d, Math.cos(a) * Math.cos(pitch) * d);
    camera.lookAt(target);
    renderer.setViewport(vi * pw, 0, pw, h);
    renderer.setScissor(vi * pw, 0, pw, h);
    renderer.render(scene, camera);
  });
  requestAnimationFrame(frame);
}
requestAnimationFrame(frame);
setTimeout(() => ((window as unknown as { __ready: boolean }).__ready = true), 300);
