/**
 * Playable test level: the level 1 battle on the layout sketch, with stand-in pirates and towers and the real
 * Little Archer. Tap a stone spot to build, tap the ground to move the hero (he shoots by himself when he
 * stands still), drag to look around and pinch to zoom. The rules live in src/td/battle.ts; this file only
 * draws them and turns battle events into animation, sound and effects.
 */
import '@fontsource/fredoka/500.css';
import '@fontsource/fredoka/600.css';
import '@fontsource/fredoka/700.css';
import './play.css';
import * as THREE from 'three';
import { sfx } from '../audio/sfx';
import { Gestures } from '../engine/input';
import { DamageNumbers } from '../fx/damageNumbers';
import { Fx2D } from '../fx/fx2d';
import { Shake } from '../fx/shake';
import { GameTime } from '../fx/time';
import { Trail } from '../fx/trail';
import { Animator2D } from '../puppet/animator';
import { heroClips } from '../puppet/clips/hero';
import { loadPuppet, loadTexture } from '../puppet/loader';
import { Puppet, spriteGeometry, spriteMaterial } from '../puppet/puppet';
import type { Painted } from '../showcase/art';
import { Shadow } from '../stage/shadow';
import { createStage2D } from '../stage/stage2d';
import { Battle, type BattleEvent, type Enemy, type Shot } from '../td/battle';
import { nextCost, sellValue } from '../td/economy';
import { LEVEL1 } from '../td/levels';
import type { Pt } from '../td/path';
import { TOWERS } from '../td/units';
import { paintCrystal, paintPirate, paintRing, paintTower } from './art';
import { clampView, pan, toMap, toScreen, zoomAt, type Bounds, type View } from './view';

declare global {
  interface Window {
    __ready?: boolean;
    __play?: unknown;
  }
}

const MARKUP = `
<div class="app">
  <div id="stage" class="stage"></div>
  <div id="fx" class="fx-layer" aria-hidden="true"></div>
  <header class="hud">
    <div class="stat" id="crystal-stat" aria-label="Crystals left"><i class="gem"></i><b id="crystals">20</b></div>
    <div class="stat" id="gold-stat" aria-label="Gold"><i class="coin"></i><b id="gold">0</b></div>
    <div class="stat wave" aria-label="Wave"><span>Wave</span><b id="wave">0/6</b></div>
    <span class="spacer"></span>
    <button type="button" class="pill" id="speed" aria-label="Game speed">×1</button>
  </header>
  <button type="button" class="call" id="call">Start battle</button>
  <div class="menu" id="menu" hidden></div>
  <p class="banner" id="banner" aria-live="polite"></p>
  <p class="hint" id="hint">Tap a stone spot to build a tower · tap the grass to move</p>
  <div class="end" id="end" hidden>
    <div class="end-card">
      <h1 id="end-title"></h1>
      <p class="stars" id="end-stars"></p>
      <p id="end-note"></p>
      <button type="button" id="again">Play again</button>
    </div>
  </div>
  <div class="loading" id="loading"><div class="bar"><i id="bar"></i></div><span>Sailing to Sky Haven…</span></div>
</div>`;
document.body.insertAdjacentHTML('afterbegin', MARKUP);
const $ = (id: string) => document.getElementById(id)!;

const level = LEVEL1;
const params = new URLSearchParams(location.search);
const SEED = Number(params.get('seed') ?? 1 + Math.floor(Math.random() * 1e6));

// Draw order: the map, then shadows and rings, then everything standing on the map sorted by its feet
// (lower on screen draws on top), then arrows and effects.
const ORDER_SHADOW = 10;
const ORDER_RING = 20;
const ORDER_ARROW = 9_000_000;
const ORDER_FX = 9_500_000;
const sortOrder = (mapY: number) => 1000 + Math.round(mapY) * 100;

/** Map point → world (y-up). */
const world = (p: Pt, lift = 0, out = new THREE.Vector3()) => out.set(p[0], -p[1] + lift, 0);

// ---------- stage and camera

