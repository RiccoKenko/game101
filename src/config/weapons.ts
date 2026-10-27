export type WeaponId =
  | 'bow' | 'daggers' | 'axes' | 'aura' | 'lightning' | 'bomb' | 'boomerang' | 'bolt' | 'frost' | 'slash' | 'flask'
  | 'beam' | 'twister' | 'traps' | 'ward'
  | 'shuriken' | 'quake' | 'firetrail' | 'turret' | 'spear' | 'wisps'
  | 'bash';
export type EvolutionId =
  | 'stormbow' | 'blades' | 'titanaxes' | 'sanctuary' | 'starfall' | 'blizzard'
  | 'thunder' | 'meteor' | 'twinmoon' | 'flameslash' | 'plague'
  | 'rainbow' | 'cyclone' | 'glacier' | 'aegis'
  | 'starstorm' | 'earthquake' | 'inferno' | 'ballista' | 'lance' | 'soulharvest'
  | 'aurablade';
/** Monster cards (runes in the code) change how every skill's hits behave (set on fire, freeze, chain...). */
export type RuneId = 'burn' | 'freeze' | 'chain' | 'ricochet' | 'blast' | 'leech' | 'split' | 'echo' | 'reaper' | 'homing' | 'giant' | 'nova';
export type PassiveId =
  | 'heart' | 'boots' | 'powergem' | 'hourglass' | 'quiver' | 'magnet' | 'tome' | 'clover' | 'shield' | 'spring' | 'charm'
  | 'cap' | 'mask' | 'thorns' | 'ring' | 'feather';

/** Absolute stats of a weapon at one level. Area is a multiplier on the weapon's base size. */
export interface WeaponStats {
  damage: number;
  /** Seconds between attacks (for Axes: rest time between spins). */
  cooldown: number;
  /** Projectiles / strikes / axes per attack. */
  amount: number;
  /** Extra enemies a projectile can pass through (0 = stops at first hit). */
  pierce: number;
  area: number;
  /** Projectile speed in px/s (Axes: radians per second). */
  speed: number;
  /** Seconds the attack lasts (Axes spin time, a puddle, a beam, a whirlwind, a trap). 0 = not used. */
  duration: number;
}

export interface WeaponDef {
  id: WeaponId;
  name: string;
  icon: string;
  description: string;
  /** levels[0] = Lv1 ... levels[4] = Lv5. */
  levels: WeaponStats[];
  /** Card text for reaching Lv2..Lv5 (index 0 = Lv2). */
  upgrades: string[];
  /** Evolves in a chest once at max level, while holding this passive or rune. */
  evolution?: { into: EvolutionId; requires: PassiveId | RuneId };
}

export interface EvolutionDef {
  id: EvolutionId;
  base: WeaponId;
  name: string;
  icon: string;
  description: string;
  stats: WeaponStats;
}

const s = (p: Partial<WeaponStats>, base: WeaponStats): WeaponStats => ({ ...base, ...p });

const bow1: WeaponStats = { damage: 10, cooldown: 0.85, amount: 1, pierce: 1, area: 1, speed: 950, duration: 0 };
const bow2 = s({ amount: 2 }, bow1);
const bow3 = s({ damage: 15 }, bow2);
const bow4 = s({ pierce: 3, cooldown: 0.7 }, bow3);
const bow5 = s({ amount: 3, damage: 20 }, bow4);

const dag1: WeaponStats = { damage: 8, cooldown: 1.0, amount: 1, pierce: 0, area: 1, speed: 1050, duration: 0 };
const dag2 = s({ amount: 2 }, dag1);
const dag3 = s({ damage: 12, cooldown: 0.85 }, dag2);
const dag4 = s({ amount: 3 }, dag3);
const dag5 = s({ damage: 16, pierce: 1 }, dag4);

const axe1: WeaponStats = { damage: 12, cooldown: 2.6, amount: 2, pierce: 0, area: 1, speed: 3.4, duration: 3 };
const axe2 = s({ amount: 3 }, axe1);
const axe3 = s({ damage: 18, area: 1.2 }, axe2);
const axe4 = s({ amount: 4, duration: 4 }, axe3);
const axe5 = s({ damage: 26, speed: 4.2 }, axe4);

const aura1: WeaponStats = { damage: 5, cooldown: 0.5, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0 };
const aura2 = s({ area: 1.2 }, aura1);
const aura3 = s({ damage: 8 }, aura2);
const aura4 = s({ area: 1.4, cooldown: 0.42 }, aura3);
const aura5 = s({ damage: 12, area: 1.6 }, aura4);

const lit1: WeaponStats = { damage: 20, cooldown: 2.2, amount: 2, pierce: 0, area: 1, speed: 0, duration: 0 };
const lit2 = s({ amount: 3 }, lit1);
const lit3 = s({ damage: 30 }, lit2);
const lit4 = s({ amount: 4, cooldown: 1.8 }, lit3);
const lit5 = s({ damage: 42, amount: 5 }, lit4);

