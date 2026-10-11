import { useState } from "react";
import { CONDITIONS } from "../../shared/data/conditions";
import { ITEMS } from "../../shared/data/items";
import { SPELLS } from "../../shared/data/spells";
import { canPlace, cellsOf } from "../../shared/rules/inventory";
import type { Creature, InventoryLayout } from "../../shared/rules/types";
import { useRoom } from "../room";
import { Btn, Modal } from "../ui";
import { CardTile } from "./InventoryGrid";

interface Props {
  creature: Creature;
  layout: InventoryLayout;
  uid: string;
  editable: boolean;
  onClose: () => void;
}

export function CardMenu({ creature, layout, uid, editable, onClose }: Props) {
  const send = useRoom((s) => s.send);
  const state = useRoom((s) => s.state);
  const [giving, setGiving] = useState(false);
  const card = creature.inventory.cards[uid];
  if (!card) return null;

  const def = ITEMS[card.defId];
  const spell = def?.spellId ? SPELLS[def.spellId] : null;
  const cond = card.kind === "condition" ? CONDITIONS[card.defId] : null;
  const cells = cellsOf(creature.inventory, uid);
  const inPaw = cells.some((c) => c === "mainPaw" || c === "offPaw");
  const remaining = card.dots - card.used;
  const inGrit = "grit" in creature && creature.grit.includes(uid);

  const rotated = card.size === 2 && cells.length === 2 && canPlace(creature.inventory, layout, uid, cells[0], !card.vertical);

  const others = [...Object.values(state?.mice ?? {}), ...Object.values(state?.hirelings ?? {})].filter((c) => c.id !== creature.id && !c.dead);

  const act = (fn: () => void) => () => {
    fn();
    onClose();
  };

  return (
    <Modal title={card.name} onClose={onClose}>
      <div className="flex gap-4">
        <div className="h-32 w-28 shrink-0">
          <CardTile card={card} />
        </div>
        <div className="space-y-1.5 text-sm">
          {def?.weapon && <p>Weapon · {def.weapon.bothPawsDamage ? `${def.weapon.damage} in one paw, ${def.weapon.bothPawsDamage} in both` : def.weapon.damage}</p>}
          {def?.armour && <p>Prevents {def.armour.defence} damage when worn ({def.note}).</p>}
          {card.note && !def?.armour && <p>{card.note}</p>}
          {cond?.effect && <p className="italic">{cond.effect}</p>}
          {card.kind === "condition" && <p className="font-bold">Clear: {cond?.clearText ?? card.note}</p>}
          {spell && (
            <>
              <p>
                <b>Effect:</b> {spell.effect}
              </p>
              <p>
                <b>Recharge:</b> {spell.recharge}
              </p>
            </>
          )}
          {card.dots > 0 && (
            <p className="text-ink-soft">
              Usage {card.used}/{card.dots}
            </p>
          )}
          {inGrit && <p className="text-moss">Held in Grit — ignored until cleared.</p>}
          {card.lit && <p className="font-bold text-ember">Lit · {card.burn ?? 0}/6 turns toward the next usage mark</p>}
        </div>
      </div>

      {editable && (
        <div className="mt-4 space-y-3">
          {spell && (
            <div>
              <div className="mb-1 font-bold">Cast with power</div>
              {!inPaw ? (
                <p className="text-sm text-ember">Hold the tablet in a paw to cast it.</p>
              ) : remaining === 0 ? (
                <p className="text-sm text-ember">Depleted. Recharge it first.</p>
              ) : (
                <div className="flex gap-2">
                  {Array.from({ length: remaining }, (_, i) => (
                    <Btn key={i} tone="gold" onClick={act(() => send({ t: "castSpell", creatureId: creature.id, uid, power: i + 1 }))}>
                      {i + 1} {i === 0 ? "die" : "dice"}
                    </Btn>
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            {card.kind === "light" && (
              <Btn tone={card.lit ? "plain" : "gold"} onClick={act(() => send({ t: "toggleLight", creatureId: creature.id, uid }))} disabled={!card.lit && remaining === 0}>
                {card.lit ? "Put out" : "🔥 Light it"}
              </Btn>
            )}
            {rotated && (
              <Btn onClick={act(() => send({ t: "moveCard", creatureId: creature.id, uid, anchor: cells[0], vertical: !card.vertical }))}>⟳ Rotate</Btn>
            )}
            {card.kind !== "condition" && others.length > 0 && <Btn onClick={() => setGiving((g) => !g)}>Give to…</Btn>}
            {card.kind === "condition" ? (
              <Btn tone="moss" onClick={act(() => send({ t: "removeCard", creatureId: creature.id, uid }))}>
                ✓ Clear condition
              </Btn>
            ) : (
              <Btn tone="ember" onClick={act(() => send({ t: "removeCard", creatureId: creature.id, uid }))}>
                Drop item
              </Btn>
            )}
          </div>

          {giving && (
            <div className="flex flex-wrap gap-2 rounded-md bg-ink/5 p-2">
              {others.map((o) => (
                <Btn key={o.id} onClick={act(() => send({ t: "transferCard", creatureId: creature.id, uid, toId: o.id }))}>
                  {o.name}
                </Btn>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}
