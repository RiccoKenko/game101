/**
 * Ricco Rush sample sprites in the classic online-RPG look: about 3.5 heads tall, small calm faces, big boots,
 * earthy colours. 48 x 72 pixels, facing right in a three-quarter view (the near arm is on the left of the picture).
 * `breath` lowers everything above the knees by a pixel, for a two-frame idle.
 */
import { Sprite } from './engine.mjs';
import { BLUSH, C, EYE, SHEEN } from './palette.mjs';

export { C };

/** Boots and legs, shared by all three heroes (x of the near and far foot, top of the boot). */
function legs(s, ramp, boot, bootTop, kneeY = 50) {
  s.capsule(28.5, kneeY, 29, bootTop + 2, 2.4, ramp);
  s.poly([[26, bootTop], [31.5, bootTop], [31.5, 66], [32, 70], [26, 70]], boot);
  s.ellipse(31.6, 68.3, 2.6, 1.9, boot);
  s.capsule(21, kneeY, 20.5, bootTop + 2, 2.5, ramp);
  s.poly([[17.5, bootTop], [23.5, bootTop], [23.5, 66], [24, 70], [17.5, 70]], boot);
  s.ellipse(23.9, 68.3, 2.7, 1.9, boot);
  // Folded cuffs at the top of the boots.
  s.rect(25.5, bootTop, 6.5, 1.6, boot, 0.25);
  s.rect(17, bootTop, 7, 1.6, boot, 0.25);
}

function face(s, cy = 19) {
  s.rect(23, cy + 7, 4.5, 4, C.skin); // neck
  s.ellipse(25.5, cy, 7, 8, C.skin);
  s.ellipse(19.5, cy + 1.5, 1.6, 2.1, C.skin); // the near ear
}

function eyes(s, cy = 19) {
  // Small dark eyes with a glint (the far one a touch narrower), soft blush, a tiny mouth: a calm sprite face.
  s.spot(27.2, cy + 3.4, 1.5, 0.75, BLUSH).spot(32.6, cy + 3.3, 0.9, 0.65, BLUSH);
  s.spot(28, cy + 1.1, 0.85, 1.3, EYE).spot(31.6, cy + 1.1, 0.65, 1.2, EYE);
  s.spot(28.3, cy + 0.55, 0.32, 0.36, '#ffffff').spot(31.8, cy + 0.55, 0.26, 0.32, '#ffffff');
  s.line(29.4, cy + 5.4, 30.3, cy + 5.5, 0.28, '#a8604a');
}

/** Two thin brows just above the eyes. */
function brows(s, y, colour) {
  s.line(26.9, y + 0.7, 28.9, y + 0.4, 0.32, colour).line(30.6, y + 0.4, 32.3, y + 0.6, 0.3, colour);
}

