# Handoff: Little Archer

> สรุปสำหรับเริ่มงานต่อในแชตหรือ session ใหม่: สถานะล่าสุด, ลิงก์, งานที่รอ, และสิ่งที่ต้องรู้ก่อนลงมือ

## 📍 สถานะล่าสุด (25 ต.ค. 2026, v10)
- **เกม:** Little Archer: Monster Rush (survivor แนวตั้ง, Phaser 3) ลุค "MMORPG เกาหลียุค 2000"
- **สถานะ:** งานทุกอย่าง commit + push แล้ว (HEAD ล่าสุดดูด้วย `git log -1`)
  - Test: typecheck, unit 80 ข้อ, e2e 6 ข้อ, build ผ่าน (v10)
- **ลิงก์ทดสอบ (Artifact เดิม, ตอนนี้ version 10):** https://claude.ai/artifact/QxsbsoUHeKfnr19kQw6TBH (ไม่มีเสียง)
  - สร้างใหม่: `node scripts/build-artifact.mjs <scratchpad>/monster-rush.html` แล้ว publish ทับโดยใส่ `url` นี้ (session ใหม่ต้อง `action: read` ลิงก์ก่อน ไม่งั้นจะได้ลิงก์ใหม่)
  - มีลิงก์ซ้ำที่สร้างพลาดตอน v7: https://claude.ai/artifact/DaeJvjMYDtgQqPh675dMmy (ลบได้ถ้าเจ้านายสั่ง)
- **ลิงก์หลัก little-archer.vercel.app ยังเป็นภาพเวกเตอร์เดิม** (deploy `dpl_Gc51ujWdFnwVWVSTFkqK8uyQPw3c`) ⚠️ รอเจ้านายสั่ง
  - วิธี deploy: Vercel MCP `create_deployment` (project `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`, slug `cat-team5`, target production, gitSource `{type:'github', org:'RiccoKenko', repo:'game101', ref:'claude/compassionate-dirac-2wzrb3', sha:<HEAD>}`)
- **รอบ v10 (เจ้านาย: "v9 ยากกว่าเดิมเยอะ อยู่ได้ไม่กี่นาทีก็ตาย")**
  - สาเหตุ: v9 ล็อกอาวุธแรงรุ่น v7-v8 แต่ความโหดของมอนรุ่น v7 (อีลีทมีพลัง, บอสคลั่ง) ตั้งไว้คู่กับอาวุธพวกนั้น; v8 ให้พรสวรรค์มาแทนการ์ดอัปเกรด 5 ครั้ง; Mage เลือด 80 ตายตอนอีลีทมีพลังโผล่ (นาที 2-3)
  - แก้: พรสวรรค์เป็นการ์ดแถม (`GameScene.addXp` เพิ่ม `pendingLevelUps` อีก 1), อีลีทเริ่มนาที 3 (`eliteChance`), ไม่มีพลังก่อน 5:00 (`affixCount` คืน 0 → `giveAffixes` ข้าม), เนื้อ 0.008, ตายแล้วได้ Life Spring (1)/Iron Shield (3)/Phoenix Feather (5), Hunter's Ring ย้ายไปเป็น Mimic 5 ตัว, Mastery +2%/เลเวล และเลเวลแรก 200 XP
  - วัดด้วยบอทหลบช้าครึ่งหนึ่ง (`?bot&skill=0.5`, Meadow, เซฟใหม่, seed 5/9, ตัดที่ 8:00): v7 archer 2:40/8:00+, mage 2:42/4:19; v9 archer 8:00+/8:00+, mage 2:53/2:42; **v10 archer 8:00+/8:00+, mage 8:00+/8:00+** (ฆ่าได้ ~5,000 ตัวที่ 8:00 ใกล้ v7); บอทยืนนิ่ง (`skill=0`) ตายใน 2 นาทีทุกเวอร์ชัน ใช้เทียบไม่ได้; บอทหลบเต็มที่รอด 9:00 ทั้ง v7/v9
  - สคริปต์: `scratchpad/v9/bal.cjs <label> <port> <hero> <seeds> <cap> '<extra>'` + worktree แช่แข็ง `scratchpad/w7` (v7), `w9`, `w10` (แพตช์ `skill` ในไฟล์ของ worktree เอง)
