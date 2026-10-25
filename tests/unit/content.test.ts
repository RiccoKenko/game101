import { describe, expect, it } from 'vitest';
import { CHARACTERS, characterDef } from '../../src/config/characters';
import { BOSSES, ENEMIES } from '../../src/config/enemies';
import { MAPS } from '../../src/config/maps';
import { EVOLUTIONS, MAX_WEAPON_LEVEL, PASSIVES, RUNES, WEAPONS, WEAPON_IDS } from '../../src/config/weapons';
import { evolvableWeapons, evolve, newInventory } from '../../src/core/progression';
import { defaultSave, sanitize } from '../../src/core/save';
import { computeStats } from '../../src/core/stats';
import { bossesDue, leadersDue, swarmSize } from '../../src/core/waves';
import { DIFFICULTIES, maxDifficulty } from '../../src/config/difficulty';
import { RELICS, relicFor } from '../../src/config/relics';
import { EVENT_GAP, EVENT_QUIET, FINAL_TIME, SHRINE_OFFERS } from '../../src/config/events';
import { AFFIX_IDS, affixCount } from '../../src/config/affixes';
import { CURSES, CURSE_IDS, MAX_HEAT, heatOf } from '../../src/config/curses';
import { RUNE_IDS, RUNE_POWER } from '../../src/config/weapons';
import { ICONS_ART } from '../../src/art/icons';
import manifest from '../../src/art/manifest.json';
import { rollChoices } from '../../src/core/progression';
import { mulberry32 } from '../../src/core/rng';

describe('weapons', () => {
  it('every weapon has five levels and a card line for each upgrade', () => {
    for (const id of WEAPON_IDS) {
      const w = WEAPONS[id];
      expect(w.levels).toHaveLength(MAX_WEAPON_LEVEL);
      expect(w.upgrades).toHaveLength(MAX_WEAPON_LEVEL - 1);
    }
  });

  it('evolutions point back at their weapon and need a real passive', () => {
    for (const evo of Object.values(EVOLUTIONS)) {
      expect(WEAPONS[evo.base].evolution?.into).toBe(evo.id);
      const req = WEAPONS[evo.base].evolution!.requires;
      expect(req in PASSIVES || req in RUNES).toBe(true);
    }
  });

  it('Magic Bolt evolves into Starfall with the Spell Tome', () => {
    const inv = newInventory('bolt');
    inv.weapons[0].level = MAX_WEAPON_LEVEL;
    inv.passives.push({ id: 'tome', level: 1 });
    expect(evolvableWeapons(inv)).toEqual(['bolt']);
    expect(evolve(inv, 'bolt')).toBe('starfall');
  });
});

describe('characters', () => {
  it('each hero starts with a real weapon; only the first is free', () => {
    for (const c of CHARACTERS) expect(WEAPONS[c.start]).toBeDefined();
    expect(CHARACTERS[0].price).toBe(0);
    expect(CHARACTERS.slice(1).every((c) => c.price > 0)).toBe(true);
  });

  it("the mage's perk changes HP and area", () => {
    const shop = defaultSave().shop;
    const mage = computeStats(shop, { tome: 1 }, characterDef('mage'));
    expect(mage.maxHp).toBe(90);
    expect(mage.areaMult).toBeCloseTo(1.15 * 1.1);
    expect(computeStats(shop, {}).maxHp).toBe(100);
  });

  it('saves keep only real, unlocked heroes', () => {
    expect(sanitize({}).characters).toEqual(['archer']);
    expect(sanitize({ characters: ['mage', 'ninja'], character: 'mage' })).toMatchObject({ characters: ['archer', 'mage'], character: 'mage' });
    // Picked but never unlocked: back to the archer.
    expect(sanitize({ characters: ['archer'], character: 'mage' }).character).toBe('archer');
  });
});

describe('monsters', () => {
  it('every map has a leader and its extra monsters exist', () => {
    for (const map of MAPS) {
      expect(BOSSES[map.leader].leader).toBe(true);
      for (const x of map.extras) expect(ENEMIES[x.id]).toBeDefined();
      if (map.swarm) expect(ENEMIES[map.swarm.id].behavior).toBe('swarm');
    }
  });

  it('leaders come at 2:30, 7:30, 12:30 and swarms grow slowly', () => {
    expect(leadersDue(149)).toBe(0);
    expect(leadersDue(150)).toBe(1);
    expect(leadersDue(449)).toBe(1);
    expect(leadersDue(450)).toBe(2);
    expect(swarmSize(6, 0)).toBe(6);
    expect(swarmSize(6, 6)).toBe(8);
  });
});

