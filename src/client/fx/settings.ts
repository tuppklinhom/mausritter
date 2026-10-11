import { create } from "zustand";

const KEY = "mt.fx";

interface Prefs {
  muted: boolean;
  /** Off when WebGL is unavailable or the player prefers flat dice. */
  dice3d: boolean;
  /** 0–1 level for background soundscapes. */
  ambienceVolume: number;
}

interface FxSettings extends Prefs {
  toggleMute: () => void;
  toggleDice3d: () => void;
  setAmbienceVolume: (v: number) => void;
}

const DEFAULTS: Prefs = { muted: false, dice3d: true, ambienceVolume: 0.6 };

function load(): Prefs {
  try {
    return { ...DEFAULTS, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return DEFAULTS;
  }
}

function persist(s: Prefs) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ muted: s.muted, dice3d: s.dice3d, ambienceVolume: s.ambienceVolume }));
  } catch {
    /* ignore */
  }
}

export const useFx = create<FxSettings>((set, get) => ({
  ...load(),
  toggleMute() {
    set({ muted: !get().muted });
    persist(get());
  },
  toggleDice3d() {
    set({ dice3d: !get().dice3d });
    persist(get());
  },
  setAmbienceVolume(v) {
    set({ ambienceVolume: Math.max(0, Math.min(1, v)) });
    persist(get());
  },
}));
