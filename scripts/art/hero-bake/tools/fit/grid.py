import sys
from PIL import Image, ImageDraw
src, out = sys.argv[1], sys.argv[2]
x0, y0, x1, y1 = map(int, sys.argv[3:7]) if len(sys.argv) > 6 else (0, 0, None, None)
step = int(sys.argv[7]) if len(sys.argv) > 7 else 50
scale = float(sys.argv[8]) if len(sys.argv) > 8 else 1
im = Image.open(src).convert('RGBA')
if x1 is None: x1, y1 = im.size
bg = Image.new('RGBA', im.size, (120, 120, 120, 255)); bg.alpha_composite(im)
crop = bg.crop((x0, y0, x1, y1))
if scale != 1: crop = crop.resize((int(crop.width * scale), int(crop.height * scale)), Image.NEAREST)
d = ImageDraw.Draw(crop)
for gx in range((x0 // step) * step, x1 + 1, step):
    if gx < x0: continue
    X = (gx - x0) * scale
    d.line([(X, 0), (X, crop.height)], fill=(0, 255, 255, 255) if gx % 100 == 0 else (0, 160, 160, 255), width=1)
    if gx % 100 == 0: d.text((X + 2, 2), str(gx), fill=(255, 255, 0, 255))
for gy in range((y0 // step) * step, y1 + 1, step):
    if gy < y0: continue
    Y = (gy - y0) * scale
    d.line([(0, Y), (crop.width, Y)], fill=(0, 255, 255, 255) if gy % 100 == 0 else (0, 160, 160, 255), width=1)
    if gy % 100 == 0: d.text((2, Y + 2), str(gy), fill=(255, 255, 0, 255))
crop.save(out)
