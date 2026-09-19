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

export function sfxBark() {
  unlockAudio();
  if (!ctx || !sfx) return;
  const t = now();
  const o = ctx.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(180, t);
  o.frequency.exponentialRampToValueAtTime(90, t + 0.16);
  const g = envGain(0.14, 0.14);
  if (!g) return;
  o.connect(g);
  o.start(t);
  o.stop(t + 0.18);
}

export function resumeAudio() {
  if (ctx?.state === "suspended") void ctx.resume();
}

export function rumble(ms = 16) {
  try {
    navigator.vibrate?.(ms);
  } catch {
    /* no haptic hardware */
  }
}

let music: GainNode | null = null;
let musicFilter: BiquadFilterNode | null = null;
let musicToken = 0;
let musicPlaying = false;

function ensureMusic() {
  if (!ctx || !master || music) return;
  musicFilter = ctx.createBiquadFilter();
  musicFilter.type = "lowpass";
  musicFilter.frequency.value = 1400;
  musicFilter.Q.value = 0.65;
  music = ctx.createGain();
  music.gain.value = 0.0001;
  music.connect(musicFilter);
  musicFilter.connect(master);
}

function tone(freq: number, t: number, dur: number, peak: number, type: OscillatorType = "sine") {
  if (!ctx || !music) return;
  const o = ctx.createOscillator();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(peak, t + 0.04);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g);
  g.connect(music);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function phrase(t0: number) {
  const scale = [196, 220, 247, 294, 330, 392];
  tone(98, t0, 2.25, 0.045);
  tone(147, t0 + 0.04, 2.2, 0.03);
  const a = scale[Math.floor((t0 * 1.7) % scale.length)]!;
  const b = scale[Math.floor((t0 * 2.9) % scale.length)]!;
  tone(a, t0 + 0.18, 0.62, 0.05, "triangle");
  tone(b * 2, t0 + 1.05, 0.22, 0.028, "triangle");
}

export function startMusic() {
  unlockAudio();
  ensureMusic();
  if (!ctx || !music) return;
  musicPlaying = true;
  const token = ++musicToken;
  music.gain.setTargetAtTime(muted ? 0.0001 : 0.16, ctx.currentTime, 0.14);
  const tick = () => {
    if (token !== musicToken || !musicPlaying || !ctx) return;
    phrase(ctx.currentTime);
    window.setTimeout(tick, 2300);
  };
  tick();
}

export function stopMusic() {
  musicPlaying = false;
  musicToken += 1;
  if (music && ctx) music.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.1);
}

export function setMusicDusk(dayT: number) {
  if (!musicFilter || !ctx) return;
  const hz = 1480 - Math.max(0, Math.min(1, dayT)) * 1120;
  musicFilter.frequency.setTargetAtTime(hz, ctx.currentTime, 0.3);
}

export function setMusicPaused(paused: boolean) {
  if (!music || !ctx || !musicPlaying) return;
  music.gain.setTargetAtTime(muted || paused ? 0.0001 : 0.16, ctx.currentTime, 0.08);
}
