import type { CampaignState, LogEntry, Role } from "./state";

export { Action as ClientMessage } from "./actions";

export const PARTY = "campaign-room";

export type ServerMessage =
  | { t: "welcome"; you: { id: string; role: Role } }
  | { t: "state"; state: CampaignState; online: string[] }
  /** New log entries from the last action, so clients can animate them. */
  | { t: "events"; entries: LogEntry[] }
  | { t: "error"; message: string };

export interface CreateRoomResponse {
  code: string;
  gmKey: string;
}

const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function normalizeCode(code: string): string {
  return code.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function isValidCode(code: string): boolean {
  return /^[A-Z0-9]{6}$/.test(code);
}

export function makeCode(): string {
  const buf = new Uint8Array(6);
  crypto.getRandomValues(buf);
  return Array.from(buf, (b) => CODE_ALPHABET[b % CODE_ALPHABET.length]).join("");
}
