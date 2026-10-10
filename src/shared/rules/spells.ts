import { SPELLS, SPELL_TABLE } from "../data/spells";
import { defaultRng, roll, rollDie, type Rng } from "./dice";

export interface CastResult {
  spellId: string;
  power: number;
  dice: number[];
  sum: number;
  /** Usage dots to mark: one per die showing 4–6. */
  usage: number;
  /** One d6 WIL damage per 6 rolled. */
  miscastDamage: number[];
  /** Effect text with [SUM] and [DICE] filled in. */
  effect: string;
}

/**
 * Cast with `power` d6 (at most the spell's remaining usage dots). The WIL
 * save that follows a miscast is rolled separately, against the reduced WIL.
 */
export function castSpell(spellId: string, power: number, dotsRemaining: number, rng: Rng = defaultRng): CastResult {
  const spell = SPELLS[spellId];
  if (!spell) throw new Error(`Unknown spell "${spellId}"`);
  if (power < 1 || power > dotsRemaining) throw new Error(`Power must be between 1 and ${dotsRemaining}`);
  const dice = Array.from({ length: power }, () => rollDie(6, rng));
  const sum = dice.reduce((a, b) => a + b, 0);
  const sixes = dice.filter((d) => d === 6).length;
  return {
    spellId,
    power,
    dice,
    sum,
    usage: dice.filter((d) => d >= 4).length,
    miscastDamage: Array.from({ length: sixes }, () => rollDie(6, rng)),
    effect: spell.effect.replaceAll("[SUM]", String(sum)).replaceAll("[DICE]", String(power)),
  };
}

export function randomSpell(rng: Rng = defaultRng): string {
  return SPELL_TABLE[roll("2d8", rng).total];
}
