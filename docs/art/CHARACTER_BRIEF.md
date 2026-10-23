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
- **Codex.** The same prompt works for Codex used as a plain chat (no repository): its last section asks for images in the chat, never drawn with code.
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

HOW TO DELIVER
- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.

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

HOW TO DELIVER
- Make the map with your image generation tool and show it here in the chat so I can download it. Never draw it with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.
```

---

## 10. Remaining characters: ready-to-paste prompts (Codex, one character per chat)

> **สำหรับเจ้านาย:** ก๊อปทั้งกล่องไปวางในแชตใหม่ของ Codex ทีละตัว
> - หลังภาพ 1 (ภาพหลัก) Codex จะหยุดรอ ถ้าถูกใจพิมพ์ "ผ่าน" แล้วพิมพ์ "ต่อ" จนครบ
> - ภาพที่ได้ ให้แปะกลับมาในแชตกับ Claude ตอนที่ Claude ตอบจบแล้ว ไม่งั้นไฟล์จะไม่ถูกบันทึก

These follow 8.10 with three changes:
- **No concept turnaround.** The master is Image 1, and approval comes right after it.
- **Portraits only for story characters.** First Mate and Talon have them; the swarm enemies and Mochi do not.
- **No painted "cut ends" at the joints.** The Deckhand sheets had flat skin-coloured ovals there, which show as holes once limbs move.

Non-humanoid characters split into body, wings (inner and outer half each), tail and legs.

### 10.1 Powder Monkey (fast swarm pirate): `powder_monkey`

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, Powder Monkey, as 6 images that the game team will slice into parts and animate with 2D bones.

HOW WE WORK
- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.
- Under each image write only one line: "Save as: <file name>". Then wait.
- When I write NEXT (or ต่อ), make the next image.
- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.
- Any other comment from me is a change request for the last image: redraw it with that change.
- After Image 1, STOP. Do not start Image 2 until I write APPROVED (or ผ่าน). Until then, only revise Image 1 as I ask.
- Images 2 to 6 must match the approved Image 1 (the master) exactly, and from Image 3 on also Image 2 (the rig pose). Use them as reference images if you can.

STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). Chibi proportions: about 2 heads tall, big head, small hands and feet.
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
- Keep the SAME character design in every image: same face, colours (use the hex codes), outfit details and proportions.

CHARACTER: Powder Monkey (id: powder_monkey)
Role: the fast swarm pirate: a small, mischievous ship's monkey who runs the gunpowder. Twitchy, giggly and quick: a cute troublemaker, never scary.
Body: a small brown monkey (fur #8A5A36, shade #6B4428) with a cream face, ears, palms and belly (#F3D9B1), big round ears, a long curly tail with a curl at the end.
Face: huge round amber eyes (#E39B2D), a small dark nose, a wide toothy grin.
Headscarf: orange headscarf (#F08A24) with small yellow stars (#FFD23F), knotted at the back with two short tails.
Clothes: a tiny open red vest (#D6402F) with brass buttons (#F6C44F), patched blue shorts (#3E5FA8) with a rope belt (#C9A06A). Bare feet.
Prop: a round black powder bomb (#2B2B33) with a short lit fuse, about the size of its head.
Loot: a stolen Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF).

PART RULES (the parts sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath.
- Joint ends are rounded and extend about 15% past the joint, so bending never shows a gap. Do NOT paint flat skin-coloured "cut" ovals on the joint ends: the end simply continues the part's own colour and shape.
- Keep each part in the orientation it has in the rig pose (Image 2) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- Anything that should swing on its own (the tail, the headscarf tails) is its own part. The torso includes a short neck stub; the head does not include the neck.

IMAGE LIST

Image 1 (save as powder_monkey_master.png): MASTER ILLUSTRATION, portrait orientation.
The character, full body, 3/4 front view facing right, in this signature pose: crouched and ready to scamper, holding the bomb up in one hand with the fuse fizzing, tail curled up behind, grinning.
This is the character's key art: make it the most appealing, polished version.

Image 2 (save as powder_monkey_rigpose.png): RIG POSE, portrait orientation.
The exact same character as the master illustration, full body, 3/4 front view facing right, in a neutral rig pose for 2D skeletal animation:
- standing straight, weight even, feet about shoulder-width apart, both feet flat;
- both arms hanging down, held slightly away from the body (about 20 degrees) so the arms do NOT overlap the torso; hands open and relaxed;
- no bomb, no crystal; the tail hangs down behind one leg and curls out to the side, clear of both legs; headscarf tails hanging down;
- eyes open and calm, small closed smile.
Keep clear empty space between the arms, the legs and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight.

Image 3 (save as powder_monkey_head_faces.png): HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
  A. The head with the headscarf, ears and nose (cream muzzle).
  B. The two headscarf tails, on their own.
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK where the eyes and mouth go. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each eye piece is BOTH eyes together with their eyebrows, spaced and angled exactly as they sit on the blank head (3/4 view, so the far eye is slightly narrower): 1 cheeky neutral · 2 angry · 3 greedy (sparkling) · 4 closed (blink) · 5 hurt (squeezed shut > <) · 6 knocked out (spirals) · 7 surprised (wide) · 8 mischievous half-lidded
- Row 3, MOUTH pieces, sized to fit the blank head: 1 toothy grin · 2 open laughing · 3 gritted teeth · 4 ouch (wavy) · 5 small "O" · 6 tongue out, teasing
Follow the PART RULES.

Image 4 (save as powder_monkey_parts_body.png): BODY PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. torso: vest and belly, with a short neck stub, no arms
2. hips: shorts with the rope belt
3. tail, top half (from the hips to the middle)
4. tail, bottom half with the curl
5. left upper arm
6. left forearm
7. right upper arm
8. right forearm
9. thigh
10. lower leg with the bare foot
Follow the PART RULES.

Image 5 (save as powder_monkey_hands_props.png): HANDS & PROPS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. the powder bomb with its short fuse (fuse not lit)
2. left hand open
3. left hand fist
4. right hand open
5. right hand holding, fingers curled as if around a ball, with an empty gap where the bomb goes
Follow the PART RULES.

Image 6 (save as powder_monkey_poses.png): ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
1 jittery idle, bouncing on its toes · 2 scampering run · 3 running in with the bomb held over its head · 4 running away with the crystal on its head, cackling · 5 hit recoil, eyes squeezed · 6 knocked out, dizzy on its back · 7 taunting, pulling down an eyelid with the tongue out · 8 cheering, jumping with both arms up
These are animation key poses: make them dynamic and expressive, with strong lines of action, squash and stretch, and follow-through.

HOW TO DELIVER
- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.

Start now with Image 1.
```

