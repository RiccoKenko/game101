"""Builds art/rigs/parrot_raider.json from the fits (parrot_raider_fit.json) plus hand-measured points.

Run from anywhere: python3 scripts/tools/parrot_raider_rig.py (then `npm run art:publish -- parrot_raider`).
Fits and points are in the ORIGINAL rig-pose picture; the rig is written in the trimmed one (rigpose.png).
The fits come from parrot_raider_fit.py (colour fits: head, body, tail, neckerchief, legs, feet, eyes, beak)
and, for the wings, from feather-tip landmarks matched by least squares (the rig pose draws the wings more
spread than the parts sheet, and the far wing foreshortened, hence its 3-point mapping).
"""
import json, math, os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '../..'))
fits = json.load(open(os.path.join(HERE, 'parrot_raider_fit.json')))
man = json.load(open(os.path.join(ROOT, 'art/sliced/parrot_raider/manifest.json')))
boxes = {p['name']: p for e in man.values() for p in e['parts']}
R = lambda p: [round(p[0], 1), round(p[1], 1)]


def mapper(f):
    """Sheet point -> rig point for a fit: similarity (c, s, th, t), two point pairs (+width) or three."""
    if 'c' in f:
        th = math.radians(f['th'])
        def m(p):
            qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
            if f['mirror']: qx = -qx
            return R([(qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0], (qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1]])
        return m
    if 'from3' in f:
        (a, b, c), (A, B, C) = f['from3'], f['to3']
        u1, u2 = [b[0] - a[0], b[1] - a[1]], [c[0] - a[0], c[1] - a[1]]
        w1, w2 = [B[0] - A[0], B[1] - A[1]], [C[0] - A[0], C[1] - A[1]]
        det = u1[0] * u2[1] - u2[0] * u1[1]
        def m(p):
            d = [p[0] - a[0], p[1] - a[1]]
            # d = i*u1 + j*u2
            i = (d[0] * u2[1] - u2[0] * d[1]) / det
            j = (u1[0] * d[1] - d[0] * u1[1]) / det
            return R([A[0] + i * w1[0] + j * w2[0], A[1] + i * w1[1] + j * w2[1]])
        return m
    (a, b), (A, B) = f['from'], f['to']
    along = math.dist(A, B) / math.dist(a, b)
    wid = f.get('width', along)
    phi, PHI = math.atan2(b[1] - a[1], b[0] - a[0]), math.atan2(B[1] - A[1], B[0] - A[0])
    def m(p):
        dx, dy = p[0] - a[0], p[1] - a[1]
        u = (math.cos(phi) * dx + math.sin(phi) * dy) * along
        v = (-math.sin(phi) * dx + math.cos(phi) * dy) * wid
        return R([A[0] + math.cos(PHI) * u - math.sin(PHI) * v, A[1] + math.sin(PHI) * u + math.cos(PHI) * v])
    return m


M = {k: mapper(f) for k, f in fits.items()}


def part(name, bone, z, pts, key=None, img=None, **extra):
    """A part pinned by sheet points `pts` (2, or 3 for a skewed fit) carried onto the rig pose by its fit."""
    m = M[key or name]
    return {'name': name, 'img': img or name, 'bone': bone, 'z': z, 'from': [list(p) for p in pts], 'to': [m(p) for p in pts], **extra}


def moved(key, shift):
    """A fit's mapping applied after shifting sheet points by `shift` (to pin a sibling piece where `key` sits)."""
    return lambda p: M[key]([p[0] + shift[0], p[1] + shift[1]])


def pinned(name, bone, z, pts, m, **extra):
    return {'name': name, 'img': name, 'bone': bone, 'z': z, 'from': [list(p) for p in pts], 'to': [m(p) for p in pts], **extra}


# ---- Feet: each open foot keeps its fitted size and turn, its ankle cap centred on the leg's cut end. The grip
# foot sits where the open one does, matched by the ankle caps (same size on the sheet).
ANKLE_N = M['leg-near']([347, 851])  # the near leg's tarsus, cut just above the toes (see sheets.json erase)
ANKLE_F = M['leg-far']([814, 856])
CAP = {'foot-near-open': [704, 197], 'foot-near-grip': [1192.5, 190], 'foot-far-open': [226.5, 673], 'foot-far-grip': [698, 680]}


def foot_map(open_key, ankle, lift=4):
    at = M[open_key](CAP[open_key])
    dx, dy = ankle[0] - at[0], ankle[1] - lift - at[1]
    return lambda p: R([M[open_key](p)[0] + dx, M[open_key](p)[1] + dy])


