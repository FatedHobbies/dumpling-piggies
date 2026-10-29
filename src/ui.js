import * as G from './game.js';
import * as Art from './art.js';
import { load, save, wipe } from './save.js';
import { sfx, music, volume } from './sound.js';
import * as M from './maze.js';

const VERSION = 111;
let state = null;
let wiped = false;          // after "Start over": never save the old state again
const persist = () => { if (!wiped) save(state); };
let tab = 'steamer';
let selected = [];          // fillings chosen in the kitchen
let selectedPig = null;     // id of the piggy whose name is in the HUD
const NEEDY = 30;           // Food or Fun below this shows a need bubble
let needPig = null;         // the one piggy showing a need bubble until it is looked after
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
  if (state.penNews) {
    const n = state.penNews, names = n.away.map(esc);
    const who = names.length ? `<b>${names.length > 1 ? names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] : names[0]}</b>` : '';
    popup('Cozy pen!', `<div class="toy-card">${Art.toyArt('hut')}</div>
      <p>The pen now fits <b>4 piggies</b>, so it's easier to see everyone.${who ? ` ${who} went on a sleepover. Tap the <b>Sleepover House</b> in the Shop to swap piggies any time!` : ''}</p>
      ${n.refund ? `<div class="reward-row"><span class="reward-item">${Art.coinIcon()} +${n.refund}</span></div><p class="hint small">Coins back for the Huge pen.</p>` : ''}`, 'OK!');
    delete state.penNews;
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
      <button class="hud-book" id="poopbook" aria-label="Poop Book">${Art.poop({ shape: 'swirl', color: 'brown' })}<span>Book</span></button>
      <button class="hud-book" id="dumpbook" aria-label="Dumpling Book">${Art.dumpling('sp:gold', 40)}<span>Book</span></button>
      <div class="hud-coins"><span class="coin-ico">${Art.coinIcon()}</span><span id="coins">0</span></div>
      <button class="hud-gear" id="gear" aria-label="Settings">${Art.icon('gear')}</button>
    </header>
    <div id="coach" class="coach" hidden><span class="coach-pig" id="coachpig"></span><p id="coachtext"></p><button class="btn coach-ok" id="coachok" hidden>OK!</button><button class="coach-skip" id="coachskip" aria-label="Skip">✕</button></div>
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
  $('#poopbook').addEventListener('click', () => { poopBook(); tut('poopbook'); });
  $('#dumpbook').addEventListener('click', () => { dumplingBook(); tut('dumpbook'); });
  $('#gear').addEventListener('click', () => { sfx.pop(); settings(); });
  $('#coachskip').addEventListener('click', () => { if (!tutStep()) return tipDone(); confirmBox('Skip the tutorial?', () => { state.tutorial = { done: true }; render(); }); });
  $('#coachok').addEventListener('click', () => tipDone());
}

// ---------- Tutorial ----------
// Each step waits for one action. `tab` is where it happens; the coach bar
// points there first if she is somewhere else. `enter` runs once when the
// step starts and sets things up so the step can always be done (a hungry
// piggy to feed, a poop to scoop, veggies to cook).
const lowNeed = (k) => { const p = current(); if (p[k] >= NEEDY) p[k] = NEEDY - 5; needPig = p.id; };
const TUTORIAL = [
  null,
  { tab: 'steamer', on: 'pet',   text: n => `${n} wants a pet! Tap ${n}.`, target: () => `.piggy[data-id="${current().id}"]`, enter: () => lowNeed('fun') },
  { tab: 'steamer', on: 'feed',  text: n => `${n} is hungry! Tap the dumpling.`, target: '.dump',
    enter: () => { lowNeed('hunger'); if (!Object.values(state.dumplings).some(c => c > 0)) state.dumplings['carrot+carrot'] = 1; } },
  { tab: 'steamer', on: 'scoop', text: n => `Uh oh, a poop! Tap it to scoop it up.`, target: '.poop', enter: () => { if (!state.poops.length) G.addPoop(state); } },
  { tab: null,      on: 'poopbook', text: n => `Every poop goes in your Poop Book! Tap it to look.`, target: '#poopbook' },
  { tab: 'garden',  on: 'plant', text: n => $('.plot.empty') || tab !== 'garden' ? `Poop helps veggies grow! Tap Plant.` : `Your veggies are growing! Tap one.`, target: () => $('.plot.empty') ? '.plot.empty' : '.plot',
    enter: () => { const need = Math.max(...G.unlockedFillings(state).map(G.plantCost)); if (state.compost < need) state.compost = need; } },
  { tab: 'kitchen', on: 'cook',  text: n => ['Let\'s cook! Tap a veggie.', 'Tap one more veggie.', 'Now tap Steam it!'][Math.min(2, selected.length)], target: () => selected.length < 2 ? '.fill:not(:disabled)' : '#cook',
    enter: () => { if (Object.values(state.pantry).reduce((a, b) => a + b, 0) < 2) state.pantry.carrot = (state.pantry.carrot || 0) + 2; } },
  { tab: 'steamer', on: 'feed',  text: n => `Yum! Feed your new dumpling to ${n}.`, target: '.dump', enter: () => lowNeed('hunger') },
  { tab: 'maze',    on: 'maze',  text: n => run ? `Tap ${n} to cheer!` : state.maze.cells.some(c => c) ? `Tap Go! to send ${n} in.` : `Let's make a maze! Tap Surprise me.`,
    target: () => run ? '#mpig' : state.maze.cells.some(c => c) ? '.go' : '.surprise' },
  // The shop is only shown: the arrow rests on her coins, then moves to the
  // Pen tab, and going home ends the tutorial.
  { tab: 'shop',    on: 'home',  text: n => `Coins buy piggies, hats and toys here! Tap Pen to go home.`,
    enter: () => { shopLook = 0; },
    target: () => { if (!shopLook && !$('.modal')) { shopLook = Date.now() + 2500; setTimeout(render, 2600); } return !shopLook || Date.now() < shopLook ? '.hud-coins' : '.tab[data-tab="steamer"]'; } },
];
let shopLook = 0;   // until when the shop step's arrow points at the coins
const TAB_NAMES = { steamer: 'Pen', garden: 'Garden', kitchen: 'Kitchen', maze: 'Maze', shop: 'Shop' };
const TUT_REWARD = 30;

// ---------- Tips ----------
// One-time tips that show up the first time something new matters, with the
// same spotlight and arrow as the tutorial. A tip with `on` ends when she does
// that action; a `look` tip just shows something and ends with OK.
const hasSpecial = () => Object.keys(state.recipeBook || {}).some(k => k.includes(':'));
const funTip = (kind, text) => ({ id: 'fun-' + kind, tab: 'maze', look: true, text: () => text,
  when: () => !run && (state.maze.fun || []).some(f => f.kind === kind), target: `.mfun-tile[data-kind="${kind}"]` });
const TIPS = [
  { id: 'harvest', tab: 'garden', on: 'harvest', text: () => 'A veggie is ready! Tap it to pick it.', when: () => !!$('.plot.ready'), target: '.plot.ready' },
  { id: 'seed', tab: 'garden', on: 'plant', when: () => G.unlockedFillings(state).length > 5 && !!$('.plot.empty'), target: '.plot.empty',
    text: () => `You got a new seed! Tap Plant to grow ${G.FILLINGS[G.unlockedFillings(state).filter(f => f !== 'hay').pop()].name}.` },
  { id: 'tools', tab: 'maze', look: true, text: () => 'Tap squares to build hay walls. Eraser takes them away!', when: () => !run, target: '.mtile[data-tile]' },
  funTip('zoom', 'A zoom pad! Your piggy zooms fast after this.'),
  funTip('tunnel', 'Tunnels! Your piggy goes in one and pops out the other.'),
  funTip('bounce', 'A bridge! Your piggy can hop over the wall here.'),
  { id: 'carrot', tab: 'maze', look: true, text: () => 'Drop a carrot by the treasure! Your piggy runs to it.',
    when: () => run && !run.done && (state.maze.treasure || []).length > 0, target: '#mtreasure > *' },
  { id: 'theme', tab: 'maze', on: 'theme', text: () => 'A new maze look! Tap Theme to pick it.',
    when: () => !run && Object.keys(Art.MAZE_THEMES).filter(ownsTheme).length > 1, target: '.mtheme' },
  { id: 'toy', tab: 'steamer', on: 'toy', text: () => 'A new toy! Tap it and your piggy comes to play.',
    when: () => G.toysInPen(state).length > 0, target: () => `.toy[data-toy="${G.toysInPen(state)[0]}"]` },
  { id: 'hat', tab: 'shop', look: true, text: () => 'Hats fit every piggy! Tap a face, then tap a hat.',
    when: () => state.shopTab === 'hats' && Object.keys(state.hats).length > 0 && state.piggies.length > 1, target: '.hat-pigs' },
  { id: 'sleepover', tab: 'shop', on: 'sleepover', text: () => 'Pen full? Extra piggies stay in the Sleepover House!',
    when: () => (state.shopTab || 'piggies') === 'piggies' && state.piggies.length >= G.capacity(state), target: '#sleepbtn' },
  { id: 'rare', tab: null, on: 'dumpbook', text: () => 'Rare dumplings go in your Dumpling Book! Tap it to look.', when: hasSpecial, target: '#dumpbook' },
];
let tipNow = null;   // the tip showing right now

