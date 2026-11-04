// Arka plan müziği: üç istasyon, ses dosyası yok. Notalar Web Audio ile anında üretilir (telifsiz, çevrimdışı).
// Her istasyonun akorları, ritmi ve enstrümanları kendine; ezgiler her çalışta biraz değişir.
// Zamanlama: notalar biraz önceden kuyruğa alınır (arka plandaki sekmede daha uzun), böylece takılmaz.
"use client";

export type Station = "lofi" | "ortacag" | "italya";
export const STATIONS: Record<Station, { label: string; emoji: string; hint: string }> = {
  lofi: { label: "Lofi", emoji: "🎧", hint: "elektrikli piyano, plak cızırtısı, yumuşak davul" },
  ortacag: { label: "Ortaçağ", emoji: "🏰", hint: "lavta, flüt, gayda tınısı ve def" },
  italya: { label: "İtalya caz", emoji: "🍋", hint: "bossa nova gitar, yürüyen bas, vibrafon" },
};
export const STATION_ORDER: Station[] = ["lofi", "ortacag", "italya"];

const mtof = (m: number) => 440 * Math.pow(2, (m - 69) / 12);
const pick = <T,>(a: T[]) => a[Math.floor(Math.random() * a.length)];

let ctx: AudioContext | null = null;
let master: GainNode | null = null; // ses seviyesi
let bus: GainNode | null = null; // istasyonun girişi (lofi'de sıcak süzgeçten geçer)
let tone: BiquadFilterNode | null = null;
let noise: AudioBuffer | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let held: AudioScheduledSourceNode[] = []; // sürekli çalanlar (gayda, plak cızırtısı)
let state: { station: Station; step: number; next: number; stepDur: number } | null = null;
const plucks = new Map<number, AudioBuffer>();

function setup() {
  if (ctx) return ctx;
  ctx = new AudioContext();
  master = ctx.createGain(); master.gain.value = 0.5; master.connect(ctx.destination);
  tone = ctx.createBiquadFilter(); tone.type = "lowpass"; tone.frequency.value = 18000; tone.connect(master);
  bus = ctx.createGain(); bus.connect(tone);
  noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
  const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return ctx;
}

/* -------------------------------- enstrümanlar -------------------------------- */

function env(g: GainNode, t: number, peak: number, attack: number, dur: number, release = 0.08) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + attack);
  g.gain.exponentialRampToValueAtTime(Math.max(0.0001, peak * 0.25), t + Math.max(attack + 0.01, dur));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur + release);
}
function osc(type: OscillatorType, f: number, t: number, end: number, out: AudioNode, detune = 0) {
  const o = ctx!.createOscillator(); o.type = type; o.frequency.value = f; o.detune.value = detune;
  o.connect(out); o.start(t); o.stop(end); return o;
}
function noiseHit(t: number, dur: number, v: number, type: BiquadFilterType, freq: number, q = 0.7) {
  const s = ctx!.createBufferSource(); s.buffer = noise; s.playbackRate.value = 0.9 + Math.random() * 0.2;
  const f = ctx!.createBiquadFilter(); f.type = type; f.frequency.value = freq; f.Q.value = q;
  const g = ctx!.createGain(); env(g, t, v, 0.002, dur, 0.02);
  s.connect(f).connect(g).connect(bus!); s.start(t, Math.random() * 0.5); s.stop(t + dur + 0.05);
}

