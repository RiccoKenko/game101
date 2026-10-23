/**
 * The Sky Crystals. They sit in the vault until a pirate carries one off (a boss can carry several). A carrier
 * that is shot down drops what it carries on the road, where it floats back to the vault (another pirate can
 * grab it on the way). A crystal carried all the way to the dock is lost; losing them all loses the level.
 */

export type CrystalState = 'vault' | 'carried' | 'dropped' | 'lost';

export interface Crystal {
  id: number;
  state: CrystalState;
  /** The enemy carrying it. */
  carrier: number | null;
  /** Distance along the road while dropped. */
  d: number;
}

export class Vault {
  readonly crystals: Crystal[];

  /** `floatSpeed`: how fast a dropped crystal drifts back along the road. */
  constructor(readonly total: number, readonly floatSpeed = 60) {
    this.crystals = Array.from({ length: total }, (_, id) => ({ id, state: 'vault' as CrystalState, carrier: null, d: 0 }));
  }

  private count(state: CrystalState): number {
    return this.crystals.filter((c) => c.state === state).length;
  }

  get stored(): number {
    return this.count('vault');
  }

  get lost(): number {
    return this.count('lost');
  }

  /** Crystals not yet lost (in the vault, carried or dropped). */
  get remaining(): number {
    return this.total - this.lost;
  }

  dropped(): Crystal[] {
    return this.crystals.filter((c) => c.state === 'dropped');
  }

  carriedBy(carrier: number): Crystal[] {
    return this.crystals.filter((c) => c.state === 'carried' && c.carrier === carrier);
  }

  /** A pirate at the vault takes a crystal. Null if the vault is empty. */
  take(carrier: number): Crystal | null {
    const c = this.crystals.find((x) => x.state === 'vault');
    return c ? this.pickUp(c, carrier) : null;
  }

  /** A pirate grabs a dropped crystal. */
  pickUp(c: Crystal, carrier: number): Crystal {
    c.state = 'carried';
    c.carrier = carrier;
    return c;
  }

  /** The carrier fell at distance `d` along the road: everything it carried drops there. */
  drop(carrier: number, d: number): Crystal[] {
    const out = this.carriedBy(carrier);
    for (const c of out) {
      c.state = 'dropped';
      c.carrier = null;
      c.d = d;
    }
    return out;
  }

  /** The carrier reached the dock: everything it carried is lost. */
  escape(carrier: number): Crystal[] {
    const out = this.carriedBy(carrier);
    for (const c of out) {
      c.state = 'lost';
      c.carrier = null;
    }
    return out;
  }

  /** Drifts dropped crystals toward the vault (at `roadLength`). Returns the ones that got home. */
  update(dt: number, roadLength: number): Crystal[] {
    const home: Crystal[] = [];
    for (const c of this.dropped()) {
      c.d = Math.min(roadLength, c.d + this.floatSpeed * dt);
      if (c.d >= roadLength) {
        c.state = 'vault';
        home.push(c);
      }
    }
    return home;
  }
}

/** Stars for a won level, from the crystals still on the island. */
export function stars(remaining: number, total: number): 1 | 2 | 3 {
  const share = remaining / total;
  return share >= 0.9 ? 3 : share >= 0.5 ? 2 : 1;
}
