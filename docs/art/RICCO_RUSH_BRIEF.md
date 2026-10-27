# Ricco Rush: เอกสารออกแบบ (Design bible)

> เกม survivor แนวตั้งเดิม (Little Archer: Monster Rush v11) เปลี่ยนธีมเป็นแฟนตาซีแบบ MMORPG เกาหลียุค 2000 (ความรู้สึกแบบ RO classic PC) เริ่ม 3 อาชีพ
> ภาพทั้งหมดเจ้านายวาดด้วย Gemini จาก prompt หลัก 5 อัน (`art/prompts/rr_1_heroes.txt` … `rr_5_icons.txt`) แล้วแปะกลับมาในแชต

## กติกาลิขสิทธิ์ (ใช้กับทุกชิ้น)
- **ใช้ได้:** ระบบและคำเรียกทั่วไปแบบเกมแนวนี้
  - Base Lv / Job Lv, STR AGI VIT INT DEX LUK
  - การ์ดมอน, MVP, ตีบวก +N, ยาแดง/ส้ม/ขาว, ประตูวาร์ป
  - ชื่อสกิลที่คุ้นหู (Bash, Fire Bolt, Double Strafe …)
- **ห้ามใช้:** ชื่อเกม RO, ชื่อหรือหน้าตามอน/NPC/เมืองจริง (Poring, Lunatic, Baphomet, Prontera, Payon, Morroc, Zeny, Kafra …), เพลง, โลโก้
  - ใน prompt ของ Gemini ห้ามเอ่ยชื่อเกม RO
  - ทุกตัวละคร มอน แมพ และไอเทม เป็นแบบของเราเอง
- **เงินในเกม:** เรียกว่า Gold (ไม่ใช้ Zeny)

## สไตล์ภาพ (ปรับ 27 ต.ค. หลังเจ้านายบอกว่าภาพ Gemini "ไม่เหมือน RO เลย")
- **สาเหตุ:** prompt รุ่นแรกสั่งให้ "เลียนสไตล์ภาพอ้างอิงเป๊ะ" ซึ่งเป็นภาพเกมเดิม (ชิบิมือถือยุคใหม่) และเขียนว่า "chunky chibi, modern quality" Gemini จึงวาดออกมาเป็นการ์ตูนมือถือ
- **ตอนนี้:** บรรยายลุคเกมออนไลน์แฟนตาซีเกาหลียุคปลาย 90 เป็นคำพูดแทน (ไม่เอ่ยชื่อเกม) และ**ไม่แนบภาพอ้างอิงแล้ว**
  - **ภาพรวม:** สไปรต์ 2D แบบวาดทีละพิกเซลที่ทำใหม่ให้ละเอียด (เรียบ ไม่เป็นบล็อก) เดินบนแมพ 3D ทาสีมือ มองจากมุมเฉียงราว 45 องศา
  - **สัดส่วน:** ตัวสูงราว 3 หัว หัวโตแต่ตัวและขาเรียว มือเท้าเล็ก ผมแหลมแบบมังฮวา ตาอัลมอนด์ จมูกเล็กแหลม (ไม่ใช่ชิบิตัวกลมป้อม)
  - **การลงสี:** แรเงา 3-4 ระดับ มีลายเม็ดสีนิด ๆ เส้นขอบบางเป็นสีเข้มของสีนั้น ๆ ไม่ใช้เส้นดำหนา ไม่มันวาว
  - **สี:** หม่นนุ่ม เช่น กรมท่าอมเทา ฟ้าหินชนวน กากี น้ำตาลหนัง งาช้าง เขียวมอส แดงเลือดหมู ทองเหลืองเก่า
  - **มอน:** ทรงกลมเรียบ ตาโตมันวาว ปากเล็ก
  - **พื้นและของประกอบ:** พื้นนุ่มแบบทาสีมือ คอนทราสต์ต่ำ ของประกอบเหมือนโมเดล 3D ง่าย ๆ ทาสีมือ
  - **ไอคอน:** แบบไอคอนช่องเก็บของยุคเก่า วาดเฉพาะตัววัตถุ ไม่มีกรอบหรือพื้นหลัง (หน้า Mage ใช้พื้นเขียว ที่เหลือพื้นชมพูม่วง)
- **ห้องที่เปิดไปแล้ว:** ต้องเปิดแชตใหม่ เพราะแชตเดิมจำสไตล์เก่า
- `art/prompts/ref/rr_style_reference.jpg` เลิกใช้แล้ว (เก็บไว้ดูย้อนหลัง)

## อาชีพ 3 อาชีพ
- **กติกาข้าง:** ในมุมหันขวา แขนขวาของฮีโร่คือแขนใกล้กล้อง

