import type { CombatState, Foe } from "../../shared/state";
import { Icon } from "../Icon";
import type { IconName } from "../icons.gen";
import { useRoom } from "../room";
import { MousePortrait } from "../sheet/MousePortrait";
import { Bar } from "../ui";
import { combatant, useTarget } from "./ui";

const STATUS_LABEL = { down: "Down", fled: "Fled", dead: "Slain" } as const;

/** The encounter view laid over the stage: foes across the top, turn order below. */
export function CombatStage({ combat, hurtId }: { combat: CombatState; hurtId?: string }) {
  const state = useRoom((s) => s.state!);
  const you = useRoom((s) => s.you);
  const { target, setTarget } = useTarget();
  const current = combat.order[combat.turn];
  const foes = Object.values(combat.foes);

  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(80,10,0,0.15)_0%,rgba(0,0,0,0.55)_100%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-16 z-10 flex flex-col items-center gap-3 px-3">
        <div className="font-display text-3xl text-parchment drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)]">Round {combat.round}</div>
        <div className="pointer-events-auto flex flex-wrap justify-center gap-3">
          {foes.map((f) => (
            <FoeToken key={f.id} foe={f} acting={current === f.id} targeted={target === f.id} hurt={hurtId === f.id} onClick={() => setTarget(target === f.id ? null : f.id)} />
          ))}
        </div>
        <ol className="pointer-events-auto flex max-w-full flex-wrap items-center justify-center gap-1 rounded-full bg-black/50 px-2 py-1">
          {combat.order.map((id, i) => {
            const c = combatant(state, id);
            if (!c) return null;
            const mine = c.ownerId && c.ownerId === you?.id;
            return (
              <li
                key={id}
                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-bold ${
                  i === combat.turn ? "bg-gold text-ink shadow-[0_0_10px_rgba(216,162,58,0.8)]" : c.side === "foe" ? "bg-ember/40 text-parchment" : "bg-moss/50 text-parchment"
                } ${c.out ? "line-through opacity-40" : ""} ${mine && i !== combat.turn ? "ring-1 ring-gold" : ""}`}
              >
                {i === combat.turn && "▶ "}
                {c.name}
              </li>
            );
          })}
        </ol>
      </div>
    </>
  );
}

function FoeToken({ foe, acting, targeted, hurt, onClick }: { foe: Foe; acting: boolean; targeted: boolean; hurt: boolean; onClick: () => void }) {
  const out = foe.status !== "active";
  return (
    <button
      onClick={onClick}
      disabled={out}
      title={out ? foe.name : `Target ${foe.name}`}
      aria-label={out ? `${foe.name} (out of the fight)` : `Target ${foe.name}`}
      className={`relative flex w-28 flex-col items-center rounded-xl border-2 bg-black/55 p-2 text-parchment transition ${
        targeted ? "-translate-y-1 border-ember shadow-[0_0_16px_rgba(196,87,42,0.9)]" : acting ? "border-gold" : "border-white/10 hover:border-white/40"
      } ${out ? "opacity-50 grayscale" : ""} ${hurt ? "animate-hurt" : ""}`}
    >
      <div
        className={`flex h-16 w-16 items-center justify-center rounded-full ${acting ? "animate-pulse" : ""}`}
        style={{ background: `radial-gradient(circle at 35% 30%, ${foe.tint}, #1b1410 85%)` }}
      >
        <Icon name={foe.icon as IconName} className="h-11 w-11 drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
      </div>
      <div className="mt-1 w-full truncate text-center text-sm font-bold">{foe.name}</div>
      <div className="mt-0.5 flex w-full items-center gap-1 text-[10px]">
        <span className="w-6">HP</span>
        <Bar cur={foe.hp.cur} max={foe.hp.max} tone="hp" />
      </div>
      <div className="flex w-full items-center gap-1 text-[10px]">
        <span className="w-6">STR</span>
        <Bar cur={foe.str.cur} max={foe.str.max} tone="str" />
      </div>
      {out && (
        <span className="absolute top-8 left-1/2 -translate-x-1/2 -rotate-12 rounded border-2 border-ember bg-black/60 px-1.5 font-display text-lg text-ember">
          {STATUS_LABEL[foe.status as keyof typeof STATUS_LABEL]}
        </span>
      )}
      {targeted && <span className="absolute -top-2 -right-2 rounded-full bg-ember px-1.5 text-[10px] font-bold">TARGET</span>}
    </button>
  );
}

/** Shown to a player when one of their creatures is acting. */
export function YourTurnBanner({ name, seed, coat }: { name: string; seed: string; coat?: { color: string; pattern: string } }) {
  return (
    <div className="animate-rise pointer-events-none absolute inset-x-0 top-[46%] z-20 flex justify-center">
      <div className="flex items-center gap-2 rounded-full border-2 border-gold bg-black/70 px-5 py-1.5 font-display text-2xl text-gold shadow-xl">
        <span className="overflow-hidden rounded-full">
          <MousePortrait color={coat?.color ?? "Grey"} pattern={coat?.pattern ?? "Solid"} seed={seed} size={28} />
        </span>
        {name}'s turn!
      </div>
    </div>
  );
}
