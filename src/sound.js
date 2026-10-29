// Tiny synthesized sounds so there are no audio files to load.
let ctx = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

// ---------- Volume settings ----------
// Master, Music and Effects each have an on/off switch and a 0-1 volume,
// remembered on this device. Everything plays through master; music and
// effects each have their own knob in front of it.
const AUDIO_KEY = 'dumpling-piggies-audio';
const MUSIC_KEY = 'dumpling-piggies-music'; // the old music on/off switch
const audio = { master: { on: true, vol: 1 }, music: { on: true, vol: 1 }, sfx: { on: true, vol: 1 } };
try {
  const saved = JSON.parse(localStorage.getItem(AUDIO_KEY) || 'null');
  if (saved) for (const k of Object.keys(audio)) Object.assign(audio[k], saved[k]);
  else if (localStorage.getItem(MUSIC_KEY) === 'off') audio.music.on = false;
} catch (e) { /* ignore */ }
const level = (k) => (audio[k].on ? audio[k].vol : 0);
let masterBus = null;
let sfxBus = null;

function buses(c) {
  if (!masterBus) {
    masterBus = c.createGain(); masterBus.gain.value = level('master'); masterBus.connect(c.destination);
    sfxBus = c.createGain(); sfxBus.gain.value = level('sfx'); sfxBus.connect(masterBus);
  }
}

function tone(freqFrom, freqTo, dur, type = 'sine', gain = 0.12, when = 0) {
  if (!level('master') || !level('sfx')) return;
  const c = ac();
  if (!c) return;
  buses(c);
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime + when;
  o.frequency.setValueAtTime(freqFrom, t);
  o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  wheek() { duck(); tone(900, 1500, 0.18, 'triangle', 0.1); tone(1400, 1000, 0.14, 'triangle', 0.08, 0.2); },
  munch() { tone(220, 140, 0.08, 'square', 0.05); tone(220, 140, 0.08, 'square', 0.05, 0.12); },
  coin() { tone(880, 1320, 0.12, 'sine', 0.08); tone(1320, 1760, 0.12, 'sine', 0.06, 0.1); },
  pop() { tone(300, 600, 0.08, 'sine', 0.1); },
  plop() { tone(200, 90, 0.15, 'sine', 0.1); },
  ding() { tone(1200, 1800, 0.25, 'sine', 0.08); tone(1800, 2400, 0.3, 'sine', 0.05, 0.15); },
  fanfare() { duck(); [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.08, i * 0.12)); },
  nope() { tone(300, 200, 0.2, 'square', 0.04); },
};

// ---------- Background music ----------
// A quiet music-box lullaby made on the fly, so there is no file to download
// or license. It loops forever, starts on the first tap (phones block sound
// until then), and its volume comes from the settings above.
const BPM = 76;
const EIGHTH = 30 / BPM;
const VOLUME = 0.05;
// I-vi-IV-V in C, two bars each chord over 16 bars; the second half moves to
// F and back. Each chord: [bass, pad notes...] as MIDI numbers.
const CHORDS = [
  [48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 59, 62, 67],
  [48, 60, 64, 67], [45, 57, 60, 64], [41, 57, 60, 65], [43, 59, 62, 67],
];
// Melody, one entry per eighth note (0 = rest), 16 eighths per chord.
const MELODY = [
  [72, 0, 76, 0, 79, 0, 76, 0, 77, 0, 76, 0, 74, 0, 0, 0],
  [72, 0, 69, 0, 72, 0, 76, 0, 74, 0, 72, 0, 69, 0, 0, 0],
  [69, 0, 72, 0, 77, 0, 76, 0, 74, 0, 72, 0, 74, 0, 0, 0],
  [71, 0, 74, 0, 79, 0, 77, 0, 76, 0, 74, 0, 71, 0, 0, 0],
  [76, 0, 0, 79, 81, 0, 79, 0, 76, 0, 74, 0, 72, 0, 0, 0],
  [72, 0, 0, 76, 74, 0, 72, 0, 69, 0, 67, 0, 69, 0, 0, 0],
  [65, 0, 69, 0, 72, 0, 77, 0, 76, 0, 74, 0, 72, 0, 0, 0],
  [71, 0, 74, 0, 72, 0, 71, 0, 67, 0, 0, 0, 72, 0, 0, 0],
];
const hz = (m) => 440 * Math.pow(2, (m - 69) / 12);