- **ที่มาของ v9:** เจ้านายขอให้คิดว่าจะทำให้เล่นหลายรอบแล้วไม่เบื่อ มีเป้าหมาย เล่นได้ยาว มีการพัฒนา → ผมเสนอแผน 4 ช่วง ("วงจร 3 ชั้น": ในตา / ระหว่างตา / ระยะยาว) เจ้านายเลือก **ช่วง 1 แบบ (ก) ล็อกของแล้วปลดด้วยภารกิจ** ทำด้วยโค้ดทั้งหมด $0
- **รอบ v9 = สมุดสะสม + ระดับฮีโร่**
  - **ของล็อก 26 ชิ้น** `config/collection.ts` (`UNLOCKS`): อาวุธ 11, ไอเทม 9, รูน 6 (ของรุ่น v5 ขึ้นไป); ของพื้นฐานที่เปิดตั้งแต่แรกวิวัฒนาการได้ด้วยของที่เปิดอยู่ (มี unit test)
    - เงื่อนไข: ฆ่ามอนชนิดนั้น (`bestiary`), ล้มบอส/หัวหน้า, หรือสถิติ (`level`, `time`, `chests`, `elites`, `evolutions`, `shrines`, `deaths`) — Meadow ได้ 15 ชิ้น, Graveyard 6, Castle 5
    - ล็อกด้วยการใส่ key (`weapon:shuriken`) ลง `Inventory.banned` ตอนเริ่มรอบ (`GameScene.create`) จึงไม่ต้องแก้ระบบสุ่มการ์ด
    - ทำได้กลางรอบมีป้าย "Unlocked!" (`GameScene.checkQuests`) แต่ได้จริงตอนจบรอบ (`claimUnlocks` หลัง `applyRun`) → ออกในการ์ดรอบถัดไป; เมนูเรียก `claimUnlocks` ด้วย (เซฟเก่าได้ของตามสถิติที่เคยทำ)
  - **เซฟใหม่** (`core/save.ts`): `bestiary`, `unlocked`, `seen` (ดูแล้ว → ป้าย NEW หาย), `mastery` (XP ต่อฮีโร่), `stats.shrines`, `stats.deaths`; `RunReport` มี `monsters`, `shrines`, `died`
  - **ระดับฮีโร่** `config/mastery.ts` + `core/collection.ts`: Lv 1-15, XP ต่อเลเวล 300+150×(lv-1) (รวม ~17,850 ต่อตัว), XP/รอบ = วินาที + kill/25 + 60×บอส/หัวหน้า; ทุกเลเวล ดาเมจ/HP +1%; รางวัล: พรสวรรค์ Lv 3/7/11 (archer: rain, trick, mark; mage: stars, stormcall, arcecho), Reroll Lv 5, Banish Lv 9, อาวุธเริ่ม +1 ขั้น Lv 13 (ซ้อนกับ Boar Tusk), Master + เหรียญ +10% Lv 15 (`masteryPerks` ใช้ใน `refreshStats`)
  - **หน้า Collection** `scenes/CollectionScene.ts`: แท็บ Weapons/Runes/Items/Monsters/Heroes, ช่องที่ล็อกมีแม่กุญแจ + หลอดความคืบหน้า, แตะช่องดูรายละเอียด/วิธีปลดล็อก/วิวัฒนาการ, แท็บ Heroes แสดงเส้นทางรางวัล
  - **เมนู:** ปุ่มหนังสือ (`icon_book` SVG ใหม่) ซ้ายของ PLAY + ป้ายตัวเลขของใหม่ที่ยังไม่ดู; แผ่นชื่อฮีโร่มีแถบ Mastery + รางวัลถัดไป (แตะเปิดแท็บ Heroes)
  - **หน้าจบเกม:** แถว "<ฮีโร่> mastery +XP" (LEVEL UP สีเขียว), แถบ "N NEW UNLOCKS!" พร้อมไอคอน; ข่าวด้านล่างย่อขนาดเองถ้าไม่พอที่
  - สวิตช์ทดสอบ: `?unlock` ปลดทุกอย่าง (รวมของในสมุด), `?mastery=15`
