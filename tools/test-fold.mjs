/**
 * Cases for `foldGrants`, the function that turns everything granting a skill rank into points.
 *
 * Every case below is written so the model it replaced gives a different answer. The old model paid
 * one point per source regardless of rank, so any case where a source confers two or more ranks
 * separates them; the expected column names which. A case both models agree on proves nothing and is
 * not worth the line, so there are none here.
 */

import { foldGrants } from "../scripts/skills.mjs";

const cases = [
  {
    name: "one training is one point",
    grants: [{ skill: "athletics", rank: 1 }],
    points: 1,
    redirected: 0,
    // Old model agrees. Kept only as the floor the others are measured from.
    separates: null
  },
  {
    name: "a second source training the same skill is redirected, not lost",
    grants: [{ skill: "survival", rank: 1 }, { skill: "survival", rank: 1 }],
    points: 2,
    redirected: 1,
    separates: "a model that unions skills gives 1"
  },
  {
    name: "a rule granting expert outright is worth two points",
    grants: [{ skill: "thievery", rank: 2 }],
    points: 2,
    redirected: 0,
    separates: "one point per source gives 1, which is the Skilled Human defect"
  },
  {
    name: "two rules on one skill are subsumed, not added",
    grants: [{ skill: "athletics", rank: 2 }, { skill: "athletics", rank: 3 }],
    points: 3,
    redirected: 0,
    separates: "adding the ranks gives 5; one point per source gives 2"
  },
  {
    name: "the same two rules in the other order give the same answer",
    grants: [{ skill: "athletics", rank: 3 }, { skill: "athletics", rank: 2 }],
    points: 3,
    redirected: 0,
    separates: "a fold that pays out in arrival order gives 4"
  },
  {
    // A dedication granting expert requires trained, so a class training the same skill is the
    // prerequisite rather than a duplicate. It is the same multiset as "class trains, dedication
    // raises", and there is no data separating the two, so both read as two points.
    name: "a training under a higher grant is the prerequisite, not a duplicate",
    grants: [{ skill: "stealth", rank: 2 }, { skill: "stealth", rank: 1 }],
    points: 2,
    redirected: 0,
    separates: "crediting the higher grant its full rank gives 3 and invents an unspent point"
  },
  {
    // The feat requires master, so the character bought expert and master with increases that are
    // already in the budget. Only the last step is the feat's.
    name: "a feat raising a granted skill is worth its step, not the whole gap",
    grants: [{ skill: "religion", rank: 1 }, { skill: "religion", rank: 4 }],
    points: 2,
    redirected: 0,
    separates: "crediting the gap gives 4 and invents two unspent increases"
  },
  {
    name: "unrelated skills accumulate independently",
    grants: [
      { skill: "acrobatics", rank: 1 },
      { skill: "athletics", rank: 3 },
      { skill: "intimidation", rank: 1 }
    ],
    points: 5,
    redirected: 0,
    separates: "one point per source gives 3"
  },
  {
    // The fixture's shape: Skill Mastery put both of its rules on one skill, taking it to master
    // with nothing else contributing. All three ranks are free.
    name: "two rules carrying one skill from nothing to master are three points",
    grants: [{ skill: "athletics", rank: 3 }, { skill: "athletics", rank: 2 }],
    points: 3,
    redirected: 0,
    separates: "one point per source gives 2, which understated the test character by one"
  }
];

let failed = 0;
for (const testCase of cases) {
  const result = foldGrants(testCase.grants);
  const ok = result.points === testCase.points && result.redirected === testCase.redirected;
  if (!ok) {
    failed += 1;
    console.log(`  FAIL ${testCase.name}`);
    console.log(`       expected points=${testCase.points} redirected=${testCase.redirected}`);
    console.log(`       got      points=${result.points} redirected=${result.redirected}`);
    if (testCase.separates) console.log(`       this case exists because: ${testCase.separates}`);
  } else {
    console.log(`  ok   ${testCase.name}`);
  }
}

// The per-skill map is what the breakdown renders, and a wrong map can still total correctly, so it
// is asserted separately rather than trusted to follow from the points.
const map = foldGrants([{ skill: "athletics", rank: 2 }, { skill: "athletics", rank: 3 }]).perSkill;
if (map.get("athletics") !== 3) {
  failed += 1;
  console.log(`  FAIL per-skill map records the highest rank (got ${map.get("athletics")})`);
} else {
  console.log("  ok   per-skill map records the highest rank");
}

console.log(failed === 0 ? "\nfoldGrants: all cases pass" : `\nfoldGrants: ${failed} failed`);
process.exit(failed === 0 ? 0 : 1);
