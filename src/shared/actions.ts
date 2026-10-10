import { z } from "zod";
import { CONDITIONS } from "./data/conditions";
import { ITEMS, STARTING_WEAPONS, item } from "./data/items";
import { SPELLS } from "./data/spells";
import { gritForLevel, levelForXp, levelUp, rest } from "./rules/advancement";
import { createHireling, createMouse, grantedHirelings, rollMouse, swapStats } from "./rules/character";
import { afterFightUsage, applyDamage, attack } from "./rules/combat";
import { roll, type Rng } from "./rules/dice";
import {
  HIRELING_LAYOUT,
  MOUSE_LAYOUT,
  addCard,
  armourDefence,
  clearUsage,
  conditionCard,
  customCondition,
  isDepleted,
  itemCard,
  markUsage,
  place,
  removeCard,
  toOverflow,
  wieldedWeapons,
} from "./rules/inventory";
import { saveFor, type SaveMode } from "./rules/saves";
import { castSpell } from "./rules/spells";
import type { CardInstance, Creature, InventoryLayout, Mouse, Stat } from "./rules/types";
import { LOG_LIMIT, type CampaignState, type DieFace, type LogEntry, type Member } from "./state";

const id = z.string().min(1).max(64);
const stat = z.enum(["str", "dex", "wil"]);

export const Action = z.discriminatedUnion("t", [
  z.object({ t: z.literal("roll"), expr: z.string().max(40), label: z.string().max(60).optional() }),
  z.object({ t: z.literal("rename"), name: z.string().trim().min(1).max(30) }),

  // Character creation
  z.object({ t: z.literal("rollMouse"), locked: z.array(z.enum(["stats", "hpPips", "details", "name"])).max(4) }),
  z.object({ t: z.literal("swapStats"), a: stat, b: stat }),
  z.object({ t: z.literal("discardDraft") }),
  z.object({
    t: z.literal("finalizeMouse"),
    weapon: z.string(),
    bonusPick: z.union([z.literal(0), z.literal(1)]).optional(),
    name: z.string().trim().max(40).optional(),
  }),
  z.object({ t: z.literal("retireMouse"), creatureId: id }),
  z.object({ t: z.literal("editMouse"), creatureId: id, name: z.string().trim().min(1).max(40).optional(), bank: z.string().max(500).optional() }),

  // Rolls
  z.object({ t: z.literal("save"), creatureId: id, stat, mode: z.enum(["normal", "advantage", "disadvantage"]) }),
  z.object({ t: z.literal("attack"), creatureId: id, mod: z.enum(["normal", "impaired", "enhanced"]) }),
  z.object({ t: z.literal("damage"), creatureId: id, amount: z.number().int().min(0).max(100), ignoreArmour: z.boolean().optional() }),
  z.object({ t: z.literal("afterFight"), creatureId: id }),
  z.object({ t: z.literal("castSpell"), creatureId: id, uid: id, power: z.number().int().min(1).max(6) }),

  // Inventory
  z.object({ t: z.literal("moveCard"), creatureId: id, uid: id, anchor: z.string().nullable(), vertical: z.boolean().optional() }),
  z.object({ t: z.literal("transferCard"), creatureId: id, uid: id, toId: id }),
  z.object({ t: z.literal("usage"), creatureId: id, uid: id, delta: z.number().int().min(-6).max(6) }),
  z.object({ t: z.literal("addItem"), creatureId: id, defId: z.string().optional(), custom: z.object({ name: z.string().trim().min(1).max(40), size: z.union([z.literal(1), z.literal(2)]) }).optional() }),
  z.object({ t: z.literal("addCondition"), creatureId: id, defId: z.string().optional(), custom: z.object({ name: z.string().trim().min(1).max(40), clearText: z.string().max(60) }).optional() }),
  z.object({ t: z.literal("removeCard"), creatureId: id, uid: id }),
  z.object({ t: z.literal("toggleGrit"), creatureId: id, uid: id }),

  // Sheet
  z.object({ t: z.literal("rest"), creatureId: id, kind: z.enum(["short", "long", "full"]), restoreStat: stat.optional() }),
  z.object({ t: z.literal("setScore"), creatureId: id, field: z.enum(["str", "dex", "wil", "hp"]), max: z.number().int().min(0).max(30).optional(), cur: z.number().int().min(0).max(30).optional() }),
  z.object({ t: z.literal("setPips"), creatureId: id, pips: z.number().int().min(0).max(100000) }),
  z.object({ t: z.literal("addXp"), creatureId: id, amount: z.number().int().min(-100000).max(100000) }),
  z.object({ t: z.literal("levelUp"), creatureId: id }),

  // Hirelings
  z.object({ t: z.literal("hire"), creatureId: id, type: z.string().trim().min(1).max(40) }),
  z.object({ t: z.literal("dismissHireling"), creatureId: id }),
]);
export type Action = z.infer<typeof Action>;

