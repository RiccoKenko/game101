"""Draws fitted parts over the rig pose: python3 compose.py fits.json out.png key1 key2 ... [--alpha 0.5] [--crop x0,y0,x1,y1] [--scale s]"""
import json, math, sys
import numpy as np
from PIL import Image
from fitarch import part, rigimg, W, H
args = sys.argv[1:]
def opt(name, default):
    if name in args:
        i = args.index(name); v = args[i + 1]; del args[i:i + 2]; return v
    return default
alpha = float(opt('--alpha', '0.45')); crop = opt('--crop', None); scale = float(opt('--scale', '1'))
fits = json.load(open(args[0])); out = args[1]; keys = args[2:]
base = Image.new('RGBA', (W, H), (110, 110, 110, 255))
rp = Image.fromarray(rigimg.astype(np.uint8), 'RGBA')
ghost = rp.copy(); ghost.putalpha(Image.fromarray((rigimg[..., 3] * alpha).astype(np.uint8)))
base.alpha_composite(ghost)
for k in keys:
    f = fits[k]
    img, ox, oy = part(f['name'])
    pim = Image.fromarray(img.astype(np.uint8), 'RGBA')
    # rig = R s M (sheet - c) + t ; sheet = ox + local
    th = math.radians(f['th']); s = f['s']; m = -1 if f['mirror'] else 1
    A = np.array([[math.cos(th) * s * m, -math.sin(th) * s], [math.sin(th) * s * m, math.cos(th) * s]])
    b = np.array(f['t']) - A @ np.array(f['c']) + A @ np.array([ox, oy])
    Ai = np.linalg.inv(A); bi = -Ai @ b
    layer = pim.transform((W, H), Image.AFFINE, (Ai[0, 0], Ai[0, 1], bi[0], Ai[1, 0], Ai[1, 1], bi[1]), resample=Image.BILINEAR)
    base.alpha_composite(layer)
if crop:
    x0, y0, x1, y1 = map(int, crop.split(',')); base = base.crop((x0, y0, x1, y1))
if scale != 1: base = base.resize((int(base.width * scale), int(base.height * scale)))
base.save(out)
