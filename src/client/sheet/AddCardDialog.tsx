import { useMemo, useState } from "react";
import { CONDITIONS } from "../../shared/data/conditions";
import { ITEMS } from "../../shared/data/items";
import { useRoom } from "../room";
import { Btn, Modal } from "../ui";

const KIND_ORDER = ["weapon", "armour", "ammo", "light", "ration", "purse", "spell", "gear"];
const KIND_LABEL: Record<string, string> = {
  weapon: "Weapons",
  armour: "Armour",
  ammo: "Ammunition",
  light: "Light",
  ration: "Food",
  purse: "Pips",
  spell: "Spells",
  gear: "Gear",
};

export function AddCardDialog({ creatureId, onClose }: { creatureId: string; onClose: () => void }) {
  const send = useRoom((s) => s.send);
  const [tab, setTab] = useState<"item" | "condition">("item");
  const [query, setQuery] = useState("");
  const [customName, setCustomName] = useState("");
  const [customSize, setCustomSize] = useState<1 | 2>(1);
  const [customClear, setCustomClear] = useState("");

  const items = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = Object.values(ITEMS).filter((i) => !q || i.name.toLowerCase().includes(q));
    return KIND_ORDER.map((k) => [k, list.filter((i) => i.kind === k).sort((a, b) => a.name.localeCompare(b.name))] as const).filter(([, l]) => l.length);
  }, [query]);

  const done = (fn: () => void) => {
    fn();
    onClose();
  };

  return (
    <Modal title="Add to inventory" onClose={onClose}>
      <div className="mb-3 flex gap-2">
        <Btn tone={tab === "item" ? "gold" : "plain"} onClick={() => setTab("item")}>
          Item
        </Btn>
        <Btn tone={tab === "condition" ? "gold" : "plain"} onClick={() => setTab("condition")}>
          Condition
        </Btn>
      </div>

      {tab === "item" ? (
        <>
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search items…"
            className="mb-3 w-full rounded-md border border-ink-soft/40 bg-white/70 px-3 py-2 outline-none focus:border-ember"
          />
          <div className="max-h-72 space-y-3 overflow-y-auto pr-1">
            {items.map(([kind, list]) => (
              <div key={kind}>
                <div className="mb-1 text-xs font-bold tracking-wide text-ink-soft uppercase">{KIND_LABEL[kind]}</div>
                <div className="flex flex-wrap gap-1.5">
                  {list.map((i) => (
                    <Btn key={i.id} onClick={() => done(() => send({ t: "addItem", creatureId, defId: i.id }))} className="text-sm font-normal">
                      {i.name}
                      {i.size === 2 && <span className="ml-1 text-xs text-ink-soft">(2 slots)</span>}
                    </Btn>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <form
            className="mt-4 flex flex-wrap items-center gap-2 border-t border-ink-soft/20 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (customName.trim()) done(() => send({ t: "addItem", creatureId, custom: { name: customName.trim(), size: customSize } }));
            }}
          >
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Something else (custom item)"
              maxLength={40}
              className="min-w-0 flex-1 rounded-md border border-ink-soft/40 bg-white/70 px-3 py-1.5 outline-none focus:border-ember"
            />
            <select value={customSize} onChange={(e) => setCustomSize(Number(e.target.value) as 1 | 2)} className="rounded-md border border-ink-soft/40 bg-white/70 px-2 py-1.5">
              <option value={1}>1 slot</option>
              <option value={2}>2 slots</option>
            </select>
            <Btn tone="moss" type="submit">
              Add
            </Btn>
          </form>
        </>
      ) : (
        <>
          <div className="grid gap-2 sm:grid-cols-2">
            {Object.values(CONDITIONS).map((c) => (
              <button
                key={c.id}
                onClick={() => done(() => send({ t: "addCondition", creatureId, defId: c.id }))}
                className="rounded-md border-2 border-ember/60 bg-[#fbe9e2] p-2 text-left hover:brightness-95"
              >
                <div className="font-display text-xl">{c.name}</div>
                {c.effect && <div className="text-xs italic">{c.effect}</div>}
                <div className="text-xs font-bold text-ink-soft">Clear: {c.clearText}</div>
              </button>
            ))}
          </div>
          <form
            className="mt-4 flex flex-wrap gap-2 border-t border-ink-soft/20 pt-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (customName.trim()) done(() => send({ t: "addCondition", creatureId, custom: { name: customName.trim(), clearText: customClear.trim() || "GM decides" } }));
            }}
          >
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              placeholder="Custom condition (e.g. Soaked)"
              maxLength={40}
              className="min-w-0 flex-1 rounded-md border border-ink-soft/40 bg-white/70 px-3 py-1.5 outline-none focus:border-ember"
            />
            <input
              value={customClear}
              onChange={(e) => setCustomClear(e.target.value)}
              placeholder="Clear: …"
              maxLength={60}
              className="min-w-0 flex-1 rounded-md border border-ink-soft/40 bg-white/70 px-3 py-1.5 outline-none focus:border-ember"
            />
            <Btn tone="ember" type="submit">
              Add
            </Btn>
          </form>
        </>
      )}
    </Modal>
  );
}
