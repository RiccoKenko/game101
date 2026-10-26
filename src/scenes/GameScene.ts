import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { CHARACTERS, characterDef, type CharacterDef, type CharacterId } from '../config/characters';
import { CURSE, CURSE_IDS, CURSE_UNLOCK_MAPS, HEAT_GOLD, heatOf, type CurseId } from '../config/curses';
import { DIFFICULTIES, maxDifficulty, type DifficultyDef } from '../config/difficulty';
import { UNLOCKS, unlockKey, type MonsterId } from '../config/collection';
import { BOSSES } from '../config/enemies';
import { relicDef, relicFor, type RelicId } from '../config/relics';
import { BOSS_GOLD, COIN_VALUE, DROP_CHANCE, PLAYER_BASE, RUN_BONUS, VICTORY_GOLD } from '../config/game';
import { FINAL_TIME, GOLDEN_HOUR, GREED_PACT, SHRINE_OFFERS, type ShrineOffer } from '../config/events';
import { GEAR, type GearType } from '../config/gear';
import { MASTERY } from '../config/mastery';
import { TALENT, TALENT_LEVELS, type TalentId } from '../config/talents';
import { BASE_BANISHES, BASE_REROLLS } from '../config/shop';
import { MAPS, type MapDef } from '../config/maps';
import { ACHIEVEMENTS, questDef, type AchievementId, type RunReport } from '../config/quests';
import { EVOLUTIONS, MAX_WEAPON_LEVEL, PASSIVES, RUNE_IDS, RUNES, WEAPONS, type EvolutionId, type RuneId, type WeaponId } from '../config/weapons';
import { addItem, gearBonus, runDrops, type GearBonus } from '../core/gear';
import { claimUnlocks, lockedKeys, lockedTalents, masteryPerks, masteryState, masteryXp, reachedUnlocks, records } from '../core/collection';
import { DEBUG } from '../core/debug';
import {
  applyChoice,
  choiceKey,
  evolvableWeapons,
  evolve,
  MAXED,
  newInventory,
  passiveLevels,
  rollChoices,
  rollTalents,
  runeLevels,
  xpToNext,
  type Choice,
  type Inventory,
} from '../core/progression';
import { applyRun, describeQuest, ensureDaily, lifetime, progressWith, questDone, ROMAN, tiersReached } from '../core/quests';
import { mulberry32, weightedPick, type Rng } from '../core/rng';
import { saveStore } from '../core/save';
import { computeStats, type PlayerStats } from '../core/stats';
import {
  bossesDue,
  bossHpMultiplier,
  coinFactor,
  eliteChance,
  enemyWeights,
  hpMultiplier,
  leadersDue,
  ringEventsDue,
  ringSize,
  spawnRate,
  swarmSize,
} from '../core/waves';
import { Abilities } from '../game/Abilities';
import { Ambience } from '../game/Ambience';
import { botSteer } from '../game/Bot';
import { type GameCtx } from '../game/context';
import { Effects } from '../game/Effects';
import { Enemy, EnemyManager } from '../game/Enemies';
import { PickupManager } from '../game/Pickups';
import { RunEvents } from '../game/RunEvents';
import { Player } from '../game/Player';
import { resetStick, stick } from '../game/stick';
import { WeaponSystem } from '../game/Weapons';
import { World } from '../game/World';

export interface RunState {
  mapIndex: number;
  time: number;
  kills: number;
  eliteKills: number;
  chests: number;
  evolutions: number;
  /** Kills by kind of monster, and shrine offers accepted. */
  monsters: Partial<Record<MonsterId, number>>;
  shrines: number;
  gold: number;
  level: number;
  xp: number;
  xpNext: number;
  inventory: Inventory;
  stats: PlayerStats;
  revivesLeft: number;
  bossesSpawned: number;
  bossesKilled: number;
  leadersSpawned: number;
  leadersKilled: number;
  /** Level-up card rerolls and banishes left. */
  rerolls: number;
  banishes: number;
  /** Shrine blessings taken this run (added to damage, move speed, max HP). */
  blessings: { damage: number; speed: number; maxHp: number };
  /** A Pact of Greed: monsters are tougher until this time, then it pays out. */
  greedUntil: number;
  /** The boss that came at 15:00; defeating it wins the run. */
  finalBoss: Enemy | null;
  won: boolean;
  /** Captain's Medal: the next revival restores full HP. */
  medal: boolean;
  swarmsSpawned: number;
  ringsSpawned: number;
  /** Talent cards owed (levels 5, 10, 15... reached), and when Second Wind and Blink can next fire. */
  talentsDue: number;
  secondWindAt: number;
  blinkAt: number;
  boss: Enemy | null;
  ended: boolean;
  unlockedMap: number | null;
}

export interface RunSummary {
  mapIndex: number;
  time: number;
  kills: number;
  level: number;
  collected: number;
  bonus: number;
  total: number;
  bestTime: number;
  newBest: boolean;
  quit: boolean;
  unlockedMap: number | null;
  bossesKilled: number;
  /** The final boss fell: the stage is cleared. */
  won: boolean;
  /** Gold for clearing the stage (included in total). */
  victoryBonus: number;
  difficulty: number;
  /** A relic won by this clear, by name. */
  relic: string | null;
  /** Heat of the curses played with (0 = none), and whether this clear set a new best for the map. */
  heat: number;
  newBestHeat: boolean;
  /** Daily quests this run finished, and achievement tiers it reached ("Monster Hunter II"). */
  quests: string[];
  achievements: string[];
  /** Weapons, items and runes this run unlocked. */
  unlocks: { name: string; icon: string }[];
  /** The hero's mastery: XP earned, and the level before and after. */
  mastery: { hero: string; xp: number; from: number; to: number };
  /** Equipment found (put in the bag), and gold for drops that didn't fit. */
  loot: { name: string; type: GearType; rarity: number }[];
  lootGold: number;
}

/** Something to celebrate in the HUD: a daily quest or an achievement tier finished during the run. */
export interface QuestNotice {
  title: string;
  line: string;
  icon: string;
}

export type ChestReward =
  | { kind: 'evolution'; evolution: EvolutionId }
  | { kind: 'upgrades'; choices: Choice[] };

