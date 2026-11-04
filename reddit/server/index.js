// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// The Reddit server: loads and saves each player's game, makes posts, and tidies up deleted accounts.
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { context, createServer, getServerPort, reddit, redis } from '@devvit/web/server';
import { sharePen } from './share.js';
import { createPost } from './post.js';
import { packsApi, paymentsRoutes } from './payments.js';
import { MAX_SAVE, PLAYERS_KEY, claimSession, forgetPlayer, isStale, notePlayer, readEnt, readSave, saveKey, writeSave } from './save.js';

const SESSION_HEADER = 'x-piggies-session';
const app = new Hono();
const api = new Hono();
const internal = new Hono();

const player = async () => {
  const { userId } = context;
  if (!userId) return null;
  const username = (await reddit.getCurrentUsername().catch(() => undefined)) ?? 'anonymous';
  return { userId, username };
};

const loggedOut = (c) => c.json({ type: 'error', message: 'Log in to Reddit to play.' }, 401);

// The game asks for its save once, when it opens.
api.get('/load', async (c) => {
  const p = await player();
  if (!p) return loggedOut(c);
  const session = c.req.header(SESSION_HEADER);
  if (session) await claimSession(p.userId, session);
  await notePlayer(p.userId, p.username).catch((e) => console.error('Note player failed', e));
  const [state, ent] = await Promise.all([readSave(p.userId), readEnt(p.userId).catch(() => ({ skus: {} }))]);
  return c.json({ type: 'load', state, ent, username: p.username });
});

// The post in the feed shows a returning player's own Piggies. Reads only, claims nothing.
api.get('/peek', async (c) => {
  const p = await player();
  if (!p) return c.json({ type: 'peek', piggies: [] });
  const state = await readSave(p.userId).catch(() => null);
  const piggies = (state?.piggies || []).slice(0, 3).map((g) => ({ name: g.name, coat: g.coat, hat: g.hat || null }));
  return c.json({ type: 'peek', piggies });
});

// The game sends its whole state every few seconds while it changes.
api.post('/save', async (c) => {
  const p = await player();
  if (!p) return loggedOut(c);
  if (await isStale(p.userId, c.req.header(SESSION_HEADER))) {
    return c.json({ type: 'error', message: 'Your Piggies are open somewhere else.', stale: true }, 409);
  }
  const text = await c.req.text();
  if (text.length > MAX_SAVE) return c.json({ type: 'error', message: 'Save too big.' }, 413);
  let body;
  try { body = JSON.parse(text); } catch { return c.json({ type: 'error', message: 'Bad save.' }, 400); }
  if (!body || typeof body.state !== 'object' || body.state === null || Array.isArray(body.state)) {
    return c.json({ type: 'error', message: 'Bad save.' }, 400);
  }
  await writeSave(p.userId, body.state);
  return c.json({ type: 'saved' });
});

// "Start over" in the Shop.
api.post('/wipe', async (c) => {
  const p = await player();
  if (!p) return loggedOut(c);
  if (await isStale(p.userId, c.req.header(SESSION_HEADER))) {
    return c.json({ type: 'error', message: 'Your Piggies are open somewhere else.', stale: true }, 409);
  }
  await redis.del(saveKey(p.userId));
  return c.json({ type: 'wiped' });
});

// "Share my pen": posts the player's pen picture as their own comment on this post.
api.post('/share', async (c) => {
  const p = await player();
  if (!p) return loggedOut(c);
  const body = await c.req.json().catch(() => null);
  const res = await sharePen(p, body?.image);
  return c.json(res.body, res.status);
});

internal.post('/menu/post-create', async (c) => {
  try {
    const post = await createPost();
    return c.json({ navigateTo: `https://reddit.com/r/${context.subredditName}/comments/${post.id}` }, 200);
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json({ showToast: 'Could not make the post' }, 400);
  }
});

internal.post('/triggers/on-app-install', async (c) => {
  try {
    // Reddit can deliver the install event more than once, so only the first one makes a post.
    if (await redis.get('installPost')) return c.json({ status: 'success', message: 'Install post already made' }, 200);
    await redis.set('installPost', String(Date.now()));
    const post = await createPost();
    return c.json({ status: 'success', message: `Post ${post.id} created in r/${context.subredditName}` }, 200);
  } catch (error) {
    console.error(`Error creating post: ${error}`);
    return c.json({ status: 'error', message: 'Failed to create post' }, 400);
  }
});

// Every hour, check a batch of players and wipe the data of any whose Reddit account is gone.
const BATCH = 200;
const CURSOR_KEY = 'playersCursor';
internal.post('/scheduler/forget-deleted-players', async (c) => {
  const cursor = Number((await redis.get(CURSOR_KEY)) ?? 0);
  const page = await redis.hScan(PLAYERS_KEY, cursor, undefined, BATCH);
  let forgotten = 0;
  for (let i = 0; i < page.fieldValues.length; i += 20) {
    await Promise.all(page.fieldValues.slice(i, i + 20).map(async ({ field: userId }) => {
      if (!userId.startsWith('t2_')) return;
      // A failed lookup keeps the player: only a clear "no such account" wipes anything.
      const user = await reddit.getUserById(userId).catch(() => null);
      if (user !== undefined) return;
      await forgetPlayer(userId);
      forgotten++;
    }));
  }
  await redis.set(CURSOR_KEY, String(page.cursor));
  console.log(`Checked ${page.fieldValues.length} players, wiped ${forgotten} deleted accounts`);
  return c.json({}, 200);
});

api.route('/', packsApi);
internal.route('/payments', paymentsRoutes);
app.route('/api', api);
app.route('/internal', internal);
app.onError((error, c) => {
  console.error('Unhandled server error', error);
  return c.json({ type: 'error', message: 'Something went wrong. Try that again.' }, 500);
});

serve({ fetch: app.fetch, createServer, port: getServerPort() });
