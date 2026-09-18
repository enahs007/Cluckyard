let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let sfx: GainNode | null = null;
let muted = false;

function now() {
  return ctx?.currentTime ?? 0;
}

export function unlockAudio() {
  if (!ctx) {
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    ctx = new AC({ latencyHint: "interactive" });
    master = ctx.createGain();
    sfx = ctx.createGain();
    sfx.gain.value = 0.7;
    master.gain.value = muted ? 0 : 0.85;
    sfx.connect(master);
    master.connect(ctx.destination);
  }
  if (ctx.state === "suspended") void ctx.resume();
}

export function setMuted(v: boolean) {
  muted = v;
  if (master && ctx) master.gain.setTargetAtTime(v ? 0 : 0.85, ctx.currentTime, 0.03);
}

export function isMuted() {
  return muted;
}

function envGain(duration: number, peak = 0.4) {
  if (!ctx || !sfx) return null;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now());
  g.gain.exponentialRampToValueAtTime(peak, now() + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, now() + duration);
  g.connect(sfx);
  return g;
}

function noise(duration: number) {
  if (!ctx) return null;
  const len = Math.max(1, Math.floor(ctx.sampleRate * duration));
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource();
  src.buffer = buf;
  return src;
}

export function sfxPeck() {
  unlockAudio();
  if (!ctx || !sfx) return;
  const t = now();
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(520 + Math.random() * 40, t);
  o.frequency.exponentialRampToValueAtTime(180, t + 0.07);
  const g = envGain(0.09, 0.18);
  if (!g) return;
  o.connect(g);
  o.start(t);
  o.stop(t + 0.1);
}

export function sfxFlap() {
  unlockAudio();
  if (!ctx || !sfx) return;
  const n = noise(0.14);
  if (!n) return;
  const f = ctx.createBiquadFilter();
  f.type = "bandpass";
  f.frequency.value = 420 + Math.random() * 90;
  f.Q.value = 0.7;
  const g = envGain(0.12, 0.22);
  if (!g) return;
  n.connect(f);
  f.connect(g);
  n.playbackRate.value = 0.9 + Math.random() * 0.25;
  n.start();
}

export function sfxLand(hard: boolean) {
  unlockAudio();
  if (!ctx || !sfx) return;
  const t = now();
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(hard ? 90 : 140, t);
  o.frequency.exponentialRampToValueAtTime(50, t + 0.16);
  const g = envGain(0.18, hard ? 0.32 : 0.16);
  if (!g) return;
  o.connect(g);
  o.start(t);
  o.stop(t + 0.2);
}

export function sfxPickup() {
  unlockAudio();
  if (!ctx || !sfx) return;
  const t = now();
  const o = ctx.createOscillator();
  o.type = "sine";
  o.frequency.setValueAtTime(660, t);
  o.frequency.exponentialRampToValueAtTime(990, t + 0.12);
  const g = envGain(0.16, 0.2);
  if (!g) return;
  o.connect(g);
  o.start(t);
  o.stop(t + 0.18);
}

export function sfxHurt() {
  unlockAudio();
  if (!ctx || !sfx) return;
  const t = now();
  const o = ctx.createOscillator();
  o.type = "sawtooth";
  o.frequency.setValueAtTime(340, t);
  o.frequency.exponentialRampToValueAtTime(120, t + 0.28);
  const g = envGain(0.28, 0.16);
  if (!g) return;
  o.connect(g);
  o.start(t);
  o.stop(t + 0.3);
}

export function sfxHawk() {
  unlockAudio();
  if (!ctx || !sfx) return;
  const t = now();
  const o = ctx.createOscillator();
  o.type = "triangle";
  o.frequency.setValueAtTime(1480, t);
  o.frequency.exponentialRampToValueAtTime(720, t + 0.35);
  const g = envGain(0.36, 0.12);
  if (!g) return;
  o.connect(g);
  o.start(t);
  o.stop(t + 0.4);
}

export function resumeAudio() {
  if (ctx?.state === "suspended") void ctx.resume();
}
