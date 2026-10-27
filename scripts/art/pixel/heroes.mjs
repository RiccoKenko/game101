/**
 * Ricco Rush sample sprites in the classic online-RPG look: about 3.5 heads tall, small calm faces, big boots,
 * earthy colours. 48 x 72 pixels, facing right in a three-quarter view (the near arm is on the left of the picture).
 * `breath` lowers everything above the knees by a pixel, for a two-frame idle.
 */
import { Sprite } from './engine.mjs';

/** 4-tone ramps: highlight, base, shade, outline. */
export const C = {
  skin: ['#fde6cc', '#f2c9a3', '#d9a07c', '#7e4f3b'],
  chestnut: ['#ad7650', '#8a573a', '#66402b', '#38231a'],
  navy: ['#66779e', '#4a5980', '#354262', '#1d2337'],
  steel: ['#dfe3e7', '#b0b7bf', '#848c96', '#434953'],
  sand: ['#eedfbd', '#d7c196', '#b39b72', '#6a583d'],
  brick: ['#cc735d', '#a9523f', '#843a2d', '#481e18'],
  leather: ['#a87b52', '#87603e', '#684830', '#37251a'],
  slate: ['#8f9fb4', '#6f8097', '#56657b', '#2d3644'],
  cream: ['#fcf4e1', '#ebdfc3', '#ccbd9c', '#776c55'],
  wood: ['#cc9a61', '#a8794a', '#845c37', '#4a311d'],
  iron: ['#a3a9b0', '#7b8189', '#5a5f67', '#2b2e33'],
  moss: ['#a1b578', '#80955a', '#627545', '#323f25'],
  tan: ['#d8ad78', '#b88b58', '#946b43', '#53381f'],
  umber: ['#80614d', '#624838', '#49362b', '#291c16'],
  indigo: ['#8188b2', '#656c96', '#4d5377', '#292c44'],
  ivory: ['#fffbf2', '#efe6d1', '#d2c6aa', '#7f7660'],
  mantle: ['#cca97e', '#aa8860', '#876a49', '#4a3926'],
  rust: ['#d3734e', '#b05638', '#893f29', '#4a2014'],
  plum: ['#9e7e8a', '#7e606d', '#624854', '#35252d'],
  ash: ['#e6e6ea', '#c6c7cf', '#9fa1ad', '#575864'],
  ruby: ['#ff9384', '#d8463c', '#a02a26', '#561414'],
  brass: ['#e8cc7e', '#c5a559', '#9c7f3f', '#5a4822'],
  peach: ['#ffdcc6', '#f7b394', '#df8b6b', '#874735'],
  leaf: ['#b8d97e', '#8db457', '#6a8d3f', '#34471e'],
};
const EYE = '#2b1c18';

/** Boots and legs, shared by all three heroes (x of the near and far foot, top of the boot). */
function legs(s, ramp, boot, bootTop, kneeY = 50) {
  s.capsule(28.5, kneeY, 29, bootTop + 2, 2.4, ramp);
  s.poly([[26, bootTop], [31.5, bootTop], [31.5, 66], [33.5, 67], [33.5, 70], [26, 70]], boot);
  s.capsule(21, kneeY, 20.5, bootTop + 2, 2.5, ramp);
  s.poly([[17.5, bootTop], [23.5, bootTop], [23.5, 66], [26, 67], [26, 70], [17.5, 70]], boot);
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
  // Small dark eyes (the far one a touch narrower), a tiny mouth: a calm sprite face.
  s.dots([[27, cy], [27, cy + 1], [28, cy]], EYE);
  s.dots([[31, cy], [31, cy + 1]], EYE);
  s.dot(28, cy + 1, '#6b4a3c');
  s.dot(29, cy + 5, '#b5735a');
}

