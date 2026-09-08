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
}

/** Whether the module is switched on for this world. */
export function moduleEnabled() {
  return game.settings.get(MODULE_ID, "moduleEnabled") === true;
}
