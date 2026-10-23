/**
 * Playable test level: the level 1 battle on the layout sketch, with stand-in pirates and towers (archer, cannon,
 * storm crystal, frost cloud) and the real
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
import { Bolt } from '../fx/bolt';
import { DamageNumbers } from '../fx/damageNumbers';
import { Fx2D } from '../fx/fx2d';
import { Shake } from '../fx/shake';
import { GameTime } from '../fx/time';
import { Trail } from '../fx/trail';
import { Animator2D } from '../puppet/animator';
import { CLIPS } from '../puppet/clips';
import { heroClips } from '../puppet/clips/hero';
import { loadPuppet, loadTexture } from '../puppet/loader';
import type { Clip2D } from '../puppet/pose';
import { Puppet, spriteGeometry, spriteMaterial, type PuppetAssets } from '../puppet/puppet';
import type { Painted } from '../showcase/art';
import { Shadow } from '../stage/shadow';
import { createStage2D } from '../stage/stage2d';
import { Battle, TOWER_TOP, type BattleEvent, type Enemy, type Shot } from '../td/battle';
import type { CardDef } from '../td/cards';
import { LEVEL1 } from '../td/levels';
import type { Pt } from '../td/path';
import type { TargetMode } from '../td/targeting';
import { ENEMIES, MAX_LEVEL, SKILLS, TOWER_KINDS, TOWERS, towerSpec, type Branch, type EnemyKind, type SkillName, type TowerKind } from '../td/units';
import { paintBall, paintCrystal, paintEagle, paintFrostWave, paintPirate, paintRing, paintShard, paintTower, paintWhale } from './art';
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
    <div class="picked" id="picked" aria-label="Captain's orders in force"></div>
    <span class="spacer"></span>
    <button type="button" class="pill" id="speed" aria-label="Game speed">×1</button>
  </header>
  <div class="boss" id="boss" hidden><span id="boss-name">First Mate</span><div class="boss-bar"><i id="boss-hp"></i></div></div>
  <div class="skills">
    <button type="button" class="skill" id="skill-talon" aria-label="Talon the eagle: snatch a crystal back"><img alt="" /><span class="cd"></span></button>
    <button type="button" class="skill big" id="skill-mochi" aria-label="Mochi the sky whale: sweep the island"><img alt="" /><span class="cd"></span></button>
  </div>
  <button type="button" class="call" id="call">Start battle</button>
  <div class="menu" id="menu" hidden></div>
  <p class="banner" id="banner" aria-live="polite"></p>
  <p class="hint" id="hint">Tap a stone spot to build a tower · tap the grass to move</p>
  <div class="orders" id="orders" hidden>
    <div class="orders-card">
      <h2>Captain's Orders</h2>
      <p>Pick one. It lasts for the rest of the battle.</p>
      <div class="order-row" id="order-row"></div>
    </div>
  </div>
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

/** Which character draws each pirate, and how tall it stands on the map (px). */
const PIRATE_PUPPETS: Record<EnemyKind, { id: string; height: number }> = {
  deckhand: { id: 'deckhand', height: 90 },
  powderMonkey: { id: 'powder_monkey', height: 65 },
  ironclad: { id: 'ironclad', height: 105 },
  parrot: { id: 'parrot_raider', height: 78 },
  firstMate: { id: 'first_mate', height: 150 },
};

/** A drawn character with its moves, sized for the map. */
interface PuppetLook {
  assets: PuppetAssets;
  clips: Clip2D[];
  size: number;
  /** Head top above the feet (map px). */
  height: number;
  /** The rest pose's bounds in character space (rig px, facing right, y up from the feet). */
  box: THREE.Box3;
  /** The rig's `nose` point at rest, if it has one (Mochi's hit line). */
  nose: [number, number] | null;
}

/**
 * Loads a character's puppet and sizes it so its head top stands `height` px tall, or so its rest pose is
 * `width` px across; null if it isn't drawn yet.
 */
async function puppetLook(id: string, fit: { height: number } | { width: number }): Promise<PuppetLook | null> {
  const clips = CLIPS[id];
  if (!clips?.length) return null;
  const assets = await loadPuppet(id, renderer).catch(() => null);
  if (!assets) return null;
  const probe = new Puppet(assets);
  probe.update(0);
  probe.root.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(probe.root);
  const top = assets.rig.points?.['head.top'] ? probe.point('head.top')[1] : box.max.y;
  const nose = assets.rig.points?.nose ? probe.point('nose') : null;
  probe.dispose();
  const size = 'height' in fit ? fit.height / top : fit.width / (box.max.x - box.min.x);
  return { assets, clips, size, height: top * size, box, nose };
}

const [mapTexture, heroAssets, pirateLooks, talonLook, mochiLook] = await Promise.all([
  loadTexture(level.map.art ?? level.map.sketch, renderer),
  loadPuppet('hero', renderer),
  Promise.all((Object.keys(PIRATE_PUPPETS) as EnemyKind[]).map(async (k) => [k, await puppetLook(PIRATE_PUPPETS[k].id, { height: PIRATE_PUPPETS[k].height })] as const)),
  puppetLook('talon', { width: 125 }),
  puppetLook('mochi', { width: 480 }),
]);
/** Pirates without a drawn puppet yet use a painted stand-in. */
const PIRATE_LOOK = Object.fromEntries(pirateLooks.filter(([, look]) => look)) as Partial<Record<EnemyKind, PuppetLook>>;
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

