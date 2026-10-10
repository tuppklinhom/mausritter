import { describe, expect, it } from "vitest";
import { fixedRng } from "./dice";
import { MOUSE_LAYOUT, addCard, conditionCard, emptyInventory, itemCard } from "./inventory";
import { disadvantageReasons, opposedWinner, resolveMode, save, saveFor } from "./saves";

describe("save", () => {
  it("succeeds when rolling at or under the stat", () => {
    expect(save("str", 10, "normal", fixedRng([10], 20)).success).toBe(true);
    expect(save("str", 10, "normal", fixedRng([11], 20)).success).toBe(false);
  });

  it("advantage keeps the lowest of 2d20, disadvantage the highest", () => {
    expect(save("dex", 8, "advantage", fixedRng([15, 4], 20)).roll).toBe(4);
    expect(save("dex", 8, "disadvantage", fixedRng([15, 4], 20)).roll).toBe(15);
  });
});

describe("automatic disadvantage", () => {
  it("Injured hits STR and DEX but not WIL", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    addCard(inv, MOUSE_LAYOUT, conditionCard("injured", "inj"));
    expect(disadvantageReasons("str", inv)).toEqual(["Injured"]);
    expect(disadvantageReasons("dex", inv)).toEqual(["Injured"]);
    expect(disadvantageReasons("wil", inv)).toEqual([]);
    // Held in Grit, it's ignored.
    expect(disadvantageReasons("str", inv, ["inj"])).toEqual([]);
  });

  it("Encumbered hits every save", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    for (let i = 0; i < 11; i++) addCard(inv, MOUSE_LAYOUT, itemCard("chalk"));
    expect(disadvantageReasons("wil", inv)).toEqual(["Encumbered"]);
  });

  it("advantage and disadvantage cancel", () => {
    expect(resolveMode("advantage", true)).toBe("normal");
    expect(resolveMode("normal", true)).toBe("disadvantage");
    expect(resolveMode("advantage", false)).toBe("advantage");
  });

  it("saveFor applies conditions", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    addCard(inv, MOUSE_LAYOUT, conditionCard("drained"));
    const r = saveFor("wil", 10, inv, [], "normal", fixedRng([3, 18], 20));
    expect(r.mode).toBe("disadvantage");
    expect(r.roll).toBe(18);
    expect(r.success).toBe(false);
    expect(r.reasons).toEqual(["Drained"]);
  });
});

describe("opposed saves", () => {
  it("lowest success wins", () => {
    const a = save("str", 12, "normal", fixedRng([9], 20));
    const b = save("str", 12, "normal", fixedRng([5], 20));
    expect(opposedWinner(a, b)).toBe("b");
    const fail = save("str", 3, "normal", fixedRng([5], 20));
    expect(opposedWinner(a, fail)).toBe("a");
    expect(opposedWinner(fail, fail)).toBeNull();
  });
});
