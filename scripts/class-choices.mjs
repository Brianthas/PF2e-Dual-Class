import { registerLibWrapper, getAllClasses, classSlug } from "./util.mjs";
import { moduleEnabled } from "./settings.mjs";

/**
 * Feat pickers that filter on "your class" only ever see the first one.
 *
 * Natural Ambition grants a 1st-level class feat, and its ChoiceSet narrows the compendium with
 * `item:trait:{actor|system.details.class.trait}`. That path holds a single trait, and on a
 * multi-class character it is the primary's, so a Fighter/Sorcerer taking Natural Ambition is
 * offered Fighter feats and nothing else.
 *
 * Rewriting it to accept any of the character's class traits is a ruling, since the published rule
 * says "a 1st-level class feat" without contemplating two classes. It matches what the rest of the
 * module does: both classes are real, both contribute roll options, both get a feat ladder, so a
 * feat that reaches for "your class" should reach all of them.
 *
 * Surveyed across 7541 items in the feat, class feature, ancestry feature and heritage packs: one
 * ChoiceSet filters on this path. The wrapper is written against the shape rather than the item, so
 * anything else adopting it is covered without a list to maintain.
 *
 * Nothing is written. The widened filter is handed to the query and discarded, so the item on the
 * actor keeps the rules it shipped with and turning the module off changes nothing.
 */

/** The predicate that resolves to exactly one class trait. */
const CLASS_TRAIT_FILTER = /^item:trait:\{actor\|system\.details\.class\.trait\}$/;

export function registerClassChoices() {
  return registerLibWrapper(
    "game.pf2e.RuleElements.builtin.ChoiceSet.prototype.queryCompendium",
    function (wrapped, choices, ...rest) {
      return wrapped(widenClassTraits(this.actor, choices) ?? choices, ...rest);
    },
    "WRAPPER"
  );
}

/**
 * A copy of `choices` accepting every class the character has, or null to leave it alone.
 *
 * Returns null rather than an unchanged copy so the caller can pass the original object through,
 * keeping this invisible to every ChoiceSet that does not filter on the class trait.
 *
 * @param {ActorPF2e|null} actor
 * @param {object} choices
 * @returns {object|null}
 */
function widenClassTraits(actor, choices) {
  if (!moduleEnabled() || actor?.type !== "character") return null;

  const filter = choices?.filter;
  if (!Array.isArray(filter)) return null;
  if (!filter.some((entry) => typeof entry === "string" && CLASS_TRAIT_FILTER.test(entry))) return null;

  const traits = getAllClasses(actor).map((c) => classSlug(c)).filter(Boolean);
  if (traits.length < 2) return null;

  return {
    ...choices,
    filter: filter.map((entry) => (typeof entry === "string" && CLASS_TRAIT_FILTER.test(entry)
      ? { or: traits.map((trait) => `item:trait:${trait}`) }
      : entry))
  };
}
