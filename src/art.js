// Squishy-style art, all SVG strings so it stays sharp and tiny.
import { COLORS, FILLINGS, RECIPES, hash } from './game.js';

const INK = '#2A1A14';
const DEFAULT_COAT = { breed: 'american', main: 'ginger', patch: 'white' };

const col = (k) => COLORS[k] || k || '#E9A15B';
function darken(hex, f = 0.78) {
  const m = hex.match(/[0-9a-f]{2}/gi);
  if (!m) return hex;
  return '#' + m.slice(0, 3).map(h => Math.round(parseInt(h, 16) * f).toString(16).padStart(2, '0')).join('');
}

// Rounded locks of hair hanging from a line at height y, from x0 to x1 (either
// direction). Every other lock hangs a little longer so the ends look messy.
// `phase` keeps locks lined up when two pieces of hair share one edge.
function locks(x0, x1, y, drop, n, phase = 0) {
  const w = (x1 - x0) / n;
  let d = '';
  for (let i = 0; i < n; i++) {
    const a = x0 + i * w, k = drop * ((i + phase) % 2 ? 1.05 : 1.45);
    d += ` C${(a + w * 0.05).toFixed(1)} ${y + k} ${(a + w * 0.95).toFixed(1)} ${y + k} ${(a + w).toFixed(1)} ${y}`;
  }
  return d;
}
const strands = (d, c) => `<path d="${d}" stroke="${c}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".4"/>`;
const curl = (x, y, c, r = 5) => `<path d="M${x - r} ${y} a${r} ${r} 0 1 1 ${r} ${r}" fill="none" stroke="${c}" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>`;
// A soft tuft of fur pointing up from (x, y).
// A side-view foot facing right: a soft pink paw with three toe bumps.
const FOOT = '#F2A391', TOE = '#D9806F';
const foot = (x, y, s = 1) => `<g transform="translate(${x} ${y}) scale(${s})"><ellipse cx="0" cy="0" rx="11" ry="6.5" fill="${FOOT}"/>` +
  [[6, 4.2], [9.6, 2], [11.4, -1.2]].map(([tx, ty]) => `<circle cx="${tx}" cy="${ty}" r="3" fill="${FOOT}"/>`).join('') +
  `<path d="M4.6 5.6 L5.4 2.6 M8.6 3.8 L8.6 0.8" stroke="${TOE}" stroke-width="1.3" stroke-linecap="round"/></g>`;
// A top-view paw with the toes pointing up (toward the nose).
const paw = (x, y) => `<ellipse cx="${x}" cy="${y}" rx="11" ry="8" fill="${FOOT}"/>` +
  [-6, 0, 6].map(dx => `<circle cx="${x + dx}" cy="${y - 7}" r="3.6" fill="${FOOT}"/>`).join('') +
  `<path d="M${x - 3} ${y - 6} l0 3 M${x + 3} ${y - 6} l0 3" stroke="${TOE}" stroke-width="1.4" stroke-linecap="round"/>`;
const furTuft = (x, y, c, h = 12) => `<path d="M${x - 8} ${y + 6} Q${x - 4} ${y - h * 0.4} ${x + 1} ${y - h} Q${x + 3} ${y - h * 0.3} ${x + 8} ${y + 6}Z" fill="${c}"/>`;

// Side-view piggy facing right. Coat decides colors and the breed decides
// hair: rosettes, long hair, curls, or nearly none.
export function piggySide(opts = {}) {
  const { mood = 'happy', hat = false, walking = false } = opts;
  const coat = opts.coat || DEFAULT_COAT;
  const skinny = coat.breed === 'skinny';
  const main = skinny ? '#F2B8A0' : col(coat.main);
  const patch = skinny ? '#F7CDBB' : col(coat.patch);
  const dark = darken(main);

  const mouth = mood === 'hungry' || mood === 'stinky' || mood === 'bored'
    ? `<path d="M164 126 Q168 122 172 126" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M162 124 Q165 128 168 124 Q171 128 174 124" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  const eye = mood === 'bored'
    ? `<path d="M152 104 Q160 108 168 104" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    : `<g class="blink"><circle cx="160" cy="104" r="6.5" fill="${INK}"/><circle cx="162" cy="101.5" r="2.2" fill="#fff"/></g>`;

  // Long hair is drawn in the coat's own colors with no outline, so it
  // grows out of the body instead of sitting on top of it.
  let hair = '', fringe = '';
  const ldark = darken(patch);
  const backTop = (x) => 122 - 44 * Math.sqrt(Math.max(0, 1 - ((x - 96) / 72) ** 2));
  if (coat.breed === 'abyssinian') {
    hair = [40, 58, 78, 98, 120].map(x => furTuft(x, backTop(x) + 2, x > 68 && x < 116 ? patch : main)).join('') +
      [[70, 112], [104, 100], [120, 138], [60, 140], [138, 112]].map(([x, y]) =>
      `<path d="M${x - 10} ${y} a10 10 0 1 1 10 10 a6 6 0 1 0 6 -6" fill="none" stroke="${x > 68 && x < 116 ? ldark : dark}" stroke-width="3" stroke-linecap="round" opacity=".55"/>`).join('');
  } else if (coat.breed === 'peruvian' || coat.breed === 'silkie') {
    const silkie = coat.breed === 'silkie';
    const x0 = silkie ? 6 : 14, w = (150 - x0) / 8;
    // Main coat: over the back, down past the belly, and up behind the cheek.
    hair = silkie
      ? `<path d="M172 84 C156 62 124 62 100 68 C60 64 26 78 12 104 C2 124 2 148 ${x0} 168${locks(x0, 150, 168, 9, 8)} C140 150 132 130 130 114 C138 100 154 90 172 84Z" fill="${main}"/>`
      : `<path d="M128 80 C108 64 64 64 40 78 C22 88 10 112 14 140 L${x0} 168${locks(x0, 150, 168, 9, 8)} C142 150 132 130 126 110 Z" fill="${main}"/>`;
    // The patch color carries on down into the hair as one long stripe.
    const p0 = x0 + 3 * w, p1 = x0 + 6 * w;
    hair += `<path d="M${p0} 168 C${p0 - 6} 130 ${p0 - 4} 92 ${p0 + 6} 72 C${p0 + 20} 66 ${p1 - 16} 66 ${p1 - 2} 74 C${p1 + 4} 100 ${p1 + 2} 140 ${p1} 168${locks(p1, p0, 168, 9, 3, 1)}Z" fill="${patch}"/>`;
    hair += strands([0, 1, 2, 6, 7].map(i => { const c = x0 + (i + 0.5) * w; return `M${c + 4} ${i < 1 ? 120 : 98} Q${c - 4} 140 ${c} 176`; }).join(' '), dark);
    hair += strands([3, 4, 5].map(i => { const c = x0 + (i + 0.5) * w; return `M${c + 4} 92 Q${c - 4} 140 ${c} 176`; }).join(' '), ldark);
    if (silkie) {
      // Swept straight back off the face.
      hair += strands('M162 84 Q140 74 112 78 M154 94 Q134 86 116 92', dark);
    } else {
      // A side-parted fringe that tumbles over the forehead and ear.
      fringe = `<path d="M116 96 C112 72 136 58 160 64 C174 68 182 80 184 90${locks(184, 138, 90, 5, 4)} Q126 100 116 96Z" fill="${main}"/>` +
        strands('M146 68 Q154 76 150 92 M160 68 Q168 78 166 92 M134 70 Q136 82 130 94', dark);
    }
  } else if (coat.breed === 'texel') {
    // Curls make the outline itself bumpy, with a few spirals on the coat.
    const rim = [];
    for (let t = 25; t <= 330; t += 19) {
      const r = t * Math.PI / 180, x = 96 + 68 * Math.cos(r), y = 122 - 41 * Math.sin(r);
      if (y > 164 || x > 150) continue;
      rim.push([x, y]);
    }
    for (const t of [70, 100, 130, 160]) { const r = t * Math.PI / 180; rim.push([148 + 36 * Math.cos(r), 112 - 33 * Math.sin(r)]); }
    const inPatch = (x) => x > 66 && x < 116;
    hair = rim.map(([x, y]) => `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="11" fill="${inPatch(x) ? patch : main}"/>`).join('') +
      [[44, 116], [56, 140], [128, 128], [140, 96]].map(([x, y]) => curl(x, y, dark)).join('') +
      [[86, 104], [96, 136]].map(([x, y]) => curl(x, y, ldark)).join('') +
      rim.map(([x, y]) => curl(x + 1, y - 1, inPatch(x) ? ldark : dark, 4)).join('');
  } else if (skinny) {
    hair = `<path d="M60 110 Q72 104 84 110 M58 128 Q72 122 86 128 M64 146 Q76 140 88 146" stroke="#D98C77" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M176 92 q6 -14 16 -8 q-4 10 -16 8z" fill="${col(coat.main)}"/>`;
  }

  const hatSvg = hat ? `<g class="hat">${hatSide(hat === true ? 'strawberry' : hat)}</g>` : '';
  // Little pink feet with three toe bumps at the front. Long hair and curls
  // cover the body's underside, so there the feet sit lower, in front of the hair.
  const longHair = coat.breed === 'peruvian' || coat.breed === 'silkie' || coat.breed === 'texel';
  const fy = longHair ? (coat.breed === 'texel' ? 171 : 174) : 164;
  const legs = `<g class="legA">${foot(64, fy)}${foot(146, fy - 2, 0.9)}</g><g class="legB">${foot(84, fy)}${foot(128, fy - 2, 0.9)}</g>`;

  return `<svg viewBox="0 0 200 200" class="piggy-svg ${walking ? 'walking' : ''}" aria-hidden="true">
    <ellipse cx="100" cy="176" rx="72" ry="7" fill="#000" opacity=".12"/>
    <g class="body">
      ${longHair ? '' : legs}
      <ellipse cx="96" cy="122" rx="72" ry="44" fill="${main}"/>
      <path d="M70 80 Q96 74 116 84 Q120 120 108 162 Q84 166 64 160 Q56 120 70 80Z" fill="${patch}"/>
      <path d="M32 112 Q28 96 40 90 Q36 104 44 110 Z" fill="${dark}"/>
      <ellipse cx="148" cy="112" rx="40" ry="36" fill="${main}"/>
      <path d="M180 104 Q190 116 184 128 Q170 132 162 122 Q170 112 180 104Z" fill="${patch}"/>
      ${hair}
      ${longHair ? legs : ''}
      <ellipse cx="136" cy="80" rx="14" ry="10" transform="rotate(-25 136 80)" fill="${dark}"/><ellipse cx="136" cy="81" rx="8" ry="5" transform="rotate(-25 136 81)" fill="#FFB3C1"/>
      ${fringe}
      ${hatSvg}
      ${eye}
      <ellipse cx="164" cy="122" rx="8" ry="4.5" fill="#FF8FA8" opacity=".7"/>
      <circle cx="186" cy="114" r="4" fill="#E86A86"/>
      ${mouth}
    </g>
  </svg>`;
}

