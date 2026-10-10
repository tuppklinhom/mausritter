import { describe, expect, it } from "vitest";
import { scriptedRng } from "./dice";
import { createHireling, createMouse, rollMouse, swapStats } from "./character";
import { cellsOf, isEncumbered } from "./inventory";
import type { Mouse } from "./types";

const d6 = (...vs: number[]) => vs.map((v) => [v, 6] as [number, number]);

function cellsByName(m: Mouse): Record<string, string[]> {
  const inv = m.inventory;
  return Object.fromEntries(Object.values(inv.cards).map((c) => [c.name, cellsOf(inv, c.uid)]));
}

describe("rollMouse", () => {
  it("follows the creation procedure", () => {
    const rng = scriptedRng(
      ...d6(6, 6, 1, 5, 5, 5, 2, 2, 2), // STR 12, DEX 10, WIL 4
      ...d6(1, 6), // HP 1, pips 6 → Street tough
      ...d6(1), // Star
      ...d6(3, 2), // White, Brindle
      ...d6(4, 4), // 44 Shaved fur
      [1, 100],
      [20, 20], // Ada Witter
    );
    const r = rollMouse(rng);
    expect(r.stats).toEqual({ str: 12, dex: 10, wil: 4 });
    expect(r.statDice.str).toEqual([6, 6, 1]);
    expect(r.background).toBe("Street tough");
    expect(r.grants).toEqual([{ item: "dagger" }, { item: "coffee" }]);
    expect(r.bonus).toBeNull();
    expect(r.birthsign.sign).toBe("Star");
    expect(r.coat).toEqual({ color: "White", pattern: "Brindle" });
    expect(r.look).toBe("Shaved fur");
    expect(r.name).toBe("Ada Witter");
  });

  it("gives a weak mouse a second background (both items at 7 or less)", () => {
    const rng = scriptedRng(...d6(3, 3, 1, 3, 3, 1, 3, 3, 1), ...d6(1, 1), ...d6(2, 1), ...d6(1, 1, 1, 1, 1), [1, 100], [1, 20]);
    const r = rollMouse(rng);
    expect(Math.max(r.stats.str, r.stats.dex, r.stats.wil)).toBe(6);
    expect(r.background).toBe("Test subject");
    expect(r.bonus).toEqual({
      background: "Mendicant priest",
      options: [{ item: "spell-restore" }, { item: "holy-symbol" }],
      takeBoth: true,
    });
  });

  it("offers a choice when the highest stat is 8 or 9", () => {
    const rng = scriptedRng(...d6(4, 4, 1, 3, 3, 1, 3, 3, 1), ...d6(1, 1), ...d6(2, 1), ...d6(1, 1, 1, 1, 1), [1, 100], [1, 20]);
    const r = rollMouse(rng);
    expect(r.bonus?.takeBoth).toBe(false);
  });

  it("keeps locked parts when rerolling", () => {
    const first = rollMouse();
    for (let i = 0; i < 20; i++) {
      const again = rollMouse(undefined, { prev: first, locked: ["stats", "name"] });
      expect(again.stats).toEqual(first.stats);
      expect(again.name).toBe(first.name);
    }
  });

  it("produces stats in 2–12 and valid backgrounds over many rolls", () => {
    for (let i = 0; i < 500; i++) {
      const r = rollMouse();
      for (const v of Object.values(r.stats)) expect(v).toBeGreaterThanOrEqual(2), expect(v).toBeLessThanOrEqual(12);
      expect(r.background).toBeTruthy();
      expect(r.look).toBeTruthy();
    }
  });

  it("swaps two stats", () => {
    const r = swapStats({ ...rollMouse(), stats: { str: 3, dex: 11, wil: 7 } }, "str", "dex");
    expect(r.stats).toEqual({ str: 11, dex: 3, wil: 7 });
  });
});

describe("createMouse", () => {
  const base = rollMouse();

  it("packs a heavy weapon in both paws and heavy armour across the body", () => {
    const r = {
      ...base,
      grants: [{ item: "spell-magic-missile" }, { item: "lead-coat" }],
      bonus: { background: "Mendicant priest", options: [{ item: "spell-restore" }, { item: "holy-symbol" }], takeBoth: true },
    };
    const m = createMouse(r, { weapon: "spear" }, { id: "m1", ownerId: "p1" });
    const cells = cellsByName(m);
    expect(cells["Spear"]).toEqual(["mainPaw", "offPaw"]);
    expect(cells["Lead coat"]).toEqual(["body1", "body2"]);
    expect(cells["Torches"]).toEqual(["pack1"]);
    expect(cells["Rations"]).toEqual(["pack2"]);
    expect(Object.keys(m.inventory.cards)).toHaveLength(7);
    expect(isEncumbered(m.inventory)).toBe(false);
  });

  it("wears light armour on the off paw and a body slot", () => {
    const r = { ...base, grants: [{ item: "shield-jerkin" }, { item: "cookpots" }], bonus: null };
    const cells = cellsByName(createMouse(r, { weapon: "dagger" }, { id: "m1", ownerId: "p1" }));
    expect(cells["Dagger"]).toEqual(["mainPaw"]);
    expect(cells["Shield & jerkin"]).toEqual(["offPaw", "body2"]);
  });

  it("takes only the picked bonus item when told to choose", () => {
    const r = {
      ...base,
      grants: [{ item: "net" }, { item: "needle" }],
      bonus: { background: "Gambler", options: [{ item: "loaded-dice" }, { item: "mirror" }], takeBoth: false },
    };
    const names = Object.values(createMouse(r, { weapon: "sword", bonusPick: 1 }, { id: "m", ownerId: "p" }).inventory.cards).map((c) => c.name);
    expect(names).toContain("Mirror");
    expect(names).not.toContain("Set of loaded dice");
  });

  it("rejects weapons that aren't starting choices", () => {
    expect(() => createMouse(base, { weapon: "rations" }, { id: "m", ownerId: "p" })).toThrow();
  });
});

describe("createHireling", () => {
  it("rolls d6 HP and 2d6 stats", () => {
    for (let i = 0; i < 100; i++) {
      const h = createHireling({ id: "h", employerId: "m" }, "Torchbearer");
      expect(h.hp.max).toBeGreaterThanOrEqual(1);
      expect(h.hp.max).toBeLessThanOrEqual(6);
      for (const s of Object.values(h.stats)) expect(s.max).toBeGreaterThanOrEqual(2), expect(s.max).toBeLessThanOrEqual(12);
      expect(Object.keys(h.inventory.cells)).toHaveLength(6);
    }
  });
});
