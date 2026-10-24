import sys, numpy as np
from fitarch import part
for name in sys.argv[1:]:
    img, ox, oy = part(name)
    a = img[..., 3] > 128
    ys, xs = np.nonzero(a)
    P = np.stack([xs + ox, ys + oy], 1).astype(float)
    c = P.mean(0)
    u, s, vt = np.linalg.svd(P - c, full_matrices=False)
    ax = vt[0]
    if ax[1] < 0: ax = -ax  # pointing down the sheet
    t = (P - c) @ ax
    lo, hi = t.min(), t.max()
    def band(t0, t1):
        m = (t >= t0) & (t <= t1); return P[m].mean(0)
    # skin stubs: skin-ish pixels
    rgb = img[..., :3][a].astype(int)
    skin = (rgb[:, 0] > 200) & (rgb[:, 1] > 130) & (rgb[:, 1] < 200) & (rgb[:, 2] > 80) & (rgb[:, 2] < 160)
    ts = t[skin]
    print(f"{name}: centre {c.round(1)} axis {ax.round(3)} angle {np.degrees(np.arctan2(ax[1], ax[0])):.1f} len {hi-lo:.0f} width {2*np.sqrt(s[1]**2/len(P))*1.7:.0f}")
    print(f"   top end {band(lo, lo+25).round(1)}  bottom end {band(hi-25, hi).round(1)}")
    if skin.sum():
        P2 = P[skin]
        top = P2[ts < (lo + hi) / 2]; bot = P2[ts >= (lo + hi) / 2]
        print(f"   skin top {top.mean(0).round(1) if len(top) else '-'} n {len(top)}  skin bottom {bot.mean(0).round(1) if len(bot) else '-'} n {len(bot)}")
