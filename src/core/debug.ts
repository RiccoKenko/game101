/**
 * URL switches for testing, e.g. `/?debug&time=290&map=2&god`.
 * debug: show FPS. time: start the run at this many seconds. map: 1-3. bot: autopilot.
 * speed: simulation speed multiplier. god: can't die. gold: set gold. unlock: unlock all maps.
 * autostart: skip the menu. seed: RNG seed. level: start at this level (picks upgrades for you).
 * give: weapons to start with, e.g. `give=slash5,flask3,starfall` (an evolution gives its weapon, evolved).
 * hero: play as this character (archer, mage) without unlocking it.
 * event: start this run event two seconds in (shrine, goblin, meteors, elites, golden).
 */
const params = new URLSearchParams(typeof location === 'undefined' ? '' : location.search);
const num = (key: string, fallback: number) => {
  const v = Number(params.get(key));
  return params.has(key) && Number.isFinite(v) ? v : fallback;
};

export const DEBUG = {
  enabled: params.has('debug'),
  startTime: num('time', 0),
  map: num('map', 0),
  bot: params.has('bot'),
  speed: Math.max(1, Math.min(16, Math.floor(num('speed', 1)))),
  god: params.has('god'),
  gold: num('gold', -1),
  unlock: params.has('unlock'),
  autostart: params.has('autostart'),
  seed: num('seed', 0),
  level: num('level', 1),
  give: (params.get('give') ?? '').split(',').filter(Boolean),
  hero: params.get('hero') ?? '',
  event: params.get('event') ?? '',
};
