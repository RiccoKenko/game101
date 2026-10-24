"""Builds art/rigs/archer.json (the Feather Cap archer) from fits (fits.json) and measured points.
Rig coordinates: pixels of the trimmed rig pose (art/sliced/archer/rigpose.png), y down."""
import json, math, os, sys
from fitarch import tf, part as load_part
SP = os.environ.get('SP', os.getcwd())  # the sky-pirates-td checkout (run from its root)
fits = json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'fits.json')))
R = lambda p: [round(p[0], 1), round(p[1], 1)]

def fitted(key, a=None, b=None):
    """Two sheet points and where the fit carries them."""
    f = fits[key]
    a = a or f['c']; b = b or [f['c'][0] + 100, f['c'][1]]
    return [R(a), R(b)], [tf(f, a), tf(f, b)]

def along(A, d, length):
    n = math.hypot(*d); return [A[0] + d[0] / n * length, A[1] + d[1] / n * length]

parts = []
def P(name, img, bone, z, frm, to, **kw):
    p = {'name': name, 'img': img, 'bone': bone, 'z': z, 'from': [R(x) for x in frm], 'to': [R(x) for x in to]}
    p.update({k: v for k, v in kw.items() if v is not None})
    parts.append(p)

# --- Joints (rig pose) ---
J = {
  'hips': (480, 800), 'torso': (482, 760), 'head': (515, 470), 'hoodTip': (297, 214), 'capelet': (510, 520), 'quiver': (330, 600),
  'upperArm.r': (322, 625), 'forearm.r': (282, 708), 'hand.r': (237, 780),
  'upperArm.l': (650, 625), 'forearm.l': (677, 705), 'hand.l': (735, 803), 'bow': None,
  'thigh.r': (390, 815), 'shin.r': (386, 1008), 'thigh.l': (565, 815), 'shin.l': (573, 1008),
}
PARENT = {'torso': 'hips', 'head': 'torso', 'hoodTip': 'head', 'capelet': 'torso', 'quiver': 'torso', 'upperArm.r': 'torso',
          'forearm.r': 'upperArm.r', 'hand.r': 'forearm.r', 'upperArm.l': 'torso', 'forearm.l': 'upperArm.l', 'hand.l': 'forearm.l',
          'bow': 'hand.l', 'thigh.r': 'hips', 'shin.r': 'thigh.r', 'thigh.l': 'hips', 'shin.l': 'thigh.l'}
GROUND = (470, 1250)

# --- Back: cape body, quiver ---
P('cape', 'capelet', 'capelet', 2, [(1027, 147), (850, 395), (1211, 377)], [(531, 537), (222, 1008), (688, 978)])
P('quiver', 'quiver', 'quiver', 4, [(1170, 270), (1270, 520)], [(300, 560), (372, 740)])

# --- Far arm (bow arm, darker) ---
SH = 0.86
P('upper-arm-l', 'sleeve-b', 'upperArm.l', 14, [(528, 475), (633, 584)], [(652, 598), (677, 703)], width=1.1, shade=SH)
P('forearm-l', 'bracer', 'forearm.l', 12, [(1210, 502), (1289, 604)], [(676, 704), (737, 806)], width=1.0, shade=SH)
HAND_K = 0.62
FAR_AXIS = (40, 115)
for img, wrist in (('hand-l-open', (427, 860)), ('hand-l-grip', (690, 850))):
    P(img, img, 'hand.l', 20, [wrist, (wrist[0], wrist[1] - 200)], [J['hand.l'], along(J['hand.l'], FAR_AXIS, 200 * HAND_K)], width=HAND_K, shade=SH, slot='hand.l')
# The bow's grip sits in the fist: the fist centre is 85 sheet px from the wrist along the hand.
J['bow'] = tuple(R(along(J['hand.l'], FAR_AXIS, 85 * HAND_K)))
BOW_K = 0.83
P('bow', 'bow', 'bow', 18, [(205, 565), (205, 165)], [J['bow'], (J['bow'][0], J['bow'][1] - 400 * BOW_K)])

# --- Legs (far darker) ---
TH = 1.19
P('shin-l', 'shin', 'shin.l', 22, *fitted('shin#far', (902, 722), (893, 925)), shade=SH)
P('thigh-l', 'thigh', 'thigh.l', 24, [(574, 724), (560, 893)], [(566, 811), (573, 1012)], width=TH, shade=SH)
# The near boot keeps its toe to the right (the rig pose turns it out); its shin leans like the rig pose's.
P('shin-r', 'shin', 'shin.r', 26, [(902, 722), (893, 925)], [(384, 1012), (345, 1252)], width=TH)
P('thigh-r', 'thigh', 'thigh.r', 28, [(574, 724), (560, 893)], [(390, 811), (386, 1012)], width=TH)

# --- Body ---
P('torso', 'torso', 'torso', 30, *fitted('torso'))
P('hips', 'hips', 'hips', 34, *fitted('hips'))

