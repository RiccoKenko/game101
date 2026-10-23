import os
"""Builds art/rigs/deckhand.json from the automatic fits (dh-fit*.json) plus hand-measured arms and face."""
import json, math
from fit import man

fits = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'deckhand_fit.json')))
boxes = {p['name']: p for e in man.values() for p in e['parts']}

def tf(f, p):
    """Sheet point -> rig point through a fitted similarity transform."""
    qx, qy = p[0] - f['c'][0], p[1] - f['c'][1]
    if f['mirror']: qx = -qx
    th = math.radians(f['th'])
    x = (qx * math.cos(th) - qy * math.sin(th)) * f['s'] + f['t'][0]
    y = (qx * math.sin(th) + qy * math.cos(th)) * f['s'] + f['t'][1]
    return [round(x, 1), round(y, 1)]

def fitted(name, key, bone, z, a, b, **extra):
    f = fits[key]
    return {'name': name, 'img': f['name'], 'bone': bone, 'z': z, 'from': [a, b], 'to': [tf(f, a), tf(f, b)], **extra}

def centre(name):
    p = boxes[name]
    return [p['x'] + p['w'] / 2, p['y'] + p['h'] / 2]

# Joints on the rig pose (measured), and points carried over from the fits.
knot_b = [round((tf(fits['bandana-tail-1'], [178, 645])[i] + tf(fits['bandana-tail-2'], [335, 645])[i]) / 2, 1) for i in (0, 1)]
knot_s = [round((tf(fits['sash-end-1'], [1200, 85])[i] + tf(fits['sash-end-2'], [1355, 85])[i]) / 2, 1) for i in (0, 1)]
THIGH_TOP, THIGH_BOTTOM = [815, 648], [712, 938]
SHIN_TOP, SOLE = [1268, 675], [1255, 952]
hip_r, knee_r = tf(fits['thigh'], THIGH_TOP), tf(fits['thigh'], THIGH_BOTTOM)
hip_l, knee_l = tf(fits['thigh#far'], THIGH_TOP), tf(fits['thigh#far'], THIGH_BOTTOM)
sole_r, sole_l = tf(fits['shin'], SOLE), tf(fits['shin#far'], SOLE)
ground = [545, round(max(sole_r[1], sole_l[1]))]

# Hands: each hand's wrist goes on the rig pose's wrist and its wrist-to-fingertips axis along the rig pose
# hand's, at the open hand's size. Wrists and axes measured on the hands sheet and the rig pose.
def unit(p, q):
    d = math.hypot(q[0] - p[0], q[1] - p[1])
    return [(q[0] - p[0]) / d, (q[1] - p[1]) / d], d

HAND_AXIS = {
    'hand-l-open': ([1172, 305], [1330, 520]), 'hand-l-fist': ([208, 700], [300, 860]),
    'hand-r-open': ([828, 702], [700, 925]), 'hand-r-grip': ([1305, 700], [1190, 880]),
}
RIG_HAND = {'l': ([885, 805], [905, 960]), 'r': ([150, 815], [130, 965])}
WRIST_L, WRIST_R = RIG_HAND['l'][0], RIG_HAND['r'][0]

def hand_map(name):
    """from/to pairs for a hand part, and a function taking its sheet points onto the rig pose."""
    side = name.split('-')[1]
    (a, tip), (A, TIP) = HAND_AXIS[name], RIG_HAND[side]
    open_a, open_tip = HAND_AXIS[f'hand-{side}-open']
    s = math.dist(A, TIP) / math.dist(open_a, open_tip)
    (ux, uy), _ = unit(a, tip)
    (Ux, Uy), _ = unit(A, TIP)
    turn = math.atan2(Uy, Ux) - math.atan2(uy, ux)
    def to_rig(p):
        dx, dy = p[0] - a[0], p[1] - a[1]
        return [round(A[0] + s * (dx * math.cos(turn) - dy * math.sin(turn)), 1), round(A[1] + s * (dx * math.sin(turn) + dy * math.cos(turn)), 1)]
    b = [a[0] + ux * 100, a[1] + uy * 100]
    return [a, [round(b[0], 1), round(b[1], 1)]], [to_rig(a), to_rig(b)], to_rig

GRIP = hand_map('hand-r-grip')[2]([1205, 810])
PALM_L = hand_map('hand-l-open')[2]([1265, 430])

