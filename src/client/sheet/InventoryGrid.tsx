import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  pointerWithin,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { useState, type CSSProperties } from "react";
import { canPlace, cellsOf, isDepleted } from "../../shared/rules/inventory";
import type { CardInstance, CellDef, Inventory, InventoryLayout } from "../../shared/rules/types";
import { Dots } from "../ui";
import { cardFace } from "./cards";

interface Props {
  inventory: Inventory;
  layout: InventoryLayout;
  /** Condition uids in Grit; null when this creature has no Grit space. */
  grit: string[] | null;
  gritMax: number;
  editable: boolean;
  onMove: (uid: string, anchor: string | null, vertical: boolean) => void;
  onGrit: (uid: string) => void;
  onUsage: (uid: string, used: number) => void;
  onCardClick: (uid: string) => void;
  onInvalid: (message: string) => void;
  compact?: boolean;
}

/** Finds a legal spot for a card dropped on `cellId`, trying both orientations and neighbours. */
function resolveDrop(inv: Inventory, layout: InventoryLayout, card: CardInstance, cellId: string): [string, boolean] | null {
  const vertical = card.vertical ?? false;
  const tries: [string, boolean][] = [[cellId, vertical]];
  if (card.size === 2) {
    tries.push([cellId, !vertical]);
    const cell = layout.cells.find((c) => c.id === cellId)!;
    const left = layout.cells.find((c) => c.col === cell.col - 1 && c.row === cell.row);
    const up = layout.cells.find((c) => c.col === cell.col && c.row === cell.row - 1);
    if (left) tries.push([left.id, false]);
    if (up) tries.push([up.id, true]);
  }
  return tries.find(([a, v]) => canPlace(inv, layout, card.uid, a, v)) ?? null;
}

export function InventoryGrid(props: Props) {
  const { inventory: inv, layout, grit, editable, compact } = props;
  const [dragging, setDragging] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  );

  const placed = new Map<string, CellDef[]>();
  for (const cell of layout.cells) {
    const uid = inv.cells[cell.id];
    if (uid) placed.set(uid, [...(placed.get(uid) ?? []), cell]);
  }
  const gritSet = new Set(grit ?? []);
  const overflow = inv.overflow.filter((u) => !gritSet.has(u));

  function onDragEnd(e: DragEndEvent) {
    setDragging(null);
    const uid = String(e.active.id);
    const target = e.over ? String(e.over.id) : null;
    const card = inv.cards[uid];
    if (!target || !card) return;
    if (target === "overflow") {
      if (!inv.overflow.includes(uid)) props.onMove(uid, null, false);
      return;
    }
    if (target === "grit") {
      if (card.kind !== "condition") return props.onInvalid("Only Conditions go in Grit.");
      if (!gritSet.has(uid)) props.onGrit(uid);
      return;
    }
    if (gritSet.has(uid)) return props.onInvalid("A Condition in Grit stays there until it's cleared.");
    const spot = resolveDrop(inv, layout, card, target);
    if (!spot) return props.onInvalid(card.size === 2 ? "Needs two free slots side by side or stacked." : "That slot is taken.");
    const current = cellsOf(inv, uid);
    if (current[0] === spot[0] && (card.vertical ?? false) === spot[1]) return;
    props.onMove(uid, spot[0], spot[1]);
  }

  const cellH = compact ? "minmax(64px, auto)" : "minmax(92px, auto)";

  return (
    <DndContext sensors={sensors} collisionDetection={pointerWithin} onDragStart={(e) => setDragging(String(e.active.id))} onDragEnd={onDragEnd} onDragCancel={() => setDragging(null)}>
      <div
        className="relative grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${layout.cols}, minmax(0, 1fr))`, gridTemplateRows: `repeat(${layout.rows}, ${cellH})` }}
      >
        {layout.cells.map((cell) => (
          <DropCell key={cell.id} cell={cell} />
        ))}
        {[...placed.entries()].map(([uid, cells]) => {
          const cols = cells.map((c) => c.col);
          const rows = cells.map((c) => c.row);
          const style: CSSProperties = {
            gridColumn: `${Math.min(...cols) + 1} / ${Math.max(...cols) + 2}`,
            gridRow: `${Math.min(...rows) + 1} / ${Math.max(...rows) + 2}`,
          };
          return (
            <DraggableCard key={uid} card={inv.cards[uid]} style={style} disabled={!editable} hidden={dragging === uid} {...props} />
          );
        })}
      </div>

      <div className="mt-2 grid gap-2 sm:grid-cols-2">
        <Tray id="overflow" label={overflow.length ? "Encumbered! Too much to carry" : "Overflow (nothing here)"} danger={overflow.length > 0}>
          {overflow.map((uid) => (
            <DraggableCard key={uid} card={inv.cards[uid]} disabled={!editable} hidden={dragging === uid} {...props} small />
          ))}
        </Tray>
        {grit && (
          <Tray id="grit" label={`Grit ${grit.length}/${props.gritMax} — Conditions here are ignored`}>
            {grit.map((uid) =>
              inv.cards[uid] ? <DraggableCard key={uid} card={inv.cards[uid]} disabled hidden={false} {...props} small /> : null,
            )}
          </Tray>
        )}
      </div>

      <DragOverlay dropAnimation={{ duration: 180 }}>
        {dragging && inv.cards[dragging] ? <CardTile card={inv.cards[dragging]} lifted /> : null}
      </DragOverlay>
    </DndContext>
  );
}

