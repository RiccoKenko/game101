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
