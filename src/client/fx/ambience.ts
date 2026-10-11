import { onAudioUnlock, sharedAudio } from "./audio";
import { useFx } from "./settings";

// Synthesized ambient soundscapes. Each layer builds a small node graph from
// looping noise and oscillators, plus randomly scheduled one-shots (birds,
// drips, crackles, thunder). Switching ambience crossfades old into new.

const FADE = 2.5;

interface Layer {
  out: GainNode;
  stop: () => void;
}

let noiseBuf: AudioBuffer | null = null;

function noiseBuffer(ac: AudioContext): AudioBuffer {
  if (noiseBuf) return noiseBuf;
  const len = ac.sampleRate * 4;
  noiseBuf = ac.createBuffer(1, len, ac.sampleRate);
  const d = noiseBuf.getChannelData(0);
  // Slightly pinked noise sounds less harsh than white.
  let b = 0;
  for (let i = 0; i < len; i++) {
    b = 0.97 * b + 0.03 * (Math.random() * 2 - 1);
    d[i] = (Math.random() * 2 - 1) * 0.5 + b * 4;
  }
  return noiseBuf;
}

function noiseSource(ac: AudioContext): AudioBufferSourceNode {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  src.loop = true;
  src.loopStart = Math.random() * 3;
  src.start(0, Math.random() * 3);
  return src;
}

function filter(ac: AudioContext, type: BiquadFilterType, freq: number, q = 0.7): BiquadFilterNode {
  const f = ac.createBiquadFilter();
  f.type = type;
  f.frequency.value = freq;
  f.Q.value = q;
  return f;
}

function gain(ac: AudioContext, value: number): GainNode {
  const g = ac.createGain();
  g.gain.value = value;
  return g;
}

/** Slow wobble on an AudioParam. */
function lfo(ac: AudioContext, param: AudioParam, rate: number, depth: number): OscillatorNode {
  const o = ac.createOscillator();
  o.frequency.value = rate;
  const d = gain(ac, depth);
  o.connect(d).connect(param);
  o.start();
  return o;
}

/** Repeats `fn` at random intervals until stopped. */
function every(minS: number, maxS: number, fn: () => void): () => void {
  let t: ReturnType<typeof setTimeout>;
  let live = true;
  const tick = () => {
    if (!live) return;
    fn();
    t = setTimeout(tick, (minS + Math.random() * (maxS - minS)) * 1000);
  };
  t = setTimeout(tick, Math.random() * maxS * 1000);
  return () => {
    live = false;
    clearTimeout(t);
  };
}

function chirp(ac: AudioContext, dest: AudioNode, base: number, notes: number, vol = 0.05) {
  const t0 = ac.currentTime;
  for (let i = 0; i < notes; i++) {
    const o = ac.createOscillator();
    const g = gain(ac, 0);
    const start = t0 + i * (0.08 + Math.random() * 0.06);
    const f = base * (0.9 + Math.random() * 0.3);
    o.frequency.setValueAtTime(f, start);
    o.frequency.exponentialRampToValueAtTime(f * (1.2 + Math.random() * 0.5), start + 0.06);
    g.gain.setValueAtTime(0, start);
    g.gain.linearRampToValueAtTime(vol, start + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, start + 0.09);
    o.connect(g).connect(dest);
    o.start(start);
    o.stop(start + 0.12);
  }
}

function drip(ac: AudioContext, dest: AudioNode) {
  const t = ac.currentTime;
  const o = ac.createOscillator();
  const g = gain(ac, 0);
  const f = 900 + Math.random() * 900;
  o.frequency.setValueAtTime(f, t);
  o.frequency.exponentialRampToValueAtTime(f * 0.45, t + 0.12);
  g.gain.setValueAtTime(0.09, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
  const echo = ac.createDelay();
  echo.delayTime.value = 0.23;
  const fb = gain(ac, 0.35);
  o.connect(g).connect(dest);
  g.connect(echo).connect(fb).connect(echo);
  fb.connect(dest);
  o.start(t);
  o.stop(t + 0.3);
}

function burst(ac: AudioContext, dest: AudioNode, dur: number, freq: number, vol: number) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = filter(ac, "bandpass", freq, 1.2);
  const g = gain(ac, 0);
  const t = ac.currentTime;
  g.gain.setValueAtTime(vol, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 3, dur + 0.05);
}

function thunder(ac: AudioContext, dest: AudioNode) {
  const src = ac.createBufferSource();
  src.buffer = noiseBuffer(ac);
  const f = filter(ac, "lowpass", 160 + Math.random() * 120);
  const g = gain(ac, 0);
  const t = ac.currentTime;
  g.gain.setValueAtTime(0, t);
  g.gain.linearRampToValueAtTime(0.9, t + 0.15 + Math.random() * 0.3);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 4 + Math.random() * 2);
  src.connect(f).connect(g).connect(dest);
  src.start(t, Math.random() * 2, 7);
}

