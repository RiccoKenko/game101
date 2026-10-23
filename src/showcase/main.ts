/**
 * Character showcase: the hand-sculpted cast on a floating islet, every move on a button, and a battle demo
 * with Archero-style juice (arrow trails, hit flash, damage numbers, hit-stop, shake, slow-mo, coin bursts).
 */
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './showcase.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader, type GLTF } from 'three/addons/loaders/GLTFLoader.js';
import { MeshoptDecoder } from 'three/addons/libs/meshopt_decoder.module.js';
import { sfx } from '../audio/sfx';
import { Actor } from '../engine/actor';
import { createStage } from '../engine/renderer';
import { Clouds, skyBackground } from '../engine/sky';
import { DamageNumbers } from '../fx/damageNumbers';
import { Fx } from '../fx/particles';
import { Shake } from '../fx/shake';
import { GameTime } from '../fx/time';
import { Trail } from '../fx/trail';

declare global {
  interface Window {
    /** Single-file builds inline the models here (base64). */
    __MODELS__?: Record<string, string>;
    __ready?: boolean;
    __showcase?: unknown;
  }
}

const MARKUP = `
<div class="app">
  <div id="stage" class="stage"></div>
  <div id="fx" class="fx-layer" aria-hidden="true"></div>
  <header class="top">
    <div class="brand"><span class="brand-kicker">Little Archer</span><span class="brand-name">Sky Pirates</span></div>
    <div class="purse" id="purse" aria-label="Coins collected"><i class="coin"></i><b id="coins">0</b></div>
  </header>
  <section class="card" aria-live="polite">
    <h1 id="who">Little Archer</h1>
    <p id="blurb"></p>
    <dl class="specs">
      <div><dt>Moves</dt><dd id="moves-n">10</dd></div>
      <div><dt>Triangles</dt><dd id="tris">27,584</dd></div>
      <div><dt>Bones</dt><dd id="bones">27</dd></div>
    </dl>
  </section>
  <nav class="tray">
    <div class="tabs" role="tablist">
      <button role="tab" id="tab-hero" data-tab="hero" aria-selected="true">Little Archer</button>
      <button role="tab" id="tab-pirate" data-tab="pirate" aria-selected="false">Deckhand</button>
      <button role="tab" id="tab-battle" data-tab="battle" aria-selected="false">Battle demo</button>
    </div>
    <div class="moves" id="moves"></div>
  </nav>
  <div class="loading" id="loading"><div class="bar"><i id="bar"></i></div><span>Unpacking the crew…</span></div>
</div>`;
document.body.insertAdjacentHTML('afterbegin', MARKUP);
const $ = (id: string) => document.getElementById(id)!;

type Tab = 'hero' | 'pirate' | 'battle';
const MOVES: Record<'hero' | 'pirate', [label: string, clip: string, loop: boolean][]> = {
  hero: [
    ['Idle', 'idle', true], ['Walk', 'walk', true], ['Run', 'run', true], ['Shoot', 'shoot', false],
    ['Rapid fire', 'rapid', true], ['Dash', 'dodge', false], ['Hit', 'hit', false], ['Knocked out', 'ko', false],
    ['Cheer', 'cheer', false], ['Call skill', 'cast', false],
  ],
  pirate: [
    ['Idle', 'idle', true], ['Swagger', 'walk', true], ['Charge', 'run', true], ['Steal crystal', 'carry', true],
    ['Hit', 'hit', false], ['Defeated', 'die', false], ['Taunt', 'taunt', false], ['Cheer', 'cheer', false],
  ],
};
const INFO: Record<Tab, { who: string; blurb: string; moves: string; tris: string; bones: string }> = {
  hero: {
    who: 'Little Archer',
    blurb: 'Guardian of Sky Haven. Green hood, gold trim, and a bow whose string really draws back. Drag to spin the island, pinch to zoom.',
    moves: '10', tris: '27,584', bones: '27',
  },
  pirate: {
    who: 'Deckhand',
    blurb: "Captain Stormbeard's everyday crew. Swaggers, charges, and runs off hugging stolen Sky Crystals.",
    moves: '8', tris: '25,094', bones: '25',
  },
  battle: {
    who: 'Battle demo',
    blurb: 'Arrows leave glowing trails; hits flash, sparks fly and numbers pop. Crits freeze time for a beat. Sky Burst slows everything down.',
    moves: '—', tris: '52,678', bones: '52',
  },
};

