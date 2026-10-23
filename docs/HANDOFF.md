# Handoff: Little Archer: Sky Pirates

> สรุปสำหรับเริ่มงานต่อในแชตหรือ session ใหม่: สถานะล่าสุด, ลิงก์, งานที่รอ, และสิ่งที่ต้องรู้ก่อนลงมือ

## สถานะ (23 ต.ค. 2026)
- **โปรเจกต์:** Little Archer: Sky Pirates
  - เกม TD แบบ 2.5D สไตล์ Kingdom Rush บนมือถือแนวนอน ภาพ 2D แนวอนิเมะ
  - เจ้านายวาดภาพด้วย Codex (เดิมใช้ ChatGPT) แล้ว Claude นำมาตัดชิ้น ใส่กระดูก และทำท่า
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
  - 2D-3 ส่วนกติกา (ภาพยังเป็นตัววาดด้วยโค้ดชั่วคราว):
    - ป้อม 4 แบบ ระดับ 1-3: Archer, Cannon (ระเบิดวง ยิงตัวบินไม่ได้), Storm Crystal (เวท ทะลุเกราะ), Frost Cloud (ทำให้ช้า)
    - ศัตรูใหม่: Ironclad (เกราะ), Parrot Raider (บิน)
    - ด่าน 1 มี 8 เวฟ
    - ระดับ 4 เลือกสายได้ ป้อมละ 2 สาย รวม 8 แบบ (`TowerDef.branches`, `towerSpec()`), ปุ่ม Target ในเมนูป้อม
    - บอส First Mate ท้ายเวฟ 8:
      - แบกคริสตัลได้ 3 ก้อน (`carries`)
      - ตะโกนให้โจรรอบตัววิ่งเร็วขึ้น (`shout`)
      - ทนน้ำแข็ง (`steady`)
      - มีแถบเลือดใน HUD
- **Test:** unit 69 ข้อ (6 ไฟล์) และ e2e 3 ข้อ ผ่านทั้งหมด

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
2. ~~วาดแผนที่ด่าน 1~~ **เสร็จแล้ว** (23 ต.ค.)
   - Codex วาดตามภาพร่างได้ตรงมาก
   - ต้นฉบับอยู่ที่ `art/incoming/maps/level1_map.webp` ส่วนไฟล์ที่เกมใช้คือ `public/maps/level1.webp`
   - วัดจากภาพแล้ว: ทางเดินคลาดเฉลี่ย 2.5 px และกว้าง 92 px จุดป้อมขยับไม่กี่พิกเซลให้ตรงกลางหิน
   - เจ้านายเลือกแล้วว่า**รอแผนที่ของจริง ไม่ทำแผนที่ชั่วคราวด้วยโค้ด** (เคยติว่าภาพร่างดูไม่มีดีเทล)
3. **วาด Deckhand ด้วย Codex:** วาดครบ 8 ภาพแล้ว แต่ต้องให้เจ้านายส่งใหม่เป็นข้อความปกติ
   - ภาพที่แปะ "ระหว่างที่ Claude กำลังทำงาน" ไม่ถูกบันทึกเป็นไฟล์ในโฟลเดอร์ images
   - ภาพที่ส่งเป็นข้อความปกติจะถูกบันทึกที่ `/tmp/claude-0/<project>/<session>/images/`
   - ใช้ prompt เดียวจบ (8.10) หยุดหลังภาพ 2 เพื่อรออนุมัติ

## งานถัดไปของ Claude
- **A. Deploy `/play.html` หลังเจ้านายโอเค**
  - Vercel MCP `create_deployment`
    - `project`: `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`
    - `teamId`/slug: `cat-team5`
    - `target`: `production`
    - `gitSource`: `{type:'github', org:'RiccoKenko', repo:'game101', ref:'claude/compassionate-dirac-2wzrb3', sha:<HEAD>}`
  - รอสถานะ READY แล้วเปิด `little-archer.vercel.app/play.html` เพื่อยืนยัน
