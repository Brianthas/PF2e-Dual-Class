import { MODULE_ID } from "./constants.mjs";
import { registerSettings } from "./settings.mjs";
import { registerCoexistence, onDeleteClassItem, armSecondClass, clearArm } from "./coexist.mjs";
import { registerMerge } from "./merge.mjs";
import { registerLadders, buildSections } from "./ladders.mjs";
import { onUpdateActor, syncSecondaryClassFeatures } from "./features.mjs";
import { registerBoostRows } from "./boosts.mjs";
import { registerSheet } from "./sheet.mjs";

/**
 * Registration timing.
 *
 * PF2e builds `CONFIG.PF2E` and `game.pf2e.settings` inside its own `init` listener, so whether our
 * `init` runs before or after it depends on package load order. Anything that reads those is tried
 * at `init` and retried at `setup`, which is guaranteed to be later.
 *
 * The libWrapper patches here do not have that problem: they name their targets as strings and
 * libWrapper resolves them lazily, so registering at `init` is safe even for PF2e classes that are
 * not on `CONFIG` yet.
 */

Hooks.once("init", () => {
  if (!game.system?.id || game.system.id !== "pf2e") {
    console.error(`${MODULE_ID} | the pf2e system is not active. This module requires it.`);
    return;
  }

  registerSettings();

  if (!game.modules.get("lib-wrapper")?.active) {
    console.error(`${MODULE_ID} | the "libWrapper" module is required but is not active.`);
    ui.notifications?.error(
      "Dual Class (PF2e) requires the \"libWrapper\" module to be installed and active. "
      + "Dual-class features will not work until it is enabled.",
      { permanent: true }
    );
    return;
  }

  const patched = {
    coexistence: registerCoexistence(),
    merge: registerMerge(),
    ladders: registerLadders()
  };
  registerBoostRows();
  registerSheet();

  const failed = Object.entries(patched).filter(([, ok]) => !ok).map(([name]) => name);
  if (failed.length) console.error(`${MODULE_ID} | init: failed to patch ${failed.join(", ")}`);
  else console.log(`${MODULE_ID} | init: all patches registered`);
});

Hooks.on("deleteItem", onDeleteClassItem);
Hooks.on("updateActor", onUpdateActor);

Hooks.once("ready", () => {
  // Exposed so a macro or the console can drive the same entry points the sheet controls use.
  game.modules.get(MODULE_ID).api = {
    armSecondClass, clearArm, buildSections, syncSecondaryClassFeatures
  };
});