const stage = createStage2D($('stage'));
const { scene, camera, renderer } = stage;
const bar = $('bar') as HTMLElement;
bar.style.width = '20%';

const bounds = (): Bounds => ({ screenW: stage.width, screenH: stage.height, mapW: level.map.w, mapH: level.map.h, maxZoom: 1.6 });
let view: View = clampView({ cx: 820, cy: 540, zoom: Math.max(0.62, stage.height / 820) }, bounds());

function applyView(): void {
  view = clampView(view, bounds());
  camera.zoom = view.zoom;
  camera.position.set(view.cx, -view.cy, 1000);
  camera.updateProjectionMatrix();
}
window.addEventListener('resize', () => requestAnimationFrame(applyView));

const flash0 = { value: 0 };
/** A sprite whose origin is at its bottom centre (feet) or centre. */
function sprite(p: Painted, scale: number, anchor: 'feet' | 'centre', flash = flash0): THREE.Mesh {
  const geo = spriteGeometry(p.w, p.h).translate(-p.w / 2, anchor === 'feet' ? p.h : p.h / 2, 0);
  const mesh = new THREE.Mesh(geo, spriteMaterial(p.texture, flash));
  mesh.scale.set(scale, scale, 1);
  return mesh;
}

const [mapTexture, heroAssets] = await Promise.all([loadTexture(level.map.art ?? level.map.sketch, renderer), loadPuppet('hero', renderer)]);
bar.style.width = '90%';
const map = new THREE.Mesh(spriteGeometry(level.map.w, level.map.h), spriteMaterial(mapTexture, flash0));
map.renderOrder = 0;
scene.add(map);

const fx = new Fx2D(105);
fx.soft.points.renderOrder = ORDER_FX;
fx.glow.points.renderOrder = ORDER_FX + 1;
scene.add(fx.group);
const numbers = new DamageNumbers($('fx'));
const time = new GameTime();
const shake = new Shake(10);
shake.enabled = !window.matchMedia('(prefers-reduced-motion: reduce)').matches;

const PIRATE_ART = { deckhand: paintPirate('deckhand'), powderMonkey: paintPirate('powderMonkey') };
const TOWER_ART = [1, 2, 3].map(paintTower);
const CRYSTAL_ART = paintCrystal();
const RING_ART = paintRing();
const CYAN = new THREE.Color(0.45, 1, 1);
const GOLD = new THREE.Color(1, 0.85, 0.3);
const TRAIL = new THREE.Color(1, 0.75, 0.35);

// ---------- hero

const HERO_SIZE = 0.08;
const hero = new Puppet(heroAssets);
hero.size = HERO_SIZE;
scene.add(hero.root);
const heroShadow = new Shadow(520 * HERO_SIZE);
heroShadow.mesh.renderOrder = ORDER_SHADOW;
scene.add(heroShadow.mesh);
const anim = new Animator2D(heroClips);
anim.play('idle');
const arrowSprite = heroAssets.sprites.arrow;
const arrowGeo = spriteGeometry(arrowSprite.w, arrowSprite.h).translate(-arrowSprite.w / 2, arrowSprite.h / 2, 0);
const arrowMat = spriteMaterial(heroAssets.textures.arrow, flash0);
const ARROW_SCALE = (430 * HERO_SIZE) / arrowSprite.w;

// ---------- views of battle things, rebuilt on restart

interface PirateView {
  enemy: Enemy;
  group: THREE.Group;
  body: THREE.Mesh;
  flash: { value: number };
  shadow: Shadow;
  hpBack: THREE.Mesh;
  hpFill: THREE.Mesh;
  crystal: THREE.Mesh;
  phase: number;
  /** Seconds since it fell or escaped; the view fades out, then goes. */
  leaving: number;
}

interface TowerView {
  mesh: THREE.Mesh;
  level: number;
  recoil: number;
}

interface ArrowView {
  mesh: THREE.Mesh;
  trail: Trail;
}

