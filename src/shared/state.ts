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

export type LogKind = "roll" | "save" | "attack" | "damage" | "spell" | "event";

export type Outcome = "success" | "fail" | "critical" | "dead" | "levelup" | "depleted";

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

/** Everything every client is allowed to see. Secrets (GM key) live outside this. */
export interface CampaignState {
  code: string;
  createdAt: number;
  members: Record<string, Member>;
  mice: Record<string, Mouse>;
  hirelings: Record<string, Hireling>;
  /** In-progress character rolls, keyed by player id. Visible so the table can watch. */
  drafts: Record<string, MouseRoll>;
  log: LogEntry[];
}

export const LOG_LIMIT = 200;

export function emptyCampaign(code: string, now = Date.now()): CampaignState {
  return { code, createdAt: now, members: {}, mice: {}, hirelings: {}, drafts: {}, log: [] };
}

/** Older saved rooms predate some fields; fill them in on load. */
export function migrateCampaign(s: CampaignState): CampaignState {
  const base = emptyCampaign(s.code, s.createdAt);
  const merged = { ...base, ...s };
  merged.log = merged.log.map((e) => ({ ...e, kind: e.kind ?? "roll", title: e.title ?? (e as { expr?: string }).expr ?? "Roll" }));
  return merged;
}
