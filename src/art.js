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

  const hatSvg = hat ? `<g class="hat"><path d="M112 70 Q136 30 164 60 Q148 58 132 66 Q122 72 112 70Z" fill="#FF5C7A"/><circle cx="118" cy="62" r="3" fill="#FFF3B0"/><circle cx="134" cy="54" r="3" fill="#FFF3B0"/><circle cx="150" cy="56" r="3" fill="#FFF3B0"/><path d="M110 72 Q140 62 170 68" fill="none" stroke="#4CAF50" stroke-width="5" stroke-linecap="round"/></g>` : '';
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

// Top-down piggy for the maze, drawn around (0,0) with the nose pointing up.
export function piggyTop(opts = {}) {
  const coat = opts.coat || DEFAULT_COAT;
  const skinny = coat.breed === 'skinny';
  const main = skinny ? '#F2B8A0' : col(coat.main);
  const patch = skinny ? '#F7CDBB' : col(coat.patch);
  const dark = darken(main);
  const hat = opts.hat ? `<path d="M-30 -56 Q0 -96 30 -60 Q14 -62 0 -58 Q-16 -54 -30 -56Z" fill="#FF5C7A"/><circle cx="-14" cy="-66" r="4" fill="#FFF3B0"/><circle cx="4" cy="-76" r="4" fill="#FFF3B0"/><circle cx="18" cy="-66" r="4" fill="#FFF3B0"/>` : '';
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

export function dumpling(key, size = 64) {
  const [a, b] = key.split('+');
  const fill = tint(a, b);
  const special = {
    'strawberry+strawberry': `<circle cx="48" cy="18" r="3" fill="#FFD166"/><circle cx="14" cy="22" r="2" fill="#FF8FA8"/>`,
    'carrot+strawberry': `<path d="M30 14 Q36 6 42 12" stroke="#FF5C7A" stroke-width="3" fill="none" stroke-linecap="round"/>`,
    'pea+strawberry': `<circle cx="20" cy="40" r="2.5" fill="#FF5C7A"/><circle cx="44" cy="36" r="2.5" fill="#5BC8A8"/><circle cx="32" cy="44" r="2.5" fill="#FFD166"/>`,
    'cabbage+pea': `<text x="46" y="20" font-size="12" fill="#7AA6FF" font-family="sans-serif">z</text>`,
  }[key] || '';
  return `<svg viewBox="0 0 64 64" width="${size}" height="${size}" aria-hidden="true">
    <path d="M8 48 Q8 22 32 20 Q56 22 56 48Z" fill="${fill}" stroke="${shade(fill)}" stroke-width="3" stroke-linejoin="round"/>
    <path d="M20 26 L26 34 M32 21 L32 31 M44 26 L38 34" stroke="${shade(fill)}" stroke-width="2.5" stroke-linecap="round" opacity=".7"/>
    <circle cx="26" cy="40" r="2" fill="${INK}"/><circle cx="38" cy="40" r="2" fill="${INK}"/>
    <path d="M29 44 Q32 47 35 44" fill="none" stroke="${INK}" stroke-width="1.6" stroke-linecap="round"/>
    ${special}
  </svg>`;
}

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
  if (progress >= 1) return veggie(filling, 56);
  const h = 10 + progress * 26;
  return `<svg viewBox="0 0 64 64" width="56" height="56" aria-hidden="true">
    <path d="M32 58 V${58 - h}" stroke="#5FAE4E" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="${32 - 8}" cy="${58 - h + 4}" rx="8" ry="4" transform="rotate(-30 ${32 - 8} ${58 - h + 4})" fill="#8FD07A"/>
    <ellipse cx="${32 + 8}" cy="${58 - h + 4}" rx="8" ry="4" transform="rotate(30 ${32 + 8} ${58 - h + 4})" fill="#8FD07A"/>
  </svg>`;
}

