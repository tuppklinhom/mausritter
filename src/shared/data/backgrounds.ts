/** A background grants either an item from the catalog or a hireling. */
export type Grant = { item: string } | { hireling: string };

export interface Background {
  hp: number;
  pips: number;
  name: string;
  a: Grant;
  b: Grant;
}

const i = (item: string): Grant => ({ item });
const h = (hireling: string): Grant => ({ hireling });

// Rows: HP 1–6, columns: pips 1–6.
const TABLE: [string, Grant, Grant][][] = [
  [
    ["Test subject", i("spell-magic-missile"), i("lead-coat")],
    ["Kitchen forager", i("shield-jerkin"), i("cookpots")],
    ["Cage dweller", i("spell-be-understood"), i("milk")],
    ["Hedge witch", i("spell-heal"), i("incense")],
    ["Leatherworker", i("shield-jerkin"), i("shears")],
    ["Street tough", i("dagger"), i("coffee")],
  ],
  [
    ["Mendicant priest", i("spell-restore"), i("holy-symbol")],
    ["Beetleherd", h("Loyal beetle"), i("pole")],
    ["Ale brewer", h("Drunken torchbearer"), i("ale-barrel")],
    ["Fishermouse", i("net"), i("needle")],
    ["Blacksmith", i("hammer"), i("metal-file")],
    ["Wireworker", i("wire"), i("electric-lantern")],
  ],
  [
    ["Woodcutter", i("axe"), i("twine")],
    ["Bat cultist", i("spell-darkness"), i("bat-teeth")],
    ["Tin miner", i("pickaxe"), i("lantern")],
    ["Trash collector", i("trashhook"), i("mirror")],
    ["Wall rover", i("fishhook"), i("thread")],
    ["Merchant", h("Pack rat"), i("noble-iou")],
  ],
  [
    ["Raft crew", i("hammer"), i("wooden-spikes")],
    ["Worm wrangler", i("pole"), i("soap")],
    ["Sparrow rider", i("fishhook"), i("goggles")],
    ["Sewer guide", i("metal-file"), i("thread")],
    ["Prison guard", i("chain"), i("spear")],
    ["Fungus farmer", i("dried-mushroom"), i("spore-mask")],
  ],
  [
    ["Dam builder", i("shovel"), i("wooden-spikes")],
    ["Cartographer", i("quill-ink"), i("compass")],
    ["Trap thief", i("cheese"), i("glue")],
    ["Vagabond", i("tent"), i("treasure-map")],
    ["Grain farmer", i("spear"), i("whistle")],
    ["Message runner", i("bedroll"), i("sealed-documents")],
  ],
  [
    ["Troubadour", i("musical-instrument"), i("disguise-kit")],
    ["Gambler", i("loaded-dice"), i("mirror")],
    ["Sap tapper", i("bucket"), i("wooden-spikes")],
    ["Bee keeper", i("honey"), i("net")],
    ["Librarian", i("obscure-book"), i("quill-ink")],
    ["Pauper noblemouse", i("felt-hat"), i("perfume")],
  ],
];

export const BACKGROUNDS: Background[] = TABLE.flatMap((row, hpIdx) =>
  row.map(([name, a, b], pipIdx) => ({ hp: hpIdx + 1, pips: pipIdx + 1, name, a, b })),
);

export function background(hp: number, pips: number): Background {
  return BACKGROUNDS[(hp - 1) * 6 + (pips - 1)];
}
