import { describe, expect, it } from 'vitest';
import { clampView, minZoom, pan, toMap, toScreen, zoomAt, type Bounds } from '../../src/play/view';

const B: Bounds = { screenW: 852, screenH: 393, mapW: 1536, mapH: 1024, maxZoom: 1.5 };

describe('battle camera', () => {
  it('converts between screen and map both ways', () => {
    const v = { cx: 700, cy: 500, zoom: 0.8 };
    expect(toMap(v, B, [426, 196.5])).toEqual([700, 500]);
    const p = toMap(v, B, [100, 50]);
    const back = toScreen(v, B, p);
    expect(back[0]).toBeCloseTo(100);
    expect(back[1]).toBeCloseTo(50);
  });

  it('never zooms out past the whole map, and keeps the view on the map', () => {
    expect(minZoom(B)).toBeCloseTo(393 / 1024);
    const far = clampView({ cx: 0, cy: 0, zoom: 0.1 }, B);
    expect(far.zoom).toBeCloseTo(393 / 1024);
    expect(far.cy).toBe(512);
    const corner = clampView({ cx: 5000, cy: -50, zoom: 1 }, B);
    expect(corner).toEqual({ cx: 1536 - 426, cy: 196.5, zoom: 1 });
  });

  it('pinch-zoom keeps the point under the fingers still; dragging moves the map with the finger', () => {
    const v = { cx: 768, cy: 512, zoom: 0.7 };
    const at: [number, number] = [300, 200];
    const before = toMap(v, B, at);
    const after = toMap(zoomAt(v, B, 1.4, at), B, at);
    expect(after[0]).toBeCloseTo(before[0]);
    expect(after[1]).toBeCloseTo(before[1]);
    const moved = pan(v, B, 70, 0);
    expect(moved.cx).toBeCloseTo(768 - 100);
  });
});