const PIRATE_ART = Object.fromEntries((Object.keys(ENEMIES) as EnemyKind[]).map((k) => [k, paintPirate(k)])) as Record<EnemyKind, Painted>;
const TOWER_ART = Object.fromEntries(TOWER_KINDS.map((k) => [k, [1, 2, 3].map((l) => paintTower(k, l))])) as Record<TowerKind, Painted[]>;
const BRANCH_ART = Object.fromEntries(TOWER_KINDS.map((k) => [k, [0, 1].map((b) => paintTower(k, MAX_LEVEL, b as Branch))])) as Record<TowerKind, Painted[]>;
const BALL_ART = paintBall();
const SHARD_ART = paintShard();
const EAGLE_ART = paintEagle();
const WHALE_ART = paintWhale();
const CRYSTAL_ART = paintCrystal();
const RING_ART = paintRing();
const FROST_ART = paintFrostWave();
const CYAN = new THREE.Color(0.45, 1, 1);
const GOLD = new THREE.Color(1, 0.85, 0.3);
const TRAIL = new THREE.Color(1, 0.75, 0.35);
const SMOKE = new THREE.Color(0.55, 0.52, 0.5);
const STORM = new THREE.Color(0.72, 0.55, 1);
const ARCANE = new THREE.Color(1, 0.45, 0.85);
const ICE = new THREE.Color(0.6, 0.9, 1);
const RALLY = new THREE.Color(1, 0.45, 0.2);
const FEATHER = new THREE.Color(1, 0.97, 0.88);
const DIZZY = new THREE.Color(1, 0.9, 0.35);
const STEEL = new THREE.Color(0.85, 0.9, 1);
const NO_TINT = new THREE.Color(1, 1, 1);
const CHILL_TINT = new THREE.Color(0.78, 0.92, 1.1);
const FROZEN_TINT = new THREE.Color(0.62, 0.9, 1.2);

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
  /** A painted stand-in, or a drawn puppet with its moves. */
  body?: THREE.Mesh;
  puppet?: Puppet;
  anim?: Animator2D;
  /** Head height above its feet (px), for the stars of a stun. */
  height: number;
  /** How it leaves: falling over (shot down) or a parting taunt at the dock. */
  exit: 'ko' | 'taunt';
  flash: { value: number };
  shadow: Shadow;
  hpBack: THREE.Mesh;
  hpFill: THREE.Mesh;
  /** One per crystal it can carry (bosses carry several, side by side). */
  crystals: THREE.Mesh[];
  phase: number;
  /** Seconds since it fell or escaped; the view fades out, then goes. */
  leaving: number;
  /** Countdown to the next frost mote while chilled, or dust puff while rallied. */
  frost: number;
  dust: number;
}

interface TowerView {
  mesh: THREE.Mesh;
  kind: TowerKind;
  level: number;
  recoil: number;
}

/** An arrow or ice shard, or a cannonball drawn on an arc with a smoke trail. */
interface ShotView {
  mesh: THREE.Mesh;
  trail: Trail;
  shell: boolean;
  /** Flak bursts in the air, so its arc ends this high. */
  endLift: number;
}

let battle: Battle;
const pirates = new Map<number, PirateView>();
const towers = new Map<number, TowerView>();
const arrows = new Map<number, ShotView>();
const bolts: Bolt[] = [];

/**
 * Talon or Mochi on screen: the drawn puppet hung from a pivot at its body centre or nose (the flight path places
 * that point and tilts the companion around it), or the painted stand-in while the puppet isn't drawn.
 */
class Companion {
  readonly node = new THREE.Group();
  /** Across on the map (px): wing tip to wing tip, or nose to tail. */
  readonly width: number;
  facing: 1 | -1 = 1;
  private puppet?: Puppet;
  private anim?: Animator2D;
  private mesh?: THREE.Mesh;
  /** The pivot in character space (rig px, facing right). */
  private at: [number, number] = [0, 0];

  constructor(
    look: PuppetLook | null,
    private art: { painted: Painted; scale: number },
    private pivot: 'centre' | 'nose',
    order: number,
    clip: string,
  ) {
    if (look) {
      const b = look.box;
      const centre: [number, number] = [(b.min.x + b.max.x) / 2, (b.min.y + b.max.y) / 2];
      this.at = pivot === 'nose' ? (look.nose ?? [b.max.x, centre[1]]) : centre;
      this.puppet = new Puppet(look.assets);
      this.puppet.size = look.size;
      this.puppet.setOrder(order);
      this.anim = new Animator2D(look.clips);
      this.anim.play(clip, { fade: 0 });
      this.node.add(this.puppet.root);
      this.width = (b.max.x - b.min.x) * look.size;
    } else {
      this.mesh = sprite(art.painted, art.scale, 'centre');
      this.mesh.renderOrder = order;
      this.node.add(this.mesh);
      this.width = art.painted.w * art.scale;
    }
    scene.add(this.node);
  }

  /** Loops a move, or plays one through and then loops `then`. */
  play(name: string, then?: string): void {
    if (then) this.anim?.oneShot(name, then, { fade: 0.06 });
    else this.anim?.play(name, { fade: 0.12 });
  }

  /** Points its forward along a direction on screen (world x, y), tilting at most `max` radians. */
  tiltAlong(dx: number, dy: number, max: number): void {
    const a = this.facing > 0 ? Math.atan2(dy, dx) : Math.atan2(-dy, -dx);
    this.node.rotation.z = Math.max(-max, Math.min(max, a));
  }

  opacity(value: number): void {
    this.puppet?.opacity(value);
    if (this.mesh) (this.mesh.material as THREE.ShaderMaterial).uniforms.opacity.value = value;
  }

  /** `flap` squashes the painted stand-in, which has no wings to beat. */
  update(dt: number, flap = 0): void {
    if (this.puppet && this.anim) {
      this.puppet.facing = this.facing;
      this.puppet.setPose(this.anim.update(dt));
      this.puppet.update(dt);
      const s = this.puppet.size;
      this.puppet.root.position.set(-this.facing * this.at[0] * s, -this.at[1] * s, 0);
    } else if (this.mesh) {
      this.mesh.scale.set(this.art.scale * this.facing, this.art.scale * (1 + flap), 1);
      if (this.pivot === 'nose') this.mesh.position.x = -this.facing * this.width * 0.45;
    }
  }