function tipDone() {
  if (!tipNow) return;
  state.tips = { ...(state.tips || {}), [tipNow.id]: true };
  tipNow = null; tutWait = Date.now() + 600;
  sfx.pop(); save(state); render();
}

// The tip to show now, if any: the first unseen one that fits this tab.
function findTip() {
  if (tutStep() || $('.modal')) return tipNow;
  const seen = state.tips || {};
  if (tipNow && (tipNow.tab && tipNow.tab !== tab || !tipNow.when())) tipNow = null;
  if (!tipNow) tipNow = TIPS.find(t => !seen[t.id] && (!t.tab || t.tab === tab) && t.when()) || null;
  return tipNow;
}

function tutStep() {
  const t = state.tutorial;
  return t && !t.done && TUTORIAL[t.step] ? t.step : 0;
}

// Called by the game actions. Advances when the action is the one awaited.
function tut(action) {
  const i = tutStep();
  if (!i && tipNow && tipNow.on === action) return tipDone();
  if (!i || TUTORIAL[i].on !== action) return;
  state.tutorial.step += 1;
  tutWait = Date.now() + 1400;
  const next = TUTORIAL[state.tutorial.step];
  if (!next) { state.tutorial = { done: true }; save(state); sfx.fanfare(); popup('Piggy pro!', `<div class="pig-card">${Art.piggySide({ coat: current().coat })}</div><p>You know everything ${esc(current().name)} needs. Have fun!</p>`, 'Yay!'); return; }
  if (next.on === 'home') {
    state.coins += TUT_REWARD;
    sfx.fanfare();
    popup('You did it!', `<div class="reward-row"><span class="reward-item">${Art.coinIcon()} +${TUT_REWARD}</span></div><p>Spend them in the Shop!</p>`, 'Yay!');
  } else sfx.ding();
  save(state);
}

let arrowTarget = ''; // selector the bouncing arrow points at
let scrolledTo = '';  // target last scrolled into view
let tutEntered = 0;   // the step whose `enter` has run
let tutWait = 0;      // the next step waits until the last one's animation is done

function updateCoach() {
  const coach = $('#coach');
  const i = tutStep();
  document.querySelectorAll('.hi').forEach(e => e.classList.remove('hi'));
  if (!i) { tutEntered = 0; return showTip(coach); }
  $('#coachok').hidden = true;
  const step = TUTORIAL[i];
  coach.hidden = false;
  document.body.classList.add('tut-on');
  // A short pause after each step so the dumpling can land, the poop can
  // pop, and so on, before the spotlight moves on.
  if (Date.now() < tutWait) { arrowTarget = ''; positionArrow(); setTimeout(updateCoach, tutWait - Date.now() + 20); return; }
  if (tutEntered !== i) { tutEntered = i; if (step.enter) { step.enter(); save(state); if (tab === 'steamer') updateSteamer(); } }
  const n = esc(current().name);
  if ($('#coachpig').dataset.id !== String(current().id)) { $('#coachpig').dataset.id = String(current().id); $('#coachpig').innerHTML = Art.piggySide({ coat: current().coat }); }
  const away = step.tab && tab !== step.tab;
  const text = away ? `Tap ${TAB_NAMES[step.tab]} at the bottom.` : step.text(n);
  const targets = away ? `.tab[data-tab="${step.tab}"]` : typeof step.target === 'function' ? step.target() : step.target;
  const html = `<small>Step ${i} of ${TUTORIAL.length - 1}</small>${esc(text)}`;
  if ($('#coachtext').innerHTML !== html) {
    $('#coachtext').innerHTML = html;
    coach.classList.remove('pop'); void coach.offsetWidth; coach.classList.add('pop');
  }
  document.querySelectorAll(targets).forEach(e => e.classList.add('hi'));
  arrowTarget = targets;
  positionArrow();
}

function showTip(coach) {
  const t = Date.now() < tutWait ? null : findTip();
  if (Date.now() < tutWait) setTimeout(updateCoach, tutWait - Date.now() + 20);
  if (!t) { coach.hidden = true; document.body.classList.remove('tut-on'); arrowTarget = ''; positionArrow(); return; }
  coach.hidden = false;
  document.body.classList.add('tut-on');
  if ($('#coachpig').dataset.id !== String(current().id)) { $('#coachpig').dataset.id = String(current().id); $('#coachpig').innerHTML = Art.piggySide({ coat: current().coat }); }
  const html = `<small>New!</small>${esc(t.text())}`;
  if ($('#coachtext').innerHTML !== html) {
    $('#coachtext').innerHTML = html;
    coach.classList.remove('pop'); void coach.offsetWidth; coach.classList.add('pop'); sfx.ding();
  }
  $('#coachok').hidden = !t.look;
  const targets = typeof t.target === 'function' ? t.target() : t.target;
  document.querySelectorAll(targets).forEach(e => e.classList.add('hi'));
  arrowTarget = targets;
  positionArrow();
}

// While the tutorial is on, only the thing she should tap can be tapped
// (plus popups and the skip button). Everything else is dimmed and ignores taps.
// While the maze runs she can tap anywhere (cheer, drop carrots) and watch.
function tutBlock(e) {
  if (!(tutStep() || tipNow) || run || !(e.target instanceof Element)) return;
  if (e.target.closest('.modal, #coach, .hi') && (Date.now() >= tutWait || e.target.closest('.modal, #coach'))) return;
  e.stopPropagation();
  if (e.type === 'click') e.preventDefault();
  // A wrong tap gives the arrow and the instruction a little wiggle.
  if (e.type === 'pointerdown' && Date.now() >= tutWait) for (const n of [$('#arrow'), $('#coach')]) { if (!n) continue; n.classList.remove('nudge'); void n.offsetWidth; n.classList.add('nudge'); }
}
for (const type of ['click', 'pointerdown', 'mousedown']) window.addEventListener(type, tutBlock, true);

// A big bouncing arrow over whatever she should tap next, with the rest of
// the screen dimmed around it. Targets move (the piggy walks), so this runs
// on a timer too.
function positionArrow() {
  let arrow = $('#arrow'), dim = $('#tutdim');
  if (!arrow) {
    arrow = el(`<div id="arrow" class="tut-arrow" hidden><svg viewBox="0 0 64 64" aria-hidden="true"><path d="M32 60 L8 30 H22 V6 H42 V30 H56Z" fill="#FFD34D" stroke="#B2342C" stroke-width="4" stroke-linejoin="round"/></svg></div>`);
    dim = el(`<div id="tutdim" class="tut-dim" hidden></div>`);
    document.body.append(dim, arrow);
  }
  const t = arrowTarget && !$('.modal') ? $(arrowTarget) : null;
  let r = t && t.getBoundingClientRect();
  if (!t || !r.width) { arrow.hidden = true; dim.hidden = true; return; }
  // Bring the target on screen once per target (short phones hide the tray).
  const bar = $('.tabs')?.getBoundingClientRect().top || innerHeight;
  if ((r.bottom > bar || r.top < 0) && scrolledTo !== arrowTarget) { scrolledTo = arrowTarget; t.scrollIntoView({ block: 'center' }); r = t.getBoundingClientRect(); }
  // The spotlight hole wraps every highlighted thing (all the empty plots, say).
  let L = r.left, T = r.top, R = r.right, B = r.bottom;
  for (const h of document.querySelectorAll('.hi')) {
    const q = h.getBoundingClientRect();
    if (!q.width) continue;
    L = Math.min(L, q.left); T = Math.min(T, q.top); R = Math.max(R, q.right); B = Math.max(B, q.bottom);
  }
  const pad = 6;
  dim.hidden = !!run;
  Object.assign(dim.style, { left: (L - pad) + 'px', top: (T - pad) + 'px', width: (R - L + pad * 2) + 'px', height: (B - T + pad * 2) + 'px' });
  // Things in the top bar get an arrow from the side, so it never covers the
  // instruction under the bar.
  const side = r.top < 90;
  arrow.hidden = false;
  arrow.classList.toggle('side', side);
  const x = side ? r.left - 8 : r.left + r.width / 2, y = side ? r.top + r.height / 2 : r.top - 10;
  if (arrow.dataset.pos !== `${Math.round(x)},${Math.round(y)}`) { arrow.dataset.pos = `${Math.round(x)},${Math.round(y)}`; arrow.style.left = x + 'px'; arrow.style.top = y + 'px'; }
}

