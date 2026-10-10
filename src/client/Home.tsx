import { useState } from "react";
import { isValidCode, normalizeCode, type CreateRoomResponse } from "../shared/protocol";
import { navigate } from "./App";
import { saveGmKey } from "./session";

export function Home() {
  const [joinCode, setJoinCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function createRoom() {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/rooms", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      const { code, gmKey } = (await res.json()) as CreateRoomResponse;
      saveGmKey(code, gmKey);
      navigate(`/r/${code}`);
    } catch (e) {
      setError(`Could not create a table: ${(e as Error).message}`);
    } finally {
      setBusy(false);
    }
  }

  async function joinRoom(e: React.FormEvent) {
    e.preventDefault();
    const code = normalizeCode(joinCode);
    if (!isValidCode(code)) return setError("Table codes are 6 letters or numbers.");
    const res = await fetch(`/api/rooms/${code}`);
    const { exists } = (await res.json()) as { exists: boolean };
    if (!exists) return setError(`No table with code ${code}.`);
    navigate(`/r/${code}`);
  }

  return (
    <main className="wood relative flex min-h-full items-center justify-center p-4">
      <div className="parchment w-full max-w-md rounded-lg p-8 shadow-2xl">
        <h1 className="font-display text-center text-5xl text-ink">Mausritter</h1>
        <p className="mt-1 text-center text-ink-soft">A table for small brave mice</p>

        <button
          onClick={createRoom}
          disabled={busy}
          className="mt-8 w-full rounded-md bg-ember px-4 py-3 font-display text-2xl text-parchment shadow hover:brightness-110 disabled:opacity-60"
        >
          {busy ? "Laying the table…" : "Start a new table (GM)"}
        </button>

        <div className="my-6 flex items-center gap-3 text-ink-soft">
          <span className="h-px flex-1 bg-ink-soft/30" /> or join friends
          <span className="h-px flex-1 bg-ink-soft/30" />
        </div>

        <form onSubmit={joinRoom} className="flex gap-2">
          <input
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="TABLE CODE"
            maxLength={8}
            className="min-w-0 flex-1 rounded-md border border-ink-soft/40 bg-white/60 px-3 py-2 text-center font-mono text-lg tracking-widest uppercase outline-none focus:border-ember"
          />
          <button className="rounded-md bg-moss px-5 py-2 font-display text-xl text-parchment hover:brightness-110">
            Join
          </button>
        </form>

        {error && <p className="mt-4 text-center text-ember">{error}</p>}
      </div>
      <footer className="absolute bottom-3 max-w-xl px-4 text-center text-xs text-parchment/50">
        Mausritter by Isaac Williams · Icons by Lorc, Delapouite & contributors at game-icons.net (CC BY 3.0) · 3D dice by
        dice-box-threejs (MIT)
      </footer>
    </main>
  );
}
