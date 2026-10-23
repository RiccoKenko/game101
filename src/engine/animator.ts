import * as THREE from 'three';

export interface PlayOptions {
  /** Cross-fade seconds from the current clip. */
  fade?: number;
  speed?: number;
  /** Play once and hold the last frame (death, cheer...). */
  once?: boolean;
}

/** Thin wrapper over AnimationMixer: one looping "base" clip plus cross-faded one-shots. */
export class Animator {
  readonly mixer: THREE.AnimationMixer;
  private clips = new Map<string, THREE.AnimationClip>();
  private current?: THREE.AnimationAction;
  private currentName = '';
  private returnTo?: { name: string; options: PlayOptions };

  constructor(root: THREE.Object3D, clips: THREE.AnimationClip[]) {
    this.mixer = new THREE.AnimationMixer(root);
    for (const c of clips) this.clips.set(c.name, c);
    this.mixer.addEventListener('finished', (e) => {
      if (e.action !== this.current || !this.returnTo) return;
      const next = this.returnTo;
      this.returnTo = undefined;
      this.play(next.name, next.options);
    });
  }

  get playing(): string {
    return this.currentName;
  }

  /** The action currently in front (for reading its time, e.g. to sync an arrow release). */
  get action(): THREE.AnimationAction | undefined {
    return this.current;
  }

  duration(name: string): number {
    return this.clips.get(name)?.duration ?? 0;
  }

  play(name: string, options: PlayOptions = {}): THREE.AnimationAction | undefined {
    const clip = this.clips.get(name);
    if (!clip) return undefined;
    const { fade = 0.2, speed = 1, once = false } = options;
    const action = this.mixer.clipAction(clip);
    action.timeScale = speed;
    if (name === this.currentName && !once) return action;
    action.reset();
    action.setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity);
    action.clampWhenFinished = once;
    action.enabled = true;
    action.setEffectiveWeight(1);
    if (this.current && this.current !== action) action.crossFadeFrom(this.current, fade, true);
    action.play();
    this.current = action;
    this.currentName = name;
    this.returnTo = undefined;
    return action;
  }

  /** Plays `name` once, then cross-fades back to `then` (looping). */
  oneShot(name: string, then: string, options: PlayOptions = {}): void {
    if (!this.play(name, { ...options, once: true })) return;
    this.returnTo = { name: then, options: { fade: options.fade } };
  }

  update(dt: number): void {
    this.mixer.update(dt);
  }
}
