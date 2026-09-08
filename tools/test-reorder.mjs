/**
 * Tests for `reorderGroups`, the presentational pass that decides where each added feat section
 * sits on the Feats tab.
 *
 * Why this file exists: the same-support pass was unreachable for every group except `class` for as
 * long as it existed, because an early `continue` for groups absent from `follows` sat above it.
 * Every test that passed was a class-feat test, and `follows` has only a class entry, so nothing
 * exercised the branch. Case 2 below is the one that fails against that code.
 *
 * `reorderGroups` takes a `CharacterFeats` Collection but touches only entries(), size, clear() and
 * set(), so a plain Map drives it and Foundry is not needed. A group is likewise only ever read for
 * its `supported` array.
 *
 * Run: node tools/test-reorder.mjs
 */

import { reorderGroups } from "../scripts/ladders.mjs";

let failures = 0;

function check(name, actual, expected) {
  const a = JSON.stringify(actual);
  const e = JSON.stringify(expected);
  if (a === e) {
    console.log(`  ok   ${name}`);
  } else {
    console.error(`  FAIL ${name}\n       expected ${e}\n       actual   ${a}`);
    failures += 1;
  }
}

/** The groups a character has before reordering, in the order PF2e builds them. */
function groups(...entries) {
  return new Map(entries.map(([id, supported]) => [id, { id, supported }]));
}

const ANCESTRY = ["ancestry"];
const CLASS = ["class"];
const SKILL = ["skill"];
const GENERAL = ["general"];

// 1. The second class's ladder goes directly under PF2e's class group, not at the bottom where
//    campaign sections are created.
{
  const feats = groups(
    ["ancestry", ANCESTRY],
    ["class", CLASS],
    ["skill", SKILL],
    ["dc-class-wizard", CLASS]
  );
  reorderGroups(feats);
  check("second class ladder follows the class group", [...feats.keys()], [
    "ancestry",
    "class",
    "dc-class-wizard",
    "skill"
  ]);
}

// 2. The regression. Another module's section belongs with the group taking the same kind of feat.
//    Ancestry is the case the code's own comment names, and the case that could not be reached.
{
  const feats = groups(
    ["ancestry", ANCESTRY],
    ["class", CLASS],
    ["skill", SKILL],
    ["dc-class-wizard", CLASS],
    ["other-paragon", ANCESTRY]
  );
  reorderGroups(feats);
  check("another module's ancestry section follows the ancestry group", [...feats.keys()], [
    "ancestry",
    "other-paragon",
    "class",
    "dc-class-wizard",
    "skill"
  ]);
}

// 3. The same, for a category this module supplies nothing of. A skill-feat section from elsewhere
//    is placed by the same pass, which is what keeps it off the bottom of the tab.
//
//    `general` sits after `skill` here on purpose. Without a group between the skill group and the
//    end of the list, "placed after skill" and "appended because nothing placed it" produce the same
//    order, and the case passes against the bug it is meant to catch.
{
  const feats = groups(
    ["ancestry", ANCESTRY],
    ["class", CLASS],
    ["skill", SKILL],
    ["general", GENERAL],
    ["dc-class-wizard", CLASS],
    ["other-skill", SKILL]
  );
  reorderGroups(feats);
  check("another module's skill section follows the skill group", [...feats.keys()], [
    "ancestry",
    "class",
    "dc-class-wizard",
    "skill",
    "other-skill",
    "general"
  ]);
}

// 4. Running it twice must not move anything, or two modules reordering the same collection could
//    push a group back and forth on every prepare.
{
  const feats = groups(
    ["ancestry", ANCESTRY],
    ["class", CLASS],
    ["skill", SKILL],
    ["dc-class-wizard", CLASS],
    ["other-skill", SKILL]
  );
  reorderGroups(feats);
  const once = [...feats.keys()];
  reorderGroups(feats);
  check("reordering is idempotent", [...feats.keys()], once);
}

// 5. With none of this module's sections present there is nothing to place, and the collection must
//    come back untouched rather than reshuffled around another module's sections.
{
  const feats = groups(
    ["ancestry", ANCESTRY],
    ["class", CLASS],
    ["skill", SKILL],
    ["other-skill", SKILL]
  );
  reorderGroups(feats);
  check("no dual-class sections means no change", [...feats.keys()], [
    "ancestry",
    "class",
    "skill",
    "other-skill"
  ]);
}

// 6. A group with no counterpart is appended rather than dropped. The collection is rebuilt from the
//    ordered list, so anything missing from it would vanish from the sheet, not merely move.
{
  const feats = groups(
    ["classfeature", ["classfeature"]],
    ["class", CLASS],
    ["dc-class-wizard", CLASS],
    ["bonus", ["bonus"]]
  );
  reorderGroups(feats);
  check("every group survives the rebuild", [...feats.keys()].sort(), [
    "bonus",
    "class",
    "classfeature",
    "dc-class-wizard"
  ]);
}

// 7. This module's ladder is placed even when the group it doubles is absent, by the append
//    backstop, rather than being lost.
{
  const feats = groups(["ancestry", ANCESTRY], ["skill", SKILL], ["dc-class-wizard", CLASS]);
  reorderGroups(feats);
  check("ladder survives a missing class group", [...feats.keys()], [
    "ancestry",
    "skill",
    "dc-class-wizard"
  ]);
}

console.log(failures === 0 ? "\nreorderGroups: all cases pass" : `\nreorderGroups: ${failures} failed`);
process.exit(failures === 0 ? 0 : 1);
