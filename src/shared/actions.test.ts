import { describe, expect, it } from "vitest";
import { ActionError, applyAction, type Action } from "./actions";
import { scriptedRng, type Rng } from "./rules/dice";
import { cellsOf } from "./rules/inventory";
import { emptyCampaign, type CampaignState, type Member } from "./state";

const gm: Member = { id: "gm", name: "GM", role: "gm" };
const pip: Member = { id: "pip", name: "Pip", role: "player" };
const bo: Member = { id: "bo", name: "Bo", role: "player" };

function setup() {
  const state = emptyCampaign("ABCDEF");
  for (const m of [gm, pip, bo]) state.members[m.id] = m;
  let n = 0;
  const run = (actor: Member, action: Action, rng?: Rng) => applyAction(state, action, { actor, rng, newId: () => `id${n++}` });
  return { state, run };
}

/** STR/DEX/WIL 12, HP 6, pips 1 → Troubadour: no armour or extra weapons to crowd the paws. */
const troubadour = () => {
  const d = (...v: number[]) => v.map((x) => [x, 6] as [number, number]);
  return scriptedRng(...d(6, 6, 6, 6, 6, 6, 6, 6, 6, 6, 1, 1, 1, 1, 1, 1), [1, 100], [1, 20]);
};

function makeMouse(run: ReturnType<typeof setup>["run"], state: CampaignState, actor: Member, weapon = "sword") {
  run(actor, { t: "rollMouse", locked: [] }, troubadour());
  run(actor, { t: "finalizeMouse", weapon });
  return Object.values(state.mice).find((m) => m.ownerId === actor.id)!;
}

describe("character creation", () => {
  it("rolls a draft, rerolls unlocked parts, and finalizes it", () => {
    const { state, run } = setup();
    run(pip, { t: "rollMouse", locked: [] });
    const first = state.drafts.pip;
    run(pip, { t: "rollMouse", locked: ["stats"] });
    expect(state.drafts.pip.stats).toEqual(first.stats);
    run(pip, { t: "finalizeMouse", weapon: "dagger", name: "Pippa" });
    expect(state.drafts.pip).toBeUndefined();
    const m = Object.values(state.mice)[0];
    expect(m.name).toBe("Pippa");
    expect(m.ownerId).toBe("pip");
    expect(m.inventory.cells.mainPaw).toBeTruthy();
    expect(state.log.at(-1)!.title).toBe("Pippa joins the party");
  });

  it("creates background hirelings", () => {
    const { state, run } = setup();
    // HP 2, pips 2 → Beetleherd (Loyal beetle). STR 12 so no bonus background.
    const d = (...v: number[]) => v.map((x) => [x, 6] as [number, number]);
    run(pip, { t: "rollMouse", locked: [] }, scriptedRng(...d(6, 6, 6, 6, 6, 6, 6, 6, 6, 2, 2, 1, 1, 1, 1, 1), [1, 100], [1, 20]));
    expect(state.drafts.pip.background).toBe("Beetleherd");
    run(pip, { t: "finalizeMouse", weapon: "needle" });
    const hirelings = Object.values(state.hirelings);
    expect(hirelings).toHaveLength(1);
    expect(hirelings[0].type).toBe("Loyal beetle");
  });

  it("requires a draft and a real starting weapon", () => {
    const { run } = setup();
    expect(() => run(pip, { t: "finalizeMouse", weapon: "sword" })).toThrow(ActionError);
    run(pip, { t: "rollMouse", locked: [] });
    expect(() => run(pip, { t: "finalizeMouse", weapon: "lead-coat" })).toThrow(ActionError);
  });
});

describe("permissions", () => {
  it("players can only act for their own mice; the GM can act for anyone", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip);
    expect(() => run(bo, { t: "damage", creatureId: m.id, amount: 1 })).toThrow("That's not your mouse.");
    run(gm, { t: "damage", creatureId: m.id, amount: 1 });
    run(pip, { t: "save", creatureId: m.id, stat: "dex", mode: "normal" });
  });
});

