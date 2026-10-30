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

/** How many classes a character may hold, by whether a third is allowed. */
export const MAX_CLASSES = { dual: 2, triple: 3 };

/**
 * Actor flag allowing this one character a third class, set from the GM's permissions screen.
 *
 * Separate from `EXTRA_CLASSES_FLAG`, which records the classes a character *has*. This records
 * what they are *allowed*, so revoking it leaves the third class in place to be dealt with rather
 * than silently unmaking a character.
 */
export const THIRD_CLASS_FLAG = "allowThirdClass";

/**
 * Prefix for the class feat section this module adds for each extra class.
 *
 * A section id becomes the prefix of every slot id inside it: `FeatGroup` builds each slot as
 * `${group.id}-${level}`, so `dc-class-wizard` yields `dc-class-wizard-1`, `dc-class-wizard-2` and
 * so on. Those slot ids are written to `system.location` on any feat placed in them, which makes
 * them persisted data: renaming the prefix orphans every feat already slotted under the old one.
 *
 * Class feats are the only kind with a section of their own. Skill, general and ancestry feats are
 * merged into the system's own groups (`ladders.mjs`), and no released version ever gave them a
 * section, so no stored feat carries any other prefix.
 */
export const SECTION_PREFIX = {
  CLASS: "dc-class"
};

/**
 * The id prefix for Ancestry Paragon's second slot at 1st level, which is `dc-paragon-1`.
 *
 * The paragon slots live in the system's own Ancestry Feats group, built as slot objects by
 * `paragonSlots` in `ladders.mjs`. A plain level number becomes the id `ancestry-<level>`, so a
 * second slot at level 1 needs an id of its own or the two share one slot. That id is persisted in
 * `system.location` like any slot id.
 */
export const PARAGON_SECTION = "dc-paragon";

/**
 * Ancestry Paragon's extra feat levels.
 *
 * The rule gives two ancestry feats at 1st level and one at every odd level thereafter, eleven in
 * total (Gamemastery Guide p. 194, https://2e.aonprd.com/Rules.aspx?ID=1336). A class item's own
 * ancestry ladder is 1, 5, 9, 13 and 17, so these six are what the variant adds on top, including a
 * second slot at level 1 (see `PARAGON_SECTION`).
 */
export const PARAGON_LEVELS = [1, 3, 7, 11, 15, 19];

/** Every section id this module creates starts with this, so they can be recognised generically. */
export const SECTION_ROOT = "dc-";
