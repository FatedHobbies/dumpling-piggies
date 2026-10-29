// Pure game logic. No DOM, no storage. The UI calls these functions and
// reads `state`; the save layer serializes `state`. Keeping this file free of
// platform code is what lets the game move to Reddit later.

import { NAMES, NAME_MAX, SHORT_NAMES, isNiceName } from './names.js';

export const FILLINGS = {
  carrot:     { name: 'Carrot',     color: '#FF9A3C' },
  cabbage:    { name: 'Cabbage',    color: '#8FD07A' },
  pea:        { name: 'Pea',        color: '#5BC86A' },
  strawberry: { name: 'Strawberry', color: '#FF5C7A' },
};

// Every pair of fillings (order doesn't matter) is a recipe. Effects are
// what the piggy does after eating one.
export const RECIPES = {
  'carrot+carrot':         { name: 'Carrot Crunch',   effect: null,      hunger: 35, coins: 4 },
  'cabbage+cabbage':       { name: 'Cabbage Bao',     effect: null,      hunger: 35, coins: 4 },
  'pea+pea':               { name: 'Pea Puff',        effect: null,      hunger: 30, coins: 4 },
  'strawberry+strawberry': { name: 'Berry Bun',       effect: 'sparkle', hunger: 25, coins: 6 },
  'cabbage+carrot':        { name: 'Garden Dumpling', effect: null,      hunger: 40, coins: 5 },
  'carrot+pea':            { name: 'Sunny Dumpling',  effect: null,      hunger: 40, coins: 5 },
  'cabbage+pea':           { name: 'Nap Bao',         effect: 'sleepy',  hunger: 40, coins: 5 },
  'carrot+strawberry':     { name: 'Sunset Dumpling', effect: 'zoom',    hunger: 30, coins: 7 },
  'cabbage+strawberry':    { name: 'Pink Bao',        effect: 'sparkle', hunger: 30, coins: 6 },
  'pea+strawberry':        { name: 'Confetti Dumpling', effect: 'zoom',  hunger: 30, coins: 7 },
};

export const UPGRADES = {
  plot4:    { name: 'Fourth garden plot', desc: 'One more plot to grow veggies in.',             cost: 60,  icon: 'plot' },
  sunlamp:  { name: 'Sun lamp',           desc: 'Veggies grow twice as fast.',                    cost: 90,  icon: 'sun' },
  autoscoop:{ name: 'Robo-scooper',       desc: 'A tiny robot scoops poop while you are away.',   cost: 150, icon: 'robot' },
  bigbowl:  { name: 'Big bowl',           desc: 'Your piggies stay full for longer.',             cost: 120, icon: 'bowl' },
  pen2:     { name: 'Bigger pen',         desc: 'Room for two more piggies.',                     cost: 300, icon: 'pen' },
  pen3:     { name: 'Huge pen',           desc: 'Room for two more piggies after that.',          cost: 800, icon: 'pen', needs: 'pen2' },
};

// Hats are bought once and any piggy can wear one. Each piggy has `hat`.
export const HATS = {
  bow:        { name: 'Pink bow',        cost: 40 },
  poop:       { name: 'Poop hat',        cost: 50 },
  strawberry: { name: 'Strawberry hat',  cost: 60 },
  flower:     { name: 'Daisy',           cost: 60 },
  party:      { name: 'Party hat',       cost: 70 },
  beanie:     { name: 'Cozy beanie',     cost: 90 },
  sunhat:     { name: 'Sun hat',         cost: 90 },
  chef:       { name: 'Chef hat',        cost: 100 },
  dumpling:   { name: 'Dumpling hat',    cost: 120 },
  crown:      { name: 'Royal crown',     cost: 180 },
  wizard:     { name: 'Wizard hat',      cost: 220 },
};

export function buyHat(state, id) {
  const h = HATS[id];
  if (!h || state.hats[id]) return { ok: false };
  if (state.coins < h.cost) return { ok: false, reason: 'coins' };
  state.coins -= h.cost;
  state.hats[id] = true;
  return { ok: true };
}

