import { useState } from "react";
import { useRoom } from "../room";

export function PartyBar({ code }: { code: string }) {
  const { state, online, you, status } = useRoom();
  const [copied, setCopied] = useState(false);

  async function copyInvite() {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/r/${code}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked; the code is visible anyway */
    }
  }

  const members = Object.values(state?.members ?? {}).sort((a, b) =>
    a.role === b.role ? a.name.localeCompare(b.name) : a.role === "gm" ? -1 : 1,
  );

  return (
    <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-black/40 px-4 py-2 text-parchment">
      <span className="font-display text-3xl">Mausritter</span>
      <button
        onClick={copyInvite}
        title="Copy invite link"
        className="rounded border border-parchment/30 px-2 py-0.5 font-mono tracking-widest hover:bg-white/10"
      >
        {copied ? "link copied!" : code}
      </button>
      {status !== "open" && <span className="text-sm text-gold">{status === "connecting" ? "connecting…" : "reconnecting…"}</span>}

      <ul className="ml-auto flex flex-wrap gap-2">
        {members.map((m) => {
          const isOnline = online.includes(m.id);
          return (
            <li
              key={m.id}
              className={`flex items-center gap-1.5 rounded-full px-3 py-0.5 text-sm ${
                isOnline ? "bg-white/15" : "bg-white/5 opacity-50"
              } ${m.id === you?.id ? "ring-1 ring-gold" : ""}`}
            >
              <span className={`h-2 w-2 rounded-full ${isOnline ? "bg-moss" : "bg-ink-soft"}`} />
              {m.name}
              {m.role === "gm" && <span className="font-display text-gold">GM</span>}
            </li>
          );
        })}
      </ul>
    </header>
  );
}