| | Swordman (ใหม่) | Archer | Mage |
|---|---|---|---|
| หน้าตา | เด็กชาย ~12, ผมน้ำตาลแดงชี้, ผ้าคาดหัวกรมท่ามีหาง 2 เส้น, พลาสเตอร์ที่แก้ม | เด็กหญิง ~11, ผมน้ำตาลแดงมัดหางม้าสูงมีขนนกขาว, ตาเขียว, กระ | เด็กชาย ~11, ผมเงินอมฟ้า, หมวกพ่อมดม่วงปีกกว้างมีดาวทอง 3 ดวง |
| ชุด | เกราะอกเหล็กบนทูนิคน้ำเงิน, บ่าเหล็กข้างขวา, ถุงมือหนัง, รองเท้าหุ้มเหล็ก | เสื้อกั๊กหนังเขียวป่าบนเสื้อเชิ้ตครีมแขนพอง, ปลอกแขนซ้าย, ถุงมือขวา, กระโปรงหนังสั้น, บูทยาว | เสื้อคลุมม่วงยาวเหนือเข่าขอบทอง, ผ้าพันคอแดงยาว, สมุดเวทห้อยเอว |
| อาวุธ | ดาบสั้นกว้าง (มือขวา) + โล่กลมไม้ขอบเหล็กสีน้ำเงินมีดาวทอง 4 แฉก (แขนซ้าย) | ธนูยาวไม้ปลายทองเหลือง (มือซ้าย) + กระบอกธนู | คทาไม้ปลายม้วนจับอัญมณีแดง (มือซ้าย) |
| พื้นหลังภาพวาด | ชมพูม่วง #FF00FF | ชมพูม่วง #FF00FF | เขียว #00FF00 |
| ข้อดี | HP +30%, เกราะ +1, Endure (ไม่โดนกระเด็น) | เร็ว, คริ +5%, ยิงเร็วขึ้นตอนวิ่ง | วงโจมตีใหญ่, ร่ายเร็ว, Safety Wall กัน 1 ครั้ง |
| ข้อเสีย | ระยะสั้น ช้ากว่านิด | HP น้อยกว่า Swordman | HP น้อยสุด |

### สกิล: สกิลเริ่ม + 6 สกิลอาชีพ แต่ละอันวิวัฒนาการเป็นสกิลอาชีพ 2
- กลไกยืมจากอาวุธเดิมใน `config/weapons.ts`
- สกิลเลือกได้เฉพาะอาชีพเจ้าของ (`owner` + `Inventory.banned`)

| # | Swordman (กลไกเดิม) → อาชีพ 2 | Archer (กลไกเดิม) → อาชีพ 2 | Mage (กลไกเดิม) → อาชีพ 2 |
|---|---|---|---|
| เริ่ม | Slash (slash) → Bowling Bash | Arrow Shot (bow) → Sharp Shooting | Soul Strike (bolt) → Napalm Vulcan |
| 2 | Bash (`bash` ใหม่: ฟาดเป้าใกล้สุด + มึน) → Aura Blade | Double Strafe (daggers) → Arrow Vulcan | Fire Bolt (lightning: ไฟตกจากฟ้า) → Fire Pillar |
| 3 | Magnum Break (quake) → Grand Cross | Arrow Shower (flask: ฝนธนูตกเป็นจุด) → Arrow Rain | Cold Bolt (frost) → Storm Gust |
| 4 | Provoke (aura) → Devotion | Charge Arrow (boomerang) → Phantasmic Arrow | Lightning Bolt (shuriken: กระโดดจากตัวไปตัว) → Lord of Vermilion |
| 5 | Pierce (spear) → Spiral Pierce | Ankle Snare (twister ความเร็ว 0: วางกับดักดูดมอน) → Shockwave Trap | Fire Ball (bomb) → Sightrasher |
| 6 | Auto Guard (ward) → Shield Reflect | Land Mine (traps) → Freezing Trap | Fire Wall (firetrail) → Volcano |
| 7 | Brandish (axes) → Clashing Spiral | Blitz Beat (wisps) → Falcon Assault | Frost Diver (beam) → Frost Nova |
| พุ่ง | Shield Charge (พุ่งชนดันมอน) | Back Slide | Teleport |
| ท่าไม้ตาย | Berserk (ร่างไฟ แรง ×2 + ฟันรอบตัว 6 วิ) | Arrow Storm | Meteor Storm |

- **เปิดตั้งแต่แรกอาชีพละ 4 สกิล** อีก 3 ปลดล็อกตามแมพ (`config/collection.ts`)
  - Swordman ปลด Pierce, Brandish, Auto Guard
  - Archer ปลด Ankle Snare, Land Mine, Blitz Beat
  - Mage ปลด Lightning Bolt, Frost Diver, Fire Wall
