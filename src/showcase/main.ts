/**
 * Character showcase in 2D: Little Archer as a cut-out puppet on a floating island. Every move and face on a
 * button, a story-dialog preview with portraits, and a battle demo against a Deckhand pirate with
 * Archero-style juice (arrow trails, hit flash, damage numbers, hit-stop, shake, slow-mo, coin bursts).
 */
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './showcase.css';
import * as THREE from 'three';
import { sfx } from '../audio/sfx';
import { DamageNumbers } from '../fx/damageNumbers';
import { Fx2D } from '../fx/fx2d';
import { Shake } from '../fx/shake';
import { GameTime } from '../fx/time';
import { Trail } from '../fx/trail';
import { Animator2D } from '../puppet/animator';
import { deckhandClips } from '../puppet/clips/deckhand';
import { heroClips } from '../puppet/clips/hero';
import { assetUrl, loadPuppet } from '../puppet/loader';
import { layer, type Pose2D } from '../puppet/pose';
import { Puppet, spriteGeometry, spriteMaterial } from '../puppet/puppet';
import { Shadow } from '../stage/shadow';
import { createStage2D } from '../stage/stage2d';
import { paintCloud, paintCoin, paintIsland, type Painted } from './art';

declare global {
  interface Window {
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
      <div><dt>Moves</dt><dd>10</dd></div>
      <div><dt>Faces</dt><dd>8</dd></div>
      <div><dt>Parts</dt><dd>34</dd></div>
    </dl>
  </section>
  <div class="dialog" id="dialog" hidden>
    <img id="portrait" alt="" />
    <div class="dialog-body"><b class="dialog-name">Little Archer</b><p id="line"></p></div>
  </div>
  <nav class="tray" id="tray">
    <div class="tabs" role="tablist">
      <button role="tab" data-tab="hero" aria-selected="true">Hero</button>
      <button role="tab" data-tab="story" aria-selected="false">Story</button>
      <button role="tab" data-tab="battle" aria-selected="false">Battle</button>
    </div>
    <div class="moves" id="moves"></div>
  </nav>
  <div class="loading" id="loading"><div class="bar"><i id="bar"></i></div><span>Waking up Little Archer…</span></div>
</div>`;
document.body.insertAdjacentHTML('afterbegin', MARKUP);
const $ = (id: string) => document.getElementById(id)!;

type Tab = 'hero' | 'story' | 'battle';
const MOVES: [label: string, clip: string, loop: boolean][] = [
  ['Idle', 'idle', true], ['Walk', 'walk', true], ['Run', 'run', true], ['Shoot', 'shoot', false],
  ['Rapid fire', 'rapid', true], ['Dash', 'dodge', false], ['Hit', 'hit', false], ['Knocked out', 'ko', false],
  ['Cheer', 'cheer', false], ['Call skill', 'cast', false],
];
const FACES: [label: string, eyes: string, mouth: string][] = [
  ['Happy', 'eyes-happy', 'mouth-cheer'],
  ['Focus', 'eyes-focus', 'mouth-determined'],
  ['Surprised', 'eyes-surprised', 'mouth-o'],
  ['Ouch', 'eyes-hurt', 'mouth-ouch'],
  ['Dizzy', 'eyes-ko', 'mouth-ouch'],
];
const INFO: Record<Tab, { who: string; blurb: string }> = {
  hero: {
    who: 'Little Archer',
    blurb: 'Guardian of Sky Haven, drawn as one picture and cut into 34 parts that move on a 2D skeleton. Tap him for a cheer.',
  },
  story: {
    who: 'Story scenes',
    blurb: 'Chapters open with dialog like this: a portrait that changes with the mood while the hero acts it out on stage.',
  },
  battle: {
    who: 'Battle demo',
    blurb: 'A Deckhand to practise on. Arrows leave glowing trails; hits flash, sparks fly and numbers pop. Crits freeze time for a beat. Sky Burst slows everything down.',
  },
};
const STORY: { portrait: string; text: string; move?: string; face?: [string, string] }[] = [
  { portrait: 'smile', text: 'Morning, Sky Haven! The crystals are humming today.' },
  { portrait: 'surprised', text: 'Wait… is that an airship on the horizon?', face: ['eyes-surprised', 'mouth-o'] },
  { portrait: 'determined', text: 'Sky pirates! Nobody steals our crystals. Not on my watch!', move: 'shoot', face: ['eyes-focus', 'mouth-determined'] },
  { portrait: 'smile', text: 'Talon, Mochi, get ready. Here they come!', move: 'cheer' },
];

// ---------- stage

const stageEl = $('stage');
const stage = createStage2D(stageEl);
const { scene, camera, renderer } = stage;
const bar = $('bar') as HTMLElement;
bar.style.width = '15%';

/** Everything on the island lives in `island` (local units: hero ~380 tall, grass centre at the origin). */
const set = new THREE.Group();
const island = new THREE.Group();
set.add(island);
scene.add(set);

const flash0 = { value: 0 };
function spriteMesh(p: Painted, scale: number, order: number, flash = flash0): THREE.Mesh {
  const mesh = new THREE.Mesh(spriteGeometry(p.w, p.h), spriteMaterial(p.texture, flash));
  mesh.scale.set(scale, scale, 1);
  mesh.renderOrder = order;
  return mesh;
}

const ISLAND_SCALE = 1000 / 1200;
const ground = spriteMesh(paintIsland(), ISLAND_SCALE, -5);
ground.position.set(-600 * ISLAND_SCALE, 130 * ISLAND_SCALE, 0);
island.add(ground);

// Clouds drift behind the island at screen scale, wrapping round.
const clouds = Array.from({ length: 6 }, (_, i) => {
  const mesh = spriteMesh(paintCloud(i + 1), 0.5 + (i % 3) * 0.18, -20 + i);
  (mesh.material as THREE.ShaderMaterial).uniforms.opacity.value = 0.75 + (i % 2) * 0.2;
  scene.add(mesh);
  return { mesh, speed: 6 + (i % 3) * 5, x: Math.random(), y: 0.12 + (i / 6) * 0.7 };
});

const HERO_X = -190;
const TARGET_X = 290;
const HERO_SIZE = 0.26;

const [assets, pirateAssets] = await Promise.all([loadPuppet('hero', renderer), loadPuppet('deckhand', renderer)]);
bar.style.width = '85%';
const hero = new Puppet(assets);
hero.size = HERO_SIZE;
hero.root.position.set(HERO_X, -12, 0);
hero.setOrder(200);
island.add(hero.root);
const heroShadow = new Shadow(520 * HERO_SIZE);
island.add(heroShadow.mesh);
const anim = new Animator2D(heroClips);
anim.play('idle');

// The Deckhand to practise on, facing the hero; he rocks back on a spring about his feet when hit.
const PIRATE_SIZE = 0.23;
const pirate = new Puppet(pirateAssets);
pirate.size = PIRATE_SIZE;
pirate.facing = -1;
pirate.setOrder(150);
const pirateAnim = new Animator2D(deckhandClips);
pirateAnim.play('idle');
const target = new THREE.Group();
target.add(pirate.root);
target.position.set(TARGET_X, 14, 0);
island.add(target);
const targetShadow = new Shadow(330);
targetShadow.place(TARGET_X, 14);
island.add(targetShadow.mesh);
/** Where arrows hit: the middle of his striped shirt (rig-pose y 600, ground at 1295). */
const BULLSEYE = new THREE.Vector3(TARGET_X, 14 + (1295 - 600) * PIRATE_SIZE, 0);

const fx = new Fx2D(420);
fx.glow.points.renderOrder = 500;
fx.soft.points.renderOrder = 450;
island.add(fx.group);
const numbers = new DamageNumbers($('fx'));
const time = new GameTime();
const shake = new Shake(9);
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
shake.enabled = !reduceMotion;

let fit = 1;
/** Fit the island into the space the UI leaves: beside the move panel on landscape phones, above it otherwise. */
function layout(): void {
  const w = stage.width;
  const h = stage.height;
  const tray = $('tray').getBoundingClientRect();
  const side = tray.left > w * 0.5;
  const right = side ? tray.left - 8 : w;
  const bottom = side ? h : tray.top;
  // Beside the panel the card may overlap the sky; above the tray the scene starts below the card.
  const top = side ? 46 : document.querySelector('.card')!.getBoundingClientRect().bottom + 8;
  fit = Math.min(right / 1150, (bottom - top) / 650);
  set.scale.setScalar(fit);
  // Island content spans local y -180 (rock) to 470 (a cheer jump); centre it in the free space.
  const middle = side ? top + 325 * fit : (top + bottom) / 2;
  set.position.set(right / 2 - w / 2 + (side ? 0.08 * right : 0), h / 2 - middle - 145 * fit, 0);
}
window.addEventListener('resize', layout);
$('loading').classList.add('done');
const autoBattle = new URLSearchParams(location.search).has('battle');

// ---------- UI

let tab: Tab = 'hero';
let activeLoop = 'idle';
/** A face held on top of whatever the clip shows. */
let faceHold: { eyes: string; mouth: string; left: number } | null = null;

function play(clip: string, loop: boolean): void {
  if (loop) {
    anim.play(clip, { fade: 0.22 });
    activeLoop = clip;
  } else anim.oneShot(clip, activeLoop, { fade: 0.12 });
  if (clip === 'cast') afterGame(0.35, () => skyFlash());
}

function renderMoves(): void {
  const box = $('moves');
  box.innerHTML = '';
  $('who').textContent = INFO[tab].who;
  $('blurb').textContent = INFO[tab].blurb;
  ($('dialog') as HTMLElement).hidden = tab !== 'story';
  requestAnimationFrame(layout);
  if (tab === 'battle') {
    const start = button(battle.on ? 'Stop battle' : 'Start battle', () => {
      battle.on ? stopBattle() : startBattle();
      renderMoves();
    });
    start.classList.add('primary');
    box.append(
      start,
      button('Sky Burst', skyBurst),
      button(shake.enabled ? 'Shake: on' : 'Shake: off', () => {
        shake.enabled = !shake.enabled;
        renderMoves();
      }),
    );
    return;
  }
  if (tab === 'story') {
    const next = button(storyAt < STORY.length - 1 ? 'Next' : 'Again', () => showLine((storyAt + 1) % STORY.length));
    next.classList.add('primary');
    box.append(next);
    return;
  }
  for (const [label, clip, loop] of MOVES) {
    const b = button(label, () => {
      if (battle.on) stopBattle();
      play(clip, loop);
      renderMoves();
    });
    if (loop && activeLoop === clip) b.classList.add('on');
    box.append(b);
  }
  for (const [label, eyes, mouth] of FACES) {
    const b = button(label, () => (faceHold = { eyes, mouth, left: 1.6 }));
    b.classList.add('face');
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
    selectTab(t.dataset.tab as Tab);
  });
}

function selectTab(next: Tab): void {
  if (battle.on && next !== 'battle') stopBattle();
  tab = next;
  for (const o of document.querySelectorAll<HTMLButtonElement>('.tabs button')) o.setAttribute('aria-selected', String(o.dataset.tab === tab));
  if (tab === 'story') showLine(0);
  renderMoves();
}

// ---------- story

let storyAt = 0;
let typing = 0;
function showLine(i: number): void {
  storyAt = i;
  const line = STORY[i];
  ($('portrait') as HTMLImageElement).src = assetUrl(`sprites/hero/${line.portrait}.png`);
  $('line').textContent = '';
  typing = 0;
  if (line.face) faceHold = { eyes: line.face[0], mouth: line.face[1], left: 2.4 };
  if (line.move) play(line.move, false);
  renderMoves();
}

// Tapping the hero gets a cheer.
renderer.domElement.addEventListener('pointerup', (e) => {
  if (battle.on) return;
  const r = renderer.domElement.getBoundingClientRect();
  const x = (e.clientX - r.left - stage.width / 2 - set.position.x) / fit;
  const y = (stage.height / 2 - (e.clientY - r.top) - set.position.y) / fit;
  if (Math.abs(x - HERO_X) < 140 && y > -20 && y < 400) {
    void sfx.unlock();
    play('cheer', false);
  }
});

// ---------- tiny scheduler on game time (so slow-mo stretches sequences too)

const timers: { at: number; fn: () => void }[] = [];
let gameClock = 0;
function afterGame(seconds: number, fn: () => void): void {
  timers.push({ at: gameClock + seconds, fn });
}

// ---------- battle

const battle = { on: false, hp: 100, state: 'up' as 'up' | 'down' | 'spawn', spawnT: 0, sway: 0, swayV: 0 };
const MAX_HP = 120;

interface Arrow {
  mesh: THREE.Mesh;
  trail: Trail;
  vel: THREE.Vector3;
  age: number;
  homing: boolean;
}
const arrows: Arrow[] = [];
const fading: Trail[] = [];
const TRAIL = new THREE.Color(1.0, 0.72, 0.3);
const arrowSprite = assets.sprites.arrow;
const ARROW_LEN = 430 * HERO_SIZE;
const arrowGeo = spriteGeometry(arrowSprite.w, arrowSprite.h).translate(-arrowSprite.w / 2, arrowSprite.h / 2, 0);
const arrowMat = spriteMaterial(assets.textures.arrow, flash0);

function startBattle(): void {
  battle.on = true;
  battle.hp = MAX_HP;
  battle.state = 'up';
  target.scale.setScalar(1);
  target.visible = true;
  pirate.opacity(1);
  pirateAnim.play('idle', { fade: 0.1 });
  play('rapid', true);
}

function stopBattle(): void {
  battle.on = false;
  play('idle', true);
}

anim.onEvent = (name) => {
  if (name === 'release') fireArrow(battle.on && battle.state === 'up');
};

const local = new THREE.Vector3();
/** A puppet point in island space. */
function heroPoint(name: string, out = new THREE.Vector3()): THREE.Vector3 {
  const [x, y] = hero.point(name);
  return out.set(HERO_X + x * HERO_SIZE, hero.root.position.y + y * HERO_SIZE, 0);
}

function fireArrow(homing: boolean): void {
  const grip = heroPoint('bow.grip');
  const dir = homing ? BULLSEYE.clone().sub(grip).normalize() : new THREE.Vector3(1, 0.04, 0);
  const mesh = new THREE.Mesh(arrowGeo, arrowMat);
  mesh.scale.setScalar(ARROW_LEN / arrowSprite.w);
  mesh.renderOrder = 400;
  mesh.position.copy(grip);
  const trail = new Trail(TRAIL, 5, 16, 170);
  trail.mesh.renderOrder = 390;
  island.add(mesh, trail.mesh);
  arrows.push({ mesh, trail, vel: dir.multiplyScalar(1500), age: 0, homing });
  fx.flash(grip, new THREE.Color(1, 0.9, 0.6));
  sfx.play('shoot', 0.4);
}

function toWorld(v: THREE.Vector3): THREE.Vector3 {
  return island.localToWorld(v.clone());
}

function hitTarget(at: THREE.Vector3, dir: THREE.Vector3, base: number, forceCrit = false): void {
  const crit = forceCrit || Math.random() < 0.22;
  const dmg = Math.round(crit ? base * 2.3 : base);
  battle.hp -= dmg;
  pirate.hitFlash(1);
  if (battle.hp > 0) pirateAnim.oneShot('hit', 'idle', { fade: 0.05 });
  battle.swayV += crit ? 5 : 2.5;
  fx.sparks(at, crit ? new THREE.Color(1, 0.75, 0.25) : new THREE.Color(1, 0.95, 0.75), dir, crit ? 22 : 12);
  numbers.spawn(String(dmg), toWorld(at.clone().add(local.set(0, 60, 0))), crit ? 'crit' : 'hit');
  sfx.play('hit', crit ? 0.6 : 0.4);
  if (crit) {
    time.hitStop(70);
    shake.add(0.35);
  } else shake.add(0.12);
  if (battle.hp <= 0) breakTarget();
}

function breakTarget(): void {
  battle.state = 'down';
  time.hitStop(110);
  time.slowMo(0.35, 0.8);
  shake.add(0.6);
  sfx.play('enemy_die', 0.6);
  sfx.play('explosion', 0.35);
  burstCoins(BULLSEYE, 8);
  // He goes down seeing spirals, then vanishes in a puff.
  pirateAnim.play('ko', { once: true, fade: 0.05 });
  afterGame(1.3, () => {
    fx.poof(new THREE.Vector3(TARGET_X + 70, 60, 0), 1.4);
    target.visible = false;
  });
  play('cheer', false);
  afterGame(1.8, respawn);
}

function respawn(): void {
  if (!battle.on) return;
  battle.hp = MAX_HP;
  battle.state = 'spawn';
  battle.spawnT = 0;
  target.visible = true;
  target.scale.setScalar(0.01);
  // Back on his feet with a cheeky taunt.
  pirateAnim.oneShot('taunt', 'idle', { fade: 0 });
  fx.poof(BULLSEYE, 0.9, 10);
}

function skyFlash(): void {
  fx.ring(new THREE.Vector3(HERO_X, -10, 0), new THREE.Color(0.45, 0.95, 1), 1.6);
  time.slowMo(0.3, 1.1);
  shake.add(0.5);
  sfx.play('zap', 0.6);
}

function skyBurst(): void {
  anim.oneShot('cast', battle.on ? 'rapid' : 'idle', { fade: 0.1 });
  afterGame(0.35, () => {
    skyFlash();
    if (battle.on && battle.state === 'up')
      afterGame(0.25, () => {
        if (battle.state !== 'up') return;
        hitTarget(BULLSEYE.clone(), new THREE.Vector3(1, 0, 0), 60, true);
        fx.ring(BULLSEYE, new THREE.Color(0.6, 1, 1), 0.6, 24);
      });
  });
}

// ---------- coins

const coinArt = paintCoin();
interface Coin {
  mesh: THREE.Mesh;
  vel: THREE.Vector3;
  age: number;
  spin: number;
}
const coins: Coin[] = [];
let coinCount = 0;

function burstCoins(at: THREE.Vector3, n: number): void {
  for (let i = 0; i < n; i++) {
    const mesh = spriteMesh(coinArt, 0.55, 300);
    mesh.geometry = mesh.geometry.clone().translate(-coinArt.w / 2, coinArt.h / 2, 0);
    mesh.position.copy(at);
    island.add(mesh);
    coins.push({ mesh, vel: new THREE.Vector3((Math.random() - 0.5) * 700, 650 + Math.random() * 350, 0), age: 0, spin: Math.random() * 6 });
  }
}

function updateCoins(dt: number): void {
  const chest = new THREE.Vector3(HERO_X, 190, 0);
  for (let i = coins.length - 1; i >= 0; i--) {
    const c = coins[i];
    c.age += dt;
    c.spin += dt * 9;
    c.mesh.scale.x = 0.55 * Math.abs(Math.cos(c.spin));
    if (c.age < 0.8) {
      c.vel.y -= 2200 * dt;
      c.mesh.position.addScaledVector(c.vel, dt);
      if (c.mesh.position.y < 10) {
        c.mesh.position.y = 10;
        c.vel.y = Math.abs(c.vel.y) * 0.45;
        c.vel.x *= 0.7;
      }
    } else {
      // Pulled into the hero, faster and faster.
      const to = chest.clone().sub(c.mesh.position);
      const d = to.length();
      c.vel.lerp(to.normalize().multiplyScalar(500 + (c.age - 0.8) * 3000), Math.min(1, dt * 8));
      c.mesh.position.addScaledVector(c.vel, dt);
      if (d < 40) {
        island.remove(c.mesh);
        coins.splice(i, 1);
        coinCount++;
        $('coins').textContent = String(coinCount);
        const purse = $('purse');
        purse.classList.remove('bump');
        void purse.offsetWidth;
        purse.classList.add('bump');
        fx.glitter(chest, new THREE.Color(1, 0.85, 0.3), 4);
        sfx.play('coin', 0.35, 0.15);
      }
    }
  }
}

// ---------- loop

let last = performance.now();
let dustT = 0;

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

  // Sky and island drift.
  island.position.y = Math.sin((now / 1000) * 0.7) * 6;
  for (const c of clouds) {
    c.x = (c.x + (realDt * c.speed * (0.4 + 0.6 * time.scale)) / stage.width) % 1.3;
    c.mesh.position.set((c.x - 0.65) * (stage.width + 400), stage.height * (0.5 - c.y) + 60, 0);
  }

  // Hero.
  let pose: Pose2D = anim.update(dt);
  if (faceHold) {
    faceHold.left -= dt;
    pose = layer(pose, { slots: { eyes: faceHold.eyes, mouth: faceHold.mouth } });
    if (faceHold.left <= 0) faceHold = null;
  }
  hero.setPose(pose);
  hero.update(dt);
  const lift = Math.max(0, hero.skeleton.joint('hips')[1] - 550) * HERO_SIZE;
  heroShadow.place(HERO_X, hero.root.position.y, lift);
  dustT -= dt;
  if (dustT <= 0 && ['run', 'walk', 'dodge'].includes(anim.playing)) {
    dustT = anim.playing === 'walk' ? 0.2 : 0.08;
    fx.dust(new THREE.Vector3(HERO_X - 20 + Math.random() * 60, -6, 0));
  }

  // Target: spring sway, flash fade, pop-in after a respawn.
  battle.swayV += (-60 * battle.sway - 5 * battle.swayV) * dt;
  battle.sway += battle.swayV * dt;
  target.rotation.z = -battle.sway * 0.04;
  pirate.setPose(pirateAnim.update(dt));
  pirate.update(dt);
  if (battle.state === 'spawn') {
    battle.spawnT += dt;
    const k = Math.min(1, battle.spawnT / 0.35);
    target.scale.setScalar(Math.max(0.01, 1 + 2.2 * (k - 1) ** 3 + 1.2 * (k - 1) ** 2));
    if (k >= 1) battle.state = 'up';
  }

  for (let i = arrows.length - 1; i >= 0; i--) {
    const ar = arrows[i];
    ar.age += dt;
    if (ar.homing && battle.state === 'up') {
      const want = BULLSEYE.clone().sub(ar.mesh.position);
      const dist = want.length();
      ar.vel.lerp(want.normalize().multiplyScalar(1500), Math.min(1, dt * 10));
      if (dist < 40) {
        hitTarget(ar.mesh.position.clone(), ar.vel.clone().normalize(), 20 + Math.floor(Math.random() * 13));
        ar.trail.detach();
        fading.push(ar.trail);
        island.remove(ar.mesh);
        arrows.splice(i, 1);
        continue;
      }
    } else ar.vel.y -= 600 * dt;
    ar.mesh.position.addScaledVector(ar.vel, dt);
    ar.mesh.rotation.z = Math.atan2(ar.vel.y, ar.vel.x);
    ar.trail.push(ar.mesh.position);
    if (ar.age > 1.2) {
      ar.trail.detach();
      fading.push(ar.trail);
      island.remove(ar.mesh);
      arrows.splice(i, 1);
    }
  }
  for (const ar of arrows) ar.trail.update(camera);
  for (let i = fading.length - 1; i >= 0; i--) {
    fading[i].update(camera);
    if (fading[i].done) {
      island.remove(fading[i].mesh);
      fading[i].dispose();
      fading.splice(i, 1);
    }
  }

  updateCoins(dt);
  fx.update(dt, renderer.getPixelRatio() * fit);

  // Story text types itself out.
  if (tab === 'story') {
    const text = STORY[storyAt].text;
    typing = Math.min(text.length, typing + realDt * 40);
    $('line').textContent = text.slice(0, Math.floor(typing));
  }

  numbers.update(realDt, camera, stage.width, stage.height);
  shake.update(realDt);
  shake.apply(camera);
  stage.render();
  shake.restore(camera);
  requestAnimationFrame(frame);
}
renderMoves();
layout();
if (autoBattle) {
  selectTab('battle');
  startBattle();
  renderMoves();
}
requestAnimationFrame(frame);
window.__ready = true;
window.__showcase = { hero, anim, startBattle, stopBattle, skyBurst, time, selectTab };
