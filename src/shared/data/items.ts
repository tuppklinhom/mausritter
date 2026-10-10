import type { ItemDef, WeaponClass } from "../rules/types";

const WEAPON_STATS: Record<WeaponClass, { size: 1 | 2; damage: string; bothPawsDamage?: string; cost: number }> = {
  improvised: { size: 1, damage: "d6", cost: 1 },
  light: { size: 1, damage: "d6", cost: 10 },
  medium: { size: 1, damage: "d6", bothPawsDamage: "d8", cost: 20 },
  heavy: { size: 2, damage: "d10", cost: 40 },
  lightRanged: { size: 1, damage: "d6", cost: 10 },
  heavyRanged: { size: 2, damage: "d8", cost: 40 },
};

function weapon(id: string, name: string, cls: WeaponClass): ItemDef {
  const s = WEAPON_STATS[cls];
  return {
    id,
    name,
    kind: "weapon",
    size: s.size,
    dots: 3,
    cost: s.cost,
    weapon: { class: cls, damage: s.damage, bothPawsDamage: s.bothPawsDamage },
    note: cls === "improvised" ? "Always mark usage after a fight." : undefined,
  };
}

function gear(id: string, name: string, cost?: number, note?: string): ItemDef {
  return { id, name, kind: "gear", size: 1, dots: 3, cost, note };
}

function spell(id: string, name: string): ItemDef {
  return { id: `spell-${id}`, name: `Spell: ${name}`, kind: "spell", size: 1, dots: 3, spellId: id };
}