- **`turret` ไม่มีอาชีพไหนใช้:** ห้ามออกในการ์ดทุกอาชีพ

### พรสวรรค์ (Job skill)
- กลไกเดิมจาก `config/talents.ts` เปลี่ยนชื่อ
- ได้เพิ่มตาม Job Lv

| อาชีพ | พรสวรรค์ |
|---|---|
| Swordman | Sword Mastery, Endure, HP Recovery, Two-Hand Quicken, Vitality, Concentration, Fighting Spirit, Guts |
| Archer | Volley, Vulture's Eye, Owl's Eye, Sky Volley, Hunter's Mark, Wind Walk, Trick Shot, Second Wind |
| Mage | Double Casting, Pyromancy, Cryomancy, Stormcalling, SP Recovery, Mystical Amplification, Blink, Starcaller, Wisdom, Energy Coat |

## ไอเทมและระบบ (ของเดิม → ของใหม่)
| ของเดิม | ของใหม่ |
|---|---|
| ไอเทมเสริม 16 ชิ้น | STR (ดาเมจ), AGI (ตีเร็ว), VIT (เลือด), INT (วงโจมตี), DEX (+กระสุน), LUK (คริ) และของ 10 ชิ้น (รายการด้านล่าง) |
| รูน 12 อัน | การ์ดมอน 12 ใบ ตั้งชื่อตามมอนของเรา เช่น Gummy Card = ดูดเลือด |
| อุปกรณ์ (ถุงมือ / หมวก / เสื้อคลุม / รองเท้า) | Headgear / Armor / Garment / Shoes, เลเวลแสดงเป็นตีบวก +N |
| เครื่องราง 6 ชิ้น | MVP Card 6 ใบ ได้จากการล้มบอสและหัวหน้า |
| Mastery | Job Lv |
| เนื้อ | ยาแดง / ส้ม / ขาว |
| เหรียญ | Gold |

- **ของ 10 ชิ้น**

  | ชิ้น | ผล |
  |---|---|
  | Wind Shoes | เดินเร็ว |
  | Lodestone | ระยะดูดของ |
  | Buckler | เกราะ |
  | Healing Herb | ฟื้นเลือดเอง |
  | Moon Pendant | เอฟเฟกต์นานขึ้น |
  | Scholar's Glasses | XP |
  | Berserk Potion | แรงขึ้นตอนเลือดน้อย |
  | Spiked Mail | สะท้อนดาเมจ |
  | Slayer Ring | แรงใส่อีลีท/บอส |
  | Yggdrasil Leaf | ฟื้นชีพ |

- **อุปกรณ์ 8 แบบ** (ช่องละ 2 แบบ, กลไก `core/gear.ts` เดิม)

  | ช่อง | แบบที่ 1 | แบบที่ 2 |
  |---|---|---|
  | Headgear | Horned Helm | Magic Circlet |
  | Armor | Plate Mail | Sage Robe |
  | Garment | Wind Muffler | Mystic Manteau |
  | Shoes | Sprint Sandals | Lucky Boots |

- **ภาพการ์ด:** การ์ดมอนและ MVP Card วาดในโค้ด (กรอบการ์ด + ภาพมอนที่ตัดแล้ว) ไม่ต้องให้ Gemini วาด

## แมพและมอนสเตอร์ 22 ตัว
- กลไกพฤติกรรมเดิมใน `config/enemies.ts`
- รหัสพฤติกรรม: chase เดินไล่, bat บินส่าย, ranged ยิงระยะไกล, charge พุ่ง, swarm บินเป็นฝูง, splitter แตกตัว, exploder วิ่งมาระเบิด, ambush ซุ่ม, flee วิ่งหนี

| แมพ | มอน (พฤติกรรม) | หัวหน้า | MVP |
|---|---|---|---|
| 1 **Greenhill Fields** ทุ่งหญ้าหน้าเมืองปราสาท | Gummy (chase), Fluffbun (bat), Capshroom (chase), Fuzzpuff (splitter → Fuzzlet), Buzzer (swarm) | Ironhide Boar (charge) | Jelly Monarch |
| 2 **Lantern Pines** ป่าสน โคมไฟ ศาลข้างทาง | Greyfang (chase), Lantern Ghost (bat), Talisman Ghoul (chase), Bomb Acorn (exploder), Foxfire Kit (ranged ไฟฟ้า) | Bigpaw (พุ่ง + เรียก Bigpaw Cub) | Shrine Oni |
| 3 **Sunscar Desert** ทะเลทรายพีระมิด | Dust Imp (ranged), Wrapped One (chase), Stingtail (charge), Treasure Urn (ambush), Gold Scarab (swarm) | Sandstone Golem (ทุบพื้น) | Sunscar Pharaoh |
| ทุกแมพ | Coin Thief (flee) แทนก็อบลิน | | |

