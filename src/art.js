// Squishy-style art, all SVG strings so it stays sharp and tiny.

const INK = '#2A1A14';

export function piggySide(opts = {}) {
  const { hat = false, mood = 'happy' } = opts;
  const mouth = mood === 'hungry' || mood === 'stinky' || mood === 'bored'
    ? `<path d="M164 126 Q168 122 172 126" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`
    : `<path d="M162 124 Q165 128 168 124 Q171 128 174 124" fill="none" stroke="${INK}" stroke-width="2" stroke-linecap="round"/>`;
  const eye = mood === 'bored'
    ? `<path d="M152 104 Q160 108 168 104" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>`
    : `<g class="blink"><circle cx="160" cy="104" r="6.5" fill="${INK}"/><circle cx="162" cy="101.5" r="2.2" fill="#fff"/></g>`;
  const hatSvg = hat ? `<g class="hat"><path d="M112 70 Q136 30 164 60 Q148 58 132 66 Q122 72 112 70Z" fill="#FF5C7A"/><circle cx="118" cy="62" r="3" fill="#FFF3B0"/><circle cx="134" cy="54" r="3" fill="#FFF3B0"/><circle cx="150" cy="56" r="3" fill="#FFF3B0"/><path d="M110 72 Q140 62 170 68" fill="none" stroke="#4CAF50" stroke-width="5" stroke-linecap="round"/></g>` : '';
  return `<svg viewBox="0 0 200 200" class="piggy-svg" aria-hidden="true">
    <ellipse cx="100" cy="176" rx="72" ry="7" fill="#000" opacity=".12"/>
    <g class="body">
      <g class="legA"><ellipse cx="62" cy="160" rx="11" ry="7" fill="#F3B9A0"/><ellipse cx="146" cy="160" rx="10" ry="7" fill="#F3B9A0"/></g>
      <g class="legB"><ellipse cx="82" cy="160" rx="11" ry="7" fill="#F3B9A0"/><ellipse cx="128" cy="160" rx="10" ry="7" fill="#F3B9A0"/></g>
      <ellipse cx="96" cy="122" rx="72" ry="44" fill="#E9A15B"/>
      <path d="M70 80 Q96 74 116 84 Q120 120 108 162 Q84 166 64 160 Q56 120 70 80Z" fill="#FFF7EC"/>
      <path d="M32 112 Q28 96 40 90 Q36 104 44 110 Z" fill="#C9773E"/>
      <ellipse cx="148" cy="112" rx="40" ry="36" fill="#E9A15B"/>
      <path d="M180 104 Q190 116 184 128 Q170 132 162 122 Q170 112 180 104Z" fill="#FFF7EC"/>
      <ellipse cx="136" cy="80" rx="14" ry="10" transform="rotate(-25 136 80)" fill="#C9773E"/><ellipse cx="136" cy="81" rx="8" ry="5" transform="rotate(-25 136 81)" fill="#FFB3C1"/>
      ${hatSvg}
      ${eye}
      <ellipse cx="164" cy="122" rx="8" ry="4.5" fill="#FF8FA8" opacity=".7"/>
      <circle cx="186" cy="114" r="4" fill="#E86A86"/>
      ${mouth}
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
  return `<svg viewBox="0 0 64 64" aria-hidden="true"><circle cx="32" cy="32" r="26" fill="#FFD34D" stroke="#D9A21B" stroke-width="4"/><circle cx="32" cy="32" r="16" fill="none" stroke="#D9A21B" stroke-width="3"/><path d="M24 36 Q26 26 36 26 M32 20 l2 4 4 1 -3 3 1 4 -4 -2 -4 2 1 -4 -3 -3 4 -1z" fill="#FFF3B0" stroke="none"/></svg>`;
}

export function upgradeIcon(kind) {
  const inner = {
    plot: `<rect x="10" y="30" width="44" height="22" rx="6" fill="#B9824A"/><path d="M32 30 V14 M24 22 Q32 14 40 22" stroke="#5FAE4E" stroke-width="5" fill="none" stroke-linecap="round"/>`,
    sun: `<circle cx="32" cy="32" r="14" fill="#FFD34D"/><g stroke="#FFB02E" stroke-width="4" stroke-linecap="round"><path d="M32 6 V14 M32 50 V58 M6 32 H14 M50 32 H58 M13 13 L19 19 M45 45 L51 51 M13 51 L19 45 M45 19 L51 13"/></g>`,
    robot: `<rect x="14" y="18" width="36" height="30" rx="8" fill="#9BB7D4"/><circle cx="25" cy="32" r="4" fill="#2A1A14"/><circle cx="39" cy="32" r="4" fill="#2A1A14"/><path d="M26 42 H38" stroke="#2A1A14" stroke-width="3" stroke-linecap="round"/><path d="M32 18 V8" stroke="#9BB7D4" stroke-width="4"/><circle cx="32" cy="7" r="4" fill="#FF5C7A"/>`,
    bowl: `<path d="M8 28 H56 Q54 54 32 54 Q10 54 8 28Z" fill="#7AA6FF"/><ellipse cx="32" cy="28" rx="24" ry="6" fill="#A9C4FF"/>`,
    hat: `<path d="M12 44 Q32 4 52 40 Q36 36 22 42 Q16 46 12 44Z" fill="#FF5C7A"/><circle cx="22" cy="36" r="3" fill="#FFF3B0"/><circle cx="34" cy="26" r="3" fill="#FFF3B0"/><circle cx="44" cy="32" r="3" fill="#FFF3B0"/><path d="M10 46 Q32 38 54 44" stroke="#4CAF50" stroke-width="5" fill="none" stroke-linecap="round"/>`,
  }[kind];
  return `<svg viewBox="0 0 64 64" aria-hidden="true">${inner}</svg>`;
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
