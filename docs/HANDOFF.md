# Handoff: Little Archer

> สรุปสำหรับเริ่มงานต่อในแชตหรือ session ใหม่: สถานะล่าสุด, ลิงก์, งานที่รอ, และสิ่งที่ต้องรู้ก่อนลงมือ

## 📍 จุดล่าสุด (24 ต.ค. 2026): กลับมาทำ Monster Rush
- **เจ้านายเปลี่ยนทิศ:** ลองเล่น Sky Pirates (Tower Defense) แล้ว "ไม่สนุกเลย" จึงพัก TD ไว้ก่อน แล้วกลับมาเน้น **Little Archer: Monster Rush** (เกม survivor เดิม)
  - เหตุผลที่ TD ไม่สนุก (เจ้านายตอบ): สู้เกม TD ทั่วไปไม่ได้, ป้อมและมอนเดินไม่สมจริง ดูขาด ๆ เกิน ๆ, ความยาก/ความยาวด่านไม่พอดี
  - บทเรียนสำหรับรอบใหม่: ทำให้ "รู้สึกดี" ในมือ (การเคลื่อนไหว, เอฟเฟกต์, จังหวะ) ก่อนเพิ่มเนื้อหา และให้เจ้านายลองเล่นเร็วกว่าเดิม
- **โค้ดบน branch นี้ (`claude/compassionate-dirac-2wzrb3`) คือ Monster Rush ตาม commit b5f1bda** (เวอร์ชันสุดท้ายก่อนเริ่ม Sky Pirates) + ไฟล์นี้ + `art/openai-log.jsonl`
  - Phaser 3.90 + TypeScript + Vite, ภาพ SVG เขียนในโค้ด; วิธีเล่น/สวิตช์ทดสอบ/ไฟล์ค่าสมดุลอยู่ใน `README.md`
  - Test: unit 19 ข้อ, e2e 3 ข้อ ผ่าน (`npx vitest run`, `PW_CHROMIUM=/opt/pw-browsers/chromium npx playwright test`)
  - เซฟของผู้เล่นใช้ key `little-archer-save-v1` (Sky Pirates ใช้ key อื่น จึงไม่เคยแตะเซฟเดิม)
- **ลิงก์หลัก little-archer.vercel.app กลับเป็น Monster Rush แล้ว** (deploy ด้วย Vercel MCP `create_deployment`, project `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`, slug `cat-team5`, target production, gitSource `RiccoKenko/game101` ref branch นี้)
- **เจ้านายอยากได้ (ตอบ 24 ต.ค.):** "คืนเกมเดิมแต่ยกเครื่องใหม่ ปรับกราฟิก effect ให้สวยงามขึ้น แล้วเพิ่มเนื้อหาให้เล่นซ้ำไม่เบื่อ เช่น อาวุธ/ศัตรูใหม่ ภารกิจ ตัวละครให้เลือก"
  - เจ้านายเลือก **"ทำเอฟเฟกต์ก่อน ค่อยตัดสินใจ"** เรื่องสไตล์ภาพ (อนิเมะแบบ Sky Pirates หรือเวกเตอร์เดิมขัดเกลา) หลังลองเล่นเฟส 1
- **เฟส 1 ความมันมือ + เอฟเฟกต์ (ภาพเดิม): เสร็จแล้ว** commit 0aecdf0, **รอเจ้านายลองเล่น** ยังไม่ deploy ขึ้นลิงก์หลัก
  - ลองเล่น: Artifact https://claude.ai/artifact/QxsbsoUHeKfnr19kQw6TBH (ไม่มีเสียง) สร้างใหม่ด้วย `node scripts/build-artifact.mjs <out.html>` แล้ว publish ทับ path เดิม
  - มอนขยับตามชนิด (`motion` ใน `config/enemies.ts`: hop/flap/float/walk/heavy), โผล่แบบเด้ง, ยุบตอนโดนตี, ตายแล้วกระพริบขาวหมุนหาย + รอยกระเซ็น (`Effects.corpse/decal`)
  - คริติคอล 6% x2 เลขส้มใหญ่ (`PLAYER_BASE.critChance/critMult`, `stats.critChance`)
  - hit-stop / slow-mo / shake ผ่าน `ctx.hitStop/slowMo/shake` (ปิดเองตอน `?bot`); สวิตช์ Shake ในหน้าหยุด (`settings.shake`)
  - ลูกธนู/มีดมีหางแสง, ธนูมีแสงตอนยิง + ฮีโร่ถอยนิด, ขวานมีเงาตาม, ออร่าพองตอนตี, สายฟ้าซิกแซก, ระเบิดมีวงเป้าแดง + เงา + รอยไหม้
  - เพชร/เหรียญเด้งออกจากศัตรู, เหรียญหมุน, หีบมีแสงหมุน, เลเวลอัปมีแสงทอง + slow-mo 0.4 วิ ก่อนการ์ดขึ้น
  - บอสตกจากฟ้าลงครึ่งบนของจอ (640 px) มีวงกระแทก; บอสตายมีแสงวาบ ระเบิดต่อเนื่อง slow-mo
  - บรรยากาศแต่ละแมพ `game/Ambience.ts` (กลีบดอกไม้ / หมอก+หิ่งห้อย / ถ่านไฟ), ต้นไม้ไหว, HUD มี vignette + ขอบแดงตอนโดนตี/เลือดน้อย
  - FPS ใน container (ไม่มี GPU) ลดจาก ~13 เป็น ~11; JS ต่อเฟรม < 1 ms ต้องให้เจ้านายลองบน iPhone จริงว่าลื่นไหม