// ---------- stage

const stageEl = $('stage');
const { renderer, scene, sun } = createStage(stageEl);
scene.background = skyBackground();
sun.position.set(-3, 6, 4);
sun.target.position.set(0, 0, 0);
Object.assign(sun.shadow.camera, { left: -1.8, right: 1.8, top: 1.8, bottom: -1.8, near: 1, far: 20 });
sun.shadow.camera.updateProjectionMatrix();
sun.shadow.radius = 4;

const camera = new THREE.PerspectiveCamera(32, 1, 0.05, 80);
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.enablePan = false;
controls.minPolarAngle = 0.35;
controls.maxPolarAngle = 1.42;
controls.target.set(0, 0.32, 0);

const clouds = new Clouds(16, 16, -6, 1.2);
scene.add(clouds.group);
const island = new THREE.Group();
scene.add(island);
const fx = new Fx();
scene.add(fx.group);
const numbers = new DamageNumbers($('fx'));
const time = new GameTime();
const shake = new Shake(0.045);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
shake.enabled = !reduceMotion;

function resize(): void {
  const w = stageEl.clientWidth;
  const h = stageEl.clientHeight;
  renderer.setSize(w, h);
  camera.aspect = w / h;
  camera.updateProjectionMatrix();
  // Fit the cast (and most of the island) whatever the screen shape. On wide screens aim a little left of
  // centre so the cast clears the info card; tall screens keep it centred and a bit closer.
  const v = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(v / 2) * camera.aspect);
  const wide = camera.aspect > 1.2;
  const d = Math.max((wide ? 1.35 : 1.05) / Math.tan(hFov / 2), 0.95 / Math.tan(v / 2));
  if (!userMoved) controls.target.set(wide ? -0.12 : 0, 0.32, 0);
  controls.minDistance = d * 0.4;
  controls.maxDistance = d * 1.7;
  // Haze only the far sky, however far back a tall portrait screen puts the camera.
  scene.fog = new THREE.Fog(0xd9f1ff, d * 2.2, d * 7);
  if (!userMoved) {
    const dir = new THREE.Vector3(0, 0.36, 1).normalize();
    camera.position.copy(controls.target).addScaledVector(dir, d);
  }
  controls.update();
}
let userMoved = false;
controls.addEventListener('start', () => (userMoved = true));
window.addEventListener('resize', resize);

// ---------- loading

