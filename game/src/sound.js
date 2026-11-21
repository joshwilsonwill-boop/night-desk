// Night Desk: procedural sound. Every sound is synthesized with WebAudio,
// no audio files. All functions are silent until the player first interacts
// (the browser needs a gesture before audio starts), and silent in shot mode.
let ctx = null;

export function ensureAudio() {
  if (ctx) {
    if (ctx.state === 'suspended') ctx.resume();
    return;
  }
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    ctx = new AudioContextClass();
  } catch {
    ctx = null;
  }
}

function blip(freq, duration, type, volume, slideTo) {
  if (!ctx) return;
  try {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type || 'sine';
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + duration);
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // Audio is decoration: never break the game for it.
  }
}

function noiseBurst(duration, volume, lowFreq) {
  if (!ctx) return;
  try {
    const length = Math.floor(ctx.sampleRate * duration);
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = lowFreq || 900;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);
    source.start();
  } catch {
    // Audio is decoration: never break the game for it.
  }
}

// A footstep: soft for the player, quieter with distance for guards.
// `volume` is 0 to 1; guards call with a distance-scaled volume.
export function playStep(isPlayer, volume) {
  if (!ctx || volume <= 0.02) return;
  noiseBurst(0.07, volume * 0.35, isPlayer ? 700 : 500);
}

// A coin hitting the floor: two short metallic ticks.
export function playCoin() {
  blip(1900, 0.06, 'triangle', 0.16);
  setTimeout(() => blip(1500, 0.08, 'triangle', 0.12), 70);
}

// Picking up the data core: a rising chirp.
export function playPickup() {
  blip(520, 0.14, 'sine', 0.2, 1040);
}

// Alarm: a low two-tone sting.
export function playAlert() {
  blip(196, 0.22, 'sawtooth', 0.14, 147);
  setTimeout(() => blip(196, 0.3, 'sawtooth', 0.14, 131), 180);
}

// Caught: a short descending buzz.
export function playCaught() {
  blip(220, 0.5, 'square', 0.12, 55);
}

// Win: a small three-note chime.
export function playWin() {
  blip(523, 0.16, 'sine', 0.18);
  setTimeout(() => blip(659, 0.16, 'sine', 0.18), 140);
  setTimeout(() => blip(784, 0.3, 'sine', 0.2), 280);
}
