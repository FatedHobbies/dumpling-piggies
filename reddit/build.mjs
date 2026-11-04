// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Builds the Reddit version from the same game files GitHub Pages serves.
//   dist/client  the game (game.html), the feed post (splash.html), local fonts, no service worker
//   dist/server  the Reddit server, bundled into one file
// Devvit runs this before every `devvit upload` / `devvit playtest` (see "scripts" in devvit.json).
import { build } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const out = join(here, 'dist');
const client = join(out, 'client');

rmSync(out, { recursive: true, force: true });
mkdirSync(join(client, 'fonts'), { recursive: true });

// 1. The game files, unchanged, except the save layer, which talks to the Reddit server.
cpSync(join(root, 'src'), join(client, 'src'), { recursive: true });
cpSync(join(here, 'client', 'save.js'), join(client, 'src', 'save.js'));
cpSync(join(root, 'style.css'), join(client, 'style.css'));
cpSync(join(root, 'icons'), join(client, 'icons'), { recursive: true });

// 2. Fonts from local files: Reddit's webview blocks Google Fonts and every other outside server.
const FONTS = [['fredoka', 'Fredoka', [300, 500, 600, 700]], ['nunito', 'Nunito', [400, 700]]];
let fontCss = '';
for (const [pkg, family, weights] of FONTS) {
  for (const w of weights) {
    const file = `${pkg}-latin-${w}-normal.woff2`;
    cpSync(join(here, 'node_modules', '@fontsource', pkg, 'files', file), join(client, 'fonts', file));
    fontCss += `@font-face{font-family:"${family}";font-style:normal;font-weight:${w};font-display:swap;src:url(fonts/${file}) format("woff2")}\n`;
  }
}
writeFileSync(join(client, 'fonts.css'), fontCss);

// 3. game.html: the web index.html without the install-to-home-screen and offline bits.
const Art = await import(pathToFileURL(join(root, 'src', 'art.js')).href);
let html = readFileSync(join(root, 'index.html'), 'utf8');
const swap = (pattern, replacement) => {
  if (!pattern.test(html)) throw new Error(`build.mjs: index.html no longer matches ${pattern}. Update the Reddit build.`);
  html = html.replace(pattern, replacement);
};
swap(/\s*<meta name="(apple-mobile-web-app-[a-z-]+|mobile-web-app-capable|theme-color)"[^>]*>/g, '');
swap(/\s*<link rel="(manifest|apple-touch-icon|preconnect)"[^>]*>/g, '');
swap(/\s*<link rel="stylesheet" href="https:\/\/fonts\.googleapis\.com[^>]*>/, '\n  <link rel="stylesheet" href="fonts.css">\n  <link rel="stylesheet" href="boot.css">');
swap(/(<link rel="stylesheet" href="style.css">)/, '$1\n  <link rel="stylesheet" href="reddit.css">');
swap(/<script type="module">[\s\S]*?<\/script>/,
  `<div id="boot"><div class="boot-pig">${Art.piggySide()}</div><div id="boot-msg">Waking up the Piggies…</div><button id="boot-retry" type="button" hidden>Play here</button></div>\n  <script type="module" src="reddit-boot.js"></script>`);
if (/https?:\/\/(?!www\.w3\.org)/.test(html)) throw new Error('build.mjs: game.html still loads something from outside Reddit.');
writeFileSync(join(client, 'game.html'), html);
for (const f of ['boot.css', 'reddit.css']) cpSync(join(here, 'client', f), join(client, f));
// reddit-boot.js may import npm packages (like @devvit/web/client), so it is bundled. The game's own files stay
// separate: import them as './src/<file>.js' (the path in dist/client), so the boot code and the game share one copy.
await build({
  entryPoints: [join(here, 'client', 'reddit-boot.js')],
  outfile: join(client, 'reddit-boot.js'),
  bundle: true, format: 'esm', platform: 'browser', target: 'es2020', minify: true, logLevel: 'warning',
  external: ['./src/*'],
});

// 4. The post in the feed.
cpSync(join(here, 'client', 'splash.html'), join(client, 'splash.html'));
cpSync(join(here, 'client', 'splash.css'), join(client, 'splash.css'));
await build({
  entryPoints: [join(here, 'client', 'splash.js')],
  outfile: join(client, 'splash.js'),
  bundle: true, format: 'iife', platform: 'browser', target: 'es2020', minify: true, logLevel: 'warning',
});

// 5. The server.
await build({
  entryPoints: [join(here, 'server', 'index.js')],
  outfile: join(out, 'server', 'index.cjs'),
  bundle: true, format: 'cjs', platform: 'node', target: 'node22', sourcemap: 'inline', logLevel: 'warning',
});

// Nothing in the client may call out to the internet.
const scan = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((d) => (d.isDirectory() ? scan(join(dir, d.name)) : [join(dir, d.name)]));
for (const f of scan(client).filter((f) => /\.(js|css|html)$/.test(f))) {
  const bad = readFileSync(f, 'utf8').match(/(?:fetch\(|url\(|src=|href=)\s*["'`]?https?:\/\/[^"'`)\s]+/g);
  if (bad) throw new Error(`build.mjs: ${f} reaches outside Reddit: ${bad[0]}`);
}
if (existsSync(join(client, 'sw.js'))) throw new Error('build.mjs: the service worker must not ship to Reddit.');
console.log('Built dist/client and dist/server');
