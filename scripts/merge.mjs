import { registerLibWrapper, isMultiClassActor, getAllClasses, classSlug } from "./util.mjs";

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
 * Recompute every field that an additional class item gets wrong.
 *
 * Folds over every class the character has rather than a primary and a secondary. The rules treat
 * each class after the first identically, so a third is another entry in the same fold, not another
 * branch: Hit Points take the highest of all of them, key options are the union of all of them, and
 * every class contributes its own boost and its own class DC.
 *
 * @param {ActorPF2e} actor
 */
function applyDualClassMerge(actor) {
  if (!isMultiClassActor(actor)) return;

  const classes = getAllClasses(actor);
  const primary = classes[0];
  const { attributes, build, details, proficiencies } = actor.system;

  // Identity is always the primary's. PF2e supports exactly one `actor.class`, and everything that
  // reads it - the sheet header, the class DC that answers to `actor.classDC`, `{actor|keyAttribute}`
  // - needs a single answer rather than the one that happened to prepare last.
  actor.class = primary;
  details.class = { name: primary.name, trait: classSlug(primary) };

  // Hit Points: "use only the higher Hit Points per level", across however many classes there are.
  attributes.classhp = Math.max(...classes.map((c) => c.system.hp));

  // Every class offers its own key attribute options, and every boost applies: a key attribute
  // boost is neither Hit Points nor a starting skill, so "add everything from each class" covers it.
  build.attributes.keyOptions = [...new Set(classes.flatMap((c) => c.system.keyAbility.value))];

  // `boosts.class` is initialised to null and written as a single string by PF2e, but the code that
  // turns boosts into attribute modifiers (pf2e.mjs:34054) branches on `typeof === "string"` else
  // `Array.isArray`, applying every entry, for every category including `class`. So an array here
  // gets every boost applied through PF2e's own arithmetic, including the partial-boost rule
  // `mod += mod >= 4 ? 0.5 : 1`, at the `class` position of the boost order
  // ["ancestry", "background", "class", 1, 5, 10, 15, 20] - before the level 1 free boosts.
  //
  // Not deduplicated. Two classes keyed on the same attribute really do boost it twice: the rule
  // against boosting the same attribute twice governs one set of boosts, not two arriving from two
  // classes.
  build.attributes.boosts.class = classes
    .map((c) => c.system.keyAbility.selected)
    .filter((a) => typeof a === "string");

  // PF2e derives this from `boosts.class` on the same line it assigns it, which produces the array
  // once the line above has run. The character's single key attribute is the primary's.
  if (!build.attributes.manual) {
    details.keyability.value = primary.system.keyAbility.selected ?? "str";
  }

  // Every class writes its class DC entry with `primary: true`. Exactly one should hold it, and each
  // DC uses its own class's key attribute rather than whatever `details.keyability.value` happened
  // to be when that class prepared.
  for (const [index, classItem] of classes.entries()) {
    const slug = classSlug(classItem);
    const dc = proficiencies.classDCs?.[slug];
    if (!dc) continue;
    dc.primary = index === 0;
    if (classItem.system.keyAbility.selected) dc.attribute = classItem.system.keyAbility.selected;
  }
}