let battle: Battle;
const pirates = new Map<number, PirateView>();
const towers = new Map<number, TowerView>();
const arrows = new Map<number, ArrowView>();
const fading: Trail[] = [];
const dropped = new Map<number, THREE.Mesh>();
const hpGeo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);

function addPirate(e: Enemy): void {
  const flash = { value: 0 };
  const group = new THREE.Group();
  const art = PIRATE_ART[e.kind];
  const body = sprite(art, (e.def.radius * 2.6) / art.h, 'feet', flash);
  const crystal = sprite(CRYSTAL_ART, 0.42, 'centre');
  crystal.position.y = e.def.radius * 2.6 + 18;
  crystal.visible = false;
  const hpBack = new THREE.Mesh(hpGeo, new THREE.MeshBasicMaterial({ color: 0x3b2a2a, depthTest: false, depthWrite: false, transparent: true }));
  const hpFill = new THREE.Mesh(hpGeo, new THREE.MeshBasicMaterial({ color: 0x7ee05a, depthTest: false, depthWrite: false, transparent: true }));
  hpBack.scale.set(40, 7, 1);
  hpBack.position.set(-20, e.def.radius * 2.6 + 6, 0);
  hpFill.position.set(-19, e.def.radius * 2.6 + 6, 0);
  group.add(body, crystal, hpBack, hpFill);
  const shadow = new Shadow(e.def.radius * 2.4);
  shadow.mesh.renderOrder = ORDER_SHADOW;
  scene.add(group, shadow.mesh);
  pirates.set(e.id, { enemy: e, group, body, flash, shadow, hpBack, hpFill, crystal, phase: Math.random() * 6, leaving: -1 });
}

function removePirate(v: PirateView): void {
  scene.remove(v.group, v.shadow.mesh);
  pirates.delete(v.enemy.id);
}

function setTower(slot: number): void {
  const t = battle.towers[slot];
  const old = towers.get(slot);
  if (old && (!t || old.level !== t.level)) {
    scene.remove(old.mesh);
    towers.delete(slot);
  }
  if (!t || towers.has(slot)) return;
  const [x, y] = level.slots[slot];
  const mesh = sprite(TOWER_ART[t.level - 1], (level.slotRadius * 2.1) / 150, 'feet');
  world([x, y + 20], 0, mesh.position);
  mesh.renderOrder = sortOrder(y + 20);
  scene.add(mesh);
  towers.set(slot, { mesh, level: t.level, recoil: 0 });
}

function addArrow(s: Shot): void {
  const mesh = new THREE.Mesh(arrowGeo, arrowMat);
  mesh.scale.setScalar(ARROW_SCALE);
  mesh.renderOrder = ORDER_ARROW;
  const trail = new Trail(TRAIL, 2.2, 12, 70);
  trail.mesh.renderOrder = ORDER_ARROW - 1;
  scene.add(mesh, trail.mesh);
  arrows.set(s.id, { mesh, trail });
}

function finishArrow(id: number): void {
  const a = arrows.get(id);
  if (!a) return;
  a.trail.detach();
  fading.push(a.trail);
  scene.remove(a.mesh);
  arrows.delete(id);
}

function newBattle(): void {
  for (const v of [...pirates.values()]) removePirate(v);
  for (const t of towers.values()) scene.remove(t.mesh);
  towers.clear();
  for (const id of [...arrows.keys()]) finishArrow(id);
  for (const m of dropped.values()) scene.remove(m);
  dropped.clear();
  battle = new Battle(level, SEED + Math.floor(Math.random() * 1000));
  anim.play('idle', { fade: 0.2 });
  closeMenu();
  ($('end') as HTMLElement).hidden = true;
  $('hint').classList.remove('gone');
  hudDirty = true;
}

// ---------- HUD

let hudDirty = true;
let speed = 1;
const last = { crystals: -1, gold: -1, wave: '', call: '' };

function bump(id: string, cls = 'bump'): void {
  const el = $(id);
  el.classList.remove(cls);
  void el.offsetWidth;
  el.classList.add(cls);
}

