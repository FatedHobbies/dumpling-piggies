import * as G from './game.js';
import * as Art from './art.js';
import { load, save, wipe } from './save.js';
import { sfx } from './sound.js';

let state = null;
let tab = 'steamer';
let selected = [];          // fillings chosen in the kitchen
let lastTick = Date.now();
let lastFace = '';

const $ = (s, el = document) => el.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };

export function start() {
  state = load();
  let welcome = null;
  if (!state) {
    state = G.newState();
    welcome = 'new';
  } else {
    welcome = G.applyAway(state);
  }
  buildShell();
  render();
  if (welcome === 'new') toast(`Meet ${state.piggy.name}! Tap a dumpling to feed them.`, 'big');
  else if (welcome.away > 120) {
    const mins = Math.round(welcome.away / 60);
    const when = mins >= 120 ? `${Math.round(mins / 60)} hours` : `${mins} minutes`;
    toast(`You were away ${when}. ${state.piggy.name} earned ${welcome.coins} coins!`, 'big');
  }
  setInterval(loop, 1000);
  setInterval(() => save(state), 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) save(state); });
  window.addEventListener('pagehide', () => save(state));
}

function loop() {
  const now = Date.now();
  const dt = Math.min((now - lastTick) / 1000, 60);
  lastTick = now;
  const events = G.tick(state, dt, now);
  for (const e of events) {
    if (e.type === 'coin') floatCoin();
    if (e.type === 'poop') { sfx.plop(); }
    if (e.type === 'effectEnd') renderPiggy();
  }
  render();
}

function buildShell() {
  document.body.innerHTML = `
    <header class="top">
      <button class="name" id="name" aria-label="Rename your piggy"></button>
      <div class="coins"><span class="coin-ico">${Art.coinIcon()}</span><span id="coins">0</span></div>
    </header>
    <main id="view"></main>
    <nav class="tabs">
      <button data-tab="steamer" class="tab" aria-label="Steamer"><span class="ico">🥟</span>Steamer</button>
      <button data-tab="garden" class="tab" aria-label="Garden"><span class="ico">🥕</span>Garden</button>
      <button data-tab="kitchen" class="tab" aria-label="Kitchen"><span class="ico">🍲</span>Kitchen</button>
      <button data-tab="shop" class="tab" aria-label="Shop"><span class="ico">🛍️</span>Shop</button>
    </nav>
    <div id="toasts"></div>`;
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; sfx.pop(); render(true); }));
  $('#name').addEventListener('click', renameDialog);
}

function render(force = false) {
  $('#coins').textContent = state.coins;
  $('#name').textContent = state.piggy.name;
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const view = $('#view');
  if (force || view.dataset.tab !== tab) {
    view.dataset.tab = tab;
    view.innerHTML = '';
    view.appendChild({ steamer: steamerView, garden: gardenView, kitchen: kitchenView, shop: shopView }[tab]());
  }
  ({ steamer: updateSteamer, garden: updateGarden, kitchen: updateKitchen, shop: updateShop }[tab])();
}

// ---------- Steamer ----------
function steamerView() {
  const v = el(`<section class="steamer">
    <div class="needs">
      <div class="need" data-need="hunger"><span>🍽️</span><div class="bar"><i></i></div></div>
      <div class="need" data-need="fun"><span>🎉</span><div class="bar"><i></i></div></div>
      <div class="need" data-need="clean"><span>🧹</span><div class="bar"><i></i></div></div>
    </div>
    <div class="stage" id="stage">
      <div class="steam s1"></div><div class="steam s2"></div><div class="steam s3"></div>
      <div class="piggy" id="piggy" role="button" aria-label="Pet your piggy" tabindex="0"></div>
      <div class="poops" id="poops"></div>
      <div class="basket"></div>
    </div>
    <div class="tray" id="tray"></div>
  </section>`);
  const piggy = $('#piggy', v);
  piggy.addEventListener('click', onPet);
  piggy.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onPet(); });
  return v;
}

