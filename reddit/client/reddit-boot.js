// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Starts the game inside Reddit: fetch this player's save first, then start the same game as the web version.
import './packs-store.js'; // Gold packs: plugs Reddit's checkout into src/packs.js
import { canRunAsUser } from '@devvit/web/client';
const SESSION_HEADER = 'x-piggies-session';
const session = Math.random().toString(36).slice(2) + Date.now().toString(36);
const BOOT = document.getElementById('boot').outerHTML; // the game replaces the page, so keep a copy

function showRetry(text) {
  let boot = document.getElementById('boot');
  if (!boot) { document.body.insertAdjacentHTML('beforeend', BOOT); boot = document.getElementById('boot'); }
  boot.hidden = false;
  document.getElementById('boot-msg').textContent = text;
  const b = document.getElementById('boot-retry');
  b.hidden = false;
  b.onclick = () => location.reload();
}

async function fetchSave() {
  let last;
  for (let i = 0; i < 3; i++) {
    try {
      const res = await fetch('/api/load', { headers: { [SESSION_HEADER]: session } });
      const data = await res.json().catch(() => ({}));
      if (res.ok) return data;
      last = data.message || 'Could not load your Piggies.';
      if (res.status === 401) break;
    } catch (e) { last = 'Could not reach Reddit.'; }
    await new Promise((r) => setTimeout(r, 600 * (i + 1)));
  }
  throw new Error(last);
}

// "Share my pen": the game hands over the picture and the tap that asked for it.
// Reddit asks the player once whether the app may comment for them; then the
// server posts the picture as the player's own comment on this post.
async function sharePen(event, image) {
  let allowed = true;
  try { allowed = await canRunAsUser(event); } catch (e) { /* older Reddit apps don't ask; the server decides */ }
  if (!allowed) return { ok: false, message: 'Reddit needs your OK to post for you. Tap Post it again and say yes.' };
  try {
    const res = await fetch('/api/share', { method: 'POST', headers: { 'content-type': 'application/json', [SESSION_HEADER]: session }, body: JSON.stringify({ image }) });
    const data = await res.json().catch(() => ({}));
    return res.ok ? { ok: true } : { ok: false, message: data.message };
  } catch (e) { return { ok: false, message: 'Could not reach Reddit.' }; }
}

(async () => {
  let data;
  try { data = await fetchSave(); }
  catch (e) { showRetry(e.message); return; } // never start a fresh game on top of a save we couldn't read
  window.__PIGGIES_REDDIT__ = { state: data.state || null, ent: data.ent || { skus: {} }, username: data.username, session, sharePen };
  window.addEventListener('piggies-stale', () => showRetry('Your Piggies are open somewhere else.'));
  const { start } = await import('./src/ui.js');
  start();
  document.getElementById('boot')?.remove();
})();
