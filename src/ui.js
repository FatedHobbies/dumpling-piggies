import * as G from './game.js';
import * as Art from './art.js';
import { load, save, wipe } from './save.js';
import { sfx, music } from './sound.js';
import * as M from './maze.js';

const VERSION = 52;
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
  music.init();
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
    if (e.type === 'toyGone') toyGone(e.id);
  }
  bookCheck();
  render();
}

function current() {
  return G.piggy(state, selectedPig) || state.piggies[0];
}

function buildShell() {
  document.body.innerHTML = `
    <header class="hud">
      <button class="hud-pig" id="name" aria-label="Rename your piggy"><span class="hud-avatar" id="avatar"></span><span class="hud-name" id="pigname"></span></button>
      <button class="hud-book" id="poopbook" aria-label="Poop Book">${Art.poop({ shape: 'swirl', color: 'brown' })}<span>Poop<br>Book</span><b class="book-count" id="bookcount" hidden></b></button>
      <button class="hud-music" id="music" aria-label="Music on or off"></button>
      <div class="hud-coins"><span class="coin-ico">${Art.coinIcon()}</span><span id="coins">0</span></div>
    </header>
    <div id="coach" class="coach" hidden><span class="coach-pig" id="coachpig"></span><p id="coachtext"></p><button class="coach-skip" id="coachskip" aria-label="Skip tutorial">✕</button></div>
    <main id="view"></main>
    <nav class="tabs">
      <button data-tab="steamer" class="tab" aria-label="Pen"><span class="ico">${Art.icon('pen')}</span>Pen</button>
      <button data-tab="garden" class="tab" aria-label="Garden"><span class="ico">${Art.icon('garden')}</span>Garden</button>
      <button data-tab="kitchen" class="tab" aria-label="Kitchen"><span class="ico">${Art.icon('kitchen')}</span>Kitchen</button>
      <button data-tab="maze" class="tab" aria-label="Maze"><span class="ico">${Art.mazeIcon()}</span>Maze</button>
      <button data-tab="shop" class="tab" aria-label="Shop"><span class="ico">${Art.icon('shop')}</span>Shop</button>
    </nav>
    <div id="toasts"></div>`;
  document.querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { if (tab === 'maze' && run) stopRun(); if (tab === 'shop' && b.dataset.tab === 'steamer') tut('home'); tab = b.dataset.tab; sfx.pop(); render(true); }));
  $('#name').addEventListener('click', renameDialog);
  $('#poopbook').addEventListener('click', poopBook);
  const musicBtn = $('#music');
  const showMusic = () => { musicBtn.innerHTML = Art.icon(music.on ? 'music' : 'mute'); musicBtn.classList.toggle('off', !music.on); };
  musicBtn.addEventListener('click', () => { music.toggle(); sfx.pop(); showMusic(); });
  showMusic();
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
  { tab: 'maze',    on: 'surprise', text: n => `Tap Surprise me to build a maze for ${n}! You can also tap squares to add hay walls.`, target: '.surprise' },
  { tab: 'maze',    on: 'maze',   text: n => `Tap Go! and watch ${n} run. Tap ${n} to cheer!`, target: () => run ? '#mpig' : '.go' },
  { tab: null,      on: 'rename', text: n => `You earned ${G.RENAME_COST} coins! Tap ${n}'s name up top to rename them.`, target: '#name' },
  // The shop is only shown: the arrow rests on her coins, then moves to the
  // Pen tab, and going home ends the tutorial.
  { tab: 'shop',    on: 'home',   text: n => `This is the Shop! Tap the tabs to find piggies, upgrades, hats and toys. Then tap the Pen to go home.`,
    enter: () => { shopLook = 0; }, target: () => !shopLook || Date.now() < shopLook ? '.hud-coins' : '.tab[data-tab="steamer"]', ok: () => { shopLook = Date.now() + 2500; setTimeout(render, 2600); } },
];
let shopLook = 0;   // until when the shop step's arrow points at the coins
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
    popup(`Step ${i} of ${TUTORIAL.length - 1}`, `<div class="pig-card">${Art.piggySide({ coat: current().coat })}</div><p class="tut-text">${text}</p>`, 'OK!', key.endsWith(':do') ? step.ok : null);
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
  $('#bookcount').hidden = !state.booksFilled;
  $('#bookcount').textContent = `★${state.booksFilled}`;
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
      <div class="need" data-need="hunger"><span class="need-ico">${Art.icon('hunger')}<small>Food</small></span><div class="bar"><i></i></div></div>
      <div class="need" data-need="fun"><span class="need-ico">${Art.icon('fun')}<small>Fun</small></span><div class="bar"><i></i></div></div>
      <div class="need" data-need="clean"><span class="need-ico">${Art.icon('clean')}<small>Clean</small></span><div class="bar"><i></i></div></div>
    </div>
    <div class="stage" id="stage">
      ${Art.penScene()}
      <div class="floor" id="floor">
        ${Object.entries(Art.PEN_FIXTURES).map(([id, f]) => { const y = fixtureY(f); return `<div class="fixture" data-fix="${id}" style="--x:${f.x / 400};--y:${y.toFixed(3)};--w:${f.box.split(' ')[2] / 4}%;z-index:${depth(y)}">${Art.penFixture(id)}</div>`; }).join('')}
        <button class="spot-hit" data-spot="bowl" aria-label="Food bowl" style="--x:${SPOTS.bowl.x};--y:${SPOTS.bowl.y}"></button>
        <button class="spot-hit" data-spot="bottle" aria-label="Water bottle" style="--x:${SPOTS.bottle.x};--y:${SPOTS.bottle.y}"></button>
      </div>
      <div class="faces" id="faces"></div>
      <span class="pen-count" id="pencount"></span>
    </div>
    <div class="tray panel" id="tray"></div>
  </section>`);
  for (const b of v.querySelectorAll('.spot-hit')) b.addEventListener('click', () => goToSpot(current(), b.dataset.spot));
  $('.fixture[data-fix="house"]', v).addEventListener('click', () => goToToy(current(), 'house'));
  return v;
}

function updateSteamer() {
  const p = current();
  $('[data-need="hunger"] i').style.width = p.hunger + '%';
  $('[data-need="fun"] i').style.width = p.fun + '%';
  $('[data-need="clean"] i').style.width = Math.max(0, 100 - state.poops.length / G.MAX_POOPS * 100) + '%';
  $('#pencount').textContent = `${state.piggies.length} / ${G.capacity(state)} piggies`;
  // Portrait row across the top of the window; tapping one picks that piggy.
  const faces = $('#faces');
  const fsig = state.piggies.map(g => g.id + JSON.stringify(g.coat) + (g.hat || '')).join('|');
  if (faces.dataset.sig !== fsig) {
    faces.dataset.sig = fsig;
    faces.innerHTML = '';
    for (const pig of state.piggies) {
      const b = el(`<button class="face" data-id="${pig.id}" aria-label="Pick ${esc(pig.name)}">${Art.piggyFace({ coat: pig.coat, hat: pig.hat })}</button>`);
      b.addEventListener('click', () => pickPig(pig.id));
      faces.appendChild(b);
    }
  }
  faces.querySelectorAll('.face').forEach(b => b.classList.toggle('on', +b.dataset.id === selectedPig));
  const floor = $('#floor');
  // Piggies
  const have = new Map([...floor.querySelectorAll('.piggy')].map(c => [+c.dataset.id, c]));
  for (const pig of state.piggies) {
    let d = have.get(pig.id);
    if (!d) {
      d = el(`<div class="piggy" data-id="${pig.id}" role="button" tabindex="0" aria-label="Pet ${esc(pig.name)}"><span class="pick-ring"></span><span class="pick-arrow"></span><span class="need-bubble"></span><div class="pig-art"></div><span class="peek-face"></span><span class="tag"></span></div>`);
      d.addEventListener('click', () => onPet(pig.id));
      d.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') onPet(pig.id); });
      floor.appendChild(d);
    }
    have.delete(pig.id);
    const m = G.mood(state, pig);
    const face = m + JSON.stringify(pig.coat) + (pig.hat || '');
    if (d.dataset.face !== face) {
      d.dataset.face = face;
      $('.pig-art', d).innerHTML = `<div class="pose side">${Art.piggySide({ coat: pig.coat, hat: pig.hat, mood: m })}</div><div class="pose front">${Art.piggyFront({ coat: pig.coat, hat: pig.hat })}</div>`;
      $('.peek-face', d).innerHTML = Art.piggyFace({ coat: pig.coat, hat: pig.hat });
    }
    $('.tag', d).textContent = pig.name;
    const need = pig.hunger < 25 ? 'hunger' : pig.fun < 25 ? 'fun' : '';
    const bub = $('.need-bubble', d);
    if (bub.dataset.need !== need) { bub.dataset.need = need; bub.innerHTML = need ? Art.icon(need) : ''; }
    const w = wander.get(pig.id);
    d.classList.toggle('mood-' + m, true);
    for (const c of [...d.classList]) if (c.startsWith('mood-') && c !== 'mood-' + m) d.classList.remove(c);
    for (const c of ['sparkle', 'sleepy', 'zoom']) d.classList.toggle(c, pig.effect === c);
    d.classList.toggle('selected', pig.id === selectedPig);
    syncPose(d, w);
    placePig(d, pig, w);
  }
  for (const [, c] of have) c.remove();
  // Toys sit on the floor; tapping one sends the picked piggy over to play.
  for (const [id, t] of Object.entries(G.TOYS)) {
    let d = $(`.toy[data-toy="${id}"]`, floor);
    if (state.toys[id] !== 'pen') { if (d) d.remove(); continue; }
    if (!d) {
      d = el(`<button class="toy" data-toy="${id}" aria-label="${t.name}" style="--x:${t.x};--y:${t.y};z-index:${depth(t.y)}"></button>`);
      d.addEventListener('click', () => { toyBounce(id); goToToy(current(), id); });
      floor.appendChild(d);
    }
    const left = t.chew ? Math.ceil(G.toyLeft(state, id) * 4) / 4 : 1;   // chews redraw a quarter at a time
    if (d.dataset.left !== String(left)) { d.dataset.left = left; d.innerHTML = Art.toyArt(id, left); }
  }
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
  // Surprise dumplings sit at the front of the tray.
  const rank = k => ({ secret: 0, super: 1, rare: 2, shiny: 3 }[G.dumplingInfo(k)?.tier] ?? 4);
  const keys = Object.keys(state.dumplings).filter(k => state.dumplings[k] > 0 && G.dumplingInfo(k)).sort((a, b) => rank(a) - rank(b));
  const sig = keys.map(k => k + state.dumplings[k]).join('|');
  if (tray.dataset.sig !== sig) {
    tray.dataset.sig = sig;
    tray.innerHTML = keys.length ? '' : `<p class="hint">No dumplings yet. Cook some in the Kitchen!</p>`;
    for (const k of keys) {
      const b = el(`<button class="dump tile ${rank(k) < 4 ? 'special' : ''}" aria-label="Feed ${G.dumplingInfo(k).name}">${Art.dumpling(k, 52)}<b class="count">${state.dumplings[k]}</b></button>`);
      b.addEventListener('click', () => onFeed(k));
      tray.appendChild(b);
    }
  }
}

function placePig(d, pig, w) {
  if (w && w.riding) return;   // the slide ride places the piggy itself
  d.style.setProperty('--x', pig.x.toFixed(3));
  d.style.setProperty('--y', pig.y.toFixed(3));
  d.style.setProperty('--s', (0.62 + pig.y * 0.38).toFixed(3));
  d.style.setProperty('--f', w && w.face < 0 ? -1 : 1);
  d.style.zIndex = depth(pig.y);
}

// Everything on the floor is stacked by how far down it stands, so a piggy
// further back walks behind a toy and one further forward walks in front.
function depth(y) { return Math.round(y * 100) + 10; }
function fixtureY(f) { return (f.y - 108) / 192; }   // the floor covers pen-scene y 108 to 300

function syncPose(d, w) {
  if (!d || !w) return;
  d.classList.toggle('front', !!w.front && !w.inside && !w.peek && !w.riding);
  d.classList.toggle('inside', !!w.inside);
  d.classList.toggle('peek', !!w.peek);
  if (w.peekW) d.style.setProperty('--pw', w.peekW);
}

// While peeking, only the face shows, sized to fit inside the doorway.
function peekSize(id, d) {
  const box = id === 'house' ? $('.fixture[data-fix="house"]') : $(`.toy[data-toy="${id}"]`);
  const s = parseFloat(d.style.getPropertyValue('--s')) || 1;
  if (!box || !d.offsetWidth) return '30%';
  return (box.offsetWidth * HIDES[id].doorW * 0.9 / (d.offsetWidth * s) * 100).toFixed(1) + '%';
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
    if (sleepy || now < w.pause) { if (d) { d.classList.remove('walking'); syncPose(d, w); } continue; }
    if (w.using) stopSpot(w, d);
    const dx = w.tx - pig.x, dy = w.ty - pig.y;
    const dist = Math.hypot(dx, dy);
    const speed = zoom ? 0.09 : 0.018;
    if (dist < speed) {
      pig.x = w.tx; pig.y = w.ty;
      w.pause = now + 1500 + Math.random() * (zoom ? 500 : 4000);
      w.front = false;
      if (w.toy) { const id = w.toy; w.toy = null; playAt(pig, id, d); continue; }
      if (w.spot) { useSpot(pig, w, d, now); continue; }
      w.front = Math.random() < 0.45;   // a resting piggy often turns to look at you
      const owned = G.toysInPen(state);
      const r = Math.random(), eat = pig.hunger < 50 ? 0.3 : 0.1;   // hungry piggies check the bowl more
      if (r < eat && !spotTaken('bowl', pig.id)) aimAtSpot(w, 'bowl');
      else if (r < eat + 0.1 && !spotTaken('bottle', pig.id)) aimAtSpot(w, 'bottle');
      else if (owned.length && Math.random() < 0.35) aimAtToy(w, owned[Math.floor(Math.random() * owned.length)]);
      else if (Math.random() < 0.25 && !hideTaken('house', pig.id)) aimAtToy(w, 'house');
      else { w.tx = 0.08 + Math.random() * 0.84; w.ty = Math.random(); }
      if (d) { d.classList.remove('walking'); syncPose(d, w); }
      continue;
    }
    pig.x += dx / dist * speed; pig.y += dy / dist * speed;
    if (Math.abs(dx) > 0.01) w.face = dx > 0 ? 1 : -1;
    w.front = dy > 0 && dy > Math.abs(dx) * 2;   // walking toward you, face first
    if (d) { d.classList.add('walking'); syncPose(d, w); placePig(d, pig, w); }
  }
}

// Piggies stand just beside a toy, on the side they happen to pick.
// Hidey places have a door to go in by (and the tunnel a far end to come out
// of), given as x in the toy picture (0 to 120 wide). The slide is climbed
// from the ladder. The pen's own house counts as a hidey place too.
const HIDES = { house: { door: 60, doorW: 0.5 }, hut: { door: 60, doorW: 0.3 }, tunnel: { door: 22, exit: 118, doorW: 0.28 } };

function toySpot(id) {
  if (id === 'house') { const f = Art.PEN_FIXTURES.house; return { x: f.x / 400, y: fixtureY(f) }; }
  return G.TOYS[id];
}

// Floor x of a point in a toy picture, from the toy's drawn size.
function toyX(id, px) {
  const t = toySpot(id);
  const el = id === 'house' ? $('.fixture[data-fix="house"]') : $(`.toy[data-toy="${id}"]`);
  const floor = $('#floor');
  const wide = id === 'house' ? 88 : 120;
  const frac = el && floor && floor.offsetWidth ? el.offsetWidth / floor.offsetWidth : 0.22;
  return t.x + (px - wide / 2) / wide * frac;
}

function hideTaken(id, pigId) {
  for (const [k, w] of wander) if (k !== pigId && (w.toy === id || w.hide === id)) return true;
  return false;
}

function aimAtToy(w, id) {
  const t = toySpot(id);
  w.toy = id;
  if (HIDES[id]) { w.tx = toyX(id, id === 'house' ? 44 : HIDES[id].door); w.ty = Math.min(1, t.y + 0.01); return; }
  if (id === 'slide') { w.tx = toyX(id, 20); w.ty = Math.min(1, t.y + 0.005); return; }
  w.tx = Math.min(0.92, Math.max(0.08, t.x + (Math.random() < 0.5 ? -0.13 : 0.13)));
  w.ty = Math.min(1, t.y + 0.02);
}

// The food bowl and water bottle are drawn in the pen scene. Piggies walk up,
// munch or sip for a few seconds, then wander off. One piggy at a time each.
const SPOTS = {
  bowl:   { x: 0.5, y: 0.93, side: 0.13, dy: -0.03, cls: 'eating',   say: ['Nom nom!', 'Crunch!', 'Yum!'] },
  bottle: { x: 0.93, y: 0.40, side: -0.13, dy: 0.13, cls: 'drinking', say: ['Slurp!', 'Sip sip!', 'Ahh!'] },
};

function spotTaken(id, pigId) {
  for (const [k, w] of wander) if (k !== pigId && (w.spot === id || w.using === id)) return true;
  return false;
}

function aimAtSpot(w, id) {
  const s = SPOTS[id];
  const side = id === 'bowl' && Math.random() < 0.5 ? -s.side : s.side;
  w.spot = id;
  w.tx = s.x + side; w.ty = s.y + s.dy;
}

function useSpot(pig, w, d, now) {
  const s = SPOTS[w.spot];
  w.using = w.spot; w.spot = null;
  w.face = s.x > pig.x ? 1 : -1;
  w.pause = now + 2600 + Math.random() * 1600;
  $('#stage')?.classList.add(s.cls);
  if (d) { placePig(d, pig, w); d.classList.remove('walking'); d.classList.add(s.cls); bubble(d, s.say[Math.floor(Math.random() * s.say.length)]); }
}

function stopSpot(w, d) {
  const cls = SPOTS[w.using].cls;
  w.using = null;
  $('#stage')?.classList.remove(cls);
  if (d) d.classList.remove(cls);
  w.pause = 0;
}

// Tapping the bowl or bottle sends the picked piggy over for a snack or a sip.
function goToSpot(pig, id) {
  const w = wander.get(pig.id);
  if (!w || spotTaken(id, pig.id)) return;
  if (w.using) stopSpot(w, $(`.piggy[data-id="${pig.id}"]`));
  w.toy = null;
  aimAtSpot(w, id);
  w.pause = 0;
}

function goToToy(pig, id) {
  const w = wander.get(pig.id);
  if (!w || w.hide || w.riding) return;
  if (w.using) stopSpot(w, $(`.piggy[data-id="${pig.id}"]`));
  w.spot = null;
  aimAtToy(w, id);
  w.pause = 0;
}

function toyBounce(id) {
  const d = $(`.toy[data-toy="${id}"]`);
  if (!d) return;
  d.classList.remove('play'); void d.offsetWidth; d.classList.add('play');
  setTimeout(() => d.classList.remove('play'), 1300);
}

function toyGone(id) {
  sfx.pop();
  toast(`The ${G.TOYS[id].name} got all eaten up! Get more in the Shop.`, 'big');
}

function playAt(pig, id, d) {
  if (id !== 'house' && state.toys[id] !== 'pen') return;
  const w = wander.get(pig.id);
  if (HIDES[id] && w) return hideIn(pig, id, w);
  toyBounce(id);
  if (G.playToy(state, pig.id, id).gone) toyGone(id);
  if (id === 'slide' && d && w) return rideSlide(pig, w, d);
  if (d) {
    const w = wander.get(pig.id);
    if (w) { w.face = G.TOYS[id].x > pig.x ? 1 : -1; placePig(d, pig, w); }
    d.classList.remove('hop'); void d.offsetWidth; d.classList.add('hop');
    setTimeout(() => d.classList.remove('hop'), 600);
    bubble(d, G.TOYS[id].chew ? 'Nom nom!' : ['Wheee!', 'Fun!', '♥', 'Wheek!'][Math.floor(Math.random() * 4)]);
  }
}

// The piggy squeezes in the door, sometimes peeks its face out, then pops
// back out (out the far end, for the tunnel).
function hideIn(pig, id, w) {
  const now = Date.now();
  const stay = 3500 + Math.random() * 2500;
  if (id !== 'house') { G.playToy(state, pig.id, id); toyBounce(id); }
  w.hide = id; w.inside = true; w.front = false;
  w.face = id === 'tunnel' ? 1 : w.face;
  w.pause = now + stay + 1200;
  const el = () => $(`.piggy[data-id="${pig.id}"]`);
  syncPose(el(), w);
  if (Math.random() < 0.6) {
    setTimeout(() => { const d = el(); if (w.hide !== id || !d) return; w.peekW = peekSize(id, d); w.inside = false; w.peek = true; syncPose(d, w); }, 1300 + Math.random() * 900);
    setTimeout(() => { if (w.hide !== id) return; w.peek = false; w.inside = true; syncPose(el(), w); }, 2600 + Math.random() * 400);
  }
  setTimeout(() => {
    if (w.hide !== id) return;
    if (HIDES[id].exit) { pig.x = Math.min(0.9, toyX(id, HIDES[id].exit)); w.tx = pig.x; w.ty = pig.y; }
    w.hide = null; w.inside = false; w.peek = false;
    const d = el();
    if (!d) return;
    syncPose(d, w); placePig(d, pig, w);
    d.classList.remove('hop'); void d.offsetWidth; d.classList.add('hop');
    setTimeout(() => d.classList.remove('hop'), 600);
    bubble(d, ['Peekaboo!', 'Wheek!', 'Boo!'][Math.floor(Math.random() * 3)]);
  }, stay);
}

// Wobble up the ladder, whoosh down the slide, land with a bounce. Points are
// in the slide picture (120 x 100); the piggy rides along at a smaller size.
const SLIDE_PATH = [
  [0, 20, 94, 0], [0.1, 22, 76, -9], [0.2, 23, 60, 9], [0.3, 24, 44, -9], [0.4, 26, 28, 7], [0.5, 30, 18, 0],
  [0.58, 42, 18, 0], [0.7, 66, 46, 36], [0.8, 92, 80, 26], [0.88, 110, 88, 0], [0.94, 120, 82, 0], [1, 126, 94, 0],
];
function rideSlide(pig, w, d) {
  const toy = $('.toy[data-toy="slide"]'), floor = $('#floor');
  if (!toy || !floor || !floor.offsetWidth) return;
  // Points in the slide picture become floor positions, so the ride uses the
  // same left/top placement as walking (no extra transforms to fight with).
  const fw = floor.offsetWidth, fh = floor.offsetHeight;
  const tw = toy.offsetWidth, th = toy.offsetHeight;
  const tl = G.TOYS.slide.x * fw - tw / 2, tt = G.TOYS.slide.y * fh - th * 0.94;
  const at = (px, py) => [(tl + px / 120 * tw) / fw, (tt + py / 100 * th) / fh];
  const ride = Math.min(0.6, tw / d.offsetWidth * 0.6);
  const path = SLIDE_PATH.map(([t, px, py, rot]) => [t, ...at(px, py), rot]);
  const dur = 3400, start = performance.now();
  w.riding = true; w.front = false; w.face = 1;
  w.pause = Date.now() + dur + 900;
  d.classList.remove('walking'); syncPose(d, w);
  setTimeout(() => bubble(d, 'Wheee!'), dur * 0.58);
  const step = (now) => {
    const k = Math.min(1, (now - start) / dur);
    let i = 0;
    while (i < path.length - 2 && path[i + 1][0] < k) i++;
    const [t0, x0, y0, r0] = path[i], [t1, x1, y1, r1] = path[i + 1];
    const f = Math.min(1, Math.max(0, (k - t0) / (t1 - t0)));
    const x = x0 + (x1 - x0) * f, y = y0 + (y1 - y0) * f, r = r0 + (r1 - r0) * f;
    const grow = k < 0.1 ? 1 - (1 - ride) * k / 0.1 : k > 0.94 ? ride + (1 - ride) * (k - 0.94) / 0.06 : ride;
    const cur = $(`.piggy[data-id="${pig.id}"]`);
    if (cur) {
      cur.classList.add('riding');
      cur.style.setProperty('--x', x.toFixed(4)); cur.style.setProperty('--y', y.toFixed(4));
      cur.style.setProperty('--s', ((0.62 + G.TOYS.slide.y * 0.38) * grow).toFixed(3));
      cur.style.setProperty('--f', 1); cur.style.setProperty('--r', r.toFixed(1) + 'deg');
      cur.style.zIndex = depth(G.TOYS.slide.y) + 1;
    }
    if (k < 1) { requestAnimationFrame(step); return; }
    pig.x = Math.min(0.95, x); pig.y = Math.min(1, Math.max(pig.y, y));
    w.tx = pig.x; w.ty = pig.y; w.riding = false;
    if (cur) { cur.classList.remove('riding'); cur.style.removeProperty('--r'); syncPose(cur, w); placePig(cur, pig, w); }
  };
  requestAnimationFrame(step);
}

function pickPig(id) {
  selectedPig = id;
  const d = $(`.piggy[data-id="${id}"]`);
  if (d) { d.classList.remove('hop'); void d.offsetWidth; d.classList.add('hop'); bubble(d, 'wheek!'); }
  sfx.wheek();
  render();
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
  if (c === 'rainbow' || c === 'gold' || c === 'crystal') {
    sfx.fanfare();
    popup(c === 'gold' ? 'A golden poop!' : c === 'crystal' ? 'A crystal poop!' : 'A rainbow poop!', `<div class="pig-card poop-card">${Art.poop(r.poop)}</div><p>Wow! That's worth <b>${r.coins} coins</b> and <b>${r.compost} compost</b>.</p>`, 'Wow!');
  } else if (c !== 'brown') toast(`${G.POOP_COLORS[c]} poop! +${r.coins} coins`);
  tut('scoop');
  for (const a of G.checkAchievements(state)) {
    setTimeout(() => { sfx.fanfare(); floatCoin(a.coins); popup('Achievement!', `<div class="badge">${Art.badgeIcon()}</div><p><b>${a.name}</b><br>${a.desc}<br>+${a.coins} coins</p>`, 'Nice!'); }, 400);
  }
  bookCheck(450);
  render();
}