describe('depth: difficulty, relics, events', () => {
  it('clearing opens the next difficulty and the save keeps picks within it', () => {
    const s = sanitize({ clears: [1, 0, 0], difficulty: [2, 1, 0] });
    expect(s.difficulty).toEqual([1, 0, 0]);
    expect(maxDifficulty(0)).toBe(0);
    expect(maxDifficulty(3)).toBe(DIFFICULTIES.length - 1);
    for (let i = 1; i < DIFFICULTIES.length; i++) {
      expect(DIFFICULTIES[i].hp).toBeGreaterThan(DIFFICULTIES[i - 1].hp);
      expect(DIFFICULTIES[i].gold).toBeGreaterThan(DIFFICULTIES[i - 1].gold);
    }
  });

  it('each relic is won by exactly one map clear, and only owned relics can be worn', () => {
    for (const r of RELICS) expect(relicFor(r.map, r.difficulty)).toBe(r);
    const s = sanitize({ relics: ['slime', 'ogre', 'nope'], equipped: ['ogre', 'demon', 'slime', 'slime'] });
    expect(s.relics).toEqual(['slime', 'ogre']);
    expect(s.equipped).toEqual(['ogre', 'slime']);
  });

  it('events are spaced out and the final boss comes with the third boss', () => {
    expect(EVENT_GAP[0]).toBeGreaterThan(EVENT_QUIET * 2);
    expect(bossesDue(FINAL_TIME)).toBe(3);
    expect(SHRINE_OFFERS.some((o) => o.pact) && SHRINE_OFFERS.some((o) => !o.pact)).toBe(true);
  });
});

describe('more weapons, items and runes', () => {
  it('every weapon, evolution, passive and rune has an icon', () => {
    const painted = new Set(manifest.keys);
    const icons = [
      ...Object.values(WEAPONS).map((w) => w.icon),
      ...Object.values(EVOLUTIONS).map((e) => e.icon),
      ...Object.values(PASSIVES).map((p) => p.icon),
      ...Object.values(RUNES).map((r) => r.icon),
    ];
    // Painted pictures are listed in the art manifest; the rest are drawn in code.
    for (const icon of icons) expect(painted.has(icon) || icon in ICONS_ART, icon).toBe(true);
  });

  it('the new weapons evolve with the new passives and the Frost Rune', () => {
    expect(WEAPONS.beam.evolution).toEqual({ into: 'rainbow', requires: 'clover' });
    expect(WEAPONS.twister.evolution).toEqual({ into: 'cyclone', requires: 'magnet' });
    expect(WEAPONS.traps.evolution).toEqual({ into: 'glacier', requires: 'freeze' });
    expect(WEAPONS.ward.evolution).toEqual({ into: 'aegis', requires: 'shield' });
  });

  it('every rune has a strength for each of its levels', () => {
    for (const id of RUNE_IDS) {
      const power = (RUNE_POWER as Record<string, number[]>)[id];
      expect(power, id).toHaveLength(RUNES[id].maxLevel);
      expect(RUNES[id].levels).toHaveLength(RUNES[id].maxLevel);
    }
  });

  it('the new passives change crit, armor, regen and how long effects last', () => {
    const shop = defaultSave().shop;
    const base = computeStats(shop, {});
    const st = computeStats(shop, { clover: 2, shield: 3, spring: 1, charm: 2 });
    expect(st.critChance).toBeCloseTo(base.critChance + 0.1);
    expect(st.armor).toBe(base.armor + 3);
    expect(st.regen).toBeCloseTo(0.003);
    expect(st.durationMult).toBeCloseTo(1.3);
    expect(base.healMult).toBe(1);
  });

  it('more kinds of item do not make upgrades for what you hold any rarer', () => {
    // With just the start weapon, its upgrade still shows up in a fair share of level-ups.
    let offered = 0;
    for (let seed = 0; seed < 400; seed++) {
      if (rollChoices(newInventory('bow'), mulberry32(seed)).some((c) => c.kind === 'weapon' && c.id === 'bow')) offered++;
    }
    expect(offered / 400).toBeGreaterThan(0.15);
  });
});

describe('elite powers and curses', () => {
  it('elites get more powers later, on Nightmare and with a curse, never more than three', () => {
    expect(affixCount(200, 0)).toBe(1);
    expect(affixCount(480, 0)).toBe(2);
    expect(affixCount(200, 2)).toBe(2);
    expect(affixCount(600, 2, 1)).toBe(3);
    expect(AFFIX_IDS.length).toBeGreaterThanOrEqual(3);
  });

  it('heat adds up, and saves keep only real curses', () => {
    expect(heatOf([])).toBe(0);
    expect(heatOf(['horde', 'iron'])).toBe(3);
    expect(MAX_HEAT).toBe(CURSES.reduce((a, c) => a + c.heat, 0));
    const s = sanitize({ curses: ['horde', 'nope', 'tyrant'], bestHeat: [3, 99, -1] });
    expect(s.curses).toEqual(['horde', 'tyrant']);
    expect(s.bestHeat).toEqual([3, MAX_HEAT, 0]);
    expect(sanitize({}).curses).toEqual([]);
    expect(CURSE_IDS).toHaveLength(new Set(CURSE_IDS).size);
  });
});
