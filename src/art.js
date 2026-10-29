// Squishy-style art, all SVG strings so it stays sharp and tiny.
import { COLORS } from './game.js';

const INK = '#2A1A14';
const DEFAULT_COAT = { breed: 'american', main: 'ginger', patch: 'white' };

const col = (k) => COLORS[k] || k || '#E9A15B';
function darken(hex, f = 0.78) {
  const m = hex.match(/[0-9a-f]{2}/gi);
  if (!m) return hex;
  return '#' + m.slice(0, 3).map(h => Math.round(parseInt(h, 16) * f).toString(16).padStart(2, '0')).join('');
}

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

  let hair = '';
  if (coat.breed === 'abyssinian') {
    hair = [[70, 112], [104, 100], [120, 138], [60, 140], [138, 112]].map(([x, y]) =>
      `<path d="M${x - 10} ${y} a10 10 0 1 1 10 10 a6 6 0 1 0 6 -6" fill="none" stroke="${dark}" stroke-width="3" stroke-linecap="round" opacity=".7"/>`).join('') +
      `<path d="M40 92 l-6 -10 M60 82 l-4 -11 M84 78 l0 -11 M110 80 l4 -11" stroke="${dark}" stroke-width="4" stroke-linecap="round"/>`;
  } else if (coat.breed === 'peruvian') {
    hair = `<path d="M28 150 Q36 176 30 184 Q44 178 52 190 Q58 176 68 186 Q74 174 86 186 Q92 174 104 184 Q110 172 122 182 Q128 170 140 178 L146 150Z" fill="${main}" stroke="${dark}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M48 160 Q50 176 46 184 M72 162 Q74 178 70 186 M100 160 Q102 176 98 182 M126 160 Q128 172 124 178" stroke="${dark}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>
      <path d="M118 82 Q140 60 170 76 Q178 92 184 100 Q172 94 164 98 Q150 88 138 100 Q126 92 118 82Z" fill="${patch}" stroke="${darken(patch)}" stroke-width="2"/>
      <path d="M150 86 Q154 100 150 108 M164 84 Q170 96 168 104" stroke="${darken(patch)}" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".6"/>`;
  } else if (coat.breed === 'texel') {
    hair = [[36, 100], [52, 86], [74, 80], [98, 80], [120, 86], [40, 150], [66, 160], [96, 164], [124, 160], [30, 126]].map(([x, y]) =>
      `<circle cx="${x}" cy="${y}" r="9" fill="${main}" stroke="${dark}" stroke-width="2.5"/>`).join('') +
      `<circle cx="140" cy="80" r="9" fill="${patch}" stroke="${darken(patch)}" stroke-width="2.5"/>`;
  } else if (skinny) {
    hair = `<path d="M60 110 Q72 104 84 110 M58 128 Q72 122 86 128 M64 146 Q76 140 88 146" stroke="#D98C77" stroke-width="2.5" fill="none" stroke-linecap="round" opacity=".7"/>
      <path d="M176 92 q6 -14 16 -8 q-4 10 -16 8z" fill="${col(coat.main)}"/>`;
  }

  const hatSvg = hat ? `<g class="hat">${hatSide(hat === true ? 'strawberry' : hat)}</g>` : '';
  const legs = `<g class="legA"><ellipse cx="62" cy="160" rx="11" ry="7" fill="#F3B9A0"/><ellipse cx="146" cy="160" rx="10" ry="7" fill="#F3B9A0"/></g>
      <g class="legB"><ellipse cx="82" cy="160" rx="11" ry="7" fill="#F3B9A0"/><ellipse cx="128" cy="160" rx="10" ry="7" fill="#F3B9A0"/></g>`;

  return `<svg viewBox="0 0 200 200" class="piggy-svg ${walking ? 'walking' : ''}" aria-hidden="true">
    <ellipse cx="100" cy="176" rx="72" ry="7" fill="#000" opacity=".12"/>
    <g class="body">
      ${legs}
      <ellipse cx="96" cy="122" rx="72" ry="44" fill="${main}"/>
      <path d="M70 80 Q96 74 116 84 Q120 120 108 162 Q84 166 64 160 Q56 120 70 80Z" fill="${patch}"/>
      <path d="M32 112 Q28 96 40 90 Q36 104 44 110 Z" fill="${dark}"/>
      <ellipse cx="148" cy="112" rx="40" ry="36" fill="${main}"/>
      <path d="M180 104 Q190 116 184 128 Q170 132 162 122 Q170 112 180 104Z" fill="${patch}"/>
      ${hair}
      <ellipse cx="136" cy="80" rx="14" ry="10" transform="rotate(-25 136 80)" fill="${dark}"/><ellipse cx="136" cy="81" rx="8" ry="5" transform="rotate(-25 136 81)" fill="#FFB3C1"/>
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
  strawberry: `<path d="M112 70 Q136 30 164 60 Q148 58 132 66 Q122 72 112 70Z" fill="#FF5C7A"/><circle cx="118" cy="62" r="3" fill="#FFF3B0"/><circle cx="134" cy="54" r="3" fill="#FFF3B0"/><circle cx="150" cy="56" r="3" fill="#FFF3B0"/><path d="M110 72 Q140 62 170 68" fill="none" stroke="#4CAF50" stroke-width="5" stroke-linecap="round"/>`,
  bow: `<path d="M150 66 Q128 46 126 62 Q126 76 150 66Z M150 66 Q172 46 174 62 Q174 76 150 66Z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="2.5" stroke-linejoin="round"/><circle cx="150" cy="66" r="6" fill="#FF8FA8" stroke="#C93A5B" stroke-width="2.5"/>`,
  flower: `<g fill="#fff" stroke="#E6DCC8" stroke-width="2">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="150" cy="50" rx="7" ry="13" transform="rotate(${a} 150 62)"/>`).join('')}</g><circle cx="150" cy="62" r="7" fill="#FFD34D" stroke="#E0941C" stroke-width="2"/>`,
  party: `<path d="M150 14 L124 76 L176 76Z" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3" stroke-linejoin="round"/><path d="M138 44 L162 44 M131 60 L169 60" stroke="#FFD34D" stroke-width="5"/><circle cx="150" cy="14" r="7" fill="#FF8FA8" stroke="#C93A5B" stroke-width="2"/>`,
  beanie: `<path d="M114 78 Q118 34 150 32 Q182 34 186 78Z" fill="#4FA8F5" stroke="#2369B8" stroke-width="3"/><path d="M128 50 Q150 42 172 50 M124 62 Q150 54 176 62" stroke="#2369B8" stroke-width="2.5" fill="none" opacity=".6"/><path d="M112 78 Q150 66 188 78 L188 88 Q150 78 112 88Z" fill="#2369B8"/><circle cx="150" cy="30" r="8" fill="#FFF3B0" stroke="#E0941C" stroke-width="2"/>`,
  sunhat: `<ellipse cx="148" cy="74" rx="52" ry="12" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M118 74 Q124 38 148 38 Q172 38 178 74Z" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M120 66 Q148 54 176 66" stroke="#FF5C7A" stroke-width="6" fill="none"/>`,
  chef: `<path d="M118 74 Q112 50 134 46 Q142 30 160 40 Q178 36 180 56 Q188 70 174 76Z" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><rect x="120" y="68" width="56" height="12" rx="4" fill="#fff" stroke="#D5CDBA" stroke-width="3"/>`,
  dumpling: `<circle cx="150" cy="56" r="20" fill="#FFE6C8" stroke="#D9A86E" stroke-width="3"/><path d="M150 36 Q140 44 138 54 M150 36 Q150 46 148 54 M150 36 Q160 44 162 54" stroke="#D9A86E" stroke-width="2.5" fill="none" stroke-linecap="round"/><circle cx="144" cy="60" r="2" fill="#2A1A14"/><circle cx="156" cy="60" r="2" fill="#2A1A14"/><path d="M147 64 Q150 67 153 64" stroke="#2A1A14" stroke-width="1.6" fill="none"/>`,
  crown: `<path d="M120 76 L116 42 L134 58 L150 34 L166 58 L184 42 L180 76Z" fill="#FFD34D" stroke="#E0941C" stroke-width="3" stroke-linejoin="round"/><circle cx="150" cy="66" r="5" fill="#FF5C7A"/><circle cx="132" cy="68" r="3.5" fill="#4FA8F5"/><circle cx="168" cy="68" r="3.5" fill="#6FCF4F"/>`,
  wizard: `<path d="M150 4 L126 74 L178 74Z" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3" stroke-linejoin="round"/><ellipse cx="150" cy="74" rx="38" ry="9" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><path d="M146 30 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z M156 52 l1.5 3.5 3.5 .5 -2.5 2.5 .5 3.5 -3 -2 -3 2 .5 -3.5 -2.5 -2.5 3.5 -.5z" fill="#FFD34D"/>`,
};
export function hatSide(id) { return HAT_SIDE[id] || ''; }

