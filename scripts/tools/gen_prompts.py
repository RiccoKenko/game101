"""Builds the all-in-one Codex prompts for the remaining characters (section 10 of CHARACTER_BRIEF.md)."""
import os, re

import tempfile
OUT = os.environ.get('OUT', os.path.join(tempfile.gettempdir(), 'sky-pirates-prompts'))

STYLE = """STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). {PROPORTIONS}
- Mood: warm, adventurous fantasy, in the spirit of classic early-2000s Korean fantasy MMORPG character art redrawn at modern quality. Charming and a little cool, never babyish.
- Line art: clean and confident, dark warm brown (#3B2A2A), never pure black. Outer contour about 4 px, inner lines about 2 px at 1024 px image height. Same weight in every image.
- Colouring: anime cel shading with a flat base colour, one soft cool shadow tone (slightly violet) and small crisp highlights. Light comes from the upper left in every image. Gentle gradients on hair, fur, feathers and cloth are fine.
- Eyes: large and expressive, with two white catch-lights and a bold upper lash line.
- Detail: stitches, folds, straps, rivets and feathers, but keep big readable shapes; the silhouette must still read at 100 px tall.
- View: 3/4 front view, body and face turned toward the RIGHT edge of the image, camera at eye level, unless I say otherwise.
- Avoid: 3D render, plastic / vinyl toy / clay look, Roblox or Minecraft blockiness, realistic proportions, photo textures, heavy noise, thick sticker outlines, glossy 3D highlights.
- It must look like it belongs in the same game as Little Archer (the hero) and the Deckhand pirate: same line colour, same shading, same level of detail.

TECHNICAL
- Background: real transparent background if you can. Otherwise a perfectly flat solid #FF00FF magenta background (no gradient, texture, floor or shadow). Never draw a checkerboard pattern. Never use magenta inside the character.
- No text, letters, numbers, labels, logos, signatures, watermarks, frames, borders or UI anywhere.
- No ground shadow, glow, aura, motion lines, sparkles or particles.
- Never crop the character or any part; keep at least 5% empty margin on every side.
- Highest resolution available (at least 1024 px; 2048 px or more if possible).
- Keep the SAME character design in every image: same face, colours (use the hex codes), outfit details and proportions."""

PART_RULES = """PART RULES (the parts sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath.
- Joint ends are rounded and extend about 15% past the joint, so bending never shows a gap. Do NOT paint flat skin-coloured "cut" ovals on the joint ends: the end simply continues the part's own colour and shape.
- Keep each part in the orientation it has in the rig pose (Image 2) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- {SWING}"""

HUMAN_SWING = "Anything that should swing on its own ({THINGS}) is its own part. The torso includes a short neck stub; the head does not include the neck."

def prompt(c):
    n = len(c['images'])
    lines = [f'You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, {c["name"]}, as {n} images that the game team will slice into parts and animate with 2D bones.', '',
        'HOW WE WORK',
        '- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.',
        '- Under each image write only one line: "Save as: <file name>". Then wait.',
        '- When I write NEXT (or ต่อ), make the next image.',
        '- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.',
        '- Any other comment from me is a change request for the last image: redraw it with that change.',
        '- After Image 1, STOP. Do not start Image 2 until I write APPROVED (or ผ่าน). Until then, only revise Image 1 as I ask.',
        f'- Images 2 to {n} must match the approved Image 1 (the master) exactly, and from Image 3 on also Image 2 (the rig pose). Use them as reference images if you can.', '',
        STYLE.replace('{PROPORTIONS}', c['proportions']), '',
        c['card'], '',
        PART_RULES.replace('{SWING}', c['swing']), '',
        'IMAGE LIST', '']
    for i, (file, body) in enumerate(c['images'], 1):
        lines.append(f'Image {i} (save as {c["id"]}_{file}.png): {body.strip()}')
        lines.append('')
    lines += ['HOW TO DELIVER',
        '- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.',
        '- No repository or file work: do not create branches, commits or pull requests.', '',
        'Start now with Image 1.']
    return '\n'.join(lines)

MASTER = """MASTER ILLUSTRATION, portrait orientation.
The character, full body, {VIEW}, in this signature pose: {POSE}.
This is the character's key art: make it the most appealing, polished version."""

def master(view, pose):
    return MASTER.replace('{VIEW}', view).replace('{POSE}', pose)

