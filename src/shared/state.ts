export type Role = "gm" | "player";

export interface Member {
  /** Stable per-browser id, kept in localStorage so reconnects keep identity. */
  id: string;
  name: string;
  role: Role;
}

export interface RollEntry {
  id: string;
  at: number;
  byId: string;
  byName: string;
  label?: string;
  expr: string;
  dice: { sides: number; value: number; kept: boolean }[];
  total: number;
}

/** Everything every client is allowed to see. Secrets (GM key) live outside this. */
export interface CampaignState {
  code: string;
  createdAt: number;
  members: Record<string, Member>;
  log: RollEntry[];
}

export const LOG_LIMIT = 200;
