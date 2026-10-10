import { z } from "zod";
import type { CampaignState, Role, RollEntry } from "./state";

export const PARTY = "campaign-room";

export const ClientMessage = z.discriminatedUnion("t", [
  z.object({
    t: z.literal("roll"),
    expr: z.string().max(40),
    label: z.string().max(60).optional(),
  }),
  z.object({ t: z.literal("rename"), name: z.string().trim().min(1).max(30) }),
]);
export type ClientMessage = z.infer<typeof ClientMessage>;

export type ServerMessage =
  | { t: "welcome"; you: { id: string; role: Role } }
  | { t: "state"; state: CampaignState; online: string[] }
  | { t: "rolled"; entry: RollEntry }
  | { t: "error"; message: string };

/** Query params a socket connects with. */
export interface ConnectParams {
  pid: string;
  name: string;
  gm?: string;
}

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