// Hats drawn in side-view piggy coordinates. The head is around (148, 112),
// its top at about y 76, the ear at (136, 80).
const HAT_SIDE = {
  strawberry: `<path d="M112 76 Q112 42 140 40 Q168 42 168 74 Q140 66 112 76Z" fill="#FF5C7A" stroke="#D93A5B" stroke-width="2.5" stroke-linejoin="round"/><g fill="#FFF3B0"><circle cx="122" cy="64" r="2.5"/><circle cx="130" cy="52" r="2.5"/><circle cx="146" cy="50" r="2.5"/><circle cx="158" cy="60" r="2.5"/><circle cx="140" cy="62" r="2.5"/></g><path d="M140 44 L126 40 L134 36 L130 28 L140 34 L150 28 L146 36 L154 40Z" fill="#4CAF50" stroke="#2E7D32" stroke-width="2" stroke-linejoin="round"/><path d="M140 34 Q140 24 146 20" stroke="#4CAF50" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  bow: `<path d="M150 66 Q128 46 126 62 Q126 76 150 66Z M150 66 Q172 46 174 62 Q174 76 150 66Z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="2.5" stroke-linejoin="round"/><circle cx="150" cy="66" r="6" fill="#FF8FA8" stroke="#C93A5B" stroke-width="2.5"/>`,
  flower: `<g fill="#fff" stroke="#E6DCC8" stroke-width="2">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="150" cy="50" rx="7" ry="13" transform="rotate(${a} 150 62)"/>`).join('')}</g><circle cx="150" cy="62" r="7" fill="#FFD34D" stroke="#E0941C" stroke-width="2"/>`,
  party: `<path d="M150 14 L124 76 L176 76Z" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3" stroke-linejoin="round"/><path d="M138 44 L162 44 M131 60 L169 60" stroke="#FFD34D" stroke-width="5"/><circle cx="150" cy="14" r="7" fill="#FF8FA8" stroke="#C93A5B" stroke-width="2"/>`,
  beanie: `<path d="M114 78 Q118 34 150 32 Q182 34 186 78Z" fill="#4FA8F5" stroke="#2369B8" stroke-width="3"/><path d="M128 50 Q150 42 172 50 M124 62 Q150 54 176 62" stroke="#2369B8" stroke-width="2.5" fill="none" opacity=".6"/><path d="M112 78 Q150 66 188 78 L188 88 Q150 78 112 88Z" fill="#2369B8"/><circle cx="150" cy="30" r="8" fill="#FFF3B0" stroke="#E0941C" stroke-width="2"/>`,
  sunhat: `<ellipse cx="148" cy="74" rx="52" ry="12" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M118 74 Q124 38 148 38 Q172 38 178 74Z" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M120 66 Q148 54 176 66" stroke="#FF5C7A" stroke-width="6" fill="none"/>`,
  chef: `<path d="M118 74 Q112 50 134 46 Q142 30 160 40 Q178 36 180 56 Q188 70 174 76Z" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><rect x="120" y="68" width="56" height="12" rx="4" fill="#fff" stroke="#D5CDBA" stroke-width="3"/>`,
  dumpling: `<circle cx="150" cy="56" r="20" fill="#FFE6C8" stroke="#D9A86E" stroke-width="3"/><path d="M150 36 Q140 44 138 54 M150 36 Q150 46 148 54 M150 36 Q160 44 162 54" stroke="#D9A86E" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="144" cy="60" r="2" fill="#2A1A14"/><circle cx="156" cy="60" r="2" fill="#2A1A14"/><path d="M147 64 Q150 67 153 64" stroke="#2A1A14" stroke-width="1.6" fill="none"/>`,
  crown: `<path d="M120 76 L116 42 L134 58 L150 34 L166 58 L184 42 L180 76Z" fill="#FFD34D" stroke="#E0941C" stroke-width="3" stroke-linejoin="round"/><circle cx="150" cy="66" r="5" fill="#FF5C7A"/><circle cx="132" cy="68" r="3.5" fill="#4FA8F5"/><circle cx="168" cy="68" r="3.5" fill="#6FCF4F"/>`,
  wizard: `<path d="M150 4 L126 74 L178 74Z" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3" stroke-linejoin="round"/><ellipse cx="150" cy="74" rx="38" ry="9" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><path d="M146 30 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z M156 52 l1.5 3.5 3.5 .5 -2.5 2.5 .5 3.5 -3 -2 -3 2 .5 -3.5 -2.5 -2.5 3.5 -.5z" fill="#FFD34D"/>`,
  // New hats (v82).
  hay: `<g stroke-linecap="round" fill="none"><path d="M116 78 Q120 62 130 58 M124 78 Q126 56 138 50 M134 76 Q138 50 150 46 M146 74 Q152 48 164 48 M158 76 Q166 54 176 56 M168 78 Q176 62 184 66" stroke="#C9A43A" stroke-width="6"/><path d="M120 76 Q126 60 134 54 M140 74 Q146 54 156 50 M162 76 Q170 60 180 60 M150 76 Q132 58 118 62 M156 74 Q172 56 186 70" stroke="#F2D46B" stroke-width="4"/></g><path d="M112 78 Q150 64 188 78 Q150 84 112 78Z" fill="#E8C24F" stroke="#C9A43A" stroke-width="2.5"/>`,
  carrot: `<path d="M124 56 Q120 72 136 72 L190 60 L136 48 Q124 46 124 56Z" fill="#FF9A3C" stroke="#D86A14" stroke-width="2.5" stroke-linejoin="round"/><path d="M146 52 L148 58 M160 54 L160 60 M172 57 L172 62 M142 66 L144 70" stroke="#D86A14" stroke-width="2" stroke-linecap="round"/><path d="M126 54 Q112 40 106 44 Q114 50 124 58 Q106 54 102 62 Q114 62 124 60 Q118 34 126 30 Q128 44 128 54Z" fill="#6FCF4F" stroke="#3E9A2E" stroke-width="2" stroke-linejoin="round"/>`,
  bee: `<path d="M118 80 Q148 64 182 80" stroke="#3B2A24" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M138 72 Q132 52 124 40 M160 70 Q166 50 176 38" stroke="#3B2A24" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="123" cy="38" r="7" fill="#FFD34D" stroke="#3B2A24" stroke-width="3"/><circle cx="177" cy="36" r="7" fill="#FFD34D" stroke="#3B2A24" stroke-width="3"/>`,
  kitty: `<path d="M118 80 Q148 66 182 80" stroke="#FF8FA8" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M124 76 L130 42 L150 70Z M150 70 L170 40 L178 76Z" fill="#A8A09A" stroke="#6E6660" stroke-width="3" stroke-linejoin="round"/><path d="M130 70 L133 52 L143 68Z M157 68 L168 50 L172 72Z" fill="#FFB3C1"/>`,
  cap: `<path d="M120 78 Q122 46 150 44 Q176 46 180 78Z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="3" stroke-linejoin="round"/><path d="M150 44 Q148 60 150 78" stroke="#C93A5B" stroke-width="2" fill="none" opacity=".6"/><path d="M172 72 Q190 66 198 76 Q186 84 172 80Z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="3" stroke-linejoin="round"/><circle cx="150" cy="44" r="4.5" fill="#FFD34D" stroke="#C93A5B" stroke-width="2"/>`,
  bunny: `<path d="M118 80 Q148 66 182 80" stroke="#FF8FA8" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="136" cy="44" rx="10" ry="28" transform="rotate(-14 136 72)" fill="#FFF7EC" stroke="#D9C7B4" stroke-width="3"/><ellipse cx="136" cy="48" rx="5" ry="19" transform="rotate(-14 136 72)" fill="#FFB3C1"/><ellipse cx="164" cy="44" rx="10" ry="28" transform="rotate(16 164 72)" fill="#FFF7EC" stroke="#D9C7B4" stroke-width="3"/><ellipse cx="164" cy="48" rx="5" ry="19" transform="rotate(16 164 72)" fill="#FFB3C1"/>`,
  mushroom: `<path d="M108 80 Q108 38 150 36 Q192 38 192 80 Q150 70 108 80Z" fill="#FF5C5C" stroke="#C93A3A" stroke-width="3" stroke-linejoin="round"/><g fill="#fff"><circle cx="132" cy="56" r="7"/><circle cx="156" cy="46" r="6"/><circle cx="174" cy="62" r="7"/><circle cx="150" cy="66" r="4"/><circle cx="118" cy="72" r="3.5"/></g>`,
  flowers: `${[[118, 78, '#FF8FA8'], [132, 72, '#FFD34D'], [148, 70, '#7FC8F8'], [164, 71, '#FF8FA8'], [180, 77, '#FFD34D']].map(([x, y, c]) => `<g>${[0, 72, 144, 216, 288].map(a => `<circle cx="${x}" cy="${y - 6}" r="5" fill="${c}" transform="rotate(${a} ${x} ${y})"/>`).join('')}<circle cx="${x}" cy="${y}" r="3.5" fill="#fff"/></g>`).join('')}<path d="M112 82 Q150 66 188 82" stroke="#6FCF4F" stroke-width="3" fill="none" opacity=".8"/>`,
  icecream: `<path d="M134 56 L150 6 L166 56Z" fill="#F2C27E" stroke="#C98F4B" stroke-width="3" stroke-linejoin="round"/><path d="M140 40 L158 24 M138 50 L162 30 M144 52 L164 42 M160 40 L144 22 M162 52 L138 32" stroke="#C98F4B" stroke-width="1.8" opacity=".7"/><path d="M116 78 Q112 54 132 52 Q150 42 168 52 Q188 54 184 78 Q178 72 172 82 Q164 72 156 80 Q148 72 140 84 Q132 72 124 80 Q118 74 116 78Z" fill="#FFB3C1" stroke="#E86A86" stroke-width="3" stroke-linejoin="round"/><g stroke-width="3" stroke-linecap="round"><path d="M130 62 l4 -2" stroke="#7FC8F8"/><path d="M146 58 l3 3" stroke="#FFD34D"/><path d="M162 62 l4 -1" stroke="#6FCF4F"/><path d="M138 70 l2 3" stroke="#fff"/><path d="M172 70 l3 -2" stroke="#7FC8F8"/></g>`,
  cowboy: `<path d="M122 72 Q120 42 134 40 Q150 48 166 40 Q180 42 178 72Z" fill="#C98A4B" stroke="#8A5A2B" stroke-width="3" stroke-linejoin="round"/><path d="M122 64 Q150 70 178 64" stroke="#FF5C7A" stroke-width="6" fill="none"/><path d="M100 70 Q106 64 118 68 Q150 78 182 68 Q194 64 200 70 Q192 84 150 84 Q108 84 100 70Z" fill="#D99B5B" stroke="#8A5A2B" stroke-width="3" stroke-linejoin="round"/>`,
  pumpkin: `<path d="M150 46 Q156 30 166 32" stroke="#4CAF50" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M118 78 Q110 48 134 46 Q150 40 166 46 Q190 48 182 78 Q150 84 118 78Z" fill="#FF9A3C" stroke="#D86A14" stroke-width="3" stroke-linejoin="round"/><path d="M134 47 Q128 62 132 80 M150 43 Q148 62 150 82 M166 47 Q172 62 168 80" stroke="#D86A14" stroke-width="2.5" fill="none"/>`,
  santa: `<path d="M122 72 C124 40 140 26 116 22 C152 16 176 40 178 72Z" fill="#FF4F5E" stroke="#C9303F" stroke-width="3" stroke-linejoin="round"/><rect x="116" y="68" width="68" height="14" rx="7" fill="#fff" stroke="#E0D8CC" stroke-width="2.5"/><circle cx="114" cy="22" r="9" fill="#fff" stroke="#E0D8CC" stroke-width="2.5"/>`,
  frog: `<path d="M116 80 Q116 48 150 46 Q184 48 184 80 Q150 72 116 80Z" fill="#7ED957" stroke="#3E9A2E" stroke-width="3" stroke-linejoin="round"/><circle cx="134" cy="46" r="12" fill="#7ED957" stroke="#3E9A2E" stroke-width="3"/><circle cx="166" cy="46" r="12" fill="#7ED957" stroke="#3E9A2E" stroke-width="3"/><circle cx="134" cy="46" r="7.5" fill="#fff"/><circle cx="166" cy="46" r="7.5" fill="#fff"/><circle cx="136" cy="46" r="4" fill="${INK}"/><circle cx="168" cy="46" r="4" fill="${INK}"/><path d="M136 64 Q150 72 164 64" stroke="#3E9A2E" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  cupcake: `<path d="M126 80 L120 60 L180 60 L174 80Z" fill="#9FD6F5" stroke="#4C9BD0" stroke-width="3" stroke-linejoin="round"/><path d="M132 62 L135 79 M144 62 L145 80 M156 62 L155 80 M168 62 L165 79" stroke="#4C9BD0" stroke-width="2"/><path d="M116 62 Q112 42 134 44 Q138 26 156 30 Q176 28 174 44 Q190 46 184 62Z" fill="#FFE1EA" stroke="#E86A86" stroke-width="3" stroke-linejoin="round"/><path d="M128 52 Q150 44 170 52" stroke="#FFB3C1" stroke-width="3" fill="none"/><g stroke-width="3" stroke-linecap="round"><path d="M126 58 l3 -2" stroke="#FFD34D"/><path d="M146 54 l3 2" stroke="#7FC8F8"/><path d="M168 56 l3 -2" stroke="#6FCF4F"/><path d="M140 40 l2 3" stroke="#7B6CF6"/></g><circle cx="158" cy="24" r="7" fill="#FF4F5E" stroke="#C9303F" stroke-width="2.5"/><path d="M158 18 Q160 10 166 8" stroke="#4CAF50" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
  propeller: `<path d="M118 78 Q120 46 150 44 Q180 46 182 78Z" fill="#FFD34D" stroke="#C98F1B" stroke-width="3" stroke-linejoin="round"/><path d="M150 44 Q136 50 132 78 L150 78Z" fill="#FF5C7A"/><path d="M150 44 Q164 50 168 78 L182 78 Q180 46 150 44Z" fill="#4FA8F5"/><path d="M118 78 Q120 46 150 44 Q180 46 182 78Z" fill="none" stroke="#C98F1B" stroke-width="3" stroke-linejoin="round"/><path d="M150 44 L150 30" stroke="#6E7A88" stroke-width="3"/><g class="prop"><ellipse cx="137" cy="29" rx="13" ry="4.5" fill="#6FCF4F" stroke="#3E9A2E" stroke-width="2"/><ellipse cx="163" cy="29" rx="13" ry="4.5" fill="#FF5C7A" stroke="#C93A5B" stroke-width="2"/></g><circle cx="150" cy="29" r="3.5" fill="#FFD34D" stroke="#C98F1B" stroke-width="2"/>`,
  steamer: `<path d="M122 78 L122 62 Q150 68 178 62 L178 78 Q150 86 122 78Z" fill="#E8C27A" stroke="#9C6A3A" stroke-width="3" stroke-linejoin="round"/><path d="M122 70 Q150 77 178 70" stroke="#9C6A3A" stroke-width="2" fill="none"/><path d="M120 62 Q122 40 150 38 Q178 40 180 62 Q150 68 120 62Z" fill="#F2D59A" stroke="#9C6A3A" stroke-width="3" stroke-linejoin="round"/><path d="M130 56 Q150 48 170 56 M136 46 Q150 42 164 46" stroke="#D9A85A" stroke-width="2" fill="none"/><rect x="144" y="32" width="12" height="7" rx="3" fill="#C98A4B" stroke="#9C6A3A" stroke-width="2"/><path d="M136 30 q-5 -6 0 -12 q5 -6 0 -12 M166 30 q-5 -6 0 -12 q5 -6 0 -12" stroke="#fff" stroke-width="3.5" fill="none" stroke-linecap="round" opacity=".9"/>`,
  dino: `${[[124, 82, -32], [138, 76, -14], [154, 74, 4], [170, 78, 22]].map(([x, y, a], i) => `<path d="M${x - 9} ${y + 4} L${x} ${y - 16} L${x + 9} ${y + 4}Z" transform="rotate(${a} ${x} ${y})" fill="${i % 2 ? '#FF9A3C' : '#7ED957'}" stroke="${i % 2 ? '#D86A14' : '#3E9A2E'}" stroke-width="3" stroke-linejoin="round"/>`).join('')}`,
  topper: `<ellipse cx="150" cy="76" rx="36" ry="7" fill="#3D3550" stroke="#221E30" stroke-width="3"/><path d="M130 76 L132 24 L168 24 L170 76Z" fill="#3D3550" stroke="#221E30" stroke-width="3" stroke-linejoin="round"/><path d="M131 58 L169 58 L169.6 68 L130.4 68Z" fill="#FF5C7A"/><ellipse cx="150" cy="24" rx="18" ry="5" fill="#4E4566" stroke="#221E30" stroke-width="3"/><circle cx="164" cy="63" r="4" fill="#FFD34D"/>`,
  viking: `<path d="M124 64 Q104 60 104 30 Q112 52 128 54Z M176 64 Q196 60 196 30 Q188 52 172 54Z" fill="#FFF3DC" stroke="#C9B48A" stroke-width="3" stroke-linejoin="round"/><path d="M118 78 Q120 44 150 42 Q180 44 182 78Z" fill="#B9C2CC" stroke="#6E7A88" stroke-width="3" stroke-linejoin="round"/><path d="M116 76 Q150 66 184 76 L184 84 Q150 74 116 84Z" fill="#E0A84B" stroke="#A8762A" stroke-width="2.5" stroke-linejoin="round"/><path d="M150 42 L150 72" stroke="#6E7A88" stroke-width="3"/><g fill="#6E7A88"><circle cx="130" cy="78" r="2"/><circle cx="150" cy="74" r="2"/><circle cx="170" cy="78" r="2"/></g>`,
  grad: `<path d="M124 80 Q124 60 150 58 Q176 60 176 80 Q150 74 124 80Z" fill="#3D3550" stroke="#221E30" stroke-width="3" stroke-linejoin="round"/><path d="M106 58 L150 46 L194 58 L150 70Z" fill="#3D3550" stroke="#221E30" stroke-width="3" stroke-linejoin="round"/><path d="M150 58 Q174 60 180 66 L180 82" stroke="#FFD34D" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M176 80 L180 92 L184 80Z" fill="#FFD34D" stroke="#E0941C" stroke-width="1.5"/><circle cx="150" cy="58" r="3.5" fill="#FFD34D"/>`,
  halo: `<ellipse cx="150" cy="50" rx="28" ry="8" fill="none" stroke="#E0A81C" stroke-width="9"/><ellipse cx="150" cy="50" rx="28" ry="8" fill="none" stroke="#FFE27A" stroke-width="5"/><path d="M184 34 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z M116 36 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#FFE27A"/>`,
  tiara: `<path d="M122 78 Q122 66 130 66 L136 56 L143 66 L150 44 L157 66 L164 56 L170 66 Q178 66 178 78 Q150 70 122 78Z" fill="#E8EEF8" stroke="#9AA8BF" stroke-width="3" stroke-linejoin="round"/><path d="M150 52 L154 58 L150 64 L146 58Z" fill="#FF5C7A"/><circle cx="136" cy="64" r="3" fill="#7FC8F8"/><circle cx="164" cy="64" r="3" fill="#7FC8F8"/><circle cx="150" cy="71" r="2.5" fill="#B48CE0"/>`,
  unicorn: `<path d="M118 80 Q148 66 182 80" stroke="#FF8FA8" stroke-width="6" fill="none" stroke-linecap="round"/><g fill="#FFB3C1"><circle cx="128" cy="73" r="6"/></g><g fill="#B5E3FF"><circle cx="174" cy="74" r="6"/></g><path d="M144 74 L166 22 L162 76Z" fill="#FFF3B0" stroke="#E0941C" stroke-width="3" stroke-linejoin="round"/><path d="M147 66 L163 62 M150 56 L164 50 M154 46 L165 40 M158 36 L165 31" stroke="#E0941C" stroke-width="2.2" stroke-linecap="round"/>`,
  rainbow: `${[['#FF5C7A', 34], ['#FFD34D', 28], ['#6FCF4F', 22], ['#4FA8F5', 16]].map(([c, r]) => `<path d="M${150 - r} 66 A${r} ${r} 0 0 1 ${150 + r} 66" stroke="${c}" stroke-width="6.5" fill="none"/>`).join('')}<g fill="#fff" stroke="#C9D8E8" stroke-width="2.5"><circle cx="118" cy="70" r="11"/><circle cx="132" cy="64" r="12"/><circle cx="170" cy="64" r="12"/><circle cx="184" cy="72" r="10"/></g><path d="M110 76 Q150 84 192 76 Q192 82 186 82 L114 82 Q110 82 110 76Z" fill="#fff"/><g fill="#fff"><circle cx="118" cy="70" r="8.6"/><circle cx="132" cy="64" r="9.6"/><circle cx="170" cy="64" r="9.6"/><circle cx="184" cy="72" r="7.6"/></g>`,
  // Earned hats.
  laurel: `<path d="M120 80 Q150 64 180 80" stroke="#C98F1B" stroke-width="3" fill="none"/>${[[124, 76, -60], [134, 71, -40], [144, 68, -15], [156, 68, 15], [166, 71, 40], [176, 76, 60]].map(([x, y, a]) => `<ellipse cx="${x}" cy="${y - 7}" rx="5" ry="10" transform="rotate(${a} ${x} ${y})" fill="#FFD34D" stroke="#C98F1B" stroke-width="2"/>`).join('')}<path d="M150 70 l3 6 6.5 1 -4.7 4.5 1.2 6.5 -6 -3.2 -6 3.2 1.2 -6.5 -4.7 -4.5 6.5 -1z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="1.5" stroke-linejoin="round" transform="translate(0 -24)"/>`,
  planet: `<path d="M110 66 Q150 46 190 62" stroke="#FFB3C1" stroke-width="7" fill="none" stroke-linecap="round"/><circle cx="150" cy="54" r="24" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><path d="M130 46 Q150 40 170 46 M128 60 Q150 54 172 60" stroke="#B48CE0" stroke-width="4" fill="none"/><circle cx="141" cy="44" r="3" fill="#fff" opacity=".8"/><path d="M110 66 Q150 84 190 62" stroke="#FFB3C1" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M110 66 Q150 84 190 62" stroke="#E86A86" stroke-width="2" fill="none" opacity=".5"/><path d="M190 30 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z M112 34 l1.2 2.8 2.8 1.2 -2.8 1.2 -1.2 2.8 -1.2 -2.8 -2.8 -1.2 2.8 -1.2z" fill="#FFD34D"/>`,
};
// The poop hat reuses the swirly poop drawing, built on first use since the
// poop colors are defined further down this file.
export function hatSide(id) {
  if (id === 'poop') return `<g transform="translate(120 22) scale(.95)">${poop({ shape: 'swirl', color: 'brown' }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
  const [dx, dy] = HAT_NUDGE[id] || [0, 0];
  return dx || dy ? `<g transform="translate(${dx} ${dy})">${HAT_SIDE[id] || ''}</g>` : HAT_SIDE[id] || '';
}
// Hats that perched on the ear tip get pulled down onto the head.
const HAT_NUDGE = { strawberry: [6, 10], crown: [2, 6], dumpling: [2, 5], chef: [2, 5], party: [0, 4] };

// Simplified hats for the top-down maze piggy (nose points up, head centre at (0,-44)).
const HAT_TOP = {
  strawberry: `<circle cx="0" cy="-44" r="24" fill="#FF5C7A" stroke="#D93A5B" stroke-width="3"/><g fill="#FFF3B0"><circle cx="-12" cy="-30" r="3"/><circle cx="12" cy="-30" r="3"/><circle cx="-16" cy="-52" r="3"/><circle cx="16" cy="-52" r="3"/><circle cx="0" cy="-26" r="3"/></g><g fill="#4CAF50" stroke="#2E7D32" stroke-width="1.5">${[0, 72, 144, 216, 288].map(a => `<ellipse cx="0" cy="-52" rx="4" ry="8" transform="rotate(${a} 0 -44)"/>`).join('')}</g>`,
  bow: `<path d="M0 -40 Q-26 -58 -24 -40 Q-24 -24 0 -40Z M0 -40 Q26 -58 24 -40 Q24 -24 0 -40Z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="2.5"/><circle cx="0" cy="-40" r="6" fill="#FF8FA8" stroke="#C93A5B" stroke-width="2.5"/>`,
  flower: `<g fill="#fff" stroke="#E6DCC8" stroke-width="2">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-56" rx="7" ry="13" transform="rotate(${a} 0 -44)"/>`).join('')}</g><circle cx="0" cy="-44" r="7" fill="#FFD34D" stroke="#E0941C" stroke-width="2"/>`,
  party: `<circle cx="0" cy="-44" r="24" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><circle cx="0" cy="-44" r="14" fill="#FFD34D"/><circle cx="0" cy="-44" r="6" fill="#FF8FA8"/>`,
  beanie: `<circle cx="0" cy="-44" r="30" fill="#4FA8F5" stroke="#2369B8" stroke-width="3"/><circle cx="0" cy="-44" r="30" fill="none" stroke="#2369B8" stroke-width="8" opacity=".5"/><circle cx="0" cy="-44" r="8" fill="#FFF3B0" stroke="#E0941C" stroke-width="2"/>`,
  sunhat: `<circle cx="0" cy="-44" r="46" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><circle cx="0" cy="-44" r="26" fill="none" stroke="#FF5C7A" stroke-width="6"/><circle cx="0" cy="-44" r="22" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/>`,
  chef: `<circle cx="0" cy="-44" r="30" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><circle cx="-14" cy="-54" r="12" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><circle cx="14" cy="-54" r="12" fill="#fff" stroke="#D5CDBA" stroke-width="3"/>`,
  dumpling: `<circle cx="0" cy="-44" r="22" fill="#FFE6C8" stroke="#D9A86E" stroke-width="3"/><path d="M0 -44 L-14 -58 M0 -44 L0 -64 M0 -44 L14 -58 M0 -44 L-18 -40 M0 -44 L18 -40" stroke="#D9A86E" stroke-width="2.5" stroke-linecap="round"/>`,
  poop: `<circle cx="0" cy="-44" r="24" fill="#8A5634" stroke="#5E3820" stroke-width="3"/><circle cx="0" cy="-44" r="15" fill="#8A5634" stroke="#5E3820" stroke-width="2.5"/><circle cx="0" cy="-44" r="6" fill="#8A5634" stroke="#5E3820" stroke-width="2.5"/>`,
  crown: `<path d="M-28 -24 L-32 -60 L-16 -46 L0 -72 L16 -46 L32 -60 L28 -24Z" fill="#FFD34D" stroke="#E0941C" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-36" r="5" fill="#FF5C7A"/>`,
  wizard: `<circle cx="0" cy="-44" r="38" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><circle cx="0" cy="-44" r="18" fill="#6A5BE0" stroke="#4F42B5" stroke-width="3"/><path d="M-4 -48 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" fill="#FFD34D"/>`,
  // New hats (v82).
  hay: `<circle cx="0" cy="-44" r="30" fill="#E8C24F" stroke="#C9A43A" stroke-width="3"/><g stroke-linecap="round" fill="none"><path d="M-20 -60 L-6 -40 M18 -62 L4 -42 M-24 -30 L-4 -46 M22 -28 L2 -48 M0 -74 L0 -50 M-30 -46 L-8 -44 M30 -44 L8 -46" stroke="#C9A43A" stroke-width="5"/><path d="M-14 -66 L0 -44 M14 -26 L0 -44 M-26 -38 L0 -44" stroke="#F2D46B" stroke-width="4"/></g>`,
  carrot: `<path d="M-30 -40 Q-32 -54 -18 -54 L36 -44 L-18 -32 Q-30 -30 -30 -40Z" fill="#FF9A3C" stroke="#D86A14" stroke-width="2.5" stroke-linejoin="round"/><path d="M-4 -50 L-4 -46 M10 -48 L10 -44" stroke="#D86A14" stroke-width="2" stroke-linecap="round"/><path d="M-30 -42 Q-46 -56 -50 -50 Q-42 -44 -32 -40 Q-46 -36 -50 -28 Q-40 -30 -30 -38Z" fill="#6FCF4F" stroke="#3E9A2E" stroke-width="2"/>`,
  bee: `<path d="M-30 -36 Q0 -56 30 -36" stroke="#3B2A24" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-12 -50 Q-18 -70 -22 -84 M12 -50 Q18 -70 22 -84" stroke="#3B2A24" stroke-width="3.5" fill="none" stroke-linecap="round"/><circle cx="-22" cy="-86" r="7" fill="#FFD34D" stroke="#3B2A24" stroke-width="3"/><circle cx="22" cy="-86" r="7" fill="#FFD34D" stroke="#3B2A24" stroke-width="3"/>`,
  kitty: `<path d="M-32 -38 Q0 -56 32 -38" stroke="#FF8FA8" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-30 -44 L-18 -70 L-6 -48Z M30 -44 L18 -70 L6 -48Z" fill="#A8A09A" stroke="#6E6660" stroke-width="3" stroke-linejoin="round"/><path d="M-24 -48 L-18 -62 L-12 -50Z M24 -48 L18 -62 L12 -50Z" fill="#FFB3C1"/>`,
  cap: `<path d="M-22 -66 Q0 -96 22 -66Z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-42" r="28" fill="#FF5C7A" stroke="#C93A5B" stroke-width="3"/><path d="M0 -70 L0 -14 M-28 -42 L28 -42" stroke="#C93A5B" stroke-width="2" opacity=".5"/><circle cx="0" cy="-42" r="5" fill="#FFD34D" stroke="#C93A5B" stroke-width="2"/>`,
  bunny: `<path d="M-32 -42 Q0 -58 32 -42" stroke="#FF8FA8" stroke-width="6" fill="none" stroke-linecap="round"/><ellipse cx="-16" cy="-30" rx="9" ry="22" transform="rotate(20 -16 -46)" fill="#FFF7EC" stroke="#D9C7B4" stroke-width="3"/><ellipse cx="-16" cy="-30" rx="4.5" ry="15" transform="rotate(20 -16 -46)" fill="#FFB3C1"/><ellipse cx="16" cy="-30" rx="9" ry="22" transform="rotate(-20 16 -46)" fill="#FFF7EC" stroke="#D9C7B4" stroke-width="3"/><ellipse cx="16" cy="-30" rx="4.5" ry="15" transform="rotate(-20 16 -46)" fill="#FFB3C1"/>`,
  mushroom: `<circle cx="0" cy="-44" r="42" fill="#FF5C5C" stroke="#C93A3A" stroke-width="3"/><g fill="#fff"><circle cx="-16" cy="-58" r="8"/><circle cx="18" cy="-54" r="7"/><circle cx="2" cy="-34" r="6"/><circle cx="-24" cy="-30" r="5"/><circle cx="24" cy="-28" r="5"/><circle cx="2" cy="-72" r="4"/></g>`,
  flowers: `${[0, 60, 120, 180, 240, 300].map((a, i) => { const r = a * Math.PI / 180, x = 30 * Math.sin(r), y = -44 - 30 * Math.cos(r), c = ['#FF8FA8', '#FFD34D', '#7FC8F8'][i % 3]; return `<g>${[0, 72, 144, 216, 288].map(b => `<circle cx="${x.toFixed(1)}" cy="${(y - 6).toFixed(1)}" r="5" fill="${c}" transform="rotate(${b} ${x.toFixed(1)} ${y.toFixed(1)})"/>`).join('')}<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="3.5" fill="#fff"/></g>`; }).join('')}`,
  icecream: `<path d="M-30 -44 Q-34 -70 -10 -72 Q0 -80 12 -72 Q34 -70 30 -44 Q34 -20 12 -16 Q0 -8 -12 -16 Q-34 -20 -30 -44Z" fill="#FFB3C1" stroke="#E86A86" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-44" r="15" fill="#F2C27E" stroke="#C98F4B" stroke-width="3"/><path d="M-10 -54 L10 -34 M10 -54 L-10 -34" stroke="#C98F4B" stroke-width="2"/><g stroke-width="3" stroke-linecap="round"><path d="M-22 -60 l4 -2" stroke="#7FC8F8"/><path d="M20 -58 l3 3" stroke="#FFD34D"/><path d="M-22 -26 l4 -1" stroke="#6FCF4F"/><path d="M22 -30 l2 3" stroke="#fff"/></g>`,
  cowboy: `<ellipse cx="0" cy="-44" rx="50" ry="46" fill="#D99B5B" stroke="#8A5A2B" stroke-width="3"/><ellipse cx="0" cy="-44" rx="26" ry="30" fill="#C98A4B" stroke="#8A5A2B" stroke-width="3"/><ellipse cx="0" cy="-44" rx="26" ry="30" fill="none" stroke="#FF5C7A" stroke-width="5" opacity=".9"/><path d="M0 -66 L0 -22" stroke="#8A5A2B" stroke-width="3" stroke-linecap="round"/>`,
  pumpkin: `<circle cx="0" cy="-44" r="32" fill="#FF9A3C" stroke="#D86A14" stroke-width="3"/><path d="M0 -76 L0 -12 M-28 -60 L28 -28 M28 -60 L-28 -28" stroke="#D86A14" stroke-width="2.5"/><circle cx="0" cy="-44" r="6" fill="#4CAF50" stroke="#2E7D32" stroke-width="2"/>`,
  santa: `<circle cx="0" cy="-44" r="30" fill="#fff" stroke="#E0D8CC" stroke-width="3"/><path d="M-22 -52 Q-14 -2 6 -4 Q2 -30 22 -52 Q0 -64 -22 -52Z" fill="#FF4F5E" stroke="#C9303F" stroke-width="3" stroke-linejoin="round"/><circle cx="6" cy="-4" r="9" fill="#fff" stroke="#E0D8CC" stroke-width="2.5"/>`,
  frog: `<circle cx="0" cy="-42" r="32" fill="#7ED957" stroke="#3E9A2E" stroke-width="3"/><circle cx="-16" cy="-66" r="11" fill="#7ED957" stroke="#3E9A2E" stroke-width="3"/><circle cx="16" cy="-66" r="11" fill="#7ED957" stroke="#3E9A2E" stroke-width="3"/><circle cx="-16" cy="-68" r="6" fill="#fff"/><circle cx="16" cy="-68" r="6" fill="#fff"/><circle cx="-16" cy="-70" r="3.5" fill="${INK}"/><circle cx="16" cy="-70" r="3.5" fill="${INK}"/>`,
  cupcake: `<circle cx="0" cy="-44" r="32" fill="#9FD6F5" stroke="#4C9BD0" stroke-width="3"/><circle cx="0" cy="-44" r="27" fill="#FFE1EA" stroke="#E86A86" stroke-width="3"/><path d="M0 -44 m-18 0 a18 18 0 1 1 18 18 a12 12 0 1 1 -12 -12 a6 6 0 1 1 6 6" stroke="#FFB3C1" stroke-width="3" fill="none"/><circle cx="0" cy="-44" r="7" fill="#FF4F5E" stroke="#C9303F" stroke-width="2.5"/><g stroke-width="3" stroke-linecap="round"><path d="M-18 -62 l3 -2" stroke="#FFD34D"/><path d="M16 -60 l3 2" stroke="#7FC8F8"/><path d="M-20 -26 l3 -2" stroke="#6FCF4F"/></g>`,
  propeller: `<circle cx="0" cy="-44" r="30" fill="#FFD34D" stroke="#C98F1B" stroke-width="3"/><path d="M0 -44 L-30 -44 A30 30 0 0 1 0 -74Z" fill="#FF5C7A"/><path d="M0 -44 L30 -44 A30 30 0 0 1 0 -14Z" fill="#4FA8F5"/><circle cx="0" cy="-44" r="30" fill="none" stroke="#C98F1B" stroke-width="3"/><g class="prop"><ellipse cx="-18" cy="-52" rx="18" ry="6" transform="rotate(25 0 -44)" fill="#6FCF4F" stroke="#3E9A2E" stroke-width="2"/><ellipse cx="18" cy="-36" rx="18" ry="6" transform="rotate(25 0 -44)" fill="#FF5C7A" stroke="#C93A5B" stroke-width="2"/></g><circle cx="0" cy="-44" r="4" fill="#FFD34D" stroke="#C98F1B" stroke-width="2"/>`,
  steamer: `<circle cx="0" cy="-44" r="30" fill="#F2D59A" stroke="#9C6A3A" stroke-width="3"/><circle cx="0" cy="-44" r="21" fill="none" stroke="#D9A85A" stroke-width="2.5"/><circle cx="0" cy="-44" r="12" fill="none" stroke="#D9A85A" stroke-width="2.5"/><rect x="-7" y="-48" width="14" height="8" rx="3" fill="#C98A4B" stroke="#9C6A3A" stroke-width="2"/>`,
  dino: `${[-62, -46, -30, -14].map((y, i) => `<path d="M-9 ${y + 6} L0 ${y - 12} L9 ${y + 6}Z" fill="${i % 2 ? '#FF9A3C' : '#7ED957'}" stroke="${i % 2 ? '#D86A14' : '#3E9A2E'}" stroke-width="3" stroke-linejoin="round"/>`).join('')}`,
  topper: `<circle cx="0" cy="-44" r="34" fill="#3D3550" stroke="#221E30" stroke-width="3"/><circle cx="0" cy="-44" r="21" fill="#FF5C7A" stroke="#221E30" stroke-width="3"/><circle cx="0" cy="-44" r="16" fill="#4E4566" stroke="#221E30" stroke-width="3"/>`,
  viking: `<path d="M-26 -50 Q-50 -54 -56 -78 Q-40 -64 -24 -62Z M26 -50 Q50 -54 56 -78 Q40 -64 24 -62Z" fill="#FFF3DC" stroke="#C9B48A" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-44" r="30" fill="#B9C2CC" stroke="#6E7A88" stroke-width="3"/><circle cx="0" cy="-44" r="30" fill="none" stroke="#E0A84B" stroke-width="6"/><path d="M0 -72 L0 -16" stroke="#6E7A88" stroke-width="3"/>`,
  grad: `<rect x="-32" y="-76" width="64" height="64" rx="3" fill="#3D3550" stroke="#221E30" stroke-width="3"/><path d="M0 -44 L26 -18" stroke="#FFD34D" stroke-width="3" stroke-linecap="round"/><path d="M22 -20 L32 -10 L28 -22Z" fill="#FFD34D"/><circle cx="0" cy="-44" r="4" fill="#FFD34D"/>`,
  halo: `<circle cx="0" cy="-44" r="28" fill="none" stroke="#E0A81C" stroke-width="9"/><circle cx="0" cy="-44" r="28" fill="none" stroke="#FFE27A" stroke-width="5"/>`,
  tiara: `<path d="M-30 -48 Q0 -78 30 -48" stroke="#E8EEF8" stroke-width="9" fill="none" stroke-linecap="round"/><path d="M-30 -48 Q0 -78 30 -48" stroke="#9AA8BF" stroke-width="2" fill="none"/><path d="M0 -70 L5 -63 L0 -56 L-5 -63Z" fill="#FF5C7A"/><circle cx="-18" cy="-58" r="3.5" fill="#7FC8F8"/><circle cx="18" cy="-58" r="3.5" fill="#7FC8F8"/>`,
  unicorn: `<path d="M-32 -42 Q0 -58 32 -42" stroke="#FF8FA8" stroke-width="6" fill="none" stroke-linecap="round"/><path d="M-8 -54 L0 -84 L8 -54Z" fill="#FFF3B0" stroke="#E0941C" stroke-width="3" stroke-linejoin="round"/><path d="M-5 -62 L5 -64 M-3 -70 L3 -72" stroke="#E0941C" stroke-width="2" stroke-linecap="round"/><circle cx="-26" cy="-44" r="6" fill="#FFB3C1"/><circle cx="26" cy="-44" r="6" fill="#B5E3FF"/>`,
  rainbow: `<g fill="#fff" stroke="#C9D8E8" stroke-width="2.5"><circle cx="-16" cy="-52" r="16"/><circle cx="14" cy="-54" r="15"/><circle cx="-12" cy="-30" r="14"/><circle cx="14" cy="-32" r="15"/></g><g fill="#fff"><circle cx="-16" cy="-52" r="13.6"/><circle cx="14" cy="-54" r="12.6"/><circle cx="-12" cy="-30" r="11.6"/><circle cx="14" cy="-32" r="12.6"/><circle cx="0" cy="-42" r="14"/></g>${[['#FF5C7A', -12], ['#FFD34D', -4], ['#6FCF4F', 4], ['#4FA8F5', 12]].map(([c, y]) => `<path d="M-34 ${-44 + y} L34 ${-44 + y}" stroke="${c}" stroke-width="6.5" stroke-linecap="round"/>`).join('')}`,
  laurel: `${[0, 30, 60, 90, 120, 150, 210, 240, 270, 300, 330].map(a => `<ellipse cx="0" cy="-74" rx="5" ry="10" transform="rotate(${a} 0 -44) rotate(60 0 -74)" fill="#FFD34D" stroke="#C98F1B" stroke-width="2"/>`).join('')}<path d="M0 -84 l3 6 6.5 1 -4.7 4.5 1.2 6.5 -6 -3.2 -6 3.2 1.2 -6.5 -4.7 -4.5 6.5 -1z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="1.5" stroke-linejoin="round"/>`,
  planet: `<ellipse cx="0" cy="-44" rx="46" ry="16" fill="none" stroke="#FFB3C1" stroke-width="7"/><circle cx="0" cy="-44" r="24" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><path d="M-20 -54 Q0 -60 20 -54 M-22 -38 Q0 -44 22 -38" stroke="#B48CE0" stroke-width="4" fill="none"/><path d="M-46 -44 A46 16 0 0 0 46 -44" stroke="#FFB3C1" stroke-width="7" fill="none"/>`,
};
export function hatTop(id) { return HAT_TOP[id] || ''; }

