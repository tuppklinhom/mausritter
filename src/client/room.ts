import PartySocket from "partysocket";
import { create } from "zustand";
import type { Action } from "../shared/actions";
import { PARTY, type ServerMessage } from "../shared/protocol";
import type { CampaignState, LogEntry, Role } from "../shared/state";
import { gmKeyFor, playerId } from "./session";

type Status = "idle" | "connecting" | "open" | "closed" | "error";

interface RoomStore {
  status: Status;
  /** Fatal connection error (bad room). */
  fatal: string | null;
  /** Latest action rejection, shown as a toast. */
  toast: { id: number; message: string } | null;
  code: string | null;
  you: { id: string; role: Role } | null;
  state: CampaignState | null;
  online: string[];
  /** Most recent entry with dice or an outcome, for the stage to play once. */
  spotlight: LogEntry | null;
  /** Every batch of new entries, for sound and fly-in effects. */
  feed: { seq: number; entries: LogEntry[] } | null;
  connect: (code: string, name: string) => void;
  disconnect: () => void;
  send: (action: Action) => void;
  showToast: (message: string) => void;
}

let socket: PartySocket | null = null;
let toastId = 0;

export const useRoom = create<RoomStore>((set, get) => ({
  status: "idle",
  fatal: null,
  toast: null,
  code: null,
  you: null,
  state: null,
  online: [],
  spotlight: null,
  feed: null,

  connect(code, name) {
    get().disconnect();
    set({ status: "connecting", fatal: null, code });
    const query: Record<string, string> = { pid: playerId(), name };
    const gm = gmKeyFor(code);
    if (gm) query.gm = gm;

    const ws = new PartySocket({ host: window.location.host, party: PARTY, room: code, query });
    socket = ws;
    ws.addEventListener("open", () => set({ status: "open" }));
    ws.addEventListener("close", (e) => {
      if (e.code === 4004) {
        ws.close();
        set({ status: "error", fatal: e.reason || "This table could not be found." });
      } else if (get().status !== "error") {
        set({ status: "closed" });
      }
    });
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data) as ServerMessage;
      switch (msg.t) {
        case "welcome":
          set({ you: msg.you });
          break;
        case "state":
          set({ state: msg.state, online: msg.online });
          break;
        case "events": {
          const show = [...msg.entries].reverse().find((en) => en.dice?.length || en.outcome || en.total !== undefined || en.condition);
          set({ feed: { seq: (get().feed?.seq ?? 0) + 1, entries: msg.entries }, ...(show ? { spotlight: show } : {}) });
          break;
        }
        case "error":
          get().showToast(msg.message);
          break;
      }
    });
  },

  disconnect() {
    socket?.close();
    socket = null;
    set({ status: "idle", you: null, state: null, online: [], spotlight: null, feed: null });
  },

  send(action) {
    socket?.send(JSON.stringify(action));
  },

  showToast(message) {
    const id = ++toastId;
    set({ toast: { id, message } });
    setTimeout(() => {
      if (get().toast?.id === id) set({ toast: null });
    }, 3500);
  },
}));

/** Whether the current user may act for a creature owned by `ownerId`. */
export function useCanEdit(ownerId: string | undefined): boolean {
  return useRoom((s) => s.you?.role === "gm" || (!!ownerId && s.you?.id === ownerId));
}
