import { describe, expect, it } from "vitest";
import { fixedRng } from "./dice";
import { castSpell, randomSpell } from "./spells";

describe("castSpell", () => {
  it("marks usage per die showing 4–6 and fills in the effect", () => {
    const r = castSpell("magic-missile", 3, 3, fixedRng([2, 4, 5], 6));
    expect(r.sum).toBe(11);
    expect(r.usage).toBe(2);
    expect(r.miscastDamage).toEqual([]);
    expect(r.effect).toBe("Deal 11 + 3 damage to a creature within sight.");
  });

  it("each 6 rolled is a d6 of WIL damage", () => {
    const r = castSpell("heal", 2, 3, fixedRng([6, 6, 3, 2], 6));
    expect(r.usage).toBe(2);
    expect(r.miscastDamage).toEqual([3, 2]);
  });

  it("power is limited by remaining dots", () => {
    expect(() => castSpell("heal", 3, 2)).toThrow();
    expect(() => castSpell("heal", 0, 3)).toThrow();
  });

  it("random spells come from the 2d8 table", () => {
    for (let i = 0; i < 100; i++) expect(randomSpell()).toBeTruthy();
  });
});
