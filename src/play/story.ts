/**
 * Chapter 1's story: short dialog scenes before and after each level, shown over the battle map. Each line has
 * a speaker, a mood (which portrait to show) and the text; Little Archer's lines can also play a move on the
 * hero standing on the map. This is a first draft for the owner to edit: change the words freely, keep the keys.
 */

export type Speaker = 'archer' | 'talon' | 'mochi' | 'firstMate' | 'deckhand' | 'stormbeard' | 'narrator';

export interface StoryLine {
  who: Speaker;
  /** Portrait mood; each speaker's moods are listed in SPEAKERS. */
  mood?: string;
  text: string;
  /** A move for the hero on the map while this line shows (Little Archer's lines only). */
  move?: 'cheer' | 'shoot' | 'cast' | 'hit';
}

export interface SpeakerDef {
  name: string;
  /** Which side of the dialog box the portrait sits on: heroes left, pirates right. */
  side: 'left' | 'right';
  /** Portrait pictures by mood (paths under public/); the first is the default. */
  portraits: Record<string, string>;
  /** Shown if a portrait picture is missing (not drawn yet). */
  fallback?: string;
  /** Name-plate colour. */
  colour: string;
}

export const SPEAKERS: Record<Speaker, SpeakerDef> = {
  archer: {
    name: 'Little Archer',
    side: 'left',
    portraits: { smile: 'sprites/hero/smile.png', determined: 'sprites/hero/determined.png', surprised: 'sprites/hero/surprised.png' },
    colour: '#3e9a4f',
  },
  talon: {
    name: 'Talon',
    side: 'left',
    // Drawn by OpenAI's gpt-image-2; the game falls back to a snapshot of the puppet's head if a picture is missing.
    portraits: { proud: 'sprites/talon/proud.png', cry: 'sprites/talon/cry.png', happy: 'sprites/talon/happy.png' },
    colour: '#b0702c',
  },
  mochi: {
    name: 'Mochi',
    side: 'left',
    portraits: { happy: 'sprites/mochi/happy.png', proud: 'sprites/mochi/proud.png', cry: 'sprites/mochi/cry.png' },
    colour: '#3a8fd6',
  },
  firstMate: {
    name: 'First Mate',
    side: 'right',
    portraits: { sneer: 'sprites/first_mate/sneer.png', roar: 'sprites/first_mate/roar.png', defeated: 'sprites/first_mate/defeated.png' },
    colour: '#b23a32',
  },
  deckhand: {
    name: 'Deckhand',
    side: 'right',
    portraits: { greedy: 'sprites/deckhand/greedy.png', angry: 'sprites/deckhand/angry.png', panicked: 'sprites/deckhand/panicked.png' },
    fallback: 'sprites/deckhand/angry.png',
    colour: '#c0603a',
  },
  // Never seen in Chapter 1: only his voice, from the dark of his airship.
  stormbeard: { name: 'Captain Stormbeard', side: 'right', portraits: {}, colour: '#4b3f72' },
  narrator: { name: '', side: 'left', portraits: {}, colour: '#22304d' },
};

/** Scenes by `<level id>:before` and `<level id>:after`. */
export const STORY: Record<string, StoryLine[]> = {
  'level1:before': [
    { who: 'archer', mood: 'smile', text: 'Morning, Sky Haven! The crystals are humming today.' },
    { who: 'talon', mood: 'cry', text: 'Kree! Kree-kree!' },
    { who: 'archer', mood: 'surprised', text: 'What is it, Talon? …An airship! Heading straight for our dock!' },
    { who: 'firstMate', mood: 'sneer', text: 'Ahoy, little island! Captain Stormbeard sends his regards… and his empty sacks.' },
    { who: 'deckhand', mood: 'greedy', text: 'Shiny crystals! Shiny, shiny crystals!' },
    { who: 'archer', mood: 'determined', text: 'Nobody steals Sky Haven’s crystals. Not on my watch!', move: 'shoot' },
    { who: 'archer', mood: 'smile', text: 'Build towers on the stone spots, and tap the grass to send me where I’m needed. Let’s go!', move: 'cheer' },
  ],
  'level1:after': [
    { who: 'firstMate', mood: 'defeated', text: 'Blast it! Back to the ship, ye barnacles! RETREAT!' },
    { who: 'firstMate', mood: 'roar', text: 'This isn’t over, archer! The Captain wants every crystal in the sky!' },
    { who: 'archer', mood: 'smile', text: 'And the sky wants them right where they are. Bye-bye!', move: 'cheer' },
    { who: 'mochi', mood: 'happy', text: 'Mrooo~♪' },
    { who: 'archer', mood: 'surprised', text: 'Wait… their airship is turning east. Toward the Windmill Terraces!' },
  ],
  'level2:before': [
    { who: 'archer', mood: 'determined', text: 'The farmers keep their crystal store just past the windmills. We hold the bridges!' },
    { who: 'deckhand', mood: 'angry', text: 'Oi! That’s the kid who sank our first raid!' },
    { who: 'deckhand', mood: 'greedy', text: 'No matter. We brought friends this time. Lots of friends. With wings!' },
    { who: 'talon', mood: 'proud', text: 'Kree! (Talon fluffs up his feathers, ready to dive.)' },
    { who: 'archer', mood: 'smile', text: 'Parrots in the air, armour on the road… Arrows for the sky, lightning for the tin cans!' },
  ],
  'level2:after': [
    { who: 'deckhand', mood: 'panicked', text: 'Every crystal we grab comes flying straight back! Run for it!' },
    { who: 'archer', mood: 'smile', text: 'Nice catch, Talon. And thank you, windmills, for the tailwind!', move: 'cheer' },
    { who: 'mochi', mood: 'cry', text: 'Mrooo… (Mochi points a fin at the horizon.)' },
    { who: 'archer', mood: 'surprised', text: 'Lighthouse Point! The First Mate is going for the old lighthouse… where the Great Crystal sleeps!' },
  ],
  'level3:before': [
    { who: 'firstMate', mood: 'roar', text: 'No more games! Every pirate, every powder keg, every parrot: TAKE THE LIGHTHOUSE!' },
    { who: 'firstMate', mood: 'sneer', text: 'And your little cloud-fish can’t save you this time.' },
    { who: 'mochi', mood: 'proud', text: 'MROOO!' },
    { who: 'archer', mood: 'determined', text: 'Mochi is bigger than you think. Talon, Mochi, together: we hold the point!', move: 'cast' },
  ],
  'level3:after': [
    { who: 'firstMate', mood: 'defeated', text: 'Beaten… by a kid with a bow, a bird and a… a cloud-fish!' },
    { who: 'mochi', mood: 'happy', text: 'Mrooo~♪' },
    { who: 'stormbeard', text: 'First Mate. You have failed me.' },
    { who: 'firstMate', mood: 'defeated', text: 'C-Captain Stormbeard! I can explain—' },
    { who: 'stormbeard', text: 'Enough. Ready the Thunder Armada. If the crystals will not come to us… we take the whole island.' },
    { who: 'archer', mood: 'determined', text: 'The Thunder Armada…? Then we’ll be ready. Sky Haven won’t give up a single crystal!', move: 'cheer' },
    { who: 'narrator', text: 'End of Chapter 1. Chapter 2, Storm Reef, is coming soon…' },
  ],
};

export const sceneKey = (levelId: string, when: 'before' | 'after') => `${levelId}:${when}`;
