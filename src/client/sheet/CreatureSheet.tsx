import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { HIRELING_TYPES } from "../../shared/data/hirelings";
import { gritForLevel, levelForXp, xpForLevel } from "../../shared/rules/advancement";
import { HIRELING_LAYOUT, MOUSE_LAYOUT, armourDefence, isEncumbered, pipCapacity, wieldedWeapons } from "../../shared/rules/inventory";
import { disadvantageReasons, type SaveMode } from "../../shared/rules/saves";
import { STATS, type Creature, type Hireling, type Mouse, type Stat } from "../../shared/rules/types";
import { useTarget } from "../combat/ui";
import { useCanEdit, useRoom } from "../room";
import { Bar, Btn, SectionTitle } from "../ui";
import { AddCardDialog } from "./AddCardDialog";
import { CardMenu } from "./CardMenu";
import { InventoryGrid } from "./InventoryGrid";
import { MousePortrait } from "./MousePortrait";

const LABEL: Record<Stat | "hp", string> = { str: "STR", dex: "DEX", wil: "WIL", hp: "HP" };

function isMouse(c: Creature): c is Mouse {
  return "ownerId" in c;
}

export function CreatureSheet({ creature, compact = false }: { creature: Creature; compact?: boolean }) {
  const state = useRoom((s) => s.state);
  const send = useRoom((s) => s.send);
  const showToast = useRoom((s) => s.showToast);
  const mouse = isMouse(creature) ? creature : null;
  const ownerId = mouse ? mouse.ownerId : state?.mice[(creature as Hireling).employerId]?.ownerId;
  const editable = useCanEdit(ownerId);
  const layout = mouse ? MOUSE_LAYOUT : HIRELING_LAYOUT;

  const [mode, setMode] = useState<SaveMode>("normal");
  const [editMax, setEditMax] = useState(false);
  const [menuUid, setMenuUid] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [dmg, setDmg] = useState("");
  const [attackMod, setAttackMod] = useState<"normal" | "impaired" | "enhanced">("normal");
  const target = useTarget((s) => s.target);
  // In a fight, attacks from the sheet hit whichever foe this player has targeted.
  const liveTarget = useRoom((s) => (target && s.state?.combat?.foes[target]?.status === "active" ? target : undefined));

  const c = creature;
  const id = c.id;
  const grit = mouse ? mouse.grit : [];
  const encumbered = isEncumbered(c.inventory, grit);
  const weapons = wieldedWeapons(c.inventory);
  const armour = armourDefence(c.inventory);
  const canLevel = levelForXp(c.xp) > c.level;

  const setScore = (field: Stat | "hp", patch: { cur?: number; max?: number }) => send({ t: "setScore", creatureId: id, field, ...patch });

  return (
    <div className={`space-y-4 ${c.dead ? "opacity-80" : ""}`}>
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="shrink-0 overflow-hidden rounded-full border-4 border-bark shadow-md">
          <MousePortrait
            color={mouse?.coat.color ?? "Grey"}
            pattern={mouse?.coat.pattern ?? "Solid"}
            seed={c.id}
            size={compact ? 64 : 104}
            dead={c.dead}
          />
        </div>
        <div className="min-w-0 flex-1">
          <NameField name={c.name} editable={editable} onSave={(name) => send({ t: "editMouse", creatureId: id, name })} big={!compact} />
          <div className="text-ink-soft">
            {mouse ? (
              <>
                {mouse.background} · Level {mouse.level}
              </>
            ) : (
              <>
                {(c as Hireling).type} · works for {state?.mice[(c as Hireling).employerId]?.name ?? "—"}
              </>
            )}
          </div>
          {mouse && !compact && (
            <div className="mt-1 text-sm">
              <span className="font-bold">{mouse.birthsign.sign}</span> ({mouse.birthsign.disposition}) · {mouse.coat.color} {mouse.coat.pattern.toLowerCase()} coat · {mouse.look}
            </div>
          )}
          {!mouse && (
            <div className="text-sm">
              {(c as Hireling).look} · {(c as Hireling).disposition}
            </div>
          )}
          <div className="mt-1 flex flex-wrap gap-1.5">
            {c.dead && <Badge tone="dead">Dead</Badge>}
            {c.incapacitated && !c.dead && <Badge tone="bad">Incapacitated — needs tending & a short rest</Badge>}
            {encumbered && <Badge tone="bad">Encumbered — disadvantage on all saves</Badge>}
            {armour > 0 && <Badge tone="ok">Armour {armour}</Badge>}
          </div>
        </div>
      </div>

      {/* Attributes */}
      <section>
        <SectionTitle
          right={
            editable && (
              <div className="flex items-center gap-1 text-xs">
                {(["advantage", "normal", "disadvantage"] as SaveMode[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setMode(m)}
                    className={`rounded px-1.5 py-0.5 font-bold ${mode === m ? "bg-ink text-parchment" : "bg-ink/10 hover:bg-ink/20"}`}
                  >
                    {m === "normal" ? "Normal" : m === "advantage" ? "Adv" : "Disadv"}
                  </button>
                ))}
                <button onClick={() => setEditMax((v) => !v)} title="Edit maximums" className={`ml-1 rounded px-1.5 py-0.5 ${editMax ? "bg-gold" : "bg-ink/10"}`}>
                  ✎
                </button>
              </div>
            )
          }
        >
          Attributes
        </SectionTitle>
        <div className="grid gap-2 sm:grid-cols-2">
          {STATS.map((s) => {
            const reasons = disadvantageReasons(s, c.inventory, grit);
            return (
              <ScoreRow
                key={s}
                label={LABEL[s]}
                tone={s}
                score={c.stats[s]}
                editable={editable}
                editMax={editMax}
                onSet={(p) => setScore(s, p)}
                note={reasons.length ? `Disadv: ${reasons.join(", ")}` : undefined}
                action={
                  editable && !c.dead ? (
                    <Btn tone="gold" className="text-sm" onClick={() => send({ t: "save", creatureId: id, stat: s, mode })}>
                      Save
                    </Btn>
                  ) : null
                }
              />
            );
          })}
          <ScoreRow label="HP" tone="hp" score={c.hp} editable={editable} editMax={editMax} onSet={(p) => setScore("hp", p)} />
        </div>
      </section>

      {/* Combat */}
      {editable && !c.dead && (
        <section className="rounded-lg bg-ink/5 p-2.5">
          <SectionTitle>Fight</SectionTitle>
          <div className="flex flex-wrap items-center gap-2">
            <Btn tone="ember" onClick={() => send({ t: "attack", creatureId: id, mod: attackMod, targetId: liveTarget })}>
              ⚔ Attack {attackMod === "normal" ? (weapons.length ? weapons.map((w) => w.damage).join(" / ") : "d6 (paws)") : attackMod === "impaired" ? "d4" : "d12"}
            </Btn>
            <select
              value={attackMod}
              onChange={(e) => setAttackMod(e.target.value as typeof attackMod)}
              className="rounded-md border border-ink-soft/40 bg-white/70 px-1.5 py-1 text-sm"
            >
              <option value="normal">Normal</option>
              <option value="impaired">Impaired (d4)</option>
              <option value="enhanced">Enhanced (d12)</option>
            </select>
            <form
              className="flex items-center gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(dmg, 10);
                if (n > 0) send({ t: "damage", creatureId: id, amount: n });
                setDmg("");
              }}
            >
              <input
                value={dmg}
                onChange={(e) => setDmg(e.target.value.replace(/\D/g, ""))}
                inputMode="numeric"
                placeholder="dmg"
                className="w-14 rounded-md border border-ink-soft/40 bg-white/70 px-2 py-1 text-center"
              />
              <Btn type="submit">Take damage</Btn>
            </form>
            {c.usedInFight.length > 0 && (
              <Btn onClick={() => send({ t: "afterFight", creatureId: id })} title="Roll d6 for each used weapon/armour: 4–6 marks usage">
                After the fight ({c.usedInFight.length})
              </Btn>
            )}
          </div>
        </section>
      )}

      {/* Inventory */}
      <section data-inventory={id}>
        <SectionTitle
          right={
            editable && (
              <Btn tone="moss" className="text-sm" onClick={() => setAdding(true)}>
                + Add
              </Btn>
            )
          }
        >
          Inventory
        </SectionTitle>
        <InventoryGrid
          inventory={c.inventory}
          layout={layout}
          grit={mouse ? mouse.grit : null}
          gritMax={mouse ? gritForLevel(mouse.level) : 0}
          editable={editable}
          compact={compact}
          onMove={(uid, anchor, vertical) => send({ t: "moveCard", creatureId: id, uid, anchor, vertical })}
          onGrit={(uid) => send({ t: "toggleGrit", creatureId: id, uid })}
          onUsage={(uid, used) => {
            const delta = used - c.inventory.cards[uid].used;
            if (delta) send({ t: "usage", creatureId: id, uid, delta });
          }}
          onCardClick={setMenuUid}
          onInvalid={showToast}
        />
      </section>

      {/* Rest */}
      {editable && !c.dead && (
        <section className="flex flex-wrap items-center gap-2">
          <span className="font-display text-xl">Rest</span>
          <Btn onClick={() => send({ t: "rest", creatureId: id, kind: "short" })} title="1 Turn: d6+1 HP, clears Frightened">
            Short
          </Btn>
          <Btn onClick={() => send({ t: "rest", creatureId: id, kind: "long" })} title="1 Watch: all HP (or d6 to an attribute), clears Exhausted & Hungry">
            Long
          </Btn>
          <Btn onClick={() => send({ t: "rest", creatureId: id, kind: "full" })} title="A week in safety: everything restored, clears Injured & Drained">
            Full
          </Btn>
        </section>
      )}

      {mouse && !compact && <MouseExtras mouse={mouse} editable={editable} canLevel={canLevel} />}

      {menuUid && <CardMenu creature={c} layout={layout} uid={menuUid} editable={editable} onClose={() => setMenuUid(null)} />}
      {adding && <AddCardDialog creatureId={id} onClose={() => setAdding(false)} />}
    </div>
  );
}

