import { describe, expect, it } from "vitest";
import { creatureDef } from "../data/creatures";
import { fixedRng, scriptedRng } from "./dice";
import { damageFoe, makeFoe, moraleCheck, rollInitiative } from "./encounter";
import { MOUSE_LAYOUT, emptyInventory } from "./inventory";
import type { Mouse } from "./types";

const s = (v: number) => ({ max: v, cur: v });
const mouse = (id: string, dex: number) =>
  ({ id, ownerId: "p", name: id, stats: { str: s(10), dex: s(dex), wil: s(10) }, hp: s(4), inventory: emptyInventory(MOUSE_LAYOUT), grit: [] }) as unknown as Mouse;

describe("rollInitiative", () => {
  const rat = makeFoe(creatureDef("rat")!, "r1", "Rat");
  const frog = makeFoe(creatureDef("frog")!, "f1", "Frog");

  it("surprise decides outright", () => {
    expect(rollInitiative([mouse("a", 5)], [rat], new Set(), "party").order).toEqual(["a", "r1"]);
    expect(rollInitiative([mouse("a", 5)], [rat], new Set(), "foes").order).toEqual(["r1", "a"]);
  });

  it("otherwise a DEX save puts a mouse before the foes", () => {
    const r = rollInitiative([mouse("quick", 12), mouse("slow", 3)], [rat], new Set(), "none", fixedRng([8], 20));
    expect(r.order).toEqual(["quick", "r1", "slow"]);
    expect(r.saves).toHaveLength(2);
  });

  it("frogs go first unless surprised", () => {
    const r = rollInitiative([mouse("quick", 20)], [rat, frog], new Set(["f1"]), "none", fixedRng([1], 20));
    expect(r.order).toEqual(["f1", "quick", "r1"]);
  });
});

describe("damageFoe", () => {
  it("armour, then HP, then STR with a save; failing it downs the foe", () => {
    const snake = makeFoe(creatureDef("snake")!, "s", "Snake");
    const r = damageFoe(snake, 14, fixedRng([20], 20)); // 14 - 2 armour = 12 → all HP
    expect(r.dealt).toBe(12);
    expect(snake.hp.cur).toBe(0);
    expect(r.critSave).toBeUndefined();
    const r2 = damageFoe(snake, 5, fixedRng([20], 20)); // 3 to STR, save fails
    expect(r2.strDamage).toBe(3);
    expect(r2.downed).toBe(true);
    expect(snake.status).toBe("down");
  });

  it("STR 0 kills", () => {
    const rat = makeFoe(creatureDef("rat")!, "r", "Rat");
    expect(damageFoe(rat, 15).killed).toBe(true);
    expect(rat.status).toBe("dead");
  });
});

describe("moraleCheck", () => {
  it("a failed WIL save means the foe flees", () => {
    const rat = makeFoe(creatureDef("rat")!, "r", "Rat");
    expect(moraleCheck(rat, fixedRng([3], 20)).success).toBe(true);
    expect(rat.status).toBe("active");
    moraleCheck(rat, scriptedRng([15, 20]));
    expect(rat.status).toBe("fled");
  });
});
