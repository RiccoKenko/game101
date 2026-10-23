/**
 * Game clock with "juice": hit-stop (a brief freeze on big hits) and slow motion (ultimates, kills).
 * Real time keeps flowing for UI and camera; gameplay and animation use `step()`'s scaled dt.
 */
export class GameTime {
  private freeze = 0;
  private slowLeft = 0;
  private slowTotal = 0;
  private slowScale = 1;
  /** Scale applied this frame (0 during a hit-stop). */
  scale = 1;

  hitStop(ms: number): void {
    this.freeze = Math.max(this.freeze, ms / 1000);
  }

  /** Runs at `scale` for `seconds` of real time, easing back to normal over the last third. */
  slowMo(scale: number, seconds: number): void {
    this.slowScale = scale;
    this.slowLeft = this.slowTotal = seconds;
  }

  step(realDt: number): number {
    if (this.freeze > 0) {
      this.freeze -= realDt;
      this.scale = 0;
      return 0;
    }
    if (this.slowLeft > 0) {
      this.slowLeft -= realDt;
      const tail = Math.min(1, this.slowLeft / (this.slowTotal / 3));
      this.scale = 1 + (this.slowScale - 1) * Math.max(0, tail);
    } else this.scale = 1;
    return realDt * this.scale;
  }
}