# --- Near arm (string arm) ---
P('forearm-r', 'forearm-r', 'forearm.r', 42, [(300, 800), (300, 900)], [(227, 693), (227, 793)])
P('upper-arm-r', 'sleeve-a', 'upperArm.r', 44, [(1282, 139), (1366, 283)], [(334, 600), (290, 708)], width=1.1)
NEAR_AXIS = (-42, 140)
for img, cuff, sheet_axis in (('hand-r-open', (948, 855), (0, -1)), ('hand-r-pinch', (1258, 852), (0, -1)), ('hand-r-fist', (918, 522), (0.68, 0.733))):
    P(img, img, 'hand.r', 46, [cuff, along(cuff, sheet_axis, 200)], [J['hand.r'], along(J['hand.r'], NEAR_AXIS, 200 * 0.635)], width=0.635, slot='hand.r')

# --- Cape collar over the shoulders, head and face ---
P('cape-collar', 'cape-collar', 'torso', 50, [(1027, 147), (849, 232), (1180, 225)], [(531, 537), (260, 620), (680, 607)])
P('feather', 'feather', 'hoodTip', 58, *fitted('feather', (335, 775), (95, 628)))
P('head', 'head', 'head', 60, *fitted('head'))
eo = fits['eyes-open']
NOSE = {'eyes-open': (682.5, 335.1), 'eyes-half': (926.8, 331.7), 'eyes-closed': (1166.5, 330.4), 'eyes-happy': (1405.8, 330.9),
        'eyes-focus': (671.7, 568.4), 'eyes-hurt': (911.9, 568.5), 'eyes-ko': (1158.0, 571.7), 'eyes-surprised': (1400.3, 573.4)}
rig_nose = tf(eo, NOSE['eyes-open'])
for e, n in NOSE.items():
    a, b = n, (n[0] + 100, n[1])
    to_b = [rig_nose[0] + (tf(eo, (NOSE['eyes-open'][0] + 100, NOSE['eyes-open'][1]))[0] - rig_nose[0]),
            rig_nose[1] + (tf(eo, (NOSE['eyes-open'][0] + 100, NOSE['eyes-open'][1]))[1] - rig_nose[1])]
    P(e, e, 'head', 62, [a, b], [rig_nose, to_b], slot='eyes')
# Mouths: each mouth's lip line onto the rig pose's smile line (smile endpoints measured).
MOUTH_RIG = ((508, 407), (567, 408))
MOUTHS = {'mouth-smile': ((536, 744), (601, 744)), 'mouth-neutral': ((687, 752), (752, 752)), 'mouth-cheer': ((837, 734), (902, 734)),
          'mouth-determined': ((984, 752), (1047, 752)), 'mouth-shout': ((1125, 733), (1190, 733)), 'mouth-ouch': ((1271, 753), (1335, 753)),
          'mouth-o': ((1395, 742), (1460, 742))}
sw = math.dist(*MOUTHS['mouth-smile'])
for m, (a, b) in MOUTHS.items():
    cx = (a[0] + b[0]) / 2
    a2, b2 = (cx - sw / 2, a[1]), (cx + sw / 2, a[1])
    P(m, m, 'head', 62, [a2, b2], [MOUTH_RIG[0], MOUTH_RIG[1]], slot='mouth')

bones = [{'name': k, **({'parent': PARENT[k]} if k in PARENT else {}), 'at': list(R(v))} for k, v in J.items()]
rig = {
  'id': 'archer', 'ground': list(GROUND), 'bones': bones,
  'parts': sorted(parts, key=lambda p: p['z']),
  'springs': [
    {'bone': 'hoodTip', 'tip': [15, 75], 'gain': 0.05, 'freq': 2.2, 'damping': 0.3, 'max': 25},
    {'bone': 'capelet', 'tip': [450, 1000], 'gain': 0.02, 'freq': 2.6, 'damping': 0.4, 'max': 10},
  ],
  'points': {
    'bow.top': {'part': 'bow', 'at': [152, 172]}, 'bow.bottom': {'part': 'bow', 'at': [137, 893]}, 'bow.grip': {'part': 'bow', 'at': [205, 565]},
    'pinch': {'part': 'hand-r-pinch', 'at': [1296, 692]}, 'head.top': {'part': 'head', 'at': [250, 150]},
  },
  'blink': {'slot': 'eyes', 'open': 'eyes-open', 'half': 'eyes-half', 'closed': 'eyes-closed'},
  'string': {'top': 'bow.top', 'bottom': 'bow.bottom', 'nock': 'pinch', 'color': '#fbf4e2', 'width': 4, 'z': 19, 'drawnZ': 65},
  'arrow': {'img': 'arrow', 'nock': [412, 347], 'tip': [925, 347], 'length': 400, 'toward': 'bow.grip', 'z': 66},
}
# Slots show their first part by default: put the defaults first (eyes-open, mouth-smile, hand grips).
order = {'hand-l-grip': -1, 'hand-r-open': -1}
rig['parts'].sort(key=lambda p: (p['z'], order.get(p['name'], 0)))
out = f'{SP}/art/rigs/archer.json'
json.dump(rig, open(out, 'w'), indent=1)
print('wrote', out, len(parts), 'parts; bow joint', J['bow'], 'rig nose', rig_nose)