const bomb1: WeaponStats = { damage: 26, cooldown: 2.6, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0 };
const bomb2 = s({ area: 1.2 }, bomb1);
const bomb3 = s({ amount: 2 }, bomb2);
const bomb4 = s({ damage: 38, cooldown: 2.2 }, bomb3);
const bomb5 = s({ amount: 3, area: 1.4 }, bomb4);

const boo1: WeaponStats = { damage: 14, cooldown: 1.8, amount: 1, pierce: 999, area: 1, speed: 900, duration: 0 };
const boo2 = s({ damage: 18 }, boo1);
const boo3 = s({ amount: 2 }, boo2);
const boo4 = s({ area: 1.25, speed: 1050 }, boo3);
const boo5 = s({ damage: 26, amount: 3 }, boo4);

const bolt1: WeaponStats = { damage: 9, cooldown: 0.8, amount: 1, pierce: 0, area: 1, speed: 620, duration: 0 };
const bolt2 = s({ amount: 2 }, bolt1);
const bolt3 = s({ damage: 13 }, bolt2);
const bolt4 = s({ amount: 3, cooldown: 0.68 }, bolt3);
const bolt5 = s({ damage: 18, amount: 4 }, bolt4);

const frost1: WeaponStats = { damage: 7, cooldown: 1.4, amount: 3, pierce: 1, area: 1, speed: 800, duration: 0 };
const frost2 = s({ amount: 4 }, frost1);
const frost3 = s({ damage: 11 }, frost2);
const frost4 = s({ amount: 6, pierce: 2 }, frost3);
const frost5 = s({ damage: 15, cooldown: 1.1 }, frost4);

const slash1: WeaponStats = { damage: 16, cooldown: 1.3, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0 };
const slash2 = s({ damage: 22 }, slash1);
const slash3 = s({ amount: 2 }, slash2);
const slash4 = s({ area: 1.25, cooldown: 1.1 }, slash3);
const slash5 = s({ damage: 32 }, slash4);

const flask1: WeaponStats = { damage: 5, cooldown: 2.6, amount: 1, pierce: 0, area: 1, speed: 0, duration: 3 };
const flask2 = s({ area: 1.2 }, flask1);
const flask3 = s({ amount: 2 }, flask2);
const flask4 = s({ damage: 8, duration: 4 }, flask3);
const flask5 = s({ amount: 3, area: 1.4 }, flask4);

const beam1: WeaponStats = { damage: 15, cooldown: 1.7, amount: 1, pierce: 999, area: 1, speed: 0, duration: 0.35 };
const beam2 = s({ damage: 22 }, beam1);
const beam3 = s({ amount: 2 }, beam2);
const beam4 = s({ area: 1.3, cooldown: 1.45 }, beam3);
const beam5 = s({ amount: 3, damage: 30 }, beam4);

// Ankle Snare (the whirlwind's code): damage per tick (every TWISTER_TICK s), speed in px/s (0: it stays where it is
// set), duration = how long each one lasts.
const tw1: WeaponStats = { damage: 6, cooldown: 3.2, amount: 1, pierce: 0, area: 1, speed: 0, duration: 3.5 };
const tw2 = s({ damage: 9 }, tw1);
const tw3 = s({ amount: 2 }, tw2);
const tw4 = s({ area: 1.25, duration: 4.5 }, tw3);
const tw5 = s({ amount: 3, damage: 12 }, tw4);

// Spike Traps: amount = traps set per drop, duration = how long an untouched trap waits.
const trap1: WeaponStats = { damage: 30, cooldown: 1.6, amount: 1, pierce: 0, area: 1, speed: 0, duration: 14 };
const trap2 = s({ amount: 2 }, trap1);
const trap3 = s({ damage: 45 }, trap2);
const trap4 = s({ area: 1.3, cooldown: 1.3 }, trap3);
const trap5 = s({ amount: 3, damage: 60 }, trap4);

// Ward Orbs: always out, circling; speed in radians per second.
const ward1: WeaponStats = { damage: 10, cooldown: 0, amount: 2, pierce: 0, area: 1, speed: 3, duration: 0 };
const ward2 = s({ amount: 3 }, ward1);
const ward3 = s({ damage: 15 }, ward2);
const ward4 = s({ amount: 4, speed: 3.6 }, ward3);
const ward5 = s({ damage: 22, area: 1.25 }, ward4);

// Shuriken: `pierce` is how many more enemies each star bounces on to.
const shu1: WeaponStats = { damage: 9, cooldown: 1.2, amount: 1, pierce: 2, area: 1, speed: 900, duration: 0 };
const shu2 = s({ amount: 2 }, shu1);
const shu3 = s({ damage: 13, pierce: 3 }, shu2);
const shu4 = s({ amount: 3, cooldown: 1 }, shu3);
const shu5 = s({ damage: 18, pierce: 5 }, shu4);

