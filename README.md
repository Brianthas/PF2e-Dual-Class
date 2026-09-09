# Dual Class Items (PF2e)

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

1. As GM, enable **Enable Dual Class** in the module's world settings. It is off by default.
2. Build the character with its first class as normal.
3. On the character sheet, use the **Second Class** slot, which sits directly after Class, and pick
   the second class. Its class features are granted immediately, so expect the same choice prompts
   the first class asked for.
4. Level up from there as normal.

**Every class is picked at 1st level, before levelling.** Each one contributes 1st-level features,
proficiencies and a key attribute boost that belong to the character from the start, so a player
cannot take a character past 1st level until it has all of them, and is told why. A character
allowed a third class needs three; another character in the same world still needs two. See
[Levelling past 1st](#levelling-past-1st) for what a GM can do instead, and for why characters
already above 1st level are left alone.

The character sheet then shows **Class** and **Second Class**, and the Attribute Boosts window shows
a key attribute row for each.

## What it does

### Proficiencies

Every proficiency is the better of the two classes: perception, all three saving throws, each weapon
and armor category, and spellcasting. The system already resolves a class item's proficiencies with
a maximum, so a second class item can only ever raise a rank, never lower one. The same holds for
class features that grant proficiency, whether they do it through a rule element or through the
field the system uses for most class progression: both take the higher of the two.

### Hit Points

The higher of the two classes' Hit Points per level, never the sum and never a mix.

### Class DCs

Each class gets its own class DC at its own key attribute, and both can be rolled. One is marked
primary: it is the one the sheet shows as *the* class DC, and it comes from the first class.

### Key attribute boosts

Both classes' key attribute boosts apply, because a key attribute boost is neither Hit Points nor a
starting skill, and the rule is to add everything else from each class. A Fighter/Wizard who takes
Strength for the Fighter gets Strength **and** Intelligence.

**Nothing goes above +4 at 1st level.** Character creation caps a modifier at +4, and classes keyed
on the same attribute can otherwise stack past it. A class boost that would land on an attribute
already at +4 is dropped rather than applied at half value, so it cannot bank a half step that a
later boost would cash in. Boosts at 5th level and beyond are untouched, where the half step is the
rule that makes 18 to 20 cost two boosts.

The Attribute Boosts window gets a row per class, each wired to its own class item, because the
system's single row writes every choice to the first class. The rows sit where the boosts are
actually applied, after Background and before the free boosts. That ordering matters: a class boost
lands before the free ones, so if it takes an attribute to +4 the free boosts that follow are worth
a half step, the same as they would be for a single-class character.

### Feat ladders

Each class gets its own ladder of class feat slots, at the levels that class grants them, headed
with the class name: **Fighter Feats**, **Wizard Feats**. A Fighter/Wizard at level 5 has Fighter
slots at 1, 2 and 4 and Wizard slots at 2 and 4, because the Wizard's class feats start at level 2.

A ladder whose every slot is above the character's level is not shown at all, since it would be a
heading with nothing under it. That is why a 1st-level Fighter/Sorcerer sees only one class ladder:
the Sorcerer's feats start at 2nd.

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

### A third class

Two settings allow it, both off by default, and either is enough.

**Allow a Third Class** is a world setting: every character may take three. **Third Class
Permissions** is a GM-only screen listing every character with a checkbox, for allowing it to
particular characters in a world that is otherwise dual class. The permission is recorded on the
character, so it travels with them and cannot go stale, and unticking someone does not remove a
class they already have.

A third class is treated exactly like the second, because the same rules apply to it: the best of
the three proficiencies, the highest Hit Points, the larger additional skill count rather than the
sum, a class DC each at its own key attribute, a key attribute boost each, and a feat ladder each.
Skill, general and ancestry feats stay on one ladder across all three, since those are had only
once per level however many classes you have.

**Three classes is not a published variant rule.** Dual-Class is; this applies its rules to one
more class, which is why it is off unless a GM turns it on.

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

**Each class needs its own spellcasting entry, added by hand.** This is how Pathfinder 2e works for
everyone, not something the module takes away: the system has never created a spellcasting entry
from a class, first or second. No class feature grants one, and the way you make one is the dialog
on the Spellcasting tab. So add a second entry there, with the second class's tradition, prepared or
spontaneous category, and key attribute, the same way you made the first.

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

A character cannot leave 1st level short of the classes it is entitled to: two normally, three if a
third is allowed for them. Each class brings 1st-level features, proficiencies and a key attribute
boost that the character is meant to have from the start, and if you level without picking one, none
of that ever arrives. Nothing on the sheet looks wrong either, because a character missing all of it
looks exactly like an ordinary character with fewer classes.

**A player is stopped; a GM is warned and allowed through.** A GM has reasons for a one-class
character in a dual-class world - an NPC built on a character sheet, or a character partway through
being fixed - and no way to say so to a hard block. The warning names how many classes the character
has and how many it needs.

The check is on leaving 1st level, not on every level change. A character already past 1st with one
class may have been imported or predate the variant being switched on, and blocking every update to
it would be obstructive.

### Skill proficiencies

A panel at the top of the Proficiencies tab counts proficiency points. A rank is worth its own
number - trained 1, expert 2, master 3, legendary 4 - and every source is worth one point, whether
it trains a new skill or raises one already trained. So the total is an identity at any level:

```text
sum of your ranks = initially trained skills + skill increases so far
```

Initially trained is the skills each class trains automatically, plus the **larger** of the classes'
additional skill counts (never the sum), plus the Intelligence modifier, plus the background's, plus
any trained by a heritage, ancestry feat or class feature. Those last ones are found by reading the
rule that grants them, including the common case where the player chooses which skill - Skilled
Human, the Natural Skill ancestry feat, a Rogue's racket - where the choice is resolved from the
item's own answer rather than guessed at.

Skill increases are had once per level, so the levels are unioned across classes rather than added.
A Fighter/Rogue gets the Rogue's schedule, one every level from 2nd, not the Fighter's odd levels
from 3rd.

**Unspent increases are the line worth watching.** Nothing else on the sheet records that you owe
yourself one, so they are easy to forget at level up. Being over budget is reported as a rank
nothing accounts for rather than as an error, because a feat that grants a rank outright is the
likelier cause than a mistake.

**Ranks above what your level allows are listed separately**, and that check is exact. Expert comes
from the first level you gain a skill increase, master at 7th, legendary at 15th. Only the expert
gate moves by class: Rogue and Investigator are the only classes whose increases start at 2nd, and
their own entries defer to 7th and 15th unchanged.

## Which class is which

The first class is the primary one. It sets the character's single key attribute, the class DC the
sheet treats as *the* one, and the name shown in the Class slot. The published rule does not settle
what to do when two classes disagree on a key attribute, so the choice is left explicit: **Make
primary** in the Second Class menu swaps them.

## Compatibility

Verified against Foundry v14 and Pathfinder 2e 8.4.1 and 8.5.0. The manifest declares 8.4.1 as the
minimum rather than a lower version nobody has run it on; Pathfinder 2e 8.4.1 itself requires
Foundry 14.361, so there is no older combination to support.

Pathfinder 2e deletes a character's existing class whenever a new one is added, and there is no
setting to turn that off. This module gets two classes onto one sheet by holding on to the class the
system is about to delete, which depends on the particular way the system does the deleting. If a
future release changes that, the module notices and tells you: an error on screen, a note in the chat
log, and details in the console. Even so, **after any system update, add a second class to a test
character and check the first one is still there.**

If another module adds a general-purpose second ladder of class feat slots, it is suppressed for
characters this module already gives per-class ladders to, so the sheet does not offer the same
slots twice.

The Free Archetype variant is unaffected and adds its own archetype ladder as usual, so a
dual-class character running Free Archetype has three ladders.

## Status

- [CHANGELOG.md](CHANGELOG.md) - version-by-version history
- [docs/design-notes.md](docs/design-notes.md) - why the module works the way it does