  dispose(): void {
    scene.remove(this.node);
    this.puppet?.dispose();
  }
}

/** Talon: dives from high above the hero onto its target, then flies home to the vault with what it snatched. */
interface TalonView {
  bird: Companion;
  trail: Trail;
  from: Pt;
  target: Enemy;
  /** After the strike: seconds into the flight home, from where, and carrying crystals or not. */
  away: { t: number; from: Pt; crystals: number } | null;
}
let talonView: TalonView | null = null;
/** Mochi: crosses the island with the sweep, then swims on off the map. */
let whale: { whale: Companion; t: number; puff: number } | null = null;
const EAGLE = { painted: EAGLE_ART, scale: 0.55 };
const WHALE = { painted: WHALE_ART, scale: 1.2 };

function endTalon(): void {
  if (!talonView) return;
  talonView.bird.dispose();
  scene.remove(talonView.trail.mesh);
  talonView = null;
}

function endWhale(): void {
  whale?.whale.dispose();
  whale = null;
}
/** Frost waves spreading out to a tower's range. */
const frostWaves: { mesh: THREE.Mesh; range: number; age: number }[] = [];
const FROST_WAVE_LIFE = 0.55;
const fading: Trail[] = [];
const dropped = new Map<number, THREE.Mesh>();
const hpGeo = new THREE.PlaneGeometry(1, 1).translate(0.5, 0, 0);

function addPirate(e: Enemy): void {
  const flash = { value: 0 };
  const group = new THREE.Group();
  let body: THREE.Mesh | undefined;
  let puppet: Puppet | undefined;
  let anim: Animator2D | undefined;
  let height = e.def.radius * 2.6;
  const look = PIRATE_LOOK[e.kind];
  if (look) {
    puppet = new Puppet(look.assets);
    puppet.size = look.size;
    // Flyers hang in the air above their shadow on the road.
    puppet.root.position.y = e.def.altitude;
    anim = new Animator2D(look.clips);
    anim.play('walk', { fade: 0 });
    height = look.height;
    group.add(puppet.root);
  } else {
    const art = PIRATE_ART[e.kind];
    body = sprite(art, height / art.h, 'feet', flash);
    // Flyers hang in the air above their shadow on the road.
    body.position.y = e.def.altitude;
    group.add(body);
  }
  const top = e.def.altitude + height;
  const carries = e.def.carries ?? 1;
  const crystals = Array.from({ length: carries }, (_, i) => {
    const m = sprite(CRYSTAL_ART, 0.42, 'centre');
    m.position.set((i - (carries - 1) / 2) * 24, top + 18 + (i % 2) * 6, 0);
    m.visible = false;
    return m;
  });
  const hpBack = new THREE.Mesh(hpGeo, new THREE.MeshBasicMaterial({ color: 0x3b2a2a, depthTest: false, depthWrite: false, transparent: true }));
  if (e.def.boss) hpBack.visible = false;
  const hpFill = new THREE.Mesh(hpGeo, new THREE.MeshBasicMaterial({ color: 0x7ee05a, depthTest: false, depthWrite: false, transparent: true }));
  hpBack.scale.set(40, 7, 1);
  hpBack.position.set(-20, top + 6, 0);
  hpFill.position.set(-19, top + 6, 0);
  group.add(...crystals, hpBack, hpFill);
  const shadow = new Shadow(e.def.radius * 2.4);
  shadow.mesh.renderOrder = ORDER_SHADOW;
  scene.add(group, shadow.mesh);
  pirates.set(e.id, { enemy: e, group, body, puppet, anim, height, exit: 'ko', flash, shadow, hpBack, hpFill, crystals, phase: Math.random() * 6, leaving: -1, frost: 0, dust: 0 });
}

function removePirate(v: PirateView): void {
  scene.remove(v.group, v.shadow.mesh);
  v.puppet?.dispose();
  pirates.delete(v.enemy.id);
}

/** A puppet pirate's moving clip: carrying a crystal or not. */
const loopFor = (e: Enemy) => (e.carrying ? 'carry' : 'walk');
/** Moves that play out in full at their own pace before the walk takes over again. */
const OWN_PACE = new Set(['hit', 'shout', 'cheer']);

/** Puppet pirates: play their move, mirror to face the way they walk, frost tint and draw order. */
function drivePuppet(v: PirateView, dt: number, order: number): void {
  const e = v.enemy;
  const { puppet, anim } = v;
  if (!puppet || !anim) return;
  if (Math.abs(e.vel[0]) > 2) puppet.facing = e.vel[0] > 0 ? 1 : -1;
  // Steps keep pace with the pirate: slower when chilled, still when frozen, quicker when rallied.
  const pace = e.stun > 0 || (e.frozen > 0 && !e.def.steady) ? 0 : e.slow * e.haste;
  // A hit reaction or a shout finishes by itself; after a lost battle they keep cheering.
  const own = OWN_PACE.has(anim.playing);
  if (!own) anim.play(loopFor(e), { speed: pace, fade: 0.15 });
  puppet.setPose(anim.update(dt * (own ? 1 : pace) || 0));
  puppet.setOrder(order);
  puppet.update(dt);
  const chilled = e.slowFor > 0;
  const frozen = e.frozen > 0 && !e.def.steady;
  puppet.tint(frozen ? FROZEN_TINT : chilled ? CHILL_TINT : NO_TINT);
  puppet.hitFlash(frozen ? 0.4 : chilled ? 0.2 : 0);
}

