// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Each Reddit player's game lives in Redis as one JSON string. The game itself runs in the
// player's browser, so the server only keeps the save safe and tidy.
import { redis } from '@devvit/web/server';

export const saveKey = (userId) => `save:${userId}`;
export const entKey = (userId) => `ent:${userId}`; // Reddit coin pack unlocks, kept apart from the save
const sessionKey = (userId) => `session:${userId}`;

// Every player's Reddit ID and name, so the deleted-accounts check knows whose data to look for.
export const PLAYERS_KEY = 'players';

// Biggest save we accept. A real save is a few KB; this only stops junk.
export const MAX_SAVE = 400_000;

export const readSave = async (userId) => {
  const raw = await redis.get(saveKey(userId));
  return raw ? JSON.parse(raw) : null;
};

export const writeSave = async (userId, state) => {
  await redis.set(saveKey(userId), JSON.stringify(state));
};

export const readEnt = async (userId) => {
  const raw = await redis.get(entKey(userId));
  return raw ? JSON.parse(raw) : { skus: {} };
};

// The newest copy of the game to load claims the save, so an older tab can't overwrite it.
export const claimSession = (userId, id) => redis.set(sessionKey(userId), id);
export const isStale = async (userId, id) => {
  if (!id) return false;
  const current = await redis.get(sessionKey(userId));
  return current !== undefined && current !== null && current !== id;
};

export const notePlayer = (userId, username) => redis.hSet(PLAYERS_KEY, { [userId]: username });

// Reddit's rules: when an account is deleted, its data must leave every store.
export const forgetPlayer = async (userId) => {
  await redis.del(saveKey(userId), entKey(userId), sessionKey(userId));
  await redis.hDel(PLAYERS_KEY, [userId]);
};
