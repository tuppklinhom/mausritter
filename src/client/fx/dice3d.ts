import type { DieFace } from "../../shared/state";
import { useFx } from "./settings";

/** Minimal surface of @3d-dice/dice-box-threejs that we use. */
interface DiceBox {
  initialize(): Promise<void>;
  roll(notation: string): Promise<unknown>;
  clearDice(): void;
  volume: number;
}

const SUPPORTED = new Set([4, 6, 8, 10, 12, 20]);

let box: DiceBox | null = null;
let booting: Promise<DiceBox | null> | null = null;
let failed = false;

/** Mounts the dice canvas into `selector` once; later calls reuse it. */
export function bootDice(selector: string): Promise<DiceBox | null> {
  if (box) return Promise.resolve(box);
  if (failed) return Promise.resolve(null);
  booting ??= (async () => {
    try {
      const { default: DiceBoxCtor } = await import("@3d-dice/dice-box-threejs");
      const b = new DiceBoxCtor(selector, {
        assetPath: "/dice/",
        sounds: true,
        volume: useFx.getState().muted ? 0 : 60,
        theme_surface: "taverntable",
        theme_customColorset: {
          name: "parchment",
          foreground: "#2b2118",
          background: "#f1e6cf",
          outline: "#f1e6cf",
          texture: "paper",
          material: "wood",
        },
        shadows: true,
        light_intensity: 0.9,
        gravity_multiplier: 450,
        baseScale: 125,
        strength: 1.4,
      }) as DiceBox;
      await b.initialize();
      box = b;
      return b;
    } catch (e) {
      console.warn("3D dice unavailable, falling back to flat dice", e);
      failed = true;
      return null;
    }
  })();
  return booting;
}

useFx.subscribe((s) => {
  if (box) box.volume = s.muted ? 0 : 60;
});

/** "2d20+1d6@15,4,3" — the server's results, in order, so the dice land on them. */
export function notationFor(dice: DieFace[]): string | null {
  if (dice.length === 0 || dice.length > 12 || dice.some((d) => !SUPPORTED.has(d.sides))) return null;
  const groups: { sides: number; values: number[] }[] = [];
  for (const d of dice) {
    const last = groups.at(-1);
    if (last && last.sides === d.sides) last.values.push(d.value);
    else groups.push({ sides: d.sides, values: [d.value] });
  }
  const notation = groups.map((g) => `${g.values.length}d${g.sides}`).join("+");
  return `${notation}@${groups.flatMap((g) => g.values).join(",")}`;
}

/** Rolls the given faces in 3D. Resolves false if 3D isn't available (caller shows flat dice). */
export async function roll3d(selector: string, dice: DieFace[]): Promise<boolean> {
  if (!useFx.getState().dice3d) return false;
  const notation = notationFor(dice);
  if (!notation) return false;
  const b = await bootDice(selector);
  if (!b) return false;
  // Never hang the reveal on a physics hiccup.
  await Promise.race([b.roll(notation), new Promise((r) => setTimeout(r, 4000))]);
  return true;
}

export function clearDice() {
  box?.clearDice();
}
