# Little Archer: Sky Pirates — Character Art Brief

> **สำหรับเจ้านาย:** ไฟล์นี้เขียนเป็นภาษาอังกฤษเพื่อให้ Codex / ChatGPT อ่าน
> - **แนะนำ:** ใช้ prompt เดียวจบในหัวข้อ 8.10 ได้ทั้ง ChatGPT และ Codex
>   - วางหนึ่งครั้งต่อหนึ่งตัวละคร แล้วพิมพ์ "ต่อ" / "ผ่าน" / "วาดใหม่"
>   - ในหน้า Art Brief ที่ Claude ส่งให้ มีแบบเติมช่องครบแล้วพร้อมปุ่ม Copy
> - ถ้าอยากคุมเองทีละภาพ: ใช้ prompt แยกในหัวข้อ 8.0-8.9
> - **แผนที่ด่าน:** หัวข้อ 9 แนบภาพร่างจาก Claude แล้ววาง prompt ให้ ChatGPT วาดทับ
>
> ผลลัพธ์ที่ได้กลับมา Claude จะนำไปตัดชิ้น ใส่กระดูก และทำท่าทางในเกมเอง

This brief is for an AI image generator (Codex `$imagegen`, ChatGPT Images or similar) acting as the character artist.
- **Read sections 1–6 before drawing anything.**
- Each character's look is defined in section 7.
- Section 8 holds the exact prompts, one image per prompt.
- Section 9 is for level maps, painted over a layout sketch.

---

## 0. Context

*Little Archer: Sky Pirates* is a tower-defense game for phones, played in landscape on iPhone 15 and newer.
- **The setting.** **Sky Haven** is a floating island kept aloft by glowing **Sky Crystals**.
- **The villains.** Captain Stormbeard's sky pirates sail airships to the island to steal those crystals.
- **The defenders.** **Little Archer** protects the island, together with **Talon** the eagle and **Mochi** the baby sky whale.

**How your art is used.** You design and draw the characters. The game team then:
1. slices your sheets into separate body parts;
2. pins the parts together with 2D bones;
3. animates them in code (cut-out / skeletal animation, like Spine or the chibi units in tower-defense games).

So every character is delivered in two forms:
- **Finished illustrations**: concept, master and portraits. These are used for menus and story scenes, and as the reference for everything else.
- **Separate body parts on parts sheets**. These become the animated in-game sprite.

---

## 1. Style (every image)

- **Medium.** HD 2D hand-drawn anime game art. Not pixel art, not 3D.
- **Proportions.** Chibi, about **2.5 heads tall**: the head is about 40% of the total height, with small hands and feet.
- **Mood.** Warm, adventurous fantasy, in the spirit of classic early-2000s Korean fantasy MMORPG character art redrawn at modern quality. Charming and a little cool, **never babyish**.
- **Line art**
  - Clean and confident, in dark warm brown **#3B2A2A**, never pure black.
  - Outer contour about 4 px and inner detail lines about 2 px, measured at a 1024 px image height.
  - The same line weight in every image.
- **Colouring**
  - Anime cel shading: a flat base colour, one soft cool shadow tone (slightly violet) and small crisp highlights.
  - Gentle gradients on hair and cloth are fine.
  - **The light always comes from the upper left.**
- **Eyes and face**
  - Large, expressive eyes: a vertical-oval iris with a dark-top to light-bottom gradient, two white catch-lights and a bold upper lash line.
  - A small nose, a small mouth and soft cheek blush.
- **Detail.** Stitched seams, fabric folds, leather straps and small metal buckles, while keeping big readable shapes. **The silhouette must still read when the character is shrunk to 100 px tall.**
- **View.** 3/4 front view, with the body and face turned toward the **right** edge of the image and the camera at eye level. Every image uses this view unless a prompt says otherwise. The game mirrors the art for left-facing moves.
- **Avoid**
  - 3D renders, and any plastic, vinyl-toy or clay look.
  - Roblox or Minecraft blockiness.
  - Realistic proportions and photo textures.
  - Heavy noise, thick sticker outlines and glossy 3D highlights.

## 2. Technical rules (every image)

