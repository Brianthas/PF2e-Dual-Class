import { moduleEnabled } from "./settings.mjs";
import { getAllClasses, isMultiClassActor } from "./util.mjs";

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
 * ## Counting points rather than skills
 *
 * The panel used to show at 1st level and then go away, because a count of *trained skills* stops
 * being an identity the moment skill increases exist: an increase can train something new or raise
 * something already trained, and nothing records which.
 *
 * Counting points removes that ambiguity. A rank is worth its own number - trained 1, expert 2,
 * master 3, legendary 4, which is exactly PF2e's stored rank - and every source is worth one point,
 * whether it trains a new skill or raises an existing one. So both spendings of an increase cost the
 * same and the identity holds at any level:
 *
 *     sum of ranks = initially trained skills + skill increases so far
 *
 * What the identity does not cover is a feat or feature that grants a rank outright. At 1st level
 * that set was surveyed and closed; past it the shapes widen, so an unrecognised grant reads as
 * being over budget. The panel is therefore written to make the *under* case the useful one -
 * unspent increases are invisible on the sheet otherwise - and to phrase the over case as something
 * unaccounted for rather than as a rules error.
 *
 * ## Rank caps
 *
 * Separately, and exactly: a rank above what the character's level allows is reported. Expert comes
 * from the first level the character gains a skill increase, master at 7th, legendary at 15th. Only
 * the expert gate moves by class, and it is read from the class's own `skillIncreaseLevels`.
 */

const PANEL_CLASS = "pf2edc-skill-count";

/**
 * The levels at which a skill increase may raise a skill to master and to legendary.
 *
 * General to every class, including the two whose increases start at 2nd: the Rogue's own entry
 * defers to them unchanged ("At 7th level, you can use skill increases to become a master in a skill
 * in which you're already an expert, and at 15th level ... legendary"). Expert is the only gate that
 * moves, and it is read from the class's own increase levels rather than hard-coded.
 */
const MASTER_LEVEL = 7;
const LEGENDARY_LEVEL = 15;

export function registerSkillCounter() {
  Hooks.on("renderActorSheetPF2e", onRender);
  Hooks.on("renderCharacterSheetPF2e", onRender);
}

function onRender(sheet, element) {
  const actor = sheet?.actor;
  if (!moduleEnabled() || actor?.type !== "character") return;
  if (!isMultiClassActor(actor)) return;

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
  // The flag can be nested - Clan Lore writes `rulesSelections.clan.skillOne` - so everything after
  // `rulesSelections.` is captured and walked rather than treated as a single key.
  const selectionFlag = /rulesSelections\.([A-Za-z0-9_.]+)\}?$/;

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
        let value = flag ? item.flags?.pf2e?.rulesSelections : null;
        for (const part of flag?.[1].split(".") ?? []) value = value?.[part];
        slug = typeof value === "string" ? value : null;
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
  const classes = getAllClasses(actor);

  // Each class trains its own list, and they are unioned rather than added: a skill two classes both
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

  // The points model. A rank is worth its own number - trained 1, expert 2, master 3, legendary 4 -
  // which is exactly PF2e's stored rank, so the total spent is the sum of the ranks. Every source
  // contributes one point: an initially trained skill is one, and a skill increase is one whether it
  // trains something new or raises something already trained. So the budget is a count of sources
  // and the spend is a sum of ranks, and the two are directly comparable at any level.
  const spent = coreSkills.reduce((sum, key) => sum + (actor.system.skills[key]?.rank ?? 0), 0);

  // Skill increases are on the once-per-level list, so two classes do not grant two at the same
  // level: the levels are unioned across classes, the same as the feat ladders. Rogue and
  // Investigator are the only classes on every level from 2nd; the other 27 are on odd levels from
  // 3rd.
  const increaseLevels = [...new Set(classes.flatMap((c) => c.system.skillIncreaseLevels?.value ?? []))]
    .sort((a, b) => a - b);
  const increases = increaseLevels.filter((level) => level <= actor.level).length;

  const budget = expected + increases;

  return {
    automatic: [...automatic],
    background: [...background],
    granted: [...granted],
    additional,
    intMod,
    free,
    expected,
    actual,
    spent,
    increases,
    budget,
    unspent: budget - spent,
    caps: capViolations(actor, coreSkills, increaseLevels),
    coreCount: coreSkills.length,
    everySkillGranted: coreSkills.length > 0 && coreSkills.every((key) => named.has(key)),
    classes: classes.map((c) => c.name)
  };
}