export function wearHat(state, piggyId, id) {
  const p = piggy(state, piggyId);
  if (!p || (id && !state.hats[id])) return { ok: false };
  p.hat = id || null;
  return { ok: true };
}

// Pen toys sit in the pen at a fixed spot (x, y as fractions of the pen
// floor) and piggies wander over to play. `state.toys[id]` is 'pen' or 'box'
// (owned but put away); only TOY_LIMIT fit in the pen at once. Chews get
// nibbled away (`state.toyWear`, 0 to 100) and must be bought again.
export const TOYS = {
  ball:   { name: 'Bouncy ball',  desc: 'Piggies love to nose it around.',  cost: 30,  x: 0.80, y: 0.58 },
  chew:   { name: 'Chew sticks',  desc: 'A crunchy bundle to nibble on. Gets eaten up!', cost: 25, x: 0.32, y: 0.80, chew: true },
  carrot: { name: 'Carrot chew',  desc: 'A wooden carrot to gnaw. Gets eaten up!',      cost: 20, x: 0.56, y: 0.68, chew: true },
  tunnel: { name: 'Fuzzy tunnel', desc: 'Run in one end and out the other!', cost: 80,  x: 0.80, y: 0.95 },
  hut:    { name: 'Dumpling hut', desc: 'A cozy hidey house shaped like a dumpling.', cost: 120, x: 0.17, y: 0.62 },
  slide:  { name: 'Tiny slide',   desc: 'Wheee! Down the slide.',            cost: 160, x: 0.52, y: 0.34 },
};
const CHEW_BITE = 2.5;            // wear per nibble
const CHEW_DAY = 100 / 86400;     // a chew in the pen also wears out over one day

export function toyLimit(state) {
  return 3 + (state.upgrades.pen2 ? 1 : 0) + (state.upgrades.pen3 ? 1 : 0);
}
export function toysInPen(state) {
  return Object.keys(TOYS).filter(id => state.toys[id] === 'pen');
}
export function toyLeft(state, id) {
  return Math.max(0, 1 - (state.toyWear[id] || 0) / 100);
}

// New toys go straight into the pen if there is room, otherwise into the box.
export function buyToy(state, id) {
  const t = TOYS[id];
  if (!t || state.toys[id]) return { ok: false };
  if (state.coins < t.cost) return { ok: false, reason: 'coins' };
  state.coins -= t.cost;
  state.toys[id] = toysInPen(state).length < toyLimit(state) ? 'pen' : 'box';
  delete state.toyWear[id];
  return { ok: true, where: state.toys[id] };
}

// Move an owned toy between the pen and the toy box.
export function moveToy(state, id) {
  const at = state.toys[id];
  if (!at) return { ok: false };
  if (at === 'pen') { state.toys[id] = 'box'; return { ok: true, where: 'box' }; }
  if (toysInPen(state).length >= toyLimit(state)) return { ok: false, reason: 'full' };
  state.toys[id] = 'pen';
  return { ok: true, where: 'pen' };
}

function wearToy(state, id, amount, events) {
  state.toyWear[id] = (state.toyWear[id] || 0) + amount;
  if (state.toyWear[id] < 100) return;
  delete state.toys[id];
  delete state.toyWear[id];
  if (events) events.push({ type: 'toyGone', id });
}

// A piggy reached a toy: a little more fun, no coins. Chews get a bite taken.
export function playToy(state, piggyId, id) {
  const p = piggy(state, piggyId);
  if (!p) return { ok: false };
  p.fun = clamp(p.fun + 4, 0, 100);
  let gone = false;
  if (TOYS[id] && TOYS[id].chew && state.toys[id] === 'pen') {
    const ev = [];
    wearToy(state, id, CHEW_BITE, ev);
    gone = ev.length > 0;
  }
  return { ok: true, piggy: p, gone };
}

