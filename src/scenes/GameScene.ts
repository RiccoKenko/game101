import Phaser from 'phaser';
import { audio } from '../audio/audio';
import { BOSSES } from '../config/enemies';
import { BOSS_GOLD, COIN_VALUE, DROP_CHANCE, PLAYER_BASE, RUN_BONUS } from '../config/game';
import { MAPS, type MapDef } from '../config/maps';
import { type EvolutionId } from '../config/weapons';
import { DEBUG } from '../core/debug';
import {
  applyChoice,
  evolvableWeapons,
  evolve,
  newInventory,
  passiveLevels,
  rollChoices,
  xpToNext,
  type Choice,
  type Inventory,
} from '../core/progression';
import { mulberry32, weightedPick, type Rng } from '../core/rng';
import { saveStore } from '../core/save';
import { computeStats, type PlayerStats } from '../core/stats';
import {
  bossesDue,
  bossHpMultiplier,
  eliteChance,
  enemyWeights,
  hpMultiplier,
  ringEventsDue,
  ringSize,
  spawnRate,
} from '../core/waves';
import { botSteer } from '../game/Bot';
import { type GameCtx } from '../game/context';
import { Effects } from '../game/Effects';
import { Enemy, EnemyManager } from '../game/Enemies';
import { PickupManager } from '../game/Pickups';
import { Player } from '../game/Player';
import { resetStick, stick } from '../game/stick';
import { WeaponSystem } from '../game/Weapons';
import { World } from '../game/World';

export interface RunState {
  mapIndex: number;
  time: number;
  kills: number;
  gold: number;
  level: number;
  xp: number;
  xpNext: number;
  inventory: Inventory;
  stats: PlayerStats;
  revivesLeft: number;
  bossesSpawned: number;
  bossesKilled: number;
  ringsSpawned: number;
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
  private rng!: Rng;
  private world!: World;
  private enemies!: EnemyManager;
  private pickups!: PickupManager;
  private fx!: Effects;
  private weapons!: WeaponSystem;
  private spawnAcc = 0;
  private pendingLevelUps = 0;
  private modalOpen = false;
  private keys?: Record<string, Phaser.Input.Keyboard.Key>;

  constructor() {
    super('Game');
  }

  init(data: { map?: number }): void {
    this.mapIndex = Phaser.Math.Clamp(data.map ?? 0, 0, MAPS.length - 1);
    this.spawnAcc = 0;
    this.pendingLevelUps = 0;
    this.modalOpen = false;
  }

  create(): void {
    this.map = MAPS[this.mapIndex];
    this.rng = mulberry32(DEBUG.seed || Date.now() >>> 0);
    this.world = new World(this, this.map);
    const inventory = newInventory();
    const stats = computeStats(saveStore.data.shop, {});
    this.run = {
      mapIndex: this.mapIndex,
      time: DEBUG.startTime,
      kills: 0,
      gold: 0,
      level: 1,
      xp: 0,
      xpNext: xpToNext(1),
      inventory,
      stats,
      revivesLeft: stats.revivals,
      bossesSpawned: bossesDue(DEBUG.startTime),
      bossesKilled: 0,
      ringsSpawned: ringEventsDue(DEBUG.startTime),
      boss: null,
      ended: false,
      unlockedMap: null,
    };

    const ctx = { scene: this as Phaser.Scene, rng: this.rng, mapIndex: this.mapIndex } as GameCtx;
    Object.defineProperty(ctx, 'runTime', { get: () => this.run.time });
    ctx.onEnemyKilled = (e) => this.onEnemyKilled(e);
    ctx.hurtPlayer = (amount) => this.hurtPlayer(amount);
    ctx.spawnPoint = () => this.spawnPoint();
    ctx.view = () => this.cameras.main.worldView;
    ctx.player = this.player = new Player(this, stats);
    ctx.fx = this.fx = new Effects(this);
    ctx.enemies = this.enemies = new EnemyManager(ctx);
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
    this.weapons = new WeaponSystem(ctx);
    this.weapons.sync(inventory.weapons, stats);
    this.cameras.main.centerOn(0, 0);

    for (let i = 1; i < DEBUG.level; i++) {
      this.run.level++;
      this.applyChoiceNow(this.botPick(rollChoices(this.run.inventory, this.rng)));
    }
    this.run.xpNext = xpToNext(this.run.level);

    this.keys = this.input.keyboard?.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT') as Record<string, Phaser.Input.Keyboard.Key> | undefined;
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
    const dt = Math.min(delta, 50) / 1000;
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
      mx = v.x;
      my = v.y;
    } else if (stick.active) {
      mx = stick.x;
      my = stick.y;
    } else if (this.keys) {
      const k = this.keys;
      mx = (k.D.isDown || k.RIGHT.isDown ? 1 : 0) - (k.A.isDown || k.LEFT.isDown ? 1 : 0);
      my = (k.S.isDown || k.DOWN.isDown ? 1 : 0) - (k.W.isDown || k.UP.isDown ? 1 : 0);
    }
    this.player.move(mx, my, dt);
    if (this.weapons.regen > 0) this.player.heal((run.stats.maxHp * this.weapons.regen * dt) / 100);
    this.player.update(dt);
    this.cameras.main.centerOn(this.player.x, this.player.y);
    this.world.update(dt);