describe("combat flow", () => {
  it("damage spills into STR, forcing a STR save; failure is critical", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip);
    m.hp = { max: 3, cur: 3 };
    m.stats.str = { max: 8, cur: 8 };
    // 5 damage: 3 HP, 2 STR → STR 6. Save rolls 20: fail.
    const events = run(gm, { t: "damage", creatureId: m.id, amount: 5 }, scriptedRng([20, 20]));
    expect(m.hp.cur).toBe(0);
    expect(m.stats.str.cur).toBe(6);
    expect(events.map((e) => e.outcome)).toEqual([undefined, "critical"]);
    expect(m.incapacitated).toBe(true);
    expect(Object.values(m.inventory.cards).some((c) => c.defId === "injured")).toBe(true);

    run(pip, { t: "rest", creatureId: m.id, kind: "short" }, scriptedRng([1, 6]));
    expect(m.incapacitated).toBe(false);
  });

  it("STR 0 kills", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip);
    m.hp = { max: 1, cur: 0 };
    m.stats.str = { max: 3, cur: 3 };
    const events = run(gm, { t: "damage", creatureId: m.id, amount: 9 });
    expect(m.dead).toBe(true);
    expect(events.at(-1)!.outcome).toBe("dead");
  });

  it("attacks record used weapons; the after-fight check rolls their usage", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip, "sword");
    const sword = m.inventory.cells.mainPaw!;
    const atk = run(pip, { t: "attack", creatureId: m.id, mod: "normal" }, scriptedRng([7, 8]));
    expect(atk[0].total).toBe(7); // d8: sword with the off paw free
    expect(m.usedInFight).toEqual([sword]);
    run(pip, { t: "afterFight", creatureId: m.id }, scriptedRng([5, 6]));
    expect(m.inventory.cards[sword].used).toBe(1);
    expect(m.usedInFight).toEqual([]);
  });
});

describe("inventory actions", () => {
  it("moves, transfers and drops cards", () => {
    const { state, run } = setup();
    const a = makeMouse(run, state, pip);
    const b = makeMouse(run, state, bo);
    const torches = Object.values(a.inventory.cards).find((c) => c.defId === "torches")!;
    run(pip, { t: "moveCard", creatureId: a.id, uid: torches.uid, anchor: "pack6" });
    expect(cellsOf(a.inventory, torches.uid)).toEqual(["pack6"]);
    expect(() => run(pip, { t: "moveCard", creatureId: a.id, uid: torches.uid, anchor: "mainPaw" })).toThrow("doesn't fit");

    run(pip, { t: "transferCard", creatureId: a.id, uid: torches.uid, toId: b.id });
    expect(a.inventory.cards[torches.uid]).toBeUndefined();
    expect(b.inventory.cards[torches.uid]).toBeDefined();

    run(bo, { t: "removeCard", creatureId: b.id, uid: torches.uid });
    expect(b.inventory.cards[torches.uid]).toBeUndefined();
  });

  it("Grit holds Conditions only up to the level's Grit", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip);
    run(gm, { t: "addCondition", creatureId: m.id, defId: "frightened" });
    const fright = Object.values(m.inventory.cards).find((c) => c.kind === "condition")!;
    expect(() => run(pip, { t: "toggleGrit", creatureId: m.id, uid: fright.uid })).toThrow("Grit 0");
    m.level = 2;
    run(pip, { t: "toggleGrit", creatureId: m.id, uid: fright.uid });
    expect(m.grit).toEqual([fright.uid]);
    expect(cellsOf(m.inventory, fright.uid)).toEqual([]);
  });

  it("custom items and conditions", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip);
    run(gm, { t: "addItem", creatureId: m.id, custom: { name: "Glowing acorn", size: 1 } });
    run(gm, { t: "addCondition", creatureId: m.id, custom: { name: "Soaked", clearText: "Dry by a fire" } });
    const names = Object.values(m.inventory.cards).map((c) => c.name);
    expect(names).toContain("Glowing acorn");
    expect(names).toContain("Soaked");
  });
});

describe("advancement", () => {
  it("level up only when XP allows", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip);
    expect(() => run(pip, { t: "levelUp", creatureId: m.id })).toThrow("Not enough XP");
    const ev = run(gm, { t: "addXp", creatureId: m.id, amount: 1000 });
    expect(ev.at(-1)!.outcome).toBe("levelup");
    run(pip, { t: "levelUp", creatureId: m.id });
    expect(m.level).toBe(2);
  });
});

describe("spells", () => {
  it("must be held in a paw; marks usage and logs miscasts", () => {
    const { state, run } = setup();
    const m = makeMouse(run, state, pip, "dagger");
    run(gm, { t: "addItem", creatureId: m.id, defId: "spell-heal" });
    const tablet = Object.values(m.inventory.cards).find((c) => c.kind === "spell")!;
    expect(() => run(pip, { t: "castSpell", creatureId: m.id, uid: tablet.uid, power: 1 })).toThrow("Hold the tablet");
    run(pip, { t: "moveCard", creatureId: m.id, uid: tablet.uid, anchor: "offPaw" });
    m.stats.wil = { max: 10, cur: 10 };
    // Dice: 6, 4 → two usage; one six → d6 WIL damage of 3; WIL save rolls 2 (pass).
    const ev = run(pip, { t: "castSpell", creatureId: m.id, uid: tablet.uid, power: 2 }, scriptedRng([6, 6], [4, 6], [3, 6], [2, 20]));
    expect(tablet.used).toBe(2);
    expect(m.stats.wil.cur).toBe(7);
    expect(ev.map((e) => e.kind)).toEqual(["spell", "damage", "save"]);
  });
});