/** elektrikli piyano: temel ton + hızla sönen parlak üst ton */
function ep(m: number, t: number, dur: number, v: number) {
  const g = ctx!.createGain(); env(g, t, v, 0.008, dur, 0.25); g.connect(bus!);
  osc("sine", mtof(m), t, t + dur + 0.3, g);
  const g2 = ctx!.createGain(); env(g2, t, v * 0.35, 0.004, 0.18, 0.05); g2.connect(bus!);
  osc("sine", mtof(m) * 2, t, t + 0.3, g2, 4);
}
/** telli çalgı (lavta, gitar): Karplus-Strong ile önceden hesaplanmış titreşen tel */
function pluck(m: number, t: number, v: number, bright = 0.5) {
  const key = Math.round(m * 10 + bright * 3);
  let buf = plucks.get(key);
  if (!buf) {
    const sr = ctx!.sampleRate, n = Math.round(sr / mtof(m)), len = Math.round(sr * 1.6);
    buf = ctx!.createBuffer(1, len, sr);
    const y = buf.getChannelData(0);
    for (let i = 0; i < n; i++) y[i] = (Math.random() * 2 - 1) * (0.5 + bright * 0.5);
    const damp = 0.994 + bright * 0.004;
    for (let i = n; i < len; i++) y[i] = damp * 0.5 * (y[i - n] + y[i - n - 1 < 0 ? 0 : i - n - 1]);
    plucks.set(key, buf);
  }
  const s = ctx!.createBufferSource(); s.buffer = buf;
  const g = ctx!.createGain(); g.gain.value = v; s.connect(g).connect(bus!); s.start(t);
}
function bass(m: number, t: number, dur: number, v: number) {
  const f = ctx!.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 520;
  const g = ctx!.createGain(); env(g, t, v, 0.01, dur, 0.06); f.connect(g).connect(bus!);
  osc("triangle", mtof(m), t, t + dur + 0.1, f);
}
/** ezgi sesi: flüt (titreşimli) ya da vibrafon (tremolo, çabuk söner) */
function lead(m: number, t: number, dur: number, v: number, kind: "flut" | "vibrafon") {
  const g = ctx!.createGain(); g.connect(bus!);
  const o = osc(kind === "flut" ? "triangle" : "sine", mtof(m), t, t + dur + 0.4, g);
  const lfo = ctx!.createOscillator(), lg = ctx!.createGain();
  lfo.frequency.value = kind === "flut" ? 5.2 : 6.5; lg.gain.value = kind === "flut" ? 6 : 0;
  lfo.connect(lg).connect(o.detune); lfo.start(t); lfo.stop(t + dur + 0.4);
  if (kind === "flut") env(g, t, v, 0.06, dur, 0.12); else env(g, t, v, 0.005, Math.min(dur, 0.6), 0.5);
}
function kick(t: number, v: number) {
  const g = ctx!.createGain(); env(g, t, v, 0.003, 0.18, 0.05); g.connect(bus!);
  const o = osc("sine", 110, t, t + 0.3, g); o.frequency.exponentialRampToValueAtTime(42, t + 0.14);
}
/** def / davul: tok vuruş + deri sesi */
function frameDrum(t: number, v: number) {
  const g = ctx!.createGain(); env(g, t, v, 0.004, 0.22, 0.08); g.connect(bus!);
  const o = osc("sine", 96, t, t + 0.35, g); o.frequency.exponentialRampToValueAtTime(70, t + 0.2);
  noiseHit(t, 0.05, v * 0.25, "bandpass", 900);
}

/* ------------------------------- sürekli sesler ------------------------------- */

