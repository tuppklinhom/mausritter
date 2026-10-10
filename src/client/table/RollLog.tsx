import { useEffect, useRef } from "react";
import type { RollEntry } from "../../shared/state";
import { useRoom } from "../room";

const NO_ROLLS: RollEntry[] = [];

export function RollLog() {
  const log = useRoom((s) => s.state?.log ?? NO_ROLLS);
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth" });
  }, [log.length]);

  return (
    <>
      <h2 className="border-b border-ink-soft/20 px-4 py-2 font-display text-2xl">Chronicle</h2>
      <ol className="flex-1 space-y-2 overflow-y-auto p-3">
        {log.length === 0 && <li className="text-ink-soft italic">No rolls yet.</li>}
        {log.map((r) => (
          <li key={r.id} className="animate-slide-in rounded-md bg-white/40 px-3 py-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="font-bold">{r.byName}</span>
              <span className="text-xs text-ink-soft">{new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
            </div>
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm text-ink-soft">
                {r.label ?? r.expr}{" "}
                <span className="font-mono">
                  [
                  {r.dice.map((d, i) => (
                    <span key={i}>
                      {i > 0 && ", "}
                      <span className={d.kept ? "" : "line-through opacity-50"}>{d.value}</span>
                    </span>
                  ))}
                  ]
                </span>
              </span>
              <span className="font-display text-2xl">{r.total}</span>
            </div>
          </li>
        ))}
        <li ref={end} />
      </ol>
    </>
  );
}