function updateSteamer() {
  const p = state.piggy;
  $('[data-need="hunger"] i').style.width = p.hunger + '%';
  $('[data-need="fun"] i').style.width = p.fun + '%';
  $('[data-need="clean"] i').style.width = Math.max(0, 100 - state.poops.length / G.MAX_POOPS * 100) + '%';
  renderPiggy();
  // Poops
  const poops = $('#poops');
  const have = new Set([...poops.children].map(c => +c.dataset.id));
  for (const poop of state.poops) {
    if (!have.has(poop.id)) {
      const b = el(`<button class="poop" data-id="${poop.id}" aria-label="Scoop the poop" style="left:${poop.x * 100}%;top:${poop.y * 100}%">${Art.poop()}</button>`);
      b.addEventListener('click', () => onScoop(poop.id, b));
      poops.appendChild(b);
    }
  }
  for (const c of [...poops.children]) if (!state.poops.find(p => p.id === +c.dataset.id)) c.remove();
  // Dumpling tray
  const tray = $('#tray');
  const keys = Object.keys(state.dumplings).filter(k => state.dumplings[k] > 0);
  const sig = keys.map(k => k + state.dumplings[k]).join('|');
  if (tray.dataset.sig !== sig) {
    tray.dataset.sig = sig;
    tray.innerHTML = keys.length ? '' : `<p class="hint">No dumplings yet. Cook some in the Kitchen!</p>`;
    for (const k of keys) {
      const b = el(`<button class="dump" aria-label="Feed ${G.RECIPES[k].name}">${Art.dumpling(k, 56)}<b>${state.dumplings[k]}</b></button>`);
      b.addEventListener('click', () => onFeed(k, b));
      tray.appendChild(b);
    }
  }
}

function renderPiggy() {
  const piggy = $('#piggy');
  if (!piggy) return;
  const m = G.mood(state);
  const face = m + (state.upgrades.hat ? '+hat' : '') + (state.piggy.effect || '');
  if (face !== lastFace || !piggy.firstChild) {
    lastFace = face;
    piggy.innerHTML = Art.piggySide({ hat: !!state.upgrades.hat, mood: m });
  }
  piggy.className = 'piggy ' + (state.piggy.effect || '') + ' mood-' + m;
}

function onPet() {
  const r = G.pet(state);
  const piggy = $('#piggy');
  piggy.classList.remove('hop'); void piggy.offsetWidth; piggy.classList.add('hop');
  sfx.wheek();
  bubble(piggy, 'wheek!');
  if (r.coins) floatCoin();
  render();
}

function onFeed(key, btn) {
  const r = G.feed(state, key);
  if (!r.ok) { sfx.nope(); toast(r.reason === 'full' ? `${state.piggy.name} is full!` : 'None left'); return; }
  sfx.munch();
  const piggy = $('#piggy');
  bubble(piggy, 'nom!');
  piggy.classList.remove('munch'); void piggy.offsetWidth; piggy.classList.add('munch');
  floatCoin(r.coins);
  if (r.effect) { lastFace = ''; setTimeout(() => sfx.ding(), 300); }
  render();
}

function onScoop(id, btn) {
  const r = G.scoop(state, id);
  if (!r.ok) return;
  sfx.pop();
  btn.classList.add('gone');
  setTimeout(() => btn.remove(), 250);
  floatCoin(r.coins);
  render();
}

// ---------- Garden ----------
function gardenView() {
  const v = el(`<section class="garden">
    <div class="compost"><span class="ico">${Art.compostIcon()}</span><span>Compost: <b id="compost">0</b></span><small>Scoop poop to get more</small></div>
    <div class="plots" id="plots"></div>
    <h2>Pantry</h2>
    <div class="pantry" id="pantry"></div>
  </section>`);
  return v;
}