- **B. ได้แผนที่แล้ว** (ทำแล้วสำหรับด่าน 1 ใช้เป็นขั้นตอนสำหรับด่านต่อไป)
  - สคริปต์ช่วย (อยู่ใน scratchpad อาจหายแล้ว):
    - ซ้อนเส้นทาง จุดป้อม และขอบเกาะทับภาพด้วย sharp + SVG
    - วัดความกว้างทางเดินและหาจุดศูนย์กลางหินจากสีพิกเซล
  1. เก็บภาพต้นฉบับที่ `art/incoming/maps/level1_map.png`
  2. ทำไฟล์ 1536×1024 ที่ `public/maps/level1.png`
  3. ตั้ง `LEVEL1.map.art = 'maps/level1.png'` ใน `src/td/levels.ts`
  4. ซ้อนภาพกับภาพร่างเพื่อจูน `route`, `slots`, `dock`, `vault`, `heroStart`, `island`
  5. `npm run map:sketch -- level1` พิมพ์ปัญหาจาก `checkLevel` ออกมา และ unit test ก็เช็ก `checkLevel` ด้วย
  - ตัว build แบบไฟล์เดียวใส่ `public/maps/*.png` ให้เองอยู่แล้ว
- **C. ได้ Deckhand แล้ว**
  1. วางภาพที่ `art/incoming/deckhand/deckhand_<sheet>.png` (ภาพที่แปะในแชตอยู่ในโฟลเดอร์ uploads ของ session ให้ดูขนาดและเนื้อหาเพื่อจับคู่ชื่อแผ่น)
  2. รัน `npm run art -- deckhand` แล้วดูภาพตรวจ `.check.png`
     - ชื่อชิ้นอยู่ใน `scripts/art/sheets.json`
     - แผ่นหน้าอาจต้องใส่ `boxes` เหมือนของ hero
  3. ทำ `art/rigs/deckhand.json` แบบเดียวกับ `art/rigs/hero.json` คือ fit แต่ละชิ้นกับ rig pose ด้วย 2-3 จุด
  4. รัน `npm run art:publish -- deckhand`
  5. เขียนท่าใน `src/puppet/clips/deckhand.ts`: idle, เดินโยก, วิ่ง, แบกคริสตัลเหนือหัว, โดนตี, ตาย, ยั่ว, เชียร์
  6. ใส่แทนตัวกลมชั่วคราว
     - ใน `src/play/main.ts` ให้ `PirateView` ใช้ Puppet (Powder Monkey, Ironclad, Parrot ยังเป็นตัววาดด้วยโค้ดชั่วคราว)
     - ในแท็บ Battle ของหน้าโชว์ ใช้ Deckhand แทนเป้าซ้อม
- **D. 2D-3 ที่เหลือ** (ทำตามลำดับ)
  - สกิล Talon (แย่งคริสตัลคืน) และ Mochi (ท่าไม้ตาย)
  - การ์ดคำสั่งกัปตันทุก 5 เวฟ

## ข้อเท็จจริงสำคัญ
- **พิกัด:** ใช้พิกเซลบนภาพแผนที่ 1536×1024 แกน y ชี้ลง
  - ใน Three.js คือ `(x, -y)`
  - ลำดับการวาด `sortOrder = 1000 + y*100` เพื่อให้ตัวที่อยู่ต่ำบนจอวาดทับ
- **`src/td/battle.ts` เป็นกติกาล้วน ไม่มีการวาด**
  - `src/play/main.ts` อ่าน state แล้ววาด
  - เหตุการณ์จาก `drain()` แปลงเป็นเอฟเฟกต์และเสียง
  - ล็อกการสุ่มด้วย `?seed=`