export const RENAME_COST = 30;
export { NAME_MAX };
export const ADOPT_COST = [0, 80, 200, 400, 700, 1000];
export const MAX_PIGGIES = 6;

// Real guinea pig breeds, which decide hair length and texture. Colors are
// picked separately so two piggies of one breed still look different.
export const BREEDS = {
  american:   { name: 'American',    blurb: 'Short, smooth and shiny.' },
  abyssinian: { name: 'Abyssinian',  blurb: 'Swirly rosettes all over.' },
  peruvian:   { name: 'Peruvian',    blurb: 'Long flowing hair, a bit messy.' },
  silkie:     { name: 'Silkie',      blurb: 'Silky hair swept back like a cape.' },
  texel:      { name: 'Texel',       blurb: 'Curly like a little sheep.' },
  skinny:     { name: 'Skinny pig',  blurb: 'Almost no hair at all!' },
};

export const COLORS = {
  ginger:    '#E9A15B',
  chocolate: '#7A4A2B',
  cream:     '#F3DDB0',
  black:     '#3B2A24',
  white:     '#FFF7EC',
  grey:      '#A8A09A',
  lilac:     '#C9B8D6',
};

export const GROW_TIME = 90;        // seconds for a plant to be ready
export const MAX_AWAY = 8 * 3600;   // away-time progress is capped at 8 hours
export const MAX_POOPS = 8;

export function randomName(rng = Math.random, taken = []) {
  const free = NAMES.filter(n => !taken.includes(n));
  const pool = free.length ? free : NAMES;
  return pool[Math.floor(rng() * pool.length)];
}

export function randomCoat(rng = Math.random, breed = null) {
  const breeds = Object.keys(BREEDS);
  breed = breed || breeds[Math.floor(rng() * breeds.length)];
  const colors = Object.keys(COLORS);
  const main = colors[Math.floor(rng() * colors.length)];
  let patch = colors[Math.floor(rng() * colors.length)];
  if (patch === main) patch = main === 'white' ? 'ginger' : 'white';
  return { breed, main, patch };
}

export function newPiggy(state, coat, name, rng = Math.random) {
  return {
    id: state.nextId++,
    name: name || randomName(rng, state.piggies.map(p => p.name)),
    coat: coat || randomCoat(rng),
    hunger: 70, fun: 70, effect: null, effectUntil: 0, hat: null,
    x: 0.3 + rng() * 0.4, y: 0.5,
  };
}

export function newState(now = Date.now()) {
  const s = {
    version: 2,
    coins: 0,
    piggies: [],
    poops: [],                      // { id, x, y }
    garden: [null, null, null],     // null or { filling, plantedAt }
    compost: 2,                     // scooped poop, needed to plant
    pantry: { carrot: 2, cabbage: 1, pea: 1, strawberry: 0 },
    dumplings: { 'carrot+carrot': 1 }, // one dumpling to feed during the tutorial
    tutorial: { step: 1 },          // first-play tutorial progress; { done: true } when finished
    discovered: [],                 // recipe keys found so far
    upgrades: {},                   // upgradeId -> true
    hats: {},                       // hatId -> true (owned)
    bookPage: {},                   // poop kinds found on the current Poop Book page
    booksFilled: 0,                 // times the Poop Book has been filled
    toys: {},                       // toyId -> 'pen' or 'box'
    toyWear: {},                    // toyId -> 0..100, how much of a chew is eaten
    stats: { fed: 0, scooped: 0, cooked: 0, petted: 0 },
    offer: null,                    // the three piggies up for adoption
    lastSeen: now,
    createdAt: now,
    nextId: 1,
  };
  s.piggies.push(newPiggy(s, randomCoat(Math.random, 'american')));
  return s;
}

