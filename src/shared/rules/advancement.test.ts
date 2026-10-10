import { describe, expect, it } from "vitest";
import { gritForLevel, hitDice, levelForXp, levelUp, rest, xpForLevel } from "./advancement";
import { scriptedRng } from "./dice";
import { MOUSE_LAYOUT, addCard, conditionCard, emptyInventory } from "./inventory";

const s = (max: number, cur = max) => ({ max, cur });

describe("levels", () => {
  it("uses the XP table", () => {
    expect([1, 2, 3, 4, 5, 6].map(xpForLevel)).toEqual([0, 1000, 3000, 6000, 11000, 16000]);
    expect(levelForXp(0)).toBe(1);
    expect(levelForXp(999)).toBe(1);
    expect(levelForXp(1000)).toBe(2);
    expect(levelForXp(10999)).toBe(4);
    expect(levelForXp(11000)).toBe(5);
  });

  it("grit and hit dice by level", () => {
    expect([1, 2, 3, 4, 5, 9].map(gritForLevel)).toEqual([0, 1, 2, 2, 3, 3]);
    expect([1, 2, 3, 4, 7].map(hitDice)).toEqual(["1d6", "2d6", "3d6", "4d6", "4d6"]);
  });

  it("raises stats on a d20 above them, and HP by roll or +1", () => {
    const stats = { str: s(8), dex: s(12), wil: s(10, 6) };
    // STR 15 > 8 up, DEX 12 not > 12, WIL 11 > 10 up; HP 2d6 = 6+5 = 11 > 4
    const r = levelUp(2, stats, s(4, 2), scriptedRng([15, 20], [12, 20], [11, 20], [6, 6], [5, 6]));
    expect(r.stats.str).toEqual(s(9));
    expect(r.stats.dex).toEqual(s(12));
    expect(r.stats.wil).toEqual(s(11, 7));
    expect(r.hp).toEqual(s(11, 9));

    const low = levelUp(2, stats, s(10), scriptedRng([1, 20], [1, 20], [1, 20], [1, 6], [1, 6]));
    expect(low.hp).toEqual(s(11));
  });
});

describe("rest", () => {
  it("short rest heals d6+1 and clears Frightened only", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    addCard(inv, MOUSE_LAYOUT, conditionCard("frightened", "f"));
    addCard(inv, MOUSE_LAYOUT, conditionCard("exhausted", "e"));
    const r = rest("short", s(6, 1), { str: s(8), dex: s(8), wil: s(8) }, inv, [], {}, scriptedRng([3, 6]));
    expect(r.hp.cur).toBe(5);
    expect(r.cleared).toEqual(["Frightened"]);
    expect(Object.keys(inv.cards)).toEqual(["e"]);
  });

  it("long rest restores HP, or d6 to a stat if HP was full, and clears Hungry/Exhausted", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    addCard(inv, MOUSE_LAYOUT, conditionCard("hungry"));
    addCard(inv, MOUSE_LAYOUT, conditionCard("exhausted"));
    addCard(inv, MOUSE_LAYOUT, conditionCard("injured"));
    const stats = { str: s(10, 4), dex: s(8), wil: s(8) };
    const r = rest("long", s(6), stats, inv, [], {}, scriptedRng([5, 6]));
    expect(r.statRestored).toEqual({ stat: "str", amount: 5 });
    expect(r.stats.str.cur).toBe(9);
    expect(r.cleared.sort()).toEqual(["Exhausted", "Hungry"]);
  });

  it("full rest restores everything and clears Injured, also from Grit", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    addCard(inv, MOUSE_LAYOUT, conditionCard("injured", "i"));
    const grit = ["i"];
    const r = rest("full", s(6, 0), { str: s(10, 1), dex: s(8, 2), wil: s(8, 3) }, inv, grit);
    expect(r.stats.str.cur).toBe(10);
    expect(r.hp.cur).toBe(6);
    expect(r.cleared).toEqual(["Injured"]);
    expect(grit).toEqual([]);
  });
});
