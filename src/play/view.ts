/** The battle camera: which part of the map is on screen, at what zoom, kept inside the map. */
import type { Pt } from '../td/path';

export interface View {
  /** Map point at the centre of the screen. */
  cx: number;
  cy: number;
  /** Screen pixels per map pixel. */
  zoom: number;
}

export interface Bounds {
  screenW: number;
  screenH: number;
  mapW: number;
  mapH: number;
  maxZoom: number;
}

/** Smallest zoom: the whole map fits on screen. */
export function minZoom(b: Bounds): number {
  return Math.min(b.screenW / b.mapW, b.screenH / b.mapH);
}

/** Keeps the zoom in range and the view over the map (centred on an axis where the map is smaller than the screen). */
export function clampView(v: View, b: Bounds): View {
  const zoom = Math.min(b.maxZoom, Math.max(minZoom(b), v.zoom));
  const axis = (c: number, screen: number, map: number) => {
    const half = screen / zoom / 2;
    return half * 2 >= map ? map / 2 : Math.min(map - half, Math.max(half, c));
  };
  return { zoom, cx: axis(v.cx, b.screenW, b.mapW), cy: axis(v.cy, b.screenH, b.mapH) };
}

export function toMap(v: View, b: Bounds, [x, y]: Pt): Pt {
  return [v.cx + (x - b.screenW / 2) / v.zoom, v.cy + (y - b.screenH / 2) / v.zoom];
}

export function toScreen(v: View, b: Bounds, [x, y]: Pt): Pt {
  return [(x - v.cx) * v.zoom + b.screenW / 2, (y - v.cy) * v.zoom + b.screenH / 2];
}

/** Zooms by `factor` keeping the map point under the screen point `at` where it is. */
export function zoomAt(v: View, b: Bounds, factor: number, at: Pt): View {
  const before = toMap(v, b, at);
  const zoomed = clampView({ ...v, zoom: v.zoom * factor }, b);
  const after = toMap(zoomed, b, at);
  return clampView({ ...zoomed, cx: zoomed.cx + before[0] - after[0], cy: zoomed.cy + before[1] - after[1] }, b);
}

/** Drags the map with a finger moving by (dx, dy) screen pixels. */
export function pan(v: View, b: Bounds, dx: number, dy: number): View {
  return clampView({ ...v, cx: v.cx - dx / v.zoom, cy: v.cy - dy / v.zoom }, b);
}
