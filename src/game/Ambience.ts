import Phaser from 'phaser';

type Layer = Phaser.Types.GameObjects.Particles.ParticleEmitterConfig & { texture: string; depth: number };

const ADD = Phaser.BlendModes.ADD;
const FADE_IN_OUT = { values: [0, 0.9, 0.9, 0] };

/** Drifting particles that give each map its air, one list of layers per map (by index). */
const LAYERS: Layer[][] = [
  // Greenhill Fields: petals on the breeze and floating pollen.
  [
    {
      texture: 'petal',
      depth: 45,
      frequency: 240,
      lifespan: 6500,
      speedX: { min: 40, max: 95 },
      speedY: { min: 25, max: 70 },
      rotate: { start: 0, end: 540 },
      scale: { min: 0.8, max: 1.5 },
      alpha: FADE_IN_OUT,
      tint: [0xffd1e6, 0xffffff, 0xffe9a8, 0xffb8d6],
    },
    {
      texture: 'glow',
      depth: 44,
      frequency: 380,
      lifespan: 4500,
      speed: { min: 6, max: 26 },
      scale: { min: 0.12, max: 0.24 },
      alpha: FADE_IN_OUT,
      tint: 0xfff3b0,
      blendMode: ADD,
    },
  ],
  // Lantern Pines: slow fog banks and fireflies.
  [
    {
      texture: 'puff',
      depth: 44,
      frequency: 420,
      lifespan: 8000,
      speedX: { min: 12, max: 34 },
      speedY: { min: -6, max: 6 },
      scale: { min: 4, max: 7.5 },
      alpha: { values: [0, 0.1, 0.1, 0] },
      tint: 0xcfd8e8,
    },
    {
      texture: 'glow',
      depth: 45,
      frequency: 300,
      lifespan: 3800,
      speed: { min: 10, max: 40 },
      scale: { min: 0.14, max: 0.26 },
      alpha: { values: [0, 1, 0.2, 1, 0] },
      tint: 0xd8ff8a,
      blendMode: ADD,
    },
  ],
  // Sunscar Desert: sand blowing along the ground, and the odd glint of sun on it.
  [
    {
      texture: 'puff',
      depth: 44,
      frequency: 260,
      lifespan: 5200,
      speedX: { min: 70, max: 140 },
      speedY: { min: -8, max: 14 },
      scale: { min: 1.2, max: 2.8 },
      alpha: { values: [0, 0.16, 0.16, 0] },
      tint: 0xead6a6,
    },
    {
      texture: 'glow',
      depth: 45,
      frequency: 650,
      lifespan: 1600,
      speed: { min: 0, max: 8 },
      scale: { min: 0.08, max: 0.16 },
      alpha: { values: [0, 0.9, 0] },
      tint: 0xfff3c0,
      blendMode: ADD,
    },
  ],
];

/** Ambient particles spawning anywhere in (and a little around) the camera's view, in world space. */
export class Ambience {
  private zone = new Phaser.Geom.Rectangle(0, 0, 1, 1);
  private emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor(private scene: Phaser.Scene, mapIndex: number) {
    for (const { texture, depth, ...config } of LAYERS[mapIndex] ?? []) {
      const emitter = scene.add.particles(0, 0, texture, {
        ...config,
        emitZone: { type: 'random', source: this.zone as Phaser.Types.GameObjects.Particles.RandomZoneSource },
      });
      emitter.setDepth(depth);
      this.emitters.push(emitter);
    }
    this.update();
    // Fill the screen straight away instead of waiting for the first particles to drift in.
    for (const e of this.emitters) e.fastForward(4000);
  }

  update(): void {
    const v = this.scene.cameras.main.worldView;
    this.zone.setTo(v.x - 120, v.y - 120, v.width + 240, v.height + 240);
  }
}
