// İsteğe bağlı ortam sesleri: yağmur, uzak gök gürültüsü, şömine çıtırtısı, kedi mırıltısı.
// Ses dosyası yok; hepsi Web Audio ile gürültü ve osilatörden üretilir. Kullanıcı açana kadar hiçbir şey çalmaz.
"use client";

type Mix = { rain: number; fire: number; purr: number };

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let gains: Record<keyof Mix, GainNode> | null = null;
let noise: AudioBuffer | null = null;
let crackle: ReturnType<typeof setTimeout> | null = null;
let fireLevel = 0;

function noiseSource(c: AudioContext) {
  const src = c.createBufferSource();
  src.buffer = noise;
  src.loop = true;
  return src;
}

export function startAmbient(volume: number) {
  if (!ctx) {
    ctx = new AudioContext();
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = noise.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    master = ctx.createGain();
    master.connect(ctx.destination);
    const g = (): GainNode => { const n = ctx!.createGain(); n.gain.value = 0; n.connect(master!); return n; };
    gains = { rain: g(), fire: g(), purr: g() };

    // yağmur: bant geçiren gürültü
    const rain = noiseSource(ctx);
    const bp = ctx.createBiquadFilter(); bp.type = "bandpass"; bp.frequency.value = 1400; bp.Q.value = 0.5;
    const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 5000;
    rain.connect(bp).connect(lp).connect(gains.rain);
    rain.start();

    // şömine: alçak uğultu + rastgele çıtırtılar
    const fire = noiseSource(ctx);
    const fl = ctx.createBiquadFilter(); fl.type = "lowpass"; fl.frequency.value = 500;
    const fireBed = ctx.createGain(); fireBed.gain.value = 0.35;
    fire.connect(fl).connect(fireBed).connect(gains.fire);
    fire.start();
    const pops = ctx.createGain(); pops.gain.value = 0; pops.connect(gains.fire);
    const popSrc = noiseSource(ctx);
    const ph = ctx.createBiquadFilter(); ph.type = "highpass"; ph.frequency.value = 1800;
    popSrc.connect(ph).connect(pops);
    popSrc.start();
    const tick = () => {
      if (!ctx) return;
      if (fireLevel > 0.05) {
        const now = ctx.currentTime;
        pops.gain.cancelScheduledValues(now);
        pops.gain.setValueAtTime(0.9 * Math.random(), now);
        pops.gain.exponentialRampToValueAtTime(0.001, now + 0.03 + Math.random() * 0.05);
      }
      crackle = setTimeout(tick, 60 + Math.random() * 260);
    };
    tick();

    // mırıltı: 22 Hz ile genliği oynayan alçak ton
    const osc = ctx.createOscillator(); osc.type = "sawtooth"; osc.frequency.value = 55;
    const pl = ctx.createBiquadFilter(); pl.type = "lowpass"; pl.frequency.value = 260;
    const am = ctx.createGain(); am.gain.value = 0.5;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 22;
    const lfoAmt = ctx.createGain(); lfoAmt.gain.value = 0.5;
    lfo.connect(lfoAmt).connect(am.gain);
    osc.connect(pl).connect(am).connect(gains.purr);
    osc.start(); lfo.start();
  }
  void ctx.resume();
  setVolume(volume);
}

export function stopAmbient() {
  void ctx?.suspend();
}

export function setVolume(v: number) {
  if (ctx && master) master.gain.setTargetAtTime(Math.max(0, Math.min(1, v)) * 0.6, ctx.currentTime, 0.1);
}

export function setMix(m: Mix) {
  if (!ctx || !gains || ctx.state !== "running") return;
  const now = ctx.currentTime;
  gains.rain.gain.setTargetAtTime(m.rain * 0.5, now, 0.6);
  gains.fire.gain.setTargetAtTime(m.fire * 0.6, now, 0.6);
  gains.purr.gain.setTargetAtTime(m.purr * 0.25, now, 0.6);
  fireLevel = m.fire;
}

// uzak gök gürültüsü: şimşekten biraz sonra, alçak frekanslı uzun bir gümbürtü
export function thunder(delay: number, strength: number) {
  if (!ctx || !master || !noise || ctx.state !== "running") return;
  const t0 = ctx.currentTime + delay;
  const src = noiseSource(ctx);
  const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 160;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(0.9 * strength, t0 + 0.35);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + 3.5);
  src.connect(lp).connect(g).connect(master);
  src.start(t0);
  src.stop(t0 + 3.6);
}

export function disposeAmbient() {
  if (crackle) clearTimeout(crackle);
  void ctx?.close();
  ctx = null; master = null; gains = null;
}
