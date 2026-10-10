import type { CardInstance } from "../shared/rules/types";
import { ICONS, ICON_SIZE, type IconName } from "./icons.gen";

export function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  return <svg viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} className={className} aria-hidden="true" dangerouslySetInnerHTML={{ __html: ICONS[name] }} />;
}

const ITEM_ICONS: Record<string, IconName> = {
  improvised: "wood-stick",
  needle: "sewing-needle",
  dagger: "plain-dagger",
  sword: "broadsword",
  axe: "battle-axe",
  mace: "flanged-mace",
  hammer: "claw-hammer",
  pickaxe: "war-pick",
  spear: "spear-feather",
  warhammer: "warhammer",
  hookarm: "spear-hook",
  trashhook: "pirate-hook",
  sling: "sling",
  bow: "pocket-bow",
  stones: "stone-pile",
  arrows: "quiver",
  "light-armour": "leather-armor",
  "shield-jerkin": "leather-armor",
  "heavy-armour": "breastplate",
  "lead-coat": "breastplate",
  torches: "torch",
  lantern: "old-lantern",
  "electric-lantern": "light-bulb",
  rations: "cheese-wedge",
  "dried-mushroom": "mushroom",
  cheese: "cheese-wedge",
  "pip-purse": "shiny-purse",
};

const CONDITION_ICONS: Record<string, IconName> = {
  exhausted: "sleepy",
  frightened: "terror",
  hungry: "stomach",
  injured: "broken-bone",
  drained: "brain-leak",
};

export function cardIcon(card: Pick<CardInstance, "kind" | "defId">): IconName {
  if (card.kind === "condition") return CONDITION_ICONS[card.defId] ?? "hazard-sign";
  if (card.kind === "spell") return "rune-stone";
  return ITEM_ICONS[card.defId] ?? "knapsack";
}