// Older saves had one `piggy`; lift it into the `piggies` list.
export function migrate(state) {
  if (!state.tutorial) state.tutorial = { done: true };   // saves from before the tutorial existed
  if (!state.toys) state.toys = {};
  if (!state.toyWear) state.toyWear = {};
  let room = toyLimit(state);                               // toys from v21 were just `true`
  for (const id of Object.keys(state.toys)) if (state.toys[id] === true) state.toys[id] = room-- > 0 ? 'pen' : 'box';
  if (!state.hats) {                                        // the old single strawberry-hat upgrade
    state.hats = {};
    if (state.upgrades && state.upgrades.hat) {
      state.hats.strawberry = true;
      for (const p of (state.piggies || [])) p.hat = 'strawberry';
      delete state.upgrades.hat;
    }
  }
  for (const p of [...(state.piggies || []), ...(state.offer || [])]) if (SHORT_NAMES[p.name]) p.name = SHORT_NAMES[p.name];
  if (!state.bookPage) {                                   // saves from before the book could be refilled
    state.bookPage = {};
    for (const k of Object.keys(state.poopBook || {})) if (state.poopBook[k] > 0) state.bookPage[k] = true;
    state.booksFilled = 0;
  }
  if (state.version >= 2) return state;
  const old = state.piggy || {};
  state.piggies = [{
    id: state.nextId++, name: old.name || 'Bao', coat: { breed: 'american', main: 'ginger', patch: 'white' },
    hunger: old.hunger ?? 70, fun: old.fun ?? 70, effect: old.effect || null, effectUntil: old.effectUntil || 0, x: 0.5, y: 0.5,
  }];
  delete state.piggy;
  state.offer = null;
  state.version = 2;
  return state;
}

export function recipeKey(a, b) {
  return [a, b].sort().join('+');
}

export function plotCount(state) {
  return state.upgrades.plot4 ? 4 : 3;
}

export function growTime(state) {
  return state.upgrades.sunlamp ? GROW_TIME / 2 : GROW_TIME;
}

export function capacity(state) {
  return state.upgrades.pen3 ? 6 : state.upgrades.pen2 ? 4 : 2;
}

export function adoptCost(state) {
  return ADOPT_COST[Math.min(state.piggies.length, ADOPT_COST.length - 1)];
}

export function isHappy(state, p) {
  return p.hunger > 40 && p.fun > 40 && state.poops.length < 4;
}

// Mood drives the piggy's face and the coin trickle.
export function mood(state, p) {
  if (p.hunger < 25) return 'hungry';
  if (state.poops.length >= 5) return 'stinky';
  if (p.fun < 25) return 'bored';
  if (p.hunger > 60 && p.fun > 60) return 'happy';
  return 'okay';
}

export function hungriest(state) {
  return state.piggies.reduce((a, b) => (b.hunger < a.hunger ? b : a), state.piggies[0]);
}

export function piggy(state, id) {
  return state.piggies.find(p => p.id === id) || null;
}

// Advance the simulation by `dt` seconds. Returns a list of events the UI
// may want to show (coins earned, effect ended, plant ready...).
export function tick(state, dt, now = Date.now()) {
  const events = [];
  const hungerRate = state.upgrades.bigbowl ? 100 / 1800 : 100 / 1200; // full to empty in 30 or 20 min
  const funRate = 100 / 900;                                             // 15 min
  let happy = 0;
  for (const p of state.piggies) {
    const sleepy = p.effect === 'sleepy' && now < p.effectUntil;
    p.hunger = clamp(p.hunger - hungerRate * dt * (sleepy ? 0.25 : 1), 0, 100);
    p.fun = clamp(p.fun - funRate * dt * (sleepy ? 0.25 : 1), 0, 100);
    if (p.effect && now >= p.effectUntil) {
      p.effect = null;
      events.push({ type: 'effectEnd', id: p.id });
    }
    if (isHappy(state, p)) happy += p.effect === 'sparkle' ? 2 : 1;
  }

  // Chews in the pen slowly get nibbled even when nobody is watching.
  for (const id of toysInPen(state)) if (TOYS[id].chew) wearToy(state, id, CHEW_DAY * dt, events);

  // Each happy piggy earns a trickle: 1 coin every 20 seconds, double while sparkling.
  if (happy > 0) {
    state.trickle = (state.trickle || 0) + happy / 20 * dt;
    while (state.trickle >= 1) {
      state.trickle -= 1;
      state.coins += 1;
      events.push({ type: 'coin', amount: 1, source: 'trickle' });
    }
  }

  // Fed piggies poop every so often (about once per 2 minutes each while fed).
  const fed = state.piggies.filter(p => p.hunger > 30).length;
  if (fed > 0 && state.poops.length < MAX_POOPS) {
    state.poopTimer = (state.poopTimer || 0) + dt * fed;
    if (state.poopTimer >= 120) {
      state.poopTimer = 0;
      addPoop(state);
      events.push({ type: 'poop' });
    }
  }

  state.lastSeen = now;
  return events;
}

