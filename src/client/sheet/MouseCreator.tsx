import { useEffect, useState } from "react";
import type { Grant } from "../../shared/data/backgrounds";
import { ITEMS, STARTING_WEAPONS } from "../../shared/data/items";
import type { RollPart } from "../../shared/rules/character";
import { STATS, type Stat } from "../../shared/rules/types";
import { useRoom } from "../room";
import { Btn } from "../ui";
import { MousePortrait } from "./MousePortrait";

const LABEL: Record<Stat, string> = { str: "STR", dex: "DEX", wil: "WIL" };
const STAT_HINT: Record<Stat, string> = { str: "strength & resilience", dex: "speed & agility", wil: "will & charisma" };

function grantName(g: Grant): string {
  return "item" in g ? (ITEMS[g.item]?.name ?? g.item) : `Hireling: ${g.hireling}`;
}

export function MouseCreator() {
  const you = useRoom((s) => s.you);
  const draft = useRoom((s) => (s.you ? s.state?.drafts[s.you.id] : undefined));
  const send = useRoom((s) => s.send);
  const [locked, setLocked] = useState<RollPart[]>([]);
  const [swapFrom, setSwapFrom] = useState<Stat | null>(null);
  const [weapon, setWeapon] = useState("sword");
  const [bonusPick, setBonusPick] = useState<0 | 1>(0);
  /** A name the player typed; overrides the rolled one. */
  const [customName, setCustomName] = useState<string | null>(null);
  /** Changes every roll so the reveal animations replay. */
  const [rollKey, setRollKey] = useState(0);

  useEffect(() => {
    setRollKey((k) => k + 1);
  }, [draft?.name, draft?.stats.str, draft?.stats.dex, draft?.stats.wil, draft?.hp, draft?.pips, draft?.look]);

  if (!you) return null;

  if (!draft) {
    return (
      <div className="flex flex-col items-center gap-4 py-10 text-center">
        <MousePortrait color="Tan" pattern="Solid" seed="new" size={120} />
        <h2 className="font-display text-4xl">Make a mouse</h2>
        <p className="max-w-sm text-ink-soft">The world is very big and very dangerous for a small mouse adventurer. Roll the bones and see who answers the call.</p>
        <Btn tone="ember" className="px-6 py-2 font-display text-2xl" onClick={() => send({ t: "rollMouse", locked: [] })}>
          🎲 Roll a mouse
        </Btn>
      </div>
    );
  }

  const toggleLock = (p: RollPart) => setLocked((l) => (l.includes(p) ? l.filter((x) => x !== p) : [...l, p]));
  const Lock = ({ part }: { part: RollPart }) => (
    <button
      onClick={() => toggleLock(part)}
      title={locked.includes(part) ? "Locked — kept on reroll" : "Unlocked — rerolled"}
      className={`rounded px-1.5 py-0.5 text-sm ${locked.includes(part) ? "bg-gold text-ink" : "bg-ink/10 text-ink-soft hover:bg-ink/20"}`}
    >
      {locked.includes(part) ? "🔒 kept" : "🔓"}
    </button>
  );

  function clickStat(s: Stat) {
    if (!swapFrom) return setSwapFrom(s);
    if (swapFrom !== s) send({ t: "swapStats", a: swapFrom, b: s });
    setSwapFrom(null);
  }

  const highest = Math.max(...STATS.map((s) => draft.stats[s]));
  const name = customName ?? draft.name;

  function reroll() {
    if (!locked.includes("name")) setCustomName(null);
    send({ t: "rollMouse", locked });
  }

  return (
    <div className="space-y-5" key={rollKey}>
      {/* Identity */}
      <div className="flex items-center gap-4">
        <div className="animate-tumble shrink-0 overflow-hidden rounded-full border-4 border-bark">
          <MousePortrait color={draft.coat.color} pattern={draft.coat.pattern} seed={draft.name} size={104} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <input
              value={name}
              onChange={(e) => setCustomName(e.target.value)}
              maxLength={40}
              className="min-w-0 flex-1 rounded border border-transparent bg-transparent font-display text-4xl hover:border-ink-soft/30 focus:border-ember focus:bg-white/50 focus:outline-none"
              aria-label="Name"
            />
            <Lock part="name" />
          </div>
          <div className="mt-1 flex items-start gap-2 text-sm">
            <div className="flex-1">
              <b>{draft.birthsign.sign}</b> ({draft.birthsign.disposition}) · {draft.coat.color} {draft.coat.pattern.toLowerCase()} coat · {draft.look}
            </div>
            <Lock part="details" />
          </div>
        </div>
      </div>

      {/* Attributes */}
      <section>
        <div className="mb-1 flex items-center justify-between">
          <h3 className="font-display text-2xl">Attributes</h3>
          <div className="flex items-center gap-2 text-xs text-ink-soft">
            {swapFrom ? `Swap ${LABEL[swapFrom]} with…` : "3d6, keep the best two · click two to swap"}
            <Lock part="stats" />
          </div>
        </div>
        <div className="grid gap-2">
          {STATS.map((s, row) => {
            const dice = draft.statDice[s];
            const dropped = dice.indexOf(Math.min(...dice));
            return (
              <button
                key={s}
                onClick={() => clickStat(s)}
                className={`flex items-center gap-3 rounded-lg border-2 px-3 py-1.5 text-left transition ${swapFrom === s ? "border-gold bg-gold/20" : "border-ink-soft/20 bg-white/40 hover:border-ink-soft/50"}`}
              >
                <span className="w-12 font-display text-3xl">{LABEL[s]}</span>
                <span className="flex gap-1.5">
                  {dice.map((d, i) => (
                    <span
                      key={i}
                      style={{ animationDelay: `${row * 160 + i * 70}ms` }}
                      className={`animate-tumble flex h-8 w-8 items-center justify-center rounded-md border-2 font-bold ${i === dropped ? "border-ink-soft/40 text-ink/30 line-through" : "border-ink bg-[#fbf6ea]"}`}
                    >
                      {d}
                    </span>
                  ))}
                </span>
                <span className="hidden text-xs text-ink-soft sm:inline">{STAT_HINT[s]}</span>
                <span className="animate-reveal ml-auto font-display text-4xl tabular-nums" style={{ animationDelay: `${row * 160}ms` }}>
                  {draft.stats[s]}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* HP, pips, background */}
      <section className="rounded-lg border-2 border-ink/60 bg-[#fbf6ea] p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-baseline gap-4">
            <span>
              <span className="font-display text-2xl">HP</span> <b className="text-2xl">{draft.hp}</b>
            </span>
            <span>
              <span className="font-display text-2xl">Pips</span> <b className="text-2xl">{draft.pips}</b>
            </span>
          </div>
          <Lock part="hpPips" />
        </div>
        <div className="mt-1 font-display text-3xl">{draft.background}</div>
        <ul className="mt-1 list-inside list-disc text-sm">
          {draft.grants.map((g, i) => (
            <li key={i}>{grantName(g)}</li>
          ))}
          <li>Torches, Rations, and a weapon of your choice</li>
        </ul>
        {draft.bonus && (
          <div className="mt-3 rounded-md bg-gold/20 p-2 text-sm">
            <b>Highest attribute is only {highest}</b> — extra help from a past life as a <b>{draft.bonus.background}</b>:
            {draft.bonus.takeBoth ? (
              <div className="mt-1">You take both: {draft.bonus.options.map(grantName).join(" and ")}.</div>
            ) : (
              <div className="mt-1 flex flex-wrap gap-2">
                {draft.bonus.options.map((g, i) => (
                  <Btn key={i} tone={bonusPick === i ? "gold" : "plain"} onClick={() => setBonusPick(i as 0 | 1)} className="text-sm">
                    {grantName(g)}
                  </Btn>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Weapon */}
      <section>
        <h3 className="mb-1 font-display text-2xl">Choose a weapon</h3>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-5">
          {STARTING_WEAPONS.map((w) => {
            const def = ITEMS[w];
            const dmg = def.weapon!.bothPawsDamage ? `${def.weapon!.damage}/${def.weapon!.bothPawsDamage}` : def.weapon!.damage;
            return (
              <button
                key={w}
                onClick={() => setWeapon(w)}
                className={`rounded-md border-2 px-2 py-1.5 text-left transition ${weapon === w ? "border-ember bg-ember/15" : "border-ink-soft/25 bg-white/40 hover:border-ink-soft/60"}`}
              >
                <div className="font-display text-lg leading-none">{def.name}</div>
                <div className="text-xs text-ink-soft">
                  {dmg}
                  {def.size === 2 ? " · both paws" : ""}
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <div className="flex flex-wrap gap-2 border-t border-ink-soft/20 pt-3">
        <Btn tone="plain" className="font-display text-xl" onClick={reroll}>
          🎲 Reroll {locked.length ? "unlocked" : "everything"}
        </Btn>
        <Btn
          tone="ember"
          className="ml-auto px-5 font-display text-2xl"
          onClick={() => send({ t: "finalizeMouse", weapon, bonusPick: draft.bonus && !draft.bonus.takeBoth ? bonusPick : undefined, name: name.trim() || undefined })}
        >
          Begin the adventure →
        </Btn>
      </div>
    </div>
  );
}