function crackleLoop() {
  const c = ctx!, len = c.sampleRate * 4, buf = c.createBuffer(1, len, c.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.012 + (Math.random() < 0.0004 ? (Math.random() - 0.5) * 0.9 : 0);
  const s = c.createBufferSource(); s.buffer = buf; s.loop = true;
  const f = c.createBiquadFilter(); f.type = "highpass"; f.frequency.value = 900;
  const g = c.createGain(); g.gain.value = 0.5; s.connect(f).connect(g).connect(bus!); s.start();
  held.push(s);
}
function drone(notes: number[]) {
  const c = ctx!, f = c.createBiquadFilter(); f.type = "lowpass"; f.frequency.value = 650;
  const g = c.createGain(); g.gain.setValueAtTime(0.0001, c.currentTime); g.gain.exponentialRampToValueAtTime(0.035, c.currentTime + 2);
  f.connect(g).connect(bus!);
  for (const m of notes) { const o = c.createOscillator(); o.type = "sawtooth"; o.frequency.value = mtof(m); o.detune.value = (Math.random() - 0.5) * 8; o.connect(f); o.start(); held.push(o); }
}

/* ---------------------------------- istasyonlar --------------------------------- */
// Her istasyon: adım süresi, ölçüdeki adım sayısı, sallantı (swing) ve bir adımda çalınanlar.

type Style = { stepDur: number; perBar: number; swing: number; start: () => void; play: (step: number, t: number) => void };

// lofi: yedili akorlar, boom-bap davul, ara ara pentatonik ezgi
function lofi(): Style {
  const progs = [
    { ch: [[53, 57, 60, 64], [52, 55, 59, 62], [50, 53, 57, 60], [48, 52, 55, 59]], root: [41, 40, 38, 36], pent: [65, 67, 69, 72, 74, 77] },
    { ch: [[50, 53, 57, 60, 64], [43, 53, 57, 59, 64], [48, 52, 55, 59, 62], [45, 52, 55, 60]], root: [38, 43, 36, 45], pent: [64, 67, 69, 72, 74, 76] },
    { ch: [[57, 60, 64, 67], [50, 53, 57, 60], [55, 59, 62, 65], [48, 52, 55, 59]], root: [45, 38, 43, 36], pent: [64, 67, 69, 72, 76, 79] },
  ];
  const p = pick(progs);
  let mel = 2;
  return {
    stepDur: 60 / (68 + Math.random() * 10) / 4, perBar: 16, swing: 0.22,
    start: () => { tone!.frequency.value = 2600; crackleLoop(); },
    play: (step, t) => {
      const s = step % 16, bar = Math.floor(step / 16) % 4, d = state!.stepDur;
      if (s === 0) p.ch[bar].forEach((m, k) => ep(m, t + k * 0.012, d * 12, 0.07));
      if (s === 10 && Math.random() < 0.6) p.ch[bar].slice(1).forEach((m) => ep(m + 12, t, d * 4, 0.035));
      if (s === 0 || s === 8) bass(p.root[bar], t, d * 6, 0.22);
      if (s === 14 && Math.random() < 0.4) bass(p.root[(bar + 1) % 4] + 1, t, d * 2, 0.12);
      if (s === 0 || s === 7 || (s === 10 && Math.random() < 0.5)) kick(t, 0.5);
      if (s === 4 || s === 12) noiseHit(t, 0.12, 0.16, "bandpass", 1700, 0.9);
      if (s % 2 === 0 && Math.random() < 0.85) noiseHit(t, 0.03, s % 4 === 0 ? 0.05 : 0.03, "highpass", 7500);
      if (s % 2 === 0 && Math.random() < 0.16) { mel = Math.max(0, Math.min(p.pent.length - 1, mel + pick([-2, -1, 1, 2]))); ep(p.pent[mel], t, d * 3, 0.05); }
    },
  };
}

// ortaçağ: re dorian, 6/8; lavta arpejleri, gayda tınısı, def, flüt ezgisi
function ortacag(): Style {
  const chords = [[50, 57, 62, 65], [48, 55, 60, 64], [50, 57, 62, 65], [45, 52, 57, 60], [41, 48, 53, 57], [48, 55, 60, 64], [50, 57, 62, 65], [50, 57, 62, 69]];
  const scale = [62, 64, 65, 67, 69, 71, 72, 74, 76];
  let deg = 0, rest = 0;
  return {
    stepDur: 60 / (178 + Math.random() * 20), perBar: 6, swing: 0,
    start: () => { tone!.frequency.value = 9000; drone([38, 45]); },
    play: (step, t) => {
      const s = step % 6, bar = Math.floor(step / 6) % 8, ch = chords[bar], d = state!.stepDur;
      pluck(ch[[0, 2, 1, 3, 2, 1][s]] + 12, t, s === 0 ? 0.32 : 0.22, 0.55);
      if (s === 0) pluck(ch[0], t, 0.3, 0.3);
      if (s === 0) frameDrum(t, 0.5); else if (s === 3) frameDrum(t, 0.3); else if (s === 5 && Math.random() < 0.4) frameDrum(t, 0.15);
      // flüt: bölüm bölüm çalar, arada susar
      if (bar % 4 === 0 && s === 0) rest = Math.random() < 0.3 ? 4 : 0;
      if (rest > 0) { if (s === 5) rest--; return; }
      if (s === 0 || s === 3 || (s === 2 && Math.random() < 0.3)) {
        deg = Math.max(0, Math.min(scale.length - 1, deg + pick([-2, -1, -1, 1, 1, 2])));
        if (s === 0 && Math.random() < 0.5) deg = [0, 2, 4][Math.floor(Math.random() * 3)];
        lead(scale[deg], t, d * (s === 0 ? 2.6 : 1.8), 0.06, "flut");
      }
    },
  };
}

// italya: bossa nova; maj7 / dominant akorlar, gitar senkopu, kök-beşli bas, marakas, vibrafon
function italya(): Style {
  const progs = [
    { ch: [[52, 55, 59, 64], [49, 55, 57, 64], [53, 57, 60, 65], [53, 55, 59, 65]], root: [36, 33, 38, 31] },
    { ch: [[53, 57, 60, 64], [51, 55, 58, 63], [50, 53, 57, 60], [49, 53, 55, 59]], root: [41, 39, 38, 43] },
  ];
  const p = pick(progs);
  const scale = [64, 65, 67, 69, 71, 72, 74, 76, 77, 79];
  const GUITAR = new Set([0, 3, 6, 10, 13]);
  let deg = 4;
  return {
    stepDur: 60 / (126 + Math.random() * 12) / 4, perBar: 16, swing: 0.05,
    start: () => { tone!.frequency.value = 7000; },
    play: (step, t) => {
      const s = step % 16, bar = Math.floor(step / 16) % 4, d = state!.stepDur;
      if (GUITAR.has(s)) p.ch[bar].forEach((m, k) => pluck(m, t + k * 0.009, 0.1, 0.35));
      if (s === 0 || s === 8) bass(p.root[bar], t, d * 5, 0.26);
      if (s === 6 || s === 14) bass(p.root[bar] + 7, t, d * 2, 0.18);
      noiseHit(t, 0.025, s % 4 === 2 ? 0.05 : 0.025, "highpass", 6000);
      if (s === 3 || s === 10) noiseHit(t, 0.03, 0.06, "bandpass", 2600, 2);
      if (s % 2 === 0 && Math.random() < (bar % 2 ? 0.35 : 0.2)) {
        deg = Math.max(0, Math.min(scale.length - 1, deg + pick([-2, -1, 1, 1, 2])));
        lead(scale[deg], t, d * pick([2, 3, 4]), 0.05, "vibrafon");
      }
    },
  };
}

const MAKERS: Record<Station, () => Style> = { lofi, ortacag, italya };

/* ------------------------------------ kontrol ------------------------------------ */

let style: Style | null = null;

function schedule() {
  if (!ctx || !state || !style) return;
  const ahead = document.hidden ? 1.5 : 0.2;
  while (state.next < ctx.currentTime + ahead) {
    const swing = state.step % 2 ? style.swing * style.stepDur : 0;
    style.play(state.step, state.next + swing);
    state.next += style.stepDur;
    state.step++;
  }
}

/** İstasyonu başlatır (dokunuş/tık içinde çağrılmalı); çalan varsa onun yerine geçer */
export async function playStation(station: Station, volume: number) {
  const c = setup();
  if (c.state === "suspended") await c.resume();
  stopMusic(false);
  style = MAKERS[station]();
  master!.gain.setTargetAtTime(volume, c.currentTime, 0.05);
  bus!.gain.cancelScheduledValues(c.currentTime); bus!.gain.setValueAtTime(0.0001, c.currentTime); bus!.gain.exponentialRampToValueAtTime(1, c.currentTime + 1.2);
  style.start();
  state = { station, step: 0, next: c.currentTime + 0.1, stepDur: style.stepDur };
  schedule();
  timer = setInterval(schedule, 40);
}

export function stopMusic(fade = true) {
  if (timer) { clearInterval(timer); timer = null; }
  const c = ctx, old = held;
  held = []; state = null; style = null;
  if (!c || !bus) return;
  const end = c.currentTime + (fade ? 0.6 : 0.02);
  if (fade) { bus.gain.cancelScheduledValues(c.currentTime); bus.gain.setTargetAtTime(0.0001, c.currentTime, 0.15); }
  for (const s of old) { try { s.stop(end); } catch { /* zaten durdu */ } }
}

export function setMusicVolume(v: number) {
  if (ctx && master) master.gain.setTargetAtTime(v, ctx.currentTime, 0.05);
}

export const musicPlaying = () => state?.station ?? null;
