import type { ButtonHTMLAttributes, ReactNode } from "react";

type Tone = "ember" | "moss" | "plain" | "ghost" | "gold";

const TONES: Record<Tone, string> = {
  ember: "bg-ember text-parchment hover:brightness-110",
  moss: "bg-moss text-parchment hover:brightness-110",
  gold: "bg-gold text-ink hover:brightness-110",
  plain: "bg-white/60 text-ink border border-ink-soft/30 hover:bg-white/90",
  ghost: "text-ink-soft hover:bg-ink/10",
};

export function Btn({ tone = "plain", className = "", ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & { tone?: Tone }) {
  return (
    <button
      {...rest}
      className={`rounded-md px-2.5 py-1 font-bold shadow-sm transition disabled:cursor-not-allowed disabled:opacity-40 ${TONES[tone]} ${className}`}
    />
  );
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <h3 className="font-display text-xl leading-none">{children}</h3>
      {right}
    </div>
  );
}

/** Usage dots. Clicking a dot toggles usage up to or back from that point. */
export function Dots({ dots, used, onSet, size = "md" }: { dots: number; used: number; onSet?: (used: number) => void; size?: "sm" | "md" }) {
  if (dots === 0) return null;
  const px = size === "sm" ? "h-2.5 w-2.5" : "h-3.5 w-3.5";
  return (
    <span className="inline-flex gap-0.5">
      {Array.from({ length: dots }, (_, i) => {
        const filled = i < used;
        return (
          <button
            key={i}
            type="button"
            disabled={!onSet}
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => {
              e.stopPropagation();
              onSet?.(filled && i === used - 1 ? i : i + 1);
            }}
            title={filled ? "Clear usage" : "Mark usage"}
            className={`${px} rounded-full border-[1.5px] border-ink ${filled ? "bg-ink" : "bg-transparent"} ${onSet ? "cursor-pointer hover:scale-125" : "cursor-default"} transition`}
          />
        );
      })}
    </span>
  );
}

export function Bar({ cur, max, tone }: { cur: number; max: number; tone: "hp" | "str" | "dex" | "wil" }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (cur / max) * 100)) : 0;
  const color = tone === "hp" ? "bg-moss" : tone === "str" ? "bg-ember" : tone === "dex" ? "bg-gold" : "bg-[#6f6aa8]";
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-ink/15">
      <div className={`h-full ${color} transition-[width] duration-700 ease-out`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function Modal({ title, onClose, children }: { title: string; onClose: () => void; children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4" onClick={onClose}>
      <div
        className="parchment max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-label={title}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-display text-3xl">{title}</h2>
          <Btn tone="ghost" onClick={onClose} aria-label="Close">
            ✕
          </Btn>
        </div>
        {children}
      </div>
    </div>
  );
}
