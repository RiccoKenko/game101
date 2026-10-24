# Handoff: Little Archer: Sky Pirates

> สรุปสำหรับเริ่มงานต่อในแชตหรือ session ใหม่: สถานะล่าสุด, ลิงก์, งานที่รอ, และสิ่งที่ต้องรู้ก่อนลงมือ

## สถานะ (24 ต.ค. 2026 หลังงานข้ามคืน)
- **โปรเจกต์:** Little Archer: Sky Pirates
  - เกม TD แบบ 2.5D สไตล์ Kingdom Rush บนมือถือแนวนอน ภาพ 2D แนวอนิเมะ
  - เจ้านายวาดภาพด้วย Codex แล้ว Claude ตัดชิ้น ใส่กระดูก ทำท่า และใส่เกม
  - เทคโนโลยี: Three.js กล้อง orthographic, TypeScript, Vite
- **Repo:** `riccokenko/game101` branch `claude/compassionate-dirac-2wzrb3` (branch นี้ใช้ deploy ด้วย)
- **ลิงก์จริง:** little-archer.vercel.app (deploy ล่าสุดดูใน Vercel; ครั้งแรกของ Chapter 1 คือ `dpl_6AZCwQdwFAx6K3FpVqfarzhbPqGD`)
  - `/` หน้าโชว์ตัวละคร มีปุ่ม "Play Chapter 1" ไปที่ `/play.html`
  - `/play.html` ตัวเกม Chapter 1
- **Chapter 1 "Pirates on the Horizon" เล่นได้ครบทั้งบท**
  - **หน้าเลือกด่าน:** `ChapterScreen` ใน `src/play/screens.ts`
    - ตำแหน่งปุ่มอยู่ใน `src/play/chapterMap.ts`
    - พื้นหลังยังเป็นภาพร่าง `public/maps/chapter1-sketch.png` จนกว่า Codex จะวาด
  - **3 ด่าน** (`src/td/levels.ts` `CHAPTER1`)
    - level1 "The First Raid" (เปลี่ยนชื่อจาก "Pirates on the Horizon" ให้ไม่ซ้ำกับชื่อบท, กติกาเหมือนเดิม)
    - level2 "Windmill Terraces"
    - level3 "Lighthouse Point"
    - แผนที่ทั้ง 3 ด่านเป็นภาพวาดจริงแล้ว (ด่าน 2-3 เจ้านายวาดด้วย Gemini 24 ต.ค.)
      - ซ้อนกับข้อมูลด่านแล้ว ถนนและจุดวางป้อมตรงกันจนไม่ต้องแก้ข้อมูล
      - ต้นฉบับอยู่ที่ `art/incoming/maps/level<N>_map.jpg` ส่วนไฟล์ที่เกมใช้คือ `public/maps/level<N>.webp`
  - **ความยาก** `src/td/difficulty.ts`: Easy/Normal/Hard ตัวคูณเลือด 0.8/1/1.2, เงินเริ่ม 1.2/1/0.95, จำนวนโจร 0.85/1/1.1 (บอสมาตัวเดียวเสมอ)
  - **บันทึกความคืบหน้า** `src/play/progress.ts`
    - localStorage key `sky-pirates.progress.v1`
    - เก็บดาวดีสุด ความยากสูงสุดที่ชนะ ความยากที่เลือก และฉากที่ดูแล้ว
    - ห่อ try/catch ทุกจุด
  - **ฉากเล่าเรื่อง:** บทร่างใน `src/play/story.ts` (`level<N>:before` / `level<N>:after`)
    - Stormbeard เป็นเงาดำ (ยังไม่มีภาพ)
    - Talon ใช้ภาพที่ถ่ายจาก puppet จนกว่าภาพครึ่งตัวจะมา
  - **การ์ดจบด่าน, เมนูหยุด (II), `?debug`, รวม draw call (atlas)** ดู README
