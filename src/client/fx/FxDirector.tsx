import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { CardInstance, ItemKind } from "../../shared/rules/types";
import { Icon, cardIcon } from "../Icon";
import { useRoom } from "../room";
import { play } from "./sfx";

interface Flight {
  id: string;
  name: string;
  card: Pick<CardInstance, "kind" | "defId">;
  from: DOMRect;
  to: DOMRect;
}

/** Where a card should fly: the subject's open inventory if visible, else their HUD tile, else the stage. */
function targetFor(subjectId: string): DOMRect | null {
  for (const sel of [`[data-inventory="${subjectId}"]`, `[data-hud="${subjectId}"]`]) {
    const el = document.querySelector(sel);
    if (el) {
      const r = el.getBoundingClientRect();
      if (r.width > 0 && r.bottom > 0 && r.top < window.innerHeight) return r;
    }
  }
  return null;
}

/** Plays effects that aren't tied to the stage spotlight: loot flying into inventories. */
export function FxDirector() {
  const feed = useRoom((s) => s.feed);
  const [flights, setFlights] = useState<Flight[]>([]);

  useEffect(() => {
    if (!feed) return;
    const stage = document.getElementById("dice-stage")?.getBoundingClientRect();
    const loot = feed.entries.filter((e) => e.loot && e.subjectId);
    if (loot.length) play("loot");
    if (!stage) return;
    const next = loot.flatMap((e) => {
      const to = targetFor(e.subjectId!);
      return to ? [{ id: e.id, name: e.loot!.name, card: { kind: e.loot!.kind as ItemKind, defId: e.loot!.defId }, from: stage, to }] : [];
    });
    if (next.length) setFlights((f) => [...f, ...next]);
  }, [feed]);

  return createPortal(
    <>
      {flights.map((f) => (
        <FlyingCard key={f.id} flight={f} onDone={() => setFlights((all) => all.filter((x) => x.id !== f.id))} />
      ))}
    </>,
    document.body,
  );
}

function FlyingCard({ flight, onDone }: { flight: Flight; onDone: () => void }) {
  const [el, setEl] = useState<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!el) return;
    const { from, to } = flight;
    const sx = from.left + from.width / 2 - 56;
    const sy = from.top + from.height / 2 - 70;
    const ex = to.left + to.width / 2 - 56;
    const ey = to.top + to.height / 2 - 70;
    const anim = el.animate(
      [
        { transform: `translate(${sx}px, ${sy + 40}px) scale(0.4) rotate(-20deg)`, opacity: 0 },
        { transform: `translate(${sx}px, ${sy}px) scale(1.25) rotate(4deg)`, opacity: 1, offset: 0.3 },
        { transform: `translate(${sx}px, ${sy}px) scale(1.2) rotate(-2deg)`, opacity: 1, offset: 0.55 },
        { transform: `translate(${ex}px, ${ey}px) scale(0.35) rotate(12deg)`, opacity: 0.2 },
      ],
      { duration: 1500, easing: "cubic-bezier(0.5, 0, 0.3, 1)", fill: "forwards" },
    );
    anim.onfinish = onDone;
    return () => anim.cancel();
  }, [el]);

  return (
    <div ref={setEl} className="pointer-events-none fixed top-0 left-0 z-[60] flex h-[140px] w-[112px] flex-col rounded-lg border-2 border-ink bg-[#fbf6ea] p-2 text-ink shadow-[0_0_30px_rgba(216,162,58,0.8)]" style={{ opacity: 0 }}>
      <div className="truncate font-display text-lg leading-tight">{flight.name}</div>
      <div className="flex flex-1 items-center justify-center text-ink/80">
        <Icon name={cardIcon(flight.card)} className="h-14 w-14" />
      </div>
    </div>
  );
}
