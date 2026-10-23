"""Builds art/rigs/powder_monkey.json from the automatic fits (powder_monkey_fit.json) plus hand-measured points.

Run from anywhere: python3 scripts/tools/powder_monkey_rig.py (needs `npm run art -- powder_monkey` first).
Points below are pixels of the ORIGINAL rig-pose picture (art/incoming/powder_monkey/powder_monkey_rigpose.webp)
or of a part's source sheet; the rig is shifted to the trimmed rig pose (art/sliced/powder_monkey/rigpose.png) at the end.
Near side = the monkey's right (.r, viewer's left): the sheets' "-r" arm and hand pieces fit it.
"""
import json, math, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))
os.environ['CHAR'] = 'powder_monkey'
sys.path.insert(0, HERE)
from fit import man  # noqa: E402

fits = json.load(open(os.path.join(HERE, 'powder_monkey_fit.json')))
boxes = {p['name']: p for e in man.values() for p in e['parts']}
R = lambda p: [round(p[0], 1), round(p[1], 1)]


def tf(f, p):
    """Sheet point -> rig point through a fitted similarity transform."""
    qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
    if f['mirror']: qx = -qx
    th = math.radians(f['th'])
    x = (qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0]
    y = (qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1]
    return R([x, y])


def fitted(name, key, bone, z, a, b, **extra):
    f = fits[key]
    return {'name': name, 'img': f['name'], 'bone': bone, 'z': z, 'from': [a, b], 'to': [tf(f, a), tf(f, b)], **extra}


def similar(a, A, s, deg, mirror=False):
    """A function taking sheet points to the rig: point a lands on A, scaled by s and turned by deg (y-down, clockwise)."""
    th = math.radians(deg)
    def to_rig(p):
        dx, dy = p[0] - a[0], p[1] - a[1]
        if mirror: dx = -dx
        return R([A[0] + s * (dx * math.cos(th) - dy * math.sin(th)), A[1] + s * (dx * math.sin(th) + dy * math.cos(th))])
    return to_rig


def placed(name, img, bone, z, frm, to_rig, **extra):
    """A part whose sheet points `frm` (2, or 3 for a mirrored/skewed part) go through `to_rig`."""
    return {'name': name, 'img': img, 'bone': bone, 'z': z, 'from': [R(p) for p in frm], 'to': [to_rig(p) for p in frm], **extra}


def limb(name, img, bone, z, a, b, A, B, width, **extra):
    """A limb piece laid from joint A to joint B (sheet points a, b), `width` = absolute scale across it."""
    return {'name': name, 'img': img, 'bone': bone, 'z': z, 'from': [a, b], 'to': [R(A), R(B)], 'width': width, **extra}


# ---- Joints (measured on the rig pose) --------------------------------------------------------------------------
NECK = [606, 640]
WAIST = [596, 925]
HIPS = [596, 955]
# Arms: shoulder, elbow, wrist; near = .r (viewer's left), far = .l.
SH_R, EL_R, WR_R = [462, 692], [392, 818], [326, 946]
SH_L, EL_L, WR_L = [730, 692], [805, 822], [866, 948]
# Legs: the shorts hide the thighs; knees sit just under the hem, the shin piece carries the foot.
HIP_R, KNEE_R, ANKLE_R = [482, 1000], [447, 1150], [432, 1322]
HIP_L, KNEE_L, ANKLE_L = [684, 990], [706, 1132], [700, 1302]
# Tail: base hidden behind the shorts; the J piece runs down and back to the spiral piece's thick end.
TAIL_JOIN_SHEET = [1322, 362]          # on tail-tip (the spiral), just inside its thick end
TAIL_JOIN = tf(fits['tail-tip'], TAIL_JOIN_SHEET)
TAIL_BASE = [515, 1072]
KNOT = [338, 348]                       # bandana knot at the back of the head

# ---- Hands -------------------------------------------------------------------------------------------------------
# Each hand's wrist goes on the rig wrist and its wrist-to-fingertip axis along the rig hand's, at the open hand's size.
HAND_AXIS = {
    'hand-r-open': ([1077, 414], [1045, 668]),
    'hand-l-open': ([517, 414], [555, 668]),
    'hand-l-fist': ([772, 420], [800, 614]),
    # The cupped hand as drawn has its forearm coming up into the heel of the palm: its axis points up the sheet.
    'hand-r-hold': ([1462, 612], [1462, 400]),
}
RIG_HAND = {'r': (WR_R, [300, 1098]), 'l': (WR_L, [896, 1098])}


