import { type CharacterId } from './characters';

/**
 * Hero talents: at levels 5, 10, 15, 20 and 25 the level-up cards are three talents only that hero can learn,
 * so the heroes grow differently and no two runs build the same.
 */
export type TalentId =
  // Swordman
  | 'swordmastery' | 'endure' | 'hprecovery' | 'quicken' | 'vitality' | 'concentration' | 'spirit' | 'guts'
  // Archer
  | 'volley' | 'piercing' | 'eagle' | 'rain' | 'mark' | 'tailwind' | 'trick' | 'secondwind'
  // Mage
  | 'arcecho' | 'pyro' | 'cryo' | 'stormcall' | 'surge' | 'grand' | 'blink' | 'stars' | 'wisdom' | 'font';

export interface TalentDef {
  id: TalentId;
  hero: CharacterId;
  name: string;
  icon: string;
  text: string;
}

export const TALENTS: TalentDef[] = [
  { id: 'swordmastery', hero: 'swordman', name: 'Sword Mastery', icon: 'icon_might', text: 'Damage +20%' },
  { id: 'endure', hero: 'swordman', name: 'Endure', icon: 'icon_armor', text: 'Armor +2: take 2 less damage from every hit' },
  { id: 'hprecovery', hero: 'swordman', name: 'HP Recovery', icon: 'icon_heart', text: 'Recover 0.6% of your max HP every second' },
  { id: 'quicken', hero: 'swordman', name: 'Two-Hand Quicken', icon: 'icon_hourglass', text: 'All attacks 15% faster' },
  { id: 'vitality', hero: 'swordman', name: 'Vitality', icon: 'icon_revival', text: 'Max HP +30%' },
  { id: 'concentration', hero: 'swordman', name: 'Concentration', icon: 'icon_clover', text: 'Crit chance +10%, critical hits deal x2.5' },
  { id: 'spirit', hero: 'swordman', name: 'Fighting Spirit', icon: 'icon_tome', text: 'Attack area +25%: wider swings, bursts and auras' },
  { id: 'guts', hero: 'swordman', name: 'Guts', icon: 'icon_greed', text: 'Dropping under 30% HP heals 40% at once (every 60 s)' },

  { id: 'volley', hero: 'archer', name: 'Volley', icon: 'icon_quiver', text: 'Arrow Shot fires 2 more arrows' },
  { id: 'piercing', hero: 'archer', name: "Vulture's Eye", icon: 'icon_bow', text: 'Every projectile goes through 2 more enemies' },
  { id: 'eagle', hero: 'archer', name: "Owl's Eye", icon: 'icon_clover', text: 'Crit chance +10%, critical hits deal x2.5' },
  { id: 'rain', hero: 'archer', name: 'Sky Volley', icon: 'icon_stormbow', text: 'Every 5 s, arrows rain down on 8 monsters around you' },
  { id: 'mark', hero: 'archer', name: "Hunter's Mark", icon: 'icon_crown', text: 'Elites, leaders and bosses take 30% more damage' },
  { id: 'tailwind', hero: 'archer', name: 'Wind Walk', icon: 'icon_boots', text: 'Move speed +15%; shooting on the move gets twice as fast' },
  { id: 'trick', hero: 'archer', name: 'Trick Shot', icon: 'icon_rune_ricochet', text: 'Projectiles bounce on to 1 more enemy' },
  { id: 'secondwind', hero: 'archer', name: 'Second Wind', icon: 'icon_heart', text: 'Dropping under 30% HP heals 40% at once (every 60 s)' },

  { id: 'arcecho', hero: 'mage', name: 'Double Casting', icon: 'icon_rune_echo', text: 'Every attack has a 20% chance to go off twice' },
  { id: 'pyro', hero: 'mage', name: 'Pyromancy', icon: 'icon_rune_burn', text: 'Your hits set monsters on fire (like a level 2 Dust Imp Card)' },
  { id: 'cryo', hero: 'mage', name: 'Cryomancy', icon: 'icon_rune_freeze', text: 'Your hits may freeze monsters (like a level 2 Talisman Ghoul Card)' },
  { id: 'stormcall', hero: 'mage', name: 'Stormcalling', icon: 'icon_rune_chain', text: 'Your hits may arc lightning (like a level 2 Foxfire Kit Card)' },
  { id: 'surge', hero: 'mage', name: 'SP Recovery', icon: 'icon_hourglass', text: 'All attacks 15% faster' },
  { id: 'grand', hero: 'mage', name: 'Mystical Amplification', icon: 'icon_tome', text: 'Attack area +25%' },
  { id: 'blink', hero: 'mage', name: 'Blink', icon: 'icon_charm', text: 'When hit, vanish and reappear out of danger (every 8 s)' },
  { id: 'stars', hero: 'mage', name: 'Starcaller', icon: 'icon_starfall', text: 'Every 2.5 s a star strikes a monster on screen' },
  { id: 'wisdom', hero: 'mage', name: 'Wisdom', icon: 'icon_growth', text: 'XP gained +20%' },
  { id: 'font', hero: 'mage', name: 'Energy Coat', icon: 'icon_ward', text: 'Safety Wall comes back in 4 s and blasts monsters away when it breaks' },
];

export const TALENT_IDS = TALENTS.map((t) => t.id);

/** Levels at which the cards are hero talents. */
export const TALENT_LEVELS = [5, 10, 15, 20, 25];

export function talentDef(id: TalentId): TalentDef {
  return TALENTS.find((t) => t.id === id)!;
}

/** How strong the talents are. */
export const TALENT = {
  swordMastery: 0.2,
  endureArmor: 2,
  hpRecovery: 0.006,
  quicken: 0.85,
  vitality: 0.3,
  volleyArrows: 2,
  piercing: 2,
  eagleCrit: 0.1,
  eagleCritMult: 2.5,
  rainEvery: 5,
  rainArrows: 8,
  mark: 0.3,
  tailwindSpeed: 0.15,
  secondWindAt: 0.3,
  secondWindHeal: 0.4,
  secondWindEvery: 60,
  arcaneEcho: 0.2,
  surge: 0.85,
  grand: 1.25,
  blinkEvery: 8,
  blinkDistance: 260,
  starsEvery: 2.5,
  wisdom: 0.2,
  fontShield: 4,
};
