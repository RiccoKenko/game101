/** Tiny Web Audio sound player. Sounds start after the first tap (browsers block audio before that). */
export const SFX = ['shoot', 'hit', 'enemy_die', 'coin', 'explosion', 'click', 'zap', 'levelup', 'xp'] as const;
export type SfxName = (typeof SFX)[number];

declare global {
  interface Window {
    /** Single-file builds inline sounds here (base64 mp3). */
    __SOUNDS__?: Record<string, string>;
  }
}

class Sfx {
  private ctx?: AudioContext;
  private buffers = new Map<SfxName, AudioBuffer>();
  private last = new Map<SfxName, number>();
  enabled = true;

  /** Call from a user gesture. */
  async unlock(): Promise<void> {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') await this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    await Promise.all(
      SFX.map(async (name) => {
        try {
          const inline = window.__SOUNDS__?.[name];
          const data = inline ? decodeBase64(inline) : await (await fetch(`${import.meta.env.BASE_URL}audio/${name}.mp3`)).arrayBuffer();
          this.buffers.set(name, await this.ctx!.decodeAudioData(data));
        } catch {
          // A missing sound just stays silent.
        }
      }),
    );
  }

  play(name: SfxName, volume = 0.5, pitchJitter = 0.08): void {
    if (!this.enabled || !this.ctx) return;
    const buf = this.buffers.get(name);
    if (!buf) return;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(name) ?? -1) < 0.04) return;
    this.last.set(name, now);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.playbackRate.value = 1 + (Math.random() * 2 - 1) * pitchJitter;
    const gain = this.ctx.createGain();
    gain.gain.value = volume;
    src.connect(gain).connect(this.ctx.destination);
    src.start();
  }
}

function decodeBase64(b64: string): ArrayBuffer {
  const bin = atob(b64);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out.buffer;
}

export const sfx = new Sfx();
