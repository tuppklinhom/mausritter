import { CONDITIONS } from "../data/conditions";
import { defaultRng, roll, rollDie, type Rng } from "./dice";
import { removeCard } from "./inventory";
import { STATS, type ClearOn, type Inventory, type Score, type Stat } from "./types";

/** Total XP needed for each level: 1→0, 2→1000, 3→3000, 4→6000, then +5000 each. */
export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  if (level === 2) return 1000;
  if (level === 3) return 3000;
  return 6000 + (level - 4) * 5000;
}

export function levelForXp(xp: number): number {
  let level = 1;
  while (xp >= xpForLevel(level + 1)) level++;
  return level;
}

export function hitDice(level: number): string {
  return `${Math.min(level, 4)}d6`;
}

export function gritForLevel(level: number): number {
  return level <= 1 ? 0 : level === 2 ? 1 : level <= 4 ? 2 : 3;
}

export interface LevelUpResult {
  level: number;
  statRolls: Record<Stat, { roll: number; increased: boolean }>;
  hpRoll: number;
  stats: Record<Stat, Score>;
  hp: Score;
}

/**
 * Per stat: d20 above the current value raises it by 1. Then roll the new
 * level's Hit Dice: above current max HP replaces it, else +1.
 */
export function levelUp(newLevel: number, stats: Record<Stat, Score>, hp: Score, rng: Rng = defaultRng): LevelUpResult {
  const next = { ...stats } as Record<Stat, Score>;
  const statRolls = {} as LevelUpResult["statRolls"];
  for (const s of STATS) {
    const r = rollDie(20, rng);
    const increased = r > stats[s].max;
    statRolls[s] = { roll: r, increased };
    if (increased) next[s] = { max: stats[s].max + 1, cur: stats[s].cur + 1 };
  }
  const hpRoll = roll(hitDice(newLevel), rng).total;
  const max = hpRoll > hp.max ? hpRoll : hp.max + 1;
  return { level: newLevel, statRolls, hpRoll, stats: next, hp: { max, cur: hp.cur + (max - hp.max) } };
}

export type RestKind = "short" | "long" | "full";

/** Which condition clear-requirements each rest satisfies. A long rest includes a meal. */
const CLEARS: Record<RestKind, ClearOn[]> = {
  short: ["short"],
  long: ["short", "long", "meal"],
  full: ["short", "long", "meal", "full"],
};

export interface RestResult {
  hp: Score;
  stats: Record<Stat, Score>;
  hpRoll?: number;
  statRestored?: { stat: Stat; amount: number };
  cleared: string[];
}

/**
 * Short: d6+1 HP. Long: all HP, or d6 to one attribute if HP was already full.
 * Full: everything back. Clears conditions whose requirement the rest meets.
 * Mutates `inv` (removes cleared conditions) and `grit`.
 */
export function rest(
  kind: RestKind,
  hp: Score,
  stats: Record<Stat, Score>,
  inv: Inventory,
  grit: string[],
  opts: { restoreStat?: Stat } = {},
  rng: Rng = defaultRng,
): RestResult {
  const out: RestResult = { hp: { ...hp }, stats: { ...stats }, cleared: [] };
  if (kind === "short") {
    out.hpRoll = roll("d6+1", rng).total;
    out.hp.cur = Math.min(hp.max, hp.cur + out.hpRoll);
  } else if (kind === "long") {
    if (hp.cur >= hp.max) {
      const stat = opts.restoreStat ?? STATS.reduce((a, b) => (stats[b].max - stats[b].cur > stats[a].max - stats[a].cur ? b : a));
      const amount = rollDie(6, rng);
      out.stats[stat] = { ...stats[stat], cur: Math.min(stats[stat].max, stats[stat].cur + amount) };
      out.statRestored = { stat, amount };
    }
    out.hp.cur = hp.max;
  } else {
    out.hp.cur = hp.max;
    for (const s of STATS) out.stats[s] = { ...stats[s], cur: stats[s].max };
  }

  const clears = CLEARS[kind];
  for (const card of Object.values(inv.cards)) {
    if (card.kind !== "condition") continue;
    const def = CONDITIONS[card.defId];
    if (def && clears.includes(def.clear)) {
      removeCard(inv, card.uid);
      const gi = grit.indexOf(card.uid);
      if (gi >= 0) grit.splice(gi, 1);
      out.cleared.push(card.name);
    }
  }
  return out;
}