function MouseExtras({ mouse, editable, canLevel }: { mouse: Mouse; editable: boolean; canLevel: boolean }) {
  const send = useRoom((s) => s.send);
  const hirelings = useRoom(useShallow((s) => Object.values(s.state?.hirelings ?? {}).filter((h) => h.employerId === mouse.id)));
  const [xp, setXp] = useState("");
  const [hireType, setHireType] = useState(HIRELING_TYPES[0].name);
  const [confirmRetire, setConfirmRetire] = useState(false);
  const cap = pipCapacity(mouse.inventory);
  const id = mouse.id;

  return (
    <>
      <section className="grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-ink/5 p-2.5">
          <SectionTitle>Pips</SectionTitle>
          <NumberField value={mouse.pips} editable={editable} onSave={(pips) => send({ t: "setPips", creatureId: id, pips })} suffix={` / ${cap}`} />
          {mouse.pips > cap && <p className="text-xs text-ember">Too many pips — carry a purse per 250.</p>}
        </div>
        <div className="rounded-lg bg-ink/5 p-2.5">
          <SectionTitle>Level {mouse.level}</SectionTitle>
          <div className="text-sm">
            {mouse.xp} XP · next at {xpForLevel(mouse.level + 1)}
          </div>
          {editable && (
            <form
              className="mt-1 flex gap-1"
              onSubmit={(e) => {
                e.preventDefault();
                const n = parseInt(xp, 10);
                if (n) send({ t: "addXp", creatureId: id, amount: n });
                setXp("");
              }}
            >
              <input value={xp} onChange={(e) => setXp(e.target.value.replace(/[^\d-]/g, ""))} placeholder="+XP" className="w-16 rounded-md border border-ink-soft/40 bg-white/70 px-2 py-0.5 text-sm" />
              <Btn type="submit" className="text-sm">
                Add
              </Btn>
            </form>
          )}
          {editable && canLevel && (
            <Btn tone="gold" className="mt-2 w-full animate-pulse" onClick={() => send({ t: "levelUp", creatureId: id })}>
              ★ Level up!
            </Btn>
          )}
        </div>
        <div className="rounded-lg bg-ink/5 p-2.5">
          <SectionTitle>Grit {gritForLevel(mouse.level)}</SectionTitle>
          <p className="text-xs text-ink-soft">Drag a Condition into the Grit tray to ignore it until cleared.</p>
        </div>
      </section>

      <section>
        <SectionTitle>Banked items and pips</SectionTitle>
        <BankField value={mouse.bank} editable={editable} onSave={(bank) => send({ t: "editMouse", creatureId: id, bank })} />
      </section>

      <section>
        <SectionTitle
          right={
            editable && (
              <div className="flex gap-1">
                <select value={hireType} onChange={(e) => setHireType(e.target.value)} className="rounded-md border border-ink-soft/40 bg-white/70 px-1.5 py-1 text-sm">
                  {HIRELING_TYPES.map((t) => (
                    <option key={t.id} value={t.name}>
                      {t.name} ({t.wage}p/day)
                    </option>
                  ))}
                </select>
                <Btn className="text-sm" onClick={() => send({ t: "hire", creatureId: id, type: hireType })}>
                  Hire
                </Btn>
              </div>
            )
          }
        >
          Hirelings
        </SectionTitle>
        {hirelings.length === 0 && <p className="text-sm text-ink-soft italic">No hirelings yet.</p>}
        <div className="space-y-3">
          {hirelings.map((h) => (
            <details key={h.id} className="rounded-lg border border-ink-soft/30 bg-white/30 p-2.5">
              <summary className="cursor-pointer font-display text-lg">
                {h.name} the {h.type} · HP {h.hp.cur}/{h.hp.max}
              </summary>
              <div className="mt-2">
                <CreatureSheet creature={h} compact />
                {editable && (
                  <Btn tone="ghost" className="mt-2 text-sm" onClick={() => send({ t: "dismissHireling", creatureId: h.id })}>
                    Dismiss {h.name}
                  </Btn>
                )}
              </div>
            </details>
          ))}
        </div>
      </section>

      {editable && (
        <section className="border-t border-ink-soft/20 pt-3">
          {confirmRetire ? (
            <div className="flex items-center gap-2">
              <span className="text-sm">Remove {mouse.name} from the table for good?</span>
              <Btn tone="ember" onClick={() => send({ t: "retireMouse", creatureId: id })}>
                Yes, retire
              </Btn>
              <Btn tone="ghost" onClick={() => setConfirmRetire(false)}>
                Cancel
              </Btn>
            </div>
          ) : (
            <Btn tone={mouse.dead ? "ember" : "ghost"} onClick={() => setConfirmRetire(true)}>
              {mouse.dead ? "Lay to rest & roll a new mouse" : "Retire this mouse"}
            </Btn>
          )}
        </section>
      )}
    </>
  );
}

