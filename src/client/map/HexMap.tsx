import { useId, useState } from "react";
import { HEX_TYPES, type HexType } from "../../shared/data/hexcrawl";
import { hexKey } from "../../shared/rules/hexmap";
import type { Mouse } from "../../shared/rules/types";
import type { Hex, MapState, Season } from "../../shared/state";
import { ICONS, ICON_SIZE, type IconName } from "../icons.gen";
import { MousePortrait } from "../sheet/MousePortrait";

const R = 50; // hex radius (centre to corner)
const W = Math.sqrt(3) * R;
const PAD = 12;

/** Centre of a pointy-top hex in "odd-r" offset layout. */
export function hexCentre(col: number, row: number): [number, number] {
  return [PAD + W / 2 + W * (col + 0.5 * (row & 1)), PAD + R + 1.5 * R * row];
}

function corners(cx: number, cy: number, r = R): string {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (Math.PI / 180) * (60 * i - 30);
    return `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
  }).join(" ");
}

const TERRAIN: Record<HexType, Record<Season, string> & { icon: IconName }> = {
  countryside: { spring: "#a9c46c", summer: "#c8c06a", autumn: "#c79a52", winter: "#e3e8e4", icon: "high-grass" },
  forest: { spring: "#5f8b47", summer: "#4c783a", autumn: "#8d5b2f", winter: "#b5c4bd", icon: "pine-tree" },
  river: { spring: "#6c9dc4", summer: "#5f95c0", autumn: "#6d8fa8", winter: "#a8c4d6", icon: "waves" },
  town: { spring: "#a59c8e", summer: "#aaa08f", autumn: "#9d9283", winter: "#cbc6be", icon: "house" },
  settlement: { spring: "#dcae6c", summer: "#e0b46e", autumn: "#d49a58", winter: "#e8d3ad", icon: "mushroom-house" },
};

export const terrainName = (t: HexType) => HEX_TYPES.find((h) => h.id === t)?.name ?? t;

function MapIcon({ name, x, y, size, opacity = 1, color = "#2b2118" }: { name: IconName; x: number; y: number; size: number; opacity?: number; color?: string }) {
  return (
    <svg x={x - size / 2} y={y - size / 2} width={size} height={size} viewBox={`0 0 ${ICON_SIZE} ${ICON_SIZE}`} opacity={opacity} color={color} dangerouslySetInnerHTML={{ __html: ICONS[name] }} />
  );
}

interface Props {
  map: MapState;
  season: Season;
  /** GM view: hidden hexes are drawn faded instead of fogged. */
  gmView?: boolean;
  selected?: string | null;
  party?: Mouse[];
  onHexClick?: (key: string) => void;
  className?: string;
}

export function HexMap({ map, season, gmView, selected, party = [], onHexClick, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const [hover, setHover] = useState<string | null>(null);
  const width = PAD * 2 + W * map.cols + (map.rows > 1 ? W / 2 : 0);
  const height = PAD * 2 + R * 2 + 1.5 * R * (map.rows - 1);

  const cells: { key: string; col: number; row: number; hex?: Hex }[] = [];
  for (let row = 0; row < map.rows; row++) for (let col = 0; col < map.cols; col++) cells.push({ key: hexKey(col, row), col, row, hex: map.hexes[hexKey(col, row)] });

  const centre = map.party ? hexCentre(...(map.party.split(",").map(Number) as [number, number])) : null;
  // Sit the party token a little high so the hex's name stays readable.
  const partyPos = centre ? [centre[0], centre[1] - 12] : null;
  const hovered = hover ? map.hexes[hover] : undefined;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} preserveAspectRatio="xMidYMid meet" role="img" aria-label="Hex map">
      <defs>
        <filter id={`paper-${uid}`}>
          <feTurbulence type="fractalNoise" baseFrequency="0.035" numOctaves="3" seed="4" />
          <feColorMatrix values="0 0 0 0 0.35  0 0 0 0 0.25  0 0 0 0 0.12  0 0 0 0.16 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <filter id={`fog-${uid}`} x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.02" numOctaves="4" seed="9" />
          <feColorMatrix values="0 0 0 0 0.86  0 0 0 0 0.82  0 0 0 0 0.74  0 0 0 0.9 0" />
          <feComposite in2="SourceGraphic" operator="in" />
        </filter>
        <pattern id={`hatch-${uid}`} width="8" height="8" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <line x1="0" y1="0" x2="0" y2="8" stroke="#2b2118" strokeWidth="2" opacity="0.25" />
        </pattern>
      </defs>

      {cells.map(({ key, col, row, hex }) => {
        const [cx, cy] = hexCentre(col, row);
        const pts = corners(cx, cy);
        const visible = hex && (hex.revealed || gmView);
        if (!visible) {
          // Unknown territory: a drifting fog bank.
          return (
            <g key={key}>
              <polygon points={pts} fill="#cfc6b4" />
              <polygon points={pts} fill="#fff" filter={`url(#fog-${uid})`} />
              <polygon points={pts} fill="none" stroke="#8a7d68" strokeWidth="1" opacity="0.4" />
            </g>
          );
        }
        const t = TERRAIN[hex.type];
        const faded = gmView && !hex.revealed;
        return (
          <g
            key={key}
            onClick={onHexClick ? () => onHexClick(key) : undefined}
            onPointerEnter={() => setHover(key)}
            onPointerLeave={() => setHover((h) => (h === key ? null : h))}
            className={onHexClick ? "cursor-pointer" : undefined}
            opacity={faded ? 0.55 : 1}
          >
            <polygon points={pts} fill={t[season]} />
            <polygon points={pts} fill="#fff" filter={`url(#paper-${uid})`} />
            {faded && <polygon points={pts} fill={`url(#hatch-${uid})`} />}
            {hex.difficult && <polygon points={corners(cx, cy, R - 6)} fill="none" stroke="#5a3b20" strokeWidth="2" strokeDasharray="5 4" opacity="0.55" />}
            <MapIcon name={t.icon} x={cx} y={cy - (hex.name ? 8 : 0)} size={hex.type === "settlement" ? 46 : 38} opacity={hex.type === "settlement" ? 0.85 : 0.4} />
            {hex.name && (
              <text x={cx} y={cy + 28} textAnchor="middle" fontSize="11" fontWeight="700" fill="#2b2118" style={{ paintOrder: "stroke" }} stroke="#f1e6cf" strokeWidth="3">
                {hex.name.length > 16 ? `${hex.name.slice(0, 15)}…` : hex.name}
              </text>
            )}
            <polygon
              points={pts}
              fill="none"
              stroke={selected === key ? "#c4572a" : "#3b2b1f"}
              strokeWidth={selected === key ? 4 : 1.2}
              opacity={selected === key ? 1 : 0.55}
            />
          </g>
        );
      })}

      {partyPos && (
        <g style={{ transform: `translate(${partyPos[0]}px, ${partyPos[1]}px)`, transition: "transform 1.2s cubic-bezier(0.4, 0, 0.2, 1)" }} pointerEvents="none">
          <circle r="24" fill="#2b2118" opacity="0.35" cy="3" />
          <circle r="22" fill="#f1e6cf" stroke="#d8a23a" strokeWidth="3" />
          {party.length === 0 ? (
            <MapIcon name="position-marker" x={0} y={0} size={28} color="#c4572a" />
          ) : (
            party.slice(0, 3).map((m, i, all) => {
              const offset = (i - (all.length - 1) / 2) * 13;
              return (
                <g key={m.id} transform={`translate(${offset - 14}, -14)`}>
                  <foreignObject width="28" height="28">
                    <div style={{ borderRadius: "50%", overflow: "hidden", width: 28, height: 28 }}>
                      <MousePortrait color={m.coat.color} pattern={m.coat.pattern} seed={m.id} size={28} dead={m.dead} />
                    </div>
                  </foreignObject>
                </g>
              );
            })
          )}
        </g>
      )}

      {hovered && (hovered.revealed || gmView) && (hovered.name || hovered.landmark) && (
        <HoverLabel hex={hovered} gmView={gmView} />
      )}
    </svg>
  );
}

function HoverLabel({ hex, gmView }: { hex: Hex; gmView?: boolean }) {
  const [cx, cy] = hexCentre(hex.col, hex.row);
  const lines = [hex.name, hex.landmark, gmView ? hex.detail : undefined].filter(Boolean) as string[];
  const w = Math.min(260, Math.max(...lines.map((l) => l.length)) * 6.4 + 16);
  const y = cy - R - 8 - lines.length * 15;
  return (
    <g pointerEvents="none">
      <rect x={cx - w / 2} y={y} width={w} height={lines.length * 15 + 8} rx="5" fill="#1d150e" opacity="0.92" />
      {lines.map((l, i) => (
        <text key={i} x={cx} y={y + 15 + i * 15} textAnchor="middle" fontSize={i === 0 ? 12 : 11} fontWeight={i === 0 ? 700 : 400} fill="#f1e6cf">
          {l.length > 40 ? `${l.slice(0, 39)}…` : l}
        </text>
      ))}
    </g>
  );
}
