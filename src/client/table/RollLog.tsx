import { useEffect, useRef } from "react";
import type { LogEntry, Outcome } from "../../shared/state";
import { useRoom } from "../room";

const NO_ENTRIES: LogEntry[] = [];

const OUTCOME_CLS: Partial<Record<Outcome, string>> = {
  success: "border-l-moss",
  fail: "border-l-ember",
  critical: "border-l-ember bg-ember/10",
  dead: "border-l-ink bg-ink/10",
  levelup: "border-l-gold bg-gold/15",
  depleted: "border-l-gold",
};

export function RollLog() {
  const log = useRoom((s) => s.state?.log ?? NO_ENTRIES);
  const end = useRef<HTMLLIElement>(null);

  useEffect(() => {
    end.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [log.length]);

  return (
    <ol className="space-y-1.5">
      {log.length === 0 && <li className="text-ink-soft italic">Nothing has happened yet.</li>}
      {log.map((r) => (
        <li key={r.id} className={`animate-slide-in rounded-md border-l-4 bg-white/40 px-3 py-1.5 ${r.outcome ? OUTCOME_CLS[r.outcome] : "border-l-transparent"}`}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="font-bold">{r.title}</span>
            {r.total !== undefined && <span className="font-display text-2xl leading-none">{r.total}</span>}
          </div>
          {(r.detail || r.dice?.length) && (
            <div className="text-sm text-ink-soft">
              {r.dice && r.dice.length > 0 && (
                <span className="mr-1 font-mono">
                  [
                  {r.dice.map((d, i) => (
                    <span key={i}>
                      {i > 0 && ", "}
                      <span className={d.kept ? "" : "line-through opacity-50"}>{d.value}</span>
                    </span>
                  ))}
                  ]
                </span>
              )}
              {r.detail}
            </div>
          )}
          <div className="text-[11px] text-ink-soft/70">
            {r.byName} · {new Date(r.at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
        </li>
      ))}
      <li ref={end} />
    </ol>
  );
}