// Simplified hats for the top-down maze piggy (nose points up, head centre at (0,-44)).
const HAT_TOP = {
  strawberry: `<path d="M-30 -56 Q0 -96 30 -60 Q14 -62 0 -58 Q-16 -54 -30 -56Z" fill="#FF5C7A"/><circle cx="-14" cy="-66" r="4" fill="#FFF3B0"/><circle cx="4" cy="-76" r="4" fill="#FFF3B0"/><circle cx="18" cy="-66" r="4" fill="#FFF3B0"/>`,
  bow: `<path d="M0 -40 Q-26 -58 -24 -40 Q-24 -24 0 -40Z M0 -40 Q26 -58 24 -40 Q24 -24 0 -40Z" fill="#FF5C7A" stroke="#C93A5B" stroke-width="2.5"/><circle cx="0" cy="-40" r="6" fill="#FF8FA8" stroke="#C93A5B" stroke-width="2.5"/>`,
  flower: `<g fill="#fff" stroke="#E6DCC8" stroke-width="2">${[0, 60, 120, 180, 240, 300].map(a => `<ellipse cx="0" cy="-56" rx="7" ry="13" transform="rotate(${a} 0 -44)"/>`).join('')}</g><circle cx="0" cy="-44" r="7" fill="#FFD34D" stroke="#E0941C" stroke-width="2"/>`,
  party: `<circle cx="0" cy="-44" r="24" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><circle cx="0" cy="-44" r="14" fill="#FFD34D"/><circle cx="0" cy="-44" r="6" fill="#FF8FA8"/>`,
  beanie: `<circle cx="0" cy="-44" r="30" fill="#4FA8F5" stroke="#2369B8" stroke-width="3"/><circle cx="0" cy="-44" r="30" fill="none" stroke="#2369B8" stroke-width="8" opacity=".5"/><circle cx="0" cy="-44" r="8" fill="#FFF3B0" stroke="#E0941C" stroke-width="2"/>`,
  sunhat: `<circle cx="0" cy="-44" r="46" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><circle cx="0" cy="-44" r="26" fill="none" stroke="#FF5C7A" stroke-width="6"/><circle cx="0" cy="-44" r="22" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/>`,
  chef: `<circle cx="0" cy="-44" r="30" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><circle cx="-14" cy="-54" r="12" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><circle cx="14" cy="-54" r="12" fill="#fff" stroke="#D5CDBA" stroke-width="3"/>`,
  dumpling: `<circle cx="0" cy="-44" r="22" fill="#FFE6C8" stroke="#D9A86E" stroke-width="3"/><path d="M0 -44 L-14 -58 M0 -44 L0 -64 M0 -44 L14 -58 M0 -44 L-18 -40 M0 -44 L18 -40" stroke="#D9A86E" stroke-width="2.5" stroke-linecap="round"/>`,
  crown: `<path d="M-28 -24 L-32 -60 L-16 -46 L0 -72 L16 -46 L32 -60 L28 -24Z" fill="#FFD34D" stroke="#E0941C" stroke-width="3" stroke-linejoin="round"/><circle cx="0" cy="-36" r="5" fill="#FF5C7A"/>`,
  wizard: `<circle cx="0" cy="-44" r="38" fill="#7B6CF6" stroke="#4F42B5" stroke-width="3"/><circle cx="0" cy="-44" r="18" fill="#6A5BE0" stroke="#4F42B5" stroke-width="3"/><path d="M-4 -48 l2 5 5 1 -4 3 1 5 -4 -3 -4 3 1 -5 -4 -3 5 -1z" fill="#FFD34D"/>`,
};
export function hatTop(id) { return HAT_TOP[id] || ''; }

