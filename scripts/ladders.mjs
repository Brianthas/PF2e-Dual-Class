import { MODULE_ID, SECTION_PREFIX, SECTION_ROOT, PARAGON_SECTION, PARAGON_LEVELS } from "./constants.mjs";
import { ancestryParagonEnabled } from "./settings.mjs";
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
      if (!Array.isArray(sections)) return wrapped(...args);

      const extra = buildSections(this);
      const paragon = paragonApplies(this);
      if (extra.length === 0 && !paragon) return wrapped(...args);

      // Another package's ladder for the same slots is stood down only where this module is
      // supplying them itself: a generic class ladder when this character has one per class, and an
      // Ancestry Paragon section when the setting here is on.
      const stoodDown = [
        ...(extra.length ? removeGenericClassSections(sections) : []),
        ...(paragon ? removeSectionsFor(sections, ["ancestry"]) : [])
      ];
      sections.push(...extra);
      try {
        const result = withParagonLadder(this, () => wrapped(...args));
        reorderGroups(this.feats);
        labelParagonGroup(this.feats, this);
        return result;
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
 * Put each added section directly beneath the group it doubles.
 *
 * Sections from `campaign.feats.sections` are created after every built-in group, so the second
 * class's feats would sit below Skill, General and any campaign sections - a long way from the class
 * feats they belong beside. `CharacterFeats` is a Collection, which is a Map and so keeps insertion
 * order, and the sheet renders the groups in that order. Rebuilding the map in the order wanted is
 * therefore the whole of the fix.
 *
 * Done after the wrapped call, so it is purely presentational: `assignToSlots` has already run and
 * does not care what order the groups are in.
 *
 * @param {Collection} feats The actor's prepared feat groups.
 */
function reorderGroups(feats) {
  const entries = [...feats.entries()];
  const isOurs = (id) => id.startsWith(SECTION_ROOT);
  if (!entries.some(([id]) => isOurs(id))) return;

  // Which of this module's sections belong under which built-in group. Ancestry Paragon is not here:
  // its slots go into PF2e's own ancestry group rather than a section of their own.
  const follows = {
    class: [SECTION_PREFIX.CLASS],
    skill: [SECTION_PREFIX.SKILL],
    general: [SECTION_PREFIX.GENERAL],
    ancestry: [SECTION_PREFIX.ANCESTRY]
  };

  const sameSupport = (a, b) => Array.isArray(a) && Array.isArray(b)
    && a.length === b.length && a.every((v) => b.includes(v));

  const ordered = [];
  const taken = new Set();
  for (const [id, group] of entries) {
    if (isOurs(id) || taken.has(id)) continue;
    ordered.push([id, group]);
    taken.add(id);

    const prefixes = follows[id];
    if (!prefixes) continue;

    for (const prefix of prefixes) {
      for (const entry of entries) {
        const matches = entry[0] === prefix || entry[0].startsWith(`${prefix}-`);
        if (matches && !taken.has(entry[0])) {
          ordered.push(entry);
          taken.add(entry[0]);
        }
      }
    }

    // Another module's section that feeds the same kind of feat belongs with that kind, not at the
    // bottom of the tab. An Ancestry Paragon section is the case in point: it accepts ancestry
    // feats, so it reads as a continuation of the Ancestry Feats group rather than as something
    // unrelated sitting below the class feats.
    //
    // Matched on the categories a section accepts rather than on its id, so it works for whichever
    // module supplies it. Only groups from campaign sections can match - PF2e's own groups all
    // accept different categories from one another.
    for (const entry of entries) {
      if (taken.has(entry[0]) || isOurs(entry[0])) continue;
      if (!sameSupport(entry[1].supported, group.supported)) continue;
      ordered.push(entry);
      taken.add(entry[0]);
    }
  }

  // Anything not placed above is appended rather than dropped. This covers our own sections whose
  // counterpart group is absent, and is a backstop for every other group too: the collection is
  // rebuilt from this list, so a group missing from it disappears from the sheet rather than merely
  // sitting in the wrong place. Reordering must never lose a group.
  for (const entry of entries) {
    if (!taken.has(entry[0])) ordered.push(entry);
  }

  if (ordered.length !== entries.length) {
    console.error(`${MODULE_ID} | feat group reorder changed the group count `
      + `(${entries.length} -> ${ordered.length}); leaving the original order alone.`);
    return;
  }

  feats.clear();
  for (const [id, group] of ordered) feats.set(id, group);
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
 * mirrors the shape of the duplicate check another module of the author's already uses.
 *
 * Sections are put back in the `finally`, so this changes nothing for single-class actors and
 * nothing is written to the stored setting.
 *
 * @param {object[]} sections The live world-global section array.
 * @returns {object[]} The removed sections, to be restored by the caller.
 */
function removeGenericClassSections(sections) {
  return removeSectionsFor(sections, ["class"]);
}

/**
 * Take out every section that simply grants slots of one category, for the duration of this prepare.
 *
 * Used for two cases. A generic second ladder of class feats, when this module is already giving the
 * character a ladder per class - otherwise the same slots are offered twice. And an Ancestry Paragon
 * section from another package, when this module's own Ancestry Paragon setting is on: the extra
 * slots then live in PF2e's ancestry group, so a separate section beside it would double them.
 *
 * Matched on the categories a section accepts rather than on an id, so it holds for whichever
 * package supplies it. Sections are put back by the caller's `finally`, so nothing is written to the
 * stored setting and characters this module leaves alone are unaffected.
 *
 * @param {object[]} sections The live world-global section array.
 * @param {string[]} supported The exact category list to match.
 * @returns {object[]} The removed sections, for the caller to restore.
 */
function removeSectionsFor(sections, supported) {
  const removed = [];
  for (let i = sections.length - 1; i >= 0; i -= 1) {
    const s = sections[i]?.supported;
    if (Array.isArray(s) && s.length === supported.length && s.every((v) => supported.includes(v))) {
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
  return buildDualClassSections(actor);
}

/**
 * Run `fn` with the character's ancestry ladder extended by Ancestry Paragon.
 *
 * `CharacterFeats` reads `actor.class.grantedFeatSlots` while it builds the groups, so the ladder has
 * to be different at that moment. Rather than patch the getter globally, this defines an own
 * property on the one class item for the duration of the call and deletes it afterwards, which puts
 * the change exactly where it is needed and leaves nothing behind if `fn` throws.
 *
 * @param {ActorPF2e} actor
 * @param {Function} fn
 */
function withParagonLadder(actor, fn) {
  if (!paragonApplies(actor)) return fn();

  const classItem = actor.class;
  const original = classItem.grantedFeatSlots;
  Object.defineProperty(classItem, "grantedFeatSlots", {
    value: { ...original, ancestry: paragonSlots(original.ancestry) },
    configurable: true
  });
  try {
    return fn();
  } finally {
    delete classItem.grantedFeatSlots;
  }
}

/**
 * Say so in the heading when the ancestry ladder is a paragon one.
 *
 * The extra slots sit in PF2e's own Ancestry Feats group, which is the point - they are ancestry
 * feats and belong with the others. Without a note in the heading there would be nothing on the tab
 * explaining why that group is twice the length it is on a character without the variant.
 *
 * @param {Collection} feats
 * @param {ActorPF2e} actor
 */
function labelParagonGroup(feats, actor) {
  if (!paragonApplies(actor)) return;
  const group = feats.get("ancestry");
  if (group) group.label = game.i18n.localize("PF2EDC.Section.AncestryParagon");
}

/**
 * Whether Ancestry Paragon should extend this character's ancestry ladder.
 *
 * Needs a class item, because the ladder being extended is the class's.
 *
 * @param {ActorPF2e} actor
 */
function paragonApplies(actor) {
  return ancestryParagonEnabled() && actor?.type === "character" && !!actor.class;
}

/**
 * The ancestry ladder with Ancestry Paragon's extra levels folded in.
 *
 * The variant gives two ancestry feats at 1st level and one at every odd level thereafter, eleven in
 * total. Five of those are the class's own ladder, so `PARAGON_LEVELS` are the six added on top -
 * including a second slot at level 1.
 *
 * That duplicate is why the slots are built as objects rather than plain numbers. `FeatGroup` turns
 * a number into `{ id: "<group>-<level>" }` and files it under `this.slots[id]` (pf2e.mjs:33517),
 * so two slots at level 1 would collide on `ancestry-1` and share one entry. Passing an object lets
 * the second carry its own id, which keeps both in the group PF2e already renders instead of
 * needing a separate one.
 *
 * @param {number[]} base The class's own ancestry feat levels.
 * @returns {object[]} Slot definitions, ordered by level.
 */
function paragonSlots(base) {
  const seen = new Set();
  const slots = [];
  for (const level of [...base, ...PARAGON_LEVELS].sort((a, b) => a - b)) {
    const duplicate = seen.has(level);
    seen.add(level);
    slots.push({
      id: duplicate ? `${PARAGON_SECTION}-${level}` : `ancestry-${level}`,
      level,
      label: String(level)
    });
  }
  return slots;
}

/**
 * The per-class sections for one dual-class actor.
 * @param {ActorPF2e} actor
 * @returns {object[]}
 */
function buildDualClassSections(actor) {
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
