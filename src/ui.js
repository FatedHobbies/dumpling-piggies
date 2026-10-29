import * as G from './game.js';
import * as Art from './art.js';
import { load, save, wipe } from './save.js';
import { sfx } from './sound.js';
import * as M from './maze.js';

const VERSION = 15;
let state = null;
let wiped = false;          // after "Start over": never save the old state again
const persist = () => { if (!wiped) save(state); };
let tab = 'steamer';
let selected = [];          // fillings chosen in the kitchen
let selectedPig = null;     // id of the piggy whose name is in the HUD
let lastTick = Date.now();
let run = null;             // the maze run in progress, or null while building
let runTimer = null;
const wander = new Map();   // piggy id -> { tx, ty, pause, face }

const $ = (s, el = document) => el.querySelector(s);
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
const price = (cost) => `<span class="price ${state.coins >= cost ? 'can' : 'cant'}">${cost} <i class="coin-sm">${Art.coinIcon()}</i></span>`;
const esc = (s) => String(s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

export function start() {
  state = load();
  let welcome = null;
  if (!state) {
    state = G.newState();
    welcome = 'new';
  } else {
    G.migrate(state);
    welcome = G.applyAway(state);
  }
  if (!state.maze) state.maze = M.newMaze();
  selectedPig = state.piggies[0].id;
  buildShell();
  // Welcome popups go up before the first render so the tutorial's own popup waits its turn.
  if (welcome === 'new') {
    const p = state.piggies[0];
    popup('A new friend!', `<div class="pig-card big">${Art.piggySide({ coat: p.coat })}</div>
      <p>This is <b>${esc(p.name)}</b>. Feed them dumplings, pet them, and scoop their poop!</p>`, 'Hello!');
  } else if (welcome.away > 120) {
    const mins = Math.round(welcome.away / 60);
    const when = mins >= 120 ? `${Math.round(mins / 60)} hours` : `${mins} minutes`;
    popup('Welcome back!', `<p class="reward-time">You were away <b>${when}</b></p>
      <div class="reward-row"><span class="reward-item">${Art.coinIcon()} +${welcome.coins}</span>
      ${welcome.scooped ? `<span class="reward-item">${Art.compostIcon()} +${welcome.scooped}</span>` : ''}</div>`, 'Claim');
  }
  render();
  setInterval(loop, 1000);
  setInterval(wanderTick, 100);
  setInterval(positionArrow, 100);
  setInterval(persist, 5000);
  document.addEventListener('visibilitychange', () => { if (document.hidden) persist(); });
  window.addEventListener('pagehide', persist);
}

function loop() {
  const now = Date.now();
  const dt = Math.min((now - lastTick) / 1000, 60);
  lastTick = now;
  const events = G.tick(state, dt, now);
  for (const e of events) {
    if (e.type === 'coin') floatCoin();
    if (e.type === 'poop') sfx.plop();
  }
  render();
}

function current() {
  return G.piggy(state, selectedPig) || state.piggies[0];
}

function buildShell() {
  document.body.innerHTML = `
    <header class="hud">
      <button class="hud-pig" id="name" aria-label="Rename your piggy"><span class="hud-avatar" id="avatar"></span><span class="hud-name" id="pigname"></span></button>
      <div class="hud-coins"><span class="coin-ico">${Art.coinIcon()}</span><span id="coins">0</span></div>
    </header>
    <div id="coach" class="coach" hidden><span class="coach-pig" id="coachpig"></span><p id="coachtext"></p><button class="coach-skip" id="coachskip" aria-label="Skip tutorial">✕</button></div>
    <main id="view"></main>
    <nav class="tabs">
      <button data-tab="steamer" class="tab" aria-label="Pen"><span class="ico">🏠</span>Pen</button>
      <button data-tab="garden" class="tab" aria-label="Garden"><span class="ico">🥕</span>Garden</button>
      <button data-tab="kitchen" class="tab" aria-label="Kitchen"><span class="ico">🥟</span>Kitchen</button>
      <button data-tab="maze" class="tab" aria-label="Maze"><span class="ico">${Art.mazeIcon()}</span>Maze</button>
      <button data-tab="shop" class="tab" aria-label="Shop"><span class="ico">🛍️</span>Shop</button>
    </nav>
    <div id="toasts"></div>`;
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { if (tab === 'maze' && run) stopRun(); tab = b.dataset.tab; sfx.pop(); render(true); }));
  $('#name').addEventListener('click', renameDialog);
  $('#coachskip').addEventListener('click', () => confirmBox('Skip the tutorial?', () => { state.tutorial = { done: true }; render(); }));
}

// ---------- Tutorial ----------
// Each step waits for one action. `tab` is where it happens; the coach bar
// points there first if she is somewhere else.
const TUTORIAL = [
  null,
  { tab: 'steamer', on: 'pet',    text: n => `Tap ${n} to pet them!`, target: '.piggy' },
  { tab: 'steamer', on: 'feed',   text: n => `${n} is hungry! Tap the dumpling to feed them.`, target: '.dump' },
  { tab: 'steamer', on: 'scoop',  text: n => `Uh oh, a poop! Tap it to scoop it up.`, target: '.poop', enter: () => { if (!state.poops.length) G.addPoop(state); } },
  { tab: 'garden',  on: 'plant',  text: n => `Poop makes compost! Tap a plot to plant a veggie.`, target: '.plot.empty' },
  { tab: 'kitchen', on: 'cook',   text: n => `Pick two veggies, then tap Steam it!`, target: () => selected.length < 2 ? '.fill:not(:disabled)' : '#cook' },
  { tab: 'maze',    on: 'maze',   text: n => `Tap Go! and watch ${n} run. Tap ${n} to cheer!`, target: () => run ? '#mpig' : '.go' },
  { tab: null,      on: 'rename', text: n => `You earned ${G.RENAME_COST} coins! Tap ${n}'s name up top to rename them.`, target: '#name' },
];
const TAB_NAMES = { steamer: 'Pen', garden: 'Garden', kitchen: 'Kitchen', maze: 'Maze', shop: 'Shop' };

