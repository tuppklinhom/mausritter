import { background, type Background, type Grant } from "../data/backgrounds";
import { BIRTHNAMES, BIRTHSIGNS, COAT_COLORS, COAT_PATTERNS, LOOKS, MATRINAMES } from "../data/details";
import { STARTING_WEAPONS } from "../data/items";
import { defaultRng, roll, rollD66, rollDie, type Rng } from "./dice";
import { HIRELING_LAYOUT, MOUSE_LAYOUT, addCard, emptyInventory, itemCard } from "./inventory";
import { STATS, type Hireling, type Mouse, type Stat } from "./types";

/** Everything rolled for a new mouse, before it's turned into a sheet. */
export interface MouseRoll {
  stats: Record<Stat, number>;
  /** The three dice each stat came from (for the reveal animation). */
  statDice: Record<Stat, number[]>;
  hp: number;
  pips: number;
  background: string;
  /** Item grants from the background, after the low-stats bonus. */
  grants: Grant[];
  /** Second background when the highest stat is 9 or less. */
  bonus: { background: string; options: Grant[]; takeBoth: boolean } | null;
  birthsign: { sign: string; disposition: string };
  coat: { color: string; pattern: string };
  look: string;
  name: string;
}

export type RollPart = "stats" | "hpPips" | "details" | "name";

export function rollStat(rng: Rng = defaultRng) {
  const r = roll("3d6kh2", rng);
  return { value: r.total, dice: r.dice.map((d) => d.value) };
}

export function rollName(rng: Rng = defaultRng): string {
  return `${BIRTHNAMES[rollDie(100, rng) - 1]} ${MATRINAMES[rollDie(20, rng) - 1]}`;
}

function rollBonus(stats: Record<Stat, number>, rng: Rng): MouseRoll["bonus"] {
  const highest = Math.max(...STATS.map((s) => stats[s]));
  if (highest > 9) return null;
  const bg: Background = background(rollDie(6, rng), rollDie(6, rng));
  return { background: bg.name, options: [bg.a, bg.b], takeBoth: highest <= 7 };
}

/** Rolls a complete mouse. Pass `keep` to reroll only the unlocked parts. */
export function rollMouse(rng: Rng = defaultRng, keep?: { prev: MouseRoll; locked: RollPart[] }): MouseRoll {
  const locked = new Set(keep?.locked ?? []);
  const prev = keep?.prev;

  let stats: Record<Stat, number>;
  let statDice: Record<Stat, number[]>;
  if (prev && locked.has("stats")) {
    ({ stats, statDice } = prev);
  } else {
    stats = {} as Record<Stat, number>;
    statDice = {} as Record<Stat, number[]>;
    for (const s of STATS) {
      const r = rollStat(rng);
      stats[s] = r.value;
      statDice[s] = r.dice;
    }
  }

  const keepHp = prev && locked.has("hpPips");
  const hp = keepHp ? prev.hp : rollDie(6, rng);
  const pips = keepHp ? prev.pips : rollDie(6, rng);
  const bg = background(hp, pips);

  const keepDetails = prev && locked.has("details");
  return {
    stats,
    statDice,
    hp,
    pips,
    background: bg.name,
    grants: [bg.a, bg.b],
    bonus: prev && locked.has("stats") && locked.has("hpPips") ? prev.bonus : rollBonus(stats, rng),
    birthsign: keepDetails ? prev.birthsign : BIRTHSIGNS[rollDie(6, rng) - 1],
    coat: keepDetails ? prev.coat : { color: COAT_COLORS[rollDie(6, rng) - 1], pattern: COAT_PATTERNS[rollDie(6, rng) - 1] },
    look: keepDetails ? prev.look : LOOKS[rollD66(rng)],
    name: prev && locked.has("name") ? prev.name : rollName(rng),
  };
}

/** "You may then swap any two attributes." */
export function swapStats(r: MouseRoll, a: Stat, b: Stat): MouseRoll {
  const stats = { ...r.stats, [a]: r.stats[b], [b]: r.stats[a] };
  const statDice = { ...r.statDice, [a]: r.statDice[b], [b]: r.statDice[a] };
  return { ...r, stats, statDice };
}

export interface FinalizeChoices {
  weapon: string;
  /** Index into bonus.options when only one may be taken. */
  bonusPick?: 0 | 1;
  name?: string;
}

/** Hirelings granted by background (e.g. "Loyal beetle"); created separately. */
export function grantedHirelings(r: MouseRoll, choices: FinalizeChoices): string[] {
  return allGrants(r, choices).flatMap((g) => ("hireling" in g ? [g.hireling] : []));
}

function allGrants(r: MouseRoll, choices: FinalizeChoices): Grant[] {
  const grants = [...r.grants];
  if (r.bonus) grants.push(...(r.bonus.takeBoth ? r.bonus.options : [r.bonus.options[choices.bonusPick ?? 0]]));
  return grants;
}

/** Typical hireling: d6 HP, 2d6 for each stat, 6 slots (two paw, four pack). */
export function createHireling(
  ids: { id: string; employerId: string },
  type: string,
  rng: Rng = defaultRng,
): Hireling {
  const score = (v: number) => ({ max: v, cur: v });
  const stat = () => score(roll("2d6", rng).total);
  return {
    ...ids,
    name: BIRTHNAMES[rollDie(100, rng) - 1],
    type,
    look: LOOKS[rollD66(rng)],
    disposition: BIRTHSIGNS[rollDie(6, rng) - 1].disposition,
    stats: { str: stat(), dex: stat(), wil: stat() },
    hp: score(rollDie(6, rng)),
    level: 1,
    xp: 0,
    inventory: emptyInventory(HIRELING_LAYOUT),
    incapacitated: false,
    dead: false,
    usedInFight: [],
  };
}

/** Turns a roll into a playable mouse with its starting kit packed. */
export function createMouse(r: MouseRoll, choices: FinalizeChoices, ids: { id: string; ownerId: string }): Mouse {
  if (!STARTING_WEAPONS.includes(choices.weapon)) throw new Error(`"${choices.weapon}" is not a starting weapon`);
  const inventory = emptyInventory(MOUSE_LAYOUT);
  const kit = [choices.weapon, "torches", "rations"];
  for (const g of allGrants(r, choices)) if ("item" in g) kit.push(g.item);
  for (const id of kit) addCard(inventory, MOUSE_LAYOUT, itemCard(id));

  const score = (v: number) => ({ max: v, cur: v });
  return {
    ...ids,
    name: choices.name?.trim() || r.name,
    background: r.background,
    birthsign: r.birthsign,
    coat: r.coat,
    look: r.look,
    stats: { str: score(r.stats.str), dex: score(r.stats.dex), wil: score(r.stats.wil) },
    hp: score(r.hp),
    pips: r.pips,
    level: 1,
    xp: 0,
    grit: [],
    inventory,
    bank: "",
    incapacitated: false,
    dead: false,
    usedInFight: [],
  };
}