- **Background**
  - Use a real transparent background if your tool supports it.
  - If it does not, use a **perfectly flat solid #FF00FF magenta**: no gradient, texture, floor or shadow.
  - **Never** draw a checkerboard pattern, and never use magenta inside the character.
- **No text of any kind:** no letters, numbers, labels, logos, signatures, watermarks, frames, borders or UI.
- **No effects:** no ground shadow, glow, aura, motion lines, sparkles or particles. The game adds its own effects.
- **No cropping.** Never crop the character or any part, and keep at least 5% empty margin on every side.
- **Resolution.** Use the highest available: at least 1024 px, and 2048 px or more if possible.
- **Consistency.** Keep the **same character design in every image**: the same face, hair, colours (use the hex codes), outfit details and proportions.
- **Reference images.** When generating images 3–8, give `<id>_master.png` (and later `<id>_rigpose.png`) to the generator as a reference image, if your tool supports it.

## 3. Cut-out part rules (parts sheets only)

These rules make the parts bend smoothly when animated. They matter more than anything else on the parts sheets.

1. **Draw each part COMPLETE**, as if the parts in front of it had been removed. Include the areas that are normally hidden, such as the shoulders under a capelet or the top of the thigh under the shorts.
2. **Round the joint ends.** They should look like ball joints and run about 15% past the joint, so a bent elbow or knee never shows a gap.
3. **Keep each part in its rig-pose orientation.** Do not rotate a part to fit the sheet.
4. **Draw at the same scale as the rig pose.** Do not enlarge small parts to fill the space.
5. **No shadows cast by other parts.** Light each part on its own, from the upper left.
6. **Space the parts out.** Leave at least 60 px of empty background around every part. Parts must not touch each other or the image edge, and each part appears exactly once.
7. **Use a neat grid** that reads left to right, top to bottom, in the numbered order given in the prompt.
8. **Separate the swinging pieces.** Anything that should swing on its own (a hood tip, bandana tails, sash ends) is its own part.
9. **The torso includes a short neck stub; the head does not include the neck.**

## 4. Deliverables per character

| # | File | What | Step |
|---|---|---|---|
| 1 | `<id>_concept.png` | Turnaround: 3/4 front, side and back, in the same pose and at the same scale | 1: look (approve first) |
| 2 | `<id>_master.png` | Full-body key art in the character's signature pose | 1: look (approve first) |
| 3 | `<id>_rigpose.png` | Full body in a neutral "rig pose" with arms away from the body. This is the assembly reference | 2: production |
| 4 | `<id>_head_faces.png` | Blank-face head, swinging head pieces, eye set and mouth set | 2: production |
| 5 | `<id>_parts_body.png` | Torso, hips, arms and legs as cut-out parts | 2: production |
| 6 | `<id>_hands_props.png` | Hand variants, weapon and props | 2: production |
| 7 | `<id>_poses.png` | 8 action key poses, used as animation reference | 3: extras |
| 8 | `<id>_portraits.png` | 3 bust portraits for story dialogs | 3: extras |

- **Do Step 1 first** and wait for approval before Step 2. Changing the look after the parts exist means redrawing everything.
- **If an image misses a rule, regenerate it** rather than editing it by hand. Keep only the best attempt of each file.

## 5. Delivery

- **Save location.** Put the files in `art/incoming/<id>/` using the exact file names above, for example `art/incoming/hero/hero_master.png`.
- **Notes file.** Add `art/incoming/<id>/NOTES.md` listing each file, which tool and model made it, and any rule you could not meet.
- **Git** (Codex only)
  - Commit **only** those files, on a new branch `art/<id>-v1`.
  - Open a pull request titled `Art: <Character name> v1`.
  - Do not edit, move or delete anything else in the repository.
- **Leave the images as generated.** Do **not** slice, resize, key out the background or retouch them. The game team does that.
- **If your environment cannot generate images, stop and say so.** Do not draw the characters with code (SVG, canvas, Pillow): that is not what we want.

## 6. Acceptance checklist

Check each image before delivering it:

- [ ] Reads as anime game art, not a 3D render or a toy.
- [ ] Same character as the master: face, hair, colours and every outfit detail.
- [ ] 3/4 view facing right, chibi about 2.5 heads tall.
- [ ] Transparent or flat #FF00FF background, with no checkerboard, text, shadow or effects.
- [ ] Line weight and upper-left lighting match the other images.
- [ ] Parts sheets follow every rule in section 3: complete parts, rounded joints, spaced out, same scale.
- [ ] Eye and mouth pieces are the right size and angle for the blank head.
- [ ] Still readable when zoomed out until the character is about 100 px tall.

---

## 7. Character cards

Paste the card into the first prompt of each character (prompt 8.1).

### 7.1 `hero`: Little Archer (start here)

```
CHARACTER: Little Archer (id: hero)
Role: the young hero who guards Sky Haven, a floating island. Brave, cheerful, quick. Age feel about 13. Gender-neutral look (could be a boy or a girl).
Face: soft round face, big teal eyes (#27B2A4, dark #13615D), warm skin (#FFD9BD), pink blush (#FF9B9B).
Hair: short messy chestnut-brown hair (#8A4B26, highlights #B56A37); bangs and side locks peek out of the hood.
Hood: forest-green hood (#3E9A4F, shade #2D7A3D) with a gold trim band (#F4C34F) around the face opening; a long droopy pointed tip hangs behind the head and ends in a small gold bead.
Capelet: short green shoulder capelet with a gold edge, clasped at the throat with a small teal Sky-Crystal brooch.
Top: cream shirt (#F6EAD2) with rolled sleeves; brown leather vest (#8C5A33) with stitched edges; dark leather strap (#5D3A1F) across the chest for the quiver.
Waist: leather belt (#6A4326) with a gold buckle (#F2C14E) and a small pouch.
Legs: navy knee-length shorts (#3C4D73); brown boots (#704A2C) with folded light-leather cuffs (#A8774B) and dark soles (#3B2618).
Arms: leather bracer on the LEFT forearm (bow arm); fingerless glove on the RIGHT hand (string hand).
Weapon: wooden recurve bow (#B97A40, dark #7C4C24) with gold tips and a small glowing teal crystal set in the grip; thin cream string (#FBF4E2).
Back: brown leather quiver with arrows; fletching red (#E5534B) and white, steel tips (#D8DDE6).
Handedness: the bow is held in the LEFT hand (the far arm, which reaches toward the right edge when aiming); the RIGHT hand (near arm) draws the string.
```

| Slot | Value |
|---|---|
| Signature pose (image 2) | Standing ready, holding the bow low in the left hand, the right hand touching the quiver strap, slight confident smile, hood tip and capelet swaying a little in the wind |
| Rig-pose extras (image 3) | No bow, no quiver, no arrows. Hood up, hood tip hanging straight down behind the head |
| Head pieces (image 4) | A. Head with hood, bangs and side locks, blank face. B. The hood's droopy tip with its gold bead, alone |
| Eye pieces (image 4) | 1 open, calm · 2 half-closed (mid-blink) · 3 closed (blink, soft downward arcs) · 4 happy closed (upward ^ ^ arcs) · 5 focused aiming (narrowed, brows angled down) · 6 hurt (squeezed shut > <) · 7 knocked out (spirals) · 8 surprised (wide, small pupils) |
| Mouth pieces (image 4) | 1 small smile · 2 neutral closed · 3 open happy (cheer, tongue visible) · 4 determined tight line · 5 shouting effort (open, teeth) · 6 ouch (wavy) · 7 small "O" |
| Body parts (image 5) | 1 torso (shirt and vest with chest strap, neck stub, no arms, no capelet) · 2 hips (belt with buckle and pouch, top of the shorts) · 3 capelet with brooch, alone · 4 left upper arm (sleeve) · 5 left forearm with bracer · 6 right upper arm (sleeve) · 7 right forearm · 8 thigh (shorts leg) · 9 lower leg with boot |
| Hands and props (image 6) | 1 bow **without its string** (we draw the string in code), vertical, grip in the middle · 2 one arrow, horizontal, pointing right · 3 quiver with arrows, as worn on the back · 4 left hand open · 5 left hand gripping fist, seen from the thumb side, closed around an empty gap where the bow grip goes · 6 right hand open, fingerless glove · 7 right hand pinching (thumb and index together as if holding a bowstring) |
| Action poses (image 7) | 1 idle, relaxed breathing · 2 running, mid-stride, leaning forward · 3 full draw aiming right · 4 release follow-through, string hand flung back · 5 quick dodge dash, low and leaning · 6 hit recoil, flinching backward · 7 knocked out, lying on the back · 8 cheer, jumping with the bow raised high |
| Portraits (image 8) | 1 friendly smile · 2 determined, ready to fight · 3 surprised |