def hand_frame(name, side=None, mirror=False):
    """sheet -> rig function for a hand image placed on the given side's wrist."""
    side = side or name.split('-')[1]
    (a, tip), (A, TIP) = HAND_AXIS[name], RIG_HAND[side]
    oa, otip = HAND_AXIS[f'hand-{name.split("-")[1]}-open']
    s = math.dist(A, TIP) / math.dist(oa, otip)
    u = math.atan2(tip[1] - a[1], (-1 if mirror else 1) * (tip[0] - a[0]))
    U = math.atan2(TIP[1] - A[1], TIP[0] - A[0])
    return similar(a, A, s, math.degrees(U - u), mirror)


def hand(name, bone, z, img=None, side=None, mirror=False, shade=None):
    img = img or name
    a, tip = HAND_AXIS[img]
    f = hand_frame(img, side, mirror)
    frm = [a, tip, [a[0] + 80, a[1]]] if mirror else [a, tip]
    p = placed(name, img, bone, z, frm, f, slot=bone)
    if shade: p['shade'] = shade
    return p


HOLD = hand_frame('hand-r-hold')
# The bomb sits in the cupped hand (ball centre above the palm when the forearm points up).
BOMB_BALL, BOMB_R = [206, 541], 156          # bomb sheet: ball centre and radius
BOMB_SCALE = 0.75                             # ~235 rig px across
HAND_S = math.dist(*RIG_HAND['r']) / math.dist(*HAND_AXIS['hand-r-open'])
CUP = [1400, 575]                             # palm of the cupped hand (hold sheet)
ball_hold = [CUP[0] - 10, CUP[1] - (BOMB_R * BOMB_SCALE - 30) / HAND_S]
BOMB_AT = HOLD(ball_hold)
BOMB_UP = HOLD([ball_hold[0], ball_hold[1] - 100])

# ---- Bones -------------------------------------------------------------------------------------------------------
HEAD_TOP = tf(fits['head'], [250, 140])
bones = [
    {'name': 'hips', 'at': HIPS},
    {'name': 'torso', 'parent': 'hips', 'at': WAIST},
    {'name': 'head', 'parent': 'torso', 'at': NECK},
    {'name': 'scarf.1', 'parent': 'head', 'at': KNOT},
    {'name': 'scarf.2', 'parent': 'head', 'at': [KNOT[0] + 4, KNOT[1] + 6]},
    {'name': 'loot', 'parent': 'head', 'at': [HEAD_TOP[0], HEAD_TOP[1] + 30]},
    {'name': 'tail', 'parent': 'hips', 'at': TAIL_BASE},
    {'name': 'tail2', 'parent': 'tail', 'at': TAIL_JOIN},
    {'name': 'upperArm.l', 'parent': 'torso', 'at': SH_L},
    {'name': 'forearm.l', 'parent': 'upperArm.l', 'at': EL_L},
    {'name': 'hand.l', 'parent': 'forearm.l', 'at': WR_L},
    {'name': 'upperArm.r', 'parent': 'torso', 'at': SH_R},
    {'name': 'forearm.r', 'parent': 'upperArm.r', 'at': EL_R},
    {'name': 'hand.r', 'parent': 'forearm.r', 'at': WR_R},
    {'name': 'bomb', 'parent': 'hand.r', 'at': BOMB_AT},
    {'name': 'thigh.l', 'parent': 'hips', 'at': HIP_L},
    {'name': 'shin.l', 'parent': 'thigh.l', 'at': KNEE_L},
    {'name': 'foot.l', 'parent': 'shin.l', 'at': ANKLE_L},
    {'name': 'thigh.r', 'parent': 'hips', 'at': HIP_R},
    {'name': 'shin.r', 'parent': 'thigh.r', 'at': KNEE_R},
    {'name': 'foot.r', 'parent': 'shin.r', 'at': ANKLE_R},
]

# ---- Parts, back to front ---------------------------------------------------------------------------------------
far = 0.84
J_TOP, J_END = [915, 148], [790, 372]          # tail-top: thin end (hidden at the base), thick end (joins the spiral)
THIGH_TOP, THIGH_KNEE = [1172, 600], [1160, 815]
SHIN_KNEE, SHIN_ANKLE = [1515, 545], [1470, 730]
ST1 = similar([182, 622], KNOT, 1.18, 6)         # scarf tail 1: knot on the head's knot, tails fanning back
ST2 = similar([380, 622], [KNOT[0] + 4, KNOT[1] + 6], 1.34, 22)

