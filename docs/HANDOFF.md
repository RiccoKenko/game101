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
  - **`/play.html` ยังไม่ deploy** และหน้าโชว์บนเว็บยังเป็นเวอร์ชันเก่า (มีแค่ฮีโร่กับเป้าซ้อม)
- **เฟส 2D-3 (First Battle): กติกาเสร็จ และตัวละครทุกตัวเป็นภาพจริงที่ขยับได้แล้ว**
  - **แผนที่:** ภาพวาดจริงจาก Codex
  - **ตัวละคร 8 ตัวเป็น puppet ทั้งหมด:** Little Archer, Deckhand, Powder Monkey, Ironclad, Parrot Raider, First Mate (บอส), Talon, Mochi
  - **ป้อม 4 แบบ + สายระดับ 4:** ยังเป็นภาพวาดด้วยโค้ดชั่วคราว (`paintTower` ใน `src/play/art.ts`)
  - **สกิลคู่หู:** Talon ดิ่งลงจากฟ้าเหนือโจรแล้วแย่งคริสตัลคืน, Mochi ว่ายกวาดทั้งเกาะ
  - **คำสั่งกัปตัน:** หลังเวฟ 2, 4, 6 ให้เลือกการ์ด 1 ใบจาก 3 ใบ (มี 13 ใบ)
  - **หน้าโชว์มีแท็บ Crew:** เลือกตัวละครทีละตัวแล้วเล่นได้ทุกท่า (`?crew=<id>` เปิดตรงไปที่ตัวนั้น)
- **Test:** unit 132 ข้อ และ e2e 4 ข้อ ผ่านทั้งหมด
  - e2e ของ play: สร้างป้อม, เรียกเวฟ, กด Talon, เลือกการ์ด
  - e2e ของ Crew: กดทุกตัว ทุกท่า ต้องไม่มี error

## Artifacts (ลิงก์คงที่)
- **ด่านทดลอง** (version 11): https://claude.ai/artifact/MXkN26QoVLgRMQsmvjhD98
  - สร้างใหม่ด้วย `node scripts/build-showcase.mjs <out.html> play` (ประมาณ 3.9 MB)
- **หน้าโชว์ตัวละคร** (version 4, มีแท็บ Crew): https://claude.ai/artifact/PNawa631NQkzXEZbZAbFRh
  - สร้างใหม่ด้วย `node scripts/build-showcase.mjs <out.html> index` (ประมาณ 5.7 MB)
- **วิธี publish ทับลิงก์เดิม:** ต้องใส่ `url` ของลิงก์เดิมเสมอ
  - หลัง compact เครื่องมือจำไม่ได้ว่าไฟล์ไหนเคย publish ไปที่ลิงก์ไหน
  - ถ้าไม่ใส่ `url` จะได้ลิงก์ใหม่ (รอบนี้เผลอได้ลิงก์ซ้ำ 2 อัน ดูหัวข้อ "รอเจ้านาย")
- **หน้า prompt วาดภาพ (เก่า):** https://claude.ai/artifact/MhaaL8qZeM38uGnb3wBw2z ไม่ได้ใช้แล้ว (prompt อยู่ใน `docs/art/CHARACTER_BRIEF.md`)

## รอเจ้านาย
1. **ลองเล่นด่านทดลองและดูแท็บ Crew แล้วให้ความเห็น** เรื่องความยาก ขนาดตัว ท่าทาง ก่อน deploy
2. **ลิงก์ซ้ำ 2 อันที่ publish เกินมา** ถามแล้วว่าจะให้ลบไหม (ลบได้เมื่อเจ้านายยืนยันเท่านั้น):
   - https://claude.ai/artifact/HACzWs5gqTmXxfHzfAvEKT (ด่านทดลอง)
   - https://claude.ai/artifact/CANfdB33Ln7xsWiCHWqDMZ (หน้าโชว์)
3. **ไม่บังคับ:** ภาพครึ่งตัวของ Talon ยังไม่ได้ส่งมา ส่วนของ Mochi ตัดออกมาเป็นภาพเดียว (ภาพติดกัน) ยังไม่ต้องใช้จนกว่าจะทำฉากเล่าเรื่อง

## งานถัดไปของ Claude
- **A. Deploy `/play.html` เมื่อเจ้านายโอเค** (ใช้ Vercel MCP `create_deployment`)
  - `project`: `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`
  - teamId/slug: `cat-team5`
  - `target`: `production`
  - `gitSource`: `{type:'github', org:'RiccoKenko', repo:'game101', ref:'claude/compassionate-dirac-2wzrb3', sha:<HEAD>}`
  - รอ READY แล้วเปิด `little-archer.vercel.app/play.html` และหน้าแรกเพื่อยืนยัน
