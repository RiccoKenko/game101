"""Builds art/rigs/ironclad.json from the automatic fits (ironclad_fit.json) plus hand-measured joints.

Run from the repository root: python3 scripts/tools/ironclad_rig.py
All points below are pixels of the ORIGINAL pictures (art/incoming/ironclad/*.webp); the rig is written in the
trimmed rig-pose picture's pixels (art/sliced/ironclad/rigpose.png) at the end, like deckhand_rig.py.

The Ironclad faces right in 3/4 view. Near side = his right (.r, viewer's left, holds the wrench); far side =
his left (.l, holds the hatch shield). The sheet names are the other way round (the artist named them from the
viewer's side): upper-arm-l / forearm-r / hand-l-* are the NEAR arm, upper-arm-r / forearm-l / hand-r-* the far.

ironclad_fit.json holds fit.py results (CHAR=ironclad python3 scripts/tools/fit.py <part> cx cy scale [angle]):
  head 530 330 0.76 | torso 545 640 1.2 | hips 555 960 1.2 | strap 775 1000 1.13 -10 | eyes-calm 645 365 0.6
  shin 750 1270 1.15 (stored as "shin#far") | upper-arm-l 270 612 1.2 with the scale pinned (fit(..., fix_s=True)).
Everything else (arms, hands, near leg, props) is placed from points measured with grid.mjs.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
os.environ['CHAR'] = 'ironclad'
from fit import man  # noqa: E402

fits = json.load(open(os.path.join(HERE, 'ironclad_fit.json')))
boxes = {p['name']: p for e in man.values() for p in e['parts']}


def tf(f, p):
    """Sheet point -> rig point through a fitted similarity transform."""
    qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
    if f['mirror']:
        qx = -qx
    th = math.radians(f['th'])
    x = (qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0]
    y = (qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1]
    return [round(x, 1), round(y, 1)]


def fitted(name, key, bone, z, a, b, **extra):
    f = fits[key]
    return {'name': name, 'img': f['name'], 'bone': bone, 'z': z, 'from': [a, b], 'to': [tf(f, a), tf(f, b)], **extra}


def placed(name, img, bone, z, a, b, A, s, turn=None, **extra):
    """Pins sheet point a on rig point A at scale s; the a->b direction is turned to `turn` degrees (y-down,
    0 = right, 90 = down) or kept as on the sheet."""
    d = math.dist(a, b)
    ang = math.radians(turn) if turn is not None else math.atan2(b[1] - a[1], b[0] - a[0])
    B = [round(A[0] + math.cos(ang) * d * s, 1), round(A[1] + math.sin(ang) * d * s, 1)]
    return {'name': name, 'img': img, 'bone': bone, 'z': z, 'from': [a, b], 'to': [list(A), B], **extra}


def lerp(p, q, t):
    return [round(p[0] + (q[0] - p[0]) * t, 1), round(p[1] + (q[1] - p[1]) * t, 1)]


# --- Legs -------------------------------------------------------------------------------------------------
# Sheet: the thigh is a baggy trouser leg with a knee plate at the bottom; the shin is the knee plate, a strip
# of trouser and the boot (heel left, toe right). The shin's knee plate covers the thigh's.
THIGH_TOP, THIGH_KNEE = [722, 705], [765, 885]
SHIN_KNEE, SOLE = [1205, 735], [1195, 958]
knee_l = tf(fits['shin#far'], SHIN_KNEE)
sole_l = tf(fits['shin#far'], SOLE)
knee_r, sole_r = [378, 1163], [366, 1418]
hip_r, hip_l = [402, 985], [700, 1000]
# The boots' rounded soles reach about 9 px below the sole points.
ground = [545, round(max(sole_r[1], sole_l[1])) + 9]

# --- Arms -------------------------------------------------------------------------------------------------
# Rig-pose joints. The forearms are short stubs: on the rig pose the upper arm's tube runs straight into the
# big gauntlet cuff, so the forearm only shows when the elbow bends.
UA_R_SHOULDER, UA_R_ELBOW = [290, 490], [195, 638]
SHOULDER_R, ELBOW_R = tf(fits['upper-arm-l'], UA_R_SHOULDER), tf(fits['upper-arm-l'], UA_R_ELBOW)
WRIST_R = [ELBOW_R[0] - 2, ELBOW_R[1] + 78]
SHOULDER_L, ELBOW_L = [796, 572], [882, 790]
WRIST_L = [ELBOW_L[0] + 10, ELBOW_L[1] + 70]

# Hands: the cuff's top centre and its gold band's centre on each hand image (the cuff axis), placed so the
# cuff top sits just inside the forearm and the axis runs the way the rig pose's hand hangs.
CUFF = {
    'hand-l-open': ([1275, 172], [1245, 318]), 'hand-l-grip': ([297, 650], [266, 758]),
    'hand-r-open': ([740, 645], [752, 752]), 'hand-r-grip': ([1285, 650], [1282, 768]),
}
HAND = {
    'r': {'top': [ELBOW_R[0] - 4, ELBOW_R[1] + 10], 'dir': 92, 's': 0.82, 'w': 0.98},
    'l': {'top': [ELBOW_L[0] + 4, ELBOW_L[1] + 22], 'dir': 84, 's': 0.7, 'w': 0.8},
}


def hand(name, img, bone, z, shade=None):
    side = bone.split('.')[1]
    a, b = CUFF[img]
    h = HAND[side]
    p = placed(name, img, bone, z, a, b, h['top'], h['s'], h['dir'], slot=bone, width=h['w'])
    if shade:
        p['shade'] = shade
    return p


def hand_point(img, side, p):
    """A point on a hand image -> the rig pose, through the same placement as hand() (scaled s along the
    cuff axis and w across it)."""
    a, b = CUFF[img]
    h = HAND[side]
    d = math.dist(a, b)
    ux, uy = (b[0] - a[0]) / d, (b[1] - a[1]) / d
    along = (p[0] - a[0]) * ux + (p[1] - a[1]) * uy
    across = -(p[0] - a[0]) * uy + (p[1] - a[1]) * ux
    t = math.radians(h['dir'])
    Ux, Uy = math.cos(t), math.sin(t)
    x = h['top'][0] + Ux * along * h['s'] - Uy * across * h['w']
    y = h['top'][1] + Uy * along * h['s'] + Ux * across * h['w']
    return [round(x, 1), round(y, 1)]


# Grip holes: where the wrench handle and the shield's back handle pass through the fists.
GRIP_R = hand_point('hand-l-grip', 'r', [318, 900])
GRIP_L = hand_point('hand-r-grip', 'l', [1228, 890])
# The crystal sits on the open near hand's thumb side: when a clip turns the hand fingers-forward (+90 degrees)
# that side faces up and the crystal stands upright on it, so on the rig pose it lies turned a quarter clockwise.
NEST_R = hand_point('hand-l-open', 'r', [1365, 400])

# --- Strap ------------------------------------------------------------------------------------------------
STRAP_TOP, STRAP_END = [1293, 78], [1352, 352]
strap_top, strap_end = tf(fits['strap'], STRAP_TOP), tf(fits['strap'], STRAP_END)

bones = [
    {'name': 'hips', 'at': [552, 905]},
    {'name': 'torso', 'parent': 'hips', 'at': [550, 860]},
    {'name': 'head', 'parent': 'torso', 'at': [540, 478]},
    {'name': 'strap', 'parent': 'hips', 'at': strap_top},
    {'name': 'upperArm.l', 'parent': 'torso', 'at': SHOULDER_L},
    {'name': 'forearm.l', 'parent': 'upperArm.l', 'at': ELBOW_L},
    {'name': 'hand.l', 'parent': 'forearm.l', 'at': WRIST_L},
    {'name': 'shield', 'parent': 'hand.l', 'at': GRIP_L},
    {'name': 'upperArm.r', 'parent': 'torso', 'at': SHOULDER_R},
    {'name': 'forearm.r', 'parent': 'upperArm.r', 'at': ELBOW_R},
    {'name': 'hand.r', 'parent': 'forearm.r', 'at': WRIST_R},
    {'name': 'weapon', 'parent': 'hand.r', 'at': GRIP_R},
    {'name': 'thigh.l', 'parent': 'hips', 'at': hip_l},
    {'name': 'shin.l', 'parent': 'thigh.l', 'at': knee_l},
    {'name': 'thigh.r', 'parent': 'hips', 'at': hip_r},
    {'name': 'shin.r', 'parent': 'thigh.r', 'at': knee_r},
]

far = 0.82
# Shield: the hatch seen at a slant (squashed across), its hub on the far fist's grip.
SHIELD_HUB, SHIELD_TOP = [314, 330], [314, 62]
SHIELD_S = 1.0
# Wrench: grip low on the handle; at rest it hangs head-down in front of the near boot.
WRENCH_GRIP, WRENCH_HEAD = [826, 455], [800, 150]
WRENCH_S = 0.95

parts = [
    # Far leg, then near leg; the skirt (hips) covers the thigh tops, the knee plates sit over the trousers.
    {'name': 'thigh-l', 'img': 'thigh', 'bone': 'thigh.l', 'z': 4, 'shade': far, 'from': [THIGH_TOP, THIGH_KNEE], 'to': [hip_l, knee_l], 'width': 1.0},
    {'name': 'thigh-r', 'img': 'thigh', 'bone': 'thigh.r', 'z': 6, 'from': [THIGH_TOP, THIGH_KNEE], 'to': [hip_r, knee_r], 'width': 1.08},
    fitted('torso', 'torso', 'torso', 8, [350, 40], [345, 350]),
    fitted('hips', 'hips', 'hips', 10, [842, 100], [842, 340]),
    fitted('shin-l', 'shin#far', 'shin.l', 12, SHIN_KNEE, SOLE, shade=far),
    {'name': 'shin-r', 'img': 'shin', 'bone': 'shin.r', 'z': 14, 'from': [SHIN_KNEE, SOLE], 'to': [knee_r, sole_r], 'width': 0.95},
    fitted('strap', 'strap', 'strap', 16, STRAP_TOP, STRAP_END),
    # Far arm: over the torso (its pauldron covers the torso's far shoulder socket), each piece covering the
    # dark opening of the one before; the shield covers the far hand.
    {'name': 'upper-arm-l', 'img': 'upper-arm-r', 'bone': 'upperArm.l', 'z': 20, 'shade': far, 'from': [[1245, 470], [1350, 640]], 'to': [SHOULDER_L, ELBOW_L], 'width': 0.8},
    {'name': 'forearm-l', 'img': 'forearm-l', 'bone': 'forearm.l', 'z': 22, 'shade': far, 'from': [[702, 472], [835, 610]], 'to': [lerp(ELBOW_L, WRIST_L, -0.25), lerp(ELBOW_L, WRIST_L, 1.5)], 'width': 0.85},
    hand('hand-l-grip', 'hand-r-grip', 'hand.l', 24, far),
    hand('hand-l-open', 'hand-r-open', 'hand.l', 24, far),
    placed('shield', 'shield', 'shield', 26, SHIELD_HUB, SHIELD_TOP, GRIP_L, SHIELD_S, -90, slot='shield', width=SHIELD_S * 0.42),
    # Near arm, over the body.
    fitted('upper-arm-r', 'upper-arm-l', 'upperArm.r', 40, UA_R_SHOULDER, UA_R_ELBOW),
    {'name': 'forearm-r', 'img': 'forearm-r', 'bone': 'forearm.r', 'z': 42, 'from': [[258, 722], [292, 908]], 'to': [lerp(ELBOW_R, WRIST_R, -0.25), lerp(ELBOW_R, WRIST_R, 1.5)], 'width': 1.1},
    placed('wrench', 'wrench', 'weapon', 43, WRENCH_GRIP, WRENCH_HEAD, GRIP_R, WRENCH_S, 75, slot='weapon'),
    # The crystal rides on the near hand, under the hand and forearm (clips turn the hand to carry it).
    {'name': 'crystal', 'img': 'crystal', 'bone': 'hand.r', 'z': 41, 'slot': 'loot', 'from': [[722, 395], [842, 395]],
     'to': [[NEST_R[0], NEST_R[1] - 58], [NEST_R[0], NEST_R[1] + 58]]},
    hand('hand-r-grip', 'hand-l-grip', 'hand.r', 44),
    hand('hand-r-open', 'hand-l-open', 'hand.r', 44),
    fitted('head', 'head', 'head', 50, [150, 400], [550, 400]),
]

# Eyes: every eye piece sits where the calm eyes fit in the porthole, centre on centre, at one scale.
eyes = fits['eyes-calm']
for n in ['eyes-calm', 'eyes-angry', 'eyes-closed', 'eyes-hurt', 'eyes-ko', 'eyes-surprised', 'eyes-smug', 'eyes-greedy']:
    b = boxes[n]
    c = [b['x'] + b['w'] / 2, b['y'] + b['h'] / 2]
    f = {**eyes, 'c': c}
    a, q = [c[0] - 80, c[1]], [c[0] + 80, c[1]]
    e = {'name': n, 'img': n, 'bone': 'head', 'z': 52, 'slot': 'eyes', 'from': [a, q], 'to': [tf(f, a), tf(f, q)]}
    # The closed and hurt eyes are drawn dark navy, which vanishes in the dark porthole: lighten them.
    if n in ('eyes-closed', 'eyes-hurt'):
        e['shade'] = 2.6
    parts.append(e)

# The first part of each slot shows by default: calm eyes, the gripping fists.
rig = {
    'id': 'ironclad',
    'ground': ground,
    'borrow': {'crystal': 'deckhand/crystal'},
    'bones': bones,
    'parts': parts,
    'springs': [
        {'bone': 'strap', 'tip': strap_end, 'gain': 0.06, 'freq': 1.8, 'damping': 0.25, 'max': 28},
    ],
    'points': {'head.top': {'part': 'head', 'at': [330, 150]}},
    'blink': {'slot': 'eyes', 'open': 'eyes-calm', 'closed': 'eyes-closed'},
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


rp = man['rigpose']['parts'][0]
OX, OY = rp['x'] - 8, rp['y'] - 8
sh = lambda p: [round(p[0] - OX, 1), round(p[1] - OY, 1)]
rig['ground'] = sh(rig['ground'])
for b in rig['bones']:
    b['at'] = sh(b['at'])
for p in rig['parts']:
    p['to'] = [sh(q) for q in p['to']]
for s in rig['springs']:
    s['tip'] = sh(s['tip'])
out = sys.argv[1] if len(sys.argv) > 1 else os.path.join(HERE, '../../art/rigs/ironclad.json')
open(out, 'w').write(dump(rig))
print('ground', ground, 'knees', knee_r, knee_l, 'soles', sole_r, sole_l, 'grip', GRIP_R, GRIP_L, 'strap', strap_top, strap_end)
