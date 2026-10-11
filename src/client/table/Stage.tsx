import { useEffect, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import type { LogEntry, Outcome } from "../../shared/state";
import { roll3d } from "../fx/dice3d";
import { play, type Sfx } from "../fx/sfx";
import { useRoom } from "../room";
import { MousePortrait } from "../sheet/MousePortrait";
import { Bar } from "../ui";
import { Backdrop, ClockBadge, DialogueBox, SceneTitle } from "./StageScene";

const BANNER: Record<Outcome, { text: string; cls: string }> = {
  success: { text: "Success", cls: "text-[#a6d27a]" },
  fail: { text: "Failed", cls: "text-ember" },
  critical: { text: "Critical damage!", cls: "text-ember" },
  dead: { text: "Slain", cls: "text-[#d9d0c0]" },
  levelup: { text: "Level up!", cls: "text-gold" },
  depleted: { text: "Broken!", cls: "text-gold" },
  encounter: { text: "Encounter!", cls: "text-ember" },
  omen: { text: "An omen…", cls: "text-[#b9a6e8]" },
  quiet: { text: "All quiet", cls: "text-parchment/70" },
};

/** How long a settled roll stays up before the scene shows through again. */
const READOUT_MS = 7000;

const DICE_STAGE = "dice-stage";

function sfxFor(e: LogEntry): Sfx | null {
  if (e.outcome) return e.outcome;
  if (e.condition) return "condition";
  if (e.kind === "damage") return "hit";
  return null;
}

type Phase = "idle" | "rolling" | "flat" | "settled" | "faded";

/** The shared screen everyone watches. */
export function Stage() {
  const spot = useRoom((s) => s.spotlight);
  const stage = useRoom((s) => s.state?.stage);
  const clock = useRoom((s) => s.state?.clock);
  const recent = useRoom(useShallow((s) => (s.state?.log ?? []).slice(-4)));
  const [phase, setPhase] = useState<Phase>("idle");

  useEffect(() => {
    if (!spot) return;
    let cancelled = false;
    let fade: ReturnType<typeof setTimeout>;
    const settle = () => {
      if (cancelled) return;
      setPhase("settled");
      const s = sfxFor(spot);
      if (s) play(s);
      fade = setTimeout(() => !cancelled && setPhase("faded"), READOUT_MS);
    };
    if (spot.dice?.length) {
      setPhase("rolling");
      void roll3d(`#${DICE_STAGE}`, spot.dice).then((used3d) => {
        if (cancelled) return;
        if (used3d) settle();
        else {
          // Flat dice tumble in with CSS; settle once they land.
          setPhase("flat");
          setTimeout(settle, 700);
        }
      });
    } else {
      settle();
    }
    return () => {
      cancelled = true;
      clearTimeout(fade);
    };
  }, [spot]);

  const banner = spot?.outcome ? BANNER[spot.outcome] : spot?.condition ? { text: spot.condition, cls: "text-ember" } : null;
  const shake = phase === "settled" && (spot?.outcome === "critical" || spot?.outcome === "dead" || spot?.kind === "damage");
  const showFlat = phase === "flat" || phase === "settled";

  return (
    <div className={`relative flex flex-1 flex-col overflow-hidden bg-[#1c140d] ${shake ? "animate-shake" : ""}`}>
      {stage && clock && <Backdrop stage={stage} clock={clock} />}
      {/* The 3D dice roll across the whole stage, under the HUD and readout. */}
      <div id={DICE_STAGE} className="pointer-events-none absolute inset-0" />
      {stage && <SceneTitle stage={stage} />}
      {clock && <ClockBadge clock={clock} />}

      <PartyHud highlight={spot?.subjectId} hurt={phase === "settled" && (spot?.kind === "damage" || spot?.outcome === "critical") ? spot.subjectId : undefined} />

      <div className="pointer-events-none relative flex flex-1 flex-col items-center justify-end gap-2 p-4 pb-3 [&>*]:pointer-events-auto">
        {spot ? (
          phase !== "rolling" && (
            <div
              key={spot.id}
              className={`flex max-w-xl flex-col items-center rounded-xl bg-black/45 px-6 py-4 text-center text-parchment backdrop-blur-[2px] transition-all duration-1000 ${phase === "faded" ? "invisible opacity-0" : ""}`}
            >
              {showFlat && spot.dice && spot.dice.length > 0 && (
                <div className="mb-2 flex flex-wrap justify-center gap-2">
                  {spot.dice.map((d, i) => (
                    <div key={i} className="flex flex-col items-center gap-0.5">
                      <div
                        style={{ animationDelay: `${i * 60}ms` }}
                        className={`${phase === "flat" ? "animate-tumble" : ""} flex h-10 w-10 items-center justify-center rounded-lg border-2 text-lg font-bold shadow ${
                          d.kept ? "border-gold bg-parchment text-ink" : "border-ink-soft bg-parchment/40 text-ink/50 line-through"
                        }`}
                      >
                        {d.value}
                      </div>
                      <span className="text-[10px] opacity-60">d{d.sides}</span>
                    </div>
                  ))}
                </div>
              )}
              {(phase === "settled" || phase === "faded") && (
                <div className="animate-pop">
                  {spot.total !== undefined && <div className="font-display text-7xl leading-none drop-shadow-[0_4px_12px_rgba(0,0,0,0.8)]">{spot.total}</div>}
                  <div className="mt-1 text-xl">{spot.title}</div>
                  {spot.detail && <div className="mt-1 text-sm opacity-75">{spot.detail}</div>}
                </div>
              )}
              {(phase === "settled" || phase === "faded") && banner && (
                <div className={`animate-stamp mt-2 font-display text-6xl tracking-wide drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)] ${banner.cls}`}>{banner.text}</div>
              )}
            </div>
          )
        ) : (
          !stage?.scene && stage?.view !== "map" && <p className="mb-auto self-center pt-24 font-display text-3xl text-parchment/40">The table awaits…</p>
        )}
        {stage && <DialogueBox stage={stage} />}
      </div>

      <ol className="pointer-events-none absolute bottom-2 left-3 hidden max-w-sm space-y-0.5 text-sm text-parchment/70 xl:block">
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

function PartyHud({ highlight, hurt }: { highlight?: string; hurt?: string }) {
  const mice = useRoom(useShallow((s) => Object.values(s.state?.mice ?? {})));
  if (mice.length === 0) return null;
  return (
    <div className="pointer-events-none relative flex flex-wrap gap-2 p-2">
      {mice.map((m) => (
        <div
          key={m.id}
          data-hud={m.id}
          className={`flex w-44 items-center gap-2 rounded-lg border bg-black/40 px-2 py-1 text-parchment transition ${
            highlight === m.id ? "scale-105 border-gold shadow-[0_0_12px_rgba(216,162,58,0.6)]" : "border-white/10"
          } ${m.dead ? "opacity-50 grayscale" : ""} ${hurt === m.id ? "animate-hurt" : ""}`}
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
