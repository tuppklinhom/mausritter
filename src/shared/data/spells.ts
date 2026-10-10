export interface SpellDef {
  id: string;
  name: string;
  /** Effect text; [SUM] and [DICE] are filled in when cast. */
  effect: string;
  recharge: string;
}

/** Keyed by 2d8 roll (2–16). */
export const SPELL_TABLE: Record<number, string> = {
  2: "fireball", 3: "heal", 4: "magic-missile", 5: "fear", 6: "darkness", 7: "restore", 8: "be-understood",
  9: "ghost-beetle", 10: "light", 11: "invisible-ring", 12: "knock", 13: "grease", 14: "grow",
  15: "invisibility", 16: "catnip",
};

const list: SpellDef[] = [
  { id: "fireball", name: "Fireball", effect: "Shoot a fireball up to 24\". Deal [SUM] + [DICE] damage to all creatures within 6\".", recharge: "Burn in the heart of a raging fire for three days and nights." },
  { id: "heal", name: "Heal", effect: "Heal [SUM] STR damage and remove the Injured Condition from a creature.", recharge: "Cut self for d6 STR damage, sprinkle the spell with the blood." },
  { id: "magic-missile", name: "Magic Missile", effect: "Deal [SUM] + [DICE] damage to a creature within sight.", recharge: "Drop from a height of at least 30ft. Touch the spell within one Turn." },
  { id: "fear", name: "Fear", effect: "Give the Frightened Condition to [DICE] creatures.", recharge: "Receive the Frightened Condition from a hostile creature while carrying the spell." },
  { id: "darkness", name: "Darkness", effect: "Create a [SUM] x 2\" diameter sphere of pure darkness for [DICE] Turns.", recharge: "Leave uncovered in a lightless place for three days." },
  { id: "restore", name: "Restore", effect: "Remove Exhausted or Frightened Condition from [DICE] + 1 creatures.", recharge: "Bury in a peaceful field or riverbank for three days." },
  { id: "be-understood", name: "Be Understood", effect: "Make your meaning clear to [DICE] creatures of another species for [DICE] Turns.", recharge: "Give away freely to a creature of another species." },
  { id: "ghost-beetle", name: "Ghost Beetle", effect: "Create an illusory beetle that can carry 6 inventory slots for [DICE] x 6 Turns.", recharge: "Bury in a beetle graveyard for three nights." },
  { id: "light", name: "Light", effect: "Force [DICE] creatures to make a WIL save or become stunned. Alternately, create light as bright as a torch for [SUM] turns.", recharge: "Catch in the first light of a sunrise and the last light of sunset for three days." },
  { id: "invisible-ring", name: "Invisible Ring", effect: "Creates [DICE] x 6\" ring of force. It is invisible and immovable. Lasts [DICE] Turns.", recharge: "Build an iron ring the same size as last cast. Pass the spell through it. Dissolves the ring." },
  { id: "knock", name: "Knock", effect: "Open a door or container, as if a Save were made with STR score of 10 + [DICE] x 4.", recharge: "Put in a locked box, inside a locked box, inside a locked box. Leave for three days." },
  { id: "grease", name: "Grease", effect: "Cover [DICE] x 6\" area in slippery, flammable grease. Creatures in the area must make a DEX save or fall prone.", recharge: "Rub all over in animal fat. Leave until it putrefies." },
  { id: "grow", name: "Grow", effect: "Grow a creature to [DICE] + 1 times its original size for 1 Turn.", recharge: "Leave in the highest branches of a tall tree for three days." },
  { id: "invisibility", name: "Invisibility", effect: "Make creature invisible for [DICE] Turns. Any movement reduces duration by 1 Turn.", recharge: "Go a day without opening your eyes once, while holding the spell." },
  { id: "catnip", name: "Catnip", effect: "Turn object into an irresistible lure for cats. Lasts [DICE] Turns.", recharge: "Give a cat a gift it truly desires." },
];

export const SPELLS: Record<string, SpellDef> = Object.fromEntries(list.map((s) => [s.id, s]));
