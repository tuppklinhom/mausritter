import { z } from "zod";
import { CONDITIONS } from "./data/conditions";
import { ITEMS, STARTING_WEAPONS, item } from "./data/items";
import { SPELLS } from "./data/spells";
import { gritForLevel, levelForXp, levelUp, rest } from "./rules/advancement";
import { createHireling, createMouse, grantedHirelings, rollMouse, swapStats } from "./rules/character";
import { afterFightUsage, applyDamage, attack } from "./rules/combat";
import { roll, rollDie, type Rng } from "./rules/dice";
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
import { advanceClock, burnLights, rollEncounter, type EncounterRoll } from "./rules/time";
import { AMBIENCES, backdropById } from "./data/scenes";
import { HEX_TYPES, hexTypeFor } from "./data/hexcrawl";
import { generateMap, rollDetail, rollLandmark, resizeMap } from "./rules/hexmap";
import { creatureDef, reactionFor } from "./data/creatures";
import { damageFoe, isActive, makeFoe, moraleCheck, rollInitiative, type FoeDamageResult } from "./rules/encounter";
import type { CardInstance, Creature, InventoryLayout, Mouse, Stat } from "./rules/types";
import { LOG_LIMIT, TURNS_PER_WATCH, WATCH_NAMES, type CampaignState, type DieFace, type Foe, type GmState, type LogEntry, type Member } from "./state";

const id = z.string().min(1).max(64);
const stat = z.enum(["str", "dex", "wil"]);

const mapSize = z.number().int().min(1).max(15);
const hexKeySchema = z.string().regex(/^\d{1,2},\d{1,2}$/);

