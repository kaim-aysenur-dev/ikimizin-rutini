// Gelişim ses efektleri: hepsi Web Audio ile anında üretilir (dosya yok). Tarayıcı ancak bir dokunuştan sonra çalar.
let ctx: AudioContext | null = null;
let enabled = true;

export const setSfx = (on: boolean) => { enabled = on; };

function ac(): AudioContext | null {
  if (!enabled || typeof window === "undefined") return null;
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch { return null; }
}

/** Tek nota: frekans kayabilir (slide Hz), yumuşak giriş ve sönüş */
function tone(freq: number, dur: number, type: OscillatorType = "square", vol = 0.05, slide = 0, delay = 0) {
  const a = ac(); if (!a) return;
  const at = a.currentTime + delay, o = a.createOscillator(), g = a.createGain();
  o.type = type; o.frequency.setValueAtTime(freq, at);
  if (slide) o.frequency.linearRampToValueAtTime(Math.max(30, freq + slide), at + dur);
  g.gain.setValueAtTime(0.0001, at); g.gain.exponentialRampToValueAtTime(vol, at + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
  o.connect(g).connect(a.destination); o.start(at); o.stop(at + dur + 0.02);
}

/** Süzgeçten geçmiş hışırtı: ayak sesi, savuruş, çatırtı */
function noise(dur: number, vol: number, freq: number, delay = 0, q = 1) {
  const a = ac(); if (!a) return;
  const at = a.currentTime + delay, len = Math.ceil(a.sampleRate * dur), buf = a.createBuffer(1, len, a.sampleRate), d = buf.getChannelData(0);
  for (let k = 0; k < len; k++) d[k] = (Math.random() * 2 - 1) * (1 - k / len);
  const src = a.createBufferSource(), f = a.createBiquadFilter(), g = a.createGain();
  src.buffer = buf; f.type = "bandpass"; f.frequency.value = freq; f.Q.value = q; g.gain.value = vol;
  src.connect(f).connect(g).connect(a.destination); src.start(at);
}

const SPELL_NOTE: Record<string, number> = { kivilcim: 660, ok: 880, kalkani: 330, muhru: 220, yagmuru: 520, patlamasi: 180, sifa: 784, ejder: 110, "iki-kalp": 988 };

export const sfx = {
  step: () => noise(0.05, 0.05, 700 + Math.random() * 300, 0, 2),
  swing: (far = false) => { noise(0.14, far ? 0.03 : 0.08, 2600, 0, 0.8); tone(420, 0.1, "triangle", far ? 0.01 : 0.025, -260); },
  spell: (shape: string, far = false) => {
    const f = SPELL_NOTE[shape] ?? 600, v = far ? 0.015 : 0.04;
    tone(f, 0.25, "triangle", v, f * 0.5); tone(f * 1.5, 0.3, "sine", v * 0.7, f * 0.3, 0.06); noise(0.2, v, f * 3, 0, 3);
  },
  hit: () => { noise(0.08, 0.08, 500, 0, 1.5); tone(160, 0.08, "square", 0.03, -60); },
  door: () => { tone(150, 0.3, "triangle", 0.07, -70); noise(0.25, 0.05, 380, 0.02, 1.2); tone(95, 0.18, "sine", 0.06, 0, 0.22); },
  meow: () => { tone(620, 0.16, "sawtooth", 0.025, 380); tone(1000, 0.28, "sawtooth", 0.022, -520, 0.15); },
  purr: () => { for (let k = 0; k < 6; k++) noise(0.08, 0.03, 120, k * 0.11, 4); },
  parrot: () => { tone(1300, 0.07, "square", 0.025, 700); tone(1800, 0.09, "square", 0.025, -600, 0.1); tone(1500, 0.06, "square", 0.02, 500, 0.22); },
  owl: () => { tone(400, 0.25, "sine", 0.06, -40); tone(360, 0.45, "sine", 0.06, -50, 0.38); },
  raven: () => { noise(0.18, 0.05, 900, 0, 4); tone(310, 0.18, "sawtooth", 0.03, -120); },
  flap: () => { for (let k = 0; k < 4; k++) noise(0.05, 0.04, 400, k * 0.07, 1); },
  pop: () => tone(880, 0.09, "triangle", 0.05, 420),
  kiss: () => { noise(0.04, 0.06, 3000, 0, 5); tone(1400, 0.06, "sine", 0.03, 600, 0.03); },
  laugh: () => { for (let k = 0; k < 4; k++) tone(520 + (k % 2) * 80, 0.08, "triangle", 0.035, 0, k * 0.11); },
  gasp: () => tone(500, 0.2, "sine", 0.04, 500),
  snore: () => noise(0.6, 0.03, 200, 0, 3),
  crackle: () => noise(0.03, 0.04, 2400 + Math.random() * 2000, 0, 6),
  // ateş başında yumuşak bir ninni: pentatonik, yavaş
  lullaby: () => [392, 440, 523, 440, 392, 330].forEach((f, k) => tone(f, 0.7, "sine", 0.02, 0, k * 0.65)),
  chime: () => [523, 659, 784, 1047].forEach((f, k) => tone(f, 0.6, "sine", 0.03, 0, k * 0.12)),
};
