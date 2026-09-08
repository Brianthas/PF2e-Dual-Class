import { SECTION_PREFIX } from "./constants.mjs";
import { registerLibWrapper, isDualClassActor, getPrimaryClass, getSecondaryClass, classSlug } from "./util.mjs";

/**
 * A second set of feat ladders, one per class.
 *
 * `CharacterPF2e#prepareFeats` (pf2e.mjs:33984-33994) does three things in order: builds a
 * `CharacterFeats`, loops `game.pf2e.settings.campaign.feats.sections` calling `createGroup` on each
 * entry, then calls `assignToSlots()`. That loop is unconditional - it does not check the
 * `campaignFeats` setting, confirmed live in a world where that setting is off and custom sections
 * still appear. So pushing a section definition onto that array before `prepareFeats` runs is enough
 * to get a fully native feat group, rendered by PF2e's own template with its own styling and Browse
 * button, with no template patching.
 *
 * ## The push has to be undone in the same call
 *
 * That array is one world-global object, not a per-actor one. Anything left in it reaches every
 * character in the world: a section pushed and left there showed up on an unrelated level 20 actor
 * with a full ladder of slots. Pushing immediately before `wrapped()` and splicing back out in a
 * `finally` is what makes these sections belong to one actor. Nothing else reads the array during a
 * render - the sheet reads the actor's prepared groups, not the setting.
 *
 * ## Why not add the group after `wrapped()`
 *
 * `assignToSlots()` is not idempotent. For unslotted groups `assignFeat` pushes onto `feats[]`, and
 * `postProcess()` sorts and filters, so creating a group afterwards and re-running the assignment
 * would duplicate every feat that is not in a numbered slot. Pushing before is the only safe order.
 */

export function registerLadders() {
  return registerLibWrapper(
    "CONFIG.PF2E.Actor.documentClasses.character.prototype.prepareFeats",
    function (wrapped, ...args) {
      const sections = game.pf2e?.settings?.campaign?.feats?.sections;
      const extra = Array.isArray(sections) ? buildSections(this) : [];

      if (extra.length === 0) return wrapped(...args);

      const stoodDown = removeGenericClassSections(sections);
      sections.push(...extra);
      try {
        return wrapped(...args);
      } finally {
        for (const section of extra) {
          const at = sections.indexOf(section);
          if (at >= 0) sections.splice(at, 1);
        }
        sections.push(...stoodDown);
      }
    },
    "WRAPPER"
  );
}

/**
 * Take out any other module's generic "second class feat" section for the duration of this prepare.
 *
 * Another module can add a campaign feat section that is simply a second ladder of class-feat slots
 * at a fixed set of levels. On an actor this module already gives a per-class ladder to, that is a
 * third ladder offering the same slots twice, which reads as double the feats.
 *
 * The match is structural - a section whose `supported` list is exactly `["class"]` - rather than by
 * id. Matching an id would mean naming another package inside this one, and the id is not the part
 * that matters: what makes such a section redundant is that it accepts class feats generally. This
 * mirrors the shape of the duplicate check in the Divine Blessings module's `categories.mjs`.
 *
 * Sections are put back in the `finally`, so this changes nothing for single-class actors and
 * nothing is written to the stored setting.
 *
 * @param {object[]} sections The live world-global section array.
 * @returns {object[]} The removed sections, to be restored by the caller.
 */
function removeGenericClassSections(sections) {
  const removed = [];
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const supported = sections[i]?.supported;
    if (Array.isArray(supported) && supported.length === 1 && supported[0] === "class") {
      removed.push(...sections.splice(i, 1));
    }
  }
  return removed;
}

/**
 * The section definitions for one dual-class actor.
 * @param {ActorPF2e} actor
 * @returns {object[]}
 */
export function buildSections(actor) {
  if (!isDualClassActor(actor)) return [];

  const primary = getPrimaryClass(actor);
  const secondary = getSecondaryClass(actor);
  const slug = classSlug(secondary);
  const primarySlots = primary.grantedFeatSlots;
  const secondarySlots = secondary.grantedFeatSlots;

  // PF2e's own class group filters to the class trait plus dedication (or archetype once the
  // character has one), at pf2e.mjs:33341-33350. The secondary's ladder mirrors that with its own
  // trait, so each ladder browses to its own class's feats.
  const hasDedication = actor.itemTypes.feat.some((f) => f.traits.has("dedication"));
  const traits = [slug in CONFIG.PF2E.featTraits ? slug : null, hasDedication ? "archetype" : "dedication"]
    .filter((t) => !!t);

  // A section whose every slot is above the character's level renders as a header with nothing under
  // it. `FeatGroup` drops the out-of-range slots itself (pf2e.mjs:33233) but still creates the group,
  // so the emptiness has to be caught here. A level 1 Monk/Wizard hits this: Wizard's class feats
  // start at level 2.
  const inRange = (levels) => levels.filter((level) => level <= actor.level);

  const sections = [];
  if (inRange(secondarySlots.class).length > 0) {
    sections.push({
      id: `${SECTION_PREFIX.CLASS}-${slug}`,
      label: game.i18n.format("PF2EDC.Section.ClassFeats", { class: secondary.name }),
      supported: ["class"],
      filter: { traits },
      slots: secondarySlots.class
    });
  }

  // The ancestry, skill and general ladders come from `actor.class` alone, so a secondary class that
  // grants more of them than the primary would silently lose the difference. Only the extra levels
  // get a section: a Rogue secondary brings its odd-level skill feats, while two classes whose
  // ladders already match produce nothing at all rather than an empty header.
  const extras = [
    [SECTION_PREFIX.SKILL, "skill", "PF2EDC.Section.SkillFeats"],
    [SECTION_PREFIX.GENERAL, "general", "PF2EDC.Section.GeneralFeats"],
    [SECTION_PREFIX.ANCESTRY, "ancestry", "PF2EDC.Section.AncestryFeats"]
  ];

  for (const [prefix, key, label] of extras) {
    const beyond = secondarySlots[key].filter((level) => !primarySlots[key].includes(level));
    if (inRange(beyond).length === 0) continue;
    sections.push({
      id: `${prefix}-${slug}`,
      label: game.i18n.format(label, { class: secondary.name }),
      supported: [key],
      slots: beyond
    });
  }

  return sections;
}
