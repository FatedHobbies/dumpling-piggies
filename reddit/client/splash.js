// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// The post as it shows in the Reddit feed: the title, some Piggies and a Play button that opens the game full size.
import { requestExpandedMode } from '@devvit/web/client';
import * as Art from '../../src/art.js';

const STARTERS = [
  { breed: 'american', main: 'ginger', patch: 'white' },
  { breed: 'abyssinian', main: 'cream', patch: 'chocolate' },
  { breed: 'peruvian', main: 'black', patch: 'white' },
];

const stage = document.getElementById('stage');
const draw = (piggies) => {
  const pigs = piggies.slice(0, 3).map((p) => `<div class="pig">${Art.piggySide({ coat: p.coat, hat: p.hat })}</div>`);
  const dumpling = `<div class="dump">${Art.dumpling('carrot+carrot', 64)}</div>`;
  stage.innerHTML = pigs.length > 1 ? [pigs[0], dumpling, ...pigs.slice(1)].join('') : [dumpling, ...pigs].join('');
};
draw(STARTERS.map((coat) => ({ coat })));

// Returning players see their own Piggies.
fetch('/api/peek').then((r) => (r.ok ? r.json() : null)).then((d) => {
  if (!d || !d.piggies || !d.piggies.length) return;
  draw(d.piggies);
  const names = d.piggies.slice(0, 3).map((p) => p.name).filter(Boolean);
  if (names.length) document.getElementById('tag').textContent = `${names.join(', ').replace(/, ([^,]*)$/, ' and $1')} ${names.length > 1 ? 'are' : 'is'} waiting for you!`;
}).catch(() => {});

document.getElementById('play').addEventListener('click', (e) => {
  // Outside Reddit (local testing) there is no post to expand, so just open the game.
  if (window.top === window) { location.href = 'game.html'; return; }
  requestExpandedMode(e, 'game');
});
