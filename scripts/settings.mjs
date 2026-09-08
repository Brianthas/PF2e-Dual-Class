import { MODULE_ID, MAX_CLASSES, THIRD_CLASS_FLAG } from "./constants.mjs";
import { thirdClassPermissionsApp } from "./permissions.mjs";

export function registerSettings() {
  game.settings.register(MODULE_ID, "moduleEnabled", {
    name: "PF2EDC.Settings.ModuleEnabled.Name",
    hint: "PF2EDC.Settings.ModuleEnabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  // Three classes is not a published variant rule; it applies the Dual-Class rules to one more
  // class. Off by default, and gated behind Dual Class being on, since a third class without a
  // second is not a state worth supporting.
  //
  // Two ways to allow it, because they answer different questions. This setting is the world's
  // answer: every character may have three. The permissions menu below is the per-character answer,
  // for a world that is otherwise dual-class. Either grants it; neither is required by the other.
  game.settings.registerMenu(MODULE_ID, "thirdClassPermissions", {
    name: "PF2EDC.Settings.ThirdClassPermissions.Name",
    hint: "PF2EDC.Settings.ThirdClassPermissions.Hint",
    label: "PF2EDC.Settings.ThirdClassPermissions.Label",
    icon: "fa-solid fa-user-check",
    type: thirdClassPermissionsApp(),
    restricted: true
  });

  game.settings.register(MODULE_ID, "tripleClass", {
    name: "PF2EDC.Settings.TripleClass.Name",
    hint: "PF2EDC.Settings.TripleClass.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });

  // Its own variant rule, so its own setting rather than something the dual-class toggle drags in.
  // A world can want one without the other.
  game.settings.register(MODULE_ID, "ancestryParagon", {
    name: "PF2EDC.Settings.AncestryParagon.Name",
    hint: "PF2EDC.Settings.AncestryParagon.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false,
    requiresReload: true
  });
}

/** Whether the module is switched on for this world. */
export function moduleEnabled() {
  return game.settings.get(MODULE_ID, "moduleEnabled") === true;
}

/**
 * How many classes this character may hold: 3 when the third-class setting is on, otherwise 2.
 *
 * Gated behind `moduleEnabled` as well as its own setting, so turning Dual Class off turns off
 * everything rather than leaving a third class half-supported.
 *
 * Two independent sources grant the third, because they answer different questions: the world
 * setting says every character may have three, and the actor flag says this one may in a world that
 * is otherwise dual-class. Either is enough. Content that wants to grant a third class to one
 * character sets the same flag, so this function stays the only place that decides.
 *
 * @param {ActorPF2e} actor
 * @returns {number}
 */
export function maxClasses(actor) {
  if (!moduleEnabled()) return 1;
  if (actor?.type !== "character") return MAX_CLASSES.dual;
  if (game.settings.get(MODULE_ID, "tripleClass") === true) return MAX_CLASSES.triple;
  if (actor.getFlag(MODULE_ID, THIRD_CLASS_FLAG) === true) return MAX_CLASSES.triple;
  return MAX_CLASSES.dual;
}

/**
 * Whether Ancestry Paragon is on.
 *
 * Independent of dual class - it is its own variant rule and applies to every character in the
 * world, single-classed or not.
 */
export function ancestryParagonEnabled() {
  return game.settings.get(MODULE_ID, "ancestryParagon") === true;
}
