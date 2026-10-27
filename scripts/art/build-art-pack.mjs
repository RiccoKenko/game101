/**
 * node scripts/art/build-art-pack.mjs <out.html>
 *
 * Builds the "Ricco Rush Art Pack" page for the boss: one Copy button per Gemini chat (the master prompts in
 * art/prompts/rr_*.txt) and what each chat paints. Publish it as an Artifact. There is no reference picture: the prompts
 * describe the classic look in words, because a picture of our old game pulled Gemini back to the old style.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '../..');
const out = process.argv[2];
if (!out) throw new Error('usage: node scripts/art/build-art-pack.mjs <out.html>');

const ROOMS = [
  {
    file: 'rr_1_heroes.txt',
    title: 'ฮีโร่ 3 อาชีพ',
    count: 16,
    note: 'ห้องที่ใหญ่ที่สุด 16 ภาพ Gemini อาจหยุดกลางทาง 1 ครั้ง ให้พิมพ์ "ต่อ" ครบแล้วแปะมาทีเดียว',
    items: [
      ['1-3', 'ภาพหลัก Swordman, Archer, Mage'],
      ['4-7', 'Swordman: ท่ายืนตรง, หัวและสีหน้า, ชิ้นส่วนตัว, มือและอาวุธ'],
      ['8-11', 'Archer: ชุดเดียวกัน 4 ภาพ'],
      ['12-15', 'Mage: ชุดเดียวกัน 4 ภาพ'],
      ['16', 'ภาพหน้าเมนู 3 ฮีโร่พร้อมฉากหลัง'],
    ],
  },
  {
    file: 'rr_2_map1.txt',
    title: 'แมพ 1 Greenhill Fields',
    count: 6,
    items: [
      ['1', 'พื้นหญ้า (ภาพสี่เหลี่ยมจัตุรัส)'],
      ['2', 'ของประกอบแมพ 6 ชิ้น: ต้นไม้, พุ่มไม้, หิน, ดอกไม้, รั้ว, ป้ายทาง'],
      ['3', 'มอน 6 ตัว: Gummy, Fluffbun, Capshroom, Fuzzpuff, Fuzzlet, Buzzer'],
      ['4', 'หัวหน้า Ironhide Boar + บอส MVP Jelly Monarch'],
      ['5', 'กระสุนและเอฟเฟกต์สกิล 16 ชิ้น (ใช้ทุกแมพ)'],
      ['6', 'ของที่เก็บได้ 12 ชิ้น: คริสตัล EXP, เหรียญ, ยา 3 สี, แม่เหล็ก, หีบ, การ์ด, ประตูวาร์ป, รูปปั้นนางฟ้า'],
    ],
  },
  {
    file: 'rr_3_map2.txt',
    title: 'แมพ 2 Lantern Pines',
    count: 4,
    items: [
      ['1', 'พื้นป่าสน'],
      ['2', 'ของประกอบแมพ 6 ชิ้น: ต้นสน, โคมหิน, โคมกระดาษ, ศาลข้างทาง, ตอไม้, หิน'],
      ['3', 'มอน 6 ตัว: Greyfang, Lantern Ghost, Talisman Ghoul, Bomb Acorn, Foxfire Kit, Bigpaw Cub'],
      ['4', 'หัวหน้า Bigpaw + บอส MVP Shrine Oni'],
    ],
  },
  {
    file: 'rr_4_map3.txt',
    title: 'แมพ 3 Sunscar Desert',
    count: 4,
    items: [
      ['1', 'พื้นทราย'],
      ['2', 'ของประกอบแมพ 6 ชิ้น: ต้นปาล์ม, กระบองเพชร, เสาหินหัก, รูปปั้นสิงโต, กะโหลก, ไหดิน'],
      ['3', 'มอน 6 ตัว: Dust Imp, Wrapped One, Stingtail, Treasure Urn, Gold Scarab, Coin Thief'],
      ['4', 'หัวหน้า Sandstone Golem + บอส MVP Sunscar Pharaoh'],
    ],
  },
  {
    file: 'rr_5_icons.txt',
    title: 'ไอคอน',
    count: 5,
    items: [
      ['1', 'สกิล Swordman 16 อัน'],
      ['2', 'สกิล Archer 16 อัน'],
      ['3', 'สกิล Mage 16 อัน'],
      ['4', 'ไอเทม 16 อัน: STR AGI VIT INT DEX LUK และของอีก 10 ชิ้น'],
      ['5', 'อุปกรณ์ 8 แบบ + ไอคอนเมนู 8 อัน'],
    ],
  },
];

for (const r of ROOMS) r.prompt = readFileSync(join(ROOT, 'art/prompts', r.file), 'utf8').trim();
const total = ROOMS.reduce((a, r) => a + r.count, 0);

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
// JSON inside <script>: "</" must not close the tag.
const data = JSON.stringify(ROOMS.map((r) => r.prompt)).replace(/<\//g, '<\\/');

const rooms = ROOMS.map(
  (r, i) => `
  <section class="room" id="room-${i + 1}">
    <header class="bar">
      <span class="num">ห้อง ${i + 1}</span>
      <h2>${esc(r.title)}</h2>
      <span class="count">${r.count} ภาพ</span>
    </header>
    <div class="body">
      ${r.note ? `<p class="note">${esc(r.note)}</p>` : ''}
      <ol class="items">
        ${r.items.map(([n, t]) => `<li><span class="n">${n}</span><span>${esc(t)}</span></li>`).join('\n        ')}
      </ol>
      <div class="actions">
        <button class="copy" type="button" data-room="${i}" id="copy-${i + 1}">Copy คำสั่งห้อง ${i + 1}</button>
        <label class="done"><input type="checkbox" id="done-${i + 1}" data-room="${i}"> ห้องนี้เสร็จแล้ว</label>
      </div>
      <p class="status" id="status-${i + 1}" role="status"></p>
      <details id="full-${i + 1}">
        <summary>ดูคำสั่งเต็ม (${r.prompt.length.toLocaleString('en-US')} ตัวอักษร)</summary>
        <pre class="prompt" id="prompt-${i + 1}">${esc(r.prompt)}</pre>
      </details>
    </div>
  </section>`,
).join('\n');

const html = `<title>Ricco Rush Art Pack</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Mitr:wght@400;500;600&family=IBM+Plex+Sans+Thai:wght@400;500;600&family=IBM+Plex+Mono&display=swap">
<style>
/* Layout: one narrow column of game-style "windows", one per Gemini chat, read on a phone. */
:root {
  --bg: #e7edf5;
  --panel: #ffffff;
  --ink: #1a2540;
  --muted: #56658a;
  --line: #c3cfe1;
  --bar: #3d6fc4;
  --bar-ink: #ffffff;
  --gold: #a87414;
  --gold-soft: #f6ecd6;
  --ok: #23824c;
  --done-bar: #23824c;
  --code-bg: #f2f5fa;
  --display: "Mitr", "IBM Plex Sans Thai", system-ui, sans-serif;
  --body: "IBM Plex Sans Thai", system-ui, sans-serif;
  --mono: "IBM Plex Mono", ui-monospace, monospace;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --bg: #0d1420; --panel: #162135; --ink: #e5ecf7; --muted: #9db0cc; --line: #2b3b58;
    --bar: #2c5aa8; --bar-ink: #ffffff; --gold: #e3b45c; --gold-soft: #2d2617; --ok: #5fcf8e; --done-bar: #1f6e43; --code-bg: #0f1828;
    color-scheme: dark;
  }
}
:root[data-theme="dark"] {
  --bg: #0d1420; --panel: #162135; --ink: #e5ecf7; --muted: #9db0cc; --line: #2b3b58;
  --bar: #2c5aa8; --bar-ink: #ffffff; --gold: #e3b45c; --gold-soft: #2d2617; --ok: #5fcf8e; --done-bar: #1f6e43; --code-bg: #0f1828;
  color-scheme: dark;
}
* { box-sizing: border-box; }
body {
  background: var(--bg); color: var(--ink); font: 16px/1.6 var(--body);
  padding-left: max(16px, env(safe-area-inset-left, 0px));
  padding-right: max(16px, env(safe-area-inset-right, 0px));
  padding-block: 24px 48px;
}
main { max-width: 680px; margin: 0 auto; display: grid; gap: 20px; }
h1, h2, h3 { font-family: var(--display); font-weight: 500; text-wrap: balance; margin: 0; }
.top { display: grid; gap: 8px; }
.eyebrow { font: 500 13px/1 var(--display); letter-spacing: 0.08em; color: var(--gold); text-transform: uppercase; }
h1 { font-size: clamp(30px, 8vw, 42px); line-height: 1.1; }
.lead { margin: 0; color: var(--muted); max-width: 60ch; }
.lead b { color: var(--ink); }
.progress { justify-self: start; font: 500 14px/1 var(--display); background: var(--gold-soft); color: var(--gold); border-radius: 999px; padding: 8px 14px; font-variant-numeric: tabular-nums; }
.card { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; padding: 18px; display: grid; gap: 12px; min-width: 0; }
.card h3 { font-size: 18px; }
.steps { margin: 0; padding: 0; list-style: none; display: grid; gap: 12px; counter-reset: s; }
.steps li { display: grid; grid-template-columns: 32px 1fr; gap: 10px; align-items: start; counter-increment: s; }
.steps li::before { content: counter(s); font: 600 15px/32px var(--display); text-align: center; width: 32px; height: 32px; border-radius: 50%; background: var(--bar); color: var(--bar-ink); }
.words { display: flex; flex-wrap: wrap; gap: 8px; }
.word { display: inline-flex; gap: 6px; align-items: baseline; border: 1px solid var(--line); border-radius: 10px; padding: 6px 10px; font-size: 14px; color: var(--muted); }
.word b { font-family: var(--display); font-weight: 500; color: var(--ink); font-size: 16px; }
.update { border-color: var(--gold); background: var(--gold-soft); }
.update p { margin: 0; font-size: 15px; }
.room { background: var(--panel); border: 1px solid var(--line); border-radius: 14px; overflow: hidden; min-width: 0; }
.bar { background: var(--bar); color: var(--bar-ink); display: flex; align-items: baseline; gap: 10px; padding: 12px 16px; flex-wrap: wrap; }
.bar .num { font: 500 13px/1 var(--display); letter-spacing: 0.06em; opacity: 0.85; }
.bar h2 { font-size: 19px; flex: 1 1 auto; min-width: 0; }
.bar .count { font: 500 14px/1 var(--display); background: rgba(255,255,255,0.18); padding: 5px 10px; border-radius: 999px; font-variant-numeric: tabular-nums; }
.room.is-done .bar { background: var(--done-bar); }
.body { padding: 16px; display: grid; gap: 14px; min-width: 0; }
.note { margin: 0; background: var(--gold-soft); color: var(--ink); border-radius: 10px; padding: 10px 12px; font-size: 15px; }
.items { list-style: none; margin: 0; padding: 0; display: grid; gap: 6px; }
.items li { display: grid; grid-template-columns: 52px 1fr; gap: 8px; font-size: 15px; }
.items .n { font: 500 13px/1.9 var(--mono); color: var(--muted); font-variant-numeric: tabular-nums; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; align-items: center; }
.copy { font: 500 17px/1 var(--display); color: var(--bar-ink); background: var(--bar); border: 0; border-radius: 12px; padding: 15px 20px; cursor: pointer; flex: 1 1 220px; }
.copy:hover { filter: brightness(1.08); }
.copy:focus-visible, .done input:focus-visible, summary:focus-visible { outline: 3px solid var(--gold); outline-offset: 2px; }
.copy.copied { background: var(--done-bar); }
.done { display: inline-flex; gap: 8px; align-items: center; font-size: 15px; color: var(--muted); cursor: pointer; }
.done input { width: 20px; height: 20px; accent-color: var(--ok); }
.status { margin: 0; font-size: 14px; color: var(--ok); }
.status:empty { display: none; }
.status.warn { color: var(--gold); }
details summary { cursor: pointer; color: var(--muted); font-size: 14px; }
.prompt { margin: 10px 0 0; background: var(--code-bg); border: 1px solid var(--line); border-radius: 10px; padding: 12px; font: 12.5px/1.55 var(--mono); white-space: pre-wrap; word-break: break-word; max-height: 360px; overflow: auto; user-select: text; -webkit-user-select: text; }
.tips { margin: 0; padding-left: 20px; display: grid; gap: 6px; color: var(--muted); font-size: 15px; }
.tips b { color: var(--ink); font-weight: 500; }
@media (prefers-reduced-motion: no-preference) { .copy { transition: background 0.2s, filter 0.2s; } }
</style>