def hand(name, bone, z, shade=None):
    frm, to, _ = hand_map(name)
    p = {'name': name, 'img': name, 'bone': bone, 'z': z, 'slot': bone, 'from': frm, 'to': to}
    if shade: p['shade'] = shade
    return p

bones = [
    {'name': 'hips', 'at': [555, 880]},
    {'name': 'torso', 'parent': 'hips', 'at': [555, 860]},
    {'name': 'head', 'parent': 'torso', 'at': [560, 478]},
    {'name': 'bandana', 'parent': 'head', 'at': knot_b},
    {'name': 'sash', 'parent': 'hips', 'at': knot_s},
    {'name': 'upperArm.l', 'parent': 'torso', 'at': [765, 585]},
    {'name': 'forearm.l', 'parent': 'upperArm.l', 'at': [835, 690]},
    {'name': 'hand.l', 'parent': 'forearm.l', 'at': WRIST_L},
    {'name': 'upperArm.r', 'parent': 'torso', 'at': [290, 580]},
    {'name': 'forearm.r', 'parent': 'upperArm.r', 'at': [212, 700]},
    {'name': 'hand.r', 'parent': 'forearm.r', 'at': WRIST_R},
    {'name': 'cutlass', 'parent': 'hand.r', 'at': GRIP},
    {'name': 'thigh.l', 'parent': 'hips', 'at': hip_l},
    {'name': 'shin.l', 'parent': 'thigh.l', 'at': knee_l},
    {'name': 'thigh.r', 'parent': 'hips', 'at': hip_r},
    {'name': 'shin.r', 'parent': 'thigh.r', 'at': knee_r},
]

far = 0.86
parts = [
    fitted('bandana-tail-1', 'bandana-tail-1', 'bandana', 4, [178, 645], [60, 860]),
    fitted('bandana-tail-2', 'bandana-tail-2', 'bandana', 5, [335, 645], [250, 860]),
    # Far arm, behind the body.
    {'name': 'upper-arm-l', 'img': 'upper-arm-r', 'bone': 'upperArm.l', 'z': 8, 'shade': far, 'from': [[1185, 440], [1345, 575]], 'to': [[765, 585], [835, 690]], 'width': 0.8},
    {'name': 'forearm-l', 'img': 'forearm-l', 'bone': 'forearm.l', 'z': 10, 'shade': far, 'from': [[712, 440], [865, 572]], 'to': [[835, 690], [905, 865]], 'width': 1.0},
    hand('hand-l-fist', 'hand.l', 11, far),
    hand('hand-l-open', 'hand.l', 11, far),
    # Legs: the baggy pants (hips) cover the thighs and the tops of the boots' gathered cuffs.
    fitted('thigh-l', 'thigh#far', 'thigh.l', 14, THIGH_TOP, THIGH_BOTTOM, shade=far),
    fitted('thigh-r', 'thigh', 'thigh.r', 16, THIGH_TOP, THIGH_BOTTOM),
    fitted('hips', 'hips', 'hips', 20, [818, 75], [818, 240]),
    fitted('shin-l', 'shin#far', 'shin.l', 17, SHIN_TOP, SOLE, shade=far),
    fitted('shin-r', 'shin', 'shin.r', 18, SHIN_TOP, SOLE),
    fitted('torso', 'torso', 'torso', 30, [360, 100], [350, 345]),
    fitted('sash-end-2', 'sash-end-2', 'sash', 32, [1355, 85], [1400, 340]),
    fitted('sash-end-1', 'sash-end-1', 'sash', 34, [1200, 85], [1165, 345]),
    # Near arm, over the body.
    {'name': 'forearm-r', 'img': 'forearm-r', 'bone': 'forearm.r', 'z': 40, 'from': [[362, 735], [195, 880]], 'to': [[212, 700], [125, 865]], 'width': 1.12},
    {'name': 'upper-arm-r', 'img': 'upper-arm-l', 'bone': 'upperArm.r', 'z': 42, 'from': [[395, 440], [205, 565]], 'to': [[290, 580], [212, 700]], 'width': 1.0},
    # The cutlass sits in the grip (its handle through the fist's hole), blade forward and down; the fingers wrap over it.
    {'name': 'cutlass', 'img': 'cutlass', 'bone': 'cutlass', 'z': 43, 'slot': 'weapon', 'from': [[425, 480], [425 - 118 * 0.758, 480 - 102 * 0.758]],
     'to': [GRIP, [round(GRIP[0] + 95 * math.cos(math.radians(60)), 1), round(GRIP[1] + 95 * math.sin(math.radians(60)), 1)]]},
    hand('hand-r-grip', 'hand.r', 44),
    hand('hand-r-open', 'hand.r', 44),
    # The stolen crystal rides in the far hand, over the belly and under the near arm.
    {'name': 'crystal', 'img': 'crystal', 'bone': 'hand.l', 'z': 45, 'slot': 'loot', 'from': [[732, 395], [832, 395]],
     'to': [[PALM_L[0] - 34, PALM_L[1]], [PALM_L[0] + 34, PALM_L[1]]]},
    fitted('head', 'head', 'head', 50, [110, 395], [432, 402]),
]

