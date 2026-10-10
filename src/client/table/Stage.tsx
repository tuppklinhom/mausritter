import { useShallow } from "zustand/react/shallow";
import type { Outcome } from "../../shared/state";
import { useRoom } from "../room";
import { MousePortrait } from "../sheet/MousePortrait";
import { Bar } from "../ui";

const BANNER: Record<Outcome, { text: string; cls: string }> = {
  success: { text: "Success", cls: "text-[#a6d27a]" },
  fail: { text: "Failed", cls: "text-ember" },
  critical: { text: "Critical damage!", cls: "text-ember" },
  dead: { text: "Slain", cls: "text-[#d9d0c0]" },
  levelup: { text: "Level up!", cls: "text-gold" },
  depleted: { text: "Broken!", cls: "text-gold" },
};

/** The shared screen everyone watches. */
export function Stage() {
  const spot = useRoom((s) => s.spotlight);
  const recent = useRoom(useShallow((s) => (s.state?.log ?? []).slice(-4)));

  const banner = spot?.outcome ? BANNER[spot.outcome] : null;
  const shake = spot?.outcome === "critical" || spot?.outcome === "dead" || spot?.kind === "damage";

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-[radial-gradient(ellipse_at_center,#4a3828_0%,#1c140d_75%)]">
      <PartyHud highlight={spot?.subjectId} />

      <div className="flex flex-1 items-center justify-center p-4">
        {spot ? (
          <div key={spot.id} className={`flex max-w-xl flex-col items-center text-center text-parchment ${shake ? "animate-shake" : ""}`}>
            {spot.dice && spot.dice.length > 0 && (
              <div className="flex flex-wrap justify-center gap-3">
                {spot.dice.map((d, i) => (
                  <div key={i} className="flex flex-col items-center gap-1" style={{ animationDelay: `${i * 80}ms` }}>
                    <div
                      style={{ animationDelay: `${i * 80}ms` }}
                      className={`animate-tumble flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl font-bold shadow-lg ${
                        d.kept ? "border-gold bg-parchment text-ink" : "border-ink-soft bg-parchment/40 text-ink/50 line-through"
                      }`}
                    >
                      {d.value}
                    </div>
                    <span className="text-xs opacity-60">d{d.sides}</span>
                  </div>
                ))}
              </div>
            )}
            <div className="animate-reveal mt-4">
              {spot.total !== undefined && <div className="font-display text-8xl leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">{spot.total}</div>}
              <div className="mt-2 text-xl">{spot.title}</div>
              {spot.detail && <div className="mt-1 text-sm opacity-75">{spot.detail}</div>}
            </div>
            {banner && (
              <div className={`animate-stamp mt-4 font-display text-6xl tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] ${banner.cls}`}>{banner.text}</div>
            )}
          </div>
        ) : (
          <p className="font-display text-3xl text-parchment/40">The table awaits…</p>
        )}
      </div>

      <ol className="pointer-events-none absolute bottom-2 left-3 hidden max-w-sm space-y-0.5 text-sm text-parchment/70 md:block">
        {recent.map((e, i) => (
          <li key={e.id} style={{ opacity: 0.35 + (i / recent.length) * 0.65 }} className="truncate">
            {e.title}
            {e.total !== undefined && <b className="ml-1 text-parchment">{e.total}</b>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function PartyHud({ highlight }: { highlight?: string }) {
  const mice = useRoom(useShallow((s) => Object.values(s.state?.mice ?? {})));
  if (mice.length === 0) return null;
  return (
    <div className="flex flex-wrap gap-2 p-2">
      {mice.map((m) => (
        <div
          key={m.id}
          className={`flex w-44 items-center gap-2 rounded-lg border bg-black/40 px-2 py-1 text-parchment transition ${
            highlight === m.id ? "scale-105 border-gold shadow-[0_0_12px_rgba(216,162,58,0.6)]" : "border-white/10"
          } ${m.dead ? "opacity-50 grayscale" : ""}`}
        >
          <div className="shrink-0 overflow-hidden rounded-full">
            <MousePortrait color={m.coat.color} pattern={m.coat.pattern} seed={m.id} size={36} dead={m.dead} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-bold">{m.name}</div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-5">HP</span>
              <Bar cur={m.hp.cur} max={m.hp.max} tone="hp" />
            </div>
            <div className="flex items-center gap-1 text-[10px]">
              <span className="w-5">STR</span>
              <Bar cur={m.stats.str.cur} max={m.stats.str.max} tone="str" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
