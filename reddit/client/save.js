// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Save layer for Reddit. The build puts this file in place of src/save.js.
// The game still calls load(), save() and wipe() the same way; here the save lives on
// Reddit's server (one per Reddit account), so it follows the player to any device.
// reddit-boot.js fetches the save before the game starts and leaves it in window.__PIGGIES_REDDIT__.

const boot = () => window.__PIGGIES_REDDIT__ || {};
const SESSION_HEADER = 'x-piggies-session';
const DELAY = 1500; // wait for a quiet moment before sending, so a burst of taps is one save

let pending = null; // the newest state not yet sent
let timer = null;
let sending = false;
let stopped = false; // another copy of the game took over, so this one stops saving

const headers = () => ({ 'content-type': 'application/json', [SESSION_HEADER]: boot().session || '' });

function send(keepalive = false) {
  clearTimeout(timer); timer = null;
  if (stopped || !pending) return;
  if (sending && !keepalive) { timer = setTimeout(() => send(), DELAY); return; }
  const body = pending;
  pending = null;
  sending = true;
  fetch('/api/save', { method: 'POST', headers: headers(), body, keepalive: keepalive && body.length < 60000 })
    .then((res) => {
      if (res.status === 409) { stopped = true; window.dispatchEvent(new CustomEvent('piggies-stale')); return; }
      if (!res.ok) throw new Error(`save ${res.status}`);
    })
    .catch(() => { if (!pending) pending = body; timer = timer || setTimeout(() => send(), DELAY * 4); })
    .finally(() => { sending = false; });
}

export function load() {
  const s = boot().state;
  return s ? JSON.parse(JSON.stringify(s)) : null;
}

export function save(state) {
  if (stopped) return false;
  try { pending = JSON.stringify({ state }); } catch (e) { return false; }
  // Leaving the post: send right away so nothing is lost.
  if (document.hidden) send(true);
  else if (!timer) timer = setTimeout(() => send(), DELAY);
  return true;
}

export function wipe() {
  pending = null; clearTimeout(timer); stopped = true;
  // The game reloads straight after this, so wait for the server to agree first.
  try {
    const x = new XMLHttpRequest();
    x.open('POST', '/api/wipe', false);
    const h = headers();
    for (const k of Object.keys(h)) x.setRequestHeader(k, h[k]);
    x.send('{}');
  } catch (e) { /* ignore */ }
}
