import type { Birthsign } from "../rules/types";

export const BIRTHSIGNS: Birthsign[] = [
  { sign: "Star", disposition: "Brave / Reckless" },
  { sign: "Wheel", disposition: "Industrious / Unimaginative" },
  { sign: "Acorn", disposition: "Inquisitive / Stubborn" },
  { sign: "Storm", disposition: "Generous / Wrathful" },
  { sign: "Moon", disposition: "Wise / Mysterious" },
  { sign: "Mother", disposition: "Nurturing / Worrying" },
];

export const COAT_COLORS = ["Chocolate", "Black", "White", "Tan", "Grey", "Blue"];
export const COAT_PATTERNS = ["Solid", "Brindle", "Patchy", "Banded", "Marbled", "Flecked"];

/** Physical details keyed by d66 result. */
export const LOOKS: Record<number, string> = {
  11: "Scarred body", 12: "Corpulent body", 13: "Skeletal body", 14: "Willowy body", 15: "Tiny body", 16: "Massive body",
  21: "War paint", 22: "Foreign clothes", 23: "Elegant clothes", 24: "Patched clothes", 25: "Fashionable clothes", 26: "Unwashed clothes",
  31: "Missing ear", 32: "Lumpy face", 33: "Beautiful face", 34: "Round face", 35: "Delicate face", 36: "Elongated face",
  41: "Groomed fur", 42: "Dreadlocks", 43: "Dyed fur", 44: "Shaved fur", 45: "Frizzy fur", 46: "Silky fur",
  51: "Night black eyes", 52: "Eye patch", 53: "Blood red eyes", 54: "Wise eyes", 55: "Sharp eyes", 56: "Luminous eyes",
  61: "Cropped tail", 62: "Whip-like tail", 63: "Tufted tail", 64: "Stubby tail", 65: "Prehensile tail", 66: "Curly tail",
};

/** d100 */
export const BIRTHNAMES = [
  "Ada", "Agate", "Agnes", "Aloe", "April", "Azalea", "Bay", "Belladonna", "Blossom", "Brie",
  "Brynn", "Cherry", "Claire", "Crocus", "Dahlia", "Daisy", "Else", "Emerald", "Erin", "Grace",
  "Gwendoline", "Hazel", "Heather", "Hette", "Holly", "Hyacinth", "Iris", "Juniper", "Lavender", "Lily",
  "Magnolia", "Marigold", "Marjoram", "Myrtle", "Odette", "Olive", "Opal", "Pearl", "Pepper", "Poppy",
  "Rosemary", "Rue", "Saffron", "Sandy", "Sassafras", "Shale", "Susan", "Thistle", "Violet", "Willow",
  "Alder", "Ambrose", "Anise", "Annotto", "August", "Avens", "Basil", "Beryl", "Birch", "Boldo",
  "Bill", "Burdock", "Butter", "Cassia", "Chicory", "Clive", "Colby", "Dill", "Dock", "Eared",
  "Edmund", "Elmer", "Ernest", "Fennel", "Festus", "Francis", "Gil", "Hawthorn", "Heath", "Horatio",
  "Jack", "Jasper", "Konrad", "Larkspur", "Laurel", "Lorenz", "Mace", "Oliver", "Orin", "Reepicheep",
  "Rowan", "Simon", "Sorrel", "Stilton", "Tarragon", "Warren", "Wattle", "Whitacre", "Wormwood", "Yarrow",
];

/** d20 */
export const MATRINAMES = [
  "Baiter", "Black", "Buckthorne", "Burley", "Butterball", "Catreizen", "Danger", "Deerider", "Grant", "Halva",
  "Maker", "Pipp", "Seedfall", "Snow", "Summerholme", "Thorne", "Tunneler", "White", "Winterholme", "Witter",
];
