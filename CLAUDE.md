# PF2e-Dual-Class

Repo root **is** the module, id `pf2e-dual-class-items`, title `Dual Class Items (PF2e)`. Implements
PF2e's Dual-Class Characters variant rule (Gamemastery Guide) on two real class items rather than a
merged one.

The plain `pf2e-dual-class` id belongs to someone else's module on Foundry's registry, which
maintains the Workbench dual-class macro. Do not rename back to it.

Root `CLAUDE.md` and `.claude/rules/standing-rules.md` apply here too. What follows is what is
specific to this module.

## You have to be able to explain this code

This module is submitted to Foundry's package registry, so its AI Content Policy applies: the author
is obliged to understand and maintain the code. That makes two things binding here that are not
binding on every project under `Code Repos`.

- **Keep the code explainable.** A clever patch that nobody can walk through is worse than a plain
  one, because the obligation is on Bryan and not on the machine that wrote it.
- **A request for a plain-English explanation of the code is genuine.** Write it from the current
  code, never from an earlier conversation.

## The one thing that breaks on a PF2e upgrade

`scripts/coexist.mjs` is load-bearing and coupled to a system implementation detail.
`ItemPF2e.createDocuments` deletes every existing ancestry, background, class, heritage and deity
item when one of those types is added, with no opt-out. The module survives that by recording the
class item's id before the create and filtering it out of the `deleteEmbeddedDocuments` call the
purge makes.

If PF2e ever stops implementing the purge as a `deleteEmbeddedDocuments` call, the wrapper stops
seeing it and a second class add deletes the first class silently. So **after every PF2e upgrade,
add a second class to a test character and confirm both class items are still there** before
trusting the module. `module.json` pins `verified` to the version that check was last run against.

## Rules of the game

- **PF2e rules, always from <https://2e.aonprd.com/>.** Never write a published rule's numbers from
  memory, and never infer them from how the PF2e system or another module models them.
- The dual-class rules that matter: everything from each class except Hit Points and starting
  skills; the higher Hit Points; the larger additional skill count, not the sum; the highest rank
  for any given proficiency; class feats and class features from both classes; ability boosts,
  general feats, skill feats and skill increases only once per level.
- That last clause is why skill, general and ancestry feats are merged into PF2e's own ladders as a
  union of levels, while class feats get a second ladder. A Rogue secondary raises the skill ladder
  to every level; it does not open a second skill ladder.

## Testing in the live client

`pf2e-testing` is the test world, never the live game. Facts that each cost a run:

- **Use `actor.reset()`, never `actor.prepareData()`.** The latter throws
  `TypeError: Cannot redefine property: system` on a PF2e character.
- **Creating an actor with class items in source still fires the class ChoiceSets.** A matrix that
  builds actors opens prompt windows by the hundred, they do not close on a null selection, and they
  outlive the actor that spawned them and pin the page. Copy an existing actor with `toObject()`
  instead of building one.
- **`game.pf2e.settings.campaign.feats.sections` is world-global.** Anything left in it reaches
  every character. `scripts/ladders.mjs` pushes per-actor sections onto it and pops them in a
  `finally` for that reason.
- The system's own class group ids are `class`, `skill`, `general`, `ancestry`, `archetype`. This
  module's are prefixed `dc-`.

## Dev loop

- Live copy is `AppData\Local\FoundryVTT\Data\modules\pf2e-dual-class-items`; the `PostToolUse` mirror
  hook copies a file there after every Edit and Write, and reports which. It skips anything whose
  parent directory does not exist in the live copy, which is how `tools/` and `docs/` stay out.
  The browser still holds the old code until the page reloads, so reload before measuring a fix.
  `foundry-console-tools/cdp-reload.mjs` does it; `cdp-eval.mjs` reads the result back.
- `npm run lint` and `npm run check-lang` are what CI runs, plus `node --check` on every `.mjs`.
- `node tools/release.mjs [major|minor|patch]` bumps `module.json`, commits that alone, tags and
  pushes. The tag triggers `.github/workflows/release.yml`, which uploads `module.json` and
  `module.zip` as release assets. `module.json`'s manifest and download URLs point at
  `releases/latest/download/`, so those two asset names are load-bearing.
- `tools/` and `docs/` are dev-only and stay out of the release zip.