function Badge({ tone, children }: { tone: "ok" | "bad" | "dead"; children: React.ReactNode }) {
  const cls = tone === "ok" ? "bg-moss/20 text-moss" : tone === "bad" ? "bg-ember/20 text-ember" : "bg-ink text-parchment";
  return <span className={`rounded-full px-2 py-0.5 text-xs font-bold ${cls}`}>{children}</span>;
}

function ScoreRow({
  label,
  tone,
  score,
  editable,
  editMax,
  onSet,
  action,
  note,
}: {
  label: string;
  tone: "str" | "dex" | "wil" | "hp";
  score: { max: number; cur: number };
  editable: boolean;
  editMax: boolean;
  onSet: (p: { cur?: number; max?: number }) => void;
  action?: React.ReactNode;
  note?: string;
}) {
  return (
    <div className="rounded-lg border border-ink-soft/25 bg-white/40 px-2.5 py-1.5">
      <div className="flex items-center gap-2">
        <span className="w-10 font-display text-2xl">{label}</span>
        {editable && (
          <button onClick={() => onSet({ cur: Math.max(0, score.cur - 1) })} className="h-6 w-6 rounded bg-ink/10 font-bold hover:bg-ink/20" aria-label={`Lower ${label}`}>
            −
          </button>
        )}
        <span data-testid={`score-${label}`} className="min-w-14 text-center text-xl font-bold tabular-nums">
          {score.cur}
          <span className="text-sm font-normal text-ink-soft">/{editMax ? "" : score.max}</span>
          {editMax && (
            <input
              type="number"
              defaultValue={score.max}
              min={0}
              max={30}
              onBlur={(e) => {
                const v = parseInt(e.target.value, 10);
                if (!Number.isNaN(v) && v !== score.max) onSet({ max: v, cur: Math.min(score.cur, v) });
              }}
              className="w-12 rounded border border-ink-soft/40 bg-white px-1 text-sm"
            />
          )}
        </span>
        {editable && (
          <button onClick={() => onSet({ cur: Math.min(score.max, score.cur + 1) })} className="h-6 w-6 rounded bg-ink/10 font-bold hover:bg-ink/20" aria-label={`Raise ${label}`}>
            +
          </button>
        )}
        <div className="ml-auto">{action}</div>
      </div>
      <div className="mt-1">
        <Bar cur={score.cur} max={score.max} tone={tone} />
      </div>
      {note && <div className="mt-0.5 text-xs text-ember">{note}</div>}
    </div>
  );
}

