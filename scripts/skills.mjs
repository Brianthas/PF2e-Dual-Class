import { skillCounterEnabled } from "./settings.mjs";
import { getAllClasses } from "./util.mjs";

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
  if (!skillCounterEnabled() || actor?.type !== "character") return;

  // A character with no class has no budget to count against, which is the only thing that stops
  // this rendering. Neither the module's own dual-class toggle nor a second class is required.
  if (countedClasses(actor).length === 0) return;

  const root = element instanceof HTMLElement ? element : element?.[0];
  const section = root?.querySelector('section[data-tab="proficiencies"], .tab[data-tab="proficiencies"]');
  if (!section || section.querySelector(`.${PANEL_CLASS}`)) return;

  section.prepend(buildPanel(tallyTrainedSkills(actor)));
}

/**
 * The classes whose budgets this panel adds up.
 *
 * Every class when the module is running dual class for this character, and the single class
 * otherwise. `getAllClasses` returns nothing for a character the module is not managing - including
 * every character when Dual Class is switched off - and the panel has to work in exactly that case,
 * so the fallback is what makes it independent rather than an edge case.
 *
 * @param {ActorPF2e} actor
 * @returns {ItemPF2e[]}
 */
function countedClasses(actor) {
  const all = getAllClasses(actor);
  if (all.length > 0) return all;
  return actor?.class ? [actor.class] : [];
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
  const granted = [];
  /** The prepared rule instances, which can resolve a value expression; the stored rules cannot. */
  const preparedRules = (item) => {
    const live = Array.isArray(item.rules) && item.rules.length ? item.rules : null;
    return live ?? item.system?.rules ?? [];
  };
  /**
   * The rank a rule confers, as a number.
   *
   * Surveyed across 14880 compendium items: of 479 rules writing a skill rank, 401 are a flat 1 and
   * 78 confer 2, 3 or 4, thirteen of those through a level expression such as Skilled Human's
   * `ternary(gte(@actor.level,5),2,1)`. Reading `value` raw counts that as one rank at every level.
   */
  const conferredRank = (rule) => {
    const raw = rule.value;
    if (typeof raw === "number") return raw;
    try {
      const resolved = Number(rule.resolveValue?.(raw));
      if (Number.isFinite(resolved)) return resolved;
    } catch {
      // An expression that cannot resolve on this actor grants nothing readable; fall through.
    }
    const flat = Number(raw);
    return Number.isFinite(flat) ? flat : 1;
  };
  const skillPath = /^system\.skills\.(.+)\.rank$/;
  // The flag can be nested - Clan Lore writes `rulesSelections.clan.skillOne` - so everything after
  // `rulesSelections.` is captured and walked rather than treated as a single key.
  const selectionFlag = /rulesSelections\.([A-Za-z0-9_.]+)\}?$/;
  // A path that is nothing but a placeholder, which resolves to a whole path rather than a slug.
  const wholePathFlag = /^\{item\|flags\.[A-Za-z0-9_.]*rulesSelections\.([A-Za-z0-9_.]+)\}$/;

  /** Follow `a.b.c` through the item's own ChoiceSet answers. */
  const resolveFlag = (item, dotted) => {
    let value = item.flags?.pf2e?.rulesSelections;
    for (const part of dotted.split(".")) value = value?.[part];
    return typeof value === "string" ? value : null;
  };

  for (const item of actor.items) {
    for (const rule of preparedRules(item)) {
      if (rule.key !== "ActiveEffectLike" || typeof rule.path !== "string") continue;

      // Three shapes, and each of the first two alone would miss most of them.
      //
      //   system.skills.deception.rank                                  named outright
      //   system.skills.{item|flags...rulesSelections.skill}.rank       skill chosen, path fixed
      //   {item|flags...rulesSelections.rogueDedication}                whole path chosen
      //
      // The third is the one that hid: Rogue Dedication's rule is nothing but a placeholder, which
      // resolves to a complete path like `system.skills.stealth.rank`. Matching on the path shape
      // never saw it, so a dedication that trained a skill did not move the budget and a legitimate
      // character read as over budget. Dedications are the common case for this, not an oddity.
      let path = rule.path;
      if (path.startsWith("{")) {
        const flag = wholePathFlag.exec(path);
        const resolved = flag ? resolveFlag(item, flag[1]) : null;
        if (!resolved) continue;
        path = resolved;
      }

      const match = skillPath.exec(path);
      if (!match) continue;

      let slug = match[1];
      if (slug.startsWith("{")) {
        const flag = selectionFlag.exec(slug);
        slug = flag ? resolveFlag(item, flag[1]) : null;
      }

      // An unanswered choice resolves to nothing, and the skill it would have trained is untrained
      // for the same reason, so skipping it keeps both sides of the count consistent.
      // Lore rules name a lore slug rather than a core skill, and lores are not counted here.
      if (typeof slug !== "string" || !(slug in core)) continue;

      // One record per rule, not per skill. A rule that raises a rank the character already has is
      // worth a point exactly like one that trains a new skill: Skill Mastery's expert step costs
      // the same as a heritage's "become trained", and counting distinct skills loses it entirely.
      granted.push({ skill: slug, source: item.name, rank: Math.max(1, conferredRank(rule)) });
    }
  }
  return granted;
}

