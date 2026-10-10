import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { conditionsIn, isEncumbered } from "../../shared/rules/inventory";
import type { Creature } from "../../shared/rules/types";
import type { Member } from "../../shared/state";
import { useRoom } from "../room";
import { CreatureSheet } from "../sheet/CreatureSheet";
import { MousePortrait } from "../sheet/MousePortrait";
import { Bar, Btn } from "../ui";

const NO_MEMBERS: Record<string, Member> = {};

/** Everyone's mice at a glance; click one to open its full sheet. */
export function PartyPanel() {
  const mice = useRoom(useShallow((s) => Object.values(s.state?.mice ?? {})));
  const hirelings = useRoom(useShallow((s) => Object.values(s.state?.hirelings ?? {})));
  const members = useRoom((s) => s.state?.members ?? NO_MEMBERS);
  const [open, setOpen] = useState<string | null>(null);

  const selected = open ? (mice.find((m) => m.id === open) ?? hirelings.find((h) => h.id === open)) : null;
  if (selected) {
    return (
      <div>
        <Btn tone="ghost" className="mb-2" onClick={() => setOpen(null)}>
          ← Party
        </Btn>
        <CreatureSheet creature={selected} />
      </div>
    );
  }

  if (mice.length === 0) return <p className="text-ink-soft italic">No mice at the table yet.</p>;

  return (
    <div className="space-y-2">
      {mice.map((m) => (
        <div key={m.id}>
          <PartyRow c={m} sub={`${members[m.ownerId]?.name ?? "?"} · ${m.background} · L${m.level}`} onOpen={() => setOpen(m.id)} />
          {hirelings
            .filter((h) => h.employerId === m.id)
            .map((h) => (
              <div key={h.id} className="mt-1 ml-6">
                <PartyRow c={h} sub={h.type} onOpen={() => setOpen(h.id)} small />
              </div>
            ))}
        </div>
      ))}
    </div>
  );
}

function PartyRow({ c, sub, onOpen, small }: { c: Creature; sub: string; onOpen: () => void; small?: boolean }) {
  const grit = "grit" in c ? c.grit : [];
  const conds = conditionsIn(c.inventory, grit);
  const coat = "coat" in c ? c.coat : { color: "Grey", pattern: "Solid" };
  return (
    <button onClick={onOpen} className={`flex w-full items-center gap-3 rounded-lg border border-ink-soft/25 bg-white/40 p-2 text-left hover:bg-white/70 ${c.dead ? "opacity-60" : ""}`}>
      <div className="shrink-0 overflow-hidden rounded-full">
        <MousePortrait color={coat.color} pattern={coat.pattern} seed={c.id} size={small ? 36 : 52} dead={c.dead} />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-baseline justify-between gap-2">
          <span className={`truncate font-display ${small ? "text-lg" : "text-2xl"} leading-none`}>{c.name}</span>
          <span className="shrink-0 text-xs text-ink-soft tabular-nums">
            STR {c.stats.str.cur} · DEX {c.stats.dex.cur} · WIL {c.stats.wil.cur}
          </span>
        </div>
        <div className="truncate text-xs text-ink-soft">{sub}</div>
        <div className="mt-1 grid grid-cols-2 gap-2">
          <div className="flex items-center gap-1 text-[11px]">
            HP {c.hp.cur}/{c.hp.max} <Bar cur={c.hp.cur} max={c.hp.max} tone="hp" />
          </div>
          <div className="flex items-center gap-1 text-[11px]">
            STR <Bar cur={c.stats.str.cur} max={c.stats.str.max} tone="str" />
          </div>
        </div>
        {(conds.length > 0 || c.incapacitated || isEncumbered(c.inventory, grit) || c.dead) && (
          <div className="mt-1 flex flex-wrap gap-1">
            {c.dead && <span className="rounded-full bg-ink px-1.5 text-[11px] text-parchment">Dead</span>}
            {c.incapacitated && !c.dead && <span className="rounded-full bg-ember/20 px-1.5 text-[11px] text-ember">Incapacitated</span>}
            {isEncumbered(c.inventory, grit) && <span className="rounded-full bg-ember/20 px-1.5 text-[11px] text-ember">Encumbered</span>}
            {conds.map((k) => (
              <span key={k.uid} className="rounded-full bg-ember/15 px-1.5 text-[11px]">
                {k.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}