def sheet(kind, items, extra=''):
    title = {'head_faces': 'HEAD & FACES PARTS SHEET', 'parts_body': 'BODY PARTS SHEET', 'hands_props': 'HANDS & PROPS SHEET'}[kind]
    return f"""{title}, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
{items}{extra}
Follow the PART RULES."""

def faces(head, eyes, mouths, eye_note='Each eye piece is BOTH eyes together with their eyebrows, spaced and angled exactly as they sit on the blank head (3/4 view, so the far eye is slightly narrower)', mouth_title='MOUTH pieces, sized to fit the blank head'):
    return f"""HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
{head}
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK where the eyes{' and mouth' if mouths else ''} go. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. {eye_note}: {eyes}""" + (f"""
- Row 3, {mouth_title}: {mouths}""" if mouths else '') + """
Follow the PART RULES."""

def poses(items, note='These are animation key poses: make them dynamic and expressive, with strong lines of action, squash and stretch, and follow-through.'):
    return f"""ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
{items}
{note}"""

def portraits(items):
    return f"""DIALOG PORTRAITS, landscape.
Three waist-up (or chest-up) portraits of the same character for story dialog boxes, 3/4 view facing right, larger and more detailed than the sprite, same style and colours, side by side and clearly separated:
{items}"""

HUMAN_RIG = """RIG POSE, portrait orientation.
The exact same character as the master illustration, full body, 3/4 front view facing right, in a neutral rig pose for 2D skeletal animation:
- standing straight, weight even, feet about shoulder-width apart, both feet flat;
- both arms hanging down, held slightly away from the body (about 20 degrees) so the arms do NOT overlap the torso; hands open and relaxed;
- {EXTRAS};
- eyes open and calm{MOUTH}.
Keep clear empty space between the arms, the legs and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight."""

def human_rig(extras, mouth=', small closed smile'):
    return HUMAN_RIG.replace('{EXTRAS}', extras).replace('{MOUTH}', mouth)

CHIBI = 'Chibi proportions: about 2.5 heads tall, head about 40% of total height, small hands and feet.'

CHARS = []

CHARS.append(dict(id='powder_monkey', name='Powder Monkey', proportions='Chibi proportions: about 2 heads tall, big head, small hands and feet.',
  swing=HUMAN_SWING.replace('{THINGS}', 'the tail, the headscarf tails'),
  card="""CHARACTER: Powder Monkey (id: powder_monkey)
Role: the fast swarm pirate: a small, mischievous ship's monkey who runs the gunpowder. Twitchy, giggly and quick: a cute troublemaker, never scary.
Body: a small brown monkey (fur #8A5A36, shade #6B4428) with a cream face, ears, palms and belly (#F3D9B1), big round ears, a long curly tail with a curl at the end.
Face: huge round amber eyes (#E39B2D), a small dark nose, a wide toothy grin.
Headscarf: orange headscarf (#F08A24) with small yellow stars (#FFD23F), knotted at the back with two short tails.
Clothes: a tiny open red vest (#D6402F) with brass buttons (#F6C44F), patched blue shorts (#3E5FA8) with a rope belt (#C9A06A). Bare feet.
Prop: a round black powder bomb (#2B2B33) with a short lit fuse, about the size of its head.
Loot: a stolen Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF).""",
  images=[
    ('master', master('3/4 front view facing right', 'crouched and ready to scamper, holding the bomb up in one hand with the fuse fizzing, tail curled up behind, grinning')),
    ('rigpose', human_rig('no bomb, no crystal; the tail hangs down behind one leg and curls out to the side, clear of both legs; headscarf tails hanging down')),
    ('head_faces', faces('  A. The head with the headscarf, ears and nose (cream muzzle).\n  B. The two headscarf tails, on their own.', '1 cheeky neutral · 2 angry · 3 greedy (sparkling) · 4 closed (blink) · 5 hurt (squeezed shut > <) · 6 knocked out (spirals) · 7 surprised (wide) · 8 mischievous half-lidded', '1 toothy grin · 2 open laughing · 3 gritted teeth · 4 ouch (wavy) · 5 small "O" · 6 tongue out, teasing')),
    ('parts_body', sheet('parts_body', """1. torso: vest and belly, with a short neck stub, no arms
2. hips: shorts with the rope belt
3. tail, top half (from the hips to the middle)
4. tail, bottom half with the curl
5. left upper arm
6. left forearm
7. right upper arm
8. right forearm
9. thigh
10. lower leg with the bare foot""")),
    ('hands_props', sheet('hands_props', """1. the powder bomb with its short fuse (fuse not lit)
2. left hand open
3. left hand fist
4. right hand open
5. right hand holding, fingers curled as if around a ball, with an empty gap where the bomb goes""")),
    ('poses', poses('1 jittery idle, bouncing on its toes · 2 scampering run · 3 running in with the bomb held over its head · 4 running away with the crystal on its head, cackling · 5 hit recoil, eyes squeezed · 6 knocked out, dizzy on its back · 7 taunting, pulling down an eyelid with the tongue out · 8 cheering, jumping with both arms up')),
  ]))