- **เฟส 2 ลุคใหม่ "MMORPG เกาหลียุค 2000" (แรงบันดาลใจจาก Ragnarok Online): เจ้านายสั่ง "ลุยเลย ปรับเต็มตามแนวนี้"**
  - ⚠️ ยืมได้แค่ "สไตล์" (chibi, pastel, มุมมองเฉียงบน, หน้าต่าง navy-ทอง) ห้ามใช้ตัวละคร/ชื่อ/เพลง/โลโก้ของ RO จริง (เช่น Poring) ทุกอย่างต้องออกแบบใหม่ ใน prompt ไม่เอ่ยชื่อเกม
  - ภาพต้นแบบ: `art/incoming/mr/look_mockup.png` (prompt `art/prompts/mr_look_mockup.txt`) ใช้แนบเป็น ref ทุกภาพ
  - วาดด้วย OpenAI 11 แผ่น (medium): มอน 3 แมพ (+บอส), ของตกแต่ง 3 แมพ, พื้น 3 แมพ, ไอเท็ม, ไอคอน 23 อัน → `art/incoming/mr/*.png`, prompt `art/prompts/mr_*.txt`
    - gpt-image-2 ไม่รองรับพื้นโปร่งใส: ใช้พื้นสีล้วน (แมพ 1 ใช้ cyan เพราะมอนสีชมพู/ม่วง, ที่เหลือ magenta)
  - ตัดด้วย `npm run art:cut [-- <sheet>]` (`scripts/art/cut.ts` + `scripts/art/mr-sheets.json`: ชื่อ key ตามลำดับอ่าน, ขนาดในเกม, `grid` สำหรับไอคอน/ไอเท็ม, `erase` ลบของเกิน เช่นลูกไฟของ imp) → `public/art/<key>.webp` + `src/art/manifest.json`; พื้นทำให้ต่อกันไร้รอยด้วย `scripts/art/seamless.ts`; ภาพตรวจ `art/sliced/mr/*.check.png` (ไม่อยู่ใน git)
  - เกมโหลด WebP ตาม manifest (`BootScene`), อะไรที่ไม่มีภาพใหม่ใช้ SVG เดิม; มอนมีภาพเดียว เฟรม 2 สร้างเองโดยบีบเล็กน้อย (`textures.ts secondFrame`)
  - ฮีโร่: เอา puppet อนิเมะจาก Sky Pirates มา bake เป็น sprite sheet `public/art/hero/hero.webp` + `hero.json` (idle/run/shoot/hurt/ko/cheer) + `hero_menu.webp`; สคริปต์อยู่ `scripts/art/hero-bake/` (รันกับ worktree ของ `sky-pirates-td`); `Player.ts` เล่นแอนิเมชันเหล่านี้ถ้ามี
  - UI ทั้งหมดเปลี่ยนเป็นหน้าต่าง navy โปร่งแสง ขอบทอง, การ์ดตัวเลือกเป็นกระดาษ parchment (`src/ui/*`, ทุก scene)
  - ไฟล์เดียว (Artifact): `build-artifact.mjs` ฝัง `public/art` เป็น `window.__ASSETS__` (`src/art/assets.ts`)
  - งบ OpenAI หลังเฟสนี้: $1.44 จาก $5
- **เฟสถัดไป:** 3 เนื้อหาเล่นซ้ำ: อาวุธ/ศัตรูใหม่, ภารกิจ, ตัวละครให้เลือก