function render(force = false) {
  const p = current();
  // Earned hats show up with a popup, but never in the middle of a maze run.
  if (!run) for (const id of G.earnHats(state)) {
    persist(); sfx.fanfare();
    popup('New hat!', `<div class="pig-card big">${Art.piggySide({ coat: p.coat, hat: id })}</div><p>You earned the <b>${G.HATS[id].name}</b>! Find it in the Shop under Hats.</p>`, 'Yay!');
  }
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

// What a piggy is asking for: food first, then petting.
const needOf = pig => !pig ? '' : pig.hunger < NEEDY ? 'hunger' : pig.fun < NEEDY ? 'fun' : '';

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
      const slot = el(`<span class="face-slot" data-id="${pig.id}"><button class="face" data-id="${pig.id}" aria-label="Pick ${esc(pig.name)}">${Art.piggyFace({ coat: pig.coat, hat: pig.hat })}</button><span class="face-needs"></span></span>`);
      $('.face', slot).addEventListener('click', () => pickPig(pig.id));
      faces.appendChild(slot);
    }
  }
  faces.querySelectorAll('.face').forEach(b => b.classList.toggle('on', +b.dataset.id === selectedPig));
  // Flashing need icons under each portrait when Food, Fun or Clean drops below 30%.
  const dirty = state.poops.length / G.MAX_POOPS > 0.7;
  for (const slot of faces.querySelectorAll('.face-slot')) {
    const pig = state.piggies.find(g => g.id === +slot.dataset.id);
    if (!pig) continue;
    const needs = [pig.hunger < NEEDY && 'hunger', pig.fun < NEEDY && 'fun', dirty && 'clean'].filter(Boolean);
    const box = $('.face-needs', slot), nsig = needs.join(',');
    if (box.dataset.sig !== nsig) { box.dataset.sig = nsig; box.innerHTML = needs.map(n => `<i>${Art.icon(n)}</i>`).join(''); }
  }
  // Only one piggy asks for something at a time. It keeps its bubble until
  // it is fed or petted, then the neediest of the rest gets a turn.
  const asking = G.piggy(state, needPig);
  if (!asking || !needOf(asking)) {
    const next = state.piggies.filter(needOf).sort((a, b) => Math.min(a.hunger, a.fun) - Math.min(b.hunger, b.fun))[0];
    needPig = next ? next.id : null;
  }
  // In the tutorial only her piggy asks for things, so the bubbles match the steps.
  if (tutStep()) needPig = needOf(current()) ? current().id : null;
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
    // A big thought bubble over a piggy that needs something: a dumpling
    // when hungry, a heart when it wants petting.
    const need = pig.id === needPig ? needOf(pig) : '';
    const bub = $('.need-bubble', d);
    if (bub.dataset.need !== need) { bub.dataset.need = need; bub.innerHTML = need === 'hunger' ? Art.dumpling('carrot+carrot', 44) : need ? Art.icon('pet') : ''; }
    d.classList.toggle('needy', !!need);
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
      d.addEventListener('click', () => { toyBounce(id); goToToy(current(), id); tut('toy'); });
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
      // Poops already there when the game opens just sit there; new ones
      // drop out of a piggy's behind, or just plop if nobody is out.
      if (poopsShown && !dropFromPiggy(poop, b)) sfx.plop();
    }
    poops.delete(poop.id);
  }
  for (const [, c] of poops) c.remove();
  poopsShown = true;
  // Dumpling tray, glowing while somebody is hungry
  const tray = $('#tray');
  tray.classList.toggle('hungry', needOf(G.piggy(state, needPig)) === 'hunger');
  // Surprise dumplings sit at the front of the tray.
  const rank = k => ({ secret: 0, super: 1, rare: 2, shiny: 3 }[G.dumplingInfo(k)?.tier] ?? 4);
  const keys = Object.keys(state.dumplings).filter(k => state.dumplings[k] > 0 && G.dumplingInfo(k)).sort((a, b) => rank(a) - rank(b));
  const sig = keys.map(k => k + state.dumplings[k]).join('|');
  if (tray.dataset.sig !== sig) {
    tray.dataset.sig = sig;
    tray.innerHTML = keys.length ? '' : `<p class="hint">No dumplings yet. Cook some in the Kitchen!</p>`;
    for (const k of keys) {
      const b = el(`<button class="dump tile ${rank(k) < 4 ? 'special' : ''}" aria-label="Feed ${G.dumplingInfo(k).name}">${Art.dumpling(k, 52)}<b class="count">${state.dumplings[k]}</b></button>`);
      b.addEventListener('click', () => onFeed(k, b));
      tray.appendChild(b);
    }
  }
}