// Called once on load. Simulates the time away in coarse steps so the piggies
// don't drain to zero while she sleeps, then summarises what happened.
export function applyAway(state, now = Date.now()) {
  const away = Math.max(0, (now - state.lastSeen) / 1000);
  const simulated = Math.min(away, MAX_AWAY);
  const before = state.coins;
  const poopsBefore = state.poops.length;
  let t = 0;
  while (t < simulated) {
    const step = Math.min(30, simulated - t);
    tick(state, step, state.lastSeen + (t + step) * 1000);
    t += step;
  }
  // Neglect never goes below "a bit grumpy": the piggies are never in danger.
  for (const p of state.piggies) {
    p.hunger = Math.max(p.hunger, 15);
    p.fun = Math.max(p.fun, 15);
  }
  let scooped = 0;
  if (state.upgrades.autoscoop) {
    scooped = state.poops.length;
    for (const poop of state.poops) { state.compost += (POOP_VALUE[poop.color] || POOP_VALUE.brown).compost; collect(state, poop); }
    state.poops = [];
    state.stats.scooped += scooped;
  }
  state.lastSeen = now;
  return { away, coins: state.coins - before, poops: state.poops.length - poopsBefore, scooped };
}

// Poops come in kinds. The shape is random, the color comes from the last
// dumpling the pooping piggy ate, and now and then one is rainbow or golden.
// Colors match the squishy dumpling set: plain ones, then the glitter ones.
export const POOP_COLORS = {
  brown: 'Plain', white: 'White', pink: 'Pink', red: 'Red', blue: 'Blue', green: 'Green', orange: 'Orange', lavender: 'Lavender',
  gred: 'Glitter red', ggreen: 'Glitter green', gpink: 'Glitter pink', silver: 'Silver', aqua: 'Aqua', purple: 'Purple',
  rainbow: 'Rainbow', gold: 'Golden', crystal: 'Crystal',
};
export const GLITTER = ['gred', 'ggreen', 'gpink', 'silver', 'aqua', 'purple', 'gold', 'crystal'];
export const PLAIN_COLORS = ['white', 'pink', 'red', 'blue', 'green', 'orange', 'lavender'];
// Odds per poop, shown in the Poop Book.
export const POOP_ODDS = [
  { label: 'Plain colors', odds: 'common' }, { label: 'Glitter', odds: '1 in 12' }, { label: 'Rainbow', odds: '1 in 33' },
  { label: 'Golden', odds: '1 in 100' }, { label: 'Crystal', odds: '1 in 250' },
];
// The Poop Book groups kinds by how rare they are.
export const POOP_TIERS = [
  { label: 'Everyday', odds: 'common', colors: ['brown', ...PLAIN_COLORS] },
  { label: 'Glitter', odds: '1 in 12', colors: ['gred', 'ggreen', 'gpink', 'silver', 'aqua', 'purple'] },
  { label: 'Super rare', odds: 'rainbow 1 in 33 · golden 1 in 100 · crystal 1 in 250', colors: ['rainbow', 'gold', 'crystal'] },
];
export const POOP_VALUE = { brown: { coins: 2, compost: 1 }, rainbow: { coins: 10, compost: 3 }, gold: { coins: 25, compost: 5 }, crystal: { coins: 50, compost: 8 } };
for (const c of PLAIN_COLORS) POOP_VALUE[c] = { coins: 3, compost: 1 };
for (const c of ['gred', 'ggreen', 'gpink', 'silver', 'aqua', 'purple']) POOP_VALUE[c] = { coins: 6, compost: 2 };