- **ข้อสังเกต:** ฮีโร่ทั้งสองเริ่ม Mastery 1 ในเซฟเดิมของเจ้านาย (ไม่มีประวัติแยกตัว) แต่ Lv 3 ได้ภายใน 2-3 รอบสั้น; ของที่สถิติเก่าถึงแล้ว (เช่น Wisdom Cap, Prism Beam, Giant Rune) จะปลดทันทีพร้อมป้าย NEW
- **รอเจ้านาย:**
  1. ลองเล่น v10 แล้วบอกว่าความยากพอดีหรือยัง และเงื่อนไขปลดล็อกเร็ว/ช้าไปไหม
  2. ทำช่วงถัดไปไหม (จากแผนที่เสนอ): **ช่วง 2** การ์ดโชคชะตาก่อนเริ่มตา + ปุ่มพุ่งหลบ/ท่าไม้ตาย, **ช่วง 3** โหมดเล่นต่อหลัง 15:00 + โจทย์ประจำวัน (ตารางอันดับออนไลน์ทีหลัง), **ช่วง 4** อุปกรณ์สวมใส่แบบ Archero (ตัวดูดเงินระยะยาว)
  3. คำถามค้างจาก v8: ฮีโร่ใหม่ (OpenAI ~$0.6/ตัว, วิธีอยู่ในหัวข้อ v8 ด้านล่าง), ขึ้นลิงก์หลัก
- **ของชั่วคราวใน container (หายได้):** dev server `npx vite --port 5181`; สคริปต์ `scratchpad/v9/ui.cjs` (ถ่ายเมนู/Collection ทุกแท็บ/หน้าจบเกม/ป้ายปลดล็อกกลางรอบ, `SKIP4=1` หรือ `ONLY4=1`), `scratchpad/v9/artifact.cjs` (เปิดไฟล์ Artifact ออฟไลน์), สคริปต์ v7/v8 ใน `scratchpad/v7/`
- **งบ OpenAI:** ใช้ไป **$3.53 จาก $5** (เหลือ $1.47) ตาม `art/openai-log.jsonl` (v7-v9 ไม่ได้ใช้)
  - ⚠️ commit log ทุกครั้งหลังวาด แล้วบอกเจ้านายว่าใช้ไป/เหลือเท่าไร; ห้ามเพิ่ม `OPENAI_BUDGET_USD` ถ้าเจ้านายไม่สั่ง
- **บทเรียน:** ถึงข้อ 54 แล้ว (ข้อต่อไปคือ 55)
- **ภาษา:** เจ้านายขอให้ตอบเป็น**ภาษาไทย** (ใช้ศัพท์อังกฤษให้น้อย)
- **ทดสอบ:** เครื่องใน container ช้า (เกมเดิน ~0.5 วินาทีต่อวินาทีจริงตอนบอท speed=8) ใช้ worktree แช่แข็ง (`git worktree add <scratchpad>/after HEAD` + symlink node_modules + vite port อื่น) ตอนวัดสมดุล เพราะ dev server รีโหลดเมื่อแก้โค้ด; สคริปต์ที่ใช้ `?autostart` ห้ามรอฉาก Menu

## รอบ v8 (25 ต.ค. 2026)
- **เกม:** Little Archer: Monster Rush (survivor แนวตั้ง, Phaser 3) ลุค "MMORPG เกาหลียุค 2000"
- **สถานะ:** งานทุกอย่าง commit + push แล้ว (HEAD ล่าสุดดูด้วย `git log -1`)
  - Test: typecheck, unit 67 ข้อ, e2e 4 ข้อ, build ผ่าน
- **ลิงก์ทดสอบ (Artifact เดิม):** https://claude.ai/artifact/QxsbsoUHeKfnr19kQw6TBH (ไม่มีเสียง)
  - สร้างใหม่: `node scripts/build-artifact.mjs <scratchpad>/monster-rush.html` แล้ว publish ทับโดยใส่ `url` นี้ (session ใหม่ต้อง `action: read` ลิงก์ก่อน ไม่งั้นจะได้ลิงก์ใหม่)
  - มีลิงก์ซ้ำที่สร้างพลาดตอน v7: https://claude.ai/artifact/DaeJvjMYDtgQqPh675dMmy (ลบได้ถ้าเจ้านายสั่ง)
- **ลิงก์หลัก little-archer.vercel.app ยังเป็นภาพเวกเตอร์เดิม** (deploy `dpl_Gc51ujWdFnwVWVSTFkqK8uyQPw3c`) ⚠️ รอเจ้านายสั่ง
  - วิธี deploy: Vercel MCP `create_deployment` (project `prj_yZBhIj9KcV2i9l1m9Rq39SI0mFtR`, slug `cat-team5`, target production, gitSource `{type:'github', org:'RiccoKenko', repo:'game101', ref:'claude/compassionate-dirac-2wzrb3', sha:<HEAD>}`)