- **ตัวละคร 8 ตัวเป็น puppet ทั้งหมด**
  - ฮีโร่ไม่มีลูกบอลข้อต่อที่ศอก/เข่าแล้ว (slicer มีโหมด `heal`)
  - ภาพครึ่งตัวครบ: hero, first_mate, deckhand (greedy/angry/panicked), mochi (proud/cry/happy)
- **ป้อม 4 แบบ + สายระดับ 4:** เป็นภาพจริงจาก Codex แล้ว (24 ต.ค.)
  - ภาพต้นฉบับ `art/incoming/towers/` → `npm run art -- towers` → `npm run art:publish -- towers` → `public/sprites/towers/<kind>-<1|2|3|4a|4b>.png`
  - `sheets.json` entry `towers` ใช้ `cut` (ลบของแปลกปลอม), `spill` (เปลี่ยนรัศมีชมพูเป็นสีเรือง), `despeck`
  - เกมโหลดภาพป้อมทีหลัง (ไม่รอ) และวัดตำแหน่งฐานหินจากภาพเอง (`measureFoundation` ใน `src/play/main.ts`), `FOUNDATION = 2.3` เท่ารัศมีจุด
  - ยังมีร่องรอยเล็ก ๆ: เส้นแดงจาง ๆ เหนือปืนใหญ่ Lv1 และหมอกม่วงนิดหน่อยใต้เมฆ Blizzard ถ้าเจ้านายติ ให้ Codex วาดแผ่นนั้นใหม่
- **Test:** unit 153 ข้อ และ e2e 5 ข้อ ผ่านทั้งหมด
  - e2e ใหม่เล่นตั้งแต่แผนที่ → ฉาก → Hard → หยุด → ชนะ → กลับแผนที่ → รีโหลดแล้วข้อมูลยังอยู่

## Artifacts (ลิงก์คงที่)
- **ตัวเกม Chapter 1** (version 12): https://claude.ai/artifact/MXkN26QoVLgRMQsmvjhD98 (publish จาก scratchpad/sky-pirates-play.html)
  - สร้างใหม่ด้วย `node scripts/build-showcase.mjs <out.html> play` (ประมาณ 4.2 MB)
  - ใน artifact ไม่มีปุ่มไปหน้าอื่น และถ้า localStorage ใช้ไม่ได้ก็ยังเล่นได้ (แค่ไม่จำ)
- **หน้าโชว์ตัวละคร** (version 5): https://claude.ai/artifact/PNawa631NQkzXEZbZAbFRh (publish จาก scratchpad/sky-pirates-cast.html)
  - สร้างใหม่ด้วย `node scripts/build-showcase.mjs <out.html> index` (ประมาณ 5.7 MB)
- **วิธี publish ทับลิงก์เดิม:** ต้องใส่ `url` ของลิงก์เดิมเสมอ (หลัง compact ถ้าไม่ใส่จะได้ลิงก์ใหม่)
- **หน้า prompt วาดภาพ (เก่า):** https://claude.ai/artifact/MhaaL8qZeM38uGnb3wBw2z ไม่ได้ใช้แล้ว

## รอเจ้านาย
1. **ลองเล่น Chapter 1** แล้วบอกความเห็น เรื่องความยาก ความยาวด่าน 2-3 และบทเรื่อง
   - ด่าน 2 มีโจร 276 ตัว และด่าน 3 มี 355 ตัว (ด่าน 1 มี 128) ถ้ารู้สึกยาวไปให้ตัดเวฟได้
2. **วาดภาพใน Codex ด้วย prompt หัวข้อ 11-14 ใน `docs/art/CHARACTER_BRIEF.md`**
   - 11 ป้อม: เสร็จแล้ว
   - 12 แผนที่ด่าน 2 และ 3: เสร็จแล้ว
   - 13 แผนที่เลือกด่าน (แนบ `art/maps/chapter1-sketch.png`)
   - 14 ภาพครึ่งตัว Talon (proud, cry, happy ตาม `sheets.json`)
