"""Prints a cut polygon (sheet px) that removes everything within `d` px of a part's peg end along its main axis.
usage: pegcut.py <fit dir> name:end:d ...   end = 'top' or 'bottom' (which end of the axis, by sheet y) holds the peg"""
import sys, json, numpy as np
sys.path.insert(0, sys.argv[1])
from fitarch import part
out = {}
for spec in sys.argv[2:]:
    name, end, d = spec.split(':'); d = float(d)
    img, ox, oy = part(name)
    a = img[..., 3] > 128
    ys, xs = np.nonzero(a)
    P = np.stack([xs + ox, ys + oy], 1).astype(float)
    c = P.mean(0)
    _, _, vt = np.linalg.svd(P - c, full_matrices=False)
    ax = vt[0]
    if (ax[1] < 0) == (end == 'top'): ax = -ax   # ax points from the peg end into the part
    t = (P - c) @ ax
    lo = t.min()
    n = np.array([-ax[1], ax[0]])
    base = c + ax * (lo + d)
    R = 200
    poly = [base + n * R, base - n * R, base - n * R - ax * R, base + n * R - ax * R]
    out[name] = [[round(float(p[0]), 1), round(float(p[1]), 1)] for p in poly]
    print(name, 'axis', ax.round(3), 'peg tip', (c + ax * lo).round(1), 'cut line through', base.round(1))
print(json.dumps(out))
