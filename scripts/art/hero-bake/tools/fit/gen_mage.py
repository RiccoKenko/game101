"""Builds art/rigs/mage.json (Little Mage) from fits (fits_mage.json), measured sheet points and joints placed on
the rig pose. Rig coordinates: pixels of the trimmed rig pose (art/sliced/mage/rigpose.png), y down.
Run from the sky-pirates-td checkout root: CHAR=mage python3 <path>/gen_mage.py (needs numpy, Pillow and
art/sliced/mage/ from the slicer)."""
import json, math, os
os.environ.setdefault('CHAR', 'mage')
from fitarch import tf
SP = os.environ.get('SP', os.getcwd())
HERE = os.path.dirname(os.path.abspath(__file__))
fits = json.load(open(os.path.join(HERE, 'fits_mage.json')))
R = lambda p: [round(p[0], 1), round(p[1], 1)]
add = lambda a, b, k=1: (a[0] + b[0] * k, a[1] + b[1] * k)
sub = lambda a, b: (a[0] - b[0], a[1] - b[1])
def unit(v):
    n = math.hypot(*v); return (v[0] / n, v[1] / n)
def rot(v, deg):
    a = math.radians(deg); return (v[0] * math.cos(a) - v[1] * math.sin(a), v[0] * math.sin(a) + v[1] * math.cos(a))
perp = lambda v: (-v[1], v[0])

def fitted(key, a=None, b=None):
    """Two sheet points and where the fit carries them."""
    f = fits[key]
    a = a or f['c']; b = b or [f['c'][0] + 100, f['c'][1]]
    return [R(a), R(b)], [tf(f, a), tf(f, b)]

parts = []
def P(name, img, bone, z, frm, to, **kw):
    p = {'name': name, 'img': img, 'bone': bone, 'z': z, 'from': [R(x) for x in frm], 'to': [R(x) for x in to]}
    p.update({k: v for k, v in kw.items() if v is not None})
    parts.append(p)

def limb(name, img, bone, z, a, b, A, B, width, **kw):
    """Sheet points a, b (along the piece) onto rig points A, B, with an absolute scale `width` across."""
    P(name, img, bone, z, [a, b], [A, B], width=width, **kw)

def hand(name, img, bone, z, wrist, axis, joint, rest, k, mirror=False, **kw):
    """A hand: its wrist on the joint, its wrist->fingers `axis` (sheet) along the `rest` direction (rig), scale k.
    Mirrored hands use a third point, so the affine flips them."""
    ax = unit(axis); rest = unit(rest)
    n_s = perp(ax); n_r = perp(rest)
    if mirror: n_r = (-n_r[0], -n_r[1])
    P(name, img, bone, z, [wrist, add(wrist, ax, 100), add(wrist, n_s, 100)],
      [joint, add(joint, rest, 100 * k), add(joint, n_r, 100 * k)], **kw)
    def to_rig(p):
        d = sub(p, wrist); u = d[0] * ax[0] + d[1] * ax[1]; v = d[0] * n_s[0] + d[1] * n_s[1]
        return add(add(joint, rest, u * k), n_r, v * k)
    return to_rig

# --- Joints (rig pose) ---
GROUND = (440, 1374)
J = {
  'hips': (448, 790), 'torso': (450, 745), 'head': (450, 492), 'braid': None, 'hatTip': None, 'capelet': (436, 560),
  'upperArm.r': (285, 615), 'forearm.r': (240, 712), 'hand.r': (196, 810),
  'upperArm.l': (525, 615), 'forearm.l': (560, 712), 'hand.l': (598, 808), 'staff': None,
  'thigh.r': (330, 950), 'shin.r': None, 'thigh.l': (477, 950), 'shin.l': None,
}
PARENT = {'torso': 'hips', 'head': 'torso', 'braid': 'head', 'hatTip': 'head', 'capelet': 'torso', 'upperArm.r': 'torso',
          'forearm.r': 'upperArm.r', 'hand.r': 'forearm.r', 'upperArm.l': 'torso', 'forearm.l': 'upperArm.l', 'hand.l': 'forearm.l',
          'staff': 'hand.l', 'thigh.r': 'hips', 'shin.r': 'thigh.r', 'thigh.l': 'hips', 'shin.l': 'thigh.l'}
SH = 0.86  # far limbs darker

# --- Cape body (behind everything) ---
CLASP_S = (1193.5, 125)
CLASP = (436, 558)
P('cape', 'capelet', 'capelet', 2, [CLASP_S, (977.5, 425), (1350, 420)], [CLASP, (190, 1046), (586, 1038)])

# --- Legs: boots from the far boot's fit, both soles on the ground ---
fb = dict(fits['shin#far']); fb['t'] = [fb['t'][0], fb['t'][1] + (GROUND[1] - 1355)]
RIM = (873, 739)           # front rim of the boot's cuff (sheet)
BOOT_A, BOOT_B = (873, 739), (873, 900)
def boot(f):
    return [BOOT_A, BOOT_B], [tf(f, BOOT_A), tf(f, BOOT_B)]