3. **ชื่อด่าน 1** เปลี่ยนเป็น "The First Raid" แล้ว ถ้าไม่ชอบบอกได้
4. **อารมณ์ภาพครึ่งตัว Mochi**: ใช้ชื่อ proud (ยิ้มอ้าปาก), cry (ขมวดคิ้ว), happy (หลับตายิ้ม) ตามบท แต่ brief เดิมเขียนว่า happy/determined/sleepy ถ้าอยากให้ตรง brief ให้เปลี่ยนชื่อใน `story.ts` + `sheets.json`

## 🧪 ทดลองให้ Gemini วาดภาพอัตโนมัติ (เจ้านายเลือกลองก่อน 24 ต.ค.)
- **ที่มา:** เจ้านายกังวลว่าเกม TD ต้องวาดตัวละคร/แผนที่ใหม่ไปเรื่อย ๆ จึงอยากให้ Claude สั่ง Gemini วาดแล้วรับภาพกลับมาเอง
  - ถ้า Gemini ใช้ไม่ได้หรือแพงไป ทางสำรองที่เสนอไว้คือ **TD แบบสุ่ม (roguelite)**
    - ใช้ตัวละครเดิม + ถนนสุ่มบนเกาะเปล่า + ศัตรูตัวแปรจากตัวเดิม
    - วาดเพิ่มครั้งเดียวประมาณ 10 ภาพ
  - หรือกลับไปแนวเกมยิงเอาตัวรอดแบบเกมแรก
- **เจ้านายต้องทำเอง**
  1. สร้าง API key ที่ aistudio.google.com (ใช้บนเบราว์เซอร์ ไม่ต้องติดตั้งอะไร)
     - account บริษัทอาจถูกแอดมินปิดไว้ ถ้าใช้ไม่ได้ใช้ Gmail ส่วนตัวแทน
  2. เปิด billing (การสร้างภาพไม่มี free tier) แล้วตั้ง budget alert
  3. ใส่ key เป็น secret ชื่อ `GEMINI_API_KEY` ใน environment settings แล้วเปิด session ใหม่
- **ราคา** (หน้าราคา Google ต.ค. 2026): `gemini-nano-banana-2.1` ภาพ 2K ภาพละ $0.0504 (ประมาณ 1.7 บาท), 1K $0.0336
  - ตัวเดิม `gemini-2.5-flash-image` ปิดไปแล้ว 2 ต.ค. 2026
- **สคริปต์พร้อมแล้ว แต่ยังไม่เคยเรียกจริง:** `npm run art:gemini -- <out.png> --prompt <ไฟล์หรือข้อความ> --ref <ภาพอ้างอิง> ... [--aspect 16:9] [--size 2K] [--count n]`
  - ใช้ endpoint `v1beta/interactions` ตาม docs ปัจจุบัน ถ้าได้ 404 จะลอง `generateContent` แทน
  - `--list` แสดงโมเดลภาพที่ key ใช้ได้
  - ทุกครั้งที่เรียกจะบันทึกลง `art/gemini-log.jsonl` พร้อมราคา และไม่ยอมให้ยอดของเดือนนั้นเกิน `GEMINI_BUDGET_USD` (ค่าเริ่มต้น $9)
- **เครดิตฟรี:** ถ้าเป็น Google AI Pro ส่วนตัวจะได้ Google Cloud credit เดือนละ $10 (ประมาณ 200 ภาพ 2K)
  - เปิดใช้ที่ developers.google.com/program/my-benefits แล้วผูกกับ billing account
  - ถ้าเป็น Gemini ของ Workspace บริษัท ยังไม่ชัดว่าได้สิทธิ์นี้ไหม
- **ขั้นแรกใน session ใหม่**
  1. `npm run art:gemini -- --list` เช็กว่า key ใช้ได้
  2. ลองวาดภาพครึ่งตัว Talon (prompt หัวข้อ 14) โดยแนบ `art/incoming/talon/talon_rigpose.webp` และ `talon_poses.webp`
  3. ให้เจ้านายเทียบสไตล์กับงาน Codex
  4. ถ้าผ่าน ไล่ทำป้อม (หัวข้อ 11), แผนที่ (12, 13)
     - prompt ใน brief เขียนแบบคุยทีละภาพ ต้องแยกเป็นภาพต่อภาพก่อนส่ง
  - ใส่พื้นหลังสีบานเย็นตามกติกาเดิม เครื่องตัดภาพลบให้เอง