// Shockwave: `amount` waves one after another.
const qk1: WeaponStats = { damage: 18, cooldown: 2.4, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0 };
const qk2 = s({ damage: 26 }, qk1);
const qk3 = s({ area: 1.2 }, qk2);
const qk4 = s({ amount: 2, cooldown: 2 }, qk3);
const qk5 = s({ damage: 36, area: 1.35 }, qk4);

// Flame Trail: a patch of fire every `cooldown` seconds while walking, burning for `duration`; damage per tick.
const ft1: WeaponStats = { damage: 6, cooldown: 0.3, amount: 1, pierce: 0, area: 1, speed: 0, duration: 2 };
const ft2 = s({ damage: 9 }, ft1);
const ft3 = s({ duration: 3 }, ft2);
const ft4 = s({ area: 1.3 }, ft3);
const ft5 = s({ damage: 13, duration: 4 }, ft4);

// Sentry Turret: `amount` turrets set down every `cooldown`, each lasting `duration`; damage per bolt.
const tur1: WeaponStats = { damage: 10, cooldown: 8, amount: 1, pierce: 0, area: 1, speed: 950, duration: 6 };
const tur2 = s({ damage: 14 }, tur1);
const tur3 = s({ amount: 2 }, tur2);
const tur4 = s({ duration: 8, cooldown: 7 }, tur3);
const tur5 = s({ damage: 20 }, tur4);

// Javelin: thrown the way the hero is walking.
const sp1: WeaponStats = { damage: 30, cooldown: 2, amount: 1, pierce: 999, area: 1, speed: 1200, duration: 0 };
const sp2 = s({ damage: 42 }, sp1);
const sp3 = s({ amount: 2 }, sp2);
const sp4 = s({ cooldown: 1.6, area: 1.25 }, sp3);
const sp5 = s({ damage: 60, amount: 3 }, sp4);

// Spirit Wisps: drift out, then dive at an enemy and burst; speed in px/s.
const wi1: WeaponStats = { damage: 16, cooldown: 2.2, amount: 2, pierce: 0, area: 1, speed: 380, duration: 0 };
const wi2 = s({ amount: 3 }, wi1);
const wi3 = s({ damage: 24 }, wi2);
const wi4 = s({ amount: 4, cooldown: 1.9 }, wi3);
const wi5 = s({ damage: 32, area: 1.3 }, wi4);

// Bash: strikes the `amount` nearest monsters in reach, hurting those around each one (`area`) and stunning
// them for `duration` seconds.
const bash1: WeaponStats = { damage: 36, cooldown: 1.6, amount: 1, pierce: 0, area: 1, speed: 0, duration: 0.6 };
const bash2 = s({ damage: 50 }, bash1);
const bash3 = s({ amount: 2 }, bash2);
const bash4 = s({ cooldown: 1.3, duration: 0.9 }, bash3);
const bash5 = s({ damage: 72, amount: 3 }, bash4);

