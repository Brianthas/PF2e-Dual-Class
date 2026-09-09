import { MODULE_ID } from "./constants.mjs";
import { getExtraClasses, isMultiClassActor, notifyDualClass } from "./util.mjs";

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
  if (!isMultiClassActor(actor)) return [];

  const extras = getExtraClasses(actor);
  const names = extras.map((c) => c.name).join(", ");

  // Every extra class, not just the second: PF2e grants features on level change from `actor.class`
  // alone, so each one beyond the primary needs catching up.
  //
  // `createGrantedItems` already drops anything above the target level and stamps
  // `system.location` with its own class item's id, so the features link back to the class that
  // granted them and render under the existing Class Features group.
  const present = new Set(
    actor.itemTypes.feat.filter((f) => f.category === "classfeature").map((f) => f.sourceId)
  );

  const missing = [];
  for (const classItem of extras) {
    // Nothing is generated for a class that has nothing new to give. `createGrantedItems` re-runs
    // the class's ChoiceSets as it builds the items, so calling it and discarding duplicates
    // afterwards asks the player to re-pick their Rogue racket on every level up and then throws
    // the answer away. The grant table on the class item says what it *would* produce - uuid and
    // level per entry - which is enough to know whether the call is needed at all.
    if (!hasUngrantedFeatures(classItem, actor.level, present)) continue;

    const granted = await classItem.createGrantedItems({ level: actor.level });
    for (const feature of granted) {
      // Checked against what has been collected so far as well as what the actor holds, so two
      // classes granting the same feature do not queue it twice in one run.
      if (present.has(feature.sourceId)) continue;
      present.add(feature.sourceId);
      missing.push(feature.toObject());
    }
  }

  if (missing.length === 0) {
    if (notify) {
      notifyDualClass("info", game.i18n.format("PF2EDC.Sync.UpToDate", { class: names }));
    }
    return [];
  }

  const created = await actor.createEmbeddedDocuments("Item", missing, { keepId: true });
  if (notify) {
    notifyDualClass(
      "info",
      game.i18n.format("PF2EDC.Sync.Added", { count: created.length, class: names })
    );
  }
  return created;
}

/**
 * Whether a class still owes this character any feature at its current level.
 *
 * Read off `system.items`, the class item's own grant table: each entry carries the `uuid` of what
 * it grants and the `level` it arrives at. Comparing those uuids against the sourceIds the actor
 * already holds answers "is there anything to do" without generating anything, and generating is
 * what triggers the prompts.
 *
 * Errs toward saying yes: an entry whose uuid cannot be compared counts as missing, so the worst
 * case is the old behaviour rather than a feature silently never arriving.
 *
 * @param {ItemPF2e} classItem
 * @param {number} level
 * @param {Set<string>} present sourceIds of the class features the actor already has.
 * @returns {boolean}
 */
function hasUngrantedFeatures(classItem, level, present) {
  const entries = Object.values(classItem.system.items ?? {});
  if (entries.length === 0) return false;
  return entries.some((entry) => {
    if (typeof entry?.level === "number" && entry.level > level) return false;
    return typeof entry?.uuid !== "string" || !present.has(entry.uuid);
  });
}

/**
 * Level changes, and the moment a class is added.
 *
 * PF2e's own grant runs in `_preUpdate`, so by the time this fires the primary's new features are
 * already in place and `actor.level` is the new value.
 */
export function onUpdateActor(actor, changes, options, userId) {
  if (game.user.id !== userId) return;

  const levelChanged = changes?.system?.details?.level?.value !== undefined;
  // Recording a new class is the other moment worth syncing on: it is what lets a class added to an
  // already level 8 character catch up immediately instead of waiting for the next level. Both flag
  // names are watched, since a character built before the list existed still carries the old one.
  const flags = changes?.flags?.[MODULE_ID];
  const flagChanged = flags?.extraClasses !== undefined || flags?.secondaryClass !== undefined;
  if (!levelChanged && !flagChanged) return;
  if (!isMultiClassActor(actor)) return;

  syncSecondaryClassFeatures(actor);
}
