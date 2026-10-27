# Ricco Rush

เกมแนว survivor บนมือถือ ธีมแฟนตาซีแบบ MMORPG เกาหลียุค 2000 เลือกเล่น 3 อาชีพ (Swordman, Archer, Mage) เอาตัวรอดจากฝูงมอน เก็บ EXP มาเลือกสกิลของอาชีพตัวเอง ล้มบอส MVP และปลดล็อกแมพใหม่

> **กำลังเปลี่ยนธีม (ต.ค. 2026):** ชื่อและระบบเปลี่ยนเป็นแบบ Ricco Rush แล้ว แต่ภาพยังเป็นภาพชุดเดิม (Little Archer: Monster Rush) จนกว่าภาพใหม่จาก Gemini จะครบ
> - Swordman ใช้ภาพ Archer โทนเหล็กไปก่อน
> - แผนและรายการภาพ: `docs/art/RICCO_RUSH_BRIEF.md`
> - เกมเดิมคือ commit `b94b926`

**ลิงก์หลัก: https://little-archer.vercel.app** (ยังเป็นเกมเดิม v11 จนกว่าจะสั่งขึ้นเวอร์ชันใหม่)

---

## วิธีเล่น

| เรื่อง | รายละเอียด |
|---|---|
| เดิน | ปุ่มเดินอยู่กลางด้านล่างของจอ แตะที่ปุ่ม (หรือใกล้ ๆ) แล้วลากนิ้วไปทางที่อยากเดิน ปุ่มไม่ขยับตามนิ้ว |
| โจมตี | ฮีโร่ใช้สกิลเองอัตโนมัติ ไม่ต้องกดอะไร ชื่อสกิลเด้งเหนือหัวตอนได้สกิลใหม่ วิวัฒนาการ พุ่ง และใช้ท่าไม้ตาย |
| พุ่ง | ปุ่มกลมสีฟ้าขวาของปุ่มเดิน (หรือ Space): ใช้ได้ทุก 4 วินาที และระหว่างพุ่งไม่โดนตี<br>• Swordman = Shield Charge (พุ่งชนดันมอน)<br>• Archer = Back Slide<br>• Mage = Teleport |
| ท่าไม้ตาย | ปุ่มกลมสีส้มซ้ายของปุ่มเดิน (หรือ E): ชาร์จจากการล้มมอน<br>• Swordman = Berserk (ตัวแดง ดาเมจ ×2 และฟันรอบตัว 6 วินาที)<br>• Archer = Arrow Storm<br>• Mage = Meteor Storm<br>บอสในจอเสียเลือด 6% ทันที |
| เลเวล | Base Lv คือเลเวลในรอบ (เก็บคริสตัล EXP แล้วเลือกการ์ด 1 จาก 3) ส่วน Job Lv คือเลเวลถาวรของอาชีพ |
| บอส | หัวหน้าโผล่นาที 2:30, 7:30 ... และบอส **MVP** มาทุก 5 นาที (มีป้าย "MVP!") ล้มได้หีบสมบัติ |
| ปลดล็อกแมพ | ล้มบอส MVP ตัวแรกของแมพไหน แมพถัดไปจะเปิด |
| จบรอบ | เล่นไปจนตาย เงิน (Gold) ที่เก็บได้ไม่หาย เอาไปซื้ออัปเกรดถาวรที่ Shop |
| ภารกิจรายวัน | ปุ่ม Quests ในเมนู: วันละ 3 ภารกิจ และมีโบนัสเมื่อทำครบ |
| สุ่มการ์ด/ตัดการ์ด | หน้าเลเวลอัปมี Reroll และ Banish รอบละ 1 ครั้ง (ซื้อเพิ่มได้ใน Shop) |
| การ์ดมอน | ใส่ได้ 3 ใบ ใบละ 3 ขั้น เปลี่ยนวิธีที่ทุกสกิลทำงาน เช่น Dust Imp Card (ไฟติด), Talisman Ghoul Card (แช่แข็ง), Foxfire Kit Card (สายฟ้ากระโดด), Gummy Card (ดูดเลือด) |
| MVP Card | ผ่านแต่ละแมพบน Normal / Hard ได้ 6 ใบ ใส่ได้ 2 ใบ (ปุ่ม Gear → MVP Cards) |
| อุปกรณ์ | ปุ่ม Gear: 4 ช่อง<br>• Headgear (ดาเมจ)<br>• Armor (เลือด)<br>• Garment (ตีเร็ว)<br>• Shoes (เดินเร็ว)<br>ความหายาก 5 ระดับ ตีบวก (Refine) ด้วย Gold ได้ และรวม 3 ชิ้นระดับเดียวกันเป็นระดับถัดไปได้ |
| สมุดสะสม | ปุ่มหนังสือข้าง PLAY: แต่ละอาชีพเริ่มมีสกิล 4 อัน อีก 3 อันปลดตามแมพ (เช่น ล้ม Capshroom 600 ตัว → Pierce) และยังมีไอเทม การ์ด และสมุดมอน |
| Job Lv | อาชีพละ Lv 1-15 ได้ Job EXP จากการเล่นอาชีพนั้น<br>• ทุกเลเวล: ดาเมจและเลือด +2%<br>• Lv 3, 7, 11: พรสวรรค์ใหม่<br>• Lv 5: Reroll เพิ่ม<br>• Lv 9: Banish เพิ่ม<br>• Lv 13: สกิลเริ่มสูงขึ้น 1 ขั้น<br>• Lv 15: ฉายา Master |
| ความยาก / คำสาป / อีลีท | เหมือนเดิม: Hard และ Nightmare, คำสาปแลก Gold เพิ่ม, มอนสีทองมีพลังพิเศษ |
| หยุดเกม | ปุ่มมุมขวาบน |