### 10.2 Ironclad (armoured tank): `ironclad`

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, Ironclad, as 6 images that the game team will slice into parts and animate with 2D bones.

HOW WE WORK
- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.
- Under each image write only one line: "Save as: <file name>". Then wait.
- When I write NEXT (or ต่อ), make the next image.
- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.
- Any other comment from me is a change request for the last image: redraw it with that change.
- After Image 1, STOP. Do not start Image 2 until I write APPROVED (or ผ่าน). Until then, only revise Image 1 as I ask.
- Images 2 to 6 must match the approved Image 1 (the master) exactly, and from Image 3 on also Image 2 (the rig pose). Use them as reference images if you can.

STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). Chunky chibi proportions: about 2.5 heads tall, very broad and heavy, big helmet, small legs.
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
- Keep the SAME character design in every image: same face, colours (use the hex codes), outfit details and proportions.

CHARACTER: Ironclad (id: ironclad)
Role: the armoured tank of the sky pirates: a big, stocky pirate sealed in riveted iron plates. Slow, proud and stubborn: a funny walking boiler, never scary.
Helmet: a round diving-style helmet in gunmetal (#6C7686, shade #4E5664) with brass rims (#C9A23D) and a round porthole visor of dark glass (#22303F). Two glowing yellow eyes (#FFD36B) shine behind the glass.
Armour: riveted gunmetal plates over the chest, shoulders and arms, with rust-orange patches (#C0652F) and brass rivets; a thick leather belt (#5A3A22) with a big brass buckle; one loose belt strap hanging.
Legs: dark padded trousers (#3D3A48) and heavy iron boots.
Gear: a round ship-hatch shield (gunmetal, with a brass wheel handle on the front) in the LEFT hand, and a heavy brass wrench (#C9A23D) in the RIGHT hand.
Loot: a stolen Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF).

PART RULES (the parts sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath.
- Joint ends are rounded and extend about 15% past the joint, so bending never shows a gap. Do NOT paint flat skin-coloured "cut" ovals on the joint ends: the end simply continues the part's own colour and shape.
- Keep each part in the orientation it has in the rig pose (Image 2) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- Anything that should swing on its own (the loose belt strap) is its own part. The torso includes a short neck stub; the head does not include the neck.

IMAGE LIST

Image 1 (save as ironclad_master.png): MASTER ILLUSTRATION, portrait orientation.
The character, full body, 3/4 front view facing right, in this signature pose: standing proud and wide, the wrench resting on the shoulder, the hatch shield planted on the ground in front, eyes glowing smugly.
This is the character's key art: make it the most appealing, polished version.

Image 2 (save as ironclad_rigpose.png): RIG POSE, portrait orientation.
The exact same character as the master illustration, full body, 3/4 front view facing right, in a neutral rig pose for 2D skeletal animation:
- standing straight, weight even, feet about shoulder-width apart, both feet flat;
- both arms hanging down, held slightly away from the body (about 20 degrees) so the arms do NOT overlap the torso; hands open and relaxed;
- no shield, no wrench, no crystal; the loose belt strap hanging straight;
- eyes open and calm.
Keep clear empty space between the arms, the legs and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight.

Image 3 (save as ironclad_head_faces.png): HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
  A. The helmet, with the porthole glass dark and EMPTY (no eyes).
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK where the eyes go. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each eye piece is BOTH glowing eyes together, sized and spaced exactly to sit inside the porthole glass: 1 calm glow · 2 angry narrow glow · 3 closed (dark slits) · 4 hurt (> < shapes) · 5 knocked out (spirals) · 6 surprised (big circles) · 7 smug (half circles) · 8 greedy (sparkles)
Follow the PART RULES.

Image 4 (save as ironclad_parts_body.png): BODY PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. torso: chest armour, with a short neck stub, no arms
2. hips: belt with the buckle and the top of the trousers
3. the loose belt strap, on its own
4. left upper arm with its shoulder plate
5. left forearm (iron gauntlet cuff)
6. right upper arm with its shoulder plate
7. right forearm (iron gauntlet cuff)
8. thigh
9. lower leg with the iron boot
Follow the PART RULES.

Image 5 (save as ironclad_hands_props.png): HANDS & PROPS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. the hatch shield, front view, wheel handle facing us
2. the heavy wrench, alone, pointing up
3. left hand (iron glove) open
4. left hand gripping a handle, closed around an empty gap
5. right hand (iron glove) open
6. right hand gripping, closed around an empty gap where the wrench handle goes
Follow the PART RULES.

Image 6 (save as ironclad_poses.png): ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
1 proud idle, chest out · 2 heavy stomping walk · 3 charging with the shield in front · 4 carrying the crystal under one arm, plodding away · 5 hit, rocking back with sparks of surprise in the eyes · 6 knocked out, flat on its back like a turtle · 7 taunting, banging the wrench on the shield · 8 cheering with the wrench raised
These are animation key poses: make them dynamic and expressive, with strong lines of action, squash and stretch, and follow-through.

HOW TO DELIVER
- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.

Start now with Image 1.
```

### 10.3 Parrot Raider (flying thief): `parrot_raider`

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, Parrot Raider, as 6 images that the game team will slice into parts and animate with 2D bones.

HOW WE WORK
- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.
- Under each image write only one line: "Save as: <file name>". Then wait.
- When I write NEXT (or ต่อ), make the next image.
- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.
- Any other comment from me is a change request for the last image: redraw it with that change.
- After Image 1, STOP. Do not start Image 2 until I write APPROVED (or ผ่าน). Until then, only revise Image 1 as I ask.
- Images 2 to 6 must match the approved Image 1 (the master) exactly, and from Image 3 on also Image 2 (the rig pose). Use them as reference images if you can.

STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). Cute chunky proportions: a round body and a big head, big expressive eyes.
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
- Keep the SAME character design in every image: same face, colours (use the hex codes), outfit details and proportions.

CHARACTER: Parrot Raider (id: parrot_raider)
Role: the flying thief of the sky pirates: a big, cocky parrot who snatches crystals from the air. Loud, flashy and cheeky: a cute villain, never scary.
Feathers: bright green body (#3FBF6E, shade #2F9E5A), scarlet head and chest (#E2423B), yellow and blue wing tips (#FFD23F, #3E7FD8), a long tail with green and blue feathers.
Face: a big curved yellow beak (#F4B62C) with a dark tip, large white eyes with dark pupils, cheeky brows.
Gear: brown leather aviator goggles (#7A4F30, brass rims #C9A23D) pushed up on the forehead, a tiny black pirate hat (#2B2B38) with a white skull mark tilted on top, a short red neckerchief.
Prop: a small grappling hook on a short rope, carried in its feet.
Loot: a stolen Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF), carried in its feet.

PART RULES (the parts sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath.
- Joint ends are rounded and extend about 15% past the joint, so bending never shows a gap. Do NOT paint flat skin-coloured "cut" ovals on the joint ends: the end simply continues the part's own colour and shape.
- Keep each part in the orientation it has in the rig pose (Image 2) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- Anything that should swing on its own (the neckerchief tails) is its own part. Each wing is TWO parts (inner half and outer flight feathers) so it can fold and flap. The body includes a short neck stub; the head does not include the neck.

IMAGE LIST

Image 1 (save as parrot_raider_master.png): MASTER ILLUSTRATION, portrait orientation.
The character, full body, 3/4 view facing right, flying, in this signature pose: swooping in mid-air, wings raised high, grinning wickedly, the grappling hook swinging from its feet.
This is the character's key art: make it the most appealing, polished version.

Image 2 (save as parrot_raider_rigpose.png): RIG POSE, portrait orientation.
The exact same character as the master illustration, in a neutral FLYING rig pose for 2D skeletal animation, 3/4 view facing right:
- body level and calm, tilted slightly forward;
- BOTH wings spread wide open, up and out to each side, fully visible and NOT overlapping the body or each other (the far wing behind and a little smaller, seen in 3/4);
- tail feathers fanned out behind; legs hanging down below the body, toes relaxed;
- no hook, no crystal, beak closed;
- eyes open and calm.
Keep clear empty space between the wings, the legs, the tail and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight.

Image 3 (save as parrot_raider_head_faces.png): HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
  A. The head with the hat and goggles, upper beak attached.
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK where the eyes and mouth go. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each eye piece is BOTH eyes together with their eyebrows, spaced and angled exactly as they sit on the blank head (3/4 view, so the far eye is slightly narrower): 1 cheeky neutral · 2 angry · 3 greedy (sparkling) · 4 closed (blink) · 5 hurt (squeezed shut > <) · 6 knocked out (spirals) · 7 surprised (wide) · 8 smug half-lidded
- Row 3, LOWER BEAK pieces, sized and placed to fit under the upper beak: 1 lower beak closed · 2 lower beak open, squawking · 3 lower beak wide open, laughing · 4 lower beak open with the tongue out
Follow the PART RULES.

Image 4 (save as parrot_raider_parts_body.png): BODY PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. body (round belly and back, with a short neck stub; no wings, no legs, no tail)
2. tail feathers, fanned
3. near wing, inner half (from the shoulder to the wrist bend)
4. near wing, outer half (the long flight feathers)
5. far wing, inner half
6. far wing, outer half
7. near leg with its foot
8. far leg with its foot
9. the red neckerchief tails, on their own
Follow the PART RULES.

Image 5 (save as parrot_raider_hands_props.png): HANDS & PROPS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. the grappling hook with its short coiled rope
2. near foot with toes open and spread
3. near foot with toes clenched around an empty gap (where the hook or the crystal goes)
4. far foot with toes open and spread
5. far foot with toes clenched around an empty gap
Follow the PART RULES.

Image 6 (save as parrot_raider_poses.png): ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
1 hovering, flapping lazily · 2 flying forward fast · 3 diving with wings folded back · 4 flying away with the crystal clutched in its feet, laughing · 5 hit, feathers puffed, eyes squeezed · 6 knocked out, tumbling with spirals in its eyes · 7 taunting, hovering with one wing pointing and tongue out · 8 cheering, wings flung up
These are animation key poses: make them dynamic and expressive, with strong lines of action and follow-through on wings and tail feathers.

HOW TO DELIVER
- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.

Start now with Image 1.
```

### 10.4 First Mate (chapter 1 boss): `first_mate`

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, First Mate, as 7 images that the game team will slice into parts and animate with 2D bones.

HOW WE WORK
- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.
- Under each image write only one line: "Save as: <file name>". Then wait.
- When I write NEXT (or ต่อ), make the next image.
- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.
- Any other comment from me is a change request for the last image: redraw it with that change.
- After Image 1, STOP. Do not start Image 2 until I write APPROVED (or ผ่าน). Until then, only revise Image 1 as I ask.
- Images 2 to 7 must match the approved Image 1 (the master) exactly, and from Image 3 on also Image 2 (the rig pose). Use them as reference images if you can.

STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). Chunky chibi proportions: about 3 heads tall, very broad shoulders and chest, big hands, short legs.
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
- Keep the SAME character design in every image: same face, colours (use the hex codes), outfit details and proportions.

CHARACTER: First Mate (id: first_mate)
Role: the chapter 1 boss, Captain Stormbeard's loud right-hand man. Bossy, boastful and theatrical: an imposing but still cute villain, never gory or scary.
Face: big ruddy face (#EDB78E), a black eyepatch (#2B2B38) over his RIGHT eye, one fierce brown eye (#5B3A26), heavy grey-black eyebrows, a thick dark-brown beard (#4A3326) that ends in one long braid tied with a gold ring (#F6C44F), a big nose, a scar across one cheek.
Hat: a black tricorn hat (#2B2B38) with gold trim (#F6C44F) and a long red feather (#E2423B).
Coat: a long burgundy coat (#8E2A2A, shade #6A1E22) with brass buttons (#F6C44F) and wide cuffs, the coat tails split at the back into two flaps; a cream shirt (#F7F0E1) and a broad black belt with a gold buckle.
Legs: dark grey trousers (#3D3A48) and tall black boots (#2F2A2E) with gold buckles.
Weapon: a heavy iron ship's anchor (#5B6375) with a short length of chain, swung in the RIGHT hand.
Loot: Sky Crystals, fist-sized faceted chunks in light cyan (#6FF0FF); he carries three at once in a bulging sack over his shoulder.

PART RULES (the parts sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath.
- Joint ends are rounded and extend about 15% past the joint, so bending never shows a gap. Do NOT paint flat skin-coloured "cut" ovals on the joint ends: the end simply continues the part's own colour and shape.
- Keep each part in the orientation it has in the rig pose (Image 2) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- Anything that should swing on its own (the two coat tails, the beard braid, the hat feather) is its own part. The torso includes a short neck stub; the head does not include the neck.

IMAGE LIST

Image 1 (save as first_mate_master.png): MASTER ILLUSTRATION, portrait orientation.
The character, full body, 3/4 front view facing right, in this signature pose: standing wide like he owns the ship, the anchor slung over his shoulder, the other fist on his hip, sneering.
This is the character's key art: make it the most appealing, polished version.

Image 2 (save as first_mate_rigpose.png): RIG POSE, portrait orientation.
The exact same character as the master illustration, full body, 3/4 front view facing right, in a neutral rig pose for 2D skeletal animation:
- standing straight, weight even, feet about shoulder-width apart, both feet flat;
- both arms hanging down, held slightly away from the body (about 20 degrees) so the arms do NOT overlap the torso; hands open and relaxed;
- no anchor, no sack; the coat tails, the beard braid and the hat feather hanging straight;
- eyes open and calm, mouth closed under the beard.
Keep clear empty space between the arms, the legs and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight.

Image 3 (save as first_mate_head_faces.png): HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
  A. The head with the tricorn hat, eyepatch, eyebrows and beard (the mouth area inside the beard left blank, no eye on the open side).
  B. The beard braid with its gold ring, on its own.
  C. The hat feather, on its own.
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK where the eyes and mouth go. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each eye piece is the ONE open eye (his left) with its eyebrow, sized and placed exactly where it sits on the head: 1 fierce neutral · 2 furious · 3 greedy (sparkling) · 4 closed (blink) · 5 hurt (squeezed shut) · 6 knocked out (spiral) · 7 surprised (wide) · 8 smug half-lidded
- Row 3, MOUTH pieces, sized to fit the blank space in the beard: 1 sneer · 2 roaring shout · 3 big laugh · 4 ouch (wavy) · 5 small "O" · 6 gritted teeth
Follow the PART RULES.

Image 4 (save as first_mate_parts_body.png): BODY PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. torso: coat top, shirt and belt, with a short neck stub, no arms
2. hips: belt bottom and trousers top
3. left coat tail, on its own
4. right coat tail, on its own
5. left upper arm (coat sleeve)
6. left forearm (coat sleeve with the wide cuff)
7. right upper arm
8. right forearm
9. thigh
10. lower leg with the tall boot
Follow the PART RULES.

Image 5 (save as first_mate_hands_props.png): HANDS & PROPS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. the anchor with its short chain, upright
2. the sack bulging with three Sky Crystals, glowing through a tear
3. left hand open
4. left hand fist
5. right hand open
6. right hand gripping, closed around an empty gap where the anchor shaft goes
Follow the PART RULES.

Image 6 (save as first_mate_poses.png): ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
1 idle, anchor on the shoulder, tapping a foot · 2 marching walk · 3 swinging the anchor overhead · 4 lugging the crystal sack over the shoulder, grinning · 5 hit, staggering back · 6 knocked out, flat on his back, hat fallen over his face · 7 shouting orders, pointing forward · 8 cheering, anchor raised high
These are animation key poses: make them dynamic and expressive, with strong lines of action, squash and stretch, and follow-through.

Image 7 (save as first_mate_portraits.png): DIALOG PORTRAITS, landscape.
Three waist-up (or chest-up) portraits of the same character for story dialog boxes, 3/4 view facing right, larger and more detailed than the sprite, same style and colours, side by side and clearly separated:
1 sneering · 2 roaring with fury · 3 defeated, dizzy and panicking

HOW TO DELIVER
- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.

Start now with Image 1.
```

### 10.5 Talon (the hero's eagle): `talon`

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, Talon, as 7 images that the game team will slice into parts and animate with 2D bones.

HOW WE WORK
- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.
- Under each image write only one line: "Save as: <file name>". Then wait.
- When I write NEXT (or ต่อ), make the next image.
- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.
- Any other comment from me is a change request for the last image: redraw it with that change.
- After Image 1, STOP. Do not start Image 2 until I write APPROVED (or ผ่าน). Until then, only revise Image 1 as I ask.
- Images 2 to 7 must match the approved Image 1 (the master) exactly, and from Image 3 on also Image 2 (the rig pose). Use them as reference images if you can.

STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). Cute chunky proportions: a round body, a big head, big friendly eyes; a heroic little eagle, not a realistic bird.
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
- Keep the SAME character design in every image: same face, colours (use the hex codes), outfit details and proportions.

CHARACTER: Talon (id: talon)
Role: Little Archer's eagle companion. Proud, brave and loyal, with a soft spot for the hero: a cute hero's pet, never fierce or scary.
Feathers: golden-brown body (#B07A3E, shade #8A5A2E), a cream-white head and chest (#FBF4E4), brown wings with gold-tipped flight feathers (#F4C34F), a white-and-brown tail.
Face: a strong curved golden beak (#F4B62C), big amber eyes (#E39B2D) with a confident brow.
Gear: a small green scarf (#3E9A4F) that matches the hero's hood, knotted at the neck with two short tails.
Feet: yellow feet (#F4C34F) with dark curved talons.
Prop: a Sky Crystal, a fist-sized faceted crystal chunk in light cyan (#6FF0FF), that Talon snatches back from pirates.

PART RULES (the parts sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath.
- Joint ends are rounded and extend about 15% past the joint, so bending never shows a gap. Do NOT paint flat skin-coloured "cut" ovals on the joint ends: the end simply continues the part's own colour and shape.
- Keep each part in the orientation it has in the rig pose (Image 2) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- Anything that should swing on its own (the scarf tails) is its own part. Each wing is TWO parts (inner half and outer flight feathers) so it can fold and flap. The body includes a short neck stub; the head does not include the neck.

IMAGE LIST

Image 1 (save as talon_master.png): MASTER ILLUSTRATION, portrait orientation.
The character, full body, 3/4 view facing right, flying, in this signature pose: swooping in heroically with wings spread wide and talons ready, scarf streaming, a confident smile in the eyes.
This is the character's key art: make it the most appealing, polished version.

Image 2 (save as talon_rigpose.png): RIG POSE, portrait orientation.
The exact same character as the master illustration, in a neutral FLYING rig pose for 2D skeletal animation, 3/4 view facing right:
- body level and calm, tilted slightly forward;
- BOTH wings spread wide open, up and out to each side, fully visible and NOT overlapping the body or each other (the far wing behind and a little smaller, seen in 3/4);
- tail feathers fanned out behind; legs hanging down below the body, toes relaxed;
- no crystal, beak closed, scarf tails hanging;
- eyes open and calm.
Keep clear empty space between the wings, the legs, the tail and the body. This image is the assembly reference: every later part must match it exactly in scale, colours and line weight.

Image 3 (save as talon_head_faces.png): HEAD & FACES PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels.
LEFT THIRD:
  A. The head, upper beak attached.
  B. The two scarf tails, on their own.
The head is in the same 3/4 view facing right as the rig pose. The face is BLANK where the eyes and mouth go. Do not include the neck.
RIGHT TWO THIRDS, in a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each eye piece is BOTH eyes together with their eyebrows, spaced and angled exactly as they sit on the blank head (3/4 view, so the far eye is slightly narrower): 1 confident neutral · 2 fierce (diving) · 3 happy (closed arcs ^ ^) · 4 closed (blink) · 5 hurt (squeezed shut > <) · 6 surprised (wide) · 7 proud half-lidded · 8 determined
- Row 3, LOWER BEAK pieces, sized and placed to fit under the upper beak: 1 lower beak closed · 2 lower beak open, crying out · 3 lower beak open, happy chirp
Follow the PART RULES.

Image 4 (save as talon_parts_body.png): BODY PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. body (round belly and back, with a short neck stub; no wings, no legs, no tail)
2. tail feathers, fanned
3. near wing, inner half (from the shoulder to the wrist bend)
4. near wing, outer half (the long flight feathers)
5. far wing, inner half
6. far wing, outer half
7. near leg with its foot
8. far leg with its foot
Follow the PART RULES.

Image 5 (save as talon_hands_props.png): HANDS & PROPS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. the Sky Crystal chunk
2. near foot with talons open and spread
3. near foot with talons clenched around an empty gap (where the crystal goes)
4. far foot with talons open and spread
5. far foot with talons clenched around an empty gap
Follow the PART RULES.

Image 6 (save as talon_poses.png): ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
1 perched proudly, wings folded · 2 hovering, flapping · 3 diving straight down, wings folded back · 4 swooping with talons out · 5 flying off with the crystal in its talons · 6 gliding, wings spread · 7 a happy chirp with wings half open · 8 landing, wings flared and talons forward
These are animation key poses: make them dynamic and expressive, with strong lines of action and follow-through on wings, tail and scarf.

Image 7 (save as talon_portraits.png): DIALOG PORTRAITS, landscape.
Three waist-up (or chest-up) portraits of the same character for story dialog boxes, 3/4 view facing right, larger and more detailed than the sprite, same style and colours, side by side and clearly separated:
1 proud · 2 fierce battle cry · 3 happy and fond

HOW TO DELIVER
- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.

Start now with Image 1.
```

### 10.6 Mochi (the sky whale, ultimate skill): `mochi`

```
You are the lead character artist for "Little Archer: Sky Pirates", a mobile tower-defense game. In this chat you will draw ONE character, Mochi, as 6 images that the game team will slice into parts and animate with 2D bones.

HOW WE WORK
- Make ONE image per reply, in the order of the IMAGE LIST below. Start with Image 1 right away.
- Under each image write only one line: "Save as: <file name>". Then wait.
- When I write NEXT (or ต่อ), make the next image.
- When I write REDO (or วาดใหม่), redraw the last image and follow the rules more strictly.
- Any other comment from me is a change request for the last image: redraw it with that change.
- After Image 1, STOP. Do not start Image 2 until I write APPROVED (or ผ่าน). Until then, only revise Image 1 as I ask.
- Images 2 to 6 must match the approved Image 1 (the master) exactly, and from Image 3 on also Image 2 (the rig pose). Use them as reference images if you can.

STYLE
- HD 2D hand-drawn anime game art (not pixel art, not 3D). Cute, round and soft proportions: a plump baby whale with a big head, big eyes and small fins.
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
- Keep the SAME character design in every image: same face, colours (use the hex codes), outfit details and proportions.

CHARACTER: Mochi (id: mochi)
Role: the hero's ultimate skill: a baby sky whale that swims through the air and sweeps across the island. Gentle, playful and huge-hearted: as cute as possible, never scary.
Body: round and soft like a mochi, a pastel sky-blue back (#8FD3FF, shade #6BB8EA), a cream belly (#FFF6E0) with soft grooves, little star-shaped freckles (#FFFFFF) on the back.
Face: huge gentle eyes (#2F3E66) with big catch-lights, pink cheeks (#FF9EB5), a tiny smile.
Fins and tail: puffy, cloud-like fins and tail fluke, edged in white like little clouds.
Spout: a small fluffy cloud puffing from the blowhole.

PART RULES (the parts sheets become the animated sprite)
- Draw every part COMPLETE, as if the parts in front of it were removed, including the areas normally hidden underneath.
- Joint ends are rounded and extend about 15% past the joint, so bending never shows a gap. Do NOT paint flat skin-coloured "cut" ovals on the joint ends: the end simply continues the part's own colour and shape.
- Keep each part in the orientation it has in the rig pose (Image 2) and at the same scale; do not rotate parts or enlarge small parts to fill space.
- No shadows cast by other parts; each part is lit on its own from the upper left.
- At least 60 px of empty background around every part; nothing touching or overlapping; nothing touching the image edge; each part exactly once; no labels.
- Neat grid, left to right, top to bottom, in the numbered order given.
- Anything that should swing on its own (the tail fluke, the fins, the cloud spout) is its own part.

IMAGE LIST

Image 1 (save as mochi_master.png): MASTER ILLUSTRATION, portrait orientation.
The character, full body, side view facing right, swimming in the sky, in this signature pose: gliding forward joyfully, tail curled up, fins spread, a happy cloud puffing from the blowhole.
This is the character's key art: make it the most appealing, polished version.

Image 2 (save as mochi_rigpose.png): RIG POSE, landscape orientation.
The exact same character as the master illustration, side view facing right, in a neutral swimming rig pose for 2D skeletal animation:
- body straight and level;
- both fins spread out from the body (the far fin peeking out behind, smaller), NOT overlapping the body more than needed;
- the tail fluke straight out behind, level;
- the cloud spout puffing from the blowhole;
- eyes open and calm, a small smile.
This image is the assembly reference: every later part must match it exactly in scale, colours and line weight.

Image 3 (save as mochi_head_faces.png): FACE PIECES SHEET, landscape.
Cut-out face pieces of the same character at the SAME SCALE as the rig pose, for 2D animation. Every item is separate and complete, at least 60 px apart, nothing touching or overlapping, nothing touching the image edge, no labels. In a neat grid, left to right, top to bottom:
- Rows 1-2, EYE pieces. Each piece is BOTH eyes together (the far one smaller, peeking over the head) with the pink cheeks, spaced exactly as they sit on the whale's face: 1 gentle neutral · 2 happy (closed arcs ^ ^) · 3 sparkling excited · 4 closed (blink) · 5 sleepy half-lidded · 6 surprised (wide) · 7 determined · 8 hurt (squeezed shut > <)
- Row 3, MOUTH pieces, sized to fit the face: 1 tiny smile · 2 open happy "O" · 3 big laugh · 4 small worried wobble · 5 cat-like "w" mouth
Follow the PART RULES.

Image 4 (save as mochi_parts_body.png): BODY PARTS SHEET, landscape.
Cut-out parts of the same character at the SAME SCALE as the rig pose, for 2D animation; each part keeps the orientation it has in the rig pose. Arrange them in a neat grid, left to right, top to bottom, in this order:
1. body: the whole round body with the face area BLANK (no eyes, no mouth, no cheeks), no fins, no tail fluke
2. tail fluke
3. near fin
4. far fin
5. the cloud spout, on its own
Follow the PART RULES.

Image 5 (save as mochi_poses.png): ACTION KEY POSES, landscape.
The same character in 8 action poses, 4 per row, same scale, full body, all facing right, clearly separated, no labels, no effects:
1 floating happily · 2 swimming forward fast, body arched · 3 big leap upward · 4 sweeping down in a curve · 5 spinning playfully · 6 sleeping, curled up · 7 waving a fin · 8 cheering, both fins up
These are animation key poses: make them dynamic, bouncy and squishy, with squash and stretch.

Image 6 (save as mochi_portraits.png): DIALOG PORTRAITS, landscape.
Three waist-up (or chest-up) portraits of the same character for story dialog boxes, 3/4 view facing right, larger and more detailed than the sprite, same style and colours, side by side and clearly separated:
1 happy · 2 determined · 3 sleepy and cuddly

HOW TO DELIVER
- Make every image with your image generation tool and show it here in the chat so I can download it. Never draw the character with code (SVG, canvas, Python, Pillow). If you cannot generate images, stop and tell me.
- No repository or file work: do not create branches, commits or pull requests.

Start now with Image 1.
```
