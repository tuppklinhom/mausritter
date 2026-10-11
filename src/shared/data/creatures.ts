import type { Stat } from "../rules/types";

export interface CreatureAttack {
  name: string;
  damage: string;
  /** Damage past HP goes here instead of STR (e.g. venom hits DEX). */
  damages?: Stat;
}

export interface CreatureDef {
  id: string;
  name: string;
  hp: number;
  str: number;
  dex: number;
  wil: number;
  armour: number;
  attacks: CreatureAttack[];
  /** Replaces the standard critical damage effect when this creature deals it. */
  critical?: string;
  notes?: string;
  wants: string;
  /** Acts before the party unless surprised (frogs). */
  first?: boolean;
  icon: string;
  tint: string;
}

/** The rulebook's bestiary (pp. 22–24). */
export const CREATURES: CreatureDef[] = [
  {
    id: "cat",
    name: "Cat",
    hp: 15, str: 15, dex: 15, wil: 10, armour: 1,
    attacks: [{ name: "swipe", damage: "d6" }, { name: "bite", damage: "d8" }],
    notes: "Warband scale: only a warband can truly fight it.",
    wants: "Wants to be served. If mice pledge fealty and give bribes, they may be allowed to live.",
    icon: "cat", tint: "#8a5a2b",
  },
  {
    id: "centipede",
    name: "Centipede",
    hp: 8, str: 10, dex: 12, wil: 8, armour: 1,
    attacks: [{ name: "venomous bite", damage: "d6", damages: "dex" }],
    critical: "Venom takes effect: d12 damage to STR.",
    wants: "Wants to wander and devour.",
    icon: "centipede", tint: "#7a3a22",
  },
  {
    id: "crow",
    name: "Crow",
    hp: 12, str: 12, dex: 15, wil: 15, armour: 1,
    attacks: [{ name: "peck", damage: "d8" }],
    notes: "Flies 3× normal speed, knows two songs.",
    wants: "Wants to protect the secret hallowed places from those that would do them harm.",
    icon: "raven", tint: "#2c2a35",
  },
  {
    id: "faerie",
    name: "Faerie",
    hp: 6, str: 10, dex: 15, wil: 15, armour: 0,
    attacks: [{ name: "silver rapier", damage: "d8" }],
    notes: "Knows one spell.",
    wants: "Wants to further the Faerie Queen's strange agenda.",
    icon: "fairy", tint: "#5b4a8a",
  },
  {
    id: "frog",
    name: "Frog",
    hp: 6, str: 12, dex: 15, wil: 8, armour: 1,
    attacks: [{ name: "spear", damage: "d10" }, { name: "tongue", damage: "d6" }],
    critical: "Leaps out of reach.",
    notes: "Always goes first unless surprised, leaps 2× normal speed.",
    wants: "Wants to gallantly complete their quest.",
    first: true,
    icon: "frog", tint: "#3f6b34",
  },
  {
    id: "ghost",
    name: "Ghost",
    hp: 9, str: 5, dex: 10, wil: 10, armour: 0,
    attacks: [{ name: "chilling touch", damage: "d8", damages: "wil" }],
    critical: "Possesses the creature.",
    notes: "Only harmed by silver or magic weapons. Has a ghostly power.",
    wants: "Wants freedom from the pain that binds them to the mortal realm.",
    icon: "ghost", tint: "#5e7387",
  },
  {
    id: "mouse",
    name: "Mouse",
    hp: 3, str: 9, dex: 9, wil: 9, armour: 0,
    attacks: [{ name: "sword", damage: "d6" }, { name: "bow", damage: "d6" }],
    wants: "Wants to feel safe.",
    icon: "hood", tint: "#7a5a3a",
  },
  {
    id: "owl",
    name: "Owl",
    hp: 15, str: 15, dex: 15, wil: 15, armour: 1,
    attacks: [{ name: "bite", damage: "d10" }],
    notes: "Flies 3× normal speed. Knows two spells.",
    wants: "Wants to collect rare knowledge and spells.",
    icon: "owl", tint: "#6b5232",
  },
  {
    id: "rat",
    name: "Rat",
    hp: 3, str: 12, dex: 8, wil: 8, armour: 0,
    attacks: [{ name: "cleaver", damage: "d6" }],
    wants: "Wants easy wealth, to take from the weak.",
    icon: "rat", tint: "#5a4a40",
  },
  {
    id: "snake",
    name: "Snake",
    hp: 12, str: 12, dex: 10, wil: 10, armour: 2,
    attacks: [{ name: "bite", damage: "d8" }],
    critical: "Swallowed whole: d4 STR damage per Round until rescued or escape.",
    wants: "Wants to sleep undisturbed.",
    icon: "snake", tint: "#4f5e2a",
  },
  {
    id: "spider",
    name: "Spider",
    hp: 6, str: 8, dex: 15, wil: 10, armour: 1,
    attacks: [{ name: "poison bite", damage: "d6", damages: "dex" }],
    critical: "Carried away in web.",
    wants: "Wants to feed its babies.",
    icon: "spider-face", tint: "#3a2e3e",
  },
];

export function creatureDef(id: string): CreatureDef | undefined {
  return CREATURES.find((c) => c.id === id);
}

/** Reaction roll (2d6) for creatures whose attitude isn't obvious. */
export function reactionFor(total: number): string {
  if (total <= 2) return "Hostile. How have the mice angered them?";
  if (total <= 5) return "Unfriendly. How can they be appeased?";
  if (total <= 8) return "Unsure. What could win them over?";
  if (total <= 11) return "Talkative. What could they trade?";
  return "Helpful. How can they help the mice?";
}