### อาชีพ
- เลือกได้ทุกอาชีพตั้งแต่แรก (ลูกศรซ้าย/ขวาในเมนู)
- แต่ละอาชีพเลือกได้เฉพาะสกิลของตัวเอง 7 สกิล
- ที่ Base Lv 5, 10, 15, 20, 25 ได้การ์ดพรสวรรค์แถม

| อาชีพ | สกิลเริ่ม | ข้อดี | ข้อเสีย | พรสวรรค์ (ตัวอย่าง) |
|---|---|---|---|---|
| Swordman (Vanguard) | Slash | เลือด +30%, เกราะ +1, Bash ทำให้มอนมึน | ระยะประชิด ช้าลงนิด | Sword Mastery, Endure, HP Recovery, Two-Hand Quicken, Guts |
| Archer (Ranger) | Arrow Shot | เร็ว, คริ +5%, ยิงเร็วขึ้นตอนวิ่ง | วงโจมตี -10% | Owl's Eye, Vulture's Eye, Wind Walk, Hunter's Mark |
| Mage (Arcanist) | Soul Strike | วงโจมตี +20%, ร่ายเร็ว, Safety Wall กันได้ 1 ครั้ง | เลือด -20% | Double Casting, Pyromancy, Energy Coat, Starcaller |

### แมพ
| แมพ | มอนสเตอร์ | หัวหน้า | บอส MVP |
|---|---|---|---|
| 1 **Greenhill Fields** | Gummy, Fluffbun, Capshroom, Fuzzpuff (ตายแล้วแตกเป็น 2 ตัว), ฝูง Buzzer | Ironhide Boar (พุ่งชน) | Jelly Monarch |
| 2 **Lantern Pines** | Greyfang, Lantern Ghost, Talisman Ghoul, Bomb Acorn (วิ่งมาระเบิด), Foxfire Kit (ยิงไฟผี) | Bigpaw | Shrine Oni |
| 3 **Sunscar Desert** | Dust Imp (ยิงไฟ), Wrapped One, Stingtail (พุ่ง), Treasure Urn (แกล้งเป็นสมบัติ), ฝูง Gold Scarab | Sandstone Golem (ทุบพื้น) | Sunscar Pharaoh |

- Coin Thief วิ่งหนีพร้อมถุงสมบัติได้ทุกแมพ

### สกิลและสกิลอาชีพ 2
- **การถือของ:** สกิลได้ 4 อัน ไอเทมเสริมได้ 4 ชิ้น
- **อัปสกิล:** ได้สูงสุด Lv5
- **วิวัฒนาการ:** ถ้าสกิลถึง Lv5 และมีไอเทม/การ์ดคู่กัน เปิดหีบบอสครั้งถัดไปสกิลจะกลายเป็นสกิลอาชีพ 2

