// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// "Share my pen": the player taps Post it, and their pen picture goes up as their own comment on this post.
import { context, media, reddit, redis } from '@devvit/web/server';
import { RichTextBuilder } from '@devvit/shared-types/richtext/RichTextBuilder.js';
import { readSave } from './save.js';

const MAX_IMAGE = 3_000_000;          // characters of data URL; real pictures are about 200 KB
const WAIT_MS = 2 * 60 * 1000;        // one picture every two minutes, so nobody floods the comments
const shareKey = (userId) => `shared:${userId}`;

const nameList = (names) => (names.length < 2 ? names.join('') : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`);

// Returns { status, body } for the route to send back.
export async function sharePen(p, image) {
  if (typeof image !== 'string' || !image.startsWith('data:image/jpeg;base64,') || image.length > MAX_IMAGE) {
    return { status: 400, body: { type: 'error', message: 'That picture did not work. Try again.' } };
  }
  const postId = context.postId;
  if (!postId) return { status: 400, body: { type: 'error', message: 'Open the game in a post to share.' } };
  // Claim the slot before posting, so a second tap can't post twice.
  if (await redis.get(shareKey(p.userId))) return { status: 429, body: { type: 'error', message: 'Your Piggies are still posing. Try again in a minute or two.' } };
  await redis.set(shareKey(p.userId), String(Date.now()), { expiration: new Date(Date.now() + WAIT_MS) });
  try {
    const state = await readSave(p.userId).catch(() => null);
    const names = (state?.piggies || []).map((g) => String(g.name || '').slice(0, 24)).filter(Boolean);
    const text = names.length ? `Say hi to my Piggies ${nameList(names)}!` : 'Say hi to my Piggies!';
    const { mediaUrl } = await media.upload({ url: image, type: 'image' });
    const richtext = new RichTextBuilder()
      .paragraph((par) => { par.text({ text }); })
      .image({ mediaUrl, caption: 'My Piggies in their pen' });
    const comment = await reddit.submitComment({ id: postId, richtext, runAs: 'USER' });
    return { status: 200, body: { type: 'shared', commentId: comment.id } };
  } catch (error) {
    console.error('Share failed', error);
    await redis.del(shareKey(p.userId)).catch(() => {}); // a failed post doesn't make them wait
    return { status: 500, body: { type: 'error', message: 'That picture did not post. Try again in a little while.' } };
  }
}
