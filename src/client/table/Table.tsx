import { useEffect, useState } from "react";
import { navigate } from "../App";
import { useRoom } from "../room";
import { saveName, savedName } from "../session";
import { DiceTray } from "./DiceTray";
import { PartyBar } from "./PartyBar";
import { SidePanel } from "./SidePanel";
import { Stage } from "./Stage";

export function Table({ code }: { code: string }) {
  const [name, setName] = useState(savedName);
  const [joined, setJoined] = useState(() => savedName() !== "");
  const status = useRoom((s) => s.status);
  const fatal = useRoom((s) => s.fatal);
  const hasState = useRoom((s) => s.state !== null);
  const connect = useRoom((s) => s.connect);
  const disconnect = useRoom((s) => s.disconnect);

  useEffect(() => {
    if (!joined) return;
    connect(code, name);
    return disconnect;
    // Name is read once at join; later changes go through "rename", not a reconnect.
  }, [code, joined]);

  if (!joined) {
    return (
      <main className="wood flex min-h-full items-center justify-center p-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (!name.trim()) return;
            saveName(name.trim());
            setJoined(true);
          }}
          className="parchment w-full max-w-sm rounded-lg p-8 shadow-2xl"
        >
          <h1 className="font-display text-3xl">Joining table {code}</h1>
          <label className="mt-6 block text-ink-soft">What should the table call you?</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={30}
            className="mt-2 w-full rounded-md border border-ink-soft/40 bg-white/60 px-3 py-2 text-lg outline-none focus:border-ember"
          />
          <button className="mt-6 w-full rounded-md bg-moss px-4 py-2 font-display text-2xl text-parchment hover:brightness-110">Take a seat</button>
        </form>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="wood flex min-h-full items-center justify-center p-4">
        <div className="parchment max-w-sm rounded-lg p-8 text-center shadow-2xl">
          <p className="font-display text-3xl">No such table</p>
          <p className="mt-2 text-ink-soft">{fatal}</p>
          <button onClick={() => navigate("/")} className="mt-6 rounded-md bg-ember px-4 py-2 text-parchment">
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="wood flex min-h-full flex-col lg:h-full">
      <PartyBar code={code} />
      {hasState ? (
        <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
          <section className="relative flex min-h-[420px] flex-1 flex-col overflow-hidden rounded-lg border border-black/40 shadow-inner">
            <Stage />
            <DiceTray />
          </section>
          <SidePanel />
        </div>
      ) : (
        <p className="m-auto font-display text-3xl text-parchment/50">Laying the table…</p>
      )}
      <Toast />
    </div>
  );
}

function Toast() {
  const toast = useRoom((s) => s.toast);
  if (!toast) return null;
  return (
    <div key={toast.id} className="animate-slide-in fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-md bg-ink px-4 py-2 text-parchment shadow-xl">
      {toast.message}
    </div>
  );
}
