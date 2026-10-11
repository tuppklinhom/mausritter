export type HexType = "countryside" | "forest" | "river" | "town" | "settlement";

export const HEX_TYPES: { id: HexType; name: string }[] = [
  { id: "countryside", name: "Countryside" },
  { id: "forest", name: "Forest" },
  { id: "river", name: "River" },
  { id: "town", name: "Human town" },
  { id: "settlement", name: "Mouse settlement" },
];

/** d6 hex type: 1–2 countryside, 3–4 forest, 5 river, 6 human town. */
export function hexTypeFor(d6: number): HexType {
  return d6 <= 2 ? "countryside" : d6 <= 4 ? "forest" : d6 === 5 ? "river" : "town";
}

/** d20 landmarks by hex type. */
export const LANDMARKS: Record<Exclude<HexType, "settlement">, string[]> = {
  countryside: [
    "Anthill", "Beech, lightning split", "Bone-white tree", "Cow skeleton", "Field of flowers", "Field of wheat",
    "Hedge row", "Hollow tree stump", "Huge flat rock", "Lily-lined pond", "Massive fallen tree", "Old craggy oak",
    "Old farmhouse", "Quiet dirt road", "Rabbit warren", "Sparrow nest", "Stand of pine trees", "Steep hill",
    "Stone wall", "Tangle of fig roots",
  ],
  forest: [
    "Abandoned shack", "Bright clearing", "Cascading waterfalls", "Cliff face", "Cold, fresh spring", "Dense underbrush",
    "Face in ancient oak", "Fox hole", "Grove of ferns", "Hollow tree stump", "Huge pine tree", "Human walking track",
    "Human-made clearing", "Meandering brook", "Overgrown ruins", "Ring of stones", "Rocky outcropping", "Sunken hollow",
    "Tangle of roots", "Termite-riddled tree",
  ],
  river: [
    "Canal lock", "Converging tributaries", "Draping willow", "Eroded riverbank", "Fallen tree crossing", "High waterfall",
    "Huge boulder", "Huge concrete dam", "Isolated island", "Muddy flats", "Rocky rapids", "Row of dead trees",
    "Silty dam", "Stepping-stones", "Stone bridge", "Stony shallows", "Submerged trash", "Sunken barge",
    "Twisted roots", "Wooden bridge",
  ],
  town: [
    "Abandoned car", "Apartment balcony", "Blackberry hedge", "Busy road", "Drainpipe outlet", "Dumped furniture",
    "Greenhouse", "Mouse ruins", "Newly built house", "Overgrown garden bed", "Pigeon nest", "Pile of trash",
    "Rocky riverbed", "Shopping trolley", "Stagnant pond", "Steel bridge", "Trash-filled skip", "Tree-lined footpath",
    "Underground car park", "Woodshed",
  ],
};

/** Landmark details: d6 picks the row, d8 the entry (row 1 is always a mouse settlement). */
export const LANDMARK_DETAILS: string[][] = [
  ["Mouse settlement"],
  [
    "Small mouse farm (What threatens their crops?)",
    "Noblemouse's castle (What does it defend against?)",
    "Friendly mouse roadhouse (What is in the basement?)",
    "Mouse hunting lodge (What is their quarry?)",
    "Mining outpost (What have they uncovered?)",
    "Mouse hermit's hut (Why do they shun society?)",
    "Natural caves (What is living here?)",
    "Hedge-knight's tower (What is their quest?)",
  ],
  [
    "Songbird's nest (What sad tales do they sing of?)",
    "Tribe of huge, peaceful beasts (What do they fear?)",
    "Rat bandit hideout (Who do they prey on?)",
    "Crow coven's spire (What spells do they caw?)",
    "Hive of insects (What do they hunger for?)",
    "Den of a great predator (What treasure do they guard?)",
    "Frog fortress (What lies hidden in the dungeon?)",
    "Mouse wizard's tower (What spell is almost finished?)",
  ],
  [
    "Dangerous natural feature (How can it be avoided?)",
    "Lonely shrine (Who maintains it? What do they worship?)",
    "Noblemouse's manor (Why was it abandoned?)",
    "Abandoned settlement (What clues did they leave?)",
    "Ruined watchtower (What did it guard from?)",
    "Natural feature, peaceful and safe (Who gathers here?)",
    "Natural feature, out of place (How did it form?)",
    "Rickety bridge (What does it cross over?)",
  ],
  [
    "Ancient bat cult temple (What was summoned?)",
    "Faerie ring (What business do the faeries have here?)",
    "Beetle graveyard (What do the ghosts want?)",
    "Mouse witch's hut (What does she brew?)",
    "Small, deep pond (What is at the bottom?)",
    "Out-of-season plantlife (Why are they growing here?)",
    "Owl sorcerer's nest (What are they searching for?)",
    "Strange magical anomaly (Why is it spreading?)",
  ],
  [
    "Crashed Lilliputian airship (How can it be repaired?)",
    "Humming stone (What happens when touched?)",
    "Completely lifeless (What disaster has occurred?)",
    "Regularly used by humans (What do they do here?)",
    "Damaged by humans (What have they done?)",
    "Ancient ruins of a past civilisation (Who built this?)",
    "Cat lord's hunting ground (What trophies remain?)",
    "Repurposed human construction (How is it used?)",
  ],
];

export const ADVENTURE_HOOKS = [
  "Searching for a lost family member",
  "Investigating on orders of a noblemouse",
  "Mouse wizard requires a certain spell component",
  "Site is lair of a creature harassing a settlement",
  "Following an inherited treasure map",
  "Seeking shelter from a terrible storm",
];