function updateHud(): void {
  const crystals = battle.vault.remaining;
  if (crystals !== last.crystals) $('crystals').textContent = String((last.crystals = crystals));
  const gold = battle.purse.gold;
  if (gold !== last.gold) $('gold').textContent = String((last.gold = gold));
  const wave = `${Math.max(0, battle.waves.wave + 1)}/${battle.waves.waves.length}`;
  if (wave !== last.wave) $('wave').textContent = last.wave = wave;
  const call = $('call') as HTMLButtonElement;
  const label = !battle.waves.canCall || battle.over
    ? ''
    : battle.waves.wave < 0
      ? 'Start battle'
      : `Next wave${Number.isFinite(battle.waves.countdown) ? ` +${Math.round(battle.waves.countdown)}` : ''}`;
  if (label !== last.call) {
    last.call = label;
    call.hidden = !label;
    call.textContent = label;
    call.classList.toggle('first', battle.waves.wave < 0);
  }
  if (menuSlot !== null && hudDirty) renderMenu();
  hudDirty = false;
}

function showBanner(text: string): void {
  const b = $('banner');
  b.textContent = text;
  bump('banner', 'show');
}

$('call').addEventListener('click', () => {
  void sfx.unlock();
  battle.callWave();
});
$('speed').addEventListener('click', () => {
  void sfx.unlock();
  speed = speed === 1 ? 2 : 1;
  $('speed').textContent = `×${speed}`;
  $('speed').classList.toggle('on', speed === 2);
});
$('again').addEventListener('click', () => {
  sfx.play('click', 0.35, 0);
  newBattle();
});

// ---------- tower menu

let menuSlot: number | null = null;
const ring = sprite(RING_ART, 1, 'centre');
ring.renderOrder = ORDER_RING;
ring.visible = false;
scene.add(ring);

function openMenu(slot: number): void {
  menuSlot = slot;
  renderMenu();
  sfx.play('click', 0.3, 0);
}

function closeMenu(): void {
  menuSlot = null;
  ($('menu') as HTMLElement).hidden = true;
  ring.visible = false;
}

