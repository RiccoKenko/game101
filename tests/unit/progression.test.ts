import { describe, expect, it } from 'vitest';
import { MAX_PASSIVES, MAX_WEAPONS } from '../../src/config/game';
import { PASSIVE_IDS, WEAPON_IDS } from '../../src/config/weapons';
import {
  applyChoice,
  evolvableWeapons,
  evolve,
  newInventory,
  rollChoices,
  xpToNext,
  type Inventory,
} from '../../src/core/progression';
import { mulberry32 } from '../../src/core/rng';

describe('level-up choices', () => {
  it('offers three distinct options at the start', () => {
    const choices = rollChoices(newInventory(), mulberry32(1));
    expect(choices).toHaveLength(3);
    const keys = choices.map((c) => JSON.stringify(c));
    expect(new Set(keys).size).toBe(3);
  });

  it('never offers new items once slots are full', () => {
    const inv: Inventory = {
      weapons: WEAPON_IDS.slice(0, MAX_WEAPONS).map((id) => ({ id, level: 1, evolved: null })),
      passives: PASSIVE_IDS.slice(0, MAX_PASSIVES).map((id) => ({ id, level: 1 })),
      runes: [],
      banned: [],
    };
    for (let seed = 0; seed < 50; seed++) {
      for (const c of rollChoices(inv, mulberry32(seed))) {
        if (c.kind === 'weapon') expect(inv.weapons.some((w) => w.id === c.id)).toBe(true);
        if (c.kind === 'passive') expect(inv.passives.some((p) => p.id === c.id)).toBe(true);
      }
    }
  });

  it('falls back to gold and healing when everything is maxed', () => {
    const inv: Inventory = {
      weapons: WEAPON_IDS.slice(0, MAX_WEAPONS).map((id) => ({ id, level: 5, evolved: null })),
      passives: [
        { id: 'quiver', level: 2 },
        { id: 'heart', level: 5 },
        { id: 'boots', level: 5 },
        { id: 'tome', level: 5 },
      ],
      runes: [
        { id: 'burn', level: 3 },
        { id: 'chain', level: 3 },
        { id: 'leech', level: 3 },
      ],
      banned: [],
    };
    expect(rollChoices(inv, mulberry32(3)).map((c) => c.kind)).toEqual(['gold', 'heal']);
  });

  it('applies upgrades and caps levels', () => {
    const inv = newInventory();
    for (let i = 0; i < 10; i++) applyChoice(inv, { kind: 'weapon', id: 'bow', level: 2 });
    expect(inv.weapons[0].level).toBe(5);
    applyChoice(inv, { kind: 'passive', id: 'quiver', level: 1 });
    applyChoice(inv, { kind: 'passive', id: 'quiver', level: 2 });
    applyChoice(inv, { kind: 'passive', id: 'quiver', level: 3 });
    expect(inv.passives[0].level).toBe(2);
  });

  it('XP needed grows with level', () => {
    for (let l = 1; l < 60; l++) expect(xpToNext(l + 1)).toBeGreaterThan(xpToNext(l));
  });
});

describe('evolutions', () => {
  it('requires max level and the matching passive', () => {
    const inv = newInventory();
    inv.weapons[0].level = 5;
    expect(evolvableWeapons(inv)).toEqual([]);
    inv.passives.push({ id: 'quiver', level: 1 });
    expect(evolvableWeapons(inv)).toEqual(['bow']);
    expect(evolve(inv, 'bow')).toBe('stormbow');
    expect(evolvableWeapons(inv)).toEqual([]);
  });

  it('lightning, bomb and boomerang need a rune to evolve', () => {
    const inv: Inventory = {
      weapons: [
        { id: 'lightning', level: 5, evolved: null },
        { id: 'bomb', level: 5, evolved: null },
        { id: 'boomerang', level: 5, evolved: null },
      ],
      passives: PASSIVE_IDS.slice(0, 4).map((id) => ({ id, level: 1 })),
      runes: [],
      banned: [],
    };
    expect(evolvableWeapons(inv)).toEqual([]);
    inv.runes.push({ id: 'chain', level: 1 }, { id: 'blast', level: 1 });
    expect(evolvableWeapons(inv)).toEqual(['lightning', 'bomb']);
  });
});
