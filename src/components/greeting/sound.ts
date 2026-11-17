// synthesized sound (Web Audio, no files). the AudioContext is only ever created inside a click handler.
const KEY = "v2-sound";

export const getSoundOn = () => {
  try { return localStorage.getItem(KEY) !== "off"; } catch { return true; }
};
export const setSoundOn = (on: boolean) => {
  try { localStorage.setItem(KEY, on ? "on" : "off"); } catch {}
};

let ctx: AudioContext | null = null;
let noise: AudioBuffer | null = null;

// call from a click handler only; returns null when sound is off or unsupported
const audio = () => {
  if (!getSoundOn()) return null;
  try {
    const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
};

// power on: ~0.5s burst of filtered white noise, quick attack, soft decay
export const playOn = () => {
  const c = audio();
  if (!c) return;
  if (!noise) {
    noise = c.createBuffer(1, Math.ceil(c.sampleRate * 0.6), c.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  }
  const t = c.currentTime;
  const src = c.createBufferSource();
  src.buffer = noise;
  const hp = c.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 900;
  const lp = c.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 7000;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.12, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.55);
  src.connect(hp).connect(lp).connect(g).connect(c.destination);
  src.start(t);
  src.stop(t + 0.6);
};

// power off: ~120ms sine glide 660 -> 220 Hz
export const playOff = () => {
  const c = audio();
  if (!c) return;
  const t = c.currentTime;
  const o = c.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(660, t);
  o.frequency.exponentialRampToValueAtTime(220, t + 0.12);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(0.09, t + 0.008);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.13);
  o.connect(g).connect(c.destination);
  o.start(t);
  o.stop(t + 0.14);
};