- **รอบ v8 (เจ้านาย: ความยากโอเคแล้ว, อยากได้สกิล/ทางเลือกเยอะ ๆ, ฮีโร่เลือกได้เลยไม่ต้องปลดล็อกและเล่นต่างกัน, เงินได้เยอะเกินจนซื้อหมดในตาเดียว)** ทำด้วยโค้ดทั้งหมด ไม่ใช้ OpenAI
  - **ฮีโร่ฟรีทุกตัว + ต่างกัน** (`config/characters.ts`): Archer/Ranger = เร็ว, คริ +5%, Run and Gun (`moveHaste` ยิงเร็วขึ้นตอนวิ่ง) แต่ area -10%; Mage/Arcanist = area +20%, คูลดาวน์ -10%, Mana Shield (`Player.blockHit`, กลับมาใน 10 วิ) แต่ HP -20%, ช้าลง 5%
  - **พรสวรรค์** `config/talents.ts`: เลเวล 5/10/15/20/25 การ์ดเป็นพรสวรรค์ของฮีโร่ (archer 8, mage 10) → `Choice.kind 'talent'`, `rollTalents`, `GameScene.deal`, `run.talentsDue`; ผลอยู่ใน `computeStats(..., talents)`, รูนจากพรสวรรค์ใน `runeLevels`, ท่าของตัวเองใน `WeaponSystem.updateTalents` (Arrow Rain, Starcaller), Second Wind/Blink/Mana Font ใน `GameScene.hurtPlayer`; หน้าหยุดเกมแสดงพรสวรรค์ที่ได้
  - **อาวุธใหม่ 6 + วิวัฒนาการ 6** (`Weapons.ts`): Shuriken→Star Storm (+Seeker Rune), Shockwave→Earthquake (+Thorn Mail), Flame Trail→Inferno Road (+Moon Charm), Sentry Turret→Golden Ballista (+Echo Rune), Javelin→Dragon Lance (+Reaper Rune), Spirit Wisps→Soul Harvest (+Life Spring); ทุกอาวุธวิวัฒนาการด้วยของไม่ซ้ำกัน (มี unit test)
  - **ไอเทมใหม่ 5:** Wisdom Cap, Berserker Mask (`stats.rage`), Thorn Mail (`stats.thorns` ใน `Enemies.update`), Hunter's Ring (`stats.bigGame`), Phoenix Feather (revive)
  - **รูนใหม่ 3:** Seeker (`homing` ใน `updateProjectiles`), Giant (`fireMaybeGiant`), Nova (ใน `EnemyManager.damage`)
  - **เงิน:** `coinFactor(t)` ใน `core/waves.ts` (โอกาสดรอปเหรียญ × min(1, 3/spawnRate)), อีลีทดรอป 1 เหรียญ, `RUN_BONUS` = 0.3/วิ + 0.02/kill, `shopCost` = base×1.5×1.6^level (ร้านทั้งหมด ~8,700), การ์ดตอนของครบ = `might` (+4% ดาเมจ) / `tough` (+5% HP) / ฮีล แทนเหรียญ
  - ไอคอนใหม่ 20 อัน (SVG ท้าย `icons.ts`), ภาพในเกม `shuriken`, `spear`, `spear_dragon`, `turret`, `turret_gold`, `wisp` (`items.ts`), `flame` (canvas)
- **ผลวัด (บอท god mode, Meadow, ไม่มีอัปเกรดร้าน):** เหรียญที่เก็บได้ตอน 10:00 เหลือ 351 (v7 ได้ 1,315; 15:00 ได้ 1,689 + โบนัสจบรอบ ~1,100); ให้อาวุธชุดเดียวกัน v8 ฆ่าได้พอ ๆ กับ v7 (1,285 vs 1,193 ตัวที่ 4:00) ไม่มี error; บอทไม่ god รอด 4:30 ทั้งสองฮีโร่ (archer เหลือ 90 HP, mage 32)
- **รอเจ้านายตอบ 3 ข้อ (checkpoint หลังส่ง v8, ก่อน compact):**
  1. ลองเล่นแล้ว ฮีโร่สองตัวรู้สึกต่างกันพอไหม และเงินตอนนี้น้อยไปหรือพอดี
  2. อยากได้ฮีโร่ใหม่ไหม (เช่น สายประชิดถือดาบ, สายนักบวช) ต้องวาดด้วย OpenAI ประมาณ $0.6 ต่อตัว (จอมเวทใช้ 5 ภาพ = $0.58: master, rigpose, head_faces, parts_body, hands_props) → งบเหลือพอ 2 ตัว
     - ถ้าทำ: prompt แบบ `art/prompts/mr_mage_*.txt`, bake ด้วย `scripts/art/hero-bake/` (ดู README ในโฟลเดอร์; ต้องใช้ worktree ของ `sky-pirates-td`), แล้วเพิ่มใน `CHARACTERS` + พรสวรรค์ใน `TALENTS` + อาวุธเริ่มต้นของตัวเอง
  3. ให้ขึ้นลิงก์หลัก little-archer.vercel.app เลยไหม (deploy ตามวิธีด้านบน)