<main>
  <header class="top">
    <span class="eyebrow">Ricco Rush · Art Pack</span>
    <h1>ชุดคำสั่งวาดภาพสำหรับ Gemini</h1>
    <p class="lead">วางคำสั่ง <b>5 ครั้ง</b> (1 ครั้งต่อ 1 ห้องแชต) ได้ภาพทั้งหมด <b>${total} ภาพ</b> Gemini วาดรวดทั้งห้องเอง ไม่ต้องคอยพิมพ์สั่ง</p>
    <span class="progress" id="progress">เสร็จ 0 / 5 ห้อง</span>
  </header>

  <section class="card">
    <h3>วิธีใช้</h3>
    <ol class="steps">
      <li><span>เปิด <b>แชตใหม่</b> ใน Gemini เลือกโหมดสร้างรูปภาพ แล้วกดปุ่ม Copy ของห้องนั้นมาวาง แล้วส่ง <b>ไม่ต้องแนบภาพ</b></span></li>
      <li><span>Gemini วาด<b>ทุกภาพของห้องรวดเดียว</b> ถ้าหยุดกลางทางเพราะยาวเกิน มันจะบอกให้พิมพ์ "ต่อ" ก็พิมพ์ครั้งเดียว มันวาดต่อจนจบ</span></li>
      <li><span>ดาวน์โหลดภาพทั้งหมด แล้วแปะกลับมาในแชต Claude <b>เรียงตามลำดับ</b> พร้อมบอกว่าเป็นห้องไหน</span></li>
    </ol>
    <div class="words" aria-label="คำที่พิมพ์ใน Gemini">
      <span class="word"><b>ต่อ</b> ใช้เฉพาะตอน Gemini หยุดกลางทาง</span>
      <span class="word"><b>วาดใหม่ 5</b> วาดใหม่เฉพาะภาพที่ 5</span>
      <span class="word"><b>ภาพ 3: แก้…</b> บอกสิ่งที่อยากแก้ เช่น "ภาพ 3: แก้เฉพาะตัวมุมซ้ายบน"</span>
    </div>
  </section>

  <section class="card update">
    <h3>อัปเดต: ปรับสไตล์ให้เป็นเกมออนไลน์เกาหลียุคเก่า</h3>
    <p>คำสั่งชุดใหม่บอก Gemini ให้วาดแบบสไปรต์ 2D ของเกมออนไลน์แฟนตาซีเกาหลียุคปลาย 90 (ตัวสูงราว 3 หัว สีหม่นนุ่ม เส้นบาง) แทนแบบชิบิมือถือยุคใหม่ และเลิกใช้ภาพอ้างอิงของเกมเดิมแล้ว</p>
    <p><b>ถ้าเคยเปิดห้องไปแล้ว ให้เปิดแชตใหม่</b> แล้ว Copy คำสั่งใหม่ไปวาง เพราะแชตเดิมจำสไตล์เก่าไว้</p>
  </section>
