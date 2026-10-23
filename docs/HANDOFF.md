# Handoff: Little Archer: Sky Pirates

> สรุปสำหรับเริ่มงานต่อในแชตหรือ session ใหม่: สถานะล่าสุด, ลิงก์, งานที่รอ, และสิ่งที่ต้องรู้ก่อนลงมือ

## สถานะ (23 ต.ค. 2026)
- **โปรเจกต์:** Little Archer: Sky Pirates
  - เกม TD แบบ 2.5D สไตล์ Kingdom Rush บนมือถือแนวนอน ภาพ 2D แนวอนิเมะ
  - เจ้านายวาดใน ChatGPT แล้ว Claude นำมาตัดชิ้น ใส่กระดูก และทำท่า
  - เทคโนโลยี: Three.js ใช้กล้อง orthographic
- **Repo:** `riccokenko/game101` branch `claude/compassionate-dirac-2wzrb3` (branch นี้คือ branch ที่ deploy ด้วย)
- **ลิงก์จริง:** little-archer.vercel.app
  - ตอนนี้เป็นหน้าโชว์ 2D ที่ deploy จาก commit 78a23e3 (`dpl_51k13bQFB8tERqLttXwhxpXQoWrA`)
  - `/play.html` **ยังไม่ deploy**
- **เสร็จแล้ว**
  - ฮีโร่ 2D: 10 ท่า, 8 สีหน้า
  - หน้าโชว์ตัวละคร
  - ภาพร่างแผนที่ + prompt วาดแผนที่
  - แกนระบบ TD (`src/td/`)
  - ด่านทดลองที่เล่นได้ (`/play.html`)
- **Test:** unit 52 ข้อ (6 ไฟล์) และ e2e 3 ข้อ ผ่านทั้งหมด

## Artifacts (ลิงก์คงที่)
- **หน้าโชว์ตัวละคร:** https://claude.ai/artifact/PNawa631NQkzXEZbZAbFRh
  - สร้างใหม่ด้วย `npm run showcase:artifact -- <out.html>`
- **หน้า prompt วาดภาพ** (ตัวละคร + การ์ดแผนที่): https://claude.ai/artifact/MhaaL8qZeM38uGnb3wBw2z
  - ต้นฉบับ HTML อยู่ใน scratchpad เท่านั้น ไม่อยู่ใน repo
  - ถ้าเป็น container ใหม่ ให้ใช้ Artifact `action: read` กับ url นี้ แล้วแก้และ publish พร้อมใส่ `url` เดิม
- **ด่านทดลอง:** https://claude.ai/artifact/MXkN26QoVLgRMQsmvjhD98
  - สร้างใหม่ด้วย `node scripts/build-showcase.mjs <out.html> play`
  - publish ทับลิงก์เดิมโดยใส่ `url`

## รอเจ้านาย
1. **ลองเล่นด่านทดลองแล้วบอกความเห็น** เช่น ความยาก ขนาดฮีโร่ ราคาป้อม
   - ปรับตามที่ติ แล้วค่อย deploy
2. **วาดแผนที่ด่าน 1 ใน ChatGPT**
   - แนบ `art/maps/level1-sketch.png` แล้วใช้ prompt หัวข้อ 9.1 ใน `docs/art/CHARACTER_BRIEF.md` (ข้อความเดียวกับการ์ด Map)
   - เจ้านายเลือกแล้วว่า**รอแผนที่ของจริง ไม่ทำแผนที่ชั่วคราวด้วยโค้ด** (เคยติว่าภาพร่างดูไม่มีดีเทล)
3. **วาด Deckhand**
   - ใช้ prompt เดียวจบ แท็บ Deckhand
   - หยุดหลังภาพ 2 เพื่อรออนุมัติ

## งานถัดไปของ Claude
- **A. Deploy `/play.html` หลังเจ้านายโอเค**
  - Vercel MCP `create_deployment`
    - `project`: `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`
    - `teamId`/slug: `cat-team5`
    - `target`: `production`
    - `gitSource`: `{type:'github', org:'RiccoKenko', repo:'game101', ref:'claude/compassionate-dirac-2wzrb3', sha:<HEAD>}`
  - รอสถานะ READY แล้วเปิด `little-archer.vercel.app/play.html` เพื่อยืนยัน
- **B. ได้แผนที่แล้ว**
  1. เก็บภาพต้นฉบับที่ `art/incoming/maps/level1_map.png`
  2. ทำไฟล์ 1536×1024 ที่ `public/maps/level1.png`
  3. ตั้ง `LEVEL1.map.art = 'maps/level1.png'` ใน `src/td/levels.ts`
  4. ซ้อนภาพกับภาพร่างเพื่อจูน `route`, `slots`, `dock`, `vault`, `heroStart`, `island`
  5. `npm run map:sketch -- level1` พิมพ์ปัญหาจาก `checkLevel` ออกมา และ unit test ก็เช็ก `checkLevel` ด้วย
  - ตัว build แบบไฟล์เดียวใส่ `public/maps/*.png` ให้เองอยู่แล้ว
