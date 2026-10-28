// Tiny synthesized sounds so there are no audio files to load.
let ctx = null;

function ac() {
  if (!ctx) {
    try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

function tone(freqFrom, freqTo, dur, type = 'sine', gain = 0.12, when = 0) {
  const c = ac();
  if (!c) return;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  const t = c.currentTime + when;
  o.frequency.setValueAtTime(freqFrom, t);
  o.frequency.exponentialRampToValueAtTime(freqTo, t + dur);
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + dur + 0.05);
}

export const sfx = {
  wheek() { tone(900, 1500, 0.18, 'triangle', 0.1); tone(1400, 1000, 0.14, 'triangle', 0.08, 0.2); },
  munch() { tone(220, 140, 0.08, 'square', 0.05); tone(220, 140, 0.08, 'square', 0.05, 0.12); },
  coin() { tone(880, 1320, 0.12, 'sine', 0.08); tone(1320, 1760, 0.12, 'sine', 0.06, 0.1); },
  pop() { tone(300, 600, 0.08, 'sine', 0.1); },
  plop() { tone(200, 90, 0.15, 'sine', 0.1); },
  ding() { tone(1200, 1800, 0.25, 'sine', 0.08); tone(1800, 2400, 0.3, 'sine', 0.05, 0.15); },
  fanfare() { [523, 659, 784, 1047].forEach((f, i) => tone(f, f, 0.18, 'triangle', 0.08, i * 0.12)); },
  nope() { tone(300, 200, 0.2, 'square', 0.04); },
};