// A hat by itself, for the shop.
// Each hat's bounds in side-view coordinates (x, y, w, h), so the shop tile
// can frame every hat whole instead of clipping the wide or tall ones.
const HAT_BOX = {
  bow: [126, 55, 48, 17], poop: [130, 34, 42, 44], strawberry: [112, 20, 56, 56], flower: [125, 37, 50, 50],
  party: [124, 7, 52, 69], beanie: [112, 22, 76, 66], sunhat: [96, 38, 104, 48], chef: [117, 36, 66, 44],
  dumpling: [130, 36, 40, 40], crown: [116, 34, 68, 42], wizard: [112, 4, 76, 79],
  hay: [112, 46, 76, 35], bee: [116, 29, 68, 51], carrot: [102, 30, 88, 42], kitty: [118, 40, 64, 40],
  cap: [120, 39, 78, 42], bunny: [112, 15, 77, 65], mushroom: [108, 36, 84, 44], flowers: [105, 59, 87, 31],
  icecream: [115, 6, 70, 78], cowboy: [100, 40, 100, 44], pumpkin: [116, 31, 68, 51], frog: [116, 34, 68, 46],
  santa: [105, 13, 79, 69], cupcake: [115, 8, 71, 72], propeller: [118, 24, 64, 54], steamer: [120, 6, 60, 76],
  dino: [107, 57, 77, 33], topper: [114, 19, 72, 64], viking: [104, 30, 92, 54], grad: [106, 46, 88, 46],
  halo: [111, 34, 79, 24], tiara: [122, 44, 56, 34], unicorn: [118, 22, 64, 58], rainbow: [107, 32, 87, 50],
  laurel: [106, 46, 87, 36], planet: [108, 30, 87, 48],
};
export function hatIcon(id) {
  const [x0, y0, w, h] = HAT_BOX[id] || [104, 0, 92, 92];
  const [dx, dy] = HAT_NUDGE[id] || [0, 0], x = x0 + dx, y = y0 + dy;
  const size = Math.max(w, h, 56) + 10;
  return `<svg viewBox="${x + w / 2 - size / 2} ${y + h / 2 - size / 2} ${size} ${size}" aria-hidden="true">${hatSide(id)}</svg>`;
}

