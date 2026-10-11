import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { AMBIENCES, backdropById } from "../../shared/data/scenes";
import { TURNS_PER_WATCH, WATCH_NAMES, type Npc, type SceneDef } from "../../shared/state";
import { useRoom } from "../room";
import { NpcPortrait } from "../sheet/NpcPortrait";
import { Btn, SectionTitle } from "../ui";
import { SceneEditor, newScene } from "./SceneEditor";

const NARRATOR: Npc = { id: "narrator", name: "Narrator", look: { kind: "creature", icon: "hood", tint: "#3b2b1f" } };

/** The GM's director's chair: what's on stage, prepared scenes, time, and notes. */
export function GmConsole() {
  return (
    <div className="space-y-5">
      <OnStage />
      <Scenes />
      <TimeTracker />
      <Notes />
    </div>
  );
}

function OnStage() {
  const stage = useRoom((s) => s.state!.stage);
  const send = useRoom((s) => s.send);
  const [speaker, setSpeaker] = useState<string>(NARRATOR.id);
  const [text, setText] = useState("");
  const npcs = [...(stage.scene?.npcs ?? []), NARRATOR];
  const who = npcs.find((n) => n.id === speaker) ?? NARRATOR;

  function say() {
    if (!text.trim()) return;
    send({ t: "say", npc: who, text: text.trim() });
    setText("");
  }

  return (
    <section className="rounded-lg border-2 border-gold/50 bg-gold/10 p-3">
      <SectionTitle
        right={
          stage.scene && (
            <Btn tone="ghost" className="text-sm" onClick={() => send({ t: "clearScene" })}>
              Clear stage
            </Btn>
          )
        }
      >
        On stage: {stage.scene ? <span className="italic">{stage.scene.title}</span> : <span className="text-ink-soft">nothing</span>}
      </SectionTitle>

      <label className="mt-2 flex items-center gap-2 text-sm">
        <span className="font-bold">Sound</span>
        <select value={stage.ambience} onChange={(e) => send({ t: "setAmbience", ambience: e.target.value })} className="flex-1 rounded-md border border-ink-soft/40 bg-white/70 px-2 py-1">
          {AMBIENCES.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      </label>

      <div className="mt-3">
        <div className="mb-1 text-sm font-bold">Speak as</div>
        <div className="flex flex-wrap gap-1.5">
          {npcs.map((n) => (
            <button
              key={n.id}
              onClick={() => setSpeaker(n.id)}
              className={`flex items-center gap-1.5 rounded-full border-2 py-0.5 pr-2.5 pl-0.5 text-sm ${speaker === n.id ? "border-ember bg-ember/15" : "border-transparent bg-white/50 hover:bg-white/80"}`}
            >
              <span className="overflow-hidden rounded-full">
                <NpcPortrait npc={n} size={24} />
              </span>
              {n.name}
            </button>
          ))}
        </div>
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            say();
          }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                say();
              }
            }}
            rows={2}
            maxLength={400}
            placeholder={`What does ${who.name} say? (Enter to speak)`}
            className="min-w-0 flex-1 rounded-md border border-ink-soft/40 bg-white/70 px-2 py-1 text-sm outline-none focus:border-ember"
          />
          <div className="flex flex-col gap-1">
            <Btn tone="ember" type="submit" className="text-sm">
              Say
            </Btn>
            {stage.dialogue && (
              <Btn type="button" tone="ghost" className="text-xs" onClick={() => send({ t: "clearDialogue" })}>
                Hide
              </Btn>
            )}
          </div>
        </form>
      </div>
    </section>
  );
}