parts = [
    placed('scarf-tail-2', 'scarf-tail-2', 'scarf.2', 3, [[380, 622], [470, 830]], ST2, shade=0.9),
    placed('scarf-tail-1', 'scarf-tail-1', 'scarf.1', 4, [[182, 622], [80, 800]], ST1),
    fitted('tail-tip', 'tail-tip', 'tail2', 1, TAIL_JOIN_SHEET, [1225, 255]),
    {'name': 'tail-top', 'img': 'tail-top', 'bone': 'tail', 'z': 2, 'from': [J_TOP, J_END], 'to': [R(TAIL_BASE), TAIL_JOIN], 'width': 0.86},
    # Far arm, behind the body: hand under the fur cuff.
    limb('upper-arm-l', 'upper-arm-l', 'upperArm.l', 6, [1430, 182], [1610, 372], SH_L, EL_L, 0.78, shade=far),
    hand('hand-l-open', 'hand.l', 7, shade=far),
    hand('hand-l-fist', 'hand.l', 7, shade=far),
    limb('forearm-l', 'forearm-l', 'forearm.l', 8, [90, 592], [246, 766], EL_L, WR_L, 0.84, shade=far),
    # Legs: the shorts cover the thighs' tops.
    limb('thigh-l', 'thigh', 'thigh.l', 12, THIGH_TOP, THIGH_KNEE, HIP_L, KNEE_L, 0.72, shade=far),
    limb('shin-l', 'shin', 'shin.l', 13, SHIN_KNEE, SHIN_ANKLE, KNEE_L, ANKLE_L, None, shade=far),
    limb('thigh-r', 'thigh', 'thigh.r', 15, THIGH_TOP, THIGH_KNEE, HIP_R, KNEE_R, 0.74),
    limb('shin-r', 'shin', 'shin.r', 16, SHIN_KNEE, SHIN_ANKLE, KNEE_R, ANKLE_R, None),
    fitted('torso', 'torso', 'torso', 30, [192, 110], [192, 400]),
    fitted('hips', 'hips', 'hips', 32, [540, 190], [540, 390]),
    # Near arm, over the body. The bomb sits in the cupped hand, under the fingers.
    limb('upper-arm-r', 'upper-arm-r', 'upperArm.r', 40, [572, 588], [398, 788], SH_R, EL_R, 0.8),
    {'name': 'bomb', 'img': 'bomb', 'bone': 'bomb', 'z': 41, 'slot': 'weapon', 'from': [BOMB_BALL, [BOMB_BALL[0], BOMB_BALL[1] - 100]], 'to': [BOMB_AT, BOMB_UP]},
    hand('hand-r-open', 'hand.r', 42),
    hand('hand-r-hold', 'hand.r', 42),
    hand('hand-r-fist', 'hand.r', 42, img='hand-l-fist', side='r', mirror=True),
    limb('forearm-r', 'forearm-r', 'forearm.r', 43, [765, 592], [922, 792], EL_R, WR_R, 0.86),
    fitted('head', 'head', 'head', 50, [110, 330], [500, 330]),
]
for p in parts:
    if p.get('width') is None: p.pop('width', None)

# Face: every eye piece lands where the cheeky eyes fit the rig pose (irises on the drawn irises, a little
# wider than drawn on the sheet); mouths sit on the smile. Anchors = centre of the eyes without brows.
EYE_FROM = [[642, 308], [771, 313], [642, 408]]
EYE_TO = [[622, 457], [785, 480], [618, 560]]
EYE_ANCHOR = {
    'eyes-cheeky': ([682, 296.5], 0), 'eyes-angry': ([967, 290], 0), 'eyes-greedy': ([1243, 298.5], 0),
    'eyes-closed': ([1525.5, 318.5], 8), 'eyes-hurt': ([689, 537.5], 0), 'eyes-ko': ([964.5, 532.5], 0),
    'eyes-surprised': ([1238.5, 517.5], -4), 'eyes-smug': ([1524.5, 529], 4),
}
base = EYE_ANCHOR['eyes-cheeky'][0]
for n, (c, dy) in EYE_ANCHOR.items():
    d = [c[0] - base[0], c[1] - base[1] - dy]
    frm = [[p[0] + d[0], p[1] + d[1]] for p in EYE_FROM]
    parts.append({'name': n, 'img': n, 'bone': 'head', 'z': 52, 'slot': 'eyes', 'from': [R(p) for p in frm], 'to': EYE_TO})

