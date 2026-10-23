"""Builds art/rigs/mochi.json from the automatic fits (mochi_fit.json) plus hand-measured points (far fin, face).

Mochi is one rigid body sprite, so the "bend" comes from the bones around it: the body pitches about its
middle, the tail fluke strokes about the tail stock, the fins paddle about their roots and the cloud spout
wobbles on a spring. Run from anywhere: python3 scripts/tools/mochi_rig.py
"""
import json, math, os, sys

os.environ['CHAR'] = 'mochi'
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from fit import man, ROOT  # noqa: E402

fits = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'mochi_fit.json')))
boxes = {p['name']: p for e in man.values() for p in e['parts']}

# Rig coordinates are pixels of the trimmed rig-pose picture (art/sliced/mochi/rigpose.png); the fits are in
# the original picture, which is that plus (OX, OY).
rp = man['rigpose']['parts'][0]
OX, OY = rp['x'] - 8, rp['y'] - 8
r1 = lambda v: round(v, 1)


def tf(f, p):
    """Sheet point -> trimmed rig point through a fitted similarity transform."""
    qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
    if f['mirror']: qx = -qx
    th = math.radians(f['th'])
    x = (qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0]
    y = (qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1]
    return [r1(x - OX), r1(y - OY)]


def fitted(name, bone, z, a, b, **extra):
    f = fits[name]
    return {'name': name, 'img': f['name'], 'bone': bone, 'z': z, 'from': [a, b], 'to': [tf(f, a), tf(f, b)], **extra}


def similar(name, img, bone, z, anchor, at, s, deg=0.0, **extra):
    """A part placed by one sheet point landing on a rig point, at scale s and turned by deg (y-down, clockwise)."""
    th = math.radians(deg)
    b = [anchor[0] + 100, anchor[1]]
    B = [r1(at[0] + 100 * s * math.cos(th)), r1(at[1] + 100 * s * math.sin(th))]
    return {'name': name, 'img': img, 'bone': bone, 'z': z, 'from': [anchor, b], 'to': [[r1(at[0]), r1(at[1])], B], **extra}


body = fits['body']
# Joints on the rig pose (trimmed pixels).
CENTRE = tf(body, [860, 380])            # middle of the body: it pitches and squashes about here
TAIL_BASE = [315, 436]                   # in the tail stock, just inside where the body was cut open over the fluke's stalk
FIN_NEAR = tf(fits['fin-near'], [790, 738])   # inside the near fin's rounded root
FIN_FAR = [1110, 640]                    # where the far fin tucks behind the belly
BLOWHOLE = tf(fits['spout'], [1355, 940])     # foot of the spout's stem
GROUND = [r1(tf(body, [900, 612])[0]), r1(tf(body, [900, 612])[1])]  # under the belly

bones = [
    {'name': 'body', 'at': CENTRE},
    {'name': 'tail', 'parent': 'body', 'at': TAIL_BASE},
    {'name': 'fin.far', 'parent': 'body', 'at': FIN_FAR},
    {'name': 'fin.near', 'parent': 'body', 'at': FIN_NEAR},
    {'name': 'spout', 'parent': 'body', 'at': BLOWHOLE},
]

parts = [
    # The cloud's stem goes down into the blowhole, behind the body's top edge.
    fitted('spout', 'spout', 4, [1355, 940], [1330, 680]),
    # Far fin, behind the belly and a little darker. Hand-placed by its tip and the notches of its fluffy edge
    # (the automatic fit slid onto the belly): sheet tip / bottom notch / right notch -> rig pose.
    {'name': 'fin-far', 'img': 'fin-far', 'bone': 'fin.far', 'z': 6, 'shade': 0.88,
     'from': [[1104, 946], [996, 906], [1104, 884]], 'to': [[1208, 743], [1112, 697], [1220, 690]]},
    # The fluke's stalk runs under the body's tail stock.
    fitted('tail', 'tail', 8, [380, 930], [60, 640]),
    fitted('body', 'body', 20, [330, 215], [1280, 350]),
    fitted('fin-near', 'fin.near', 40, [825, 720], [515, 840]),
]