export class ActionError extends Error {}

export interface ActionContext {
  actor: Member;
  rng?: Rng;
  now?: number;
  newId?: () => string;
}

const STAT_LABEL: Record<Stat, string> = { str: "STR", dex: "DEX", wil: "WIL" };

function fail(message: string): never {
  throw new ActionError(message);
}

/**
 * Applies an action to the campaign, mutating it, and returns log entries for
 * everything that happened. Throws ActionError for invalid or forbidden actions.
 */
export function applyAction(state: CampaignState, action: Action, ctx: ActionContext): LogEntry[] {
  const { actor } = ctx;
  const rng = ctx.rng;
  const now = ctx.now ?? Date.now();
  const newId = ctx.newId ?? (() => crypto.randomUUID());
  const events: LogEntry[] = [];

  const log = (e: Omit<LogEntry, "id" | "at" | "byId" | "byName">) => {
    const entry: LogEntry = { id: newId(), at: now, byId: actor.id, byName: actor.name, ...e };
    events.push(entry);
    return entry;
  };

  const isGm = actor.role === "gm";

  function creature(cid: string): { c: Creature; layout: InventoryLayout; isMouse: boolean } {
    const mouse = state.mice[cid];
    if (mouse) return { c: mouse, layout: MOUSE_LAYOUT, isMouse: true };
    const h = state.hirelings[cid];
    if (h) return { c: h, layout: HIRELING_LAYOUT, isMouse: false };
    return fail("That mouse is no longer here.");
  }

  function ownerOf(c: Creature): string | undefined {
    if ("ownerId" in c) return c.ownerId;
    return state.mice[c.employerId]?.ownerId;
  }

  /** The creature, if the actor may act for it (its player, or the GM). */
  function editable(cid: string) {
    const found = creature(cid);
    if (!isGm && ownerOf(found.c) !== actor.id) fail("That's not your mouse.");
    return found;
  }

  function card(c: Creature, uid: string): CardInstance {
    return c.inventory.cards[uid] ?? fail("That card is gone.");
  }

  const gritOf = (c: Creature) => ("grit" in c ? c.grit : []);

  /** STR save after STR damage; failure is critical damage. */
  function critSave(c: Creature, layout: InventoryLayout) {
    const s = saveFor("str", c.stats.str.cur, c.inventory, gritOf(c), "normal", rng);
    const critical = !s.success;
    if (critical) {
      addCard(c.inventory, layout, conditionCard("injured", newId()));
      c.incapacitated = true;
    }
    log({
      kind: "save",
      title: `${c.name} · STR save vs critical damage`,
      detail: critical ? "Critical damage! Injured and incapacitated until tended and rested." : "Still fighting.",
      dice: saveDice(s.rolls, s.roll),
      total: s.roll,
      outcome: critical ? "critical" : "success",
      subjectId: c.id,
    });
  }

  switch (action.t) {
    case "roll": {
      let r;
      try {
        r = roll(action.expr, rng);
      } catch (e) {
        return fail((e as Error).message);
      }
      log({ kind: "roll", title: action.label ?? r.expr, detail: action.label ? r.expr : undefined, dice: r.dice, total: r.total });
      break;
    }

    case "rename": {
      const m = state.members[actor.id];
      if (m) m.name = action.name;
      break;
    }

    case "rollMouse": {
      const prev = state.drafts[actor.id];
      const draft = rollMouse(rng, prev ? { prev, locked: action.locked } : undefined);
      state.drafts[actor.id] = draft;
      log({
        kind: "event",
        title: prev ? `${actor.name} rerolls their mouse` : `${actor.name} rolls up a mouse`,
        detail: `${draft.name}, ${draft.background} — STR ${draft.stats.str} DEX ${draft.stats.dex} WIL ${draft.stats.wil}, HP ${draft.hp}`,
      });
      break;
    }

    case "swapStats": {
      const draft = state.drafts[actor.id] ?? fail("Roll a mouse first.");
      if (action.a === action.b) break;
      state.drafts[actor.id] = swapStats(draft, action.a, action.b);
      break;
    }

    case "discardDraft":
      delete state.drafts[actor.id];
      break;

    case "finalizeMouse": {
      const draft = state.drafts[actor.id] ?? fail("Roll a mouse first.");
      if (!STARTING_WEAPONS.includes(action.weapon)) fail("Pick a starting weapon.");
      const choices = { weapon: action.weapon, bonusPick: action.bonusPick, name: action.name };
      const mouse = createMouse(draft, choices, { id: newId(), ownerId: actor.id });
      state.mice[mouse.id] = mouse;
      for (const type of grantedHirelings(draft, choices)) {
        const h = createHireling({ id: newId(), employerId: mouse.id }, type, rng);
        state.hirelings[h.id] = h;
      }
      delete state.drafts[actor.id];
      log({ kind: "event", title: `${mouse.name} joins the party`, detail: `${mouse.background} · ${mouse.birthsign.sign} · ${mouse.look}`, subjectId: mouse.id });
      break;
    }

    case "retireMouse": {
      const { c, isMouse } = editable(action.creatureId);
      if (!isMouse) fail("Use dismiss for hirelings.");
      delete state.mice[c.id];
      for (const h of Object.values(state.hirelings)) if (h.employerId === c.id) delete state.hirelings[h.id];
      log({ kind: "event", title: `${c.name} leaves the party` });
      break;
    }

    case "editMouse": {
      const { c, isMouse } = editable(action.creatureId);
      if (action.name) c.name = action.name;
      if (isMouse && action.bank !== undefined) (c as Mouse).bank = action.bank;
      break;
    }

    case "save": {
      const { c } = editable(action.creatureId);
      const s = saveFor(action.stat, c.stats[action.stat].cur, c.inventory, gritOf(c), action.mode as SaveMode, rng);
      const modeText = s.mode === "normal" ? "" : ` with ${s.mode}`;
      log({
        kind: "save",
        title: `${c.name} · ${STAT_LABEL[action.stat]} save`,
        detail: `Needs ${s.target} or less${modeText}${s.reasons.length ? ` (${s.reasons.join(", ")})` : ""}`,
        dice: saveDice(s.rolls, s.roll),
        total: s.roll,
        outcome: s.success ? "success" : "fail",
        subjectId: c.id,
      });
      break;
    }

    case "attack": {
      const { c } = editable(action.creatureId);
      const weapons = wieldedWeapons(c.inventory);
      const a = attack(weapons.map((w) => w.damage), action.mod, rng);
      for (const w of weapons) if (!c.usedInFight.includes(w.card.uid)) c.usedInFight.push(w.card.uid);
      const what = weapons.length ? weapons.map((w) => w.card.name).join(" & ") : "bare paws";
      const modText = action.mod === "impaired" ? " (impaired)" : action.mod === "enhanced" ? " (enhanced)" : "";
      log({
        kind: "attack",
        title: `${c.name} attacks with ${what}${modText}`,
        detail: a.rolled.map((r) => `${r.expr}: ${r.value}`).join(", "),
        dice: a.rolled.map((r) => ({ sides: Number(r.expr.slice(r.expr.indexOf("d") + 1)), value: r.value, kept: r.value === a.damage })),
        total: a.damage,
        subjectId: c.id,
      });
      break;
    }

    case "damage": {
      const { c, layout } = editable(action.creatureId);
      const armour = action.ignoreArmour ? 0 : armourDefence(c.inventory);
      const r = applyDamage(c.hp, c.stats.str, action.amount, armour);
      c.hp = r.hp;
      c.stats.str = r.str;
      for (const card of Object.values(c.inventory.cards)) {
        if (card.kind === "armour" && armour > 0 && !c.usedInFight.includes(card.uid)) c.usedInFight.push(card.uid);
      }
      const parts = [`${r.dealt} damage${armour ? ` (${action.amount} − ${armour} armour)` : ""}`];
      if (r.strDamage) parts.push(`${r.strDamage} to STR`);
      log({
        kind: "damage",
        title: `${c.name} takes ${r.dealt} damage`,
        detail: parts.join(", "),
        total: r.dealt,
        outcome: r.dead ? "dead" : undefined,
        subjectId: c.id,
      });
      if (r.dead) {
        c.dead = true;
        log({ kind: "event", title: `${c.name} has died`, detail: "Roll up a new mouse and get back in quickly.", outcome: "dead", subjectId: c.id });
      } else if (r.needsCritSave) {
        critSave(c, layout);
      }
      break;
    }

    case "afterFight": {
      const { c } = editable(action.creatureId);
      const results = afterFightUsage(c.inventory, c.usedInFight, rng);
      c.usedInFight = [];
      if (results.length === 0) {
        log({ kind: "event", title: `${c.name} checks their gear`, detail: "Nothing was used in the fight.", subjectId: c.id });
        break;
      }
      log({
        kind: "roll",
        title: `${c.name} checks their gear after the fight`,
        detail: results
          .map((r) => `${r.card.name}: ${r.roll === null ? "always" : r.roll} → ${r.depleted ? "BROKEN" : r.marked ? "mark usage" : "fine"}`)
          .join("; "),
        dice: results.filter((r) => r.roll !== null).map((r) => ({ sides: 6, value: r.roll!, kept: r.marked })),
        outcome: results.some((r) => r.depleted) ? "depleted" : undefined,
        subjectId: c.id,
      });
      break;
    }

    case "castSpell": {
      const { c, layout } = editable(action.creatureId);
      const tablet = card(c, action.uid);
      if (tablet.kind !== "spell") fail("That's not a spell.");
      if (!["mainPaw", "offPaw"].some((cell) => c.inventory.cells[cell] === tablet.uid)) fail("Hold the tablet in a paw to cast it.");
      const spellId = item(tablet.defId).spellId!;
      const r = castSpell(spellId, action.power, tablet.dots - tablet.used, rng);
      markUsage(c.inventory, tablet.uid, r.usage);
      log({
        kind: "spell",
        title: `${c.name} casts ${SPELLS[spellId].name} at power ${r.power}`,
        detail: r.effect + (r.usage ? ` (${r.usage} usage marked)` : ""),
        dice: r.dice.map((v) => ({ sides: 6, value: v, kept: true })),
        total: r.sum,
        outcome: isDepleted(tablet) ? "depleted" : undefined,
        subjectId: c.id,
      });
      if (r.miscastDamage.length) {
        const dmg = r.miscastDamage.reduce((a, b) => a + b, 0);
        c.stats.wil = { ...c.stats.wil, cur: Math.max(0, c.stats.wil.cur - dmg) };
        log({
          kind: "damage",
          title: `Miscast! ${c.name} takes ${dmg} WIL damage`,
          detail: c.stats.wil.cur === 0 ? "Reduced to insensibility." : undefined,
          dice: r.miscastDamage.map((v) => ({ sides: 6, value: v, kept: true })),
          total: dmg,
          subjectId: c.id,
        });
        const s = saveFor("wil", c.stats.wil.cur, c.inventory, gritOf(c), "normal", rng);
        if (!s.success) addCard(c.inventory, layout, conditionCard("drained", newId()));
        log({
          kind: "save",
          title: `${c.name} · WIL save vs Drained`,
          detail: s.success ? "Resisted." : "Drained.",
          dice: saveDice(s.rolls, s.roll),
          total: s.roll,
          outcome: s.success ? "success" : "fail",
          subjectId: c.id,
        });
      }
      break;
    }

    case "moveCard": {
      const { c, layout } = editable(action.creatureId);
      card(c, action.uid);
      if (action.anchor === null) toOverflow(c.inventory, action.uid);
      else {
        try {
          place(c.inventory, layout, action.uid, action.anchor, action.vertical ?? false);
        } catch (e) {
          fail((e as Error).message);
        }
      }
      break;
    }

    case "transferCard": {
      const from = editable(action.creatureId);
      const to = creature(action.toId);
      const moved = card(from.c, action.uid);
      if (moved.kind === "condition") fail("Conditions can't be handed over.");
      removeCard(from.c.inventory, moved.uid);
      from.c.usedInFight = from.c.usedInFight.filter((u) => u !== moved.uid);
      const where = addCard(to.c.inventory, to.layout, moved);
      log({
        kind: "event",
        title: `${from.c.name} gives ${moved.name} to ${to.c.name}`,
        detail: where === "overflow" ? `${to.c.name} has no room — encumbered!` : undefined,
        subjectId: to.c.id,
      });
      break;
    }

    case "usage": {
      const { c } = editable(action.creatureId);
      const target = card(c, action.uid);
      if (action.delta > 0) {
        const depleted = markUsage(c.inventory, target.uid, action.delta);
        if (depleted) log({ kind: "event", title: `${c.name}'s ${target.name} is used up`, outcome: "depleted", subjectId: c.id });
      } else {
        clearUsage(c.inventory, target.uid, -action.delta);
      }
      break;
    }

    case "addItem": {
      const { c, layout } = editable(action.creatureId);
      let newCard: CardInstance;
      if (action.defId) {
        if (!ITEMS[action.defId]) fail("Unknown item.");
        newCard = itemCard(action.defId, newId());
      } else if (action.custom) {
        newCard = { uid: newId(), kind: "gear", defId: "custom", name: action.custom.name, size: action.custom.size, dots: 3, used: 0 };
      } else return fail("Nothing to add.");
      const where = addCard(c.inventory, layout, newCard);
      log({
        kind: "event",
        title: `${c.name} gains ${newCard.name}`,
        detail: where === "overflow" ? "No room — encumbered!" : undefined,
        subjectId: c.id,
      });
      break;
    }

    case "addCondition": {
      const { c, layout } = editable(action.creatureId);
      let cond: CardInstance;
      if (action.defId) {
        if (!CONDITIONS[action.defId]) fail("Unknown condition.");
        cond = conditionCard(action.defId, newId());
      } else if (action.custom) {
        cond = customCondition(action.custom.name, action.custom.clearText, newId());
      } else return fail("Nothing to add.");
      const where = addCard(c.inventory, layout, cond);
      log({
        kind: "event",
        title: `${c.name} is ${cond.name}`,
        detail: [CONDITIONS[cond.defId]?.effect, where === "overflow" ? "No room — encumbered!" : undefined].filter(Boolean).join(" "),
        outcome: "fail",
        subjectId: c.id,
      });
      break;
    }

    case "removeCard": {
      const { c } = editable(action.creatureId);
      const target = card(c, action.uid);
      removeCard(c.inventory, target.uid);
      c.usedInFight = c.usedInFight.filter((u) => u !== target.uid);
      if ("grit" in c) c.grit = c.grit.filter((u) => u !== target.uid);
      log({
        kind: "event",
        title: target.kind === "condition" ? `${c.name} is no longer ${target.name}` : `${c.name} drops ${target.name}`,
        subjectId: c.id,
      });
      break;
    }

    case "toggleGrit": {
      const { c, isMouse } = editable(action.creatureId);
      if (!isMouse) fail("Hirelings don't have Grit.");
      const m = c as Mouse;
      const target = card(m, action.uid);
      if (target.kind !== "condition") fail("Only Conditions go in Grit.");
      if (m.grit.includes(target.uid)) {
        fail("Once in Grit, a Condition stays until it's cleared.");
      }
      if (m.grit.length >= gritForLevel(m.level)) fail(`Grit ${gritForLevel(m.level)} — no room to ignore another Condition.`);
      m.grit.push(target.uid);
      toOverflow(m.inventory, target.uid);
      log({ kind: "event", title: `${m.name} grits their teeth through ${target.name}`, subjectId: m.id });
      break;
    }

    case "rest": {
      const { c } = editable(action.creatureId);
      const grit = "grit" in c ? c.grit : [];
      const r = rest(action.kind, c.hp, c.stats, c.inventory, grit, { restoreStat: action.restoreStat }, rng);
      c.hp = r.hp;
      c.stats = r.stats;
      // Incapacitated creatures recover once tended and rested.
      c.incapacitated = false;
      const bits: string[] = [];
      if (r.hpRoll !== undefined) bits.push(`d6+1 = ${r.hpRoll} HP`);
      else bits.push("HP restored");
      if (r.statRestored) bits.push(`+${r.statRestored.amount} ${STAT_LABEL[r.statRestored.stat]}`);
      if (action.kind === "full") bits.push("attributes restored");
      if (r.cleared.length) bits.push(`cleared ${r.cleared.join(", ")}`);
      log({ kind: "event", title: `${c.name} takes a ${action.kind} rest`, detail: bits.join(" · "), outcome: "success", subjectId: c.id });
      break;
    }

    case "setScore": {
      const { c } = editable(action.creatureId);
      const prev = action.field === "hp" ? c.hp : c.stats[action.field];
      const max = action.max ?? prev.max;
      const next = { max, cur: Math.min(max, action.cur ?? prev.cur) };
      if (action.field === "hp") c.hp = next;
      else c.stats[action.field] = next;
      if (action.field === "str" && next.cur > 0 && c.dead) c.dead = false;
      break;
    }

    case "setPips": {
      const { c, isMouse } = editable(action.creatureId);
      if (!isMouse) fail("Hirelings don't carry the purse.");
      (c as Mouse).pips = action.pips;
      break;
    }

    case "addXp": {
      const { c } = editable(action.creatureId);
      c.xp = Math.max(0, c.xp + action.amount);
      log({ kind: "event", title: `${c.name} ${action.amount >= 0 ? "earns" : "loses"} ${Math.abs(action.amount)} XP`, detail: `Now ${c.xp} XP`, subjectId: c.id });
      if (levelForXp(c.xp) > c.level) {
        log({ kind: "event", title: `${c.name} is ready to reach level ${c.level + 1}!`, outcome: "levelup", subjectId: c.id });
      }
      break;
    }

    case "levelUp": {
      const { c } = editable(action.creatureId);
      if (levelForXp(c.xp) <= c.level) fail("Not enough XP yet.");
      const r = levelUp(c.level + 1, c.stats, c.hp, rng);
      c.level = r.level;
      c.stats = r.stats;
      c.hp = r.hp;
      const ups = (["str", "dex", "wil"] as Stat[]).filter((s) => r.statRolls[s].increased).map((s) => STAT_LABEL[s]);
      log({
        kind: "event",
        title: `${c.name} reaches level ${r.level}!`,
        detail: `${ups.length ? `${ups.join(", ")} +1` : "No attribute increases"} · HP ${r.hp.max} (rolled ${r.hpRoll})${"grit" in c ? ` · Grit ${gritForLevel(r.level)}` : ""}`,
        dice: (["str", "dex", "wil"] as Stat[]).map((s) => ({ sides: 20, value: r.statRolls[s].roll, kept: r.statRolls[s].increased })),
        outcome: "levelup",
        subjectId: c.id,
      });
      break;
    }

    case "hire": {
      const { c, isMouse } = editable(action.creatureId);
      if (!isMouse) fail("Only player mice can hire.");
      const h = createHireling({ id: newId(), employerId: c.id }, action.type, rng);
      state.hirelings[h.id] = h;
      log({ kind: "event", title: `${c.name} hires ${h.name} the ${h.type}`, detail: `${h.look} · ${h.disposition}`, subjectId: h.id });
      break;
    }

    case "dismissHireling": {
      const { c, isMouse } = editable(action.creatureId);
      if (isMouse) fail("That's a player mouse.");
      delete state.hirelings[c.id];
      log({ kind: "event", title: `${c.name} leaves the party's service` });
      break;
    }
  }

  state.log.push(...events);
  if (state.log.length > LOG_LIMIT) state.log.splice(0, state.log.length - LOG_LIMIT);
  return events;
}

function saveDice(rolls: number[], kept: number): DieFace[] {
  let marked = false;
  return rolls.map((value) => {
    const isKept = !marked && value === kept;
    if (isKept) marked = true;
    return { sides: 20, value, kept: isKept };
  });
}
