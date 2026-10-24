/** Every character's clips, by character id (the folder name under public/sprites/). */
import type { Clip2D } from '../pose';
import { archerClips } from './archer';
import { deckhandClips } from './deckhand';
import { firstMateClips } from './first_mate';
import { heroClips } from './hero';
import { ironcladClips } from './ironclad';
import { mageClips } from './mage';
import { mochiClips } from './mochi';
import { parrotRaiderClips } from './parrot_raider';
import { powderMonkeyClips } from './powder_monkey';
import { talonClips } from './talon';

export const CLIPS: Record<string, Clip2D[]> = {
  hero: heroClips,
  archer: archerClips,
  mage: mageClips,
  deckhand: deckhandClips,
  ironclad: ironcladClips,
  powder_monkey: powderMonkeyClips,
  parrot_raider: parrotRaiderClips,
  first_mate: firstMateClips,
  talon: talonClips,
  mochi: mochiClips,
};