export const WEAPONS: Record<WeaponId, WeaponDef> = {
  bow: {
    id: 'bow',
    name: 'Arrow Shot',
    icon: 'icon_bow',
    description: 'Shoots piercing arrows at the nearest monster.',
    levels: [bow1, bow2, bow3, bow4, bow5],
    upgrades: ['+1 arrow', 'Damage +5', 'Pierce +2, faster', '+1 arrow, damage +5'],
    evolution: { into: 'stormbow', requires: 'quiver' },
  },
  daggers: {
    id: 'daggers',
    name: 'Double Strafe',
    icon: 'icon_daggers',
    description: 'Fires quick arrows at several nearby monsters.',
    levels: [dag1, dag2, dag3, dag4, dag5],
    upgrades: ['+1 arrow', 'Damage +4, faster', '+1 arrow', 'Damage +4, pierce +1'],
    evolution: { into: 'blades', requires: 'hourglass' },
  },
  axes: {
    id: 'axes',
    name: 'Brandish',
    icon: 'icon_axes',
    description: 'Swords spin around you, cutting anything close.',
    levels: [axe1, axe2, axe3, axe4, axe5],
    upgrades: ['+1 sword', 'Damage +6, wider spin', '+1 sword, spins longer', 'Damage +8, spins faster'],
    evolution: { into: 'titanaxes', requires: 'thorns' },
  },
  aura: {
    id: 'aura',
    name: 'Provoke',
    icon: 'icon_aura',
    description: 'A ring of fighting spirit hurts every monster that comes close.',
    levels: [aura1, aura2, aura3, aura4, aura5],
    upgrades: ['Area +20%', 'Damage +3', 'Area +20%, faster ticks', 'Damage +4, area +20%'],
    evolution: { into: 'sanctuary', requires: 'heart' },
  },
  lightning: {
    id: 'lightning',
    name: 'Fire Bolt',
    icon: 'icon_lightning',
    description: 'Bolts of fire fall from the sky onto monsters on screen.',
    levels: [lit1, lit2, lit3, lit4, lit5],
    upgrades: ['+1 bolt', 'Damage +10', '+1 bolt, faster', 'Damage +12, +1 bolt'],
    evolution: { into: 'thunder', requires: 'chain' },
  },
  bomb: {
    id: 'bomb',
    name: 'Fire Ball',
    icon: 'icon_bomb',
    description: 'Hurls a fireball that bursts in a wide blast.',
    levels: [bomb1, bomb2, bomb3, bomb4, bomb5],
    upgrades: ['Area +20%', '+1 fireball', 'Damage +12, faster', '+1 fireball, area +20%'],
    evolution: { into: 'meteor', requires: 'blast' },
  },
  boomerang: {
    id: 'boomerang',
    name: 'Charge Arrow',
    icon: 'icon_boomerang',
    description: 'A heavy arrow that flies out and back, hitting everything twice.',
    levels: [boo1, boo2, boo3, boo4, boo5],
    upgrades: ['Damage +4', '+1 arrow', 'Bigger and faster', 'Damage +8, +1 arrow'],
    evolution: { into: 'twinmoon', requires: 'ricochet' },
  },
  bolt: {
    id: 'bolt',
    name: 'Soul Strike',
    icon: 'icon_bolt',
    description: 'Spirit bolts that chase down monsters.',
    levels: [bolt1, bolt2, bolt3, bolt4, bolt5],
    upgrades: ['+1 bolt', 'Damage +4', '+1 bolt, faster', 'Damage +5, +1 bolt'],
    evolution: { into: 'starfall', requires: 'tome' },
  },
  frost: {
    id: 'frost',
    name: 'Cold Bolt',
    icon: 'icon_frost',
    description: 'A fan of ice spears that slows what it hits.',
    levels: [frost1, frost2, frost3, frost4, frost5],
    upgrades: ['+1 spear', 'Damage +4', '+2 spears, pierce +1', 'Damage +4, faster'],
    evolution: { into: 'blizzard', requires: 'boots' },
  },
  slash: {
    id: 'slash',
    name: 'Slash',
    icon: 'icon_slash',
    description: 'A wide sword swing in front of you that knocks monsters back.',
    levels: [slash1, slash2, slash3, slash4, slash5],
    upgrades: ['Damage +6', 'Also swings behind you', 'Area +25%, faster', 'Damage +10'],
    evolution: { into: 'flameslash', requires: 'burn' },
  },
  flask: {
    id: 'flask',
    name: 'Arrow Shower',
    icon: 'icon_flask',
    description: 'Arrows rain on a spot, hurting every monster standing there.',
    levels: [flask1, flask2, flask3, flask4, flask5],
    upgrades: ['Area +20%', '+1 shower', 'Damage +3, lasts longer', '+1 shower, area +20%'],
    evolution: { into: 'plague', requires: 'leech' },
  },
  beam: {
    id: 'beam',
    name: 'Frost Diver',
    icon: 'icon_beam',
    description: 'A line of ice that cuts through every monster in its path.',
    levels: [beam1, beam2, beam3, beam4, beam5],
    upgrades: ['Damage +7', '+1 line', 'Wider lines, faster', '+1 line, damage +8'],
    evolution: { into: 'rainbow', requires: 'clover' },
  },
  twister: {
    id: 'twister',
    name: 'Ankle Snare',
    icon: 'icon_twister',
    description: 'Sets a snare that pulls monsters in and holds them while it hurts them.',
    levels: [tw1, tw2, tw3, tw4, tw5],
    upgrades: ['Damage +3', '+1 snare', 'Bigger, lasts longer', '+1 snare, damage +3'],
    evolution: { into: 'cyclone', requires: 'magnet' },
  },
  traps: {
    id: 'traps',
    name: 'Land Mine',
    icon: 'icon_traps',
    description: 'Plants mines around you that burst when a monster steps on one.',
    levels: [trap1, trap2, trap3, trap4, trap5],
    upgrades: ['+1 mine', 'Damage +15', 'Bigger bursts, faster', '+1 mine, damage +15'],
    evolution: { into: 'glacier', requires: 'freeze' },
  },
  ward: {
    id: 'ward',
    name: 'Auto Guard',
    icon: 'icon_ward',
    description: 'Shields circle close around you, hurting monsters and blocking their shots.',
    levels: [ward1, ward2, ward3, ward4, ward5],
    upgrades: ['+1 shield', 'Damage +5', '+1 shield, spins faster', 'Damage +7, bigger'],
    evolution: { into: 'aegis', requires: 'shield' },
  },
  shuriken: {
    id: 'shuriken',
    name: 'Lightning Bolt',
    icon: 'icon_shuriken',
    description: 'A bolt of lightning that jumps from monster to monster.',
    levels: [shu1, shu2, shu3, shu4, shu5],
    upgrades: ['+1 bolt', 'Damage +4, jumps once more', '+1 bolt, faster', 'Damage +5, jumps twice more'],
    evolution: { into: 'starstorm', requires: 'homing' },
  },
  quake: {
    id: 'quake',
    name: 'Magnum Break',
    icon: 'icon_quake',
    description: 'A burst of fire around you that hurts and pushes back everything close.',
    levels: [qk1, qk2, qk3, qk4, qk5],
    upgrades: ['Damage +8', 'Wider bursts', 'A second burst, more often', 'Damage +10, wider'],
    evolution: { into: 'earthquake', requires: 'powergem' },
  },
  firetrail: {
    id: 'firetrail',
    name: 'Fire Wall',
    icon: 'icon_firetrail',
    description: 'Walls of fire rise behind you as you walk.',
    levels: [ft1, ft2, ft3, ft4, ft5],
    upgrades: ['Damage +3', 'Flames last longer', 'Bigger flames', 'Damage +4, last even longer'],
    evolution: { into: 'inferno', requires: 'charm' },
  },
  turret: {
    id: 'turret',
    name: 'Sentry Turret',
    icon: 'icon_turret',
    description: 'Sets down a crossbow turret that shoots at monsters for a while.',
    levels: [tur1, tur2, tur3, tur4, tur5],
    upgrades: ['Damage +4', '+1 turret', 'Turrets last longer, come sooner', 'Damage +6'],
    evolution: { into: 'ballista', requires: 'echo' },
  },
  spear: {
    id: 'spear',
    name: 'Pierce',
    icon: 'icon_spear',
    description: 'A piercing thrust the way you walk; it goes through everything.',
    levels: [sp1, sp2, sp3, sp4, sp5],
    upgrades: ['Damage +12', '+1 thrust', 'Bigger, more often', 'Damage +18, +1 thrust'],
    evolution: { into: 'lance', requires: 'reaper' },
  },
  wisps: {
    id: 'wisps',
    name: 'Blitz Beat',
    icon: 'icon_wisps',
    description: 'Your falcon swoops out, dives at monsters and strikes.',
    levels: [wi1, wi2, wi3, wi4, wi5],
    upgrades: ['+1 dive', 'Damage +8', '+1 dive, more often', 'Damage +8, bigger strikes'],
    evolution: { into: 'soulharvest', requires: 'spring' },
  },
  bash: {
    id: 'bash',
    name: 'Bash',
    icon: 'icon_might',
    description: 'A heavy blow on the nearest monster that stuns it and those around it.',
    levels: [bash1, bash2, bash3, bash4, bash5],
    upgrades: ['Damage +14', 'Strikes 2 monsters', 'Faster, stuns longer', 'Damage +22, strikes 3'],
    evolution: { into: 'aurablade', requires: 'mask' },
  },
};

