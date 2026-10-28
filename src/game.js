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
  plot4:    { name: 'Fourth garden plot', desc: 'One more plot to grow veggies in.',       cost: 60,  icon: 'plot' },
  sunlamp:  { name: 'Sun lamp',           desc: 'Veggies grow twice as fast.',              cost: 90,  icon: 'sun' },
  autoscoop:{ name: 'Robo-scooper',       desc: 'A tiny robot scoops poop while you are away.', cost: 150, icon: 'robot' },
  bigbowl:  { name: 'Big bowl',           desc: 'Your piggy stays full for longer.',        cost: 120, icon: 'bowl' },
  hat:      { name: 'Strawberry hat',     desc: 'A hat for your piggy. Very fancy.',        cost: 80,  icon: 'hat' },
};

export const RENAME_COST = 30;

const NAMES = ['Bao Bao', 'Sir Wheeksalot', 'Little Potsticker', 'Mochi', 'Noodle', 'Peanut',
  'Dumpling Doug', 'Princess Squeak', 'Gyoza', 'Biscuit', 'Captain Fluff', 'Wonton', 'Pudding', 'Tofu'];

export const GROW_TIME = 90;        // seconds for a plant to be ready
export const MAX_AWAY = 8 * 3600;   // away-time progress is capped at 8 hours
export const MAX_POOPS = 6;

export function randomName(rng = Math.random) {
  return NAMES[Math.floor(rng() * NAMES.length)];
}

export function newState(now = Date.now()) {
  return {
    version: 1,
    coins: 0,
    piggy: { name: randomName(), hunger: 70, fun: 70, effect: null, effectUntil: 0 },
    poops: [],                      // { id, x, y }
    garden: [null, null, null],     // null or { filling, plantedAt }
    compost: 2,                     // scooped poop, needed to plant
    pantry: { carrot: 2, cabbage: 1, pea: 1, strawberry: 0 },
    dumplings: {},                  // recipeKey -> count
    discovered: [],                 // recipe keys found so far
    upgrades: {},                   // upgradeId -> true
    stats: { fed: 0, scooped: 0, cooked: 0, petted: 0 },
    lastSeen: now,
    createdAt: now,
    nextId: 1,
  };
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

export function isHappy(state) {
  const p = state.piggy;
  return p.hunger > 40 && p.fun > 40 && state.poops.length < 3;
}

// Mood drives the piggy's face and the coin trickle.
export function mood(state) {
  const p = state.piggy;
  if (p.hunger < 25) return 'hungry';
  if (state.poops.length >= 4) return 'stinky';
  if (p.fun < 25) return 'bored';
  if (p.hunger > 60 && p.fun > 60) return 'happy';
  return 'okay';
}

// Advance the simulation by `dt` seconds. Returns a list of events the UI
// may want to show (coins earned, effect ended, plant ready...).
export function tick(state, dt, now = Date.now()) {
  const events = [];
  const p = state.piggy;
  const hungerRate = state.upgrades.bigbowl ? 100 / 1800 : 100 / 1200; // full to empty in 30 or 20 min
  const funRate = 100 / 900;                                             // 15 min
  const sleepy = p.effect === 'sleepy' && now < p.effectUntil;
  p.hunger = clamp(p.hunger - hungerRate * dt * (sleepy ? 0.25 : 1), 0, 100);
  p.fun = clamp(p.fun - funRate * dt * (sleepy ? 0.25 : 1), 0, 100);

  if (p.effect && now >= p.effectUntil) {
    p.effect = null;
    events.push({ type: 'effectEnd' });
  }

  // Happy piggies earn a trickle: 1 coin every 20 seconds, double while sparkling.
  if (isHappy(state)) {
    const rate = (p.effect === 'sparkle' ? 2 : 1) / 20;
    state.trickle = (state.trickle || 0) + rate * dt;
    while (state.trickle >= 1) {
      state.trickle -= 1;
      state.coins += 1;
      events.push({ type: 'coin', amount: 1, source: 'trickle' });
    }
  }

  // A fed piggy poops every so often (about once per 2 minutes while fed).
  if (p.hunger > 30 && state.poops.length < MAX_POOPS) {
    state.poopTimer = (state.poopTimer || 0) + dt;
    if (state.poopTimer >= 120) {
      state.poopTimer = 0;
      addPoop(state);
      events.push({ type: 'poop' });
    }
  }

  state.lastSeen = now;
  return events;
}

// Called once on load. Simulates the time away in coarse steps so the piggy
// doesn't drain to zero while she sleeps, then summarises what happened.
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
  // Neglect never goes below "a bit grumpy": the piggy is never in danger.
  state.piggy.hunger = Math.max(state.piggy.hunger, 15);
  state.piggy.fun = Math.max(state.piggy.fun, 15);
  if (state.upgrades.autoscoop) {
    const scooped = state.poops.length;
    state.compost += scooped;
    state.poops = [];
    state.stats.scooped += scooped;
  }
  state.lastSeen = now;
  return { away, coins: state.coins - before, poops: state.poops.length - poopsBefore };
}

function addPoop(state) {
  state.poops.push({ id: state.nextId++, x: 0.15 + Math.random() * 0.7, y: 0.72 + Math.random() * 0.2 });
}

export function feed(state, key, now = Date.now()) {
  const r = RECIPES[key];
  if (!r || !(state.dumplings[key] > 0)) return { ok: false, reason: 'none' };
  if (state.piggy.hunger >= 98) return { ok: false, reason: 'full' };
  state.dumplings[key] -= 1;
  const p = state.piggy;
  p.hunger = clamp(p.hunger + r.hunger, 0, 100);
  p.fun = clamp(p.fun + 5, 0, 100);
  state.coins += r.coins;
  state.stats.fed += 1;
  if (r.effect) { p.effect = r.effect; p.effectUntil = now + 20000; }
  // Eating makes poop more likely soon.
  state.poopTimer = (state.poopTimer || 0) + 45;
  return { ok: true, coins: r.coins, effect: r.effect };
}

export function pet(state) {
  const p = state.piggy;
  const gain = p.fun < 100 ? 12 : 0;
  p.fun = clamp(p.fun + 12, 0, 100);
  state.stats.petted += 1;
  // Petting pays a little only while it is still fun for the piggy.
  const coins = gain > 0 ? 1 : 0;
  state.coins += coins;
  return { ok: true, coins };
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

export function buy(state, id) {
  const u = UPGRADES[id];
  if (!u || state.upgrades[id]) return { ok: false };
  if (state.coins < u.cost) return { ok: false, reason: 'coins' };
  state.coins -= u.cost;
  state.upgrades[id] = true;
  if (id === 'plot4' && state.garden.length < 4) state.garden.push(null);
  return { ok: true };
}

export function rename(state, name) {
  name = String(name || '').trim().slice(0, 16);
  if (!name) return { ok: false };
  if (state.coins < RENAME_COST) return { ok: false, reason: 'coins' };
  state.coins -= RENAME_COST;
  state.piggy.name = name;
  return { ok: true };
}

function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
