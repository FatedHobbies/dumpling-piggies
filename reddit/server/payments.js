// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Devvit Payments: bonus packs bought with Reddit Gold.
//
// Which packs a Reddit user owns lives in its own Redis key, ent:{userId},
// as { skus: { [sku]: orderId } }. It is never stored inside the game save, so
// a stale save from another tab can't lose a purchase. forgetPlayer() in
// save.js deletes it with the rest of a deleted account's data. The client asks for the
// list on load and after each purchase and applies it with applyPacks().
//
// devvit.json needs:
//   "permissions": { "payments": true },
//   "payments": { "productsFile": "products.json",
//     "endpoints": { "fulfillOrder": "/internal/payments/fulfill", "refundOrder": "/internal/payments/refund" } }

import { Hono } from 'hono';
import { context, redis } from '@devvit/web/server';
import { isPack } from '../../src/packs.js';
import { readEnt } from './save.js';

const entKey = (userId) => `ent:${userId}`;

export async function getEntitlements(userId) {
  if (!userId) return { skus: {} };
  try {
    const ent = await readEnt(userId);
    return ent && ent.skus ? ent : { skus: {} };
  } catch (e) {
    return { skus: {} };
  }
}

export async function ownedSkus(userId) {
  return Object.keys((await getEntitlements(userId)).skus);
}

async function setEntitlements(userId, ent) {
  await redis.set(entKey(userId), JSON.stringify(ent));
}

// Mounted at /api: the game asks which packs this player owns.
export const packsApi = new Hono();
packsApi.get('/packs', async (c) => {
  return c.json({ skus: await ownedSkus(context.userId) });
});

// Mounted at /internal/payments: Reddit calls these. devvit.json names them.
export const paymentsRoutes = new Hono();

// Reddit calls this after the Gold is paid. Returning success: false makes
// Reddit cancel the order and give the Gold back.
paymentsRoutes.post('/fulfill', async (c) => {
  const order = await c.req.json();
  const userId = context.userId;
  if (!userId) return c.json({ success: false, reason: 'No user' });
  const skus = (order.products || []).map((p) => p.sku);
  if (!skus.length || !skus.every(isPack)) return c.json({ success: false, reason: 'Unknown pack' });
  const ent = await getEntitlements(userId);
  for (const sku of skus) ent.skus[sku] = order.id;
  await setEntitlements(userId, ent);
  console.log(`fulfilled ${order.id} ${skus.join(',')} for ${userId}`);
  return c.json({ success: true });
});

// Reddit calls this when an order is refunded or reverted. The client's
// applyPacks() then takes back what that pack gave on the next load.
paymentsRoutes.post('/refund', async (c) => {
  const order = await c.req.json();
  const userId = context.userId;
  if (userId) {
    const ent = await getEntitlements(userId);
    for (const p of order.products || []) {
      if (ent.skus[p.sku] === order.id) delete ent.skus[p.sku];
    }
    await setEntitlements(userId, ent);
    console.log(`refunded ${order.id} for ${userId}`);
  }
  return c.json({ success: true });
});