| อาชีพ | สกิล → สกิลอาชีพ 2 |
|---|---|
| Swordman | Slash → Bowling Bash, Bash → Aura Blade, Magnum Break → Grand Cross, Provoke → Devotion, Pierce → Spiral Pierce, Auto Guard → Shield Reflect, Brandish → Clashing Spiral |
| Archer | Arrow Shot → Sharp Shooting, Double Strafe → Arrow Vulcan, Arrow Shower → Arrow Rain, Charge Arrow → Phantasmic Arrow, Ankle Snare → Shockwave Trap, Land Mine → Freezing Trap, Blitz Beat → Falcon Assault |
| Mage | Soul Strike → Napalm Vulcan, Fire Bolt → Fire Pillar, Cold Bolt → Storm Gust, Lightning Bolt → Lord of Vermilion, Fire Ball → Sightrasher, Fire Wall → Volcano, Frost Diver → Frost Nova |

- **ไอเทมเสริม:**
  - ค่าสถานะ: STR (ดาเมจ), AGI (ตีเร็ว), VIT (เลือด), INT (วงโจมตี), DEX (+กระสุน), LUK (คริ)
  - Wind Shoes, Lodestone, Buckler, Healing Herb, Moon Pendant, Scholar's Glasses, Berserk Potion, Spiked Mail, Slayer Ring, Yggdrasil Leaf (ฟื้นชีพ)

**เหรียญ:** มอนยิ่งเยอะ เหรียญยิ่งดรอปยาก (เหรียญเข้ามาสม่ำเสมอตลอดรอบ ไม่พุ่งตอนท้าย), โบนัสจบรอบให้ตามเวลาที่รอดมากกว่าจำนวนที่ฆ่า, ของในร้านแต่ละเลเวลแพงขึ้น 60%, ตอนเก็บของครบแล้วการ์ดเลเวลอัปจะเป็นพลัง +4% / เลือด +5% แทนเหรียญ

---

## เคล็ดลับสำหรับ iPhone

- **ให้เป็นแอปเต็มจอ:** เปิดลิงก์ใน Safari → กดปุ่ม Share → **Add to Home Screen** จะได้ไอคอนเกมบนหน้าจอ และเปิดแบบเต็มจอ
- **ไม่ได้ยินเสียง?** เช็กสวิตช์เงียบข้างเครื่อง (Silent mode) ถ้าเปิดอยู่ iPhone จะปิดเสียงเกมในเว็บ และต้องแตะจอ 1 ครั้งก่อน เสียงถึงจะเริ่มเล่น
- เปิด/ปิดเพลงและเสียงเอฟเฟกต์แยกกันได้ที่ปุ่มมุมซ้ายบนของเมนู หรือในหน้าหยุดเกม
- ความคืบหน้า (เงิน, อัปเกรด, แมพที่ปลดล็อก, สถิติเวลา) เก็บไว้ในเครื่องที่เล่น ถ้าล้างข้อมูล Safari จะหาย

---

## อยากปรับเกม? สั่ง Claude Code ได้เลย

ไม่ต้องแก้โค้ดเอง พิมพ์บอก Claude Code เป็นภาษาธรรมดาได้ เช่น

- "ศัตรูเยอะไป ลดจำนวนที่เกิดลงหน่อย"
- "เพิ่มเลือดเริ่มต้นของฮีโร่เป็น 150"
- "ให้บอสโผล่ทุก 3 นาทีแทน 5 นาที"
- "ราคาอัปเกรดในร้านแพงไป ลดลงครึ่งหนึ่ง"
- "เพิ่มอาวุธใหม่: ลูกไฟที่ยิงวนเป็นเกลียว"

ตัวเลขสมดุลทั้งหมดรวมอยู่ในไม่กี่ไฟล์ Claude จะหาเจอเอง:

| ไฟล์ | เก็บอะไร |
|---|---|
| `src/config/game.ts` | ค่าพื้นฐานฮีโร่ (เลือด, ความเร็ว, ระยะดูดของ), เวลาบอส, จำนวนศัตรูสูงสุด, มูลค่าเหรียญ |
| `src/config/weapons.ts` | ดาเมจ/คูลดาวน์ของอาวุธแต่ละเลเวล, ไอเทมเสริม, การวิวัฒนาการ |
| `src/config/enemies.ts` | เลือด/ความเร็ว/ดาเมจของศัตรูและบอส |
| `src/config/shop.ts` | อัปเกรดถาวรและราคา |
| `src/config/characters.ts` | ตัวละครให้เลือก: อาวุธเริ่ม, ราคา, ตัวคูณเลือด/วงโจมตี |
| `src/config/events.ts` | เหตุการณ์สุ่ม, พร/คำสาปของแท่นบูชา, เวลาบอสสุดท้าย |
| `src/config/difficulty.ts`, `src/config/relics.ts` | ความยากแต่ละระดับ และเครื่องราง |
| `src/config/affixes.ts` | พลังพิเศษของมอนหัวกะทิ (ความแรง, ระยะ, เวลา) และจำนวนพลังตามเวลา/ความยาก |
| `src/config/curses.ts` | คำสาป 8 แบบ, ค่า Heat และเหรียญที่เพิ่มต่อ Heat |
| `src/config/talents.ts` | พรสวรรค์ของแต่ละฮีโร่ เลเวลที่ได้เลือก และความแรง |
| `src/config/abilities.ts` | ปุ่มพุ่งหลบ (คูลดาวน์ ระยะ) และท่าไม้ตาย (พลังที่ต้องชาร์จ ดาเมจ ระยะเวลา) |
| `src/config/gear.ts` | อุปกรณ์: ช่อง ชนิด ความหายาก ค่าพลัง ราคาหีบ โอกาสดรอป ขนาดกระเป๋า |
| `src/config/collection.ts` | ของที่ล็อกไว้และเงื่อนไขปลดล็อก (`UNLOCKS`), รายชื่อมอนในสมุดสะสม |
| `src/config/mastery.ts` | ระดับฮีโร่: XP ต่อเลเวล, XP ที่ได้ต่อรอบ, ของที่ได้แต่ละเลเวล |
| `src/config/maps.ts` | มอนแต่ละแมพ, มอนเสริม (`extras`), ฝูง (`swarm`), หัวหน้า (`leader`) |
| `src/config/quests.ts` | ภารกิจรายวัน (เป้าหมาย/รางวัลตามจำนวนแมพที่ปลดล็อก) และความสำเร็จ (ขั้นและรางวัล) |
| `src/core/waves.ts` | ความยากที่เพิ่มขึ้นตามเวลา (เลือดศัตรู, อัตราเกิด, ช่วง "คลั่ง" หลังนาทีที่ 8) |
| `src/core/progression.ts` | XP ที่ต้องใช้ต่อเลเวล และการสุ่มการ์ดอัปเกรด |

ทุกครั้งที่ Claude push โค้ดใหม่ขึ้น GitHub แล้ว deploy ลิงก์ด้านบนจะอัปเดตตาม

---

## สำหรับนักพัฒนา

เทคโนโลยี: Phaser 3 + TypeScript + Vite (เป็นเว็บล้วน ไม่มี server) ภาพหลักเป็นภาพวาด (WebP ใน `public/art/`) ส่วนที่ยังไม่มีภาพวาดใช้ SVG ที่เขียนในโค้ดแทน

```bash
npm install
npm run dev          # เปิดเกมที่ http://localhost:5173
npm run build        # typecheck + build ไปที่ dist/
npm test             # unit tests (Vitest)
PW_CHROMIUM=/path/to/chromium npm run test:e2e   # smoke test บนจอ iPhone จำลอง (Playwright)
```

**สวิตช์ทดสอบใน URL** (ใส่ต่อท้ายลิงก์):

