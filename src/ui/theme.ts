export const FONT = 'Fredoka, "Arial Rounded MT Bold", sans-serif';

export const COLORS = {
  bg: 0x1d1630,
  outline: 0x2a1f3d,
  cream: 0xfff4d6,
  creamDark: 0xe8d5a8,
  green: 0x5ad15a,
  orange: 0xffb238,
  blue: 0x4aa3ff,
  red: 0xff5d5d,
  purple: 0xa77bff,
  grey: 0x8a8a9a,
  gold: 0xffcc33,
  xp: 0x3fa9ff,
  hp: 0xff4d5e,
};

export const CSS = {
  white: '#ffffff',
  dark: '#2a1f3d',
  gold: '#ffcc33',
  green: '#3fae3f',
  blue: '#2f7fd8',
  red: '#e64545',
  muted: '#7a6e8f',
};

/** Returns a darker shade of a 0xRRGGBB color. */
export function shade(color: number, factor = 0.75): number {
  const r = Math.round(((color >> 16) & 0xff) * factor);
  const g = Math.round(((color >> 8) & 0xff) * factor);
  const b = Math.round((color & 0xff) * factor);
  return (r << 16) | (g << 8) | b;
}