    this.spawn(dt);
    this.enemies.update(dt);
    this.weapons.update(dt);
    this.pickups.update(dt, run.stats.magnet);
    this.fx.update(dt);

    if (this.pendingLevelUps > 0 && !this.modalOpen && !run.ended) this.openLevelUp();
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
    this.spawnAcc += spawnRate(t) * (run.boss ? 0.45 : 1) * dt;
    const weights = enemyWeights(t);
    while (this.spawnAcc >= 1) {
      this.spawnAcc -= 1;
      const p = this.spawnPoint();
      const id = weightedPick(this.rng, this.map.enemies.map((item, i) => ({ item, weight: weights[i] })));
      this.enemies.spawn(id, p.x, p.y, this.rng() < eliteChance(t));
    }
  }

  private spawnBoss(k: number): void {
    const def = BOSSES[this.map.boss];
    const hp = (1 + 0.35 * (hpMultiplier(this.run.time) - 1)) * bossHpMultiplier(k);
    const a = -Math.PI / 2 + (this.rng() - 0.5);
    this.run.boss = this.enemies.spawnBoss(def.id, this.player.x + Math.cos(a) * 850, this.player.y + Math.sin(a) * 850, hp);
    audio.sfx('boss_warning');
    this.events.emit('boss', def.name);
  }

  // ---------------------------------------------------------------- events

  private onEnemyKilled(e: Enemy): void {
    const run = this.run;
    run.kills++;
    if (e.isBoss) {
      this.onBossDefeated(e);
      return;
    }
    this.pickups.dropXp(e.x, e.y, e.xp);
    const coinValue = COIN_VALUE[this.mapIndex];
    if (this.rng() < e.coinChance) this.pickups.drop('coin', e.x + 24, e.y + 10, coinValue);
    if (e.elite) this.pickups.burstCoins(e.x, e.y, 3, coinValue);
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
    this.cameras.main.shake(320, 0.008);
    audio.sfx('victory');
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

  private addXp(value: number): void {
    const run = this.run;
    run.xp += value * run.stats.xpMult;
    audio.sfx('xp');
    while (run.xp >= run.xpNext) {
      run.xp -= run.xpNext;
      run.level++;
      run.xpNext = xpToNext(run.level);
      this.pendingLevelUps++;
    }
  }

  hurtPlayer(amount: number): void {
    const run = this.run;
    if (this.player.iframes > 0 || run.ended || DEBUG.god) return;
    const dmg = Math.max(1, Math.round(amount - run.stats.armor));
    this.player.hp -= dmg;
    this.player.iframes = PLAYER_BASE.iframes;
    this.player.hitFlash();
    this.fx.damageNumber(this.player.x, this.player.y - 70, dmg, 0xff6b6b);
    this.cameras.main.shake(90, 0.004);
    audio.sfx('hurt');
    if (this.player.hp <= 0) this.onPlayerDown();
  }

  private onPlayerDown(): void {
    const run = this.run;
    if (run.revivesLeft > 0) {
      run.revivesLeft--;
      this.player.hp = run.stats.maxHp * 0.5;
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
      return 0;
    };
    return [...choices].sort((a, b) => score(b) - score(a))[0];
  }

  private applyChoiceNow(choice: Choice): void {
    if (choice.kind === 'gold') this.run.gold += choice.amount;
    else if (choice.kind === 'heal') this.player.heal(this.run.stats.maxHp * choice.amount);
    else applyChoice(this.run.inventory, choice);
    this.refreshStats();
  }

  private refreshStats(): void {
    const run = this.run;
    run.stats = computeStats(saveStore.data.shop, passiveLevels(run.inventory));
    this.player.setStats(run.stats);
    this.weapons.sync(run.inventory.weapons, run.stats);
    this.events.emit('inventory');
  }

  private openModal(key: string, data: object): void {
    this.modalOpen = true;
    resetStick();
    audio.duck(true);
    this.scene.pause();
    this.scene.launch(key, data);
  }

  /** Called by modal scenes when they close. */
  closeModal(key: string): void {
    this.scene.stop(key);
    this.modalOpen = false;
    resetStick();
    audio.duck(false);
    if (!this.run.ended) this.scene.resume();
  }

  private openLevelUp(): void {
    this.pendingLevelUps--;
    const choices = rollChoices(this.run.inventory, this.rng, 3);
    if (DEBUG.bot) {
      this.applyChoiceNow(this.botPick(choices));
      return;
    }
    audio.sfx('levelup');
    this.openModal('LevelUp', {
      choices,
      inventory: this.run.inventory,
      level: this.run.level,
      onPick: (c: Choice) => {
        this.applyChoiceNow(c);
        this.closeModal('LevelUp');
      },
    });
  }

  private openChest(): void {
    const inv = this.run.inventory;
    let reward: ChestReward;
    const evolvable = evolvableWeapons(inv);
    if (evolvable.length) {
      reward = { kind: 'evolution', evolution: evolve(inv, evolvable[0])! };
    } else {
      const count = 1 + (this.rng() < 0.6 ? 1 : 0) + (this.rng() < 0.3 ? 1 : 0);
      const choices = rollChoices(inv, this.rng, 3)
        .filter((c) => c.kind === 'weapon' || c.kind === 'passive')
        .slice(0, count);
      choices.forEach((c) => applyChoice(inv, c));
      reward = { kind: 'upgrades', choices };
    }
    const gold = 30 * (this.mapIndex + 1);
    this.run.gold += gold;
    this.refreshStats();
    audio.sfx('chest');
    if (DEBUG.bot) return;
    this.openModal('Chest', { reward, gold, onClose: () => this.closeModal('Chest') });
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

  private endRun(quit: boolean): void {
    const run = this.run;
    if (run.ended) return;
    run.ended = true;
    resetStick();
    const save = saveStore.data;
    const collected = Math.floor(run.gold);
    const bonus = Math.floor((run.time * RUN_BONUS.perSecond + run.kills * RUN_BONUS.perKill) * run.stats.goldMult);
    const total = collected + bonus;
    const prevBest = save.bestTimes[this.mapIndex];
    const newBest = run.time > prevBest;
    save.gold += total;
    if (newBest) save.bestTimes[this.mapIndex] = run.time;
    save.stats.runs++;
    save.stats.kills += run.kills;
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
    };
    audio.stopMusic();
    if (!quit) {
      audio.sfx('gameover');
      this.player.sprite.setTint(0xff6b6b);
      this.tweens.add({ targets: this.player.sprite, angle: 90, alpha: 0.6, duration: 500, ease: 'Quad.easeIn' });
    }
    this.time.delayedCall(quit ? 50 : 900, () => {
      this.scene.stop('Hud');
      this.scene.pause();
      this.scene.launch('GameOver', summary);
    });
  }
}
