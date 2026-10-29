// Maze rules. Pure logic like game.js: a grid of cells, a piggy that sniffs
// its way to the dumpling, lures she drops, and a cheer that makes it zoom.

export const COLS = 7;
export const ROWS = 9;
export const START = { x: 0, y: ROWS - 1 };
export const FINISH = { x: COLS - 1, y: 0 };
export const LURES_PER_RUN = 3;

export function newMaze() {
  return { cells: new Array(COLS * ROWS).fill(0), finished: {}, treasure: [] };
}

export const idx = (x, y) => y * COLS + x;
const inside = (x, y) => x >= 0 && y >= 0 && x < COLS && y < ROWS;
const same = (a, b) => a.x === b.x && a.y === b.y;
export const isWall = (m, x, y) => !!m.cells[idx(x, y)];

// Paints a square with the picked tile (1 wall, 0 eraser); tapping a wall
// with the wall tile again clears it.
export function toggleWall(m, x, y, tile = 1) {
  if (!inside(x, y) || same({ x, y }, START) || same({ x, y }, FINISH) || treasureAt(m, x, y)) return false;
  const i = idx(x, y);
  if (!tile && !m.cells[i]) return false;
  m.cells[i] = m.cells[i] ? 0 : tile;
  return true;
}

export function clear(m) { m.cells.fill(0); }

export function neighbors(m, x, y) {
  const out = [];
  for (const [dx, dy] of [[0, -1], [1, 0], [0, 1], [-1, 0]]) {
    const nx = x + dx, ny = y + dy;
    if (inside(nx, ny) && !isWall(m, nx, ny)) out.push({ x: nx, y: ny });
  }
  return out;
}

// Shortest path from a to b, as a list of cells not including a. Null if none.
export function path(m, a, b) {
  const prev = new Map();
  const q = [a];
  prev.set(idx(a.x, a.y), null);
  while (q.length) {
    const c = q.shift();
    if (same(c, b)) {
      const out = [];
      let k = idx(c.x, c.y);
      let cur = c;
      while (prev.get(k) !== null) { out.unshift(cur); cur = prev.get(k); k = idx(cur.x, cur.y); }
      return out;
    }
    for (const n of neighbors(m, c.x, c.y)) {
      const k = idx(n.x, n.y);
      if (!prev.has(k)) { prev.set(k, c); q.push(n); }
    }
  }
  return null;
}

export const solvable = (m) => path(m, START, FINISH) !== null;

export function hash(m) { return m.cells.join(''); }

// A random maze with a guaranteed route, carved with a recursive backtracker
// on the odd cells, then a few extra openings so it isn't one long corridor.
export function randomize(m, rng = Math.random, fillings = ['carrot']) {
  m.cells.fill(1);
  const carve = (x, y) => {
    m.cells[idx(x, y)] = 0;
    const dirs = [[0, -2], [2, 0], [0, 2], [-2, 0]].sort(() => rng() - 0.5);
    for (const [dx, dy] of dirs) {
      const nx = x + dx, ny = y + dy;
      if (inside(nx, ny) && m.cells[idx(nx, ny)]) {
        m.cells[idx(x + dx / 2, y + dy / 2)] = 0;
        carve(nx, ny);
      }
    }
  };
  carve(0, ROWS - 1);
  for (let i = 0; i < 3; i++) {
    const x = Math.floor(rng() * COLS), y = Math.floor(rng() * ROWS);
    m.cells[idx(x, y)] = 0;
  }
  m.cells[idx(START.x, START.y)] = 0;
  m.cells[idx(FINISH.x, FINISH.y)] = 0;
  if (!solvable(m)) return randomize(m, rng, fillings);
  hideTreasure(m, rng, fillings);
}

// Treasure: Surprise mazes hide a couple of goodies, best of all down the side
// branches so a lure is the way to get them. Whatever the piggy runs over is
// hers; anything missed stays put for the next run.
export const TREASURE_COINS = 10;
export const TREASURE_VEGGIES = 2;
export const treasureAt = (m, x, y) => (m.treasure || []).find(t => t.x === x && t.y === y);

export function hideTreasure(m, rng = Math.random, fillings = ['carrot']) {
  const main = new Set((path(m, START, FINISH) || []).map(c => idx(c.x, c.y)));
  const spots = [], ends = [];
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) {
    if (isWall(m, x, y) || same({ x, y }, START) || same({ x, y }, FINISH) || main.has(idx(x, y))) continue;
    (neighbors(m, x, y).length === 1 ? ends : spots).push({ x, y });
  }
  const shuffle = (a) => a.sort(() => rng() - 0.5);
  const picks = [...shuffle(ends), ...shuffle(spots)].slice(0, 2);
  const kinds = shuffle(['coins', 'veggie', 'box']);
  m.treasure = picks.map((c, i) => {
    const t = { ...c, kind: kinds[i] };
    if (t.kind === 'veggie') t.filling = fillings[Math.floor(rng() * fillings.length)] || 'carrot';
    return t;
  });
}

