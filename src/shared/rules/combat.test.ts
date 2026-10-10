import { describe, expect, it } from "vitest";
import { afterFightUsage, applyDamage, attack } from "./combat";
import { fixedRng, scriptedRng } from "./dice";
import { MOUSE_LAYOUT, addCard, emptyInventory, itemCard } from "./inventory";

const s = (max: number, cur = max) => ({ max, cur });

describe("applyDamage", () => {
  it("hits HP first", () => {
    const r = applyDamage(s(5), s(10), 3);
    expect(r.hp.cur).toBe(2);
    expect(r.str.cur).toBe(10);
    expect(r.needsCritSave).toBe(false);
  });

  it("overflows into STR and calls for a STR save", () => {
    const r = applyDamage(s(5, 2), s(10), 6);
    expect(r.hp.cur).toBe(0);
    expect(r.strDamage).toBe(4);
    expect(r.str.cur).toBe(6);
    expect(r.needsCritSave).toBe(true);
  });

  it("armour reduces each hit", () => {
    expect(applyDamage(s(5), s(10), 1, 1).dealt).toBe(0);
    expect(applyDamage(s(5), s(10), 4, 1).hp.cur).toBe(2);
  });

  it("STR 0 is death", () => {
    const r = applyDamage(s(3, 0), s(4), 9);
    expect(r.dead).toBe(true);
    expect(r.str.cur).toBe(0);
    expect(r.needsCritSave).toBe(false);
  });
});

describe("attack", () => {
  it("rolls the weapon die", () => {
    expect(attack(["d10"], "normal", fixedRng([7], 10)).damage).toBe(7);
  });

  it("dual wielding keeps the best", () => {
    expect(attack(["d6", "d6"], "normal", fixedRng([2, 5], 6)).damage).toBe(5);
  });

  it("impaired always d4, enhanced always d12", () => {
    expect(attack(["d10"], "impaired").rolled[0].expr).toBe("d4");
    expect(attack(["d6"], "enhanced").rolled[0].expr).toBe("d12");
  });

  it("unarmed falls back to d6", () => {
    expect(attack([]).rolled[0].expr).toBe("d6");
  });
});

describe("afterFightUsage", () => {
  it("marks on 4–6 and always for improvised weapons", () => {
    const inv = emptyInventory(MOUSE_LAYOUT);
    addCard(inv, MOUSE_LAYOUT, itemCard("sword", "sw"));
    addCard(inv, MOUSE_LAYOUT, itemCard("improvised", "im"));
    addCard(inv, MOUSE_LAYOUT, itemCard("torches", "t"));
    const res = afterFightUsage(inv, ["sw", "im", "t"], scriptedRng([3, 6]));
    expect(inv.cards.sw.used).toBe(0);
    expect(inv.cards.im.used).toBe(1);
    expect(inv.cards.t.used).toBe(0);
    expect(res).toHaveLength(2);

    afterFightUsage(inv, ["sw"], scriptedRng([4, 6]));
    expect(inv.cards.sw.used).toBe(1);
  });
});