${rooms}

  <section class="card">
    <h3>เรื่องที่ควรรู้</h3>
    <ul class="tips">
      <li><b>ทำห้อง 2-5 พร้อมกันได้</b> แต่ละห้องเป็นแชตแยกกัน ไม่ต้องรอกัน</li>
      <li><b>โควตาวาดภาพต่อวัน:</b> บัญชี Gemini ฟรีวาดได้ราววันละ 20 ภาพ (ตัวเลขโดยประมาณ) ถ้าไม่ได้สมัครแบบเสียเงิน แนะนำวันแรกทำห้อง 1 (16 ภาพ) วันถัดไปทำห้อง 2-5 (19 ภาพ)</li>
      <li><b>ลายน้ำของ Gemini</b> ที่มุมภาพไม่ต้องลบ ผมจัดการเอง</li>
      <li><b>ถ้าภาพออกมาเป็นการ์ตูนมือถือมันวาว</b> พิมพ์ "วาดใหม่ แบบเกมออนไลน์เกาหลียุค 90 สีหม่น เส้นบาง ตัวสูง 3 หัว"</li>
      <li><b>ถ้า Gemini วาดหลายภาพรวมกันในภาพเดียว หรือข้ามภาพไหน</b> พิมพ์ "วาดใหม่ N" ตามเลขภาพนั้น</li>
      <li><b>ถ้าแปะภาพกลับมาในข้อความเดียวไม่หมด</b> แบ่งเป็นหลายข้อความได้ ขอแค่เรียงลำดับเดิม</li>
      <li><b>ถ้าพื้นหลังไม่ใช่สีเรียบ</b> (มีลาย มีเงา หรือเป็นตาราง) พิมพ์ "พื้นหลังต้องเป็นสีเรียบสีเดียว วาดใหม่"</li>
    </ul>
  </section>
