import { useId } from "react";

const COAT: Record<string, { fur: string; shade: string }> = {
  Chocolate: { fur: "#6b4430", shade: "#4a2d1f" },
  Black: { fur: "#34302d", shade: "#1d1a18" },
  White: { fur: "#f1ece2", shade: "#cfc6b6" },
  Tan: { fur: "#c99b68", shade: "#a27849" },
  Grey: { fur: "#9a958f", shade: "#726d68" },
  Blue: { fur: "#7f8ea2", shade: "#5c6a7d" },
};

function hash(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return h >>> 0;
}

/** A little mouse face drawn from coat colour and pattern, varied by seed. */
export function MousePortrait({ color, pattern, seed, size = 96, dead = false }: { color: string; pattern: string; seed: string; size?: number; dead?: boolean }) {
  const uid = useId().replace(/:/g, "");
  const coat = COAT[color] ?? COAT.Grey;
  const h = hash(seed);
  const earTilt = (h % 13) - 6;
  const eyeY = 108 + ((h >> 4) % 6);
  const dark = color === "Black" || color === "Chocolate";
  const markColor = dark ? "#e9dfcf" : coat.shade;
  const clip = `head-${uid}`;

  const markings = (() => {
    switch (pattern) {
      case "Brindle":
        return Array.from({ length: 7 }, (_, i) => (
          <path key={i} d={`M${48 + i * 16} 70 q 6 40 -4 90`} stroke={markColor} strokeWidth="5" fill="none" opacity="0.45" />
        ));
      case "Patchy":
        return (
          <>
            <ellipse cx={70 + (h % 30)} cy="92" rx="26" ry="20" fill={markColor} opacity="0.75" />
            <ellipse cx={140 - ((h >> 3) % 25)} cy="140" rx="22" ry="16" fill={markColor} opacity="0.75" />
          </>
        );
      case "Banded":
        return <rect x="0" y={118 + (h % 10)} width="200" height="26" fill={markColor} opacity="0.6" />;
      case "Marbled":
        return (
          <path
            d={`M40 ${90 + (h % 20)} C 80 60, 110 140, 160 ${100 + ((h >> 2) % 20)} S 120 170, 70 150`}
            stroke={markColor}
            strokeWidth="9"
            fill="none"
            opacity="0.5"
          />
        );
      case "Flecked":
        return Array.from({ length: 16 }, (_, i) => {
          const k = hash(`${seed}${i}`);
          return <circle key={i} cx={45 + (k % 110)} cy={70 + ((k >> 8) % 90)} r={2 + (k % 3)} fill={markColor} opacity="0.7" />;
        });
      default:
        return null;
    }
  })();

  return (
    <svg viewBox="0 0 200 200" width={size} height={size} role="img" aria-label={`${color} ${pattern.toLowerCase()} mouse`} className={dead ? "grayscale" : ""}>
      <defs>
        <clipPath id={clip}>
          <ellipse cx="100" cy="118" rx="62" ry="56" />
        </clipPath>
      </defs>
      <circle cx="100" cy="100" r="98" fill="#e8d8b8" />
      {/* ears */}
      <g transform={`rotate(${earTilt} 100 100)`}>
        <circle cx="48" cy="62" r="34" fill={coat.fur} />
        <circle cx="48" cy="62" r="21" fill="#e9a6a0" />
        <circle cx="152" cy="62" r="34" fill={coat.fur} />
        <circle cx="152" cy="62" r="21" fill="#e9a6a0" />
      </g>
      {/* head */}
      <ellipse cx="100" cy="118" rx="62" ry="56" fill={coat.fur} />
      <g clipPath={`url(#${clip})`}>{markings}</g>
      <ellipse cx="100" cy="152" rx="30" ry="20" fill={coat.shade} opacity="0.35" />
      {/* eyes */}
      {dead ? (
        <g stroke="#1b1410" strokeWidth="4" strokeLinecap="round">
          <path d={`M68 ${eyeY - 7} l14 14 M82 ${eyeY - 7} l-14 14`} />
          <path d={`M118 ${eyeY - 7} l14 14 M132 ${eyeY - 7} l-14 14`} />
        </g>
      ) : (
        <g>
          <circle cx="75" cy={eyeY} r="8" fill="#1b1410" />
          <circle cx="125" cy={eyeY} r="8" fill="#1b1410" />
          <circle cx="78" cy={eyeY - 3} r="2.5" fill="#fff" />
          <circle cx="128" cy={eyeY - 3} r="2.5" fill="#fff" />
        </g>
      )}
      {/* nose + whiskers */}
      <ellipse cx="100" cy="146" rx="9" ry="6.5" fill="#d9706c" />
      <g stroke={dark ? "#d8cfc0" : "#3b2b1f"} strokeWidth="2" strokeLinecap="round" opacity="0.7">
        <path d="M86 148 L44 138 M86 153 L42 156 M86 158 L48 172" />
        <path d="M114 148 L156 138 M114 153 L158 156 M114 158 L152 172" />
      </g>
    </svg>
  );
}