function tutStep() {
  const t = state.tutorial;
  return t && !t.done && TUTORIAL[t.step] ? t.step : 0;
}

// Called by the game actions. Advances when the action is the one awaited.
function tut(action) {
  const i = tutStep();
  if (!i || TUTORIAL[i].on !== action) return;
  state.tutorial.step += 1;
  const next = TUTORIAL[state.tutorial.step];
  if (!next) { state.tutorial = { done: true }; save(state); sfx.fanfare(); popup('Piggy pro!', `<div class="pig-card">${Art.piggySide({ coat: current().coat })}</div><p>You know everything ${esc(current().name)} needs. Have fun!</p>`, 'Yay!'); return; }
  if (next.on === 'rename') {
    state.coins += G.RENAME_COST;
    sfx.fanfare();
    popup('You did it!', `<div class="reward-row"><span class="reward-item">${Art.coinIcon()} +${G.RENAME_COST}</span></div><p>Enough coins to give ${esc(current().name)} a new name, or save them for the shop!</p>`, 'Yay!');
  } else sfx.ding();
  if (next.enter) next.enter();
  save(state);
}

let tutShown = '';   // which instruction popup has been shown, so it shows once per step
let arrowTarget = ''; // selector the bouncing arrow points at

function updateCoach() {
  const coach = $('#coach');
  const i = tutStep();
  document.querySelectorAll('.hi').forEach(e => e.classList.remove('hi'));
  if (!i) { coach.hidden = true; arrowTarget = ''; positionArrow(); return; }
  const step = TUTORIAL[i];
  const n = esc(current().name);
  coach.hidden = false;
  if ($('#coachpig').dataset.id !== String(current().id)) { $('#coachpig').dataset.id = String(current().id); $('#coachpig').innerHTML = Art.piggySide({ coat: current().coat }); }
  let text, targets, key;
  if (step.tab && tab !== step.tab) { text = `Go to the ${TAB_NAMES[step.tab]}!`; targets = `.tab[data-tab="${step.tab}"]`; key = i + ':go'; }
  else { text = step.text(n); targets = typeof step.target === 'function' ? step.target() : step.target; key = i + ':do'; }
  if ($('#coachtext').textContent !== text) $('#coachtext').textContent = text;
  document.querySelectorAll(targets).forEach(e => e.classList.add('hi'));
  arrowTarget = targets;
  positionArrow();
  // The instruction pops up in the middle of the screen once per step, after
  // any other popup has been closed.
  if (tutShown !== key && !$('.modal')) {
    tutShown = key;
    popup(`Step ${i} of ${TUTORIAL.length - 1}`, `<div class="pig-card">${Art.piggySide({ coat: current().coat })}</div><p class="tut-text">${text}</p>`, 'OK!');
  }
}

// A big bouncing arrow over whatever she should tap next. Targets move
// (the piggy wanders), so this runs on a timer too.
function positionArrow() {
  let arrow = $('#arrow');
  if (!arrow) {
    arrow = el(`<div id="arrow" class="tut-arrow" hidden><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 60 L8 30 H22 V6 H42 V30 H56Z" fill="#FFD34D" stroke="#B2342C" stroke-width="4" stroke-linejoin="round"/></svg></div>`);
    document.body.appendChild(arrow);
  }
  const t = arrowTarget && !$('.modal') ? $(arrowTarget) : null;
  if (!t) { arrow.hidden = true; return; }
  const r = t.getBoundingClientRect();
  if (!r.width) { arrow.hidden = true; return; }
  const up = r.top < 90;   // things near the top get an arrow pointing up from below
  arrow.hidden = false;
  arrow.classList.toggle('up', up);
  const x = r.left + r.width / 2, y = up ? r.bottom + 6 : r.top - 10;
  if (arrow.dataset.pos !== `${Math.round(x)},${Math.round(y)}`) { arrow.dataset.pos = `${Math.round(x)},${Math.round(y)}`; arrow.style.left = x + 'px'; arrow.style.top = y + 'px'; }
}

function render(force = false) {
  const p = current();
  $('#coins').textContent = state.coins;
  $('#pigname').textContent = p.name;
  const av = $('#avatar');
  const asig = p.id + JSON.stringify(p.coat) + (p.hat || '');
  if (av.dataset.sig !== asig) { av.dataset.sig = asig; av.innerHTML = Art.piggySide({ coat: p.coat, hat: p.hat }); }
  document.querySelectorAll('.tab').forEach(b => b.classList.toggle('active', b.dataset.tab === tab));
  const view = $('#view');
  if (force || view.dataset.tab !== tab) {
    view.dataset.tab = tab;
    view.innerHTML = '';
    view.appendChild({ steamer: steamerView, garden: gardenView, kitchen: kitchenView, maze: mazeView, shop: shopView }[tab]());
  }
  ({ steamer: updateSteamer, garden: updateGarden, kitchen: updateKitchen, maze: updateMaze, shop: updateShop }[tab])();
  updateCoach();
}

