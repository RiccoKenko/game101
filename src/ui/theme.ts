export const FONT = 'Fredoka, "Arial Rounded MT Bold", sans-serif';

/** Navy glass windows with thin gold trim: the HUD, dialogs and map cards. */
export const WINDOW = {
  fillTop: 0x22365e,
  fill: 0x16233f,
  fillBottom: 0x0f1930,
  alpha: 0.86,
  gold: 0xe3c27a,
  goldLight: 0xfbe9b4,
  goldDark: 0xa27b38,
  /** Dark line outside the gold so edges stay crisp on bright art. */
  rim: 0x070c1a,
  /** Pale hairline just inside the border. */
  highlight: 0xc9dbff,
  shadow: 0x02040c,
};

/** Light parchment for choice cards (level-up, chest rewards, shop items). */
export const PARCHMENT = {
  fillTop: 0xfaf2de,
  fill: 0xf4e9cf,
  fillBottom: 0xe8d6ad,
  border: 0xd1aa5f,
  rule: 0xb48f55,
  rim: 0x4a3320,
  ink: '#3b2a1e',
  inkSoft: '#6d5641',
};

export const COLORS = {
  bg: 0x0f1830,
  /** Darkest navy ink, used for outlines and empty tracks. */
  outline: 0x0b1226,
  navy: 0x1f3260,
  cream: 0xfff4d6,
  creamDark: 0xe8d5a8,
  green: 0x4cb848,
  orange: 0xf0a033,
  blue: 0x3d86df,
  red: 0xd94848,
  purple: 0x9466e0,
  grey: 0x7a8296,
  gold: 0xf2c14e,
  hp: 0x5ed04c,
  xp: 0x3ea8ff,
  danger: 0xe8434f,
};

/** Button colour variants. */
export const BUTTON = {
  primary: COLORS.green,
  secondary: COLORS.blue,
  warning: COLORS.orange,
  danger: COLORS.red,
  purple: COLORS.purple,
  system: COLORS.navy,
};

export const CSS = {
  white: '#ffffff',
  /** Text outline. */
  dark: '#0d1428',
  cream: '#fff3d6',
  /** Secondary text on navy. */
  soft: '#b4c2e0',
  muted: '#8794b4',
  gold: '#ffd66b',
  green: '#86ea6e',
  blue: '#8fd0ff',
  red: '#ff7d7d',
  ink: PARCHMENT.ink,
  inkSoft: PARCHMENT.inkSoft,
};

/** Returns a darker shade of a 0xRRGGBB color. */
export function shade(color: number, factor = 0.75): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}

/** Moves a 0xRRGGBB color toward white by `amount` (0..1). */
export function lighten(color: number, amount = 0.25): number {
  const f = (c: number) => Math.round(c + (255 - c) * amount);
  return (f((color >> 16) & 0xff) << 16) | (f((color >> 8) & 0xff) << 8) | f(color & 0xff);
}

/** CSS rgba() string for canvas drawing. */
export function rgba(color: number, alpha = 1): string {
  return `rgba(${(color >> 16) & 0xff},${(color >> 8) & 0xff},${color & 0xff},${alpha})`;
}

/** CSS #rrggbb string. */
export function hex(color: number): string {
  return `#${color.toString(16).padStart(6, '0')}`;
}
