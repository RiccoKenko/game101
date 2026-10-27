import { svg, type ArtDef, type ArtSet } from './types';

// Weapon projectiles, effects and ground pickups. Projectiles point/travel to the RIGHT.

const O = '#2a1f3d';
const n1 = (v: number): string => (Math.round(v * 10) / 10).toString();

/** Outline group attributes. */
const ol = (w: number): string =>
  `stroke="${O}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

/** Sharp star / burst path. `outer` gives one radius per point; `inner` is the valley radius. */
function star(cx: number, cy: number, outer: number[], inner: number, rot = -90): string {
  const n = outer.length;
  let d = '';
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 ? inner : outer[i >> 1];
    const a = ((rot + (i * 180) / n) * Math.PI) / 180;
    d += `${i ? 'L' : 'M'}${n1(cx + r * Math.cos(a))} ${n1(cy + r * Math.sin(a))}`;
  }
  return d + 'Z';
}
const rep = (n: number, r: number): number[] => Array.from({ length: n }, () => r);

/** Soft concave 4-point twinkle. */
function twinkle(x: number, y: number, r: number): string {
  const [X, Y, l, ri, t, b] = [x, y, x - r, x + r, y - r, y + r].map(n1);
  return `M${X} ${t}Q${X} ${Y} ${ri} ${Y}Q${X} ${Y} ${X} ${b}Q${X} ${Y} ${l} ${Y}Q${X} ${Y} ${X} ${t}Z`;
}

/** Faceted XP crystal. */
function gem(
  w: number,
  h: number,
  c: { hi: string; light: string; base: string; dark: string },
  sw: number,
): ArtDef {
  const p = sw / 2 + 2.5;
  const l = p;
  const r = w - p;
  const t = p;
  const b = h - p;
  const cx = w / 2;
  const gy = t + (b - t) * 0.32;
  const tw = (r - l) * 0.24;
  const iw = (r - l) * 0.12;
  const P = (...pts: number[]): string => {
    let d = '';
    for (let i = 0; i < pts.length; i += 2) d += `${i ? 'L' : 'M'}${n1(pts[i])} ${n1(pts[i + 1])}`;
    return d + 'Z';
  };
  const outline = P(cx - tw, t, cx + tw, t, r, gy, cx, b, l, gy);
  const s = (r - l) / 18;
  return svg(
    w,
    h,
    `<path d="${P(l, gy, cx - tw, t, cx - iw, gy)}" fill="${c.light}"/>` +
      `<path d="${P(cx - tw, t, cx + tw, t, cx + iw, gy, cx - iw, gy)}" fill="${c.hi}"/>` +
      `<path d="${P(cx + tw, t, r, gy, cx + iw, gy)}" fill="${c.base}"/>` +
      `<path d="${P(l, gy, cx - iw, gy, cx, b)}" fill="${c.base}"/>` +
      `<path d="${P(cx - iw, gy, cx + iw, gy, cx, b)}" fill="${c.light}"/>` +
      `<path d="${P(cx + iw, gy, r, gy, cx, b)}" fill="${c.dark}"/>` +
      `<path d="${P(l, gy, r, gy)}" fill="none" stroke="${c.dark}" stroke-width="${n1(s)}" opacity=".5"/>` +
      `<path d="${outline}" fill="none" ${ol(sw)}/>` +
      `<path d="M${n1(l + 3.2 * s)} ${n1(gy - 0.6 * s)}L${n1(cx - tw + 0.6 * s)} ${n1(t + 2.6 * s)}" fill="none" stroke="#fff" stroke-width="${n1(1.8 * s)}" stroke-linecap="round" opacity=".85"/>` +
      `<path d="${twinkle(cx - 1.5 * s, gy + 4 * s, 2.6 * s)}" fill="#fff" opacity=".9"/>`,
  );
}

/** Double-headed axe drawn in a 68x68 space; its outline spans y 5-65, so callers shift it to centre. */
function axeBody(c: {
  face: string;
  edge: string;
  shade: string;
  socket: string;
  socketShade: string;
  wood: string;
  wrap: string;
  knob: string;
  sw: number;
}): string {
  const L = 'M30 20C24 18 20 14 16 7C5 15 5 35 16 43C20 36 24 32 30 30Z';
  const R = 'M38 20C44 18 48 14 52 7C63 15 63 35 52 43C48 36 44 32 38 30Z';
  return (
    // handle
    `<rect x="29.5" y="16" width="9" height="45" rx="4.5" fill="${c.wood}" ${ol(c.sw)}/>` +
    `<rect x="29.5" y="45" width="9" height="12" rx="2.5" fill="${c.wrap}" ${ol(c.sw * 0.75)}/>` +
    `<circle cx="34" cy="60" r="3.8" fill="${c.knob}" ${ol(c.sw * 0.8)}/>` +
    `<path d="M32.4 36V42M32.4 48V54" stroke="#fff" stroke-width="1.6" stroke-linecap="round" opacity=".5"/>` +
    // blades
    `<path d="${L}" fill="${c.face}"/>` +
    `<path d="${R}" fill="${c.face}"/>` +
    `<path d="M16 7C5 15 5 35 16 43L19.5 38.5C12 32 12 18 19.5 11.5Z" fill="${c.edge}"/>` +
    `<path d="M52 7C63 15 63 35 52 43L48.5 38.5C56 32 56 18 48.5 11.5Z" fill="${c.edge}"/>` +
    `<path d="M30 26C24 28 20 33 16 43C20 36 24 32 30 30Z" fill="${c.shade}"/>` +
    `<path d="M38 24C44 27 49 33 52 43C55 39 58 34 59.5 28C52 30 45 27 38 22Z" fill="${c.shade}"/>` +
    `<path d="${L}" fill="none" ${ol(c.sw)}/>` +
    `<path d="${R}" fill="none" ${ol(c.sw)}/>` +
    `<path d="M11 21C11 17 12.5 14 15 11.5" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".9"/>` +
    // socket
    `<rect x="27" y="15" width="14" height="19" rx="4" fill="${c.socket}" ${ol(c.sw)}/>` +
    `<path d="M29.5 28.5H38.5" stroke="${c.socketShade}" stroke-width="3" stroke-linecap="round"/>` +
    `<circle cx="34" cy="21.5" r="2" fill="#fff" opacity=".75"/>`
  );
}

/** Glowing rune strokes on the titan axe blades (axeBody space). */
const RUNES = 'M17 20L21 25L17 30M23.5 19V31M54 29L50 34M51 20L47 25L51 30M44.5 19V31M14 29L18 34';

/** Boomerang outline (60x60, centred). */
const BOOM = 'M5 44Q11 19 30 7Q49 19 55 44Q56.5 52 47 51Q40 33 30 27Q20 33 13 51Q3.5 52 5 44Z';

export const ITEMS_ART: ArtSet = {
  // ───────────────────────── Weapon projectiles & effects ─────────────────────────
  arrow: svg(
    68,
    18,
    `<g ${ol(2)}>` +
      `<path d="M2.5 2.5L12.5 2.5L22 7.5L8.5 7.5Z" fill="#ffffff"/>` +
      `<path d="M2.5 15.5L12.5 15.5L22 10.5L8.5 10.5Z" fill="#ffffff"/>` +
      `</g>` +
      `<path d="M3.5 3.5H8.3L9.6 6.5H5.6ZM3.5 14.5H8.3L9.6 11.5H5.6Z" fill="#3fa9ff"/>` +
      `<path d="M2.5 2.5L12.5 2.5L22 7.5L8.5 7.5ZM2.5 15.5L12.5 15.5L22 10.5L8.5 10.5Z" fill="none" ${ol(2)}/>` +
      `<rect x="5" y="6.5" width="46" height="5" rx="2.5" fill="#d39556" ${ol(2)}/>` +
      `<path d="M8 8.2H48" stroke="#f3c48e" stroke-width="1" stroke-linecap="round"/>` +
      `<path d="M8 10H48" stroke="#a8692f" stroke-width="1" stroke-linecap="round"/>` +
      `<path d="M46 2.5L64 9L46 15.5L50 9Z" fill="#e6ecf5" ${ol(2)}/>` +
      `<path d="M50.8 9.5L61.8 9.5L47.8 14.3Z" fill="#9aa6bf"/>` +
      `<path d="M48.5 5L56 7.8" stroke="#fff" stroke-width="1.4" stroke-linecap="round"/>`,
  ),

  arrow_storm: svg(
    80,
    24,
    `<defs>` +
      `<linearGradient id="arrow_storm_trail" x1="0" y1="0" x2="1" y2="0">` +
      `<stop offset="0" stop-color="#7ff3ff" stop-opacity="0"/>` +
      `<stop offset="1" stop-color="#bffaff" stop-opacity=".9"/></linearGradient>` +
      `<radialGradient id="arrow_storm_glow" cx=".5" cy=".5" r=".5">` +
      `<stop offset="0" stop-color="#e6fdff" stop-opacity=".95"/>` +
      `<stop offset="1" stop-color="#3de8ff" stop-opacity="0"/></radialGradient>` +
      `</defs>` +
      `<path d="M0 12L28 5.5Q35 12 28 18.5Z" fill="url(#arrow_storm_trail)"/>` +
      `<path d="M8 6.5L30 8.5M4 17L28 15.5" stroke="#bffaff" stroke-width="1.5" stroke-linecap="round" opacity=".6"/>` +
      `<ellipse cx="64" cy="12" rx="16" ry="11.5" fill="url(#arrow_storm_glow)"/>` +
      `<g ${ol(2.5)}>` +
      `<path d="M15 4.5L25 4.5L34 12L22 12Z" fill="#3de8ff"/>` +
      `<path d="M15 19.5L25 19.5L34 12L22 12Z" fill="#e6fdff"/>` +
      `<rect x="19" y="9.75" width="43" height="4.5" rx="2.25" fill="#effeff"/>` +
      `<path d="M58 4.5L76 12L58 19.5L62 12Z" fill="#7ff3ff"/>` +
      `</g>` +
      `<path d="M62.8 12.6L73.5 12.6L59.8 18Z" fill="#1fb6e0"/>` +
      `<path d="M60.5 7.3L67 10" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M30 9.5L34 12.5L38 10L42 13L46 10.5L50 13L54 11" fill="none" stroke="#ffe94d" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>` +
      `<path d="M21 13.6L25 13.6" stroke="#3de8ff" stroke-width="1.4" stroke-linecap="round"/>`,
  ),

  dagger: svg(
    52,
    20,
    `<g transform="translate(0.5 0)"><g ${ol(3)}>` +
      `<path d="M20 5L39 5L48 10L39 15L20 15Z" fill="#e8eef7"/>` +
      `<rect x="7" y="7" width="11" height="6" rx="2" fill="#2a56c9"/>` +
      `<circle cx="6" cy="10" r="3.5" fill="#7fd0ff"/>` +
      `<rect x="15.5" y="3.5" width="6" height="13" rx="3" fill="#3d7bff"/>` +
      `</g>` +
      `<path d="M23 10.6L45.5 10.6L38.6 13.5L23 13.5Z" fill="#a9b4c9"/>` +
      `<path d="M24 10.2H40" stroke="#7c89a6" stroke-width="1.3" stroke-linecap="round"/>` +
      `<path d="M24 7.1H38" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>` +
      `<path d="M10.5 8V12M13.5 8V12" stroke="#173a8f" stroke-width="1.3" stroke-linecap="round"/>` +
      `<path d="M17.3 6V11" stroke="#9cc4ff" stroke-width="1.5" stroke-linecap="round"/>` +
      `<circle cx="5" cy="9" r="1.1" fill="#fff"/>` +
      `<path d="${twinkle(31, 8.6, 2.2)}" fill="#7fd0ff"/></g>`,
  ),

  dagger_gold: svg(
    56,
    22,
    `<g transform="translate(0.5 0)"><g ${ol(3)}>` +
      `<path d="M22 5.5L43 5.5L52 11L43 16.5L22 16.5Z" fill="#ffd84a"/>` +
      `<rect x="7" y="8" width="11" height="6" rx="2" fill="#5a2491"/>` +
      `<circle cx="6" cy="11" r="3.6" fill="#ffcc33"/>` +
      `<path d="M16 4.5Q20.5 2.5 25 4.5L25 17.5Q20.5 19.5 16 17.5Z" fill="#ffcc33"/>` +
      `</g>` +
      `<path d="M27 11.6L49.6 11.6L42.6 15L27 15Z" fill="#e8a317"/>` +
      `<path d="M28 11.1H44" stroke="#c97f0e" stroke-width="1.3" stroke-linecap="round"/>` +
      `<path d="M28 7.8H42" stroke="#fff6c0" stroke-width="1.6" stroke-linecap="round"/>` +
      `<path d="M10.5 9V13M13.5 9V13" stroke="#2f0f57" stroke-width="1.3" stroke-linecap="round"/>` +
      `<circle cx="20.5" cy="11" r="3.4" fill="#ff3fb4" ${ol(1.6)}/>` +
      `<circle cx="19.5" cy="10" r="1.1" fill="#fff"/>` +
      `<circle cx="5" cy="10" r="1.1" fill="#fff"/>` +
      `<path d="${twinkle(36, 9.2, 2.4)}" fill="#fff"/></g>`,
  ),

  axe: svg(
    68,
    68,
    `<g transform="translate(0 -1.5)">` +
      axeBody({
      face: '#cfd8e8',
      edge: '#f6f9ff',
      shade: '#97a3bd',
      socket: '#ffcc33',
      socketShade: '#d9911a',
      wood: '#c07a3d',
      wrap: '#3d7bff',
      knob: '#ffcc33',
      sw: 4,
    }) +
      `</g>`,
  ),

  axe_titan: svg(
    104,
    104,
    `<defs><radialGradient id="axe_titan_glow" cx=".5" cy=".5" r=".5">` +
      `<stop offset="0" stop-color="#ffb347" stop-opacity=".55"/>` +
      `<stop offset="1" stop-color="#ff7a1f" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="52" cy="40" r="44" fill="url(#axe_titan_glow)"/>` +
      `<g transform="translate(52 52) scale(1.52) translate(-34 -33.5)">` +
      `<path d="M34 3.5L39.5 17H28.5Z" fill="#ffcc33" ${ol(3.2)}/>` +
      `<path d="M34 7.5L35.2 12" stroke="#fff6c0" stroke-width="1.4" stroke-linecap="round"/>` +
      axeBody({
        face: '#6c7896',
        edge: '#c9d3e6',
        shade: '#4a5472',
        socket: '#ffcc33',
        socketShade: '#d9911a',
        wood: '#7a4a2a',
        wrap: '#c92a3a',
        knob: '#ffcc33',
        sw: 3.2,
      }) +
      `<g fill="none" stroke-linecap="round" stroke-linejoin="round">` +
      `<path d="${RUNES}" stroke="#ff7a1f" stroke-width="5" opacity=".35"/>` +
      `<path d="${RUNES}" stroke="#ff9a1f" stroke-width="2.6"/>` +
      `<path d="${RUNES}" stroke="#fff3b0" stroke-width="1.1"/>` +
      `</g>` +
            `</g>`,
  ),

  aura: svg(
    256,
    256,
    `<defs><radialGradient id="aura_g" cx="128" cy="128" r="128" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0" stop-color="#fff3a0" stop-opacity=".05"/>` +
      `<stop offset=".55" stop-color="#ffe066" stop-opacity=".1"/>` +
      `<stop offset=".8" stop-color="#ffd23f" stop-opacity=".24"/>` +
      `<stop offset=".94" stop-color="#ffc933" stop-opacity=".5"/>` +
      `<stop offset="1" stop-color="#ffc21f" stop-opacity=".55"/>` +
      `</radialGradient></defs>` +
      `<circle cx="128" cy="128" r="127" fill="url(#aura_g)"/>` +
      `<circle cx="128" cy="128" r="119" fill="none" stroke="#fff4b8" stroke-width="3" opacity=".55"/>` +
      `<g fill="#fffbe0" opacity=".9">` +
      `<path d="${twinkle(86, 72, 10)}"/>` +
      `<path d="${twinkle(178, 100, 7)}"/>` +
      `<path d="${twinkle(118, 176, 9)}"/>` +
      `<path d="${twinkle(64, 148, 6)}"/>` +
      `<path d="${twinkle(186, 168, 11)}"/>` +
      `<path d="${twinkle(146, 58, 6)}"/>` +
      `</g>` +
      `<g fill="#fff3a0" opacity=".7">` +
      `<circle cx="112" cy="110" r="2.5"/><circle cx="160" cy="138" r="3"/>` +
      `<circle cx="96" cy="200" r="2.5"/><circle cx="200" cy="72" r="2.5"/>` +
      `<circle cx="48" cy="104" r="2"/>` +
      `</g>`,
  ),

  aura_holy: svg(
    256,
    256,
    `<defs><radialGradient id="aura_holy_g" cx="128" cy="128" r="128" gradientUnits="userSpaceOnUse">` +
      `<stop offset="0" stop-color="#ffffff" stop-opacity=".14"/>` +
      `<stop offset=".5" stop-color="#f2ffd8" stop-opacity=".16"/>` +
      `<stop offset=".78" stop-color="#d4ffb0" stop-opacity=".32"/>` +
      `<stop offset=".93" stop-color="#fff8c8" stop-opacity=".66"/>` +
      `<stop offset="1" stop-color="#f4ffc8" stop-opacity=".66"/>` +
      `</radialGradient></defs>` +
      `<circle cx="128" cy="128" r="127" fill="url(#aura_holy_g)"/>` +
      `<path d="${star(128, 128, rep(8, 112), 26, -90)}" fill="#ffffff" opacity=".1"/>` +
      `<path d="${star(128, 128, rep(8, 84), 22, -67.5)}" fill="#e8ffc8" opacity=".12"/>` +
      `<circle cx="128" cy="128" r="119" fill="none" stroke="#ffffff" stroke-width="3.5" opacity=".7"/>` +
      `<circle cx="128" cy="128" r="96" fill="none" stroke="#d4ffb0" stroke-width="2" opacity=".45"/>` +
      `<g fill="#ffffff" opacity=".95">` +
      `<path d="${twinkle(84, 70, 11)}"/>` +
      `<path d="${twinkle(180, 98, 8)}"/>` +
      `<path d="${twinkle(116, 180, 10)}"/>` +
      `<path d="${twinkle(62, 150, 7)}"/>` +
      `<path d="${twinkle(188, 170, 12)}"/>` +
      `<path d="${twinkle(148, 54, 7)}"/>` +
      `<path d="${twinkle(128, 128, 9)}"/>` +
      `</g>` +
      `<g fill="#e3ffc2" opacity=".85">` +
      `<circle cx="104" cy="112" r="3"/><circle cx="160" cy="142" r="3.5"/>` +
      `<circle cx="96" cy="206" r="3"/><circle cx="204" cy="70" r="3"/>` +
      `<circle cx="46" cy="104" r="2.5"/><circle cx="214" cy="132" r="2.5"/>` +
      `</g>`,
  ),

  bolt: (() => {
    // Classic stepped cartoon bolt: 4 slanted sections, each jogging right at the elbows, tapering to a tip.
    const B =
      'M34 0L58 0L41.9 68L56 68L40.2 142L52.5 142L38.2 210L48.5 210L34 270L35.2 218L23.5 218L34.2 150L21.5 150L34.5 76L20 76Z';
    const core = 'M46 2L32 70L45 70L31.5 145L43 145L31 213L41 213L35 258';
    const br = 'M22 80L11 102L17 104L9 128M53 146L63 166L57 168L64 192';
    return svg(
      72,
      300,
      `<g transform="translate(2 0)">` +
        `<path d="${B}" fill="#8fdcff" stroke="#8fdcff" stroke-width="19" stroke-linejoin="round" opacity=".3"/>` +
        `<g fill="none" stroke-linejoin="round" stroke-linecap="round">` +
        `<path d="${br}" stroke="${O}" stroke-width="8"/>` +
        `<path d="${br}" stroke="#8fdcff" stroke-width="4.5"/>` +
        `<path d="${br}" stroke="#fff36b" stroke-width="1.8"/>` +
        `</g>` +
        `<path d="${B}" fill="${O}" stroke="${O}" stroke-width="14" stroke-linejoin="round"/>` +
        `<path d="${B}" fill="#8fdcff" stroke="#8fdcff" stroke-width="9" stroke-linejoin="round"/>` +
        `<path d="${B}" fill="#ffe94d"/>` +
        `<path d="${core}" fill="none" stroke="#ffffff" stroke-width="3.5" stroke-linejoin="round" stroke-linecap="round"/>` +
        `<circle cx="34" cy="276" r="21" fill="#8fdcff" opacity=".35"/>` +
        `<path d="${star(34, 276, [18, 11, 16, 11, 18, 11, 16, 11], 6, -90)}" fill="#fff36b" ${ol(3)}/>` +
        `<path d="${star(34, 276, rep(4, 9), 3.5, -90)}" fill="#ffffff"/>` +
        `</g>`,
    );
  })(),

  bomb: svg(
    52,
    52,
    `<defs><clipPath id="bomb_c"><circle cx="22" cy="31" r="16.5"/></clipPath></defs>` +
      `<path d="M35 15.5Q37.5 8.5 42.5 10.5" fill="none" stroke="${O}" stroke-width="5.5" stroke-linecap="round"/>` +
      `<path d="M35 15.5Q37.5 8.5 42.5 10.5" fill="none" stroke="#d9b27c" stroke-width="2.4" stroke-linecap="round"/>` +
      `<circle cx="22" cy="31" r="16.5" fill="#1c2650"/>` +
      `<circle cx="19" cy="28" r="15.5" fill="#34477e" clip-path="url(#bomb_c)"/>` +
      `<circle cx="22" cy="31" r="16.5" fill="none" ${ol(3)}/>` +
      `<rect x="-6" y="-4" width="12" height="8" rx="2" transform="translate(32.8 18.8) rotate(40)" fill="#a9b4c9" ${ol(3)}/>` +
      `<ellipse cx="14.5" cy="23.5" rx="5" ry="3.2" transform="rotate(-40 14.5 23.5)" fill="#fff" opacity=".7"/>` +
      `<circle cx="11.5" cy="29.5" r="1.6" fill="#fff" opacity=".6"/>` +
      `<path d="${star(42.5, 10.5, [7, 4.8, 7, 4.8, 7, 4.8, 7, 4.8], 2.8, -90)}" fill="#ff9a1f" ${ol(1.3)}/>` +
      `<path d="${star(42.5, 10.5, rep(4, 4.4), 1.6, -45)}" fill="#fff36b"/>` +
      `<circle cx="42.5" cy="10.5" r="1.5" fill="#fff"/>`,
  ),

  explosion: svg(
    220,
    220,
    // smoke puffs (outlined clusters, peeking out behind the burst)
    `<g fill="#cfc6de" ${ol(5)}>` +
      `<circle cx="38" cy="172" r="18"/><circle cx="60" cy="190" r="15"/><circle cx="24" cy="150" r="12"/>` +
      `<circle cx="182" cy="42" r="16"/><circle cx="162" cy="28" r="12"/><circle cx="198" cy="64" r="11"/>` +
      `<circle cx="190" cy="176" r="12"/><circle cx="174" cy="194" r="9"/>` +
      `</g>` +
      `<g fill="#cfc6de">` +
      `<circle cx="38" cy="172" r="18"/><circle cx="60" cy="190" r="15"/><circle cx="24" cy="150" r="12"/>` +
      `<circle cx="182" cy="42" r="16"/><circle cx="162" cy="28" r="12"/><circle cx="198" cy="64" r="11"/>` +
      `<circle cx="190" cy="176" r="12"/><circle cx="174" cy="194" r="9"/>` +
      `</g>` +
      `<g fill="#efeaf6"><circle cx="33" cy="166" r="7"/><circle cx="177" cy="36" r="6"/><circle cx="186" cy="171" r="4"/></g>` +
      `<path d="${star(110, 110, [96, 78, 92, 74, 98, 80, 90, 76, 96, 78, 92, 72], 60, -84)}" fill="#ff7a1f" ${ol(5)}/>` +
      `<path d="${star(110, 112, [76, 62, 72, 60, 78, 62, 70, 60, 76, 64, 72, 58], 48, -70)}" fill="#ffb52e"/>` +
      `<path d="${star(108, 110, [56, 46, 54, 44, 58, 46, 52, 44], 36, -80)}" fill="#ffe14d"/>` +
      `<circle cx="108" cy="110" r="30" fill="#fff6c8"/>` +
      `<circle cx="98" cy="100" r="14" fill="#ffffff"/>` +
      `<g fill="#ffb52e" ${ol(3)}>` +
      `<circle cx="28" cy="40" r="6"/><circle cx="198" cy="118" r="4.5"/><circle cx="108" cy="206" r="4.5"/>` +
      `</g>`,
  ),

  boomerang: svg(
    60,
    60,
    `<defs><clipPath id="boomerang_c"><path d="${BOOM}"/></clipPath></defs>` +
      `<path d="${BOOM}" fill="#ff8a2a"/>` +
      `<g clip-path="url(#boomerang_c)">` +
      `<path d="M30 27Q40 33 47 51L60 52L60 30Q48 22 30 18Z" fill="#e0531f"/>` +
      `<path d="M30 27Q20 33 13 51L8 52L14 40Q20 30 30 24Z" fill="#e0531f" opacity=".6"/>` +
      `<g stroke="#ffffff" stroke-width="4">` +
      `<path d="M2 36L20 40M5 27L22 33M58 36L40 40M55 27L38 33"/>` +
      `</g>` +
      `</g>` +
      `<path d="${BOOM}" fill="none" ${ol(3.5)}/>` +
      `<path d="M10.5 33Q15 21 24.5 13.5" fill="none" stroke="#ffd9a8" stroke-width="2.4" stroke-linecap="round"/>` +
      `<circle cx="30" cy="16" r="2" fill="#fff" opacity=".8"/>`,
  ),

  // Whirlwind: a grey-white funnel with swirling bands (spun in game by flipping and wobbling).
  twister: (() => {
    const body = 'M6 22C8 48 24 66 33 84C38 95 41 107 43 121L53 121C55 107 58 95 63 84C72 66 88 48 90 22Z';
    const top = 'M6 22C6 14 26 9 48 9C70 9 90 14 90 22C90 30 70 35 48 35C26 35 6 30 6 22Z';
    const bands = 'M9 36Q48 50 87 36M17 56Q48 68 79 56M28 76Q48 85 68 76M36 96Q48 102 60 96M40 112Q48 116 56 112';
    return svg(
      96,
      128,
      `<defs><linearGradient id="twister_g" x1="0" y1="0" x2="0" y2="1">` +
        `<stop offset="0" stop-color="#f6fbff"/><stop offset="1" stop-color="#b4c8e6"/></linearGradient>` +
        `<clipPath id="twister_c"><path d="${body}"/></clipPath></defs>` +
        `<path d="${body}" fill="url(#twister_g)" ${ol(3.5)}/>` +
        `<g clip-path="url(#twister_c)" fill="none" stroke-linecap="round">` +
        `<path d="${bands}" stroke="#93a9cc" stroke-width="5" transform="translate(0 4)"/>` +
        `<path d="${bands}" stroke="#ffffff" stroke-width="4"/>` +
        `<path d="M70 26C74 50 64 72 54 100" stroke="#93a9cc" stroke-width="4" opacity=".6"/>` +
        `</g>` +
        `<path d="${top}" fill="#dfe9f8" ${ol(3.5)}/>` +
        `<path d="M14 22C20 17 36 14 48 14C60 14 76 17 82 22C76 27 60 30 48 30C36 30 20 27 14 22Z" fill="#c4d4ec"/>` +
        `<path d="M26 21Q48 13 70 21" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round"/>`,
    );
  })(),

  // Spike Trap, seen from above: an iron plate ringed with spikes, a light in the middle. Glacier Mines are icy.
  ...Object.fromEntries(
    (
      [
        ['trap', '#e3e9f3', '#a9b6cc', '#6d7690', '#545c75', '#ff4d5e', '#ffd1d6'],
        ['trap_frost', '#eefbff', '#8fd3f2', '#4f8fd0', '#356fb3', '#6ff3ff', '#e8fdff'],
      ] as const
    ).map(([key, spike, spikeShade, plate, plateDark, light, glint]) => [
      key,
      svg(
        64,
        64,
        `<path d="${star(32, 32, rep(8, 29), 17, -90)}" fill="${spike}" ${ol(3)}/>` +
          `<path d="${star(32, 32, rep(8, 24), 17, -90)}" fill="${spikeShade}" opacity=".55"/>` +
          `<circle cx="32" cy="32" r="17" fill="${plate}" ${ol(3)}/>` +
          `<circle cx="32" cy="32" r="12" fill="${plateDark}"/>` +
          `<path d="M22 27Q26 21 33 20" fill="none" stroke="#ffffff" stroke-width="2.4" stroke-linecap="round" opacity=".6"/>` +
          `<circle cx="32" cy="32" r="6.5" fill="${light}" ${ol(2.5)}/>` +
          `<circle cx="30" cy="30" r="2.2" fill="${glint}"/>`,
      ),
    ]),
  ),

  // Ward Orb: a glassy blue magic orb; the Aegis one is gold.
  ...Object.fromEntries(
    (
      [
        ['ward', '#f0fdff', '#6ff3ff', '#2aa9d6', '#8ff0ff'],
        ['ward_holy', '#fffbe0', '#ffd23f', '#e0901b', '#fff1a0'],
      ] as const
    ).map(([key, hi, base, dark, glow]) => [
      key,
      svg(
        56,
        56,
        `<defs><radialGradient id="${key}_g" cx="28" cy="28" r="28" gradientUnits="userSpaceOnUse">` +
          `<stop offset=".45" stop-color="${glow}" stop-opacity=".6"/><stop offset="1" stop-color="${glow}" stop-opacity="0"/></radialGradient>` +
          `<radialGradient id="${key}_b" cx="23" cy="22" r="18" gradientUnits="userSpaceOnUse">` +
          `<stop offset="0" stop-color="${hi}"/><stop offset=".55" stop-color="${base}"/><stop offset="1" stop-color="${dark}"/></radialGradient></defs>` +
          `<circle cx="28" cy="28" r="27" fill="url(#${key}_g)"/>` +
          `<circle cx="28" cy="28" r="15" fill="url(#${key}_b)" ${ol(2.6)}/>` +
          `<path d="M20 24Q22 18 28 17" fill="none" stroke="#fff" stroke-width="2.6" stroke-linecap="round"/>` +
          `<path d="${twinkle(35, 33, 5)}" fill="#fff" opacity=".9"/>`,
      ),
    ]),
  ),

  // Shuriken: a four-bladed throwing star (spun in game).
  shuriken: svg(
    44,
    44,
    `<path d="M22 2L27 17L42 22L27 27L22 42L17 27L2 22L17 17Z" fill="#e3e9f3" ${ol(2.5)}/>` +
      `<path d="M22 2L27 17L22 22ZM42 22L27 27L22 22ZM22 42L17 27L22 22ZM2 22L17 17L22 22Z" fill="#a9b6cc"/>` +
      `<circle cx="22" cy="22" r="5" fill="#545c75" ${ol(2)}/>` +
      `<path d="M20 8L22 15" stroke="#fff" stroke-width="1.6" stroke-linecap="round"/>`,
  ),

  // Javelin, pointing right; the Dragon Lance is gold and red.
  ...Object.fromEntries(
    (
      [
        ['spear', '#c98a4b', '#9a6232', '#e6ecf5', '#9aa6bf', '#d8e8ff'],
        ['spear_dragon', '#c43c2c', '#8a2418', '#ffd36b', '#e39b1b', '#fff1b8'],
      ] as const
    ).map(([key, shaft, shaftDark, head, headDark, shine]) => [
      key,
      svg(
        112,
        22,
        `<rect x="4" y="8.5" width="80" height="5" rx="2.5" fill="${shaft}" ${ol(2)}/>` +
          `<path d="M8 12H80" stroke="${shaftDark}" stroke-width="1.2" stroke-linecap="round"/>` +
          `<path d="M4 6L14 11L4 16Z" fill="${head}" ${ol(1.8)}/>` +
          `<path d="M80 4L108 11L80 18L85 11Z" fill="${head}" ${ol(2)}/>` +
          `<path d="M85 11.5L104 11.5L84 16.5Z" fill="${headDark}"/>` +
          `<path d="M84 7.5L96 9.6" stroke="${shine}" stroke-width="1.4" stroke-linecap="round"/>`,
      ),
    ]),
  ),

  // Sentry Turret: a little crossbow on a wooden tripod (the Ballista is gold).
  ...Object.fromEntries(
    (
      [
        ['turret', '#a8683a', '#7a4524', '#8a93ad', '#5d6684'],
        ['turret_gold', '#c9973e', '#8a6420', '#ffd36b', '#e39b1b'],
      ] as const
    ).map(([key, wood, woodDark, metal, metalDark]) => [
      key,
      svg(
        72,
        72,
        `<path d="M36 40L18 66M36 40L54 66M36 40L36 68" fill="none" stroke="${O}" stroke-width="8" stroke-linecap="round"/>` +
          `<path d="M36 40L18 66M36 40L54 66M36 40L36 68" fill="none" stroke="${wood}" stroke-width="4.5" stroke-linecap="round"/>` +
          `<rect x="14" y="26" width="44" height="12" rx="4" fill="${wood}" ${ol(2.5)}/>` +
          `<path d="M18 34H54" stroke="${woodDark}" stroke-width="2"/>` +
          `<path d="M50 14Q64 32 50 50" fill="none" stroke="${O}" stroke-width="7" stroke-linecap="round"/>` +
          `<path d="M50 14Q64 32 50 50" fill="none" stroke="${metal}" stroke-width="3.6" stroke-linecap="round"/>` +
          `<path d="M50 14L40 32L50 50" fill="none" stroke="#fff6e0" stroke-width="1.6"/>` +
          `<path d="M58 28L68 32L58 36Z" fill="${metal}" ${ol(2)}/>` +
          `<circle cx="22" cy="32" r="4" fill="${metalDark}" ${ol(1.8)}/>`,
      ),
    ]),
  ),

  // Spirit Wisp: a little ghost flame with two eyes.
  wisp: svg(
    40,
    48,
    `<defs><radialGradient id="wisp_g" cx="20" cy="28" r="20" gradientUnits="userSpaceOnUse">` +
      `<stop offset=".4" stop-color="#bff8ff" stop-opacity=".7"/><stop offset="1" stop-color="#8ff0ff" stop-opacity="0"/></radialGradient></defs>` +
      `<circle cx="20" cy="28" r="20" fill="url(#wisp_g)"/>` +
      `<path d="M20 6C24 14 31 18 31 29C31 36 26 41 20 41C14 41 9 36 9 29C9 21 15 18 16 12C17 15 18 17 20 18C20 13 19 10 20 6Z" fill="#effdff" ${ol(2.4)}/>` +
      `<path d="M27 26C28 32 25 37 20 38" fill="none" stroke="#9fe8f6" stroke-width="2.4" stroke-linecap="round"/>` +
      `<ellipse cx="16.5" cy="29" rx="2" ry="3" fill="${O}"/><ellipse cx="23.5" cy="29" rx="2" ry="3" fill="${O}"/>`,
  ),

  spark: svg(
    24,
    24,
    `<path d="${star(12, 12, rep(4, 9), 3.6)}" fill="#ffe95c" ${ol(2)}/>` +
      `<path d="${star(12, 12, rep(4, 4.4), 1.6)}" fill="#ffffff"/>`,
  ),

  // ───────────────────────── Pickups ─────────────────────────
  gem_s: gem(26, 32, { hi: '#e3f4ff', light: '#9fd6ff', base: '#3fa9ff', dark: '#1f6fd1' }, 3),
  gem_m: gem(32, 40, { hi: '#e6ffe0', light: '#9ef08a', base: '#3fcf4f', dark: '#1e8f3a' }, 3),
  gem_l: gem(40, 50, { hi: '#ffe3fb', light: '#f59ae8', base: '#d13fd8', dark: '#8a1fa8' }, 3.5),

  coin: svg(
    34,
    34,
    `<circle cx="17" cy="17" r="13.5" fill="#e09a1a" ${ol(3)}/>` +
      `<circle cx="16.3" cy="16" r="10.6" fill="#ffcc33"/>` +
      `<circle cx="16.3" cy="16" r="8" fill="none" stroke="#f0a820" stroke-width="1.4"/>` +
      `<path d="${star(16.3, 16.6, rep(5, 6.4), 2.8)}" fill="#fff0a0" stroke="#d48a10" stroke-width="1.3" stroke-linejoin="round"/>` +
      `<path d="M8.3 13A8.5 8.5 0 0 1 13 7.9" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" opacity=".85"/>`,
  ),

  // A red potion (the key stays "meat": the healing pickup).
  meat: svg(
    40,
    48,
    `<defs><clipPath id="potion_c"><circle cx="20" cy="31" r="11.6"/></clipPath></defs>` +
      `<rect x="15.5" y="9" width="9" height="10" rx="1.5" fill="#e6f3ff" ${ol(2.6)}/>` +
      `<circle cx="20" cy="31" r="13.5" fill="#e6f3ff" ${ol(3)}/>` +
      `<g clip-path="url(#potion_c)">` +
      `<rect x="6" y="26" width="28" height="20" fill="#e8343f"/>` +
      `<rect x="6" y="36" width="28" height="10" fill="#b81f2d"/>` +
      `<ellipse cx="20" cy="26.4" rx="12" ry="2.2" fill="#ff7b80"/>` +
      `</g>` +
      `<rect x="13.5" y="3" width="13" height="7.5" rx="2.2" fill="#c08a52" ${ol(2.6)}/>` +
      `<path d="M10.5 27.5A10 10 0 0 1 16 21.6" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".9"/>` +
      `<circle cx="13" cy="35.5" r="1.6" fill="#fff" opacity=".7"/>`,
  ),

  magnet: (() => {
    const U = 'M8 21A16 16 0 0 1 40 21L40 43L30.5 43L30.5 21A6.5 6.5 0 0 0 17.5 21L17.5 43L8 43Z';
    return svg(
      48,
      48,
      `<defs><clipPath id="magnet_c"><path d="${U}"/></clipPath></defs>` +
        `<path d="${U}" fill="#ff4d4d"/>` +
        `<g clip-path="url(#magnet_c)">` +
        `<path d="M24 24L48 6L48 48L24 48Z" fill="#c92a3a"/>` +
        `<path d="M14.5 21H17.5V33H14.5Z" fill="#e63b45"/>` +
        `<rect x="0" y="33" width="48" height="15" fill="#dfe6f2"/>` +
        `<rect x="13.5" y="33" width="4" height="15" fill="#a9b4c9"/>` +
        `<rect x="36" y="33" width="4" height="15" fill="#a9b4c9"/>` +
        `<path d="M0 33H48" stroke="${O}" stroke-width="2.5"/>` +
        `</g>` +
        `<path d="${U}" fill="none" ${ol(3)}/>` +
        `<path d="M12.5 19A11.5 11.5 0 0 1 21 9.8" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" opacity=".8"/>` +
        `<path d="M10.5 36.5V40M33 36.5V40" stroke="#fff" stroke-width="1.8" stroke-linecap="round"/>`,
    );
  })(),

  chest: (() => {
    const LID = 'M6 35L6 23C6 12 20 7 42 7C64 7 78 12 78 23L78 35Z';
    return svg(
      84,
      72,
      `<defs>` +
        `<clipPath id="chest_lid"><path d="${LID}"/></clipPath>` +
        `<radialGradient id="chest_glow" cx=".5" cy=".5" r=".5">` +
        `<stop offset="0" stop-color="#bffaff" stop-opacity=".95"/>` +
        `<stop offset="1" stop-color="#3de8ff" stop-opacity="0"/></radialGradient>` +
        `</defs>` +
        // body
        `<rect x="6" y="33" width="72" height="33" rx="4" fill="#b8703a" ${ol(4)}/>` +
        `<path d="M9 47H75M9 57H75" stroke="#8a4d24" stroke-width="2" stroke-linecap="round"/>` +
        `<path d="M8.5 60H75.5V62Q75.5 63.5 74 63.5H10Q8.5 63.5 8.5 62Z" fill="#94532a"/>` +
        // lid
        `<path d="${LID}" fill="#cd8545"/>` +
        `<g clip-path="url(#chest_lid)">` +
        `<path d="M0 26C20 30 64 30 84 26L84 40L0 40Z" fill="#b06a33"/>` +
        `<path d="M6 18H78" stroke="#a65f2c" stroke-width="2"/>` +
        `<g fill="#ffcc33" ${ol(3)}><rect x="15" y="0" width="8" height="40"/><rect x="61" y="0" width="8" height="40"/></g>` +
        `</g>` +
        `<path d="${LID}" fill="none" ${ol(4)}/>` +
        `<path d="M11.5 22Q12 14 24 11.5" fill="none" stroke="#f3b878" stroke-width="2.6" stroke-linecap="round"/>` +
        // body bands + corners
        `<g fill="#ffcc33" ${ol(3)}>` +
        `<rect x="15" y="35" width="8" height="31"/><rect x="61" y="35" width="8" height="31"/>` +
        `<path d="M6 54V62Q6 66 10 66H16Z"/><path d="M78 54V62Q78 66 74 66H68Z"/>` +
        `</g>` +
        `<path d="M21 38V63M67 38V63" stroke="#e09a1a" stroke-width="2"/>` +
        // lid rim
        `<rect x="4" y="30" width="76" height="8" rx="3.5" fill="#ffcc33" ${ol(3.5)}/>` +
        `<path d="M8 35.5H76" stroke="#e09a1a" stroke-width="1.8" stroke-linecap="round"/>` +
        `<path d="M8 32.6H22" stroke="#fff4c0" stroke-width="1.6" stroke-linecap="round"/>` +
        // gem lock
        `<path d="M33 27H51V43Q51 47 42 51Q33 47 33 43Z" fill="#ffcc33" ${ol(3.5)}/>` +
        `<path d="M48.5 30V42.5Q48.5 45.5 42 48.5" fill="none" stroke="#e09a1a" stroke-width="2"/>` +
        `<circle cx="42" cy="38" r="11" fill="url(#chest_glow)"/>` +
        `<path d="M42 32L47 38L42 44L37 38Z" fill="#3de8ff" ${ol(2.2)}/>` +
        `<path d="M42 32L47 38H37Z" fill="#bffaff"/>` +
        `<path d="M42 32L47 38L42 44L37 38Z" fill="none" ${ol(2.2)}/>` +
        `<circle cx="40.2" cy="36.4" r="1.1" fill="#fff"/>` +
        `<path d="${twinkle(52.5, 30, 3.5)}" fill="#fff"/>`,
    );
  })(),
};
