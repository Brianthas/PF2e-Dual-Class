import { moduleEnabled } from "./settings.mjs";
import { notifyDualClass } from "./util.mjs";

/**
 * Stop a character leaving 1st level with only one class.
 *
 * In a dual-class game every character has two classes, and the second one has to be picked during
 * the build: its 1st-level features, its proficiencies and its own key attribute boost all belong to
 * the character from the start. Levelling to 2nd with one class silently locks in a character that
 * never received any of that, and the sheet gives no sign - the numbers all look like a legitimate
 * single-class character, because that is what they are.
 *
 * The gate is on *leaving* 1st level rather than on every level change. A character already past
 * 1st with one class is not being built right now - it may have been imported, or predate the
 * variant being switched on - and blocking every update to it would be obstructive rather than
 * helpful.
 *
 * ## Why this cannot ask "is this a dual-class character"
 *
 * There is no such flag to read. This module's flag names which of two class items is the second
 * one, so it does not exist until the second class does - the state being guarded against is exactly
 * the state that has no flag. What stands in for it is the world setting: switching Dual Class on is
 * the table saying every character is dual-classed.
 *
 * ## Players are stopped, GMs are warned
 *
 * A GM has legitimate reasons for a one-class character in a dual-class world - an NPC built on the
 * character sheet, or a character partway through being fixed - and no way to say so to a hard
 * block short of turning the module off for everyone. So the level change goes through for them with
 * a warning, and is refused for a player.
 */
export function registerLevelGate() {
  Hooks.on("preUpdateActor", onPreUpdateActor);
}

function onPreUpdateActor(actor, changes, options, userId) {
  if (!moduleEnabled() || actor?.type !== "character") return true;

  const next = changes?.system?.details?.level?.value;
  if (typeof next !== "number") return true;

  // Only the moment of leaving 1st level.
  if (actor.level > 1 || next <= 1) return true;
  if (actor.itemTypes.class.length >= 2) return true;

  const held = actor.itemTypes.class[0]?.name;
  const message = held
    ? game.i18n.format("PF2EDC.LevelGate.OneClass", { actor: actor.name, class: held })
    : game.i18n.format("PF2EDC.LevelGate.NoClass", { actor: actor.name });

  if (game.users.get(userId)?.isGM) {
    notifyDualClass("warn", `${message} ${game.i18n.localize("PF2EDC.LevelGate.GmAllowed")}`);
    return true;
  }

  notifyDualClass("warn", `${message} ${game.i18n.localize("PF2EDC.LevelGate.Blocked")}`);
  return false;
}