// Front-view face for the portrait row in the pen, drawn in a 100x100 box.
// The hat reuses the side-view hat, shrunk and centred on the head.
export function piggyFace(opts = {}) {
  const coat = opts.coat || DEFAULT_COAT;
  const skinny = coat.breed === 'skinny';
  const main = skinny ? '#F2B8A0' : col(coat.main);
  const patch = skinny ? '#F7CDBB' : col(coat.patch);
  const dark = darken(main);
  let back = '', hair = '';
  if (coat.breed === 'abyssinian') hair = [36, 50, 64].map(x => furTuft(x, 32, x === 50 ? patch : main, 11)).join('') + curl(26, 66, dark, 7) + curl(72, 64, dark, 7);
  else if (coat.breed === 'peruvian') {
    // Long hair falls down both cheeks with a side-parted fringe, all in coat colors.
    back = `<path d="M50 16 C20 16 6 40 8 66 L8 96${locks(8, 92, 96, 5, 6)} L92 66 C94 40 80 16 50 16Z" fill="${main}"/>`;
    hair = `<path d="M14 64 C10 38 28 22 50 22 C72 22 90 38 86 64 L88 98${locks(88, 74, 98, 5, 2)} C74 80 76 62 70 48${locks(70, 30, 46, 4, 4, 1)} C28 60 28 80 26 98${locks(26, 12, 98, 5, 2)} Z" fill="${main}"/>` +
      strands('M42 26 Q30 34 22 56 M42 26 Q58 30 66 44 M78 46 Q84 64 82 90 M20 64 Q18 80 18 92', dark);
  } else if (coat.breed === 'silkie') {
    // Swept back off the face, flowing out behind like a cape.
    back = `<path d="M50 14 C18 14 2 40 4 70 L4 98${locks(4, 96, 98, 5, 6)} L96 70 C98 40 82 14 50 14Z" fill="${main}"/>`;
    hair = `<path d="M24 40 C10 50 8 76 10 98${locks(10, 24, 98, 5, 1)} C20 80 18 60 26 44Z M76 40 C90 50 92 76 90 98${locks(90, 76, 98, 5, 1)} C80 80 82 60 74 44Z" fill="${main}"/>` +
      strands('M44 34 Q32 26 20 34 M56 34 Q68 26 80 34 M16 54 Q12 74 14 92 M84 54 Q88 74 86 92', dark);
  } else if (coat.breed === 'texel') {
    back = [[18, 34], [10, 50], [8, 68], [12, 86], [82, 34], [90, 50], [92, 68], [88, 86], [32, 24], [68, 24], [50, 20]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="11" fill="${x === 50 ? patch : main}"/>` + curl(x, y, x === 50 ? darken(patch) : dark, 4)).join('');
    hair = curl(28, 44, dark) + curl(72, 44, dark) + curl(22, 80, dark) + curl(78, 80, dark);
  }
  else if (skinny) hair = `<path d="M44 30 q6 -12 14 -4 q-6 4 -14 4z" fill="${col(coat.main)}"/>`;
  const hat = opts.hat ? `<g transform="translate(-32.5 -9) scale(.55)">${hatSide(opts.hat === true ? 'strawberry' : opts.hat)}</g>` : '';
  return `<svg viewBox="0 0 100 100" class="piggy-face" aria-hidden="true">
    ${back}
    <ellipse cx="20" cy="42" rx="11" ry="8" transform="rotate(-30 20 42)" fill="${dark}"/><ellipse cx="20" cy="43" rx="6" ry="4" transform="rotate(-30 20 43)" fill="#FFB3C1"/>
    <ellipse cx="80" cy="42" rx="11" ry="8" transform="rotate(30 80 42)" fill="${dark}"/><ellipse cx="80" cy="43" rx="6" ry="4" transform="rotate(30 80 43)" fill="#FFB3C1"/>
    <ellipse cx="50" cy="62" rx="34" ry="32" fill="${main}"/>
    <path d="M50 30 C42 44 38 60 36 74 Q50 92 64 74 C62 60 58 44 50 30Z" fill="${patch}"/>
    ${hair}
    <circle cx="35" cy="58" r="5.5" fill="${INK}"/><circle cx="36.8" cy="56" r="1.9" fill="#fff"/>
    <circle cx="65" cy="58" r="5.5" fill="${INK}"/><circle cx="66.8" cy="56" r="1.9" fill="#fff"/>
    <ellipse cx="27" cy="70" rx="6" ry="3.5" fill="#FF8FA8" opacity=".7"/><ellipse cx="73" cy="70" rx="6" ry="3.5" fill="#FF8FA8" opacity=".7"/>
    <path d="M46 69 Q50 73 54 69Z" fill="#E86A86" stroke="#E86A86" stroke-width="2" stroke-linejoin="round"/>
    <path d="M44 76 Q47 80 50 76 Q53 80 56 76" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>
    ${hat}
  </svg>`;
}

// Top-down piggy for the maze, drawn around (0,0) with the nose pointing up.
export function piggyTop(opts = {}) {
  const coat = opts.coat || DEFAULT_COAT;
  const skinny = coat.breed === 'skinny';
  const main = skinny ? '#F2B8A0' : col(coat.main);
  const patch = skinny ? '#F7CDBB' : col(coat.patch);
  const dark = darken(main);
  const hat = opts.hat ? hatTop(opts.hat === true ? 'strawberry' : opts.hat) : '';
  let hair = '';
  if (coat.breed === 'abyssinian') hair = [[-24, 10], [22, 20], [0, 44], [-20, -10], [24, -12]].map(([x, y]) => `<path d="M${x - 8} ${y} a8 8 0 1 1 8 8" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`).join('');
  if (coat.breed === 'peruvian' || coat.breed === 'silkie') {
    // From above, long hair parts down the spine and spills over both sides.
    const silkie = coat.breed === 'silkie';
    hair = silkie
      ? `<path d="M-28 -52 C-44 -30 -62 0 -62 50 L-62 70${locks(-62, 62, 70, 5, 7)} L62 50 C62 0 44 -30 28 -52 C10 -42 -10 -42 -28 -52Z" fill="${main}"/>`
      : `<path d="M-30 -26 C-52 -16 -60 20 -58 60 L-58 70${locks(-58, 58, 70, 5, 7)} C60 20 52 -16 30 -26 C14 -18 -14 -18 -30 -26Z" fill="${main}"/>`;
    const w = (silkie ? 124 : 116) / 7, p = w * 1.5;
    hair += `<path d="M${-p} 70 C${-p} 40 -20 10 -14 ${silkie ? -36 : -14} Q0 ${silkie ? -30 : -8} 14 ${silkie ? -36 : -14} C20 10 ${p} 40 ${p} 70${locks(p, -p, 70, 5, 3)}Z" fill="${patch}"/>`;
    hair += `<path d="M0 ${silkie ? -34 : -12} L0 64" stroke="${darken(patch)}" stroke-width="2.5" stroke-linecap="round" opacity=".5"/>` +
      strands('M-16 -6 Q-40 10 -48 60 M16 -6 Q40 10 48 60 M-26 -16 Q-50 0 -54 40 M26 -16 Q50 0 54 40', dark);
    if (!silkie) hair += `<path d="M-22 -6 C-24 -40 -14 -54 -8 -60 Q0 -54 8 -60 C14 -54 24 -40 22 -6 Q0 0 -22 -6Z" fill="${main}"/>` + strands('M-8 -14 Q-8 -40 -6 -56 M8 -14 Q8 -40 6 -56', dark);
  }
  if (coat.breed === 'texel') {
    const rim = [];
    for (let t = -40; t <= 220; t += 20) { const r = t * Math.PI / 180; rim.push([46 * Math.cos(r), 8 + 62 * Math.sin(r)]); }
    const inPatch = ([x, y]) => (x / 34) ** 2 + ((y - 26) / 30) ** 2 < 1.4;
    hair = rim.map(pt => `<circle cx="${pt[0].toFixed(1)}" cy="${pt[1].toFixed(1)}" r="10" fill="${inPatch(pt) ? patch : main}"/>` + curl(pt[0], pt[1], inPatch(pt) ? darken(patch) : dark, 4)).join('') +
      curl(-20, 20, darken(patch)) + curl(16, 40, darken(patch)) + curl(-24, -20, dark) + curl(24, -16, dark);
  }
  return `<svg viewBox="-70 -90 140 170" x="-70" y="-90" width="140" height="170" class="piggy-top" aria-hidden="true">
    <g class="pawA">${paw(-46, -30)}${paw(44, 40)}</g>
    <g class="pawB">${paw(46, -30)}${paw(-44, 40)}</g>
    <g class="tdbody">
      <ellipse cx="0" cy="8" rx="48" ry="64" fill="${main}"/>
      <ellipse cx="0" cy="-44" rx="38" ry="32" fill="${main}"/>
      <ellipse cx="0" cy="26" rx="34" ry="30" fill="${patch}"/>
      <path d="M0 -70 C-14 -54 -12 -30 -8 0 Q0 6 8 0 C12 -30 14 -54 0 -70Z" fill="${patch}"/>
      ${hair}
      <ellipse cx="-34" cy="-40" rx="12" ry="9" transform="rotate(-30 -34 -40)" fill="${dark}"/><ellipse cx="-34" cy="-40" rx="7" ry="5" transform="rotate(-30 -34 -40)" fill="#FFB3C1"/>
      <ellipse cx="34" cy="-40" rx="12" ry="9" transform="rotate(30 34 -40)" fill="${dark}"/><ellipse cx="34" cy="-40" rx="7" ry="5" transform="rotate(30 34 -40)" fill="#FFB3C1"/>
      ${hat}
      <circle cx="-24" cy="-52" r="5" fill="${INK}"/><circle cx="24" cy="-52" r="5" fill="${INK}"/>
      <circle cx="0" cy="-72" r="5" fill="#E86A86"/>
    </g>
  </svg>`;
}

// A squishy-toy dumpling: a round glossy bun with pleats swirling to the top,
// a kawaii face and blush, sitting in a little bamboo steamer basket.
export function dumpling(key, size = 64, opts = {}) {
  const r = lookFor(key);
  const fill = r.color;
  const dark = r.dark || shade(fill);
  // A round bamboo steamer seen from a little above: straight sides, the dark
  // inside and back rim behind the bun, the front wall with a woven band in
  // front of it so the bun sits down inside.
  const back = opts.basket === false ? '' : `<ellipse cx="32" cy="38" rx="26" ry="8" fill="#F2D59A" stroke="#9C6A3A" stroke-width="2.5"/>
    <ellipse cx="32" cy="38.5" rx="22" ry="5.8" fill="#B5823F"/>`;
  const front = opts.basket === false ? '' : `
    <path d="M6 38 Q32 54 58 38 V51 Q32 67 6 51Z" fill="#E8C27A" stroke="#9C6A3A" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M6 44.5 Q32 60.5 58 44.5" stroke="#9C6A3A" stroke-width="2" fill="none"/>
    <path d="M9 48 Q32 62 55 48" stroke="#D9A85A" stroke-width="1.2" fill="none" opacity=".8"/>
    <path d="M10.5 43 V50" stroke="#F6DDA4" stroke-width="2.5" stroke-linecap="round"/>
    <path d="M6 38 Q32 54 58 38" stroke="#9C6A3A" stroke-width="2.5" fill="none"/>`;
  const dy = opts.basket === false ? 6 : 1;
  const sparkle = r.glitter ? `<g fill="#fff" opacity=".9"><circle cx="17" cy="30" r="1.2"/><circle cx="42" cy="24" r="1.1"/><circle cx="47" cy="33" r="1.3"/><circle cx="24" cy="27" r="1"/><circle cx="36" cy="22" r=".9"/><circle cx="31" cy="29" r="1"/></g>
    <path d="M53 12 l1.5 3 3 1.5 -3 1.5 -1.5 3 -1.5 -3 -3 -1.5 3 -1.5z" fill="#fff"/><path d="M10 14 l1 2 2 1 -2 1 -1 2 -1 -2 -2 -1 2 -1z" fill="#fff"/>` : '';
  const eyes = r.sleepy
    ? `<path d="M23 29 Q26 32 29 29 M35 29 Q38 32 41 29" stroke="${INK}" stroke-width="2" fill="none" stroke-linecap="round"/><text x="47" y="20" font-size="9" font-weight="700" fill="#4C7FD9" font-family="sans-serif">z</text>`
    : r.wink
      ? `<path d="M23 29 Q26 25 29 29 M35 29 Q38 25 41 29" stroke="${INK}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`
      : `<circle cx="26" cy="29" r="2.4" fill="${INK}"/><circle cx="38" cy="29" r="2.4" fill="${INK}"/><circle cx="27" cy="28" r=".8" fill="#fff"/><circle cx="39" cy="28" r=".8" fill="#fff"/>`;
  const mouth = r.sleepy
    ? `<ellipse cx="32" cy="34" rx="1.5" ry="1.1" fill="${INK}"/>`
    : `<path d="M28.5 33 Q32 37.5 35.5 33Z" fill="${INK}"/><path d="M30.5 35 Q32 36.5 33.5 35" fill="#FF8FA8"/>`;
  const hat = r.hat ? `<path d="M23 18 Q32 5 43 16 Q36 14 30 18 Q27 20 23 18Z" fill="#FF5C7A"/><circle cx="28" cy="15" r="1.3" fill="#FFF3B0"/><circle cx="35" cy="11" r="1.3" fill="#FFF3B0"/>` : '';
  const stripes = r.stripes ? `<path d="M14 25 Q32 19 50 25" stroke="${r.stripes}" stroke-width="2.5" fill="none" opacity=".6"/>` : '';
  const pattern = r.pattern ? patternArt(r.pattern, r.patternColor) : '';
  const topper = r.topper ? TOPPER[r.topper] || '' : '';
  const behind = (r.glow ? `<ellipse cx="32" cy="32" rx="30" ry="24" fill="#FFE27A" opacity=".55"/>` : '') + (r.topper === 'ears' ? EARS : '');
  const shiny = r.shiny ? `<g fill="#FFD34D" stroke="#E0941C" stroke-width=".8"><path d="M52 6 l2 4.5 4.5 2 -4.5 2 -2 4.5 -2 -4.5 -4.5 -2 4.5 -2z"/><path d="M9 22 l1.4 3 3 1.4 -3 1.4 -1.4 3 -1.4 -3 -3 -1.4 3 -1.4z"/><path d="M55 30 l1 2.2 2.2 1 -2.2 1 -1 2.2 -1 -2.2 -2.2 -1 2.2 -1z"/></g>` : '';
  const defs = DUMP_DEFS[r.grad] || '';
  // A wide squishy bun: flat bottom, pleats gathered to a little twist on top,
  // the face low on the front.
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${defs}
    ${back}
    <g transform="translate(0 ${dy})">${behind}
    <path d="M11 45 C8 31 18 19 32 19 C46 19 56 31 53 45 Q32 50 11 45Z" fill="${fill}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>
    ${stripes}${pattern}
    <path d="M32 19 Q24 25 19 36 M32 19 Q28 27 26 40 M32 19 Q32 30 32 42 M32 19 Q36 27 38 40 M32 19 Q40 25 45 36 M32 19 Q21 21 14 30 M32 19 Q43 21 50 30" stroke="${dark}" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".5"/>
    <path d="M28 18 Q32 12 36 18 Q32 21 28 18Z" fill="${dark}" opacity=".55"/>
    <ellipse cx="21" cy="25" rx="5" ry="2.6" transform="rotate(-25 21 25)" fill="#fff" opacity=".55"/>
    ${sparkle}
    <g stroke="#FF6F8E" stroke-width="1.8" stroke-linecap="round" opacity=".8"><path d="M18 30 l1.5 3 M21.5 29 l1.5 3 M41 29 l1.5 3 M44.5 30 l1.5 3"/></g>
    ${eyes}${mouth}${hat}${topper}
    </g>
    ${front}${shiny}
  </svg>`;
}

// Grey silhouette of a dumpling for the Dumpling Book spots not found yet.
export function dumplingShadow(key, size = 64) {
  return dumpling(key, size).replace(/<defs>.*?<\/defs>/s, '').replace(/fill="(?!none)[^"]*"/g, 'fill="#D5CDBA"').replace(/stroke="[^"]*"/g, 'stroke="#B7AC94"');
}

// Which look a dumpling key gets: a recipe ('a+b'), its shiny version
// ('shiny:a+b'), or a special ('sp:id').
function lookFor(key) {
  if (key.startsWith('sp:')) return SPECIAL_LOOK[key.slice(3)] || { color: 'rgb(255,226,122)' };
  const shiny = key.startsWith('shiny:');
  const base = shiny ? key.slice(6) : key;
  const r = RECIPE_LOOK[base] || recipeLook(base);
  return shiny ? { ...r, glitter: true, shiny: true, dark: '#E0A21B' } : r;
}

// Recipes past the first ten get their look from their two veggies: a blended
// color, a pattern in the second veggie's color, and a face picked by hash.
function recipeLook(key) {
  const [a, b] = key.split('+');
  if (!FILLINGS[a] || !FILLINGS[b]) return { color: 'rgb(255,226,122)' };
  const h = hash(key);
  const fx = (RECIPES[key] || {}).effect;
  const look = { color: tint(a, b) };
  if (fx === 'sleepy') look.sleepy = true; else if ((h >> 2) % 3 === 0) look.wink = true;
  if (fx === 'sparkle' && h % 2) look.glitter = true;
  const pat = h % 4;
  if (pat === 1) look.stripes = FILLINGS[b].color;
  else if (pat === 2) { look.pattern = 'dots'; look.patternColor = FILLINGS[b].color; }
  else if (pat === 3) look.topper = 'leaf';
  if ((h >> 4) % 7 === 0) look.hat = true;
  return look;
}

const SPOTS = [[17, 38], [47, 38], [22, 23], [42, 23], [32, 20.5], [14.5, 31], [49.5, 31]];
function patternArt(kind, c = '#FF5C7A') {
  const cs = Array.isArray(c) ? c : [c];
  return SPOTS.map(([x, y], i) => {
    const k = cs[i % cs.length];
    if (kind === 'dots') return `<circle cx="${x}" cy="${y}" r="2.6" fill="${k}" opacity=".85"/>`;
    if (kind === 'hearts') return `<path d="M${x} ${y + 2.5} l-3 -3 a1.8 1.8 0 0 1 3 -2 a1.8 1.8 0 0 1 3 2z" fill="${k}"/>`;
    if (kind === 'stars') return `<path d="M${x} ${y - 3} l.9 2.1 2.1 .9 -2.1 .9 -.9 2.1 -.9 -2.1 -2.1 -.9 2.1 -.9z" fill="${k}"/>`;
    if (kind === 'bubbles') return `<circle cx="${x}" cy="${y}" r="${2 + (i % 2)}" fill="none" stroke="#fff" stroke-width="1.2" opacity=".9"/>`;
    if (kind === 'craters') return i % 2 ? '' : `<circle cx="${x}" cy="${y}" r="2.8" fill="${k}" opacity=".5"/>`;
    if (kind === 'ribs') return i > 1 ? '' : `<path d="M${i ? 40 : 24} 19 Q${i ? 48 : 16} 31 ${i ? 42 : 22} 45" stroke="${k}" stroke-width="2" fill="none" opacity=".5"/>`;
    return '';
  }).join('');
}

// Bits that sit on top of a dumpling. Ears go behind the bun.
const EARS = `<ellipse cx="18" cy="24" rx="6" ry="4.5" transform="rotate(-35 18 24)" fill="#F2A391" stroke="#D9806F" stroke-width="2"/><ellipse cx="46" cy="24" rx="6" ry="4.5" transform="rotate(35 46 24)" fill="#F2A391" stroke="#D9806F" stroke-width="2"/>`;
const TOPPER = {
  leaf: `<path d="M32 18 Q30 10 23 9 Q25 16 32 18Z" fill="#6CC070" stroke="#3E8E2A" stroke-width="1.4"/>`,
  stem: `<path d="M30 18 Q30 11 34 8" stroke="#4F9A3C" stroke-width="3.5" fill="none" stroke-linecap="round"/>`,
  ears: `<ellipse cx="32" cy="35.5" rx="3" ry="2" fill="#E0668A"/>`,
  crown: `<path d="M22 19 L23 8 L28 13 L32 5 L36 13 L41 8 L42 19Z" fill="#FFD34D" stroke="#E0941C" stroke-width="2" stroke-linejoin="round"/><circle cx="32" cy="14" r="1.8" fill="#FF5C7A"/>`,
  horns: `<path d="M24 20 Q19 12 22 6 Q26 13 28 18Z M40 20 Q45 12 42 6 Q38 13 36 18Z" fill="#FFE27A" stroke="#D9A21B" stroke-width="1.6" stroke-linejoin="round"/><path d="M12 40 l-5 -2 4 -3 M52 40 l5 -2 -4 -3" stroke="#3E8E2A" stroke-width="2" fill="none" stroke-linejoin="round"/>`,
  moon: `<path d="M51 6 a6 6 0 1 0 5 9 a4.5 4.5 0 1 1 -5 -9z" fill="#FFE27A" stroke="#D9A21B" stroke-width="1.2"/>`,
  popcorn: `<g fill="#FFFBEA" stroke="#E8C66A" stroke-width="1.4"><circle cx="26" cy="17" r="4.5"/><circle cx="33" cy="13" r="5"/><circle cx="39" cy="17.5" r="4.2"/></g>`,
  cloud: `<g fill="#fff" stroke="#BFD8F0" stroke-width="1.4"><circle cx="12" cy="40" r="5"/><circle cx="52" cy="40" r="5"/><circle cx="33" cy="16" r="5"/></g>`,
};
const DUMP_DEFS = {
  rainbow: `<defs><linearGradient id="rbDump" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF8FA8"/><stop offset=".3" stop-color="#FFD166"/><stop offset=".6" stop-color="#7FDCA8"/><stop offset="1" stop-color="#8FB4FF"/></linearGradient></defs>`,
  galaxy: `<defs><linearGradient id="gxDump" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#2E2470"/><stop offset=".6" stop-color="#6A3FB8"/><stop offset="1" stop-color="#C46AD6"/></linearGradient></defs>`,
  crystal: `<defs><linearGradient id="crDump" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9FD9FF"/><stop offset=".45" stop-color="#E8F7FF"/><stop offset=".7" stop-color="#C9B8FF"/><stop offset="1" stop-color="#F6F0FF"/></linearGradient></defs>`,
};
// The blind-box specials.
const SPECIAL_LOOK = {
  polka:   { color: 'rgb(255,247,230)', pattern: 'dots', patternColor: ['#FF5C7A', '#5BA8F0', '#FFD23C', '#5BC86A'] },
  cloud:   { color: 'rgb(232,244,255)', topper: 'cloud', sleepy: true },
  heart:   { color: 'rgb(255,196,214)', pattern: 'hearts', patternColor: '#F0435F', wink: true },
  lantern: { color: 'rgb(255,170,80)', pattern: 'ribs', patternColor: '#C8641C', topper: 'stem', glow: true },
  bubble:  { color: 'rgb(160,200,255)', pattern: 'bubbles', glitter: true },
  popcorn: { color: 'rgb(255,226,140)', topper: 'popcorn', wink: true },
  rainbow: { color: 'url(#rbDump)', dark: '#B48CE0', grad: 'rainbow', glitter: true },
  gold:    { color: '#FFD34D', dark: '#C98F1B', glitter: true, shiny: true },
  galaxy:  { color: 'url(#gxDump)', dark: '#231A5A', grad: 'galaxy', pattern: 'stars', patternColor: '#FFF3B0' },
  moon:    { color: 'rgb(255,244,196)', pattern: 'craters', patternColor: '#D9C27A', topper: 'moon', sleepy: true },
  piggy:   { color: 'rgb(240,184,124)', dark: '#B9824A', topper: 'ears', pattern: 'craters', patternColor: '#FFFFFF' },
  crystal: { color: 'url(#crDump)', dark: '#6FA8DC', grad: 'crystal', glitter: true, shiny: true },
  dragon:  { color: 'rgb(140,214,120)', dark: '#3E8E2A', topper: 'horns', pattern: 'dots', patternColor: '#FFE27A', wink: true },
  king:    { color: 'rgb(255,236,200)', topper: 'crown', glitter: true, wink: true },
};

// Small looks that make each recipe its own collectable.
const RECIPE_LOOK = {
  'carrot+carrot':         { color: 'rgb(255,196,120)' },
  'cabbage+cabbage':       { color: 'rgb(205,240,180)' },
  'pea+pea':               { color: 'rgb(170,230,170)' },
  'strawberry+strawberry': { color: 'rgb(255,180,205)', glitter: true, wink: true },
  'cabbage+carrot':        { color: 'rgb(221,237,138)', wink: true },
  'carrot+pea':            { color: 'rgb(255,226,122)', hat: true },
  'cabbage+pea':           { color: 'rgb(191,224,255)', sleepy: true },
  'carrot+strawberry':     { color: 'rgb(255,176,138)', stripes: '#FF5C7A', wink: true },
  'cabbage+strawberry':    { color: 'rgb(255,214,232)', glitter: true },
  'pea+strawberry':        { color: 'rgb(217,196,245)', glitter: true, stripes: '#5BC8A8' },
};

export function veggie(filling, size = 48) {
  const v = {
    carrot: `<path d="M32 16 Q24 4 18 8 M32 16 Q32 2 38 3 M32 16 Q40 6 46 10" stroke="#4CAF50" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M20 19 Q32 13 44 19 Q45 30 35 56 Q32 61 29 56 Q19 30 20 19Z" fill="#FF9A3C"/><path d="M23 28 H30 M34 36 H40 M27 44 H32" stroke="#E07A1F" stroke-width="2" stroke-linecap="round"/>`,
    cabbage: `<circle cx="32" cy="31" r="17" fill="#C8F0B0"/><path d="M24 22 Q32 15 40 22 M27 28 Q32 24 37 28" stroke="#8FD07A" stroke-width="2.5" fill="none" stroke-linecap="round"/><path d="M10 34 Q8 14 26 12 Q20 26 24 38 Q26 50 32 58 Q12 56 10 34Z M54 34 Q56 14 38 12 Q44 26 40 38 Q38 50 32 58 Q52 56 54 34Z" fill="#6CC070"/><path d="M14 40 Q16 30 22 24 M50 40 Q48 30 42 24" stroke="#4F9A3C" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    pea: `<path d="M10 40 Q32 8 56 32 Q34 50 10 40Z" fill="#5BC86A"/><circle cx="22" cy="34" r="6" fill="#8FE38A"/><circle cx="35" cy="30" r="6" fill="#8FE38A"/><circle cx="47" cy="31" r="5" fill="#8FE38A"/>`,
    strawberry: `<path d="M32 56 Q10 40 14 24 Q22 12 32 20 Q42 12 50 24 Q54 40 32 56Z" fill="#FF5C7A"/><path d="M24 14 Q32 8 40 14 L32 22Z" fill="#4CAF50"/><g fill="#FFF3B0"><circle cx="24" cy="30" r="1.8"/><circle cx="36" cy="28" r="1.8"/><circle cx="30" cy="40" r="1.8"/><circle cx="40" cy="40" r="1.8"/></g>`,
    hay: `<path d="M8 50 Q6 30 14 24 H50 Q58 30 56 50 Q56 56 50 56 H14 Q8 56 8 50Z" fill="#F2CC5A" stroke="#C9962A" stroke-width="2.5" stroke-linejoin="round"/><path d="M14 30 Q30 27 50 30 M12 40 Q32 37 52 40 M13 49 Q32 46 51 49" stroke="#D9A73A" stroke-width="2" fill="none" stroke-linecap="round"/><path d="M24 24 V56 M40 24 V56" stroke="#B5552E" stroke-width="3"/><path d="M18 24 Q16 14 20 8 M28 24 Q28 12 32 6 M38 24 Q40 14 46 10 M48 26 Q54 18 58 18" stroke="#E2B84A" stroke-width="2.5" fill="none" stroke-linecap="round"/>`,
    corn: `<path d="M22 16 Q32 6 42 16 Q46 34 32 56 Q18 34 22 16Z" fill="#FFD23C"/><g fill="#FFE98A">${[[28,18],[36,18],[26,26],[32,24],[38,26],[27,34],[33,32],[38,35],[29,42],[35,41],[32,49]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="2.6"/>`).join('')}</g><path d="M32 58 Q16 46 16 24 Q24 40 32 50Z M32 58 Q48 46 48 24 Q40 40 32 50Z" fill="#6CC070"/>`,
    tomato: `<circle cx="32" cy="36" r="20" fill="#F0543F"/><path d="M32 18 l4 -6 2 7 7 -1 -5 5 -8 1 -8 -1 -5 -5 7 1 2 -7z" fill="#4CAF50"/><ellipse cx="24" cy="30" rx="5" ry="3" transform="rotate(-30 24 30)" fill="#fff" opacity=".45"/>`,
    pumpkin: `<path d="M30 16 Q30 8 36 6" stroke="#4F9A3C" stroke-width="4" fill="none" stroke-linecap="round"/><ellipse cx="20" cy="36" rx="10" ry="17" fill="#FF8A2A"/><ellipse cx="44" cy="36" rx="10" ry="17" fill="#FF8A2A"/><ellipse cx="32" cy="36" rx="11" ry="19" fill="#FFA04A"/><path d="M26 22 Q24 36 26 50 M38 22 Q40 36 38 50" stroke="#D96A1C" stroke-width="2" fill="none"/>`,
    blueberry: `<circle cx="22" cy="40" r="12" fill="#5A7FE0"/><circle cx="42" cy="40" r="12" fill="#4A6FD0"/><circle cx="32" cy="24" r="12" fill="#6A8FF0"/><path d="M29 19 l3 3 3 -3 M29 22 l6 0" stroke="#2E4A9C" stroke-width="2" fill="none" stroke-linecap="round"/><circle cx="19" cy="36" r="2.5" fill="#fff" opacity=".5"/><circle cx="28" cy="20" r="2.5" fill="#fff" opacity=".5"/>`,
    broccoli: `<path d="M28 58 L30 36 H34 L36 58Z" fill="#B8E39A"/><g fill="#4FA84A"><circle cx="20" cy="30" r="10"/><circle cx="44" cy="30" r="10"/><circle cx="32" cy="20" r="11"/><circle cx="32" cy="34" r="9"/></g><g fill="#7CCB5A"><circle cx="20" cy="27" r="3"/><circle cx="32" cy="16" r="3.5"/><circle cx="44" cy="27" r="3"/></g>`,
    radish: `<path d="M24 16 Q20 4 14 6 Q18 12 28 18Z M40 16 Q44 4 50 6 Q46 12 36 18Z M32 16 V4" stroke="#4CAF50" stroke-width="3" fill="#6CC070" stroke-linecap="round"/><circle cx="32" cy="34" r="16" fill="#F0507A"/><path d="M28 48 Q32 50 36 48 L32 60Z" fill="#F8F6EE"/><ellipse cx="25" cy="29" rx="4" ry="2.5" transform="rotate(-30 25 29)" fill="#fff" opacity=".5"/>`,
    pepper: `<path d="M30 16 Q30 8 36 6" stroke="#4F9A3C" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M14 26 Q16 14 32 16 Q48 14 50 26 Q52 44 44 54 Q38 58 32 52 Q26 58 20 54 Q12 44 14 26Z" fill="#FFC21C"/><path d="M32 20 Q30 36 32 50" stroke="#E09A10" stroke-width="2" fill="none"/><ellipse cx="22" cy="28" rx="3" ry="6" fill="#fff" opacity=".4"/>`,
    eggplant: `<path d="M36 18 Q54 22 52 42 Q48 58 32 56 Q14 54 16 40 Q20 30 28 24 Q30 18 36 18Z" fill="#8A4FC0"/><path d="M26 18 Q34 10 44 14 Q42 22 34 22 Q30 22 26 18Z" fill="#4CAF50"/><path d="M38 12 Q40 6 44 6" stroke="#4CAF50" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="24" cy="42" rx="3" ry="6" transform="rotate(30 24 42)" fill="#fff" opacity=".35"/>`,
    bokchoy: `<path d="M24 58 Q20 40 26 28 H38 Q44 40 40 58Z" fill="#F4F8EC" stroke="#C8DDB0" stroke-width="2"/><path d="M26 30 Q10 20 18 6 Q28 8 30 28Z M38 30 Q54 20 46 6 Q36 8 34 28Z M32 28 Q24 12 32 2 Q40 12 32 28Z" fill="#5FAE4E"/><path d="M32 30 V56" stroke="#C8DDB0" stroke-width="2"/>`,
    beet: `<path d="M26 18 Q20 4 14 8 Q20 12 28 20Z M38 18 Q44 4 50 8 Q44 12 36 20Z" fill="#6CC070" stroke="#B8306A" stroke-width="1.5"/><circle cx="32" cy="36" r="17" fill="#B8306A"/><path d="M30 52 Q32 54 34 52 L32 62Z" fill="#B8306A"/><ellipse cx="25" cy="31" rx="4" ry="2.5" transform="rotate(-30 25 31)" fill="#fff" opacity=".4"/>`,
    apple: `<path d="M32 20 Q20 12 14 24 Q8 42 22 54 Q28 58 32 54 Q36 58 42 54 Q56 42 50 24 Q44 12 32 20Z" fill="#E8443C"/><path d="M32 20 Q31 12 34 8" stroke="#8A5634" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M34 12 Q42 6 46 12 Q40 16 34 12Z" fill="#6CC070"/><ellipse cx="22" cy="30" rx="3" ry="6" transform="rotate(20 22 30)" fill="#fff" opacity=".4"/>`,
  }[filling];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${v}</svg>`;
}

export function veggieShadow(filling, size = 48) {
  return veggie(filling, size).replace(/fill="(?!none)[^"]*"/g, 'fill="#D5CDBA"').replace(/stroke="[^"]*"/g, 'stroke="#B7AC94"');
}

export function sprout(progress, filling) {
  if (progress >= 1) return veggie(filling, 44);
  const h = 10 + progress * 26;
  return `<svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
    <path d="M32 58 V${58 - h}" stroke="#5FAE4E" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="${32 - 8}" cy="${58 - h + 4}" rx="8" ry="4" transform="rotate(-30 ${32 - 8} ${58 - h + 4})" fill="#8FD07A"/>
    <ellipse cx="${32 + 8}" cy="${58 - h + 4}" rx="8" ry="4" transform="rotate(30 ${32 + 8} ${58 - h + 4})" fill="#8FD07A"/>
  </svg>`;
}

const POOP_FILL = {
  brown: ['#8A5634', '#5E3820'], green: ['#8FD07A', '#4F9A3C'], orange: ['#FFAE5C', '#D9772B'], pink: ['#FFA8C0', '#E0668A'],
  white: ['#F8F6EE', '#B8B3A4'], red: ['#F0543F', '#A32E20'], blue: ['#6FB4F0', '#3579B8'], lavender: ['#D9B8F0', '#9C72C8'],
  gred: ['#E23B3B', '#8E1F1F'], ggreen: ['#4FC86A', '#2B8A44'], gpink: ['#FFA8C8', '#D45A8C'], silver: ['#D8DEE6', '#8E99A8'],
  aqua: ['#7FDCD6', '#3BA8A0'], purple: ['#9B5BD8', '#5E2E9C'],
  gold: ['#FFD34D', '#D9A21B'], rainbow: ['url(#rainbowPoop)', '#B48CE0'], crystal: ['url(#crystalPoop)', '#6FA8DC'],
};
const POOP_GLITTER = new Set(['gred', 'ggreen', 'gpink', 'silver', 'aqua', 'purple', 'gold', 'crystal']);
// Glitter speckles, placed inside the body of each shape.
const SPECK = {
  swirl: [[16,46],[22,55],[30,44],[38,56],[46,48],[50,54],[21,34],[30,37],[40,32],[44,38],[26,24],[33,18],[37,27],[36,43],[14,52]],
  beans: [[19,38],[24,48],[20,52],[34,40],[38,50],[33,53],[44,34],[49,42],[46,46],[27,41],[40,45],[23,43]],
};
// A poop. `poop` is { shape: 'beans'|'swirl', color } or nothing for a plain one.
export function poop(p = {}) {
  if (p.shape === 'sp') return specialPoopArt(p.color);
  const [fill, dark] = POOP_FILL[p.color] || POOP_FILL.brown;
  const defs = p.color === 'rainbow' ? `<defs><linearGradient id="rainbowPoop" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#FF8FA8"/><stop offset=".3" stop-color="#FFD166"/><stop offset=".6" stop-color="#5BC8A8"/><stop offset="1" stop-color="#7AA6FF"/></linearGradient></defs>`
    : p.color === 'crystal' ? `<defs><linearGradient id="crystalPoop" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#9FD9FF"/><stop offset=".45" stop-color="#E8F7FF"/><stop offset=".7" stop-color="#C9B8FF"/><stop offset="1" stop-color="#F6F0FF"/></linearGradient></defs>` : '';
  // Sparkles sit beside the poop, never on it, so the swirl shape stays clear.
  const shine = p.color === 'gold' ? `<path d="M54 8 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#FFF3B0" stroke="#D9A21B" stroke-width="1"/><path d="M8 20 l1.3 3 3 1.3 -3 1.3 -1.3 3 -1.3 -3 -3 -1.3 3 -1.3z" fill="#FFF3B0" stroke="#D9A21B" stroke-width="1"/>`
    : p.color === 'rainbow' ? `<path d="M55 12 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="#fff" stroke="#C96AD6" stroke-width="1"/>`
    : p.color === 'crystal' ? `<path d="M55 10 l2 5 5 2 -5 2 -2 5 -2 -5 -5 -2 5 -2z" fill="#fff" stroke="#6FA8DC" stroke-width="1"/><path d="M8 18 l1.5 3.5 3.5 1.5 -3.5 1.5 -1.5 3.5 -1.5 -3.5 -3.5 -1.5 3.5 -1.5z" fill="#fff" stroke="#6FA8DC" stroke-width="1"/><path d="M50 58 l1 2.5 2.5 1 -2.5 1 -1 2.5 -1 -2.5 -2.5 -1 2.5 -1z" fill="#fff" stroke="#B48CE0" stroke-width="1"/>` : '';
  const specks = !POOP_GLITTER.has(p.color) ? '' : SPECK[p.shape === 'swirl' ? 'swirl' : 'beans']
    .map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.3 : 0.9}" fill="#fff" opacity="${i % 2 ? .95 : .7}"/>`).join('');
  // Crystal poops get a few facet lines so they read as cut gems.
  const facets = p.color !== 'crystal' ? '' : p.shape === 'swirl'
    ? `<path d="M18 45 L26 52 M40 43 L48 50 M24 31 L30 38 M34 16 L30 26" stroke="#fff" stroke-width="1.6" opacity=".8" fill="none" stroke-linecap="round"/>`
    : `<path d="M17 36 L21 50 M33 38 L36 54 M44 32 L48 44" stroke="#fff" stroke-width="1.6" opacity=".8" fill="none" stroke-linecap="round"/>`;
  // The swirly poop is the one from the art page: three stacked tiers with a
  // curl on top, eyes and blush on the bottom tier.
  const body = p.shape === 'swirl'
    ? `<path d="M10 52 Q10 41 21 40 H43 Q54 41 54 52 Q54 59 32 59 Q10 59 10 52Z" fill="${fill}" stroke="${dark}" stroke-width="2.5"/>
       <path d="M16 40 Q16 30 26 29 H39 Q48 30 48 40Z" fill="${fill}" stroke="${dark}" stroke-width="2.5"/>
       <path d="M22 29 Q22 20 31 13 Q33 19 39 21 Q43 24 42 29Z" fill="${fill}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>
       <circle cx="26" cy="49" r="2.6" fill="${INK}"/><circle cx="38" cy="49" r="2.6" fill="${INK}"/>
       <path d="M29 53 Q32 56 35 53" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
       <ellipse cx="21" cy="53" rx="3" ry="1.8" fill="#FF8FA8" opacity=".6"/><ellipse cx="43" cy="53" rx="3" ry="1.8" fill="#FF8FA8" opacity=".6"/>`
    : `<ellipse cx="22" cy="44" rx="7" ry="11" transform="rotate(-20 22 44)" fill="${fill}" stroke="${dark}" stroke-width="2"/>
       <ellipse cx="36" cy="46" rx="7" ry="11" transform="rotate(15 36 46)" fill="${fill}" stroke="${dark}" stroke-width="2"/>
       <ellipse cx="46" cy="40" rx="6" ry="10" transform="rotate(35 46 40)" fill="${fill}" stroke="${dark}" stroke-width="2"/>
       <circle cx="20" cy="40" r="1.6" fill="#fff"/><circle cx="25" cy="41" r="1.6" fill="#fff"/>`;
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${defs}${body}${specks}${facets}${shine}</svg>`;
}

// ---- Special poops: each kind has its own little drawing. ----
const BR = '#8A5634', BRD = '#5E3820';
// Eyes, smile and blush centred on (x, y).
const pface = (x, y, s = 1, o = {}) => {
  const eyes = o.closed
    ? `<path d="M${x - 7 * s} ${y} q${2.5 * s} ${2 * s} ${5 * s} 0 M${x + 2 * s} ${y} q${2.5 * s} ${2 * s} ${5 * s} 0" stroke="${INK}" stroke-width="${1.8 * s}" fill="none" stroke-linecap="round"/>`
    : `<circle cx="${x - 6 * s}" cy="${y}" r="${2.5 * s}" fill="${INK}"/><circle cx="${x + 6 * s}" cy="${y}" r="${2.5 * s}" fill="${INK}"/>`;
  const mouth = o.o ? `<ellipse cx="${x}" cy="${y + 5 * s}" rx="${2 * s}" ry="${2.6 * s}" fill="${INK}"/>`
    : `<path d="M${x - 3 * s} ${y + 4 * s} Q${x} ${y + 7 * s} ${x + 3 * s} ${y + 4 * s}" stroke="${INK}" stroke-width="${1.8 * s}" fill="none" stroke-linecap="round"/>`;
  const blush = o.noBlush ? '' : `<ellipse cx="${x - 11 * s}" cy="${y + 4 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="#FF8FA8" opacity=".6"/><ellipse cx="${x + 11 * s}" cy="${y + 4 * s}" rx="${3 * s}" ry="${1.8 * s}" fill="#FF8FA8" opacity=".6"/>`;
  return eyes + mouth + blush;
};
// The usual three-tier swirl, in any fill.
const swirlBody = (fill, dark, sw = 2.5) => `<path d="M10 52 Q10 41 21 40 H43 Q54 41 54 52 Q54 59 32 59 Q10 59 10 52Z" fill="${fill}" stroke="${dark}" stroke-width="${sw}"/>
  <path d="M16 40 Q16 30 26 29 H39 Q48 30 48 40Z" fill="${fill}" stroke="${dark}" stroke-width="${sw}"/>
  <path d="M22 29 Q22 20 31 13 Q33 19 39 21 Q43 24 42 29Z" fill="${fill}" stroke="${dark}" stroke-width="${sw}" stroke-linejoin="round"/>`;
const SWIRL_CLIP = `<clipPath id="swClip"><path d="M10 52 Q10 41 21 40 H43 Q54 41 54 52 Q54 59 32 59 Q10 59 10 52Z M16 40 Q16 30 26 29 H39 Q48 30 48 40Z M22 29 Q22 20 31 13 Q33 19 39 21 Q43 24 42 29Z"/></clipPath>`;
const spark = (x, y, r, fill = '#fff', stroke = '#C96AD6') => `<path d="M${x} ${y - r} l${r * .3} ${r * .7} ${r * .7} ${r * .3} -${r * .7} ${r * .3} -${r * .3} ${r * .7} -${r * .3} -${r * .7} -${r * .7} -${r * .3} ${r * .7} -${r * .3}z" fill="${fill}" stroke="${stroke}" stroke-width="1"/>`;
// A swirl with a pattern laid over it (clipped to the swirl), plus a face.
const patterned = (base, dark, over) => `<defs>${SWIRL_CLIP}</defs>${swirlBody(base, dark)}<g clip-path="url(#swClip)">${over}</g>${swirlBody('none', dark)}${pface(32, 49)}`;

const SPECIAL_ART = {
  // ---- Funny shapes ----
  log: () => `<rect x="6" y="34" width="52" height="22" rx="11" fill="${BR}" stroke="${BRD}" stroke-width="2.5"/>
    <path d="M14 40 Q20 38 24 41 M40 50 Q46 48 50 51" stroke="${BRD}" stroke-width="1.6" fill="none" stroke-linecap="round" opacity=".6"/>
    <ellipse cx="52" cy="45" rx="4" ry="9" fill="#A8714A" stroke="${BRD}" stroke-width="2"/>${pface(30, 45, .9)}`,
  pellets: () => [[16, 52], [28, 53], [40, 52], [52, 53], [22, 43], [34, 43], [46, 43], [28, 34], [40, 34], [34, 25]]
    .map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="6" ry="4.6" fill="${BR}" stroke="${BRD}" stroke-width="1.8"/>`).join('') + pface(34, 43, .55, { noBlush: true }),
  donut: () => `<ellipse cx="32" cy="44" rx="25" ry="15" fill="${BR}" stroke="${BRD}" stroke-width="2.5"/>
    <ellipse cx="32" cy="41" rx="9" ry="4.5" fill="#FFF8EE" stroke="${BRD}" stroke-width="2"/>${pface(32, 51, .65, { noBlush: true })}`,
  tower: () => `<path d="M14 56 Q14 49 22 48 H42 Q50 49 50 56 Q50 60 32 60 Q14 60 14 56Z" fill="${BR}" stroke="${BRD}" stroke-width="2.3"/>
    <path d="M18 48 Q18 41 25 40 H39 Q46 41 46 48Z" fill="${BR}" stroke="${BRD}" stroke-width="2.3"/>
    <path d="M21 40 Q21 33 27 32 H37 Q43 33 43 40Z" fill="${BR}" stroke="${BRD}" stroke-width="2.3"/>
    <path d="M24 32 Q24 26 29 25 H35 Q40 26 40 32Z" fill="${BR}" stroke="${BRD}" stroke-width="2.3"/>
    <path d="M27 25 Q27 14 33 5 Q34 13 37 16 Q39 20 37 25Z" fill="${BR}" stroke="${BRD}" stroke-width="2.3" stroke-linejoin="round"/>${pface(32, 53, .6)}`,
  tiny: () => `<g transform="translate(18 26) scale(.45)">${swirlBody(BR, BRD, 4)}${pface(32, 49)}</g>${spark(14, 30, 4, '#FFF3B0', '#D9A21B')}`,
  // ---- Patterns ----
  polka: () => patterned('#FF8FB8', '#D45A8C', [[16, 50], [28, 44], [44, 46], [38, 56], [22, 34], [36, 34], [30, 22], [48, 54], [12, 56]]
    .map(([x, y]) => `<circle cx="${x}" cy="${y}" r="3.2" fill="#fff"/>`).join('')),
  candy: () => patterned('#fff', '#D04848', [-30, -18, -6, 6, 18, 30, 42, 54].map(x => `<path d="M${x} 64 L${x + 30} 4" stroke="#F0543F" stroke-width="6"/>`).join('')),
  sprinkles: () => patterned(BR, BRD, [[16, 46, 20], [24, 54, -30], [34, 42, 60], [44, 52, 10], [48, 44, -50], [24, 34, 40], [38, 32, -20], [30, 22, 70], [40, 26, 0], [14, 54, 80], [52, 56, -10]]
    .map(([x, y, a], i) => `<rect x="${x - 3}" y="${y - 1}" width="6" height="2.2" rx="1.1" fill="${['#FF8FB8', '#FFD34D', '#6FB4F0', '#8FD07A', '#fff'][i % 5]}" transform="rotate(${a} ${x} ${y})"/>`).join('')),
  fuzzy: () => `<defs>${SWIRL_CLIP}</defs><g stroke="#C9A27A" stroke-width="7" stroke-linecap="round" stroke-dasharray="0.1 5" fill="#E2BE8E">${swirlBody('#E2BE8E', '#C9A27A', 7).replace(/stroke-width="7"/g, '')}</g>${swirlBody('#E2BE8E', 'none', 0)}${pface(32, 49)}`,
  checkers: () => patterned('#fff', '#7A5BD8', [...Array(8)].map((_, r) => [...Array(8)].map((_, c) => (r + c) % 2 ? `<rect x="${c * 8}" y="${r * 8}" width="8" height="8" fill="#B79CF5"/>` : '').join('')).join('')),
  zigzag: () => patterned('#FFD34D', '#D9A21B', [20, 30, 40, 50].map((y, i) => `<path d="M0 ${y} l6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5 6 -5 6 5" stroke="${['#5BC8A8', '#FF8FA8', '#6FB4F0', '#FF8FA8'][i]}" stroke-width="3.5" fill="none" stroke-linejoin="round"/>`).join('')),
  cow: () => patterned('#fff', '#8E8676', `<path d="M10 44 q6 -6 12 0 q-2 8 -12 0z M36 50 q8 -4 12 2 q-4 8 -12 -2z M26 30 q6 -4 10 1 q-4 6 -10 -1z M38 36 q5 -3 8 2 q-4 4 -8 -2z M20 56 q4 -3 7 1 q-3 4 -7 -1z" fill="#2A1A14"/>`),
  // ---- Silly ----
  dumpling: () => `<path d="M8 50 Q8 30 32 26 Q56 30 56 50 Q56 58 32 58 Q8 58 8 50Z" fill="#FFF3DF" stroke="#D9A86E" stroke-width="2.5"/>
    <path d="M18 34 Q22 22 26 32 Q29 20 32 31 Q35 20 38 32 Q42 22 46 34" fill="#FFF3DF" stroke="#D9A86E" stroke-width="2.2" stroke-linejoin="round"/>
    <path d="M30 22 Q32 16 34 22" fill="#8A5634" stroke="${BRD}" stroke-width="1.5"/>${pface(32, 46)}`,
  carrot: () => `<path d="M24 16 Q20 6 26 4 Q28 10 30 14 Q30 4 36 4 Q38 10 34 16 Q40 8 44 12 Q40 16 36 18Z" fill="#6FCF4F" stroke="#3C8A2E" stroke-width="2" stroke-linejoin="round"/>
    ${swirlBody('#FF9A3C', '#D9652B')}<path d="M14 46 H20 M44 50 H50 M20 34 H25 M40 34 H44" stroke="#D9652B" stroke-width="2" stroke-linecap="round"/>${pface(32, 49)}`,
  bubblegum: () => `${swirlBody('#FF8FB8', '#D45A8C')}<circle cx="47" cy="44" r="11" fill="#FFC2DA" stroke="#D45A8C" stroke-width="2" opacity=".9"/><path d="M42 39 Q44 36 47 37" stroke="#fff" stroke-width="2" fill="none" stroke-linecap="round"/>
    <circle cx="22" cy="48" r="2.5" fill="${INK}"/><circle cx="32" cy="48" r="2.5" fill="${INK}"/><ellipse cx="16" cy="52" rx="3" ry="1.8" fill="#FF5C9A" opacity=".5"/>`,
  cactus: () => `${swirlBody('#6FCF4F', '#3C8A2E')}${[[14, 46], [50, 48], [18, 36], [46, 34], [26, 20], [40, 24], [22, 56], [44, 56]].map(([x, y]) => `<path d="M${x - 2} ${y} l-3 -1 M${x + 2} ${y} l3 -1" stroke="#2B6A22" stroke-width="1.2" stroke-linecap="round"/>`).join('')}
    <circle cx="33" cy="11" r="4" fill="#FF8FB8" stroke="#D45A8C" stroke-width="1.5"/><circle cx="33" cy="11" r="1.4" fill="#FFD34D"/>${pface(32, 49)}`,
  galaxy: () => `<defs><radialGradient id="galaxyPoop" cx=".4" cy=".6" r=".8"><stop offset="0" stop-color="#9B5BD8"/><stop offset=".55" stop-color="#3B2A8E"/><stop offset="1" stop-color="#15123E"/></radialGradient></defs>
    ${swirlBody('url(#galaxyPoop)', '#15123E')}${[[18, 46, 1.4], [44, 44, 1], [26, 34, 1.2], [40, 30, 1.6], [31, 20, 1], [50, 54, 1.2], [14, 56, 1]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/>`).join('')}
    ${spark(36, 40, 3.5, '#FFF3B0', '#FFD34D')}<circle cx="26" cy="49" r="2.6" fill="#fff"/><circle cx="38" cy="49" r="2.6" fill="#fff"/><path d="M29 53 Q32 56 35 53" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  cupcake: () => `<path d="M14 42 H50 L45 60 H19Z" fill="#7FC8F0" stroke="#3579B8" stroke-width="2.5" stroke-linejoin="round"/><path d="M22 43 L24 59 M32 43 V59 M42 43 L40 59" stroke="#3579B8" stroke-width="1.5" opacity=".6"/>
    <path d="M10 44 Q10 34 20 33 H44 Q54 34 54 44Z" fill="${BR}" stroke="${BRD}" stroke-width="2.5"/><path d="M18 33 Q18 25 26 24 H38 Q46 25 46 33Z" fill="${BR}" stroke="${BRD}" stroke-width="2.5"/>
    <circle cx="32" cy="18" r="6" fill="#F0543F" stroke="#A32E20" stroke-width="2"/><path d="M32 12 Q34 6 38 5" stroke="#3C8A2E" stroke-width="1.8" fill="none"/>
    ${[[20, 38, '#FFD34D'], [30, 30, '#FF8FB8'], [40, 37, '#8FD07A'], [46, 41, '#fff']].map(([x, y, c]) => `<rect x="${x - 2.5}" y="${y - 1}" width="5" height="2" rx="1" fill="${c}"/>`).join('')}
    <circle cx="27" cy="50" r="2.2" fill="${INK}"/><circle cx="37" cy="50" r="2.2" fill="${INK}"/><path d="M30 53 Q32 55 34 53" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>`,
  sleepy: () => `${swirlBody(BR, BRD)}<path d="M20 30 Q30 4 46 18 Q38 22 42 30Z" fill="#6FB4F0" stroke="#3579B8" stroke-width="2" stroke-linejoin="round"/><circle cx="47" cy="17" r="3.5" fill="#fff" stroke="#3579B8" stroke-width="1.5"/>
    ${pface(32, 49, 1, { closed: true })}<text x="50" y="12" font-family="sans-serif" font-weight="bold" font-size="10" fill="#6FB4F0">z</text><text x="56" y="6" font-family="sans-serif" font-weight="bold" font-size="7" fill="#6FB4F0">z</text>`,
  cool: () => `${swirlBody(BR, BRD)}<path d="M15 45 H49" stroke="${INK}" stroke-width="2.5"/><path d="M17 45 H30 Q30 52 24 52 Q17 52 17 45Z M34 45 H47 Q47 52 41 52 Q34 52 34 45Z" fill="${INK}"/>
    <path d="M20 47 L23 46" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/><path d="M29 55 Q33 57 37 54" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  jelly: () => `<path d="M10 52 Q10 41 21 40 H43 Q54 41 54 52 Q54 59 32 59 Q10 59 10 52Z M16 40 Q16 30 26 29 H39 Q48 30 48 40Z M22 29 Q22 20 31 13 Q33 19 39 21 Q43 24 42 29Z" fill="#7FE0A8" fill-opacity=".75" stroke="#2EA86A" stroke-width="2.5"/>
    <path d="M18 46 Q20 42 24 43 M24 34 Q26 31 29 32" stroke="#fff" stroke-width="2.2" fill="none" stroke-linecap="round" opacity=".8"/><circle cx="44" cy="52" r="2" fill="#fff" opacity=".7"/>${pface(32, 49)}`,
  // ---- Legendary ----
  unicorn: () => `<defs><linearGradient id="uniPoop" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#FFB8D8"/><stop offset=".5" stop-color="#E8D8FF"/><stop offset="1" stop-color="#B8E8FF"/></linearGradient></defs>
    ${swirlBody('url(#uniPoop)', '#B48CE0')}<path d="M27.5 17 L31.5 1 L35.5 17Z" fill="#FFD34D" stroke="#D9A21B" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 12 L34 10.5 M30 7 L33.5 6" stroke="#D9A21B" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M42 26 Q52 22 50 32 Q56 34 52 40" stroke="#FF8FB8" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M44 28 Q54 28 52 38" stroke="#7FB8F5" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${pface(32, 49)}${spark(10, 22, 5, '#fff', '#C96AD6')}${spark(56, 52, 3.5, '#fff', '#7FB8F5')}`,
  goldicorn: () => `<defs><linearGradient id="goldiPoop" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#E8A820"/><stop offset=".45" stop-color="#FFD34D"/><stop offset=".7" stop-color="#FFF0A0"/><stop offset="1" stop-color="#FFC93A"/></linearGradient></defs>
    ${swirlBody('url(#goldiPoop)', '#B57D10')}<path d="M18 46 Q24 42 28 47 M38 33 Q43 30 46 35" stroke="#FFF6C8" stroke-width="2" fill="none" stroke-linecap="round" opacity=".9"/>
    <path d="M27.5 17 L31.5 1 L35.5 17Z" fill="#FFF3B0" stroke="#B57D10" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 12 L34 10.5 M30 7 L33.5 6" stroke="#B57D10" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M42 26 Q52 22 50 32 Q56 34 52 40" stroke="#FF9A3D" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M44 28 Q54 28 52 38" stroke="#FFE680" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${pface(32, 49)}${spark(10, 22, 5, '#FFF3B0', '#D9A21B')}${spark(56, 52, 4, '#FFF3B0', '#D9A21B')}${spark(54, 8, 3, '#fff', '#D9A21B')}`,
  diamond: () => `<defs><linearGradient id="diaPoop" x1="0" y1="1" x2="1" y2="0"><stop offset="0" stop-color="#BFF0FF"/><stop offset=".35" stop-color="#FFFFFF"/><stop offset=".6" stop-color="#CFE0FF"/><stop offset="1" stop-color="#F2E8FF"/></linearGradient></defs>
    ${swirlBody('url(#diaPoop)', '#5FA8E0')}<path d="M18 45 L26 52 M40 43 L48 50 M24 31 L30 38 M38 31 L34 38 M14 54 L20 50" stroke="#fff" stroke-width="1.8" opacity=".9" fill="none" stroke-linecap="round"/>
    <path d="M27.5 17 L31.5 1 L35.5 17Z" fill="#E8F7FF" stroke="#5FA8E0" stroke-width="1.5" stroke-linejoin="round"/><path d="M29 12 L34 10.5 M30 7 L33.5 6" stroke="#5FA8E0" stroke-width="1.2" stroke-linecap="round"/>
    <path d="M42 26 Q52 22 50 32 Q56 34 52 40" stroke="#9FD9FF" stroke-width="3" fill="none" stroke-linecap="round"/><path d="M44 28 Q54 28 52 38" stroke="#D8C8FF" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    ${pface(32, 49)}${spark(10, 22, 5, '#fff', '#5FA8E0')}${spark(56, 52, 4, '#fff', '#9B8CF0')}${spark(54, 8, 3, '#fff', '#5FA8E0')}`,
  royal: () => `${swirlBody('#FFD34D', '#D9A21B')}<path d="M22 20 L22 8 L27 13 L32 5 L37 13 L42 8 L42 20Z" fill="#FFD34D" stroke="#B57D10" stroke-width="2" stroke-linejoin="round"/>
    <circle cx="32" cy="15" r="2" fill="#F0543F"/><circle cx="26" cy="17" r="1.4" fill="#6FB4F0"/><circle cx="38" cy="17" r="1.4" fill="#8FD07A"/>
    <path d="M10 52 Q32 62 54 52 L54 58 Q32 66 10 58Z" fill="#B23A5E" opacity=".9"/>${pface(32, 47)}${spark(56, 12, 4, '#FFF3B0', '#D9A21B')}`,
  moon: () => `<defs><radialGradient id="moonPoop" cx=".5" cy=".4" r=".7"><stop offset="0" stop-color="#FFF8D6"/><stop offset="1" stop-color="#E8D98A"/></radialGradient></defs>
    ${swirlBody('url(#moonPoop)', '#BFAE5A')}<circle cx="20" cy="47" r="3" fill="#E0CD78"/><circle cx="44" cy="54" r="2.2" fill="#E0CD78"/><circle cx="38" cy="34" r="2" fill="#E0CD78"/>
    <path d="M54 6 A8 8 0 1 0 60 18 A6 6 0 1 1 54 6Z" fill="#FFD34D" stroke="#D9A21B" stroke-width="1.2"/>${pface(32, 49, 1, { closed: true })}${spark(8, 14, 3.5, '#fff', '#BFAE5A')}`,
  champ: () => `${swirlBody(BR, BRD)}<path d="M24 34 L28 46 M40 34 L36 46" stroke="#4FA8F5" stroke-width="4"/><circle cx="32" cy="50" r="7" fill="#FFD34D" stroke="#D9A21B" stroke-width="2"/>
    <path d="M32 46 l1.2 2.5 2.7 .4 -2 1.9 .5 2.7 -2.4 -1.3 -2.4 1.3 .5 -2.7 -2 -1.9 2.7 -.4z" fill="#FFF3B0"/>
    <circle cx="25" cy="39" r="2.2" fill="${INK}"/><circle cx="39" cy="39" r="2.2" fill="${INK}"/><path d="M29 42 Q32 44 35 42" stroke="${INK}" stroke-width="1.6" fill="none" stroke-linecap="round"/>${spark(54, 20, 4, '#FFF3B0', '#D9A21B')}`,
  hay: () => `${swirlBody('#E8C860', '#B8902A')}${[[14, 48, 20], [26, 54, -15], [40, 46, 30], [48, 54, -25], [22, 36, -10], [38, 34, 25], [30, 22, -30], [36, 26, 15]]
    .map(([x, y, a]) => `<path d="M${x - 5} ${y} H${x + 5}" stroke="#B8902A" stroke-width="1.4" stroke-linecap="round" transform="rotate(${a} ${x} ${y})"/>`).join('')}
    <path d="M30 13 L26 4 M32 13 L33 3 M34 14 L40 6" stroke="#E8C860" stroke-width="2" stroke-linecap="round"/>${pface(32, 49)}`,
  mystery: () => `${swirlBody('#9B5BD8', '#5E2E9C')}<text x="32" y="38" text-anchor="middle" font-family="sans-serif" font-weight="900" font-size="16" fill="#FFD34D" stroke="#5E2E9C" stroke-width="1">?</text>
    <circle cx="26" cy="49" r="2.6" fill="#fff"/><circle cx="38" cy="49" r="2.6" fill="#fff"/><path d="M29 53 Q32 56 35 53" stroke="#fff" stroke-width="1.8" fill="none" stroke-linecap="round"/>${spark(10, 20, 4, '#FFD34D', '#5E2E9C')}${spark(55, 14, 3, '#FFD34D', '#5E2E9C')}`,
  robo: () => `<path d="M10 52 Q10 41 21 40 H43 Q54 41 54 52 Q54 59 32 59 Q10 59 10 52Z" fill="#D8DEE6" stroke="#6E7A8A" stroke-width="2.5"/>
    <path d="M16 40 Q16 30 26 29 H39 Q48 30 48 40Z" fill="#D8DEE6" stroke="#6E7A8A" stroke-width="2.5"/><path d="M22 29 Q22 20 31 16 Q40 20 42 29Z" fill="#D8DEE6" stroke="#6E7A8A" stroke-width="2.5"/>
    <path d="M32 16 V7" stroke="#6E7A8A" stroke-width="2"/><circle cx="32" cy="6" r="3" fill="#F0543F"/>
    ${[[14, 50], [50, 50], [20, 35], [44, 35]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.4" fill="#6E7A8A"/>`).join('')}
    <rect x="21" y="45" width="22" height="8" rx="3" fill="#2A3340"/><circle cx="27" cy="49" r="2" fill="#7FE0FF"/><circle cx="37" cy="49" r="2" fill="#7FE0FF"/>`,
};
// Where glitter specks go on each special (inside its body); swirl-based ones use the swirl's.
const SPECK_SP = {
  log: [[12, 42], [18, 50], [36, 39], [44, 51], [26, 52], [40, 46], [22, 40], [48, 40]],
  pellets: [[14, 51], [27, 52], [41, 51], [52, 53], [21, 42], [35, 43], [47, 42], [28, 33], [41, 34], [33, 24]],
  donut: [[14, 44], [20, 52], [44, 53], [50, 44], [24, 35], [40, 35], [32, 55], [12, 49]],
  tower: [[18, 56], [44, 56], [22, 45], [41, 45], [25, 37], [38, 37], [28, 29], [35, 29], [31, 18]],
  tiny: [[24, 46], [30, 41], [36, 46], [27, 36], [32, 33]],
};
// color is 'id', 'id.tint', 'id.g' or 'id.tint.g' (see specialVariant in game.js).
export function specialPoopArt(color) {
  const [id, a, b] = String(color).split('.');
  const tint = a && a !== 'g' ? a : 'brown', sparkly = a === 'g' || b === 'g';
  let art = (SPECIAL_ART[id] || SPECIAL_ART.log)();
  if (tint !== 'brown' && POOP_FILL[tint]) {
    const [fill, dark] = POOP_FILL[tint];
    art = art.replaceAll(BR, fill).replaceAll(BRD, dark).replaceAll('#A8714A', fill).replaceAll('#6E4428', dark);
  }
  if (sparkly) {
    art += (SPECK_SP[id] || SPECK.swirl).map(([x, y], i) => `<circle cx="${x}" cy="${y}" r="${i % 3 === 0 ? 1.4 : 1}" fill="#fff" opacity="${i % 2 ? .95 : .75}"/>`).join('')
      + spark(57, 10, 5, '#FFF3B0', '#D9A21B') + spark(7, 26, 3.5, '#fff', '#C96AD6');
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${art}</svg>`;
}

// Grey silhouette of a poop kind for the Poop Book.
export function poopShadow(p = {}) {
  return poop(p).replace(/<defs>[\s\S]*?<\/defs>/g, '').replace(/<g clip-path=[^>]*>[\s\S]*?<\/g>/g, '').replace(/<text[\s\S]*?<\/text>/g, '')
    .replace(/fill="(?!none)[^"]*"/g, 'fill="#D5CDBA"').replace(/stroke="[^"]*"/g, 'stroke="#B7AC94"');
}

export function badgeIcon(locked = false) {
  const c = locked ? ['#D5CDBA', '#B7AC94', '#E6DCC8'] : ['#FFD34D', '#E0941C', '#FFF3B0'];
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M20 38 L14 60 L32 50 L50 60 L44 38Z" fill="${locked ? '#B7AC94' : '#F2544A'}"/><circle cx="32" cy="28" r="22" fill="${c[0]}" stroke="${c[1]}" stroke-width="3"/><path d="M32 14 l4.5 9 10 1.5 -7 7 1.5 10 -9 -4.8 -9 4.8 1.5 -10 -7 -7 10 -1.5z" fill="${c[2]}" stroke="${c[1]}" stroke-width="2" stroke-linejoin="round"/></svg>`;
}

// The Poop Book, open, with a few poop stickers and a gold star on the page.
// Used for the "book filled" celebration and the books-filled counter.
export function poopBookArt(small = false) {
  const mini = (x, y, color, shape, sz = 16) => `<g transform="translate(${x} ${y}) scale(${sz / 64})">${poop({ color, shape }).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>`;
  const stickers = small ? '' : mini(14, 20, 'brown', 'swirl') + mini(30, 22, 'pink', 'beans') + mini(14, 38, 'green', 'beans') + mini(68, 20, 'rainbow', 'swirl') + mini(86, 22, 'orange', 'swirl') + mini(70, 38, 'gold', 'beans');
  return `<svg viewBox="0 0 120 80" aria-hidden="true">
    <ellipse cx="60" cy="74" rx="50" ry="5" fill="#000" opacity=".12"/>
    <path d="M6 14 Q6 8 12 8 Q36 6 58 14 V70 Q36 62 12 66 Q6 66 6 60Z" fill="#5BA8F0" stroke="#2F6FB8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M114 14 Q114 8 108 8 Q84 6 62 14 V70 Q84 62 108 66 Q114 66 114 60Z" fill="#5BA8F0" stroke="#2F6FB8" stroke-width="3" stroke-linejoin="round"/>
    <path d="M11 12 Q34 10 58 17 V64 Q34 57 11 61Z" fill="#FFF9EC" stroke="#E2D3B5" stroke-width="2"/>
    <path d="M109 12 Q86 10 62 17 V64 Q86 57 109 61Z" fill="#FFF9EC" stroke="#E2D3B5" stroke-width="2"/>
    <path d="M58 14 Q60 12 62 14 V70 Q60 72 58 70Z" fill="#2F6FB8"/>
    ${stickers}
    <g transform="translate(${small ? 34 : 42} ${small ? 18 : 40}) scale(${small ? 0.8 : 0.55})">
      <path d="M32 6 l7 14 15.5 2.2 -11.2 11 2.6 15.4 -13.9 -7.3 -13.9 7.3 2.6 -15.4 -11.2 -11 15.5 -2.2z" fill="#FFD34D" stroke="#E0941C" stroke-width="3" stroke-linejoin="round"/>
      <circle cx="27" cy="27" r="2.2" fill="${INK}"/><circle cx="37" cy="27" r="2.2" fill="${INK}"/>
      <path d="M29 32 Q32 35 35 32" stroke="${INK}" stroke-width="1.8" fill="none" stroke-linecap="round"/>
    </g>
    <path d="M18 70 V80 L22 76 L26 80 V70Z" fill="#F2544A"/>
  </svg>`;
}

export function compostIcon() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M12 30 Q16 18 32 20 Q48 18 52 30Z" fill="#5E3820"/><circle cx="24" cy="25" r="1.6" fill="#8A5634"/><circle cx="40" cy="24" r="1.6" fill="#8A5634"/><path d="M32 22 V10" stroke="#5FAE4E" stroke-width="3.5" stroke-linecap="round"/><path d="M32 14 Q24 6 20 12 Q26 16 32 14Z M32 12 Q40 4 44 10 Q38 14 32 12Z" fill="#7DC768" stroke="#3E8E2A" stroke-width="2" stroke-linejoin="round"/><path d="M12 28 H52 L47 58 H17Z" fill="#B9824A" stroke="#8A5634" stroke-width="3" stroke-linejoin="round"/><path d="M15 40 H49" stroke="#8A5634" stroke-width="3"/></svg>`;
}

// Tab icon: a tiny maze with a dumpling at the goal.
export function mazeIcon() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="4" y="4" width="56" height="56" rx="10" fill="#A7DB8C" stroke="#5FAE4E" stroke-width="4"/>
    <g stroke="#9C6A3A" stroke-width="5" stroke-linecap="round" fill="none"><path d="M18 4 V22 M18 36 V60 M32 18 H46 V34 M32 46 H46"/><path d="M4 32 H18" opacity=".0"/></g>
    <circle cx="48" cy="14" r="6" fill="#FFD9A8" stroke="#C98F4B" stroke-width="2"/>
    <ellipse cx="15" cy="49" rx="6" ry="4" fill="#E9A15B"/><circle cx="19" cy="48" r="1.2" fill="#2A1A14"/>
  </svg>`;
}

export function coinIcon() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="28" fill="#F5B32B"/><circle cx="32" cy="32" r="22" fill="#FFD34D" stroke="#E0941C" stroke-width="3"/><path d="M32 16 l5 10 11 1.5 -8 7.5 2 11 -10 -5.5 -10 5.5 2 -11 -8 -7.5 11 -1.5z" fill="#FFF3B0" stroke="#E0941C" stroke-width="2" stroke-linejoin="round"/></svg>`;
}


// Maze themes: the board, floor and wall look for the whole maze. Walls and
// floor decorations are drawn in maze cell coordinates (one cell is 48).
const placeSvg = (svg, x, y, size) => svg.replace(/<svg [^>]*?viewBox/, `<svg x="${x}" y="${y}" width="${size}" height="${size}" viewBox`);
const star4 = (x, y, r, fill) => `<path d="M${x} ${y - r} Q${x} ${y} ${x + r} ${y} Q${x} ${y} ${x} ${y + r} Q${x} ${y} ${x - r} ${y} Q${x} ${y} ${x} ${y - r}Z" fill="${fill}"/>`;
const jit = (i, k) => ((i * 7919 + k * 104729) % 97) / 97;
const C = 48;
// 3/4 view: the wall's top is lifted by LIFT and a darker front face shows
// below it, with a soft shadow on the floor. Rows draw top to bottom, so the
// lift overlaps the square above.
export const LIFT = 9;
export function mazeWall3d(theme, px, py, i) {
  const t = MAZE_THEMES[theme] || MAZE_THEMES.hay;
  // Cube themes sit right on their square, with a contact shadow at the base.
  if (t.cube) return `<ellipse cx="${px + 24}" cy="${py + 45}" rx="23" ry="3.5" fill="#000" opacity=".22"/><g transform="translate(0 -2)">${t.wall(px, py, i)}</g>`;
  return `<ellipse cx="${px + 24}" cy="${py + 45}" rx="21" ry="4" fill="#000" opacity=".16"/>
    <rect x="${px + 3}" y="${py + 14}" width="${C - 6}" height="${C - 16}" rx="9" fill="${t.side}"/>
    <rect x="${px + 3}" y="${py + 14}" width="${C - 6}" height="${C - 16}" rx="9" fill="#000" opacity=".12"/>
    <g transform="translate(0 ${-LIFT})">${t.wall(px, py, i)}</g>`;
}
export const MAZE_THEMES = {
  hay: {
    side: '#B07A3E', name: 'Hay barn', board: '#A7DB8C', floor: '#D9F0B8', seen: '#C2E39B', start: '#8ED46A', startEdge: '#4FA33A', post: '#C9935A', postEdge: '#8A5634',
    wall: (px, py) => `<rect x="${px + 3}" y="${py + 6}" width="${C - 6}" height="${C - 10}" rx="9" fill="#E6B566" stroke="#9C6A3A" stroke-width="3"/>
      <path d="M${px + 10} ${py + 14} h${C - 20} M${px + 10} ${py + 24} h${C - 20} M${px + 10} ${py + 34} h${C - 20}" stroke="#C98F4B" stroke-width="3" stroke-linecap="round"/>
      <path d="M${px + 16} ${py + 8} v${C - 14} M${px + C - 16} ${py + 8} v${C - 14}" stroke="#9C6A3A" stroke-width="2.5" opacity=".6"/>`,
    deco: () => '',
  },
  pumpkin: {
    side: '#D0601C', ui: { p: ['#FFF4E2', '#F6DDB8', '#C98F4B'], hint: '#7A4A20', b: ['#FFE2BD', '#F7B977', '#B9632A', '#6B3410'], g: 'linear-gradient(#FFB066, #E8701C)', ge: '#A9480F', t: ['#FFF4E2', '#E8C79A', '#E8701C'] },
    name: 'Pumpkin patch', board: '#7CB65A', floor: '#EBCB97', seen: '#DDB47A', start: '#A9DB7E', startEdge: '#5E9A3A', post: '#8A5634', postEdge: '#5A3A22',
    // A chunky, cube-ish pumpkin that fills the whole block.
    wall: (px, py) => `<rect x="${px + 3}" y="${py + 6}" width="${C - 6}" height="${C - 10}" rx="13" fill="#FF8A2A" stroke="#B9531A" stroke-width="3"/>
      <path d="M${px + 16} ${py + 8} Q${px + 11} ${py + 25} ${px + 16} ${py + 42} M${px + 24} ${py + 7} V${py + 43} M${px + 32} ${py + 8} Q${px + 37} ${py + 25} ${px + 32} ${py + 42}" stroke="#D96A1C" stroke-width="2.5" fill="none" stroke-linecap="round"/>
      <ellipse cx="${px + 11}" cy="${py + 16}" rx="3" ry="6" fill="#FFC27A" opacity=".7"/>
      <path d="M${px + 22} ${py + 8} Q${px + 21} ${py + 1} ${px + 26} ${py - 1} L${px + 27} ${py + 2} Q${px + 25} ${py + 4} ${px + 26} ${py + 8}Z" fill="#6B8E2F" stroke="#3F5E1A" stroke-width="1.5"/>
      <path d="M${px + 27} ${py + 1} q6 -3 8 3" stroke="#4F9A3C" stroke-width="2" fill="none" stroke-linecap="round"/>`,
    deco: (px, py, i) => `<circle cx="${px + 10 + jit(i, 1) * 28}" cy="${py + 10 + jit(i, 2) * 28}" r="1.6" fill="#C79B62"/><circle cx="${px + 12 + jit(i, 3) * 24}" cy="${py + 14 + jit(i, 4) * 22}" r="1.2" fill="#C79B62"/>`,
  },
  galaxy: {
    side: '#3A2A8C', ui: { p: ['#2E2774', '#1E1A52', '#6E5BD6'], hint: '#D9D2FF', b: ['#9C86F0', '#6A50C8', '#2A1C6E', '#FFFFFF'], g: 'linear-gradient(#6FEBD8, #2FB8A6)', ge: '#17756A', t: ['#3A3290', '#5B4CB8', '#5EE3D0'] },
    name: 'Galaxy', board: '#17123A', floor: '#2A2468', seen: '#3D368F', start: '#3FBFB0', startEdge: '#9FFFF2', post: '#FFD84D', postEdge: '#B8901A',
    // A space-rock cube: lit top face, darker front face with its own craters.
    cube: true,
    wall: (px, py, i) => {
      // Classic top-down block: the camera looks down from the front, so the
      // top face is big and the front face shows as a darker band below it,
      // with straight up-and-down side edges.
      const l = px + 3, r = px + 45, t = py + 1, e = py + 32, b = py + 47;
      return `<rect x="${l}" y="${t}" width="${r - l}" height="${b - t}" rx="7" fill="#7058D2" stroke="#120C3A" stroke-width="2.5"/>
        <path d="M${l + 1.5} ${e} H${r - 1.5}" stroke="#4E39A8" stroke-width="2"/>
        <circle cx="${px + 14}" cy="${py + 40}" r="2.4" fill="#5C46BC"/><circle cx="${px + 32}" cy="${py + 41}" r="1.8" fill="#5C46BC"/>
        <path d="M${l + 1.5} ${e - 1} V${t + 7} Q${l + 1.5} ${t + 1.5} ${l + 7} ${t + 1.5} H${r - 7} Q${r - 1.5} ${t + 1.5} ${r - 1.5} ${t + 7} V${e - 1}Z" fill="#A994F6"/>
        <circle cx="${px + 15}" cy="${py + 12}" r="5" fill="#8770E2"/><circle cx="${px + 31}" cy="${py + 21}" r="5.5" fill="#8770E2"/><circle cx="${px + 34}" cy="${py + 9}" r="2.2" fill="#8770E2"/>
        <path d="M${l + 5} ${t + 10} Q${l + 5} ${t + 5} ${l + 10} ${t + 5} H${r - 10}" stroke="#C7B9FF" stroke-width="2.2" fill="none" stroke-linecap="round"/>
        <path d="M${l + 5} ${b - 3} H${r - 5}" stroke="#B9A8FF" stroke-width="1.6" stroke-linecap="round" opacity=".8"/>
        ${i % 3 === 0 ? star4(px + 41, py + 2, 5, '#FFE66B') : ''}`;
    },
    deco: (px, py, i) => star4(px + 8 + jit(i, 1) * 30, py + 8 + jit(i, 2) * 30, 2.6, '#fff') + `<circle cx="${px + 10 + jit(i, 3) * 28}" cy="${py + 10 + jit(i, 4) * 28}" r="1" fill="#C9C2FF"/>`,
  },
  unicorn: {
    side: '#D98BC4', ui: { p: ['#FFF6FC', '#FFE3F3', '#F59ACB'], hint: '#A3326F', b: ['#FFFFFF', '#FFD6EE', '#E07AB4', '#A3326F'], g: 'linear-gradient(90deg, #FF8FA8, #FFC27A, #FFE66B, #8EE3A0, #8CC8FF, #C5A3FF)', ge: '#C96AD6', t: ['#FFF6FC', '#F7C1E0', '#C96AD6'] },
    name: 'Unicorn', board: '#FFB8E1', floor: '#FFF1FA', seen: '#FFDDF1', start: '#C8F2E4', startEdge: '#7FD6BC', post: '#FFFFFF', postEdge: '#E58BC0',
    wall: (px, py, i) => `<clipPath id="uw${i}"><rect x="${px + 3}" y="${py + 5}" width="${C - 6}" height="${C - 9}" rx="11"/></clipPath>
      <g clip-path="url(#uw${i})">${['#FF8FA8', '#FFC27A', '#FFE66B', '#8EE3A0', '#8CC8FF', '#C5A3FF'].map((c, k) => `<rect x="${px}" y="${py + 5 + k * 6.5}" width="${C}" height="7" fill="${c}"/>`).join('')}</g>
      <rect x="${px + 3}" y="${py + 5}" width="${C - 6}" height="${C - 9}" rx="11" fill="none" stroke="#fff" stroke-width="3"/>${star4(px + 34, py + 15, 5, '#fff')}`,
    deco: (px, py, i) => ['#FF8FC8', '#B79CFF', '#8CC8FF'].map((c, k) => `<circle cx="${px + 8 + jit(i, k * 2) * 32}" cy="${py + 8 + jit(i, k * 2 + 1) * 32}" r="1.5" fill="${c}"/>`).join(''),
  },
  kitchen: {
    side: '#A8763A', ui: { p: ['#F2FBF6', '#D9F2E6', '#8CCFB2'], hint: '#2E6B55', b: ['#F6DDA4', '#E8C27A', '#9C6A3A', '#5A3A22'], g: 'linear-gradient(#FF8A7A, #EE5146)', ge: '#B83A30', t: ['#F2FBF6', '#B7E6D2', '#EE5146'] },
    name: 'Dumpling kitchen', board: '#E9B98A', floor: '#D3F1E4', seen: '#B7E6D2', start: '#FFE08A', startEdge: '#E0A93A', post: '#C9935A', postEdge: '#8A5634',
    // A tall stack of bamboo steamer baskets, nothing underneath.
    cube: true,
    wall: (px, py) => {
      const l = px + 4, r = px + 44, cx = px + 24, top = py + 9, bot = py + 47, ry = 6;
      const band = (y) => `<path d="M${l} ${y} Q${cx} ${y + ry * 1.6} ${r} ${y}" stroke="#9C6A3A" stroke-width="2.5" fill="none"/>`;
      return `<path d="M${l} ${top} V${bot - ry} Q${cx} ${bot + ry * .6} ${r} ${bot - ry} V${top}Z" fill="#E8C27A" stroke="#9C6A3A" stroke-width="3" stroke-linejoin="round"/>
        ${band(py + 22)}${band(py + 34)}
        <path d="M${l + 5} ${py + 15} V${py + 40}" stroke="#F6DDA4" stroke-width="3" stroke-linecap="round"/>
        <ellipse cx="${cx}" cy="${top}" rx="${(r - l) / 2}" ry="${ry}" fill="#F2D59A" stroke="#9C6A3A" stroke-width="3"/>
        <path d="M${l + 7} ${top} Q${cx} ${top + 4} ${r - 7} ${top} M${l + 9} ${top - 2} Q${cx} ${top + 1} ${r - 9} ${top - 2}" stroke="#D9A85A" stroke-width="1.5" fill="none"/>
        <ellipse cx="${cx}" cy="${top - 1}" rx="5" ry="2" fill="#B5823F"/>`;
    },
    deco: (px, py) => `<path d="M${px + 24} ${py + 4} V${py + 44} M${px + 4} ${py + 24} H${px + 44}" stroke="#fff" stroke-width="2" opacity=".7"/>`,
  },
  snow: {
    side: '#6FA9CF', ui: { p: ['#FFFFFF', '#E6F4FC', '#8CC6EA'], hint: '#2A5C80', b: ['#FFFFFF', '#D6EEFB', '#5FA3CF', '#2A5C80'], g: 'linear-gradient(#8CD3FF, #4AA8E8)', ge: '#2B74AE', t: ['#FFFFFF', '#BFE0F5', '#4AA8E8'] },
    name: 'Snow day', board: '#BFE3F7', floor: '#F6FBFF', seen: '#E1F0FA', start: '#BDF0D0', startEdge: '#6CC48E', post: '#8FB8D6', postEdge: '#5A86A8',
    // An ice block: clear ice on top and front, with a little cap of snow
    // on the top face.
    cube: true,
    wall: (px, py, i) => {
      const l = px + 3, r = px + 45, t = py + 1, e = py + 32, b = py + 47;
      const capR = i % 2 ? r - 14 : r - 20;
      return `<rect x="${l}" y="${t}" width="${r - l}" height="${b - t}" rx="7" fill="#7FC2EA" stroke="#3F86B5" stroke-width="2.5"/>
        <path d="M${l + 1.5} ${e} V${t + 7} Q${l + 1.5} ${t + 1.5} ${l + 7} ${t + 1.5} H${r - 7} Q${r - 1.5} ${t + 1.5} ${r - 1.5} ${t + 7} V${e}Z" fill="#BDE6FB"/>
        <path d="M${l + 1.5} ${e} H${r - 1.5}" stroke="#5FA3CF" stroke-width="2"/>
        <path d="M${l + 9} ${t + 25} L${l + 20} ${t + 12} M${l + 22} ${t + 26} L${l + 28} ${t + 18}" stroke="#fff" stroke-width="2.5" stroke-linecap="round" opacity=".85"/>
        <path d="M${l + 6} ${e + 4} L${l + 12} ${b - 4} M${r - 12} ${e + 4} L${r - 8} ${b - 6}" stroke="#D6F0FF" stroke-width="2" stroke-linecap="round"/>
        <path d="M${l + 1.5} ${t + 9} Q${l + 1.5} ${t + 1.5} ${l + 8} ${t + 1.5} H${capR} Q${capR + 6} ${t + 2} ${capR + 3} ${t + 7} Q${capR - 4} ${t + 11} ${capR - 10} ${t + 8} Q${l + 12} ${t + 14} ${l + 1.5} ${t + 12}Z" fill="#fff"/>
        <rect x="${l}" y="${t}" width="${r - l}" height="${b - t}" rx="7" fill="none" stroke="#3F86B5" stroke-width="2.5"/>`;
    },
    deco: (px, py, i) => { const x = px + 12 + jit(i, 1) * 24, y = py + 12 + jit(i, 2) * 24; return `<path d="M${x - 4} ${y} H${x + 4} M${x} ${y - 4} V${y + 4} M${x - 3} ${y - 3} L${x + 3} ${y + 3} M${x + 3} ${y - 3} L${x - 3} ${y + 3}" stroke="#B9DDF2" stroke-width="1.4" stroke-linecap="round"/>`; },
  },
  sea: {
    side: '#D98A7A', ui: { p: ['#FFF8E4', '#F3E2B3', '#E0B866'], hint: '#7A5A20', b: ['#FFE7DD', '#FFB8A8', '#D9705F', '#7A2E22'], g: 'linear-gradient(#6FD4F5, #2C98CF)', ge: '#1C6A96', t: ['#FFF8E4', '#EBD49A', '#2C98CF'] },
    name: 'Seashell beach', board: '#3FA7D6', floor: '#F3E2B3', seen: '#E8D196', start: '#9BE7D8', startEdge: '#3BB5A0', post: '#FF9A8A', postEdge: '#D2604F',
    // A classic clam shell: a round fan with ribs, narrowing to a hinge with
    // two little ears at the bottom.
    cube: true,
    wall: (px, py, i) => {
      const [c, d, lt] = [['#FFB8A8', '#D9705F', '#FFD9CF'], ['#FFD39A', '#CF8A3C', '#FFE9C7'], ['#F8C6E6', '#BE6CA4', '#FDE3F3']][i % 3];
      const cx = px + 24, hy = py + 42;
      const fan = `M${cx - 6} ${hy} L${px + 4} ${py + 26} Q${px + 2} ${py + 5} ${cx} ${py + 4} Q${px + 46} ${py + 5} ${px + 44} ${py + 26} L${cx + 6} ${hy}Z`;
      const ribs = [-16, -8, 0, 8, 16].map(o => `M${cx + o * .2} ${hy - 2} L${cx + o} ${py + 8 + Math.abs(o) * .35}`).join(' ');
      return `<path d="${fan}" fill="${c}" stroke="${d}" stroke-width="2.5" stroke-linejoin="round"/>
        <path d="${ribs}" stroke="${d}" stroke-width="2" opacity=".55" stroke-linecap="round"/>
        <path d="M${px + 9} ${py + 22} Q${px + 9} ${py + 10} ${cx - 6} ${py + 8}" stroke="${lt}" stroke-width="3" fill="none" stroke-linecap="round"/>
        <path d="M${cx - 6} ${hy} L${cx - 13} ${hy + 1} Q${cx - 14} ${hy + 6} ${cx - 8} ${hy + 6} H${cx + 8} Q${cx + 14} ${hy + 6} ${cx + 13} ${hy + 1} L${cx + 6} ${hy}Z" fill="${d}" stroke="${d}" stroke-width="1.5" stroke-linejoin="round"/>`;
    },
    deco: (px, py, i) => `<circle cx="${px + 10 + jit(i, 1) * 28}" cy="${py + 10 + jit(i, 2) * 28}" r="2.6" fill="none" stroke="#fff" stroke-width="1.2" opacity=".8"/><circle cx="${px + 10 + jit(i, 3) * 28}" cy="${py + 10 + jit(i, 4) * 28}" r="1.4" fill="none" stroke="#fff" stroke-width="1" opacity=".8"/>`,
  },
  poop: {
    side: '#7A4E2C', ui: { p: ['#FBF1E2', '#EBD7BC', '#A8794E'], hint: '#5A3A22', b: ['#E2B07A', '#B97C47', '#6E4223', '#FFFFFF'], g: 'linear-gradient(#FFE07A, #F2B624)', ge: '#A87A10', t: ['#FBF1E2', '#D8B78E', '#8A5634'] },
    name: 'Poop party', board: '#C9A27A', floor: '#FFF8EC', seen: '#F6E7CF', start: '#BFE8A0', startEdge: '#6DB24A', post: '#8A5634', postEdge: '#5A3A22',
    // Big swirly poops, no base, on a light floor so they stand out.
    cube: true,
    wall: (px, py, i) => placeSvg(poop({ shape: 'swirl', color: i % 7 === 0 ? 'gold' : 'brown' }), px - 5, py - 9, 58),
    deco: (px, py, i) => i % 4 ? '' : `<circle cx="${px + 12 + jit(i, 1) * 24}" cy="${py + 14 + jit(i, 2) * 20}" r="2" fill="#E2C49A"/>`,
  },
};


// Fun tiles that drop into the maze on Go, drawn in each theme. Zoom pads
// speed the piggy up, puddles make it splash, tunnels come in pairs, and a
// bridge lets the piggy hop over one wall. Drawn in cell coordinates.
export const FUN_LOOK = {
  hay:     { zoom: '#FF9A3C', puddle: ['#7EC8F0', '#3F86B5'], tunnel: ['#E6B566', '#9C6A3A'], bridge: ['#C98F4B', '#7A4E2C'] },
  pumpkin: { zoom: '#5FAE4E', puddle: ['#9C6A3A', '#6B4423'], tunnel: 'pumpkin', bridge: ['#A86E3C', '#5A3A22'] },
  galaxy:  { zoom: '#3FD6C2', puddle: ['#120E36', '#8C74E0'], tunnel: 'wormhole', bridge: ['#FFE66B', '#C9A21A'] },
  unicorn: { zoom: '#FF8FC8', puddle: ['#D9C4FF', '#B38CF0'], tunnel: 'rainbow', bridge: 'cloud' },
  kitchen: { zoom: '#EE5146', puddle: ['#6B3A1E', '#3E200F'], tunnel: ['#FF8A7A', '#B83A30'], bridge: ['#E8B060', '#9C6A3A'] },
  snow:    { zoom: '#4AA8E8', puddle: ['#D4EEFB', '#7FB9DD'], tunnel: 'igloo', bridge: ['#A9DDF7', '#3F86B5'] },
  sea:     { zoom: '#2C98CF', puddle: ['#5CC8C0', '#2E8E86'], tunnel: 'castle', bridge: 'turtle' },
  poop:    { zoom: '#F2B624', puddle: ['#7A4E2C', '#4A2C16'], tunnel: ['#9C6A3A', '#5A3A22'], bridge: ['#C98F4B', '#7A4E2C'] },
};
export function funTile(theme, kind, px, py) {
  const L = FUN_LOOK[theme] || FUN_LOOK.hay, cx = px + 24, cy = py + 24;
  if (kind === 'zoom') {
    const c = L.zoom;
    return `<rect x="${px + 6}" y="${py + 6}" width="36" height="36" rx="10" fill="${c}" stroke="#fff" stroke-width="3"/>
      <path d="M${cx - 9} ${cy + 2} L${cx} ${cy - 7} L${cx + 9} ${cy + 2} M${cx - 9} ${cy + 11} L${cx} ${cy + 2} L${cx + 9} ${cy + 11}" stroke="#fff" stroke-width="4.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
      ${star4(px + 37, py + 10, 4, '#FFF3B0')}`;
  }
  if (kind === 'puddle') {
    const [c, d] = L.puddle;
    return `<path d="M${px + 8} ${cy} Q${px + 6} ${py + 10} ${cx - 2} ${py + 11} Q${px + 36} ${py + 6} ${px + 41} ${py + 18} Q${px + 46} ${py + 30} ${px + 36} ${py + 38} Q${cx} ${py + 44} ${px + 14} ${py + 38} Q${px + 6} ${py + 34} ${px + 8} ${cy}Z" fill="${c}" stroke="${d}" stroke-width="2.5"/>
      <ellipse cx="${px + 18}" cy="${py + 18}" rx="6" ry="2.5" fill="#fff" opacity=".6" transform="rotate(-20 ${px + 18} ${py + 18})"/>
      ${theme === 'galaxy' ? star4(px + 30, py + 28, 3, '#fff') : theme === 'unicorn' ? star4(px + 30, py + 27, 4, '#fff') + star4(px + 15, py + 31, 2.5, '#FF8FC8') : `<circle cx="${px + 31}" cy="${py + 29}" r="2" fill="#fff" opacity=".5"/>`}`;
  }
  if (kind === 'tunnel') {
    const t = L.tunnel;
    const hole = `<path d="M${px + 14} ${py + 42} V${py + 28} Q${px + 14} ${py + 18} ${cx} ${py + 18} Q${px + 34} ${py + 18} ${px + 34} ${py + 28} V${py + 42}Z" fill="#2A1A14"/>`;
    if (t === 'wormhole') {
      // A little spiral galaxy: glowing core and two curling arms full of stars.
      const arm = (rot, c) => `<path d="M${cx} ${cy} q8 -2 10 6 q2 10 -10 13 q-15 2 -18 -12" transform="rotate(${rot} ${cx} ${cy})" fill="none" stroke="${c}" stroke-width="5" stroke-linecap="round" opacity=".9"/>`;
      return `<circle cx="${cx}" cy="${cy}" r="20" fill="#5B3FC8" opacity=".35"/><circle cx="${cx}" cy="${cy}" r="14" fill="#7A4FE0" opacity=".4"/>
        ${arm(0, '#FF8FC8')}${arm(180, '#8CC8FF')}
        <circle cx="${cx}" cy="${cy}" r="6" fill="#FFF3B0"/><circle cx="${cx}" cy="${cy}" r="3" fill="#fff"/>
        ${star4(px + 9, py + 10, 3, '#fff')}${star4(px + 40, py + 38, 3, '#FFE66B')}<circle cx="${px + 38}" cy="${py + 10}" r="1.5" fill="#fff"/><circle cx="${px + 10}" cy="${py + 37}" r="1.3" fill="#fff"/>`;
    }
    if (t === 'pumpkin') return `<path d="M${px + 5} ${py + 44} V${py + 22} Q${px + 5} ${py + 8} ${cx} ${py + 8} Q${px + 43} ${py + 8} ${px + 43} ${py + 22} V${py + 44}Z" fill="#FF8A2A" stroke="#B9531A" stroke-width="3"/><path d="M${px + 15} ${py + 11} Q${px + 11} ${py + 26} ${px + 13} ${py + 42} M${px + 33} ${py + 11} Q${px + 37} ${py + 26} ${px + 35} ${py + 42}" stroke="#D96A1C" stroke-width="2" fill="none"/><path d="M${cx - 2} ${py + 8} Q${cx - 2} ${py + 2} ${cx + 3} ${py + 1}" stroke="#4F9A3C" stroke-width="3" fill="none" stroke-linecap="round"/>${hole}`;
    if (t === 'rainbow') return ['#FF8FA8', '#FFC27A', '#FFE66B', '#8EE3A0', '#8CC8FF', '#C5A3FF'].map((c, k) => `<path d="M${px + 4 + k * 3} ${py + 44} V${py + 26} Q${px + 4 + k * 3} ${py + 6 + k * 3} ${cx} ${py + 6 + k * 3} Q${px + 44 - k * 3} ${py + 6 + k * 3} ${px + 44 - k * 3} ${py + 26} V${py + 44}" fill="none" stroke="${c}" stroke-width="3.2"/>`).join('') + hole.replace('#2A1A14', '#6B4A8C');
    if (t === 'igloo') return `<path d="M${px + 4} ${py + 44} Q${px + 4} ${py + 8} ${cx} ${py + 8} Q${px + 44} ${py + 8} ${px + 44} ${py + 44}Z" fill="#FFFFFF" stroke="#7FB9DD" stroke-width="3"/><path d="M${px + 7} ${py + 32} H${px + 41} M${px + 11} ${py + 20} H${px + 37} M${px + 18} ${py + 20} V${py + 32} M${px + 30} ${py + 20} V${py + 32} M${cx} ${py + 9} V${py + 20}" stroke="#BFDDEF" stroke-width="2"/>${hole.replace('#2A1A14', '#3F6E8F')}`;
    if (t === 'castle') return `<path d="M${px + 6} ${py + 44} V${py + 14} H${px + 12} V${py + 8} H${px + 18} V${py + 14} H${px + 21} V${py + 8} H${px + 27} V${py + 14} H${px + 30} V${py + 8} H${px + 36} V${py + 14} H${px + 42} V${py + 44}Z" fill="#E8C27A" stroke="#B5823F" stroke-width="3" stroke-linejoin="round"/><path d="M${cx} ${py + 8} V${py - 2} L${cx + 8} ${py + 1} L${cx} ${py + 4}" fill="#FF7FA0" stroke="#B5823F" stroke-width="1.5"/>${hole.replace('#2A1A14', '#6B4A2A')}`;
    const [c, d] = t;
    return `<path d="M${px + 5} ${py + 44} V${py + 24} Q${px + 5} ${py + 6} ${cx} ${py + 6} Q${px + 43} ${py + 6} ${px + 43} ${py + 24} V${py + 44}Z" fill="${c}" stroke="${d}" stroke-width="3"/>${hole}`;
  }
  // Bounce pad: a springy trampoline on the floor; the piggy boings over
  // the next wall. The mat takes the theme's colour.
  const [mat, edge] = { hay: ['#FF9A3C', '#B9632A'], pumpkin: ['#FF8A2A', '#B9531A'], galaxy: ['#8F78E8', '#2A1C6E'], unicorn: ['#FF8FC8', '#C96AD6'],
    kitchen: ['#EE5146', '#B83A30'], snow: ['#8CD3FF', '#2B74AE'], sea: ['#5CC8C0', '#2E8E86'], poop: ['#F2B624', '#A87A10'] }[theme] || ['#FF9A3C', '#B9632A'];
  const springs = Array.from({ length: 12 }, (_, k) => {
    const an = k / 12 * Math.PI * 2, c1 = Math.cos(an), s1 = Math.sin(an);
    return `M${cx + c1 * 13} ${cy + 2 + s1 * 11} L${cx + c1 * 18} ${cy + 2 + s1 * 15}`;
  }).join(' ');
  return `<ellipse cx="${cx}" cy="${cy + 4}" rx="21" ry="18" fill="#000" opacity=".12"/>
    <ellipse cx="${cx}" cy="${cy + 2}" rx="20" ry="17" fill="#E9E4DA" stroke="#7A6A5A" stroke-width="3"/>
    <path d="${springs}" stroke="#9A9A9A" stroke-width="2" stroke-linecap="round"/>
    <ellipse cx="${cx}" cy="${cy + 2}" rx="13" ry="11" fill="${mat}" stroke="${edge}" stroke-width="2.5"/>
    <ellipse cx="${cx - 4}" cy="${cy - 2}" rx="5" ry="2.5" fill="#fff" opacity=".55"/>
    <path d="M${cx - 4} ${cy + 5} l4 -5 l4 5" stroke="#fff" stroke-width="2.5" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
}

// A veggie wall for the maze: a chunky crate in the veggie's color with the
// veggie sitting on top, drawn in a 64 box.
export function veggieWall(filling, color) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <rect x="3" y="14" width="58" height="46" rx="10" fill="${color}" stroke="#7A4E2C" stroke-width="3.5"/>
    <rect x="3" y="14" width="58" height="46" rx="10" fill="#fff" opacity=".28"/>
    <path d="M10 30 H54 M10 44 H54" stroke="#7A4E2C" stroke-width="3" opacity=".35" stroke-linecap="round"/>
    <g transform="translate(12 2) scale(.62)">${veggie(filling, 64).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g></svg>`;
}

export function eraserIcon() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="8" y="10" width="48" height="44" rx="10" fill="#D9F0B8" stroke="#8ACB6A" stroke-width="3" stroke-dasharray="6 5"/><path d="M22 22 L42 42 M42 22 L22 42" stroke="#E0564F" stroke-width="6" stroke-linecap="round"/></svg>`;
}

export function hayWallIcon() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><rect x="4" y="10" width="56" height="46" rx="11" fill="#E6B566" stroke="#9C6A3A" stroke-width="3.5"/><path d="M12 22 H52 M12 33 H52 M12 44 H52" stroke="#C98F4B" stroke-width="3.5" stroke-linecap="round"/><path d="M20 12 V54 M44 12 V54" stroke="#9C6A3A" stroke-width="3" opacity=".6"/></svg>`;
}