- **C. ได้ Deckhand แล้ว**
  1. วางภาพที่ `art/incoming/deckhand/deckhand_<sheet>.png`
  2. รัน `npm run art -- deckhand` แล้วดูภาพตรวจ `.check.png`
     - ชื่อชิ้นอยู่ใน `scripts/art/sheets.json`
     - แผ่นหน้าอาจต้องใส่ `boxes` เหมือนของ hero
  3. ทำ `art/rigs/deckhand.json` แบบเดียวกับ `art/rigs/hero.json` คือ fit แต่ละชิ้นกับ rig pose ด้วย 2-3 จุด
  4. รัน `npm run art:publish -- deckhand`
  5. เขียนท่าใน `src/puppet/clips/deckhand.ts`: idle, เดินโยก, วิ่ง, แบกคริสตัลเหนือหัว, โดนตี, ตาย, ยั่ว, เชียร์
  6. ใส่แทนตัวกลมชั่วคราว
     - ใน `src/play/main.ts` ให้ `PirateView` ใช้ Puppet (Powder Monkey ยังเป็นตัวกลมชั่วคราว)
     - ในแท็บ Battle ของหน้าโชว์ ใช้ Deckhand แทนเป้าซ้อม
- **D. ต่อจากนั้น (2D-3)**
  - ป้อม 4 แบบ พร้อมสายแยกที่ Lv4
  - ศัตรูเพิ่ม: Ironclad, Parrot Raider ที่บินได้, บอส First Mate
  - สกิล Talon และ Mochi
  - การ์ดคำสั่งกัปตัน

## ข้อเท็จจริงสำคัญ
- **พิกัด:** ใช้พิกเซลบนภาพแผนที่ 1536×1024 แกน y ชี้ลง
  - ใน Three.js คือ `(x, -y)`
  - ลำดับการวาด `sortOrder = 1000 + y*100` เพื่อให้ตัวที่อยู่ต่ำบนจอวาดทับ
- **`src/td/battle.ts` เป็นกติกาล้วน ไม่มีการวาด**
  - `src/play/main.ts` อ่าน state แล้ววาด
  - เหตุการณ์จาก `drain()` แปลงเป็นเอฟเฟกต์และเสียง
  - ล็อกการสุ่มด้วย `?seed=`
- **ค่าสมดุลปัจจุบัน**
  - deckhand: hp 65, speed 52, bounty 5
  - powderMonkey: hp 35, speed 86, bounty 3
  - archer: ราคา 70 / 110 / 160
  - hero: damage 6-9, rate 0.55, range 250, windup 0.25
  - ด่าน: เงินเริ่มต้น 220, คริสตัล 20, 6 เวฟ
  - ผลจาก bot ทดสอบ: ฮีโร่ยืนนิ่ง + 2 ป้อมเสียคริสตัลประมาณ 3, + 4 ป้อมไม่เสียเลย
  - สคริปต์ bot อยู่ใน scratchpad ซึ่งอาจหายแล้ว ทำใหม่ได้ง่าย: วนเรียก `Battle.step(1/30)` แล้วให้ bot สร้างหรืออัปเกรดป้อม
- **ฮีโร่**
  - ขนาด 0.08 ในด่าน (สูงประมาณ 105 px) และ 0.26 ในหน้าโชว์
  - จังหวะยิงตรงกัน: เหตุการณ์ `draw` สั่ง `anim.oneShot('rapid')` ซึ่งปล่อยลูกที่ 0.25 s ตรงกับ `HERO.windup`
- **build ไฟล์เดียว:** `scripts/build-showcase.mjs <out> [index|play]`
  - ใช้ `configFile:false` + `inlineDynamicImports`
  - ใส่ sprites ทั้งหมด (ยกเว้น `master.png`), ภาพแผนที่ (เฉพาะหน้า play) และเสียง
- **การทดสอบ**
  - `npm run typecheck`
  - `npx vitest run`
  - `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`
  - `npm run build`
  - ใน Playwright ปุ่ม `#call` เต้นอยู่ตลอด ต้องใช้ `click({force:true})`
  - ถ่ายภาพหน้าจอด้วย `scripts/shot.mjs`
- **ข้อจำกัดที่รู้แล้ว**
  - ลูกบอลข้อต่อที่ศอกและเข่ายังเห็นนิดหน่อย
  - sprites รวมประมาณ 5 MB
  - ภาพร่างแผนที่แตกเป็นขั้นตอนซูมเข้า เพราะใช้ palette 64 สี

## วิธีทำงานกับเจ้านาย
- **การสื่อสาร**
  - เรียก "เจ้านาย"
  - ตอบภาษาไทยปนศัพท์เทคนิคภาษาอังกฤษ
  - ส่งงานก่อนแล้วค่อยอธิบาย
  - อธิบายแบบคนที่ไม่ใช่สาย dev
  - มี "📚 บทเรียนที่ N" ซึ่งถึง 22 แล้ว
- **checkpoint:** เมื่อถึงจุดที่หยุดได้ให้บอกก่อน เพราะเจ้านายจะสั่ง handoff แล้ว compact
- **งานภาพ:** วาดใน ChatGPT ปกติ (Codex ไม่ได้ต่อ GitHub) แล้วส่งภาพมาในแชต
- **git:** ไม่เปิด PR ถ้าไม่ได้สั่ง, ใส่ trailer ใน commit, ไม่ใส่ชื่อ model
