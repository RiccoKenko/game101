import { type CharacterId } from './characters';

/**
 * Hero talents: at levels 5, 10, 15, 20 and 25 the level-up cards are three talents only that hero can learn,
 * so the two heroes grow differently and no two runs build the same.
 */
export type TalentId =
  // Little Archer
  | 'volley' | 'piercing' | 'eagle' | 'rain' | 'mark' | 'tailwind' | 'trick' | 'secondwind'
  // Little Mage
  | 'arcecho' | 'pyro' | 'cryo' | 'stormcall' | 'surge' | 'grand' | 'blink' | 'stars' | 'wisdom' | 'font';

export interface TalentDef {
  id: TalentId;
  hero: CharacterId;
  name: string;
  icon: string;
  text: string;
}

export const TALENTS: TalentDef[] = [
  { id: 'volley', hero: 'archer', name: 'Volley', icon: 'icon_quiver', text: 'Your Bow fires 2 more arrows' },
  { id: 'piercing', hero: 'archer', name: 'Piercing Shots', icon: 'icon_bow', text: 'Every projectile goes through 2 more enemies' },
  { id: 'eagle', hero: 'archer', name: 'Eagle Eye', icon: 'icon_clover', text: 'Crit chance +10%, critical hits deal x2.5' },
  { id: 'rain', hero: 'archer', name: 'Arrow Rain', icon: 'icon_stormbow', text: 'Every 5 s, arrows rain down on 8 monsters around you' },
  { id: 'mark', hero: 'archer', name: "Hunter's Mark", icon: 'icon_crown', text: 'Elites, leaders and bosses take 30% more damage' },
  { id: 'tailwind', hero: 'archer', name: 'Tailwind', icon: 'icon_boots', text: 'Move speed +15%; Run and Gun gets twice as strong' },
  { id: 'trick', hero: 'archer', name: 'Trick Shot', icon: 'icon_rune_ricochet', text: 'Projectiles bounce on to 1 more enemy' },
  { id: 'secondwind', hero: 'archer', name: 'Second Wind', icon: 'icon_heart', text: 'Dropping under 30% HP heals 40% at once (every 60 s)' },

  { id: 'arcecho', hero: 'mage', name: 'Arcane Echo', icon: 'icon_rune_echo', text: 'Every attack has a 20% chance to go off twice' },
  { id: 'pyro', hero: 'mage', name: 'Pyromancy', icon: 'icon_rune_burn', text: 'Your hits set monsters on fire (like a level 2 Ember Rune)' },
  { id: 'cryo', hero: 'mage', name: 'Cryomancy', icon: 'icon_rune_freeze', text: 'Your hits may freeze monsters (like a level 2 Frost Rune)' },
  { id: 'stormcall', hero: 'mage', name: 'Stormcalling', icon: 'icon_rune_chain', text: 'Your hits may arc lightning (like a level 2 Storm Rune)' },
  { id: 'surge', hero: 'mage', name: 'Arcane Surge', icon: 'icon_hourglass', text: 'All attacks 15% faster' },
  { id: 'grand', hero: 'mage', name: 'Grand Magic', icon: 'icon_tome', text: 'Attack area +25%' },
  { id: 'blink', hero: 'mage', name: 'Blink', icon: 'icon_charm', text: 'When hit, vanish and reappear out of danger (every 8 s)' },
  { id: 'stars', hero: 'mage', name: 'Starcaller', icon: 'icon_starfall', text: 'Every 2.5 s a star strikes a monster on screen' },
  { id: 'wisdom', hero: 'mage', name: 'Wisdom', icon: 'icon_growth', text: 'XP gained +20%' },
  { id: 'font', hero: 'mage', name: 'Mana Font', icon: 'icon_ward', text: 'Mana Shield comes back in 4 s and blasts monsters away when it breaks' },
];

export const TALENT_IDS = TALENTS.map((t) => t.id);

/** Levels at which the cards are hero talents. */
export const TALENT_LEVELS = [5, 10, 15, 20, 25];

export function talentDef(id: TalentId): TalentDef {
  return TALENTS.find((t) => t.id === id)!;
}

/** How strong the talents are. */
export const TALENT = {
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