function setTower(slot: number): void {
  const t = battle.towers[slot];
  const old = towers.get(slot);
  if (old && (!t || old.level !== t.level || old.kind !== t.kind)) {
    scene.remove(old.mesh);
    towers.delete(slot);
  }
  if (!t || towers.has(slot)) return;
  const [x, y] = level.slots[slot];
  const art = t.branch !== null ? BRANCH_ART[t.kind][t.branch] : TOWER_ART[t.kind][t.level - 1];
  const mesh = sprite(art, (level.slotRadius * 2.1) / 150, 'feet');
  world([x, y + 20], 0, mesh.position);
  mesh.renderOrder = sortOrder(y + 20);
  scene.add(mesh);
  towers.set(slot, { mesh, kind: t.kind, level: t.level, recoil: 0 });
}

function addShot(s: Shot): void {
  const shell = s.kind === 'shell';
  const shard = s.freeze > 0;
  let mesh: THREE.Mesh;
  let trail: Trail;
  if (shell) {
    mesh = sprite(BALL_ART, s.splash > 100 ? 0.85 : 0.6, 'centre');
    trail = new Trail(SMOKE, s.splash > 100 ? 10 : 7, 14, 90);
  } else if (shard) {
    mesh = sprite(SHARD_ART, 0.7, 'centre');
    trail = new Trail(ICE, 3, 12, 70);
  } else {
    mesh = new THREE.Mesh(arrowGeo, arrowMat);
    mesh.scale.setScalar(ARROW_SCALE * (s.speed > 1000 && s.by === 'tower' ? 1.3 : 1));
    trail = new Trail(TRAIL, 2.2, 12, 70);
  }
  mesh.renderOrder = ORDER_ARROW;
  trail.mesh.renderOrder = ORDER_ARROW - 1;
  scene.add(mesh, trail.mesh);
  arrows.set(s.id, { mesh, trail, shell, endLift: shell && s.hitsFlying ? 60 : 0 });
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
  for (const b of bolts.splice(0)) {
    scene.remove(b.group);
    b.dispose();
  }
  for (const w of frostWaves.splice(0)) scene.remove(w.mesh);
  endTalon();
  endWhale();
  mochiUsed = false;
  battle = new Battle(level, SEED + Math.floor(Math.random() * 1000));
  anim.play('idle', { fade: 0.2 });
  closeMenu();
  ($('end') as HTMLElement).hidden = true;
  ($('orders') as HTMLElement).hidden = true;
  $('picked').replaceChildren();
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
  updateSkills();
  const boss = battle.enemies.find((e) => e.def.boss);
  const bar = $('boss') as HTMLElement;
  if (!!boss !== !bar.hidden) bar.hidden = !boss;
  if (boss) {
    $('boss-name').textContent = boss.def.name;
    ($('boss-hp') as HTMLElement).style.width = `${(Math.max(0, boss.hp / boss.def.hp) * 100).toFixed(1)}%`;
  }
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
const SKILL_ICON: Record<SkillName, Painted> = { talon: EAGLE_ART, mochi: WHALE_ART };
for (const name of ['talon', 'mochi'] as SkillName[]) {
  const button = $(`skill-${name}`) as HTMLButtonElement;
  (button.querySelector('img') as HTMLImageElement).src = (SKILL_ICON[name].texture.image as HTMLCanvasElement).toDataURL();
  button.addEventListener('click', () => {
    void sfx.unlock();
    if (name === 'talon' ? battle.useTalon() : battle.useMochi()) sfx.play('click', 0.3, 0);
  });
}

/** Mochi's first charge is shorter than the later ones. */
let mochiUsed = false;

function updateSkills(): void {
  for (const name of ['talon', 'mochi'] as SkillName[]) {
    const button = $(`skill-${name}`) as HTMLButtonElement;
    const left = battle[name].cooldown;
    const total = name === 'mochi' && !mochiUsed ? SKILLS.mochi.firstWait : SKILLS[name].cooldown;
    const ready = battle.canUse(name);
    button.disabled = !ready;
    button.classList.toggle('ready', ready);
    button.style.setProperty('--p', (left / total).toFixed(3));
    const cd = button.querySelector('.cd') as HTMLElement;
    const text = left > 0 ? String(Math.ceil(left)) : '';
    if (cd.textContent !== text) cd.textContent = text;
  }
}

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

function menuButton(label: string, cost: string, enabled: boolean, onClick: () => void, note = ''): HTMLButtonElement {
  const b = document.createElement('button');
  b.type = 'button';
  b.innerHTML = `<span>${label}</span>${note ? `<small>${note}</small>` : ''}<b>${cost}</b>`;
  b.disabled = !enabled;
  b.addEventListener('click', (e) => {
    e.stopPropagation();
    void sfx.unlock();
    onClick();
  });
  return b;
}

const MODE_LABEL: Record<TargetMode, string> = { first: 'First', nearest: 'Nearest', carrier: 'Thieves' };
const MODES: TargetMode[] = ['first', 'nearest', 'carrier'];

function renderMenu(): void {
  if (menuSlot === null) return;
  const slot = menuSlot;
  const menu = $('menu') as HTMLElement;
  menu.replaceChildren();
  const t = battle.towers[slot];
  /** A button that, when pressed or hovered, shows how far that choice would reach. */
  const withRange = (b: HTMLButtonElement, range: number) => {
    const preview = () => showRing(slot, range);
    b.addEventListener('pointerenter', preview);
    b.addEventListener('pointerdown', preview);
    return b;
  };
  let range = 0;
  if (!t) {
    for (const kind of TOWER_KINDS) {
      const def = TOWERS[kind];
      const cost = battle.costOf(kind, 0)!;
      const b = menuButton(def.name, `◉ ${cost}`, battle.purse.canAfford(cost), () => {
        if (battle.build(slot, kind)) closeMenu();
      }, def.blurb);
      menu.append(withRange(b, def.levels[0].range));
    }
  } else {
    const def = TOWERS[t.kind];
    const spec = towerSpec(t.kind, t.level, t.branch);
    range = spec.stats.range;
    const cost = t.level < def.levels.length ? battle.costOf(t.kind, t.level) : null;
    if (t.level >= MAX_LEVEL) menu.append(menuButton(spec.name, 'MAX', false, () => {}));
    else if (cost !== null) {
      const next = def.levels[t.level];
      menu.append(withRange(menuButton(`Upgrade to ${t.level + 1}`, `◉ ${cost}`, battle.purse.canAfford(cost), () => {
        if (battle.upgrade(slot)) renderMenu();
      }), next.range));
    } else
      // Level 3: choose one of two specialisations.
      def.branches.forEach((b, i) => {
        const price = battle.costOf(t.kind, t.level, i as Branch)!;
        menu.append(withRange(menuButton(b.name, `◉ ${price}`, battle.purse.canAfford(price), () => {
          if (battle.upgrade(slot, i as Branch)) renderMenu();
        }, b.blurb), b.level.range));
      });
    // Frost waves hit everyone in range, so they have no target to pick.
    if (spec.attack.attack !== 'pulse')
      menu.append(menuButton('Target', `${MODE_LABEL[t.mode]} ▸`, true, () => {
        battle.setMode(slot, MODES[(MODES.indexOf(t.mode) + 1) % MODES.length]);
        sfx.play('click', 0.3, 0);
        renderMenu();
      }));
    menu.append(menuButton('Sell', `+${battle.refundFor(slot)}`, true, () => {
      battle.sell(slot);
      closeMenu();
    }));
  }
  menu.hidden = false;
  if (range) showRing(slot, range);
  else ring.visible = false;
  placeMenu();
}

function showRing(slot: number, range: number): void {
  ring.visible = true;
  world(level.slots[slot], 0, ring.position);
  ring.scale.setScalar((range * 2) / 244);
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
      fx.poof(world(ev.enemy.pos, 10), ev.enemy.def.boss ? 1.4 : 0.5, ev.enemy.def.boss ? 20 : 8);
      if (ev.enemy.def.boss) {
        showBanner(`${ev.enemy.def.name}!`);
        sfx.play('boss_warning', 0.5, 0);
        shake.add(0.4);
      }
      break;
    case 'talon': {
      anim.oneShot('cast', 'idle', { fade: 0.08 });
      hero.facing = ev.target.pos[0] >= battle.hero.pos[0] ? 1 : -1;
      // From high in the sky on the hero's side of the thief, for a steep stoop.
      const from: Pt = [ev.target.pos[0] - 380 * hero.facing, ev.target.pos[1] - 640];
      endTalon();
      const bird = new Companion(talonLook, EAGLE, 'centre', ORDER_ARROW + 2, 'dive');
      const trail = new Trail(FEATHER, 6, 16, 160);
      trail.mesh.renderOrder = ORDER_ARROW + 1;
      scene.add(trail.mesh);
      talonView = { bird, trail, from, target: ev.target, away: null };
      sfx.play('levelup', 0.3, 0.1);
      break;
    }
    case 'talonStrike': {
      const at = world(ev.at);
      fx.sparks(at, FEATHER, undefined, 16);
      fx.glitter(at, FEATHER, 10);
      shake.add(0.25);
      time.hitStop(60);
      sfx.play('hit', 0.6);
      if (ev.rescued > 0) {
        numbers.spawn(ev.rescued > 1 ? `Snatched ×${ev.rescued}!` : 'Snatched!', at.clone().add(tmp.set(0, 50, 0)), 'crit');
        fx.glitter(at, CYAN, 12);
        sfx.play('xp', 0.4);
      }
      if (talonView) {
        talonView.away = { t: 0, from: [...ev.at], crystals: ev.rescued };
        talonView.bird.play('strike', ev.rescued ? 'carry' : 'fly');
      }
      break;
    }
    case 'mochi': {
      mochiUsed = true;
      anim.oneShot('cast', 'idle', { fade: 0.08 });
      showBanner('Mochi!');
      time.slowMo(0.4, 0.9);
      shake.add(0.4);
      sfx.play('zap', 0.6);
      sfx.play('levelup', 0.4, 0);
      endWhale();
      // Below the effects layer, whose draw orders start at ORDER_FX (puppet parts add up to ~60).
      const w = new Companion(mochiLook, WHALE, 'nose', ORDER_FX - 100, 'sweep');
      w.facing = -1;
      whale = { whale: w, t: 0, puff: 0 };
      break;
    }
    case 'shout': {
      const at = world(ev.enemy.pos, ev.enemy.def.radius);
      fx.ring(world(ev.enemy.pos, 4), RALLY, ev.radius / 57, 40);
      numbers.spawn('Hurry, ye dogs!', at.clone().add(tmp.set(0, 30, 0)), 'crit');
      for (const e of ev.rallied) if (e !== ev.enemy) fx.glitter(world(e.pos, e.def.radius * 2), RALLY, 3);
      shake.add(0.15);
      const v = pirates.get(ev.enemy.id);
      if (v?.anim?.has('shout')) v.anim.oneShot('shout', loopFor(ev.enemy), { fade: 0.08 });
      break;
    }
    case 'draw':
      anim.oneShot('rapid', 'idle', { fade: 0.06 });
      break;
    case 'shoot':
      addShot(ev.shot);
      if (ev.shot.kind === 'shell') {
        fx.poof(world(ev.from, 8), 0.45, 8);
        fx.flash(world(ev.from, 8), new THREE.Color(1, 0.7, 0.35));
        sfx.play('explosion', 0.1, 0.15);
      } else {
        fx.flash(world(ev.from), new THREE.Color(1, 0.9, 0.6));
        sfx.play('shoot', ev.tower ? 0.12 : 0.3);
      }
      if (ev.tower) recoil(ev.tower.slot);
      break;
    case 'boom': {
      // Bigger blasts for the mortar; flak bursts up in the air.
      const big = ev.radius / 80;
      const at = world(ev.at, ev.shot.hitsFlying ? 60 : 6);
      fx.poof(at, 1.1 * big, Math.round(16 * big));
      fx.sparks(at, new THREE.Color(1, 0.65, 0.25), undefined, Math.round(16 * big));
      shake.add(0.12 * big);
      sfx.play('explosion', 0.22);
      break;
    }
    case 'zap': {
      // Lightning (jumping on in a chain), or the Arcane Lens beam, which thickens as it heats up.
      const bolt = ev.beam
        ? new Bolt(world(ev.from), world(ev.to), ARCANE, 6 + ev.jump * 1.6, 0.16, false)
        : new Bolt(world(ev.from), world(ev.to), STORM, ev.jump ? 8 : 11);
      bolt.renderOrder = ORDER_ARROW;
      scene.add(bolt.group);
      bolts.push(bolt);
      if (ev.jump === 0 || !ev.beam) fx.sparks(world(ev.to), ev.beam ? ARCANE : STORM, undefined, ev.beam ? 4 : 10);
      if (ev.jump === 0) {
        fx.flash(world(ev.from), ev.beam ? ARCANE : STORM);
        recoil(ev.tower.slot);
      }
      if (!ev.beam && ev.jump === 0) sfx.play('zap', 0.2);
      if (ev.beam && ev.jump === 0) sfx.play('zap', 0.12, 0.2);
      break;
    }
    case 'freeze':
      fx.glitter(world(ev.enemy.pos, ev.enemy.def.altitude + ev.enemy.def.radius), ICE, 10);
      sfx.play('xp', 0.15, 0.2);
      break;
    case 'pulse': {
      const mesh = sprite(FROST_ART, 0, 'centre');
      world(ev.at, 0, mesh.position);
      mesh.renderOrder = ORDER_RING + 1;
      scene.add(mesh);
      frostWaves.push({ mesh, range: ev.radius, age: 0 });
      fx.glitter(world(ev.at, 70), ICE, 5);
      recoil(ev.tower.slot);
      break;
    }
    case 'hit': {
      const v = pirates.get(ev.enemy.id);
      if (v) v.flash.value = 1;
      if (v?.puppet && v.anim && ev.enemy.hp > 0) {
        v.puppet.hitFlash(1);
        v.anim.oneShot('hit', loopFor(ev.enemy), { fade: 0.05 });
      }
      const at = world(ev.at);
      // Armour clinks: steel-white sparks when it stops part of the hit.
      const spark = ev.blocked > 0 ? STEEL : ev.crit ? new THREE.Color(1, 0.75, 0.25) : new THREE.Color(1, 0.95, 0.75);
      fx.sparks(at, spark, undefined, ev.crit ? 18 : 8);
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
      const boss = !!ev.enemy.def.boss;
      fx.poof(at, boss ? 1.6 : 0.55, boss ? 30 : 12);
      fx.glitter(at, GOLD, boss ? 30 : 6);
      if (boss) {
        showBanner(`${ev.enemy.def.name} defeated!`);
        time.hitStop(120);
        time.slowMo(0.35, 0.9);
        shake.add(0.6);
        sfx.play('explosion', 0.5);
      }
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
      fx.glitter(world(ev.at, 30), CYAN, 12 * ev.count);
      sfx.play('xp', 0.4);
      break;
    case 'recover':
      fx.glitter(world(level.vault, 30), CYAN, 14);
      sfx.play('coin', 0.25);
      break;
    case 'escape': {
      const v = pirates.get(ev.enemy.id);
      if (v) {
        v.leaving = 0;
        v.exit = 'taunt';
      }
      if (ev.lost > 0) {
        shake.add(0.35 * ev.lost);
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
      if (ev.tower.level >= MAX_LEVEL) {
        fx.ring(world(level.slots[ev.tower.slot], 4), GOLD, 1, 40);
        showBanner(towerSpec(ev.tower.kind, ev.tower.level, ev.tower.branch).name + '!');
      }
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
    case 'orders':
      showOrders(ev.cards);
      break;
    case 'order': {
      const chip = document.createElement('span');
      chip.textContent = ev.card.icon;
      chip.title = `${ev.card.name}: ${ev.card.text}`;
      $('picked').append(chip);
      bump('picked');
      showBanner(ev.card.name);
      fx.glitter(world(battle.hero.pos, 60), GOLD, 16);
      anim.oneShot('cheer', 'idle', { fade: 0.1 });
      sfx.play('levelup', 0.4, 0);
      hudDirty = true;
      break;
    }
    case 'win':
      endScreen(true, ev.stars);
      break;
    case 'lose':
      // The pirates celebrate.
      for (const v of pirates.values()) if (v.anim && v.leaving < 0) v.anim.play('cheer', { once: true });
      endScreen(false, 0);
      break;
  }
}

/** The captain's orders: three cards over the paused battle; tapping one picks it. */
function showOrders(cards: CardDef[]): void {
  closeMenu();
  const row = $('order-row');
  row.replaceChildren();
  cards.forEach((card, i) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'order';
    b.style.setProperty('--i', String(i));
    b.innerHTML = `<i>${card.icon}</i><b>${card.name}</b><span>${card.text}</span>`;
    b.addEventListener('click', () => {
      void sfx.unlock();
      if (!battle.choose(i)) return;
      ($('orders') as HTMLElement).hidden = true;
    });
    row.append(b);
  });
  ($('orders') as HTMLElement).hidden = false;
  sfx.play('chest', 0.5, 0);
  sfx.play('levelup', 0.3, 0);
}

function recoil(slot: number): void {
  const tv = towers.get(slot);
  if (tv) tv.recoil = 1;
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
      for (const m of v.crystals) m.visible = false;
      v.hpBack.visible = v.hpFill.visible = false;
      if (v.puppet && v.anim) {
        // Falls over (or taunts from the dock), then fades away.
        if (v.anim.playing !== v.exit) v.anim.play(v.exit, { once: true, fade: 0.08 });
        const hold = v.anim.duration(v.exit) + 0.3;
        const k = Math.min(1, Math.max(0, (v.leaving - hold) / 0.35));
        v.puppet.setPose(v.anim.update(dt));
        v.puppet.update(dt);
        v.puppet.tint(NO_TINT);
        v.puppet.opacity(1 - k);
        if (k >= 1) removePirate(v);
        continue;
      }
      const k = Math.min(1, v.leaving / 0.25);
      v.group.scale.set(1 + 0.4 * k, 1 - 0.6 * k, 1);
      (v.body!.material as THREE.ShaderMaterial).uniforms.opacity.value = 1 - k;
      if (k >= 1) removePirate(v);
      continue;
    }
    const moving = Math.hypot(e.vel[0], e.vel[1]) > 1;
    v.phase += dt * (e.def.speed / 6) * (e.stun > 0 || (e.frozen > 0 && !e.def.steady) ? 0 : e.slow) * e.haste;
    const sx = Math.abs(v.body?.scale.x ?? 1);
    let hop: number;
    if (v.puppet) {
      // The walk clip bobs the body itself.
      hop = 0;
      v.group.rotation.z = 0;
    } else if (e.flying) {
      // Bob up and down with each wing beat.
      hop = Math.sin(v.phase * 0.8) * 6;
      v.body!.scale.y = sx * (1 + Math.sin(v.phase * 1.6) * 0.06);
      v.group.rotation.z = 0;
    } else {
      hop = moving ? Math.abs(Math.sin(v.phase)) * 4 : 0;
      v.group.rotation.z = moving ? Math.sin(v.phase) * 0.07 : 0;
    }
    world(e.pos, hop, v.group.position);
    if (v.body && Math.abs(e.vel[0]) > 2) v.body.scale.x = sx * Math.sign(e.vel[0]);
    v.shadow.place(e.pos[0], -e.pos[1], e.def.altitude + hop);
    const chilled = e.slowFor > 0;
    const frozen = e.frozen > 0;
    if (v.body) {
      (v.body.material as THREE.ShaderMaterial).uniforms.tint.value.copy(frozen ? FROZEN_TINT : chilled ? CHILL_TINT : NO_TINT);
      // Chilled pirates look frosted over: tinted blue and a little paler; frozen ones paler still.
      v.flash.value = Math.max(v.flash.value - dt * 9, frozen ? 0.4 : chilled ? 0.2 : 0);
    }
    v.frost -= dt;
    if (chilled && v.frost <= 0) {
      v.frost = 0.35;
      fx.glitter(world(e.pos, e.def.altitude + e.def.radius * 1.4), ICE, 2);
    }
    // Stunned by a companion: stars circle its head.
    if (e.stun > 0 && Math.random() < dt * 8) {
      const a = t * 9 + v.phase;
      fx.glitter(world([e.pos[0] + Math.cos(a) * 18, e.pos[1]], e.def.altitude + v.height + 4 + Math.sin(a) * 5), DIZZY, 1);
    }
    // Rallied by a shout: they kick up dust as they hurry.
    v.dust -= dt;
    if (e.hasteFor > 0 && !e.flying && v.dust <= 0 && moving) {
      v.dust = 0.12;
      fx.dust(world(e.pos, 2), e.vel[0] > 0 ? -1 : 1);
    }
    const order = sortOrder(e.pos[1]);
    if (v.body) v.body.renderOrder = order;
    drivePuppet(v, dt, order);
    // Above every puppet part (their draw orders go up to about 60).
    for (const m of v.crystals) m.renderOrder = order + 70;
    v.hpBack.renderOrder = order + 80;
    v.hpFill.renderOrder = order + 81;
    // Puppets hug their crystal in their hands; stand-ins show it floating over their heads.
    v.crystals.forEach((m, i) => {
      m.visible = i < e.load && !v.puppet;
      m.position.x = (i - (v.crystals.length - 1) / 2) * 24 + Math.sin(t * 3 + v.phase + i) * 1.5;
    });
    const share = Math.max(0, e.hp / e.def.hp);
    v.hpBack.visible = v.hpFill.visible = share < 1 && !e.def.boss;
    v.hpFill.scale.set(38 * share, 5, 1);
    (v.hpFill.material as THREE.MeshBasicMaterial).color.setHex(share > 0.5 ? 0x7ee05a : share > 0.25 ? 0xf4c34f : 0xe5533d);
  }
}

