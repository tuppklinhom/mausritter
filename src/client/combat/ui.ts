import { create } from "zustand";
import type { CampaignState } from "../../shared/state";

/** Per-viewer combat UI state: which foe this player has targeted. */
export const useTarget = create<{ target: string | null; setTarget: (id: string | null) => void }>((set) => ({
  target: null,
  setTarget: (target) => set({ target }),
}));

export interface Combatant {
  id: string;
  name: string;
  side: "party" | "foe";
  out: boolean;
  ownerId?: string;
}

/** Resolves an id in the combat order to who it is, for display. */
export function combatant(state: CampaignState, id: string): Combatant | null {
  const foe = state.combat?.foes[id];
  if (foe) return { id, name: foe.name, side: "foe", out: foe.status !== "active" };
  const m = state.mice[id];
  if (m) return { id, name: m.name, side: "party", out: m.dead, ownerId: m.ownerId };
  const h = state.hirelings[id];
  if (h) return { id, name: h.name, side: "party", out: h.dead, ownerId: state.mice[h.employerId]?.ownerId };
  return null;
}
