export const MODULE_ID = "pf2e-dual-class-items";

/**
 * Actor flag holding the item ids of every class beyond the first, in the order they were added.
 *
 * One flag is the whole of the module's persisted state. Everything else - the merged
 * proficiencies, hit points, feat ladders, class DCs - is recomputed from the class items on every
 * data-prep cycle, so clearing this flag returns the actor to a normal single-class character with
 * nothing left behind.
 *
 * A list rather than one id per position. The rules treat every class after the first identically,
 * so a `tertiaryClass` flag beside `secondaryClass` would double the branching at every reader for
 * no gain, and a fourth would double it again.
 */
export const EXTRA_CLASSES_FLAG = "extraClasses";

/**
 * The flag this module wrote before it supported more than two classes: a single class item id.
 *
 * Read on migration only, never written. Characters built under 0.2.x carry it, and their second
 * class would silently stop being recognised without this.
 */
export const SECONDARY_CLASS_FLAG = "secondaryClass";

/** How many classes a character may hold, by whether the third-class setting is on. */
export const MAX_CLASSES = { dual: 2, triple: 3 };

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

/**
 * The Ancestry Paragon section. Not one of the per-class prefixes above: it has nothing to do with
 * a second class, and its id carries no class slug because there is only ever one of it.
 *
 * Deliberately not `dc-ancestry-paragon`, which would collide with the `dc-ancestry` prefix used for
 * a second class's extra ancestry feat levels and make the two indistinguishable by id.
 */
export const PARAGON_SECTION = "dc-paragon";

/**
 * Ancestry Paragon's extra feat levels.
 *
 * The rule gives two ancestry feats at 1st level and one at every odd level thereafter, eleven in
 * total (Gamemastery Guide p. 194, https://2e.aonprd.com/Rules.aspx?ID=1336). A class item's own
 * ancestry ladder is 1, 5, 9, 13 and 17, so these six are what the variant adds on top - including
 * a second slot at level 1, which is why it has to be its own group: slots are keyed
 * `<group>-<level>` (pf2e.mjs:33519), so two slots at level 1 cannot live in one group.
 */
export const PARAGON_LEVELS = [1, 3, 7, 11, 15, 19];

/** Every section id this module creates starts with this, so they can be recognised generically. */
export const SECTION_ROOT = "dc-";