CHARS.append(dict(id='ironclad', name='Ironclad', proportions='Chunky chibi proportions: about 2.5 heads tall, very broad and heavy, big helmet, small legs.',
  swing=HUMAN_SWING.replace('{THINGS}', 'the loose belt strap'),
  card="""CHARACTER: Ironclad (id: ironclad)
Role: the armoured tank of the sky pirates: a big, stocky pirate sealed in riveted iron plates. Slow, proud and stubborn: a funny walking boiler, never scary.
Helmet: a round diving-style helmet in gunmetal (#6C7686, shade #4E5664) with brass rims (#C9A23D) and a round porthole visor of dark glass (#22303F). Two glowing yellow eyes (#FFD36B) shine behind the glass.
Armour: riveted gunmetal plates over the chest, shoulders and arms, with rust-orange patches (#C0652F) and brass rivets; a thick leather belt (#5A3A22) with a big brass buckle; one loose belt strap hanging.
Legs: dark padded trousers (#3D3A48) and heavy iron boots.
Gear: a round ship-hatch shield (gunmetal, with a brass wheel handle on the front) in the LEFT hand, and a heavy brass wrench (#C9A23D) in the RIGHT hand.
Loot: a stolen Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF).""",
  images=[
    ('master', master('3/4 front view facing right', 'standing proud and wide, the wrench resting on the shoulder, the hatch shield planted on the ground in front, eyes glowing smugly')),
    ('rigpose', human_rig('no shield, no wrench, no crystal; the loose belt strap hanging straight', mouth='')),
    ('head_faces', faces('  A. The helmet, with the porthole glass dark and EMPTY (no eyes).', '1 calm glow · 2 angry narrow glow · 3 closed (dark slits) · 4 hurt (> < shapes) · 5 knocked out (spirals) · 6 surprised (big circles) · 7 smug (half circles) · 8 greedy (sparkles)', '', eye_note='Each eye piece is BOTH glowing eyes together, sized and spaced exactly to sit inside the porthole glass')),
    ('parts_body', sheet('parts_body', """1. torso: chest armour, with a short neck stub, no arms
2. hips: belt with the buckle and the top of the trousers
3. the loose belt strap, on its own
4. left upper arm with its shoulder plate
5. left forearm (iron gauntlet cuff)
6. right upper arm with its shoulder plate
7. right forearm (iron gauntlet cuff)
8. thigh
9. lower leg with the iron boot""")),
    ('hands_props', sheet('hands_props', """1. the hatch shield, front view, wheel handle facing us
2. the heavy wrench, alone, pointing up
3. left hand (iron glove) open
4. left hand gripping a handle, closed around an empty gap
5. right hand (iron glove) open
6. right hand gripping, closed around an empty gap where the wrench handle goes""")),
    ('poses', poses('1 proud idle, chest out · 2 heavy stomping walk · 3 charging with the shield in front · 4 carrying the crystal under one arm, plodding away · 5 hit, rocking back with sparks of surprise in the eyes · 6 knocked out, flat on its back like a turtle · 7 taunting, banging the wrench on the shield · 8 cheering with the wrench raised')),
  ]))

BIRD_RIG = """RIG POSE, portrait orientation.
The exact same character as the master illustration, in a neutral FLYING rig pose for 2D skeletal animation, 3/4 view facing right:
- body level and calm, {BODY};
- BOTH wings spread wide open, up and out to each side, fully visible and NOT overlapping the body or each other (the far wing behind and a little smaller, seen in 3/4);
- tail feathers fanned out behind; legs hanging down below the body, toes relaxed;
- {EXTRAS};
- eyes open and calm.
Keep clear empty space between the wings, the legs, the tail and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight."""

