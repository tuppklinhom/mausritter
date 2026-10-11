// One AudioContext shared by sound effects and ambience.

let ctx: AudioContext | null = null;
const unlockListeners = new Set<() => void>();

export function sharedAudio(): AudioContext | null {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** True once the browser lets us play sound (after the first user gesture). */
export function audioUnlocked(): boolean {
  return ctx?.state === "running";
}

/** Called when audio becomes available, e.g. to start ambience that was waiting. */
export function onAudioUnlock(fn: () => void): () => void {
  unlockListeners.add(fn);
  return () => unlockListeners.delete(fn);
}

// Browsers only allow audio after a gesture; warm the context on the first one.
if (typeof window !== "undefined") {
  const unlock = () => {
    const ac = sharedAudio();
    if (!ac) return;
    void ac.resume().then(() => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
      for (const fn of unlockListeners) fn();
    });
  };
  window.addEventListener("pointerdown", unlock);
  window.addEventListener("keydown", unlock);
}
