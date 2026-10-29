// Copyright (c) 2026 FatedHobbies. All rights reserved. No copying, modifying or redistributing without permission.
// Piggy names: the list random names come from, and the check that keeps
// player-typed names kind. Everything runs on the device; nothing is sent anywhere.

// Silly, kid-friendly names. One short word each, so a name always fits in
// the top bar beside the Poop Book and music buttons.
export const NAMES = [
  'Bao', 'Squeak', 'Princess', 'Wheeks', 'Fluff', 'Mochi', 'Noodle', 'Gyoza', 'Wonton', 'Dimsum',
  'Biscuit', 'Pudding', 'Nugget', 'Peanut', 'Jelly', 'Sprinkle', 'Pickle', 'Mallow', 'Tofu', 'Bun',
];
// Typed names are cut to this many letters.
export const NAME_MAX = 10;
// Older, longer names and the short name each piggy now goes by.
export const SHORT_NAMES = {
  'Bao Bao': 'Bao', 'Sir Wheeksalot': 'Wheeks', 'Lil Potsticker': 'Sticker', 'Dim Sum': 'Dimsum', 'Dumpling': 'Bun',
  'Dumpling Doug': 'Bun', 'Princess Squeak': 'Squeak', 'Captain Fluff': 'Fluff', 'Jellybean': 'Jelly', 'Sprinkles': 'Sprinkle',
  'Bok Choy': 'Bok', 'Sweet Pea': 'Pea', 'Marshmallow': 'Mallow',
};

// Words that can't be used. They are scrambled with ROT13 so kids peeking at
// the code don't read them. `anywhere` blocks the word even inside a longer
// name; `whole` only blocks it as a word of its own, so "Grape", "Peacock" and
// "Classic" stay fine.
const rot13 = s => s.replace(/[a-z]/g, c => String.fromCharCode((c.charCodeAt(0) - 97 + 13) % 26 + 97));
const BLOCK = {
  anywhere: 'shpx spx fuvg ovgpu ovngpu phag juber fyhg avtt avttn avtre snttbg sntbg ergneq chffl cravf ' +
    'intvan qvyqb cbea uvgyre anmv xxx jrgonpx ornare genaal nffubyr onfgneq gjng jnaxre wvmm zbyrfg ' +
    'crqbcuvyr fcrez zheqre fhvpvqr cvff qvpxurnq',
  whole: 'shx snt qlxr puvax tbbx xvxr fcvp pbba wnc cnxv arteb pbpx qvpx nff nefr qnza phz obbo gvg gvgf ' +
    'frk frkl ubeal ahqr anxrq xvyy encr encvfg crqb uryy nany nahf fynir urvy ubzb yrfob jnax penpxurnq',
};
// Food words that happen to hide a blocked word.
const ALLOW = ['shiitake', 'shitake'];

// Each blocked word becomes a pattern that also catches stretched spellings:
// "fuuuun" style repeats match, but a doubled letter must stay doubled, so
// "Bob" is not mistaken for a longer word.
const toPattern = w => w.replace(/(.)\1*/g, run => run.length > 1 ? `${run[0]}{${run.length},}` : `${run}+`);
const ANYWHERE = BLOCK.anywhere.split(' ').map(w => new RegExp(toPattern(rot13(w))));
const WHOLE = BLOCK.whole.split(' ').map(w => new RegExp(`^${toPattern(rot13(w))}(e?s+)?$`));

const LEET = { 0: 'o', 1: 'i', 3: 'e', 4: 'a', 5: 's', 6: 'g', 7: 't', 8: 'b', 9: 'g',
  '@': 'a', $: 's', '!': 'i', '|': 'i', '+': 't', '€': 'e' };

function forms(name, one) {
  let s = name.normalize('NFKD').replace(/[̀-ͯ]/g, '').toLowerCase();
  s = s.replace(/[0-9@$!|+€]/g, c => c === '1' ? one : LEET[c]);
  for (const ok of ALLOW) s = s.split(ok).join(' ');
  const tokens = s.split(/[^a-z]+/).filter(Boolean);
  // Runs of single letters ("d i c k") count as one word.
  const words = [];
  for (const t of tokens) {
    if (t.length === 1 && words.length && words.at(-1).single) words.at(-1).w += t;
    else words.push({ w: t, single: t.length === 1 });
  }
  return { compact: tokens.join(''), words: words.map(x => x.w) };
}

// True when a name is fine for a piggy.
export function isNiceName(name) {
  for (const one of ['i', 'l']) {
    const { compact, words } = forms(String(name || ''), one);
    if (ANYWHERE.some(re => re.test(compact))) return false;
    if ([compact, ...words].some(w => WHOLE.some(re => re.test(w)))) return false;
  }
  return true;
}
