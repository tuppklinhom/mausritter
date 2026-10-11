import { sharedAudio } from "./audio";
import { useFx } from "./settings";

// Small synthesized sound effects: no audio files to license or download.

function audio(): AudioContext | null {
  return useFx.getState().muted ? null : sharedAudio();
}

function tone(ac: AudioContext, freq: number, start: number, dur: number, type: OscillatorType = "sine", gain = 0.18, slideTo?: number) {
  const osc = ac.createOscillator();
  const g = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ac.currentTime + start);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, ac.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, ac.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, ac.currentTime + start + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, ac.currentTime + start + dur);
  osc.connect(g).connect(ac.destination);
  osc.start(ac.currentTime + start);
  osc.stop(ac.currentTime + start + dur + 0.05);
}

function noise(ac: AudioContext, start: number, dur: number, gain = 0.25, lowpass = 800) {
  const len = Math.floor(ac.sampleRate * dur);
  const buf = ac.createBuffer(1, len, ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const src = ac.createBufferSource();
  src.buffer = buf;
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.value = lowpass;
  const g = ac.createGain();
  g.gain.value = gain;
  src.connect(filter).connect(g).connect(ac.destination);
  src.start(ac.currentTime + start);
}

export type Sfx =
  | "success"
  | "fail"
  | "critical"
  | "dead"
  | "levelup"
  | "loot"
  | "condition"
  | "hit"
  | "depleted"
  | "event"
  | "encounter"
  | "omen"
  | "quiet"
  | "scene";

export function play(sfx: Sfx) {
  const ac = audio();
  if (!ac) return;
  switch (sfx) {
    case "success":
      tone(ac, 523, 0, 0.18, "triangle");
      tone(ac, 784, 0.1, 0.35, "triangle");
      break;
    case "fail":
      tone(ac, 220, 0, 0.45, "sawtooth", 0.08, 110);
      noise(ac, 0, 0.15, 0.15, 400);
      break;
    case "hit":
      noise(ac, 0, 0.18, 0.35, 900);
      tone(ac, 120, 0, 0.2, "sine", 0.25, 60);
      break;
    case "critical":
      noise(ac, 0, 0.35, 0.45, 1500);
      tone(ac, 90, 0, 0.6, "sine", 0.35, 40);
      tone(ac, 311, 0.15, 0.4, "square", 0.05, 233);
      break;
    case "dead":
      [392, 349, 311, 262].forEach((f, i) => tone(ac, f, i * 0.32, 0.6, "sine", 0.14));
      break;
    case "levelup":
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, f, i * 0.11, 0.3, "triangle", 0.14));
      tone(ac, 1047, 0.44, 0.7, "sine", 0.1);
      break;
    case "loot":
      tone(ac, 880, 0, 0.08, "square", 0.05);
      tone(ac, 1320, 0.07, 0.25, "triangle", 0.1);
      break;
    case "condition":
      tone(ac, 330, 0, 0.35, "sawtooth", 0.06);
      tone(ac, 349, 0, 0.35, "sawtooth", 0.06);
      break;
    case "depleted":
      noise(ac, 0, 0.12, 0.4, 4000);
      tone(ac, 1800, 0, 0.08, "square", 0.04, 600);
      break;
    case "event":
      tone(ac, 660, 0, 0.12, "sine", 0.06);
      break;
    case "encounter":
      noise(ac, 0, 0.5, 0.3, 300);
      [147, 156, 147].forEach((f, i) => tone(ac, f, i * 0.18, 0.5, "sawtooth", 0.09));
      tone(ac, 73, 0, 1.2, "sine", 0.3);
      break;
    case "omen":
      tone(ac, 466, 0, 1.4, "sine", 0.08, 440);
      tone(ac, 494, 0.05, 1.4, "sine", 0.06, 466);
      break;
    case "quiet":
      tone(ac, 392, 0, 0.5, "sine", 0.05);
      break;
    case "scene":
      [262, 392, 523].forEach((f, i) => tone(ac, f, i * 0.15, 1.2, "triangle", 0.07));
      break;
  }
}
