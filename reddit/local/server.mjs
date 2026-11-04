// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Plays the Reddit build on this computer without Reddit: serves dist/client and fakes the /api routes,
// keeping one save in local/.save.json. `npm run local`, then open http://localhost:5178/splash.html
import { createServer } from 'node:http';
import { existsSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { dirname, extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const dist = join(here, '..', 'dist', 'client');
const SAVE = join(here, '.save.json');
const PORT = Number(process.env.PORT || 5178);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
let session = null;
const readSave = () => (existsSync(SAVE) ? JSON.parse(readFileSync(SAVE, 'utf8')) : null);
const json = (res, code, body) => { res.writeHead(code, { 'content-type': 'application/json' }); res.end(JSON.stringify(body)); };
const body = (req) => new Promise((ok) => { let b = ''; req.on('data', (c) => (b += c)); req.on('end', () => ok(b)); });

createServer(async (req, res) => {
  const url = new URL(req.url, 'http://x');
  const sid = req.headers['x-piggies-session'];
  if (url.pathname === '/api/load') { if (sid) session = sid; return json(res, 200, { type: 'load', state: readSave(), ent: { skus: {} }, username: 'local_player' }); }
  if (url.pathname === '/api/packs') return json(res, 200, { skus: (process.env.PACKS || '').split(',').filter(Boolean) });
  if (url.pathname === '/api/peek') { const s = readSave(); return json(res, 200, { type: 'peek', piggies: (s?.piggies || []).slice(0, 3).map((g) => ({ name: g.name, coat: g.coat, hat: g.hat || null })) }); }
  // "Share my pen": keep the last picture in local/.share.jpg instead of posting it.
  if (url.pathname === '/api/share') {
    const { image } = JSON.parse((await body(req)) || '{}');
    if (typeof image !== 'string' || !image.startsWith('data:image/jpeg;base64,')) return json(res, 400, { type: 'error', message: 'That picture did not work.' });
    writeFileSync(join(here, '.share.jpg'), Buffer.from(image.split(',')[1], 'base64'));
    return json(res, 200, { type: 'shared' });
  }
  if (url.pathname === '/api/save' || url.pathname === '/api/wipe') {
    const text = await body(req);
    if (sid && session && sid !== session) return json(res, 409, { type: 'error', stale: true });
    if (url.pathname === '/api/wipe') { rmSync(SAVE, { force: true }); return json(res, 200, { type: 'wiped' }); }
    writeFileSync(SAVE, JSON.stringify(JSON.parse(text).state));
    return json(res, 200, { type: 'saved' });
  }
  const file = normalize(join(dist, url.pathname === '/' ? 'splash.html' : url.pathname));
  if (!file.startsWith(dist) || !existsSync(file)) { res.writeHead(404); return res.end('Not found'); }
  res.writeHead(200, { 'content-type': TYPES[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
}).listen(PORT, () => console.log(`Dumpling Piggies (Reddit build) at http://localhost:${PORT}/splash.html`));