# Face pieces. Each eye piece is both eyes + brows + both blush ovals; they all land by the midpoint of their two
# blushes (so the blush stays put when the expression changes), at the scale that puts the gentle eyes on the
# rig pose's eyes.
EYE_S, EYE_DEG = 1.0, -1.0
blush_mid = {
    'eyes-gentle': [225.2, 301.1], 'eyes-happy': [591.9, 299.2], 'eyes-sparkle': [959.5, 302.2],
    'eyes-closed': [1337.4, 300.3], 'eyes-sleepy': [223.4, 606.5], 'eyes-surprised': [603.9, 609.0],
    'eyes-determined': [975.5, 606.3], 'eyes-hurt': [1346.8, 599.3],
}
# Gentle near-eye highlight (sheet 193,240) a little inside the rig pose's (trimmed 990,454).
g = blush_mid['eyes-gentle']
th = math.radians(EYE_DEG)
dx, dy = (193 - g[0]) * EYE_S, (240 - g[1]) * EYE_S
EYE_AT = [995 - (dx * math.cos(th) - dy * math.sin(th)), 446 - (dx * math.sin(th) + dy * math.cos(th))]
for n in ['eyes-gentle', 'eyes-happy', 'eyes-sparkle', 'eyes-closed', 'eyes-sleepy', 'eyes-surprised', 'eyes-determined', 'eyes-hurt']:
    parts.append(similar(n, n, 'body', 30, blush_mid[n], EYE_AT, EYE_S, EYE_DEG, slot='eyes'))

# Mouths: the middle of the upper lip on the rig pose's mouth line.
MOUTH_S, MOUTH_AT = 0.8, [1062, 507]
lip = {'mouth-smile': [202, 794], 'mouth-o': [487, 786], 'mouth-laugh': [775, 784], 'mouth-worried': [1064, 810], 'mouth-w': [1351, 806]}
for n, p in lip.items():
    parts.append(similar(n, n, 'body', 31, p, MOUTH_AT, MOUTH_S, 0.0, slot='mouth'))

rig = {
    'id': 'mochi',
    'ground': GROUND,
    'bones': bones,
    'parts': parts,
    'springs': [
        # The cloud lags behind every move (and leans back while swimming fast).
        {'bone': 'spout', 'tip': tf(fits['spout'], [1330, 700]), 'gain': 0.012, 'freq': 2.2, 'damping': 0.28, 'max': 18},
        # Fins trail a little behind the body's pitch.
        {'bone': 'fin.near', 'tip': tf(fits['fin-near'], [515, 840]), 'gain': 0.006, 'freq': 3.0, 'damping': 0.35, 'max': 14},
        {'bone': 'fin.far', 'tip': [1208, 743], 'gain': 0.006, 'freq': 3.0, 'damping': 0.35, 'max': 14},
    ],
    'points': {
        'head.top': {'part': 'body', 'at': [1080, 95]},
        'nose': {'part': 'body', 'at': [1284, 360]},
    },
    'blink': {'slot': 'eyes', 'open': 'eyes-gentle', 'half': 'eyes-sleepy', 'closed': 'eyes-closed'},
}


def dump(o):
    """JSON with one bone / part per line, like hero.json."""
    lines = ['{']
    items = list(o.items())
    for i, (k, v) in enumerate(items):
        comma = ',' if i < len(items) - 1 else ''
        if isinstance(v, list) and v and isinstance(v[0], dict):
            lines.append(f'  "{k}": [')
            lines += [f'    {json.dumps(x)}' + (',' if j < len(v) - 1 else '') for j, x in enumerate(v)]
            lines.append(f'  ]{comma}')
        else:
            lines.append(f'  "{k}": {json.dumps(v)}{comma}')
    lines.append('}')
    return '\n'.join(lines) + '\n'


open(os.path.join(ROOT, 'art/rigs/mochi.json'), 'w').write(dump(rig))
nose = tf(body, [1284, 360])
tail_tip = tf(fits['tail'], [45, 640])
print('ground', GROUND, 'centre', CENTRE, 'tail', TAIL_BASE, 'fins', FIN_NEAR, FIN_FAR, 'blowhole', BLOWHOLE)
print('nose', nose, 'fluke tip', tail_tip, 'nose rel ground', [r1(nose[0] - GROUND[0]), r1(GROUND[1] - nose[1])])