// ---------- Garden ----------
function gardenView() {
  return el(`<section class="garden">
    <div class="scene-top">${Art.gardenScene({ coat: current().coat })}</div>
    <div class="compost panel"><span class="ico compost-eq" aria-label="Poop makes compost">${Art.poop({ color: 'brown', shape: 'swirl' })}${Art.icon('arrow')}${Art.compostIcon()}</span><span>Compost: <b id="compost">0</b></span><small>Scoop poop to get more</small></div>
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
  for (const f of G.unlockedFillings(state)) {
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
  picker('What should we plant?', G.unlockedFillings(state).map(f => ({ id: f, html: Art.veggie(f, 48), label: G.FILLINGS[f].name })), (f) => {
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
    <button class="dbook-btn panel" id="dbook"><span class="dbook-ico">${Art.dumpling('sp:gold', 52)}</span><span class="txt"><b>Dumpling Book</b><small id="rcount"></small></span><span class="dbook-go">›</span></button>
    <p class="seed-hint" id="seedhint"></p>
  </section>`);
  $('#cook', v).addEventListener('click', onCook);
  $('#dbook', v).addEventListener('click', dumplingBook);
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
    fl.classList.toggle('many', G.unlockedFillings(state).length > 8);
    for (const f of G.unlockedFillings(state)) {
      const have = (state.pantry[f] || 0) - selected.filter(x => x === f).length;
      const b = el(`<button class="fill tile" ${have < 1 ? 'disabled' : ''}>${Art.veggie(f, 44)}<b class="count">${Math.max(0, have)}</b></button>`);
      b.addEventListener('click', () => { if (selected.length < 2) { selected.push(f); sfx.pop(); render(); } });
      fl.appendChild(b);
    }
  }
  $('#rcount').textContent = `${G.dumplingsFound(state)} / ${G.dumplingTotal()} found`;
  const next = G.nextSeed(state);
  const hint = $('#seedhint');
  const hsig = next ? next.filling + next.need : 'all';
  if (hint.dataset.sig === hsig) return;
  hint.dataset.sig = hsig;
  hint.innerHTML = next
    ? `<span class="seed-shadow">${Art.veggieShadow(next.filling, 28)}</span>Find <b>${next.need}</b> more ${next.need === 1 ? 'recipe' : 'recipes'} for a new seed!`
    : 'You have every seed!';
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
    else if (r.surprise) surpriseReveal(r);
    else { sfx.ding(); toast(`Made a ${r.recipe.name}`); }
    if (r.seed) setTimeout(() => { sfx.fanfare(); popup('New seed!', `<div class="pig-card seed-card">${Art.veggie(r.seed, 110)}</div><p><b>${G.FILLINGS[r.seed].name}</b><br>Plant it in the Garden!</p>`, 'Yay!'); }, 300);
    for (const p of r.pages) setTimeout(() => { sfx.fanfare(); floatCoin(p.prize); popup('Page filled!', `<div class="pig-card">${Art.dumpling(p.keys[p.keys.length - 1], 96)}</div><p>You filled the <b>${p.label}</b> page of the Dumpling Book!</p><div class="reward-row"><span class="reward-item">${Art.coinIcon()} +${p.prize}</span></div>`, 'Hooray!'); }, 400);
    tut('cook');
    render();
  }, 1500);
}