export const EVOLUTIONS: Record<EvolutionId, EvolutionDef> = {
  stormbow: {
    id: 'stormbow',
    base: 'bow',
    name: 'Sharp Shooting',
    icon: 'icon_stormbow',
    description: 'Rapid volleys of sharp arrows that pierce everything.',
    stats: { damage: 24, cooldown: 0.32, amount: 3, pierce: 999, area: 1.3, speed: 1150, duration: 0 },
  },
  blades: {
    id: 'blades',
    base: 'daggers',
    name: 'Arrow Vulcan',
    icon: 'icon_blades',
    description: 'An endless stream of golden arrows.',
    stats: { damage: 16, cooldown: 0.1, amount: 1, pierce: 3, area: 1.1, speed: 1300, duration: 0 },
  },
  titanaxes: {
    id: 'titanaxes',
    base: 'axes',
    name: 'Clashing Spiral',
    icon: 'icon_titanaxes',
    description: 'Huge swords spin forever and knock monsters away.',
    stats: { damage: 34, cooldown: 0, amount: 5, pierce: 0, area: 1.45, speed: 4.4, duration: 0 },
  },
  sanctuary: {
    id: 'sanctuary',
    base: 'aura',
    name: 'Devotion',
    icon: 'icon_sanctuary',
    description: 'A great holy ring: slows monsters and restores your HP.',
    stats: { damage: 16, cooldown: 0.35, amount: 1, pierce: 0, area: 2.0, speed: 0, duration: 0 },
  },
  starfall: {
    id: 'starfall',
    base: 'bolt',
    name: 'Napalm Vulcan',
    icon: 'icon_starfall',
    description: 'Spirit flames rain down on every monster in sight.',
    stats: { damage: 26, cooldown: 0.45, amount: 3, pierce: 0, area: 1.2, speed: 0, duration: 0 },
  },
  blizzard: {
    id: 'blizzard',
    base: 'frost',
    name: 'Storm Gust',
    icon: 'icon_blizzard',
    description: 'A howling snowstorm around you freezes and grinds down monsters.',
    stats: { damage: 10, cooldown: 0.3, amount: 1, pierce: 0, area: 1.5, speed: 0, duration: 0 },
  },
  thunder: {
    id: 'thunder',
    base: 'lightning',
    name: 'Fire Pillar',
    icon: 'icon_thunder',
    description: 'Pillars of fire strike many monsters, and the flames leap on to two more.',
    stats: { damage: 46, cooldown: 1.4, amount: 6, pierce: 0, area: 1.3, speed: 0, duration: 0 },
  },
  meteor: {
    id: 'meteor',
    base: 'bomb',
    name: 'Sightrasher',
    icon: 'icon_meteor',
    description: 'Fire bursts crash down in huge blasts that set monsters on fire.',
    stats: { damage: 70, cooldown: 2.0, amount: 3, pierce: 0, area: 1.6, speed: 0, duration: 0 },
  },
  twinmoon: {
    id: 'twinmoon',
    base: 'boomerang',
    name: 'Phantasmic Arrow',
    icon: 'icon_twinmoon',
    description: 'Huge spectral arrows that fly out in pairs and cut through everything.',
    stats: { damage: 34, cooldown: 1.2, amount: 4, pierce: 999, area: 1.5, speed: 1150, duration: 0 },
  },
  flameslash: {
    id: 'flameslash',
    base: 'slash',
    name: 'Bowling Bash',
    icon: 'icon_flameslash',
    description: 'Blazing swings on both sides that set monsters on fire.',
    stats: { damage: 44, cooldown: 0.9, amount: 2, pierce: 0, area: 1.5, speed: 0, duration: 0 },
  },
  plague: {
    id: 'plague',
    base: 'flask',
    name: 'Arrow Rain',
    icon: 'icon_plague',
    description: 'Big, lasting arrow storms that slow and shred monsters.',
    stats: { damage: 12, cooldown: 1.8, amount: 3, pierce: 0, area: 1.6, speed: 0, duration: 6 },
  },
  rainbow: {
    id: 'rainbow',
    base: 'beam',
    name: 'Frost Nova',
    icon: 'icon_rainbow',
    description: 'Four lines of ice spin around you without end.',
    // Damage each time a spinning beam sweeps over an enemy; speed in radians per second.
    stats: { damage: 22, cooldown: 0, amount: 4, pierce: 999, area: 1.25, speed: 2.2, duration: 0 },
  },
  cyclone: {
    id: 'cyclone',
    base: 'twister',
    name: 'Shockwave Trap',
    icon: 'icon_cyclone',
    description: 'Two great snares circle you, dragging in every monster near them.',
    stats: { damage: 14, cooldown: 0, amount: 2, pierce: 0, area: 1.6, speed: 1.6, duration: 0 },
  },
  glacier: {
    id: 'glacier',
    base: 'traps',
    name: 'Freezing Trap',
    icon: 'icon_glacier',
    description: 'Big frost mines that freeze everything in the burst solid.',
    stats: { damage: 80, cooldown: 1.1, amount: 3, pierce: 0, area: 1.5, speed: 0, duration: 16 },
  },
  aegis: {
    id: 'aegis',
    base: 'ward',
    name: 'Shield Reflect',
    icon: 'icon_aegis',
    description: 'Six holy shields that turn monster shots back on them.',
    stats: { damage: 30, cooldown: 0, amount: 6, pierce: 0, area: 1.4, speed: 3.8, duration: 0 },
  },
  starstorm: {
    id: 'starstorm',
    base: 'shuriken',
    name: 'Lord of Vermilion',
    icon: 'icon_starstorm',
    description: 'Great lightning that hunts down monsters and jumps eight times.',
    stats: { damage: 22, cooldown: 0.7, amount: 4, pierce: 8, area: 1.3, speed: 1100, duration: 0 },
  },
  earthquake: {
    id: 'earthquake',
    base: 'quake',
    name: 'Grand Cross',
    icon: 'icon_earthquake',
    description: 'Three great bursts of holy light that stun everything they hit.',
    stats: { damage: 50, cooldown: 1.8, amount: 3, pierce: 0, area: 1.6, speed: 0, duration: 0 },
  },
  inferno: {
    id: 'inferno',
    base: 'firetrail',
    name: 'Volcano',
    icon: 'icon_inferno',
    description: 'A blazing road of fire that sets monsters alight.',
    stats: { damage: 18, cooldown: 0.2, amount: 1, pierce: 0, area: 1.6, speed: 0, duration: 5 },
  },
  ballista: {
    id: 'ballista',
    base: 'turret',
    name: 'Golden Ballista',
    icon: 'icon_ballista',
    description: 'Golden turrets that fire twin piercing bolts and last longer.',
    stats: { damage: 30, cooldown: 6, amount: 3, pierce: 2, area: 1.2, speed: 1100, duration: 10 },
  },
  lance: {
    id: 'lance',
    base: 'spear',
    name: 'Spiral Pierce',
    icon: 'icon_lance',
    description: 'Spiralling thrusts that blast through everything and finish off the wounded.',
    stats: { damage: 90, cooldown: 1.2, amount: 3, pierce: 999, area: 1.5, speed: 1400, duration: 0 },
  },
  soulharvest: {
    id: 'soulharvest',
    base: 'wisps',
    name: 'Falcon Assault',
    icon: 'icon_soulharvest',
    description: 'A flight of falcon strikes; every strike heals you a little.',
    stats: { damage: 40, cooldown: 1.5, amount: 6, pierce: 0, area: 1.5, speed: 450, duration: 0 },
  },
  aurablade: {
    id: 'aurablade',
    base: 'bash',
    name: 'Aura Blade',
    icon: 'icon_titanaxes',
    description: 'A blazing sword strikes the three nearest monsters, stunning them and everything around them.',
    stats: { damage: 120, cooldown: 0.9, amount: 3, pierce: 0, area: 1.4, speed: 0, duration: 1.2 },
  },
};