- **ค่าสมดุลปัจจุบัน** (ตัวเลขทั้งหมดอยู่ใน `src/td/units.ts`)
  - deckhand: hp 65, speed 52, bounty 5
  - powderMonkey: hp 35, speed 86, bounty 3
  - ironclad: hp 140, speed 36, เกราะ 50% (ลดดาเมจกายภาพ), bounty 14
  - parrot: hp 42, speed 72, บินสูง 70 px, bounty 7
  - firstMate (บอส): hp 1000, speed 28, เกราะ 30%, แบก 3 ก้อน, ตะโกนทุก 7 วินาที (รัศมี 180, เร็วขึ้น ×1.5 นาน 2.5 วินาที)
    - bot 8 ป้อมมักฆ่าบอสได้ ส่วน 4 ป้อมบอสมักหนีไปได้
  - คลังคริสตัล: โจรแบกได้หลายก้อน (`Enemy.load`) และจะเดินต่อจนเต็มมือ (`carries`) ก่อนหันกลับ
  - ราคาป้อม: archer 70/110/160, cannon 90/130/190, storm 100/140/200, frost 80/110/150
  - ราคาสายระดับ 4: 220-270
  - hero: damage 6-9, rate 0.55, range 250, windup 0.25
  - ด่าน: เงินเริ่มต้น 220, คริสตัล 20, 8 เวฟ (นกเริ่มเวฟ 4, Ironclad เริ่มเวฟ 6)
  - ผลจาก bot 6 seed:
    - 8 ป้อมแบบไหนก็ได้ 2-3 ดาว
    - 4 ป้อม 1-3 ดาว
    - ปืนใหญ่ล้วน 1 ดาว เพราะนกบินผ่าน
    - ฮีโร่คนเดียวแพ้
  - สคริปต์ bot อยู่ใน scratchpad ซึ่งอาจหายแล้ว ทำใหม่ได้ง่าย: วนเรียก `Battle.step(1/30)` แล้วให้ bot สร้างหรืออัปเกรดป้อม
- **ฮีโร่**
  - ขนาด 0.08 ในด่าน (สูงประมาณ 105 px) และ 0.26 ในหน้าโชว์
  - จังหวะยิงตรงกัน: เหตุการณ์ `draw` สั่ง `anim.oneShot('rapid')` ซึ่งปล่อยลูกที่ 0.25 s ตรงกับ `HERO.windup`
- **การโจมตีของป้อม** (`TowerDef.attack`)
  - `arrow` ติดตามเป้า
  - `shell` ยิงโค้งไปจุดที่คาดว่าเป้าจะอยู่ ระเบิดโดนเฉพาะตัวบนพื้น
  - `zap` โดนทันที
  - `pulse` ทำให้ทุกตัวในระยะช้าลง
  - ระดับ 4 เพิ่มตัวเลือกใน `TowerLevel`:
    - `shots` (Volley)
    - `crit` (Sniper)
    - `chain*` (Lightning Spire)
    - `ramp*` (Arcane Lens)
    - `freeze` (Ice Shard)
    - Flak คือ shell ที่ `hitsFlying`
  - สุ่มคริเฉพาะป้อมที่มีโอกาสคริ เพื่อไม่ให้ลำดับการสุ่มของผลเดิมเปลี่ยน
  - ฝั่งวาด:
    - ลูกปืนใหญ่ลอยโค้งพร้อมควัน (Flak ระเบิดกลางอากาศ)
    - สายฟ้าและลำแสงใช้ `src/fx/bolt.ts`
    - คลื่นเย็นเป็นวงกว้างเท่าระยะป้อม
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
  - มี "📚 บทเรียนที่ N" ซึ่งถึง 25 แล้ว
- **checkpoint:** เมื่อถึงจุดที่หยุดได้ให้บอกก่อน เพราะเจ้านายจะสั่ง handoff แล้ว compact
- **งานภาพ:** เจ้านายใช้ Codex (account กลาง **ไม่ได้เชื่อม GitHub**) เป็นแชตธรรมดา
  - ส่ง prompt เป็นกล่องข้อความในแชตให้ก๊อปวาง ไม่ต้องเปิดหน้า Artifact
  - ห้ามมีขั้นตอน branch, commit หรือ PR ใน prompt
  - เจ้านายเซฟภาพแล้วแปะกลับมาในแชต
- **git:** ไม่เปิด PR ถ้าไม่ได้สั่ง, ใส่ trailer ใน commit, ไม่ใส่ชื่อ model
