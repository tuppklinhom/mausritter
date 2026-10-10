import { useState } from "react";
import { useRoom } from "../room";

const QUICK = ["d4", "d6", "d8", "d10", "d12", "d20"];

export function DiceTray() {
  const send = useRoom((s) => s.send);
  const [custom, setCustom] = useState("");

  return (
    <div className="flex flex-wrap items-center gap-2 border-t border-black/40 bg-black/30 p-3">
      {QUICK.map((d) => (
        <button
          key={d}
          onClick={() => send({ t: "roll", expr: d })}
          className="rounded-md bg-parchment px-3 py-1.5 font-bold text-ink shadow hover:bg-gold"
        >
          {d}
        </button>
      ))}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (custom.trim()) send({ t: "roll", expr: custom.trim() });
        }}
        className="ml-auto flex gap-2"
      >
        <input
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          placeholder="2d6+1"
          maxLength={40}
          className="w-28 rounded-md bg-parchment/90 px-2 py-1.5 font-mono text-ink outline-none"
        />
        <button className="rounded-md bg-ember px-3 py-1.5 font-bold text-parchment hover:brightness-110">Roll</button>
      </form>
    </div>
  );
}
