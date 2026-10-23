"""Talon's variant of fit.py: fits sliced parts onto the rig pose by colour, for pictures with a REAL transparent
background (foreground = alpha, not "not magenta"), and straight onto the trimmed rig pose
(art/sliced/talon/rigpose.png), so every result is already in rig coordinates.

Usage (from the repository root):
  python3 scripts/tools/talon_fit.py <part> cx cy scale [angle] [m]   fit one part from a guess (prints JSON)
  python3 scripts/tools/talon_fit.py all                              fit every part in GUESSES -> talon_fit.json
  python3 scripts/tools/talon_fit.py compose <out.png> [key,key,...]   draw the fits (back to front) beside the rig pose

A fit is a similarity transform from sheet pixels to rig pixels: p' = R(th)·(p - c)·s + t (x mirrored first if m).
"""
import json, math, os, sys
import numpy as np
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '../..'))
HERE = os.path.dirname(os.path.abspath(__file__))
CHAR = 'talon'
man = json.load(open(f'{ROOT}/art/sliced/{CHAR}/manifest.json'))
_rig = np.asarray(Image.open(f'{ROOT}/art/sliced/{CHAR}/rigpose.png').convert('RGBA')).astype(np.int16)
rig = _rig[..., :3]
H, W, _ = rig.shape
rig_fg = _rig[..., 3] > 128

# Starting guesses: rig-pose centre of the part, scale, angle (degrees), mirrored, angle search spread, fixed scale.
GUESSES = {
    'head': dict(cx=760, cy=640, s=0.75),
    'body': dict(cx=690, cy=900, s=1.15),
    'tail': dict(cx=330, cy=985, s=1.2),
    'wing-near-in': dict(cx=450, cy=500, s=1.3, th=20, spread=40),
    'wing-near-out': dict(cx=230, cy=400, s=1.3, spread=40),
    'wing-far-in': dict(cx=990, cy=600, s=1.1, th=-30, fix_s=True),  # foreshortened in the rig pose: scale pinned
    'wing-far-out': dict(cx=1000, cy=470, s=1.3, th=-43, spread=20, fix_s=True),
    'leg-near': dict(cx=600, cy=1160, s=0.7),
    'leg-far': dict(cx=820, cy=1170, s=0.7),
}


def part(name):
    """A sliced part as RGBA, and where its picture's top-left sits on its sheet (the slices have 8 px padding)."""
    for sheet, e in man.items():
        for p in e['parts']:
            if p['name'] == name:
                img = np.asarray(Image.open(f"{ROOT}/art/sliced/{CHAR}/{p['file']}").convert('RGBA')).astype(np.int16)
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


def compose(fits, order, out):
    canvas = np.zeros((H, W, 4), np.float64)
    ys, xs = np.mgrid[0:H, 0:W]
    for key in order:
        f = fits[key]
        img, ox, oy = part(f['name'])
        th = math.radians(f['th']); s = f['s']; c = np.array(f['c']); t = np.array(f['t'])
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
    bgc = np.array([250, 5, 250.0])
    comp = canvas[..., :3] * canvas[..., 3:4] + bgc * (1 - canvas[..., 3:4])
    ra = _rig[..., 3:4] / 255
    rigv = rig * ra + bgc * (1 - ra)
    both = np.concatenate([rigv.astype(np.uint8), comp.astype(np.uint8)], 1)
    Image.fromarray(both).save(out)


if __name__ == '__main__':
    a = sys.argv[1:]
    out_json = os.path.join(HERE, 'talon_fit.json')
    if a[0] == 'all':
        fits = json.load(open(out_json)) if os.path.exists(out_json) else {}
        for key in (a[1].split(',') if len(a) > 1 else GUESSES):
            g = GUESSES[key]
            fits[key] = fit(g.get('part', key), g['cx'], g['cy'], g['s'], g.get('th', 0.0), g.get('m', False), g.get('spread', 25), g.get('fix_s', False))
            print(key, json.dumps(fits[key]))
        json.dump(fits, open(out_json, 'w'), indent=1)
    elif a[0] == 'compose':
        fits = json.load(open(out_json))
        compose(fits, a[2].split(',') if len(a) > 2 else list(fits), a[1])
    else:
        r = fit(a[0], float(a[1]), float(a[2]), float(a[3]), float(a[4]) if len(a) > 4 else 0.0, len(a) > 5 and a[5] == 'm')
        print(json.dumps(r))