</main>

<script id="prompts" type="application/json">${data}</script>
<script>
(function () {
  var PROMPTS = JSON.parse(document.getElementById('prompts').textContent);
  var KEY = 'rr-art-pack-done';
  var done = [];
  try { done = JSON.parse(localStorage.getItem(KEY) || '[]'); } catch (e) { done = []; }

  function render() {
    var n = 0;
    for (var i = 0; i < PROMPTS.length; i++) {
      var on = done.indexOf(i) >= 0;
      if (on) n++;
      document.getElementById('done-' + (i + 1)).checked = on;
      document.getElementById('room-' + (i + 1)).classList.toggle('is-done', on);
    }
    document.getElementById('progress').textContent = 'เสร็จ ' + n + ' / ' + PROMPTS.length + ' ห้อง';
  }

  function say(i, text, warn) {
    var s = document.getElementById('status-' + (i + 1));
    s.textContent = text;
    s.classList.toggle('warn', !!warn);
  }

  function selectPrompt(i) {
    var d = document.getElementById('full-' + (i + 1));
    d.open = true;
    var pre = document.getElementById('prompt-' + (i + 1));
    var range = document.createRange();
    range.selectNodeContents(pre);
    var sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
    pre.scrollIntoView({ block: 'nearest' });
  }

  function legacyCopy(text) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.setAttribute('readonly', '');
    ta.style.position = 'fixed';
    ta.style.top = '0';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    ta.setSelectionRange(0, text.length);
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    document.body.removeChild(ta);
    return ok;
  }

  function copied(i, btn) {
    btn.classList.add('copied');
    btn.textContent = 'คัดลอกแล้ว ✓';
    say(i, 'คัดลอกคำสั่งห้อง ' + (i + 1) + ' แล้ว ไปวางในแชตใหม่ของ Gemini พร้อมแนบภาพอ้างอิงได้เลย');
    setTimeout(function () {
      btn.classList.remove('copied');
      btn.textContent = 'Copy คำสั่งห้อง ' + (i + 1);
    }, 2500);
  }

  function failed(i) {
    selectPrompt(i);
    say(i, 'เครื่องนี้ไม่ยอมให้คัดลอกอัตโนมัติ ผมเลือกข้อความไว้ให้แล้วด้านล่าง กดค้างแล้วเลือก "คัดลอก"', true);
  }

  document.querySelectorAll('.copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var i = Number(btn.dataset.room);
      var text = PROMPTS[i];
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function () { copied(i, btn); }, function () {
          if (legacyCopy(text)) copied(i, btn); else failed(i);
        });
      } else if (legacyCopy(text)) copied(i, btn);
      else failed(i);
    });
  });

  document.querySelectorAll('.done input').forEach(function (box) {
    box.addEventListener('change', function () {
      var i = Number(box.dataset.room);
      done = done.filter(function (x) { return x !== i; });
      if (box.checked) done.push(i);
      try { localStorage.setItem(KEY, JSON.stringify(done)); } catch (e) {}
      render();
    });
  });

  render();
})();
</script>
`;

writeFileSync(out, html);
console.log(`wrote ${out} (${(html.length / 1024).toFixed(0)} KB, ${total} images in ${ROOMS.length} chats)`);