export interface RuneDef {
  id: RuneId;
  name: string;
  icon: string;
  maxLevel: number;
  /** Card text for each level (index 0 = Lv1). */
  levels: string[];
}

/** Rune strength per level (index 0 = Lv1). */
export const RUNE_POWER = {
  /** Burn per second, as a share of the hit that lit it, for BURN_TIME seconds. */
  burn: [0.2, 0.3, 0.4],
  /** Chance a hit freezes for FREEZE_TIME seconds. */
  freeze: [0.08, 0.13, 0.18],
  /** Chance a hit arcs on, and to how many enemies (at half damage). */
  chain: [0.15, 0.22, 0.3],
  chainTargets: [2, 2, 3],
  /** Extra enemies each projectile bounces on to. */
  ricochet: [1, 2, 3],
  /** A killed enemy blows up for this share of its max HP. */
  blast: [0.3, 0.4, 0.5],
  /** HP healed per kill. */
  leech: [0.3, 0.5, 0.8],
  /** Splinters a projectile bursts into on its first hit, and their share of its damage. */
  split: [2, 2, 3],
  splitDamage: [0.35, 0.5, 0.5],
  /** Chance a weapon's attack goes off a second time a moment later. */
  echo: [0.15, 0.25, 0.35],
  /** Monsters (not bosses) hit while under this share of their HP are finished off. */
  reaper: [0.08, 0.12, 0.16],
  /** How fast projectiles turn toward enemies (radians per second). */
  homing: [2.5, 4, 6],
  /** Every n-th attack of a weapon is giant: double damage, half again as big. */
  giant: [5, 4, 3],
  /** A critical hit bursts, dealing this share of it to monsters nearby. */
  nova: [0.3, 0.45, 0.6],
};
/** Seconds after an attack that its echo goes off. */
export const ECHO_DELAY = 0.22;
export const BURN_TIME = 3;
export const FREEZE_TIME = 1.2;