- **ไอเดียถัดไป (ยังไม่ทำ):** ปุ่มพุ่งหลบ + ท่าไม้ตาย, อันตรายบนแมพ (วงไฟ/มือโผล่จากดิน), โหมดไม่มีที่สิ้นสุดหลัง 15:00, Talent tree ถาวรต่อฮีโร่, combo ระหว่างอาวุธ
- **ของชั่วคราวใน container (หายได้):** dev server `npx vite --port 5181`; สคริปต์ทดสอบ `scratchpad/v7/*.cjs` (weap = ถ่ายภาพอาวุธด้วย `?give`, scene, menu, v8ui = เมนู/พรสวรรค์/โล่, shop, balance = บอท 7 นาที, gold = เหรียญตาม mark, probe, artifact = เปิดไฟล์ Artifact ออฟไลน์), `scratchpad/v7/icons_sheet.ts` + `shot_html.cjs` (ภาพรวมไอคอน); worktree เก่า `scratchpad/old`, `scratchpad/sp`
- **งบ OpenAI:** ใช้ไป **$3.53 จาก $5** (เหลือ $1.47) ตาม `art/openai-log.jsonl`
  - ⚠️ commit log ทุกครั้งหลังวาด แล้วบอกเจ้านายว่าใช้ไป/เหลือเท่าไร; ห้ามเพิ่ม `OPENAI_BUDGET_USD` ถ้าเจ้านายไม่สั่ง
- **บทเรียน:** ถึงข้อ 51 แล้ว (ข้อต่อไปคือ 52)
- **ภาษา:** เจ้านายขอให้ตอบเป็น**ภาษาไทย** (ใช้ศัพท์อังกฤษให้น้อย)
- **ทดสอบ:** เครื่องใน container ช้า (เกมเดิน ~0.5 วินาทีต่อวินาทีจริงตอนบอท speed=8) ใช้ worktree แช่แข็ง (`git worktree add <scratchpad>/after HEAD` + symlink node_modules + vite port อื่น) ตอนวัดสมดุล เพราะ dev server รีโหลดเมื่อแก้โค้ด

