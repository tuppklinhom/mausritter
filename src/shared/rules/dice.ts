/** Returns a float in [0, 1). Injected so rules stay deterministic under test. */
export type Rng = () => number;

export const defaultRng: Rng = () => {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 2 ** 32;
};

export function rollDie(sides: number, rng: Rng = defaultRng): number {
  return Math.floor(rng() * sides) + 1;
}

export interface DiceTerm {
  count: number;
  sides: number;
  /** Keep the highest / lowest N dice (e.g. advantage = 2d20kl1 for roll-under). */
  keep?: { mode: "h" | "l"; n: number };
}

export interface DiceExpr {
  terms: DiceTerm[];
  modifier: number;
}

export interface DiceResult {
  expr: string;
  /** Every die rolled, grouped by term, with `kept` marking dice that count. */
  dice: { sides: number; value: number; kept: boolean }[];
  total: number;
}

const TERM = /^(\d*)d(\d+)(?:k([hl])(\d+))?$/;

/** Parses "d20", "2d6+1", "3d6kh2", "2d20kl1", "d6+d8-1". Throws on garbage. */
export function parseDice(input: string): DiceExpr {
  const src = input.replace(/\s+/g, "").toLowerCase();
  if (!src) throw new Error("Empty dice expression");
  const parts = src.match(/[+-]?[^+-]+/g) ?? [];
  const expr: DiceExpr = { terms: [], modifier: 0 };
  for (const raw of parts) {
    const sign = raw.startsWith("-") ? -1 : 1;
    const body = raw.replace(/^[+-]/, "");
    if (/^\d+$/.test(body)) {
      expr.modifier += sign * Number(body);
      continue;
    }
    const m = TERM.exec(body);
    if (!m || sign < 0) throw new Error(`Bad dice term "${raw}"`);
    const count = m[1] ? Number(m[1]) : 1;
    const sides = Number(m[2]);
    if (count < 1 || count > 20 || sides < 2 || sides > 100) {
      throw new Error(`Dice out of range "${raw}"`);
    }
    const term: DiceTerm = { count, sides };
    if (m[3]) {
      const n = Number(m[4]);
      if (n < 1 || n > count) throw new Error(`Bad keep in "${raw}"`);
      term.keep = { mode: m[3] as "h" | "l", n };
    }
    expr.terms.push(term);
  }
  if (expr.terms.length === 0) throw new Error("No dice in expression");
  return expr;
}

export function roll(input: string, rng: Rng = defaultRng): DiceResult {
  const expr = parseDice(input);
  const dice: DiceResult["dice"] = [];
  let total = expr.modifier;
  for (const term of expr.terms) {
    const values = Array.from({ length: term.count }, () => rollDie(term.sides, rng));
    const keptIdx = new Set(values.map((_, i) => i));
    if (term.keep) {
      const order = values
        .map((v, i) => ({ v, i }))
        .sort((a, b) => (term.keep!.mode === "h" ? b.v - a.v : a.v - b.v));
      keptIdx.clear();
      order.slice(0, term.keep.n).forEach(({ i }) => keptIdx.add(i));
    }
    values.forEach((value, i) => {
      const kept = keptIdx.has(i);
      if (kept) total += value;
      dice.push({ sides: term.sides, value, kept });
    });
  }
  return { expr: input.replace(/\s+/g, ""), dice, total };
}

/** Mausritter d66: first d6 is tens, second is units (11–66). */
export function rollD66(rng: Rng = defaultRng): number {
  return rollDie(6, rng) * 10 + rollDie(6, rng);
}

/** Deterministic rng for tests: cycles through the given die faces for a dN. */
export function fixedRng(values: number[], sides: number): Rng {
  let i = 0;
  return () => {
    const v = values[i++ % values.length];
    return (v - 1) / sides + 1e-9;
  };
}
