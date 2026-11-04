// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Bonus packs bought with Reddit Gold (Devvit Payments). Only the Reddit build
// sells them. On GitHub Pages nothing here is ever switched on: there is no
// store, so packs stay hidden and no save ever gets a pack.
//
// Packs are bonuses and shortcuts, never gates: everything a pack unlocks
// besides Super Sprouts and the Golden Crown can also be bought with coins in the Shop.
//
// The server keeps which SKUs a Reddit user owns (Redis `ent:{userId}`); the
// client calls applyPacks(state, skus) after loading and after each purchase.
// Upgrades a pack grants are stored as 'pack' instead of true, so a refunded
// pack can take back exactly what it gave and nothing the player paid coins for.

export const PACKS = {
  'roomy-pen': {
    name: 'Roomy Pen',
    desc: 'The Bigger pen right now: room for 4 Piggies and 4 toys.',
    gold: 200,
    upgrades: ['pen2'],
    perks: [],
  },
  'super-sprouts': {
    name: 'Super Sprouts',
    desc: 'A golden sun lamp. Veggies grow 4 times as fast, forever.',
    gold: 300,
    upgrades: ['sunlamp'],
    perks: ['supersprout'],
  },
  'helper-bundle': {
    name: 'Big Helper Bundle',
    desc: 'Roomy Pen, Super Sprouts, Robo-scooper, Big bowl and a fourth garden plot.',
    gold: 500,
    upgrades: ['pen2', 'sunlamp', 'autoscoop', 'bigbowl', 'plot4'],
    perks: ['supersprout'],
    // Only offered while it costs no more than the Gold packs the player would still need.
    bundles: ['roomy-pen', 'super-sprouts'],
  },
  'golden-crown': {
    name: 'Golden Crown',
    desc: 'A shiny golden dumpling crown that any Piggy can wear. Only in this pack!',
    gold: 100,
    upgrades: [],
    perks: [],
    hats: ['goldcrown'],
  },
  // "Finish the bundle": if you bought one of the bundle's packs with Gold, the
  // rest costs the bundle price minus what you paid, so you never pay more than
  // the bundle. Each one replaces the single pack you're still missing.
  'bundle-rest-sprouts': {
    name: 'Finish the Helper Bundle',
    desc: 'You have the Roomy Pen! Add Super Sprouts, Robo-scooper, Big bowl and a fourth garden plot.',
    gold: 300,
    upgrades: ['sunlamp', 'autoscoop', 'bigbowl', 'plot4'],
    perks: ['supersprout'],
    rest: { owns: 'roomy-pen', replaces: 'super-sprouts' },
  },
  'bundle-rest-pen': {
    name: 'Finish the Helper Bundle',
    desc: 'You have Super Sprouts! Add the Roomy Pen, Robo-scooper, Big bowl and a fourth garden plot.',
    gold: 200,
    upgrades: ['pen2', 'autoscoop', 'bigbowl', 'plot4'],
    perks: [],
    rest: { owns: 'super-sprouts', replaces: 'roomy-pen' },
  },
};

export function isPack(sku) {
  return Object.prototype.hasOwnProperty.call(PACKS, sku);
}

// Brings the save in line with the packs the player owns. Safe to call often.
export function applyPacks(state, skus) {
  const owned = (skus || []).filter(isPack).sort();
  const give = new Set();
  const hats = new Set();
  const perks = {};
  for (const sku of owned) {
    for (const u of PACKS[sku].upgrades) give.add(u);
    for (const p of PACKS[sku].perks) perks[p] = true;
    for (const h of PACKS[sku].hats || []) hats.add(h);
  }
  state.hats = state.hats || {};
  for (const [id, v] of Object.entries(state.hats)) {
    if (v === 'pack' && !hats.has(id)) {
      delete state.hats[id];
      for (const p of [...(state.piggies || []), ...(state.away || [])]) if (p.hat === id) p.hat = null;
    }
  }
  for (const id of hats) if (!state.hats[id]) state.hats[id] = 'pack';
  state.upgrades = state.upgrades || {};
  // Take back pack upgrades that no pack gives any more (a refund).
  for (const [id, v] of Object.entries(state.upgrades)) {
    if (v === 'pack' && !give.has(id)) {
      delete state.upgrades[id];
      if (id === 'plot4') shrinkGarden(state);
      if (id === 'pen2') shrinkPen(state);
    }
  }
  for (const id of give) {
    if (state.upgrades[id]) continue;          // bought with coins: keep it as theirs
    state.upgrades[id] = 'pack';
    if (id === 'plot4' && state.garden.length < 4) state.garden.push(null);
  }
  state.packs = owned;
  state.perks = perks;
  return state;
}

// A refunded fourth plot goes away; whatever grew there goes to the pantry.
function shrinkGarden(state) {
  while (state.garden.length > 3) {
    const g = state.garden.pop();
    if (g && g.filling && state.pantry) state.pantry[g.filling] = (state.pantry[g.filling] || 0) + 1;
  }
}

// A refunded Bigger pen: extra Piggies go on a sleepover, extra toys into the box.
function shrinkPen(state) {
  if (state.piggies && state.piggies.length > 3) {
    const extra = state.piggies.splice(3);
    state.away = state.away || [];
    for (const p of extra) { p.effect = null; state.away.push(p); }
  }
  let inPen = 0;
  for (const id of Object.keys(state.toys || {})) if (state.toys[id] === 'pen' && ++inPen > 3) state.toys[id] = 'box';
}

export function hasPerk(state, perk) {
  return !!(state.perks && state.perks[perk]);
}

// Packs the Shop can still offer: not owned, and not everything already unlocked.
export function packsForSale(state) {
  const own = new Set(state.packs || []);
  const gives = (p) => p.perks.some(k => !hasPerk(state, k)) || p.upgrades.some(u => !state.upgrades[u]) || (p.hats || []).some(h => !state.hats[h]);
  const open = (sku) => !own.has(sku) && gives(PACKS[sku]);
  // A bundle must stay a deal (the helpers come free): once a piece is owned
  // (by pack or by gems), buying the rest on its own is cheaper, so it steps aside.
  const deal = (p) => !p.bundles || p.bundles.filter(open).reduce((n, sku) => n + PACKS[sku].gold, 0) >= p.gold;
  // A finish-the-bundle pack shows only for players who bought the other half
  // with Gold, while the half it replaces is still missing.
  const restFor = (p) => !p.rest || (own.has(p.rest.owns) && !own.has('helper-bundle') && open(p.rest.replaces));
  const replaced = new Set(Object.values(PACKS).filter(p => p.rest && restFor(p) && gives(p)).map(p => p.rest.replaces));
  return Object.entries(PACKS)
    .filter(([sku, p]) => open(sku) && deal(p) && restFor(p) && !replaced.has(sku))
    .map(([sku, p]) => ({ sku, ...p }));
}

// The Reddit build calls setStore({ buy(sku) -> Promise<{ok, skus}>, owned() -> Promise<skus> }).
// Without a store (GitHub Pages) packsEnabled() is false and the Shop shows no packs.
let store = null;
export function setStore(s) { store = s; }
export function packsEnabled() { return !!store; }
export function getStore() { return store; }
