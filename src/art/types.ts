/** One piece of vector art. `w`/`h` are the texture size in game pixels (1080-wide world). */
export interface ArtDef {
  w: number;
  h: number;
  svg: string;
}

export type ArtSet = Record<string, ArtDef>;

/** Wraps SVG body markup in a complete, self-sized <svg> document. */
export function svg(w: number, h: number, body: string): ArtDef {
  return {
    w,
    h,
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">${body}</svg>`,
  };
}