function NameField({ name, editable, onSave, big }: { name: string; editable: boolean; onSave: (n: string) => void; big: boolean }) {
  const [editing, setEditing] = useState(false);
  const cls = big ? "text-4xl" : "text-2xl";
  if (!editing || !editable) {
    return (
      <h2 className={`font-display ${cls} leading-none ${editable ? "cursor-text" : ""}`} onDoubleClick={() => editable && setEditing(true)} title={editable ? "Double-click to rename" : undefined}>
        {name}
      </h2>
    );
  }
  return (
    <input
      autoFocus
      defaultValue={name}
      maxLength={40}
      onBlur={(e) => {
        const v = e.target.value.trim();
        if (v && v !== name) onSave(v);
        setEditing(false);
      }}
      onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
      className={`w-full rounded border border-ink-soft/40 bg-white/70 px-1 font-display ${cls}`}
    />
  );
}

function NumberField({ value, editable, onSave, suffix }: { value: number; editable: boolean; onSave: (n: number) => void; suffix?: string }) {
  return (
    <div className="flex items-baseline gap-1">
      {editable ? (
        <input
          key={value}
          type="number"
          defaultValue={value}
          min={0}
          onBlur={(e) => {
            const v = parseInt(e.target.value, 10);
            if (!Number.isNaN(v) && v !== value) onSave(v);
          }}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
          className="w-24 rounded border border-ink-soft/40 bg-white/70 px-1.5 py-0.5 text-xl font-bold"
        />
      ) : (
        <span className="text-xl font-bold">{value}</span>
      )}
      {suffix && <span className="text-sm text-ink-soft">{suffix}</span>}
    </div>
  );
}

function BankField({ value, editable, onSave }: { value: string; editable: boolean; onSave: (v: string) => void }) {
  if (!editable) return <p className="text-sm whitespace-pre-wrap">{value || "—"}</p>;
  return (
    <textarea
      key={value}
      defaultValue={value}
      maxLength={500}
      rows={2}
      placeholder="Pips and items stored in a settlement bank…"
      onBlur={(e) => e.target.value !== value && onSave(e.target.value)}
      className="w-full rounded-md border border-ink-soft/40 bg-white/60 px-2 py-1 text-sm"
    />
  );
}