## Sky Pirates (พักไว้)
- โค้ดและภาพทั้งหมดอยู่บน branch **`sky-pirates-td`** (commit ebe60ec) อ่าน `docs/HANDOFF.md` บน branch นั้นได้รายละเอียดครบ
  - ของที่หยิบมาใช้ต่อได้: ภาพอนิเมะ Little Archer + ระบบ puppet 2D (10 ท่า 8 สีหน้า), ตัวละคร 8 ตัว (Deckhand, Powder Monkey, Ironclad, Parrot Raider, First Mate, Talon, Mochi), เอฟเฟกต์ `src/fx/*`, เครื่องมือตัดภาพ `scripts/art/*`, สคริปต์ `art:openai`
  - หยิบไฟล์กลับมา: `git checkout origin/sky-pirates-td -- <path>`
- ดูได้ที่ Artifact: ตัวเกม https://claude.ai/artifact/MXkN26QoVLgRMQsmvjhD98 (v17), หน้าโชว์ตัวละคร https://claude.ai/artifact/PNawa631NQkzXEZbZAbFRh

## 🎨 วาดภาพด้วย OpenAI API: งบรวม $5 ทั้งเกม (เจ้านายตั้ง 24 ต.ค.)
- ⚠️ **ตอนนี้ (Monster Rush):** ใช้ไปแล้ว $0.37 ตาม `art/openai-log.jsonl` บน branch นี้; สคริปต์ `scripts/art/openai.ts` อยู่บน branch `sky-pirates-td` ถ้าจะวาดภาพให้ Monster Rush ให้หยิบกลับมาและนับงบต่อจาก log นี้ (ยังถือว่า $5 รวมทั้งหมด จนกว่าเจ้านายจะสั่งเปลี่ยน)
- **ที่มา**
  - Codex (account กลาง) ใช้ไม่สะดวก
  - Gemini (แอป, account บริษัท) วาดป้อมกับแผนที่ด่าน 2-3 ได้ดี แต่แผนที่หน้าเลือกด่านไม่สวย
  - Gemini API ใช้เครดิตฟรีไม่ได้ เพราะ account บริษัทไม่มีสิทธิ์ AI Pro
  - เจ้านายจึงเลือก OpenAI API (ตระกูลเดียวกับ Codex สไตล์ตรงกับตัวละคร) โดย**ใช้ไม่เกิน $5 สำหรับทั้งเกม**
- **ตัวกันงบ 2 ชั้น**
  1. เจ้านายเติมเครดิต OpenAI แค่ $5 และปิด auto-recharge ใช้เกินยอดนี้ไม่ได้
  2. สคริปต์ `npm run art:openai` คำนวณราคาจริงจาก token ที่ OpenAI ส่งกลับมา แล้วบันทึกลง `art/openai-log.jsonl`
     - ก่อนวาดทุกภาพจะเช็กว่ายอดสะสมบวกราคาเผื่อสูงยังไม่เกิน `OPENAI_BUDGET_USD` (ค่าเริ่มต้น 5, **ห้ามเพิ่มถ้าเจ้านายไม่สั่ง**)
     - **ต้อง commit ไฟล์ log ทุกครั้งหลังวาด** เพราะยอดสะสมนับจากไฟล์นี้ (container ใหม่จะได้ไม่เริ่มนับจาก 0)
- **ราคา gpt-image-2 ภาพ 1536×1024** (OpenAI ต.ค. 2026)
  - ต่อภาพ: low $0.005 / medium $0.041 / high $0.165
  - ภาพอ้างอิงคิดเพิ่มตาม token (ประมาณ $0.01-0.03 ต่อภาพ)
  - `npm run art:openai -- --spent` ดูยอดที่ใช้ไปแล้ว
- **แบ่งงบ $5 ทั้งเกม**

| งาน | วิธี | งบ |
|---|---|---|
| ปิด Chapter 1: แผนที่หน้าเลือกด่าน + ภาพครึ่งตัว Talon | ร่าง medium 2 ครั้ง + จริง high 1 ครั้ง ต่อภาพ (gpt-image-2 ไม่รองรับ `--transparent` ใช้พื้นชมพูแทน) | ~$0.75 |
| Chapter 2: แผนที่ 3 ด่าน + แผนที่เลือกด่าน | ภาพร่างจาก `map:sketch` + medium ร่าง + high จริง | ~$1.20 |
| Chapter 3: แผนที่ 3 ด่าน + แผนที่เลือกด่าน | เหมือน Chapter 2 | ~$1.20 |
| Captain Stormbeard (บอสใหญ่ ตัวละครใหม่ตัวเดียวของเกม) | medium ทั้งหมด วาดเฉพาะแผ่นที่ใช้จริง (master, rigpose, head_faces, parts_body, hands_props, portraits) ไม่วาด concept/poses | ~$0.75 |
| สำรอง: วาดใหม่, ไอคอน, อาคารเกาะ Sky Haven 1-2 แผ่น | | ~$1.10 |