/**
 * Ranks the character is not high enough level to have.
 *
 * Three gates, and only the first depends on the class. A skill increase raises a skill to expert
 * from the first level the character gets one, which the Rogue's own entry puts at 2nd - "You can
 * use this increase to either become trained in one skill you're untrained in or become an expert
 * in one skill in which you're already trained" - against 3rd for the 27 classes whose increases
 * start there. Master and legendary are general: the same Rogue entry defers to 7th and 15th.
 *
 * A multi-class character uses the union of its classes' increase levels, so a Fighter/Rogue can be
 * an expert at 2nd for the same reason it gets the Rogue's skill feat ladder.
 *
 * Reported rather than blocked. A rank above the cap is usually a hand-built character rather than
 * a rules error, and something on the sheet may have granted it outright.
 *
 * @param {ActorPF2e} actor
 * @param {string[]} coreSkills
 * @param {number[]} increaseLevels
 * @returns {{skill: string, rank: number, needs: number}[]}
 */
function capViolations(actor, coreSkills, increaseLevels) {
  const expertFrom = increaseLevels.length ? increaseLevels[0] : Infinity;
  const needed = { 2: expertFrom, 3: MASTER_LEVEL, 4: LEGENDARY_LEVEL };

  const found = [];
  for (const key of coreSkills) {
    const rank = actor.system.skills[key]?.rank ?? 0;
    const needs = needed[rank];
    if (needs !== undefined && actor.level < needs) found.push({ skill: key, rank, needs });
  }
  return found;
}

/**
 * The panel, styled from the sheet's own variables so it reads as part of the tab.
 *
 * `--color-pf-primary` is the dark red the proficiency headers already use and
 * `--color-proficiency-trained` is the blue the sheet uses for a trained rank, so a right answer and
 * a wrong one are coloured the way the rest of the sheet colours those two ideas.
 */
function buildPanel(tally) {
  // Over budget is the only state worth colouring as wrong. Unspent points are the normal condition
  // between level-ups, and a cap breach is reported on its own line rather than by turning the whole
  // panel red, since something may have granted the rank outright.
  const wrong = !tally.everySkillGranted && tally.unspent < 0;

  const wrapper = document.createElement("div");
  wrapper.className = PANEL_CLASS;
  wrapper.dataset.state = wrong ? "wrong" : "ok";

  const heading = document.createElement("header");
  heading.textContent = game.i18n.localize("PF2EDC.Skills.Header");
  wrapper.append(heading);

  const line = document.createElement("div");
  line.className = "pf2edc-skill-count-line";
  if (tally.everySkillGranted) {
    line.innerHTML = game.i18n.format("PF2EDC.Skills.AllTrained", {
      actual: `<strong class="pf2edc-count">${tally.actual}</strong>`,
      total: tally.coreCount
    });
    wrapper.append(line);

    const why = document.createElement("div");
    why.className = "pf2edc-skill-count-detail";
    why.textContent = game.i18n.localize("PF2EDC.Skills.AllTrainedWhy");
    wrapper.append(why);
    return wrapper;
  }

  line.innerHTML = game.i18n.format("PF2EDC.Skills.Points", {
    spent: `<strong class="pf2edc-count">${tally.spent}</strong>`,
    budget: `<strong>${tally.budget}</strong>`
  });
  wrapper.append(line);

  // The line a player actually acts on. Unspent increases are invisible on the sheet otherwise:
  // nothing marks a skill increase as owed, so they are simply forgotten at level-up.
  if (tally.unspent !== 0) {
    const balance = document.createElement("div");
    balance.className = "pf2edc-skill-count-line";
    balance.textContent = tally.unspent > 0
      ? game.i18n.format("PF2EDC.Skills.Unspent", { count: tally.unspent })
      : game.i18n.format("PF2EDC.Skills.Over", { count: -tally.unspent });
    wrapper.append(balance);
  }

  if (tally.caps.length) {
    const caps = document.createElement("div");
    caps.className = "pf2edc-skill-count-line";
    caps.dataset.state = "wrong";
    caps.textContent = game.i18n.format("PF2EDC.Skills.OverCap", {
      skills: tally.caps
        .map((c) => `${skillLabel(c.skill)} (${rankLabel(c.rank)}, needs level ${c.needs})`)
        .join(", ")
    });
    wrapper.append(caps);
  }

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
  parts.push(game.i18n.format("PF2EDC.Skills.Increases", { count: tally.increases }));

  const detail = document.createElement("div");
  detail.className = "pf2edc-skill-count-detail";
  detail.textContent = parts.join(" · ");
  wrapper.append(detail);

  const note = document.createElement("div");
  note.className = "pf2edc-skill-count-detail";
  note.textContent = game.i18n.localize("PF2EDC.Skills.HowCounted");
  wrapper.append(note);

  return wrapper;
}

/** A proficiency rank as the sheet names it. */
function rankLabel(rank) {
  const label = CONFIG.PF2E.proficiencyLevels?.[rank];
  return label ? game.i18n.localize(label) : String(rank);
}

function skillLabel(slug) {
  const label = CONFIG.PF2E.skills?.[slug]?.label;
  return label ? game.i18n.localize(label) : slug;
}