/**
 * Add up what the build hands the character for free, in rank-points.
 *
 * A source is worth the ranks it actually confers, not one point flat. Most confer one - 401 of the
 * 479 skill-rank rules in the compendia are a flat 1 - but Skilled Human confers 2 from 5th level,
 * the scaling dedications confer 3 at 7th and 4 at 15th, and Skill Mastery's two rules confer 2 and
 * 3. Counting each as a single point charged the character increases for ranks a feat had given
 * them.
 *
 * `upgrade` is what these rules use, meaning "at least this rank", so two rules on one skill are not
 * additive: the higher one subsumes the lower. The fold therefore pays for each skill's steps once,
 * which is why it sorts ascending and is independent of the order the items happen to sit in.
 *
 * The exception is a duplicate *training*, which is not wasted. Player Core: "Each time after the
 * first that you'd become trained in a given skill, you instead allocate the trained proficiency to
 * any other skill of your choice." So it still buys a rank, just somewhere else. That is what makes
 * two classes sharing a trained skill worth two points, which is the whole reason a dual-class
 * character needs this panel.
 *
 * @param {{skill: string, rank: number}[]} grants
 * @returns {{points: number, redirected: number, perSkill: Map<string, number>}}
 */
export function foldGrants(grants) {
  const perSkill = new Map();
  let points = 0;
  let redirected = 0;

  for (const grant of [...grants].sort((a, b) => a.rank - b.rank)) {
    const held = perSkill.get(grant.skill) ?? 0;
    if (held === 0) {
      // Nothing else grants this skill, so the source is paying for every rank of it. Skilled Human
      // at 5th level is the case that matters: it confers expert on a skill the character has no
      // other claim to, and both ranks are free.
      points += grant.rank;
      perSkill.set(grant.skill, grant.rank);
    } else if (grant.rank > held) {
      // Something already grants this skill, so this source is worth the one step it adds and no
      // more. These feats carry a prerequisite of the rank below - a feat granting master requires
      // expert - which the character reached by spending increases already counted in the budget.
      // Crediting the whole gap would pay for those ranks twice and invent unspent increases.
      points += 1;
      perSkill.set(grant.skill, grant.rank);
    } else if (grant.rank === 1) {
      points += 1;
      redirected += 1;
    }
  }

  return { points, redirected, perSkill };
}