export function swordman(breath = 0) {
  const s = new Sprite(48, 72);
  // Headband tails behind the head.
  s.offset(0, breath);
  s.taper(17.5, 14.5, 10.5, 18, 1.4, 0.5, C.navy).taper(17.5, 15.5, 12, 23.5, 1.3, 0.45, C.navy);
  // Spikes at the back of the head, behind everything else up there.
  s.taper(20, 10.5, 12, 7.5, 3, 0.3, C.chestnut).taper(19.5, 14, 12, 15.5, 2.6, 0.3, C.chestnut);
  s.offset(0, 0);
  legs(s, C.slate, C.leather, 57);
  s.offset(0, breath);
  // Far arm with the buckler.
  s.capsule(31, 31, 32.5, 38, 2.3, C.sand).capsule(32.5, 38, 33.5, 44, 2.1, C.cream);
  s.ellipse(36, 40, 5.6, 6.6, C.iron).ellipse(36, 40, 4.4, 5.4, C.wood).ellipse(36.3, 40, 1.6, 1.8, C.iron);
  // Body: the sand jerkin, red sash, belt, dull breastplate.
  s.poly([[18, 30], [31, 30], [32, 44], [33, 52], [16, 52], [17, 44]], C.sand);
  s.rect(16.5, 43.5, 16.3, 3, C.brick);
  s.capsule(19, 46.5, 18, 51, 1, C.brick);
  s.rect(16.6, 46.5, 16.2, 1.6, C.leather);
  s.poly([[19, 30], [31, 30], [31.5, 37.5], [28.5, 42.5], [21, 42.5], [18.5, 37.5]], C.steel);
  s.line(25.4, 31.5, 25.2, 41, 0.35, C.steel[0]);
  s.spot(20.6, 32.4, 0.4, 0.4, C.steel[2]).spot(29.6, 32.2, 0.4, 0.4, C.steel[2]);
  s.rect(23.4, 46.1, 2.8, 2.4, C.brass);
  // Head: face, shaggy chestnut hair, the navy headband.
  face(s);
  // Shaggy chestnut hair: a full crown, spikes standing up, locks falling over the brow and by the ear.
  s.ellipse(25.5, 12, 8.6, 6, C.chestnut);
  s.taper(21, 9, 15.5, 2.5, 3.2, 0.3, C.chestnut).taper(25.5, 8, 24, 0.8, 3.2, 0.3, C.chestnut).taper(29.5, 8.5, 32.5, 2.8, 2.7, 0.3, C.chestnut);
  s.taper(19.5, 14, 18.8, 22.5, 2.1, 0.4, C.chestnut);
  s.spot(24, 9.8, 2.6, 0.75, SHEEN.chestnut).spot(29.2, 10.2, 1.4, 0.6, SHEEN.chestnut);
  s.poly([[17, 13.5], [33.5, 12.5], [34, 14.6], [17, 16]], C.navy);
  s.taper(23.4, 15, 23.8, 18.2, 1.4, 0.3, C.chestnut).taper(26.4, 14.8, 27.6, 18.8, 1.7, 0.3, C.chestnut);
  s.taper(29.4, 14.4, 31.2, 19.2, 1.8, 0.3, C.chestnut).taper(32.4, 13.9, 34.4, 18, 1.5, 0.3, C.chestnut);
  eyes(s, 20);
  brows(s, 18, C.chestnut[3]);
  s.line(31.2, 23.9, 33, 23.6, 0.5, C.cream[1]); // the cheek bandage
  // The sword, held upright at his side, then the near arm and its steel pauldron.
  // The sword, angled up in front of him, held low in the near hand.
  s.capsule(14.4, 41.2, 8.2, 22.5, 1.6, C.steel, 0.15);
  s.capsule(12.3, 43, 17.7, 41, 0.9, C.iron);
  s.capsule(15.3, 43.6, 16.4, 46.6, 0.85, C.leather);
  s.ellipse(16.7, 47.4, 1.1, 1.1, C.iron);
  s.capsule(18, 32, 16.5, 39, 2.3, C.sand).capsule(16.5, 39, 15.8, 43.5, 2.1, C.cream);
  s.ellipse(15.8, 44.8, 2.3, 2.2, C.leather);
  s.ellipse(19, 31.5, 4.2, 3.1, C.steel);
  s.offset(0, 0);
  return s;
}

export function archer(breath = 0) {
  const s = new Sprite(48, 72);
  s.offset(0, breath);
  // High ponytail and its white feather, behind the head; the quiver on her back.
  s.taper(17.5, 10, 11.2, 18, 3.2, 2.5, C.chestnut).taper(11.2, 18, 9.6, 27.5, 2.5, 0.4, C.chestnut);
  s.taper(16, 9.5, 11.8, 2.5, 1.3, 0.3, C.cream);
  s.capsule(16.5, 27, 13, 41, 2.6, C.leather);
  s.capsule(15.5, 26, 14, 21, 1, C.cream).capsule(17, 26, 17.5, 21.5, 0.9, C.ash);
  s.offset(0, 0);
  legs(s, C.umber, C.leather, 55);
  s.offset(0, breath);
  // Far arm holding the longbow out in front.
  s.capsule(31, 31, 33, 37.5, 2.1, C.cream).capsule(33, 37.5, 35, 42, 1.8, C.skin);
  s.capsule(33.6, 39, 35, 42, 2, C.leather);
  for (let i = 0; i < 6; i++) {
    const a = -1.05 + (i / 6) * 2.1;
    const b = -1.05 + ((i + 1) / 6) * 2.1;
    s.capsule(34 + Math.cos(a) * 5, 42 + Math.sin(a) * 18, 34 + Math.cos(b) * 5, 42 + Math.sin(b) * 18, 1.1, C.wood);
  }
  s.line(36.5, 26.4, 36.5, 57.6, 0.28, '#d9d2c2');
  s.ellipse(36, 43, 2, 2, C.skin);
  // Body: short tan skirt, cream shirt, moss jerkin with a V neck, chest strap, belt.
  s.poly([[17, 45], [32, 45], [33.5, 52], [15.5, 52]], C.tan);
  s.poly([[19, 29], [30, 29], [31, 45], [18, 45]], C.cream);
  s.poly([[18.5, 31], [22, 31], [24.5, 36], [27, 31], [30.5, 31], [31.5, 45], [17.5, 45]], C.moss);
  s.capsule(19.5, 31, 30, 43.5, 0.9, C.leather);
  s.rect(17.4, 44.4, 14.4, 1.6, C.leather);
  s.rect(23.6, 44, 2.4, 2.4, C.brass);
  face(s);
  s.ellipse(25.5, 12.2, 8.4, 6, C.chestnut);
  s.taper(19.3, 14.5, 19.8, 24.5, 2, 0.4, C.chestnut);
  s.spot(23.6, 9.9, 2.6, 0.75, SHEEN.chestnut).spot(28.8, 10.2, 1.5, 0.6, SHEEN.chestnut);
  s.taper(23.4, 14.6, 23.9, 18, 1.4, 0.3, C.chestnut).taper(26.5, 14.2, 27.6, 18.8, 1.7, 0.3, C.chestnut);
  s.taper(29.5, 13.8, 31.2, 19.2, 1.8, 0.3, C.chestnut).taper(32.4, 13.3, 34.2, 17.8, 1.4, 0.3, C.chestnut);
  s.ellipse(16.8, 11.5, 1.4, 1.4, C.leather); // the hair tie
  eyes(s, 20);
  brows(s, 18, C.chestnut[2]);
  s.spot(28.6, 23.6, 0.3, 0.3, C.skin[2]).spot(30.4, 23.4, 0.28, 0.28, C.skin[2]); // freckles
  // Near arm: rolled sleeve, bare forearm, the gloved hand on the strap.
  s.capsule(18, 31.5, 17, 38, 2.2, C.cream).capsule(17, 38, 19.5, 42.5, 1.8, C.skin);
  s.ellipse(20.5, 43.3, 2.1, 2, C.leather);
  s.offset(0, 0);
  return s;
}

