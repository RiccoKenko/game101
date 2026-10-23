"""Draws fitted parts in z order next to the rig pose, to check the fit.

Usage: CHAR=deckhand python3 compose.py <fits.json> <comma-separated keys, back to front> <out.png>
"""
import json, math, sys
import numpy as np
from PIL import Image
from fit import part, rig, W, H
fits = json.load(open(sys.argv[1] if len(sys.argv) > 1 else 'dh-fit.json'))
order = sys.argv[2].split(',') if len(sys.argv) > 2 else list(fits)
canvas = np.zeros((H, W, 4), np.float64)
ys, xs = np.mgrid[0:H, 0:W]
for key in order:
    f = fits[key]
    img, ox, oy = part(f['name'])
    th = math.radians(f['th']); s = f['s']; c = np.array(f['c']); t = np.array(f['t'])
    # inverse: q = R^-1 (p - t)/s ; if mirror q.x *= -1 ; sheet = q + c
    px = (xs - t[0]) / s; py = (ys - t[1]) / s
    qx = math.cos(th) * px + math.sin(th) * py
    qy = -math.sin(th) * px + math.cos(th) * py
    if f['mirror']: qx = -qx
    sx = np.rint(qx + c[0] - ox).astype(int); sy = np.rint(qy + c[1] - oy).astype(int)
    ok = (sx >= 0) & (sx < img.shape[1]) & (sy >= 0) & (sy < img.shape[0])
    col = np.zeros((H, W, 4)); col[ok] = img[sy[ok], sx[ok]]
    a = col[..., 3:4] / 255
    canvas[..., :3] = col[..., :3] * a + canvas[..., :3] * (1 - a)
    canvas[..., 3:4] = a + canvas[..., 3:4] * (1 - a)
bgc = np.array([235, 235, 235.0])
comp = canvas[..., :3] * canvas[..., 3:4] + bgc * (1 - canvas[..., 3:4])
both = np.concatenate([rig.astype(np.uint8), comp.astype(np.uint8)], 1)
Image.fromarray(both).resize((W, H // 2)).save(sys.argv[3] if len(sys.argv) > 3 else 'dh-compose.png')
