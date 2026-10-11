import type { CreatureDef } from "../data/creatures";
import type { Foe } from "../state";
import { applyDamage } from "./combat";
import { defaultRng, type Rng } from "./dice";
import { save, saveFor, type SaveResult } from "./saves";
import type { Creature, Score } from "./types";

export type Surprise = "party" | "foes" | "none";

export function makeFoe(def: CreatureDef, id: string, name: string): Foe {
  const s = (v: number): Score => ({ max: v, cur: v });
  return {
    id,
    defId: def.id,
    name,
    icon: def.icon,
    tint: def.tint,
    hp: s(def.hp),
    str: s(def.str),
    dex: s(def.dex),
    wil: s(def.wil),
    armour: def.armour,
    attacks: def.attacks,
    critical: def.critical,
    status: "active",
    critTaken: false,
  };
}

export interface InitiativeResult {
  order: string[];
  /** DEX saves rolled by the party when nobody was surprised. */
  saves: { id: string; result: SaveResult }[];
}

/**
 * Surprise attackers act first. Otherwise each party member makes a DEX
 * save: success acts before the foes, failure after. Frogs always go first
 * unless surprised.
 */
export function rollInitiative(party: Creature[], foes: Foe[], firstFoes: Set<string>, surprise: Surprise, rng: Rng = defaultRng): InitiativeResult {
  const p = party.map((c) => c.id);
  const f = foes.map((x) => x.id);
  if (surprise === "party") return { order: [...p, ...f], saves: [] };
  if (surprise === "foes") return { order: [...f, ...p], saves: [] };
  const saves = party.map((c) => ({ id: c.id, result: saveFor("dex", c.stats.dex.cur, c.inventory, "grit" in c ? c.grit : [], "normal", rng) }));
  const fast = saves.filter((s) => s.result.success).map((s) => s.id);
  const slow = saves.filter((s) => !s.result.success).map((s) => s.id);
  const eager = f.filter((id) => firstFoes.has(id));
  const rest = f.filter((id) => !firstFoes.has(id));
  return { order: [...eager, ...fast, ...rest, ...slow], saves };
}

export interface FoeDamageResult {
  dealt: number;
  strDamage: number;
  critSave?: SaveResult;
  /** Failed the STR save: incapacitated. */
  downed: boolean;
  killed: boolean;
}

/** Damage to a foe: armour, then HP, then STR with a STR save against critical damage. Mutates the foe. */
export function damageFoe(foe: Foe, amount: number, rng: Rng = defaultRng, ignoreArmour = false): FoeDamageResult {
  const r = applyDamage(foe.hp, foe.str, amount, ignoreArmour ? 0 : foe.armour);
  foe.hp = r.hp;
  foe.str = r.str;
  if (r.dead) {
    foe.status = "dead";
    return { dealt: r.dealt, strDamage: r.strDamage, downed: false, killed: true };
  }
  if (!r.needsCritSave) return { dealt: r.dealt, strDamage: r.strDamage, downed: false, killed: false };
  const critSave = save("str", foe.str.cur, "normal", rng);
  const downed = !critSave.success;
  if (downed) foe.status = "down";
  return { dealt: r.dealt, strDamage: r.strDamage, critSave, downed, killed: false };
}

/** WIL save; on failure the foe flees (or surrenders). Mutates the foe. */
export function moraleCheck(foe: Foe, rng: Rng = defaultRng): SaveResult {
  const r = save("wil", foe.wil.cur, "normal", rng);
  if (!r.success) foe.status = "fled";
  return r;
}

export const isActive = (f: Foe) => f.status === "active";
