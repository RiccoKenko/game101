import { describe, expect, it } from 'vitest';
import { BAG_SIZE, CHEST, dropWeights, GEAR, GEAR_TYPES, LOOT, RARITIES, REFINE, SLOTS, TOP_RARITY } from '../../src/config/gear';
import { difficultyDef, DIFFICULTIES, maxDifficulty } from '../../src/config/difficulty';
import {
  addItem,
  bonusStat,
  emptyGear,
  equip,
  fieldDrop,
  gearBonus,
  isEquipped,
  mainStat,
  merge,
  mergePartners,
  openChest,
  rollRarity,
  runDrops,
  refineCost,
  salvage,
  sanitizeGear,
  slotCard,
  tryRefine,
  unslotCard,
  wornCards,
  type GearItem,
} from '../../src/core/gear';
import { mulberry32 } from '../../src/core/rng';
import { defaultSave, sanitize } from '../../src/core/save';

const item = (p: Partial<GearItem> = {}): Omit<GearItem, 'uid'> => ({ type: 'hunterGloves', rarity: 0, refine: 0, spent: 0, oreSpent: 0, cards: [], ...p });

describe('equipment content', () => {
  it('has two kinds of item for every slot, each with a picture', () => {
    for (const s of SLOTS) expect(GEAR_TYPES.filter((t) => GEAR[t].slot === s.id)).toHaveLength(2);
    for (const t of GEAR_TYPES) expect(GEAR[t].icon).toMatch(/^gear_/);
    // Refining: every step is worth more, and gets harder.
    expect(REFINE.mult).toHaveLength(REFINE.max + 1);
    expect(REFINE.chance).toHaveLength(REFINE.max);
    for (let i = 1; i <= REFINE.max; i++) expect(REFINE.mult[i]).toBeGreaterThan(REFINE.mult[i - 1]);
    for (let i = 1; i < REFINE.max; i++) expect(REFINE.chance[i]).toBeLessThanOrEqual(REFINE.chance[i - 1]);
    expect(REFINE.chance.slice(0, 4)).toEqual([1, 1, 1, 1]);
  });
});

describe('equipment stats and costs', () => {
  it('main stat grows with rarity and refine; the second stat comes at Rare', () => {
    expect(mainStat({ ...item(), uid: 1 }).value).toBeCloseTo(0.012);
    expect(mainStat({ ...item({ refine: 10 }), uid: 1 }).value).toBeCloseTo(0.012 * REFINE.mult[10]);
    expect(mainStat({ ...item({ rarity: 4 }), uid: 1 }).value).toBeCloseTo(0.012 * 5.5);
    expect(bonusStat({ ...item({ rarity: 1 }), uid: 1 })).toBeNull();
    expect(bonusStat({ ...item({ rarity: 2 }), uid: 1 })).toEqual({ stat: 'crit', value: 0.02 });
  });

  it('refining costs gold and ore; +1 to +4 always work, and it stops at +10', () => {
    const save = defaultSave();
    save.gold = 10000;
    save.ore = 100;
    const it = addItem(save.gear, item({ rarity: 2 })) as GearItem;
    expect(refineCost(it)).toEqual({ gold: 40, ore: 3, chance: 1 });
    for (let k = 0; k < 4; k++) expect(tryRefine(save, it, () => 0.99)).toBe('ok');
    expect(it.refine).toBe(4);
    expect(save.gold).toBe(10000 - it.spent);
    expect(save.ore).toBe(100 - it.oreSpent);
    it.refine = 10;
    expect(refineCost(it)).toBeNull();
    expect(tryRefine(save, it, () => 0)).toBe(false);
    // Not enough ore: nothing happens.
    it.refine = 2;
    save.ore = 0;
    expect(tryRefine(save, it, () => 0)).toBe(false);
    expect(it.refine).toBe(2);
  });

  it('a failed refine loses the cost, and from +7 up also drops a step (it never breaks)', () => {
    const save = defaultSave();
    save.gold = 1e6;
    save.ore = 1e4;
    const it = addItem(save.gear, item({ refine: 5 })) as GearItem;
    expect(tryRefine(save, it, () => 0.999)).toBe('fail');
    expect(it.refine).toBe(5);
    it.refine = REFINE.dropFrom;
    expect(tryRefine(save, it, () => 0.999)).toBe('down');
    expect(it.refine).toBe(REFINE.dropFrom - 1);
    expect(save.gear.items).toContain(it);
    expect(tryRefine(save, it, () => 0)).toBe('ok');
  });

  it('only worn items count', () => {
    const g = emptyGear();
    const a = addItem(g, item({ type: 'hunterGloves', rarity: 2 })) as GearItem;
    addItem(g, item({ type: 'ironHelm', rarity: 4 }));
    equip(g, a);
    const b = gearBonus(g);
    expect(b.damage).toBeCloseTo(0.012 * 2.5);
    expect(b.crit).toBeCloseTo(0.02);
    expect(b.maxHp).toBe(0);
  });
});

