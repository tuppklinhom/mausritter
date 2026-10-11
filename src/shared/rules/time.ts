import { TURNS_PER_WATCH, type Clock } from "../state";
import { defaultRng, rollDie, type Rng } from "./dice";
import { markUsage } from "./inventory";
import type { CardInstance, Inventory } from "./types";

/** Turns since the campaign's first turn, used to space out dungeon encounter checks. */
export function absoluteTurn(c: Clock): number {
  return ((c.day - 1) * 4 + c.watch) * TURNS_PER_WATCH + c.turn;
}

export interface ClockAdvance {
  clock: Clock;
  /** Dungeon encounter checks due (one every 3 turns). */
  dungeonChecks: number;
  /** Wilderness checks due: one at each sunrise and sunset passed. */
  wildernessChecks: ("sunrise" | "sunset")[];
  newDays: number;
}

export function advanceClock(clock: Clock, turns: number): ClockAdvance {
  const before = absoluteTurn(clock);
  const after = before + turns;
  const watchesBefore = Math.floor(before / TURNS_PER_WATCH);
  const watchesAfter = Math.floor(after / TURNS_PER_WATCH);
  const wildernessChecks: ClockAdvance["wildernessChecks"] = [];
  for (let w = watchesBefore + 1; w <= watchesAfter; w++) {
    if (w % 4 === 1) wildernessChecks.push("sunrise");
    if (w % 4 === 3) wildernessChecks.push("sunset");
  }
  const next: Clock = {
    ...clock,
    day: Math.floor(watchesAfter / 4) + 1,
    watch: watchesAfter % 4,
    turn: after % TURNS_PER_WATCH,
  };
  return {
    clock: next,
    dungeonChecks: clock.mode === "dungeon" ? Math.floor(after / 3) - Math.floor(before / 3) : 0,
    wildernessChecks: clock.mode === "wilderness" ? wildernessChecks : [],
    newDays: next.day - clock.day,
  };
}

export type EncounterKind = "encounter" | "omen" | "quiet";

export interface EncounterRoll {
  roll: number;
  kind: EncounterKind;
  /** d12 hour of the watch, rolled in the wilderness on an encounter or omen. */
  hour?: number;
}

/** d6: 1 encounter, 2 omen of an encounter, otherwise all quiet. */
export function rollEncounter(wilderness: boolean, rng: Rng = defaultRng): EncounterRoll {
  const roll = rollDie(6, rng);
  const kind: EncounterKind = roll === 1 ? "encounter" : roll === 2 ? "omen" : "quiet";
  return { roll, kind, hour: wilderness && kind !== "quiet" ? rollDie(12, rng) : undefined };
}

export interface BurnResult {
  card: CardInstance;
  marked: number;
  burnedOut: boolean;
}

/** Lit light sources mark usage every 6 turns; a depleted light goes out. */
export function burnLights(inv: Inventory, turns: number): BurnResult[] {
  const out: BurnResult[] = [];
  for (const card of Object.values(inv.cards)) {
    if (card.kind !== "light" || !card.lit) continue;
    const total = (card.burn ?? 0) + turns;
    const marks = Math.floor(total / 6);
    card.burn = total % 6;
    let burnedOut = false;
    for (let i = 0; i < marks && !burnedOut; i++) burnedOut = markUsage(inv, card.uid);
    if (burnedOut || card.used >= card.dots) {
      card.lit = false;
      card.burn = 0;
      burnedOut = true;
    }
    if (marks > 0 || burnedOut) out.push({ card, marked: marks, burnedOut });
  }
  return out;
}
