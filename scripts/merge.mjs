import { registerLibWrapper, isDualClassActor, getPrimaryClass, getSecondaryClass, classSlug } from "./util.mjs";

/**
 * Merging two class items into one character.
 *
 * Most of the Dual-Class rule is already how PF2e behaves. `ClassPF2e#prepareActorData`
 * (pf2e.mjs:51369-51395 on 8.4.1) writes with `Math.max` for perception rank, all three saving
 * throws, every attack and defense category, `proficiencies.spellcasting.rank`, and each trained
 * skill. It also writes `proficiencies.classDCs[slug]` keyed by class slug and sets
 * `rollOptions.all["class:<slug>"]`. So with two class items on the actor, "use the highest
 * proficiency granted for a given statistic" and "both class DCs" happen with no help from here -
 * confirmed by reading a live two-class actor, which had Monk's expert saves, Monk's expert
 * unarmored defense, Wizard's trained spellcasting, and both `class:monk` and `class:wizard`.
 *
 * The `class:<slug>` roll options matter more than they look: PF2e feats and rule elements predicate
 * on them, so a second class item is what makes the second class's own content work at all.
 *
 * Six fields are plain assignment rather than a max, so the last class to prepare wins:
 *
 *   e.class = this
 *   n.attributes.keyOptions = [...this.system.keyAbility.value]
 *   n.attributes.boosts.class = this.system.keyAbility.selected
 *   t.classhp = this.hpPerLevel
 *   r.keyability.value = ... boosts.class ...
 *   r.class = { name: this.name, trait: s }
 *
 * Left alone, a Monk/Wizard came out with `classhp: 6` and `hp.max` 6 at level 1 and 30 at level 5 -
 * the Monk's d10 simply absent. This module fixes those six.
 *
 * ## Why it recomputes instead of restoring a snapshot
 *
 * Prepare order follows `actor.items` order, so the secondary class can prepare either before or
 * after the primary. Rather than depend on that, the wrapper recomputes every merged field from
 * both class items after each one prepares. Running it twice gives the same answer as running it
 * once, and the answer does not depend on which class went first.
 */

export function registerMerge() {
  return registerLibWrapper(
    "CONFIG.PF2E.Item.documentClasses.class.prototype.prepareActorData",
    function (wrapped, ...args) {
      wrapped(...args);
      applyDualClassMerge(this.actor);
    },
    "WRAPPER"
  );
}

/**
 * Recompute every field that a second class item gets wrong.
 * @param {ActorPF2e} actor
 */
function applyDualClassMerge(actor) {
  if (!isDualClassActor(actor)) return;

  const primary = getPrimaryClass(actor);
  const secondary = getSecondaryClass(actor);
  const { attributes, build, details, proficiencies } = actor.system;

  // Identity is always the primary's. PF2e supports exactly one `actor.class`, and everything that
  // reads it - the sheet header, the class DC that answers to `actor.classDC`, `{actor|keyAttribute}`
  // - needs a single answer rather than the one that happened to prepare last.
  actor.class = primary;
  details.class = { name: primary.name, trait: classSlug(primary) };

  // Hit Points: "use only the higher Hit Points per level from the two classes."
  attributes.classhp = Math.max(primary.system.hp, secondary.system.hp);

  // Both classes offer their own key attribute options, and both boosts apply: a key attribute
  // boost is neither Hit Points nor a starting skill, so "add everything from each class" covers it.
  build.attributes.keyOptions = [
    ...new Set([...primary.system.keyAbility.value, ...secondary.system.keyAbility.value])
  ];

  // `boosts.class` is initialised to null and written as a single string by PF2e, but the code that
  // turns boosts into attribute modifiers (pf2e.mjs:33773-33778) branches on `typeof === "string"`
  // else `Array.isArray`, applying every entry, for every category including `class`. So an array
  // here gets both boosts applied through PF2e's own arithmetic, including the partial-boost rule
  // `mod += mod >= 4 ? 0.5 : 1`, at the `class` position of the boost order
  // ["ancestry", "background", "class", 1, 5, 10, 15, 20] - before the level 1 free boosts.
  const classBoosts = [primary.system.keyAbility.selected, secondary.system.keyAbility.selected]
    .filter((a) => typeof a === "string");
  build.attributes.boosts.class = classBoosts;

  // PF2e derives this from `boosts.class` on the same line it assigns it, which produces the array
  // once the line above has run. The character's single key attribute is the primary's.
  if (!build.attributes.manual) {
    details.keyability.value = primary.system.keyAbility.selected ?? "str";
  }

  // Both classes write their class DC entry with `primary: true`. Exactly one should hold it.
  const primarySlug = classSlug(primary);
  const secondarySlug = classSlug(secondary);
  if (proficiencies.classDCs?.[primarySlug]) proficiencies.classDCs[primarySlug].primary = true;
  if (proficiencies.classDCs?.[secondarySlug]) proficiencies.classDCs[secondarySlug].primary = false;

  // The class DC's attribute is written from `details.keyability.value` as it stood when that class
  // prepared, so the secondary's entry can carry the primary's attribute. Each class DC uses its own
  // class's key attribute.
  if (proficiencies.classDCs?.[secondarySlug] && secondary.system.keyAbility.selected) {
    proficiencies.classDCs[secondarySlug].attribute = secondary.system.keyAbility.selected;
  }
  if (proficiencies.classDCs?.[primarySlug] && primary.system.keyAbility.selected) {
    proficiencies.classDCs[primarySlug].attribute = primary.system.keyAbility.selected;
  }
}