/**
 * The character's Lore skills, and the ranks of them that cost a skill increase.
 *
 * Lores are counted apart from the sixteen core skills, and only above trained, because nothing in
 * the data says where a Lore came from. Checked live: adding a background to a character creates no
 * Lore item at all, so the Lore its `trainedSkills.lore` field promises is hand-made by the player,
 * and a background's Lore, a Lore the GM hands out and a Lore bought with a skill increase are the
 * same object with the same flags. There is nothing to tell them apart by.
 *
 * The rank is the one thing that does separate them. Becoming trained in a Lore is something several
 * sources hand out for free, so it is not counted. Raising one past trained is, in practice, a skill
 * increase, so each rank above trained is one point.
 *
 * Two known errors, both accepted rather than engineered around:
 *
 * - A skill increase spent becoming trained in a brand new Lore is not counted, so it reads as still
 *   unspent. Same direction as the panel's other gaps, and quiet.
 * - Additional Lore raises its Lore at 3rd, 7th and 15th without a skill increase, and PF2e does not
 *   automate it: the feat carries no rule elements at all, and across the 6284 feats in the SRD pack
 *   exactly one rule element touches a Lore path. Its ranks are hand-set and indistinguishable from
 *   bought ones, so a character with it reads over budget by up to 3.
 *
 * @param {ActorPF2e} actor
 * @returns {{slug: string, label: string, rank: number}[]}
 */