describe('the bag', () => {
  it('a full bag salvages new finds for gold and ore', () => {
    const save = defaultSave();
    for (let i = 0; i < BAG_SIZE; i++) addItem(save.gear, item());
    expect(addItem(save.gear, item({ rarity: 2 }), save)).toBe(RARITIES[2].salvage);
    expect(save.gear.items).toHaveLength(BAG_SIZE);
    expect(save.gold).toBe(RARITIES[2].salvage);
    expect(save.ore).toBe(RARITIES[2].ore);
  });

  it('three of a rarity in one slot merge into the next rarity', () => {
    const g = emptyGear();
    const a = addItem(g, item({ type: 'hunterGloves', rarity: 2, refine: 2, spent: 40, oreSpent: 6 })) as GearItem;
    const b = addItem(g, item({ type: 'runeBracers', rarity: 2, refine: 8, spent: 100, oreSpent: 30 })) as GearItem;
    addItem(g, item({ type: 'ironHelm', rarity: 2 }));
    expect(mergePartners(g, a)).toEqual([]);
    const c = addItem(g, item({ type: 'hunterGloves', rarity: 2 })) as GearItem;
    equip(g, b);
    expect(mergePartners(g, a)).toEqual([c, b]);
    expect(merge(g, a)).toBe(true);
    expect(a).toMatchObject({ rarity: 3, refine: 8, spent: 140, oreSpent: 36, type: 'hunterGloves' });
    expect(g.items).not.toContain(b);
    expect(g.items).not.toContain(c);
    // The worn partner was used up, so the merged item is worn in its place.
    expect(isEquipped(g, a)).toBe(true);
    a.rarity = 4;
    expect(mergePartners(g, a)).toEqual([]);
  });

  it('salvaging pays back the base value and half the gold and ore spent, and takes it off', () => {
    const save = defaultSave();
    const it = addItem(save.gear, item({ rarity: 1, spent: 100, oreSpent: 20 })) as GearItem;
    equip(save.gear, it);
    expect(salvage(save, it)).toBe(RARITIES[1].salvage + 50);
    expect(save.ore).toBe(RARITIES[1].ore + 10);
    expect(save.gear.items).toHaveLength(0);
    expect(save.gear.equipped.gloves).toBeUndefined();
  });

  it('a gear chest costs gold', () => {
    const save = defaultSave();
    expect(openChest(save, mulberry32(1))).toBe(false);
    save.gold = CHEST.price;
    expect(typeof openChest(save, mulberry32(1))).toBe('object');
    expect(save.gold).toBe(0);
  });
});