const list: ItemDef[] = [
  // Weapons
  weapon("improvised", "Improvised weapon", "improvised"),
  weapon("needle", "Needle", "light"),
  weapon("dagger", "Dagger", "light"),
  weapon("sword", "Sword", "medium"),
  weapon("axe", "Axe", "medium"),
  weapon("mace", "Mace", "medium"),
  weapon("hammer", "Hammer", "medium"),
  weapon("pickaxe", "Pickaxe", "medium"),
  weapon("spear", "Spear", "heavy"),
  weapon("warhammer", "Warhammer", "heavy"),
  weapon("hookarm", "Hookarm", "heavy"),
  weapon("trashhook", "Trashhook", "heavy"),
  weapon("sling", "Sling", "lightRanged"),
  weapon("bow", "Bow", "heavyRanged"),

  // Ammunition
  { id: "stones", name: "Stones, pouch", kind: "ammo", size: 1, dots: 3, cost: 1, note: "Body slot" },
  { id: "arrows", name: "Arrows, quiver", kind: "ammo", size: 1, dots: 3, cost: 5, note: "Body slot" },

  // Armour
  {
    id: "light-armour",
    name: "Light armour",
    kind: "armour",
    size: 2,
    dots: 3,
    cost: 150,
    armour: { class: "light", defence: 1 },
    note: "Off paw and one body slot",
  },
  { id: "shield-jerkin", name: "Shield & jerkin", kind: "armour", size: 2, dots: 3, cost: 150, armour: { class: "light", defence: 1 }, note: "Light armour. Off paw and one body slot" },
  {
    id: "heavy-armour",
    name: "Heavy armour",
    kind: "armour",
    size: 2,
    dots: 3,
    cost: 500,
    armour: { class: "heavy", defence: 1 },
    note: "Two body slots",
  },
  { id: "lead-coat", name: "Lead coat", kind: "armour", size: 2, dots: 3, cost: 500, armour: { class: "heavy", defence: 1 }, note: "Heavy armour. Two body slots" },

  // Essentials
  { id: "torches", name: "Torches", kind: "light", size: 1, dots: 3, cost: 10, note: "Mark usage every 6 Turns." },
  { id: "lantern", name: "Lantern", kind: "light", size: 1, dots: 3, cost: 50, note: "Mark usage every 6 Turns. Refill with oil." },
  { id: "electric-lantern", name: "Electric lantern", kind: "light", size: 1, dots: 6, cost: 200, note: "Mark usage every 6 Turns. Recharge with batteries." },
  { id: "rations", name: "Rations", kind: "ration", size: 1, dots: 3, cost: 5, note: "Eat and rest a Watch to heal all HP." },
  { id: "dried-mushroom", name: "Dried mushroom", kind: "ration", size: 1, dots: 3, note: "As rations." },
  { id: "pip-purse", name: "Pip purse", kind: "purse", size: 1, dots: 0, note: "Holds 250 pips." },

  // Tools, mouse made
  gear("bedroll", "Bedroll", 10),
  gear("bellows", "Bellows", 10),
  gear("book-blank", "Book, blank", 300),
  gear("book-reading", "Book, reading", 600),
  gear("bottle", "Bottle", 1),
  gear("bucket", "Bucket", 5),
  gear("caltrops", "Caltrops, bag", 10),
  gear("chalk", "Chalk", 1),
  gear("chisel", "Chisel", 5),
  gear("cookpots", "Cookpots", 10),
  gear("crowbar", "Crowbar", 10),
  gear("drill", "Drill", 10),
  gear("glue", "Glue", 5),
  gear("grease", "Grease", 5),
  gear("horn", "Horn", 10),
  gear("hourglass", "Hourglass", 300),
  gear("lockpicks", "Lockpicks", 100),
  gear("metal-file", "Metal file", 5),
  gear("mirror", "Mirror", 200),
  gear("musical-instrument", "Musical instrument", 200),
  gear("net", "Net", 10),
  gear("padlock-small", "Padlock and key, small", 20),
  gear("perfume", "Perfume", 50),
  gear("pick", "Pick", 10),
  gear("loaded-dice", "Set of loaded dice", 5),
  gear("shovel", "Shovel", 10),
  gear("tent", "Tent", 80),
  gear("waterskin", "Waterskin", 5),
  gear("whistle", "Whistle", 5),
  gear("pole", 'Wooden pole, 6"', 1),
  gear("wooden-spikes", "Wooden spikes", 1),
  gear("oil", "Oil, for lantern", 10),
  gear("batteries", "Batteries, for electric lantern", 50),

  // Tools, human made
  gear("fishhook", "Fishhook", 20),
  gear("incense", "Incense stick", 20),
  gear("lens", "Lens", 200),
  gear("necklace-chain", "Necklace chain", 40),
  gear("matches", "Matches, packet", 80),
  gear("padlock-large", "Padlock and key, large", 100),
  gear("twine", "Twine, roll", 40),
  gear("soap", "Soap, small block", 10),
  gear("thread", "Thread, spool", 20),
  gear("mouse-trap", "Mouse trap", 100),
  gear("poison", "Poison", 100),

  // Background-only curiosities
  gear("shears", "Shears"),
  gear("milk", "Bottle of milk"),
  gear("coffee", "Flask of coffee"),
  gear("holy-symbol", "Holy symbol"),
  gear("ale-barrel", "Small barrel of ale"),
  gear("wire", "Wire, spool"),
  gear("bat-teeth", "Bag of bat teeth"),
  gear("noble-iou", "20p IOU from a noblemouse"),
  gear("chain", 'Chain, 6"'),
  gear("goggles", "Goggles"),
  gear("spore-mask", "Spore mask"),
  gear("quill-ink", "Quill & ink"),
  gear("compass", "Compass"),
  gear("cheese", "Block of cheese"),
  gear("treasure-map", "Treasure map, dubious"),
  gear("sealed-documents", "Documents, sealed"),
  gear("disguise-kit", "Disguise kit"),
  gear("honey", "Jar of honey"),
  gear("obscure-book", "Scrap of obscure book"),
  gear("felt-hat", "Felt hat"),

  // Spell tablets
  spell("fireball", "Fireball"),
  spell("heal", "Heal"),
  spell("magic-missile", "Magic Missile"),
  spell("fear", "Fear"),
  spell("darkness", "Darkness"),
  spell("restore", "Restore"),
  spell("be-understood", "Be Understood"),
  spell("ghost-beetle", "Ghost Beetle"),
  spell("light", "Light"),
  spell("invisible-ring", "Invisible Ring"),
  spell("knock", "Knock"),
  spell("grease", "Grease"),
  spell("grow", "Grow"),
  spell("invisibility", "Invisibility"),
  spell("catnip", "Catnip"),
];

export const ITEMS: Record<string, ItemDef> = Object.fromEntries(list.map((i) => [i.id, i]));

export function item(id: string): ItemDef {
  const def = ITEMS[id];
  if (!def) throw new Error(`Unknown item "${id}"`);
  return def;
}

/** Weapons a new mouse may choose from ("a weapon of your choice"). */
export const STARTING_WEAPONS = ["needle", "dagger", "sword", "axe", "mace", "spear", "warhammer", "hookarm", "sling", "bow"];
