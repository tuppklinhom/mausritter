import type { MouseRoll } from "./rules/character";
import type { Hireling, Mouse } from "./rules/types";

export type Role = "gm" | "player";

export interface Member {
  /** Stable per-browser id, kept in localStorage so reconnects keep identity. */
  id: string;
  name: string;
  role: Role;
}

export interface DieFace {
  sides: number;
  value: number;
  kept: boolean;
}

export type LogKind = "roll" | "save" | "attack" | "damage" | "spell" | "event" | "encounter";

export type Outcome = "success" | "fail" | "critical" | "dead" | "levelup" | "depleted" | "encounter" | "omen" | "quiet";

export interface LogEntry {
  id: string;
  at: number;
  byId: string;
  byName: string;
  kind: LogKind;
  /** Headline, e.g. "Ada Witter · STR save". */
  title: string;
  detail?: string;
  dice?: DieFace[];
  total?: number;
  outcome?: Outcome;
  /** Mouse or hireling this concerns, for highlighting. */
  subjectId?: string;
  /** A card that just arrived in the subject's inventory (for the fly-in effect). */
  loot?: { name: string; defId: string; kind: string };
  /** A Condition was just inflicted. */
  condition?: string;
}

/** How an NPC is drawn: a procedural mouse face, or a creature icon on a medallion. */
export type NpcLook = { kind: "mouse"; color: string; pattern: string } | { kind: "creature"; icon: string; tint: string };

export interface Npc {
  id: string;
  name: string;
  look: NpcLook;
}

export interface SceneDef {
  id: string;
  title: string;
  subtitle?: string;
  /** Bundled backdrop id, "mood:<id>" for a drawn mood, or an https image URL. */
  backdrop: string;
  ambience: string;
  npcs: Npc[];
  /** GM-only prep notes; never sent to players. */
  notes: string;
}

/** What everyone's stage is showing right now. */
export interface StageState {
  scene: { id: string; title: string; subtitle?: string; backdrop: string; npcs: Npc[]; shownAt: number } | null;
  ambience: string;
  dialogue: { npc: Npc; text: string; at: number } | null;
}

export type Season = "spring" | "summer" | "autumn" | "winter";

/** The GM session sheet's turn tracker. A watch is 36 turns; a day is 4 watches. */
export interface Clock {
  day: number;
  /** 0 Night, 1 Morning (from sunrise), 2 Afternoon (from noon), 3 Evening (from sunset). */
  watch: number;
  /** Turns elapsed in the current watch, 0–35. */
  turn: number;
  mode: "dungeon" | "wilderness";
  season: Season;
}

/** GM-only campaign data, stripped before state goes to players. */
export interface GmState {
  scenes: SceneDef[];
  notes: string;
}

export interface CampaignState {
  code: string;
  createdAt: number;
  members: Record<string, Member>;
  mice: Record<string, Mouse>;
  hirelings: Record<string, Hireling>;
  /** In-progress character rolls, keyed by player id. Visible so the table can watch. */
  drafts: Record<string, MouseRoll>;
  log: LogEntry[];
  stage: StageState;
  clock: Clock;
  /** Present on the server and for the GM; absent in what players receive. */
  gm?: GmState;
}

export const LOG_LIMIT = 200;
export const TURNS_PER_WATCH = 36;
export const WATCH_NAMES = ["Night watch", "Morning watch", "Afternoon watch", "Evening watch"];

export function emptyCampaign(code: string, now = Date.now()): CampaignState {
  return {
    code,
    createdAt: now,
    members: {},
    mice: {},
    hirelings: {},
    drafts: {},
    log: [],
    stage: { scene: null, ambience: "none", dialogue: null },
    clock: { day: 1, watch: 1, turn: 0, mode: "dungeon", season: "spring" },
    gm: { scenes: [], notes: "" },
  };
}

/** What a player is allowed to see: everything except the GM's prep. */
export function publicView(s: CampaignState): CampaignState {
  const { gm: _gm, ...rest } = s;
  return rest;
}

/** Older saved rooms predate some fields; fill them in on load. */
export function migrateCampaign(s: CampaignState): CampaignState {
  const base = emptyCampaign(s.code, s.createdAt);
  const merged = { ...base, ...s, gm: { ...base.gm!, ...s.gm } };
  merged.log = merged.log.map((e) => ({ ...e, kind: e.kind ?? "roll", title: e.title ?? (e as { expr?: string }).expr ?? "Roll" }));
  return merged;
}