export function poopKind(state, rng = Math.random) {
  const fed = state.piggies.filter(p => p.hunger > 30);
  const pooper = fed[Math.floor(rng() * fed.length)] || state.piggies[0];
  const shape = rng() < 0.4 ? 'swirl' : 'beans';
  let color = 'brown';
  const food = pooper && pooper.lastFood ? pooper.lastFood : '';
  if (food.includes('strawberry')) color = 'pink';
  else if (food.includes('carrot')) color = 'orange';
  else if (food.includes('cabbage') || food.includes('pea')) color = 'green';
  // A quarter of plain poops come out in a surprise plain color.
  else if (rng() < 0.25) color = PLAIN_COLORS[Math.floor(rng() * PLAIN_COLORS.length)];
  const r = rng();
  // Rare ones: crystal 1 in 250, golden 1 in 100, rainbow 1 in 33, glitter 1 in 12.
  if (r < 0.004) color = 'crystal';
  else if (r < 0.014) color = 'gold';
  else if (r < 0.044) color = 'rainbow';
  else if (r < 0.127) color = ['gred', 'ggreen', 'gpink', 'silver', 'aqua', 'purple'][Math.floor(rng() * 6)];
  return { shape, color };
}

export function addPoop(state) {
  const kind = poopKind(state);
  state.poops.push({ id: state.nextId++, x: 0.1 + Math.random() * 0.8, y: 0.2 + Math.random() * 0.75, ...kind });
}

// The Poop Book counts every kind scooped (by hand or by the robot).
export const POOP_SHAPES = { beans: 'Beans', swirl: 'Swirly' };
export const poopKey = (p) => (p.shape || 'beans') + '-' + (p.color || 'brown');
// state.poopBook keeps lifetime counts; state.bookPage is the page being
// filled right now, which starts fresh each time the book is completed.
function collect(state, poop) {
  state.poopBook = state.poopBook || {};
  state.poopBook[poopKey(poop)] = (state.poopBook[poopKey(poop)] || 0) + 1;
  state.bookPage = state.bookPage || {};
  state.bookPage[poopKey(poop)] = true;
}
export function poopKinds() {
  const out = [];
  for (const color of Object.keys(POOP_COLORS)) for (const shape of Object.keys(POOP_SHAPES)) out.push({ shape, color, key: shape + '-' + color });
  return out;
}
export function poopsFound(state) {
  return poopKinds().filter(k => (state.poopBook || {})[k.key] > 0).length;
}

export function pageFound(state) {
  return poopKinds().filter(k => (state.bookPage || {})[k.key]).length;
}

// Filling every spot on the page pays a big prize (bigger each time, up to a
// cap), adds one to the books-filled counter, and starts a fresh page.
export const bookReward = (filled) => Math.min(500 + 100 * filled, 1000);
export function checkBookFull(state) {
  if (pageFound(state) < poopKinds().length) return null;
  const coins = bookReward(state.booksFilled || 0);
  state.booksFilled = (state.booksFilled || 0) + 1;
  state.coins += coins;
  state.bookPage = {};
  return { coins, filled: state.booksFilled };
}

