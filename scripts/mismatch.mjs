import { SECTION_PREFIX } from "./constants.mjs";
import { moduleEnabled } from "./settings.mjs";
import { getPrimaryClass, getSecondaryClass, isMultiClassActor, classSlug, notifyDualClass } from "./util.mjs";

/**
 * Warn when a class feat lands in the other class's ladder.
 *
 * Each ladder is filtered to its own class's trait, but that filter is a browsing aid rather than a
 * gate: `FeatGroup#isFeatValid` tests `supported`, which is the feat *category*, and never looks at
 * `filter.traits`. Both ladders therefore accept any feat of category `class`, so a Fighter feat
 * dropped into the Wizard ladder goes in and stays in.
 *
 * This warns instead of blocking. Blocking would mean wrapping `FeatGroup#insertFeat`, and that
 * class is not exposed on `CONFIG` - it can only be reached through an actor's live `feats`
 * collection - so a guard there would be reaching into an object the system never offered. The
 * warning names both classes, since the useful information is which ladder the feat belonged in.
 *
 * Archetype and dedication feats are deliberately not flagged. Both ladders legitimately accept
 * them, which is why PF2e's own class group includes `dedication` (or `archetype`, once the
 * character has one) alongside the class trait in its filter.
 */

export function registerMismatchWarning() {
  Hooks.on("createItem", (item, options, userId) => checkFeat(item, userId));
  Hooks.on("updateItem", (item, changes, options, userId) => {
    if (changes?.system?.location === undefined) return;
    checkFeat(item, userId);
  });
}

function checkFeat(item, userId) {
  if (game.user.id !== userId) return;
  if (!moduleEnabled() || item?.type !== "feat") return;

  const actor = item.parent;
  if (!isMultiClassActor(actor)) return;

  const location = item.system.location;
  if (typeof location !== "string") return;

  const primary = getPrimaryClass(actor);
  const secondary = getSecondaryClass(actor);
  const secondarySlug = classSlug(secondary);
  const primarySlug = classSlug(primary);

  // Which ladder did it land in? The secondary's slots are `dc-class-<slug>-<level>`; the primary's
  // are PF2e's own `class-<level>`.
  const inSecondary = location.startsWith(`${SECTION_PREFIX.CLASS}-${secondarySlug}-`);
  const inPrimary = /^class-\d+$/.test(location);
  if (!inSecondary && !inPrimary) return;

  const traits = item.traits;
  if (traits.has("archetype") || traits.has("dedication")) return;

  const expected = inSecondary ? secondarySlug : primarySlug;
  const other = inSecondary ? primarySlug : secondarySlug;

  // Only complain when the feat positively belongs to the other class. A feat carrying neither
  // class trait - a generic class feat, or one from a third-party class this check knows nothing
  // about - is not evidence of a mistake.
  if (traits.has(expected) || !traits.has(other)) return;

  const expectedName = inSecondary ? secondary.name : primary.name;
  const otherName = inSecondary ? primary.name : secondary.name;

  notifyDualClass("warn", game.i18n.format("PF2EDC.Mismatch.Warning", {
    feat: item.name,
    placed: expectedName,
    belongs: otherName
  }));
}