function updateGarden() {
  $('#compost').textContent = state.compost;
  const plots = $('#plots');
  const n = G.plotCount(state);
  if (plots.children.length !== n) {
    plots.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = el(`<button class="plot" data-plot="${i}"><div class="soil"></div><div class="plant"></div><div class="ring"><i></i></div><span class="lbl"></span></button>`);
      b.addEventListener('click', () => onPlot(i));
      plots.appendChild(b);
    }
  }
  for (let i = 0; i < n; i++) {
    const b = plots.children[i];
    const g = state.garden[i];
    const prog = G.plantProgress(state, i);
    $('.plant', b).innerHTML = g ? Art.sprout(prog, g.filling) : '';
    $('.ring i', b).style.width = (prog * 100) + '%';
    $('.ring', b).style.visibility = g && prog < 1 ? 'visible' : 'hidden';
    $('.lbl', b).textContent = !g ? 'Plant' : prog >= 1 ? 'Harvest!' : G.FILLINGS[g.filling].name;
    b.classList.toggle('ready', !!g && prog >= 1);
    b.classList.toggle('empty', !g);
  }
  const pantry = $('#pantry');
  const psig = JSON.stringify(state.pantry);
  if (pantry.dataset.sig === psig) return;
  pantry.dataset.sig = psig;
  pantry.innerHTML = '';
  for (const f of Object.keys(G.FILLINGS)) {
    pantry.appendChild(el(`<div class="pitem">${Art.veggie(f, 44)}<b>${state.pantry[f] || 0}</b><span>${G.FILLINGS[f].name}</span></div>`));
  }
}

function onPlot(i) {
  const g = state.garden[i];
  if (g) {
    const r = G.harvest(state, i);
    if (r.ok) { sfx.coin(); toast(`+2 ${G.FILLINGS[r.filling].name}`); floatCoin(1); render(); }
    else { sfx.pop(); toast('Still growing...'); }
    return;
  }
  if (state.compost < 1) { sfx.nope(); toast('You need compost. Scoop some poop first!'); return; }
  picker('What should we plant?', Object.keys(G.FILLINGS).map(f => ({ id: f, html: Art.veggie(f, 48), label: G.FILLINGS[f].name })), (f) => {
    const r = G.plant(state, i, f);
    if (r.ok) { sfx.pop(); render(); }
  });
}

// ---------- Kitchen ----------
function kitchenView() {
  const v = el(`<section class="kitchen">
    <div class="pot">
      <div class="slots"><div class="slot" data-slot="0"></div><span class="plus">+</span><div class="slot" data-slot="1"></div></div>
      <button class="steam-btn" id="cook">Steam it!</button>
    </div>
    <div class="fillings" id="fillings"></div>
    <h2>Recipe book <small id="rcount"></small></h2>
    <div class="book" id="book"></div>
  </section>`);
  $('#cook', v).addEventListener('click', onCook);
  document.querySelectorAll('.slot', v).forEach(s => s.addEventListener('click', () => { selected.splice(+s.dataset.slot, 1); render(); }));
  return v;
}

function updateKitchen() {
  const slots = document.querySelectorAll('.slot');
  slots.forEach((s, i) => { s.innerHTML = selected[i] ? Art.veggie(selected[i], 48) : ''; s.classList.toggle('filled', !!selected[i]); });
  $('#cook').disabled = selected.length < 2;
  const fl = $('#fillings');
  const fsig = JSON.stringify([state.pantry, selected]);
  if (fl.dataset.sig === fsig) { /* unchanged */ } else {
  fl.dataset.sig = fsig;
  fl.innerHTML = '';
  for (const f of Object.keys(G.FILLINGS)) {
    const have = (state.pantry[f] || 0) - selected.filter(x => x === f).length;
    const b = el(`<button class="fill" ${have < 1 ? 'disabled' : ''}>${Art.veggie(f, 44)}<b>${Math.max(0, have)}</b></button>`);
    b.addEventListener('click', () => { if (selected.length < 2) { selected.push(f); sfx.pop(); render(); } });
    fl.appendChild(b);
  }
  }
  const keys = Object.keys(G.RECIPES);
  $('#rcount').textContent = `${state.discovered.length} / ${keys.length}`;
  const book = $('#book');
  if (book.dataset.sig === String(state.discovered.length)) return;
  book.dataset.sig = String(state.discovered.length);
  book.innerHTML = '';
  for (const k of keys) {
    const found = state.discovered.includes(k);
    book.appendChild(el(`<div class="recipe ${found ? '' : 'unknown'}">${found ? Art.dumpling(k, 44) : '<span class="q">?</span>'}<span>${found ? G.RECIPES[k].name : '???'}</span></div>`));
  }
}