const musicOn = () => level('master') > 0 && level('music') > 0;
const musicVol = () => VOLUME * audio.music.vol;
let bus = null;        // music volume knob, so effects can duck it
let timer = null;
let step = 0;          // eighth notes since the loop started
let nextAt = 0;

function note(c, freq, at, dur, type, gain) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.value = freq;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + (type === 'sine' && dur > 1 ? 0.4 : 0.01));
  g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(bus);
  o.start(at);
  o.stop(at + dur + 0.05);
}

function schedule() {
  const c = ctx;
  while (nextAt < c.currentTime + 0.4) {
    const ci = Math.floor(step / 16) % CHORDS.length;
    const i = step % 16;
    const chord = CHORDS[ci];
    if (i === 0) {
      note(c, hz(chord[0]), nextAt, EIGHTH * 15, 'sine', 0.5);
      chord.slice(1).forEach(m => note(c, hz(m), nextAt, EIGHTH * 16, 'sine', 0.12));
    }
    if (i === 8) note(c, hz(chord[0] + 7), nextAt, EIGHTH * 7, 'sine', 0.3);
    const m = MELODY[ci][i];
    if (m) {
      note(c, hz(m), nextAt, 1.4, 'sine', 0.55);
      note(c, hz(m) * 2, nextAt, 0.5, 'triangle', 0.06); // music-box sparkle
    }
    nextAt += EIGHTH;
    step++;
  }
}

function startMusic() {
  if (timer || !musicOn() || document.hidden) return;
  const c = ac();
  if (!c) return;
  buses(c);
  if (!bus) { bus = c.createGain(); bus.gain.value = 0; bus.connect(masterBus); }
  bus.gain.cancelScheduledValues(c.currentTime);
  bus.gain.setTargetAtTime(musicVol(), c.currentTime, 0.8); // gentle fade in
  nextAt = c.currentTime + 0.1;
  schedule();
  timer = setInterval(schedule, 100);
}

// Dip the music for a moment so wheeks and fanfares come through clearly.
function duck() {
  if (!bus || !timer) return;
  const t = ctx.currentTime;
  bus.gain.cancelScheduledValues(t);
  bus.gain.setTargetAtTime(musicVol() * 0.35, t, 0.03);
  bus.gain.setTargetAtTime(musicVol(), t + 0.6, 0.4);
}

function stopMusic() {
  clearInterval(timer);
  timer = null;
  if (bus) bus.gain.setTargetAtTime(0, ctx.currentTime, 0.1);
}

export const music = {
  // Call once at startup: waits for the first tap, then plays if switched on.
  init() {
    // On iPhone, "ambient" keeps the silent switch muting us and lets a
    // parent's podcast keep playing underneath.
    try { if (navigator.audioSession) navigator.audioSession.type = 'ambient'; } catch (e) { /* ignore */ }
    const first = () => { ['touchend', 'click', 'keydown'].forEach(t => document.removeEventListener(t, first, true)); startMusic(); };
    ['touchend', 'click', 'keydown'].forEach(t => document.addEventListener(t, first, true));
    document.addEventListener('visibilitychange', () => { if (document.hidden) stopMusic(); else if (ctx) startMusic(); });
  },
};

// The Settings popup reads and changes these. kind: 'master' | 'music' | 'sfx'.
export const volume = {
  get(kind) { return { ...audio[kind] }; },
  set(kind, change) {
    Object.assign(audio[kind], change);
    try { localStorage.setItem(AUDIO_KEY, JSON.stringify(audio)); } catch (e) { /* ignore */ }
    if (masterBus) {
      const t = ctx.currentTime;
      masterBus.gain.setTargetAtTime(level('master'), t, 0.05);
      sfxBus.gain.setTargetAtTime(level('sfx'), t, 0.05);
    }
    if (!musicOn()) stopMusic();
    else if (timer) bus.gain.setTargetAtTime(musicVol(), ctx.currentTime, 0.1);
    else startMusic();
  },
};