nb = dict(fb); nb['t'] = [fb['t'][0] - 211, fb['t'][1]]
J['shin.l'] = tuple(R(add(tf(fb, RIM), (0, 6))))
J['shin.r'] = tuple(R(add(tf(nb, RIM), (0, 6))))
THIGH_A, THIGH_B = (563, 693), (531, 905)   # legging top (peg cut) and near its bottom end
TW = 0.86
def thigh(hipj, knee):
    d = unit(sub(knee, hipj)); return add(hipj, d, -28), add(knee, d, 40)
limb('thigh-l', 'thigh', 'thigh.l', 20, THIGH_A, THIGH_B, *thigh(J['thigh.l'], J['shin.l']), TW, shade=SH)
P('shin-l', 'shin', 'shin.l', 22, *boot(fb), shade=SH)
limb('thigh-r', 'thigh', 'thigh.r', 24, THIGH_A, THIGH_B, *thigh(J['thigh.r'], J['shin.r']), TW)
P('shin-r', 'shin', 'shin.r', 26, *boot(nb))

# --- Body ---
TORSO_K = 0.908
P('torso', 'torso', 'torso', 30, [(355, 235), (355, 135)], [(445, 642.5), add((445, 642.5), unit((0.06, -1)), 100 * TORSO_K)])
P('hips', 'hips', 'hips', 34, [(747.5, 112.5), (600, 160), (700, 345)], [(449, 724), (313, 781), (446, 987)])

# --- Arms: a bell sleeve (forearm, with the cuff) over a tube (upper arm); hands on top ---
def arm(side, upper_img, bell_img, z, tube_tip, tube_u, bell_tip, bell_u, bell_cuff, shade=None):
    S, E, W = J[f'upperArm.{side}'], J[f'forearm.{side}'], J[f'hand.{side}']
    du = unit(sub(E, S)); df = unit(sub(W, E))
    # Tube: from just past its (cut) peg end to just before its (cut) cuff, from above the shoulder to past the elbow.
    ta, tb = add(tube_tip, tube_u, 30), add(tube_tip, tube_u, 106)
    limb(f'upper-arm-{side}', upper_img, f'upperArm.{side}', z, ta, tb, add(S, du, -18), add(E, du, 22), 0.84, shade=shade)
    # Bell: the elbow sits a half-width inside its (cut) narrow end; the cuff opening on the wrist.
    elbow_s = add(bell_tip, bell_u, 26 + 34)
    limb(f'forearm-{side}', bell_img, f'forearm.{side}', z + 2, elbow_s, bell_cuff, E, W, 0.9, shade=shade)
    return df

FAR_DIR = arm('l', 'tube-b', 'sleeve-a', 12, (1116.7, 497.4), unit((0.89, 0.457)), (362.8, 456.9), unit((-0.77, 0.638)), (202.5, 585), shade=SH)
NEAR_DIR = arm('r', 'tube-a', 'sleeve-b', 40, (475.2, 493.5), unit((0.894, 0.448)), (831.1, 457.5), unit((0.744, 0.668)), (986.7, 590))

HAND_K = 0.5
# Far hand: the grip (default) holds the staff through the hole in the fist; the open hand is mirrored (fingers forward).
GRIP_WRIST, GRIP_AXIS, GRIP_HOLE = (1088, 338), (0.736, -0.677), (1152.3, 260)
grip = hand('hand-l-grip', 'hand-l-grip', 'hand.l', 18, GRIP_WRIST, GRIP_AXIS, J['hand.l'], FAR_DIR, HAND_K, shade=SH, slot='hand.l')
hand('hand-l-open', 'hand-l-open', 'hand.l', 18, (838, 322), (-0.942, -0.335), J['hand.l'], FAR_DIR, HAND_K, mirror=True, shade=SH, slot='hand.l')
J['staff'] = tuple(R(grip(GRIP_HOLE)))
# Staff: its shaft runs up the sheet (from (287.5, 890) to below the ring (311, 330)); gripped at G.
STAFF_K, STAFF_W = 1.2, 1.0
s_up = unit((311 - 287.5, 330 - 890))
G_Y = 392   # about a third down from the top, so the foot reaches the ground with the hand at the waist
G = (287.5 + (890 - G_Y) * (311 - 287.5) / (890 - 330), G_Y)
# In the fist's own frame the staff runs up the sheet: carry that direction through the hand's turn.
rig_up = unit(sub(grip(add(GRIP_HOLE, (0, -100))), grip(GRIP_HOLE)))
P('staff', 'staff', 'staff', 16, [G, add(G, s_up, 200)], [J['staff'], add(J['staff'], rig_up, 200 * STAFF_K)], width=STAFF_W)
# Near hand: open (mirrored: fingers forward, palm up, thumb up) is the default; pointing hand for the run.
palm = hand('hand-r-open', 'hand-r-open', 'hand.r', 44, (826, 713), (-0.939, -0.343), J['hand.r'], NEAR_DIR, HAND_K, mirror=True, slot='hand.r')
hand('hand-r-point', 'hand-r-point', 'hand.r', 44, (1036, 712), (0.952, -0.307), J['hand.r'], NEAR_DIR, HAND_K, slot='hand.r')

