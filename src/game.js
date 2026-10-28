// Pure game logic. No DOM, no storage. The UI calls these functions and
// reads `state`; the save layer serializes `state`. Keeping this file free of
// platform code is what lets the game move to Reddit later.

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
  hat:      { name: 'Strawberry hat',     desc: 'A hat for your piggies. Very fancy.',            cost: 80,  icon: 'hat' },
  pen2:     { name: 'Bigger pen',         desc: 'Room for two more piggies.',                     cost: 300, icon: 'pen' },
  pen3:     { name: 'Huge pen',           desc: 'Room for two more piggies after that.',          cost: 800, icon: 'pen', needs: 'pen2' },
};

export const RENAME_COST = 30;
export const ADOPT_COST = [0, 80, 200, 400, 700, 1000];
export const MAX_PIGGIES = 6;

// Real guinea pig breeds, which decide hair length and texture. Colors are
// picked separately so two piggies of one breed still look different.
export const BREEDS = {
  american:   { name: 'American',    blurb: 'Short, smooth and shiny.' },
  abyssinian: { name: 'Abyssinian',  blurb: 'Swirly rosettes all over.' },
  peruvian:   { name: 'Peruvian',    blurb: 'Long flowing hair, a bit messy.' },
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

const NAMES = ['Bao Bao', 'Sir Wheeksalot', 'Little Potsticker', 'Mochi', 'Noodle', 'Peanut',
  'Dumpling Doug', 'Princess Squeak', 'Gyoza', 'Biscuit', 'Captain Fluff', 'Wonton', 'Pudding', 'Tofu',
  'Nugget', 'Pickles', 'Waffles', 'Sprout', 'Marshmallow', 'Buttons'];

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
    hunger: 70, fun: 70, effect: null, effectUntil: 0,
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
    dumplings: {},                  // recipeKey -> count
    discovered: [],                 // recipe keys found so far
    upgrades: {},                   // upgradeId -> true
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
  if (state.version >= 2) return state;
  const old = state.piggy || {};
  state.piggies = [{
    id: state.nextId++, name: old.name || 'Bao Bao', coat: { breed: 'american', main: 'ginger', patch: 'white' },
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
    state.compost += scooped;
    state.poops = [];
    state.stats.scooped += scooped;
  }
  state.lastSeen = now;
  return { away, coins: state.coins - before, poops: state.poops.length - poopsBefore, scooped };
}

function addPoop(state) {
  state.poops.push({ id: state.nextId++, x: 0.1 + Math.random() * 0.8, y: 0.2 + Math.random() * 0.75 });
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
  state.poops.splice(i, 1);
  state.compost += 1;
  state.coins += 2;
  state.stats.scooped += 1;
  return { ok: true, coins: 2 };
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
  name = String(name || '').trim().slice(0, 16);
  if (!p || !name) return { ok: false };
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
