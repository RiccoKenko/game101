"""Builds art/rigs/first_mate.json (the chapter-1 boss) from the head/hips auto-fits plus hand-measured points.

Run from anywhere: python3 scripts/tools/first_mate_rig.py  (then `npm run art:publish -- first_mate`).
Rig coordinates are pixels of the trimmed rig-pose picture art/sliced/first_mate/rigpose.png; `from` points are
pixels on each part's source sheet. The auto-fits (first_mate_fit.json, from fit.py) are in the ORIGINAL rig-pose
picture, so they are shifted by the trim. Most parts here were placed by hand from labelled grids (grid.mjs),
because his sheet parts are drawn at different proportions from the rig pose (wide coat, big hands and eyes).
Facing right: near side = his right (.r, viewer's left, holds the anchor), far side = his left (.l).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))
os.environ.setdefault('CHAR', 'first_mate')
man = json.load(open(f'{ROOT}/art/sliced/first_mate/manifest.json'))
fits = json.load(open(os.path.join(HERE, 'first_mate_fit.json')))
rp = man['rigpose']['parts'][0]
OX, OY = rp['x'] - 8, rp['y'] - 8


def tf(f, p):
    """Sheet point -> trimmed rig point through a fitted similarity transform."""
    qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
    if f['mirror']: qx = -qx
    th = math.radians(f['th'])
    x = (qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0]
    y = (qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1]
    return [round(x - OX, 1), round(y - OY, 1)]


def r1(p):
    return [round(p[0], 1), round(p[1], 1)]


def along(a, b, d):
    """The point d px from a towards b."""
    l = math.dist(a, b)
    return [a[0] + (b[0] - a[0]) * d / l, a[1] + (b[1] - a[1]) * d / l]


def mapper(a, b, A, B, mirror=False):
    """Similarity carrying sheet a,b onto rig A,B (mirrored across the line when asked): returns p -> rig."""
    s = math.dist(A, B) / math.dist(a, b)
    phi = math.atan2(b[1] - a[1], b[0] - a[0])
    PHI = math.atan2(B[1] - A[1], B[0] - A[0])
    def f(p):
        dx, dy = p[0] - a[0], p[1] - a[1]
        u = dx * math.cos(-phi) - dy * math.sin(-phi)
        v = dx * math.sin(-phi) + dy * math.cos(-phi)
        if mirror: v = -v
        return r1([A[0] + s * (u * math.cos(PHI) - v * math.sin(PHI)), A[1] + s * (u * math.sin(PHI) + v * math.cos(PHI))])
    return f


def part(name, img, bone, z, frm, to, **extra):
    return {'name': name, 'img': img, 'bone': bone, 'z': z, 'from': [r1(p) for p in frm], 'to': [r1(p) for p in to], **extra}


FAR = 0.82  # shade of the far limbs

# ---- Joints on the rig pose (trimmed pixels, measured on grids) ----
HIPS, TORSO, NECK = [500, 740], [500, 720], [520, 385]
SHOULDER_R, ELBOW_R, WRIST_R, TIP_R = [258, 478], [135, 602], [122, 815], [110, 968]
SHOULDER_L, ELBOW_L, WRIST_L, TIP_L = [702, 480], [778, 612], [810, 822], [828, 962]
HIP_R, KNEE_R, ANKLE_R = [395, 795], [365, 1050], [300, 1290]
HIP_L, KNEE_L, ANKLE_L = [605, 795], [632, 1050], [665, 1290]
GROUND = [490, 1345]

# ---- Head and its swinging bits ----
head = fits['head']
# The braid hangs from under the beard (its top and gold band measured on the rig pose).
BRAID_TOP, BRAID_BAND = [540, 393], [563, 530]
# The feather pivots where it tucks into the hat band behind the crown (plume top and tip placed on the rig pose).
FEATHER_ROOT = [455, 150]

# ---- Hands: wrist -> knuckle axis of each piece, at the open hand's size ----
HAND_AXIS = {
    'hand-r-open': ([785, 635], [745, 965]), 'hand-r-grip': ([1338, 645], [1290, 950]),
    'hand-l-open': ([1318, 145], [1330, 505]), 'hand-l-fist': ([265, 645], [250, 920]),
}
RIG_HAND = {'r': (WRIST_R, TIP_R), 'l': (WRIST_L, TIP_L)}
HAND_WIDTH = {'r': 1.15, 'l': 1.0}


def hand_map(name):
    side = name.split('-')[1]
    (a, tip), (A, TIP) = HAND_AXIS[name], RIG_HAND[side]
    oa, ot = HAND_AXIS[f'hand-{side}-open']
    s = math.dist(A, TIP) / math.dist(oa, ot)
    B = along(A, TIP, math.dist(a, tip) * s)
    return [a, tip], [A, B], mapper(a, tip, A, B), s


def hand(name, z, shade=None):
    side = name.split('-')[1]
    frm, to, _, s = hand_map(name)
    p = part(name, name, f'hand.{side}', z, frm, to, slot=f'hand.{side}', width=round(s * HAND_WIDTH[side], 4))
    if shade: p['shade'] = shade
    return p


GRIP = hand_map('hand-r-grip')[2]([1263, 807])  # the hole in the near fist

# ---- Props ----
# Anchor: held by the shank just under the stock; at rest it hangs crown-down from the near fist. It is mirrored
# so that, over his shoulder, its chain falls behind his head instead of across his chest.
ANCHOR_GRIP, ANCHOR_CROWN = [300, 232], [300, 560]
ANCHOR_SCALE = 0.95
anchor_to = [GRIP, [GRIP[0], GRIP[1] + (ANCHOR_CROWN[1] - ANCHOR_GRIP[1]) * ANCHOR_SCALE]]
# Sack: mirrored so its bulk hangs behind his back, held by the strap in the near fist.
SACK_STRAP, SACK_BOTTOM = [618, 330], [618, 530]
SACK_SCALE = 1.0
sack_to = [GRIP, [GRIP[0], GRIP[1] + (SACK_BOTTOM[1] - SACK_STRAP[1]) * SACK_SCALE]]

bones = [
    {'name': 'hips', 'at': HIPS},
    {'name': 'torso', 'parent': 'hips', 'at': TORSO},
    {'name': 'head', 'parent': 'torso', 'at': NECK},
    {'name': 'feather', 'parent': 'head', 'at': FEATHER_ROOT},
    {'name': 'braid', 'parent': 'head', 'at': BRAID_TOP},
    {'name': 'coat.r', 'parent': 'hips', 'at': [300, 730]},
    {'name': 'coat.l', 'parent': 'hips', 'at': [690, 730]},
    {'name': 'upperArm.l', 'parent': 'torso', 'at': SHOULDER_L},
    {'name': 'forearm.l', 'parent': 'upperArm.l', 'at': ELBOW_L},
    {'name': 'hand.l', 'parent': 'forearm.l', 'at': WRIST_L},
    {'name': 'upperArm.r', 'parent': 'torso', 'at': SHOULDER_R},
    {'name': 'forearm.r', 'parent': 'upperArm.r', 'at': ELBOW_R},
    {'name': 'hand.r', 'parent': 'forearm.r', 'at': WRIST_R},
    {'name': 'anchor', 'parent': 'hand.r', 'at': GRIP},
    {'name': 'sack', 'parent': 'hand.r', 'at': GRIP},
    {'name': 'thigh.l', 'parent': 'hips', 'at': HIP_L},
    {'name': 'shin.l', 'parent': 'thigh.l', 'at': KNEE_L},
    {'name': 'foot.l', 'parent': 'shin.l', 'at': ANKLE_L},
    {'name': 'thigh.r', 'parent': 'hips', 'at': HIP_R},
    {'name': 'shin.r', 'parent': 'thigh.r', 'at': KNEE_R},
    {'name': 'foot.r', 'parent': 'shin.r', 'at': ANKLE_R},
]

# Torso: the sheet's coat is narrower than the rig pose's, so it is widened a little more than it is lengthened.
BUCKLE, RIG_BUCKLE, TORSO_SX, TORSO_SY = [232, 392], [505, 688], 1.55, 1.32

# Boots: cuff top centre, toe and heel on the sole (sheet) -> rig pose; the far boot is the same picture mirrored.
BOOT = [[1360, 662], [1240, 945], [1420, 950]]
# Balloon trouser legs: top (its cut end erased in sheets.json) to the gathered hem, drawn a little fuller than
# the sheet so they cover the hips' cut-off trouser legs as they swing. The near one is the picture mirrored.
THIGH, THIGH_WIDTH = [[1045, 600], [1073, 878]], 1.1

parts = [
    # Far arm, behind the body.
    part('upper-arm-l', 'upper-arm-l', 'upperArm.l', 6, [[1300, 200], [1400, 420]], [SHOULDER_L, ELBOW_L], shade=FAR, width=0.72),
    part('forearm-l', 'forearm-r', 'forearm.l', 7, [[740, 640], [785, 880]], [ELBOW_L, WRIST_L], shade=FAR, width=0.95),
    hand('hand-l-fist', 8, FAR),
    hand('hand-l-open', 8, FAR),
    # The sack of stolen crystals hangs behind his back from the near fist.
    part('sack', 'sack', 'sack', 9, [SACK_STRAP, SACK_BOTTOM], sack_to, slot='loot', width=-SACK_SCALE),
    # Coat skirts hang from the waist, outside the legs.
    part('coat-tail-far', 'coat-tail-r', 'coat.l', 10, [[1063, 100], [1143, 485], [1237, 353]], [[676, 712], [745, 1110], [818, 1000]], shade=0.9),
    part('coat-tail-near', 'coat-tail-l', 'coat.r', 11, [[950, 100], [947, 485], [810, 310]], [[345, 716], [250, 1128], [108, 996]]),
    # Legs: boots under the trouser legs. The hips (belt, seat and the shirt tail, its trouser legs cut off at the
    # crotch) cover the far thigh's top; the near thigh goes over the hips so its swing never opens a gap.
    part('shin-l', 'shin', 'shin.l', 12, BOOT, [[632, 1045], [808, 1342], [590, 1340]], shade=FAR),
    part('thigh-l', 'thigh', 'thigh.l', 14, THIGH, [HIP_L, KNEE_L], width=THIGH_WIDTH, shade=0.92),
    part('shin-r', 'shin', 'shin.r', 16, BOOT, [[345, 1045], [165, 1342], [372, 1340]]),
    part('hips', 'hips', 'hips', 20, [[621, 222], [621, 400]], [tf(fits['hips'], [621, 222]), tf(fits['hips'], [621, 400])]),
    part('thigh-r', 'thigh', 'thigh.r', 22, THIGH, [HIP_R, KNEE_R], width=-THIGH_WIDTH),
    # The coat front, on the belt buckle, widened a little to the rig pose's broad chest.
    part('torso', 'torso', 'torso', 30, [BUCKLE, [BUCKLE[0] - 100, BUCKLE[1]], [BUCKLE[0], BUCKLE[1] - 100]],
         [RIG_BUCKLE, [RIG_BUCKLE[0] - 100 * TORSO_SX, RIG_BUCKLE[1]], [RIG_BUCKLE[0], RIG_BUCKLE[1] - 100 * TORSO_SY]]),
    # Near arm, over the body; the forearm's elbow over the upper arm's sleeve end.
    part('upper-arm-r', 'upper-arm-r', 'upperArm.r', 40, [[535, 615], [440, 860]], [SHOULDER_R, ELBOW_R], width=0.8),
    part('forearm-r', 'forearm-l', 'forearm.r', 41, [[225, 640], [150, 888]], [ELBOW_R, WRIST_R], width=1.05),
    # The anchor sits in the fist (its shank through the hole), the fingers over it.
    part('anchor', 'anchor', 'anchor', 43, [ANCHOR_GRIP, ANCHOR_CROWN], anchor_to, slot='weapon', width=-ANCHOR_SCALE),
    hand('hand-r-grip', 44),
    hand('hand-r-open', 44),
    part('braid', 'beard-braid', 'braid', 48, [[240, 500], [240, 652]], [BRAID_TOP, BRAID_BAND]),
    part('feather', 'hat-feather', 'feather', 49, [[250, 773], [60, 953]], [[368, 12], [205, 210]]),
    part('head', 'head', 'head', 50, [[110, 395], [432, 402]], [tf(head, [110, 395]), tf(head, [432, 402])]),
]

# ---- Face: one visible eye (eye, brow and a patch of skin) and a mouth with the moustache ----
# Each eye piece has its lower-left skin erased (sheets.json `erase`) so it does not cross the nose.
EYE_AT, EYE_SCALE = [584, 251], 0.32
EYES = {  # each piece's eye centre on the sheet
    'eye-fierce': [672, 263], 'eye-furious': [918, 267], 'eye-greedy': [1176, 263], 'eye-closed': [1399, 275],
    'eye-hurt': [653, 504], 'eye-ko': [915, 500], 'eye-surprised': [1172, 508], 'eye-smug': [1411, 504],
}
for n, c in EYES.items():
    parts.append(part(n, n, 'head', 52, [[c[0] - 50, c[1]], [c[0] + 50, c[1]]], [[EYE_AT[0] - 50 * EYE_SCALE, EYE_AT[1]], [EYE_AT[0] + 50 * EYE_SCALE, EYE_AT[1]]], slot='eye'))
MOUTH_AT, MOUTH_SCALE = [556, 286], 0.8
MOUTHS = {  # moustache centre (under the nose) on the sheet
    'mouth-sneer': [566, 733], 'mouth-roar': [735, 693], 'mouth-laugh': [912, 714],
    'mouth-ouch': [1087, 743], 'mouth-o': [1266, 731], 'mouth-gritted': [1432, 739],
}
for n, c in MOUTHS.items():
    parts.append(part(n, n, 'head', 53, [[c[0] - 50, c[1]], [c[0] + 50, c[1]]], [[MOUTH_AT[0] - 50 * MOUTH_SCALE, MOUTH_AT[1]], [MOUTH_AT[0] + 50 * MOUTH_SCALE, MOUTH_AT[1]]], slot='mouth'))

rig = {
    'id': 'first_mate',
    'ground': GROUND,
    'bones': [{**b, 'at': r1(b['at'])} for b in bones],
    'parts': parts,
    'springs': [
        {'bone': 'feather', 'tip': [205, 210], 'gain': 0.05, 'freq': 2.0, 'damping': 0.28, 'max': 18},
        {'bone': 'braid', 'tip': [600, 630], 'gain': 0.06, 'freq': 1.8, 'damping': 0.3, 'max': 22},
        {'bone': 'coat.r', 'tip': [180, 1100], 'gain': 0.035, 'freq': 1.7, 'damping': 0.35, 'max': 12},
        {'bone': 'coat.l', 'tip': [770, 1100], 'gain': 0.035, 'freq': 1.6, 'damping': 0.35, 'max': 12},
    ],
    # Top of the hat crown (on the head picture), for sizing him in the game; the feather is left out.
    'points': {'head.top': {'part': 'head', 'at': [395, 52]}},
    'blink': {'slot': 'eye', 'open': 'eye-fierce', 'closed': 'eye-closed'},
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


open(f'{ROOT}/art/rigs/first_mate.json', 'w').write(dump(rig))
print('grip', GRIP, 'head.top', tf(head, [395, 52]), 'ground', GROUND)