# --- Cape collar over the shoulders, head, braid, hat tip and face ---
P('cape-collar', 'cape-collar', 'torso', 50, [CLASP_S, (994, 232.5), (1330, 205)], [CLASP, (203, 688), (565, 664)])
P('head', 'head', 'head', 60, *fitted('head'))
hf = fits['head']
TIP_PIVOT = (165, 128)
J['hatTip'] = tuple(R(tf(hf, TIP_PIVOT)))
P('hat-tip', 'hat-tip', 'hatTip', 61, *fitted('head', TIP_PIVOT, (80, 240)))
BRAID_K = hf['s']
RIBBON_S, RIBBON = (258, 778), (233, 513)
braid_dir = unit(rot((0, -1), 21.4))   # the bunch leans up towards the ear
J['braid'] = tuple(R(add(RIBBON, braid_dir, 128 * BRAID_K)))
P('braid', 'braid', 'braid', 61, [RIBBON_S, (258, 650)], [RIBBON, J['braid']])

# Eyes: every piece shares the open eyes' fit, anchored between its two eyes (row 2 is drawn 244 px lower).
eo = fits['eyes-open']
ANCHOR = {'eyes-open': (702, 335.5), 'eyes-half': (926, 335.5), 'eyes-closed': (1145.5, 335.5), 'eyes-happy': (1361.8, 335.5),
          'eyes-focus': (690.5, 579.5), 'eyes-hurt': (917.8, 579.5), 'eyes-ko': (1137.5, 579.5), 'eyes-surprised': (1366, 579.5)}
a0 = ANCHOR['eyes-open']
rig_eye, rig_eye_b = tf(eo, a0), tf(eo, (a0[0] + 100, a0[1]))
for e, a in ANCHOR.items():
    P(e, e, 'head', 62, [a, (a[0] + 100, a[1])], [rig_eye, rig_eye_b], slot='eyes')
# Mouths: each centred on the rig pose's smile, open mouths a little lower; all at one scale.
MOUTH_K, MOUTH = 0.9, (449, 431)
MOUTHS = {'mouth-smile': ((552, 807), 0), 'mouth-neutral': ((696, 804), 0), 'mouth-cheer': ((847, 796.5), 12), 'mouth-determined': ((990.5, 806), 0),
          'mouth-shout': ((1134.5, 796), 14), 'mouth-ouch': ((1287.5, 807), 1), 'mouth-o': ((1418.5, 804), 5)}
for m, (c, dy) in MOUTHS.items():
    P(m, m, 'head', 62, [c, (c[0] + 100, c[1])], [(MOUTH[0], MOUTH[1] + dy), (MOUTH[0] + 100 * MOUTH_K, MOUTH[1] + dy)], slot='mouth')

bones = [{'name': k, **({'parent': PARENT[k]} if k in PARENT else {}), 'at': list(R(v))} for k, v in J.items()]
rig = {
  'id': 'mage', 'ground': list(GROUND), 'bones': bones,
  'parts': sorted(parts, key=lambda p: p['z']),
  'springs': [
    {'bone': 'braid', 'tip': list(R(add(RIBBON, braid_dir, -70))), 'gain': 0.05, 'freq': 2.0, 'damping': 0.3, 'max': 22},
    {'bone': 'hatTip', 'tip': list(R(tf(hf, (80, 240)))), 'gain': 0.035, 'freq': 2.4, 'damping': 0.35, 'max': 10},
    {'bone': 'capelet', 'tip': [400, 1040], 'gain': 0.02, 'freq': 2.6, 'damping': 0.4, 'max': 10},
  ],
  'points': {
    'crystal': {'part': 'staff', 'at': [330, 182.5]}, 'staff.foot': {'part': 'staff', 'at': [287.5, 925]},
    'palm': {'part': 'hand-r-open', 'at': [705, 672]}, 'fingertip': {'part': 'hand-r-point', 'at': [1278, 650]},
    'head.top': {'part': 'head', 'at': [300, 70]},
  },
  'blink': {'slot': 'eyes', 'open': 'eyes-open', 'half': 'eyes-half', 'closed': 'eyes-closed'},
}
order = {'hand-l-grip': -1, 'hand-r-open': -1}
rig['parts'].sort(key=lambda p: (p['z'], order.get(p['name'], 0)))
out = f'{SP}/art/rigs/mage.json'
json.dump(rig, open(out, 'w'), indent=1)
# Rest angles (degrees, y-up, counter-clockwise) the clips need to aim the staff and the hands.
ang = lambda v: round(math.degrees(math.atan2(-v[1], v[0])), 2)
print('wrote', out, len(parts), 'parts')
print('staff joint', J['staff'], 'staff rest angle (up)', ang(rig_up), 'near hand rest', ang(NEAR_DIR), 'far hand rest', ang(FAR_DIR))
print('knees', J['shin.r'], J['shin.l'], 'braid', J['braid'], 'hatTip', J['hatTip'], 'eyes at', R(rig_eye))
