export type Stat = "str" | "dex" | "wil";
export const STATS: Stat[] = ["str", "dex", "wil"];

export interface Score {
  max: number;
  cur: number;
}

export type WeaponClass = "improvised" | "light" | "medium" | "heavy" | "lightRanged" | "heavyRanged";

export type ItemKind = "weapon" | "armour" | "ammo" | "light" | "ration" | "purse" | "spell" | "gear" | "condition";

export type ClearOn = "short" | "long" | "full" | "meal" | "custom";

export interface ItemDef {
  id: string;
  name: string;
  kind: Exclude<ItemKind, "condition">;
  /** Inventory slots occupied (1 or 2). */
  size: 1 | 2;
  /** Usage dots; 0 = never depletes. */
  dots: number;
  cost?: number;
  weapon?: { class: WeaponClass; damage: string; bothPawsDamage?: string };
  armour?: { class: "light" | "heavy"; defence: number };
  /** Spell catalog id when kind === "spell". */
  spellId?: string;
  note?: string;
}

export interface ConditionDef {
  id: string;
  name: string;
  clear: ClearOn;
  clearText: string;
  effect?: string;
  disadvantage?: Stat[];
}

/** A concrete thing sitting in an inventory: an item or a condition. */
export interface CardInstance {
  uid: string;
  kind: ItemKind;
  /** Catalog id (ItemDef or ConditionDef); "custom" for free-form cards. */
  defId: string;
  name: string;
  size: 1 | 2;
  dots: number;
  used: number;
  /** For two-slot cards: true = spans two rows (vertical), false = two columns. */
  vertical?: boolean;
  note?: string;
  /** Light sources: currently lit, and turns burned since usage was last marked (0–5). */
  lit?: boolean;
  burn?: number;
}

export type Zone = "paw" | "body" | "pack";

export interface CellDef {
  id: string;
  label: string;
  zone: Zone;
  col: number;
  row: number;
}

export interface InventoryLayout {
  cols: number;
  rows: number;
  cells: CellDef[];
}

export interface Inventory {
  cards: Record<string, CardInstance>;
  /** Cell id → card uid. A two-slot card appears in both of its cells. */
  cells: Record<string, string | null>;
  /** Cards that don't fit. Any card here means the creature is encumbered. */
  overflow: string[];
}

export interface Birthsign {
  sign: string;
  disposition: string;
}

export interface Mouse {
  id: string;
  ownerId: string;
  name: string;
  background: string;
  birthsign: Birthsign;
  coat: { color: string; pattern: string };
  look: string;
  stats: Record<Stat, Score>;
  hp: Score;
  pips: number;
  level: number;
  xp: number;
  /** Condition uids placed in the Grit space (ignored while there). */
  grit: string[];
  inventory: Inventory;
  bank: string;
  incapacitated: boolean;
  dead: boolean;
  /** Weapons/armour/ammo used since the last after-fight usage check. */
  usedInFight: string[];
}

export interface Hireling {
  id: string;
  employerId: string;
  name: string;
  type: string;
  look: string;
  disposition: string;
  stats: Record<Stat, Score>;
  hp: Score;
  level: number;
  xp: number;
  inventory: Inventory;
  incapacitated: boolean;
  dead: boolean;
  usedInFight: string[];
}

/** Anything with a sheet: player mice and hirelings share the combat-relevant shape. */
export type Creature = Mouse | Hireling;