// Maze treasure, drawn in a 64 box: a little pile of coins, a basket with a
// veggie peeking out, or a pink mystery box with a bow.
export function treasure(t) {
  const glow = `<ellipse cx="32" cy="54" rx="24" ry="7" fill="#FFF3B0" opacity=".75"/>`;
  if (t.kind === 'coins') {
    const coin = (x, y) => `<g transform="translate(${x} ${y}) scale(.42)"><circle cx="32" cy="32" r="28" fill="#F5B32B" stroke="#C98216" stroke-width="3"/><circle cx="32" cy="32" r="19" fill="#FFD34D" stroke="#E0941C" stroke-width="3"/><path d="M32 20 l4 8 8 1 -6 6 1.5 8 -7.5 -4 -7.5 4 1.5 -8 -6 -6 8 -1z" fill="#FFF3B0"/></g>`;
    return `<svg viewBox="0 0 64 64" aria-hidden="true">${glow}${coin(6, 30)}${coin(32, 30)}${coin(19, 26)}${coin(12, 12)}${coin(27, 8)}</svg>`;
  }
  if (t.kind === 'veggie') {
    return `<svg viewBox="0 0 64 64" aria-hidden="true">${glow}
      <g transform="translate(12 0) scale(.62)">${veggie(t.filling, 64).replace(/^<svg[^>]*>|<\/svg>$/g, '')}</g>
      <path d="M8 34 H56 L51 56 Q50 60 46 60 H18 Q14 60 13 56Z" fill="#D9A15E" stroke="#8A5634" stroke-width="3" stroke-linejoin="round"/>
      <path d="M12 42 H52 M14 50 H50" stroke="#B57A3E" stroke-width="2.5"/><path d="M22 36 V58 M32 36 V58 M42 36 V58" stroke="#B57A3E" stroke-width="2"/>
      <rect x="6" y="31" width="52" height="7" rx="3.5" fill="#E8B878" stroke="#8A5634" stroke-width="3"/></svg>`;
  }
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${glow}
    <rect x="10" y="26" width="44" height="32" rx="6" fill="#FF8FB1" stroke="#C2456E" stroke-width="3"/>
    <rect x="7" y="19" width="50" height="11" rx="4" fill="#FFB3CA" stroke="#C2456E" stroke-width="3"/>
    <rect x="28" y="19" width="8" height="39" fill="#FFD34D" stroke="#E0941C" stroke-width="2"/>
    <path d="M32 19 Q20 4 15 12 Q12 19 32 19 Q44 19 49 12 Q44 4 32 19Z" fill="#FFD34D" stroke="#E0941C" stroke-width="2.5" stroke-linejoin="round"/>
    <text x="20" y="50" font-size="16" font-weight="900" fill="#fff" font-family="system-ui,sans-serif" text-anchor="middle">?</text>
    <text x="45" y="50" font-size="16" font-weight="900" fill="#fff" font-family="system-ui,sans-serif" text-anchor="middle">?</text></svg>`;
}

export function upgradeIcon(kind) {
  const inner = {
    plot: `<rect x="10" y="30" width="44" height="22" rx="6" fill="#B9824A"/><path d="M32 30 V14 M24 22 Q32 14 40 22" stroke="#5FAE4E" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    sun: `<circle cx="32" cy="32" r="14" fill="#FFD34D"/><g stroke="#FFB02E" stroke-width="4" stroke-linecap="round"><path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58 M13 13 L19 19 M45 45 L51 51 M13 51 L19 45 M45 19 L51 13"/></g>`,
    robot: `<rect x="14" y="18" width="36" height="30" rx="8" fill="#9BB7D4"/><circle cx="25" cy="32" r="4" fill="#2A1A14"/><circle cx="39" cy="32" r="4" fill="#2A1A14"/><path d="M26 42 H38" stroke="#2A1A14" stroke-width="3" stroke-linecap="round"/><path d="M32 18 V8" stroke="#9BB7D4" stroke-width="4"/><circle cx="32" cy="7" r="4" fill="#FF5C7A"/>`,
    bowl: `<path d="M8 28 H56 Q54 54 32 54 Q10 54 8 28Z" fill="#7AA6FF"/><ellipse cx="32" cy="28" rx="24" ry="6" fill="#A9C4FF"/><ellipse cx="22" cy="27" rx="5" ry="3" fill="#FF9A3C"/><ellipse cx="33" cy="25" rx="5" ry="3" fill="#7DC768"/><ellipse cx="43" cy="28" rx="5" ry="3" fill="#E8C27A"/><ellipse cx="30" cy="30" rx="4" ry="2.5" fill="#FF5C7A"/>`,
    hat: `<path d="M12 44 Q32 4 52 40 Q36 36 22 42 Q16 46 12 44Z" fill="#FF5C7A"/><circle cx="22" cy="36" r="3" fill="#FFF3B0"/><circle cx="34" cy="26" r="3" fill="#FFF3B0"/><circle cx="44" cy="32" r="3" fill="#FFF3B0"/><path d="M10 46 Q32 38 54 44" stroke="#4CAF50" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    pen: `<rect x="6" y="26" width="52" height="26" rx="6" fill="#D9B27A" stroke="#8A5634" stroke-width="3"/><path d="M14 26 V18 M26 26 V18 M38 26 V18 M50 26 V18" stroke="#8A5634" stroke-width="3" stroke-linecap="round"/><path d="M8 20 H56" stroke="#8A5634" stroke-width="3" stroke-linecap="round"/><ellipse cx="32" cy="42" rx="12" ry="7" fill="#E9A15B"/>`,
    piggy: `<ellipse cx="30" cy="38" rx="22" ry="14" fill="#E9A15B"/><circle cx="46" cy="34" r="12" fill="#E9A15B"/><ellipse cx="42" cy="24" rx="5" ry="3.5" transform="rotate(-25 42 24)" fill="#C9773E"/><circle cx="50" cy="32" r="2.2" fill="#2A1A14"/><circle cx="58" cy="36" r="1.6" fill="#E86A86"/><path d="M22 26 Q30 24 36 28 Q38 40 34 50 Q26 52 20 50 Q18 38 22 26Z" fill="#FFF7EC"/>`,
  }[kind];
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
}

// ---- Scenes ----

// Place a side-view piggy inside another SVG at (x, y) with the given size.
export function piggyAt(x, y, size, opts = {}) {
  const svg = piggySide(opts).replace('<svg viewBox="0 0 200 200"', `<svg viewBox="0 0 200 200" width="200" height="200"`);
  return `<g transform="translate(${x} ${y}) scale(${size / 200})">${svg}</g>`;
}

function tuft(x, y, s = 1, c = '#5FAE4E') {
  return `<path d="M${x} ${y} q-2 -10 -8 -14 M${x} ${y} q0 -12 2 -18 M${x} ${y} q3 -10 9 -13" transform="translate(${x} ${y}) scale(${s}) translate(${-x} ${-y})" stroke="${c}" stroke-width="3" fill="none" stroke-linecap="round"/>`;
}

// One garden plot: a raised wooden bed heaped with dark soil in three
// furrowed rows, sitting on grass. Drawn at the plot's own short shape so it
// isn't squashed; the label sits on the front board.
export function plotArt() {
  const ridge = (y, w) => `<path d="M${150 - w} ${y} Q150 ${y - 7} ${150 + w} ${y}" stroke="#5A3A1E" stroke-width="7" fill="none" stroke-linecap="round" opacity=".55"/>
    <path d="M${150 - w} ${y - 3} Q150 ${y - 10} ${150 + w} ${y - 3}" stroke="#B07A4C" stroke-width="4" fill="none" stroke-linecap="round" opacity=".7"/>`;
  const clods = [[52, 46], [104, 40], [196, 41], [244, 47], [80, 62], [150, 56], [222, 63]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="5" ry="3" fill="#5A3A1E" opacity=".45"/>`).join('');
  const nails = [26, 274].map(x => `<circle cx="${x}" cy="94" r="2.6" fill="#7A4E2A"/><circle cx="${x}" cy="110" r="2.6" fill="#7A4E2A"/>`).join('');
  return `<svg viewBox="0 0 300 130" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <rect width="300" height="130" fill="#A7DB8C"/>
    ${tuft(10, 30, .8)}${tuft(288, 26, .8)}${tuft(150, 14, .6, '#7DC768')}${tuft(70, 16, .6, '#7DC768')}${tuft(232, 16, .6, '#7DC768')}
    <ellipse cx="150" cy="124" rx="140" ry="8" fill="#3E8E2A" opacity=".3"/>
    <path d="M18 86 C18 40 40 26 80 24 H220 C260 26 282 40 282 86 Z" fill="#7A4F2E" stroke="#5A3A1E" stroke-width="4" stroke-linejoin="round"/>
    <path d="M34 60 C38 38 56 32 84 31 H216 C244 32 262 38 266 60" stroke="#A06C42" stroke-width="5" fill="none" stroke-linecap="round" opacity=".6"/>
    ${ridge(48, 108)}${ridge(64, 118)}${ridge(80, 126)}
    ${clods}
    <rect x="12" y="80" width="276" height="42" rx="9" fill="#D9A066" stroke="#7A4E2A" stroke-width="4"/>
    <path d="M16 101 H284" stroke="#B57D45" stroke-width="3"/>
    <path d="M16 84 H284" stroke="#F0C48E" stroke-width="3" stroke-linecap="round" opacity=".8"/>
    <rect x="12" y="76" width="26" height="48" rx="7" fill="#C08347" stroke="#7A4E2A" stroke-width="4"/>
    <rect x="262" y="76" width="26" height="48" rx="7" fill="#C08347" stroke="#7A4E2A" stroke-width="4"/>
    ${nails}
  </svg>`;
}