MOUTH_AT, MOUTH_S, MOUTH_DEG = [684, 556], 0.92, 5
for n in ['mouth-grin', 'mouth-laugh', 'mouth-gritted', 'mouth-ouch', 'mouth-o', 'mouth-tongue']:
    b = boxes[n]
    c = [b['x'] + b['w'] / 2, b['y'] + b['h'] / 2]
    f = similar(c, MOUTH_AT, MOUTH_S, MOUTH_DEG)
    parts.append(placed(n, n, 'head', 52, [[c[0] - 50, c[1]], [c[0] + 50, c[1]]], f, slot='mouth'))

# The stolen crystal (borrowed from the Deckhand's sheet) stands on top of the head, leaning back a little.
CRYSTAL_FOOT, CRYSTAL_TIP = [690, 470], [848, 286]   # deckhand hands_props sheet
parts.append({'name': 'crystal', 'img': 'crystal', 'bone': 'loot', 'z': 54, 'slot': 'loot', 'from': [CRYSTAL_FOOT, CRYSTAL_TIP],
              'to': [R([HEAD_TOP[0], HEAD_TOP[1] + 40]), R([HEAD_TOP[0] - 30, HEAD_TOP[1] + 40 - 235])]})

rig = {
    'id': 'powder_monkey',
    'ground': None,
    'bones': bones,
    'parts': parts,
    'springs': [
        {'bone': 'scarf.1', 'tip': ST1([80, 800]), 'gain': 0.06, 'freq': 2.6, 'damping': 0.28, 'max': 28},
        {'bone': 'scarf.2', 'tip': ST2([470, 830]), 'gain': 0.05, 'freq': 2.2, 'damping': 0.3, 'max': 24},
        {'bone': 'tail', 'tip': TAIL_JOIN, 'gain': 0.035, 'freq': 1.8, 'damping': 0.35, 'max': 18},
        {'bone': 'tail2', 'tip': tf(fits['tail-tip'], [1225, 255]), 'gain': 0.05, 'freq': 2.4, 'damping': 0.3, 'max': 22},
    ],
    'points': {'head.top': {'part': 'head', 'at': [300, 110]}},
    'blink': {'slot': 'eyes', 'open': 'eyes-cheeky', 'closed': 'eyes-closed'},
    'borrow': {'crystal': 'deckhand/crystal'},
}

# Ground: under the lower (near) sole.
sole = lambda knee, ankle: similar(SHIN_KNEE, knee, math.dist(knee, ankle) / math.dist(SHIN_KNEE, SHIN_ANKLE),
                                   math.degrees(math.atan2(ankle[1] - knee[1], ankle[0] - knee[0]) - math.atan2(SHIN_ANKLE[1] - SHIN_KNEE[1], SHIN_ANKLE[0] - SHIN_KNEE[0])))([1590, 850])
sole_r, sole_l = sole(KNEE_R, ANKLE_R), sole(KNEE_L, ANKLE_L)
rig['ground'] = [round((ANKLE_R[0] + ANKLE_L[0]) / 2), round(max(sole_r[1], sole_l[1]))]


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


# Rig coordinates are pixels of the trimmed rig-pose picture (art/sliced/powder_monkey/rigpose.png).
rp = man['rigpose']['parts'][0]
OX, OY = rp['x'] - 8, rp['y'] - 8
sh = lambda p: [round(p[0] - OX, 1), round(p[1] - OY, 1)]
rig['ground'] = sh(rig['ground'])
for b in rig['bones']: b['at'] = sh(b['at'])
for p in rig['parts']: p['to'] = [sh(q) for q in p['to']]
for sp in rig['springs']: sp['tip'] = sh(sp['tip'])
out = os.path.join(HERE, '../../art/rigs/powder_monkey.json')
open(out, 'w').write(dump(rig))
print('ground', rig['ground'], 'soles', sole_r, sole_l, 'tail join', TAIL_JOIN, 'bomb', BOMB_AT, 'head top', HEAD_TOP)