# Face pieces: every eye piece lands where the neutral eyes fit; mouths sit on the smile.
eyes = fits_eyes = {'c': [598.3, 295.7], 's': 0.89, 'th': 0.75, 'mirror': False, 't': [594.5, 282]}
for n in ['eyes-sneaky', 'eyes-angry', 'eyes-greedy', 'eyes-closed', 'eyes-hurt', 'eyes-ko', 'eyes-surprised', 'eyes-smug']:
    c = centre(n)
    f = {**eyes, 'c': c, 't': eyes['t'] if n == 'eyes-sneaky' else [eyes['t'][0], eyes['t'][1] + (boxes[n]['h'] - boxes['eyes-sneaky']['h']) * 0.0]}
    a, b = [c[0] - 60, c[1]], [c[0] + 60, c[1]]
    parts.append({'name': n, 'img': n, 'bone': 'head', 'z': 52, 'slot': 'eyes', 'from': [a, b], 'to': [tf(f, a), tf(f, b)]})
mouth = {'s': 0.85, 'th': -2, 'mirror': False, 't': [612, 393]}
for n in ['mouth-smirk', 'mouth-grin', 'mouth-laugh', 'mouth-gritted', 'mouth-ouch', 'mouth-o', 'mouth-smirk', 'mouth-tongue'][1:]:
    pass
for n in ['mouth-smirk', 'mouth-grin', 'mouth-laugh', 'mouth-gritted', 'mouth-ouch', 'mouth-o', 'mouth-tongue']:
    c = centre(n)
    f = {**mouth, 'c': c}
    a, b = [c[0] - 50, c[1]], [c[0] + 50, c[1]]
    parts.append({'name': n, 'img': n, 'bone': 'head', 'z': 52, 'slot': 'mouth', 'from': [a, b], 'to': [tf(f, a), tf(f, b)]})

rig = {
    'id': 'deckhand',
    'ground': ground,
    'bones': bones,
    'parts': parts,
    'springs': [
        {'bone': 'bandana', 'tip': tf(fits['bandana-tail-1'], [60, 860]), 'gain': 0.05, 'freq': 2.4, 'damping': 0.3, 'max': 25},
        {'bone': 'sash', 'tip': tf(fits['sash-end-1'], [1165, 345]), 'gain': 0.05, 'freq': 2.2, 'damping': 0.3, 'max': 22},
    ],
    'points': {'head.top': {'part': 'head', 'at': [230, 160]}},
    'blink': {'slot': 'eyes', 'open': 'eyes-sneaky', 'closed': 'eyes-closed'},
}

def dump(o, ind=0):
    """JSON with one bone / part per line, like hero.json."""
    pad = '  ' * ind
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

# Like hero.json, rig coordinates are pixels of the trimmed rig-pose picture (art/sliced/<id>/rigpose.png),
# which the dev viewer overlays; the fits above are in the original picture.
rp = man['rigpose']['parts'][0]
OX, OY = rp['x'] - 8, rp['y'] - 8
sh = lambda p: [round(p[0] - OX, 1), round(p[1] - OY, 1)]
rig['ground'] = sh(rig['ground'])
for b in rig['bones']: b['at'] = sh(b['at'])
for p in rig['parts']: p['to'] = [sh(q) for q in p['to']]
for sp in rig['springs']: sp['tip'] = sh(sp['tip'])
open('/home/user/game101/art/rigs/deckhand.json', 'w').write(dump(rig))
print('ground', ground, 'knees', knee_r, knee_l, 'soles', sole_r, sole_l, 'bandana', knot_b, 'sash', knot_s)
