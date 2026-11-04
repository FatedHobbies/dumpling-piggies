# Guinea Pigs and Dumplings on Reddit

The Reddit version (a Devvit Web app) is built from the **same game files** GitHub Pages serves.
Nothing in this folder changes the web version.

## What's here

| Path | What it does |
| --- | --- |
| `devvit.json` | The Devvit app: the feed post (`splash.html`), the full game (`game.html`), the server, a mod menu item to make a post, the install trigger, and an hourly clean-up task. |
| `build.mjs` | Builds `dist/`. Copies `../src`, `../style.css`, `../icons`; swaps in `client/save.js`; turns `../index.html` into `game.html` (local fonts, no service worker, no install-to-home-screen bits); bundles the splash, the boot script and the server. Fails if anything would load from outside Reddit. |
| `client/save.js` | Reddit save layer. Same `load()/save()/wipe()` as `../src/save.js`, but the save lives on Reddit's server, one per Reddit account. Saves are sent 1.5 s after the last change, and straight away when the player leaves. |
| `client/reddit-boot.js` | Fetches the player's save, then starts the game. If the save can't be read it shows "Try again" and never starts a fresh game over it. If the game is opened on a second device, the older copy stops saving and says "open somewhere else". Bundled; import game files as `./src/<file>.js`. |
| `client/splash.*` | The post in the feed: title, three Piggies, a dumpling and a Play button that opens the game full size. Returning players see their own Piggies and "Pudding is waiting for you!". |
| `client/reddit.css` | On a wide screen (Reddit on a computer) the game stays a phone-shaped column. |
| `server/` | Hono server: `GET /api/load`, `POST /api/save`, `POST /api/wipe`, `GET /api/peek` (feed post). Redis keys: `save:{userId}`, `backup:{userId}` (the save as it was up to an hour ago), `ent:{userId}` (Reddit coin packs), `session:{userId}`, hash `players`. |
| `assets/icon-1024.png` | App icon for the Reddit app directory (1024 x 1024). |
| `local/server.mjs` | Plays the Reddit build on your computer without Reddit (fake server, one save in `local/.save.json`). |

## Try it on your computer

```sh
cd reddit
npm install
npm run local        # then open http://localhost:5178/splash.html
```

## Launch checklist

Steps marked **(Ryan)** need your Reddit account. Everything else is done.

1. **(Ryan)** Install Node 22 or newer. Then in this folder: `npm install`.
2. **(Ryan)** `npm run login` (runs `devvit login`, opens Reddit in the browser to sign in). Use the Reddit account that will own the app.
3. **(Ryan)** Pick the app's name on Reddit. It is the `name` in `devvit.json` (now `guinea-dumplings`): lowercase letters, numbers and dashes, at most 16 characters, and it must not be taken. If it is taken, `devvit upload` says so: change `name` and try again.
4. **(Ryan)** Make a private test subreddit, e.g. `r/GuineaDumplings_test`, on reddit.com (Create a community, set it to Private).
5. **(Ryan)** `npx devvit playtest GuineaDumplings_test` (or `npm run dev`). It uploads a test build, installs it in the test subreddit and makes a post. Open it on your phone and on a computer and check: the feed post, Play, a full tutorial, closing and reopening (the save comes back), opening on a second device (the first one says "open somewhere else").
6. **(Ryan)** `npm run deploy` (runs `devvit upload`) to upload a real version. It installs nothing on its own.
7. **(Ryan)** On https://developers.reddit.com/apps/guinea-dumplings fill in the app listing (text is ready in the to-do list), and the icon (`assets/icon-1024.png`).
8. **(Ryan)** `npx devvit publish` to send the app to Reddit for review. Reddit reviews every public app; Reddit coin packs (payments) need their own approval too. Until it is approved, it can still be installed in subreddits you moderate.
9. **(Ryan)** When it is approved: make the public subreddit (e.g. `r/GuineaPigDumplings`), `npx devvit install GuineaPigDumplings`, and use the subreddit's ⋯ menu > "Make a Guinea Pigs and Dumplings post". Installing also makes the first post by itself.
10. Optional: join Reddit's Developer Platform Discord / r/Devvit and enter the game in r/GamesOnReddit.

## Rules this build follows (from Reddit's Devvit rules)

- No outside servers: fonts ship with the app; the build checks every client file.
- No service worker or install-to-home-screen inside Reddit.
- Deleted Reddit accounts: every hour a batch of players is checked, and a deleted account's save, packs and session are wiped.
- Old Reddit and other apps that can't run the game show a text description instead.
- The game is client-run; the server only stores the save, so a save is at most 400 KB of JSON.
