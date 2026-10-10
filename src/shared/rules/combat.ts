import { defaultRng, roll, type Rng } from "./dice";
import { isDepleted, markUsage } from "./inventory";
import type { CardInstance, Inventory, Score } from "./types";

export type AttackMod = "normal" | "impaired" | "enhanced";

export interface AttackResult {
  /** Dice expressions rolled, one per weapon (two when dual-wielding light weapons). */
  rolled: { expr: string; value: number }[];
  damage: number;
  mod: AttackMod;
}

/**
 * Attacks always hit. Impaired rolls d4 and enhanced rolls d12 regardless of
 * weapon. Two weapons: roll both, keep the best.
 */
export function attack(weaponDice: string[], mod: AttackMod = "normal", rng: Rng = defaultRng): AttackResult {
  const dice = mod === "impaired" ? ["d4"] : mod === "enhanced" ? ["d12"] : weaponDice.length ? weaponDice : ["d6"];
  const rolled = dice.map((expr) => ({ expr, value: roll(expr, rng).total }));
  return { rolled, damage: Math.max(...rolled.map((r) => r.value)), mod };
}

export interface DamageResult {
  hp: Score;
  str: Score;
  /** Damage after armour. */
  dealt: number;
  /** Portion that went past HP into STR. */
  strDamage: number;
  /** STR damage forces a STR save; failing it is critical damage. */
  needsCritSave: boolean;
  dead: boolean;
}

/** Damage goes to HP first, then STR. Armour reduces each hit. */
export function applyDamage(hp: Score, str: Score, amount: number, armour = 0): DamageResult {
  const dealt = Math.max(0, amount - armour);
  const toHp = Math.min(hp.cur, dealt);
  const strDamage = dealt - toHp;
  const newStr = { ...str, cur: Math.max(0, str.cur - strDamage) };
  const dead = newStr.cur === 0;
  return {
    hp: { ...hp, cur: hp.cur - toHp },
    str: newStr,
    dealt,
    strDamage,
    needsCritSave: strDamage > 0 && !dead,
    dead,
  };
}

/**
 * After a fight, weapons, armour and ammo that were used roll d6 each: 4–6
 * marks usage. Improvised (and silvered) weapons always mark.
 */
export function afterFightUsage(inv: Inventory, usedUids: string[], rng: Rng = defaultRng) {
  const results: { card: CardInstance; roll: number | null; marked: boolean; depleted: boolean }[] = [];
  for (const uid of usedUids) {
    const card = inv.cards[uid];
    if (!card || isDepleted(card) || !["weapon", "armour", "ammo"].includes(card.kind)) continue;
    const always = card.defId === "improvised";
    const r = always ? null : roll("d6", rng).total;
    const marked = always || r! >= 4;
    const depleted = marked ? markUsage(inv, uid) : false;
    results.push({ card, roll: r, marked, depleted });
  }
  return results;
}
