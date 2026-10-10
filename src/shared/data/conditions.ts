import type { ConditionDef } from "../rules/types";

const list: ConditionDef[] = [
  { id: "exhausted", name: "Exhausted", clear: "long", clearText: "After long rest" },
  {
    id: "frightened",
    name: "Frightened",
    clear: "short",
    clearText: "After short rest",
    effect: "WIL save to approach source of fear.",
  },
  { id: "hungry", name: "Hungry", clear: "meal", clearText: "After meal" },
  {
    id: "injured",
    name: "Injured",
    clear: "full",
    clearText: "After full rest",
    effect: "Disadvantage on STR & DEX saves.",
    disadvantage: ["str", "dex"],
  },
  {
    id: "drained",
    name: "Drained",
    clear: "full",
    clearText: "After full rest",
    effect: "Disadvantage on WIL saves.",
    disadvantage: ["wil"],
  },
];

export const CONDITIONS: Record<string, ConditionDef> = Object.fromEntries(list.map((c) => [c.id, c]));
