import { useState } from "react";
import { AMBIENCES, BACKDROPS, CREATURE_ICONS, backdropById } from "../../shared/data/scenes";
import { COAT_COLORS, COAT_PATTERNS } from "../../shared/data/details";
import type { Npc, SceneDef } from "../../shared/state";
import { Icon } from "../Icon";
import type { IconName } from "../icons.gen";
import { useRoom } from "../room";
import { NpcPortrait } from "../sheet/NpcPortrait";
import { Btn, Modal } from "../ui";

export function newScene(): SceneDef {
  return { id: crypto.randomUUID(), title: "", backdrop: "meadow", ambience: "meadow", npcs: [], notes: "" };
}

export function newNpc(kind: "mouse" | "creature" = "mouse"): Npc {
  return {
    id: crypto.randomUUID(),
    name: "",
    look: kind === "mouse" ? { kind: "mouse", color: "Tan", pattern: "Solid" } : { kind: "creature", icon: "cat", tint: "#6b4a2b" },
  };
}

const input = "w-full rounded-md border border-ink-soft/40 bg-white/70 px-2.5 py-1.5 outline-none focus:border-ember";

export function SceneEditor({ initial, onClose }: { initial: SceneDef; onClose: () => void }) {
  const send = useRoom((s) => s.send);
  const [scene, setScene] = useState<SceneDef>(initial);
  const [url, setUrl] = useState(initial.backdrop.startsWith("https://") ? initial.backdrop : "");
  const patch = (p: Partial<SceneDef>) => setScene((s) => ({ ...s, ...p }));

  function pickBackdrop(id: string) {
    const def = backdropById(id);
    // Follow the backdrop's mood unless the GM already chose a soundscape.
    const keepAmbience = scene.ambience !== "none" && scene.ambience !== backdropById(scene.backdrop)?.suggestedAmbience;
    patch({ backdrop: id, ambience: keepAmbience || !def ? scene.ambience : def.suggestedAmbience });
    setUrl("");
  }

  function setNpc(i: number, npc: Npc) {
    patch({ npcs: scene.npcs.map((n, j) => (j === i ? npc : n)) });
  }

  const valid = scene.title.trim() !== "" && scene.npcs.every((n) => n.name.trim() !== "");

  return (
    <Modal title={initial.title ? "Edit scene" : "New scene"} onClose={onClose}>
      <div className="space-y-4">
        <div className="grid gap-2 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-bold">Title</span>
            <input autoFocus className={input} value={scene.title} maxLength={60} onChange={(e) => patch({ title: e.target.value })} placeholder="The Rotting Granary" />
          </label>
          <label className="block">
            <span className="text-sm font-bold">Subtitle</span>
            <input className={input} value={scene.subtitle ?? ""} maxLength={120} onChange={(e) => patch({ subtitle: e.target.value || undefined })} placeholder="Something skitters in the dark" />
          </label>
        </div>

        <div>
          <span className="text-sm font-bold">Backdrop</span>
          <div className="mt-1 grid grid-cols-4 gap-1.5 sm:grid-cols-5">
            {BACKDROPS.map((b) => (
              <button
                key={b.id}
                type="button"
                onClick={() => pickBackdrop(b.id)}
                className={`relative h-16 overflow-hidden rounded-md border-2 ${scene.backdrop === b.id ? "border-ember ring-2 ring-ember/40" : "border-transparent"}`}
                title={b.name}
              >
                {b.src ? <img src={b.src} alt="" loading="lazy" className="h-full w-full object-cover" /> : <div className="h-full w-full" style={{ background: b.css }} />}
                <span className="absolute inset-x-0 bottom-0 truncate bg-black/55 px-1 text-[10px] text-parchment">{b.name}</span>
              </button>
            ))}
          </div>
          <input
            className={`${input} mt-2 text-sm`}
            value={url}
            placeholder="…or paste an image link (https://…)"
            onChange={(e) => {
              setUrl(e.target.value);
              if (/^https:\/\//.test(e.target.value)) patch({ backdrop: e.target.value.trim() });
            }}
          />
        </div>

        <label className="block">
          <span className="text-sm font-bold">Soundscape</span>
          <select className={input} value={scene.ambience} onChange={(e) => patch({ ambience: e.target.value })}>
            {AMBIENCES.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>

        <div>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold">Characters in this scene</span>
            <div className="flex gap-1">
              <Btn type="button" className="text-sm" onClick={() => patch({ npcs: [...scene.npcs, newNpc("mouse")] })}>
                + Mouse
              </Btn>
              <Btn type="button" className="text-sm" onClick={() => patch({ npcs: [...scene.npcs, newNpc("creature")] })}>
                + Creature
              </Btn>
            </div>
          </div>
          <div className="mt-1 space-y-2">
            {scene.npcs.map((npc, i) => (
              <NpcEditor key={npc.id} npc={npc} onChange={(n) => setNpc(i, n)} onRemove={() => patch({ npcs: scene.npcs.filter((_, j) => j !== i) })} />
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-sm font-bold">GM notes</span> <span className="text-xs text-ink-soft">(only you see these)</span>
          <textarea className={`${input} text-sm`} rows={3} maxLength={5000} value={scene.notes} onChange={(e) => patch({ notes: e.target.value })} />
        </label>

        <div className="flex justify-end gap-2">
          <Btn tone="ghost" onClick={onClose}>
            Cancel
          </Btn>
          <Btn
            tone="moss"
            disabled={!valid}
            onClick={() => {
              send({ t: "saveScene", scene: { ...scene, title: scene.title.trim(), npcs: scene.npcs.map((n) => ({ ...n, name: n.name.trim() })) } });
              onClose();
            }}
          >
            Save scene
          </Btn>
        </div>
      </div>
    </Modal>
  );
}

function NpcEditor({ npc, onChange, onRemove }: { npc: Npc; onChange: (n: Npc) => void; onRemove: () => void }) {
  const look = npc.look;
  return (
    <div className="flex gap-2 rounded-md border border-ink-soft/25 bg-white/40 p-2">
      <div className="shrink-0 overflow-hidden rounded-full">
        <NpcPortrait npc={npc} size={56} />
      </div>
      <div className="min-w-0 flex-1 space-y-1.5">
        <div className="flex gap-1.5">
          <input className={`${input} py-1`} value={npc.name} maxLength={40} placeholder={look.kind === "mouse" ? "Old Wick, the miller" : "Grey Owl"} onChange={(e) => onChange({ ...npc, name: e.target.value })} />
          <Btn type="button" tone="ghost" onClick={onRemove} aria-label="Remove character">
            ✕
          </Btn>
        </div>
        {look.kind === "mouse" ? (
          <div className="flex gap-1.5">
            <select className={`${input} py-1 text-sm`} value={look.color} onChange={(e) => onChange({ ...npc, look: { ...look, color: e.target.value } })}>
              {COAT_COLORS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
            <select className={`${input} py-1 text-sm`} value={look.pattern} onChange={(e) => onChange({ ...npc, look: { ...look, pattern: e.target.value } })}>
              {COAT_PATTERNS.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </div>
        ) : (
          <div className="flex items-start gap-1.5">
            <div className="flex flex-1 flex-wrap gap-0.5">
              {CREATURE_ICONS.map((ic) => (
                <button
                  key={ic}
                  type="button"
                  title={ic.replace(/-/g, " ")}
                  onClick={() => onChange({ ...npc, look: { ...look, icon: ic } })}
                  className={`rounded p-0.5 ${look.icon === ic ? "bg-ember text-parchment" : "hover:bg-ink/10"}`}
                >
                  <Icon name={ic as IconName} className="h-5 w-5" />
                </button>
              ))}
            </div>
            <input type="color" value={look.tint} onChange={(e) => onChange({ ...npc, look: { ...look, tint: e.target.value } })} className="h-8 w-8 shrink-0 cursor-pointer rounded" title="Medallion colour" />
          </div>
        )}
      </div>
    </div>
  );
}