| สวิตช์ | ผล |
|---|---|
| `?autostart&map=2` | ข้ามเมนู เข้าแมพที่ 2 ทันที |
| `?autostart&time=290` | เริ่มที่นาที 4:50 (ใกล้บอส) |
| `?god` | ไม่ตาย |
| `?bot&speed=8` | ให้บอทเล่นเอง เร่งความเร็ว 8 เท่า (ใช้ปรับสมดุล) |
| `?bot&skill=0.5` | บอทหลบช้าลงครึ่งหนึ่ง (แทนผู้เล่นที่หลบไม่ทัน ใช้วัดความยาก; 0 = ยืนนิ่ง) |
| `?level=15` | เริ่มที่เลเวล 15 (สุ่มอัปเกรดให้) |
| `?gold=1000&unlock` | ตั้งเงิน และปลดล็อกทุกแมพ + อาวุธ/ไอเทม/รูนทุกชิ้นในสมุดสะสม |
| `?mastery=15` | ฮีโร่ทุกตัวเป็นระดับ Mastery นี้ |
| `?debug` | แสดง FPS และจำนวนศัตรู |
| `?give=slash5,flask3,starfall` | เริ่มพร้อมอาวุธที่ระบุ (เลขท้าย = เลเวล; ชื่อร่างวิวัฒนาการ = ได้ร่างนั้นเลย) |
| `?hero=mage` | เล่นเป็นตัวละครนี้โดยไม่ต้องปลดล็อก |
| `?give=burn2,chain3` | (ใน give) ชื่อรูน + เลขขั้น |
| `?event=shrine` | เริ่มเหตุการณ์นี้ทันที (shrine, goblin, meteors, elites, golden) |
| `?difficulty=1&relics=boar,demon` | เล่นด้วยความยาก 0/1/2 และใส่เครื่องรางที่ระบุ |
| `?curses=horde,tyrant` | เล่นด้วยคำสาปที่ระบุ (ไม่ต้องปลดล็อก) |
| `?give=shuriken5,quake5,firetrail5,turret5` | อาวุธใหม่ชุดล่าสุด (หรือ `starstorm,earthquake,inferno,ballista,lance,soulharvest`) |

สคริปต์ช่วย:
- `scripts/sim.mjs` ให้บอทเล่นแล้วรายงานเวลารอด/เลเวล/บอส (ใช้ปรับความยาก)
- `scripts/shot.mjs` ถ่ายภาพหน้าจอเกมบน iPhone จำลอง
- `scripts/art-sheet.mjs` + `art.html` ดูภาพ SVG ทั้งหมดในหน้าเดียว
- `scripts/make-icons.mjs` สร้างไอคอนแอปจากภาพฮีโร่
- `scripts/build-artifact.mjs` build เป็นไฟล์ HTML ไฟล์เดียว (ไม่มีเสียง, ฝังภาพใน `public/art/` ไว้ด้วย) สำหรับแชร์แบบ artifact

**งานภาพ** (ลุคเกม MMORPG เกาหลียุค 2000 ออกแบบใหม่ทั้งหมด):
- `npm run art:openai -- <out.png> --prompt <file> --ref <ภาพ>` สั่ง OpenAI วาด 1 ภาพ (key เก็บเป็น network secret ของ environment; มีเพดานงบใน `art/openai-log.jsonl`)
- prompt อยู่ใน `art/prompts/mr_*.txt`, ภาพต้นฉบับใน `art/incoming/mr/`, ภาพต้นแบบลุค `art/incoming/mr/look_mockup.png`
- `npm run art:cut` ตัดแผ่นภาพเป็น texture ขนาดเกม ตาม `scripts/art/mr-sheets.json` → `public/art/<key>.webp` + `src/art/manifest.json`
- ฮีโร่เป็น sprite sheet ที่ bake จาก puppet ของโปรเจกต์ Sky Pirates (`scripts/art/hero-bake/`); ภาพตัวละครในเมนูตัดจากภาพ master ด้วย `npx tsx scripts/art/menu-still.ts <master.png> <out.webp>`

---

## เครดิต

- **ภาพ:** ภาพวาดสร้างด้วย OpenAI image model ตาม prompt ของเกมนี้ (ออกแบบใหม่ทั้งหมด ไม่ใช้ตัวละครของเกมอื่น) และภาพ vector (SVG) ที่ Claude วาดในโค้ด (ดู `docs/ART-STYLE.md`)
- **ฟอนต์:** Fredoka (SIL Open Font License) ผ่าน @fontsource
- **เสียงและเพลง:** CC0 จาก Kenney.nl และ OpenGameArt.org รายละเอียดทุกไฟล์อยู่ใน `docs/AUDIO-CREDITS.md`
  - เพลงแมพสุสาน: "Waltz of the Ghosts" by Aureolus_Omicron, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/) ตัดเป็น loop และปรับระดับเสียง
  - เพลงเมนูและแมพปราสาท: "Town Theme RPG" และ "Battle Theme A" by cynicmusic (cynicmusic.com), CC0
  - เพลงแมพทุ่งหญ้า: "Sunflower Valley" by isaiah658, CC0