BIRD_PARTS = """1. body (round belly and back, with a short neck stub; no wings, no legs, no tail)
2. tail feathers, fanned
3. near wing, inner half (from the shoulder to the wrist bend)
4. near wing, outer half (the long flight feathers)
5. far wing, inner half
6. far wing, outer half
7. near leg with its foot
8. far leg with its foot{EXTRA}"""

CHARS.append(dict(id='parrot_raider', name='Parrot Raider', proportions='Cute chunky proportions: a round body and a big head, big expressive eyes.',
  swing='Anything that should swing on its own (the neckerchief tails) is its own part. Each wing is TWO parts (inner half and outer flight feathers) so it can fold and flap. The body includes a short neck stub; the head does not include the neck.',
  card="""CHARACTER: Parrot Raider (id: parrot_raider)
Role: the flying thief of the sky pirates: a big, cocky parrot who snatches crystals from the air. Loud, flashy and cheeky: a cute villain, never scary.
Feathers: bright green body (#3FBF6E, shade #2F9E5A), scarlet head and chest (#E2423B), yellow and blue wing tips (#FFD23F, #3E7FD8), a long tail with green and blue feathers.
Face: a big curved yellow beak (#F4B62C) with a dark tip, large white eyes with dark pupils, cheeky brows.
Gear: brown leather aviator goggles (#7A4F30, brass rims #C9A23D) pushed up on the forehead, a tiny black pirate hat (#2B2B38) with a white skull mark tilted on top, a short red neckerchief.
Prop: a small grappling hook on a short rope, carried in its feet.
Loot: a stolen Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF), carried in its feet.""",
  images=[
    ('master', master('3/4 view facing right, flying', 'swooping in mid-air, wings raised high, grinning wickedly, the grappling hook swinging from its feet')),
    ('rigpose', BIRD_RIG.replace('{BODY}', 'tilted slightly forward').replace('{EXTRAS}', 'no hook, no crystal, beak closed')),
    ('head_faces', faces('  A. The head with the hat and goggles, upper beak attached.', '1 cheeky neutral · 2 angry · 3 greedy (sparkling) · 4 closed (blink) · 5 hurt (squeezed shut > <) · 6 knocked out (spirals) · 7 surprised (wide) · 8 smug half-lidded', '1 lower beak closed · 2 lower beak open, squawking · 3 lower beak wide open, laughing · 4 lower beak open with the tongue out', mouth_title='LOWER BEAK pieces, sized and placed to fit under the upper beak')),
    ('parts_body', sheet('parts_body', BIRD_PARTS.replace('{EXTRA}', '\n9. the red neckerchief tails, on their own'))),
    ('hands_props', sheet('hands_props', """1. the grappling hook with its short coiled rope
2. near foot with toes open and spread
3. near foot with toes clenched around an empty gap (where the hook or the crystal goes)
4. far foot with toes open and spread
5. far foot with toes clenched around an empty gap""")),
    ('poses', poses('1 hovering, flapping lazily · 2 flying forward fast · 3 diving with wings folded back · 4 flying away with the crystal clutched in its feet, laughing · 5 hit, feathers puffed, eyes squeezed · 6 knocked out, tumbling with spirals in its eyes · 7 taunting, hovering with one wing pointing and tongue out · 8 cheering, wings flung up', note='These are animation key poses: make them dynamic and expressive, with strong lines of action and follow-through on wings and tail feathers.')),
  ]))

