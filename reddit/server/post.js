// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
import { reddit } from '@devvit/web/server';

// Old Reddit, third-party apps and search can't run the game, so they show this instead.
const TEXT_FALLBACK =
  'Dumpling Piggies is a cozy guinea pig game that runs inside this post. Cook dumplings, feed your Piggies, ' +
  'scoop their silly poops into the garden and grow veggies for new fillings. Open this post in the Reddit app ' +
  'or on reddit.com to play.';

export const createPost = () =>
  reddit.submitCustomPost({
    title: 'Dumpling Piggies: feed, cuddle and scoop up after your guinea Piggies',
    textFallback: { text: TEXT_FALLBACK },
    // The game's cream background shows while it loads, instead of a blank flash.
    styles: { backgroundColor: '#FFF1DCff', backgroundColorDark: '#FFF1DCff' },
  });
