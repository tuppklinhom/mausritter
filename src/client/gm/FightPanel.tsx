import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { CREATURES } from "../../shared/data/creatures";
import type { Foe, FoeStatus } from "../../shared/state";
import { combatant } from "../combat/ui";
import { Icon } from "../Icon";
import type { IconName } from "../icons.gen";
import { useRoom } from "../room";
import { Bar, Btn, SectionTitle } from "../ui";

/** GM: set up a fight from the bestiary, then run the foes' side of it. */
export function FightPanel() {
  const combat = useRoom((s) => s.state?.combat);
  return combat ? <RunFight /> : <SetUpFight />;
}

function SetUpFight() {
  const send = useRoom((s) => s.send);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [surprise, setSurprise] = useState<"none" | "party" | "foes">("none");
  const picked = Object.entries(counts).filter(([, n]) => n > 0);
  const bump = (id: string, d: number) => setCounts((c) => ({ ...c, [id]: Math.max(0, Math.min(12, (c[id] ?? 0) + d)) }));

  return (
    <div className="space-y-3">
      <SectionTitle
        right={
          <Btn className="text-sm" onClick={() => send({ t: "rollReaction" })} title="2d6: how does the creature feel about the mice?">
            🎲 Reaction roll
          </Btn>
        }
      >
        Who are the mice facing?
      </SectionTitle>
      <div className="grid gap-1.5 sm:grid-cols-2">
        {CREATURES.map((c) => {
          const n = counts[c.id] ?? 0;
          return (
            <div key={c.id} className={`flex items-start gap-2 rounded-lg border p-2 ${n ? "border-ember bg-ember/10" : "border-ink-soft/25 bg-white/40"}`}>
              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-parchment" style={{ background: `radial-gradient(circle at 35% 30%, ${c.tint}, #1b1410 85%)` }}>
                <Icon name={c.icon as IconName} className="h-7 w-7" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-display text-lg leading-none">{c.name}</span>
                  <span className="flex items-center gap-1">
                    <button onClick={() => bump(c.id, -1)} className="h-6 w-6 rounded bg-ink/10 font-bold hover:bg-ink/20" aria-label={`Fewer ${c.name}`}>
                      −
                    </button>
                    <span className="w-4 text-center font-bold tabular-nums">{n}</span>
                    <button onClick={() => bump(c.id, 1)} className="h-6 w-6 rounded bg-ink/10 font-bold hover:bg-ink/20" aria-label={`More ${c.name}`}>
                      +
                    </button>
                  </span>
                </div>
                <div className="text-[11px] text-ink-soft">
                  {c.hp}hp · STR {c.str} DEX {c.dex} WIL {c.wil}
                  {c.armour ? ` · Armour ${c.armour}` : ""} · {c.attacks.map((a) => `${a.damage} ${a.name}`).join(", ")}
                </div>
                <div className="text-[11px] italic">{c.wants}</div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 rounded-lg bg-ink/5 p-2 text-sm">
        <span className="font-bold">Who strikes first?</span>
        {(
          [
            ["none", "DEX saves"],
            ["party", "Mice ambush"],
            ["foes", "Foes ambush"],
          ] as const
        ).map(([v, label]) => (
          <label key={v} className="flex items-center gap-1">
            <input type="radio" name="surprise" checked={surprise === v} onChange={() => setSurprise(v)} />
            {label}
          </label>
        ))}
      </div>

      <Btn
        tone="ember"
        className="w-full py-2 font-display text-2xl"
        disabled={picked.length === 0}
        onClick={() => send({ t: "startCombat", foes: picked.map(([defId, count]) => ({ defId, count })), surprise })}
      >
        ⚔ Start the fight
      </Btn>
    </div>
  );
}

function RunFight() {
  const state = useRoom((s) => s.state!);
  const send = useRoom((s) => s.send);
  const combat = state.combat!;
  const party = useRoom(useShallow((s) => [...Object.values(s.state?.mice ?? {}), ...Object.values(s.state?.hirelings ?? {})].filter((c) => !c.dead)));
  const [addDef, setAddDef] = useState(CREATURES[0].id);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const allDown = Object.values(combat.foes).every((f) => f.status !== "active");

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="font-display text-2xl">Round {combat.round}</span>
        <Btn tone="gold" className="ml-auto" onClick={() => send({ t: "nextTurn" })}>
          Next turn →
        </Btn>
      </div>

      <ol className="flex flex-wrap gap-1 text-xs">
        {combat.order.map((id, i) => {
          const c = combatant(state, id);
          if (!c) return null;
          return (
            <li key={id} className={`rounded-full px-2 py-0.5 font-bold ${i === combat.turn ? "bg-gold" : c.side === "foe" ? "bg-ember/25" : "bg-moss/25"} ${c.out ? "line-through opacity-50" : ""}`}>
              {i + 1}. {c.name}
            </li>
          );
        })}
      </ol>

      <div className="space-y-2">
        {Object.values(combat.foes).map((f) => (
          <FoeCard key={f.id} foe={f} acting={combat.order[combat.turn] === f.id} party={party} />
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-1.5 text-sm">
        <span className="font-bold">Reinforcements:</span>
        <select value={addDef} onChange={(e) => setAddDef(e.target.value)} className="rounded-md border border-ink-soft/40 bg-white/70 px-1.5 py-1">
          {CREATURES.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <Btn className="text-sm" onClick={() => send({ t: "addFoes", defId: addDef, count: 1 })}>
          + Add
        </Btn>
      </div>

      <div className="border-t border-ink-soft/20 pt-2">
        {confirmEnd || allDown ? (
          <Btn tone={allDown ? "moss" : "ember"} className="w-full" onClick={() => send({ t: "endCombat" })}>
            {allDown ? "Victory! End the fight" : "Really end the fight?"}
          </Btn>
        ) : (
          <Btn tone="ghost" onClick={() => setConfirmEnd(true)}>
            End the fight…
          </Btn>
        )}
      </div>
    </div>
  );
}

function FoeCard({ foe, acting, party }: { foe: Foe; acting: boolean; party: { id: string; name: string }[] }) {
  const send = useRoom((s) => s.send);
  const [targetId, setTargetId] = useState(party[0]?.id ?? "");
  const [mod, setMod] = useState<"normal" | "impaired" | "enhanced">("normal");
  const [dmg, setDmg] = useState("");
  const active = foe.status === "active";
  const target = party.find((p) => p.id === targetId) ? targetId : party[0]?.id;

  return (
    <div className={`rounded-lg border-2 p-2 ${acting ? "border-gold bg-gold/10" : "border-ink-soft/25 bg-white/40"} ${active ? "" : "opacity-60"}`}>
      <div className="flex items-center gap-2">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-parchment" style={{ background: `radial-gradient(circle at 35% 30%, ${foe.tint}, #1b1410 85%)` }}>
          <Icon name={foe.icon as IconName} className="h-6 w-6" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between">
            <span className="font-display text-lg leading-none">{foe.name}</span>
            <select
              value={foe.status}
              onChange={(e) => send({ t: "setFoeStatus", foeId: foe.id, status: e.target.value as FoeStatus })}
              className="rounded border border-ink-soft/40 bg-white/70 px-1 text-xs"
              aria-label={`${foe.name} status`}
            >
              {(["active", "down", "fled", "dead"] as const).map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-1 grid grid-cols-2 gap-2 text-[11px]">
            <div className="flex items-center gap-1">
              HP {foe.hp.cur}/{foe.hp.max} <Bar cur={foe.hp.cur} max={foe.hp.max} tone="hp" />
            </div>
            <div className="flex items-center gap-1">
              STR {foe.str.cur}/{foe.str.max} <Bar cur={foe.str.cur} max={foe.str.max} tone="str" />
            </div>
          </div>
          <div className="text-[11px] text-ink-soft">
            DEX {foe.dex.cur} · WIL {foe.wil.cur}
            {foe.armour ? ` · Armour ${foe.armour}` : ""}
            {foe.critical ? ` · Crit: ${foe.critical}` : ""}
          </div>
        </div>
      </div>

      {active && (
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {foe.attacks.map((a, i) => (
            <Btn key={i} tone="ember" className="text-xs" disabled={!target} onClick={() => send({ t: "foeAttack", foeId: foe.id, attack: i, targetId: target!, mod })}>
              {a.damage} {a.name}
              {a.damages ? ` (→${a.damages.toUpperCase()})` : ""}
            </Btn>
          ))}
          <span className="text-xs">at</span>
          <select value={target} onChange={(e) => setTargetId(e.target.value)} className="rounded border border-ink-soft/40 bg-white/70 px-1 py-0.5 text-xs" aria-label={`${foe.name} target`}>
            {party.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <select value={mod} onChange={(e) => setMod(e.target.value as typeof mod)} className="rounded border border-ink-soft/40 bg-white/70 px-1 py-0.5 text-xs">
            <option value="normal">normal</option>
            <option value="impaired">impaired d4</option>
            <option value="enhanced">enhanced d12</option>
          </select>
          <form
            className="ml-auto flex items-center gap-1"
            onSubmit={(e) => {
              e.preventDefault();
              const n = parseInt(dmg, 10);
              if (n > 0) send({ t: "foeDamage", foeId: foe.id, amount: n });
              setDmg("");
            }}
          >
            <input value={dmg} onChange={(e) => setDmg(e.target.value.replace(/\D/g, ""))} placeholder="dmg" className="w-12 rounded border border-ink-soft/40 bg-white/70 px-1 py-0.5 text-center text-xs" />
            <Btn type="submit" className="text-xs">
              Hurt
            </Btn>
          </form>
          <Btn className="text-xs" onClick={() => send({ t: "foeMorale", foeId: foe.id })} title="WIL save: flee or surrender on failure">
            Morale
          </Btn>
        </div>
      )}
    </div>
  );
}