function decode(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

async function loadModel(loader: GLTFLoader, name: string, onProgress: (f: number) => void): Promise<GLTF> {
  const inline = window.__MODELS__?.[name];
  if (inline) {
    const gltf = await loader.parseAsync(decode(inline), '');
    onProgress(1);
    return gltf;
  }
  return loader.loadAsync(`${import.meta.env.BASE_URL}models/${name}.glb`, (e) => e.total && onProgress(e.loaded / e.total));
}

const loader = new GLTFLoader();
loader.setMeshoptDecoder(MeshoptDecoder);
const progress = { hero: 0, deckhand: 0, props: 0 };
const showProgress = () => (($('bar') as HTMLElement).style.width = `${((progress.hero + progress.deckhand + progress.props) / 3) * 100}%`);
const [heroGltf, pirateGltf, propsGltf] = await Promise.all(
  (['hero', 'deckhand', 'props'] as const).map((n) => loadModel(loader, n, (f) => ((progress[n] = f), showProgress()))),
);

const props = new Map(propsGltf.scene.children.map((c) => [c.name, c]));
const prop = (name: string) => {
  const p = props.get(name)!.clone();
  p.traverse((o) => {
    const m = o as THREE.Mesh;
    if (m.isMesh) {
      m.castShadow = name !== 'islet';
      m.receiveShadow = true;
    }
  });
  return p;
};

const islet = prop('islet');
island.add(islet);
const hero = new Actor(heroGltf.scene, heroGltf.animations);
const pirate = new Actor(pirateGltf.scene, pirateGltf.animations);
const HERO_HOME = new THREE.Vector3(-0.5, 0, 0.08);
const PIRATE_HOME = new THREE.Vector3(0.52, 0, 0);
hero.root.position.copy(HERO_HOME);
pirate.root.position.copy(PIRATE_HOME);
hero.root.rotation.y = 0.45;
pirate.root.rotation.y = -0.45;
island.add(hero.root, pirate.root);
hero.anim.play('idle');
pirate.anim.play('idle');

resize();
$('loading').classList.add('done');
// Screenshot/test hook: /?battle starts the fight straight away.
const autoBattle = new URLSearchParams(location.search).has('battle');

// ---------- UI

let tab: Tab = 'hero';
let activeLoop: Record<'hero' | 'pirate', string> = { hero: 'idle', pirate: 'idle' };

function renderMoves(): void {
  const box = $('moves');
  box.innerHTML = '';
  const info = INFO[tab];
  $('who').textContent = info.who;
  $('blurb').textContent = info.blurb;
  $('moves-n').textContent = info.moves;
  $('tris').textContent = info.tris;
  $('bones').textContent = info.bones;
  if (tab === 'battle') {
    const start = button(battle.on ? 'Stop battle' : 'Start battle', () => {
      battle.on ? stopBattle() : startBattle();
      renderMoves();
    });
    start.classList.add('primary');
    box.append(
      start,
      button('Sky Burst', skyBurst),
      button(shake.enabled ? 'Screen shake: on' : 'Screen shake: off', () => {
        shake.enabled = !shake.enabled;
        renderMoves();
      }),
    );
    return;
  }
  const who = tab;
  for (const [label, clip, loop] of MOVES[who]) {
    const b = button(label, () => {
      if (battle.on) stopBattle();
      const actor = who === 'hero' ? hero : pirate;
      if (loop) {
        actor.anim.play(clip, { fade: 0.25 });
        activeLoop[who] = clip;
      } else actor.anim.oneShot(clip, activeLoop[who], { fade: 0.12 });
      if (clip === 'cast') afterGame(0.3, () => skyFlash());
      if (clip === 'shoot') afterGame(0.5, () => fireArrow(null));
      renderMoves();
    });
    if (loop && activeLoop[who] === clip) b.classList.add('on');
    box.append(b);
  }
}

function button(label: string, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  b.addEventListener('click', () => {
    void sfx.unlock();
    sfx.play('click', 0.35, 0);
    onClick();
  });
  return b;
}

for (const t of document.querySelectorAll<HTMLButtonElement>('.tabs button')) {
  t.addEventListener('click', () => {
    void sfx.unlock();
    tab = t.dataset.tab as Tab;
    for (const o of document.querySelectorAll<HTMLButtonElement>('.tabs button')) o.setAttribute('aria-selected', String(o === t));
    renderMoves();
  });
}
renderMoves();

// Tapping a character gets a reaction.
const tapRay = new THREE.Raycaster();
renderer.domElement.addEventListener('pointerup', (e) => {
  if (battle.on) return;
  const r = renderer.domElement.getBoundingClientRect();
  tapRay.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), camera);
  const hit = tapRay.intersectObjects([hero.model, pirate.model], true)[0];
  if (!hit) return;
  void sfx.unlock();
  let o: THREE.Object3D | null = hit.object;
  while (o && o !== hero.model && o !== pirate.model) o = o.parent;
  if (o === hero.model) hero.anim.oneShot('cheer', activeLoop.hero, { fade: 0.1 });
  else pirate.anim.oneShot('taunt', activeLoop.pirate, { fade: 0.1 });
});

// ---------- tiny scheduler on game time (so slow-mo stretches sequences too)

const timers: { at: number; fn: () => void }[] = [];
let gameClock = 0;
function afterGame(seconds: number, fn: () => void): void {
  timers.push({ at: gameClock + seconds, fn });
}