function onCook() {
  if (selected.length < 2) return;
  const r = G.cook(state, selected[0], selected[1]);
  selected = [];
  if (!r.ok) { sfx.nope(); toast('Not enough fillings'); render(); return; }
  const pot = $('.pot');
  pot.classList.remove('cooking'); void pot.offsetWidth; pot.classList.add('cooking');
  setTimeout(() => {
    if (r.isNew) { sfx.fanfare(); toast(`New recipe: ${r.recipe.name}! +10 coins`, 'big'); floatCoin(10); }
    else { sfx.ding(); toast(`Made a ${r.recipe.name}`); }
    render();
  }, 900);
}

// ---------- Shop ----------
function shopView() {
  return el(`<section class="shop"><div id="items"></div>
    <button class="reset" id="reset">Start over</button></section>`);
}

function updateShop() {
  const items = $('#items');
  const ssig = JSON.stringify([state.upgrades, state.coins]);
  if (items.dataset.sig === ssig) return;
  items.dataset.sig = ssig;
  items.innerHTML = '';
  for (const [id, u] of Object.entries(G.UPGRADES)) {
    const owned = !!state.upgrades[id];
    const b = el(`<button class="item ${owned ? 'owned' : ''}" ${owned ? 'disabled' : ''}>
      <span class="ico">${Art.upgradeIcon(u.icon)}</span>
      <span class="txt"><b>${u.name}</b><small>${u.desc}</small></span>
      <span class="price">${owned ? 'Got it!' : `${u.cost} 🪙`}</span></button>`);
    b.addEventListener('click', () => {
      const r = G.buy(state, id);
      if (!r.ok) { sfx.nope(); toast(`Need ${u.cost - state.coins} more coins`); return; }
      sfx.fanfare(); lastFace = ''; toast(`Bought ${u.name}!`, 'big'); render(true);
    });
    items.appendChild(b);
  }
  $('#reset').onclick = () => {
    confirmBox('Start over with a brand new piggy? Everything will be gone.', () => { wipe(); location.reload(); });
  };
}

// ---------- Dialogs & effects ----------
function renameDialog() {
  const box = el(`<div class="modal"><div class="card">
    <h3>Rename your piggy</h3>
    <p>Costs ${G.RENAME_COST} coins. You have ${state.coins}.</p>
    <input id="newname" maxlength="16" placeholder="${state.piggy.name}" autocomplete="off">
    <div class="row"><button class="ghost" id="cancel">Cancel</button><button id="ok">Rename</button></div>
  </div></div>`);
  document.body.appendChild(box);
  $('#cancel', box).onclick = () => box.remove();
  $('#ok', box).onclick = () => {
    const r = G.rename(state, $('#newname', box).value);
    if (!r.ok) { sfx.nope(); toast(r.reason === 'coins' ? 'Not enough coins yet' : 'Type a name first'); return; }
    sfx.fanfare(); box.remove(); render(); toast(`Hello, ${state.piggy.name}!`, 'big');
  };
  setTimeout(() => $('#newname', box).focus(), 50);
}

function picker(title, options, onPick) {
  const box = el(`<div class="modal"><div class="card"><h3>${title}</h3><div class="opts"></div><button class="ghost">Cancel</button></div></div>`);
  for (const o of options) {
    const b = el(`<button class="opt">${o.html}<span>${o.label}</span></button>`);
    b.onclick = () => { box.remove(); onPick(o.id); };
    $('.opts', box).appendChild(b);
  }
  $('.ghost', box).onclick = () => box.remove();
  document.body.appendChild(box);
}

function confirmBox(text, onYes) {
  const box = el(`<div class="modal"><div class="card"><p>${text}</p><div class="row"><button class="ghost">No</button><button class="danger">Yes</button></div></div></div>`);
  $('.ghost', box).onclick = () => box.remove();
  $('.danger', box).onclick = () => { box.remove(); onYes(); };
  document.body.appendChild(box);
}

function toast(text, size = '') {
  const t = el(`<div class="toast ${size}">${text}</div>`);
  $('#toasts').appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, size ? 3200 : 1800);
}

function bubble(target, text) {
  const b = el(`<span class="bubble">${text}</span>`);
  target.appendChild(b);
  setTimeout(() => b.remove(), 900);
}

function floatCoin(n = 1) {
  const c = el(`<div class="fcoin">+${n} 🪙</div>`);
  c.style.left = (35 + Math.random() * 30) + '%';
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 1200);
}