export const RUNES: Record<RuneId, RuneDef> = {
  burn: { id: 'burn', name: 'Dust Imp Card', icon: 'icon_rune_burn', maxLevel: 3, levels: ['Hits set enemies on fire', 'Fire burns hotter', 'Fire burns hottest'] },
  freeze: { id: 'freeze', name: 'Talisman Ghoul Card', icon: 'icon_rune_freeze', maxLevel: 3, levels: ['Hits may freeze enemies solid (8%)', 'Freeze chance 13%', 'Freeze chance 18%'] },
  chain: { id: 'chain', name: 'Foxfire Kit Card', icon: 'icon_rune_chain', maxLevel: 3, levels: ['Hits may arc lightning to 2 more enemies', 'Arcs more often', 'Arcs to 3 enemies, even more often'] },
  ricochet: { id: 'ricochet', name: 'Fluffbun Card', icon: 'icon_rune_ricochet', maxLevel: 3, levels: ['Projectiles bounce on to 1 more enemy', 'Bounce 2 times', 'Bounce 3 times'] },
  blast: { id: 'blast', name: 'Bomb Acorn Card', icon: 'icon_rune_blast', maxLevel: 3, levels: ['Defeated enemies explode', 'Bigger explosions', 'Biggest explosions'] },
  leech: { id: 'leech', name: 'Gummy Card', icon: 'icon_rune_leech', maxLevel: 3, levels: ['Heal a little for every defeat', 'Heal more per defeat', 'Heal the most per defeat'] },
  split: { id: 'split', name: 'Fuzzpuff Card', icon: 'icon_rune_split', maxLevel: 3, levels: ['Projectiles burst into 2 splinters on their first hit', 'Splinters hit harder', 'Burst into 3 splinters'] },
  echo: { id: 'echo', name: 'Lantern Ghost Card', icon: 'icon_rune_echo', maxLevel: 3, levels: ['Attacks may go off twice (15%)', 'Twice 25% of the time', 'Twice 35% of the time'] },
  reaper: { id: 'reaper', name: 'Stingtail Card', icon: 'icon_rune_reaper', maxLevel: 3, levels: ['Hits finish off monsters under 8% HP', 'Under 12% HP', 'Under 16% HP'] },
  homing: { id: 'homing', name: 'Buzzer Card', icon: 'icon_rune_homing', maxLevel: 3, levels: ['Arrows, bolts and spears curve toward monsters', 'They turn faster', 'They turn fastest'] },
  giant: { id: 'giant', name: 'Capshroom Card', icon: 'icon_rune_giant', maxLevel: 3, levels: ['Every 5th attack is giant: double damage, bigger', 'Every 4th attack', 'Every 3rd attack'] },
  nova: { id: 'nova', name: 'Gold Scarab Card', icon: 'icon_rune_nova', maxLevel: 3, levels: ['Critical hits burst, hurting monsters nearby (30%)', 'Bursts deal 45%', 'Bursts deal 60%'] },
};
export const RUNE_IDS = Object.keys(RUNES) as RuneId[];

