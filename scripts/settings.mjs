import { MODULE_ID } from "./constants.mjs";

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
 * Whether Ancestry Paragon is on.
 *
 * Independent of dual class - it is its own variant rule and applies to every character in the
 * world, single-classed or not.
 */
export function ancestryParagonEnabled() {
  return game.settings.get(MODULE_ID, "ancestryParagon") === true;
}
