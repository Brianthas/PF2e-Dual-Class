import { MODULE_ID, SECONDARY_CLASS_FLAG } from "./constants.mjs";
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
      `Dual Class (PF2e) could not patch the system (${target}). Dual-class characters will not `
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
 * The class item flagged as secondary, or null.
 *
 * Reads the flag rather than item order, because `actor.items` order decides which class PF2e
 * itself treats as the real one and that is not something the player chooses.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e|null}
 */
export function getSecondaryClass(actor) {
  if (!moduleEnabled()) return null;
  if (actor?.type !== "character") return null;
  const id = actor.getFlag(MODULE_ID, SECONDARY_CLASS_FLAG);
  if (typeof id !== "string") return null;
  const item = actor.items.get(id);
  return item?.type === "class" ? item : null;
}

/**
 * The class item that is *not* the secondary one, on an actor that has a secondary.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e|null}
 */
export function getPrimaryClass(actor) {
  const secondary = getSecondaryClass(actor);
  if (!secondary) return null;
  return actor.itemTypes.class.find((c) => c.id !== secondary.id) ?? null;
}

/**
 * Whether dual-class rules are active for this actor: the module is on and two class items are
 * present, one of them flagged secondary.
 *
 * @param {ActorPF2e} actor
 * @returns {boolean}
 */
export function isDualClassActor(actor) {
  return !!getSecondaryClass(actor) && !!getPrimaryClass(actor);
}

/** A class item's slug, falling back to its name the way PF2e's own code does. */
export function classSlug(classItem) {
  return classItem.slug ?? game.pf2e.system.sluggify(classItem.name);
}