// Achievements for the Poop Book. Each pays coins once.
export const ACHIEVEMENTS = [
  { id: 'first',    name: 'First scoop',      desc: 'Scoop your very first poop.',        coins: 5,   test: s => s.stats.scooped >= 1 },
  { id: 'swirly',   name: 'Swirly spotter',   desc: 'Collect a swirly poop.',             coins: 10,  test: s => Object.keys(s.poopBook || {}).some(k => k.startsWith('swirl')) },
  { id: 'rainbow',  name: 'Rainbow hunter',   desc: 'Find a rainbow poop.',               coins: 25,  test: s => poopKinds().some(k => k.color === 'rainbow' && (s.poopBook || {})[k.key]) },
  { id: 'gold',     name: 'Golden touch',     desc: 'Find a golden poop.',                coins: 50,  test: s => poopKinds().some(k => k.color === 'gold' && (s.poopBook || {})[k.key]) },
  { id: 'glitter',  name: 'Glitter getter',   desc: 'Find a glitter poop.',               coins: 15,  test: s => poopKinds().some(k => ['gred', 'ggreen', 'gpink', 'silver', 'aqua', 'purple'].includes(k.color) && (s.poopBook || {})[k.key]) },
  { id: 'crystal',  name: 'Crystal gazer',    desc: 'Find a crystal poop.',               coins: 75,  test: s => poopKinds().some(k => k.color === 'crystal' && (s.poopBook || {})[k.key]) },
  { id: 'five',     name: 'Collector',        desc: 'Collect 5 different kinds of poop.', coins: 20,  test: s => poopsFound(s) >= 5 },
  { id: 'all',      name: 'Poop professor',   desc: 'Fill the whole Poop Book.',          coins: 100, test: s => poopsFound(s) >= poopKinds().length },
  { id: 'scoop50',  name: 'Scooper',          desc: 'Scoop 50 poops.',                    coins: 20,  test: s => s.stats.scooped >= 50 },
  { id: 'scoop250', name: 'Super scooper',    desc: 'Scoop 250 poops.',                   coins: 60,  test: s => s.stats.scooped >= 250 },
];

export function checkAchievements(state) {
  state.achievements = state.achievements || {};
  const won = [];
  for (const a of ACHIEVEMENTS) {
    if (!state.achievements[a.id] && a.test(state)) { state.achievements[a.id] = true; state.coins += a.coins; won.push(a); }
  }
  return won;
}

export function feed(state, key, piggyId = null, now = Date.now()) {
  const r = RECIPES[key];
  if (!r || !(state.dumplings[key] > 0)) return { ok: false, reason: 'none' };
  const p = (piggyId != null && piggy(state, piggyId)) || hungriest(state);
  if (!p) return { ok: false, reason: 'none' };
  if (p.hunger >= 98) return { ok: false, reason: 'full', piggy: p };
  state.dumplings[key] -= 1;
  p.hunger = clamp(p.hunger + r.hunger, 0, 100);
  p.fun = clamp(p.fun + 5, 0, 100);
  state.coins += r.coins;
  state.stats.fed += 1;
  if (r.effect) { p.effect = r.effect; p.effectUntil = now + 20000; }
  p.lastFood = key;
  // Eating makes poop more likely soon.
  state.poopTimer = (state.poopTimer || 0) + 45;
  return { ok: true, coins: r.coins, effect: r.effect, piggy: p };
}

export function pet(state, piggyId) {
  const p = piggy(state, piggyId) || state.piggies[0];
  const gain = p.fun < 100 ? 12 : 0;
  p.fun = clamp(p.fun + 12, 0, 100);
  state.stats.petted += 1;
  // Petting pays a little only while it is still fun for the piggy.
  const coins = gain > 0 ? 1 : 0;
  state.coins += coins;
  return { ok: true, coins, piggy: p };
}

export function scoop(state, id) {
  const i = state.poops.findIndex(p => p.id === id);
  if (i < 0) return { ok: false };
  const poop = state.poops.splice(i, 1)[0];
  const v = POOP_VALUE[poop.color] || POOP_VALUE.brown;
  state.compost += v.compost;
  state.coins += v.coins;
  state.stats.scooped += 1;
  collect(state, poop);
  return { ok: true, coins: v.coins, compost: v.compost, poop };
}