// ---------- battle

const battle = { on: false, hp: 100, state: 'walk' as 'walk' | 'dead' | 'gone' | 'spawn', spawnT: 0, lastRapid: 0 };
const MAX_HP = 100;

interface Arrow {
  obj: THREE.Object3D;
  trail: Trail;
  vel: THREE.Vector3;
  age: number;
  homing: boolean;
}
const arrows: Arrow[] = [];
const fading: Trail[] = [];
const TRAIL = new THREE.Color(1.0, 0.72, 0.3);

function startBattle(): void {
  battle.on = true;
  battle.hp = MAX_HP;
  battle.state = 'walk';
  pirate.root.visible = true;
  pirate.root.scale.setScalar(1);
  pirate.root.position.set(1.05, 0, 0);
  pirate.anim.play('walk');
  hero.root.position.copy(HERO_HOME);
  hero.anim.play('rapid');
  battle.lastRapid = 0;
}

function stopBattle(): void {
  battle.on = false;
  pirate.root.visible = true;
  pirate.root.scale.setScalar(1);
  pirate.root.position.copy(PIRATE_HOME);
  pirate.anim.play('idle');
  hero.anim.play('idle');
  activeLoop = { hero: 'idle', pirate: 'idle' };
}

const tmp = new THREE.Vector3();
function pirateChest(out = new THREE.Vector3()): THREE.Vector3 {
  return pirate.worldOf('chest', out).add(tmp.set(0, 0.04, 0));
}

function fireArrow(target: 'pirate' | null): void {
  const from = hero.worldOf('nock');
  const obj = prop('arrow');
  obj.position.copy(from);
  const dir = new THREE.Vector3(0, 0, 1).applyQuaternion(hero.root.getWorldQuaternion(new THREE.Quaternion()));
  if (target === 'pirate') dir.copy(pirateChest()).sub(from).normalize();
  const trail = new Trail(TRAIL, 0.016, 16, 0.55);
  scene.add(obj, trail.mesh);
  arrows.push({ obj, trail, vel: dir.multiplyScalar(7.5).add(tmp.set(0, 0.4, 0)), age: 0, homing: target === 'pirate' });
  fx.flash(from, new THREE.Color(1, 0.9, 0.6));
  sfx.play('shoot', 0.4);
}

function hitPirate(at: THREE.Vector3, dir: THREE.Vector3, base: number, forceCrit = false): void {
  const crit = forceCrit || Math.random() < 0.22;
  const dmg = Math.round(crit ? base * 2.3 : base);
  battle.hp -= dmg;
  pirate.flash(1);
  fx.sparks(at, crit ? new THREE.Color(1, 0.75, 0.25) : new THREE.Color(1, 0.95, 0.75), dir, crit ? 22 : 12);
  numbers.spawn(String(dmg), at.clone().add(tmp.set(0, 0.15, 0)), crit ? 'crit' : 'hit');
  sfx.play('hit', crit ? 0.6 : 0.4);
  if (crit) {
    time.hitStop(70);
    shake.add(0.35);
  } else shake.add(0.12);
  pirate.root.position.x += 0.04;
  if (battle.hp <= 0) defeatPirate();
  else pirate.anim.oneShot('hit', 'walk', { fade: 0.06 });
}

function defeatPirate(): void {
  battle.state = 'dead';
  pirate.anim.play('die', { once: true, fade: 0.05 });
  time.hitStop(110);
  time.slowMo(0.35, 0.8);
  shake.add(0.6);
  sfx.play('enemy_die', 0.6);
  hero.anim.oneShot('cheer', 'idle', { fade: 0.15 });
  afterGame(1.15, () => {
    const at = pirate.worldOf('hips');
    fx.poof(at, 1.2);
    sfx.play('explosion', 0.35);
    burstCoins(at, 7);
    pirate.root.visible = false;
    battle.state = 'gone';
    afterGame(1.4, respawn);
  });
}