// A hat by itself, for the shop.
export function hatIcon(id) {
  return `<svg viewBox="104 0 92 92" aria-hidden="true"><g transform="translate(0 8)">${hatSide(id)}</g></svg>`;
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
  if (coat.breed === 'peruvian') hair = `<path d="M-46 30 Q-50 70 -40 84 Q-30 70 -20 86 Q-10 70 0 88 Q10 70 20 86 Q30 70 40 84 Q50 70 46 30Z" fill="${main}" stroke="${dark}" stroke-width="2"/>`;
  if (coat.breed === 'texel') hair = [[-40, -10], [40, -10], [-44, 30], [44, 30], [-30, 62], [30, 62], [0, 70]].map(([x, y]) => `<circle cx="${x}" cy="${y}" r="9" fill="${main}" stroke="${dark}" stroke-width="2.5"/>`).join('');
  return `<svg viewBox="-70 -90 140 170" x="-70" y="-90" width="140" height="170" class="piggy-top" aria-hidden="true">
    <g class="pawA"><ellipse cx="-46" cy="-30" rx="11" ry="8" fill="#F3B9A0"/><ellipse cx="44" cy="40" rx="11" ry="8" fill="#F3B9A0"/></g>
    <g class="pawB"><ellipse cx="46" cy="-30" rx="11" ry="8" fill="#F3B9A0"/><ellipse cx="-44" cy="40" rx="11" ry="8" fill="#F3B9A0"/></g>
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
  const [a, b] = key.split('+');
  const r = RECIPE_LOOK[key] || {};
  const fill = r.color || tint(a, b);
  const dark = shade(fill);
  // A short bamboo-steamer cylinder: the rim behind the bun, the front wall in
  // front of it so the dumpling sits down inside.
  // Plain tan cylinder with a slightly wider lip, seen from a little above.
  const back = opts.basket === false ? '' : `<ellipse cx="32" cy="37" rx="30" ry="7" fill="#C98F4B" stroke="#B9824A" stroke-width="2.5"/>`;
  const front = opts.basket === false ? '' : `
    <path d="M6 44 Q32 57 58 44 V55 Q58 61 52 61 H12 Q6 61 6 55Z" fill="#E8B27A" stroke="#B9824A" stroke-width="2.5" stroke-linejoin="round"/>
    <path d="M2 37 Q32 51 62 37 V43 Q32 57 2 43Z" fill="#EFC08C" stroke="#B9824A" stroke-width="2.5" stroke-linejoin="round"/>`;
  const dy = opts.basket === false ? 6 : 2;
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
  // A wide squishy bun: flat bottom, pleats gathered to a little twist on top,
  // the face low on the front.
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    ${back}
    <g transform="translate(0 ${dy})">
    <path d="M13 44 C9 30 20 17 32 17 C44 17 55 30 51 44 Q32 48 13 44Z" fill="${fill}" stroke="${dark}" stroke-width="2.5" stroke-linejoin="round"/>
    ${stripes}
    <path d="M32 19 Q24 25 19 36 M32 19 Q28 27 26 40 M32 19 Q32 30 32 42 M32 19 Q36 27 38 40 M32 19 Q40 25 45 36 M32 19 Q21 21 14 30 M32 19 Q43 21 50 30" stroke="${dark}" stroke-width="1.7" fill="none" stroke-linecap="round" opacity=".5"/>
    <path d="M28 18 Q32 12 36 18 Q32 21 28 18Z" fill="${dark}" opacity=".55"/>
    <ellipse cx="21" cy="25" rx="5" ry="2.6" transform="rotate(-25 21 25)" fill="#fff" opacity=".55"/>
    ${sparkle}
    <g stroke="#FF6F8E" stroke-width="1.8" stroke-linecap="round" opacity=".8"><path d="M18 30 l1.5 3 M21.5 29 l1.5 3 M41 29 l1.5 3 M44.5 30 l1.5 3"/></g>
    ${eyes}${mouth}${hat}
    </g>
    ${front}
  </svg>`;
}

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
    carrot: `<path d="M32 8 L44 52 L20 52Z" fill="#FF9A3C"/><path d="M32 8 Q24 2 20 10 M32 8 Q32 0 38 4 M32 8 Q40 2 44 10" stroke="#4CAF50" stroke-width="4" fill="none" stroke-linecap="round"/><path d="M26 30 H38 M28 40 H36" stroke="#E07A1F" stroke-width="2" stroke-linecap="round"/>`,
    cabbage: `<circle cx="32" cy="34" r="22" fill="#8FD07A"/><path d="M14 30 Q32 20 50 30 M18 42 Q32 34 46 42" stroke="#5FAE4E" stroke-width="3" fill="none" stroke-linecap="round"/><circle cx="32" cy="34" r="9" fill="#C8F0B0"/>`,
    pea: `<path d="M10 40 Q32 8 56 32 Q34 50 10 40Z" fill="#5BC86A"/><circle cx="22" cy="34" r="6" fill="#8FE38A"/><circle cx="35" cy="30" r="6" fill="#8FE38A"/><circle cx="47" cy="31" r="5" fill="#8FE38A"/>`,
    strawberry: `<path d="M32 56 Q10 40 14 24 Q22 12 32 20 Q42 12 50 24 Q54 40 32 56Z" fill="#FF5C7A"/><path d="M24 14 Q32 8 40 14 L32 22Z" fill="#4CAF50"/><g fill="#FFF3B0"><circle cx="24" cy="30" r="1.8"/><circle cx="36" cy="28" r="1.8"/><circle cx="30" cy="40" r="1.8"/><circle cx="40" cy="40" r="1.8"/></g>`,
  }[filling];
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">${v}</svg>`;
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