// ---------- Pen ----------
function steamerView() {
  const v = el(`<section class="pen">
    <div class="needs panel-dark">
      <div class="need" data-need="hunger"><span>🍽️</span><div class="bar"><i></i></div></div>
      <div class="need" data-need="fun"><span>🎉</span><div class="bar"><i></i></div></div>
      <div class="need" data-need="clean"><span>🧹</span><div class="bar"><i></i></div></div>
    </div>
    <div class="stage" id="stage">
      ${Art.penScene()}
      <div class="floor" id="floor"></div>
      <span class="pen-count" id="pencount"></span>
      <button class="book-btn" id="poopbook" aria-label="Poop Book">${Art.poop({ shape: 'swirl', color: 'brown' })}<span>Poop Book</span></button>
    </div>
    <div class="tray panel" id="tray"></div>
  </section>`);
  return v;
}

function updateSteamer() {
  const p = current();
  $('#poopbook').onclick = poopBook;
  $('[data-need="hunger"] i').style.width = p.hunger + '%';
  $('[data-need="fun"] i').style.width = p.fun + '%';
  $('[data-need="clean"] i').style.width = Math.max(0, 100 - state.poops.length / G.MAX_POOPS * 100) + '%';
  $('#pencount').textContent = `${state.piggies.length} / ${G.capacity(state)} piggies`;
  const floor = $('#floor');
  // Piggies
  const have = new Map([...floor.querySelectorAll('.piggy')].map(c => [+c.dataset.id, c]));
  for (const pig of state.piggies) {
    let d = have.get(pig.id);
    if (!d) {
      d = el(`<div class="piggy" data-id="${pig.id}" role="button" tabindex="0" aria-label="Pet ${esc(pig.name)}"><span class="need-bubble"></span><div class="pig-art"></div><span class="tag"></span></div>`);
      d.addEventListener('click', () => onPet(pig.id));
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onPet(pig.id); });
      floor.appendChild(d);
    }
    have.delete(pig.id);
    const m = G.mood(state, pig);
    const face = m + JSON.stringify(pig.coat) + (pig.hat || '');
    if (d.dataset.face !== face) { d.dataset.face = face; $('.pig-art', d).innerHTML = Art.piggySide({ coat: pig.coat, hat: pig.hat, mood: m }); }
    $('.tag', d).textContent = pig.name;
    $('.need-bubble', d).textContent = pig.hunger < 25 ? '🍽️' : pig.fun < 25 ? '🎉' : '';
    const w = wander.get(pig.id);
    d.classList.toggle('mood-' + m, true);
    for (const c of [...d.classList]) if (c.startsWith('mood-') && c !== 'mood-' + m) d.classList.remove(c);
    for (const c of ['sparkle', 'sleepy', 'zoom']) d.classList.toggle(c, pig.effect === c);
    d.classList.toggle('selected', pig.id === selectedPig);
    placePig(d, pig, w);
  }
  for (const [, c] of have) c.remove();
  // Poops
  const poops = new Map([...floor.querySelectorAll('.poop')].map(c => [+c.dataset.id, c]));
  for (const poop of state.poops) {
    if (!poops.has(poop.id)) {
      const b = el(`<button class="poop ${poop.color || 'brown'}" data-id="${poop.id}" aria-label="Scoop the poop" style="--x:${poop.x};--y:${poop.y}">${Art.poop(poop)}</button>`);
      b.addEventListener('click', () => onScoop(poop.id, b));
      floor.appendChild(b);
    }
    poops.delete(poop.id);
  }
  for (const [, c] of poops) c.remove();
  // Dumpling tray
  const tray = $('#tray');
  const keys = Object.keys(state.dumplings).filter(k => state.dumplings[k] > 0);
  const sig = keys.map(k => k + state.dumplings[k]).join('|');
  if (tray.dataset.sig !== sig) {
    tray.dataset.sig = sig;
    tray.innerHTML = keys.length ? '' : `<p class="hint">No dumplings yet. Cook some in the Kitchen!</p>`;
    for (const k of keys) {
      const b = el(`<button class="dump tile" aria-label="Feed ${G.RECIPES[k].name}">${Art.dumpling(k, 52)}<b class="count">${state.dumplings[k]}</b></button>`);
      b.addEventListener('click', () => onFeed(k));
      tray.appendChild(b);
    }
  }
}

function placePig(d, pig, w) {
  d.style.setProperty('--x', pig.x.toFixed(3));
  d.style.setProperty('--y', pig.y.toFixed(3));
  d.style.setProperty('--s', (0.62 + pig.y * 0.38).toFixed(3));
  d.style.setProperty('--f', w && w.face < 0 ? -1 : 1);
  d.style.zIndex = Math.round(pig.y * 100) + 10;
}

// Every 100ms each piggy drifts toward a random spot on the floor, pauses, and
// picks a new one. Positions live in the state so they survive tab switches.
function wanderTick() {
  if (tab !== 'steamer' || document.hidden) return;
  const now = Date.now();
  for (const pig of state.piggies) {
    let w = wander.get(pig.id);
    if (!w) { w = { tx: pig.x, ty: pig.y, pause: now + Math.random() * 2000, face: pig.x < 0.5 ? 1 : -1 }; wander.set(pig.id, w); }
    const sleepy = pig.effect === 'sleepy';
    const zoom = pig.effect === 'zoom';
    const d = $(`.piggy[data-id="${pig.id}"]`);
    if (sleepy || now < w.pause) { if (d) d.classList.remove('walking'); continue; }
    const dx = w.tx - pig.x, dy = w.ty - pig.y;
    const dist = Math.hypot(dx, dy);
    const speed = zoom ? 0.09 : 0.018;
    if (dist < speed) {
      pig.x = w.tx; pig.y = w.ty;
      w.pause = now + 1500 + Math.random() * (zoom ? 500 : 4000);
      w.tx = 0.08 + Math.random() * 0.84; w.ty = Math.random();
      if (d) d.classList.remove('walking');
      continue;
    }
    pig.x += dx / dist * speed; pig.y += dy / dist * speed;
    if (Math.abs(dx) > 0.01) w.face = dx > 0 ? 1 : -1;
    if (d) { d.classList.add('walking'); placePig(d, pig, w); }
  }
}

