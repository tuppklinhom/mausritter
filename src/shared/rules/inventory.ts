import { CONDITIONS } from "../data/conditions";
import { item } from "../data/items";
import type { CardInstance, CellDef, Inventory, InventoryLayout } from "./types";

// Inventory functions mutate the inventory they are given. The server applies
// them to its authoritative state; callers needing immutability clone first.

function grid(cells: Omit<CellDef, "zone">[], zoneOf: (id: string) => CellDef["zone"]): CellDef[] {
  return cells.map((c) => ({ ...c, zone: zoneOf(c.id) }));
}

const zoneOf = (id: string) => (id.endsWith("Paw") ? "paw" : id.startsWith("body") ? "body" : "pack");

/** Mouse sheet: paws | body | pack 1–3 over 4–6. */
export const MOUSE_LAYOUT: InventoryLayout = {
  cols: 5,
  rows: 2,
  cells: grid(
    [
      { id: "mainPaw", label: "Main paw", col: 0, row: 0 },
      { id: "offPaw", label: "Off paw", col: 0, row: 1 },
      { id: "body1", label: "Body", col: 1, row: 0 },
      { id: "body2", label: "Body", col: 1, row: 1 },
      { id: "pack1", label: "1", col: 2, row: 0 },
      { id: "pack2", label: "2", col: 3, row: 0 },
      { id: "pack3", label: "3", col: 4, row: 0 },
      { id: "pack4", label: "4", col: 2, row: 1 },
      { id: "pack5", label: "5", col: 3, row: 1 },
      { id: "pack6", label: "6", col: 4, row: 1 },
    ],
    zoneOf,
  ),
};

/** Hireling sheet: paws | pack 1–2 over 3–4. */
export const HIRELING_LAYOUT: InventoryLayout = {
  cols: 3,
  rows: 2,
  cells: grid(
    [
      { id: "mainPaw", label: "Main paw", col: 0, row: 0 },
      { id: "offPaw", label: "Off paw", col: 0, row: 1 },
      { id: "pack1", label: "1", col: 1, row: 0 },
      { id: "pack2", label: "2", col: 2, row: 0 },
      { id: "pack3", label: "3", col: 1, row: 1 },
      { id: "pack4", label: "4", col: 2, row: 1 },
    ],
    zoneOf,
  ),
};

export function emptyInventory(layout: InventoryLayout): Inventory {
  return { cards: {}, cells: Object.fromEntries(layout.cells.map((c) => [c.id, null])), overflow: [] };
}

export function itemCard(defId: string, uid: string = crypto.randomUUID()): CardInstance {
  const def = item(defId);
  return { uid, kind: def.kind, defId, name: def.name, size: def.size, dots: def.dots, used: 0, note: def.note };
}

export function conditionCard(defId: string, uid: string = crypto.randomUUID()): CardInstance {
  const def = CONDITIONS[defId];
  if (!def) throw new Error(`Unknown condition "${defId}"`);
  return { uid, kind: "condition", defId, name: def.name, size: 1, dots: 0, used: 0 };
}

export function customCondition(name: string, clearText: string, uid: string = crypto.randomUUID()): CardInstance {
  return { uid, kind: "condition", defId: "custom", name, size: 1, dots: 0, used: 0, note: clearText };
}

function cellAt(layout: InventoryLayout, col: number, row: number) {
  return layout.cells.find((c) => c.col === col && c.row === row);
}

/** Cells a card would cover if anchored at `anchor` (top/left cell). Null if off the grid. */
export function footprint(layout: InventoryLayout, anchor: string, size: 1 | 2, vertical = false): string[] | null {
  const a = layout.cells.find((c) => c.id === anchor);
  if (!a) return null;
  if (size === 1) return [a.id];
  const b = vertical ? cellAt(layout, a.col, a.row + 1) : cellAt(layout, a.col + 1, a.row);
  return b ? [a.id, b.id] : null;
}

export function cellsOf(inv: Inventory, uid: string): string[] {
  return Object.keys(inv.cells).filter((id) => inv.cells[id] === uid);
}

export function canPlace(inv: Inventory, layout: InventoryLayout, uid: string, anchor: string, vertical = false): boolean {
  const card = inv.cards[uid];
  if (!card) return false;
  const cells = footprint(layout, anchor, card.size, vertical);
  return cells !== null && cells.every((id) => inv.cells[id] === null || inv.cells[id] === uid);
}

function detach(inv: Inventory, uid: string) {
  for (const id of cellsOf(inv, uid)) inv.cells[id] = null;
  inv.overflow = inv.overflow.filter((u) => u !== uid);
}

