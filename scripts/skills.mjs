import { moduleEnabled } from "./settings.mjs";
import { getPrimaryClass, getSecondaryClass, isDualClassActor } from "./util.mjs";

/**
 * How many trained skills the character should have.
 *
 * With one class this is easy enough to do in your head. With two it is not: the rule is to apply
 * the skills automatically granted by *each* class and then the *larger* of the two additional
 * counts, which is neither the sum nor the higher class's total. Getting it wrong by taking both
 * additional counts is the obvious mistake and nothing on the sheet would show it.
 *
 * PF2e does not compute this for anyone. `trainedSkills.additional` is stored on the class item and
 * shown on that item's own sheet, but nothing on the character actor reads it - single-class
 * characters have always been counted by hand too. So this panel is new information rather than a
 * correction of something the system got wrong.
 *
 * ## What it can and cannot know
 *
 * Countable from the actor's own data: the skills each class trains automatically, the larger
 * additional count, the Intelligence modifier, and the background's trained skill. Ancestries carry
 * no `trainedSkills` field at all (checked against Goblin, whose `system` has no skill key), so an
 * ancestry that trains a skill does it through a granted feat and is not separable here.
 *
 * The other unknown is skill increases. From level 3 they can be spent either raising a trained
 * skill or training an untrained one, and nothing records which was done. So a count above the
 * expected total is not necessarily wrong, and the panel only calls it wrong once it exceeds what
 * every increase so far could account for.
 */

const PANEL_CLASS = "pf2edc-skill-count";

export function registerSkillCounter() {
  Hooks.on("renderActorSheetPF2e", onRender);
  Hooks.on("renderCharacterSheetPF2e", onRender);
}

function onRender(sheet, element) {
  const actor = sheet?.actor;
  if (!moduleEnabled() || actor?.type !== "character") return;
  if (!isDualClassActor(actor)) return;

  const root = element instanceof HTMLElement ? element : element?.[0];
  const section = root?.querySelector('section[data-tab="proficiencies"], .tab[data-tab="proficiencies"]');
  if (!section || section.querySelector(`.${PANEL_CLASS}`)) return;

  section.prepend(buildPanel(actor, tallyTrainedSkills(actor)));
}

/**
 * Work out the expected and actual trained skill counts.
 * @param {ActorPF2e} actor
 */
export function tallyTrainedSkills(actor) {
  const primary = getPrimaryClass(actor);
  const secondary = getSecondaryClass(actor);
  const classes = [primary, secondary].filter((c) => !!c);

  // Each class trains its own list, and the two are unioned rather than added: a skill both classes
  // train is one trained skill, not two.
  const automatic = new Set();
  for (const classItem of classes) {
    for (const skill of classItem.system.trainedSkills.value) automatic.add(skill);
  }

  // "Apply the larger number of additional skills" - the larger, never the sum.
  const additional = Math.max(...classes.map((c) => c.system.trainedSkills.additional), 0);
  const intMod = actor.system.abilities.int.mod;
  const free = Math.max(0, additional + intMod);

  const background = actor.background?.system.trainedSkills.value ?? [];
  const backgroundSkills = new Set(background);

  // A background skill a class also trains is not an extra trained skill, so the expected total is
  // the size of the union rather than the sum of the parts.
  const named = new Set([...automatic, ...backgroundSkills]);
  const expected = named.size + free;

  const coreSkills = Object.keys(CONFIG.PF2E.skills ?? {});
  const trained = coreSkills.filter((key) => (actor.system.skills[key]?.rank ?? 0) >= 1);

  // Skill increases can be spent training something new, so anything up to this many above the
  // expected total is legitimate and not flagged.
  const increaseLevels = new Set();
  for (const classItem of classes) {
    for (const level of classItem.system.skillIncreaseLevels.value) {
      if (level <= actor.level) increaseLevels.add(level);
    }
  }

  return {
    automatic: [...automatic],
    backgroundSkills: [...backgroundSkills],
    additional,
    intMod,
    free,
    expected,
    actual: trained.length,
    increases: increaseLevels.size,
    classes: classes.map((c) => c.name)
  };
}

/**
 * The panel, styled from the sheet's own variables so it reads as part of the tab.
 *
 * `--color-pf-primary` is the dark red the proficiency headers already use and
 * `--color-proficiency-trained` is the blue the sheet uses for a trained rank, so a right answer and
 * a wrong one are coloured the way the rest of the sheet colours those two ideas.
 */
function buildPanel(actor, tally) {
  const short = tally.actual < tally.expected;
  const over = tally.actual > tally.expected + tally.increases;
  const wrong = short || over;

  const wrapper = document.createElement("div");
  wrapper.className = PANEL_CLASS;
  wrapper.dataset.state = wrong ? "wrong" : "ok";

  const heading = document.createElement("header");
  heading.textContent = game.i18n.localize("PF2EDC.Skills.Header");
  wrapper.append(heading);

  const line = document.createElement("div");
  line.className = "pf2edc-skill-count-line";
  line.innerHTML = game.i18n.format("PF2EDC.Skills.Count", {
    actual: `<strong class="pf2edc-count">${tally.actual}</strong>`,
    expected: `<strong>${tally.expected}</strong>`
  });
  wrapper.append(line);

  const parts = [];
  if (tally.automatic.length) {
    parts.push(game.i18n.format("PF2EDC.Skills.FromClasses", {
      classes: tally.classes.join(" / "),
      skills: tally.automatic.map((s) => skillLabel(s)).join(", ")
    }));
  }
  parts.push(game.i18n.format("PF2EDC.Skills.FreePicks", {
    free: tally.free,
    additional: tally.additional,
    int: tally.intMod >= 0 ? `+${tally.intMod}` : String(tally.intMod)
  }));
  if (tally.backgroundSkills.length) {
    parts.push(game.i18n.format("PF2EDC.Skills.FromBackground", {
      skills: tally.backgroundSkills.map((s) => skillLabel(s)).join(", ")
    }));
  }
  if (tally.increases > 0) {
    parts.push(game.i18n.format("PF2EDC.Skills.Increases", { count: tally.increases }));
  }

  const detail = document.createElement("div");
  detail.className = "pf2edc-skill-count-detail";
  detail.textContent = parts.join(" · ");
  wrapper.append(detail);

  return wrapper;
}

function skillLabel(slug) {
  const label = CONFIG.PF2E.skills?.[slug]?.label;
  return label ? game.i18n.localize(label) : slug;
}