### 7.2 `deckhand`: Deckhand (the basic pirate)

```
CHARACTER: Deckhand (id: deckhand)
Role: the most common sky-pirate grunt. Greedy, loud, clumsy and funny: a cute villain, never scary. Chubby, short and round-bellied, slightly bow-legged.
Face: round face with light stubble (#C9A07E), tan skin (#F2C393), big round nose (#F0A982), bushy dark eyebrows (#3B2A22), small brown eyes (#5B3A26), a wide cheeky grin with one gold tooth, a gold hoop earring on one ear.
Bandana: red bandana (#E2423B) with cream polka dots (#FFF4E6), knotted at the back with two short tails.
Top: horizontal-striped shirt in navy (#2F4B8F) and off-white (#F7F4EE), sleeves pushed up; round belly.
Waist: wide golden-yellow sash (#F2B134, shade #D38A1C) knotted at the side, with two hanging ends.
Legs: baggy brown pants (#8A6240) with a darker square patch (#6D4A2E) on one knee; short black boots (#2F2A2E) with gold buckles (#F6C44F).
Weapon: short curved cutlass, steel blade (#DFE5EE, shade #9AA4B4), brass hand guard, wrapped grip (#5A3A22), held in the RIGHT hand.
Loot: a stolen Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF).
```

| Slot | Value |
|---|---|
| Signature pose (image 2) | Swaggering, cutlass resting on the shoulder, the other hand on the hip, cheeky gold-tooth grin |
| Rig-pose extras (image 3) | No cutlass, no crystal. Bandana tails hanging down behind the head, sash ends hanging straight |
| Head pieces (image 4) | A. Head with bandana, stubble, nose and earring, blank face (no eyes, brows or mouth). B. The two bandana tails, alone |
| Eye pieces (image 4) | 1 sneaky neutral · 2 angry (brows down) · 3 greedy (eyes sparkling, staring at treasure) · 4 closed (blink) · 5 hurt (squeezed shut > <) · 6 knocked out (spirals) · 7 surprised (wide) · 8 smug half-lidded |
| Mouth pieces (image 4) | 1 gold-tooth grin · 2 open laughing taunt · 3 gritted teeth, angry · 4 ouch (wavy) · 5 small "O" · 6 closed smirk · 7 tongue out, teasing |
| Body parts (image 5) | 1 torso (striped shirt and belly, neck stub, no arms) · 2 hips (pants top with the sash, no sash ends) · 3 the two sash ends, alone · 4 left upper arm · 5 left forearm · 6 right upper arm · 7 right forearm · 8 thigh (baggy pants leg, patch version) · 9 lower leg with boot |
| Hands and props (image 6) | 1 cutlass, alone, blade pointing up · 2 the Sky Crystal chunk · 3 left hand open · 4 left hand fist · 5 right hand open · 6 right hand gripping fist, closed around an empty gap where the sword handle goes |
| Action poses (image 7) | 1 idle swagger · 2 walking with a rolling pirate gait · 3 running to attack with the cutlass raised · 4 running away hugging the stolen crystal, grinning · 5 hit recoil, eyes squeezed · 6 knocked out, dizzy on the back · 7 taunting, tongue out, hand waving · 8 cheering with the cutlass in the air |
| Portraits (image 8) | 1 greedy grin · 2 angry shouting · 3 panicked, sweating |

### 7.3 Later characters (after the hero and Deckhand are approved)

Write a card in the same format for each one. Non-humanoid characters split into head, body, wings (near and far, each upper and lower), tail and legs, instead of arms and legs.