/** Builds the graph for one ambience. Everything feeds `out`, which the caller fades. */
function build(ac: AudioContext, id: string): Layer | null {
  const out = gain(ac, 0);
  const sources: AudioScheduledSourceNode[] = [];
  const timers: (() => void)[] = [];

  const wind = (freq: number, vol: number, rate = 0.07) => {
    const n = noiseSource(ac);
    const f = filter(ac, "bandpass", freq, 0.6);
    const g = gain(ac, vol);
    sources.push(n, lfo(ac, f.frequency, rate, freq * 0.5), lfo(ac, g.gain, rate * 1.7, vol * 0.6));
    n.connect(f).connect(g).connect(out);
  };
  const rain = (vol: number) => {
    const n = noiseSource(ac);
    const hp = filter(ac, "highpass", 900);
    const lp = filter(ac, "lowpass", 7000);
    n.connect(hp).connect(lp).connect(gain(ac, vol)).connect(out);
    sources.push(n);
    timers.push(every(0.05, 0.25, () => burst(ac, out, 0.03, 2500 + Math.random() * 3000, vol * 0.8)));
  };

  switch (id) {
    case "meadow":
      wind(500, 0.08, 0.05);
      timers.push(every(2, 6, () => chirp(ac, out, 2600 + Math.random() * 1400, 2 + Math.floor(Math.random() * 5))));
      break;
    case "forest":
      wind(1400, 0.06, 0.09);
      wind(350, 0.07, 0.04);
      timers.push(every(3, 9, () => chirp(ac, out, 1800 + Math.random() * 2000, 3 + Math.floor(Math.random() * 4), 0.04)));
      break;
    case "river": {
      const n = noiseSource(ac);
      const f = filter(ac, "lowpass", 700, 2);
      const g = gain(ac, 0.22);
      sources.push(n, lfo(ac, f.frequency, 3.1, 300), lfo(ac, g.gain, 0.4, 0.06));
      n.connect(f).connect(g).connect(out);
      timers.push(every(0.15, 0.6, () => burst(ac, out, 0.08, 500 + Math.random() * 700, 0.08)));
      break;
    }
    case "rain":
      rain(0.16);
      break;
    case "storm":
      rain(0.22);
      wind(300, 0.12, 0.1);
      timers.push(every(10, 28, () => thunder(ac, out)));
      break;
    case "wind":
      wind(420, 0.2, 0.06);
      wind(900, 0.07, 0.11);
      break;
    case "cave": {
      for (const f of [55, 55.6, 82.5]) {
        const o = ac.createOscillator();
        o.frequency.value = f;
        o.connect(gain(ac, 0.05)).connect(out);
        o.start();
        sources.push(o);
      }
      const n = noiseSource(ac);
      n.connect(filter(ac, "lowpass", 250)).connect(gain(ac, 0.05)).connect(out);
      sources.push(n);
      timers.push(every(1.2, 4.5, () => drip(ac, out)));
      break;
    }
    case "hearth": {
      const n = noiseSource(ac);
      const g = gain(ac, 0.08);
      sources.push(n, lfo(ac, g.gain, 0.3, 0.03));
      n.connect(filter(ac, "lowpass", 450)).connect(g).connect(out);
      timers.push(every(0.05, 0.4, () => burst(ac, out, 0.02 + Math.random() * 0.04, 1500 + Math.random() * 3500, 0.12 + Math.random() * 0.15)));
      break;
    }
    case "night": {
      wind(300, 0.04, 0.03);
      // Crickets: a high tone gated into quick pulses.
      const o = ac.createOscillator();
      o.frequency.value = 4400;
      const g = gain(ac, 0);
      const gate = ac.createOscillator();
      gate.frequency.value = 28;
      const depth = gain(ac, 0.02);
      gate.connect(depth).connect(g.gain);
      const swell = lfo(ac, depth.gain, 0.5, 0.02);
      o.connect(g).connect(out);
      o.start();
      gate.start();
      sources.push(o, gate, swell);
      break;
    }
    default:
      return null;
  }

  out.connect(ac.destination);
  return {
    out,
    stop: () => {
      timers.forEach((t) => t());
      for (const s of sources) {
        try {
          s.stop();
        } catch {
          /* already stopped */
        }
      }
      out.disconnect();
    },
  };
}

let current: { id: string; layer: Layer | null } = { id: "none", layer: null };
let wanted = "none";

function level(): number {
  const { muted, ambienceVolume } = useFx.getState();
  return muted ? 0 : ambienceVolume;
}

function apply() {
  const ac = sharedAudio();
  if (!ac || ac.state !== "running") return; // Retried on unlock.
  if (current.id === wanted) return;
  const old = current.layer;
  if (old) {
    old.out.gain.cancelScheduledValues(ac.currentTime);
    old.out.gain.setValueAtTime(old.out.gain.value, ac.currentTime);
    old.out.gain.linearRampToValueAtTime(0, ac.currentTime + FADE);
    setTimeout(old.stop, FADE * 1000 + 100);
  }
  const layer = build(ac, wanted);
  if (layer) layer.out.gain.linearRampToValueAtTime(level(), ac.currentTime + FADE);
  current = { id: wanted, layer };
}

/** Switch the soundscape; safe to call before audio is unlocked. */
export function setAmbience(id: string) {
  wanted = id;
  apply();
}

onAudioUnlock(apply);

useFx.subscribe(() => {
  const ac = sharedAudio();
  if (ac && current.layer) current.layer.out.gain.setTargetAtTime(level(), ac.currentTime, 0.3);
});
