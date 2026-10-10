import { describe, expect, it } from "vitest";
import { BACKGROUNDS } from "./backgrounds";
import { BIRTHNAMES, LOOKS, MATRINAMES } from "./details";
import { ITEMS, STARTING_WEAPONS } from "./items";
import { SPELLS, SPELL_TABLE } from "./spells";

describe("catalog integrity", () => {
  it("has a full 6×6 background table", () => {
    expect(BACKGROUNDS).toHaveLength(36);
    expect(new Set(BACKGROUNDS.map((b) => `${b.hp}-${b.pips}`)).size).toBe(36);
  });

  it("every background item exists in the item catalog", () => {
    for (const b of BACKGROUNDS) {
      for (const g of [b.a, b.b]) {
        if ("item" in g) expect(ITEMS[g.item], `${b.name}: ${g.item}`).toBeDefined();
      }
    }
  });

  it("every spell item and table entry points at a real spell", () => {
    for (const i of Object.values(ITEMS)) if (i.kind === "spell") expect(SPELLS[i.spellId!], i.id).toBeDefined();
    for (let n = 2; n <= 16; n++) expect(SPELLS[SPELL_TABLE[n]], String(n)).toBeDefined();
  });

  it("has every d66 look and full name tables", () => {
    for (let t = 1; t <= 6; t++) for (let u = 1; u <= 6; u++) expect(LOOKS[t * 10 + u]).toBeTruthy();
    expect(BIRTHNAMES).toHaveLength(100);
    expect(MATRINAMES).toHaveLength(20);
  });

  it("starting weapons are weapons", () => {
    for (const w of STARTING_WEAPONS) expect(ITEMS[w].kind).toBe("weapon");
  });
});