export function poop() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true">
    <ellipse cx="22" cy="44" rx="7" ry="11" transform="rotate(-20 22 44)" fill="#7A4A2B"/>
    <ellipse cx="36" cy="46" rx="7" ry="11" transform="rotate(15 36 46)" fill="#8A5634"/>
    <ellipse cx="46" cy="40" rx="6" ry="10" transform="rotate(35 46 40)" fill="#7A4A2B"/>
    <circle cx="20" cy="40" r="1.6" fill="#fff"/><circle cx="25" cy="41" r="1.6" fill="#fff"/>
  </svg>`;
}

export function compostIcon() {
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><path d="M14 22 H50 L46 56 H18Z" fill="#B9824A"/><rect x="10" y="16" width="44" height="8" rx="3" fill="#8A5634"/><path d="M24 36 Q32 28 40 36" stroke="#5FAE4E" stroke-width="4" fill="none" stroke-linecap="round"/></svg>`;
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
    <rect x="0" y="104" width="400" height="196" fill="url(#penFloor)"/>
    <rect x="0" y="104" width="400" height="196" fill="url(#hay)"/>
    <ellipse cx="310" cy="150" rx="40" ry="14" fill="#F2CE7E"/><path d="M276 150 Q300 128 332 146 M286 146 Q312 130 342 150" stroke="#D9A84E" stroke-width="3" fill="none" stroke-linecap="round"/>
    <g>
      <path d="M26 150 L26 104 Q66 70 106 104 L106 150Z" fill="#C9935A" stroke="#8A5634" stroke-width="4" stroke-linejoin="round"/>
      <path d="M44 150 V124 Q66 102 88 124 V150Z" fill="#5A3A26"/>
      <path d="M26 104 Q66 70 106 104" fill="none" stroke="#E6B566" stroke-width="6"/>
    </g>
    <g>
      <rect x="366" y="52" width="18" height="60" rx="8" fill="#BFE6F7" stroke="#6FB7D9" stroke-width="3"/>
      <rect x="370" y="66" width="10" height="40" rx="4" fill="#8FD3F2"/>
      <path d="M372 112 L372 128" stroke="#9AA" stroke-width="5" stroke-linecap="round"/>
    </g>
    <g>
      <ellipse cx="200" cy="286" rx="34" ry="12" fill="#7AA6FF" stroke="#4C7FD9" stroke-width="3"/>
      <ellipse cx="200" cy="282" rx="24" ry="6" fill="#B8D0FF"/>
    </g>
    <rect x="0" y="96" width="400" height="10" fill="#B9824A"/>
    <g stroke="#B9824A" stroke-width="5">${[20, 60, 100, 140, 180, 220, 260, 300, 340, 380].map(x => `<path d="M${x} 30 V98"/>`).join('')}</g>
    <path d="M0 30 H400" stroke="#B9824A" stroke-width="7"/>
    <path d="M0 62 H400" stroke="#B9824A" stroke-width="5"/>
  </svg>`;
}

export function gardenScene() {
  return `<svg viewBox="0 0 400 160" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <defs><linearGradient id="gSky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9FDBFF"/><stop offset="1" stop-color="#E9F8FF"/></linearGradient></defs>
    <rect width="400" height="160" fill="url(#gSky)"/>
    <circle cx="60" cy="40" r="24" fill="#FFE27A"/>
    <g fill="#fff" opacity=".9"><ellipse cx="300" cy="40" rx="36" ry="14"/><ellipse cx="326" cy="32" rx="22" ry="12"/><ellipse cx="180" cy="60" rx="26" ry="10"/></g>
    <ellipse cx="120" cy="140" rx="90" ry="30" fill="#8FD07A"/><ellipse cx="320" cy="146" rx="120" ry="34" fill="#7DC768"/>
    <rect x="0" y="130" width="400" height="30" fill="#A7DB8C"/>
    <g stroke="#C9935A" stroke-width="6" stroke-linecap="round">${[20, 70, 120, 170, 220, 270, 320, 370].map(x => `<path d="M${x} 100 V150"/>`).join('')}<path d="M0 112 H400 M0 136 H400"/></g>
    <g stroke="#8A5634" stroke-width="2" fill="#C9935A">${[20, 70, 120, 170, 220, 270, 320, 370].map(x => `<path d="M${x - 6} 102 L${x} 92 L${x + 6} 102Z"/>`).join('')}</g>
  </svg>`;
}

export function kitchenScene() {
  return `<svg viewBox="0 0 400 120" class="scene" preserveAspectRatio="none" aria-hidden="true">
    <rect width="400" height="120" fill="#FFE8C2"/>
    <g fill="#F7D9A8">${[0, 50, 100, 150, 200, 250, 300, 350].map(x => `<rect x="${x}" y="0" width="25" height="120"/>`).join('')}</g>
    <rect x="0" y="70" width="400" height="50" fill="#C9935A"/><rect x="0" y="70" width="400" height="8" fill="#E6B566"/>
    <rect x="30" y="16" width="120" height="10" rx="3" fill="#B9824A"/><rect x="250" y="16" width="120" height="10" rx="3" fill="#B9824A"/>
    <g><ellipse cx="60" cy="14" rx="14" ry="6" fill="#FF9A3C"/><ellipse cx="100" cy="14" rx="14" ry="6" fill="#8FD07A"/><ellipse cx="280" cy="14" rx="14" ry="6" fill="#5BC86A"/><ellipse cx="320" cy="14" rx="14" ry="6" fill="#FF5C7A"/></g>
    <g><rect x="170" y="40" width="60" height="30" rx="6" fill="#E6B566" stroke="#B9824A" stroke-width="3"/><path d="M166 40 H234" stroke="#B9824A" stroke-width="4" stroke-linecap="round"/><ellipse cx="200" cy="40" rx="30" ry="8" fill="#F2CE7E" stroke="#B9824A" stroke-width="3"/><path d="M200 32 V22" stroke="#B9824A" stroke-width="4" stroke-linecap="round"/></g>
    <g fill="#fff" opacity=".8" class="steamline"><ellipse cx="190" cy="14" rx="6" ry="9"/><ellipse cx="210" cy="10" rx="6" ry="9"/></g>
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
  const c = { carrot: [255, 200, 150], cabbage: [225, 245, 210], pea: [205, 240, 200], strawberry: [255, 200, 215] };
  const x = c[a], y = c[b];
  const m = x.map((v, i) => Math.round((v + y[i]) / 2));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}

function shade(rgb) {
  const m = rgb.match(/\d+/g).map(Number).map(v => Math.round(v * 0.78));
  return `rgb(${m[0]},${m[1]},${m[2]})`;
}
