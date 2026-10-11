import { describe, expect, it } from "vitest";
import { LANDMARKS, LANDMARK_DETAILS } from "../data/hexcrawl";
import { emptyCampaign, publicView } from "../state";
import { areAdjacent, generateMap, hexKey, neighbours, resizeMap } from "./hexmap";

describe("hex geometry", () => {
  it("has six distinct neighbours in odd-r layout", () => {
    for (const [c, r] of [[2, 2], [2, 3]]) {
      const n = neighbours(c, r).map(([a, b]) => hexKey(a, b));
      expect(new Set(n).size).toBe(6);
    }
    // Even row: the upper neighbours sit up-left; odd row: up-right.
    expect(areAdjacent("2,2", "1,1")).toBe(true);
    expect(areAdjacent("2,3", "3,2")).toBe(true);
    expect(areAdjacent("2,2", "3,1")).toBe(false);
  });

  it("adjacency is symmetric", () => {
    for (let c = 0; c < 5; c++)
      for (let r = 0; r < 5; r++)
        for (const [nc, nr] of neighbours(c, r)) expect(areAdjacent(hexKey(nc, nr), hexKey(c, r)), `${c},${r}→${nc},${nr}`).toBe(true);
  });
});

describe("generateMap", () => {
  it("fills a 5×5 map with a friendly settlement in the centre where the party starts", () => {
    const m = generateMap(5, 5);
    expect(Object.keys(m.hexes)).toHaveLength(25);
    expect(m.hexes["2,2"].type).toBe("settlement");
    expect(m.hexes["2,2"].revealed).toBe(true);
    expect(m.party).toBe("2,2");
    const hidden = Object.values(m.hexes).filter((h) => !h.revealed);
    expect(hidden).toHaveLength(24);
    for (const h of hidden) {
      expect(LANDMARKS[h.type as keyof typeof LANDMARKS]).toContain(h.landmark);
      expect(LANDMARK_DETAILS.flat()).toContain(h.detail);
    }
  });

  it("resizing keeps existing hexes", () => {
    const m = generateMap(5, 5);
    const big = resizeMap(m, 7, 6);
    expect(Object.keys(big.hexes)).toHaveLength(42);
    expect(big.hexes["2,2"]).toEqual(m.hexes["2,2"]);
    const small = resizeMap(m, 2, 2);
    expect(small.party).toBeNull();
  });
});

describe("fog of war", () => {
  it("players only receive revealed hexes, without the GM's notes", () => {
    const s = emptyCampaign("ABCDEF");
    s.map = generateMap(5, 5);
    s.map.hexes["0,0"].notes = "Owl lair";
    s.map.hexes["2,2"].notes = "Mayor is a spy";
    const seen = publicView(s).map;
    expect(Object.keys(seen.hexes)).toEqual(["2,2"]);
    expect(JSON.stringify(seen)).not.toContain("Owl lair");
    expect(JSON.stringify(seen)).not.toContain("spy");
    // The server's copy is untouched.
    expect(s.map.hexes["2,2"].notes).toBe("Mayor is a spy");
  });
});