export function mage(breath = 0) {
  const s = new Sprite(48, 72);
  s.offset(0, breath);
  // The rust scarf's two ends behind him; the staff in the far hand.
  s.taper(19.5, 29.5, 15, 41.5, 1.5, 0.9, C.rust).taper(20.5, 30, 17.2, 44, 1.4, 0.8, C.rust);
  s.offset(0, 0);
  s.capsule(37, 17, 37, 69, 1.1, C.wood);
  s.ellipse(37, 13.5, 2.7, 3.2, C.wood).ellipse(37, 13.5, 1.7, 1.9, C.ruby, 0.1);
  legs(s, C.umber, C.leather, 61, 53);
  s.offset(0, breath);
  s.capsule(31, 31, 34.5, 39, 2.5, C.indigo);
  s.ellipse(35, 40.3, 2.1, 1.8, C.ivory);
  s.ellipse(36.5, 41.6, 1.9, 1.9, C.skin);
  // The slate-indigo robe with its ivory hem, belt and spell book; the sand mantle and its hood.
  s.poly([[18, 30], [31, 30], [32.5, 44], [34, 56], [15, 56], [16.5, 44]], C.indigo);
  s.poly([[15.2, 53.5], [33.8, 53.5], [34.1, 56.2], [14.9, 56.2]], C.ivory);
  s.line(26.3, 37, 26.8, 53.4, 0.4, C.indigo[2]);
  s.rect(16.6, 43, 16.4, 1.6, C.leather);
  s.rect(23.4, 42.6, 2.4, 2.4, C.brass);
  s.rect(29.2, 44.4, 3.6, 4.4, C.leather, 0.2);
  s.ellipse(17.5, 28.5, 3.2, 2.6, C.mantle);
  s.poly([[16.5, 29], [32.5, 29], [34, 35], [29, 37], [25, 35.5], [20.5, 37], [15, 34.5]], C.mantle);
  s.ellipse(25.5, 28.6, 5.2, 2.1, C.rust);
  face(s, 20);
  // Ash-silver hair under the brim, then the faded plum hat flopping backwards.
  s.poly([[17, 24], [17, 16], [33.5, 16], [33.5, 18.5], [17.5, 18.5]], C.ash);
  s.taper(19, 17, 18.5, 25.5, 2.1, 0.4, C.ash).taper(23, 17, 23.6, 20.8, 1.6, 0.3, C.ash).taper(27, 17, 28, 21.4, 1.6, 0.3, C.ash);
  s.taper(31, 16.8, 32.5, 21.6, 1.6, 0.3, C.ash).taper(33.4, 16.5, 34.4, 20, 1.2, 0.3, C.ash);
  s.poly([[19, 14.5], [31.5, 14.5], [28.5, 6.5], [24.5, 2.5], [20, 1.5], [15.5, 3.5], [21, 6.5]], C.plum);
  s.ellipse(25.5, 15.2, 11.2, 2.7, C.plum);
  s.rect(19.6, 12.2, 11.2, 1.6, C.brass);
  eyes(s, 21);
  brows(s, 19, C.ash[3]);
  // Near arm bent forward, palm up as if about to cast.
  s.capsule(19, 31, 21, 38, 2.5, C.indigo).capsule(21, 38, 26, 39, 2.1, C.indigo);
  s.ellipse(26.8, 39, 1.8, 2, C.ivory);
  s.ellipse(29, 38.6, 2.3, 1.6, C.skin);
  s.spot(27.5, 40.5, 0.5, 0.45, C.brass[1]);
  s.offset(0, 0);
  return s;
}