## 🌙 แผนงานยาวข้ามคืน (23-24 ต.ค.): เสร็จครบ
- [x] A1-A4 prompt ภาพ: หัวข้อ 11-14 ใน `docs/art/CHARACTER_BRIEF.md` และภาพร่างแผนที่เลือกด่าน (`npm run map:chapter`)
- [x] B1 ด่าน 2-3 + ภาพร่าง + bot (`npx tsx scripts/tools/balance_bot.mts all all`)
- [x] B2 หน้าเลือกด่าน, B3 บันทึกความคืบหน้า, B4 ความยาก 3 ระดับ, B5 ฉากเล่าเรื่อง + บทร่าง, B6 การ์ดจบด่าน
- [x] C1 ไอคอนสกิลถ่ายจาก puppet (`src/play/snapshot.ts`)
- [x] C2 ข้อต่อฮีโร่ (`erase` + `heal` ใน `sheets.json`, draw order แขนไกล)
- [x] C3 รวมชิ้นส่วนเป็น draw call เดียวต่อตัว (`src/puppet/atlas.ts` + batched mode ใน `puppet.ts`) และจำกัดความละเอียดไว้ 2 เท่า
  - วัดผล: โจร 60 ตัว ลดจากประมาณ 1,230 เหลือประมาณ 150 draw call
  - ยังไม่ได้วัดบน iPhone จริง ให้เจ้านายเปิด `/play.html?debug` ดู
- [x] C4 ภาพครึ่งตัว Deckhand/Mochi
- [x] e2e + test ครบ, artifact ทั้งสอง, deploy

## งานถัดไปของ Claude
- **พอได้ภาพจาก Codex**
  - ป้อม: ตัดแล้วแทน `paintTower`
  - แผนที่ด่าน 2-3: ใส่ `map.art` แล้วซ้อนกับภาพร่างเพื่อจูนจุด
  - แผนที่เลือกด่าน: ใส่ `CHAPTER1_MAP.art`
  - Talon portraits: `npm run art -- talon` แล้ว publish (ชื่อ proud/cry/happy ตรงกับ `story.ts` แล้ว)
- **ไอเดียที่ยังไม่ได้ทำ (รอเจ้านายเลือก)**
  - เพลงประกอบ (มีไฟล์เพลงเดิมใน `public/audio/music_*.mp3` แต่ยังไม่ได้ใช้) + ปุ่มปิดเสียง
  - ฉาก Stormbeard ตัวจริง (ต้องวาดตัวละครใหม่)
  - เฟสถัดไปตามแผนเดิม: เกาะ Sky Haven (Idle) + Hunt
- **Deploy ครั้งถัดไป:** Vercel MCP `create_deployment`
  - `project`: `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`
  - slug: `cat-team5`
  - `target`: `production`
  - `gitSource`: `{type:'github', org:'RiccoKenko', repo:'game101', ref:'claude/compassionate-dirac-2wzrb3', sha:<HEAD>}`

### ขั้นตอนทำตัวละครใหม่ (ใช้กับ 7 ตัวแล้ว)
1. **รับภาพ**
   - ภาพที่เจ้านายแปะในแชต**ตอน Claude ตอบจบแล้ว**จะอยู่ที่ `/tmp/claude-0/<project>/<session>/images/N.webp`
   - ภาพที่แปะระหว่างที่ Claude กำลังทำงาน**ไม่ถูกบันทึกเป็นไฟล์** ต้องขอให้ส่งใหม่
   - ขอให้ส่งทีละตัวละคร ตัวละ 1 ข้อความ ตอบรับสั้น ๆ ทันทีเพื่อให้เจ้านายส่งตัวถัดไปได้
   - **เช็กว่าได้ rig pose** (ภาพยืนตรง/กางปีก ไม่ถือของ): รอบนี้ 2 ตัวส่ง master มาแทน ต้องขอเพิ่ม
