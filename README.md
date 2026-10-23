# Little Archer: Sky Pirates

เกม 3D บนมือถือ แนว Tower Defense ผสมเกาะ Idle: นักธนูน้อยปกป้องเกาะลอยฟ้า Sky Haven จากโจรสลัดอากาศที่มาขโมย Sky Crystal

**สถานะตอนนี้: เฟส 1A-1 (Character Showcase)** เปิดลิงก์เกมแล้วจะเจอหน้าโชว์ตัวละคร ยังไม่ใช่ตัวเกมเต็ม
- **Little Archer** (ฮีโร่) มี 10 ท่า: ยืน, เดิน, วิ่ง, ยิงธนู, ยิงรัว, พุ่งหลบ, โดนตี, ล้มสลบ, เชียร์, เรียกสกิล
- **Deckhand** (ลูกเรือโจรสลัด) มี 8 ท่า: ยืน, เดินวางท่า, วิ่งบุก, กอดคริสตัลวิ่งหนี, โดนตี, แพ้, ยั่ว, เชียร์
- **Battle demo:** ฮีโร่ยิงธนูใส่โจรสลัด มีหางแสงลูกธนู, ตัวกระพริบขาวตอนโดน, ประกายไฟ, ตัวเลขดาเมจเด้ง, hit-stop, จอสั่น, slow-motion และเหรียญกระเด็นดูดเข้าตัว

แผนทั้งหมดและเฟสถัดไปอยู่ในไฟล์แผนของ Claude Code ส่วนเฟสถัดไปคือ 1A-2 เกาะลอยฟ้าเต็มด่านพร้อมทางเดิน ป้อม และเรือเหาะ

---

## ตัวละครทุกตัว "ปั้นด้วยโค้ด"

ไม่มีโมเดลที่ดาวน์โหลดมาใช้ในเกมเลย ทุกชิ้นสร้างจากสูตรในโฟลเดอร์ `sculpt/`:

| ไฟล์ | ทำอะไร |
|---|---|
| `sculpt/sdf.ts` | "ดินน้ำมันดิจิทัล": รูปทรงพื้นฐานที่หลอมรวม คว้าน และระบายสีได้ |
| `sculpt/mesher.ts` | แปลงรูปทรงเป็นโมเดล 3D (Surface Nets) แล้วลดจำนวนเหลี่ยม |
| `sculpt/skeleton.ts` | โครงกระดูก + IK (บอกตำแหน่งมือ แล้วระบบคำนวณมุมแขนเอง) |
| `sculpt/anim.ts` | ระบบคีย์เฟรม: easing, ท่าเด้ง (overshoot), ผสมท่า |
| `sculpt/characters/hero.ts` | สูตรปั้นและท่าทางของ Little Archer |
| `sculpt/characters/deckhand.ts` | สูตรปั้นและท่าทางของ Deckhand |
| `sculpt/props/showcase.ts` | เกาะลอยฟ้าเล็ก, ลูกธนู, เหรียญ, คริสตัล |

สร้างโมเดลใหม่หลังแก้สูตร: `npm run models` (ผลลัพธ์อยู่ใน `public/models/`)

## งานภาพ 2D แนวอนิเมะ (กำลังย้ายมาใช้)

ตัวละครชุดใหม่วาดด้วย ChatGPT ตามคู่มือ `docs/art/CHARACTER_BRIEF.md` จากนั้นเครื่องมือตัดภาพจะจัดการต่อให้อัตโนมัติ:
1. ลบพื้นหลังสีชมพู
2. แยกแผ่นชิ้นส่วนออกเป็นไฟล์ทีละชิ้น
3. ตั้งชื่อแต่ละชิ้น

| โฟลเดอร์ | มีอะไร |
|---|---|
| `art/incoming/<ตัวละคร>/` | ภาพจาก ChatGPT ตั้งชื่อตามคู่มือ เช่น `hero_parts_body.png` |
| `art/sliced/<ตัวละคร>/` | ผลลัพธ์ ซึ่งสร้างใหม่ได้เสมอจึงไม่เก็บใน git<br>• ชิ้นส่วนแยกไฟล์<br>• `manifest.json`<br>• ภาพตรวจ `<แผ่น>.check.png` ที่ตีกรอบและใส่เลขทุกชิ้น |
| `scripts/art/sheets.json` | รายชื่อชิ้นส่วนของแต่ละแผ่น เรียงตามลำดับใน prompt |

ตัดภาพ: `npm run art -- hero` หรือระบุเฉพาะบางแผ่น เช่น `npm run art -- hero parts_body`

## อยากปรับอะไร สั่ง Claude Code ได้เลย

พิมพ์บอกเป็นภาษาธรรมดาได้ เช่น
- "อยากให้ฮู้ดของนักธนูเป็นสีน้ำเงิน"
- "ให้โจรสลัดมีหนวด"
- "ท่าเชียร์ให้กระโดดสูงกว่านี้"
- "ตัวเลขดาเมจให้ใหญ่ขึ้น"

---

## สำหรับนักพัฒนา

เทคโนโลยี: Three.js + TypeScript + Vite (เว็บล้วน ไม่มี server)

```bash
npm install
npm run dev            # เปิดที่ http://localhost:5173 (หน้าโชว์ตัวละคร)
npm run models         # ปั้นโมเดลใหม่ทั้งหมด (หรือ npm run models -- hero)
npm run art -- hero    # ตัดภาพ 2D จาก art/incoming/hero/ ไปที่ art/sliced/hero/
npm run build          # typecheck + build ไปที่ dist/
npm test               # unit tests (Vitest)
PW_CHROMIUM=/opt/pw-browsers/chromium npm run test:e2e   # smoke test บนจอ iPhone 15 แนวนอน
```

เครื่องมือช่วย:
- `dev/model.html?m=hero&clip=shoot&t=0.2,0.4&views=0,90`: ดูโมเดลหลายมุม หลายเฟรม
- `npx tsx sculpt/fk.ts hero shoot 0.47 arrow hand.R`: ดูตำแหน่งกระดูกในท่าใดท่าหนึ่ง (ใช้จูนท่า)
- `scripts/shot.mjs`: ถ่ายภาพหน้าจอบน iPhone จำลอง (`/?battle` เริ่มโหมดต่อสู้ทันที)
- `npm run showcase:artifact -- out.html`: รวมหน้าโชว์เป็นไฟล์ HTML ไฟล์เดียว

## เครดิต
- **โมเดลและท่าทาง:** ปั้นด้วยโค้ดโดย Claude สำหรับเกมนี้
- **ฟอนต์:** Fredoka (SIL Open Font License) ผ่าน @fontsource
- **เสียง:** CC0 จาก Kenney.nl และ OpenGameArt.org รายละเอียดอยู่ใน `docs/AUDIO-CREDITS.md`
  - เพลงแมพสุสานเดิม: "Waltz of the Ghosts" by Aureolus_Omicron, licensed under CC BY 4.0 (https://creativecommons.org/licenses/by/4.0/)