export function plant(state, plot, filling, now = Date.now()) {
  if (plot >= plotCount(state) || state.garden[plot]) return { ok: false, reason: 'busy' };
  if (!FILLINGS[filling]) return { ok: false };
  if (state.compost < 1) return { ok: false, reason: 'compost' };
  state.compost -= 1;
  state.garden[plot] = { filling, plantedAt: now };
  return { ok: true };
}

export function plantProgress(state, plot, now = Date.now()) {
  const g = state.garden[plot];
  if (!g) return 0;
  return clamp((now - g.plantedAt) / 1000 / growTime(state), 0, 1);
}

export function harvest(state, plot, now = Date.now()) {
  const g = state.garden[plot];
  if (!g || plantProgress(state, plot, now) < 1) return { ok: false };
  state.garden[plot] = null;
  state.pantry[g.filling] = (state.pantry[g.filling] || 0) + 2;
  state.coins += 1;
  return { ok: true, filling: g.filling, amount: 2 };
}

export function cook(state, a, b) {
  if (!FILLINGS[a] || !FILLINGS[b]) return { ok: false };
  const need = a === b ? 2 : 1;
  if ((state.pantry[a] || 0) < need || (a !== b && (state.pantry[b] || 0) < 1)) return { ok: false, reason: 'pantry' };
  state.pantry[a] -= 1;
  state.pantry[b] -= 1;
  const key = recipeKey(a, b);
  state.dumplings[key] = (state.dumplings[key] || 0) + 1;
  state.stats.cooked += 1;
  let isNew = false;
  if (!state.discovered.includes(key)) {
    state.discovered.push(key);
    state.coins += 10;
    isNew = true;
  }
  return { ok: true, key, isNew, recipe: RECIPES[key] };
}

export function canBuy(state, id) {
  const u = UPGRADES[id];
  return !!u && !state.upgrades[id] && (!u.needs || state.upgrades[u.needs]);
}

export function buy(state, id) {
  const u = UPGRADES[id];
  if (!canBuy(state, id)) return { ok: false };
  if (state.coins < u.cost) return { ok: false, reason: 'coins' };
  state.coins -= u.cost;
  state.upgrades[id] = true;
  if (id === 'plot4' && state.garden.length < 4) state.garden.push(null);
  return { ok: true };
}

export function rename(state, piggyId, name) {
  const p = piggy(state, piggyId);
  name = String(name || '').trim().slice(0, NAME_MAX);
  if (!p || !name) return { ok: false };
  if (!isNiceName(name)) return { ok: false, reason: 'name' };
  if (state.coins < RENAME_COST) return { ok: false, reason: 'coins' };
  state.coins -= RENAME_COST;
  p.name = name;
  return { ok: true };
}

// Three piggies to choose from, always three different breeds. The offer is
// kept in the state so closing and reopening the shop shows the same three.
export function makeOffer(state, rng = Math.random) {
  if (state.offer && state.offer.length === 3) return state.offer;
  const breeds = Object.keys(BREEDS).sort(() => rng() - 0.5).slice(0, 3);
  const taken = state.piggies.map(p => p.name);
  state.offer = breeds.map(b => {
    const coat = randomCoat(rng, b);
    const name = randomName(rng, taken);
    taken.push(name);
    return { coat, name };
  });
  return state.offer;
}

export function adopt(state, index) {
  if (state.piggies.length >= capacity(state)) return { ok: false, reason: 'room' };
  const cost = adoptCost(state);
  if (state.coins < cost) return { ok: false, reason: 'coins' };
  const offer = makeOffer(state)[index];
  if (!offer) return { ok: false };
  state.coins -= cost;
  const p = newPiggy(state, offer.coat, offer.name);
  state.piggies.push(p);
  state.offer = null;
  return { ok: true, piggy: p };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
