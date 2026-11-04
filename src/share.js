// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// "Share my pen": turns what is in the Pen right now into one picture.
// The Pen is many small drawings stacked on top of each other, so this copies
// each one into a single drawing at the same place and size, then adds a
// name banner along the bottom.

const NS = 'http://www.w3.org/2000/svg';
const OUT_W = 1080;   // picture width in pixels
const BANNER = 150;   // name banner height, in picture pixels

// "Mochi", "Mochi and Fluff", "Mochi, Fluff and Wheeks"
export const nameList = names => names.length < 2 ? names.join('') : names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1];

// A copy of one drawing with the bits the page hides left out (shut eyes on
// an awake piggy and so on), since the page's styles don't come along.
function copySvg(svg, x, y, w, h) {
  const copy = svg.cloneNode(true);
  const from = [svg, ...svg.querySelectorAll('*')], to = [copy, ...copy.querySelectorAll('*')];
  for (let i = from.length - 1; i > 0; i--) {
    const cs = getComputedStyle(from[i]);
    if (cs.display === 'none' || cs.visibility === 'hidden') to[i].remove();
  }
  copy.removeAttribute('class'); copy.removeAttribute('style');
  copy.setAttribute('x', x); copy.setAttribute('y', y);
  copy.setAttribute('width', w); copy.setAttribute('height', h);
  copy.setAttribute('overflow', 'visible');
  return new XMLSerializer().serializeToString(copy);
}

// Where a thing sits inside the stage, in page pixels.
const place = (r, box) => [r.left - box.left, r.top - box.top, r.width, r.height].map(n => +n.toFixed(1));

function penSvg(stage) {
  const sr = stage.getBoundingClientRect();
  const box = { left: sr.left + stage.clientLeft, top: sr.top + stage.clientTop, width: stage.clientWidth, height: stage.clientHeight };
  const parts = [];
  for (const scene of stage.querySelectorAll(':scope > svg')) parts.push(copySvg(scene, ...place(scene.getBoundingClientRect(), box)));
  const things = [...stage.querySelectorAll('#floor > *')]
    .filter(t => !t.matches('.spot-hit, .gone') && getComputedStyle(t).display !== 'none')
    .map((t, i) => ({ t, i, z: parseInt(getComputedStyle(t).zIndex, 10) || 0 }))
    .sort((a, b) => a.z - b.z || a.i - b.i);
  const tags = [];
  for (const { t } of things) {
    const art = t.matches('.piggy') ? t.querySelector('.pig-art svg') : t.querySelector('svg');
    if (!art) continue;
    const [x, y, w, h] = place(art.getBoundingClientRect(), box);
    if (!w || !h) continue;
    const flip = t.matches('.piggy') ? parseFloat(getComputedStyle(t.querySelector('.pig-art')).getPropertyValue('--f')) < 0 : t.matches('.flip');
    const one = copySvg(art, x, y, w, h);
    parts.push(flip ? `<g transform="translate(${(2 * x + w).toFixed(1)} 0) scale(-1 1)">${one}</g>` : one);
    const tag = t.matches('.piggy') && t.querySelector('.tag');
    if (tag && tag.textContent) tags.push({ text: tag.textContent, r: place(tag.getBoundingClientRect(), box) });
  }
  const svg = `<svg xmlns="${NS}" width="${box.width}" height="${box.height}" viewBox="0 0 ${box.width} ${box.height}">${parts.join('')}</svg>`;
  return { svg, w: box.width, h: box.height, tags };
}

const loadImg = src => new Promise((ok, fail) => { const i = new Image(); i.onload = () => ok(i); i.onerror = fail; i.src = src; });

function pill(ctx, x, y, w, h, fill, stroke, line) {
  ctx.beginPath(); ctx.roundRect(x, y, w, h, h / 2);
  ctx.fillStyle = fill; ctx.fill();
  if (stroke) { ctx.lineWidth = line; ctx.strokeStyle = stroke; ctx.stroke(); }
}

// Fit text into a width by shrinking the font a little at a time.
function fitFont(ctx, text, weight, size, family, maxW) {
  do { ctx.font = `${weight} ${size}px ${family}`; size -= 2; } while (size > 20 && ctx.measureText(text).width > maxW);
}

// The picture as a JPEG data URL, plus the names it shows.
export async function penPicture(stage, { names, title }) {
  const { svg, w, h, tags } = penSvg(stage);
  const k = OUT_W / w, H = Math.round(h * k);
  const canvas = document.createElement('canvas');
  canvas.width = OUT_W; canvas.height = H + BANNER;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#FFF1DC'; ctx.fillRect(0, 0, canvas.width, canvas.height);
  const img = await loadImg('data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg));
  ctx.drawImage(img, 0, 0, OUT_W, H);
  try { await document.fonts?.ready; } catch (e) { /* plain fonts are fine */ }
  const display = '"Fredoka", "Nunito", system-ui, sans-serif';
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  // Name tags over each piggy, like in the game.
  for (const { text, r: [x, y, tw, th] } of tags) {
    // Every tag the same size, even the picked piggy's bigger one.
    const fs = 34, ph = 50;
    ctx.font = `600 ${fs}px ${display}`;
    const pw = ctx.measureText(text).width + fs * 1.1;
    const cx = (x + tw / 2) * k, cy = (y + th / 2) * k;
    pill(ctx, cx - pw / 2, cy - ph / 2, pw, ph, '#FFF8EC', '#8A5A33', 4);
    ctx.fillStyle = '#5A3A22'; ctx.fillText(text, cx, cy + 1);
  }
  // A wooden frame round the pen and the banner underneath.
  ctx.lineWidth = 16; ctx.strokeStyle = '#8A5A33';
  ctx.strokeRect(8, 8, OUT_W - 16, H - 8);
  ctx.fillStyle = '#8A5A33'; ctx.fillRect(0, H, OUT_W, BANNER);
  ctx.fillStyle = '#FFF1DC';
  const line = nameList(names);
  fitFont(ctx, line, 700, 58, display, OUT_W - 80);
  ctx.fillText(line, OUT_W / 2, H + 58);
  ctx.fillStyle = '#FFD34D';
  fitFont(ctx, title, 600, 36, display, OUT_W - 80);
  ctx.fillText(title, OUT_W / 2, H + 112);
  return canvas.toDataURL('image/jpeg', 0.88);
}

// Web version: the phone's share sheet when it can take a picture, or else
// save the picture to the device.
export function canShareFile() {
  try {
    return !!navigator.canShare && navigator.canShare({ files: [new File([new Uint8Array(1)], 'pen.jpg', { type: 'image/jpeg' })] });
  } catch (e) { return false; }
}

export async function shareFile(dataUrl, text) {
  const blob = await (await fetch(dataUrl)).blob();
  const file = new File([blob], 'my-piggies.jpg', { type: 'image/jpeg' });
  try { await navigator.share({ files: [file], text }); return true; }
  catch (e) { return e && e.name === 'AbortError' ? false : saveFile(dataUrl); }
}

export function saveFile(dataUrl) {
  const a = document.createElement('a');
  a.href = dataUrl; a.download = 'my-piggies.jpg';
  document.body.appendChild(a); a.click(); a.remove();
  return true;
}