function respawn(): void {
  if (!battle.on) return;
  battle.hp = MAX_HP;
  battle.state = 'spawn';
  battle.spawnT = 0;
  pirate.root.visible = true;
  pirate.root.scale.setScalar(0.01);
  pirate.root.position.set(1.05, 0, 0);
  pirate.anim.play('taunt', { once: true, fade: 0 });
  fx.poof(pirate.worldOf('hips'), 0.8, 10);
  afterGame(1.0, () => {
    if (!battle.on || battle.state !== 'spawn') return;
    battle.state = 'walk';
    pirate.anim.play('walk');
    hero.anim.play('rapid');
  });
}

function skyFlash(): void {
  const at = hero.root.getWorldPosition(new THREE.Vector3()).add(tmp.set(0, 0.05, 0));
  fx.ring(at, new THREE.Color(0.45, 0.95, 1), 1.6);
  time.slowMo(0.3, 1.1);
  shake.add(0.5);
  sfx.play('zap', 0.6);
}

function skyBurst(): void {
  hero.anim.oneShot('cast', battle.on ? 'rapid' : 'idle', { fade: 0.1 });
  afterGame(0.3, () => {
    skyFlash();
    if (battle.on && battle.state === 'walk')
      afterGame(0.25, () => {
        if (battle.state !== 'walk') return;
        const at = pirateChest();
        hitPirate(at, at.clone().sub(hero.root.position).normalize(), 60, true);
        fx.ring(at, new THREE.Color(0.6, 1, 1), 0.6, 24);
      });
  });
}

// ---------- coins

interface Coin {
  obj: THREE.Object3D;
  vel: THREE.Vector3;
  age: number;
}
const coins: Coin[] = [];
let coinCount = 0;

function burstCoins(at: THREE.Vector3, n: number): void {
  for (let i = 0; i < n; i++) {
    const obj = prop('coin');
    obj.position.copy(at);
    scene.add(obj);
    const a = Math.random() * Math.PI * 2;
    coins.push({ obj, vel: new THREE.Vector3(Math.cos(a) * 1.1, 2.4 + Math.random() * 0.9, Math.sin(a) * 1.1), age: 0 });
  }
}

function updateCoins(dt: number): void {
  const heroChest = hero.worldOf('chest');
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.age += dt;
    if (c.age < 0.75) {
      c.vel.y -= 9 * dt;
      c.obj.position.addScaledVector(c.vel, dt);
      const floor = island.position.y + 0.035;
      if (c.obj.position.y < floor) {
        c.obj.position.y = floor;
        c.vel.y = Math.abs(c.vel.y) * 0.45;
        c.vel.x *= 0.7;
        c.vel.z *= 0.7;
      }
    } else {
      // Sucked into the hero, faster and faster.
      const to = heroChest.clone().sub(c.obj.position);
      const d = to.length();
      c.vel.lerp(to.normalize().multiplyScalar(2 + (c.age - 0.75) * 9), Math.min(1, dt * 8));
      c.obj.position.addScaledVector(c.vel, dt);
      if (d < 0.12) {
        scene.remove(c.obj);
        coins.splice(i, 1);
        coinCount++;
        $('coins').textContent = String(coinCount);
        const purse = $('purse');
        purse.classList.remove('bump');
        void purse.offsetWidth;
        purse.classList.add('bump');
        fx.glitter(heroChest, new THREE.Color(1, 0.85, 0.3), 4);
        sfx.play('coin', 0.35, 0.15);
        continue;
      }
    }
    c.obj.rotation.y += dt * 9;
  }
}

// ---------- loop

let last = performance.now();
let dustT = 0;
let glitterT = 0;
const nockWorld = new THREE.Vector3();