// Grey silhouette of a poop kind for the Poop Book.
export function poopShadow(p = {}) {
  return poop(p).replace(/fill="(?!none)[^"]*"/g, 'fill="#D5CDBA"').replace(/stroke="[^"]*"/g, 'stroke="#B7AC94"').replace(/<defs>.*?<\/defs>/, '');
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
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 22 H50 L46 56 H18Z" fill="#B9824A"/><rect x="10" y="16" width="44" height="8" rx="3" fill="#8A5634"/><path d="M24 36 Q32 28 40 36" stroke="#5FAE4E" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
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

export function upgradeIcon(kind) {
  const inner = {
    plot: `<rect x="10" y="30" width="44" height="22" rx="6" fill="#B9824A"/><path d="M32 30 V14 M24 22 Q32 14 40 22" stroke="#5FAE4E" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    sun: `<circle cx="32" cy="32" r="14" fill="#FFD34D"/><g stroke="#FFB02E" stroke-width="4" stroke-linecap="round"><path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58 M13 13 L19 19 M45 45 L51 51 M13 51 L19 45 M45 19 L51 13"/></g>`,
    robot: `<rect x="14" y="18" width="36" height="30" rx="8" fill="#9BB7D4"/><circle cx="25" cy="32" r="4" fill="#2A1A14"/><circle cx="39" cy="32" r="4" fill="#2A1A14"/><path d="M26 42 H38" stroke="#2A1A14" stroke-width="3" stroke-linecap="round"/><path d="M32 18 V8" stroke="#9BB7D4" stroke-width="4"/><circle cx="32" cy="7" r="4" fill="#FF5C7A"/>`,
    bowl: `<path d="M8 28 H56 Q54 54 32 54 Q10 54 8 28Z" fill="#7AA6FF"/><ellipse cx="32" cy="28" rx="24" ry="6" fill="#A9C4FF"/>`,
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

// Soil bed for one garden plot: grass border with tufts, furrowed dirt with clods.
export function plotArt() {
  const clods = [[40, 70], [120, 64], [200, 72], [280, 66], [330, 78], [80, 96], [170, 100], [250, 94]].map(([x, y]) => `<ellipse cx="${x}" cy="${y}" rx="7" ry="4" fill="#6A4524" opacity=".5"/>`).join('');
  return `<svg viewBox="0 0 360 130" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="dirt" width="18" height="12" patternUnits="userSpaceOnUse"><circle cx="4" cy="4" r="1.6" fill="#6A4524" opacity=".35"/><circle cx="13" cy="9" r="1.2" fill="#B9824A" opacity=".5"/></pattern></defs>
    <rect width="360" height="130" fill="#A7DB8C"/>
    <rect x="0" y="0" width="360" height="130" fill="url(#dirt)" opacity=".25"/>
    <rect x="16" y="34" width="328" height="86" rx="18" fill="#8E5E3A" stroke="#6A4524" stroke-width="4"/>
    <rect x="16" y="34" width="328" height="86" rx="18" fill="url(#dirt)"/>
    <path d="M36 60 H324 M36 82 H324 M36 104 H324" stroke="#6A4524" stroke-width="5" stroke-linecap="round" opacity=".45"/>
    ${clods}
    ${tuft(12, 36, 1.1)}${tuft(60, 30, .8)}${tuft(300, 30, .9)}${tuft(350, 40, 1.1)}${tuft(30, 128, 1)}${tuft(340, 126, .9)}${tuft(190, 28, .7, '#7DC768')}
  </svg>`;
}

// The playpen: a big bamboo-steamer-style pen seen from the front, with hay,
// a hidey house, a water bottle and a food bowl.
export function penScene() {
  return `<svg viewBox="0 0 400 300" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <defs>
      <linearGradient id="penSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#BFE9FF"/><stop offset="1" stop-color="#F3FBFF"/></linearGradient>
      <linearGradient id="penFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6DFAE"/><stop offset="1" stop-color="#E8C27A"/></linearGradient>
      <pattern id="hay" width="26" height="18" patternUnits="userSpaceOnUse"><path d="M2 14 L12 4 M14 16 L24 8 M6 17 L10 10" stroke="#D9A84E" stroke-width="2" stroke-linecap="round" opacity=".55"/></pattern>
    </defs>
    <rect width="400" height="300" fill="url(#penSky)"/>
    <circle cx="340" cy="46" r="26" fill="#FFE27A"/>
    <g fill="#fff" opacity=".9"><ellipse cx="80" cy="50" rx="34" ry="14"/><ellipse cx="104" cy="42" rx="22" ry="12"/><ellipse cx="250" cy="70" rx="28" ry="11"/></g>
    <g stroke="#B9824A" stroke-width="5">${[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map(x => `<path d="M${x} 30 V98"/>`).join('')}</g>
    <path d="M0 30 H400" stroke="#B9824A" stroke-width="7"/>
    <path d="M0 62 H400" stroke="#B9824A" stroke-width="5"/>
    <rect x="0" y="96" width="400" height="10" fill="#B9824A"/>
    <rect x="0" y="104" width="400" height="196" fill="url(#penFloor)"/>
    <rect x="0" y="104" width="400" height="196" fill="url(#hay)"/>
    <ellipse cx="310" cy="150" rx="40" ry="14" fill="#F2CE7E"/><path d="M276 150 Q300 128 332 146 M286 146 Q312 130 342 150" stroke="#D9A84E" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g>
      <path d="M26 156 L26 110 Q66 76 106 110 L106 156Z" fill="#C9935A" stroke="#8A5634" stroke-width="4" stroke-linejoin="round"/>
      <path d="M44 156 V130 Q66 108 88 130 V156Z" fill="#5A3A26"/>
      <path d="M26 110 Q66 76 106 110" fill="none" stroke="#E6B566" stroke-width="6"/>
    </g>
    <g>
      <path d="M372 96 V110" stroke="#9AA" stroke-width="4" stroke-linecap="round"/>
      <rect x="362" y="104" width="20" height="62" rx="8" fill="#BFE6F7" stroke="#6FB7D9" stroke-width="3"/>
      <rect x="367" y="118" width="10" height="42" rx="4" fill="#8FD3F2"/>
      <path d="M372 166 L372 184" stroke="#9AA" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g>
      <ellipse cx="200" cy="286" rx="34" ry="12" fill="#7AA6FF" stroke="#4C7FD9" stroke-width="3"/>
      <ellipse cx="200" cy="282" rx="24" ry="6" fill="#B8D0FF"/>
    </g>
  </svg>`;
}

export function gardenScene(opts = {}) {
  const sunhat = `<g class="hat"><ellipse cx="140" cy="72" rx="52" ry="12" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M110 72 Q116 36 140 36 Q164 36 170 72Z" fill="#F2CE7E" stroke="#C98F4B" stroke-width="3"/><path d="M112 64 Q140 52 168 64" stroke="#FF5C7A" stroke-width="6" fill="none"/></g>`;
  const pig = piggySide({ coat: opts.coat }).replace('<svg viewBox="0 0 200 200"', '<svg viewBox="0 0 200 200" width="200" height="200"').replace('</g>\n  </svg>', sunhat + '</g></svg>');
  return `<svg viewBox="0 0 400 160" class="scene" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
    <defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FDBFF"/><stop offset="1" stop-color="#E9F8FF"/></linearGradient></defs>
    <rect width="400" height="160" fill="url(#gSky)"/>
    <circle cx="60" cy="40" r="24" fill="#FFE27A"/>
    <g fill="#fff" opacity=".9"><ellipse cx="300" cy="40" rx="36" ry="14"/><ellipse cx="326" cy="32" rx="22" ry="12"/><ellipse cx="180" cy="60" rx="26" ry="10"/></g>
    <ellipse cx="120" cy="140" rx="90" ry="30" fill="#8FD07A"/><ellipse cx="320" cy="146" rx="120" ry="34" fill="#7DC768"/>
    <rect x="0" y="130" width="400" height="30" fill="#A7DB8C"/>
    <g stroke="#C9935A" stroke-width="6" stroke-linecap="round">${[20, 70, 120, 170, 220, 270, 320, 370].map(x => `<path d="M${x} 100 V150"/>`).join('')}<path d="M0 112 H400 M0 136 H400"/></g>
    <g stroke="#8A5634" stroke-width="2" fill="#C9935A">${[20, 70, 120, 170, 220, 270, 320, 370].map(x => `<path d="M${x - 6} 102 L${x} 92 L${x + 6} 102Z"/>`).join('')}</g>
    ${tuft(40, 158, 1)}${tuft(96, 156, .8)}${tuft(150, 158, 1.1)}${tuft(240, 158, .9)}${tuft(300, 156, 1)}${tuft(372, 158, .8)}
    <g class="wheelbarrow"><path d="M300 118 L350 118 L344 140 L310 140Z" fill="#E2574C" stroke="#B0392F" stroke-width="3"/><circle cx="312" cy="146" r="8" fill="#5A3A26"/><path d="M350 118 L372 108" stroke="#8A5634" stroke-width="4" stroke-linecap="round"/><ellipse cx="326" cy="118" rx="18" ry="6" fill="#8E5E3A"/></g>
    <g transform="translate(130 46) scale(.5)">${pig}</g>
  </svg>`;
}

// The kitchen: tiled wall, shelves of jars, a counter with a bamboo steamer
// on a wok, and the piggy chef behind it. The UI overlays the ingredient
// slots on the counter.
export function kitchenScene(opts = {}) {
  const toque = `<g class="hat"><path d="M112 72 Q110 48 134 46 Q142 30 160 40 Q178 36 180 56 Q188 70 170 74 Z" fill="#fff" stroke="#D5CDBA" stroke-width="3"/><rect x="118" y="66" width="56" height="12" rx="4" fill="#fff" stroke="#D5CDBA" stroke-width="3"/></g>`;
  const pig = piggySide({ coat: opts.coat }).replace('<svg viewBox="0 0 200 200"', '<svg viewBox="0 0 200 200" width="200" height="200"').replace('</g>\n  </svg>', toque + '</g></svg>');
  return `<svg viewBox="0 0 400 230" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <defs><pattern id="tiles" width="40" height="40" patternUnits="userSpaceOnUse"><rect width="40" height="40" fill="#FFF1D6"/><rect x="2" y="2" width="36" height="36" rx="6" fill="#FFE3B8"/></pattern></defs>
    <rect width="400" height="230" fill="url(#tiles)"/>
    <g><rect x="16" y="22" width="150" height="10" rx="3" fill="#B9824A"/><rect x="234" y="22" width="150" height="10" rx="3" fill="#B9824A"/>
      <g stroke="#8A5634" stroke-width="2.5"><rect x="30" y="-2" width="26" height="26" rx="5" fill="#FFB77A"/><rect x="66" y="2" width="22" height="22" rx="5" fill="#A6DB8C"/><rect x="100" y="-4" width="30" height="28" rx="6" fill="#FF8FA8"/><rect x="250" y="0" width="24" height="24" rx="5" fill="#8FD3F2"/><rect x="286" y="-2" width="28" height="26" rx="6" fill="#FFD34D"/><rect x="326" y="4" width="22" height="20" rx="5" fill="#C9B8D6"/></g></g>
    <g class="chef">${'<g transform="translate(26 54) scale(.62)">' + pig + '</g>'}
      <g class="spoon"><path d="M128 120 L150 86" stroke="#8A5634" stroke-width="6" stroke-linecap="round"/><ellipse cx="152" cy="82" rx="9" ry="6" fill="#B9824A"/></g></g>
    <rect x="0" y="150" width="400" height="80" fill="#C9935A"/><rect x="0" y="146" width="400" height="12" rx="4" fill="#E6B566" stroke="#9C6A3A" stroke-width="3"/>
    <g class="pot">
      <path d="M212 118 Q292 150 372 118 L360 150 H224Z" fill="#3A2A22"/><ellipse cx="292" cy="150" rx="68" ry="8" fill="#2A1A14"/>
      <path d="M204 112 L220 112 M364 112 L380 112" stroke="#3A2A22" stroke-width="7" stroke-linecap="round"/>
      <rect x="232" y="82" width="120" height="34" rx="10" fill="#E6B566" stroke="#9C6A3A" stroke-width="3"/>
      <path d="M232 96 H352" stroke="#C98F4B" stroke-width="3"/>
      <g stroke="#9C6A3A" stroke-width="2" opacity=".5">${[246, 262, 278, 294, 310, 326, 342].map(x => `<path d="M${x} 86 V112"/>`).join('')}</g>
      <ellipse cx="292" cy="82" rx="62" ry="12" fill="#F2CE7E" stroke="#9C6A3A" stroke-width="3"/>
      <ellipse cx="292" cy="80" rx="46" ry="7" fill="#E6B566"/>
      <path d="M292 72 V58" stroke="#9C6A3A" stroke-width="5" stroke-linecap="round"/><circle cx="292" cy="56" r="6" fill="#C98F4B" stroke="#9C6A3A" stroke-width="2"/>
    </g>
    <g class="vapor"><ellipse class="puff p1" cx="268" cy="46" rx="9" ry="12" fill="#fff" opacity=".85"/><ellipse class="puff p2" cx="292" cy="38" rx="10" ry="14" fill="#fff" opacity=".85"/><ellipse class="puff p3" cx="316" cy="48" rx="8" ry="11" fill="#fff" opacity=".85"/></g>
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
  const c = { carrot: [255, 196, 120], cabbage: [205, 240, 180], pea: [170, 230, 170], strawberry: [255, 180, 205] };
  const x = c[a], y = c[b];
  const m = x.map((v, i) => Math.round((v + y[i]) / 2));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

function shade(rgb) {
  const m = rgb.match(/\d+/g).map(Number).map(v => Math.round(v * 0.78));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
