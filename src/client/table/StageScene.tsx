import { useEffect, useState } from "react";
import { backdropById } from "../../shared/data/scenes";
import { WATCH_NAMES, type Clock, type StageState } from "../../shared/state";
import { play } from "../fx/sfx";
import { Icon } from "../Icon";
import type { IconName } from "../icons.gen";
import { useShallow } from "zustand/react/shallow";
import { HexMap } from "../map/HexMap";
import { useRoom } from "../room";
import { NpcPortrait } from "../sheet/NpcPortrait";

const WATCH_TINT = [
  "bg-[#0a1638]/55 mix-blend-multiply", // night
  "bg-[#ffcf8a]/10", // morning
  "", // afternoon
  "bg-[#c2551c]/25 mix-blend-multiply", // evening
];

/** Painted backdrop, drawn mood, or the hex map, with the time of day laid over it. */
export function Backdrop({ stage, clock }: { stage: StageState; clock: Clock }) {
  if (stage.view === "map") return <MapBackdrop clock={clock} />;
  const id = stage.scene?.backdrop;
  const def = id ? backdropById(id) : undefined;
  const url = def?.src ?? (id?.startsWith("https://") ? id : undefined);

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {stage.scene ? (
        <div key={stage.scene.shownAt} className="animate-fade-in absolute inset-0">
          {url ? (
            <img src={url} alt="" className="animate-drift h-full w-full object-cover" />
          ) : (
            <div className="h-full w-full" style={{ background: def?.css ?? "#1c140d" }} />
          )}
        </div>
      ) : (
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#4a3828_0%,#1c140d_75%)]" />
      )}
      <div className={`absolute inset-0 transition-colors duration-[2000ms] ${WATCH_TINT[clock.watch] ?? ""}`} />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_45%,rgba(0,0,0,0.65)_100%)]" />
    </div>
  );
}

function MapBackdrop({ clock }: { clock: Clock }) {
  const map = useRoom((s) => s.state!.map);
  const mice = useRoom(useShallow((s) => Object.values(s.state?.mice ?? {}).filter((m) => !m.dead)));
  return (
    <div className="animate-fade-in absolute inset-0 bg-[radial-gradient(ellipse_at_center,#efe2c4_0%,#cdb88f_70%,#9c835a_100%)]">
      <div className="absolute inset-0 flex items-center justify-center px-4 pt-16 pb-24">
        {Object.keys(map.hexes).length || map.party ? (
          <HexMap map={map} season={clock.season} party={mice} className="h-full max-h-full w-full max-w-full drop-shadow-[0_6px_10px_rgba(60,40,20,0.35)]" />
        ) : (
          <p className="font-display text-3xl text-ink/50">The map is still blank…</p>
        )}
      </div>
      <div className={`pointer-events-none absolute inset-0 transition-colors duration-[2000ms] ${WATCH_TINT[clock.watch] ?? ""}`} />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_55%,rgba(60,35,10,0.45)_100%)]" />
    </div>
  );
}

/** Big chapter-style title when a scene is first shown; a small label afterwards. */
export function SceneTitle({ stage }: { stage: StageState }) {
  const scene = stage.scene;
  const [fresh, setFresh] = useState(false);

  useEffect(() => {
    if (!scene) return;
    // Only announce scenes that were just shown, not ones already up when we joined.
    if (Date.now() - scene.shownAt > 8000) return;
    setFresh(true);
    play("scene");
    const t = setTimeout(() => setFresh(false), 4200);
    return () => clearTimeout(t);
  }, [scene?.shownAt]);

  if (!scene || stage.view === "map") return null;
  if (fresh) {
    return (
      <div className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center text-center text-parchment">
        <div className="animate-title font-display text-6xl drop-shadow-[0_4px_16px_rgba(0,0,0,0.9)] md:text-7xl">{scene.title}</div>
        {scene.subtitle && <div className="animate-title-sub mt-3 text-xl italic drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">{scene.subtitle}</div>}
      </div>
    );
  }
  return (
    <div className="animate-fade-in pointer-events-none absolute top-14 right-3 z-10 max-w-[45%] text-right text-parchment drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)]">
      <div className="truncate font-display text-2xl leading-none">{scene.title}</div>
    </div>
  );
}

const WATCH_ICON: IconName[] = ["night-sky", "sunrise", "sun", "sunset"];
const SEASON_ICON: Record<Clock["season"], IconName> = { spring: "flowers", summer: "sun", autumn: "falling-leaf", winter: "snowing" };

export function ClockBadge({ clock }: { clock: Clock }) {
  const lightTurn = clock.turn % 6;
  return (
    <div className="pointer-events-none absolute top-2 right-3 z-10 flex items-center gap-2 rounded-lg bg-black/45 px-2.5 py-1.5 text-xs text-parchment backdrop-blur-[2px]">
      <Icon name={WATCH_ICON[clock.watch]} className="h-6 w-6 text-gold" />
      <div className="leading-tight">
        <div className="font-bold">
          Day {clock.day} · {WATCH_NAMES[clock.watch]}
        </div>
        <div className="flex items-center gap-1 opacity-80">
          Turn {clock.turn + 1}/36
          <span className="ml-1 flex gap-0.5" title="Turns toward the next light usage mark">
            {Array.from({ length: 6 }, (_, i) => (
              <span key={i} className={`h-1.5 w-1.5 rounded-full ${i < lightTurn ? "bg-gold" : "bg-white/25"}`} />
            ))}
          </span>
        </div>
      </div>
      <Icon name={clock.mode === "dungeon" ? "cave-entrance" : "footprint"} className="h-5 w-5 opacity-80" />
      <Icon name={SEASON_ICON[clock.season]} className="h-5 w-5 opacity-80" />
    </div>
  );
}

/** JRPG-style speech box. Text types out; click to finish it. */
export function DialogueBox({ stage }: { stage: StageState }) {
  const d = stage.dialogue;
  const [shown, setShown] = useState(0);

  useEffect(() => {
    if (!d) return;
    setShown(0);
    const timer = setInterval(() => setShown((n) => (n >= d.text.length ? (clearInterval(timer), n) : n + 1)), 28);
    return () => clearInterval(timer);
  }, [d?.at]);

  if (!d) return null;
  const done = shown >= d.text.length;
  return (
    <div key={d.at} className="animate-rise relative z-20 mx-auto mb-3 flex w-[min(760px,94%)] items-end gap-3" onClick={() => setShown(d.text.length)}>
      <div className="shrink-0 overflow-hidden rounded-full border-4 border-gold/80 shadow-xl">
        <NpcPortrait npc={d.npc} size={96} />
      </div>
      <div className="relative flex-1 rounded-xl border-2 border-gold/70 bg-[#1d150e]/90 px-4 pt-6 pb-3 text-parchment shadow-2xl">
        <div className="absolute -top-3 left-4 rounded-md border-2 border-gold/70 bg-bark px-2.5 font-display text-xl leading-tight">{d.npc.name}</div>
        <p className="min-h-[3.2em] text-lg leading-snug">
          {d.text.slice(0, shown)}
          <span className="opacity-0">{d.text.slice(shown)}</span>
        </p>
        {done && <span className="animate-bob absolute right-3 bottom-1.5 text-gold">▼</span>}
      </div>
    </div>
  );
}