CHARS.append(dict(id='first_mate', name='First Mate', proportions='Chunky chibi proportions: about 3 heads tall, very broad shoulders and chest, big hands, short legs.',
  swing=HUMAN_SWING.replace('{THINGS}', 'the two coat tails, the beard braid, the hat feather'),
  card="""CHARACTER: First Mate (id: first_mate)
Role: the chapter 1 boss, Captain Stormbeard's loud right-hand man. Bossy, boastful and theatrical: an imposing but still cute villain, never gory or scary.
Face: big ruddy face (#EDB78E), a black eyepatch (#2B2B38) over his RIGHT eye, one fierce brown eye (#5B3A26), heavy grey-black eyebrows, a thick dark-brown beard (#4A3326) that ends in one long braid tied with a gold ring (#F6C44F), a big nose, a scar across one cheek.
Hat: a black tricorn hat (#2B2B38) with gold trim (#F6C44F) and a long red feather (#E2423B).
Coat: a long burgundy coat (#8E2A2A, shade #6A1E22) with brass buttons (#F6C44F) and wide cuffs, the coat tails split at the back into two flaps; a cream shirt (#F7F0E1) and a broad black belt with a gold buckle.
Legs: dark grey trousers (#3D3A48) and tall black boots (#2F2A2E) with gold buckles.
Weapon: a heavy iron ship's anchor (#5B6375) with a short length of chain, swung in the RIGHT hand.
Loot: Sky Crystals, fist-sized faceted chunks in light cyan (#6FF0FF); he carries three at once in a bulging sack over his shoulder.""",
  images=[
    ('master', master('3/4 front view facing right', 'standing wide like he owns the ship, the anchor slung over his shoulder, the other fist on his hip, sneering')),
    ('rigpose', human_rig('no anchor, no sack; the coat tails, the beard braid and the hat feather hanging straight', mouth=', mouth closed under the beard')),
    ('head_faces', faces('  A. The head with the tricorn hat, eyepatch, eyebrows and beard (the mouth area inside the beard left blank, no eye on the open side).\n  B. The beard braid with its gold ring, on its own.\n  C. The hat feather, on its own.', '1 fierce neutral · 2 furious · 3 greedy (sparkling) · 4 closed (blink) · 5 hurt (squeezed shut) · 6 knocked out (spiral) · 7 surprised (wide) · 8 smug half-lidded', '1 sneer · 2 roaring shout · 3 big laugh · 4 ouch (wavy) · 5 small "O" · 6 gritted teeth', eye_note='Each eye piece is the ONE open eye (his left) with its eyebrow, sized and placed exactly where it sits on the head', mouth_title='MOUTH pieces, sized to fit the blank space in the beard')),
    ('parts_body', sheet('parts_body', """1. torso: coat top, shirt and belt, with a short neck stub, no arms
2. hips: belt bottom and trousers top
3. left coat tail, on its own
4. right coat tail, on its own
5. left upper arm (coat sleeve)
6. left forearm (coat sleeve with the wide cuff)
7. right upper arm
8. right forearm
9. thigh
10. lower leg with the tall boot""")),
    ('hands_props', sheet('hands_props', """1. the anchor with its short chain, upright
2. the sack bulging with three Sky Crystals, glowing through a tear
3. left hand open
4. left hand fist
5. right hand open
6. right hand gripping, closed around an empty gap where the anchor shaft goes""")),
    ('poses', poses('1 idle, anchor on the shoulder, tapping a foot · 2 marching walk · 3 swinging the anchor overhead · 4 lugging the crystal sack over the shoulder, grinning · 5 hit, staggering back · 6 knocked out, flat on his back, hat fallen over his face · 7 shouting orders, pointing forward · 8 cheering, anchor raised high')),
    ('portraits', portraits('1 sneering · 2 roaring with fury · 3 defeated, dizzy and panicking')),
  ]))

CHARS.append(dict(id='talon', name='Talon', proportions='Cute chunky proportions: a round body, a big head, big friendly eyes; a heroic little eagle, not a realistic bird.',
  swing='Anything that should swing on its own (the scarf tails) is its own part. Each wing is TWO parts (inner half and outer flight feathers) so it can fold and flap. The body includes a short neck stub; the head does not include the neck.',
  card="""CHARACTER: Talon (id: talon)
Role: Little Archer's eagle companion. Proud, brave and loyal, with a soft spot for the hero: a cute hero's pet, never fierce or scary.
Feathers: golden-brown body (#B07A3E, shade #8A5A2E), a cream-white head and chest (#FBF4E4), brown wings with gold-tipped flight feathers (#F4C34F), a white-and-brown tail.
Face: a strong curved golden beak (#F4B62C), big amber eyes (#E39B2D) with a confident brow.
Gear: a small green scarf (#3E9A4F) that matches the hero's hood, knotted at the neck with two short tails.
Feet: yellow feet (#F4C34F) with dark curved talons.
Prop: a Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF), that Talon snatches back from pirates.""",
  images=[
    ('master', master('3/4 view facing right, flying', 'swooping in heroically with wings spread wide and talons ready, scarf streaming, a confident smile in the eyes')),
    ('rigpose', BIRD_RIG.replace('{BODY}', 'tilted slightly forward').replace('{EXTRAS}', 'no crystal, beak closed, scarf tails hanging')),
    ('head_faces', faces('  A. The head, upper beak attached.\n  B. The two scarf tails, on their own.', '1 confident neutral · 2 fierce (diving) · 3 happy (closed arcs ^ ^) · 4 closed (blink) · 5 hurt (squeezed shut > <) · 6 surprised (wide) · 7 proud half-lidded · 8 determined', '1 lower beak closed · 2 lower beak open, crying out · 3 lower beak open, happy chirp', mouth_title='LOWER BEAK pieces, sized and placed to fit under the upper beak')),
    ('parts_body', sheet('parts_body', BIRD_PARTS.replace('{EXTRA}', ''))),
    ('hands_props', sheet('hands_props', """1. the Sky Crystal chunk
2. near foot with talons open and spread
3. near foot with talons clenched around an empty gap (where the crystal goes)
4. far foot with talons open and spread
5. far foot with talons clenched around an empty gap""")),
    ('poses', poses('1 perched proudly, wings folded · 2 hovering, flapping · 3 diving straight down, wings folded back · 4 swooping with talons out · 5 flying off with the crystal in its talons · 6 gliding, wings spread · 7 a happy chirp with wings half open · 8 landing, wings flared and talons forward', note='These are animation key poses: make them dynamic and expressive, with strong lines of action and follow-through on wings, tail and scarf.')),
    ('portraits', portraits('1 proud · 2 fierce battle cry · 3 happy and fond')),
  ]))

