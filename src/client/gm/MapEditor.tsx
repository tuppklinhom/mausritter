import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { HEX_TYPES, type HexType } from "../../shared/data/hexcrawl";
import { areAdjacent } from "../../shared/rules/hexmap";
import { Icon } from "../Icon";
import { HexMap, terrainName } from "../map/HexMap";
import { useRoom } from "../room";
import { Btn, SectionTitle } from "../ui";

type Tool = "select" | "reveal" | "hide" | HexType;

const input = "w-full rounded-md border border-ink-soft/40 bg-white/70 px-2 py-1 text-sm outline-none focus:border-ember";

/** The GM's view of the hexcrawl: everything visible, with painting and fog tools. */
export function MapEditor() {
  const map = useRoom((s) => s.state!.map);
  const season = useRoom((s) => s.state!.clock.season);
  const view = useRoom((s) => s.state!.stage.view);
  const mice = useRoom(useShallow((s) => Object.values(s.state?.mice ?? {}).filter((m) => !m.dead)));
  const send = useRoom((s) => s.send);
  const [tool, setTool] = useState<Tool>("select");
  const [selected, setSelected] = useState<string | null>(null);
  const [size, setSize] = useState({ cols: map.cols, rows: map.rows });
  const [confirmRegen, setConfirmRegen] = useState(false);

  const empty = Object.keys(map.hexes).length === 0;

  function click(key: string) {
    const hex = map.hexes[key];
    if (tool === "select") return setSelected(key);
    if (tool === "reveal" || tool === "hide") {
      if (hex.revealed !== (tool === "reveal")) send({ t: "mapReveal", keys: [key], revealed: tool === "reveal" });
      return;
    }
    if (hex.type !== tool) send({ t: "mapSetHex", key, patch: { type: tool } });
  }

  const sizePicker = (
    <div className="flex items-center gap-1 text-sm">
      <select className="rounded border border-ink-soft/40 bg-white/70 px-1 py-0.5" value={size.cols} onChange={(e) => setSize({ ...size, cols: Number(e.target.value) })}>
        {Array.from({ length: 15 }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      ×
      <select className="rounded border border-ink-soft/40 bg-white/70 px-1 py-0.5" value={size.rows} onChange={(e) => setSize({ ...size, rows: Number(e.target.value) })}>
        {Array.from({ length: 15 }, (_, i) => (
          <option key={i} value={i + 1}>
            {i + 1}
          </option>
        ))}
      </select>
      <span className="text-ink-soft">hexes</span>
    </div>
  );

  if (empty) {
    return (
      <div className="space-y-3 py-6 text-center">
        <Icon name="treasure-map" className="mx-auto h-16 w-16 text-ink/50" />
        <h3 className="font-display text-3xl">Make a hexcrawl</h3>
        <p className="mx-auto max-w-sm text-sm text-ink-soft">
          Start with a 5×5 map of one-mile hexes and a friendly settlement in the centre. Generating rolls each hex's type, landmark and detail from the rulebook tables; you can change anything after.
        </p>
        <div className="flex justify-center">{sizePicker}</div>
        <div className="flex justify-center gap-2">
          <Btn tone="ember" onClick={() => send({ t: "mapGenerate", ...size })}>
            🎲 Generate map
          </Btn>
          <Btn onClick={() => send({ t: "mapResize", ...size })}>Blank map</Btn>
        </div>
      </div>
    );
  }

  const sel = selected ? map.hexes[selected] : undefined;
  const partyHere = selected !== null && map.party === selected;
  const adjacent = selected && map.party ? areAdjacent(map.party, selected) : false;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Btn tone={view === "map" ? "gold" : "ember"} onClick={() => send({ t: "setStageView", view: view === "map" ? "scene" : "map" })}>
          {view === "map" ? "Map is on stage · show scene" : "Show map on stage"}
        </Btn>
        <span className="text-xs text-ink-soft">Players see only revealed hexes.</span>
      </div>

      <div className="flex flex-wrap gap-1">
        <ToolBtn active={tool === "select"} onClick={() => setTool("select")} icon="position-marker" label="Select" />
        <ToolBtn active={tool === "reveal"} onClick={() => setTool("reveal")} icon="eye-target" label="Reveal" />
        <ToolBtn active={tool === "hide"} onClick={() => setTool("hide")} icon="whirlwind" label="Fog" />
        <span className="mx-1 w-px bg-ink-soft/30" />
        {HEX_TYPES.map((t) => (
          <ToolBtn key={t.id} active={tool === t.id} onClick={() => setTool(t.id)} label={t.name} swatch={t.id} />
        ))}
      </div>

      <div className="rounded-lg bg-[#e3d3b0] p-1.5 shadow-inner">
        <HexMap map={map} season={season} gmView selected={tool === "select" ? selected : null} party={mice} onHexClick={click} className="max-h-[420px] w-full" />
      </div>

      {sel && tool === "select" && (
        <section className="rounded-lg border border-ink-soft/30 bg-white/40 p-3">
          <SectionTitle
            right={
              <label className="flex items-center gap-1 text-sm">
                <input type="checkbox" checked={sel.revealed} onChange={(e) => send({ t: "mapReveal", keys: [selected!], revealed: e.target.checked })} />
                Revealed
              </label>
            }
          >
            Hex {selected}
          </SectionTitle>
          <div className="grid gap-2 sm:grid-cols-2">
            <label className="text-sm">
              <span className="font-bold">Type</span>
              <div className="flex gap-1">
                <select className={input} value={sel.type} onChange={(e) => send({ t: "mapSetHex", key: selected!, patch: { type: e.target.value as HexType } })}>
                  {HEX_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
                <Btn className="px-1.5 text-sm" title="Roll type and landmark" onClick={() => send({ t: "mapRollHex", key: selected!, part: "type" })}>
                  🎲
                </Btn>
              </div>
            </label>
            <TextField label="Name on map" value={sel.name} max={40} onSave={(name) => send({ t: "mapSetHex", key: selected!, patch: { name } })} placeholder={terrainName(sel.type)} />
            <TextField
              label="Landmark"
              value={sel.landmark}
              max={80}
              onSave={(landmark) => send({ t: "mapSetHex", key: selected!, patch: { landmark } })}
              onRoll={sel.type === "settlement" ? undefined : () => send({ t: "mapRollHex", key: selected!, part: "landmark" })}
            />
            <TextField label="Detail" value={sel.detail} max={160} onSave={(detail) => send({ t: "mapSetHex", key: selected!, patch: { detail } })} onRoll={() => send({ t: "mapRollHex", key: selected!, part: "detail" })} />
          </div>
          <label className="mt-2 flex items-center gap-1.5 text-sm">
            <input type="checkbox" checked={!!sel.difficult} onChange={(e) => send({ t: "mapSetHex", key: selected!, patch: { difficult: e.target.checked } })} />
            Difficult terrain (streams, roads, rocks, hills): two watches to cross
          </label>
          <label className="mt-2 block text-sm">
            <span className="font-bold">GM notes</span>
            <textarea key={`${selected}-${sel.notes ?? ""}`} className={input} rows={2} maxLength={2000} defaultValue={sel.notes ?? ""} onBlur={(e) => e.target.value !== (sel.notes ?? "") && send({ t: "mapSetHex", key: selected!, patch: { notes: e.target.value } })} />
          </label>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            {partyHere ? (
              <span className="text-sm font-bold text-moss">The party is here.</span>
            ) : (
              <>
                <Btn tone="ember" className="text-sm" onClick={() => send({ t: "mapMoveParty", key: selected!, travel: true })}>
                  Travel here ({sel.difficult ? 2 : 1} watch{sel.difficult ? "es" : ""})
                </Btn>
                <Btn className="text-sm" onClick={() => send({ t: "mapMoveParty", key: selected!, travel: false })}>
                  Place party here
                </Btn>
                {map.party && !adjacent && <span className="text-xs text-ember">Not next to the party's hex.</span>}
              </>
            )}
          </div>
        </section>
      )}

      <details className="text-sm">
        <summary className="cursor-pointer text-ink-soft">Map size & regenerate</summary>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          {sizePicker}
          <Btn className="text-sm" onClick={() => send({ t: "mapResize", ...size })}>
            Resize (keeps hexes)
          </Btn>
          {confirmRegen ? (
            <Btn
              tone="ember"
              className="text-sm"
              onClick={() => {
                send({ t: "mapGenerate", ...size });
                setConfirmRegen(false);
                setSelected(null);
              }}
            >
              Replace the whole map?
            </Btn>
          ) : (
            <Btn tone="ghost" className="text-sm" onClick={() => setConfirmRegen(true)}>
              🎲 Regenerate…
            </Btn>
          )}
        </div>
      </details>
    </div>
  );
}

const SWATCH: Record<HexType, string> = {
  countryside: "#a9c46c",
  forest: "#5f8b47",
  river: "#6c9dc4",
  town: "#a59c8e",
  settlement: "#dcae6c",
};

function ToolBtn({ active, onClick, label, icon, swatch }: { active: boolean; onClick: () => void; label: string; icon?: Parameters<typeof Icon>[0]["name"]; swatch?: HexType }) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-bold ${active ? "border-ember bg-ember text-parchment" : "border-ink-soft/30 bg-white/50 hover:bg-white/80"}`}
      title={swatch ? `Paint ${label}` : label}
    >
      {icon && <Icon name={icon} className="h-4 w-4" />}
      {swatch && <span className="h-3 w-3 rounded-sm border border-ink/40" style={{ background: SWATCH[swatch] }} />}
      {label}
    </button>
  );
}

function TextField({ label, value, max, onSave, onRoll, placeholder }: { label: string; value?: string; max: number; onSave: (v: string) => void; onRoll?: () => void; placeholder?: string }) {
  return (
    <label className="text-sm">
      <span className="font-bold">{label}</span>
      <div className="flex gap-1">
        <input
          key={value ?? ""}
          className={input}
          defaultValue={value ?? ""}
          maxLength={max}
          placeholder={placeholder}
          onBlur={(e) => e.target.value !== (value ?? "") && onSave(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
        />
        {onRoll && (
          <Btn className="px-1.5 text-sm" title={`Roll ${label.toLowerCase()}`} onClick={onRoll}>
            🎲
          </Btn>
        )}
      </div>
    </label>
  );
}
