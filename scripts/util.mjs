import { MODULE_ID, SECONDARY_CLASS_FLAG, EXTRA_CLASSES_FLAG } from "./constants.mjs";
import { moduleEnabled } from "./settings.mjs";

/**
 * Register one libWrapper patch, catching a failure rather than letting it throw.
 *
 * An exception thrown out of a `libWrapper.register` call inside a hook callback aborts the rest of
 * that callback, so one bad target silently prevents every *later* registration in the same
 * function from happening at all. The visible symptom is not "one feature broken" but "most of the
 * module missing", which is a much harder thing to diagnose from a bug report.
 *
 * @param {string} target Dotted path libWrapper resolves.
 * @param {Function} fn The wrapper.
 * @param {"WRAPPER"|"MIXED"|"OVERRIDE"} type
 * @returns {boolean} Whether the patch registered.
 */
export function registerLibWrapper(target, fn, type) {
  try {
    libWrapper.register(MODULE_ID, target, fn, type);
    return true;
  } catch (error) {
    console.error(`${MODULE_ID} | failed to patch ${target}`, error);
    ui.notifications?.error(
      `Dual Class Items (PF2e) could not patch the system (${target}). Dual-class characters will not `
      + "work correctly - check the console (F12) and consider reporting this on the module's "
      + "GitHub issues.",
      { permanent: true }
    );
    return false;
  }
}

/**
 * Show a message as a toast and as a whisper to the acting user and all GMs.
 *
 * A toast is gone in a few seconds, which is exactly when someone goes looking for the wording of a
 * warning they half-read. The whisper leaves a scrollable record, and puts it in front of the GM
 * even when a player triggered it.
 *
 * @param {"info"|"warn"|"error"} level
 * @param {string} message
 */
export function notifyDualClass(level, message) {
  ui.notifications?.[level](message);

  const whisper = ChatMessage.getWhisperRecipients("GM").map((u) => u.id);
  if (!whisper.includes(game.user.id)) whisper.push(game.user.id);

  ChatMessage.create({
    content: message,
    whisper,
    flavor: game.i18n.localize("PF2EDC.ModuleName")
  });
}

/**
 * The ids of every class beyond the first, in the order they were added.
 *
 * Reads the flag rather than item order, because `actor.items` order decides which class PF2e
 * itself treats as the real one and that is not something the player chooses.
 *
 * Characters built before this module supported a third class carry a single id under the old
 * `secondaryClass` flag. That is read here and treated as a one-entry list, so nothing has to be
 * migrated on disk and a character whose flag is never rewritten keeps working.
 *
 * @param {ActorPF2e} actor
 * @returns {string[]}
 */
export function getExtraClassIds(actor) {
  if (!moduleEnabled()) return [];
  if (actor?.type !== "character") return [];

  const list = actor.getFlag(MODULE_ID, EXTRA_CLASSES_FLAG);
  if (Array.isArray(list)) return list.filter((id) => typeof id === "string");

  const legacy = actor.getFlag(MODULE_ID, SECONDARY_CLASS_FLAG);
  return typeof legacy === "string" ? [legacy] : [];
}

/**
 * Every class item beyond the first, in flag order, with any id that no longer resolves dropped.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e[]}
 */
export function getExtraClasses(actor) {
  return getExtraClassIds(actor)
    .map((id) => actor.items.get(id))
    .filter((item) => item?.type === "class");
}

/**
 * The class item flagged as secondary, or null. The first extra class.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e|null}
 */
export function getSecondaryClass(actor) {
  return getExtraClasses(actor)[0] ?? null;
}

/**
 * The class item that is not one of the extras, on an actor that has at least one.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e|null}
 */
export function getPrimaryClass(actor) {
  const extraIds = new Set(getExtraClassIds(actor));
  if (extraIds.size === 0) return null;
  return actor.itemTypes.class.find((c) => !extraIds.has(c.id)) ?? null;
}

/**
 * Every class item on the actor in rules order: the primary first, then the extras as flagged.
 *
 * This is the list to fold over for anything the rules say to take across all classes - the higher
 * Hit Points, the highest proficiency, the larger skill count, a feat ladder each. Empty when the
 * module is off or the actor has no extra classes, so callers can treat empty as "not our business".
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e[]}
 */
export function getAllClasses(actor) {
  const primary = getPrimaryClass(actor);
  if (!primary) return [];
  return [primary, ...getExtraClasses(actor)];
}

/**
 * Whether this module's rules are active for this actor: the module is on, and the actor has a
 * primary class plus at least one extra.
 *
 * @param {ActorPF2e} actor
 * @returns {boolean}
 */
export function isMultiClassActor(actor) {
  return getAllClasses(actor).length >= 2;
}

/** A class item's slug, falling back to its name the way PF2e's own code does. */
export function classSlug(classItem) {
  return classItem.slug ?? game.pf2e.system.sluggify(classItem.name);
}
