# Handoff: Little Archer: Sky Pirates

> สรุปสำหรับเริ่มงานต่อในแชตหรือ session ใหม่: สถานะล่าสุด, ลิงก์, งานที่รอ, และสิ่งที่ต้องรู้ก่อนลงมือ

## สถานะ (23 ต.ค. 2026)
- **โปรเจกต์:** Little Archer: Sky Pirates
  - เกม TD แบบ 2.5D สไตล์ Kingdom Rush บนมือถือแนวนอน ภาพ 2D แนวอนิเมะ
  - เจ้านายวาดภาพด้วย Codex แล้ว Claude ตัดชิ้น ใส่กระดูก ทำท่า และใส่เกม
  - เทคโนโลยี: Three.js กล้อง orthographic, TypeScript, Vite
- **Repo:** `riccokenko/game101` branch `claude/compassionate-dirac-2wzrb3` (branch นี้ใช้ deploy ด้วย)
- **ลิงก์จริง:** little-archer.vercel.app
  - ยังเป็นหน้าโชว์ 2D จาก commit 78a23e3 (`dpl_51k13bQFB8tERqLttXwhxpXQoWrA`)
  - **`/play.html` ยังไม่ deploy** และหน้าโชว์บนเว็บยังเป็นเวอร์ชันที่มีเป้าซ้อม
- **เฟส 2D-3 (First Battle): กติกาเสร็จครบแล้ว** เล่นได้ใน `/play.html` (ด่าน 1, 8 เวฟ)
  - **แผนที่:** ภาพวาดจริงจาก Codex
  - **ฮีโร่ Little Archer:** แตะพื้นให้เดิน ยืนนิ่งแล้วยิงเอง
  - **ป้อม 4 แบบ:**
    - Archer, Cannon (ระเบิด ยิงตัวบินไม่ได้), Storm Crystal (เวท ทะลุเกราะ), Frost Cloud (ทำให้ช้า)
    - อัปเกรดระดับ 1-3 แล้วเลือกสายที่ระดับ 4 ป้อมละ 2 สาย และมีปุ่ม Target เลือกเป้า
  - **ศัตรู:**
    - Deckhand (**ภาพจริงจาก Codex**)
    - Powder Monkey, Ironclad (เกราะ), Parrot Raider (บิน) และบอส First Mate (แบก 3 ก้อน, ตะโกนเร่งลูกน้อง, ทนน้ำแข็ง)
  - **สกิลคู่หู:** Talon (แย่งคริสตัลคืน) และ Mochi (วาฬกวาดทั้งเกาะ ทำให้มึน)
  - **คำสั่งกัปตัน:** หลังเวฟ 2, 4, 6 ให้เลือกการ์ด 1 ใบจาก 3 ใบ (มี 13 ใบ)
- **ภาพที่ยังเป็นตัววาดด้วยโค้ดชั่วคราว:** ป้อมทุกแบบ, Powder Monkey, Ironclad, Parrot, First Mate, นก Talon, วาฬ Mochi
- **Test:** unit 76 ข้อ (6 ไฟล์) และ e2e 3 ข้อ ผ่านทั้งหมด
  - e2e ของ play ทดสอบ: สร้างป้อม, เรียกเวฟ, กด Talon, เลือกการ์ด

## Artifacts (ลิงก์คงที่)
- **ด่านทดลอง** (version 10): https://claude.ai/artifact/MXkN26QoVLgRMQsmvjhD98
  - สร้างใหม่ด้วย `node scripts/build-showcase.mjs <out.html> play` แล้ว publish ทับลิงก์เดิม
  - ไฟล์ใหญ่ราว 9.7 MB จากภาพ Deckhand (จำกัด 16 MB)
- **หน้าโชว์ตัวละคร** (version 3, มี Deckhand ในแท็บ Battle): https://claude.ai/artifact/PNawa631NQkzXEZbZAbFRh
  - สร้างใหม่ด้วย `node scripts/build-showcase.mjs <out.html> index`