| id | Who | Look |
|---|---|---|
| `powder-monkey` | Fast swarm pirate | A small mischievous monkey in a tiny red vest and a knotted headscarf, carrying a round black powder bomb with a short fuse. Long curly tail, drawn as a separate part. About 2 heads tall. |
| `ironclad` | Armoured tank | A big stocky pirate wrapped in riveted iron plates (gunmetal, rust orange, brass), wearing a round diving-style helmet with a porthole visor (two glowing eyes behind it). Carries a ship-hatch shield and a heavy wrench. Slow and proud. |
| `parrot-raider` | Flying thief | A big green-and-scarlet parrot wearing aviator goggles and a tiny pirate hat, with a grappling hook on a rope in its feet. The wings are separate parts. |
| `first-mate` | Chapter 1 boss | About 3 heads tall and broad. Long burgundy coat with brass buttons, tricorn hat with a feather, eyepatch, thick braided beard. Swings a ship's anchor. |
| `stormbeard` | Final villain | Captain Stormbeard, about 3 heads tall. Navy captain's coat with gold epaulettes, tricorn with a storm-cloud plume, a beard made of dark storm clouds crackling with small lightning, and a cutlass set with a Sky Crystal. Charismatic and dramatic. |
| `talon` | Hero's eagle | A proud but cute golden eagle with brown and cream feathers and gold-tipped wing feathers, sharp friendly eyes, and a small green scarf that matches the hero's hood. |
| `mochi` | Ultimate skill | A baby sky whale: round and soft, with a pastel sky-blue back (#8FD3FF), a cream belly, puffy cloud-like fins and tail, little star freckles and huge gentle eyes. It swims through the air. |

---

## 8. Prompts: one image per prompt

Fill each `{…}` slot from the character's table in section 7.
- **Easiest:** use the all-in-one prompt in **8.10**, one chat per character. The prompts in 8.0–8.9 are the same content split into separate messages.
- **ChatGPT:** paste 8.0 first, in a new chat, then each prompt in order **in the same chat** so it remembers the character. If you have to start a new chat, paste 8.0 again and attach `<id>_master.png`.
- **Codex:** use 8.0 as the shared instructions for every image call.

### 8.0 Rules (paste once, first)

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. I will ask for one image at a time. Follow these rules in EVERY image of this conversation.

STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). Chibi proportions: about 2.5 heads tall, head about 40% of total height, small hands and feet.
- Mood: warm, adventurous fantasy, in the spirit of classic early-2000s Korean fantasy MMORPG character art redrawn at modern quality. Charming and a little cool, never babyish.
- Line art: clean and confident, dark warm brown (#3B2A2A), never pure black. Outer contour about 4 px, inner lines about 2 px at 1024 px image height. Same weight in every image.
- Colouring: anime cel shading with a flat base colour, one soft cool shadow tone (slightly violet) and small crisp highlights. Light comes from the upper left in every image. Gentle gradients on hair and cloth are fine.
- Eyes: large and expressive; vertical-oval iris with a dark-top to light-bottom gradient, two white catch-lights, bold upper lash line. Small nose, small mouth, soft cheek blush.
- Detail: stitched seams, fabric folds, leather straps, small metal buckles, but keep big readable shapes; the silhouette must still read at 100 px tall.
- View: 3/4 front view, body and face turned toward the RIGHT edge of the image, camera at eye level, unless I say otherwise.
- Avoid: 3D render, plastic / vinyl toy / clay look, Roblox or Minecraft blockiness, realistic proportions, photo textures, heavy noise, thick sticker outlines, glossy 3D highlights.

TECHNICAL
- Background: real transparent background if you can. Otherwise a perfectly flat solid #FF00FF magenta background (no gradient, texture, floor or shadow). Never draw a checkerboard pattern. Never use magenta inside the character.
- No text, letters, numbers, labels, logos, signatures, watermarks, frames, borders or UI anywhere.
- No ground shadow, glow, aura, motion lines, sparkles or particles.
- Never crop the character or any part; keep at least 5% empty margin on every side.
- Highest resolution available (at least 1024 px; 2048 px or more if possible).
- Keep the SAME character design in every image: same face, hair, colours (use the hex codes), outfit details and proportions.

Reply only "Ready" and wait for my first request.
```

### 8.1 Concept turnaround: `<id>_concept.png` (landscape)

```
Image 1: CONCEPT TURNAROUND, landscape.
{CHARACTER CARD}
Draw this character three times side by side, at the same scale, evenly spaced, feet on the same baseline, in a relaxed standing pose:
1) 3/4 front view facing right (on the left),
2) pure side profile facing right,
3) back view.
Show the whole outfit clearly. Follow all the rules.
```

### 8.2 Master illustration: `<id>_master.png` (portrait)

```
Image 2: MASTER ILLUSTRATION, portrait orientation.
The same character, full body, 3/4 front view facing right, in this signature pose: {SIGNATURE POSE}.
This is the character's key art: make it the most appealing, polished version, with lively hair and cloth. Follow all the rules.
```

**Stop here, show images 1–2 to the team and wait for approval.**

### 8.3 Rig pose: `<id>_rigpose.png` (portrait)

```
Image 3: RIG POSE, portrait orientation.
The exact same character as the master illustration, full body, 3/4 front view facing right, in a neutral rig pose for 2D skeletal animation:
- standing straight, weight even, feet about shoulder-width apart, both feet flat;
- both arms hanging down, held slightly away from the body (about 20 degrees) so the arms do NOT overlap the torso; hands open and relaxed;
- {RIG-POSE EXTRAS};
- eyes open and calm, small closed smile.
Keep clear empty space between the arms, the legs and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight. Follow all the rules.
```

### 8.4 Head and faces: `<id>_head_faces.png` (landscape)

```
Image 4: HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
{HEAD PIECES}
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK: no eyes, no eyebrows, no mouth. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each piece is BOTH eyes together with their eyebrows, spaced and angled exactly as they sit on the blank head (3/4 view, so the far eye is slightly narrower): {EYE PIECES}
- Row 3, MOUTH pieces, sized to fit the blank head: {MOUTH PIECES}
Follow all the rules.
```

### 8.5 Body parts: `<id>_parts_body.png` (landscape)

```
Image 5: BODY PARTS SHEET, landscape.
Cut-out body parts of the same character for 2D skeletal animation. Same scale, colours and line weight as the rig pose; each part keeps the orientation it has in the rig pose (do not rotate parts). Arrange them in a neat grid, left to right, top to bottom, in this order:
{BODY PARTS}
Part rules:
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath (for example the shoulders under the cape, the top of the thigh under the shorts).
- Joint ends are rounded like ball joints and extend about 15% past the joint, so bending never shows a gap.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
Follow all the rules.
```

### 8.6 Hands and props: `<id>_hands_props.png` (landscape)

```
Image 6: HANDS & PROPS SHEET, landscape.
More cut-out parts of the same character, with the same rules as the body parts sheet (same scale as the rig pose, complete, separated by at least 60 px, no labels, no shadows from other parts), in a neat grid, left to right, top to bottom:
{HANDS AND PROPS}
Follow all the rules.
```

### 8.7 Action pose reference: `<id>_poses.png` (landscape)

```
Image 7: ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
{ACTION POSES}
These are animation key poses: make them dynamic and expressive, with strong lines of action, squash and stretch, and follow-through on hair and cloth. Follow all the rules.
```

### 8.8 Dialog portraits: `<id>_portraits.png` (landscape)

```
Image 8: DIALOG PORTRAITS, landscape.
Three waist-up portraits of the same character for story dialog boxes, 3/4 view facing right, larger and more detailed than the sprite, same style and colours, side by side and clearly separated:
{PORTRAITS}
Follow all the rules.
```

### 8.9 Kick-off message for Codex (working in this repository)

```
Read docs/art/CHARACTER_BRIEF.md in this repository and follow it exactly.
Task: create Step 1 (images 1 and 2) for the character "hero" (Little Archer), using your image generation tool, one image per call. Use the rules in 8.0, the character card and table in 7.1, and the prompts 8.1 and 8.2 with their slots filled in.
Save the files with the exact names into art/incoming/hero/, add NOTES.md, commit only those files on a new branch art/hero-v1 and open a pull request titled "Art: Little Archer v1". Do not change any other file.
If you cannot generate images in this environment, stop and tell me. Do not draw the character with code.
```

For Step 2, send the same message with "Step 2 (images 3–6)" and "use art/incoming/hero/hero_master.png as the reference image".

### 8.10 All-in-one prompt (one character per chat)

- **How to use it.** Paste this once in a new chat, then steer with short replies:
  - `NEXT` / `ต่อ`: draw the next image.
  - `APPROVED` / `ผ่าน`: required after Image 2.
  - `REDO` / `วาดใหม่`: redraw the last image.
  - Any other comment: a change request for the last image.
- **Codex.** The same prompt works for Codex: its last section tells Codex how to save and commit the files.
- **Filling the slots.** Fill `{NAME}` and `{id}` from the card in section 7, and `{STYLE + TECHNICAL}` with the STYLE and TECHNICAL blocks of 8.0. Fill every other slot from the character's table.

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, {NAME}, as 8 images that the game team will slice into parts and animate with 2D bones.

HOW WE WORK
- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.
- Under each image write only one line: "Save as: <file name>". Then wait.
- When I write NEXT (or ต่อ), make the next image.
- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.
- Any other comment from me is a change request for the last image: redraw it with that change.
- After Image 2, STOP. Do not start Image 3 until I write APPROVED (or ผ่าน). Until then, only revise Images 1 and 2 as I ask.
- Images 3 to 8 must match the approved Image 2 (the master) exactly, and from Image 4 on also Image 3 (the rig pose). Use them as reference images if you can.

{STYLE + TECHNICAL}

{CHARACTER CARD}

PART RULES (Images 4, 5 and 6: these sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath (for example the shoulders under the cape, the top of the thigh under the shorts).
- Joint ends are rounded like ball joints and extend about 15% past the joint, so bending never shows a gap.
- Keep each part in the orientation it has in the rig pose (Image 3) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- Anything that should swing on its own (hood tip, bandana tails, sash ends) is its own part. The torso includes a short neck stub; the head does not include the neck.

IMAGE LIST

Image 1 (save as {id}_concept.png): CONCEPT TURNAROUND, landscape.
Draw this character three times side by side, at the same scale, evenly spaced, feet on the same baseline, in a relaxed standing pose:
1) 3/4 front view facing right (on the left),
2) pure side profile facing right,
3) back view.
Show the whole outfit clearly.

Image 2 (save as {id}_master.png): MASTER ILLUSTRATION, portrait orientation.
The same character, full body, 3/4 front view facing right, in this signature pose: {SIGNATURE POSE}.
This is the character's key art: make it the most appealing, polished version, with lively hair and cloth.

Image 3 (save as {id}_rigpose.png): RIG POSE, portrait orientation.
The exact same character as the master illustration, full body, 3/4 front view facing right, in a neutral rig pose for 2D skeletal animation:
- standing straight, weight even, feet about shoulder-width apart, both feet flat;
- both arms hanging down, held slightly away from the body (about 20 degrees) so the arms do NOT overlap the torso; hands open and relaxed;
- {RIG-POSE EXTRAS};
- eyes open and calm, small closed smile.
Keep clear empty space between the arms, the legs and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight.

Image 4 (save as {id}_head_faces.png): HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
{HEAD PIECES}
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK: no eyes, no eyebrows, no mouth. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each piece is BOTH eyes together with their eyebrows, spaced and angled exactly as they sit on the blank head (3/4 view, so the far eye is slightly narrower): {EYE PIECES}
- Row 3, MOUTH pieces, sized to fit the blank head: {MOUTH PIECES}
Follow the PART RULES.

Image 5 (save as {id}_parts_body.png): BODY PARTS SHEET, landscape.
Cut-out body parts of the same character for 2D skeletal animation. Same scale, colours and line weight as the rig pose; each part keeps the orientation it has in the rig pose (do not rotate parts). Arrange them in a neat grid, left to right, top to bottom, in this order:
{BODY PARTS}
Follow the PART RULES.

Image 6 (save as {id}_hands_props.png): HANDS & PROPS SHEET, landscape.
More cut-out parts of the same character, with the same rules as the body parts sheet (same scale as the rig pose, complete, separated by at least 60 px, no labels, no shadows from other parts), in a neat grid, left to right, top to bottom:
{HANDS AND PROPS}
Follow the PART RULES.

Image 7 (save as {id}_poses.png): ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
{ACTION POSES}
These are animation key poses: make them dynamic and expressive, with strong lines of action, squash and stretch, and follow-through on hair and cloth.

Image 8 (save as {id}_portraits.png): DIALOG PORTRAITS, landscape.
Three waist-up portraits of the same character for story dialog boxes, 3/4 view facing right, larger and more detailed than the sprite, same style and colours, side by side and clearly separated:
{PORTRAITS}

IF YOU ARE CODEX (an agent working in the GitHub repository riccokenko/game101)
- Make every image with your image generation tool. Never draw the character with code (SVG, canvas, Pillow). If you cannot generate images, stop and tell me.
- Save each image with its exact file name in art/incoming/{id}/, plus NOTES.md listing the files and any rule you could not meet.
- Commit only those files on a new branch art/{id}-v1 and open a pull request titled "Art: {NAME} v1". Do not change any other file.
- After Image 2, push and stop; wait for APPROVED, then continue with Images 3 to 8 on the same branch.

Start now with Image 1.
```