## รอบ v7 (25 ต.ค. 2026)
- **รอบ v7 (เจ้านายบอก "พอมีของระดับนึงแล้วเริ่มง่าย" + ขอสกิล/ไอเทมหลากหลายขึ้น + ไม่อยากใช้เครดิต OpenAI ทุกอย่าง)** ทำทั้งหมดด้วยโค้ด **ไม่ใช้ OpenAI ($0)**
  - **อาวุธใหม่ 4** (`config/weapons.ts`, ทำงานใน `game/Weapons.ts`): Prism Beam (ลำแสงทะลุแนว, `fireBeams`), Whirlwind (พายุดูดมอน, `addTwister/updateTwisters/whirl`), Spike Traps (กับดักรอบตัว, `setTrap/updateTraps`), Ward Orbs (ลูกแก้วหมุนใกล้ตัว + บังกระสุน `EnemyManager.blockShots`)
    - วิวัฒนาการ: Rainbow Ray (+Lucky Clover, ลำแสง 4 เส้นหมุนตลอด), Cyclone (+Magnet, พายุ 2 ลูกหมุนรอบตัว), Glacier Mines (+Frost Rune, แช่แข็ง), Aegis (+Iron Shield, สะท้อนกระสุนเป็นลูกเวททอง)
  - **ไอเทมเสริมใหม่ 4:** Lucky Clover (คริ +5%), Iron Shield (เกราะ +1, max 3), Life Spring (ฟื้น 0.3%/วิ), Moon Charm (ระยะเวลาเอฟเฟกต์ +15%: `stats.durationMult` ใช้กับ duration อาวุธ, ไฟ, น้ำแข็ง)
  - **รูนใหม่ 3:** Split (กระสุนแตกเป็นเศษตอนโดนครั้งแรก, `WeaponSystem.splinter`), Echo (โจมตีซ้ำ `fireOnCooldown/rollEcho`), Reaper (ประหารมอนเลือดน้อยใน `EnemyManager.damage`)
  - **น้ำหนักการ์ด** (`core/progression.ts` `NEW_WEIGHT`): ของใหม่แต่ละประเภทแบ่งน้ำหนักรวมกัน เพื่อให้การ์ดอัปเกรดของที่ถืออยู่ไม่หายากขึ้นเมื่อมีของเยอะขึ้น
  - **ไอคอนใหม่ 16 อัน** วาดเป็น SVG ใน `src/art/icons.ts` (ท้ายไฟล์ + `BACKDROPS` พื้นเข้มให้เข้ากับไอคอนวาด); ภาพในเกม `twister`, `trap`, `trap_frost`, `ward`, `ward_holy` ใน `src/art/items.ts`; ลำแสง `beam` เป็น canvas ใน `textures.ts`
  - **มอนหัวกะทิมีพลัง** `config/affixes.ts` (Shielded, Swift, Vampiric, Volatile, Summoner, Blinker): ชื่อบนหัว + วงสีใต้ตัว + ฟองโล่; 1 พลัง, 2 หลัง 8:00, +1 บน Nightmare; โอกาสเกิดอีลีทสูงสุด 6% (`core/waves.ts eliteChance`)
  - **บอสคลั่ง** (`EnemyManager.enrage/enragedAttack`): เลือดต่ำกว่าครึ่ง หรือบอส/หัวหน้าตัวที่ 3 ขึ้นไปคลั่งตั้งแต่ลง; ท่าใหม่ต่อบอส (สไลม์โปรยเมือกวงแดง `strike`, ลิชยิงเกลียว, จอมมารยิงไฟรอบทิศ, หมูป่ากระทืบ, กัปตันยิงพัด, ยักษ์ทุบแล้วกระสุนรอบทิศ)
  - **คำสาป** `config/curses.ts` + `CursesScene` (ปุ่มกะโหลกม่วงข้าง PLAY เปิดเมื่อ `unlockedMaps >= 2`): 8 แบบ, Heat รวมสูงสุด 11, เหรียญ +15%/Heat; เซฟ `curses`, `bestHeat`; ความสำเร็จ Curse Breaker (heat 2/5/8/11); หน้าจบเกมแสดง Heat
  - สวิตช์ทดสอบใหม่: `?curses=horde,tyrant`, `?give=beam5,twister5,traps5,ward5` หรือ `rainbow,cyclone,glacier,aegis`, รูน `split2,echo3,reaper1`
- **รอเจ้านาย:** ลองเล่น v7 แล้วบอกว่ายังง่าย/จำเจไหม และจะให้ขึ้นลิงก์หลักเมื่อไร
- **ไอเดียถัดไป (ยังไม่ได้ทำ):** ปุ่มพุ่งหลบ + ท่าไม้ตาย, ตัวละครที่ 3 (สายประชิด), Talent tree ต่อตัวละคร, อันตรายบนแมพ (เช่น วงไฟ/มือโผล่จากดิน), โหมดไม่มีที่สิ้นสุดหลัง 15:00
- **ของชั่วคราวใน container (หายได้):** dev server `npx vite --port 5181`, สคริปต์ทดสอบ `scratchpad/v7/*.cjs` (weap, scene, menu, balance, artifact) และ `scratchpad/q/*.cjs`
- **งบ OpenAI:** ใช้ไป **$3.53 จาก $5** (เหลือ $1.47) ตาม `art/openai-log.jsonl` (รอบ v7 ไม่ได้ใช้)
  - ⚠️ commit log ทุกครั้งหลังวาด แล้วบอกเจ้านายว่าใช้ไป/เหลือเท่าไร; ห้ามเพิ่ม `OPENAI_BUDGET_USD` ถ้าเจ้านายไม่สั่ง