CHARS.append(dict(id='mochi', name='Mochi', proportions='Cute, round and soft proportions: a plump baby whale with a big head, big eyes and small fins.',
  swing='Anything that should swing on its own (the tail fluke, the fins, the cloud spout) is its own part.',
  card="""CHARACTER: Mochi (id: mochi)
Role: the hero's ultimate skill: a baby sky whale that swims through the air and sweeps across the island. Gentle, playful and huge-hearted: as cute as possible, never scary.
Body: round and soft like a mochi, a pastel sky-blue back (#8FD3FF, shade #6BB8EA), a cream belly (#FFF6E0) with soft grooves, little star-shaped freckles (#FFFFFF) on the back.
Face: huge gentle eyes (#2F3E66) with big catch-lights, pink cheeks (#FF9EB5), a tiny smile.
Fins and tail: puffy, cloud-like fins and tail fluke, edged in white like little clouds.
Spout: a small fluffy cloud puffing from the blowhole.""",
  images=[
    ('master', master('side view facing right, swimming in the sky', 'gliding forward joyfully, tail curled up, fins spread, a happy cloud puffing from the blowhole')),
    ('rigpose', """RIG POSE, landscape orientation.
The exact same character as the master illustration, side view facing right, in a neutral swimming rig pose for 2D skeletal animation:
- body straight and level;
- both fins spread out from the body (the far fin peeking out behind, smaller), NOT overlapping the body more than needed;
- the tail fluke straight out behind, level;
- the cloud spout puffing from the blowhole;
- eyes open and calm, a small smile.
This image is the assembly reference: every later part must match it exactly in scale, colours and line weight."""),
    ('head_faces', """FACE PIECES SHEET, landscape.
Cut-out face pieces of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels. In a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each piece is BOTH eyes together (the far one smaller, peeking over the head) with the pink cheeks, spaced exactly as they sit on the whale's face: 1 gentle neutral · 2 happy (closed arcs ^ ^) · 3 sparkling excited · 4 closed (blink) · 5 sleepy half-lidded · 6 surprised (wide) · 7 determined · 8 hurt (squeezed shut > <)
- Row 3, MOUTH pieces, sized to fit the face: 1 tiny smile · 2 open happy "O" · 3 big laugh · 4 small worried wobble · 5 cat-like "w" mouth
Follow the PART RULES."""),
    ('parts_body', sheet('parts_body', """1. body: the whole round body with the face area BLANK (no eyes, no mouth, no cheeks), no fins, no tail fluke
2. tail fluke
3. near fin
4. far fin
5. the cloud spout, on its own""")),
    ('poses', poses('1 floating happily · 2 swimming forward fast, body arched · 3 big leap upward · 4 sweeping down in a curve · 5 spinning playfully · 6 sleeping, curled up · 7 waving a fin · 8 cheering, both fins up', note='These are animation key poses: make them dynamic, bouncy and squishy, with squash and stretch.')),
    ('portraits', portraits('1 happy · 2 determined · 3 sleepy and cuddly')),
  ]))

os.makedirs(OUT, exist_ok=True)
for c in CHARS:
    p = prompt(c)
    assert '{' not in p and '}' not in p, c['id']
    open(f"{OUT}/{c['id']}.txt", 'w').write(p + '\n')
    print(c['id'], len(p), 'chars', len(c['images']), 'images')
