export interface Backdrop {
  id: string;
  name: string;
  /** Image file under /scenes, or a CSS background for drawn moods. */
  src?: string;
  css?: string;
  suggestedAmbience: string;
}

/** Painted landscapes (CC0, see CREDITS.md) and drawn moods for places without art. */
export const BACKDROPS: Backdrop[] = [
  { id: "meadow", name: "Meadow's edge", src: "/scenes/meadow.webp", suggestedAmbience: "meadow" },
  { id: "grassland", name: "Tall grass", src: "/scenes/grassland.webp", suggestedAmbience: "meadow" },
  { id: "path", name: "Country path", src: "/scenes/path.webp", suggestedAmbience: "meadow" },
  { id: "forest", name: "Deep forest", src: "/scenes/forest.webp", suggestedAmbience: "forest" },
  { id: "stream", name: "Streambed", src: "/scenes/stream.webp", suggestedAmbience: "river" },
  { id: "pond", name: "Murky pond", src: "/scenes/pond.webp", suggestedAmbience: "river" },
  { id: "boulders", name: "Boulder field", src: "/scenes/boulders.webp", suggestedAmbience: "wind" },
  { id: "crags", name: "Crags", src: "/scenes/crags.webp", suggestedAmbience: "wind" },
  { id: "valley", name: "Cliff valley", src: "/scenes/valley.webp", suggestedAmbience: "forest" },
  { id: "ruins", name: "Old ruins", src: "/scenes/ruins.webp", suggestedAmbience: "wind" },
  { id: "farmstead", name: "Human farmstead", src: "/scenes/farmstead.webp", suggestedAmbience: "meadow" },
  { id: "storm", name: "Storm clouds", src: "/scenes/storm.webp", suggestedAmbience: "storm" },
  { id: "winter-forest", name: "Winter forest", src: "/scenes/winter-forest.webp", suggestedAmbience: "wind" },
  { id: "snowfield", name: "Snowfield", src: "/scenes/snowfield.webp", suggestedAmbience: "wind" },
  { id: "frozen-stream", name: "Frozen stream", src: "/scenes/frozen-stream.webp", suggestedAmbience: "wind" },
  { id: "cavern", name: "Cavern", src: "/scenes/cavern.webp", suggestedAmbience: "cave" },
  {
    id: "mood:hall",
    name: "Candlelit hall",
    css: "radial-gradient(ellipse at 50% 70%, #f0a948 0%, #8a4b1f 28%, #3a2012 60%, #120a05 100%)",
    suggestedAmbience: "hearth",
  },
  {
    id: "mood:tunnel",
    name: "Dark tunnel",
    css: "radial-gradient(ellipse at 50% 55%, #3b3328 0%, #1d1812 35%, #070504 80%)",
    suggestedAmbience: "cave",
  },
  {
    id: "mood:night",
    name: "Starry night",
    css: "radial-gradient(1px 1px at 20% 30%, #fff 50%, transparent), radial-gradient(1px 1px at 70% 20%, #fff 50%, transparent), radial-gradient(1.5px 1.5px at 40% 60%, #ffe 50%, transparent), radial-gradient(1px 1px at 85% 45%, #fff 50%, transparent), radial-gradient(1px 1px at 10% 75%, #fff 50%, transparent), radial-gradient(ellipse at 50% 120%, #2c3d5c 0%, #0b1120 55%, #03050a 100%)",
    suggestedAmbience: "night",
  },
  {
    id: "mood:settlement",
    name: "Mouse settlement",
    css: "radial-gradient(ellipse at 30% 80%, #d98f3c 0%, transparent 35%), radial-gradient(ellipse at 75% 75%, #c97a2e 0%, transparent 30%), linear-gradient(#4a5a6e 0%, #2f2a28 60%, #1a1310 100%)",
    suggestedAmbience: "hearth",
  },
];

export function backdropById(id: string): Backdrop | undefined {
  return BACKDROPS.find((b) => b.id === id);
}

export const AMBIENCES: { id: string; name: string }[] = [
  { id: "none", name: "Silence" },
  { id: "meadow", name: "Meadow (breeze, birds)" },
  { id: "forest", name: "Forest (wind in leaves, birds)" },
  { id: "river", name: "River" },
  { id: "rain", name: "Rain" },
  { id: "storm", name: "Storm" },
  { id: "wind", name: "Howling wind" },
  { id: "cave", name: "Cave (drips, drone)" },
  { id: "hearth", name: "Hearth (crackling fire)" },
  { id: "night", name: "Night (crickets)" },
];

/** Creature icons the GM can give NPCs. */
export const CREATURE_ICONS = [
  "cat", "owl", "frog", "toad-teeth", "spider-face", "centipede", "snake", "raven", "rat", "scarab-beetle",
  "fairy", "ghost", "bat", "fox-head", "earth-worm", "hood", "bee", "ant", "hedgehog", "lizard-tongue",
  "squirrel", "rabbit-head", "mole", "dragonfly", "snail", "butterfly", "heron", "badger", "cultist",
  "wizard-face", "crown",
];
