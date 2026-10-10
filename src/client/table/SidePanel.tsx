import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRoom } from "../room";
import { CreatureSheet } from "../sheet/CreatureSheet";
import { MouseCreator } from "../sheet/MouseCreator";
import { Btn } from "../ui";
import { PartyPanel } from "./PartyPanel";
import { RollLog } from "./RollLog";

type Tab = "mouse" | "party" | "log";

export function SidePanel() {
  const role = useRoom((s) => s.you?.role);
  const [tab, setTab] = useState<Tab>(() => (role === "gm" ? "party" : "mouse"));

  const tabs: [Tab, string][] = [
    ["mouse", role === "gm" ? "My mice" : "My mouse"],
    ["party", "Party"],
    ["log", "Chronicle"],
  ];

  return (
    <aside className="parchment flex min-h-0 w-full flex-col rounded-lg lg:w-[600px] lg:shrink-0">
      <nav className="flex gap-1 border-b border-ink-soft/20 px-2 pt-2">
        {tabs.map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`rounded-t-md px-3 py-1.5 font-display text-xl ${tab === id ? "bg-white/60 text-ink" : "text-ink-soft hover:bg-white/30"}`}
          >
            {label}
          </button>
        ))}
      </nav>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {tab === "mouse" && <MyMice />}
        {tab === "party" && <PartyPanel />}
        {tab === "log" && <RollLog />}
      </div>
    </aside>
  );
}

function MyMice() {
  const you = useRoom((s) => s.you);
  const mine = useRoom(useShallow((s) => Object.values(s.state?.mice ?? {}).filter((m) => m.ownerId === s.you?.id)));
  const hasDraft = useRoom((s) => !!(s.you && s.state?.drafts[s.you.id]));
  const [selected, setSelected] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  if (!you) return null;
  if (mine.length === 0 || creating || hasDraft) {
    return (
      <div>
        {mine.length > 0 && (
          <Btn tone="ghost" className="mb-2" onClick={() => setCreating(false)}>
            ← Back to my mice
          </Btn>
        )}
        <MouseCreator />
      </div>
    );
  }

  const current = mine.find((m) => m.id === selected) ?? mine.find((m) => !m.dead) ?? mine[0];
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-1.5">
        {mine.length > 1 &&
          mine.map((m) => (
            <Btn key={m.id} tone={m.id === current.id ? "gold" : "plain"} className="text-sm" onClick={() => setSelected(m.id)}>
              {m.name}
              {m.dead && " ✝"}
            </Btn>
          ))}
        <Btn tone="ghost" className="ml-auto text-sm" onClick={() => setCreating(true)}>
          + New mouse
        </Btn>
      </div>
      <CreatureSheet creature={current} />
    </div>
  );
}
