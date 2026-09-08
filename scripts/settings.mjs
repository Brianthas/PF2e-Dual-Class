import { MODULE_ID, MAX_CLASSES } from "./constants.mjs";

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
 * **Takes the actor even though the world setting is currently the only input.** A third class is
 * not necessarily a property of the world: content elsewhere grants one character a third class in
 * a world that is otherwise dual-class. Nothing here reads the actor yet, and every caller passes
 * one, so that can be added in this function alone rather than at each of its call sites.
 *
 * @param {ActorPF2e} actor
 * @returns {number}
 */
export function maxClasses(actor) {
  if (!moduleEnabled()) return 1;
  if (actor?.type !== "character") return MAX_CLASSES.dual;
  return game.settings.get(MODULE_ID, "tripleClass") === true ? MAX_CLASSES.triple : MAX_CLASSES.dual;
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
