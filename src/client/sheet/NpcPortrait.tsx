import type { Npc } from "../../shared/state";
import { Icon } from "../Icon";
import type { IconName } from "../icons.gen";
import { MousePortrait } from "./MousePortrait";

/** A mouse NPC gets a procedural face; anything else gets its creature icon on a medallion. */
export function NpcPortrait({ npc, size = 96 }: { npc: Npc; size?: number }) {
  if (npc.look.kind === "mouse") {
    return <MousePortrait color={npc.look.color} pattern={npc.look.pattern} seed={npc.id} size={size} />;
  }
  return (
    <div
      className="flex items-center justify-center rounded-full text-parchment"
      style={{ width: size, height: size, background: `radial-gradient(circle at 35% 30%, ${npc.look.tint}, #1b1410 85%)` }}
    >
      <Icon name={npc.look.icon as IconName} className="h-[68%] w-[68%] drop-shadow-[0_2px_4px_rgba(0,0,0,0.6)]" />
    </div>
  );
}
