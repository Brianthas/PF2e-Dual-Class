# Dual Class (PF2e)

A [Foundry VTT](https://foundryvtt.com/) module for the [Pathfinder 2e](https://github.com/foundryvtt/pf2e)
system that runs the **Dual-Class Characters** variant rule on two real class items, instead of one
merged class item built ahead of time.

A Fighter/Wizard has the Fighter's Hit Points, armor and weapon proficiencies, the Wizard's
spellcasting proficiency, the better of the two in every saving throw, both class DCs, both key
attribute boosts, and a separate feat ladder for each class.

## Why two class items

The character keeps a Fighter item and a Wizard item, and the module corrects what the system gets
wrong when two are present. Nothing is precomputed and nothing is written to the actor beyond a
single flag naming which class is the second one, so the numbers are recalculated from the class
items on every data-prep cycle and removing the second class puts the character back exactly as it
was.

It also means both classes are real to the rest of the system. Feats and rule elements test roll
options like `class:wizard`, and each class item contributes its own, so the second class's content
works rather than needing to be special-cased.

## Installation

Requires the [libWrapper](https://foundryvtt.com/packages/lib-wrapper) module.

In Foundry's **Add-on Modules** tab, use this manifest URL:

```text
https://github.com/Brianthas/PF2e-Dual-Class/releases/latest/download/module.json
```

## Usage

1. As GM, enable **Enable Dual Class** in the module's world settings. It is off by default, and
   turning it on changes nothing until a character is given a second class.
2. Build the character with its first class as normal.
3. On the character sheet, use the **Second Class** slot next to Deity and pick the second class.
   Its class features are granted immediately, so expect the same choice prompts the first class
   asked for.

The character sheet then shows **Class** and **Second Class**, and the Attribute Boosts window shows
a key attribute row for each.

## What it does

### Proficiencies

Every proficiency is the better of the two classes: perception, all three saving throws, each weapon
and armor category, and spellcasting. The system already resolves a class item's proficiencies with
a maximum, so a second class item can only ever raise a rank, never lower one. The same holds for
class features that grant proficiency, which all use an upgrade-only mode.

### Hit Points

The higher of the two classes' Hit Points per level, never the sum and never a mix.

### Class DCs

Each class gets its own class DC at its own key attribute, and both can be rolled. One is marked
primary: it is the one the sheet shows as *the* class DC, and it comes from the first class.

### Key attribute boosts

Both classes' key attribute boosts apply, because a key attribute boost is neither Hit Points nor a
starting skill, and the rule is to add everything else from each class. A Fighter/Wizard who takes
Strength for the Fighter gets Strength **and** Intelligence.

The Attribute Boosts window gets a row per class, each wired to its own class item, because the
system's single row writes every choice to the first class. The rows sit where the boosts are
actually applied, after Background and before the free boosts, so a class boost is counted before
the free ones and the partial-boost rule at +4 works out on its own.

### Feat ladders

Each class gets its own ladder of class feat slots, at the levels that class grants them, labelled
with the class name. A Fighter/Wizard at level 5 has Fighter slots at 1, 2 and 4 and Wizard slots at
2 and 4, because the Wizard's class feats start at level 2.

**Skill, general and ancestry feats stay on one ladder, not two.** The variant rule lists those as
had only once per level, so two classes do not grant two of them at the same level. What a second
class can do is grant one at a level the first does not reach: a Fighter/Rogue gets the Rogue's
skill feat at every level rather than every even one. Those extra levels are added to the system's
own Skill Feats, General Feats and Ancestry Feats groups, so the slots sit where a player already
looks for them. Two classes whose ladders match add nothing.

Class feats are the exception, and that is why they get two ladders: they are not on the
once-per-level list, so a dual-class character really does get one from each class at the same
level.

**The ladders label their slots, they do not police them.** Each ladder browses to its own class's
feats, but the system's own check on a feat slot tests the feat's category and not its class, so
anything that is a class feat can be dropped in either ladder. Putting a feat in the wrong one warns
and lets it through. Archetype and dedication feats belong in both and are never flagged.

### Ancestry Paragon

**Enable Ancestry Paragon** is a separate world setting for the variant rule of the same name: an
ancestry feat at 1st level and at every odd level after, eleven in total instead of five. It is
independent of dual class and applies to every character with a class, single-classed or not, so a
world can run either variant without the other.

The extra slots go into the system's own **Ancestry Feats** group rather than a second ladder
beside it, and the heading reads **Ancestry Feats (Paragon)** while the setting is on. If another
module is already providing Ancestry Paragon slots, this one stands its section down so the sheet
does not show both.

### Spellcasting

A dual-class caster's **spellcasting proficiency** is the better of the two classes, so a
Fighter/Wizard is trained in spell attack rolls and spell DC rather than untrained.

**Each class needs its own spellcasting entry, added by hand.** That is not this module: Pathfinder
2e never creates one automatically, for a second class or a first. No class feature grants one - of
the 391 item grants across the class-features compendium, none is a spellcasting entry - and the
system's own way of making one is the manual dialog on the Spellcasting tab. So add a second entry
there, with the second class's tradition, prepared or spontaneous category, and key attribute, the
same way the first one was made.

Both entries then work independently, which is what the rule asks for: a Sorcerer/Wizard keeps
spontaneous and prepared casting apart and gets the full benefit of each.

Focus points need nothing. Both classes' focus spells feed one shared pool, capped at three, which
the system already enforces.

### Class features

Both classes grant their features, at each class's own levels, and both are removed again if the
character's level drops. **Sync Class Features**, in the Second Class slot's menu, re-checks and
grants anything missing; it is safe to run at any time and does nothing when there is nothing to
add. Use it after giving a second class to a character that is already past level 1.

### Levelling past 1st

A character cannot leave 1st level with only one class. The second class's 1st-level features,
proficiencies and key attribute boost all belong to the character from the start, and levelling
without it quietly produces a character that never received any of them - with nothing on the sheet
to show it, because the numbers look exactly like a legitimate single-class character.

**A player is stopped; a GM is warned and allowed through.** A GM has reasons for a one-class
character in a dual-class world - an NPC built on a character sheet, or a character partway through
being fixed - and no way to say so to a hard block.

The check is on leaving 1st level, not on every level change. A character already past 1st with one
class may have been imported or predate the variant being switched on, and blocking every update to
it would be obstructive.

### Trained skills

A counter at the top of the Proficiencies tab shows how many trained skills the character has
against how many the build accounts for: the skills each class trains automatically, plus the
**larger** of the two classes' additional skill counts (never the sum), plus the Intelligence
modifier, plus the background's, plus any trained by a heritage, ancestry feat or class feature.

Those last ones are found by reading the rule that grants them, including the common case where the
player chooses which skill - Skilled Human, the Natural Skill ancestry feat, a Rogue's racket - where
the choice is resolved from the item's own answer rather than guessed at.

**It shows at 1st level only, and that is what makes it exact.** At 1st level every trained skill
traces to a build source, so the count is an identity rather than an estimate. From 3rd level a
skill increase can be spent either raising a trained skill or training an untrained one, with
nothing recording which, so a later count would be a guess dressed as a check - and a panel that
cries wolf on a legitimate build is worse than no panel. 1st level is also exactly when the
dual-class arithmetic is being done for the first time and is easy to get wrong.

## Which class is which

The first class is the primary one. It sets the character's single key attribute, the class DC the
sheet treats as *the* one, and the name shown in the Class slot. The published rule does not settle
what to do when two classes disagree on a key attribute, so the choice is left explicit: **Make
primary** in the Second Class menu swaps them.

## Two classes, not three

Two is the supported shape and the only one tested. A third class item does not break anything - it
still contributes its proficiencies, since the system resolves those with a maximum, and it still
gets its own class DC - but the module ignores it. Hit Points come from the better of the two
classes it knows about, so a third class with a larger hit die would not be counted, and only the
one flagged as second gets a feat ladder.

## Compatibility

Verified against Foundry v14 and Pathfinder 2e 8.4.1 and 8.5.0. The manifest declares 8.4.1 as the
minimum rather than a lower version nobody has run it on; Pathfinder 2e 8.4.1 itself requires
Foundry 14.361, so there is no older combination to support.

Making two class items coexist means working around the system's own behaviour, which deletes an
existing class whenever a class is added. That is done by keeping the class the system is about to
delete, which relies on how the system performs that deletion. It reports loudly rather than
silently if a future Pathfinder 2e release changes it, but **check that adding a second class still
keeps the first after any system update.**

If another module adds a general-purpose second ladder of class feat slots, it is suppressed for
characters this module already gives per-class ladders to, so the sheet does not offer the same
slots twice.

The Free Archetype variant is unaffected and adds its own archetype ladder as usual, so a
dual-class character running Free Archetype has three ladders.

## Status

- [CHANGELOG.md](CHANGELOG.md) - version-by-version history
- [docs/design-notes.md](docs/design-notes.md) - why the module works the way it does
