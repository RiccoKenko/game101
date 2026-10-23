"""Builds art/rigs/talon.json (the hero's eagle) from the colour fits in talon_fit.json plus hand-measured points.

Run from the repository root: python3 scripts/tools/talon_rig.py
(Refit with `python3 scripts/tools/talon_fit.py all` first if the sliced parts change.)

Everything here is in pixels of the trimmed rig pose (art/sliced/talon/rigpose.png): the fits are made straight
onto it. `from` points are pixels on each part's source sheet.

How the pieces go together:
- Each wing is two layers that both start at the shoulder: `wing-*-in` (the arm with its covert feathers, on top)
  and `wing-*-out` (the fan of yellow-tipped flight feathers under it). The fan hangs from a "wrist" joint on
  the arm, so it can lag behind the arm (follow-through) and fold or spread on its own.
- The leg pieces are the fluffy "trousers" plus a stub of shin: their own toes are erased by the slicer
  (sheets.json `erase`), and the swappable feet (open / grip) sit on top of the stub at the ankle.
- The crystal rides in the near foot's grip (slot `loot`), behind its toes and in front of the far foot.
- The long scarf tails come out from behind the neck and stream back under the near wing, on springs.
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))
fits = json.load(open(os.path.join(HERE, 'talon_fit.json')))


def tf(f, p):
    """Sheet point -> rig point through a fitted similarity transform."""
    qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
    if f['mirror']: qx = -qx
    th = math.radians(f['th'])
    x = (qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0]
    y = (qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1]
    return [round(x, 1), round(y, 1)]


def fitted(name, bone, z, a, b, **extra):
    f = fits[name]
    return {'name': name, 'img': name, 'bone': bone, 'z': z, 'from': [a, b], 'to': [tf(f, a), tf(f, b)], **extra}


def r1(p):
    return [round(p[0], 1), round(p[1], 1)]


def along(p, angle_deg, length):
    a = math.radians(angle_deg)
    return [p[0] + length * math.cos(a), p[1] + length * math.sin(a)]


def similar(a, b, A, B):
    """The similarity carrying sheet points a, b onto rig points A, B, as a function."""
    s = math.dist(A, B) / math.dist(a, b)
    turn = math.atan2(B[1] - A[1], B[0] - A[0]) - math.atan2(b[1] - a[1], b[0] - a[0])
    c, si = math.cos(turn), math.sin(turn)
    return lambda p: r1([A[0] + s * ((p[0] - a[0]) * c - (p[1] - a[1]) * si), A[1] + s * ((p[0] - a[0]) * si + (p[1] - a[1]) * c)])


# ---- Body: placed by hand (the round body piece is drawn rounder than the rig pose's body, so the colour fit
# shrinks it). Three points: the scarf knot, the front of the cream bib and the bottom of the belly.
BODY_FROM = [[251, 137], [374, 250], [205, 404]]
BODY_TO = [[736, 806], [903, 915], [690, 1040]]

# ---- Joints on the rig pose (measured, or carried over from the fits).
BODY = [700, 905]
NECK = [742, 752]
TAIL = [612, 962]
SHOULDER_NEAR = tf(fits['wing-near-in'], [1165, 375])   # the arm's fluffy root
WRIST_NEAR = tf(fits['wing-near-out'], [1590, 365])     # the feather fan's root
SHOULDER_FAR = tf(fits['wing-far-in'], [95, 790])
WRIST_FAR = tf(fits['wing-far-out'], [495, 790])
HIP_NEAR = tf(fits['leg-near'], [1035, 610])
HIP_FAR = tf(fits['leg-far'], [1445, 640])
# Ankles: the top of the shin stub left under each leg's fluff, and the stub's direction on the rig pose.
ANKLE_NEAR = tf(fits['leg-near'], [1024, 664])
ANKLE_NEAR_DIR = math.degrees(math.atan2(52, 26)) + fits['leg-near']['th']
ANKLE_FAR = tf(fits['leg-far'], [1490, 700])
ANKLE_FAR_DIR = math.degrees(math.atan2(60, 30)) + fits['leg-far']['th']
SCARF_ROOT_1 = [652, 712]
SCARF_ROOT_2 = [646, 738]
GROUND = [700, 1300]

# ---- Feet (hands_props sheet): the top of the shin and the ankle where the toes branch, per piece.
FOOT_AXIS = {
    'foot-near-open': ([756, 42], [790, 140]),
    'foot-near-grip': ([1402, 52], [1440, 150]),
    'foot-far-open': ([258, 543], [300, 635]),
    'foot-far-grip': ([862, 567], [885, 650]),
}
FOOT_SCALE = {'near': 0.5, 'far': 0.58}


def foot_map(name):
    side = name.split('-')[1]
    a, b = FOOT_AXIS[name]
    J, ang = (ANKLE_NEAR, ANKLE_NEAR_DIR) if side == 'near' else (ANKLE_FAR, ANKLE_FAR_DIR)
    B = along(J, ang, FOOT_SCALE[side] * math.dist(a, b))
    return [a, b], [r1(J), r1(B)], similar(a, b, J, B)


def foot(name, z, shade=None):
    frm, to, _ = foot_map(name)
    side = name.split('-')[1]
    p = {'name': name, 'img': name, 'bone': f'foot.{side}', 'z': z, 'slot': f'foot.{side}', 'from': frm, 'to': to}
    if shade: p['shade'] = shade
    return p


# The crystal sits in the near foot's curled toes (centre of the grip's hollow, hands sheet), upright.
GRIP = foot_map('foot-near-grip')[2]
CRYSTAL_C = GRIP([1500, 318])
CRYSTAL_DOWN = GRIP([1500, 418])
CRYSTAL_H = 0.38 * 300  # rig px from the crystal's top to its bottom
d = [CRYSTAL_DOWN[0] - CRYSTAL_C[0], CRYSTAL_DOWN[1] - CRYSTAL_C[1]]
dl = math.hypot(*d)
d = [d[0] / dl, d[1] / dl]
CRYSTAL_TO = [r1([CRYSTAL_C[0] - d[0] * CRYSTAL_H / 2, CRYSTAL_C[1] - d[1] * CRYSTAL_H / 2]),
              r1([CRYSTAL_C[0] + d[0] * CRYSTAL_H / 2, CRYSTAL_C[1] + d[1] * CRYSTAL_H / 2])]

bones = [
    {'name': 'body', 'at': BODY},
    {'name': 'head', 'parent': 'body', 'at': NECK},
    {'name': 'tail', 'parent': 'body', 'at': TAIL},
    {'name': 'scarf.1', 'parent': 'body', 'at': SCARF_ROOT_1},
    {'name': 'scarf.2', 'parent': 'body', 'at': SCARF_ROOT_2},
    {'name': 'wing.near', 'parent': 'body', 'at': SHOULDER_NEAR},
    {'name': 'wingtip.near', 'parent': 'wing.near', 'at': WRIST_NEAR},
    {'name': 'wing.far', 'parent': 'body', 'at': SHOULDER_FAR},
    {'name': 'wingtip.far', 'parent': 'wing.far', 'at': WRIST_FAR},
    {'name': 'leg.near', 'parent': 'body', 'at': HIP_NEAR},
    {'name': 'foot.near', 'parent': 'leg.near', 'at': r1(ANKLE_NEAR)},
    {'name': 'leg.far', 'parent': 'body', 'at': HIP_FAR},
    {'name': 'foot.far', 'parent': 'leg.far', 'at': r1(ANKLE_FAR)},
]

FAR = 0.8      # far wing, pushed back
FAR_LEG = 0.86

# Scarf tails (head_faces sheet): root at the right end, streaming back to the left as drawn.
SCARF = {'scarf-tail-1': ([380, 730], [35, 640]), 'scarf-tail-2': ([565, 712], [195, 838])}
SCARF_SCALE = 0.75


def scarf(name, bone, z, root):
    a, b = SCARF[name]
    tip = [root[0] + (b[0] - a[0]) * SCARF_SCALE, root[1] + (b[1] - a[1]) * SCARF_SCALE]
    return {'name': name, 'img': name, 'bone': bone, 'z': z, 'from': [a, b], 'to': [r1(root), r1(tip)]}


parts = [
    # Far wing, behind everything: fan under the arm.
    fitted('wing-far-out', 'wingtip.far', 2, [495, 790], [770, 560], shade=FAR),
    fitted('wing-far-in', 'wing.far', 4, [95, 790], [330, 545], shade=FAR),
    # Far leg and foot.
    fitted('leg-far', 'leg.far', 6, [1445, 560], [1490, 705], shade=FAR_LEG),
    foot('foot-far-open', 7, FAR_LEG),
    foot('foot-far-grip', 7, FAR_LEG),
    fitted('tail', 'tail', 10, [790, 262], [440, 320]),
    scarf('scarf-tail-2', 'scarf.2', 11, SCARF_ROOT_2),
    scarf('scarf-tail-1', 'scarf.1', 12, SCARF_ROOT_1),
    # The crystal, gripped by the near foot (its toes wrap in front).
    {'name': 'crystal', 'img': 'crystal', 'bone': 'foot.near', 'z': 14, 'slot': 'loot', 'from': [[311, 123], [311, 423]], 'to': CRYSTAL_TO},
    fitted('leg-near', 'leg.near', 16, [1030, 545], [1040, 700]),
    foot('foot-near-open', 17),
    foot('foot-near-grip', 17),
    {'name': 'body', 'img': 'body', 'bone': 'body', 'z': 20, 'from': BODY_FROM, 'to': BODY_TO},
    # Near wing over the body, under the head and scarf.
    fitted('wing-near-out', 'wingtip.near', 30, [1590, 365], [1250, 60]),
    fitted('wing-near-in', 'wing.near', 32, [1165, 375], [880, 60]),
    fitted('head', 'head', 40, [60, 300], [460, 470]),
]

# Lower beaks: the top edge (hinge -> front) runs along the closed beak's line under the upper beak.
GAPE, LIP = [805, 667], [893, 703]
BEAKS = {'beak-closed': ([764, 694], [943, 723]), 'beak-cry': ([1075, 709], [1243, 723]), 'beak-chirp': ([1411, 712], [1546, 741])}
for n, (a, b) in BEAKS.items():
    parts.append({'name': n, 'img': n, 'bone': 'head', 'z': 41, 'slot': 'beak', 'from': [a, b], 'to': [GAPE, LIP]})

# Eyes: each piece's two eyes (iris centres, or the lid lines of closed eyes) land on the rig pose's eyes at one
# shared scale, centred between them. The far eye is lifted a touch so it clears the beak.
EYE_N, EYE_F = [800, 606], [889, 608]
EYE_SCALE = 0.765
EYES = {
    'eyes-confident': ([604.1, 250.6], [719.5, 262.1]),
    'eyes-fierce': ([891.3, 255.1], [1011.1, 264.3]),
    'eyes-happy': ([1178, 240], [1318, 250]),
    'eyes-closed': ([1482, 255], [1603, 265]),
    'eyes-hurt': ([603, 472], [737, 482]),
    'eyes-surprised': ([890.9, 506.2], [1004.0, 519.5]),
    'eyes-proud': ([1204.9, 517.9], [1316.3, 526.8]),
    'eyes-determined': ([1484.9, 520.6], [1601.7, 523.6]),
}
M = [(EYE_N[0] + EYE_F[0]) / 2, (EYE_N[1] + EYE_F[1]) / 2]
D = math.atan2(EYE_F[1] - EYE_N[1], EYE_F[0] - EYE_N[0])
for n, (a, b) in EYES.items():
    m = [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2]
    d0 = math.atan2(b[1] - a[1], b[0] - a[0])
    frm = [r1(along(m, math.degrees(d0), -50)), r1(along(m, math.degrees(d0), 50))]
    to = [r1(along(M, math.degrees(D), -50 * EYE_SCALE)), r1(along(M, math.degrees(D), 50 * EYE_SCALE))]
    parts.append({'name': n, 'img': n, 'bone': 'head', 'z': 42, 'slot': 'eyes', 'from': frm, 'to': to})

rig = {
    'id': 'talon',
    'ground': GROUND,
    'bones': bones,
    'parts': parts,
    'springs': [
        {'bone': 'scarf.1', 'tip': scarf('scarf-tail-1', 'scarf.1', 0, SCARF_ROOT_1)['to'][1], 'gain': 0.05, 'freq': 2.1, 'damping': 0.25, 'max': 28},
        {'bone': 'scarf.2', 'tip': scarf('scarf-tail-2', 'scarf.2', 0, SCARF_ROOT_2)['to'][1], 'gain': 0.05, 'freq': 1.7, 'damping': 0.22, 'max': 30},
        {'bone': 'tail', 'tip': tf(fits['tail'], [440, 320]), 'gain': 0.015, 'freq': 2.6, 'damping': 0.35, 'max': 9},
    ],
    'points': {
        'head.top': {'part': 'head', 'at': [215, 95]},
        'beak': {'part': 'head', 'at': [455, 470]},
        'talons': {'part': 'foot-near-open', 'at': [880, 330]},
        'crystal': {'part': 'crystal', 'at': [311, 273]},
    },
    'blink': {'slot': 'eyes', 'open': 'eyes-confident', 'closed': 'eyes-closed'},
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


open(os.path.join(ROOT, 'art/rigs/talon.json'), 'w').write(dump(rig))
print('ground', GROUND, 'body', BODY, 'shoulders', SHOULDER_NEAR, SHOULDER_FAR, 'wrists', WRIST_NEAR, WRIST_FAR)
print('hips', HIP_NEAR, HIP_FAR, 'ankles', r1(ANKLE_NEAR), r1(ANKLE_FAR), 'crystal', CRYSTAL_TO)