function DropCell({ cell }: { cell: CellDef }) {
  const { setNodeRef, isOver } = useDroppable({ id: cell.id });
  const zone = cell.zone === "pack" ? "bg-ink/10" : "bg-white/25 border-dashed";
  return (
    <div
      ref={setNodeRef}
      style={{ gridColumn: cell.col + 1, gridRow: cell.row + 1 }}
      className={`flex items-center justify-center rounded-md border border-ink-soft/30 ${zone} ${isOver ? "ring-2 ring-gold" : ""}`}
    >
      <span className={`select-none ${cell.zone === "pack" ? "font-display text-3xl text-ink/20" : "font-display text-base text-ink/35"}`}>{cell.label}</span>
    </div>
  );
}

function Tray({ id, label, danger, children }: { id: string; label: string; danger?: boolean; children: React.ReactNode }) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={`min-h-16 rounded-md border border-dashed p-1.5 ${danger ? "border-ember bg-ember/15" : "border-ink-soft/40 bg-ink/5"} ${isOver ? "ring-2 ring-gold" : ""}`}
    >
      <div className={`mb-1 text-xs font-bold ${danger ? "text-ember" : "text-ink-soft"}`}>{label}</div>
      <div className="grid grid-cols-3 gap-1.5">{children}</div>
    </div>
  );
}

function DraggableCard({
  card,
  style,
  disabled,
  hidden,
  small,
  onUsage,
  onCardClick,
  editable,
}: Props & { card: CardInstance; style?: CSSProperties; disabled: boolean; hidden: boolean; small?: boolean }) {
  const { setNodeRef, listeners, attributes } = useDraggable({ id: card.uid, disabled });
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onCardClick(card.uid)}
      className={`z-10 ${hidden ? "opacity-30" : ""} ${disabled ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"} touch-none`}
    >
      <CardTile card={card} small={small} onUsage={editable ? (used) => onUsage(card.uid, used) : undefined} />
    </div>
  );
}

export function CardTile({ card, small, lifted, onUsage }: { card: CardInstance; small?: boolean; lifted?: boolean; onUsage?: (used: number) => void }) {
  const face = cardFace(card);
  const isCondition = card.kind === "condition";
  const spent = isDepleted(card);
  return (
    <div
      className={`relative flex h-full flex-col rounded-md border-2 bg-[#fbf6ea] px-1.5 py-1 text-ink shadow transition ${
        isCondition ? "border-ember/70 bg-[#fbe9e2]" : "border-ink/70"
      } ${lifted ? "rotate-2 scale-105 shadow-2xl" : "hover:-translate-y-0.5 hover:shadow-md"} ${spent ? "grayscale" : ""} ${small ? "min-h-14" : ""}`}
    >
      <div className={`truncate font-display leading-tight ${small ? "text-sm" : "text-base"}`} title={card.name}>
        {card.name}
      </div>
      <div className="flex items-start justify-between gap-1">
        <Dots dots={card.dots} used={card.used} onSet={onUsage} size={small ? "sm" : "md"} />
        {face.stat && <span className="rounded border border-ink px-1 text-xs font-bold">{face.stat}</span>}
      </div>
      {!small && (
        <>
          <div className="flex flex-1 items-center justify-center text-2xl opacity-80">{face.icon}</div>
          {face.effect && <div className="text-[11px] leading-tight italic">{face.effect}</div>}
          {face.caption && <div className="truncate text-[11px] font-bold text-ink-soft">{face.caption}</div>}
        </>
      )}
      {spent && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
          <span className="-rotate-12 rounded border-2 border-ember px-1 font-display text-lg text-ember">Spent</span>
        </div>
      )}
    </div>
  );
}