export class GameScene extends Phaser.Scene {
  run!: RunState;
  player!: Player;
  ctx!: GameCtx;
  private map!: MapDef;
  private mapIndex = 0;
  /** The hero being played (the menu's choice). */
  private hero!: CharacterDef;
  /** The map's difficulty for this run, and the relics worn. */
  private difficulty = 0;
  private diff!: DifficultyDef;
  private relics = new Set<RelicId>();
  /** Curses picked in the menu, and their total heat. */
  private curses = new Set<CurseId>();
  private heat = 0;
  private rng!: Rng;
  private world!: World;
  private enemies!: EnemyManager;
  private pickups!: PickupManager;
  private fx!: Effects;
  private weapons!: WeaponSystem;
  private ambience!: Ambience;
  /** The dash and the ultimate (the HUD's two round buttons). */
  abilities!: Abilities;
  /** Where the hero was last steered: the dash goes this way. */
  private steer = { x: 0, y: 0 };
  /** Shrines, goblins, meteor showers... (see game/RunEvents.ts). */
  runEvents!: RunEvents;
  private spawnAcc = 0;
  private pendingLevelUps = 0;
  private modalOpen = false;
  /** Real seconds the action stays frozen (hit-stop). */
  private freeze = 0;
  /** Real seconds of slow motion left, and how slow. */
  private slowLeft = 0;
  private slowScale = 1;
  /** Real seconds left of the level-up burst before the upgrade cards open. */
  private levelUpWait = 0;
  /** Quest and achievement banners already shown this run; tiers reached before the run started. */
  private questsShown = new Set<number>();
  private tiersAtStart = {} as Record<AchievementId, number>;
  private tiersShown = {} as Record<AchievementId, number>;
  private questCheck = 0;
  /** Unlocks already announced this run. */
  private unlocksShown = new Set<string>();
  /** The hero's mastery level for this run, and what it adds. */
  private mastery = 1;
  private perks!: ReturnType<typeof masteryPerks>;
  /** What the worn equipment adds. */
  private gear!: GearBonus;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  init(data: { map?: number }): void {
    this.mapIndex = Phaser.Math.Clamp(data.map ?? 0, 0, MAPS.length - 1);
    this.spawnAcc = 0;
    this.pendingLevelUps = 0;
    this.modalOpen = false;
    this.freeze = this.slowLeft = this.levelUpWait = 0;
    this.questCheck = 0;
    this.questsShown = new Set();
    this.unlocksShown = new Set();
  }

