import { CONDITIONS } from "../../shared/data/conditions";
import { ITEMS } from "../../shared/data/items";
import type { CardInstance } from "../../shared/rules/types";

const CLASS_LABEL: Record<string, string> = {
  improvised: "Improvised",
  light: "Light",
  medium: "Medium",
  heavy: "Heavy",
  lightRanged: "Light ranged",
  heavyRanged: "Heavy ranged",
};

export interface CardFace {
  /** Big corner stat, e.g. "d6/d8" or "1 def". */
  stat?: string;
  /** Small caption, e.g. "Medium" or "Clear: After long rest". */
  caption?: string;
  /** Extra line for conditions. */
  effect?: string;
  icon: string;
}

const ICONS: Record<string, string> = {
  weapon: "⚔️",
  armour: "🛡️",
  ammo: "🎯",
  light: "🕯️",
  ration: "🧀",
  purse: "👛",
  spell: "🪨",
  gear: "🎒",
  condition: "⚠️",
};

export function cardFace(card: CardInstance): CardFace {
  const icon = ICONS[card.kind] ?? "🎒";
  if (card.kind === "condition") {
    const def = CONDITIONS[card.defId];
    return { icon, caption: `Clear: ${def?.clearText ?? card.note ?? "—"}`, effect: def?.effect };
  }
  const def = ITEMS[card.defId];
  if (def?.weapon) {
    const w = def.weapon;
    return { icon, stat: w.bothPawsDamage ? `${w.damage}/${w.bothPawsDamage}` : w.damage, caption: CLASS_LABEL[w.class] };
  }
  if (def?.armour) return { icon, stat: `${def.armour.defence} def`, caption: def.armour.class === "light" ? "Light armour" : "Heavy armour" };
  if (def?.kind === "ammo") return { icon, caption: "Ammunition" };
  return { icon, caption: card.note };
}