function frame(now: number): void {
  const realDt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const dt = time.step(realDt);
  gameClock += dt;
  for (let i = timers.length - 1; i >= 0; i--)
    if (timers[i].at <= gameClock) {
      const t = timers.splice(i, 1)[0];
      t.fn();
    }

  island.position.y = Math.sin(now / 1000 * 0.7) * 0.025;
  island.rotation.z = Math.sin(now / 1000 * 0.45) * 0.008;
  clouds.update(realDt * (0.4 + 0.6 * time.scale));

  if (battle.on) {
    hero.faceTowards(pirate.root.position.x, pirate.root.position.z);
    pirate.faceTowards(hero.root.position.x, hero.root.position.z);
    if (battle.state === 'walk') {
      if (pirate.anim.playing === 'walk') pirate.root.position.x = Math.max(0.42, pirate.root.position.x - 0.22 * dt);
      // Fire on the release frame of each rapid-fire cycle.
      const a = hero.anim.action;
      if (hero.anim.playing === 'rapid' && a) {
        const t = a.time % 0.5;
        if (battle.lastRapid < 0.25 && t >= 0.25) fireArrow('pirate');
        battle.lastRapid = t;
      }
    }
    if (battle.state === 'spawn') {
      battle.spawnT += dt;
      const k = Math.min(1, battle.spawnT / 0.35);
      const back = 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2;
      pirate.root.scale.setScalar(Math.max(0.01, back));
    }
  } else {
    hero.faceYaw(0.45);
    pirate.faceYaw(-0.45);
  }

  hero.update(dt);
  pirate.update(dt);

  // Little touches: dust while running, glitter off a stolen crystal.
  dustT -= dt;
  if (dustT <= 0 && (hero.anim.playing === 'run' || pirate.anim.playing === 'run' || pirate.anim.playing === 'carry')) {
    dustT = 0.09;
    for (const actor of [hero, pirate])
      if (['run', 'carry'].includes(actor.anim.playing)) fx.dust(actor.worldOf(Math.random() < 0.5 ? 'foot.L' : 'foot.R').setY(island.position.y + 0.02));
  }
  glitterT -= dt;
  if (glitterT <= 0 && pirate.anim.playing === 'carry') {
    glitterT = 0.12;
    fx.glitter(pirate.worldOf('loot'), new THREE.Color(0.5, 1, 1), 2);
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    const ar = arrows[i];
    ar.age += dt;
    if (ar.homing && battle.state === 'walk') {
      const want = pirateChest().sub(ar.obj.position);
      const dist = want.length();
      ar.vel.lerp(want.normalize().multiplyScalar(7.5), Math.min(1, dt * 10));
      if (dist < 0.09) {
        hitPirate(ar.obj.position.clone(), ar.vel.clone().normalize(), 20 + Math.floor(Math.random() * 13));
        ar.trail.detach();
        fading.push(ar.trail);
        scene.remove(ar.obj);
        arrows.splice(i, 1);
        continue;
      }
    } else ar.vel.y -= 3 * dt;
    ar.obj.position.addScaledVector(ar.vel, dt);
    ar.obj.lookAt(nockWorld.copy(ar.obj.position).add(ar.vel));
    ar.trail.push(ar.obj.position);
    if (ar.age > 1.4) {
      ar.trail.detach();
      fading.push(ar.trail);
      scene.remove(ar.obj);
      arrows.splice(i, 1);
    }
  }
  for (const ar of arrows) ar.trail.update(camera);
  for (let i = fading.length - 1; i >= 0; i--) {
    fading[i].update(camera);
    if (fading[i].done) {
      scene.remove(fading[i].mesh);
      fading[i].dispose();
      fading.splice(i, 1);
    }
  }

  updateCoins(dt);
  fx.update(dt, camera, renderer.domElement.height);
  numbers.update(realDt, camera, stageEl.clientWidth, stageEl.clientHeight);
  shake.update(realDt);
  controls.update();
  shake.apply(camera);
  renderer.render(scene, camera);
  shake.restore(camera);
  requestAnimationFrame(frame);
}
if (autoBattle) {
  tab = 'battle';
  for (const o of document.querySelectorAll<HTMLButtonElement>('.tabs button')) o.setAttribute('aria-selected', String(o.dataset.tab === 'battle'));
  startBattle();
  renderMoves();
}
requestAnimationFrame(frame);
window.__ready = true;
window.__showcase = { hero, pirate, startBattle, stopBattle, skyBurst, time, camera, controls };
