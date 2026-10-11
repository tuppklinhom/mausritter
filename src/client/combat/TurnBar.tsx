import { useState } from "react";
import { wieldedWeapons } from "../../shared/rules/inventory";
import { useRoom } from "../room";
import { Btn } from "../ui";
import { combatant, useTarget } from "./ui";

/** Sticky combat strip in the side panel: whose turn it is, and the actor's quick actions. */
export function TurnBar() {
  const state = useRoom((s) => s.state);
  const you = useRoom((s) => s.you);
  const send = useRoom((s) => s.send);
  const { target, setTarget } = useTarget();
  const [mod, setMod] = useState<"normal" | "impaired" | "enhanced">("normal");
  const combat = state?.combat;
  if (!state || !combat) return null;

  const currentId = combat.order[combat.turn];
  const current = combatant(state, currentId);
  const actor = state.mice[currentId] ?? state.hirelings[currentId];
  const myTurn = !!current && current.ownerId === you?.id && !!actor;
  const canEnd = myTurn || you?.role === "gm";
  const foes = Object.values(combat.foes).filter((f) => f.status === "active");
  const targetFoe = target ? combat.foes[target] : undefined;
  const validTarget = targetFoe?.status === "active" ? targetFoe : undefined;
  const dice = actor ? wieldedWeapons(actor.inventory).map((w) => w.damage) : [];

  return (
    <div className={`border-b-2 px-3 py-2 ${myTurn ? "border-gold bg-gold/20" : "border-ember/40 bg-ember/10"}`}>
      <div className="flex items-center gap-2">
        <span className="font-display text-xl">⚔ Round {combat.round}</span>
        <span className="text-sm">
          {myTurn ? (
            <b className="text-ember">Your turn: {current!.name}</b>
          ) : (
            <>
              Acting: <b>{current?.name ?? "—"}</b>
            </>
          )}
        </span>
        {canEnd && (
          <Btn className="ml-auto text-sm" onClick={() => send({ t: "nextTurn" })}>
            End turn →
          </Btn>
        )}
      </div>

      {myTurn && actor && (
        <div className="mt-2 space-y-1.5">
          <div className="flex flex-wrap items-center gap-1">
            <span className="text-xs font-bold">Target:</span>
            {foes.map((f) => (
              <button
                key={f.id}
                onClick={() => setTarget(f.id)}
                className={`rounded-full border px-2 py-0.5 text-xs font-bold ${validTarget?.id === f.id ? "border-ember bg-ember text-parchment" : "border-ink-soft/40 bg-white/60"}`}
              >
                {f.name}
              </button>
            ))}
            {foes.length === 0 && <span className="text-xs text-ink-soft">No foes left standing.</span>}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Btn
              tone="ember"
              disabled={!validTarget}
              onClick={() => send({ t: "attack", creatureId: actor.id, mod, targetId: validTarget!.id })}
              title={validTarget ? undefined : "Pick a target (or click a foe on the stage)"}
            >
              ⚔ Attack {validTarget?.name ?? "…"} ({mod === "impaired" ? "d4" : mod === "enhanced" ? "d12" : dice.length ? dice.join("/") : "d6"})
            </Btn>
            <select value={mod} onChange={(e) => setMod(e.target.value as typeof mod)} className="rounded-md border border-ink-soft/40 bg-white/70 px-1.5 py-1 text-sm">
              <option value="normal">Normal</option>
              <option value="impaired">Impaired (d4)</option>
              <option value="enhanced">Enhanced (d12)</option>
            </select>
          </div>
          <p className="text-xs text-ink-soft">Move up to 12″ and take one action: attack, a save for a risky gambit, cast a spell, or grab something from your pack.</p>
        </div>
      )}
    </div>
  );
}