function onPet(id) {
  selectedPig = id;
  const r = G.pet(state, id);
  const d = $(`.piggy[data-id="${id}"]`);
  if (d) { d.classList.remove('hop'); void d.offsetWidth; d.classList.add('hop'); bubble(d, 'wheek!'); }
  sfx.wheek();
  if (r.coins) floatCoin();
  tut('pet');
  render();
}

function onFeed(key) {
  const target = current();
  const r = G.feed(state, key, target.id);
  if (!r.ok) {
    sfx.nope();
    if (r.reason === 'full') {
      // The chosen piggy is full: offer it to whoever is hungriest instead.
      const h = G.hungriest(state);
      if (h.id !== target.id && h.hunger < 98) { selectedPig = h.id; return onFeed(key); }
      toast(`${esc(target.name)} is full!`);
    } else toast('None left');
    return;
  }
  sfx.munch();
  const d = $(`.piggy[data-id="${r.piggy.id}"]`);
  if (d) { bubble(d, 'nom!'); d.classList.remove('munch'); void d.offsetWidth; d.classList.add('munch'); }
  floatCoin(r.coins);
  if (r.effect) setTimeout(() => sfx.ding(), 300);
  tut('feed');
  render();
}

function onScoop(id, btn) {
  const r = G.scoop(state, id);
  if (!r.ok) return;
  sfx.pop();
  btn.classList.add('gone');
  setTimeout(() => btn.remove(), 250);
  floatCoin(r.coins);
  const c = r.poop.color;
  if (c === 'rainbow' || c === 'gold') {
    sfx.fanfare();
    popup(c === 'gold' ? 'A golden poop!' : 'A rainbow poop!', `<div class="pig-card poop-card">${Art.poop(r.poop)}</div><p>Wow! That's worth <b>${r.coins} coins</b> and <b>${r.compost} compost</b>.</p>`, 'Wow!');
  } else if (c !== 'brown') toast(`${G.POOP_COLORS[c]} poop! +${r.coins} coins`);
  tut('scoop');
  for (const a of G.checkAchievements(state)) {
    setTimeout(() => { sfx.fanfare(); floatCoin(a.coins); popup('Achievement!', `<div class="badge">${Art.badgeIcon()}</div><p><b>${a.name}</b><br>${a.desc}<br>+${a.coins} coins</p>`, 'Nice!'); }, 400);
  }
  render();
}

// ---------- Garden ----------
function gardenView() {
  return el(`<section class="garden">
    <div class="scene-top">${Art.gardenScene({ coat: current().coat })}</div>
    <div class="compost panel"><span class="ico">${Art.compostIcon()}</span><span>Compost: <b id="compost">0</b></span><small>Scoop poop to get more</small></div>
    <div class="plots" id="plots"></div>
    <div class="ribbon"><span>Pantry</span></div>
    <div class="pantry" id="pantry"></div>
  </section>`);
}

function updateGarden() {
  $('#compost').textContent = state.compost;
  const plots = $('#plots');
  const n = G.plotCount(state);
  if (plots.children.length !== n) {
    plots.innerHTML = '';
    for (let i = 0; i < n; i++) {
      const b = el(`<button class="plot" data-plot="${i}">${Art.plotArt()}<div class="plant"></div><div class="gardener">${Art.piggySide({ coat: current().coat })}</div><div class="ring"><i></i></div><span class="lbl"></span></button>`);
      b.addEventListener('click', () => onPlot(i));
      plots.appendChild(b);
    }
  }
  for (let i = 0; i < n; i++) {
    const b = plots.children[i];
    const g = state.garden[i];
    const prog = G.plantProgress(state, i);
    const psig = g ? `${g.filling}:${Math.round(prog * 20)}` : '';
    if (b.dataset.sig !== psig) { b.dataset.sig = psig; $('.plant', b).innerHTML = g ? Art.sprout(prog, g.filling) : ''; }
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
    pantry.appendChild(el(`<div class="pitem tile">${Art.veggie(f, 44)}<b class="count">${state.pantry[f] || 0}</b><span>${G.FILLINGS[f].name}</span></div>`));
  }
}

function onPlot(i) {
  const plot = $(`.plot[data-plot="${i}"]`);
  if (plot && plot.classList.contains('busy')) return;
  const g = state.garden[i];
  if (g) {
    if (G.plantProgress(state, i) < 1) { sfx.pop(); toast('Still growing...'); return; }
    gardenerRun(i, () => {
      const r = G.harvest(state, i);
      if (r.ok) { sfx.coin(); toast(`+2 ${G.FILLINGS[r.filling].name}`); floatCoin(1); render(); }
    }, () => { const pl = $(`.plot[data-plot="${i}"] .plant`); if (pl) pl.classList.add('pulled'); });
    return;
  }
  if (state.compost < 1) { sfx.nope(); toast('You need compost. Scoop some poop first!'); return; }
  picker('What should we plant?', Object.keys(G.FILLINGS).map(f => ({ id: f, html: Art.veggie(f, 48), label: G.FILLINGS[f].name })), (f) => {
    gardenerRun(i, () => {
      const r = G.plant(state, i, f);
      if (r.ok) { sfx.pop(); tut('plant'); render(); }
    });
  });
}

