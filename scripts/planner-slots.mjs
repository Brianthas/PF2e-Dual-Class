import { SECTION_PREFIX } from "./constants.mjs";
import { moduleEnabled } from "./settings.mjs";
import { getSecondaryClass, isMultiClassActor, classSlug, notifyDualClass } from "./util.mjs";

/**
 * Move a second-class feat out of a planner's generic dual-class section and into this module's
 * ladder for that class.
 *
 * PF2e Leveler files the second class's feats into a campaign feat section named `xdy_dualclass`,
 * `dualclass` or `dual_class` if the world has one (its `apply-feats.js`, `getDualClassFeatGroupId`),
 * and into the primary's own `class` slots otherwise. This module's home for those feats is the
 * `dc-class-<slug>` ladder built in `ladders.mjs`, with the same `<section>-<level>` slot ids
 * `FeatGroup` gives every section. So a feat that lands at `xdy_dualclass-4` is re-filed to
 * `dc-class-wizard-4` as it arrives, and the ladder shows it where every other second-class feat is.
 *
 * Only when the ladder has that slot. The planner also writes level 1 for a class whose class feats
 * start at 2. A location no slot matches is shown under Bonus Feats whichever id it carries, since
 * `ladders.mjs` removes the generic section from a dual-class character's sheet, so the feat keeps
 * the planner's id rather than being given one of ours that means nothing either.
 *
 * The world still needs the generic section for this to work: without one the planner uses the
 * primary's `class-<level>` ids, and a second feat at the same location is indistinguishable from
 * a replacement.
 */
const PLANNER_SECTIONS = ["xdy_dualclass", "dualclass", "dual_class"];

export function registerPlannerSlots() {
  Hooks.on("createItem", (item, options, userId) => refile(item, userId));
  Hooks.on("updateItem", (item, changes, options, userId) => {
    if (changes?.system?.location === undefined) return;
    refile(item, userId);
  });
}

async function refile(item, userId) {
  if (game.user.id !== userId) return;
  if (!moduleEnabled() || item?.type !== "feat") return;
  const actor = item.parent;
  if (!isMultiClassActor(actor)) return;

  const location = item.system.location;
  if (typeof location !== "string") return;
  const section = PLANNER_SECTIONS.find((id) => location.startsWith(`${id}-`));
  if (!section) return;

  const level = Number(location.slice(section.length + 1));
  if (!Number.isInteger(level)) return;

  // The planner knows one dual class, so its section always means the first extra.
  const secondary = getSecondaryClass(actor);
  if (!secondary) return;
  if (!(secondary.grantedFeatSlots?.class ?? []).includes(level)) return;

  const target = `${SECTION_PREFIX.CLASS}-${classSlug(secondary)}-${level}`;
  await item.update({ "system.location": target });
  notifyDualClass("info", game.i18n.format("PF2EDC.PlannerSlots.Refiled", {
    feat: item.name,
    class: secondary.name,
    level
  }));
}