- **หน้า prompt วาดภาพ (เก่า):** https://claude.ai/artifact/MhaaL8qZeM38uGnb3wBw2z
  - **ไม่ได้ใช้แล้ว** เจ้านายเลือกให้ส่ง prompt เป็นกล่องข้อความในแชตแทน
  - prompt ล่าสุดทั้งหมดอยู่ใน `docs/art/CHARACTER_BRIEF.md`

## รอเจ้านาย
1. **ให้ Codex วาดตัวละครที่เหลือ 6 ตัว** (ส่ง prompt ให้แล้ว และอยู่ใน `docs/art/CHARACTER_BRIEF.md` หัวข้อ 10)
   - ตัวละคร: Powder Monkey, Ironclad, Parrot Raider, First Mate, Talon, Mochi
   - ตัวละ 6-7 ภาพ: master → rig pose → หน้า/สีหน้า → ชิ้นส่วนตัว → มือ/อุปกรณ์ → ท่าทาง (→ ภาพครึ่งตัวสำหรับ First Mate กับ Talon)
   - **Mochi ไม่มีแผ่นมือ/อุปกรณ์** ภาพที่ 3 คือแผ่นหน้า (ตา/ปาก) ภาพที่ 5 คือท่าทาง และภาพที่ 6 คือภาพครึ่งตัว
   - เจ้านายจะแปะภาพกลับมาในแชต
2. **ลองเล่นด่านทดลองแล้วให้ความเห็น** เรื่องความยาก ขนาดตัว ราคา ก่อน deploy

## งานถัดไปของ Claude
- **A. พอได้ภาพตัวละครใหม่:** ทำตามขั้นตอน "ทำตัวละครใหม่" ด้านล่าง
- **B. Deploy `/play.html` เมื่อเจ้านายโอเค** (ใช้ Vercel MCP `create_deployment`)
  - `project`: `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`
  - teamId/slug: `cat-team5`
  - `target`: `production`
  - `gitSource`: `{type:'github', org:'RiccoKenko', repo:'game101', ref:'claude/compassionate-dirac-2wzrb3', sha:<HEAD>}`
  - รอ READY แล้วเปิด `little-archer.vercel.app/play.html` และหน้าแรกเพื่อยืนยัน
- **C. ตัวเลือกที่เสนอเจ้านายไว้ (ยังไม่ได้สั่ง)**
  - Prompt ภาพป้อม 4 แบบพร้อมสายระดับ 4
  - เฟส 2: Chapter 1
    - ฉากเล่าเรื่อง, แผนที่เลือกด่าน, ด่าน 2-3, ความยาก 3 ระดับ
    - ต้องทำภาพร่างแผนที่ด่าน 2-3 ด้วย `npm run map:sketch` แล้วให้ Codex วาด

### ขั้นตอนทำตัวละครใหม่ (ใช้กับ Deckhand มาแล้ว)
1. **รับภาพ**
   - ภาพที่เจ้านายแปะในแชต**ตอน Claude ตอบจบแล้ว**จะอยู่ที่ `/tmp/claude-0/<project>/<session>/images/N.webp`
   - ภาพที่แปะระหว่างที่ Claude กำลังทำงาน**ไม่ถูกบันทึกเป็นไฟล์** ต้องขอให้ส่งใหม่
2. **คัดลอกเข้า repo** ที่ `art/incoming/<id>/<id>_<sheet>.webp`
   - ดูเนื้อหาภาพแล้วจับคู่ชื่อแผ่น: master, rigpose, head_faces, parts_body, hands_props, poses, portraits (concept ถ้ามี)
   - id ใช้ขีดล่าง: `powder_monkey`, `ironclad`, `parrot_raider`, `first_mate`, `talon`, `mochi`
3. **ตัดภาพ:** `npm run art -- <id>` แล้วดู `art/sliced/<id>/<sheet>.check.png`
   - ชื่อชิ้นของทุกตัวเตรียมไว้แล้วใน `scripts/art/sheets.json` ตามลำดับใน prompt
   - ถ้าจัดกลุ่มผิด (มักเป็นแผ่นหน้า) ให้ใส่ `boxes`
   - ถ้ามี "ปลายตัด" สีผิวที่ข้อต่อ ให้ใส่ `erase` (วงรี `[cx, cy, rx, ry, องศา]` เป็นพิกเซลบนแผ่น)