function syncShots(dt: number): void {
  const live = new Map(battle.shots.map((s) => [s.id, s]));
  for (const id of [...arrows.keys()]) if (!live.has(id)) finishArrow(id);
  for (const [id, a] of arrows) {
    const s = live.get(id)!;
    if (a.shell) {
      // A lob: leaves the tower top, rises, and comes down on the landing spot.
      const total = Math.hypot(s.aimAt[0] - s.start[0], s.aimAt[1] - s.start[1]) || 1;
      const p = Math.min(1, Math.hypot(s.pos[0] - s.start[0], s.pos[1] - s.start[1]) / total);
      world(s.pos, TOWER_TOP * (1 - p) + a.endLift * p + (50 + total * 0.35) * 4 * p * (1 - p), a.mesh.position);
      a.mesh.rotation.z += 0.2;
    } else {
      world(s.pos, 0, a.mesh.position);
      a.mesh.rotation.z = Math.atan2(-s.dir[1], s.dir[0]);
    }
    a.trail.push(a.mesh.position);
  }
  for (const a of arrows.values()) a.trail.update(camera);
  for (let i = frostWaves.length - 1; i >= 0; i--) {
    const w = frostWaves[i];
    w.age += dt;
    const k = Math.min(1, w.age / FROST_WAVE_LIFE);
    w.mesh.scale.setScalar(((w.range * 2) / 244) * (0.3 + 0.7 * (1 - (1 - k) ** 3)));
    (w.mesh.material as THREE.ShaderMaterial).uniforms.opacity.value = 1 - k * k;
    if (k >= 1) {
      scene.remove(w.mesh);
      frostWaves.splice(i, 1);
    }
  }
  for (let i = bolts.length - 1; i >= 0; i--) {
    bolts[i].update(dt);
    if (bolts[i].done) {
      scene.remove(bolts[i].group);
      bolts[i].dispose();
      bolts.splice(i, 1);
    }
  }
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

/** Talon and Mochi on screen, following the battle's skill state. */
function syncCompanions(dt: number, t: number): void {
  const tv = talonView;
  if (tv) {
    if (!tv.away) {
      // Diving: from high above, accelerating onto the target wherever it is now.
      const dive = battle.talon.dive;
      const k = dive ? 1 - dive.t / SKILLS.talon.dive : 1;
      const e = tv.target;
      const to: Pt = [e.pos[0], e.pos[1] - e.def.altitude - e.def.radius];
      const kk = k * k;
      const p: Pt = [tv.from[0] + (to[0] - tv.from[0]) * kk, tv.from[1] + (to[1] - tv.from[1]) * kk];
      world(p, 0, tv.bird.node.position);
      tv.bird.facing = to[0] >= tv.from[0] ? 1 : -1;
      // Head first down the dive line.
      tv.bird.tiltAlong(to[0] - tv.from[0], tv.from[1] - to[1], 1.1);
      tv.bird.update(dt);
      // The target was gone before the strike: Talon pulls up and leaves.
      if (!dive) {
        tv.away = { t: 0, from: p, crystals: 0 };
        tv.bird.play('fly');
      }
    } else {
      // Flying home to the vault (or just up and away), flapping, fading at the end.
      const a = tv.away;
      a.t += dt;
      const k = Math.min(1, a.t / 0.9);
      const home: Pt = a.crystals ? [level.vault[0], level.vault[1] - 60] : [a.from[0] + 300, a.from[1] - 500];
      const p: Pt = [a.from[0] + (home[0] - a.from[0]) * k, a.from[1] + (home[1] - a.from[1]) * k - Math.sin(k * Math.PI) * 120];
      const before = tv.bird.node.position.clone();
      world(p, 0, tv.bird.node.position);
      tv.bird.facing = home[0] >= a.from[0] ? 1 : -1;
      tv.bird.tiltAlong(tv.bird.node.position.x - before.x, tv.bird.node.position.y - before.y, 0.35);
      tv.bird.update(dt, Math.sin(t * 28) * 0.12);
      tv.bird.opacity(1 - Math.max(0, (k - 0.8) / 0.2));
      if (a.crystals && Math.random() < dt * 30) fx.glitter(tv.bird.node.position.clone(), CYAN, 1);
      if (k >= 1) {
        if (a.crystals) {
          fx.glitter(world(level.vault, 30), CYAN, 18);
          sfx.play('coin', 0.35);
        }
        endTalon();
      }
    }
    if (talonView) {
      tv.trail.push(tv.bird.node.position);
      tv.trail.update(camera);
    }
  }
  if (whale) {
    // The nose follows the sweep line (it is what hits the pirates); afterwards it swims on off the map.
    whale.t += dt;
    const sweep = battle.mochi.sweep;
    const k = sweep ? sweep.t / SKILLS.mochi.sweep : 1 + (whale.t - SKILLS.mochi.sweep) / SKILLS.mochi.sweep;
    const nose = level.map.w + 150 - k * (level.map.w + 300);
    const w = whale.whale;
    const len = w.width;
    world([nose, 470 + Math.sin(whale.t * 3) * 25], 0, w.node.position);
    w.node.rotation.z = Math.sin(whale.t * 3 + 1) * 0.06;
    w.update(dt);
    // A wake of cloud puffs and glitter behind it.
    whale.puff -= dt;
    if (whale.puff <= 0) {
      whale.puff = 0.04;
      fx.poof(w.node.position.clone().add(tmp.set(len * 0.85, (Math.random() - 0.5) * 120, 0)), 1.1, 3);
      fx.glitter(w.node.position.clone().add(tmp.set(Math.random() * len, (Math.random() - 0.5) * 140, 0)), CYAN, 1);
    }
    if (nose < -len * 1.2) endWhale();
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
  // Everything on the field holds still while the captain's orders are up.
  const play = battle.paused ? 0 : dt * speed;
  syncPirates(play, clock);
  syncShots(battle.paused ? 0 : realDt);
  syncCrystals(clock);
  syncCompanions(play, clock);
  syncHero(play);
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
  /** Talon's and Mochi's views while on screen (for tests and screenshots). */
  get companions() {
    return { talon: talonView, whale };
  },
  toScreen: (p: Pt) => toScreen(view, bounds(), p),
  setSpeed: (s: number) => (speed = s),
  newBattle,
};