// The playpen: a big bamboo-steamer-style pen seen from the front, with hay,
// a hidey house, a water bottle and a food bowl.
// The pen backdrop is two pictures: the hay floor stretches to fill the pen,
// and the sky, hills and fence go on top of it without stretching, so the
// sun and clouds stay round.
export function penScene() {
  const cloud = (x, y, s, face) => {
    const puffs = [[0, 0, 13], [14, -7, 12], [28, -1, 11], [-13, 3, 9], [40, 5, 8]];
    const c = (stroke) => puffs.map(([dx, dy, r]) => `<circle cx="${x + dx * s}" cy="${y + dy * s}" r="${r * s}"${stroke}/>`).join('');
    return `<g class="cloud"><rect x="${x - 20 * s}" y="${y + 2 * s}" width="${66 * s}" height="${10 * s}" rx="${5 * s}" fill="#fff" stroke="#9CCBEA" stroke-width="2.5"/>
      ${c(' fill="#fff" stroke="#9CCBEA" stroke-width="2.5"')}<g fill="#fff">${c('')}<rect x="${x - 19 * s}" y="${y + 2 * s}" width="${64 * s}" height="${8 * s}" rx="${4 * s}"/></g>
      ${face ? `<g transform="translate(${x + 14 * s} ${y + 2 * s}) scale(${s})"><path d="M-8 -2 q2.5 2.5 5 0 M3 -2 q2.5 2.5 5 0" stroke="#5B7FA6" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="-10" cy="2.5" rx="2.6" ry="1.5" fill="#FFB8C8"/><ellipse cx="10" cy="2.5" rx="2.6" ry="1.5" fill="#FFB8C8"/><path d="M-2 2 q2 2 4 0" stroke="#5B7FA6" stroke-width="1.4" fill="none" stroke-linecap="round"/></g>` : ''}</g>`;
  };
  const posts = [6, 34, 62, 90, 118, 146, 174, 202, 230];
  return `<svg viewBox="0 0 400 300" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="penFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DFAE"/><stop offset="1" stop-color="#E8C27A"/></linearGradient>
      <pattern id="hay" width="26" height="18" patternUnits="userSpaceOnUse"><path d="M2 14 L12 4 M14 16 L24 8 M6 17 L10 10" stroke="#D9A84E" stroke-width="2" stroke-linecap="round" opacity=".55"/></pattern>
    </defs>
    <rect x="0" y="104" width="400" height="196" fill="url(#penFloor)"/>
    <rect x="0" y="104" width="400" height="196" fill="url(#hay)"/>
    <ellipse cx="310" cy="150" rx="40" ry="14" fill="#F2CE7E"/><path d="M276 150 Q300 128 332 146 M286 146 Q312 130 342 150" stroke="#D9A84E" stroke-width="3" fill="none" stroke-linecap="round"/>
  </svg><svg viewBox="0 0 240 122" class="scene pen-sky" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="penSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ED8FA"/><stop offset=".75" stop-color="#DDF3FF"/></linearGradient></defs>
    <rect width="240" height="122" fill="url(#penSky)"/>
    <g class="sun" transform="translate(-10 6) scale(.9)" transform-origin="178 40">
      <g fill="#FFD34D" stroke="#E0941C" stroke-width="2" stroke-linejoin="round">${[0, 45, 90, 135, 180, 225, 270, 315].map(r => `<path d="M174.5 27 l3.5 -6 l3.5 6Z" transform="rotate(${r} 178 40)"/>`).join('')}</g>
      <circle cx="178" cy="40" r="14" fill="#FFE27A" stroke="#E0941C" stroke-width="2.5"/>
      <circle cx="173" cy="38" r="1.7" fill="#5E3820"/><circle cx="183" cy="38" r="1.7" fill="#5E3820"/>
      <path d="M174.5 43 q3.5 3 7 0" stroke="#5E3820" stroke-width="1.6" fill="none" stroke-linecap="round"/>
      <ellipse cx="168.5" cy="43" rx="2.8" ry="1.6" fill="#FF9AA8"/><ellipse cx="187.5" cy="43" rx="2.8" ry="1.6" fill="#FF9AA8"/>
    </g>
    ${cloud(64, 42, 1, true)}${cloud(128, 26, .55, false)}${cloud(218, 66, .5, false)}
    <path d="M-4 84 Q30 62 70 76 Q110 60 150 74 Q196 58 244 72 V122 H-4Z" fill="#BFE6A6" stroke="#86C46E" stroke-width="2.5" stroke-linejoin="round"/>
    <g fill="#8FD07A" stroke="#5E9E4A" stroke-width="2.2">${[[22, 82, 7], [32, 84, 5], [112, 76, 6], [196, 76, 8], [208, 79, 5.5]].map(([x, y, r]) => `<circle cx="${x}" cy="${y}" r="${r}"/>`).join('')}</g>
    <path d="M-4 96 Q50 82 110 92 Q170 82 244 94 V122 H-4Z" fill="#A7DB8C" stroke="#6DAE58" stroke-width="2.5" stroke-linejoin="round"/>
    <g fill="#C9935A" stroke="#8A5634" stroke-width="2.5">${posts.map(x => `<rect x="${x - 4.5}" y="66" width="9" height="48" rx="4.5"/>`).join('')}</g>
    <g fill="#E6B566" stroke="#9C6A3A" stroke-width="2.5"><rect x="-4" y="74" width="248" height="8" rx="4"/><rect x="-4" y="94" width="248" height="7" rx="3.5"/></g>
    <g fill="#C9935A">${posts.map(x => `<rect x="${x - 3.2}" y="75.3" width="6.4" height="5.4"/><rect x="${x - 3.2}" y="95.3" width="6.4" height="4.4"/>`).join('')}</g>
    <rect x="-4" y="108" width="248" height="18" fill="#C9935A" stroke="#8A5634" stroke-width="2.5"/>
    <path d="M-4 112 H244" stroke="#E6B566" stroke-width="2.5" opacity=".7"/>
  </svg>`;
}