function Scenes() {
  const scenes = useRoom(useShallow((s) => s.state?.gm?.scenes ?? []));
  const showing = useRoom((s) => s.state?.stage.scene?.id);
  const send = useRoom((s) => s.send);
  const [editing, setEditing] = useState<SceneDef | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  return (
    <section>
      <SectionTitle
        right={
          <Btn tone="moss" className="text-sm" onClick={() => setEditing(newScene())}>
            + New scene
          </Btn>
        }
      >
        Scenes
      </SectionTitle>
      {scenes.length === 0 && <p className="text-sm text-ink-soft italic">Prepare places for the party to visit: a backdrop, a soundscape and who they'll meet.</p>}
      <ol className="space-y-1.5">
        {scenes.map((sc, i) => {
          const bd = backdropById(sc.backdrop);
          return (
            <li key={sc.id} className={`flex items-center gap-2 rounded-lg border p-1.5 ${showing === sc.id ? "border-gold bg-gold/15" : "border-ink-soft/25 bg-white/40"}`}>
              <div className="h-12 w-20 shrink-0 overflow-hidden rounded">
                {bd?.src || sc.backdrop.startsWith("https://") ? (
                  <img src={bd?.src ?? sc.backdrop} alt="" loading="lazy" className="h-full w-full object-cover" />
                ) : (
                  <div className="h-full w-full" style={{ background: bd?.css }} />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-display text-lg leading-tight">{sc.title}</div>
                <div className="truncate text-xs text-ink-soft">
                  {[sc.subtitle, sc.npcs.map((n) => n.name).join(", ")].filter(Boolean).join(" · ") || "—"}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Btn tone={showing === sc.id ? "gold" : "ember"} className="text-sm" onClick={() => send({ t: "showScene", id: sc.id })} title="Show to everyone">
                  {showing === sc.id ? "Showing" : "▶ Show"}
                </Btn>
                <Btn tone="ghost" className="px-1.5 text-sm" onClick={() => setEditing(sc)} title="Edit">
                  ✎
                </Btn>
                <div className="flex flex-col">
                  <button disabled={i === 0} onClick={() => send({ t: "moveScene", id: sc.id, dir: -1 })} className="px-1 text-xs leading-none disabled:opacity-20" aria-label="Move up">
                    ▲
                  </button>
                  <button disabled={i === scenes.length - 1} onClick={() => send({ t: "moveScene", id: sc.id, dir: 1 })} className="px-1 text-xs leading-none disabled:opacity-20" aria-label="Move down">
                    ▼
                  </button>
                </div>
                {confirmDelete === sc.id ? (
                  <Btn tone="ember" className="text-xs" onClick={() => send({ t: "deleteScene", id: sc.id })}>
                    Delete?
                  </Btn>
                ) : (
                  <Btn tone="ghost" className="px-1.5 text-sm" onClick={() => setConfirmDelete(sc.id)} title="Delete">
                    🗑
                  </Btn>
                )}
              </div>
            </li>
          );
        })}
      </ol>
      {editing && <SceneEditor initial={editing} onClose={() => setEditing(null)} />}
    </section>
  );
}

function TimeTracker() {
  const clock = useRoom((s) => s.state!.clock);
  const send = useRoom((s) => s.send);
  const lit = useRoom(
    useShallow((s) =>
      [...Object.values(s.state?.mice ?? {}), ...Object.values(s.state?.hirelings ?? {})].flatMap((c) =>
        Object.values(c.inventory.cards)
          .filter((k) => k.kind === "light" && k.lit)
          .map((k) => `${c.name}'s ${k.name}`),
      ),
    ),
  );

  return (
    <section>
      <SectionTitle
        right={
          <div className="flex gap-1 text-xs">
            {(["dungeon", "wilderness"] as const).map((m) => (
              <button key={m} onClick={() => send({ t: "setClock", mode: m })} className={`rounded px-2 py-0.5 font-bold capitalize ${clock.mode === m ? "bg-ink text-parchment" : "bg-ink/10"}`}>
                {m}
              </button>
            ))}
            <select value={clock.season} onChange={(e) => send({ t: "setClock", season: e.target.value as typeof clock.season })} className="rounded bg-ink/10 px-1 font-bold capitalize">
              {["spring", "summer", "autumn", "winter"].map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
          </div>
        }
      >
        Turn tracker
      </SectionTitle>

      <div className="flex items-baseline justify-between text-sm">
        <span>
          <b>Day {clock.day}</b> · {WATCH_NAMES[clock.watch]} · turn {clock.turn + 1}/{TURNS_PER_WATCH}
        </span>
      </div>

      {/* The current watch, laid out like the session sheet: six columns of six turns. */}
      <div className="mt-1.5 grid grid-cols-6 gap-1">
        {Array.from({ length: 6 }, (_, col) => (
          <div key={col} className="grid gap-0.5">
            {Array.from({ length: 6 }, (_, row) => {
              const t = col * 6 + row;
              const past = t < clock.turn;
              const encounter = (t + 1) % 3 === 0;
              return (
                <div
                  key={row}
                  title={`Turn ${t + 1}${clock.mode === "dungeon" && encounter ? " · encounter check" : ""}`}
                  className={`h-3.5 rounded-sm border ${past ? "border-ink bg-ink" : t === clock.turn ? "border-ember bg-ember/40" : "border-ink-soft/40"} ${
                    clock.mode === "dungeon" && encounter && !past ? "border-gold" : ""
                  }`}
                />
              );
            })}
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-1.5">
        <Btn className="text-sm" onClick={() => send({ t: "advanceTime", turns: 1 })}>
          +1 turn
        </Btn>
        <Btn className="text-sm" onClick={() => send({ t: "advanceTime", turns: 6 })}>
          +1 hour
        </Btn>
        <Btn className="text-sm" onClick={() => send({ t: "advanceTime", turns: TURNS_PER_WATCH })}>
          +1 watch
        </Btn>
        <Btn tone="ember" className="text-sm" onClick={() => send({ t: "rollEncounter" })}>
          🎲 Encounter die
        </Btn>
      </div>
      <p className="mt-1.5 text-xs text-ink-soft">
        {clock.mode === "dungeon" ? "Encounter die rolls every 3 turns (gold boxes)." : "Encounter die rolls at sunrise and sunset."} Lit lights mark usage every 6 turns
        {lit.length ? `: ${lit.join(", ")}.` : " — nothing is lit."}
      </p>
    </section>
  );
}

function Notes() {
  const notes = useRoom((s) => s.state?.gm?.notes ?? "");
  const send = useRoom((s) => s.send);
  return (
    <section>
      <SectionTitle>Notes</SectionTitle>
      <textarea
        key={notes}
        defaultValue={notes}
        rows={5}
        maxLength={20000}
        placeholder="Only you can see these. Factions, rumours, what's behind the third sack…"
        onBlur={(e) => e.target.value !== notes && send({ t: "setGmNotes", notes: e.target.value })}
        className="w-full rounded-md border border-ink-soft/40 bg-white/60 px-2 py-1 text-sm"
      />
    </section>
  );
}