- **บทเรียน:** ถึงข้อ 50 แล้ว (ข้อต่อไปคือ 51)
- **ภาษา:** เจ้านายขอให้ตอบเป็น**ภาษาไทย** (ใช้ศัพท์อังกฤษให้น้อย)
- **รอบ v6 (เจ้านายลองเล่น v5 แล้วติ 6 ข้อ + "เล่น 4-5 ตาก็เบื่อ อยากให้มีความลึก")** เจ้านายเลือก 3 ชุด: สกิลเปลี่ยนวิธียิง, แต่ละรอบไม่ซ้ำ, เป้าหมายระยะยาว (ไม่เลือก dash/ท่าไม้ตาย)
  - **แก้ 6 ข้อ:** ลูกเวทกลับด้าน (ภาพวาดหันซ้าย → `flip` ใน `mr-sheets.json`), นักเวทได้การ์ด Bow (อาวุธประจำตัวละครเป็นของตัวนั้นเท่านั้น `Inventory.banned`), เอฟเฟกต์ร่ายเวท `fx.cast` + ประกายที่ลูกเวท, Spell Tome ทำให้กระสุนใหญ่ขึ้นจริง, กดการ์ดแล้วเลื่อนนิ้วออก = ยกเลิก, กระสุนมอนสีแดงชมพู + วงแสงแดง
  - **รูน 6 แบบ** (`RUNES`, `RUNE_POWER` ใน `config/weapons.ts`; ทำงานใน `EnemyManager.runeProcs/kill`, ลูกเด้งใน `WeaponSystem.bounce`) ช่องรูน 3, ปุ่ม Reroll/Banish (shop `reroll`, `banish`), ร่างวิวัฒนาการใหม่ 5 แบบที่ต้องใช้รูน (thunder, meteor, twinmoon, flameslash, plague)
  - **เหตุการณ์สุ่ม** `game/RunEvents.ts` + `config/events.ts` + `ShrineScene` (พร 3 แบบ, คำสาป 3 แบบ), ก็อบลิน behavior `flee`, ตัวนับเวลาและลูกศรใน HUD; **บอสนาที 15:00 = บอสสุดท้าย** ชนะแล้ว STAGE CLEAR
  - **ความยาก** `config/difficulty.ts` (Normal/Hard/Nightmare, ปุ่มบนการ์ดแมพ, เซฟ `clears`, `difficulty`) และ **เครื่องราง 6 ชิ้น** `config/relics.ts` + `RelicsScene` (ใส่ได้ 2, เซฟ `relics`, `equipped`); ความสำเร็จ Champion
  - ภาพใหม่: `icons3` (รูน 6 + ร่างวิวัฒนาการ 5 + อุกกาบาต), `relics` (เครื่องราง 6, เหรียญทอง, แท่นบูชา, ก็อบลิน, สัญลักษณ์ Hard/Nightmare)
- **เฟสก่อนหน้า (เสร็จแล้ว):** ภารกิจรายวัน/ความสำเร็จ, ตัวละคร Little Mage (600 เหรียญ), อาวุธใหม่ 4 + วิวัฒนาการ 2, มอนใหม่ 6 + หัวหน้า 3
- **สมดุล (บอท `?bot&speed=8`, ไม่มีอัปเกรด):** Meadow รอด 7 นาทีเหมือนเดิม; Castle ตาย ~30 วิ ทั้งเก่าและใหม่ (แมพนี้ต้องอัปเกรดก่อน); Graveyard ตอนแรกยากขึ้นมาก (ตาย 2:41-3:24 เทียบเดิม 6:35+) → ลดแรงระเบิดฟักทอง/ลูกวิญญาณ, ฟิวส์ 0.8 วิ, Wraith มาที่ 2:30 น้อยลงและยิงทุก 3.8 วิ → บอทรอดถึง 5:45 (ตายตอนบอส Lich; seed 21) ใกล้ของเดิมแล้ว
- **สวิตช์ทดสอบใหม่:** `?give=slash5,flask3,starfall,burn2`, `?hero=mage`, `?event=shrine`, `?difficulty=1&relics=boar,demon`
- **ข้อสังเกตจอมเวท (ไม่ร้ายแรง):** รองเท้าชี้ตรงทั้งคู่, แขนข้างร่ายถูกยืด ~16% ตอนพุ่ง, ท่า KO ไม้เท้าพาดตัว, ปลายหมวกแกว่งได้แค่ ~10°
- **งบ OpenAI:** ใช้ไป **$3.53 จาก $5** (เหลือ $1.47) ตาม `art/openai-log.jsonl`
  - ⚠️ commit log ทุกครั้งหลังวาด แล้วบอกเจ้านายว่าใช้ไป/เหลือเท่าไร
  - ห้ามเพิ่ม `OPENAI_BUDGET_USD` ถ้าเจ้านายไม่สั่ง