---

## 9. Level maps (one painted picture per level)

Each battle level is **one painted picture**, seen from above at a steep angle like Kingdom Rush. The game draws the characters, towers and effects on top of it.

- **The layout comes first.** The game team draws a flat-colour layout sketch from the level data (`npm run map:sketch -- <level>` writes `art/maps/<level>-sketch.png`). The road, tower spots, dock and vault in the sketch are at the exact pixels the game code uses.
- **The painter repaints the sketch.** Attach the sketch to the chat, then paste the prompt below. The painting must keep every road curve and tower spot where the sketch has it.
- **Delivery.** Save the result as `art/incoming/maps/<level>_map.png`. The team checks that it lines up and nudges the level data if the painting drifted slightly.

### 9.1 Level 1 map: `level1_map.png` (landscape, attach `level1-sketch.png`)

```
You are the environment artist for "Little Archer: Sky Pirates", a mobile tower-defense game in the style of Kingdom Rush. The attached image is the LAYOUT SKETCH of level 1, "Pirates on the Horizon". Repaint it as a finished, beautiful game map.

KEEP THE LAYOUT EXACTLY
The game's code uses the pixel positions of this sketch, so the painting must line up with it.
- One landscape image, 1536 x 1024, with exactly the same framing as the sketch. Do not crop, zoom, rotate, mirror or re-frame.
- Tan band = the ROAD the pirates walk: a dirt path with worn cobblestones. Keep its exact route, curves and width. No branches, no shortcuts.
- 8 grey circles = TOWER SPOTS: empty round stone platforms, flat and slightly raised, with a ring of moss. Same place and same size. Leave them empty.
- Brown planks on the right = the AIRSHIP DOCK: a wooden pier over the sky with posts and rope railings, where the road starts. No airship.
- Grey circle with the cyan diamond on the left = the CRYSTAL VAULT: a small stone shrine holding a cluster of glowing cyan Sky Crystals, where the road ends.
- Green shape = the grassy top of the floating island. Brown band below it = the island's rocky cliff, with hanging roots and a few small crystals in the rock. The light-blue line on the left is a small waterfall pouring off the edge into the clouds.
- Dark green dots = round, leafy storybook trees. You may add small bushes, flowers, rocks, a fence or a signpost, but only on open grass.
- Light blue with white shapes = bright sky with soft clouds around the island.

VIEW
- Seen from above at a steep angle, like Kingdom Rush: the island top keeps the shape of the sketch; trees, rocks and the shrine stand upright and are seen slightly from above; the cliff shows the island's thickness below its front edge.

STYLE
- HD 2D hand-drawn anime game art that matches the game's characters: clean warm-brown line art (#3B2A2A, never black), soft cel shading, light from the upper left, warm and adventurous, bright and easy to read on a phone.
- Grass with gentle colour variation and tiny flowers; the road with wheel ruts, pebbles and a soft edge into the grass.

RULES
- Do not move, add or remove the road, the tower spots, the dock or the vault.
- Keep the road and the tower spots clear: nothing stands on them or hangs over them, and tall things (trees, rocks) never hide them.
- No characters, no airship, no towers, no text, no numbers, no UI, no frame, no watermark.
- No dark vignette and no heavy fog: the whole map stays bright.

Make the image now. Under it write only: Save as: level1_map.png
If I write REDO (or วาดใหม่), paint it again and follow the layout more strictly. Any other comment is a change request: repaint with that change and keep everything else.
```