FN = foot_map('foot-near-open', ANKLE_N)
FF = foot_map('foot-far-open', ANKLE_F)
grip_n = lambda p: FN([p[0] + CAP['foot-near-open'][0] - CAP['foot-near-grip'][0], p[1] + CAP['foot-near-open'][1] - CAP['foot-near-grip'][1]])
grip_f = lambda p: FF([p[0] + CAP['foot-far-open'][0] - CAP['foot-far-grip'][0], p[1] + CAP['foot-far-open'][1] - CAP['foot-far-grip'][1]])

# What the grips hold: the crystal in the near grip's curl, the hook's rope coil in the far grip's.
HOLD_N = grip_n([1300, 345])
HOLD_F = grip_f([770, 790])

# ---- Joints on the rig pose.
SHOULDER_N = M['wing-near-in']([1385, 280])
WRIST_N = M['wing-near-in']([1305, 200])
SHOULDER_F = M['wing-far-in']([748, 632])
WRIST_F = M['wing-far-in']([800, 575])
KNOT = M['neckerchief']([1212, 783])
TAIL_ROOT = [592, 832]
bones = [
    {'name': 'body', 'at': [700, 800]},
    {'name': 'head', 'parent': 'body', 'at': [738, 655]},
    {'name': 'neckerchief', 'parent': 'body', 'at': KNOT},
    {'name': 'tail', 'parent': 'body', 'at': TAIL_ROOT},
    {'name': 'wing.far', 'parent': 'body', 'at': SHOULDER_F},
    {'name': 'wingTip.far', 'parent': 'wing.far', 'at': WRIST_F},
    {'name': 'wing.near', 'parent': 'body', 'at': SHOULDER_N},
    {'name': 'wingTip.near', 'parent': 'wing.near', 'at': WRIST_N},
    {'name': 'leg.far', 'parent': 'body', 'at': M['leg-far']([810, 770])},
    {'name': 'foot.far', 'parent': 'leg.far', 'at': ANKLE_F},
    {'name': 'hook', 'parent': 'foot.far', 'at': HOLD_F},
    {'name': 'leg.near', 'parent': 'body', 'at': M['leg-near']([350, 745])},
    {'name': 'foot.near', 'parent': 'leg.near', 'at': ANKLE_N},
]

FAR = 0.82
# The hook hangs from the far grip by its rope coil (no hook in the rig pose: it hangs straight down, 0.7 size).
HOOK_TOP, HOOK_TIP = [300, 150], [290, 528]
hook_len = math.dist(HOOK_TOP, HOOK_TIP) * 0.7
HOOK_END = R([HOLD_F[0] - 10, HOLD_F[1] + hook_len])

parts = [
    # Far wing, behind everything (shaded).
    part('wing-far-out', 'wingTip.far', 2, fits['wing-far-out']['from3'], shade=FAR),
    part('wing-far-in', 'wing.far', 4, [[735, 645], [970, 400]], shade=FAR, width=fits['wing-far-in']['width']),
    part('tail', 'tail', 6, [[985, 110], [640, 380]]),
    # Far leg and foot, behind the body and the near leg; the hook hangs from the far grip.
    {'name': 'hook', 'img': 'hook', 'bone': 'hook', 'z': 7, 'slot': 'hook', 'shade': 0.92, 'from': [HOOK_TOP, HOOK_TIP], 'to': [HOLD_F, HOOK_END]},
    part('leg-far', 'leg.far', 8, [[810, 770], [814, 856]], shade=FAR),
    pinned('foot-far-open', 'foot.far', 9, [[226.5, 673], [330, 840]], FF, slot='foot.far', shade=FAR),
    pinned('foot-far-grip', 'foot.far', 9, [[698, 680], [780, 840]], grip_f, slot='foot.far', shade=FAR),
    # Near leg and foot, in front of the tail and far leg but under the belly feathers (the thighs tuck in);
    # the stolen crystal rides in the near grip, under the toes.
    part('leg-near', 'leg.near', 12, [[350, 745], [347, 851]]),
    {'name': 'crystal', 'img': 'crystal', 'bone': 'foot.near', 'z': 13, 'slot': 'loot', 'from': [[732, 395], [832, 395]],
     'to': [[HOLD_N[0] - 46, HOLD_N[1]], [HOLD_N[0] + 46, HOLD_N[1]]]},
    pinned('foot-near-open', 'foot.near', 14, [[704, 197], [830, 420]], FN, slot='foot.near'),
    pinned('foot-near-grip', 'foot.near', 14, [[1192.5, 190], [1300, 400]], grip_n, slot='foot.near'),
    part('body', 'body', 20, [[220, 200], [520, 200]]),
    part('neckerchief', 'neckerchief', 22, [[1212, 783], [1400, 950]]),
    # Near wing over the body and legs, under the head (the head's cheek feathers overlap its root).
    part('wing-near-out', 'wingTip.near', 30, fits['wing-near-out']['from3']),
    part('wing-near-in', 'wing.near', 32, [[1155, 22], [1415, 290]]),
    part('head', 'head', 40, [[100, 500], [480, 500]]),
]

