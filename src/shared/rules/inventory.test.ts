import { describe, expect, it } from "vitest";
import {
  HIRELING_LAYOUT,
  MOUSE_LAYOUT,
  addCard,
  armourDefence,
  canPlace,
  cellsOf,
  conditionCard,
  emptyInventory,
  isEncumbered,
  itemCard,
  markUsage,
  pipCapacity,
  place,
  removeCard,
  toOverflow,
  wieldedWeapons,
} from "./inventory";

const L = MOUSE_LAYOUT;

describe("inventory grid", () => {
  it("has 10 mouse slots and 6 hireling slots", () => {
    expect(L.cells).toHaveLength(10);
    expect(HIRELING_LAYOUT.cells).toHaveLength(6);
  });

  it("two-slot cards need two free adjacent cells", () => {
    const inv = emptyInventory(L);
    const bow = itemCard("bow", "bow");
    inv.cards.bow = bow;
    expect(canPlace(inv, L, "bow", "pack3", false)).toBe(false); // off the right edge
    expect(canPlace(inv, L, "bow", "pack4", true)).toBe(false); // off the bottom
    expect(canPlace(inv, L, "bow", "pack1", true)).toBe(true);
    place(inv, L, "bow", "pack2", false);
    expect(cellsOf(inv, "bow")).toEqual(["pack2", "pack3"]);

    inv.cards.dagger = itemCard("dagger", "dagger");
    expect(canPlace(inv, L, "dagger", "pack3")).toBe(false);
    expect(() => place(inv, L, "dagger", "pack3")).toThrow();
  });

  it("moving a card frees its old cells", () => {
    const inv = emptyInventory(L);
    addCard(inv, L, itemCard("spear", "spear"));
    expect(cellsOf(inv, "spear")).toEqual(["mainPaw", "offPaw"]);
    place(inv, L, "spear", "pack1", true);
    expect(inv.cells.mainPaw).toBeNull();
    expect(cellsOf(inv, "spear")).toEqual(["pack1", "pack4"]);
  });

  it("is encumbered when cards overflow, and conditions take slots", () => {
    const inv = emptyInventory(L);
    for (let i = 0; i < 10; i++) expect(addCard(inv, L, itemCard("chalk", `c${i}`))).toBe("placed");
    expect(isEncumbered(inv)).toBe(false);
    expect(addCard(inv, L, conditionCard("exhausted", "ex"))).toBe("overflow");
    expect(isEncumbered(inv)).toBe(true);
    // Grit holds the condition: no longer encumbering.
    expect(isEncumbered(inv, ["ex"])).toBe(false);
    const [freed] = cellsOf(inv, "c0");
    removeCard(inv, "c0");
    place(inv, L, "ex", freed);
    expect(isEncumbered(inv)).toBe(false);
  });

  it("toOverflow takes a card out of the grid", () => {
    const inv = emptyInventory(L);
    addCard(inv, L, itemCard("torches", "t"));
    toOverflow(inv, "t");
    expect(cellsOf(inv, "t")).toEqual([]);
    expect(isEncumbered(inv)).toBe(true);
  });
});

describe("usage", () => {
  it("depletes after all dots are marked", () => {
    const inv = emptyInventory(L);
    addCard(inv, L, itemCard("torches", "t"));
    expect(markUsage(inv, "t")).toBe(false);
    expect(markUsage(inv, "t")).toBe(false);
    expect(markUsage(inv, "t")).toBe(true);
    expect(markUsage(inv, "t")).toBe(false);
    expect(inv.cards.t.used).toBe(3);
  });

  it("electric lanterns have six dots", () => {
    expect(itemCard("electric-lantern").dots).toBe(6);
  });
});

describe("equipment effects", () => {
  it("armour only counts when worn in the right slots", () => {
    const inv = emptyInventory(L);
    addCard(inv, L, itemCard("heavy-armour", "ha"));
    expect(armourDefence(inv)).toBe(1);
    place(inv, L, "ha", "pack1", false);
    expect(armourDefence(inv)).toBe(0);
  });

  it("depleted armour stops protecting", () => {
    const inv = emptyInventory(L);
    addCard(inv, L, itemCard("light-armour", "la"));
    markUsage(inv, "la", 3);
    expect(armourDefence(inv)).toBe(0);
  });

  it("medium weapons deal d8 with the off paw free, d6 otherwise", () => {
    const inv = emptyInventory(L);
    addCard(inv, L, itemCard("sword", "s"));
    expect(wieldedWeapons(inv).map((w) => w.damage)).toEqual(["d8"]);
    addCard(inv, L, itemCard("dagger", "d"));
    expect(cellsOf(inv, "d")).toEqual(["offPaw"]);
    expect(wieldedWeapons(inv).map((w) => w.damage)).toEqual(["d6", "d6"]);
  });

  it("each purse adds 250 pip capacity", () => {
    const inv = emptyInventory(L);
    expect(pipCapacity(inv)).toBe(250);
    addCard(inv, L, itemCard("pip-purse"));
    expect(pipCapacity(inv)).toBe(500);
  });
});