export function swordman(breath = 0) {
  const s = new Sprite(48, 72);
  // Headband tails behind the head.
  s.offset(0, breath);
  s.capsule(17, 15, 12, 19, 1.1, C.navy).capsule(17, 16, 13, 23, 1.1, C.navy);
  // Spikes at the back of the head, behind everything else up there.
  s.capsule(19, 11, 13.5, 8.5, 1.6, C.chestnut).capsule(18.5, 15, 13, 15.5, 1.5, C.chestnut);
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
  // Head: face, shaggy chestnut hair, the navy headband.
  face(s);
  // Shaggy chestnut hair: a full crown, spikes standing up, locks falling over the brow and by the ear.
  s.ellipse(25.5, 12, 8.6, 6, C.chestnut);
  s.capsule(22, 8, 18.5, 4.5, 1.6, C.chestnut).capsule(26.5, 7, 24.5, 3.5, 1.5, C.chestnut).capsule(30, 7.5, 30.5, 4.5, 1.3, C.chestnut);
  s.capsule(19, 15, 18.8, 22, 1.4, C.chestnut);
  s.poly([[17, 13.5], [33.5, 12.5], [34, 14.6], [17, 16]], C.navy);
  s.capsule(26.5, 15, 27.5, 18, 1, C.chestnut).capsule(29.5, 14.5, 31, 18.5, 1.1, C.chestnut).capsule(32.5, 14, 34, 17.5, 1, C.chestnut);
  eyes(s, 20);
  s.dots([[26, 18], [27, 18], [30, 18], [31, 18]], C.chestnut[3]);
  s.dots([[31, 23], [32, 23]], C.cream[1]); // the cheek bandage
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
  s.capsule(17.5, 10, 11.5, 19, 2.6, C.chestnut).capsule(11.5, 19, 10.5, 25, 1.9, C.chestnut);
  s.capsule(16, 9, 12.5, 3.5, 1, C.cream);
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
  for (let y = 26; y <= 58; y++) s.dot(36.5, y, '#d9d2c2');
  s.ellipse(36, 43, 2, 2, C.skin);
  // Body: short tan skirt, cream shirt, moss jerkin with a V neck, chest strap, belt.
  s.poly([[17, 45], [32, 45], [33.5, 52], [15.5, 52]], C.tan);
  s.poly([[19, 29], [30, 29], [31, 45], [18, 45]], C.cream);
  s.poly([[18.5, 31], [22, 31], [24.5, 36], [27, 31], [30.5, 31], [31.5, 45], [17.5, 45]], C.moss);
  s.capsule(19.5, 31, 30, 43.5, 0.9, C.leather);
  s.rect(17.4, 44.4, 14.4, 1.6, C.leather);
  face(s);
  s.ellipse(25.5, 12.2, 8.4, 6, C.chestnut);
  s.capsule(19, 15, 19.3, 23.5, 1.5, C.chestnut);
  s.capsule(27, 14.5, 28, 18, 1.1, C.chestnut).capsule(30, 14, 31.5, 18.5, 1.1, C.chestnut).capsule(33, 13.5, 34, 17, 0.9, C.chestnut);
  s.ellipse(16.8, 11.5, 1.4, 1.4, C.leather); // the hair tie
  eyes(s, 20);
  s.dots([[26, 18], [27, 18], [30, 18], [31, 18]], C.chestnut[2]);
  s.dots([[28, 23], [30, 23]], C.skin[2]); // freckles
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
  s.capsule(19.5, 29.5, 15.5, 41, 1.1, C.rust).capsule(20.5, 30, 17.5, 43.5, 1, C.rust);
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
  s.rect(16.6, 43, 16.4, 1.6, C.leather);
  s.rect(29.2, 44.4, 3.6, 4.4, C.leather, 0.2);
  s.ellipse(17.5, 28.5, 3.2, 2.6, C.mantle);
  s.poly([[16.5, 29], [32.5, 29], [34, 35], [29, 37], [25, 35.5], [20.5, 37], [15, 34.5]], C.mantle);
  s.ellipse(25.5, 28.6, 5.2, 2.1, C.rust);
  face(s, 20);
  // Ash-silver hair under the brim, then the faded plum hat flopping backwards.
  s.poly([[17, 24], [17, 16], [33.5, 16], [33.5, 18.5], [17.5, 18.5]], C.ash);
  s.capsule(19, 17, 19, 24, 1.4, C.ash).capsule(23, 17, 23.5, 20, 1, C.ash).capsule(27, 17, 27.8, 20.5, 1, C.ash).capsule(31, 17, 32, 21, 1, C.ash);
  s.poly([[19, 14.5], [31.5, 14.5], [28.5, 6.5], [24.5, 2.5], [20, 1.5], [15.5, 3.5], [21, 6.5]], C.plum);
  s.ellipse(25.5, 15.2, 11.2, 2.7, C.plum);
  s.rect(19.6, 12.2, 11.2, 1.6, C.brass);
  eyes(s, 21);
  s.dots([[26, 19], [27, 19], [30, 19], [31, 19]], C.ash[3]);
  // Near arm bent forward, palm up as if about to cast.
  s.capsule(19, 31, 21, 38, 2.5, C.indigo).capsule(21, 38, 26, 39, 2.1, C.indigo);
  s.ellipse(26.8, 39, 1.8, 2, C.ivory);
  s.ellipse(29, 38.6, 2.3, 1.6, C.skin);
  s.dot(27, 40, C.brass[1]);
  s.offset(0, 0);
  return s;
}

/** Gummy, the peach jelly of Greenhill Fields. `squash` widens and lowers it, for a hop. */
export function gummy(squash = 0) {
  const s = new Sprite(32, 28);
  const top = 7 + squash;
  s.capsule(16, top, 16, top - 3.5, 0.8, C.leaf);
  s.ellipse(12.5, top - 4.5, 3.4, 2, C.leaf, 0.2).ellipse(19.5, top - 4.5, 3.4, 2, C.leaf, 0.2);
  s.ellipse(16, 18 + squash / 2, 12 + squash, 9.5 - squash / 2, C.peach);
  for (let x = 0; x < 32; x++) for (let y = 26; y < 28; y++) s.part[y * 32 + x] = -1;
  const ey = 15 + squash;
  s.dots([[12, ey], [12, ey + 1], [12, ey + 2], [13, ey + 1], [13, ey + 2], [19, ey], [19, ey + 1], [19, ey + 2], [20, ey + 1], [20, ey + 2]], EYE);
  s.dots([[13, ey], [20, ey]], '#ffffff');
  s.dots([[15, ey + 4], [16, ey + 5], [17, ey + 4]], '#a5503c');
  s.dots([[9, 12 + squash], [10, 12 + squash], [9, 13 + squash]], '#fff4ea');
  return s;
}
