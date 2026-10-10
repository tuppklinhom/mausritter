import PartySocket from "partysocket";
import { create } from "zustand";
import { PARTY, type ClientMessage, type ServerMessage } from "../shared/protocol";
import { LOG_LIMIT, type CampaignState, type Role, type RollEntry } from "../shared/state";
import { gmKeyFor, playerId } from "./session";

type Status = "idle" | "connecting" | "open" | "closed" | "error";

interface RoomStore {
  status: Status;
  error: string | null;
  code: string | null;
  you: { id: string; role: Role } | null;
  state: CampaignState | null;
  online: string[];
  /** Most recent roll, used by the stage to play its animation once. */
  lastRoll: RollEntry | null;
  connect: (code: string, name: string) => void;
  disconnect: () => void;
  send: (msg: ClientMessage) => void;
}

let socket: PartySocket | null = null;

export const useRoom = create<RoomStore>((set, get) => ({
  status: "idle",
  error: null,
  code: null,
  you: null,
  state: null,
  online: [],
  lastRoll: null,

  connect(code, name) {
    get().disconnect();
    set({ status: "connecting", error: null, code });
    const query: Record<string, string> = { pid: playerId(), name };
    const gm = gmKeyFor(code);
    if (gm) query.gm = gm;

    const ws = new PartySocket({ host: window.location.host, party: PARTY, room: code, query });
    socket = ws;
    ws.addEventListener("open", () => set({ status: "open" }));
    ws.addEventListener("close", (e) => {
      if (e.code === 4004) {
        ws.close();
        set({ status: "error" });
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
        case "rolled": {
          const state = get().state;
          if (state) {
            const log = [...state.log, msg.entry].slice(-LOG_LIMIT);
            set({ state: { ...state, log }, lastRoll: msg.entry, error: null });
          }
          break;
        }
        case "error":
          set({ error: msg.message });
          break;
      }
    });
  },

  disconnect() {
    socket?.close();
    socket = null;
    set({ status: "idle", you: null, state: null, online: [], lastRoll: null });
  },

  send(msg) {
    socket?.send(JSON.stringify(msg));
  },
}));
