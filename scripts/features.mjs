import { MODULE_ID } from "./constants.mjs";
import { getSecondaryClass, isDualClassActor, notifyDualClass } from "./util.mjs";

/**
 * Granting the second class's features.
 *
 * `CharacterPF2e._preUpdate` grants class features when the level changes, from
 * `let s = this.class` (pf2e.mjs:34534) - one class, singular. On a two-class actor that means only
 * the primary's features ever arrive. Confirmed live: a Monk/Wizard taken to level 5 gained the
 * Wizard's Reflex Expertise and nothing from the Monk.
 *
 * The level-*down* branch (pf2e.mjs:34543) deletes class features by level with no class awareness,
 * so it already removes both classes' features correctly. Only the granting side needs anything.
 *
 * Rather than wrap that async internal and try to slot in beside it, this is a separate reconciler.
 * It works out what the secondary class should have granted by now, drops anything already present,
 * and creates the rest. Because the filter is on `sourceId`, running it twice is a no-op, which is
 * what makes it safe to call from a level change, from flagging a secondary class, and from a button
 * on the sheet - including on a character that was already level 8 when the second class arrived.
 */

/**
 * Create any class features the secondary class should have granted but has not.
 *
 * @param {ActorPF2e} actor
 * @param {object} [options]
 * @param {boolean} [options.notify] Report what happened to the user.
 * @returns {Promise<ItemPF2e[]>} The features created.
 */
export async function syncSecondaryClassFeatures(actor, { notify = false } = {}) {
  if (!isDualClassActor(actor)) return [];

  const secondary = getSecondaryClass(actor);
  const granted = await secondary.createGrantedItems({ level: actor.level });

  // `createGrantedItems` already drops anything above the target level and stamps
  // `system.location` with the class item's id, so the features link back to the secondary class
  // and render under the existing Class Features group.
  const present = new Set(
    actor.itemTypes.feat.filter((f) => f.category === "classfeature").map((f) => f.sourceId)
  );
  const missing = granted.filter((f) => !present.has(f.sourceId)).map((f) => f.toObject());

  if (missing.length === 0) {
    if (notify) {
      notifyDualClass(
        "info",
        game.i18n.format("PF2EDC.Sync.UpToDate", { class: secondary.name })
      );
    }
    return [];
  }

  const created = await actor.createEmbeddedDocuments("Item", missing, { keepId: true });
  if (notify) {
    notifyDualClass(
      "info",
      game.i18n.format("PF2EDC.Sync.Added", { count: created.length, class: secondary.name })
    );
  }
  return created;
}

/**
 * Level changes, and the moment a second class is designated.
 *
 * PF2e's own grant runs in `_preUpdate`, so by the time this fires the primary's new features are
 * already in place and `actor.level` is the new value.
 */
export function onUpdateActor(actor, changes, options, userId) {
  if (game.user.id !== userId) return;

  const levelChanged = changes?.system?.details?.level?.value !== undefined;
  // Flagging a class secondary is the other moment worth syncing on: it is what lets a class added
  // to an already level 8 character catch up immediately instead of waiting for the next level.
  const flagChanged = changes?.flags?.[MODULE_ID]?.secondaryClass !== undefined;
  if (!levelChanged && !flagChanged) return;
  if (!isDualClassActor(actor)) return;

  syncSecondaryClassFeatures(actor);
}