// The piggy gardener trots into the plot, digs, and trots out. `onDig` fires
// mid-way (when the veggie gets pulled), `onDone` when the piggy has left.
function gardenerRun(i, onDone, onDig = null) {
  const plot = $(`.plot[data-plot="${i}"]`);
  if (!plot) return onDone();
  const g = $('.gardener', plot);
  plot.classList.add('busy');
  g.classList.remove('go'); void g.offsetWidth; g.classList.add('go');
  sfx.pop();
  setTimeout(() => { sfx.wheek(); if (onDig) onDig(); }, 900);
  setTimeout(() => { g.classList.remove('go'); plot.classList.remove('busy'); onDone(); }, 2000);
}

// ---------- Kitchen ----------
function kitchenView() {
  const v = el(`<section class="kitchen">
    <div class="kitchen-stage" id="kstage">${Art.kitchenScene({ coat: current().coat })}
      <div class="slots"><div class="slot" data-slot="0"></div><span class="plus">+</span><div class="slot" data-slot="1"></div></div>
      <button class="btn btn-red" id="cook">Steam it!</button>
    </div>
    <div class="fillings" id="fillings"></div>
    <div class="ribbon"><span>Recipe book <small id="rcount"></small></span></div>
    <div class="book panel" id="book"></div>
  </section>`);
  $('#cook', v).addEventListener('click', onCook);
  v.querySelectorAll('.slot').forEach(s => s.addEventListener('click', () => { selected.splice(+s.dataset.slot, 1); render(); }));
  return v;
}