2. **คัดลอกเข้า repo** ที่ `art/incoming/<id>/<id>_<sheet>.webp` แล้ว commit
3. **ตัดภาพ:** `npm run art -- <id>` แล้วดู `art/sliced/<id>/<sheet>.check.png`
   - ภาพจาก Codex บางชุดมีพื้นหลังโปร่งใสจริง เครื่องตัดรองรับแล้ว
   - แผ่นหน้ามักจัดกลุ่มผิด แก้ด้วย `boxes`; ปลายตัดที่ข้อต่อแก้ด้วย `erase` (วงรี `[cx, cy, rx, ry, องศา]`)
4. **Rig + ท่าทาง:** ดูตัวอย่าง `scripts/tools/<id>_rig.py` ของตัวที่ใกล้เคียง (คน: deckhand/ironclad/first_mate, สัตว์สี่ขา: powder_monkey, นก: parrot_raider/talon, ปลา: mochi)
   - ภาพโปร่งใสใช้ `parrot_raider_fit.py` / `talon_fit.py` (อ่าน alpha) แทน `fit.py`
   - ตัวที่ไม่มีภาพคริสตัล ให้ยืมของ Deckhand: `"borrow": {"crystal": "deckhand/crystal"}` ใน rig
   - ใส่ `points: {"head.top": ...}` เสมอ เกมใช้วัดความสูงเพื่อคำนวณขนาด
   - ถ้าแบ่ง subagent ทำพร้อมกัน: ให้แต่ละตัวแก้เฉพาะไฟล์ของตัวเอง และแก้ `sheets.json` เฉพาะ entry ของตัวเอง (brief เต็มอยู่ในประวัติ session นี้; ใช้เวลาตัวละ 20-45 นาที)
5. **Publish:** `npm run art:publish -- <id>` จะคัดลอกไปที่ `public/sprites/<id>/`
6. **ท่าทาง:** `src/puppet/clips/<id>.ts` แล้วเพิ่มใน `src/puppet/clips/index.ts` (`CLIPS`)
   - ศัตรูต้องมีท่า: `idle`, `walk` (ท่าเคลื่อนที่หลัก, ตัวบินก็ใช้ชื่อนี้), `carry`, `hit`, `ko`, `taunt`, `cheer` (บอสมี `shout` เพิ่ม)
   - Talon: `fly`, `dive`, `strike`, `carry`, `glide`, `idle`; Mochi: `idle`, `swim`, `sweep`, `cheer`
   - `tests/unit/anim.test.ts` ตรวจทุกตัวใน `CLIPS` อัตโนมัติว่าท่าใช้แต่กระดูก/ชิ้นที่ rig มีจริง
7. **ใส่เกม:** ศัตรูชนิดใหม่เพิ่มบรรทัดใน `PIRATE_PUPPETS` (`src/play/main.ts`) บอก id และความสูงบนแผนที่ (px) เกมคำนวณ `size` เองจาก `head.top`
   - หน้าโชว์: เพิ่มใน `CREW` (`src/showcase/main.ts`)

## ข้อเท็จจริงสำคัญ
- **พิกัด:** พิกเซลบนภาพแผนที่ 1536×1024 แกน y ชี้ลง
  - ใน Three.js คือ `(x, -y)`
  - `sortOrder = 1000 + y*100` ทำให้ตัวที่อยู่ต่ำบนจอวาดทับ
  - ชิ้นส่วน puppet บวก z ได้ถึงประมาณ 60 คริสตัลกับหลอดเลือดจึงใช้ +70/+80
- **แยกกติกากับการวาด**
  - `src/td/battle.ts` เป็นกติกาล้วน
  - `src/play/main.ts` อ่าน state แล้ววาด และแปลงเหตุการณ์จาก `drain()` เป็นเอฟเฟกต์และเสียง
  - ล็อกการสุ่มด้วย `?seed=`; การ์ดใช้ rng แยก