function menuButton(label: string, cost: string, enabled: boolean, onClick: () => void): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span>${label}</span><b>${cost}</b>`;
  b.disabled = !enabled;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    void sfx.unlock();
    onClick();
  });
  return b;
}

function renderMenu(): void {
  if (menuSlot === null) return;
  const slot = menuSlot;
  const menu = $('menu') as HTMLElement;
  menu.replaceChildren();
  const t = battle.towers[slot];
  const def = TOWERS.archer;
  let range: number;
  if (!t) {
    const cost = nextCost(def, 0)!;
    range = def.levels[0].range;
    menu.append(menuButton('Archer Tower', `◉ ${cost}`, battle.purse.canAfford(cost), () => {
      if (battle.build(slot)) closeMenu();
    }));
  } else {
    const cost = nextCost(TOWERS[t.kind], t.level);
    range = TOWERS[t.kind].levels[Math.min(t.level, TOWERS[t.kind].levels.length - 1)].range;
    menu.append(
      cost === null
        ? menuButton(`Level ${t.level}`, 'MAX', false, () => {})
        : menuButton(`Upgrade to ${t.level + 1}`, `◉ ${cost}`, battle.purse.canAfford(cost), () => {
            if (battle.upgrade(slot)) renderMenu();
          }),
      menuButton('Sell', `+${sellValue(TOWERS[t.kind], t.level)}`, true, () => {
        battle.sell(slot);
        closeMenu();
      }),
    );
  }
  menu.hidden = false;
  ring.visible = true;
  world(level.slots[slot], 0, ring.position);
  ring.scale.setScalar((range * 2) / 244);
  placeMenu();
}

function placeMenu(): void {
  if (menuSlot === null) return;
  const [x, y] = toScreen(view, bounds(), level.slots[menuSlot]);
  const menu = $('menu');
  const w = menu.offsetWidth;
  const h = menu.offsetHeight;
  const left = Math.min(stage.width - w - 8, Math.max(8, x - w / 2));
  const above = y - level.slotRadius * view.zoom - h - 10;
  const top = above > 50 ? above : y + level.slotRadius * view.zoom + 10;
  menu.style.transform = `translate(${left.toFixed(0)}px, ${Math.min(stage.height - h - 8, top).toFixed(0)}px)`;
}

// ---------- input

function slotAt(p: Pt): number | null {
  let best: number | null = null;
  let bestD = level.slotRadius * 1.3;
  level.slots.forEach(([x, y], i) => {
    const d = Math.hypot(p[0] - x, p[1] - y);
    if (d < bestD) {
      bestD = d;
      best = i;
    }
  });
  return best;
}

function tap(x: number, y: number): void {
  void sfx.unlock();
  if (battle.over) return;
  const p = toMap(view, bounds(), [x, y]);
  const slot = slotAt(p);
  if (slot !== null) {
    if (menuSlot === slot) closeMenu();
    else openMenu(slot);
    return;
  }
  if (menuSlot !== null) {
    closeMenu();
    return;
  }
  if (battle.moveHero(p)) {
    fx.ring(world(p), new THREE.Color(1, 1, 0.85), 0.18, 18);
    if (anim.playing !== 'run') anim.play('run', { fade: 0.12 });
  }
}

new Gestures($('stage'), {
  tap,
  drag: (x, y, px, py) => {
    view = pan(view, bounds(), x - px, y - py);
  },
  pinch: (scale, cx, cy, pcx, pcy) => {
    view = pan(zoomAt(view, bounds(), scale, [cx, cy]), bounds(), cx - pcx, cy - pcy);
  },
  wheel: (delta, x, y) => {
    view = zoomAt(view, bounds(), Math.exp(-delta * 0.0015), [x, y]);
  },
});

// ---------- battle events → feel

const tmp = new THREE.Vector3();

function onEvent(ev: BattleEvent): void {
  switch (ev.type) {
    case 'wave':
      showBanner(`Wave ${ev.index + 1}`);
      $('hint').classList.add('gone');
      if (ev.bonus > 0) numbers.spawn(`+${ev.bonus}`, world(level.dock, 40), 'gold');
      sfx.play('levelup', 0.25);
      break;
    case 'spawn':
      addPirate(ev.enemy);
      fx.poof(world(ev.enemy.pos, 10), 0.5, 8);
      break;
    case 'draw':
      anim.oneShot('rapid', 'idle', { fade: 0.06 });
      break;
    case 'shoot':
      addArrow(ev.shot);
      fx.flash(world(ev.from), new THREE.Color(1, 0.9, 0.6));
      sfx.play('shoot', ev.tower ? 0.12 : 0.3);
      if (ev.tower) {
        const tv = towers.get(ev.tower.slot);
        if (tv) tv.recoil = 1;
      }
      break;
    case 'hit': {
      const v = pirates.get(ev.enemy.id);
      if (v) v.flash.value = 1;
      const at = world(ev.at);
      fx.sparks(at, ev.crit ? new THREE.Color(1, 0.75, 0.25) : new THREE.Color(1, 0.95, 0.75), undefined, ev.crit ? 18 : 8);
      numbers.spawn(String(ev.damage), at.clone().add(tmp.set(0, 26, 0)), ev.crit ? 'crit' : 'hit');
      sfx.play('hit', ev.crit ? 0.5 : 0.25);
      if (ev.crit) {
        time.hitStop(50);
        shake.add(0.22);
      }
      break;
    }
    case 'kill': {
      const v = pirates.get(ev.enemy.id);
      if (v) v.leaving = 0;
      const at = world(ev.enemy.pos, ev.enemy.def.radius);
      fx.poof(at, 0.55, 12);
      fx.glitter(at, GOLD, 6);
      numbers.spawn(`+${ev.bounty}`, at.clone().add(tmp.set(0, 40, 0)), 'gold');
      sfx.play('enemy_die', 0.35);
      sfx.play('coin', 0.2, 0.15);
      hudDirty = true;
      break;
    }
    case 'steal':
      fx.glitter(world(ev.enemy.pos, 40), CYAN, 8);
      sfx.play('zap', 0.25);
      break;
    case 'drop':
      fx.glitter(world(ev.at, 30), CYAN, 12);
      sfx.play('xp', 0.4);
      break;
    case 'recover':
      fx.glitter(world(level.vault, 30), CYAN, 14);
      sfx.play('coin', 0.25);
      break;
    case 'escape': {
      const v = pirates.get(ev.enemy.id);
      if (v) v.leaving = 0;
      if (ev.lost) {
        shake.add(0.35);
        bump('crystal-stat', 'hurt');
        sfx.play('explosion', 0.25);
      }
      break;
    }
    case 'build':
    case 'upgrade': {
      setTower(ev.tower.slot);
      const at = world(level.slots[ev.tower.slot], 10);
      fx.poof(at, 0.8, 14);
      fx.glitter(at.add(tmp.set(0, 60, 0)), GOLD, 10);
      sfx.play('levelup', 0.3);
      hudDirty = true;
      break;
    }
    case 'sell':
      setTower(ev.slot);
      fx.poof(world(level.slots[ev.slot], 10), 0.8, 14);
      numbers.spawn(`+${ev.refund}`, world(level.slots[ev.slot], 60), 'gold');
      sfx.play('coin', 0.3);
      hudDirty = true;
      break;
    case 'win':
      endScreen(true, ev.stars);
      break;
    case 'lose':
      endScreen(false, 0);
      break;
  }
}

function endScreen(won: boolean, stars: number): void {
  closeMenu();
  anim.play(won ? 'cheer' : 'ko', { fade: 0.15, once: true });
  sfx.play(won ? 'levelup' : 'explosion', 0.5);
  if (won) time.slowMo(0.4, 0.8);
  setTimeout(() => {
    $('end-title').textContent = won ? 'Victory!' : 'The crystals are gone…';
    $('end-stars').textContent = won ? '★'.repeat(stars) + '☆'.repeat(3 - stars) : '';
    $('end-note').textContent = `${battle.vault.remaining} of ${battle.vault.total} crystals saved`;
    ($('end') as HTMLElement).hidden = false;
  }, 1200);
}

// ---------- frame

function syncPirates(dt: number, t: number): void {
  const alive = new Set(battle.enemies.map((e) => e.id));
  for (const v of [...pirates.values()]) {
    const e = v.enemy;
    if (v.leaving < 0 && !alive.has(e.id)) v.leaving = 0;
    if (v.leaving >= 0) {
      v.leaving += dt;
      const k = Math.min(1, v.leaving / 0.25);
      v.group.scale.set(1 + 0.4 * k, 1 - 0.6 * k, 1);
      (v.body.material as THREE.ShaderMaterial).uniforms.opacity.value = 1 - k;
      v.crystal.visible = false;
      v.hpBack.visible = v.hpFill.visible = false;
      if (k >= 1) removePirate(v);
      continue;
    }
    const moving = Math.hypot(e.vel[0], e.vel[1]) > 1;
    v.phase += dt * (e.def.speed / 6);
    const hop = moving ? Math.abs(Math.sin(v.phase)) * 4 : 0;
    world(e.pos, hop, v.group.position);
    v.group.rotation.z = moving ? Math.sin(v.phase) * 0.07 : 0;
    if (Math.abs(e.vel[0]) > 2) v.body.scale.x = Math.abs(v.body.scale.x) * Math.sign(e.vel[0]);
    v.shadow.place(e.pos[0], -e.pos[1], hop);
    const order = sortOrder(e.pos[1]);
    v.body.renderOrder = order;
    v.crystal.renderOrder = order + 2;
    v.hpBack.renderOrder = order + 3;
    v.hpFill.renderOrder = order + 4;
    v.crystal.visible = e.carrying;
    v.crystal.position.x = Math.sin(t * 3 + v.phase) * 1.5;
    const share = Math.max(0, e.hp / e.def.hp);
    v.hpBack.visible = v.hpFill.visible = share < 1;
    v.hpFill.scale.set(38 * share, 5, 1);
    (v.hpFill.material as THREE.MeshBasicMaterial).color.setHex(share > 0.5 ? 0x7ee05a : share > 0.25 ? 0xf4c34f : 0xe5533d);
    v.flash.value = Math.max(0, v.flash.value - dt * 9);
  }
}

function syncArrows(): void {
  const live = new Map(battle.shots.map((s) => [s.id, s]));
  for (const id of [...arrows.keys()]) if (!live.has(id)) finishArrow(id);
  for (const [id, a] of arrows) {
    const s = live.get(id)!;
    world(s.pos, 0, a.mesh.position);
    a.mesh.rotation.z = Math.atan2(-s.dir[1], s.dir[0]);
    a.trail.push(a.mesh.position);
  }
  for (const a of arrows.values()) a.trail.update(camera);
  for (let i = fading.length - 1; i >= 0; i--) {
    fading[i].update(camera);
    if (fading[i].done) {
      scene.remove(fading[i].mesh);
      fading[i].dispose();
      fading.splice(i, 1);
    }
  }
}

function syncCrystals(t: number): void {
  const now = new Set<number>();
  for (const c of battle.vault.dropped()) {
    now.add(c.id);
    let m = dropped.get(c.id);
    if (!m) {
      m = sprite(CRYSTAL_ART, 0.42, 'centre');
      scene.add(m);
      dropped.set(c.id, m);
    }
    const p = battle.path.at(c.d);
    world(p, 22 + Math.sin(t * 4 + c.id) * 5, m.position);
    m.renderOrder = sortOrder(p[1]);
  }
  for (const [id, m] of dropped)
    if (!now.has(id)) {
      scene.remove(m);
      dropped.delete(id);
    }
}

let dustT = 0;
function syncHero(dt: number): void {
  const h = battle.hero;
  if (!h.goal && anim.playing === 'run') anim.play('idle', { fade: 0.15 });
  hero.facing = h.facing;
  world(h.pos, 0, hero.root.position);
  hero.setOrder(sortOrder(h.pos[1]));
  hero.setPose(anim.update(dt));
  hero.update(dt);
  const lift = Math.max(0, hero.skeleton.joint('hips')[1] - 550) * HERO_SIZE;
  heroShadow.place(h.pos[0], -h.pos[1], lift);
  dustT -= dt;
  if (h.goal && dustT <= 0) {
    dustT = 0.09;
    fx.dust(world([h.pos[0] - h.facing * 8, h.pos[1]], 2), -h.facing);
  }
}

let lastT = performance.now();
let clock = 0;
function frame(now: number): void {
  const realDt = Math.min(0.05, (now - lastT) / 1000);
  lastT = now;
  const dt = time.step(realDt);
  clock += dt;
  battle.step(dt * speed);
  for (const ev of battle.drain()) onEvent(ev);
  syncPirates(dt * speed, clock);
  syncArrows();
  syncCrystals(clock);
  syncHero(dt * speed);
  for (const tv of towers.values()) {
    tv.recoil = Math.max(0, tv.recoil - dt * 6);
    tv.mesh.scale.y = tv.mesh.scale.x * (1 - 0.06 * Math.sin(tv.recoil * Math.PI));
  }
  updateHud();
  applyView();
  placeMenu();
  fx.update(dt, renderer.getPixelRatio() * view.zoom);
  numbers.update(realDt, camera, stage.width, stage.height);
  shake.update(realDt);
  shake.apply(camera);
  stage.render();
  shake.restore(camera);
  requestAnimationFrame(frame);
}

newBattle();
applyView();
$('loading').classList.add('done');
requestAnimationFrame(frame);
window.__ready = true;
window.__play = {
  get battle() {
    return battle;
  },
  get view() {
    return view;
  },
  toScreen: (p: Pt) => toScreen(view, bounds(), p),
  setSpeed: (s: number) => (speed = s),
  newBattle,
};
