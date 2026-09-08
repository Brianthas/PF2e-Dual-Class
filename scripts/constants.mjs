export const MODULE_ID = "pf2e-dual-class";

/**
 * Actor flag holding the item id of the class item treated as secondary.
 *
 * One flag is the whole of the module's persisted state. Everything else - the merged
 * proficiencies, hit points, feat ladders, class DCs - is recomputed from the two class items on
 * every data-prep cycle, so clearing this flag returns the actor to a normal single-class
 * character with nothing left behind.
 */
export const SECONDARY_CLASS_FLAG = "secondaryClass";

/**
 * Prefixes for the feat sections this module adds.
 *
 * A section id becomes the prefix of every slot id inside it: `FeatGroup` builds each slot as
 * `${group.id}-${level}` (pf2e.mjs:33227-33235), so `dc-class-wizard` yields `dc-class-wizard-1`,
 * `dc-class-wizard-2` and so on. Those slot ids are written to `system.location` on any feat placed
 * in them, which makes them persisted data: renaming a prefix orphans every feat already slotted
 * under the old one.
 */
export const SECTION_PREFIX = {
  CLASS: "dc-class",
  SKILL: "dc-skill",
  GENERAL: "dc-general",
  ANCESTRY: "dc-ancestry"
};

/** Every section id this module creates starts with this, so they can be recognised generically. */
export const SECTION_ROOT = "dc-";