- **ตัวละครในเกม**
  - `PIRATE_PUPPETS`: ความสูงบนแผนที่ deckhand 90, powderMonkey 65, ironclad 105, parrot 78, firstMate 150 px
  - ตัวที่ยังไม่มี rig/ท่า จะใช้ภาพวาดด้วยโค้ดแทนโดยอัตโนมัติ
  - `Companion` (Talon/Mochi): แขวน puppet ที่จุดกลางตัว (Talon) หรือจุด `nose` (Mochi) แล้วเอียงตามทางบิน
    - Talon กว้าง 125 px เริ่มดิ่งจาก (เป้า − 380 ทางฝั่งฮีโร่, เป้า − 640 ขึ้นฟ้า)
    - Mochi ยาว 480 px จมูกตามเส้นกวาด
  - ข้อควรรู้: puppet ใหม่จะโชว์ชิ้นแรกของทุก slot จนกว่าท่าแรกจะกำหนด (เช่นคริสตัล) เกมเริ่มที่ `walk` เสมอจึงไม่เห็น แต่ `dev/rig.html` เห็น
- **ตัวเลขทั้งหมด**
  - ศัตรู/ป้อม/ฮีโร่/สกิล อยู่ใน `src/td/units.ts`; ด่านใน `src/td/levels.ts`; การ์ดใน `src/td/cards.ts`
  - ศัตรู: deckhand hp 65, powderMonkey 35, ironclad 140 (เกราะ 50%), parrot 42 (บิน), firstMate 1000 (เกราะ 30%)
  - Talon คูลดาวน์ 20 วินาที; Mochi รอครั้งแรก 25 วินาที คูลดาวน์ 60 วินาที ดาเมจ 50
  - ด่าน 1: เงิน 220, 8 เวฟ; ด่าน 2: เงิน 260, 8 เวฟ; ด่าน 3: เงิน 340, 10 เวฟ (คริสตัล 20 ทุกด่าน)
- **ผล bot** (6 seed, bot ไม่ขยับฮีโร่และไม่ใช้สกิล)
  - Normal: ป้อมผสม + อัปเกรด ได้ 3 ดาวทุกด่าน; ป้อมชนิดเดียวลำบากตั้งแต่ด่าน 2; ฮีโร่คนเดียวแพ้
  - Hard: ป้อมผสมชนะทุกด่าน ส่วนใหญ่ 2 ดาว
  - Easy: สร้างครึ่งเดียวอัปเกรดครั้งเดียวก็ชนะ
- **build ไฟล์เดียว:** `scripts/build-showcase.mjs <out> [index|play]`
  - แปลงภาพเป็น WebP; หน้า play ย่อภาพลงครึ่งหนึ่ง (เกมวาดตัวละครเล็ก) จากเดิม 9.7 MB เหลือ 3.9 MB ทั้งที่มีตัวละครครบ
  - ไฟล์ PNG ใน `public/sprites/` (ที่ Vercel ใช้) ไม่ถูกแตะ
- **การทดสอบ**
  - คำสั่ง: `npm run typecheck`, `npx vitest run`, `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`, `npm run build`
  - หน้า play เปิดที่แผนที่เลือกด่าน; test/ภาพหน้าจอที่อยากเข้าด่านตรง ๆ ใช้ `?level=level1` (`&story=1`, `&difficulty=hard`)
  - `__play` มี `startLevel(id)`, `showChapter()`, `progress`, `perf`, `level`, `difficulty`
  - ชนะทันทีเพื่อทดสอบ: `b.callWave(); b.waves.wave = b.waves.waves.length-1; b.waves.queue=[]; b.enemies=[]`
  - ปุ่ม `#call` เต้นอยู่ ใน Playwright ต้องใช้ `click({force:true})`
  - ภาพหน้าจอด่านทดลอง: `node scripts/tools/playshot.mjs <prefix> "<query>" "<js>" <ms,...>`
    - ใน js ใช้ `__play.battle` ได้ เช่น `callWave()`, `spawn('ironclad')` (private ใน TS แต่เรียกได้), `useTalon()`
    - `__play.companions` ดู Talon/Mochi บนจอ
  - เครื่องมือถ่ายภาพปิด live reload แล้ว (เดิมหน้าเว็บรีโหลดกลางคันเวลามีคนแก้ไฟล์)
