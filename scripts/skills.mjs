import { moduleEnabled } from "./settings.mjs";
import { getPrimaryClass, getSecondaryClass, isDualClassActor } from "./util.mjs";

/**
 * How many trained skills a dual-class character should start with.
 *
 * With one class this is easy enough to do in your head. With two it is not: the rule is to apply
 * the skills automatically granted by *each* class and then the *larger* of the two additional
 * counts, which is neither the sum nor the higher class's total. Taking both counts is the obvious
 * mistake and nothing on the sheet would show it.
 *
 * PF2e does not compute this for anyone - `trainedSkills.additional` is stored on the class item and
 * read by nothing on the actor, so single-class characters have always been counted by hand too.
 *
 * ## Level 1 only, and that is what makes it exact
 *
 * The panel shows at level 1 and then goes away. That is not a simplification, it is what makes the
 * number trustworthy. At 1st level every trained skill traces to a build source, so the count is an
 * identity rather than an estimate:
 *
 *     automatic + background + granted + (larger additional + Int) = skills at trained or better
 *
 * From 3rd level, skill increases can be spent either raising a trained skill or training an
 * untrained one, and nothing records which was done. Any count from then on is a guess dressed as a
 * check, and a panel that cries wolf on a legitimate build is worse than no panel. Level 1 is also
 * exactly when the dual-class arithmetic is being done for the first time and is easy to get wrong.
 */

const PANEL_CLASS = "pf2edc-skill-count";

export function registerSkillCounter() {
  Hooks.on("renderActorSheetPF2e", onRender);
  Hooks.on("renderCharacterSheetPF2e", onRender);
}

function onRender(sheet, element) {
  const actor = sheet?.actor;
  if (!moduleEnabled() || actor?.type !== "character") return;
  if (!isDualClassActor(actor) || actor.level !== 1) return;

  const root = element instanceof HTMLElement ? element : element?.[0];
  const section = root?.querySelector('section[data-tab="proficiencies"], .tab[data-tab="proficiencies"]');
  if (!section || section.querySelector(`.${PANEL_CLASS}`)) return;

  section.prepend(buildPanel(tallyTrainedSkills(actor)));
}

/**
 * Skills trained by a rule element on something the character has.
 *
 * Heritages and ancestry feats train skills this way rather than through a field: Kanchil carries
 * `ActiveEffectLike` `upgrade` on `system.skills.deception.rank`, and ancestry feats like Hobgoblin
 * Lore and Silent Stone do the same. Checked across the compendia: no ancestry item and no ancestry
 * feature trains a skill directly, so this scan is the only way to see them.
 *
 * These are granted rather than chosen, so they count toward the expected total without spending one
 * of the character's picks.
 *
 * @param {ActorPF2e} actor
 * @returns {Set<string>}
 */
function grantedByRules(actor) {
  const core = CONFIG.PF2E.skills ?? {};
  const granted = new Set();
  const skillPath = /^system\.skills\.(.+)\.rank$/;
  const selectionFlag = /rulesSelections\.([A-Za-z0-9_]+)\}?$/;

  for (const item of actor.items) {
    for (const rule of item.system?.rules ?? []) {
      if (rule.key !== "ActiveEffectLike" || typeof rule.path !== "string") continue;
      const match = skillPath.exec(rule.path);
      if (!match) continue;

      let slug = match[1];

      // Two shapes, and only checking for the first would miss most of them. A heritage like
      // Kanchil names the skill outright. The ones that let the player choose - Skilled Human, the
      // Natural Skill ancestry feat - write a placeholder resolved from the item's own ChoiceSet
      // answer, `system.skills.{item|flags.system.rulesSelections.skill}.rank`. The answer itself is
      // stored under the item's `pf2e` flags, so the flag name is taken from the placeholder and
      // looked up there rather than the path being resolved by hand.
      if (slug.startsWith("{")) {
        const flag = selectionFlag.exec(slug);
        slug = flag ? item.flags?.pf2e?.rulesSelections?.[flag[1]] : null;
      }

      // An unanswered choice resolves to nothing, and the skill it would have trained is untrained
      // for the same reason, so skipping it keeps both sides of the count consistent.
      // Lore rules name a lore slug rather than a core skill, and lores are not counted here.
      if (typeof slug === "string" && slug in core) granted.add(slug);
    }
  }
  return granted;
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

  const background = new Set(actor.background?.system.trainedSkills.value ?? []);
  const granted = grantedByRules(actor);

  // A skill trained by more than one source is still one trained skill, so the fixed part of the
  // expected total is the size of the union rather than the sum of the parts.
  const named = new Set([...automatic, ...background, ...granted]);
  const expected = named.size + free;

  const coreSkills = Object.keys(CONFIG.PF2E.skills ?? {});
  const actual = coreSkills.filter((key) => (actor.system.skills[key]?.rank ?? 0) >= 1).length;

  return {
    automatic: [...automatic],
    background: [...background],
    granted: [...granted],
    additional,
    intMod,
    free,
    expected,
    actual,
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
function buildPanel(tally) {
  const wrong = tally.actual !== tally.expected;

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
      skills: tally.automatic.map(skillLabel).join(", ")
    }));
  }
  if (tally.background.length) {
    parts.push(game.i18n.format("PF2EDC.Skills.FromBackground", {
      skills: tally.background.map(skillLabel).join(", ")
    }));
  }
  if (tally.granted.length) {
    parts.push(game.i18n.format("PF2EDC.Skills.Granted", {
      skills: tally.granted.map(skillLabel).join(", ")
    }));
  }
  parts.push(game.i18n.format("PF2EDC.Skills.FreePicks", {
    free: tally.free,
    additional: tally.additional,
    int: tally.intMod >= 0 ? `+${tally.intMod}` : String(tally.intMod)
  }));

  const detail = document.createElement("div");
  detail.className = "pf2edc-skill-count-detail";
  detail.textContent = parts.join(" · ");
  wrapper.append(detail);

  const note = document.createElement("div");
  note.className = "pf2edc-skill-count-detail";
  note.textContent = game.i18n.localize("PF2EDC.Skills.LevelOneOnly");
  wrapper.append(note);

  return wrapper;
}

function skillLabel(slug) {
  const label = CONFIG.PF2E.skills?.[slug]?.label;
  return label ? game.i18n.localize(label) : slug;
}