function loreSkills(actor) {
  return Object.entries(actor.system.skills ?? {})
    .filter(([, skill]) => skill?.lore)
    .map(([slug, skill]) => ({ slug, label: skill.label ?? slug, rank: skill.rank ?? 0 }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/**
 * Work out the expected and actual trained skill counts.
 * @param {ActorPF2e} actor
 */
export function tallyTrainedSkills(actor) {
  const classes = countedClasses(actor);

  // Counted per source, not per distinct skill. Two classes that both train Survival are two
  // points, because the rules say so: "Each time after the first that you'd become trained in a
  // given skill, you instead allocate the trained proficiency to any other skill of your choice."
  // The second grant is not wasted, it becomes a free pick, so the budget still has two points in
  // it. Unioning them lost one.
  const automatic = classes.flatMap((c) => c.system.trainedSkills.value);

  // "Apply the larger number of additional skills" - the larger, never the sum.
  const additional = Math.max(...classes.map((c) => c.system.trainedSkills.additional), 0);
  const intMod = actor.system.abilities.int.mod;
  const free = Math.max(0, additional + intMod);

  const background = actor.background?.system.trainedSkills.value ?? [];
  const granted = grantedByRules(actor);

  // Every free source, folded into the rank-points it actually confers. See `foldGrants`.
  const grants = [
    ...automatic.map((skill) => ({ skill, rank: 1 })),
    ...background.map((skill) => ({ skill, rank: 1 })),
    ...granted.map((g) => ({ skill: g.skill, rank: g.rank }))
  ];
  const folded = foldGrants(grants);
  const expected = folded.points + free;

  const coreSkills = Object.keys(CONFIG.PF2E.skills ?? {});
  const actual = coreSkills.filter((key) => (actor.system.skills[key]?.rank ?? 0) >= 1).length;

  const lores = loreSkills(actor);
  // Only the ranks above trained. See `loreSkills` for why the trained step is free.
  const loreSpent = lores.reduce((sum, lore) => sum + Math.max(0, lore.rank - 1), 0);

  // The points model. A rank is worth its own number - trained 1, expert 2, master 3, legendary 4 -
  // which is exactly PF2e's stored rank, so the total spent is the sum of the ranks. Every source
  // contributes one point: an initially trained skill is one, and a skill increase is one whether it
  // trains something new or raises something already trained. So the budget is a count of sources
  // and the spend is a sum of ranks, and the two are directly comparable at any level.
  const spent = coreSkills.reduce((sum, key) => sum + (actor.system.skills[key]?.rank ?? 0), 0) + loreSpent;

  // Skill increases are on the once-per-level list, so two classes do not grant two at the same
  // level: the levels are unioned across classes, the same as the feat ladders. Rogue and
  // Investigator are the only classes on every level from 2nd; the other 27 are on odd levels from
  // 3rd.
  const increaseLevels = [...new Set(classes.flatMap((c) => c.system.skillIncreaseLevels?.value ?? []))]
    .sort((a, b) => a - b);
  const increases = increaseLevels.filter((level) => level <= actor.level).length;

  const budget = expected + increases;

  return {
    // Listed per skill with the points it was granted, so the figures visibly add up to the bold
    // total beside them. Listing per source cannot do that any more: Skill Mastery's two rules take
    // one skill to master, which is three points against two names.
    automatic,
    background,
    granted: [...folded.perSkill.entries()]
      .map(([skill, points]) => ({ skill, points }))
      .sort((a, b) => skillLabel(a.skill).localeCompare(skillLabel(b.skill))),
    grantPoints: folded.points,
    redirected: folded.redirected,
    additional,
    intMod,
    free,
    expected,
    actual,
    spent,
    increases,
    budget,
    unspent: budget - spent,
    lores,
    loreSpent,
    caps: capViolations(actor, coreSkills, increaseLevels, lores),
    coreCount: coreSkills.length,
    everySkillGranted: everythingCovered(coreSkills, automatic, background, granted),
    classes: classes.map((c) => c.name)
  };
}

/**
 * Whether every skill in the game is already covered by the build.
 *
 * Something can train all sixteen - a homebrew feature doing it as one upgrade per skill is the case
 * this was found on. There is then nothing for the free picks to buy, and counting produces a number
 * wrong in a confusing way: the character looks permanently short by exactly those picks. Where
 * everything is covered the panel says so instead of counting.
 *
 * Keyed on the outcome rather than on recognising any particular feature, so anything with that
 * effect gets the same answer.
 *
 * @returns {boolean}
 */
function everythingCovered(coreSkills, automatic, background, granted) {
  if (coreSkills.length === 0) return false;
  const covered = new Set([...automatic, ...background, ...granted.map((g) => g.skill)]);
  return coreSkills.every((key) => covered.has(key));
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
 * Lores are checked on the same gates. A Lore is a skill, so the level at which a skill increase can
 * make one an expert is the level at which it can make any skill an expert, and a Lore at master on
 * a 3rd-level character is as impossible as Athletics at master. The counting rules differ for Lores
 * because their *source* is unknowable; their caps do not, because a cap is about level alone.
 *
 * @param {ActorPF2e} actor
 * @param {string[]} coreSkills
 * @param {number[]} increaseLevels
 * @param {{slug: string, label: string, rank: number}[]} lores
 * @returns {{label: string, rank: number, needs: number}[]}
 */
function capViolations(actor, coreSkills, increaseLevels, lores) {
  const expertFrom = increaseLevels.length ? increaseLevels[0] : Infinity;
  const needed = { 2: expertFrom, 3: MASTER_LEVEL, 4: LEGENDARY_LEVEL };

  const checked = [
    ...coreSkills.map((key) => ({ label: skillLabel(key), rank: actor.system.skills[key]?.rank ?? 0 })),
    ...lores.map((lore) => ({ label: lore.label, rank: lore.rank }))
  ];

  const found = [];
  for (const { label, rank } of checked) {
    const needs = needed[rank];
    if (needs !== undefined && actor.level < needs) found.push({ label, rank, needs });
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

  // The headline: two numbers and a verdict, readable without reading the breakdown under it.
  line.innerHTML = game.i18n.format("PF2EDC.Skills.Points", {
    spent: `<strong class="pf2edc-count">${tally.spent}</strong>`,
    budget: `<strong>${tally.budget}</strong>`
  });
  if (tally.unspent > 0) {
    line.innerHTML += ` <span class="pf2edc-skill-note">${game.i18n.format("PF2EDC.Skills.Unspent", {
      count: `<strong>${tally.unspent}</strong>`
    })}</span>`;
  } else if (tally.unspent < 0) {
    line.innerHTML += ` <span class="pf2edc-skill-warn">${game.i18n.format("PF2EDC.Skills.Over", {
      count: `<strong>${-tally.unspent}</strong>`
    })}</span>`;
  }
  wrapper.append(line);

  if (tally.caps.length) {
    const caps = document.createElement("div");
    caps.className = "pf2edc-skill-count-line pf2edc-skill-warn";
    caps.innerHTML = game.i18n.format("PF2EDC.Skills.OverCap", {
      skills: tally.caps
        .map((c) => `<strong>${escapeHtml(c.label)}</strong> ${escapeHtml(rankLabel(c.rank))} `
          + game.i18n.format("PF2EDC.Skills.NeedsLevel", { level: c.needs }))
        .join(", ")
    });
    wrapper.append(caps);
  }

  // The breakdown, one labelled figure per source, so the headline can be audited without arithmetic.
  const parts = [];
  if (tally.granted.length) {
    // Each skill carries its own points, so the figures add up to the bold total in front of them
    // without the reader doing arithmetic the panel could have done.
    const listed = tally.granted
      .map((g) => `${escapeHtml(skillLabel(g.skill))} ${g.points}`)
      .join(", ");
    parts.push(`<strong>${tally.grantPoints - tally.redirected}</strong> `
      + `${escapeHtml(game.i18n.localize("PF2EDC.Skills.GrantedLabel"))}: ${listed}`);
  }
  if (tally.redirected) {
    parts.push(`<strong>${tally.redirected}</strong> `
      + escapeHtml(game.i18n.localize("PF2EDC.Skills.Redirected")));
  }
  parts.push(`<strong>${tally.free}</strong> ${escapeHtml(game.i18n.format("PF2EDC.Skills.FreePicks", {
    additional: tally.additional,
    int: tally.intMod >= 0 ? `+${tally.intMod}` : String(tally.intMod)
  }))}`);
  parts.push(`<strong>${tally.increases}</strong> ${escapeHtml(game.i18n.localize("PF2EDC.Skills.Increases"))}`);

  const detail = document.createElement("div");
  detail.className = "pf2edc-skill-count-detail";
  detail.innerHTML = parts.join(" &middot; ");
  wrapper.append(detail);

  // Lores get their own line rather than joining the breakdown above, because they are counted on a
  // different rule and putting them in the same list would imply they are not.
  if (tally.lores.length) {
    const lore = document.createElement("div");
    lore.className = "pf2edc-skill-count-detail";
    const listed = tally.lores
      .map((l) => (l.rank > 1
        ? `${escapeHtml(l.label)} (${escapeHtml(rankLabel(l.rank))})`
        : escapeHtml(l.label)))
      .join(", ");
    const key = tally.lores.length === 1 ? "PF2EDC.Skills.LoreOne" : "PF2EDC.Skills.Lores";
    lore.innerHTML = game.i18n.format(key, {
      count: `<strong>${tally.lores.length}</strong>`,
      list: listed
    });
    lore.innerHTML += ` &middot; ${game.i18n.format("PF2EDC.Skills.LoreCounted", {
      count: `<strong>${tally.loreSpent}</strong>`
    })}`;
    wrapper.append(lore);

    const why = document.createElement("div");
    why.className = "pf2edc-skill-count-detail pf2edc-skill-note";
    why.textContent = game.i18n.localize("PF2EDC.Skills.LoreNote");
    wrapper.append(why);
  }

  const note = document.createElement("div");
  note.className = "pf2edc-skill-count-detail pf2edc-skill-note";
  note.textContent = game.i18n.localize("PF2EDC.Skills.HowCounted");
  wrapper.append(note);

  return wrapper;
}

/** Skill and class names come from content and go into innerHTML, so they are escaped. */
function escapeHtml(text) {
  const node = document.createElement("div");
  node.textContent = String(text);
  return node.innerHTML;
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