- **บทเรียน:** ถึงข้อ 49 แล้ว (ข้อต่อไปคือ 50)
- **ภาษา:** เจ้านายขอให้ตอบเป็น**ภาษาไทย** (ใช้ศัพท์อังกฤษให้น้อย)
- **ตัวละครหลัก (ใหม่) ทำอย่างไร / แก้ต่ออย่างไร**
  - ภาพต้นฉบับ: `art/incoming/mr/hero_{concepts,master,rigpose,head_faces,parts_body,hands_props}.png`, prompt `art/prompts/mr_hero_*.txt`
  - puppet id `archer` ใช้โครงกระดูก 17 ชิ้นเดิมของฮีโร่ Sky Pirates (ขนนก = `hoodTip`, ผ้าคลุม = `capelet` ผ่าตัวคอเสื้อ+ตัวผ้า)
  - เครื่องมือ bake ทั้งชุด (config ตัดภาพ, rig, clips `archer.ts`, หน้า bake, สคริปต์) เก็บใน `scripts/art/hero-bake/`
    - ใช้งาน: worktree ของ `sky-pirates-td` แล้ว `cp -r scripts/art/hero-bake/{dev,src,scripts,art} <worktree>/` ตาม README ในโฟลเดอร์นั้น
    - worktree เก่า `scratchpad/sp` จะหายเมื่อ container ถูกเก็บ
  - ผล bake: `art/baked/hero/hero.png` (256px, 76 เฟรม: idle 16, run 8, runaim 8, runrelease 8, shoot 8, hurt 6, ko 10, cheer 12) → เกมใช้ `public/art/hero/hero.webp` 192px + `hero.json` (feet [96,177])
    - แปลง: sharp resize 1536×1920 + webp q92
  - ภาพเมนู `public/art/hero/hero_menu.webp` ตัดจาก master (ล้างช่องพื้นเทาที่ปิดล้อมระหว่างสายธนู 3 ช่องด้วย flood fill)
  - ฮีโร่อนิเมะเก่าเก็บไว้ที่ `art/baked/hero_anime/`

## ประวัติ Monster Rush (เฟส 1-2 และรอบแก้)
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
  - บอสตกลง**ครึ่งล่างของจอ** (560 px ใต้ฮีโร่) เพราะครึ่งบนมีแถบเลือดบอสของ HUD บัง
  - **สถานะ: เสร็จ รอเจ้านายลองเล่น** (Artifact เดิม https://claude.ai/artifact/QxsbsoUHeKfnr19kQw6TBH) ยังไม่ deploy ขึ้นลิงก์หลัก (ลิงก์หลักยังเป็น Monster Rush ภาพเวกเตอร์เดิม)
- **รอบแก้หลังลองเล่น (24 ต.ค. บ่าย):** เจ้านายขอ 3 ข้อ ทำครบแล้ว
  1. วิ่งไปยิงไป: hero sheet มี `run` (ธนูต่ำ), `runaim` (ง้าง), `runrelease` (ปล่อย) ที่ขาเหมือนกันทุกเฟรม; `Player.ts` สลับที่ frame เดียวกัน (`playStride`), ตอนยิงจริงเปลี่ยนเป็น runrelease 0.19 วิแล้วกลับ runaim; หันหน้าไปทางเป้า; ลูกธนูออกจาก `bowPoint()`
  2. ออกแบบตัวละครหลักใหม่: แบบ B "Feather Cap" (หมวกแดงขนนก ผ้าคลุมน้ำเงิน) เพิ่มดีเทล/เท็กเจอร์ — ภาพ `art/incoming/mr/hero_{concepts,master,rigpose,head_faces,parts_body,hands_props}.png`; puppet id `archer` บนโครงกระดูกเดิม (ใน worktree sky-pirates-td) bake เป็น `art/baked/hero/` (256px, 76 เฟรม) → `public/art/hero/hero.webp` (192px) ; ภาพเมนูตัดจาก master; ฮีโร่อนิเมะเดิมเก็บที่ `art/baked/hero_anime/`
  3. ปุ่มเดินอยู่กับที่ กลางล่างจอ (`HudScene`, แตะห่างจากปุ่มไม่เกิน 250px ถึงจะจับ)
  - งบ OpenAI: $2.11 จาก $5
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