// The house, water bottle and food bowl stand on the pen floor as their own
// pictures, so piggies can walk in front of or behind them. Each is drawn in
// pen-scene coordinates; `box` is its viewBox, `x` its middle, `y` its bottom.
export const PEN_FIXTURES = {
  house:  { box: '22 74 88 86', x: 66, y: 158, svg: `<g>
      <path d="M26 156 L26 110 Q66 76 106 110 L106 156Z" fill="#C9935A" stroke="#8A5634" stroke-width="4" stroke-linejoin="round"/>
      <path d="M44 156 V130 Q66 108 88 130 V156Z" fill="#5A3A26"/>
      <path d="M26 110 Q66 76 106 110" fill="none" stroke="#E6B566" stroke-width="6"/>
    </g>` },
  bottle: { box: '176 -32 48 160', x: 200, y: 122, svg: `<g class="pen-bottle">
      <path d="M200 24 V16 Q200 9 207 9 Q214 9 214 16 V27" fill="none" stroke="#6E7C88" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
      <path d="M200 24 V16 Q200 9 207 9 Q214 9 214 16 V27" fill="none" stroke="#B6C2CC" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
      <rect x="194" y="18" width="12" height="8" rx="3" fill="#8C9AA6"/>
      <rect x="183" y="22" width="34" height="62" rx="13" fill="#BFE6F7" stroke="#6FB7D9" stroke-width="3"/>
      <rect x="189" y="36" width="22" height="42" rx="7" fill="#8FD3F2"/>
      <path d="M190 32 V74" stroke="#fff" stroke-width="3.5" stroke-linecap="round" opacity=".7"/>
      <path d="M183 44 H217 M183 48 H217" stroke="#8C9AA6" stroke-width="2.5"/>
      <rect x="190" y="80" width="20" height="10" rx="4" fill="#6FB7D9" stroke="#4C93B8" stroke-width="2.5"/>
      <path d="M200 90 L200 103" stroke="#9AA" stroke-width="5" stroke-linecap="round"/>
      <circle class="drip" cx="200" cy="107" r="4" fill="#6FC6F0"/>
      <circle class="bubble-up" cx="200" cy="70" r="2.5" fill="#fff" opacity="0"/>
    </g>` },
  bowl:   { box: '164 270 72 30', x: 200, y: 299, svg: `<g class="pen-bowl">
      <ellipse cx="200" cy="286" rx="34" ry="12" fill="#7AA6FF" stroke="#4C7FD9" stroke-width="3"/>
      <ellipse cx="200" cy="282" rx="24" ry="6" fill="#B8D0FF"/>
      <g class="kibble"><ellipse cx="190" cy="281" rx="5" ry="3" fill="#FF9A3C"/><ellipse cx="202" cy="279" rx="5" ry="3" fill="#7DC768"/><ellipse cx="212" cy="282" rx="5" ry="3" fill="#E8C27A"/><ellipse cx="197" cy="284" rx="4" ry="2.5" fill="#7DC768"/><ellipse cx="207" cy="285" rx="4" ry="2.5" fill="#FF9A3C"/></g>
    </g>` },
};
export function penFixture(id) {
  const f = PEN_FIXTURES[id];
  return `<svg viewBox="${f.box}" aria-hidden="true">${f.svg}</svg>`;
}

// A piggy facing the camera: a wide loaf of a body behind the face portrait,
// so long hair from the face falls over the body.
export function piggyFront(opts = {}) {
  const coat = opts.coat || DEFAULT_COAT;
  const skinny = coat.breed === 'skinny';
  const main = skinny ? '#F2B8A0' : col(coat.main);
  const patch = skinny ? '#F7CDBB' : col(coat.patch);
  const face = piggyFace(opts).replace('<svg viewBox="0 0 100 100"', '<svg viewBox="0 0 100 100" x="46" y="52" width="108" height="108"');
  return `<svg viewBox="0 0 200 200" class="piggy-svg front" aria-hidden="true">
    <ellipse cx="100" cy="176" rx="66" ry="7" fill="#000" opacity=".12"/>
    <g class="body">
      <ellipse cx="100" cy="140" rx="64" ry="34" fill="${main}"/>
      <ellipse cx="100" cy="150" rx="34" ry="22" fill="${patch}"/>
      <ellipse cx="80" cy="170" rx="11" ry="7" fill="#F3B9A0"/><ellipse cx="120" cy="170" rx="11" ry="7" fill="#F3B9A0"/>
      ${face}
    </g>
  </svg>`;
}