# Face: every eye piece lands where the cheeky eyes fit (matched by the middle of the eyes and the bottom of the
# eyeballs); every lower beak hinges at the mouth corner (its top-left tip) where the closed beak fits.
eye_anchor = lambda n: [boxes[n]['x'] + boxes[n]['w'] / 2, boxes[n]['y'] + boxes[n]['h']]
EYES = ['eyes-cheeky', 'eyes-angry', 'eyes-greedy', 'eyes-closed', 'eyes-hurt', 'eyes-ko', 'eyes-surprised', 'eyes-smug']
# Small per-piece nudges (sheet px) where the drawn eyes sit differently in their boxes.
EYE_NUDGE = {'eyes-closed': [0, 6], 'eyes-hurt': [0, 4]}
for n in EYES:
    a, c = eye_anchor(n), eye_anchor('eyes-cheeky')
    nd = EYE_NUDGE.get(n, [0, 0])
    m = moved('eyes-cheeky', [c[0] - a[0] + nd[0], c[1] - a[1] + nd[1]])
    pts = [[a[0] - 80, a[1] - 60], [a[0] + 80, a[1] - 60]]
    parts.append(pinned(n, 'head', 42, pts, m, slot='eyes'))
mouth_anchor = lambda n: [boxes[n]['x'] + 3, boxes[n]['y'] + 4]
for n in ['beak-closed', 'beak-squawk', 'beak-laugh', 'beak-tongue']:
    a, c = mouth_anchor(n), mouth_anchor('beak-closed')
    m = moved('beak-closed', [c[0] - a[0], c[1] - a[1]])
    pts = [a, [a[0] + 150, a[1] + 40]]
    parts.append(pinned(n, 'head', 41, pts, m, slot='beak'))

HAT_TOP = M['head']([244, 281])
GROUND = [700, 1140]
rig = {
    'id': 'parrot_raider',
    'ground': GROUND,
    'bones': bones,
    'parts': parts,
    'springs': [
        {'bone': 'neckerchief', 'tip': M['neckerchief']([1400, 950]), 'gain': 0.05, 'freq': 2.6, 'damping': 0.3, 'max': 28},
        {'bone': 'hook', 'tip': HOOK_END, 'gain': 0.04, 'freq': 1.5, 'damping': 0.22, 'max': 35},
        {'bone': 'tail', 'tip': M['tail']([640, 380]), 'gain': 0.015, 'freq': 2.0, 'damping': 0.4, 'max': 10},
    ],
    'points': {'head.top': {'part': 'head', 'at': [244, 281]}},
    'blink': {'slot': 'eyes', 'open': 'eyes-cheeky', 'closed': 'eyes-closed'},
    'borrow': {'crystal': 'deckhand/crystal'},
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


# Rig coordinates are pixels of the trimmed rig-pose picture (art/sliced/parrot_raider/rigpose.png).
rp = man['rigpose']['parts'][0]
OX, OY = rp['x'] - 8, rp['y'] - 8
sh = lambda p: [round(p[0] - OX, 1), round(p[1] - OY, 1)]
rig['ground'] = sh(rig['ground'])
for b in rig['bones']: b['at'] = sh(b['at'])
for p in rig['parts']: p['to'] = [sh(q) for q in p['to']]
for sp in rig['springs']: sp['tip'] = sh(sp['tip'])
open(os.path.join(ROOT, 'art/rigs/parrot_raider.json'), 'w').write(dump(rig))
print('ground', sh(GROUND), 'hat top', sh(HAT_TOP), 'height', round(GROUND[1] - HAT_TOP[1]), 'shoulders', sh(SHOULDER_N), sh(SHOULDER_F),
      'ankles', sh(ANKLE_N), sh(ANKLE_F), 'holds', sh(HOLD_N), sh(HOLD_F))
