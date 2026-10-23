/** Pixels a finger may wander before a press stops counting as a tap. */
const TAP_SLOP = 12;
/** A press longer than this is not a tap either. */
const TAP_MS = 450;

export interface GestureHandlers {
  tap?(x: number, y: number): void;
  /** One finger dragging; (x, y) is the finger now, (px, py) where it was last frame. */
  drag?(x: number, y: number, px: number, py: number): void;
  /** Two fingers: scale > 1 means spreading (zoom in). (cx, cy) is the midpoint now, (pcx, pcy) last frame. */
  pinch?(scale: number, cx: number, cy: number, pcx: number, pcy: number): void;
  /** Mouse wheel (desktop testing): positive delta zooms out. */
  wheel?(delta: number, x: number, y: number): void;
  release?(): void;
}

interface Finger {
  x: number;
  y: number;
  startX: number;
  startY: number;
  startT: number;
}

/** Tap / drag / pinch recognition on one element, in CSS pixels relative to it. */
export class Gestures {
  private fingers = new Map<number, Finger>();
  private dragging = false;
  private pinched = false;

  constructor(private el: HTMLElement, private h: GestureHandlers) {
    el.addEventListener('pointerdown', this.down);
    el.addEventListener('pointermove', this.move);
    el.addEventListener('pointerup', this.up);
    el.addEventListener('pointercancel', this.cancel);
    el.addEventListener('wheel', this.onWheel, { passive: false });
  }

  dispose(): void {
    this.el.removeEventListener('pointerdown', this.down);
    this.el.removeEventListener('pointermove', this.move);
    this.el.removeEventListener('pointerup', this.up);
    this.el.removeEventListener('pointercancel', this.cancel);
    this.el.removeEventListener('wheel', this.onWheel);
  }

  private local(e: PointerEvent | WheelEvent): [number, number] {
    const r = this.el.getBoundingClientRect();
    return [e.clientX - r.left, e.clientY - r.top];
  }

  private down = (e: PointerEvent) => {
    this.el.setPointerCapture?.(e.pointerId);
    const [x, y] = this.local(e);
    this.fingers.set(e.pointerId, { x, y, startX: x, startY: y, startT: performance.now() });
    if (this.fingers.size >= 2) this.pinched = true;
  };

  private move = (e: PointerEvent) => {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    const [x, y] = this.local(e);
    if (this.fingers.size === 1) {
      if (!this.dragging && Math.hypot(x - f.startX, y - f.startY) > TAP_SLOP) this.dragging = true;
      if (this.dragging && !this.pinched) this.h.drag?.(x, y, f.x, f.y);
      f.x = x;
      f.y = y;
      return;
    }
    const [a, b] = [...this.fingers.values()];
    const before = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
    f.x = x;
    f.y = y;
    const after = { cx: (a.x + b.x) / 2, cy: (a.y + b.y) / 2, d: Math.hypot(a.x - b.x, a.y - b.y) };
    if (before.d > 0) this.h.pinch?.(after.d / before.d, after.cx, after.cy, before.cx, before.cy);
  };

  private up = (e: PointerEvent) => {
    const f = this.fingers.get(e.pointerId);
    if (!f) return;
    this.fingers.delete(e.pointerId);
    const isTap = !this.dragging && !this.pinched && performance.now() - f.startT < TAP_MS;
    if (isTap) this.h.tap?.(f.x, f.y);
    if (this.fingers.size === 0) {
      this.dragging = false;
      this.pinched = false;
      this.h.release?.();
    }
  };

  private cancel = (e: PointerEvent) => {
    this.fingers.delete(e.pointerId);
    if (this.fingers.size === 0) {
      this.dragging = false;
      this.pinched = false;
      this.h.release?.();
    }
  };

  private onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const [x, y] = this.local(e);
    this.h.wheel?.(e.deltaY, x, y);
  };
}