4. **ทำ rig** `art/rigs/<id>.json`
   - พิกัดเป็นพิกเซลของภาพ rig pose ที่ตัดขอบแล้ว (`art/sliced/<id>/rigpose.png` = ต้นฉบับลบด้วยตำแหน่ง trim − 8)
   - เครื่องมือใน `scripts/tools/` (ดู README ในโฟลเดอร์):
     - `grid.mjs`: กริดวัดจุด
     - `fit.py`: auto-fit ด้วยสี
     - `compose.py`: ซ้อนตรวจ
     - `deckhand_rig.py`: ตัวอย่างการสร้าง rig
   - มือและชิ้นที่สีเหมือนชิ้นข้าง ๆ ให้วางด้วยจุดที่วัดเอง เพราะ auto-fit จะไหลไปทับชิ้นข้าง ๆ
   - ตรวจด้วย `/dev/rig.html?c=<id>&overlay=0.45` และ `&frames=walk@0.2,...`
5. **Publish:** `npm run art:publish -- <id>` จะคัดลอกไปที่ `public/sprites/<id>/`
6. **ท่าทาง:** เขียน `src/puppet/clips/<id>.ts` ตามแบบ `deckhand.ts` แล้วลงทะเบียนใน `src/dev/rig.ts`
   - ใช้ภาพ poses เป็นแบบอ้างอิง
7. **ใส่เกม:** ใน `src/play/main.ts` ตอนนี้ `addPirate` ใช้ puppet เฉพาะ `e.kind === 'deckhand'`
   - ให้ทำเป็นตาราง kind → (assets, clips, size)
   - ชื่อท่าที่ `drivePuppet` เรียก: walk, carry, hit, ko, taunt, cheer
   - นกกับวาฬ: แทน `paintEagle`/`paintWhale` ใน `syncCompanions` ด้วย puppet

## ข้อเท็จจริงสำคัญ
- **พิกัด:** พิกเซลบนภาพแผนที่ 1536×1024 แกน y ชี้ลง
  - ใน Three.js คือ `(x, -y)`
  - `sortOrder = 1000 + y*100` ทำให้ตัวที่อยู่ต่ำบนจอวาดทับ
  - ชิ้นส่วน puppet บวก z ได้ถึงประมาณ 60 คริสตัลกับหลอดเลือดจึงใช้ +70/+80
- **แยกกติกากับการวาด**
  - `src/td/battle.ts` เป็นกติกาล้วน
  - `src/play/main.ts` อ่าน state แล้ววาด และแปลงเหตุการณ์จาก `drain()` เป็นเอฟเฟกต์และเสียง
  - ล็อกการสุ่มด้วย `?seed=`
  - การ์ดใช้ rng แยก จึงไม่ทำให้ผลการต่อสู้เปลี่ยน
- **ตัวเลขทั้งหมด**
  - ศัตรู/ป้อม/ฮีโร่/สกิล อยู่ใน `src/td/units.ts`
  - ด่าน อยู่ใน `src/td/levels.ts`
  - การ์ด อยู่ใน `src/td/cards.ts`
  - ค่าหลัก:
    - deckhand hp 65, powderMonkey 35, ironclad 140 (เกราะ 50%), parrot 42 (บิน), firstMate 1000 (เกราะ 30%)
    - ราคาป้อม 70-100 ต่อระดับ 1, สายระดับ 4 ราคา 220-270
    - Talon คูลดาวน์ 20 วินาที
    - Mochi รอครั้งแรก 25 วินาที แล้วคูลดาวน์ 60 วินาที, ดาเมจ 50 (ต่ำกว่าเลือด Deckhand โดยตั้งใจ)
    - ด่าน 1: เงิน 220, คริสตัล 20, 8 เวฟ, `ordersAfter: [2, 4, 6]`
