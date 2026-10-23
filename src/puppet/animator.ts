/** Plays 2D clips on a puppet: one clip in front, cross-faded from the last, with one-shots that return to a loop. */
import { blend, type Clip2D, type Pose2D } from './pose';

export interface PlayOptions {
  /** Cross-fade seconds from the current clip. */
  fade?: number;
  speed?: number;
  /** Play once and hold the last frame (KO, cheer...). */
  once?: boolean;
}

interface Track {
  clip: Clip2D;
  time: number;
  speed: number;
  once: boolean;
}

export class Animator2D {
  private clips = new Map<string, Clip2D>();
  private current?: Track;
  private previous?: Track;
  private fade = 0;
  private fadeLeft = 0;
  private returnTo?: { name: string; options: PlayOptions };
  /** Called with each clip event (e.g. "release") as playback passes it. */
  onEvent?: (name: string, clip: string) => void;

  constructor(clips: Clip2D[]) {
    for (const c of clips) this.clips.set(c.name, c);
  }

  get playing(): string {
    return this.current?.clip.name ?? '';
  }

  /** Seconds into the current clip. */
  get time(): number {
    return this.current?.time ?? 0;
  }

  duration(name: string): number {
    return this.clips.get(name)?.duration ?? 0;
  }

  has(name: string): boolean {
    return this.clips.has(name);
  }

  play(name: string, options: PlayOptions = {}): boolean {
    const clip = this.clips.get(name);
    if (!clip) return false;
    const { fade = 0.2, speed = 1, once = false } = options;
    if (this.current?.clip.name === name && !once) {
      this.current.speed = speed;
      return true;
    }
    this.previous = this.current;
    this.current = { clip, time: 0, speed, once };
    this.fade = this.fadeLeft = this.previous ? fade : 0;
    this.returnTo = undefined;
    return true;
  }

  /** Plays `name` once, then cross-fades back to `then` (looping). */
  oneShot(name: string, then: string, options: PlayOptions = {}): void {
    if (!this.play(name, { ...options, once: true })) return;
    this.returnTo = { name: then, options: { fade: options.fade } };
  }

  update(dt: number): Pose2D {
    const cur = this.current;
    if (!cur) return {};
    const before = cur.time;
    cur.time += dt * cur.speed;
    for (const [t, name] of cur.clip.events ?? []) if (before < t && cur.time >= t) this.onEvent?.(name, cur.clip.name);
    if (cur.clip.loop && !cur.once) cur.time %= cur.clip.duration;
    else if (cur.time >= cur.clip.duration) {
      cur.time = cur.clip.duration;
      if (this.returnTo) {
        const next = this.returnTo;
        this.returnTo = undefined;
        this.play(next.name, next.options);
        return this.update(0);
      }
    }
    if (this.previous) {
      this.previous.time += dt * this.previous.speed;
      if (this.previous.clip.loop) this.previous.time %= this.previous.clip.duration;
      else this.previous.time = Math.min(this.previous.time, this.previous.clip.duration);
    }
    this.fadeLeft = Math.max(0, this.fadeLeft - dt);
    const pose = cur.clip.pose(cur.time);
    if (!this.previous || this.fadeLeft <= 0) {
      this.previous = undefined;
      return pose;
    }
    const k = 1 - this.fadeLeft / this.fade;
    return blend(this.previous.clip.pose(this.previous.time), pose, k * k * (3 - 2 * k));
  }
}