- **ข้อจำกัดที่รู้แล้ว**
  - ฮีโร่: ต้นขากว้างกว่าเข่านิดหน่อย มีรอยหยักเล็ก ๆ ตรงเข่า
  - แต่ละตัวมีข้อบกพร่องเล็กน้อยตามรายงานของ subagent (เช่น รอยต่อหางวาฬตอนสะบัดแรง, ขาบอสเหยียดตรงชั่วครู่ตอนล้ม) มองแทบไม่เห็นที่ขนาดในเกม
  - มีไฟล์ `/ov_far.png` ที่ subagent เผลอสร้างไว้ที่ root ของเครื่องชั่วคราว ระบบไม่ให้ลบเอง ไม่มีผลกับโปรเจกต์

## วิธีทำงานกับเจ้านาย
- **การสื่อสาร**
  - เรียก "เจ้านาย"
  - ภาษาไทยปนศัพท์เทคนิค
  - ส่งงานก่อนแล้วค่อยอธิบาย
  - อธิบายแบบคนที่ไม่ใช่สาย dev
  - มี "📚 บทเรียนที่ N" ซึ่งถึง **36** แล้ว (ข้อต่อไปคือ 37)
- **checkpoint:** เมื่อถึงจุดที่หยุดได้ให้บอกก่อน เพราะเจ้านายจะสั่ง handoff แล้ว compact
- **งานภาพ:** Codex เป็น account กลางที่**ไม่ได้เชื่อม GitHub** ใช้เป็นแชตธรรมดา
  - เจ้านายใช้แอป Gemini (account บริษัท) แทนได้ด้วย prompt เดิม ผลออกมาดี: ป้อมและแผนที่ด่าน 2-3 วาดด้วย Gemini
    - Gemini ชอบหยิบของจากภาพก่อนหน้าในแชตมาใส่ ต้องตรวจทุกครั้ง
  - Gemini API อัตโนมัติยังไม่ได้ทำ เพราะ account บริษัทไม่มีเครดิต AI Pro ถ้าจะทำต้องใช้ Gmail ส่วนตัวผูกบัตร
    - สคริปต์ `art:gemini` พร้อมแล้ว
    - ทางเลือกอื่นที่หาไว้: OpenAI gpt-image-2 (ราคาคิดตาม token) และ Cloudflare FLUX (ฟรี แต่แนบภาพอ้างอิงไม่ได้)
  - ส่ง prompt เป็นกล่องข้อความในแชตให้ก๊อปวาง (ไม่ต้องใช้ Artifact)
  - ห้ามมีขั้นตอน branch/commit/PR ใน prompt
  - เตือนเจ้านายเสมอว่าให้แปะภาพหลัง Claude ตอบจบ
- **ความยาว:** ถ้าจะส่ง prompt หลายตัวในข้อความเดียว ให้ส่งก่อนแล้วค่อยทำงานต่อ เพื่อให้เจ้านายเริ่มวาดได้เลย
- **subagent:** เจ้านายชอบให้แบ่งงานทำพร้อมกันเมื่อได้ (รอบนี้ 6 ตัวพร้อมกัน)
  - stop hook บังคับ commit ทุกครั้งที่จบ turn: ระหว่างที่ subagent ยังทำอยู่ ให้ commit เป็น snapshot "Work in progress"
- **git:** ไม่เปิด PR ถ้าไม่ได้สั่ง, ใส่ trailer ใน commit, ไม่ใส่ชื่อ model
- **เครดิต cloud:** เจ้านายเลือกทำงานใน cloud ต่อ (เครดิตฟรีหมดอายุ 5 พ.ย. หลังจากนั้นใช้โควตาแพ็กเกจปกติ ย้ายไป local ได้ด้วย `claude --teleport`)