describe('drops', () => {
  it('the end of a run adds one item for lasting a while, and a Rare or better for a clear', () => {
    const rng = mulberry32(7);
    expect(runDrops(rng, { map: 0, difficulty: 0, time: 100, won: false })).toHaveLength(0);
    expect(runDrops(rng, { map: 0, difficulty: 0, time: 9 * 60, won: false })).toHaveLength(1);
    const clear = runDrops(rng, { map: 0, difficulty: 0, time: 900, won: true });
    expect(clear).toHaveLength(2);
    expect(clear[1].rarity).toBeGreaterThanOrEqual(2);
  });

  it('keeps gear scarce: about three or four pieces in a 9-minute run', () => {
    // A 9-minute run meets one MVP, two leaders and (for the bot) about 250 elites.
    const expected = 1 + LOOT.boss.chance + 2 * LOOT.leader.chance + 250 * LOOT.elite.chance;
    expect(expected).toBeGreaterThanOrEqual(3);
    expect(expected).toBeLessThanOrEqual(5);
  });

  it('an MVP always drops Rare or better, and Epic and Legendary can come even on the first map', () => {
    const rng = mulberry32(11);
    const counts = RARITIES.map(() => 0);
    for (let i = 0; i < 3000; i++) counts[fieldDrop(rng, 0, 'boss').rarity]++;
    expect(counts[0] + counts[1]).toBe(0);
    expect(counts[3]).toBeGreaterThan(0);
    expect(counts[4]).toBeGreaterThan(0);
    // Elites and leaders never drop Common.
    for (let i = 0; i < 500; i++) {
      expect(fieldDrop(rng, 0, 'elite').rarity).toBeGreaterThanOrEqual(LOOT.elite.min);
      expect(fieldDrop(rng, 0, 'leader').rarity).toBeGreaterThanOrEqual(LOOT.leader.min);
    }
  });

  it('every odds row covers every rarity, gets better with the tier, and Mythic only drops deep in', () => {
    for (let t = 0; t < 20; t++) expect(dropWeights(t)).toHaveLength(RARITIES.length);
    const rare = (t: number) => dropWeights(t).slice(2).reduce((a, b) => a + b, 0) / dropWeights(t).reduce((a, b) => a + b, 0);
    for (let t = 1; t < 10; t++) expect(rare(t)).toBeGreaterThan(rare(t - 1));
    expect(dropWeights(0)[TOP_RARITY]).toBe(0);
    expect(dropWeights(9)[TOP_RARITY]).toBeGreaterThan(0);
    expect(CHEST.weights).toHaveLength(RARITIES.length);
  });

  it('rarity rolls respect the odds and the floor', () => {
    const rng = mulberry32(3);
    const counts = [0, 0, 0, 0, 0, 0];
    for (let i = 0; i < 4000; i++) counts[rollRarity(rng, [70, 25, 5, 0, 0, 0])]++;
    expect(counts[3] + counts[4] + counts[5]).toBe(0);
    expect(counts[0]).toBeGreaterThan(counts[1]);
    for (let i = 0; i < 200; i++) expect(rollRarity(rng, [70, 25, 5, 0, 0, 0], 2)).toBe(2);
  });
});

describe('difficulty ladder', () => {
  it('goes on past Nightmare into Abyss steps, each harder and richer than the last', () => {
    expect(difficultyDef(2)).toBe(DIFFICULTIES[2]);
    expect(difficultyDef(3).name).toBe('Abyss 1');
    expect(difficultyDef(12).name).toBe('Abyss 10');
    for (let d = 1; d < 15; d++) {
      expect(difficultyDef(d).hp).toBeGreaterThan(difficultyDef(d - 1).hp);
      expect(difficultyDef(d).damage).toBeGreaterThan(difficultyDef(d - 1).damage);
      expect(difficultyDef(d).gold).toBeGreaterThan(difficultyDef(d - 1).gold);
    }
    // Each clear opens the next step.
    expect(maxDifficulty(3)).toBe(3);
    expect(maxDifficulty(7)).toBe(7);
    const save = sanitize({ clears: [8, 0, 0], difficulty: [6, 0, 0] });
    expect(save.clears[0]).toBe(8);
    expect(save.difficulty[0]).toBe(6);
  });

  it('merges go up to Mythic and no further', () => {
    const g = emptyGear();
    for (let i = 0; i < 3; i++) addItem(g, item({ rarity: TOP_RARITY - 1 }));
    expect(merge(g, g.items[0])).toBe(true);
    expect(g.items[0].rarity).toBe(TOP_RARITY);
    for (let i = 0; i < 2; i++) addItem(g, item({ rarity: TOP_RARITY }));
    expect(merge(g, g.items[0])).toBe(false);
    expect(bonusStat(g.items[0])?.value).toBe(GEAR.hunterGloves.bonusValues[3]);
  });
});