function updateKitchen() {
  const slots = document.querySelectorAll('.slot');
  slots.forEach((s, i) => { s.innerHTML = selected[i] ? Art.veggie(selected[i], 48) : ''; s.classList.toggle('filled', !!selected[i]); });
  $('#cook').disabled = selected.length < 2;
  const fl = $('#fillings');
  const fsig = JSON.stringify([state.pantry, selected]);
  if (fl.dataset.sig !== fsig) {
    fl.dataset.sig = fsig;
    fl.innerHTML = '';
    for (const f of Object.keys(G.FILLINGS)) {
      const have = (state.pantry[f] || 0) - selected.filter(x => x === f).length;
      const b = el(`<button class="fill tile" ${have < 1 ? 'disabled' : ''}>${Art.veggie(f, 44)}<b class="count">${Math.max(0, have)}</b></button>`);
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
  const stage = $('#kstage');
  stage.classList.remove('cooking'); void stage.offsetWidth; stage.classList.add('cooking');
  sfx.pop();
  setTimeout(() => {
    stage.classList.remove('cooking');
    if (r.isNew) { sfx.fanfare(); popup('New recipe!', `<div class="pig-card">${Art.dumpling(r.key, 96)}</div><p><b>${r.recipe.name}</b><br>+10 coins for finding it</p>`, 'Yum!'); floatCoin(10); }
    else { sfx.ding(); toast(`Made a ${r.recipe.name}`); }
    tut('cook');
    render();
  }, 1500);
}

// ---------- Maze ----------
const CELL = 48;
function mazeView() {
  const w = M.COLS * CELL, h = M.ROWS * CELL;
  const v = el(`<section class="maze">
    <div class="maze-bar panel">
      <p class="maze-hint" id="mhint"></p>
      <div class="maze-btns" id="mbtns"></div>
    </div>
    <div class="maze-wrap">
      <svg id="mgrid" viewBox="-10 -10 ${w + 20} ${h + 20}" class="maze-svg">
        <rect x="-10" y="-10" width="${w + 20}" height="${h + 20}" rx="18" fill="#A7DB8C"/>
        <g id="mcells"></g>
        <g id="mfence"></g>
        <g id="mlure"></g>
        <g id="mfinish" transform="translate(${M.FINISH.x * CELL + CELL / 2} ${M.FINISH.y * CELL + CELL / 2})"></g>
        <g id="mpig" class="mpig"><g id="mrot" class="mpig-rot"></g></g>
      </svg>
    </div>
  </section>`);
  // SVG children must be created in the SVG namespace, so build them as markup.
  const cells = $('#mcells', v);
  let html = '';
  for (let y = 0; y < M.ROWS; y++) for (let x = 0; x < M.COLS; x++) {
    const px = x * CELL, py = y * CELL;
    html += `<g class="mcell" data-x="${x}" data-y="${y}">
      <rect class="floor" x="${px + 2}" y="${py + 2}" width="${CELL - 4}" height="${CELL - 4}" rx="8"/>
      <g class="bale"><rect x="${px + 3}" y="${py + 6}" width="${CELL - 6}" height="${CELL - 10}" rx="9" fill="#E6B566" stroke="#9C6A3A" stroke-width="3"/>
        <path d="M${px + 10} ${py + 14} h${CELL - 20} M${px + 10} ${py + 24} h${CELL - 20} M${px + 10} ${py + 34} h${CELL - 20}" stroke="#C98F4B" stroke-width="3" stroke-linecap="round"/>
        <path d="M${px + 16} ${py + 8} v${CELL - 14} M${px + CELL - 16} ${py + 8} v${CELL - 14}" stroke="#9C6A3A" stroke-width="2.5" opacity=".6"/></g>
    </g>`;
  }
  cells.innerHTML = html;
  cells.querySelectorAll('.mcell').forEach(r => r.addEventListener('click', () => onCell(+r.dataset.x, +r.dataset.y)));
  let fence = '';
  for (let x = -6; x <= w + 6; x += 48) fence += `<rect x="${x - 4}" y="-12" width="8" height="14" rx="3" fill="#C9935A" stroke="#8A5634" stroke-width="2"/><rect x="${x - 4}" y="${h - 2}" width="8" height="14" rx="3" fill="#C9935A" stroke="#8A5634" stroke-width="2"/>`;
  $('#mfence', v).innerHTML = fence;
  $('#mfinish', v).innerHTML = `<g transform="translate(-20 -20) scale(.62)">${Art.dumpling('cabbage+carrot', 64)}</g>`;
  $('#mrot', v).innerHTML = Art.piggyTop({ hat: current().hat, coat: current().coat });
  $('#mpig', v).addEventListener('click', onCheer);
  mazeAngle = 0;
  return v;
}

function updateMaze() {
  const m = state.maze;
  const grid = $('#mgrid');
  grid.classList.toggle('running', !!run);
  for (const r of document.querySelectorAll('.mcell')) {
    const x = +r.dataset.x, y = +r.dataset.y;
    r.classList.toggle('wall', M.isWall(m, x, y));
    r.classList.toggle('start', x === M.START.x && y === M.START.y);
    r.classList.toggle('seen', !!(run && run.visited[M.idx(x, y)]));
  }
  const lure = $('#mlure');
  const lsig = run && run.lure ? `${run.lure.x},${run.lure.y}` : '';
  if (lure.dataset.sig !== lsig) {
    lure.dataset.sig = lsig;
    lure.innerHTML = run && run.lure ? `<g transform="translate(${run.lure.x * CELL + 6} ${run.lure.y * CELL + 6}) scale(.56)">${Art.veggie('carrot', 64)}</g>` : '';
  }
  placeMazePig(run ? run.pos : M.START, run ? run.lastDir : null);
  const ok = M.solvable(m);
  const hint = $('#mhint'), btns = $('#mbtns');
  const name = esc(current().name);
  const bsig = run ? 'run' : ok ? 'ok' : 'blocked';
  if (run) hint.textContent = run.done ? 'Yay!' : `Tap a square to drop a carrot (${run.lures} left). Tap ${current().name} to cheer!`;
  else hint.textContent = ok ? 'Tap squares to build hay walls, then press Go!' : `${current().name} can't reach the dumpling. Open a path!`;
  if (btns.dataset.sig === bsig) return;
  btns.dataset.sig = bsig;
  btns.innerHTML = '';
  if (run) {
    btns.appendChild(btn('Stop', () => { stopRun(); render(); }, 'btn-grey'));
  } else {
    btns.appendChild(btn('Surprise me', () => { M.randomize(m); sfx.pop(); render(); }, 'btn-grey'));
    btns.appendChild(btn('Clear', () => { M.clear(m); sfx.pop(); render(); }, 'btn-grey'));
    const go = btn('Go!', startRun, 'btn-green go');
    go.disabled = !ok;
    btns.appendChild(go);
  }
}

function btn(label, onClick, cls = '') {
  const b = el(`<button class="btn ${cls}">${label}</button>`);
  b.addEventListener('click', onClick);
  return b;
}

let mazeAngle = 0;
// CSS transforms (not the SVG transform attribute) so the move between
// squares is animated. The turn always takes the short way round.
function placeMazePig(pos, dir) {
  const pig = $('#mpig');
  if (!pig) return;
  if (dir) {
    const target = Math.atan2(dir.y, dir.x) * 180 / Math.PI + 90;
    let d = ((target - mazeAngle) % 360 + 540) % 360 - 180;
    mazeAngle += d;
  } else if (!run) mazeAngle = 0;
  const zoom = run && Date.now() < run.zoomUntil;
  pig.style.transitionDuration = run ? (zoom ? '.17s' : '.52s') : '0s';
  pig.style.transform = `translate(${pos.x * CELL + CELL / 2}px, ${pos.y * CELL + CELL / 2}px)`;
  $('#mrot').style.transform = `rotate(${mazeAngle}deg) scale(.3)`;
}

function onCell(x, y) {
  if (run) {
    if (run.done) return;
    if (M.dropLure(state.maze, run, x, y)) { sfx.pop(); render(); }
    else sfx.nope();
    return;
  }
  if (M.toggleWall(state.maze, x, y)) { sfx.pop(); render(); }
}

function onCheer() {
  if (!run || run.done) { if (!run) startRun(); return; }
  M.cheer(run);
  sfx.wheek();
  const pig = $('#mpig');
  pig.classList.remove('cheer'); void pig.offsetWidth; pig.classList.add('cheer');
  render();
}

function startRun() {
  if (!M.solvable(state.maze)) return;
  run = M.newRun();
  sfx.ding();
  render();
  scheduleStep();
}

function scheduleStep() {
  clearTimeout(runTimer);
  if (!run || run.done) return;
  const zoom = Date.now() < run.zoomUntil;
  runTimer = setTimeout(() => {
    if (!run) return;
    let ev;
    try { ev = M.step(state.maze, run); } catch (e) { ev = 'finish'; run.done = true; run.pos = { ...M.FINISH }; }
    render();
    const pig = $('#mpig');
    if (ev === 'deadend') { sfx.wheek(); svgBubble('wheek?'); }
    if (ev === 'ate') { sfx.munch(); svgBubble('nom!'); const p = current(); p.fun = Math.min(100, p.fun + 5); }
    if (ev === 'finish') {
      const r = M.reward(state, state.maze, run);
      sfx.fanfare();
      pig.classList.add('popcorn');
      floatCoin(r.coins);
      toast(r.first ? `New maze finished! +${r.coins} coins` : `Dumpling! +${r.coins} coins`, 'big');
      setTimeout(() => { stopRun(); tut('maze'); render(); }, 2200);
      return;
    }
    scheduleStep();
  }, zoom ? 170 : 520);
}

function stopRun() {
  clearTimeout(runTimer);
  run = null;
  const pig = $('#mpig');
  if (pig) pig.classList.remove('popcorn');
}

function svgBubble(text) {
  const pig = $('#mpig');
  if (!pig) return;
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('class', 'mbubble'); t.setAttribute('x', '0'); t.setAttribute('y', '-110'); t.setAttribute('text-anchor', 'middle');
  t.textContent = text;
  pig.appendChild(t);
  setTimeout(() => t.remove(), 800);
}

// ---------- Shop ----------
function shopView() {
  return el(`<section class="shop">
    <div class="scene-top">${Art.shopScene()}</div>
    <div class="ribbon"><span>Adopt a piggy</span></div>
    <div class="adopt panel" id="adopt"></div>
    <div class="ribbon"><span>Hats</span></div>
    <div class="hats panel" id="hats"></div>
    <div class="ribbon"><span>Upgrades</span></div>
    <div id="items"></div>
    <div class="row center"><button class="btn btn-grey" id="replay">Replay tutorial</button></div>
    <button class="reset" id="reset">Start over</button>
    <p class="version">version ${VERSION}</p></section>`);
}

function updateShop() {
  const adopt = $('#adopt');
  const room = state.piggies.length < G.capacity(state);
  const cost = G.adoptCost(state);
  const offer = room ? G.makeOffer(state) : null;
  const asig = JSON.stringify([offer, cost, state.coins, room, state.piggies.length]);
  if (adopt.dataset.sig !== asig) {
    adopt.dataset.sig = asig;
    adopt.innerHTML = '';
    if (!room) {
      adopt.innerHTML = `<p class="hint">Your pen is full (${state.piggies.length} piggies). ${state.upgrades.pen3 ? 'That is all the piggies a home can hold!' : 'Buy a bigger pen below for more room.'}</p>`;
    } else {
      adopt.innerHTML = `<p class="hint">Pick one to join the family. Colors and names are a surprise!</p><div class="offers"></div>`;
      const box = $('.offers', adopt);
      offer.forEach((o, i) => {
        const b = el(`<button class="offer"><div class="pig-card">${Art.piggySide({ coat: o.coat })}</div><b>${esc(o.name)}</b><small>${G.BREEDS[o.coat.breed].name}</small><em>${G.BREEDS[o.coat.breed].blurb}</em>
          ${cost === 0 ? '<span class="price can">Free!</span>' : price(cost)}</button>`);
        b.addEventListener('click', () => {
          const r = G.adopt(state, i);
          if (!r.ok) { sfx.nope(); toast(r.reason === 'coins' ? `Need ${cost - state.coins} more coins` : 'No room in the pen'); return; }
          sfx.fanfare(); selectedPig = r.piggy.id;
          popup('Welcome home!', `<div class="pig-card big">${Art.piggySide({ coat: r.piggy.coat })}</div><p><b>${esc(r.piggy.name)}</b> the ${G.BREEDS[r.piggy.coat.breed].name} moved into the pen.</p>`, 'Yay!', () => { tab = 'steamer'; render(true); });
          render(true);
        });
        box.appendChild(b);
      });
    }
  }
  const hats = $('#hats');
  const p = current();
  const hsig = JSON.stringify([state.hats, state.coins, p.id, p.hat]);
  if (hats.dataset.sig !== hsig) {
    hats.dataset.sig = hsig;
    hats.innerHTML = `<p class="hint">Buy a hat once and any piggy can wear it. Tap a hat to put it on <b>${esc(p.name)}</b>.</p><div class="hat-grid"></div>`;
    const grid = $('.hat-grid', hats);
    for (const [id, h] of Object.entries(G.HATS)) {
      const owned = !!state.hats[id];
      const wearing = p.hat === id;
      const b = el(`<button class="hat tile ${owned ? 'owned' : ''} ${wearing ? 'wearing' : ''}">${Art.hatIcon(id)}<span>${h.name}</span>
        ${wearing ? '<span class="price can">Wearing</span>' : owned ? '<span class="price">Wear</span>' : price(h.cost)}</button>`);
      b.addEventListener('click', () => {
        if (!state.hats[id]) {
          const r = G.buyHat(state, id);
          if (!r.ok) { sfx.nope(); toast(`Need ${h.cost - state.coins} more coins`); return; }
          sfx.fanfare(); G.wearHat(state, p.id, id);
          popup('New hat!', `<div class="pig-card big">${Art.piggySide({ coat: p.coat, hat: id })}</div><p><b>${esc(p.name)}</b> is wearing the ${h.name}!</p>`, 'Cute!');
        } else {
          sfx.pop(); G.wearHat(state, p.id, wearing ? null : id);
          toast(wearing ? `${esc(p.name)} took off the ${h.name}` : `${esc(p.name)} put on the ${h.name}`);
        }
        render();
      });
      grid.appendChild(b);
    }
  }
  const items = $('#items');
  const ssig = JSON.stringify([state.upgrades, state.coins]);
  if (items.dataset.sig === ssig) return;
  items.dataset.sig = ssig;
  items.innerHTML = '';
  for (const [id, u] of Object.entries(G.UPGRADES)) {
    const owned = !!state.upgrades[id];
    if (!owned && !G.canBuy(state, id)) continue;
    const b = el(`<button class="item panel ${owned ? 'owned' : ''}" ${owned ? 'disabled' : ''}>
      <span class="tile-purple">${Art.upgradeIcon(u.icon)}</span>
      <span class="txt"><b>${u.name}</b><small>${u.desc}</small></span>
      ${owned ? '<span class="price can">Got it!</span>' : price(u.cost)}</button>`);
    b.addEventListener('click', () => {
      const r = G.buy(state, id);
      if (!r.ok) { sfx.nope(); toast(`Need ${u.cost - state.coins} more coins`); return; }
      sfx.fanfare(); toast(`Bought ${u.name}!`, 'big'); render(true);
    });
    items.appendChild(b);
  }
  $('#replay').onclick = () => {
    state.tutorial = { step: 1 };
    if (!(state.dumplings['carrot+carrot'] > 0)) state.dumplings['carrot+carrot'] = 1;
    if (state.compost < 1) state.compost = 1;
    tab = 'steamer'; sfx.ding(); render(true);
  };
  $('#reset').onclick = () => {
    confirmBox('Start over with a brand new piggy? Everything will be gone.', () => { wiped = true; wipe(); location.reload(); });
  };
}

function poopBook() {
  const book = state.poopBook || {};
  const kinds = G.poopKinds();
  const found = G.poopsFound(state);
  const grid = kinds.map(k => {
    const n = book[k.key] || 0;
    return `<div class="pk ${n ? '' : 'unknown'}">${n ? Art.poop(k) : Art.poopShadow(k)}<span>${n ? `${G.POOP_COLORS[k.color]} ${G.POOP_SHAPES[k.shape].toLowerCase()}` : '???'}</span><b class="count">${n ? n : '?'}</b></div>`;
  }).join('');
  const ach = G.ACHIEVEMENTS.map(a => {
    const got = !!(state.achievements || {})[a.id];
    return `<div class="ach ${got ? 'got' : ''}"><span class="badge">${got ? Art.badgeIcon() : Art.badgeIcon(true)}</span><span class="txt"><b>${a.name}</b><small>${a.desc}</small></span><span class="price ${got ? 'can' : ''}">${got ? 'Done!' : `${a.coins} <i class="coin-sm">${Art.coinIcon()}</i>`}</span></div>`;
  }).join('');
  popup(`Poop Book ${found} / ${kinds.length}`, `<p>Scoop every kind of poop to fill the book. Rare ones are worth more!</p>
    <div class="pk-grid">${grid}</div>
    <div class="ribbon"><span>Achievements</span></div>
    <div class="ach-list">${ach}</div>`, 'Close');
  sfx.pop();
}

// ---------- Dialogs & effects ----------
function renameDialog() {
  const p = current();
  const box = el(`<div class="modal"><div class="card panel">
    <div class="ribbon"><span>Rename</span></div>
    <div class="pig-card">${Art.piggySide({ coat: p.coat, hat: p.hat })}</div>
    <p>Costs ${G.RENAME_COST} coins. You have ${state.coins}.</p>
    <input id="newname" maxlength="16" placeholder="${esc(p.name)}" autocomplete="off">
    <div class="row"><button class="btn btn-grey" id="cancel">Cancel</button><button class="btn" id="ok">Rename</button></div>
  </div></div>`);
  document.body.appendChild(box);
  $('#cancel', box).onclick = () => box.remove();
  $('#ok', box).onclick = () => {
    const r = G.rename(state, p.id, $('#newname', box).value);
    if (!r.ok) { sfx.nope(); toast(r.reason === 'coins' ? 'Not enough coins yet' : 'Type a name first'); return; }
    sfx.fanfare(); box.remove(); tut('rename'); render(); toast(`Hello, ${esc(p.name)}!`, 'big');
  };
  setTimeout(() => $('#newname', box).focus(), 50);
}

// Popups show one at a time; extra ones wait their turn.
const popupQueue = [];
function popup(title, html, button = 'OK', onClose = null) {
  if ($('.modal')) { popupQueue.push([title, html, button, onClose]); return; }
  const box = el(`<div class="modal"><div class="card panel">
    <div class="ribbon"><span>${title}</span></div>${html}
    <div class="row center"><button class="btn big">${button}</button></div></div></div>`);
  $('.btn', box).onclick = () => {
    box.remove(); sfx.pop(); if (onClose) onClose();
    if (popupQueue.length) popup(...popupQueue.shift()); else updateCoach();
  };
  document.body.appendChild(box);
}

function picker(title, options, onPick) {
  const box = el(`<div class="modal"><div class="card panel"><div class="ribbon"><span>${title}</span></div><div class="opts"></div><div class="row center"><button class="btn btn-grey">Cancel</button></div></div></div>`);
  for (const o of options) {
    const b = el(`<button class="opt tile">${o.html}<span>${o.label}</span></button>`);
    b.onclick = () => { box.remove(); onPick(o.id); };
    $('.opts', box).appendChild(b);
  }
  $('.btn-grey', box).onclick = () => box.remove();
  document.body.appendChild(box);
}

function confirmBox(text, onYes) {
  const box = el(`<div class="modal"><div class="card panel"><p>${text}</p><div class="row center"><button class="btn btn-grey">No</button><button class="btn btn-red">Yes</button></div></div></div>`);
  $('.btn-grey', box).onclick = () => box.remove();
  $('.btn-red', box).onclick = () => { box.remove(); onYes(); };
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
  const c = el(`<div class="fcoin">+${n} <i class="coin-sm">${Art.coinIcon()}</i></div>`);
  c.style.left = (35 + Math.random() * 30) + '%';
  document.body.appendChild(c);
  setTimeout(() => c.remove(), 1200);
}