- **B. ตัวเลือกที่เสนอเจ้านายไว้ (ยังไม่ได้สั่ง)**
  - Prompt ภาพป้อม 4 แบบพร้อมสายระดับ 4 (ส่งเป็นกล่องข้อความในแชตให้ก๊อปไป Codex)
  - เฟส 2: Chapter 1
    - ฉากเล่าเรื่อง, แผนที่เลือกด่าน, ด่าน 2-3, ความยาก 3 ระดับ
    - ต้องทำภาพร่างแผนที่ด่าน 2-3 ด้วย `npm run map:sketch` แล้วให้ Codex วาด
  - ไอคอนปุ่มสกิล Talon/Mochi ยังเป็นภาพวาดด้วยโค้ด เปลี่ยนเป็นภาพจริงได้

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
  - ด่าน 1: เงิน 220, คริสตัล 20, 8 เวฟ, `ordersAfter: [2, 4, 6]`
- **ความยาก** (`scripts/tools/balance_bot.mts` 6 seed): 8 ป้อมได้ 3 ดาวเกือบทุกรอบ, 4 ป้อม 1-3 ดาว, ปืนใหญ่ล้วน 1 ดาว, ฮีโร่คนเดียวแพ้
- **build ไฟล์เดียว:** `scripts/build-showcase.mjs <out> [index|play]`
  - แปลงภาพเป็น WebP; หน้า play ย่อภาพลงครึ่งหนึ่ง (เกมวาดตัวละครเล็ก) จากเดิม 9.7 MB เหลือ 3.9 MB ทั้งที่มีตัวละครครบ
  - ไฟล์ PNG ใน `public/sprites/` (ที่ Vercel ใช้) ไม่ถูกแตะ
- **การทดสอบ**
  - คำสั่ง: `npm run typecheck`, `npx vitest run`, `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`, `npm run build`
  - ปุ่ม `#call` เต้นอยู่ ใน Playwright ต้องใช้ `click({force:true})`
  - ภาพหน้าจอด่านทดลอง: `node scripts/tools/playshot.mjs <prefix> "<query>" "<js>" <ms,...>`
    - ใน js ใช้ `__play.battle` ได้ เช่น `callWave()`, `spawn('ironclad')` (private ใน TS แต่เรียกได้), `useTalon()`
    - `__play.companions` ดู Talon/Mochi บนจอ
  - เครื่องมือถ่ายภาพปิด live reload แล้ว (เดิมหน้าเว็บรีโหลดกลางคันเวลามีคนแก้ไฟล์)
- **ข้อจำกัดที่รู้แล้ว**
  - ลูกบอลข้อต่อของฮีโร่ที่ศอกและเข่ายังเห็นนิดหน่อย
  - แต่ละตัวมีข้อบกพร่องเล็กน้อยตามรายงานของ subagent (เช่น รอยต่อหางวาฬตอนสะบัดแรง, ขาบอสเหยียดตรงชั่วครู่ตอนล้ม) มองแทบไม่เห็นที่ขนาดในเกม
  - มีไฟล์ `/ov_far.png` ที่ subagent เผลอสร้างไว้ที่ root ของเครื่องชั่วคราว ระบบไม่ให้ลบเอง ไม่มีผลกับโปรเจกต์

## วิธีทำงานกับเจ้านาย
- **การสื่อสาร**
  - เรียก "เจ้านาย"
  - ภาษาไทยปนศัพท์เทคนิค
  - ส่งงานก่อนแล้วค่อยอธิบาย
  - อธิบายแบบคนที่ไม่ใช่สาย dev
  - มี "📚 บทเรียนที่ N" ซึ่งถึง **34** แล้ว
- **checkpoint:** เมื่อถึงจุดที่หยุดได้ให้บอกก่อน เพราะเจ้านายจะสั่ง handoff แล้ว compact
- **งานภาพ:** Codex เป็น account กลางที่**ไม่ได้เชื่อม GitHub** ใช้เป็นแชตธรรมดา
  - ส่ง prompt เป็นกล่องข้อความในแชตให้ก๊อปวาง (ไม่ต้องใช้ Artifact)
  - ห้ามมีขั้นตอน branch/commit/PR ใน prompt
  - เตือนเจ้านายเสมอว่าให้แปะภาพหลัง Claude ตอบจบ
- **ความยาว:** ถ้าจะส่ง prompt หลายตัวในข้อความเดียว ให้ส่งก่อนแล้วค่อยทำงานต่อ เพื่อให้เจ้านายเริ่มวาดได้เลย
- **subagent:** เจ้านายชอบให้แบ่งงานทำพร้อมกันเมื่อได้ (รอบนี้ 6 ตัวพร้อมกัน)
  - stop hook บังคับ commit ทุกครั้งที่จบ turn: ระหว่างที่ subagent ยังทำอยู่ ให้ commit เป็น snapshot "Work in progress"
- **git:** ไม่เปิด PR ถ้าไม่ได้สั่ง, ใส่ trailer ใน commit, ไม่ใส่ชื่อ model
- **เครดิต cloud:** เจ้านายเลือกทำงานใน cloud ต่อ (เครดิตฟรีหมดอายุ 5 พ.ย. หลังจากนั้นใช้โควตาแพ็กเกจปกติ ย้ายไป local ได้ด้วย `claude --teleport`)
