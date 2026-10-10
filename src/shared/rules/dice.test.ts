import { describe, expect, it } from "vitest";
import { fixedRng, parseDice, roll, rollD66, rollDie } from "./dice";

describe("parseDice", () => {
  it("parses simple and compound expressions", () => {
    expect(parseDice("d20")).toEqual({ terms: [{ count: 1, sides: 20 }], modifier: 0 });
    expect(parseDice("2d6 + 1")).toEqual({ terms: [{ count: 2, sides: 6 }], modifier: 1 });
    expect(parseDice("3d6kh2").terms[0].keep).toEqual({ mode: "h", n: 2 });
    expect(parseDice("d6+d8-1").terms).toHaveLength(2);
  });

  it("rejects garbage", () => {
    for (const bad of ["", "abc", "d1", "0d6", "2d6kh3", "-d6", "100d6"]) {
      expect(() => parseDice(bad), bad).toThrow();
    }
  });
});

describe("roll", () => {
  it("keeps the highest dice", () => {
    const r = roll("3d6kh2", fixedRng([2, 6, 4], 6));
    expect(r.total).toBe(10);
    expect(r.dice.map((d) => d.kept)).toEqual([false, true, true]);
  });

  it("keeps the lowest for advantage on roll-under", () => {
    const r = roll("2d20kl1", fixedRng([15, 3], 20));
    expect(r.total).toBe(3);
  });

  it("adds modifiers", () => {
    expect(roll("d6+2", fixedRng([5], 6)).total).toBe(7);
  });

  it("stays in range over many rolls", () => {
    for (let i = 0; i < 1000; i++) {
      const v = rollDie(20);
      expect(v).toBeGreaterThanOrEqual(1);
      expect(v).toBeLessThanOrEqual(20);
    }
  });

  it("d66 reads tens then units", () => {
    expect(rollD66(fixedRng([3, 5], 6))).toBe(35);
  });
});
