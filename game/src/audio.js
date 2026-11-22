// audio.js — tiny WebAudio bleeps, no audio files. Every call is guarded
// so sound can never break the game; the context is created lazily on the
// first user gesture.

let ctx = null;
let muted = false;

export function ensureAudio() {
  try {
    if (!ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
    }
    if (ctx.state === 'suspended') void ctx.resume();
  } catch {
    ctx = null;
  }
}

export function setMuted(value) {
  muted = value;
}

function beep(freq, seconds, type = 'sine', gain = 0.05) {
  if (muted) return;
  try {
    ensureAudio();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(gain, ctx.currentTime);
    amp.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + seconds);
    osc.connect(amp);
    amp.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + seconds);
  } catch {
    // Sound is decoration; a failure must never reach the game.
  }
}

export const sfx = {
  coin() {
    beep(1320, 0.09, 'triangle', 0.06);
    setTimeout(() => beep(1760, 0.12, 'triangle', 0.05), 70);
  },
  smoke() {
    beep(220, 0.25, 'sine', 0.04);
  },
  emp() {
    beep(880, 0.08, 'square', 0.03);
    setTimeout(() => beep(440, 0.14, 'square', 0.03), 80);
  },
  pickTick() {
    beep(980, 0.05, 'triangle', 0.04);
  },
  smash() {
    beep(160, 0.3, 'sawtooth', 0.07);
    setTimeout(() => beep(90, 0.35, 'sawtooth', 0.06), 60);
  },
  pickup() {
    beep(1046, 0.1, 'triangle', 0.06);
    setTimeout(() => beep(1318, 0.1, 'triangle', 0.06), 90);
    setTimeout(() => beep(1568, 0.18, 'triangle', 0.06), 180);
  },
  spotted() {
    beep(660, 0.12, 'square', 0.05);
    setTimeout(() => beep(660, 0.12, 'square', 0.05), 150);
  },
  win() {
    [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => beep(f, 0.22, 'triangle', 0.06), i * 120));
  },
  lose() {
    [392, 330, 262, 196].forEach((f, i) => setTimeout(() => beep(f, 0.25, 'sawtooth', 0.05), i * 140));
  },
};
