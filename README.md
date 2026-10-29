# Dumpling Piggies

A bright, silly pet game: feed, play with, and clean up after guinea piggies who live in a bamboo steamer and love dumplings. Built as an installable web app for phones.

Play it at **https://fatedhobbies.github.io/dumpling-piggies/** and use "Add to Home Screen".

## How it's put together

- `src/game.js` – all the game rules. No browser code, so it can move to Reddit later.
- `src/save.js` – where progress is saved (localStorage now, Redis on Reddit later).
- `src/art.js` – the Squishy-style SVG art.
- `src/sound.js` – tiny synthesized sounds.
- `src/ui.js` – screens, taps, and animations.
- `sw.js` + `manifest.webmanifest` – lets it install and run offline.

No build step. Open `index.html` through any static server, or just push to `main` and GitHub Pages serves it.

## License

Copyright (c) 2026 FatedHobbies. All rights reserved. The code and art may not be copied, modified or redistributed without permission. See [LICENSE](LICENSE).
