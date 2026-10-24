"""Fits sliced archer parts onto the trimmed rig pose (similarity transform sheet -> rig, optional mirror).
fit(name, cx, cy, s0, th0, mirror, spread, region) ; region = (x0,y0,x1,y1) in SHEET px limiting the samples."""
import json, math, os, sys
import numpy as np
from PIL import Image
SP = os.environ.get('SP', os.getcwd())  # the sky-pirates-td checkout (run from its root)
D = f'{SP}/art/sliced/archer'
man = json.load(open(f'{D}/manifest.json'))
rigimg = np.asarray(Image.open(f'{D}/rigpose.png').convert('RGBA')).astype(np.int16)
rig = rigimg[..., :3]
H, W, _ = rig.shape
rig_fg = rigimg[..., 3] > 128

def part(name):
    for sheet, e in man.items():
        for p in e['parts']:
            if p['name'] == name:
                img = np.asarray(Image.open(f"{D}/{p['file']}").convert('RGBA')).astype(np.int16)
                return img, p['x'] - 8, p['y'] - 8
    raise SystemExit('no part ' + name)

def samples(img, ox, oy, stride=3, region=None):
    ys, xs = np.mgrid[0:img.shape[0]:stride, 0:img.shape[1]:stride]
    a = img[ys, xs, 3] > 200
    if region:
        X, Y = xs + ox, ys + oy
        a &= (X >= region[0]) & (Y >= region[1]) & (X < region[2]) & (Y < region[3])
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

def fit(name, cx, cy, s0, th0=0.0, mirror=False, spread=25, region=None, fix_s=False, step_th=5):
    img, ox, oy = part(name)
    P, cols = samples(img, ox, oy, region=region)
    c = P.mean(0)
    best = None
    for dth in range(-spread, spread + 1, step_th):
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

def tf(f, p):
    qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
    if f['mirror']: qx = -qx
    th = math.radians(f['th'])
    return [round((qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0], 1), round((qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1], 1)]

if __name__ == '__main__':
    out_file = sys.argv[1]
    jobs = json.loads(sys.argv[2])
    fits = json.load(open(out_file)) if os.path.exists(out_file) else {}
    for key, j in jobs.items():
        r = fit(j['name'], *j['g'], **j.get('kw', {}))
        fits[key] = r
        print(key, json.dumps(r), flush=True)
    json.dump(fits, open(out_file, 'w'), indent=1)