const NpcSchema = z.object({
  id,
  name: z.string().trim().min(1).max(40),
  look: z.discriminatedUnion("kind", [
    z.object({ kind: z.literal("mouse"), color: z.string().max(20), pattern: z.string().max(20) }),
    z.object({ kind: z.literal("creature"), icon: z.string().max(40), tint: z.string().regex(/^#[0-9a-f]{6}$/i) }),
  ]),
});

const SceneSchema = z.object({
  id,
  title: z.string().trim().min(1).max(60),
  subtitle: z.string().trim().max(120).optional(),
  backdrop: z.string().refine((b) => !!backdropById(b) || /^https:\/\/[^\s"'<>()]{1,500}$/.test(b), "Pick a backdrop or paste an https image link"),
  ambience: z.string().refine((a) => AMBIENCES.some((x) => x.id === a), "Unknown ambience"),
  npcs: z.array(NpcSchema).max(12),
  notes: z.string().max(5000),
});

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
  z.object({ t: z.literal("attack"), creatureId: id, mod: z.enum(["normal", "impaired", "enhanced"]), targetId: id.optional() }),
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

  // Light & time
  z.object({ t: z.literal("toggleLight"), creatureId: id, uid: id }),
  z.object({ t: z.literal("advanceTime"), turns: z.number().int().min(1).max(TURNS_PER_WATCH * 4) }),
  z.object({ t: z.literal("rollEncounter") }),
  z.object({
    t: z.literal("setClock"),
    mode: z.enum(["dungeon", "wilderness"]).optional(),
    season: z.enum(["spring", "summer", "autumn", "winter"]).optional(),
    day: z.number().int().min(1).max(10000).optional(),
    watch: z.number().int().min(0).max(3).optional(),
    turn: z.number().int().min(0).max(TURNS_PER_WATCH - 1).optional(),
  }),

  // GM stage direction
  z.object({ t: z.literal("saveScene"), scene: SceneSchema }),
  z.object({ t: z.literal("deleteScene"), id }),
  z.object({ t: z.literal("moveScene"), id, dir: z.union([z.literal(-1), z.literal(1)]) }),
  z.object({ t: z.literal("showScene"), id }),
  z.object({ t: z.literal("clearScene") }),
  z.object({ t: z.literal("say"), npc: NpcSchema, text: z.string().trim().min(1).max(400) }),
  z.object({ t: z.literal("clearDialogue") }),
  z.object({ t: z.literal("setAmbience"), ambience: z.string() }),
  z.object({ t: z.literal("setGmNotes"), notes: z.string().max(20000) }),
  z.object({ t: z.literal("setStageView"), view: z.enum(["scene", "map"]) }),

  // Hex map
  z.object({ t: z.literal("mapGenerate"), cols: mapSize, rows: mapSize }),
  z.object({ t: z.literal("mapResize"), cols: mapSize, rows: mapSize }),
  z.object({
    t: z.literal("mapSetHex"),
    key: hexKeySchema,
    patch: z.object({
      type: z.enum(["countryside", "forest", "river", "town", "settlement"]).optional(),
      name: z.string().trim().max(40).optional(),
      landmark: z.string().trim().max(80).optional(),
      detail: z.string().trim().max(160).optional(),
      notes: z.string().max(2000).optional(),
      difficult: z.boolean().optional(),
    }),
  }),
  z.object({ t: z.literal("mapRollHex"), key: hexKeySchema, part: z.enum(["all", "type", "landmark", "detail"]) }),
  z.object({ t: z.literal("mapReveal"), keys: z.array(hexKeySchema).min(1).max(400), revealed: z.boolean() }),
  z.object({ t: z.literal("mapMoveParty"), key: hexKeySchema, travel: z.boolean() }),

  // Combat
  z.object({
    t: z.literal("startCombat"),
    foes: z.array(z.object({ defId: z.string(), count: z.number().int().min(1).max(12) })).min(1).max(8),
    surprise: z.enum(["party", "foes", "none"]),
  }),
  z.object({ t: z.literal("addFoes"), defId: z.string(), count: z.number().int().min(1).max(12) }),
  z.object({ t: z.literal("nextTurn") }),
  z.object({ t: z.literal("foeAttack"), foeId: id, attack: z.number().int().min(0).max(5), targetId: id, mod: z.enum(["normal", "impaired", "enhanced"]) }),
  z.object({ t: z.literal("foeDamage"), foeId: id, amount: z.number().int().min(0).max(100), ignoreArmour: z.boolean().optional() }),
  z.object({ t: z.literal("foeMorale"), foeId: id }),
  z.object({ t: z.literal("setFoeStatus"), foeId: id, status: z.enum(["active", "down", "fled", "dead"]) }),
  z.object({ t: z.literal("endCombat") }),
  z.object({ t: z.literal("rollReaction") }),
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

  function gmOnly(): GmState {
    if (!isGm) fail("Only the GM can do that.");
    state.gm ??= { scenes: [], notes: "" };
    return state.gm;
  }

  /** Moves the clock on: lit lights burn, and the encounter die rolls when it's due. */
  function passTime(turns: number, why?: string) {
    const adv = advanceClock(state.clock, turns);
    state.clock = adv.clock;
    const watches = turns / TURNS_PER_WATCH;
    const span = Number.isInteger(watches) ? `${watches} watch${watches > 1 ? "es" : ""}` : `${turns} turn${turns > 1 ? "s" : ""}`;
    log({
      kind: "event",
      title: why ?? `Time passes: ${span}`,
      detail: `${why ? `${span} · ` : ""}Day ${state.clock.day}, ${WATCH_NAMES[state.clock.watch]}, turn ${state.clock.turn + 1}`,
    });
    for (const c of [...Object.values(state.mice), ...Object.values(state.hirelings)]) {
      for (const b of burnLights(c.inventory, turns)) {
        log({
          kind: "event",
          title: b.burnedOut ? `${c.name}'s ${b.card.name} burn out!` : `${c.name}'s ${b.card.name} burn down (${b.marked} usage)`,
          outcome: b.burnedOut ? "depleted" : undefined,
          subjectId: c.id,
        });
      }
    }
    if (adv.dungeonChecks > 0) {
      const rolls = Array.from({ length: adv.dungeonChecks }, () => rollEncounter(false, rng));
      const worst = rolls.find((r) => r.kind === "encounter") ?? rolls.find((r) => r.kind === "omen") ?? rolls[0];
      if (rolls.length === 1) logEncounter(worst, "every 3 turns");
      else
        log({
          kind: "encounter",
          title: `Encounter die × ${rolls.length}`,
          detail:
            worst.kind === "encounter"
              ? "Encounter! Roll for the type."
              : worst.kind === "omen"
                ? "An omen of what's to come… Roll for the type."
                : "All quiet.",
          dice: rolls.slice(-12).map((r) => ({ sides: 6, value: r.roll, kept: r === worst })),
          total: worst.roll,
          outcome: worst.kind,
        });
    }
    for (const when of adv.wildernessChecks) logEncounter(rollEncounter(true, rng), when);
  }

  /**
   * Damage to a mouse or hireling. Armour soaks each hit; past HP it goes to
   * `attribute` (usually STR) and forces a save. A failed save is critical
   * damage: the creature's own effect if it has one, otherwise Injured and
   * incapacitated.
   */
  function hurt(c: Creature, layout: InventoryLayout, amount: number, opts: { attribute?: Stat; critical?: string; ignoreArmour?: boolean; source?: string } = {}) {
    const attr = opts.attribute ?? "str";
    const armour = opts.ignoreArmour ? 0 : armourDefence(c.inventory);
    const r = applyDamage(c.hp, c.stats[attr], amount, armour);
    c.hp = r.hp;
    c.stats[attr] = r.str;
    if (armour > 0) for (const card of Object.values(c.inventory.cards)) if (card.kind === "armour" && !c.usedInFight.includes(card.uid)) c.usedInFight.push(card.uid);
    const killed = attr === "str" && r.dead;
    const parts = [`${r.dealt} damage${armour ? ` (${amount} − ${armour} armour)` : ""}`];
    if (r.strDamage) parts.push(`${r.strDamage} to ${STAT_LABEL[attr]}`);
    log({
      kind: "damage",
      title: `${c.name} takes ${r.dealt} damage${opts.source ? ` from ${opts.source}` : ""}`,
      detail: parts.join(", "),
      total: r.dealt,
      outcome: killed ? "dead" : undefined,
      subjectId: c.id,
    });
    if (killed) {
      c.dead = true;
      log({ kind: "event", title: `${c.name} has died`, detail: "Roll up a new mouse and get back in quickly.", outcome: "dead", subjectId: c.id });
      return;
    }
    if (r.strDamage === 0) return;
    if (attr !== "str" && c.stats[attr].cur === 0) {
      log({ kind: "event", title: attr === "dex" ? `${c.name} can't move!` : `${c.name} is reduced to insensibility!`, outcome: "critical", subjectId: c.id });
    }
    if (attr === "str" && !opts.critical) return critSave(c, layout);
    const s = saveFor(attr, c.stats[attr].cur, c.inventory, gritOf(c), "normal", rng);
    const critical = !s.success;
    if (critical && !opts.critical) {
      addCard(c.inventory, layout, conditionCard("injured", newId()));
      c.incapacitated = true;
    }
    log({
      kind: "save",
      title: `${c.name} · ${STAT_LABEL[attr]} save vs critical damage`,
      detail: critical ? (opts.critical ?? "Critical damage! Injured and incapacitated until tended and rested.") : "Still fighting.",
      dice: saveDice(s.rolls, s.roll),
      total: s.roll,
      outcome: critical ? "critical" : "success",
      subjectId: c.id,
    });
  }

  function combatOrFail() {
    return state.combat ?? fail("There's no fight going on.");
  }

  function foeAt(foeId: string): Foe {
    return combatOrFail().foes[foeId] ?? fail("That foe is gone.");
  }

  function logMorale(foe: Foe, why: string) {
    const r = moraleCheck(foe, rng);
    log({
      kind: "save",
      title: `${foe.name} · morale (${why})`,
      detail: r.success ? "Holds its ground." : "Breaks and flees!",
      dice: saveDice(r.rolls, r.roll),
      total: r.roll,
      outcome: r.success ? "success" : "fail",
      subjectId: foe.id,
    });
    return r.success;
  }

  /** Logs a hit on a foe and runs the morale checks it triggers. */
  function afterFoeHit(foe: Foe, r: FoeDamageResult, source: string) {
    log({
      kind: "damage",
      title: `${foe.name} takes ${r.dealt} damage from ${source}`,
      detail: [r.strDamage ? `${r.strDamage} to STR` : "", foe.armour ? `armour ${foe.armour}` : ""].filter(Boolean).join(", ") || undefined,
      total: r.dealt,
      outcome: r.killed ? "dead" : undefined,
      subjectId: foe.id,
    });
    if (r.critSave) {
      log({
        kind: "save",
        title: `${foe.name} · STR save vs critical damage`,
        detail: r.downed ? "Critical damage! It's out of the fight." : "Still fighting.",
        dice: saveDice(r.critSave.rolls, r.critSave.roll),
        total: r.critSave.roll,
        outcome: r.downed ? "critical" : "success",
        subjectId: foe.id,
      });
    }
    let fell = r.killed || r.downed;
    if (!fell && r.strDamage > 0 && !foe.critTaken) {
      foe.critTaken = true;
      fell = !logMorale(foe, "badly hurt");
    }
    if (fell) {
      if (r.killed) log({ kind: "event", title: `${foe.name} is slain!`, outcome: "dead", subjectId: foe.id });
      for (const ally of Object.values(state.combat!.foes)) if (isActive(ally)) logMorale(ally, `${foe.name} fell`);
    }
    if (Object.values(state.combat!.foes).every((f) => !isActive(f))) {
      log({ kind: "event", title: "The foes are beaten!", detail: "The GM can end the fight.", outcome: "success" });
    }
  }

  function hexAt(key: string) {
    return state.map.hexes[key] ?? fail("No such hex on the map.");
  }

  /** Logs an encounter-die roll; the stage announces it to everyone. */
  function logEncounter(r: EncounterRoll, when: string) {
    const text = r.kind === "encounter" ? "Encounter!" : r.kind === "omen" ? "An omen of what's to come…" : "All quiet.";
    log({
      kind: "encounter",
      title: `Encounter die · ${when}`,
      detail: `${text}${r.hour ? ` (hour ${r.hour} of the watch)` : ""}${r.kind !== "quiet" ? " Roll for the type." : ""}`,
      dice: [{ sides: 6, value: r.roll, kept: true }, ...(r.hour ? [{ sides: 12, value: r.hour, kept: true }] : [])],
      total: r.roll,
      outcome: r.kind,
    });
  }

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
      if (action.targetId) {
        const foe = foeAt(action.targetId);
        if (!isActive(foe)) fail(`${foe.name} is already out of the fight.`);
        afterFoeHit(foe, damageFoe(foe, a.damage, rng), c.name);
      }
      break;
    }

    case "damage": {
      const { c, layout } = editable(action.creatureId);
      hurt(c, layout, action.amount, { ignoreArmour: action.ignoreArmour });
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
        loot: { name: moved.name, defId: moved.defId, kind: moved.kind },
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
        loot: { name: newCard.name, defId: newCard.defId, kind: newCard.kind },
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
        subjectId: c.id,
        condition: cond.name,
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

    case "toggleLight": {
      const { c } = editable(action.creatureId);
      const light = card(c, action.uid);
      if (light.kind !== "light") fail("Only torches and lanterns can be lit.");
      if (!light.lit && isDepleted(light)) fail(`${light.name} are spent.`);
      light.lit = !light.lit;
      log({ kind: "event", title: `${c.name} ${light.lit ? "lights" : "puts out"} ${light.name}`, subjectId: c.id });
      break;
    }

    case "advanceTime":
      gmOnly();
      passTime(action.turns);
      break;

    case "rollEncounter":
      gmOnly();
      logEncounter(rollEncounter(state.clock.mode === "wilderness", rng), "called by the GM");
      break;

    case "setClock": {
      gmOnly();
      const { t: _t, ...patch } = action;
      for (const [k, v] of Object.entries(patch)) if (v !== undefined) Object.assign(state.clock, { [k]: v });
      break;
    }

    case "saveScene": {
      const gm = gmOnly();
      const i = gm.scenes.findIndex((s) => s.id === action.scene.id);
      if (i >= 0) gm.scenes[i] = action.scene;
      else gm.scenes.push(action.scene);
      // Edits to the scene on screen show up straight away.
      if (state.stage.scene?.id === action.scene.id) {
        const { notes: _n, ambience: _a, ...shown } = action.scene;
        state.stage.scene = { ...shown, shownAt: state.stage.scene.shownAt };
      }
      break;
    }

    case "deleteScene": {
      const gm = gmOnly();
      gm.scenes = gm.scenes.filter((s) => s.id !== action.id);
      break;
    }

    case "moveScene": {
      const gm = gmOnly();
      const i = gm.scenes.findIndex((s) => s.id === action.id);
      const j = i + action.dir;
      if (i < 0 || j < 0 || j >= gm.scenes.length) break;
      [gm.scenes[i], gm.scenes[j]] = [gm.scenes[j], gm.scenes[i]];
      break;
    }

    case "showScene": {
      const gm = gmOnly();
      const scene = gm.scenes.find((s) => s.id === action.id) ?? fail("That scene is gone.");
      const { notes: _n, ambience, ...shown } = scene;
      state.stage = { view: "scene", scene: { ...shown, shownAt: now }, ambience, dialogue: null };
      log({ kind: "event", title: `Scene: ${scene.title}`, detail: scene.subtitle });
      break;
    }

    case "clearScene":
      gmOnly();
      state.stage = { ...state.stage, scene: null, dialogue: null };
      break;

    case "say":
      gmOnly();
      state.stage.dialogue = { npc: action.npc, text: action.text, at: now };
      log({ kind: "event", title: `${action.npc.name}: “${action.text}”` });
      break;

    case "clearDialogue":
      gmOnly();
      state.stage.dialogue = null;
      break;

    case "setAmbience":
      gmOnly();
      if (!AMBIENCES.some((a) => a.id === action.ambience)) fail("Unknown ambience.");
      state.stage.ambience = action.ambience;
      break;

    case "setGmNotes":
      gmOnly().notes = action.notes;
      break;

    case "setStageView":
      gmOnly();
      state.stage.view = action.view;
      break;

    case "mapGenerate":
      gmOnly();
      state.map = generateMap(action.cols, action.rows, rng);
      break;

    case "mapResize":
      gmOnly();
      state.map = resizeMap(state.map, action.cols, action.rows);
      break;

    case "mapSetHex": {
      gmOnly();
      const hex = hexAt(action.key);
      for (const [k, v] of Object.entries(action.patch)) {
        if (v === undefined) continue;
        Object.assign(hex, { [k]: v === "" ? undefined : v });
      }
      break;
    }

    case "mapRollHex": {
      gmOnly();
      const hex = hexAt(action.key);
      if (action.part === "all" || action.part === "type") hex.type = hexTypeFor(rollDie(6, rng));
      if (action.part === "all" || action.part === "landmark" || action.part === "type") hex.landmark = rollLandmark(hex.type, rng);
      if (action.part === "all" || action.part === "detail") hex.detail = rollDetail(rng);
      break;
    }

    case "mapReveal": {
      gmOnly();
      for (const k of action.keys) hexAt(k).revealed = action.revealed;
      break;
    }

    case "startCombat": {
      gmOnly();
      if (state.combat) fail("A fight is already going on.");
      const foes: Foe[] = [];
      const first = new Set<string>();
      for (const group of action.foes) {
        const def = creatureDef(group.defId) ?? fail("Unknown creature.");
        for (let i = 0; i < group.count; i++) {
          const f = makeFoe(def, newId(), group.count > 1 ? `${def.name} ${i + 1}` : def.name);
          foes.push(f);
          if (def.first && action.surprise !== "party") first.add(f.id);
        }
      }
      const party = [...Object.values(state.mice), ...Object.values(state.hirelings)].filter((c) => !c.dead);
      const init = rollInitiative(party, foes, first, action.surprise, rng);
      state.combat = { round: 1, order: init.order, turn: 0, foes: Object.fromEntries(foes.map((f) => [f.id, f])) };
      log({
        kind: "encounter",
        title: `Fight! ${action.foes.map((g) => `${g.count > 1 ? `${g.count} ` : ""}${creatureDef(g.defId)!.name}${g.count > 1 ? "s" : ""}`).join(", ")}`,
        detail:
          action.surprise === "party"
            ? "The mice strike first!"
            : action.surprise === "foes"
              ? "Ambush! The foes act first."
              : init.saves.length
                ? `DEX saves to act first: ${init.saves.map((x) => `${(state.mice[x.id] ?? state.hirelings[x.id]).name} ${x.result.success ? "✓" : "✗"}`).join(", ")}`
                : undefined,
        dice: init.saves.slice(0, 12).map((x) => ({ sides: 20, value: x.result.roll, kept: x.result.success })),
        outcome: "encounter",
      });
      break;
    }

    case "addFoes": {
      gmOnly();
      const combat = combatOrFail();
      const def = creatureDef(action.defId) ?? fail("Unknown creature.");
      for (let i = 0; i < action.count; i++) {
        const f = makeFoe(def, newId(), `${def.name} ${Object.values(combat.foes).filter((x) => x.defId === def.id).length + 1}`);
        combat.foes[f.id] = f;
        combat.order.push(f.id);
      }
      log({ kind: "event", title: `More foes join the fight: ${action.count > 1 ? `${action.count} ${def.name}s` : def.name}` });
      break;
    }

    case "nextTurn": {
      const combat = combatOrFail();
      const current = combat.order[combat.turn];
      const currentOwner = state.mice[current]?.ownerId ?? state.mice[state.hirelings[current]?.employerId]?.ownerId;
      if (!isGm && currentOwner !== actor.id) fail("It's not your turn.");
      const canAct = (cid: string) => {
        const foe = combat.foes[cid];
        if (foe) return isActive(foe);
        const c = state.mice[cid] ?? state.hirelings[cid];
        return !!c && !c.dead;
      };
      for (let step = 0; step < combat.order.length; step++) {
        combat.turn++;
        if (combat.turn >= combat.order.length) {
          combat.turn = 0;
          combat.round++;
          log({ kind: "event", title: `Round ${combat.round}` });
        }
        if (canAct(combat.order[combat.turn])) break;
      }
      break;
    }

    case "foeAttack": {
      gmOnly();
      const foe = foeAt(action.foeId);
      const atk = foe.attacks[action.attack] ?? fail("No such attack.");
      const target = creature(action.targetId);
      const a = attack([atk.damage], action.mod, rng);
      log({
        kind: "attack",
        title: `${foe.name} attacks ${target.c.name} with its ${atk.name}`,
        dice: a.rolled.map((r) => ({ sides: Number(r.expr.slice(r.expr.indexOf("d") + 1)), value: r.value, kept: true })),
        total: a.damage,
        subjectId: target.c.id,
      });
      hurt(target.c, target.layout, a.damage, { attribute: atk.damages, critical: foe.critical, source: foe.name });
      break;
    }

    case "foeDamage": {
      gmOnly();
      const foe = foeAt(action.foeId);
      afterFoeHit(foe, damageFoe(foe, action.amount, rng, action.ignoreArmour), "the GM");
      break;
    }

    case "foeMorale": {
      gmOnly();
      const foe = foeAt(action.foeId);
      if (!isActive(foe)) fail(`${foe.name} is already out of the fight.`);
      logMorale(foe, "called by the GM");
      break;
    }

    case "setFoeStatus": {
      gmOnly();
      foeAt(action.foeId).status = action.status;
      break;
    }

    case "endCombat": {
      gmOnly();
      const combat = combatOrFail();
      const foes = Object.values(combat.foes);
      const tally = (st: string) => foes.filter((f) => f.status === st).length;
      state.combat = null;
      log({
        kind: "event",
        title: "The fight is over",
        detail: [`${tally("dead")} slain`, `${tally("down")} down`, `${tally("fled")} fled`, `${tally("active")} still standing`].join(" · ") + ". Check your gear: weapons and armour used may need marking.",
      });
      break;
    }

    case "rollReaction": {
      gmOnly();
      const r = roll("2d6", rng);
      log({ kind: "roll", title: "Reaction roll", detail: reactionFor(r.total), dice: r.dice, total: r.total });
      break;
    }

    case "mapMoveParty": {
      gmOnly();
      const hex = hexAt(action.key);
      const wasHidden = !hex.revealed;
      state.map.party = action.key;
      hex.revealed = true;
      const place = hex.name ?? hex.landmark ?? HEX_TYPES.find((t) => t.id === hex.type)!.name;
      if (action.travel) {
        if (state.clock.mode !== "wilderness") state.clock.mode = "wilderness";
        passTime(TURNS_PER_WATCH * (hex.difficult ? 2 : 1), `The party travels to ${place}`);
      } else {
        log({ kind: "event", title: `The party arrives at ${place}` });
      }
      if (wasHidden) log({ kind: "event", title: `Discovered: ${place}`, detail: hex.landmark && hex.name ? hex.landmark : undefined });
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