// A new poop falls out of the back end of the piggy that made it (or any
// piggy out in the open), lands behind them with a squish, and says "plop!".
// The piggy stops and gives a little wiggle. Returns false if nobody can.
let poopsShown = false;
function dropFromPiggy(poop, b) {
  const floor = $('#floor');
  if (tab !== 'steamer' || !floor.offsetWidth) return false;
  const free = state.piggies.filter(p => { const w = wander.get(p.id); return w && !w.inside && !w.peek && !w.riding && !w.using; });
  const pig = free.find(p => p.id === poop.by) || free[Math.floor(Math.random() * free.length)];
  const d = pig && $(`.piggy[data-id="${pig.id}"]`, floor);
  if (!d) return false;
  const w = wander.get(pig.id);
  w.front = false;   // turn sideways so the bottom shows
  w.pause = Math.max(w.pause || 0, Date.now() + 1600);
  d.classList.remove('walking');
  syncPose(d, w);
  const fr = floor.getBoundingClientRect(), ar = $('.pig-art', d).getBoundingClientRect();
  const f = w.face < 0 ? -1 : 1;   // piggies face right, so the rear is on the left
  const rearX = f > 0 ? ar.left + ar.width * 0.13 : ar.right - ar.width * 0.13;
  const rearY = ar.top + ar.height * 0.7;
  const x = Math.min(0.95, Math.max(0.05, (rearX - f * ar.width * 0.05 - fr.left) / fr.width));
  const y = Math.min(0.99, pig.y + 0.01);
  poop.x = x; poop.y = y;
  b.style.setProperty('--x', x.toFixed(3));
  b.style.setProperty('--y', y.toFixed(3));
  b.style.setProperty('--drop', Math.max(0, fr.top + y * fr.height - rearY).toFixed(0) + 'px');
  b.style.setProperty('--pz', depth(pig.y) - 1);   // starts tucked behind the piggy
  b.classList.add('plop');
  d.classList.add('pooping');
  setTimeout(() => {
    sfx.plop();
    const word = el(`<span class="plop-word" style="--x:${Math.min(0.92, Math.max(0.08, x - f * 0.07)).toFixed(3)};--y:${y.toFixed(3)}">plop!</span>`);
    floor.appendChild(word);
    setTimeout(() => word.remove(), 1200);
  }, 520);
  setTimeout(() => { b.classList.remove('plop'); d.classList.remove('pooping'); }, 1000);
  return true;
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
  const held = tutStep() ? current().id : null;
  for (const pig of state.piggies) {
    let w = wander.get(pig.id);
    // During the tutorial her piggy stands still out in the open, where the
    // arrow can point at it (no wandering off into the house).
    if (pig.id === held) {
      const d = $(`.piggy[data-id="${pig.id}"]`);
      if (!w || !w.held) {
        if (!w || w.inside || w.peek || w.hide || w.riding) { pig.x = 0.42; pig.y = 0.55; }
        w = { tx: pig.x, ty: pig.y, face: 1, front: true, held: true };
        wander.set(pig.id, w);
        if (d) { d.classList.remove('walking', 'riding'); syncPose(d, w); placePig(d, pig, w); }
      }
      continue;
    }
    if (!w) { w = { tx: pig.x, ty: pig.y, pause: now + Math.random() * 2000, face: pig.x < 0.5 ? 1 : -1 }; wander.set(pig.id, w); }
    // The other piggies stand still too, and step aside if they are close
    // enough to get in the way of her piggy.
    if (held != null && !w.inside && !w.hide && !w.peek && !w.riding) {
      const d = $(`.piggy[data-id="${pig.id}"]`);
      if (w.using) stopSpot(w, d);
      w.toy = w.spot = null;
      const near = Math.abs(pig.x - 0.42) < 0.2 && Math.abs(pig.y - 0.55) < 0.3;
      if (near) { w.tx = pig.x < 0.42 ? 0.1 : 0.8; w.ty = pig.y; } else { w.tx = pig.x; w.ty = pig.y; }
      const dx = w.tx - pig.x, step = 0.018;
      if (Math.abs(dx) > step) {
        pig.x += Math.sign(dx) * step; w.face = Math.sign(dx); w.front = false;
        if (d) { d.classList.add('walking'); syncPose(d, w); placePig(d, pig, w); }
      } else if (d) { d.classList.remove('walking'); syncPose(d, w); }
      w.pause = now + 1500;
      continue;
    }
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
  if (id === 'slide') { w.tx = toyX(id, 100); w.ty = Math.min(1, t.y + 0.005); return; }
  w.tx = Math.min(0.92, Math.max(0.08, t.x + (Math.random() < 0.5 ? -0.13 : 0.13)));
  w.ty = Math.min(1, t.y + 0.02);
}

// The food bowl and water bottle are drawn in the pen scene. Piggies walk up,
// munch or sip for a few seconds, then wander off. One piggy at a time each.
const SPOTS = {
  bowl:   { x: 0.5, y: 0.93, side: 0.105, dy: -0.03, cls: 'eating',   say: ['Nom nom!', 'Crunch!', 'Yum!'] },
  bottle: { x: 0.5, y: 0.13, side: -0.105, dy: 0.01, cls: 'drinking', say: ['Slurp!', 'Sip sip!', 'Ahh!'] },
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
    // Ducking back in: the face shrinks and fades into the doorway first, and
    // only then does the peek pose go away, so the whole body never flashes.
    setTimeout(() => {
      if (w.hide !== id) return;
      w.inside = true; syncPose(el(), w);
      setTimeout(() => { if (w.hide !== id || !w.inside) return; w.peek = false; syncPose(el(), w); }, 400);
    }, 2600 + Math.random() * 400);
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
// The slide faces left, so the ladder is on the right and the ride goes left.
const SLIDE_PATH = [
  [0, 100, 94, 0], [0.1, 98, 76, 9], [0.2, 97, 60, -9], [0.3, 96, 44, 9], [0.4, 94, 28, -7], [0.5, 90, 18, 0],
  [0.58, 78, 18, 0], [0.7, 54, 46, -36], [0.8, 28, 80, -26], [0.88, 10, 88, 0], [0.94, 0, 82, 0], [1, -6, 94, 0],
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
  const ride = Math.min(0.8, tw / d.offsetWidth * 0.85);
  const path = SLIDE_PATH.map(([t, px, py, rot]) => [t, ...at(px, py), rot]);
  const dur = 3400, start = performance.now();
  w.riding = true; w.front = false; w.face = -1;
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
      cur.style.setProperty('--f', -1); cur.style.setProperty('--r', r.toFixed(1) + 'deg');
      cur.style.zIndex = depth(G.TOYS.slide.y) + 1;
    }
    if (k < 1) { requestAnimationFrame(step); return; }
    pig.x = Math.max(0.05, x); pig.y = Math.min(1, Math.max(pig.y, y));
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

function onFeed(key, btn) {
  // A dumpling goes to the piggy with the hungry bubble, so nobody has to be
  // picked first. The picked piggy gets it if it is hungry or nobody is.
  const asking = G.piggy(state, needPig);
  if (needOf(asking) === 'hunger' && current().hunger >= NEEDY) selectedPig = asking.id;
  const target = current();
  const r = G.feed(state, key, target.id);
  if (!r.ok) {
    sfx.nope();
    if (r.reason === 'full') {
      // The chosen piggy is full: offer it to whoever is hungriest instead.
      const h = G.hungriest(state);
      if (h.id !== target.id && h.hunger < 98) { selectedPig = h.id; return onFeed(key, btn); }
      toast(`${esc(target.name)} is full!`);
    } else toast('None left');
    return;
  }
  const d = $(`.piggy[data-id="${r.piggy.id}"]`);
  const nom = () => {
    sfx.munch();
    if (d) { bubble(d, 'nom!'); d.classList.remove('munch'); void d.offsetWidth; d.classList.add('munch'); }
    floatCoin(r.coins);
  };
  if (btn && d) flyDumpling(key, btn, d, nom); else nom();
  if (r.effect) setTimeout(() => sfx.ding(), 300);
  tut('feed');
  render();
}

// The fed dumpling hops out of the tray and arcs over to the piggy's mouth,
// shrinking a little on the way, then squishes in and the piggy says "nom!".
function flyDumpling(key, btn, d, done) {
  const from = btn.querySelector('svg')?.getBoundingClientRect() || btn.getBoundingClientRect();
  const fly = el(`<div class="fly-dump">${Art.dumpling(key, 52)}</div>`);
  fly.style.width = fly.style.height = from.width + 'px';
  document.body.appendChild(fly);
  btn.classList.remove('fed'); void btn.offsetWidth; btn.classList.add('fed');
  const x0 = from.left + from.width / 2, y0 = from.top + from.height / 2;
  // Aim for the mouth: the front of a side-on piggy, or the middle of a front-facing one.
  const mouth = () => {
    const art = $('.pose.front', d)?.offsetParent ? $('.pose.front', d) : $('.pose.side', d) || d;
    const a = art.getBoundingClientRect();
    if (!a.width) return null;
    if (art.classList.contains('front')) return [a.left + a.width / 2, a.top + a.height * 0.62];
    const f = Number(d.style.getPropertyValue('--f')) < 0 ? -1 : 1;
    return [a.left + a.width * (f > 0 ? 0.84 : 0.16), a.top + a.height * 0.6];
  };
  const T = 650, start = performance.now();
  let last = [x0, y0];
  const step = (now) => {
    const t = Math.min(1, (now - start) / T);
    const m = mouth() || last;   // follow the piggy if it is still walking
    last = m;
    const e = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
    const lift = Math.max(130, Math.hypot(m[0] - x0, m[1] - y0) * 0.45);
    const x = x0 + (m[0] - x0) * e;
    const y = y0 + (m[1] - y0) * e - lift * 4 * e * (1 - e);
    const sc = 1 - 0.45 * e;
    fly.style.transform = `translate(${x}px, ${y}px) translate(-50%, -50%) rotate(${Math.sin(e * Math.PI * 2) * 18}deg) scale(${sc})`;
    if (t < 1) return requestAnimationFrame(step);
    fly.classList.add('gulp');
    done();
    setTimeout(() => fly.remove(), 260);
  };
  requestAnimationFrame(step);
}

function onScoop(id, btn) {
  const r = G.scoop(state, id);
  if (!r.ok) return;
  sfx.pop();
  btn.classList.add('gone');
  setTimeout(() => btn.remove(), 250);
  floatCoin(r.coins);
  const c = r.poop.color;
  const sp = G.isSpecialPoop(r.poop) && G.parseSpecial(c).def;
  if (c === 'rainbow' || c === 'gold' || c === 'crystal' || (sp && (r.isNew || (sp.page !== 'shapes' && sp.page !== 'patterns')))) {
    sfx.fanfare();
    const title = !sp ? (c === 'gold' ? 'A golden poop!' : c === 'crystal' ? 'A crystal poop!' : 'A rainbow poop!')
      : `${/^[aeiou]/i.test(sp.name) ? 'An' : 'A'} ${sp.name.toLowerCase()} poop!`;
    popup(sp && r.isNew ? 'New poop!' : title, `<div class="pig-card poop-card">${Art.poop(r.poop)}</div><p>${sp && r.isNew ? `<b>${G.poopName(r.poop)}</b> goes in the Poop Book! ` : 'Wow! '}That's worth <b>${r.coins} coins</b> and <b>${r.compost} compost</b>.</p>`, 'Wow!');
  } else if (c !== 'brown' || sp) toast(`${G.poopName(r.poop)} poop! +${r.coins} coins`);
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
    if (b.dataset.sig !== psig) { b.dataset.sig = psig; const pl = $('.plant', b); pl.classList.remove('pulled'); pl.innerHTML = g ? Art.sprout(prog, g.filling) : ''; }
    $('.ring i', b).style.width = (prog * 100) + '%';
    $('.ring', b).style.visibility = g && prog < 1 ? 'visible' : 'hidden';
    $('.lbl', b).textContent = !g ? 'Plant' : prog >= 1 ? 'Harvest!' : G.FILLINGS[g.filling].name;
    b.classList.toggle('ready', !!g && prog >= 1);
    b.classList.toggle('empty', !g);
  }
  const pantry = $('#pantry');
  const open = G.unlockedFillings(state);
  const psig = JSON.stringify([state.pantry, open.length]);
  if (pantry.dataset.sig === psig) return;
  pantry.dataset.sig = psig;
  pantry.innerHTML = '';
  // Every crop has a spot. Locked ones are mystery cards until their seed unlocks.
  for (const f of G.FILLING_ORDER) {
    if (open.includes(f)) {
      pantry.appendChild(el(`<div class="pitem tile">${Art.veggie(f, 44)}<b class="count">${state.pantry[f] || 0}</b><span>${G.FILLINGS[f].name}</span></div>`));
      continue;
    }
    pantry.appendChild(lockedCrop(f));
  }
}

// A crop whose seed isn't unlocked yet: a ? mystery card, like the books.
function lockedCrop(f) {
  const b = el(`<button class="pitem tile locked">${Art.veggieOutline(f, 44)}<span>&nbsp;</span></button>`);
  b.addEventListener('click', () => {
    const next = G.nextSeed(state);
    sfx.pop();
    toast(next ? `Find ${next.need} more ${next.need === 1 ? 'recipe' : 'recipes'} for a new seed!` : 'Keep cooking!');
  });
  return b;
}

function onPlot(i) {
  const plot = $(`.plot[data-plot="${i}"]`);
  if (plot && plot.classList.contains('busy')) return;
  const g = state.garden[i];
  if (g) {
    if (G.plantProgress(state, i) < 1) { sfx.pop(); toast('Still growing...'); tut('plant'); return; }
    gardenerRun(i, () => {
      const r = G.harvest(state, i);
      if (r.ok) { sfx.coin(); toast(`+2 ${G.FILLINGS[r.filling].name}`); floatCoin(1); tut('harvest'); render(); }
    }, () => { const pl = $(`.plot[data-plot="${i}"] .plant`); if (pl) pl.classList.add('pulled'); });
    return;
  }
  if (state.compost < 1) { sfx.nope(); toast('You need compost. Scoop some poop first!'); return; }
  picker('What should we plant?', G.unlockedFillings(state).map(f => ({ id: f, html: Art.seedPacket(f, 48), label: G.FILLINGS[f].name, count: state.pantry[f] || 0,
    cost: G.plantCost(f), locked: state.compost < G.plantCost(f) })), (f) => {
    gardenerRun(i, () => {
      const r = G.plant(state, i, f);
      if (r.ok) { sfx.pop(); tut('plant'); render(); }
    });
  }, () => { sfx.nope(); toast('Scoop more poop for compost!'); });
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
      <div class="counter-bar">
        <div class="slots"><div class="slot" data-slot="0"></div><span class="plus">+</span><div class="slot" data-slot="1"></div></div>
        <button class="btn btn-red" id="cook">Steam it!</button>
      </div>
    </div>
    <div class="fillings" id="fillings"></div>
    <p class="seed-hint" id="seedhint"></p>
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
  const fsig = JSON.stringify([state.pantry, selected, state.discovered.length]);
  if (fl.dataset.sig !== fsig) {
    fl.dataset.sig = fsig;
    fl.innerHTML = '';
    const open = G.unlockedFillings(state);
    for (const f of G.FILLING_ORDER) {
      if (!open.includes(f)) { fl.appendChild(lockedCrop(f)); continue; }
      const have = (state.pantry[f] || 0) - selected.filter(x => x === f).length;
      const b = el(`<button class="fill pitem tile" ${have < 1 ? 'disabled' : ''}>${Art.veggie(f, 44)}<b class="count">${Math.max(0, have)}</b><span>${G.FILLINGS[f].name}</span></button>`);
      b.addEventListener('click', () => { if (selected.length < 2) { selected.push(f); sfx.pop(); render(); } });
      fl.appendChild(b);
    }
  }
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
  const th = Art.MAZE_THEMES[mazeTheme()];
  const v = el(`<section class="maze">
    <div class="maze-bar panel">
      <div class="maze-btns" id="mbtns"></div>
      <div class="maze-top"><div class="maze-tray" id="mtray"></div><p class="maze-hint" id="mhint"></p></div>
    </div>
    <div class="maze-wrap">
      <svg id="mgrid" viewBox="-10 -10 ${w + 20} ${h + 20}" class="maze-svg">
        <rect x="-10" y="-10" width="${w + 20}" height="${h + 20}" rx="18" fill="${th.board}"/>
        <g id="mcells"></g>
        <g id="mfence"></g>
        <g id="mfun"></g>
        <g id="mtreasure"></g>
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
      <g class="deco">${th.deco(px, py, y * M.COLS + x)}</g>
      <g class="vwall"></g>
    </g>`;
  }
  cells.innerHTML = html;
  cells.querySelectorAll('.mcell').forEach(r => r.addEventListener('click', () => onCell(+r.dataset.x, +r.dataset.y)));
  let fence = '';
  for (let x = -6; x <= w + 6; x += 48) fence += `<rect x="${x - 4}" y="-12" width="8" height="14" rx="3" fill="${th.post}" stroke="${th.postEdge}" stroke-width="2"/><rect x="${x - 4}" y="${h - 2}" width="8" height="14" rx="3" fill="${th.post}" stroke="${th.postEdge}" stroke-width="2"/>`;
  const bar = $('.maze-bar', v), u = th.ui;
  bar.classList.toggle('themed', !!u);
  if (u) [['--pb1', u.p[0]], ['--pb2', u.p[1]], ['--pbe', u.p[2]], ['--hint', u.hint], ['--b1', u.b[0]], ['--b2', u.b[1]], ['--be', u.b[2]], ['--bt', u.b[3]],
    ['--g', u.g], ['--ge', u.ge], ['--tb', u.t[0]], ['--te', u.t[1]], ['--ton', u.t[2]]].forEach(([k, val]) => bar.style.setProperty(k, val));
  const g = $('#mgrid', v);
  g.style.setProperty('--floor', th.floor); g.style.setProperty('--seen', th.seen);
  g.style.setProperty('--start', th.start); g.style.setProperty('--start-edge', th.startEdge);
  $('#mfence', v).innerHTML = fence;
  $('#mfinish', v).innerHTML = `<g transform="translate(-20 -20) scale(.62)">${Art.dumpling('cabbage+carrot', 64)}</g>`;
  $('#mrot', v).innerHTML = Art.piggyTop({ hat: current().hat, coat: current().coat });
  $('#mpig', v).addEventListener('click', onCheer);
  mazeAngle = 0;
  return v;
}

function updateMaze() {
  const m = state.maze;
  if (!run) checkMazeThemes();
  const grid = $('#mgrid');
  grid.classList.toggle('running', !!run);
  $('.maze-bar').classList.toggle('running', !!run);
  for (const r of document.querySelectorAll('.mcell')) {
    const x = +r.dataset.x, y = +r.dataset.y;
    const theme = mazeTheme(), vw = r.querySelector('.vwall');
    const vsig = M.isWall(m, x, y) ? theme : '';
    r.classList.toggle('wall', !!vsig);
    if (vw.dataset.sig !== vsig) {
      vw.dataset.sig = vsig;
      vw.innerHTML = vsig ? Art.mazeWall3d(theme, x * CELL, y * CELL, M.idx(x, y)) : '';
    }
    r.classList.toggle('start', x === M.START.x && y === M.START.y);
    r.classList.toggle('seen', !!(run && run.visited[M.idx(x, y)]));
  }
  const fun = $('#mfun');
  const fsig = mazeTheme() + (m.fun || []).map(f => `${f.x},${f.y},${f.kind}`).join('|');
  if (fun.dataset.sig !== fsig) {
    fun.dataset.sig = fsig;
    fun.innerHTML = (m.fun || []).map(f => `<g class="mfun-tile" data-kind="${f.kind}">${Art.funTile(mazeTheme(), f.kind === 'bounce' ? 'bridge' : f.kind, f.x * CELL, f.y * CELL)}</g>`).join('');
  }
  const tre = $('#mtreasure');
  const tsig = (m.treasure || []).map(t => `${t.x},${t.y},${t.kind},${t.filling || ''}`).join('|');
  if (tre.dataset.sig !== tsig) {
    tre.dataset.sig = tsig;
    tre.innerHTML = (m.treasure || []).map(t => `<g transform="translate(${t.x * CELL + 4} ${t.y * CELL + 4})"><g class="mtreasure">${Art.treasure(t).replace('<svg ', `<svg width="${CELL - 8}" height="${CELL - 8}" `)}</g></g>`).join('');
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
  const loot = (m.treasure || []).length;
  if (run) hint.textContent = run.done ? 'Yay!' : loot ? 'Tap by the treasure to drop a carrot!' : `Tap squares to drop carrots. Tap ${current().name} to cheer!`;
  else hint.textContent = ok ? 'Tap squares to build walls!' : `${current().name} can't reach the dumpling. Open a path!`;
  updateTray();
  if (btns.dataset.sig === bsig) return;
  btns.dataset.sig = bsig;
  btns.innerHTML = '';
  if (run) {
    btns.appendChild(btn('Stop', () => { stopRun(); render(); }, 'btn-grey'));
  } else {
    btns.appendChild(btn('Surprise me', () => { M.randomize(m, Math.random, G.unlockedFillings(state)); M.placeFun(m, funKinds()); sfx.pop(); render(); }, 'btn-grey surprise'));
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

// The tile tray: Wall (in the maze's style), Eraser, then the fun tiles,
// which show as "?" until they're unlocked. The Theme tile picks the look.
let mazeTile = 1;
// Maze themes change the board, floor, walls and bar. Hay barn is free; four
// are sold in the Shop's Mazes tab and three are earned by playing.
const MAZE_UNLOCKS = {
  hay: {},
  pumpkin: { cost: 150 },
  kitchen: { cost: 250 },
  snow: { cost: 350 },
  sea: { cost: 400 },
  galaxy: { goal: 'Find 10 treasures', have: () => state.stats.treasures || 0, need: 10 },
  unicorn: { goal: 'Finish 25 mazes', have: () => state.stats.mazes || 0, need: 25 },
  poop: { goal: 'Fill the Poop Book', have: () => state.booksFilled || 0, need: 1 },
};
const ownsTheme = (id) => id === 'hay' || !!(state.mazeThemes || {})[id];
function themeLockText(id) {
  const u = MAZE_UNLOCKS[id];
  return u.cost ? `Buy it in the Shop for ${u.cost} coins!` : `${u.goal} to unlock! (${Math.min(u.have(), u.need)} / ${u.need})`;
}
// Earned themes unlock with a popup the next time she's in the maze.
function checkMazeThemes() {
  for (const [id, u] of Object.entries(MAZE_UNLOCKS)) {
    if (!u.goal || ownsTheme(id) || u.have() < u.need) continue;
    state.mazeThemes = { ...(state.mazeThemes || {}), [id]: true };
    persist(); sfx.fanfare();
    popup('New maze theme!', `<div class="theme-card">${themePreview(id)}</div><p><b>${Art.MAZE_THEMES[id].name}</b> unlocked! Tap <b>Theme</b> in the Maze to use it.</p>`, 'Yay!');
  }
}
function buyTheme(id) {
  const u = MAZE_UNLOCKS[id];
  if (ownsTheme(id) || !u.cost) return;
  if (state.coins < u.cost) { sfx.nope(); toast(`Need ${u.cost - state.coins} more coins`); return; }
  state.coins -= u.cost;
  state.mazeThemes = { ...(state.mazeThemes || {}), [id]: true };
  state.mazeStyle = id;
  persist(); sfx.fanfare();
  popup('New maze theme!', `<div class="theme-card">${themePreview(id)}</div><p><b>${Art.MAZE_THEMES[id].name}</b> is ready. Go build a maze!</p>`, 'Go build!', () => { tab = 'maze'; render(true); });
  render();
}
// A little 3x2 corner of a themed maze for shop tiles and popups.
function themePreview(id) {
  const t = Art.MAZE_THEMES[id];
  let out = `<svg viewBox="-6 -10 156 108" aria-hidden="true"><rect x="-6" y="-6" width="156" height="104" rx="12" fill="${t.board}"/>`;
  for (let y = 0; y < 2; y++) for (let x = 0; x < 3; x++) out += `<rect x="${x * 48 + 2}" y="${y * 48 + 2}" width="44" height="44" rx="8" fill="${t.floor}"/>${t.deco(x * 48, y * 48, y * 3 + x)}`;
  for (const [x, y] of [[0, 0], [1, 0], [2, 1]]) out += Art.mazeWall3d(id, x * 48, y * 48, y * 3 + x);
  return out + '</svg>';
}
const mazeTheme = () => Art.MAZE_THEMES[state.mazeStyle] && ownsTheme(state.mazeStyle) ? state.mazeStyle : 'hay';
const wallIcon = (theme) => `<svg viewBox="-2 -12 52 62" aria-hidden="true"><rect x="0" y="0" width="48" height="48" rx="8" fill="${Art.MAZE_THEMES[theme].floor}"/>${Art.mazeWall3d(theme, 0, 0, 0)}</svg>`;
function updateTray() {
  const tray = $('#mtray');
  const style = mazeTheme();
  const sig = run ? 'run' : `${mazeTile}|${style}`;
  if (tray.dataset.sig === sig) return;
  tray.dataset.sig = sig;
  tray.hidden = !!run;
  if (run) return;
  const tile = (id, icon, label) => `<button class="mtile ${id === mazeTile ? 'on' : ''}" data-tile="${id}"><i>${icon}</i><span>${label}</span></button>`;
  tray.innerHTML = tile(1, wallIcon(style), 'Wall') + tile(0, Art.eraserIcon(), 'Eraser') +
    `<button class="mtile mtheme"><i>${themePreview(style)}</i><span>Theme</span></button>`;
  $('.mtheme', tray).addEventListener('click', () => { tut('theme'); pickMazeStyle(); });
  tray.querySelectorAll('.mtile[data-tile]').forEach(b => b.addEventListener('click', () => {
    if (b.classList.contains('locked')) { sfx.nope(); toast('Find more recipes to unlock!'); return; }
    mazeTile = +b.dataset.tile;
    sfx.pop(); render();
  }));
}

// Fun tiles unlock as she finds recipes: zoom pads from the start, tunnels at
// 10 recipes, trampolines at 20.
function funKinds() {
  const n = (state.discovered || []).length;
  return ['zoom', ...(n >= 10 ? ['tunnel'] : []), ...(n >= 20 ? ['bounce'] : [])];
}

function pickMazeStyle() {
  picker('Maze theme', Object.entries(Art.MAZE_THEMES).map(([id, t]) => ownsTheme(id)
    ? { id, html: wallIcon(id), label: t.name }
    : { id, html: '<i class="q">?</i>', label: '???', locked: true }),
  (id) => { state.mazeStyle = id; sfx.pop(); persist(); render(true); },
  (id) => toast(themeLockText(id)));
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
  pig.style.transitionDuration = !run || run.jump === 'tunnel' ? '0s' : run.jump === 'bounce' ? '.5s' : zoom ? '.17s' : '.52s';
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
  if (M.toggleWall(state.maze, x, y, mazeTile)) { sfx.pop(); render(); }
}

function onCheer() {
  if (!run || run.done) { if (!run) startRun(); return; }
  M.cheer(run);
  sfx.wheek();
  render();
}

function startRun() {
  if (!M.solvable(state.maze)) return;
  // Her own mazes get treasure too: if none is left, two goodies drop in.
  M.dropStrandedTreasure(state.maze);
  if (!(state.maze.treasure || []).length) M.hideTreasure(state.maze, Math.random, G.unlockedFillings(state));
  if (!(state.maze.fun || []).length) M.placeFun(state.maze, funKinds());
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
    if (ev === 'zoom') { sfx.wheek(); svgBubble('zoom!'); }
    if (ev === 'tunnel') { sfx.pop(); svgBubble('pop!'); }
    if (ev === 'bounce') { sfx.wheek(); svgBubble('boing!'); pig.classList.remove('boing'); void pig.getBoundingClientRect(); pig.classList.add('boing'); }
    if (ev === 'treasure') {
      const t = M.claim(state, run.found);
      state.stats.treasures = (state.stats.treasures || 0) + 1;
      sfx.coin(); svgBubble('ooh!');
      if (t.coins) { floatCoin(t.coins); toast(`Found ${t.coins} coins!`); }
      else if (t.count) toast(`<i class="toast-ico">${Art.veggie(t.filling, 32)}</i> Found +${t.count} ${G.FILLINGS[t.filling].name}!`);
      else toast(`<i class="toast-ico">${Art.dumpling(t.key, 36)}</i> Surprise! ${G.RECIPES[t.key] ? G.RECIPES[t.key].name : 'A dumpling'}!`);
      persist();
    }
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
let tryHat = null;   // { id, pig }: a hat being tried on before buying
// The shop is split into tabs; the last one picked is kept in the save.
const SHOP_TABS = [
  { id: 'piggies',  name: 'Piggies',  icon: () => Art.upgradeIcon('piggy') },
  { id: 'upgrades', name: 'Upgrades', icon: () => Art.upgradeIcon('sun') },
  { id: 'hats',     name: 'Hats',     icon: () => Art.hatIcon('party') },
  { id: 'toys',     name: 'Toys',     icon: () => Art.toyArt('ball') },
  { id: 'mazes',    name: 'Mazes',    icon: () => Art.mazeIcon() },
];
function shopView() {
  return el(`<section class="shop">
    <div class="shop-head"><div class="awning">${Art.shopScene()}</div>
      <div class="shop-tabs">${SHOP_TABS.map(t => `<button class="stab" data-stab="${t.id}">${t.icon()}<span>${t.name}</span></button>`).join('')}</div></div>
    <div class="shop-sec" data-sec="piggies"><div class="adopt panel" id="adopt"></div></div>
    <div class="shop-sec" data-sec="upgrades"><div id="items"></div></div>
    <div class="shop-sec" data-sec="hats"><div class="hats panel" id="hats"></div></div>
    <div class="shop-sec" data-sec="toys"><div class="toys panel" id="toys"></div></div>
    <div class="shop-sec" data-sec="mazes"><div class="toys panel" id="mthemes"></div></div>
    <button class="reset" id="reset">Start over</button>
    <p class="version">version ${VERSION}</p></section>`);
}

function updateShop() {
  // The hat picker pins just under the shop's awning and tabs.
  const head = $('.shop-head');
  if (head) $('.shop').style.setProperty('--headh', head.offsetHeight + 'px');
  const stab = SHOP_TABS.some(t => t.id === state.shopTab) ? state.shopTab : 'piggies';
  document.querySelectorAll('.stab').forEach(b => {
    b.classList.toggle('active', b.dataset.stab === stab);
    b.onclick = () => { if (state.shopTab !== b.dataset.stab) { state.shopTab = b.dataset.stab; sfx.pop(); persist(); render(); } };
  });
  document.querySelectorAll('.shop-sec').forEach(sec => { sec.hidden = sec.dataset.sec !== stab; });
  const mt = $('#mthemes');
  const msig = JSON.stringify([state.mazeThemes, state.coins, state.stats.mazes, state.stats.treasures, state.booksFilled]);
  if (mt.dataset.sig !== msig) {
    mt.dataset.sig = msig;
    mt.innerHTML = `<p class="hint">New looks for the maze! Pick one with the Theme button.</p><div class="toy-grid"></div>`;
    for (const [id, t] of Object.entries(Art.MAZE_THEMES)) {
      const u = MAZE_UNLOCKS[id], own = ownsTheme(id);
      const label = own ? '<span class="price can">Yours!</span>' : u.cost ? price(u.cost) : `<span class="price box">${u.goal} · ${Math.min(u.have(), u.need)}/${u.need}</span>`;
      const b = el(`<button class="toy-tile tile theme-tile ${own ? 'owned' : ''} ${!own && !u.cost ? 'earn' : ''}">${themePreview(id)}<span>${t.name}</span>${label}</button>`);
      b.addEventListener('click', () => {
        if (own) { state.mazeStyle = id; persist(); sfx.pop(); tab = 'maze'; render(true); return; }
        if (u.cost) buyTheme(id); else { sfx.nope(); toast(themeLockText(id)); }
      });
      $('.toy-grid', mt).appendChild(b);
    }
  }
  const toys = $('#toys');
  const tsig = JSON.stringify([state.toys, state.coins, G.toyLimit(state), Object.keys(G.TOYS).map(id => Math.ceil(G.toyLeft(state, id) * 4))]);
  if (toys.dataset.sig !== tsig) {
    toys.dataset.sig = tsig;
    const inPen = G.toysInPen(state).length, limit = G.toyLimit(state);
    toys.innerHTML = `<div class="toy-count"><b>${inPen} / ${limit}</b> toys in the pen</div>
      <p class="hint">Tap a toy you have to put it in the pen or take it out.${state.upgrades.pen2 ? '' : ' A bigger pen fits one more toy!'}</p><div class="toy-grid"></div>`;
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
  const room = G.hasRoom(state);
  const cost = G.adoptCost(state);
  const offer = G.makeOffer(state);
  const asig = JSON.stringify([offer, cost, state.coins, room, state.piggies.length, state.away.length]);
  if (adopt.dataset.sig !== asig) {
    adopt.dataset.sig = asig;
    const fullNote = `Your pen is full! Pick a new piggy and choose who goes on a sleepover${state.upgrades.pen2 ? '.' : ', or buy a bigger pen in Upgrades.'}`;
    adopt.innerHTML = `<p class="hint">${room ? 'Pick one to join the family. Colors and names are a surprise!' : fullNote}</p><div class="offers"></div>
      <button class="sleep-btn" id="sleepbtn">${Art.toyArt('hut')}<span><b>Sleepover House</b><small>${state.away.length ? `${state.away.length} ${state.away.length === 1 ? 'piggy is' : 'piggies are'} on a sleepover` : 'Nobody is on a sleepover yet'}</small></span></button>`;
    $('#sleepbtn', adopt).onclick = () => { tut('sleepover'); sleepoverHouse(); };
    const box = $('.offers', adopt);
    offer.forEach((o, i) => {
      const b = el(`<button class="offer"><div class="pig-card">${Art.piggySide({ coat: o.coat })}</div><b>${esc(o.name)}</b><small>${G.BREEDS[o.coat.breed].name}</small><em>${G.BREEDS[o.coat.breed].blurb}</em>
        ${cost === 0 ? '<span class="price can">Free!</span>' : price(cost)}</button>`);
      b.addEventListener('click', () => {
        if (state.coins < cost) { sfx.nope(); toast(`Need ${cost - state.coins} more coins`); return; }
        const welcome = () => {
          const r = G.adopt(state, i);
          if (!r.ok) { sfx.nope(); toast('No room in the pen'); return; }
          sfx.fanfare(); selectedPig = r.piggy.id;
          popup('Welcome home!', `<div class="pig-card big">${Art.piggySide({ coat: r.piggy.coat })}</div><p><b>${esc(r.piggy.name)}</b> the ${G.BREEDS[r.piggy.coat.breed].name} moved into the pen.</p>`, 'Yay!', () => { tab = 'steamer'; render(true); });
          render(true);
        };
        if (G.hasRoom(state)) welcome();
        else swapDialog(`Who goes on a sleepover so <b>${esc(o.name)}</b> can move in?`, (id) => { sendAway(id); welcome(); });
      });
      box.appendChild(b);
    });
  }
  const hats = $('#hats');
  const p = current();
  if (tryHat && (tryHat.pig !== p.id || state.hats[tryHat.id])) tryHat = null;
  const showing = tryHat ? tryHat.id : p.hat;
  const hsig = JSON.stringify([state.hats, state.coins, p.id, p.hat, tryHat, state.piggies.map(q => [q.id, q.name, q.hat])]);
  if (hats.dataset.sig !== hsig) {
    hats.dataset.sig = hsig;
    // Who the hats are for, big and clear, with a row of faces to switch piggy.
    // Its name on the left, the piggy being dressed in the middle, every piggy's face on the right.
    const others = state.piggies.filter(q => q.id !== p.id);
    hats.innerHTML = `<div class="hat-pin"><div class="hat-for">
        ${others.length ? `<div class="hat-pigs ${state.piggies.length > 2 ? 'two' : ''}">${state.piggies.map(q => `<button class="face ${q.id === p.id ? 'on' : ''}" data-id="${q.id}" aria-label="Hats for ${esc(q.name)}">${Art.piggyFace({ coat: q.coat, hat: q.hat })}</button>`).join('')}</div>` : ''}
        <div class="hat-model">${Art.piggySide({ coat: p.coat, hat: showing })}</div>
        <div class="hat-who"><small>Hats for</small><b>${esc(p.name)}</b>
          ${tryHat ? `<em>Trying on the ${G.HATS[tryHat.id].name}. ${G.HATS[tryHat.id].goal ? `${G.HATS[tryHat.id].goal} to earn it!` : 'Tap it again to buy!'}</em>` : others.length ? '<em>Tap a face to switch</em>' : ''}</div>
      </div></div>
      <p class="hint small">Tap a hat to try it on. Hats you own fit every piggy.</p><div class="hat-grid"></div>`;
    hats.querySelectorAll('.hat-pigs .face').forEach(f => f.addEventListener('click', () => { selectedPig = +f.dataset.id; tryHat = null; sfx.pop(); render(); }));
    const grid = $('.hat-grid', hats);
    for (const [id, h] of Object.entries(G.HATS)) {
      const owned = !!state.hats[id];
      const wearing = p.hat === id;
      const trying = tryHat && tryHat.id === id;
      const locked = h.goal && !owned;
      const b = el(`<button class="hat tile ${owned ? 'owned' : ''} ${wearing ? 'wearing' : ''} ${trying ? 'trying' : ''} ${locked ? 'earn' : ''}">${Art.hatIcon(id)}<span>${h.name}</span>
        ${locked ? `<span class="price goal">${Math.min(h.have(state), h.need)} / ${h.need}</span>` : wearing ? '<span class="price can">Wearing</span>' : owned ? '<span class="price">Wear</span>' : trying ? `<span class="price buy">Buy ${h.cost} <i class="coin-sm">${Art.coinIcon()}</i></span>` : price(h.cost)}</button>`);
      b.addEventListener('click', () => {
        if (locked && trying) { sfx.pop(); toast(`${h.goal} to earn it!`); return; }
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
    const name = G.poopName(k);
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
      <small class="tier-odds">${t.odds}${ks[0] && ks[0].shape === 'sp' && ks.length > 1 ? '<br>Any color or sparkle fills its spot in the book. The rest are bonus!' : ''}</small>
      <div class="pk-grid">${ks.map(tile).join('')}</div>
      <div class="dots">${G.POOP_TIERS.map((_, j) => `<i class="${j === i ? 'on' : ''}"></i>`).join('')}<span>Page ${i + 1} of ${n}</span></div></div>`;
  }).join('');
  const ach = G.ACHIEVEMENTS.map(a => {
    const won = !!(state.achievements || {})[a.id];
    return `<div class="ach ${won ? 'got' : ''}"><span class="badge">${won ? Art.badgeIcon() : Art.badgeIcon(true)}</span><span class="txt"><b>${a.name}</b><small>${a.desc}</small></span><span class="price ${won ? 'can' : ''}">${won ? 'Done!' : `${a.coins} <i class="coin-sm">${Art.coinIcon()}</i>`}</span></div>`;
  }).join('');
  popup(`Poop Book`, `<div class="book-tabs"><button class="on" data-pane="poops">Poops <small>${found} / ${G.bookSlots().length}</small></button><button data-pane="badges">Badges <small>${got} / ${G.ACHIEVEMENTS.length}</small></button></div>
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
  const name = G.poopName(k);
  const tier = G.POOP_TIERS.find(t => t.colors.includes(k.color));
  const odds = ((k.shape === 'sp' && G.parseSpecial(k.color).def) || G.POOP_ODDS.find(o => o.label === G.POOP_COLORS[k.color]) || tier).odds || tier.odds;
  const v = G.poopValue(k);
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
  // Every page gets the same number of spots (blank ones fill short pages) so
  // the book keeps one size as pages turn and dumplings are found.
  const pad = Math.max(...pages.map(p => p.keys.length));
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
      <div class="pk-grid">${p.keys.map(tile).join('')}${'<i class="pk pk-pad"></i>'.repeat(pad - p.keys.length)}</div>
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
    sfx.fanfare(); box.remove(); render(); toast(`Hello, ${esc(p.name)}!`, 'big');
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

// The Sleepover House lists the piggies who are away. Tapping one brings it
// home; if the pen is full, a piggy from the pen goes on a sleepover instead.
function sleepoverHouse() {
  sfx.pop();
  const box = el(`<div class="modal"><div class="card panel"><div class="ribbon"><span>Sleepover House</span></div>
    ${state.away.length ? `<p>Tap a piggy to bring it home.</p>
      <div class="swap-list">${state.away.map(q => `<button class="sleeper" data-id="${q.id}">${Art.piggyFace({ coat: q.coat, hat: q.hat })}<span>${esc(q.name)}</span></button>`).join('')}</div>`
      : `<div class="toy-card">${Art.toyArt('hut')}</div><p>Nobody is on a sleepover right now. When your pen is full and you adopt a new piggy, one piggy comes here to stay, safe and happy.</p>`}
    <div class="row center"><button class="btn btn-grey">Close</button></div></div></div>`);
  box.querySelectorAll('.sleeper').forEach(b => b.addEventListener('click', () => {
    const q = state.away.find(x => x.id === +b.dataset.id);
    if (!q) return;
    box.remove();
    const home = () => {
      if (!G.bringHome(state, q.id).ok) return;
      sfx.fanfare(); selectedPig = q.id;
      popup('Home again!', `<div class="pig-card big">${Art.piggySide({ coat: q.coat, hat: q.hat })}</div><p><b>${esc(q.name)}</b> had a great sleepover and is back in the pen!</p>`, 'Yay!', () => { tab = 'steamer'; render(true); });
      render(true);
    };
    if (G.hasRoom(state)) home();
    else swapDialog(`Who trades places with <b>${esc(q.name)}</b> and goes on a sleepover?`, (id) => { sendAway(id); home(); });
  }));
  $('.btn-grey', box).onclick = () => box.remove();
  document.body.appendChild(box);
}

// Pick a piggy from the pen to go on a sleepover.
function swapDialog(text, onPick) {
  const box = el(`<div class="modal"><div class="card panel"><div class="ribbon"><span>Sleepover!</span></div>
    <p>${text}</p><p class="hint small">They stay safe in the Sleepover House and can come home any time.</p>
    <div class="swap-list">${state.piggies.map(q => `<button class="sleeper" data-id="${q.id}">${Art.piggyFace({ coat: q.coat, hat: q.hat })}<span>${esc(q.name)}</span></button>`).join('')}</div>
    <div class="row center"><button class="btn btn-grey">Cancel</button></div></div></div>`);
  box.querySelectorAll('.sleeper').forEach(b => b.addEventListener('click', () => { box.remove(); onPick(+b.dataset.id); }));
  $('.btn-grey', box).onclick = () => box.remove();
  document.body.appendChild(box);
}

function sendAway(id) {
  if (!G.sleepover(state, id).ok) return;
  wander.delete(id);
  if (selectedPig === id) selectedPig = state.piggies[0].id;
}

function picker(title, options, onPick, onLocked = null) {
  const box = el(`<div class="modal"><div class="card panel"><div class="ribbon"><span>${title}</span></div><div class="opts ${options.length > 6 ? 'many' : ''}"></div><div class="row center"><button class="btn btn-grey">Cancel</button></div></div></div>`);
  for (const o of options) {
    const b = el(`<button class="opt tile ${o.locked ? 'locked' : ''}">${o.html}<span>${o.label}</span>${o.count != null ? `<b class="count have">${o.count}</b>` : ''}${o.cost != null ? `<b class="cost">${Art.compostIcon()}${o.cost}</b>` : ''}</button>`);
    b.onclick = () => { if (o.locked) { sfx.nope(); if (onLocked) onLocked(o.id); return; } box.remove(); onPick(o.id); };
    $('.opts', box).appendChild(b);
  }
  $('.btn-grey', box).onclick = () => box.remove();
  document.body.appendChild(box);
}

// ---------- Settings ----------
// The gear in the top bar: sound sliders with on/off switches, and the
// tutorial replay.
const SOUND_ROWS = [
  { kind: 'master', name: 'All sound', icon: 'speaker' },
  { kind: 'music',  name: 'Music',     icon: 'music' },
  { kind: 'sfx',    name: 'Effects',   icon: 'sfx' },
];
function settings() {
  const rows = SOUND_ROWS.map(r => `<div class="snd-row" data-kind="${r.kind}">
      <span class="snd-ico">${Art.icon(r.icon)}</span>
      <span class="snd-main"><b>${r.name}</b><input type="range" min="0" max="100" step="5" aria-label="${r.name} volume"></span>
      <button class="switch" role="switch" aria-label="${r.name} on or off"><i></i></button>
    </div>`).join('');
  const box = el(`<div class="modal"><div class="card panel settings">
    <div class="ribbon"><span>Settings</span></div>
    <div class="snd panel">${rows}</div>
    <div class="row center"><button class="btn btn-grey" id="replay">Replay tutorial</button></div>
    <div class="row center"><button class="btn big" id="sclose">Done</button></div></div></div>`);
  const show = () => {
    const masterOn = volume.get('master').on;
    box.querySelectorAll('.snd-row').forEach(row => {
      const v = volume.get(row.dataset.kind);
      row.querySelector('input').value = Math.round(v.vol * 100);
      row.querySelector('.switch').setAttribute('aria-checked', v.on);
      row.classList.toggle('off', !v.on || (row.dataset.kind !== 'master' && !masterOn));
    });
  };
  box.querySelectorAll('.snd-row').forEach(row => {
    const kind = row.dataset.kind;
    const input = row.querySelector('input');
    input.addEventListener('input', () => { volume.set(kind, { vol: input.value / 100, on: true }); show(); });
    input.addEventListener('change', () => { if (kind !== 'music') sfx.pop(); });
    row.querySelector('.switch').addEventListener('click', () => { volume.set(kind, { on: !volume.get(kind).on }); show(); sfx.pop(); });
  });
  $('#replay', box).onclick = () => {
    box.remove();
    state.tutorial = { step: 1 };
    tab = 'steamer'; sfx.ding(); render(true);
  };
  $('#sclose', box).onclick = () => { box.remove(); sfx.pop(); updateCoach(); };
  show();
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