## รายการภาพ 5 ห้องแชต (35 ภาพ)
### ห้อง 1 ฮีโร่ (`rr_1_heroes.txt`): 16 ภาพ
1. **ภาพหลัก 3 อาชีพ (1-3):** ส่งมาให้ผมตรวจก่อน แล้วค่อยพิมพ์ "ต่อ"
2. **ชิ้นส่วนสำหรับประกอบตัวให้ขยับได้ (4-15):** อาชีพละ 4 ภาพ
   - rig pose
   - หัว + ตา 8 แบบ + ปาก 7 แบบ
   - ชิ้นส่วนตัว
   - มือและอาวุธ
3. **ภาพหน้าเมนู (16):** 3 ฮีโร่พร้อมฉากหลัง (แนวตั้ง 9:16 ด้านบนเว้นฟ้าไว้วางโลโก้)

### ห้อง 2 แมพ 1 (`rr_2_map1.txt`): 6 ภาพ

| ภาพ | สิ่งที่วาด | พื้นหลัง |
|---|---|---|
| 1 | พื้นหญ้า (ภาพปูต่อกันได้) | – |
| 2 | ของประกอบแมพ 6 ชิ้น | ชมพูม่วง |
| 3 | มอน 6 ตัว | ฟ้า |
| 4 | หัวหน้า + MVP | ฟ้า |
| 5 | กระสุนและเอฟเฟกต์ 16 ชิ้น (ใช้ทุกแมพ) | ชมพูม่วง |
| 6 | ของที่เก็บได้และของในโลก 12 ชิ้น (ใช้ทุกแมพ) | ชมพูม่วง |

- ของในภาพ 6: คริสตัล EXP 3 ขนาด, เหรียญ, ยา 3 สี, แม่เหล็ก, หีบ, การ์ด, ประตูวาร์ป, รูปปั้นนางฟ้า

### ห้อง 3 แมพ 2 (`rr_3_map2.txt`): 4 ภาพ
- **ภาพ:** พื้นป่าสน, ของประกอบแมพ 6 ชิ้น, มอน 6 ตัว (รวม Bigpaw Cub), หัวหน้า + MVP
- **พื้นหลัง:** มอนและบอสใช้สีเขียว ของประกอบใช้ชมพูม่วง

### ห้อง 4 แมพ 3 (`rr_4_map3.txt`): 4 ภาพ
- **ภาพ:** พื้นทราย, ของประกอบแมพ 6 ชิ้น, มอน 6 ตัว (รวม Coin Thief), หัวหน้า + MVP
- **พื้นหลัง:** ชมพูม่วงทั้งหมด

### ห้อง 5 ไอคอน (`rr_5_icons.txt`): 5 แผ่น × 16 = 80 ไอคอน
| แผ่น | ไอคอน |
|---|---|
| 1 | Swordman: สกิล 7 + พุ่ง + อาชีพ 2 อีก 7 + ท่าไม้ตาย |
| 2 | Archer: ชุดเดียวกัน |
| 3 | Mage: ชุดเดียวกัน |
| 4 | ไอเทม: STR AGI VIT INT DEX LUK + ของ 10 ชิ้น |
| 5 | อุปกรณ์ 8 แบบ + ไอคอนเมนู 8 อัน (Gold, Quests, Monster Book, Equipment Chest, MVP, Card Album, Job Level, Map Select) |

## หมายเหตุสำหรับผมตอนนำภาพเข้าเกม
- **ภาพที่เจ้านายแปะในแชต:** ไปอยู่ที่ `/root/.claude/uploads/<session>/` ขนาดเต็ม
  - ผมคัดลอกไปเก็บที่ `art/incoming/rr/<ห้อง>_<ลำดับ>.png` เรียงตามลำดับที่แปะ
- **ลายน้ำ Gemini:** มักมีรูปดาวมุมขวาล่าง ต้องลบก่อนตัด (`erase` ใน `scripts/art/rr-sheets.json`, หรือทิ้งชิ้นเล็กใกล้ขอบ)
- **ภาพไม่ตรงตาราง:** Gemini อาจไม่ได้วางชิ้นตรงตารางเป๊ะ ใช้การหาชิ้นอัตโนมัติ (ไม่ใช้ `grid`) แล้วเรียงตามแถว
  - ถ้าลำดับผิด ใช้ `boxes`
- **พื้นปูต่อกัน:** ใช้ `seamless` เดิมทำขอบให้ต่อกันได้
- **ฮีโร่:**
  - ทำตามขั้นตอน `scripts/art/hero-bake/README.md`
  - Swordman ต้องมีท่าใหม่: ฟัน, ฟาด, ยกโล่
  - ภาพเมนูใช้ `scripts/art/menu-still.ts`
