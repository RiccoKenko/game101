"""(parrot_raider variant of fit.py: uses the rig pose's alpha channel instead of a magenta background.)
Fits each sliced part onto the rig pose: finds scale, angle, (mirror) and position where its colours match best.

Usage: python3 parrot_raider_fit.py <part> cx cy scale [angle] [m]
  Starts from a guess (rig-pose centre cx,cy, scale, angle in degrees, m = mirrored) and prints the best
  similarity transform from sheet pixels to the ORIGINAL rig-pose picture. Needs `npm run art -- <char>` first.
  Watch out: a part can slide onto a same-coloured neighbour (hands onto forearms); then pin the scale (fix_s)
  or place it by hand.
"""
import json, math, sys
import numpy as np
from PIL import Image

import os
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
char = os.environ.get('CHAR', 'parrot_raider')
man = json.load(open(f'{ROOT}/art/sliced/{char}/manifest.json'))
_rgba = np.asarray(Image.open(f'{ROOT}/art/incoming/{char}/{char}_rigpose.webp').convert('RGBA')).astype(np.int16)
rig = _rgba[..., :3]
H, W, _ = rig.shape
# This character's pictures have a real transparent background: foreground = opaque pixels.
rig_fg = _rgba[..., 3] > 128

def part(name):
    for sheet, e in man.items():
        for k, p in enumerate(e['parts']):
            if p['name'] == name:
                idx = [q['name'] for q in e['parts']].index(name)
                files = __import__('os').listdir(f'{ROOT}/art/sliced/{char}/{sheet}')
                f = [x for x in files if x.endswith(f'-{name}.png')][0]
                img = np.asarray(Image.open(f'{ROOT}/art/sliced/{char}/{sheet}/{f}').convert('RGBA')).astype(np.int16)
                return img, p['x'] - 8, p['y'] - 8
    raise SystemExit('no part ' + name)

def samples(img, ox, oy, stride=3):
    ys, xs = np.mgrid[0:img.shape[0]:stride, 0:img.shape[1]:stride]
    a = img[ys, xs, 3] > 200
    return np.stack([xs[a] + ox, ys[a] + oy], 1).astype(np.float64), img[ys[a], xs[a], :3]

def transform(P, c, s, th, mirror, t):
    q = P - c
    if mirror: q = q * np.array([-1, 1])
    R = np.array([[math.cos(th), -math.sin(th)], [math.sin(th), math.cos(th)]])
    return q @ R.T * s + t

def error(P, cols, c, s, th, mirror, t):
    Q = np.rint(transform(P, c, s, th, mirror, t)).astype(int)
    inside = (Q[:, 0] >= 0) & (Q[:, 0] < W) & (Q[:, 1] >= 0) & (Q[:, 1] < H)
    d = np.full(len(Q), 120.0)
    qi = Q[inside]
    rc = rig[qi[:, 1], qi[:, 0]]
    diff = np.minimum(np.abs(rc - cols[inside]).mean(1), 120)
    diff[~rig_fg[qi[:, 1], qi[:, 0]]] = 120
    d[inside] = diff
    return d.mean()

def fit(name, cx, cy, s0, th0=0.0, mirror=False, spread=25, fix_s=False):
    img, ox, oy = part(name)
    P, cols = samples(img, ox, oy)
    c = P.mean(0)
    best = None
    for dth in range(-spread, spread + 1, 5):
        x = [cx, cy, s0, math.radians(th0 + dth)]
        e = error(P, cols, c, x[2], x[3], mirror, np.array(x[:2]))
        for step in [16, 8, 4, 2, 1, 0.5]:
            improved = True
            while improved:
                improved = False
                for i, delta in [(0, step), (1, step), (2, 0 if fix_s else step * 0.006), (3, math.radians(step * 0.25))]:
                    if delta == 0: continue
                    for sgn in (1, -1):
                        y = list(x); y[i] += sgn * delta
                        ey = error(P, cols, c, y[2], y[3], mirror, np.array(y[:2]))
                        if ey < e - 1e-6:
                            x, e, improved = y, ey, True
        if best is None or e < best[0]:
            best = (e, x)
    e, x = best
    return {'name': name, 'err': round(e, 2), 'c': [round(v, 1) for v in c], 's': round(x[2], 4), 'th': round(math.degrees(x[3]), 2),
            'mirror': mirror, 't': [round(x[0], 1), round(x[1], 1)]}

if __name__ == '__main__':
    a = sys.argv[1:]
    # FIX_S=1 pins the scale (small parts otherwise shrink onto a same-coloured patch); SPREAD sets the angle search.
    r = fit(a[0], float(a[1]), float(a[2]), float(a[3]), float(a[4]) if len(a) > 4 else 0.0, len(a) > 5 and a[5] == 'm',
            spread=int(os.environ.get('SPREAD', 25)), fix_s=os.environ.get('FIX_S') == '1')
    print(json.dumps(r))