- **กติกาให้อยู่ในงบ**
  - **ไม่วาดศัตรูธรรมดาตัวใหม่:** Chapter 2-3 ใช้ตัวแปรจาก 5 ตัวเดิมด้วยโค้ด เช่น สีใหม่ ขนาดใหม่ ของติดตัว ความสามารถใหม่
  - ร่างด้วย medium เสมอ ใช้ high เฉพาะภาพสุดท้ายที่ใส่เกม
  - งานที่ไม่ซีเรียส ให้เจ้านายวาดเองฟรีด้วยแอป Gemini หรือ Codex ก่อน และใช้ API เมื่อวิธีฟรีไม่สวย
  - ใช้ภาพเดิมเป็นภาพอ้างอิงทุกครั้ง: ภาพตัวละคร master สำหรับตัวละคร, ภาพร่างแผนที่สำหรับแผนที่, แผนที่ด่าน 1 สำหรับสไตล์
  - ทุกครั้งที่วาด บอกเจ้านายว่าใช้ไปเท่าไรและเหลือเท่าไร
- **เจ้านายต้องทำเอง**
  1. platform.openai.com → สมัคร/ล็อกอิน (account ส่วนตัว)
  2. Billing → เติม $5 → ปิด auto-recharge
  3. ถ้าระบบขอ ให้ยืนยันตัวตน (Organization verification)
  4. สร้าง API key → ใส่เป็น **Network secret** ของ cloud environment
     - Secret type Bearer
     - Allowed websites `api.openai.com`
     - header `Authorization` prefix `Bearer` แล้ววาง key
     - proxy จะแนบ key ให้เอง สคริปต์ไม่ต้องรู้ค่า key
  5. ทดสอบด้วย `curl -s -o /dev/null -w '%{http_code}' https://api.openai.com/v1/models` (ต้องได้ 200)
- **ใช้งานจริงแล้ว (24 ต.ค.):** key ใส่เป็น network secret แล้ว และวาดแผนที่หน้าเลือกด่านเสร็จแล้ว
  - proxy ของ session ตัดคำขอที่นานเกิน ~30 วินาที (เจอ 502) สคริปต์จึงส่งงานแบบ background ผ่าน Responses API (`gpt-5.4-mini` + tool `image_generation`) แล้ววนเช็กผลจนเสร็จ
  - Node fetch ต้องตั้ง `NODE_USE_ENV_PROXY=1` (ใส่ไว้ใน npm script แล้ว) ไม่อย่างนั้นคำขอจะไม่ผ่าน proxy และ key จะไม่ถูกแนบ
  - ค่าภาพคิดแบบประมาณเผื่อสูง (เครื่องมือวาดภาพไม่ส่งจำนวน token มาให้) จึงนับเกินจริงเล็กน้อย ยอดจริงดูได้ที่หน้า Billing ของ OpenAI
- **วิธีที่ใช้แล้วได้ผล (แผนที่เลือกด่าน)**
  - prompt อยู่ใน `art/prompts/chapter1_map.txt`
  - แนบภาพร่าง + `public/maps/level1.webp` เป็นแบบสไตล์ ใช้ medium ใช้เวลาประมาณ 40 วินาที
  - ตำแหน่งเกาะตรงกับภาพร่างจนไม่ต้องจูน
- สคริปต์ `art:gemini` ยังเก็บไว้ เผื่อมีเครดิต Gemini ในอนาคต


## ตอนจบโปรเจกต์: Asset Kit
- เจ้านายจะเก็บทุกอย่างไว้ในคอมเพื่อใช้กับโปรเจกต์หน้า (ตกลงกัน 24 ต.ค.)
- พอเกมเสร็จ หรือเมื่อเจ้านายสั่ง "ทำ Asset Kit" ให้รวมเป็น zip จัดหมวดหมู่แล้วส่งด้วย SendUserFile
  - ตัวละคร: ภาพต้นฉบับ + sprites + rig + ท่าทาง
  - ป้อม, แผนที่ + ภาพร่าง
  - prompt/คู่มือสไตล์, บทเรื่อง
  - เครื่องมือ: slicer, puppet runtime, สคริปต์วาดภาพ
  - README อธิบายการใช้แต่ละส่วน
- ระหว่างนี้ GitHub คือที่เก็บหลัก ทุกงานต้อง commit + push เสมอ


## วิธีทำงานกับเจ้านาย
- **การสื่อสาร**
  - เรียก "เจ้านาย"
  - ภาษาไทยปนศัพท์เทคนิค
  - ส่งงานก่อนแล้วค่อยอธิบาย
  - อธิบายแบบคนที่ไม่ใช่สาย dev
  - มี "📚 บทเรียนที่ N" ซึ่งถึง **43** แล้ว (ข้อต่อไปคือ 44)
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