// The garden header: a short strip with a raised wooden planter of veggies
// along the bottom. The piggy gardener in a sunhat peeks over the planter
// and sprinkles the sprouts from a watering can.
export function gardenScene(opts = {}) {
  const sunhat = `<g class="hat"><ellipse cx="140" cy="72" rx="52" ry="12" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M110 72 Q116 36 140 36 Q164 36 170 72Z" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M112 64 Q140 52 168 64" stroke="#FF5C7A" stroke-width="6" fill="none"/><circle cx="118" cy="62" r="7" fill="#FFD34D" stroke="#E0941C" stroke-width="2.5"/></g>`;
  const pig = piggySide({ coat: opts.coat }).replace('<svg viewBox="0 0 200 200"', '<svg viewBox="0 0 200 200" width="200" height="200"').replace('</g>\n  </svg>', sunhat + '</g></svg>');
  const veg = (f, x, y, s) => veggie(f, s).replace('<svg ', `<svg x="${x}" y="${y}" `);
  const leaf = (x, y) => `<path d="M${x} ${y} q-8 -10 -4 -16 q6 4 4 16 q4 -12 12 -12 q0 8 -12 12" fill="#7DC768" stroke="#3E8E2A" stroke-width="2" stroke-linejoin="round"/>`;
  return `<svg viewBox="0 0 400 84" class="scene" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE9FF"/><stop offset="1" stop-color="#F3FBFF"/></linearGradient></defs>
    <rect width="400" height="84" fill="url(#gSky)"/>
    <circle cx="236" cy="16" r="11" fill="#FFE27A"/>
    <g fill="#fff" opacity=".9"><ellipse cx="166" cy="14" rx="18" ry="6"/><ellipse cx="180" cy="10" rx="11" ry="5"/><ellipse cx="306" cy="12" rx="15" ry="5"/></g>
    <path d="M0 58 Q60 40 140 52 Q220 34 300 50 Q360 40 400 50 V70 H0Z" fill="#A7DB8C"/>
    <g class="sunflower"><path d="M378 66 V30" stroke="#4F9A3C" stroke-width="5" stroke-linecap="round"/><path d="M378 48 q10 -10 16 -4 q-6 8 -16 4" fill="#7DC768" stroke="#3E8E2A" stroke-width="2"/>
      <g fill="#FFD34D" stroke="#E0941C" stroke-width="2">${[0, 45, 90, 135, 180, 225, 270, 315].map(r => `<ellipse cx="378" cy="12" rx="5" ry="9" transform="rotate(${r} 378 22)"/>`).join('')}</g>
      <circle cx="378" cy="22" r="8" fill="#8A5634" stroke="#5E3820" stroke-width="2"/><circle cx="375.5" cy="21" r="1.4" fill="#2A1A14"/><circle cx="380.5" cy="21" r="1.4" fill="#2A1A14"/></g>
    <path d="M100 66 Q110 58 130 60 Q160 54 200 59 Q250 54 300 59 Q340 55 370 62 V68 H100Z" fill="#8E5E3A" stroke="#6A4524" stroke-width="3" stroke-linejoin="round"/>
    ${veg('cabbage', 136, 26, 42)}${leaf(186, 64)}${veg('strawberry', 196, 28, 38)}${veg('carrot', 240, 20, 46)}${leaf(290, 64)}${veg('tomato', 300, 26, 40)}${leaf(350, 64)}
    <g class="gpig">${'<g transform="translate(-4 -12) scale(.46)">' + pig + '</g>'}</g>
    <g class="can" transform="translate(-6 12)"><path d="M114 40 L136 30" stroke="#3E7DC2" stroke-width="5" stroke-linecap="round"/><ellipse cx="137" cy="29.5" rx="3" ry="5" transform="rotate(-20 137 29.5)" fill="#7AB8F5" stroke="#3E7DC2" stroke-width="2"/>
      <path d="M90 34 Q90 30 96 30 H112 Q118 30 118 34 L116 54 H92Z" fill="#7AB8F5" stroke="#3E7DC2" stroke-width="3" stroke-linejoin="round"/><path d="M95 32 Q104 18 113 32" fill="none" stroke="#3E7DC2" stroke-width="3.5" stroke-linecap="round"/><path d="M96 40 H112" stroke="#BFE0FF" stroke-width="3" stroke-linecap="round"/></g>
    <g class="drops" fill="#6FC6F0" stroke="#3E9BD0" stroke-width="1" transform="translate(-6 12)">${[[142, 34], [147, 30], [145, 40]].map(([x, y], i) => `<ellipse class="drop d${i}" cx="${x}" cy="${y}" rx="2.2" ry="3.2"/>`).join('')}</g>
    <rect x="-4" y="72" width="408" height="18" fill="#C9935A" stroke="#8A5634" stroke-width="3"/>
    <g stroke="#9C6A3A" stroke-width="2.5" opacity=".5">${[50, 120, 190, 260, 330].map(x => `<path d="M${x} 77 V86"/>`).join('')}</g>
    <rect x="-4" y="64" width="408" height="10" rx="4" fill="#E6B566" stroke="#9C6A3A" stroke-width="3"/>
  </svg>`;
}

// The kitchen: mint tiled wall (so the cream and orange chef stands out),
// shelves of jars, and a counter with a real dumpling setup: a stacked
// bamboo steamer with a lid sitting on a pot of simmering water over a
// little burner. The piggy chef holds a wooden spatula in one paw, out in
// front of its face. The UI overlays the ingredient slots on the counter.
export function kitchenScene(opts = {}) {
  const toque = `<g class="hat"><path d="M112 72 Q110 48 134 46 Q142 30 160 40 Q178 36 180 56 Q188 70 170 74 Z" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><rect x="118" y="66" width="56" height="12" rx="4" fill="#fff" stroke="#D5CDBA" stroke-width="3"/></g>`;
  const pig = piggySide({ coat: opts.coat }).replace('<svg viewBox="0 0 200 200"', '<svg viewBox="0 0 200 200" width="200" height="200"').replace('</g>\n  </svg>', toque + '</g></svg>');
  const tier = (y, h) => `<rect x="240" y="${y}" width="104" height="${h}" rx="6" fill="#E6B566" stroke="#9C6A3A" stroke-width="3"/>
      <path d="M242 ${y + h / 2} H342" stroke="#C98F4B" stroke-width="2.5"/>
      <g stroke="#9C6A3A" stroke-width="2" opacity=".45">${[254, 270, 286, 302, 318, 334].map(x => `<path d="M${x} ${y + 3} V${y + h - 3}"/>`).join('')}</g>`;
  return `<svg viewBox="0 0 400 230" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="tiles" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#A9DCC6"/><rect x="2" y="2" width="36" height="36" rx="6" fill="#CDEEDF"/></pattern></defs>
    <rect width="400" height="230" fill="url(#tiles)"/>
    <g><rect x="8" y="30" width="166" height="10" rx="3" fill="#B9824A"/><rect x="214" y="30" width="180" height="10" rx="3" fill="#B9824A"/>
      <g stroke="#8A5634" stroke-width="2" stroke-linejoin="round">
        <g transform="translate(0 8) translate(91 22) scale(1.2) translate(-91 -22)">${[[24, '#FF9A3D'], [50, '#7CC56A']].map(([x, c]) => `<rect x="${x}" y="5" width="22" height="17" rx="5" fill="#EAF6FF"/><rect x="${x + 2}" y="11" width="18" height="10" rx="3" fill="${c}" stroke="none"/><circle cx="${x + 7}" cy="14" r="1.6" fill="#fff" stroke="none"/><circle cx="${x + 14}" cy="17" r="1.6" fill="#fff" stroke="none"/><rect x="${x - 1}" y="1" width="24" height="6" rx="2" fill="#E2574C"/>`).join('')}
        <path d="M82 22 L84 7 Q94 3 104 7 L106 22 Z" fill="#FFF8EC"/><path d="M84 7 Q94 11 104 7" fill="none"/><rect x="86" y="13" width="16" height="5" rx="2" fill="#8FD3F2" stroke="none"/>
        <rect x="116" y="9" width="16" height="13" rx="4" fill="#5A3A26"/><rect x="120" y="2" width="8" height="8" rx="2" fill="#5A3A26"/><rect x="119" y="-1" width="10" height="4" rx="1.5" fill="#E2574C"/><rect x="119" y="12" width="10" height="7" rx="2" fill="#FFF8EC" stroke="none"/><circle cx="124" cy="15.5" r="2" fill="#E2574C" stroke="none"/></g>
        <g transform="translate(0 8) translate(305 22) scale(1.2) translate(-305 -22)">        <ellipse cx="260" cy="18" rx="18" ry="4" fill="#fff"/><ellipse cx="260" cy="17" rx="13" ry="2" fill="#8FD3F2" stroke="none"/><path d="M245 17 Q245 7 253 7 Q261 7 261 17 Z M259 17 Q259 7 267 7 Q275 7 275 17 Z" fill="#FFF3DC"/><path d="M250 10 Q253 13 256 10 M264 10 Q267 13 270 10" fill="none" stroke-width="1.5"/>
        <path d="M296 9 L290 -6 M302 9 L304 -6" stroke="#C9935A" stroke-width="3" stroke-linecap="round"/><rect x="290" y="8" width="18" height="14" rx="4" fill="#E2574C"/><circle cx="296" cy="15" r="1.6" fill="#fff" stroke="none"/><circle cx="302" cy="15" r="1.6" fill="#fff" stroke="none"/>
        <rect x="318" y="15" width="7" height="5" rx="2" fill="#C9935A"/><rect x="361" y="15" width="7" height="5" rx="2" fill="#C9935A"/><rect x="324" y="12" width="38" height="10" rx="5" fill="#F2CE7E"/></g>
      </g></g>
    <g class="chef">${'<g transform="translate(26 54) scale(.62)">' + pig + '</g>'}
      <g class="spoon"><path d="M152 136 L188 100" stroke="#8A5634" stroke-width="5" stroke-linecap="round"/><rect x="183" y="80" width="16" height="22" rx="6" fill="#C98F4B" stroke="#8A5634" stroke-width="2.5" transform="rotate(42 191 91)"/>
        <ellipse cx="152" cy="137" rx="8" ry="6.5" fill="#FFF8EE" stroke="#C9A27A" stroke-width="2.5"/></g></g>
    <rect x="0" y="150" width="400" height="80" fill="#C9935A"/><rect x="0" y="146" width="400" height="12" rx="4" fill="#E6B566" stroke="#9C6A3A" stroke-width="3"/>
    <g class="pot">
      <rect x="236" y="141" width="112" height="7" rx="3" fill="#4A4A55"/>
      <g fill="#FF9A3D">${[240, 334].map(x => `<path d="M${x} 141 Q${x + 5} 130 ${x + 10} 141Z"/>`).join('')}</g>
      <path d="M236 112 H348 L344 132 Q340 140 330 140 H254 Q244 140 240 132Z" fill="#9DB4CB" stroke="#5E7189" stroke-width="3"/>
      <path d="M244 124 H340" stroke="#C7D7E6" stroke-width="3" stroke-linecap="round"/>
      <path d="M230 116 H222 M354 116 H362" stroke="#5E7189" stroke-width="6" stroke-linecap="round"/>
      <rect x="232" y="108" width="120" height="8" rx="4" fill="#B9CCDE" stroke="#5E7189" stroke-width="3"/>
      <g fill="#8FD3F2" stroke="#5E9BC0" stroke-width="1.5">${[238, 346].map(x => `<circle cx="${x}" cy="104" r="3"/>`).join('')}</g>
      ${tier(90, 18)}${tier(72, 18)}
      <path d="M238 74 Q292 50 346 74 Z" fill="#F2CE7E" stroke="#9C6A3A" stroke-width="3" stroke-linejoin="round"/>
      <path d="M256 68 Q292 56 328 68" fill="none" stroke="#C98F4B" stroke-width="2"/>
      <circle cx="292" cy="58" r="5" fill="#C98F4B" stroke="#9C6A3A" stroke-width="2"/>
    </g>
    <g class="vapor"><ellipse class="puff p1" cx="246" cy="64" rx="8" ry="11" fill="#fff" opacity=".9"/><ellipse class="puff p2" cx="292" cy="46" rx="10" ry="12" fill="#fff" opacity=".9"/><ellipse class="puff p3" cx="340" cy="64" rx="8" ry="11" fill="#fff" opacity=".9"/></g>
  </svg>`;
}

export function shopScene() {
  return `<svg viewBox="0 0 400 90" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <rect width="400" height="90" fill="#FFE8C2"/>
    <g>${[0, 50, 100, 150, 200, 250, 300, 350].map((x, i) => `<path d="M${x} 0 H${x + 50} V46 Q${x + 25} 70 ${x} 46Z" fill="${i % 2 ? '#FFF7EC' : '#E2574C'}"/>`).join('')}</g>
    <rect x="0" y="0" width="400" height="8" fill="#B0392F"/>
  </svg>`;
}

function tint(a, b) {
  const x = FILLINGS[a].rgb, y = FILLINGS[b].rgb;
  const m = x.map((v, i) => Math.round((v + y[i]) / 2));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

function shade(rgb) {
  const m = rgb.match(/\d+/g).map(Number).map(v => Math.round(v * 0.78));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

// ---- Pen toys ----
// Squishy-style toys drawn on a 120x100 box, sitting on the floor at y=94.
const TOY_ART = {
  ball: `<ellipse cx="60" cy="94" rx="26" ry="5" fill="#000" opacity=".12"/>
    <g class="toy-move"><circle cx="60" cy="66" r="28" fill="#FF8FA8" stroke="#D9577A" stroke-width="4"/>
    <path d="M34 58 Q60 74 86 58" fill="none" stroke="#FFD34D" stroke-width="7" stroke-linecap="round"/>
    <path d="M40 82 Q60 92 80 82" fill="none" stroke="#7AA6FF" stroke-width="6" stroke-linecap="round"/>
    <circle cx="60" cy="44" r="4" fill="#fff" opacity=".9"/><circle cx="74" cy="72" r="3.5" fill="#fff" opacity=".9"/>
    <ellipse cx="48" cy="52" rx="8" ry="5" transform="rotate(-30 48 52)" fill="#fff" opacity=".55"/></g>`,

  tunnel: `<ellipse cx="60" cy="94" rx="56" ry="6" fill="#000" opacity=".12"/>
    <g class="toy-move"><path d="M6 94 V64 Q6 30 60 30 Q114 30 114 64 V94Z" fill="#7B6CF6" stroke="#4F42B5" stroke-width="4" stroke-linejoin="round"/>
    ${[26, 46, 66, 86].map(x => `<path d="M${x} 34 Q${x + 4} 64 ${x} 94" fill="none" stroke="#9A8DFF" stroke-width="6"/>`).join('')}
    <path d="M16 94 V68 Q16 48 34 48 Q50 48 50 68 V94Z" fill="#3B2F86"/>
    <path d="M20 40 Q60 26 100 40" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".5"/></g>`,
  hut: `<ellipse cx="60" cy="94" rx="54" ry="6" fill="#000" opacity=".12"/>
    <g class="toy-move"><path d="M8 92 Q4 54 36 40 Q60 30 84 40 Q116 54 112 92Z" fill="#FFF3E2" stroke="#D9B890" stroke-width="4" stroke-linejoin="round"/>
    <path d="M60 14 Q50 26 52 38 M60 14 Q70 26 68 38 M60 14 Q60 28 60 38" stroke="#D9B890" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M52 38 Q60 30 68 38 Q76 44 72 52 Q60 44 48 52 Q44 44 52 38Z" fill="#FFF3E2" stroke="#D9B890" stroke-width="3.5"/>
    <path d="M24 60 Q34 52 40 62 M80 62 Q86 52 96 60" stroke="#E8CDA8" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M42 92 V74 Q42 60 60 60 Q78 60 78 74 V92Z" fill="#6A4524"/>
    <ellipse cx="30" cy="72" rx="7" ry="4" fill="#FFB3C1" opacity=".8"/><ellipse cx="90" cy="72" rx="7" ry="4" fill="#FFB3C1" opacity=".8"/>
    <ellipse cx="34" cy="50" rx="10" ry="5" transform="rotate(-25 34 50)" fill="#fff" opacity=".8"/></g>`,
  // The slide faces left: drawn facing right, then flipped.
  slide: `<ellipse cx="60" cy="94" rx="54" ry="6" fill="#000" opacity=".12"/>
    <g class="toy-move"><g transform="translate(120 0) scale(-1 1)"><path d="M20 94 V22 M36 94 V22" stroke="#9C6A3A" stroke-width="5" stroke-linecap="round"/>
    <path d="M20 40 H36 M20 58 H36 M20 76 H36" stroke="#9C6A3A" stroke-width="4" stroke-linecap="round"/>
    <rect x="14" y="16" width="30" height="10" rx="5" fill="#D9A862" stroke="#9C6A3A" stroke-width="3"/>
    <path d="M40 18 Q60 22 78 60 Q90 84 112 88 L112 96 Q84 94 70 66 Q56 34 40 30Z" fill="#5BC8A8" stroke="#2E8C70" stroke-width="4" stroke-linejoin="round"/>
    <path d="M48 24 Q62 30 74 56" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".6"/></g</g>`,
};
// Chews get smaller as they are eaten: `left` runs from 1 (new) to 0.
function chewSticks(left) {
  const sticks = [[-18, -14], [-6, -4], [6, 4], [18, 14]].slice(0, Math.max(1, Math.ceil(left * 4)));
  return `<ellipse cx="60" cy="94" rx="34" ry="5" fill="#000" opacity=".12"/>
    <g class="toy-move">${sticks.map(([dx, r]) => `<rect x="${55 + dx}" y="${34 + (1 - left) * 18}" width="10" height="${58 - (1 - left) * 18}" rx="5" transform="rotate(${r} ${60 + dx} 92)" fill="#C9935A" stroke="#8A5634" stroke-width="3"/>`).join('')}
    <path d="M36 70 Q60 78 84 70" fill="none" stroke="#5FAE4E" stroke-width="8" stroke-linecap="round"/>
    <path d="M58 72 q-12 -14 -2 -18 q8 6 2 18 q12 -12 16 -2 q-8 6 -16 2" fill="#7DC768" stroke="#3E8E2A" stroke-width="2.5"/></g>`;
}
function carrotChew(left) {
  const tip = 104 - 74 * Math.max(0.25, left);   // the pointy end gets gnawed back
  const bites = left < 1 ? `<circle cx="${tip}" cy="72" r="7" fill="#F6DFAE"/><circle cx="${tip + 4}" cy="82" r="6" fill="#F6DFAE"/>` : '';
  return `<ellipse cx="60" cy="94" rx="40" ry="5" fill="#000" opacity=".12"/>
    <g class="toy-move"><path d="M${tip} 78 Q${tip} 64 ${Math.min(tip + 10, 88)} 64 L96 62 Q106 76 96 90 L${Math.min(tip + 10, 88)} 90 Q${tip} 90 ${tip} 78Z" fill="#FF9A3C" stroke="#D2691E" stroke-width="4" stroke-linejoin="round"/>
    ${bites}
    ${[0.35, 0.55, 0.75].filter(f => 30 + f * 66 > tip + 6).map(f => `<path d="M${30 + f * 66} 68 v6" stroke="#D2691E" stroke-width="3" stroke-linecap="round"/>`).join('')}
    <path d="M98 66 q10 -16 18 -12 M100 72 q14 -8 18 0 M98 64 q2 -18 10 -20" stroke="#5FAE4E" stroke-width="6" fill="none" stroke-linecap="round"/></g>`;
}
export function toyArt(id, left = 1) {
  const art = id === 'chew' ? chewSticks(left) : id === 'carrot' ? carrotChew(left) : TOY_ART[id] || '';
  return `<svg viewBox="0 0 120 100" class="toy-svg" aria-hidden="true">${art}</svg>`;
}

// Small chunky icons for the Pen's need bars, need bubbles and the tab bar,
// drawn in the same outlined style as coinIcon and mazeIcon.
const ICONS = {
  // A chunky green arrow pointing right (poop -> compost)
  arrow: `<path d="M6 24 H34 V12 L58 32 L34 52 V40 H6Z" fill="#7CC66A" stroke="#3E8E3A" stroke-width="5" stroke-linejoin="round"/>`,
  // A bowl with a dumpling peeking out
  hunger: `<path d="M18 30 Q18 14 32 14 Q46 14 46 30Z" fill="#FFE6C8" stroke="#D9A86E" stroke-width="3" stroke-linejoin="round"/><path d="M32 14 Q27 20 26 26 M32 14 Q32 20 32 26 M32 14 Q37 20 38 26" stroke="#D9A86E" stroke-width="2.2" fill="none" stroke-linecap="round"/><path d="M6 30 H58 Q56 52 32 54 Q8 52 6 30Z" fill="#4FA8F5" stroke="#2369B8" stroke-width="4" stroke-linejoin="round"/><path d="M14 38 Q32 44 50 38" stroke="#BFE0FF" stroke-width="4" fill="none" stroke-linecap="round"/>`,
  // A bouncy ball
  fun: `<circle cx="32" cy="32" r="25" fill="#FF8FA8" stroke="#C93A5B" stroke-width="4"/><path d="M9 28 Q32 40 55 28" stroke="#FFD34D" stroke-width="7" fill="none"/><path d="M9 28 Q32 40 55 28" stroke="#C93A5B" stroke-width="2" fill="none" opacity=".35"/><ellipse cx="23" cy="18" rx="6" ry="4" fill="#fff" opacity=".7" transform="rotate(-30 23 18)"/>`,
  // A poop scoop with sparkles
  clean: `<g transform="rotate(28 32 34)"><path d="M32 4 V32" stroke="#9C6A3A" stroke-width="7" stroke-linecap="round"/><path d="M32 4 V32" stroke="#C98F4B" stroke-width="3" stroke-linecap="round"/><path d="M22 36 H42 L52 58 Q47 61 42 58 Q37 61 32 58 Q27 61 22 58 Q17 61 12 58Z" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3.5" stroke-linejoin="round"/><path d="M27 40 L22 56 M32 40 V56 M37 40 L42 56" stroke="#C98F4B" stroke-width="2" stroke-linecap="round"/><rect x="21" y="30" width="22" height="8" rx="3" fill="#FF5C7A" stroke="#C93A5B" stroke-width="3"/></g>`,
  pen: `<path d="M6 30 L32 8 L58 30" fill="none" stroke="#C93A5B" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/><path d="M12 28 L32 12 L52 28 V56 H12Z" fill="#F2CE7E" stroke="#C98F4B" stroke-width="4" stroke-linejoin="round"/><path d="M6 30 L32 8 L58 30" fill="none" stroke="#FF5C7A" stroke-width="4" stroke-linecap="round" stroke-linejoin="round"/><path d="M24 56 V42 Q32 32 40 42 V56Z" fill="#8A5634" stroke="#5E3820" stroke-width="3" stroke-linejoin="round"/>`,
  garden: `<path d="M32 18 Q22 4 14 10 M32 18 Q32 2 40 4 M32 18 Q44 6 50 12" stroke="#4CAF50" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M18 22 Q32 15 46 22 Q47 34 35 57 Q32 62 29 57 Q17 34 18 22Z" fill="#FF9A3C" stroke="#D9772B" stroke-width="3.5" stroke-linejoin="round"/><path d="M22 31 H30 M34 39 H41 M27 47 H33" stroke="#D9772B" stroke-width="2.5" stroke-linecap="round"/>`,
  kitchen: `<path d="M6 44 Q6 18 32 16 Q58 18 58 44 Q32 54 6 44Z" fill="#FFE6C8" stroke="#D9A86E" stroke-width="3.5" stroke-linejoin="round"/><path d="M32 16 Q22 24 18 38 M32 16 Q30 28 28 42 M32 16 Q36 28 38 42 M32 16 Q44 24 46 38" stroke="#D9A86E" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="24" cy="44" r="2" fill="#2A1A14"/><circle cx="40" cy="44" r="2" fill="#2A1A14"/><path d="M29 47 Q32 50 35 47" stroke="#2A1A14" stroke-width="1.8" fill="none" stroke-linecap="round"/>`,
  music: `<path d="M24 46 V14 L50 8 V40" fill="none" stroke="#E0941C" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="18" cy="46" rx="9" ry="7" fill="#FFD34D" stroke="#E0941C" stroke-width="3.5"/><ellipse cx="44" cy="40" rx="9" ry="7" fill="#FFD34D" stroke="#E0941C" stroke-width="3.5"/>`,
  mute: `<g opacity=".8"><path d="M24 46 V14 L50 8 V40" fill="none" stroke="#8E99A8" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/><ellipse cx="18" cy="46" rx="9" ry="7" fill="#D8DEE6" stroke="#8E99A8" stroke-width="3.5"/><ellipse cx="44" cy="40" rx="9" ry="7" fill="#D8DEE6" stroke="#8E99A8" stroke-width="3.5"/></g><path d="M10 54 L54 10" stroke="#C93A5B" stroke-width="6" stroke-linecap="round"/>`,
  // A friendly gear for Settings
  gear: `<path d="${gearPath()}" fill="#D8DEE6" stroke="#5C6B7E" stroke-width="3.5" stroke-linejoin="round"/><circle cx="32" cy="32" r="8" fill="#8FD3F7" stroke="#5C6B7E" stroke-width="3.5"/>`,
  // A speaker with sound waves, for All sound
  speaker: `<path d="M10 25 H20 L33 13 V51 L20 39 H10Z" fill="#FFD34D" stroke="#E0941C" stroke-width="3.5" stroke-linejoin="round"/><path d="M41 24 Q46 32 41 40 M47 18 Q56 32 47 46" fill="none" stroke="#E0941C" stroke-width="4.5" stroke-linecap="round"/>`,
  // A sparkly star, for sound effects
  sfx: `<path d="M32 6 L39 24 L58 25 L43 37 L48 56 L32 45 L16 56 L21 37 L6 25 L25 24Z" fill="#FF8FA8" stroke="#C93A5B" stroke-width="3.5" stroke-linejoin="round"/><circle cx="27" cy="30" r="3" fill="#fff"/>`,
  shop: `<path d="M22 22 Q22 8 32 8 Q42 8 42 22" fill="none" stroke="#C93A5B" stroke-width="4" stroke-linecap="round"/><path d="M10 22 H54 L50 56 H14Z" fill="#FF8FA8" stroke="#C93A5B" stroke-width="4" stroke-linejoin="round"/><path d="M14 34 H50" stroke="#FFD34D" stroke-width="6"/><circle cx="32" cy="44" r="4" fill="#fff"/>`,
};
// Eight chunky rounded teeth around a wheel.
function gearPath() {
  const pts = [];
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    for (const [da, r] of [[-0.24, 21], [-0.15, 28], [0.15, 28], [0.24, 21]]) pts.push([32 + r * Math.cos(a + da), 32 + r * Math.sin(a + da)]);
  }
  return 'M' + pts.map(([x, y]) => `${x.toFixed(1)} ${y.toFixed(1)}`).join(' L') + 'Z';
}
export function icon(name) {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${ICONS[name] || ''}</svg>`;
}
