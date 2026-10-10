import { useEffect, useState } from "react";
import { navigate } from "../App";
import { useRoom } from "../room";
import { saveName, savedName } from "../session";
import { DiceTray } from "./DiceTray";
import { PartyBar } from "./PartyBar";
import { RollLog } from "./RollLog";
import { Stage } from "./Stage";

export function Table({ code }: { code: string }) {
  const [name, setName] = useState(savedName);
  const [joined, setJoined] = useState(() => savedName() !== "");
  const { status, error, connect, disconnect } = useRoom();

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
          <button className="mt-6 w-full rounded-md bg-moss px-4 py-2 font-display text-2xl text-parchment hover:brightness-110">
            Take a seat
          </button>
        </form>
      </main>
    );
  }

  if (status === "error") {
    return (
      <main className="wood flex min-h-full items-center justify-center p-4">
        <div className="parchment max-w-sm rounded-lg p-8 text-center shadow-2xl">
          <p className="font-display text-3xl">No such table</p>
          <p className="mt-2 text-ink-soft">{error ?? "This table could not be found."}</p>
          <button onClick={() => navigate("/")} className="mt-6 rounded-md bg-ember px-4 py-2 text-parchment">
            Back
          </button>
        </div>
      </main>
    );
  }

  return (
    <div className="wood flex h-full flex-col">
      <PartyBar code={code} />
      <div className="flex min-h-0 flex-1 flex-col gap-3 p-3 lg:flex-row">
        <section className="relative flex min-h-[320px] flex-1 flex-col overflow-hidden rounded-lg border border-black/40 shadow-inner">
          <Stage />
          <DiceTray />
        </section>
        <aside className="parchment flex max-h-[40vh] w-full flex-col rounded-lg lg:max-h-none lg:w-80">
          <RollLog />
        </aside>
      </div>
    </div>
  );
}
