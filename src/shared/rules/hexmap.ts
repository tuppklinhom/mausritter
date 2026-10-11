import { LANDMARKS, LANDMARK_DETAILS, hexTypeFor, type HexType } from "../data/hexcrawl";
import type { Hex, MapState } from "../state";
import { defaultRng, rollDie, type Rng } from "./dice";

export const hexKey = (col: number, row: number) => `${col},${row}`;

export function parseKey(key: string): [number, number] {
  const [c, r] = key.split(",").map(Number);
  return [c, r];
}

export function inBounds(map: Pick<MapState, "cols" | "rows">, col: number, row: number): boolean {
  return col >= 0 && row >= 0 && col < map.cols && row < map.rows;
}

/** Neighbours in "odd-r" offset layout (pointy-top hexes, odd rows shoved right). */
export function neighbours(col: number, row: number): [number, number][] {
  const odd = row & 1;
  const dirs = odd
    ? [[1, 0], [1, -1], [0, -1], [-1, 0], [0, 1], [1, 1]]
    : [[1, 0], [0, -1], [-1, -1], [-1, 0], [-1, 1], [0, 1]];
  return dirs.map(([dc, dr]) => [col + dc, row + dr]);
}

export function areAdjacent(a: string, b: string): boolean {
  const [ac, ar] = parseKey(a);
  const [bc, br] = parseKey(b);
  return neighbours(ac, ar).some(([c, r]) => c === bc && r === br);
}

export function rollLandmark(type: HexType, rng: Rng = defaultRng): string | undefined {
  if (type === "settlement") return undefined;
  return LANDMARKS[type][rollDie(20, rng) - 1];
}

export function rollDetail(rng: Rng = defaultRng): string {
  const row = LANDMARK_DETAILS[rollDie(6, rng) - 1];
  return row.length === 1 ? row[0] : row[rollDie(8, rng) - 1];
}

/** One hex rolled from the hex contents tables. */
export function rollHex(col: number, row: number, rng: Rng = defaultRng): Hex {
  const type = hexTypeFor(rollDie(6, rng));
  return { col, row, type, landmark: rollLandmark(type, rng), detail: rollDetail(rng), revealed: false };
}

/**
 * Fills every hex per "Making a hexcrawl": a friendly settlement in the
 * centre, the rest rolled. The settlement starts revealed with the party there.
 */
export function generateMap(cols: number, rows: number, rng: Rng = defaultRng): MapState {
  const hexes: Record<string, Hex> = {};
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) hexes[hexKey(c, r)] = rollHex(c, r, rng);
  const centre = hexKey(Math.floor(cols / 2), Math.floor(rows / 2));
  hexes[centre] = { ...hexes[centre], type: "settlement", name: "Home settlement", landmark: undefined, detail: "Friendly mouse settlement", revealed: true };
  return { cols, rows, hexes, party: centre };
}

/** Resizes the grid, keeping hexes that still fit and filling new space with blank countryside. */
export function resizeMap(map: MapState, cols: number, rows: number): MapState {
  const hexes: Record<string, Hex> = {};
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const k = hexKey(c, r);
      hexes[k] = map.hexes[k] ?? { col: c, row: r, type: "countryside", revealed: false };
    }
  }
  const party = map.party && hexes[map.party] ? map.party : null;
  return { cols, rows, hexes, party };
}
