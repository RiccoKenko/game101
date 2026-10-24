/**
 * Things that happen mid-run so no two runs play the same: a shrine offering blessings or pacts, a treasure
 * goblin to chase, a meteor shower, an elite pack, a golden hour.
 */
export type EventId = 'shrine' | 'goblin' | 'meteors' | 'elites' | 'golden';

export interface EventDef {
  id: EventId;
  weight: number;
  /** Not before this many seconds into the run. */
  from: number;
  toast: string;
}

export const EVENTS: EventDef[] = [
  { id: 'shrine', weight: 1.2, from: 60, toast: 'A shrine appears nearby!' },
  { id: 'goblin', weight: 1, from: 60, toast: 'A treasure goblin! Catch it!' },
  { id: 'meteors', weight: 0.8, from: 120, toast: 'Meteor shower! Watch the red circles!' },
  { id: 'elites', weight: 0.8, from: 150, toast: 'An elite pack! Defeat them all for a chest!' },
  { id: 'golden', weight: 0.9, from: 60, toast: 'Golden hour! Coins x2!' },
];

/** The first event comes this long into a run; then one every EVENT_GAP seconds (a random value in the range). */
export const EVENT_FIRST = 70;
export const EVENT_GAP: [number, number] = [65, 95];
/** No new events this close to a boss or leader arriving, or after this time (the final boss is near). */
export const EVENT_QUIET = 20;
export const EVENT_LAST = 860;

export const METEOR_SHOWER = { seconds: 12, every: 0.45, radius: 105, telegraph: 0.9, damage: 16, monsterDamage: 60 };
export const GOLDEN_HOUR = { seconds: 20, coinChance: 3, coinValue: 2 };
export const GOBLIN_ESCAPE = 16;
export const SHRINE_LIFE = 30;

/** The run ends in victory when the boss that comes at FINAL_TIME (15:00) is defeated. */
export const FINAL_TIME = 900;

export type ShrineOfferId = 'might' | 'haste' | 'life' | 'greed' | 'trials' | 'blood';

export interface ShrineOffer {
  id: ShrineOfferId;
  /** Blessings are free; pacts cost something first. */
  pact: boolean;
  name: string;
  icon: string;
  text: string;
}

export const SHRINE_OFFERS: ShrineOffer[] = [
  { id: 'might', pact: false, name: 'Blessing of Might', icon: 'icon_might', text: 'Damage +15% for the rest of the run' },
  { id: 'haste', pact: false, name: 'Blessing of Haste', icon: 'icon_boots', text: 'Move speed +12% for the rest of the run' },
  { id: 'life', pact: false, name: 'Blessing of Life', icon: 'icon_heart', text: 'Heal fully and Max HP +10%' },
  { id: 'greed', pact: true, name: 'Pact of Greed', icon: 'icon_greed', text: 'Monsters +50% HP for 60 s, then a big bag of gold' },
  { id: 'trials', pact: true, name: 'Pact of Trials', icon: 'icon_crown', text: 'An elite pack attacks now; beat it for a chest' },
  { id: 'blood', pact: true, name: 'Pact of Blood', icon: 'icon_rune_leech', text: 'Lose 35% of your HP, gain two free upgrades' },
];

export const GREED_PACT = { seconds: 60, hp: 1.5, goldPerMap: 120 };
