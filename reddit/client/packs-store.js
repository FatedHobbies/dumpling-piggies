// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Reddit-only pack store. The Reddit build imports this once at startup; it
// plugs Devvit Payments into src/packs.js so the Shop can show packs.
// GitHub Pages never loads it, so packs stay hidden there.

import { purchase, OrderResultStatus } from '@devvit/web/client';
import { setStore } from './src/packs.js';   // the game's own copy next to dist/client, so both share one module

async function owned() {
  const r = await fetch('/api/packs');
  if (!r.ok) throw new Error(`packs ${r.status}`);
  return (await r.json()).skus || [];
}

// Opens Reddit's Gold checkout. Resolves { ok, skus } where skus is the full
// owned list after the purchase (fulfillment has run by the time it succeeds),
// or { ok: false, cancelled } if the player backed out.
async function buy(sku) {
  const res = await purchase(sku);
  if (res.status === OrderResultStatus.STATUS_SUCCESS) return { ok: true, skus: await owned() };
  return { ok: false, cancelled: res.status === OrderResultStatus.STATUS_CANCELLED, error: res.errorMessage };
}

setStore({ owned, buy });
