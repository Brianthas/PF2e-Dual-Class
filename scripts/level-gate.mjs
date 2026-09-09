import { moduleEnabled, maxClasses } from "./settings.mjs";
import { notifyDualClass } from "./util.mjs";

/**
 * Stop a character leaving 1st level without every class it is entitled to.
 *
 * Each class has to be picked during the build: its 1st-level features, its proficiencies and its
 * own key attribute boost all belong to the character from the start. Levelling to 2nd without one
 * silently locks in a character that never received any of that, and the sheet gives no sign - the
 * numbers all look like a legitimate character with fewer classes, because that is what they are.
 *
 * How many is per character rather than per world, from `maxClasses(actor)`. A character allowed a
 * third class needs three; another character in the same world still needs only two.
 *
 * The gate is on *leaving* 1st level rather than on every level change. A character already past
 * 1st with one class is not being built right now - it may have been imported, or predate the
 * variant being switched on - and blocking every update to it would be obstructive rather than
 * helpful.
 *
 * ## Why this cannot ask "how many classes is this character meant to have"
 *
 * Not from the module's own flag: that lists the classes a character *has*, so it does not exist
 * until the second class does, and the state being guarded against is exactly the state with no
 * flag. What stands in for it is entitlement rather than possession - the world setting saying every
 * character is dual-classed, plus any per-character allowance on top. Both are read by
 * `maxClasses`, so this file never asks where the number came from.
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

  // How many this character needs, not a fixed two: a character allowed a third needs all three
  // before levelling, for the same reason the second is required. Every class's 1st-level features,
  // proficiencies and key attribute boost belong to the character from the start.
  const required = maxClasses(actor);
  const held = actor.itemTypes.class;
  if (held.length >= required) return true;

  const names = held.map((c) => c.name).join(", ");
  const message = held.length
    ? game.i18n.format("PF2EDC.LevelGate.Missing", {
      actor: actor.name,
      have: held.length,
      need: required,
      classes: names
    })
    : game.i18n.format("PF2EDC.LevelGate.NoClass", { actor: actor.name });

  if (game.users.get(userId)?.isGM) {
    notifyDualClass("warn", `${message} ${game.i18n.localize("PF2EDC.LevelGate.GmAllowed")}`);
    return true;
  }

  notifyDualClass("warn", `${message} ${game.i18n.localize("PF2EDC.LevelGate.Blocked")}`);
  return false;
}
