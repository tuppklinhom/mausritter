import { CONDITIONS } from "../data/conditions";
import { defaultRng, rollDie, type Rng } from "./dice";
import { conditionsIn, isEncumbered } from "./inventory";
import type { Inventory, Stat } from "./types";

export type SaveMode = "normal" | "advantage" | "disadvantage";

export interface SaveResult {
  stat: Stat;
  target: number;
  mode: SaveMode;
  rolls: number[];
  /** The d20 that counts. */
  roll: number;
  success: boolean;
  /** Why disadvantage was applied, for display ("Injured", "Encumbered"). */
  reasons: string[];
}

/** Roll-under d20. Advantage keeps the lowest of 2d20, disadvantage the highest. */
export function save(stat: Stat, target: number, mode: SaveMode = "normal", rng: Rng = defaultRng, reasons: string[] = []): SaveResult {
  const rolls = mode === "normal" ? [rollDie(20, rng)] : [rollDie(20, rng), rollDie(20, rng)];
  const roll = mode === "advantage" ? Math.min(...rolls) : Math.max(...rolls);
  return { stat, target, mode, rolls, roll, success: roll <= target, reasons };
}

/** Disadvantage sources from a creature's own state. */
export function disadvantageReasons(stat: Stat, inv: Inventory, grit: string[] = []): string[] {
  const reasons = conditionsIn(inv, grit)
    .filter((c) => CONDITIONS[c.defId]?.disadvantage?.includes(stat))
    .map((c) => c.name);
  if (isEncumbered(inv, grit)) reasons.push("Encumbered");
  return [...new Set(reasons)];
}

/**
 * Combines the GM's call with automatic penalties. Advantage and disadvantage
 * cancel out, the usual reading when the rules are silent.
 */
export function resolveMode(requested: SaveMode, autoDisadvantage: boolean): SaveMode {
  if (!autoDisadvantage) return requested;
  return requested === "advantage" ? "normal" : "disadvantage";
}

export function saveFor(
  stat: Stat,
  target: number,
  inv: Inventory,
  grit: string[] = [],
  requested: SaveMode = "normal",
  rng: Rng = defaultRng,
): SaveResult {
  const reasons = disadvantageReasons(stat, inv, grit);
  return save(stat, target, resolveMode(requested, reasons.length > 0), rng, reasons);
}

/** Opposed saves: the lowest successful roll wins. Null if both fail or tie. */
export function opposedWinner(a: SaveResult, b: SaveResult): "a" | "b" | null {
  if (a.success && (!b.success || a.roll < b.roll)) return "a";
  if (b.success && (!a.success || b.roll < a.roll)) return "b";
  return null;
}