// The blind box moment: a surprise dumpling popped out of the steamer.
const REVEAL_TITLE = { shiny: 'A shiny one!', rare: 'Rare dumpling!', super: 'Super rare!', secret: 'SECRET dumpling!' };
function surpriseReveal(r) {
  const t = G.DUMPLING_TIERS.find(x => x.id === r.recipe.tier);
  sfx.fanfare();
  if (t.id !== 'shiny') setTimeout(() => sfx.fanfare(), 500);
  popup(REVEAL_TITLE[t.id], `<div class="reveal tier-${t.id}"><div class="rays"></div>${Art.dumpling(r.key, 130)}</div>
    <p><b>${r.recipe.name}</b><br><span class="tier-pill tier-${t.id}">${t.label} · ${t.odds}</span></p>
    ${r.firstFind ? '<p class="new-in-book">New in your Dumpling Book!</p>' : ''}`, 'Wow!');
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
    btns.appendChild(btn('Surprise me', () => { M.randomize(m); sfx.pop(); tut('surprise'); render(); }, 'btn-grey surprise'));
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
  // Never draw the piggy off the board, whatever the run says.
  const ok = pos && Number.isFinite(pos.x) && Number.isFinite(pos.y);
  const cx = ok ? Math.min(M.COLS - 1, Math.max(0, Math.round(pos.x))) : M.START.x;
  const cy = ok ? Math.min(M.ROWS - 1, Math.max(0, Math.round(pos.y))) : M.START.y;
  // 'zoomy', not 'cheer': the Poop Book's .cheer class animates transform,
  // which overrode this translate and parked the piggy in the top-left corner.
  pig.classList.toggle('zoomy', !!zoom);
  pig.style.transform = `translate(${cx * CELL + CELL / 2}px, ${cy * CELL + CELL / 2}px)`;
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
      setTimeout(() => { stopRun(); tut('surprise'); tut('maze'); render(); }, 2200);
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
let tryHat = null;   // { id, pig }: a hat being tried on before buying
// The shop is split into tabs; the last one picked is kept in the save.
const SHOP_TABS = [
  { id: 'piggies',  name: 'Piggies',  icon: () => Art.upgradeIcon('piggy') },
  { id: 'upgrades', name: 'Upgrades', icon: () => Art.upgradeIcon('sun') },
  { id: 'hats',     name: 'Hats',     icon: () => Art.hatIcon('party') },
  { id: 'toys',     name: 'Toys',     icon: () => Art.toyArt('ball') },
];
function shopView() {
  return el(`<section class="shop">
    <div class="scene-top">${Art.shopScene()}</div>
    <div class="shop-tabs">${SHOP_TABS.map(t => `<button class="stab" data-stab="${t.id}">${t.icon()}<span>${t.name}</span></button>`).join('')}</div>
    <div class="shop-sec" data-sec="piggies"><div class="ribbon"><span>Adopt a piggy</span></div><div class="adopt panel" id="adopt"></div></div>
    <div class="shop-sec" data-sec="upgrades"><div class="ribbon"><span>Upgrades</span></div><div id="items"></div></div>
    <div class="shop-sec" data-sec="hats"><div class="ribbon"><span>Hats</span></div><div class="hats panel" id="hats"></div></div>
    <div class="shop-sec" data-sec="toys"><div class="ribbon"><span>Pen toys</span></div><div class="toys panel" id="toys"></div></div>
    <div class="row center"><button class="btn btn-grey" id="replay">Replay tutorial</button></div>
    <button class="reset" id="reset">Start over</button>
    <p class="version">version ${VERSION}</p></section>`);
}

function updateShop() {
  const stab = SHOP_TABS.some(t => t.id === state.shopTab) ? state.shopTab : 'piggies';
  document.querySelectorAll('.stab').forEach(b => {
    b.classList.toggle('active', b.dataset.stab === stab);
    b.onclick = () => { if (state.shopTab !== b.dataset.stab) { state.shopTab = b.dataset.stab; sfx.pop(); persist(); render(); } };
  });
  document.querySelectorAll('.shop-sec').forEach(sec => { sec.hidden = sec.dataset.sec !== stab; });
  const toys = $('#toys');
  const tsig = JSON.stringify([state.toys, state.coins, G.toyLimit(state), Object.keys(G.TOYS).map(id => Math.ceil(G.toyLeft(state, id) * 4))]);
  if (toys.dataset.sig !== tsig) {
    toys.dataset.sig = tsig;
    const inPen = G.toysInPen(state).length, limit = G.toyLimit(state);
    toys.innerHTML = `<div class="toy-count"><b>${inPen} / ${limit}</b> toys in the pen</div>
      <p class="hint">Tap a toy you have to put it in the pen or take it out.${state.upgrades.pen3 ? '' : ' A bigger pen fits more toys!'}</p><div class="toy-grid"></div>`;
    const grid = $('.toy-grid', toys);
    for (const [id, t] of Object.entries(G.TOYS)) {
      const at = state.toys[id];
      const left = t.chew && at ? G.toyLeft(state, id) : 1;
      const label = at === 'pen' ? '<span class="price can">In the pen</span>' : at === 'box' ? '<span class="price box">Put in pen</span>' : price(t.cost);
      const meter = t.chew && at ? `<span class="chew-meter"><i style="width:${Math.round(left * 100)}%"></i></span>` : '';
      const b = el(`<button class="toy-tile tile ${at ? 'owned ' + at : ''}">${Art.toyArt(id, Math.ceil(left * 4) / 4)}<span>${t.name}</span><small>${t.desc}</small>${meter}${label}</button>`);
      b.addEventListener('click', () => {
        if (at) {
          const r = G.moveToy(state, id);
          if (!r.ok) { sfx.nope(); toast(`The pen fits ${limit} toys. Take one out first!`); return; }
          sfx.pop(); toast(r.where === 'pen' ? `${t.name} is in the pen!` : `${t.name} went in the toy box`); render(); return;
        }
        const r = G.buyToy(state, id);
        if (!r.ok) { sfx.nope(); toast(`Need ${t.cost - state.coins} more coins`); return; }
        sfx.fanfare();
        if (r.where === 'pen') popup('New toy!', `<div class="toy-card">${Art.toyArt(id)}</div><p>The <b>${t.name}</b> is in the pen. Go see your piggies play!</p>`, 'Go see!', () => { tab = 'steamer'; render(); });
        else popup('New toy!', `<div class="toy-card">${Art.toyArt(id)}</div><p>The pen is full of toys, so the <b>${t.name}</b> went in the toy box. Take a toy out to make room!</p>`, 'OK');
        render();
      });
      grid.appendChild(b);
    }
  }
  const adopt = $('#adopt');
  const room = state.piggies.length < G.capacity(state);
  const cost = G.adoptCost(state);
  const offer = room ? G.makeOffer(state) : null;
  const asig = JSON.stringify([offer, cost, state.coins, room, state.piggies.length]);
  if (adopt.dataset.sig !== asig) {
    adopt.dataset.sig = asig;
    adopt.innerHTML = '';
    if (!room) {
      adopt.innerHTML = `<p class="hint">Your pen is full (${state.piggies.length} piggies). ${state.upgrades.pen3 ? 'That is all the piggies a home can hold!' : 'Buy a bigger pen in Upgrades for more room.'}</p>`;
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
  if (tryHat && (tryHat.pig !== p.id || state.hats[tryHat.id])) tryHat = null;
  const showing = tryHat ? tryHat.id : p.hat;
  const hsig = JSON.stringify([state.hats, state.coins, p.id, p.hat, tryHat, state.piggies.map(q => [q.id, q.name, q.hat])]);
  if (hats.dataset.sig !== hsig) {
    hats.dataset.sig = hsig;
    // Who the hats are for, big and clear, with a row of faces to switch piggy.
    hats.innerHTML = `<div class="hat-for">
        <div class="hat-model">${Art.piggySide({ coat: p.coat, hat: showing })}</div>
        <div class="hat-who"><small>Hats for</small><b>${esc(p.name)}</b>
          ${tryHat ? `<em>Trying on the ${G.HATS[tryHat.id].name}. Tap it again to buy!</em>` : state.piggies.length > 1 ? '<em>Tap a face to pick another piggy</em>' : ''}</div>
      </div>
      ${state.piggies.length > 1 ? `<div class="hat-pigs">${state.piggies.map(q => `<button class="face ${q.id === p.id ? 'on' : ''}" data-id="${q.id}" aria-label="Hats for ${esc(q.name)}">${Art.piggyFace({ coat: q.coat, hat: q.hat })}</button>`).join('')}</div>` : ''}
      <p class="hint">Buy a hat once and any piggy can wear it. Tap a hat to try it on.</p><div class="hat-grid"></div>`;
    hats.querySelectorAll('.hat-pigs .face').forEach(f => f.addEventListener('click', () => { selectedPig = +f.dataset.id; tryHat = null; sfx.pop(); render(); }));
    const grid = $('.hat-grid', hats);
    for (const [id, h] of Object.entries(G.HATS)) {
      const owned = !!state.hats[id];
      const wearing = p.hat === id;
      const trying = tryHat && tryHat.id === id;
      const b = el(`<button class="hat tile ${owned ? 'owned' : ''} ${wearing ? 'wearing' : ''} ${trying ? 'trying' : ''}">${Art.hatIcon(id)}<span>${h.name}</span>
        ${wearing ? '<span class="price can">Wearing</span>' : owned ? '<span class="price">Wear</span>' : trying ? `<span class="price buy">Buy ${h.cost} <i class="coin-sm">${Art.coinIcon()}</i></span>` : price(h.cost)}</button>`);
      b.addEventListener('click', () => {
        if (!state.hats[id]) {
          if (!trying) { tryHat = { id, pig: p.id }; sfx.pop(); render(); return; }
          const r = G.buyHat(state, id);
          if (!r.ok) { sfx.nope(); toast(`Need ${h.cost - state.coins} more coins`); return; }
          tryHat = null;
          sfx.fanfare(); G.wearHat(state, p.id, id);
          popup('New hat!', `<div class="pig-card big">${Art.piggySide({ coat: p.coat, hat: id })}</div><p><b>${esc(p.name)}</b> is wearing the ${h.name}!</p>`, 'Cute!');
        } else {
          tryHat = null;
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
  const page = state.bookPage || {};
  const kinds = G.poopKinds();
  const found = G.pageFound(state);
  const filled = state.booksFilled || 0;
  const got = G.ACHIEVEMENTS.filter(a => (state.achievements || {})[a.id]).length;
  // Kinds on this page show in color. Kinds found on an earlier page show as a
  // silhouette with their name, so you know what to hunt for again.
  const tile = k => {
    const n = book[k.key] || 0;
    const name = `${G.POOP_COLORS[k.color]} ${G.POOP_SHAPES[k.shape].toLowerCase()}`;
    if (page[k.key]) return `<button class="pk" data-key="${k.key}">${Art.poop(k)}<span>${name}</span><b class="count">${n}</b></button>`;
    return `<button class="pk unknown" data-key="${k.key}">${Art.poopShadow(k)}<span>${n ? name : '???'}</span><b class="count">${n || '?'}</b></button>`;
  };
  // One page per rarity group, flipped with the arrows.
  const n = G.POOP_TIERS.length;
  const tiers = G.POOP_TIERS.map((t, i) => {
    const ks = kinds.filter(k => t.colors.includes(k.color));
    const have = ks.filter(k => page[k.key]).length;
    return `<div class="tier" data-page="${i}" ${i === bookPageIdx ? '' : 'hidden'}>
      <div class="pager"><button class="arrow" data-step="-1" aria-label="Previous page">‹</button>
        <h4><span>${t.label}</span><b class="${have === ks.length ? 'done' : ''}">${have} / ${ks.length}</b></h4>
        <button class="arrow" data-step="1" aria-label="Next page">›</button></div>
      <small class="tier-odds">${t.odds}</small>
      <div class="pk-grid">${ks.map(tile).join('')}</div>
      <div class="dots">${G.POOP_TIERS.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}<span>Page ${i + 1} of ${n}</span></div></div>`;
  }).join('');
  const ach = G.ACHIEVEMENTS.map(a => {
    const won = !!(state.achievements || {})[a.id];
    return `<div class="ach ${won ? 'got' : ''}"><span class="badge">${won ? Art.badgeIcon() : Art.badgeIcon(true)}</span><span class="txt"><b>${a.name}</b><small>${a.desc}</small></span><span class="price ${won ? 'can' : ''}">${won ? 'Done!' : `${a.coins} <i class="coin-sm">${Art.coinIcon()}</i>`}</span></div>`;
  }).join('');
  popup(`Poop Book`, `<div class="book-tabs"><button class="on" data-pane="poops">Poops <small>${found} / ${kinds.length}</small></button><button data-pane="badges">Badges <small>${got} / ${G.ACHIEVEMENTS.length}</small></button></div>
    <div class="book-pane swipe" data-pane="poops">
      <div class="book-prize">${filled ? `<span class="books-filled">${Art.poopBookArt(true)}<span>Filled <b>${filled}</b> ${filled === 1 ? 'time' : 'times'}</span></span>` : ''}
        <span class="next-prize">Fill it: <b>${G.bookReward(filled)}</b> <i class="coin-sm">${Art.coinIcon()}</i></span></div>
      <p class="book-hint">${filled ? 'A fresh page! Find every kind again.' : 'Scoop every kind of poop to fill the book.'}</p>
      ${tiers}
    </div>
    <div class="book-pane" data-pane="badges" hidden><div class="ach-list">${ach}</div></div>`, 'Close');
  sfx.pop();
}

// Poop Book tabs (Poops / Badges) and page arrows. Delegated, since popups can be queued.
let bookPageIdx = 0;
let dbookIdx = 0;           // the Dumpling Book's open page, remembered between visits
let swipedAt = 0;
// Flip a book a page forward (1) or back (-1), sliding in from that side.
function flipBook(pane, step) {
  const pages = [...pane.querySelectorAll('.tier')];
  const idx = (pages.findIndex(p => !p.hidden) + step + pages.length) % pages.length;
  if (pane.dataset.pane === 'dumplings') dbookIdx = idx; else bookPageIdx = idx;
  pages.forEach((p, i) => { p.hidden = i !== idx; p.classList.remove('slide-l', 'slide-r'); });
  void pages[idx].offsetWidth;   // restart the slide animation
  pages[idx].classList.add(step > 0 ? 'slide-l' : 'slide-r');
  sfx.pop();
}
// Swipe left or right on the poop pages to flip them. Mostly-vertical drags
// are left alone so the book still scrolls.
let swipe = null;
document.addEventListener('touchstart', (e) => {
  const pane = e.target.closest('.book-pane.swipe');
  swipe = pane && e.touches.length === 1 ? { pane, x: e.touches[0].clientX, y: e.touches[0].clientY } : null;
}, { passive: true });
document.addEventListener('touchend', (e) => {
  if (!swipe) return;
  const t = e.changedTouches[0];
  const dx = t.clientX - swipe.x, dy = t.clientY - swipe.y;
  if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy) * 1.5) { flipBook(swipe.pane, dx < 0 ? 1 : -1); swipedAt = Date.now(); }
  swipe = null;
}, { passive: true });
document.addEventListener('click', (e) => {
  if (Date.now() - swipedAt < 400 && e.target.closest('.book-pane')) return;   // the tap that ended a swipe
  const tileBtn = e.target.closest('.pk[data-key]');
  if (tileBtn) { poopDetail(tileBtn.dataset.key); return; }
  const dTile = e.target.closest('.pk[data-dkey]');
  if (dTile) { dumplingDetail(dTile.dataset.dkey); return; }
  const arrow = e.target.closest('.pager .arrow');
  if (arrow) { flipBook(arrow.closest('.book-pane'), Number(arrow.dataset.step)); return; }
  const b = e.target.closest('.book-tabs button');
  if (!b) return;
  const card = b.closest('.card');
  for (const t of card.querySelectorAll('.book-tabs button')) t.classList.toggle('on', t === b);
  for (const p of card.querySelectorAll('.book-pane')) p.hidden = p.dataset.pane !== b.dataset.pane;
  sfx.pop();
});

// A closer look at one poop kind, shown over the open book.
function poopDetail(key) {
  const k = G.poopKinds().find(x => x.key === key);
  if (!k) return;
  const n = (state.poopBook || {})[key] || 0;
  const onPage = !!(state.bookPage || {})[key];
  const name = `${G.POOP_COLORS[k.color]} ${G.POOP_SHAPES[k.shape].toLowerCase()}`;
  const tier = G.POOP_TIERS.find(t => t.colors.includes(k.color));
  const odds = (G.POOP_ODDS.find(o => o.label === G.POOP_COLORS[k.color]) || tier).odds;
  const v = G.POOP_VALUE[k.color] || G.POOP_VALUE.brown;
  const body = n
    ? `<div class="pig-card poop-card">${Art.poop(k)}</div>
       <div class="poop-facts"><span><b>${n}</b> scooped</span><span>${tier.label} · ${odds}</span><span>Worth <b>${v.coins}</b> <i class="coin-sm">${Art.coinIcon()}</i> and <b>${v.compost}</b> compost</span></div>
       ${onPage ? '' : '<p>Not on this page yet. Scoop another to add it!</p>'}`
    : `<div class="pig-card poop-card">${Art.poopShadow(k)}</div>
       <div class="poop-facts"><span>${tier.label} · ${odds}</span></div><p>Not found yet. Keep scooping!</p>`;
  const box = el(`<div class="modal over"><div class="card panel">
    <div class="ribbon"><span>${n ? name : '???'}</span></div>${body}
    <div class="row center"><button class="btn big">Back</button></div></div></div>`);
  $('.btn', box).onclick = () => { box.remove(); sfx.pop(); };
  document.body.appendChild(box);
  if (n) sfx.ding(); else sfx.pop();
}

// ---------- Dumpling Book ----------
// Like the Poop Book: one page per 16 recipes, then a page for each surprise
// tier. Unfound spots are silhouettes; a gold star marks a found shiny.
function dumplingBook() {
  const book = state.recipeBook || {};
  const pages = G.dumplingPages();
  const prizes = state.dbookPrizes || {};
  dbookIdx = Math.min(dbookIdx, pages.length - 1);
  const nameOf = k => G.dumplingInfo(k).name;
  const tile = k => {
    const n = book[k] || 0;
    const shiny = book['shiny:' + k] ? '<i class="shiny-mark" aria-label="Shiny found">★</i>' : '';
    if (n) return `<button class="pk" data-dkey="${k}">${Art.dumpling(k, 44)}<span>${nameOf(k)}</span><b class="count">${n}</b>${shiny}</button>`;
    return `<button class="pk unknown" data-dkey="${k}">${Art.dumplingShadow(k, 44)}<span>???</span><b class="count">?</b></button>`;
  };
  let recipePage = 0;
  const html = pages.map((p, i) => {
    const have = p.keys.filter(k => book[k]).length;
    const isRecipes = p.label === 'Recipes';
    const label = isRecipes ? `${p.label} ${++recipePage}` : p.label;
    const sub = `${p.odds ? p.odds + ' · ' : ''}${prizes[p.id] ? 'Prize won!' : `Fill it: ${p.prize} coins`}`;
    return `<div class="tier dtier-${isRecipes ? 'recipes' : p.id}" data-page="${i}" ${i === dbookIdx ? '' : 'hidden'}>
      <div class="pager"><button class="arrow" data-step="-1" aria-label="Previous page">‹</button>
        <h4><span>${label}</span><b class="${have === p.keys.length ? 'done' : ''}">${have} / ${p.keys.length}</b></h4>
        <button class="arrow" data-step="1" aria-label="Next page">›</button></div>
      <small class="tier-odds">${sub}</small>
      <div class="pk-grid">${p.keys.map(tile).join('')}</div>
      <div class="dots">${pages.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}</div></div>`;
  }).join('');
  popup('Dumpling Book', `<div class="book-prize"><span class="next-prize">Found <b>${G.dumplingsFound(state)}</b> / ${G.dumplingTotal()}</span>
      <span class="next-prize shiny-count"><i class="shiny-mark">★</i> Shiny <b>${G.shinyFound(state)}</b> / ${Object.keys(G.RECIPES).length}</span></div>
    <p class="book-hint">Every steaming is a surprise. Rare ones can pop out of any recipe!</p>
    <div class="book-pane swipe" data-pane="dumplings">${html}</div>`, 'Close');
  sfx.pop();
}

// A closer look at one dumpling, shown over the open book.
function dumplingDetail(key) {
  const info = G.dumplingInfo(key);
  if (!info) return;
  const book = state.recipeBook || {};
  const n = book[key] || 0;
  const tier = G.DUMPLING_TIERS.find(t => t.id === info.tier);
  const shinyN = info.tier === 'plain' ? book['shiny:' + key] || 0 : 0;
  const pic = n ? Art.dumpling(key, 120) : Art.dumplingShadow(key, 120);
  const facts = [];
  if (n) facts.push(`<span><b>${n}</b> steamed</span>`);
  if (info.tier === 'plain' && n) {
    const [a, b] = key.split('+');
    facts.push(`<span class="mix">${Art.veggie(a, 26)} + ${Art.veggie(b, 26)}</span>`);
  }
  if (tier) facts.push(`<span class="tier-pill tier-${tier.id}">${tier.label} · ${tier.odds}</span>`);
  if (info.from) facts.push(`<span>Hides in ${Art.veggie(info.from, 24)} ${G.FILLINGS[info.from].name} dumplings</span>`);
  else if (tier) facts.push('<span>Can pop out of any recipe</span>');
  if (n) facts.push(`<span>Worth <b>${info.coins}</b> <i class="coin-sm">${Art.coinIcon()}</i> to eat</span>`);
  const shiny = info.tier !== 'plain' || !n ? ''
    : shinyN ? `<div class="shiny-row">${Art.dumpling('shiny:' + key, 64)}<span><i class="shiny-mark">★</i> Shiny found <b>${shinyN}</b></span></div>`
    : `<div class="shiny-row">${Art.dumplingShadow(key, 64)}<span>Shiny one: 1 in 10</span></div>`;
  const box = el(`<div class="modal over"><div class="card panel">
    <div class="ribbon"><span>${n ? info.name : '???'}</span></div>
    <div class="pig-card poop-card">${pic}</div>
    <div class="poop-facts">${facts.join('')}</div>${shiny}
    ${n ? '' : `<p>Not found yet. Keep steaming!</p>`}
    <div class="row center"><button class="btn big">Back</button></div></div></div>`);
  $('.btn', box).onclick = () => { box.remove(); sfx.pop(); };
  document.body.appendChild(box);
  if (n) sfx.ding(); else sfx.pop();
}

// When every kind is on the page: big prize, a celebration, and a fresh page.
function bookCheck(delay = 0) {
  const r = G.checkBookFull(state);
  if (!r) return;
  const bits = Array.from({ length: 16 }, (_, i) => {
    const art = i % 3 === 0 ? Art.coinIcon() : Art.poop({ shape: i % 2 ? 'swirl' : 'beans', color: ['pink', 'gold', 'rainbow', 'green', 'orange'][i % 5] });
    return `<i style="--l:${(i * 37) % 100}%;--d:${(i * 0.23) % 1.6}s;--r:${(i % 2 ? 1 : -1) * (180 + i * 20)}deg">${art}</i>`;
  }).join('');
  setTimeout(() => {
    sfx.fanfare(); floatCoin(r.coins);
    popup('Book filled!', `<div class="confetti">${bits}</div>
      <div class="celebrate"><div class="book-pop">${Art.poopBookArt()}</div><div class="cheer">${Art.piggySide({ coat: current().coat, hat: current().hat })}</div></div>
      <p>You found <b>every kind</b> of poop!</p>
      <div class="reward-row"><span class="reward-item">${Art.coinIcon()} +${r.coins}</span></div>
      <div class="book-prize"><span class="books-filled">${Art.poopBookArt(true)}<span>Filled <b>${r.filled}</b> ${r.filled === 1 ? 'time' : 'times'}</span></span></div>
      <p>The book gets a fresh page. Fill it again for <b>${G.bookReward(r.filled)}</b> coins!</p>`, 'Fill it again!');
  }, delay);
}

// ---------- Dialogs & effects ----------
function renameDialog() {
  const p = current();
  const box = el(`<div class="modal"><div class="card panel">
    <div class="ribbon"><span>Rename</span></div>
    <div class="pig-card">${Art.piggySide({ coat: p.coat, hat: p.hat })}</div>
    <p>Costs ${G.RENAME_COST} coins. You have ${state.coins}.</p>
    <input id="newname" maxlength="${G.NAME_MAX}" placeholder="${esc(p.name)}" autocomplete="off">
    <div class="row"><button class="btn btn-grey" id="cancel">Cancel</button><button class="btn" id="ok">Rename</button></div>
  </div></div>`);
  document.body.appendChild(box);
  $('#cancel', box).onclick = () => box.remove();
  $('#ok', box).onclick = () => {
    const r = G.rename(state, p.id, $('#newname', box).value);
    if (!r.ok) { sfx.nope(); toast(r.reason === 'coins' ? 'Not enough coins yet' : r.reason === 'name' ? 'Try a different name' : 'Type a name first'); return; }
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
  const box = el(`<div class="modal"><div class="card panel"><div class="ribbon"><span>${title}</span></div><div class="opts ${options.length > 6 ? 'many' : ''}"></div><div class="row center"><button class="btn btn-grey">Cancel</button></div></div></div>`);
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