- **ความยาก** (จาก `scripts/tools/balance_bot.mts` 6 seed)
  - 8 ป้อมได้ 3 ดาวเกือบทุกรอบเมื่อเลือกการ์ด
  - 4 ป้อมได้ 1-3 ดาว
  - ปืนใหญ่ล้วนได้ 1 ดาว เพราะนกบินผ่าน
  - ฮีโร่คนเดียวแพ้
- **กลไกที่ควรรู้**
  - โจรเดินต่อจนแบกเต็มมือ (`carries`) ก่อนหันกลับ
  - ถูกยิงตายทำคริสตัลหล่นแล้วลอยกลับคลัง
  - `stun` หยุดทุกตัว ส่วน `frozen` หยุดได้ทุกตัวยกเว้นบอส (`steady`)
- **Puppet**
  - Deckhand ขนาด 0.07 ในด่าน, 0.23 ในหน้าโชว์
  - ฮีโร่ขนาด 0.08 ในด่าน, 0.26 ในหน้าโชว์
  - `Puppet.tint()`/`opacity()`/`hitFlash()` ใช้กับเอฟเฟกต์น้ำแข็ง การหายไป และการโดนตี
- **build ไฟล์เดียว:** `scripts/build-showcase.mjs <out> [index|play]`
  - ใส่ sprites ทุกตัว (ยกเว้น `master.png`), แผนที่ (png/webp เฉพาะหน้า play) และเสียง
- **การทดสอบ**
  - คำสั่ง: `npm run typecheck`, `npx vitest run`, `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`, `npm run build`
  - ปุ่ม `#call` เต้นอยู่ ใน Playwright จึงต้องใช้ `click({force:true})`
  - helper `run()` ใน `tests/unit/td.test.ts` เลือกการ์ดใบแรกให้อัตโนมัติ
- **ข้อจำกัดที่รู้แล้ว**
  - ลูกบอลข้อต่อของฮีโร่ที่ศอกและเข่ายังเห็นนิดหน่อย
  - ปลายตัดที่ต้นขา Deckhand ยังเหลือเศษเล็กมาก (น้อยกว่า 1 px ในเกม)
  - แผ่น portraits ของ Deckhand ตัดได้ 2 จาก 3 ภาพ (ภาพติดกัน) ยังไม่ได้ใช้

## วิธีทำงานกับเจ้านาย
- **การสื่อสาร**
  - เรียก "เจ้านาย"
  - ภาษาไทยปนศัพท์เทคนิค
  - ส่งงานก่อนแล้วค่อยอธิบาย
  - อธิบายแบบคนที่ไม่ใช่สาย dev
  - มี "📚 บทเรียนที่ N" ซึ่งถึง **31** แล้ว
- **checkpoint:** เมื่อถึงจุดที่หยุดได้ให้บอกก่อน เพราะเจ้านายจะสั่ง handoff แล้ว compact
- **งานภาพ:** Codex เป็น account กลางที่**ไม่ได้เชื่อม GitHub** ใช้เป็นแชตธรรมดา
  - ส่ง prompt เป็นกล่องข้อความในแชตให้ก๊อปวาง (ไม่ต้องใช้ Artifact)
  - ห้ามมีขั้นตอน branch/commit/PR ใน prompt
  - เตือนเจ้านายเสมอว่าให้แปะภาพหลัง Claude ตอบจบ
- **ความยาว:** ถ้าจะส่ง prompt หลายตัวในข้อความเดียว ให้ส่งก่อนแล้วค่อยทำงานต่อ เพื่อให้เจ้านายเริ่มวาดได้เลย
- **git:** ไม่เปิด PR ถ้าไม่ได้สั่ง, ใส่ trailer ใน commit, ไม่ใส่ชื่อ model
- **เครดิต cloud:** เจ้านายเลือกทำงานใน cloud ต่อ (เครดิตฟรีหมดอายุ 5 พ.ย. หลังจากนั้นใช้โควตาแพ็กเกจปกติ ย้ายไป local ได้ด้วย `claude --teleport`)