/** The passive or rune a weapon needs to evolve, by name. */
export function requirementName(id: PassiveId | RuneId): string {
  return id in RUNES ? RUNES[id as RuneId].name : PASSIVES[id as PassiveId].name;
}

export interface PassiveDef {
  id: PassiveId;
  name: string;
  icon: string;
  description: string;
  maxLevel: number;
  /** Effect per level, e.g. 0.2 = +20%. */
  perLevel: number;
}

export const PASSIVES: Record<PassiveId, PassiveDef> = {
  heart: { id: 'heart', name: 'VIT', icon: 'icon_heart', description: 'Max HP +20%', maxLevel: 5, perLevel: 0.2 },
  boots: { id: 'boots', name: 'Wind Shoes', icon: 'icon_boots', description: 'Move speed +10%', maxLevel: 5, perLevel: 0.1 },
  powergem: { id: 'powergem', name: 'STR', icon: 'icon_powergem', description: 'Damage +10%', maxLevel: 5, perLevel: 0.1 },
  hourglass: { id: 'hourglass', name: 'AGI', icon: 'icon_hourglass', description: 'Attack cooldown -8%', maxLevel: 5, perLevel: 0.08 },
  quiver: { id: 'quiver', name: 'DEX', icon: 'icon_quiver', description: '+1 projectile for all skills', maxLevel: 2, perLevel: 1 },
  magnet: { id: 'magnet', name: 'Lodestone', icon: 'icon_magnet', description: 'Pickup range +30%', maxLevel: 5, perLevel: 0.3 },
  tome: { id: 'tome', name: 'INT', icon: 'icon_tome', description: 'Attack area +10%: bigger projectiles, blasts, slashes, puddles and auras', maxLevel: 5, perLevel: 0.1 },
  clover: { id: 'clover', name: 'LUK', icon: 'icon_clover', description: 'Critical hit chance +5%', maxLevel: 5, perLevel: 0.05 },
  shield: { id: 'shield', name: 'Buckler', icon: 'icon_shield', description: 'Take 1 less damage from every hit', maxLevel: 3, perLevel: 1 },
  spring: { id: 'spring', name: 'Healing Herb', icon: 'icon_spring', description: 'Recover 0.3% of your max HP every second', maxLevel: 5, perLevel: 0.003 },
  charm: { id: 'charm', name: 'Moon Pendant', icon: 'icon_charm', description: 'Effects last 15% longer: puddles, axes, whirlwinds, traps, flames, burns, freezes', maxLevel: 5, perLevel: 0.15 },
  cap: { id: 'cap', name: "Scholar's Glasses", icon: 'icon_cap', description: 'XP gained +10%', maxLevel: 5, perLevel: 0.1 },
  mask: { id: 'mask', name: 'Berserk Potion', icon: 'icon_mask', description: 'Damage +15% while under half HP', maxLevel: 3, perLevel: 0.15 },
  thorns: { id: 'thorns', name: 'Spiked Mail', icon: 'icon_thorns', description: 'Monsters that touch you take 40 damage and are pushed away', maxLevel: 3, perLevel: 40 },
  ring: { id: 'ring', name: 'Slayer Ring', icon: 'icon_ring', description: 'Damage +12% against elites, leaders and bosses', maxLevel: 5, perLevel: 0.12 },
  feather: { id: 'feather', name: 'Yggdrasil Leaf', icon: 'icon_feather', description: 'Rise again once with half your HP', maxLevel: 1, perLevel: 1 },
};

export const WEAPON_IDS = Object.keys(WEAPONS) as WeaponId[];
export const PASSIVE_IDS = Object.keys(PASSIVES) as PassiveId[];
export const MAX_WEAPON_LEVEL = 5;

/** Weapons whose attack count is boosted by the Quiver passive. */
export const AMOUNT_BOOSTED: ReadonlySet<WeaponId> = new Set<WeaponId>([
  'bow', 'daggers', 'axes', 'lightning', 'bomb', 'boomerang', 'bolt', 'frost', 'flask', 'beam', 'twister', 'traps', 'ward',
  'shuriken', 'turret', 'spear', 'wisps', 'bash',
]);
