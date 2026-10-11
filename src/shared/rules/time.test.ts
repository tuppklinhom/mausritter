import { describe, expect, it } from "vitest";
import type { Clock } from "../state";
import { fixedRng, scriptedRng } from "./dice";
import { MOUSE_LAYOUT, addCard, emptyInventory, itemCard } from "./inventory";
import { advanceClock, burnLights, rollEncounter } from "./time";

const clock = (patch: Partial<Clock> = {}): Clock => ({ day: 1, watch: 1, turn: 0, mode: "dungeon", season: "spring", ...patch });

describe("advanceClock", () => {
  it("rolls the encounter die every 3 turns in a dungeon", () => {
    expect(advanceClock(clock(), 1).dungeonChecks).toBe(0);
    expect(advanceClock(clock({ turn: 2 }), 1).dungeonChecks).toBe(1);
    expect(advanceClock(clock(), 36).dungeonChecks).toBe(12);
  });

  it("wraps turns into watches and watches into days", () => {
    const a = advanceClock(clock({ watch: 3, turn: 35 }), 1);
    expect(a.clock).toMatchObject({ day: 2, watch: 0, turn: 0 });
    expect(a.newDays).toBe(1);
  });

  it("checks for encounters at sunrise and sunset in the wilderness", () => {
    const w = clock({ mode: "wilderness", watch: 0 });
    expect(advanceClock(w, 36).wildernessChecks).toEqual(["sunrise"]);
    expect(advanceClock(w, 36 * 4).wildernessChecks).toEqual(["sunrise", "sunset"]);
    expect(advanceClock(w, 36 * 4).dungeonChecks).toBe(0);
    // Into the afternoon (noon) is not a check.
    expect(advanceClock(clock({ mode: "wilderness", watch: 1 }), 36).wildernessChecks).toEqual([]);
  });
});

describe("rollEncounter", () => {
  it("1 is an encounter, 2 an omen, else quiet", () => {
    expect(rollEncounter(false, fixedRng([1], 6)).kind).toBe("encounter");
    expect(rollEncounter(false, fixedRng([2], 6)).kind).toBe("omen");
    expect(rollEncounter(false, fixedRng([5], 6)).kind).toBe("quiet");
  });

  it("rolls a d12 hour in the wilderness when something comes", () => {
    expect(rollEncounter(true, scriptedRng([1, 6], [7, 12])).hour).toBe(7);
    expect(rollEncounter(true, scriptedRng([4, 6])).hour).toBeUndefined();
    expect(rollEncounter(false, scriptedRng([1, 6])).hour).toBeUndefined();
  });
});

describe("burnLights", () => {
  it("marks usage on lit lights every 6 turns and puts them out when spent", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    addCard(inv, MOUSE_LAYOUT, itemCard("torches", "t"));
    addCard(inv, MOUSE_LAYOUT, itemCard("lantern", "l"));
    inv.cards.t.lit = true;

    expect(burnLights(inv, 5)).toEqual([]);
    expect(burnLights(inv, 1).map((b) => b.marked)).toEqual([1]);
    expect(inv.cards.t.used).toBe(1);
    expect(inv.cards.l.used).toBe(0); // unlit

    const out = burnLights(inv, 12);
    expect(out[0].burnedOut).toBe(true);
    expect(inv.cards.t.used).toBe(3);
    expect(inv.cards.t.lit).toBe(false);
  });
});