  create(): void {
    this.map = MAPS[this.mapIndex];
    this.rng = mulberry32(DEBUG.seed || Date.now() >>> 0);
    this.world = new World(this, this.map);
    const save = saveStore.data;
    this.difficulty = DEBUG.difficulty >= 0 ? DEBUG.difficulty : Math.min(save.difficulty[this.mapIndex], maxDifficulty(save.clears[this.mapIndex]));
    this.diff = DIFFICULTIES[this.difficulty];
    this.relics = new Set((DEBUG.relics.length ? DEBUG.relics : save.equipped) as RelicId[]);
    const picked: string[] = DEBUG.curses.length ? DEBUG.curses : save.unlockedMaps >= CURSE_UNLOCK_MAPS ? save.curses : [];
    this.curses = new Set(CURSE_IDS.filter((id) => picked.includes(id)));
    this.heat = heatOf([...this.curses]);
    const hero = (this.hero = characterDef((DEBUG.hero || saveStore.data.character) as CharacterId));
    this.mastery = DEBUG.mastery > 0 ? Math.min(MASTERY.maxLevel, DEBUG.mastery) : masteryState(save.mastery[hero.id]).level;
    this.perks = masteryPerks(hero.id, this.mastery);
    this.gear = gearBonus(save.gear);
    // Each hero's own weapon belongs to that hero: the others are never offered it. Nor is anything still locked:
    // items not yet unlocked in the Collection, talents not yet earned with mastery.
    const inventory = newInventory(hero.start, [
      ...CHARACTERS.filter((c) => c.start !== hero.start).map((c) => `weapon:${c.start}`),
      ...(DEBUG.unlock ? [] : [...lockedKeys(save), ...lockedTalents(hero.id, this.mastery).map((t) => `talent:${t}`)]),
    ]);
    for (const g of DEBUG.give) {
      const rune = g.replace(/\d+$/, '') as RuneId;
      if (RUNES[rune]) {
        inventory.runes.push({ id: rune, level: Math.min(RUNES[rune].maxLevel, Number(g.match(/\d+$/)?.[0] ?? 1)) });
        continue;
      }
      const evo = EVOLUTIONS[g as EvolutionId];
      const id = (evo ? evo.base : g.replace(/\d+$/, '')) as WeaponId;
      if (!WEAPONS[id]) continue;
      const level = evo ? MAX_WEAPON_LEVEL : Math.min(MAX_WEAPON_LEVEL, Number(g.match(/\d+$/)?.[0] ?? 1));
      const owned = inventory.weapons.find((w) => w.id === id) ?? inventory.weapons[inventory.weapons.push({ id, level, evolved: null }) - 1];
      owned.level = level;
      if (evo) owned.evolved = evo.id;
    }
    const stats = computeStats(saveStore.data.shop, {}, hero);
    this.run = {
      mapIndex: this.mapIndex,
      time: DEBUG.startTime,
      kills: 0,
      eliteKills: 0,
      chests: 0,
      evolutions: 0,
      monsters: {},
      shrines: 0,
      gold: 0,
      level: 1,
      xp: 0,
      xpNext: xpToNext(1),
      inventory,
      stats,
      revivesLeft: stats.revivals,
      bossesSpawned: bossesDue(DEBUG.startTime),
      bossesKilled: 0,
      leadersSpawned: leadersDue(DEBUG.startTime),
      leadersKilled: 0,
      rerolls: BASE_REROLLS + saveStore.data.shop.reroll + this.perks.rerolls,
      banishes: BASE_BANISHES + saveStore.data.shop.banish + this.perks.banishes,
      blessings: { damage: 0, speed: 0, maxHp: 0 },
      greedUntil: -1,
      finalBoss: null,
      won: false,
      medal: false,
      swarmsSpawned: 0,
      ringsSpawned: ringEventsDue(DEBUG.startTime),
      talentsDue: 0,
      secondWindAt: 0,
      blinkAt: 0,
      boss: null,
      ended: false,
      unlockedMap: null,
    };

    const ctx = { scene: this as Phaser.Scene, rng: this.rng, mapIndex: this.mapIndex, runes: runeLevels(inventory) } as GameCtx;
    Object.defineProperty(ctx, 'runTime', { get: () => this.run.time });
    ctx.onEnemyKilled = (e) => this.onEnemyKilled(e);
    ctx.hurtPlayer = (amount) => this.hurtPlayer(amount);
    ctx.spawnPoint = () => this.spawnPoint();
    ctx.view = () => this.cameras.main.worldView;
    ctx.hitStop = (s) => this.hitStop(s);
    ctx.shake = (ms, k) => this.shake(ms, k);
    ctx.slowMo = (scale, s) => this.slowMo(scale, s);
    ctx.monsterDamage = this.diff.damage;
    ctx.difficulty = this.difficulty;
    ctx.affixBonus = this.curses.has('mutation') ? 1 : 0;
    ctx.monsterSpeed = this.curses.has('frenzy') ? CURSE.frenzy : 1;
    const iron = this.curses.has('iron') ? CURSE.iron : 1;
    ctx.monsterHp = () => this.diff.hp * iron * (this.run.time < this.run.greedUntil ? GREED_PACT.hp : 1);
    ctx.player = this.player = new Player(this, stats, hero);
    ctx.fx = this.fx = new Effects(this);
    this.player.onStep = (x, y) => this.fx.dust(x, y);
    ctx.enemies = this.enemies = new EnemyManager(ctx);
    this.enemies.onEnrage = (e) => this.events.emit('toast', `${e.boss!.name} is enraged!`);
    ctx.pickups = this.pickups = new PickupManager(ctx, {
      onXp: (v) => this.addXp(v),
      onCoin: (v) => {
        this.run.gold += v * this.run.stats.goldMult;
        audio.sfx('coin');
      },
      onMeat: () => {
        this.player.heal(this.run.stats.maxHp * 0.3);
        audio.sfx('heal');
        this.fx.ring(this.player.x, this.player.y, 120, 0x7dff8a);
      },
      onMagnet: () => {
        this.pickups.magnetizeAllXp();
        audio.sfx('chest');
      },
      onChest: () => this.openChest(),
    });
    this.ctx = ctx;
    this.runEvents = new RunEvents({
      ctx,
      toast: (msg) => this.events.emit('toast', msg),
      openShrine: () => this.openShrine(),
      packDefeated: (x, y) => {
        this.pickups.drop('chest', x, y);
        this.events.emit('toast', 'Elite pack defeated! A chest!');
      },
      goblinCaught: (x, y) => {
        this.pickups.burstCoins(x, y, 16, COIN_VALUE[this.mapIndex] * 3);
        this.pickups.drop('chest', x + 30, y);
        this.events.emit('toast', 'Goblin caught! Treasure!');
        audio.sfx('victory');
      },
    });
    if (DEBUG.event) this.runEvents.force(DEBUG.event as Parameters<RunEvents['force']>[0]);
    ensureDaily(saveStore.data);
    saveStore.save();
    this.tiersAtStart = tiersReached(lifetime(saveStore.data));
    this.tiersShown = { ...this.tiersAtStart };
    this.weapons = new WeaponSystem(ctx);
    this.weapons.sync(inventory.weapons, stats);
    this.abilities = new Abilities(ctx, hero, this.weapons);
    // Relics, the difficulty's gold and anything else that changes stats, once everything exists.
    this.applyRelicsAtStart();
    this.cameras.main.centerOn(0, 0);
    this.ambience = new Ambience(this, this.mapIndex);

    for (let i = 1; i < DEBUG.level; i++) {
      this.run.level++;
      this.applyChoiceNow(this.botPick(rollChoices(this.run.inventory, this.rng)));
    }
    this.run.xpNext = xpToNext(this.run.level);

    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
    this.input.keyboard?.on('keydown-SPACE', () => this.dash());
    this.input.keyboard?.on('keydown-E', () => this.ultimate());
    resetStick();
    this.scene.launch('Hud');
    audio.playMusic(this, this.map.music as Parameters<typeof audio.playMusic>[1]);

    const onHidden = () => this.openPause();
    this.game.events.on(Phaser.Core.Events.HIDDEN, onHidden);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.game.events.off(Phaser.Core.Events.HIDDEN, onHidden);
      this.weapons.destroy();
    });
  }

  update(_time: number, delta: number): void {
    if (this.run.ended) return;
    const real = Math.min(delta, 50) / 1000;
    if (this.freeze > 0) {
      this.freeze -= real;
      return;
    }
    let dt = real;
    if (this.slowLeft > 0) {
      this.slowLeft -= real;
      dt *= this.slowScale;
    }
    if (this.levelUpWait > 0) {
      this.levelUpWait -= real;
      if (this.levelUpWait <= 0 && !this.modalOpen) {
        this.openLevelUp();
        return;
      }
    }
    for (let i = 0; i < DEBUG.speed; i++) {
      this.step(dt);
      if (this.modalOpen || this.run.ended) break;
    }
  }

  private step(dt: number): void {
    const run = this.run;
    run.time += dt;

    let mx = 0;
    let my = 0;
    if (DEBUG.bot) {
      const v = botSteer(this.ctx, run.time);
      mx = v.x * DEBUG.skill;
      my = v.y * DEBUG.skill;
    } else if (stick.active) {
      mx = stick.x;
      my = stick.y;
    } else if (this.keys) {
      const k = this.keys;
      mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    }
    this.steer = { x: mx, y: my };
    if (DEBUG.bot) this.botAbilities();
    if (this.abilities.dashing) this.player.moving = true;
    else this.player.move(mx, my, dt);
    this.abilities.update(dt);
    // Sanctuary and the Life Spring slowly heal.
    const regen = this.weapons.regen / 100 + run.stats.regen;
    if (regen > 0) this.player.heal(run.stats.maxHp * regen * dt);
    this.player.update(dt);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.world.update(dt);
    this.ambience.update();

    if (!run.won) this.spawn(dt);
    this.runEvents.update(dt);
    if (run.greedUntil > 0 && run.time >= run.greedUntil) this.payGreed();
    this.enemies.update(dt);
    this.weapons.update(dt);
    this.pickups.update(dt, run.stats.magnet);
    this.fx.update(dt);
    this.questCheck += dt;
    if (this.questCheck >= 1) {
      this.questCheck = 0;
      this.checkQuests();
    }

    if (this.pendingLevelUps > 0 && !this.modalOpen && !run.ended && this.levelUpWait <= 0) {
      if (DEBUG.bot) this.openLevelUp();
      else this.levelUpBurst();
    }
  }

  // ---------------------------------------------------------------- game feel

  hitStop(seconds: number): void {
    if (DEBUG.bot) return;
    this.freeze = Math.max(this.freeze, seconds);
  }

  slowMo(scale: number, seconds: number): void {
    if (DEBUG.bot) return;
    this.slowScale = scale;
    this.slowLeft = Math.max(this.slowLeft, seconds);
  }

  shake(ms: number, intensity: number): void {
    if (saveStore.data.settings.shake) this.cameras.main.shake(ms, intensity);
  }

  /** A golden burst and a breath of slow motion before the upgrade cards open. */
  private levelUpBurst(): void {
    const { x, y } = this.player;
    this.fx.glow(x, y, 80, 420, 0xffd36b, 0.4);
    this.fx.ring(x, y, 300, 0xffcc33);
    this.fx.sparkle(x, y - 20, 12, 0xffe9a3);
    this.slowMo(0.25, 0.4);
    this.player.cheer();
    this.levelUpWait = 0.4;
    audio.sfx('levelup');
  }

  // ---------------------------------------------------------------- spawning

  spawnPoint(): { x: number; y: number } {
    const v = this.cameras.main.worldView;
    const m = 90;
    const r = this.rng();
    const u = this.rng();
    if (r < 0.3) return { x: v.x - m, y: v.y + u * v.height };
    if (r < 0.6) return { x: v.right + m, y: v.y + u * v.height };
    if (r < 0.8) return { x: v.x + u * v.width, y: v.y - m };
    return { x: v.x + u * v.width, y: v.bottom + m };
  }

  private spawn(dt: number): void {
    const run = this.run;
    const t = run.time;
    if (bossesDue(t) > run.bossesSpawned) {
      run.bossesSpawned++;
      this.spawnBoss(run.bossesSpawned - 1);
    }
    if (leadersDue(t) > run.leadersSpawned) {
      run.leadersSpawned++;
      this.spawnLeader(run.leadersSpawned - 1);
    }
    const swarm = this.map.swarm;
    if (swarm && t >= swarm.from && 1 + Math.floor((t - swarm.from) / swarm.every) > run.swarmsSpawned) {
      const k = run.swarmsSpawned++;
      const p = this.spawnPoint();
      const n = swarmSize(swarm.size, k);
      for (let i = 0; i < n; i++) this.enemies.spawn(swarm.id, p.x + (this.rng() - 0.5) * 140, p.y + (this.rng() - 0.5) * 140);
    }
    if (ringEventsDue(t) > run.ringsSpawned) {
      const k = run.ringsSpawned++;
      const id = this.map.enemies[k % 2];
      const n = ringSize(k);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        this.enemies.spawn(id, this.player.x + Math.cos(a) * 720, this.player.y + Math.sin(a) * 720);
      }
      this.events.emit('toast', 'They surround you!');
    }
    this.spawnAcc += spawnRate(t) * (run.boss ? 0.25 : 1) * (this.curses.has('horde') ? CURSE.horde : 1) * dt;
    const weights = enemyWeights(t);
    const table = this.map.enemies.map((item, i) => ({ item, weight: weights[i] }));
    for (const x of this.map.extras) {
      if (t < x.from) continue;
      if (x.max !== undefined && this.enemies.alive.filter((e) => e.active && e.def?.id === x.id).length >= x.max) continue;
      table.push({ item: x.id, weight: x.weight });
    }
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      const p = this.spawnPoint();
      const id = weightedPick(this.rng, table);
      this.enemies.spawn(id, p.x, p.y, this.rng() < eliteChance(t) * (this.curses.has('mutation') ? CURSE.mutationElites : 1));
    }
  }

  /** The map's leader drops in like a boss (smaller, at 2:30, 7:30...), unless a boss is already fighting. */
  private spawnLeader(k: number): void {
    if (this.run.boss) return;
    const def = BOSSES[this.map.leader];
    const hp = (1 + 0.35 * (hpMultiplier(this.run.time) - 1)) * bossHpMultiplier(k) * this.tyrantHp;
    const a = Math.PI / 2 + (this.rng() - 0.5) * 0.6;
    this.run.boss = this.enemies.spawnBoss(def.id, this.player.x + Math.cos(a) * 460, this.player.y + Math.sin(a) * 460, hp, this.angryFromStart(k));
    audio.sfx('boss_warning');
    this.events.emit('boss', def.name);
  }

  /** Late bosses and leaders (the third on) come in already enraged; with the Tyrant curse, all of them do. */
  private angryFromStart(k: number): boolean {
    return k >= 2 || this.curses.has('tyrant');
  }

  /** Extra boss and leader HP from the Tyrant curse. */
  private get tyrantHp(): number {
    return this.curses.has('tyrant') ? CURSE.tyrantHp : 1;
  }

  private spawnBoss(k: number): void {
    const def = BOSSES[this.map.boss];
    const hp = (1 + 0.35 * (hpMultiplier(this.run.time) - 1)) * bossHpMultiplier(k) * this.tyrantHp;
    // It drops from the sky into the lower half of the screen, clear of the HUD and the boss bar (and mostly
    // above the joystick), where the hero can watch it land.
    const a = Math.PI / 2 + (this.rng() - 0.5) * 0.6;
    this.run.boss = this.enemies.spawnBoss(def.id, this.player.x + Math.cos(a) * 460, this.player.y + Math.sin(a) * 460, hp, this.angryFromStart(k));
    audio.sfx('boss_warning');
    this.events.emit('boss', def.name);
    // The boss at 15:00 is the last one: beat it and the stage is cleared.
    if (this.run.time >= FINAL_TIME - 1 && !this.run.finalBoss) {
      this.run.finalBoss = this.run.boss;
      this.time.delayedCall(2600, () => this.events.emit('toast', 'The final battle! Win it to clear the stage!'));
    }
  }

  // ---------------------------------------------------------------- events

  private onEnemyKilled(e: Enemy): void {
    const run = this.run;
    // An exploder that blew itself up: no reward.
    if (e.selfDestructed) return;
    this.runEvents.onKilled(e);
    this.abilities.onKill(e);
    run.kills++;
    const kind = e.boss?.id ?? e.def?.id;
    if (kind) run.monsters[kind] = (run.monsters[kind] ?? 0) + 1;
    if (e.elite) run.eliteKills++;
    if (e.boss?.leader) {
      this.onLeaderDefeated(e);
      return;
    }
    if (e.isBoss) {
      this.onBossDefeated(e);
      return;
    }
    // A mimic is a piñata.
    if (e.def?.behavior === 'ambush') this.pickups.burstCoins(e.x, e.y, 8, COIN_VALUE[this.mapIndex]);
    this.pickups.dropXp(e.x, e.y, e.xp);
    // A golden hour: coins drop more often and are worth more.
    const golden = this.runEvents.golden;
    const coinValue = COIN_VALUE[this.mapIndex] * (golden ? GOLDEN_HOUR.coinValue : 1);
    const chance = e.elite ? 1 : e.coinChance * coinFactor(this.run.time) * (golden ? GOLDEN_HOUR.coinChance : 1);
    if (this.rng() < chance) this.pickups.drop('coin', e.x + 24, e.y + 10, coinValue);
    if (this.rng() < DROP_CHANCE.meat) this.pickups.drop('meat', e.x - 20, e.y);
    else if (this.rng() < DROP_CHANCE.magnet) this.pickups.drop('magnet', e.x - 20, e.y);
  }

  private onBossDefeated(e: Enemy): void {
    const run = this.run;
    if (run.boss === e) run.boss = null;
    run.bossesKilled++;
    this.pickups.drop('chest', e.x, e.y);
    this.pickups.burstCoins(e.x, e.y, 12, Math.ceil(BOSS_GOLD[this.mapIndex] / 12));
    this.fx.explosion(e.x, e.y, 260);
    this.fx.ring(e.x, e.y, 500, 0xffcc33);
    for (const [ms, dx, dy] of [[150, -90, -40], [300, 80, 30], [450, -20, 70]]) {
      this.time.delayedCall(ms, () => this.fx.explosion(e.x + dx, e.y + dy, 170));
    }
    this.cameras.main.flash(260, 255, 244, 214);
    this.player.cheer();
    this.shake(420, 0.012);
    this.hitStop(0.12);
    this.slowMo(0.3, 1.1);
    audio.sfx('victory');
    if (e === run.finalBoss) {
      run.won = true;
      this.events.emit('toast', 'STAGE CLEAR!');
      this.time.delayedCall(2600, () => this.endRun(false));
    }
    const save = saveStore.data;
    save.bossKills[this.mapIndex]++;
    const next = this.mapIndex + 1;
    if (next < MAPS.length && save.unlockedMaps < next + 1) {
      save.unlockedMaps = next + 1;
      run.unlockedMap = next;
      this.events.emit('toast', `New map unlocked: ${MAPS[next].name}!`);
    } else {
      this.events.emit('toast', `${e.boss!.name} defeated!`);
    }
    saveStore.save();
  }

  /** A leader falls: a chest (upgrades, maybe an evolution), a spray of coins, a short celebration. */
  private onLeaderDefeated(e: Enemy): void {
    const run = this.run;
    if (run.boss === e) run.boss = null;
    run.leadersKilled++;
    this.pickups.drop('chest', e.x, e.y);
    this.pickups.burstCoins(e.x, e.y, 8, Math.ceil(BOSS_GOLD[this.mapIndex] / 24));
    this.fx.explosion(e.x, e.y, 180);
    this.fx.ring(e.x, e.y, 360, 0xffcc33);
    this.player.cheer();
    this.shake(260, 0.008);
    this.hitStop(0.08);
    this.slowMo(0.4, 0.6);
    audio.sfx('victory');
    this.events.emit('toast', `${e.boss!.name} defeated!`);
  }

  private addXp(value: number): void {
    const run = this.run;
    run.xp += value * run.stats.xpMult;
    audio.sfx('xp');
    while (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level++;
      run.xpNext = xpToNext(run.level);
      this.pendingLevelUps++;
      // A talent level brings the hero's talent cards on top of the usual upgrade.
      if (TALENT_LEVELS.includes(run.level)) {
        run.talentsDue++;
        this.pendingLevelUps++;
      }
    }
  }

  hurtPlayer(amount: number): void {
    const run = this.run;
    if (this.player.iframes > 0 || run.ended || DEBUG.god) return;
    const { x, y } = this.player;
    // The Mana Shield takes the whole hit (Mana Font: and blasts monsters back).
    if (this.player.blockHit()) {
      this.player.iframes = 0.6;
      this.fx.ring(x, y, 140, 0x8fd8ff);
      this.fx.sparkle(x, y - 20, 6, 0xd8f4ff);
      audio.sfx('zap', 0.7);
      if (this.has('font')) {
        this.fx.shockwave(x, y + 30, 240, 0x8fd8ff);
        this.enemies.forEachInRadius(x, y, 240, (e) => this.enemies.damage(e, 20 * run.stats.damageMult, x, y, 3, false));
      }
      return;
    }
    const dmg = Math.max(1, Math.round(amount * (this.curses.has('fragile') ? CURSE.fragile : 1) - run.stats.armor));
    this.player.hp -= dmg;
    this.player.iframes = PLAYER_BASE.iframes;
    this.player.hitFlash();
    this.fx.damageNumber(x, y - 70, dmg, 0xff6b6b);
    this.shake(90, 0.004);
    this.events.emit('hurt');
    audio.sfx('hurt');
    if (this.player.hp <= 0) {
      this.onPlayerDown();
      return;
    }
    // Second Wind: a burst of health when it gets low.
    if (this.has('secondwind') && run.time >= run.secondWindAt && this.player.hp < run.stats.maxHp * TALENT.secondWindAt) {
      run.secondWindAt = run.time + TALENT.secondWindEvery;
      this.player.heal(run.stats.maxHp * TALENT.secondWindHeal);
      this.fx.ring(x, y, 200, 0x7dff8a);
      this.fx.sparkle(x, y - 20, 8, 0xc8ffb8);
      this.events.emit('toast', 'Second Wind!');
    }
    if (this.has('blink') && run.time >= run.blinkAt) {
      run.blinkAt = run.time + TALENT.blinkEvery;
      this.blink();
    }
  }

  private has(id: TalentId): boolean {
    return this.run.inventory.talents.includes(id);
  }

  /** Blink: the mage vanishes and reappears away from the monsters around her, untouchable for a moment. */
  private blink(): void {
    const p = this.player;
    let ax = 0;
    let ay = 0;
    this.enemies.forEachInRadius(p.x, p.y, 320, (e) => {
      ax += p.x - e.x;
      ay += p.y - e.y;
    });
    const a = ax || ay ? Math.atan2(ay, ax) : this.rng() * Math.PI * 2;
    this.fx.deathPuff(p.x, p.y, 1.2, 0xc9a8ff);
    p.x += Math.cos(a) * TALENT.blinkDistance;
    p.y += Math.sin(a) * TALENT.blinkDistance;
    p.iframes = Math.max(p.iframes, 1);
    this.fx.deathPuff(p.x, p.y, 1.2, 0xc9a8ff);
    this.fx.sparkle(p.x, p.y - 20, 6, 0xe2d0ff);
  }

  get heroId(): CharacterId {
    return this.hero.id;
  }

  /** The HUD's dash button (or Space): a burst the way the hero is steering. */
  dash(): void {
    if (this.modalOpen || this.run.ended) return;
    this.abilities.dash(this.steer.x, this.steer.y);
  }

  /** The HUD's ultimate button (or E), once it is charged. */
  ultimate(): void {
    if (this.modalOpen || this.run.ended) return;
    if (this.abilities.ultimate()) this.player.cheer();
  }

  /** The autopilot fires the ultimate as soon as it can, and dashes when a monster gets close. */
  private botAbilities(): void {
    if (this.abilities.ready) this.ultimate();
    if (this.abilities.dashWait <= 0 && this.enemies.nearest(this.player.x, this.player.y, 100)) this.dash();
  }

  private onPlayerDown(): void {
    const run = this.run;
    if (run.revivesLeft > 0) {
      run.revivesLeft--;
      this.player.hp = run.stats.maxHp * (run.medal ? 1 : 0.5);
      run.medal = false;
      this.player.iframes = 2.5;
      const { x, y } = this.player;
      this.fx.ring(x, y, 620, 0xffcc33);
      for (const e of this.enemies.alive) {
        if (!e.active) continue;
        if (Phaser.Math.Distance.Between(x, y, e.x, e.y) < 520) {
          if (e.isBoss) this.enemies.damage(e, e.maxHp * 0.1, x, y, 3);
          else this.enemies.damage(e, 99999, x, y, 0);
        }
      }
      audio.sfx('victory');
      this.events.emit('toast', 'Revived!');
      return;
    }
    this.endRun(false);
  }

  // ---------------------------------------------------------------- modals

  private botPick(choices: Choice[]): Choice {
    const score = (c: Choice) => {
      if (c.kind === 'weapon') return this.run.inventory.weapons.some((w) => w.id === c.id) ? 4 : 3;
      if (c.kind === 'passive') return this.run.inventory.passives.some((p) => p.id === c.id) ? 2 : 1;
      if (c.kind === 'rune') return 2.5;
      if (c.kind === 'talent') return 5;
      return c.kind === 'heal' ? 0 : 0.5;
    };
    return [...choices].sort((a, b) => score(b) - score(a))[0];
  }

  private applyChoiceNow(choice: Choice): void {
    const run = this.run;
    if (choice.kind === 'heal') this.player.heal(run.stats.maxHp * choice.amount);
    else if (choice.kind === 'might') run.blessings.damage += MAXED.might;
    else if (choice.kind === 'tough') {
      run.blessings.maxHp += MAXED.tough;
      this.player.heal(run.stats.maxHp * MAXED.tough);
    } else applyChoice(run.inventory, choice);
    this.refreshStats();
  }

  private refreshStats(): void {
    const run = this.run;
    run.stats = computeStats(saveStore.data.shop, passiveLevels(run.inventory), this.hero, run.inventory.talents);
    const st = run.stats;
    st.goldMult *= this.diff.gold * (1 + HEAT_GOLD * this.heat);
    if (this.curses.has('famine')) st.healMult = CURSE.famine;
    if (this.relics.has('slime')) st.xpMult *= 1.1;
    if (this.relics.has('lich')) {
      st.magnet *= 1.4;
      st.goldMult *= 1.15;
    }
    if (this.relics.has('demon')) {
      st.critChance += 0.08;
      st.critMult = 2.5;
    }
    const b = run.blessings;
    const m = this.perks;
    const gb = this.gear;
    st.goldMult *= (1 + m.gold) * (1 + gb.gold);
    st.damageMult *= (1 + b.damage) * (1 + m.damage) * (1 + gb.damage);
    st.speed *= (1 + b.speed) * (1 + gb.speed);
    st.maxHp = Math.round(st.maxHp * (1 + b.maxHp) * (1 + m.maxHp) * (1 + gb.maxHp));
    st.cooldownMult = Math.max(0.4, st.cooldownMult * (1 - gb.haste));
    st.critChance += gb.crit;
    st.areaMult *= 1 + gb.area;
    st.xpMult += gb.xp;
    st.armor += gb.armor;
    st.durationMult += gb.duration;
    st.magnet *= 1 + gb.magnet;
    this.ctx.runes = runeLevels(run.inventory);
    this.player.setStats(run.stats);
    this.weapons.talents = run.inventory.talents;
    this.weapons.sync(run.inventory.weapons, run.stats);
    this.events.emit('inventory');
  }

  private openModal(key: string, data: object): void {
    this.modalOpen = true;
    resetStick();
    audio.duck(true);
    this.scene.setVisible(false, 'Hud');
    this.scene.pause();
    this.scene.launch(key, data);
  }

  /** Called by modal scenes when they close. */
  closeModal(key: string): void {
    this.scene.stop(key);
    this.scene.setVisible(true, 'Hud');
    this.modalOpen = false;
    resetStick();
    audio.duck(false);
    if (!this.run.ended) this.scene.resume();
  }

  /** Cards per level-up (the Narrow Path curse deals one fewer). */
  private get cardCount(): number {
    return this.curses.has('fewer') ? 2 : 3;
  }

  /** The cards for the next level-up: the hero's talents at levels 5, 10, 15..., otherwise upgrades. */
  private deal(count: number, avoid: Choice[] = []): Choice[] {
    const talents = avoid.length ? avoid[0].kind === 'talent' : this.run.talentsDue > 0;
    if (talents) {
      const t = rollTalents(this.run.inventory, this.hero.id, this.rng, count, avoid);
      if (t.length) return t;
    }
    return rollChoices(this.run.inventory, this.rng, count, avoid);
  }

  private openLevelUp(): void {
    this.pendingLevelUps--;
    const choices = this.deal(this.cardCount);
    if (this.run.talentsDue > 0) this.run.talentsDue--;
    if (DEBUG.bot) {
      this.applyChoiceNow(this.botPick(choices));
      return;
    }
    const run = this.run;
    this.openModal('LevelUp', {
      choices,
      inventory: run.inventory,
      level: run.level,
      onPick: (c: Choice) => {
        this.applyChoiceNow(c);
        this.closeModal('LevelUp');
      },
      counts: () => ({ rerolls: run.rerolls, banishes: run.banishes }),
      reroll: (current: Choice[]) => {
        if (run.rerolls <= 0) return null;
        run.rerolls--;
        return this.deal(this.cardCount, current);
      },
      banish: (c: Choice, current: Choice[]) => {
        if (run.banishes <= 0) return null;
        run.banishes--;
        run.inventory.banned.push(choiceKey(c));
        const fresh = this.deal(1, current)[0];
        return current.map((x) => (x === c ? fresh : x));
      },
    });
  }

  private openChest(): void {
    const inv = this.run.inventory;
    let reward: ChestReward;
    const evolvable = evolvableWeapons(inv);
    this.run.chests++;
    if (evolvable.length) {
      reward = { kind: 'evolution', evolution: evolve(inv, evolvable[0])! };
      this.run.evolutions++;
    } else {
      const count = 1 + (this.rng() < 0.6 ? 1 : 0) + (this.rng() < 0.3 ? 1 : 0) + (this.relics.has('ogre') ? 1 : 0);
      const choices = rollChoices(inv, this.rng, 3)
        .filter((c) => c.kind === 'weapon' || c.kind === 'passive' || c.kind === 'rune')
        .slice(0, count);
      choices.forEach((c) => applyChoice(inv, c));
      reward = { kind: 'upgrades', choices };
    }
    const gold = 30 * (this.mapIndex + 1) * (this.relics.has('ogre') ? 2 : 1);
    this.run.gold += gold;
    this.refreshStats();
    audio.sfx('chest');
    if (DEBUG.bot) return;
    this.openModal('Chest', { reward, gold, onClose: () => this.closeModal('Chest') });
  }

  /** Relics that act once, when the run starts. */
  private applyRelicsAtStart(): void {
    const run = this.run;
    if (this.relics.has('slime')) run.rerolls++;
    if (this.relics.has('captain')) {
      run.revivesLeft++;
      run.medal = true;
    }
    if (this.relics.has('boar')) {
      const inv = run.inventory;
      inv.weapons[0].level = Math.max(inv.weapons[0].level, 2);
      const free = RUNE_IDS.filter((id) => !inv.runes.some((r) => r.id === id) && !inv.banned.includes(`rune:${id}`));
      if (free.length && inv.runes.length < 3) inv.runes.push({ id: free[Math.floor(this.rng() * free.length)], level: 1 });
    }
    // Mastery: the hero's own weapon starts a level higher (on top of the Boar Tusk).
    const own = run.inventory.weapons[0];
    own.level = Math.min(MAX_WEAPON_LEVEL, own.level + this.perks.startLevels);
    this.refreshStats();
    [...this.relics].forEach((id, i) => this.time.delayedCall(1200 + i * 2900, () => this.events.emit('toast', `${relicDef(id).name}: ${relicDef(id).text}`)));
    if (this.heat > 0) {
      const msg = `Cursed run: heat ${this.heat}, gold +${Math.round(HEAT_GOLD * this.heat * 100)}%`;
      this.time.delayedCall(1200 + this.relics.size * 2900, () => this.events.emit('toast', msg));
    }
  }

  // ---------------------------------------------------------------- shrine

  /** Three offers: always at least one blessing and one pact. */
  private openShrine(): void {
    const shuffle = <T>(a: T[]) => [...a].sort(() => this.rng() - 0.5);
    const bless = shuffle(SHRINE_OFFERS.filter((o) => !o.pact));
    const pacts = shuffle(SHRINE_OFFERS.filter((o) => o.pact));
    const offers = shuffle([bless[0], pacts[0], shuffle([...bless.slice(1), ...pacts.slice(1)])[0]]);
    audio.sfx('levelup');
    if (DEBUG.bot) {
      this.takeOffer(offers[0]);
      return;
    }
    this.openModal('Shrine', {
      offers,
      onPick: (o: ShrineOffer) => {
        this.closeModal('Shrine');
        this.takeOffer(o);
      },
      onLeave: () => this.closeModal('Shrine'),
    });
  }

  private takeOffer(o: ShrineOffer): void {
    const run = this.run;
    const { x, y } = this.player;
    this.fx.ring(x, y, 220, o.pact ? 0xff5a5a : 0x8fd8ff);
    this.fx.sparkle(x, y - 20, 8, 0xffffff);
    run.shrines++;
    switch (o.id) {
      case 'might':
        run.blessings.damage += 0.15;
        break;
      case 'haste':
        run.blessings.speed += 0.12;
        break;
      case 'life':
        run.blessings.maxHp += 0.1;
        break;
      case 'greed':
        run.greedUntil = run.time + GREED_PACT.seconds;
        this.runEvents.timers.push({ label: 'Pact of Greed', until: run.greedUntil, color: '#ffb36b' });
        break;
      case 'trials':
        this.runEvents.spawnPack();
        break;
      case 'blood':
        this.player.hp = Math.max(1, this.player.hp - run.stats.maxHp * 0.35);
        this.player.hitFlash();
        this.pendingLevelUps += 2;
        break;
    }
    this.refreshStats();
    if (o.id === 'life') this.player.heal(run.stats.maxHp);
    this.events.emit('toast', o.name);
  }

  /** The Pact of Greed is over: its gold rains down. */
  private payGreed(): void {
    const run = this.run;
    run.greedUntil = -1;
    const gold = GREED_PACT.goldPerMap * (this.mapIndex + 1);
    run.gold += gold * run.stats.goldMult;
    this.pickups.burstCoins(this.player.x, this.player.y - 40, 12, 0);
    this.events.emit('toast', `Pact of Greed pays out: +${gold} gold!`);
    audio.sfx('coin');
  }

  openPause(): void {
    if (this.modalOpen || this.run.ended) return;
    this.openModal('Pause', {
      run: this.run,
      onResume: () => this.closeModal('Pause'),
      onQuit: () => {
        this.closeModal('Pause');
        this.endRun(true);
      },
    });
  }

  // ---------------------------------------------------------------- quests

  /** The run so far, as the daily quests and achievements measure it. */
  report(): RunReport {
    const r = this.run;
    return {
      mapIndex: r.mapIndex,
      time: r.time,
      level: r.level,
      kills: r.kills,
      eliteKills: r.eliteKills,
      bossKills: r.bossesKilled,
      gold: Math.floor(r.gold),
      chests: r.chests,
      evolutions: r.evolutions,
      monsters: r.monsters,
      shrines: r.shrines,
      died: false,
    };
  }

  /** Shows a banner the moment the run finishes a daily quest or reaches an achievement tier. */
  private checkQuests(): void {
    const save = saveStore.data;
    const report = this.report();
    save.daily.quests.forEach((q, i) => {
      if (questDone(q) || this.questsShown.has(i) || progressWith(q, report) < q.target) return;
      this.questsShown.add(i);
      this.notice({ title: 'Quest complete!', line: describeQuest(q), icon: questDef(q.id).icon });
    });
    const reached = tiersReached(lifetime(save, report));
    for (const a of ACHIEVEMENTS) {
      if (reached[a.id] <= this.tiersShown[a.id]) continue;
      this.tiersShown[a.id] = reached[a.id];
      this.notice({ title: 'Achievement!', line: `${a.name} ${ROMAN[reached[a.id] - 1]}`, icon: a.icon });
    }
    if (DEBUG.unlock) return;
    for (const u of reachedUnlocks(save, records(save, report))) {
      const key = unlockKey(u);
      if (this.unlocksShown.has(key)) continue;
      this.unlocksShown.add(key);
      const item = unlockInfo(u);
      this.notice({ title: 'Unlocked!', line: `${item.name} (from your next run)`, icon: item.icon });
    }
  }

  private notice(n: QuestNotice): void {
    this.events.emit('quest', n);
    audio.sfx('chest');
  }

  private endRun(quit: boolean): void {
    const run = this.run;
    if (run.ended) return;
    run.ended = true;
    resetStick();
    const save = saveStore.data;
    const collected = Math.floor(run.gold);
    const bonus = Math.floor((run.time * RUN_BONUS.perSecond + run.kills * RUN_BONUS.perKill) * run.stats.goldMult);
    const victoryBonus = run.won ? Math.floor(VICTORY_GOLD[this.mapIndex] * run.stats.goldMult) : 0;
    const total = collected + bonus + victoryBonus;
    // A clear opens the next difficulty and may win a relic (worn at once if a slot is free).
    let relic: string | null = null;
    const newBestHeat = run.won && this.heat > save.bestHeat[this.mapIndex];
    if (newBestHeat) save.bestHeat[this.mapIndex] = this.heat;
    if (run.won) {
      save.clears[this.mapIndex] = Math.max(save.clears[this.mapIndex], this.difficulty + 1);
      const r = relicFor(this.mapIndex, this.difficulty);
      if (r && !save.relics.includes(r.id)) {
        save.relics.push(r.id);
        if (save.equipped.length < 2) save.equipped.push(r.id);
        relic = r.name;
      }
    }
    const prevBest = save.bestTimes[this.mapIndex];
    const newBest = run.time > prevBest;
    save.gold += total;
    if (newBest) save.bestTimes[this.mapIndex] = run.time;
    const report = { ...this.report(), died: !run.won && !quit };
    const quests = applyRun(save, report, bonus + victoryBonus).map(describeQuest);
    const unlocks = claimUnlocks(save).map(unlockInfo);
    const from = masteryState(save.mastery[this.hero.id]).level;
    const xp = masteryXp(run.time, run.kills, run.bossesKilled + run.leadersKilled);
    save.mastery[this.hero.id] += xp;
    // Equipment found on the way.
    const loot: RunSummary['loot'] = [];
    let lootGold = 0;
    const drops = runDrops(this.rng, {
      map: this.mapIndex,
      difficulty: this.difficulty,
      time: run.time,
      bosses: run.bossesKilled,
      leaders: run.leadersKilled,
      won: run.won,
    });
    for (const d of drops) {
      const got = addItem(save.gear, d, save);
      if (typeof got === 'number') lootGold += got;
      else loot.push({ name: GEAR[got.type].name, type: got.type, rarity: got.rarity });
    }
    const reached = tiersReached(lifetime(save));
    const achievements = ACHIEVEMENTS.flatMap((a) =>
      Array.from({ length: Math.max(0, reached[a.id] - this.tiersAtStart[a.id]) }, (_, k) => `${a.name} ${ROMAN[this.tiersAtStart[a.id] + k]}`),
    );
    saveStore.save();

    const summary: RunSummary = {
      mapIndex: this.mapIndex,
      time: run.time,
      kills: run.kills,
      level: run.level,
      collected,
      bonus,
      total,
      bestTime: Math.max(prevBest, run.time),
      newBest,
      quit,
      unlockedMap: run.unlockedMap,
      bossesKilled: run.bossesKilled,
      quests,
      achievements,
      won: run.won,
      victoryBonus,
      difficulty: this.difficulty,
      relic,
      heat: this.heat,
      newBestHeat,
      unlocks,
      loot,
      lootGold,
      mastery: { hero: this.hero.name, xp, from, to: masteryState(save.mastery[this.hero.id]).level },
    };
    audio.stopMusic();
    if (run.won) {
      audio.sfx('victory');
      this.player.cheer();
    } else if (!quit) {
      audio.sfx('gameover');
      if (!this.player.knockOut()) {
        this.player.sprite.setTint(0xff6b6b);
        this.tweens.add({ targets: this.player.sprite, angle: 90, alpha: 0.6, duration: 500, ease: 'Quad.easeIn' });
      }
    }
    this.time.delayedCall(quit ? 50 : 900, () => {
      this.scene.stop('Hud');
      this.scene.pause();
      this.scene.launch('GameOver', summary);
    });
  }
}

/** Name and icon of an unlocked weapon, item or rune. */
function unlockInfo(u: (typeof UNLOCKS)[number]): { name: string; icon: string } {
  const def = u.kind === 'weapon' ? WEAPONS[u.id] : u.kind === 'rune' ? RUNES[u.id] : PASSIVES[u.id];
  return { name: def.name, icon: def.icon };
}