/** Move a card already in the inventory to a grid position. */
export function place(inv: Inventory, layout: InventoryLayout, uid: string, anchor: string, vertical = false) {
  if (!canPlace(inv, layout, uid, anchor, vertical)) throw new Error("That doesn't fit there.");
  const card = inv.cards[uid];
  detach(inv, uid);
  for (const id of footprint(layout, anchor, card.size, vertical)!) inv.cells[id] = uid;
  if (card.size === 2) card.vertical = vertical;
}

/** Move a card out of the grid. Anything here makes the creature encumbered. */
export function toOverflow(inv: Inventory, uid: string) {
  if (!inv.cards[uid]) return;
  detach(inv, uid);
  inv.overflow.push(uid);
}

/** Where a card prefers to go, best first. Each entry is [anchor, vertical]. */
function preferredSpots(layout: InventoryLayout, card: CardInstance): [string, boolean][] {
  const spots: [string, boolean][] = [];
  const def = card.kind !== "condition" && card.defId !== "custom" ? item(card.defId) : null;
  if (def?.armour?.class === "light") spots.push(["offPaw", false]);
  if (def?.armour?.class === "heavy") spots.push(["body1", true]);
  if (def?.weapon) spots.push(card.size === 2 ? ["mainPaw", true] : ["mainPaw", false], ["offPaw", false]);
  if (card.kind === "ammo") spots.push(["body1", false], ["body2", false]);
  const pack = layout.cells.filter((c) => c.zone === "pack");
  for (const c of pack) spots.push([c.id, false]);
  if (card.size === 2) for (const c of pack) spots.push([c.id, true]);
  // Conditions and odd items may also fill any remaining slot.
  for (const c of layout.cells) spots.push([c.id, false], [c.id, true]);
  return spots;
}

/** Add a new card, placing it in the best free spot or overflow if nothing fits. */
export function addCard(inv: Inventory, layout: InventoryLayout, card: CardInstance): "placed" | "overflow" {
  inv.cards[card.uid] = card;
  inv.overflow.push(card.uid);
  for (const [anchor, vertical] of preferredSpots(layout, card)) {
    if (canPlace(inv, layout, card.uid, anchor, vertical)) {
      place(inv, layout, card.uid, anchor, vertical);
      return "placed";
    }
  }
  return "overflow";
}

export function removeCard(inv: Inventory, uid: string) {
  detach(inv, uid);
  delete inv.cards[uid];
}

/** Marks usage. Returns true when the item just became depleted. */
export function markUsage(inv: Inventory, uid: string, n = 1): boolean {
  const card = inv.cards[uid];
  if (!card || card.dots === 0) return false;
  const was = card.used;
  card.used = Math.min(card.dots, card.used + n);
  return was < card.dots && card.used >= card.dots;
}

export function clearUsage(inv: Inventory, uid: string, n = Infinity) {
  const card = inv.cards[uid];
  if (card) card.used = Math.max(0, card.used - n);
}

export const isDepleted = (card: CardInstance) => card.dots > 0 && card.used >= card.dots;

/** Cards counted against the creature, excluding conditions held in Grit. */
export function isEncumbered(inv: Inventory, grit: string[] = []): boolean {
  return inv.overflow.some((uid) => !grit.includes(uid));
}

export function conditionsIn(inv: Inventory, grit: string[] = []): CardInstance[] {
  return Object.values(inv.cards).filter((c) => c.kind === "condition" && !grit.includes(c.uid));
}

/** Damage reduction from armour worn in its proper slots. */
export function armourDefence(inv: Inventory): number {
  let total = 0;
  for (const card of Object.values(inv.cards)) {
    if (card.kind !== "armour" || isDepleted(card)) continue;
    const armour = item(card.defId).armour!;
    const cells = cellsOf(inv, card.uid);
    const worn =
      armour.class === "light"
        ? cells.includes("offPaw") && cells.some((c) => c.startsWith("body"))
        : cells.includes("body1") && cells.includes("body2");
    if (worn) total += armour.defence;
  }
  return total;
}

/** Weapons currently held in paws, with the damage die they roll there. */
export function wieldedWeapons(inv: Inventory): { card: CardInstance; damage: string }[] {
  const main = inv.cells.mainPaw ? inv.cards[inv.cells.mainPaw] : null;
  const off = inv.cells.offPaw ? inv.cards[inv.cells.offPaw] : null;
  const out: { card: CardInstance; damage: string }[] = [];
  for (const card of new Set([main, off])) {
    if (!card || card.kind !== "weapon" || isDepleted(card)) continue;
    const w = item(card.defId).weapon!;
    const bothPaws = card.size === 2 || (card === main && off === null);
    out.push({ card, damage: bothPaws && w.bothPawsDamage ? w.bothPawsDamage : w.damage });
  }
  return out;
}

/** Pips carried beyond pockets (250) need one purse each. */
export function pipCapacity(inv: Inventory): number {
  const purses = Object.values(inv.cards).filter((c) => c.kind === "purse").length;
  return 250 * (1 + purses);
}