describe('saved gear', () => {
  it('cleans bad data and keeps good data', () => {
    const g = sanitizeGear({
      items: [
        // An old save's level 99 becomes +10; level 4 becomes +3.
        { uid: 4, type: 'ironHelm', rarity: 9, level: 99, spent: 10 },
        { uid: 5, type: 'dragonSword', rarity: 1, refine: 1 },
        { uid: 4, type: 'featherHat', rarity: 0, refine: 1 },
        { uid: 6, type: 'windCloak', rarity: 1, level: 0, fresh: true },
        { uid: 7, type: 'luckyBoots', rarity: 2, level: 4 },
      ],
      equipped: { helmet: 4, cloak: 4, boots: 99 },
      next: 2,
    });
    expect(g.items).toEqual([
      { uid: 4, type: 'ironHelm', rarity: TOP_RARITY, refine: REFINE.max, spent: 10, oreSpent: 0, cards: [], fresh: false },
      { uid: 6, type: 'windCloak', rarity: 1, refine: 0, spent: 0, oreSpent: 0, cards: [], fresh: true },
      { uid: 7, type: 'luckyBoots', rarity: 2, refine: 3, spent: 0, oreSpent: 0, cards: [], fresh: false },
    ]);
    expect(g.equipped).toEqual({ helmet: 4 });
    expect(g.next).toBe(8);
    expect(sanitize({ gear: 'nope' }).gear).toEqual(emptyGear());
  });
});

describe('monster cards', () => {
  it('slot into gear by rarity (none below Rare, two from Legendary), and come back out', () => {
    const save = defaultSave();
    save.cards = { leech: 2, burn: 1 };
    const common = addItem(save.gear, item({ rarity: 1 })) as GearItem;
    expect(slotCard(save, common, 'leech')).toBe(false);
    const rare = addItem(save.gear, item({ rarity: 2 })) as GearItem;
    expect(slotCard(save, rare, 'leech')).toBe(true);
    expect(slotCard(save, rare, 'burn')).toBe(false);
    const legend = addItem(save.gear, item({ type: 'ironHelm', rarity: 4 })) as GearItem;
    expect(slotCard(save, legend, 'leech')).toBe(true);
    expect(slotCard(save, legend, 'burn')).toBe(true);
    expect(slotCard(save, legend, 'burn')).toBe(false);
    expect(save.cards).toEqual({ leech: 0, burn: 0 });
    // Only worn gear counts: two Gummy Cards make level 2.
    equip(save.gear, rare);
    equip(save.gear, legend);
    expect(wornCards(save.gear)).toEqual({ leech: 2, burn: 1 });
    expect(unslotCard(save, legend, 1)).toBe(true);
    expect(save.cards.burn).toBe(1);
  });

  it('salvaging or merging gives the cards back to the album', () => {
    const save = defaultSave();
    save.cards = { echo: 1 };
    const it = addItem(save.gear, item({ rarity: 2 })) as GearItem;
    slotCard(save, it, 'echo');
    salvage(save, it);
    expect(save.cards.echo).toBe(1);
    const a = addItem(save.gear, item({ rarity: 2 })) as GearItem;
    const b = addItem(save.gear, item({ rarity: 2 })) as GearItem;
    addItem(save.gear, item({ rarity: 2 }));
    slotCard(save, b, 'echo');
    expect(merge(save.gear, a, save)).toBe(true);
    expect(save.cards.echo).toBe(1);
  });

  it('saved cards are cleaned: unknown cards dropped, no more than the slots allow', () => {
    const g = sanitizeGear({ items: [{ uid: 1, type: 'ironHelm', rarity: 2, refine: 0, cards: ['leech', 'nope', 'burn'] }], equipped: {}, next: 2 });
    expect(g.items[0].cards).toEqual(['leech']);
    expect(sanitize({ cards: { leech: 3, nope: 2, burn: -1 } }).cards).toEqual({ leech: 3 });
  });
});
