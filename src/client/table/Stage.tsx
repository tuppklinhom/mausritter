import { useRoom } from "../room";

/** The shared screen everyone watches. For now it shows the latest roll, big. */
export function Stage() {
  const lastRoll = useRoom((s) => s.lastRoll);

  return (
    <div className="relative flex flex-1 items-center justify-center bg-[radial-gradient(ellipse_at_center,#4a3828_0%,#1c140d_75%)]">
      {lastRoll ? (
        <div key={lastRoll.id} className="flex flex-col items-center text-parchment">
          <div className="flex flex-wrap justify-center gap-3">
            {lastRoll.dice.map((d, i) => (
              <div
                key={i}
                style={{ animationDelay: `${i * 80}ms` }}
                className={`animate-tumble flex h-16 w-16 items-center justify-center rounded-xl border-2 text-2xl font-bold shadow-lg ${
                  d.kept ? "border-gold bg-parchment text-ink" : "border-ink-soft bg-parchment/40 text-ink/50 line-through"
                }`}
              >
                {d.value}
              </div>
            ))}
          </div>
          <div className="animate-reveal mt-6 text-center">
            <div className="font-display text-8xl drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">{lastRoll.total}</div>
            <div className="mt-1 text-lg opacity-80">
              {lastRoll.byName} · {lastRoll.label ?? lastRoll.expr}
            </div>
          </div>
        </div>
      ) : (
        <p className="font-display text-3xl text-parchment/40">The table awaits…</p>
      )}
    </div>
  );
}
