import { create } from "zustand";

const KEY = "mt.fx";

interface FxSettings {
  muted: boolean;
  /** Off when WebGL is unavailable or the player prefers flat dice. */
  dice3d: boolean;
  toggleMute: () => void;
  toggleDice3d: () => void;
}

function load(): Pick<FxSettings, "muted" | "dice3d"> {
  try {
    return { muted: false, dice3d: true, ...JSON.parse(localStorage.getItem(KEY) ?? "{}") };
  } catch {
    return { muted: false, dice3d: true };
  }
}

function persist(s: Pick<FxSettings, "muted" | "dice3d">) {
  try {
    localStorage.setItem(KEY, JSON.stringify({ muted: s.muted, dice3d: s.dice3d }));
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
}));