// Gives the treasure to the player. A mystery box holds one dumpling of a
// recipe she has already found (carrot if none yet).
export function claim(state, t, rng = Math.random) {
  if (t.kind === 'coins') { state.coins += TREASURE_COINS; return { ...t, coins: TREASURE_COINS }; }
  if (t.kind === 'veggie') { state.pantry[t.filling] = (state.pantry[t.filling] || 0) + TREASURE_VEGGIES; return { ...t, count: TREASURE_VEGGIES }; }
  const found = state.discovered || [];
  const key = found.length ? found[Math.floor(rng() * found.length)] : 'carrot+carrot';
  state.dumplings[key] = (state.dumplings[key] || 0) + 1;
  return { ...t, key };
}

export function newRun() {
  return { pos: { ...START }, visited: { [idx(START.x, START.y)]: 1 }, steps: 0, lure: null, lures: LURES_PER_RUN, zoomUntil: 0, done: false, lastDir: null };
}

// One sniffing step. Returns an event name for the UI: 'move', 'deadend',
// 'ate' (reached a lure), 'treasure' (run.found) or 'finish'.
export function step(m, run, rng = Math.random, now = Date.now()) {
  if (run.done) return 'finish';
  const { x, y } = run.pos;
  const open = neighbors(m, x, y);
  let next = null;

  if (run.lure) {
    const p = path(m, run.pos, run.lure);
    if (p && p.length) next = p[0];
    else run.lure = null;
  }
  if (!next && (m.treasure || []).length && rng() < 0.7) {
    // Treasure close by smells good too.
    const near = m.treasure.map(t => path(m, run.pos, t)).filter(p => p && p.length && p.length <= 3).sort((a, b) => a.length - b.length)[0];
    if (near) next = near[0];
  }
  if (!next) {
    // After wandering for a while the piggy "smells" the dumpling and heads straight there.
    const smell = run.steps > 30 ? 0.9 : 0.45;
    const p = path(m, run.pos, FINISH);
    const fresh = open.filter(n => !run.visited[idx(n.x, n.y)]);
    const notBack = open.filter(n => !(run.lastDir && n.x === x - run.lastDir.x && n.y === y - run.lastDir.y));
    if (p && p.length && rng() < smell) next = p[0];
    else if (fresh.length) next = fresh[Math.floor(rng() * fresh.length)];
    else if (notBack.length) next = notBack[Math.floor(rng() * notBack.length)];
    else next = open[0] || run.pos;
  }

  const deadEnd = open.length === 1 && !same(run.pos, START);
  run.lastDir = { x: next.x - x, y: next.y - y };
  run.pos = { ...next };
  run.visited[idx(next.x, next.y)] = (run.visited[idx(next.x, next.y)] || 0) + 1;
  run.steps += 1;

  // Finishing always wins, even if a carrot was dropped on the dumpling square.
  if (same(run.pos, FINISH)) { run.done = true; run.lure = null; return 'finish'; }
  const t = treasureAt(m, run.pos.x, run.pos.y);
  if (t) { m.treasure = m.treasure.filter(o => o !== t); run.found = t; if (run.lure && same(run.pos, run.lure)) run.lure = null; return 'treasure'; }
  if (run.lure && same(run.pos, run.lure)) { run.lure = null; return 'ate'; }
  return deadEnd ? 'deadend' : 'move';
}

export function dropLure(m, run, x, y) {
  if (run.done || !inside(x, y) || isWall(m, x, y) || same({ x, y }, run.pos) || same({ x, y }, FINISH)) return false;
  if (!path(m, run.pos, { x, y })) return false;
  run.lure = { x, y };
  return true;
}

export function cheer(run, now = Date.now()) {
  run.zoomUntil = now + 3000;
}

// Reward for finishing. The first finish of a given layout pays a bonus.
export function reward(state, m, run) {
  const h = hash(m);
  const first = !m.finished[h];
  m.finished[h] = true;
  const coins = 8 + (first ? 12 : 0);
  state.coins += coins;
  for (const p of state.piggies) p.fun = Math.min(100, p.fun + 30);
  state.stats.mazes = (state.stats.mazes || 0) + 1;
  return { coins, first };
}
