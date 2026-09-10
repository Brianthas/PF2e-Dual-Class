# Dual Class Items (PF2e)

A [Foundry VTT](https://foundryvtt.com/) module for the [Pathfinder 2e](https://github.com/foundryvtt/pf2e)
system that runs the **Dual-Class Characters** variant rule on two real class items, instead of one
merged class item built ahead of time.

A Fighter/Wizard has the Fighter's Hit Points, armor and weapon proficiencies, the Wizard's
spellcasting proficiency, the better of the two in every saving throw, both class DCs, both key
attribute boosts, and a separate feat ladder for each class.

## Why two class items

The character keeps a Fighter item and a Wizard item, and the module corrects what the system gets
wrong when two are present. Nothing is precomputed and nothing is written to the actor beyond a flag
naming the extra classes, so the numbers are recalculated on every data-prep cycle and removing a
class puts the character back exactly as it was.

Both classes are also real to the rest of the system. Feats and rule elements test roll options like
`class:wizard`, and each class item contributes its own, so the second class's content works rather
than needing to be special-cased.

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
   the second class. Its features are granted immediately, so expect the usual choice prompts.
4. Level up from there as normal.

The sheet then shows **Class** and **Second Class**, plus **Third Class** where one is allowed, and
the Attribute Boosts window gets a key attribute row for each.

**Every class is picked at 1st level, before levelling.** Each contributes 1st-level features,
proficiencies and a key attribute boost that belong to the character from the start, so a player
cannot level past 1st until it has all of them, and is told why.

**How many is a property of the character, not of the world.** One allowed a third class, whether by
the world setting or by a GM allowing it to that character alone, needs all three before it can
leave 1st level. Another character in the same world still needs only two. The check counts class
items, not whether every choice prompt has been answered. See
[Levelling past 1st](#levelling-past-1st) for what a GM can do instead.

## What it does

### Proficiencies

Every proficiency is the best of the classes: perception, all three saving throws, each weapon and
armor category, and spellcasting. The system already resolves a class item's proficiencies with a
maximum, so an extra class can only raise a rank, never lower one. The same holds for class features
that grant proficiency, whether they do it through a rule element or through the field the system
uses for most class progression.

### Hit Points

The higher of the classes' Hit Points per level. Never the sum, never a mix.

### Class DCs

Each class keeps its own class DC on its own key attribute, and they do not compete. A
Sorcerer/Fighter shows a Charisma-based Sorcerer DC and a Dexterity-based Fighter DC side by side on
the Proficiencies tab, both with their own rank, both rollable. There is nothing to choose.

Where the numbers differ, the attribute is the whole reason. A class DC is 10 + level + proficiency +
key attribute, the same formula for both, so at equal level and rank a Fighter on +4 Dexterity reads
21 beside a Sorcerer on +3 Charisma reading 20. Two classes keyed on the same attribute read the
same.

One is flagged primary, which is the first class's. It sorts first in that list, and it is the value
handed to anything that asks for *the* class DC instead of a named one. Very little does: 4 of the
16,989 items in the SRD packs, all snare and poison feats.

### Key attribute boosts

Every class's key attribute boost applies, since a key attribute boost is neither Hit Points nor a
starting skill, and the rule is to add everything else from each class. A Fighter/Wizard who takes
Strength for the Fighter gets Strength **and** Intelligence.

**Nothing goes above +4 at 1st level.** Character creation caps a modifier at +4, and classes keyed
on the same attribute can otherwise stack past it. A class boost that would land on an attribute
already at +4 is dropped rather than applied at half value, so it cannot bank a half step that a
later boost would cash in. Boosts at 5th level and beyond are untouched.

The Attribute Boosts window gets a row per class, each wired to its own class item, because the
system's single row writes every choice to the first class. The rows sit where the boosts are
actually applied, after Background and before the free boosts, so the free boosts that follow see
what the class boosts left behind.

### Feat ladders

One ladder of class feat slots per class, at that class's own levels, headed with its name:
**Fighter Feats**, **Wizard Feats**. A Fighter/Wizard at level 5 has Fighter slots at 1, 2 and 4 and
Wizard slots at 2 and 4. A ladder with no slot at or below the character's level is hidden, which is
why a 1st-level Fighter/Sorcerer sees only one.

- **Class feats get a ladder each.** They are not on the once-per-level list, so two classes really
  do grant two at the same level.
- **Skill, general and ancestry feats stay on one ladder.** Those are had once per level however
  many classes you have. An extra class only adds levels the first does not reach: a Fighter/Rogue
  gets the Rogue's skill feat every level, not every even one. The extra slots go into the system's
  own Skill Feats, General Feats and Ancestry Feats groups, where a player already looks for them.
  Classes whose ladders match add nothing.
- **The ladders label slots, they do not police them.** The system checks a feat's category, not its
  class, so any class feat drops into either ladder. A mismatch warns and lets it through. Archetype
  and dedication feats belong in both and are never flagged.
- **A feat that grants "a class feat" offers all of your classes.** Natural Ambition and anything
  written like it narrow the picker to one class trait, which is the primary's. With this module on,
  the picker accepts any of the character's classes, so a Fighter/Sorcerer sees both lists. The
  published rule does not contemplate two classes, so this is a ruling, and it matches the rest of
  the module: both classes are real.

### A third class

Off by default. Two settings allow it, and either is enough:

- **Allow a Third Class**, a world setting: every character may take three.
- **Third Class Permissions**, a GM-only screen listing every character with a checkbox, for
  allowing it to particular characters in a world that is otherwise dual class. The permission is
  recorded on the character, so it travels with them, and unticking someone does not remove a class
  they already have.

A third class is treated exactly like the second: the best of the three proficiencies, the highest
Hit Points, the larger additional skill count rather than the sum, a class DC and a key attribute
boost each, and a feat ladder each. Skill, general and ancestry feats stay on one ladder across all
three.

**Three classes is not a published variant rule.** Dual-Class is; this applies its rules to one more
class, which is why it is off unless a GM turns it on.

### Ancestry Paragon

**Enable Ancestry Paragon** is a separate world setting for the variant rule of the same name: the
character starts with **two** ancestry feats and gains another at every odd level after, eleven in
total instead of five. It is independent of dual class and applies to every character with a class,
so a world can run either variant alone.

The extra slots go into the system's own **Ancestry Feats** group rather than a second ladder beside
it, and the heading reads **Ancestry Feats (Paragon)** while the setting is on. If another module
already provides these slots, this one stands its section down.

### Spellcasting

Spellcasting proficiency is the best of the classes, so a Fighter/Wizard is trained in spell attack
rolls and spell DC rather than untrained.

**Each class needs its own spellcasting entry, added by hand.** That is how Pathfinder 2e works for
everyone, not something the module takes away: the system has never created a spellcasting entry
from a class, and the way you make one is the dialog on the Spellcasting tab. Add a second one there
with that class's tradition, prepared or spontaneous category, and key attribute. Both then work
independently, so a Sorcerer/Wizard keeps spontaneous and prepared casting apart.

Focus points need nothing. Both classes' focus spells feed one shared pool, capped at three, which
the system already enforces.

### Class features

Every class grants its features at its own levels, and they are removed again if the character's
level drops. **Sync Class Features**, in the menu on any extra class cell, re-checks that class and
grants anything missing. It is safe to run at any time and does nothing when there is nothing to
add. Use it after giving a class to a character that is already past level 1.

### Levelling past 1st

A character cannot leave 1st level short of the classes it is entitled to. Each class brings
1st-level features, proficiencies and a key attribute boost meant to be there from the start, and
levelling without one means none of that ever arrives, with nothing on the sheet looking wrong.

**A player is stopped; a GM is warned and allowed through.** A GM has reasons for a one-class
character in a dual-class world, such as an NPC built on a character sheet, and no way to say so to
a hard block. The warning names how many classes the character has and how many it needs.

The check is on leaving 1st level only. A character already past 1st with one class may have been
imported or may predate the variant being switched on.

### Skill proficiencies

A panel at the top of the Proficiencies tab counts proficiency points. **Show the Skill
Proficiencies Panel** controls it, on by default, and it does not need Dual Class switched on: a
single-class character forgets an unspent skill increase just as easily, and the rank caps apply to
everyone.

A rank is worth its own number, trained 1 through legendary 4, so what you hold is the sum of your
ranks. What you are owed is:

- the skills each class trains automatically
- the **larger** of the classes' additional skill counts, never the sum, plus your Intelligence, as
  free picks
- the background's
- anything a heritage, ancestry feat, class feature or archetype feat grants
- one per skill increase, unioned across classes since increases are once per level: a Fighter/Rogue
  gets the Rogue's schedule from 2nd, not the Fighter's odd levels from 3rd

**A source is worth however many ranks it hands you.** Making you trained is one point; expert
outright is two, master three, legendary four. Most hand over one, but Skilled Human makes you
expert from 5th level in a single grant, the scaling dedications (Acrobat, Fan Dancer, Twilight
Speaker) reach master at 7th and legendary at 15th, and Skill Mastery's two grants are an expert and
a master. Where several sources feed one skill, the first pays for every rank and each later one
pays only for the step it adds, since those feats require the rank below. A source granting a high
rank with no prerequisite, on a skill something else already trains, is the one case this
understates.

Two sources training the same skill count twice, the second listed as **redirected**: the rules
reallocate a duplicate "trained" to a skill of your choice rather than wasting it.

Granted skills are read from the rule that grants them, including the ones you answer yourself.
Skilled Human and the Natural Skill ancestry feat leave the skill blank for you to pick; most
dedications leave the whole target blank. Either way the panel reads your answer.

**What it flags:**

- **Unspent increases.** Nothing else on the sheet records that you owe yourself one.
- **Ranks above what your level allows.** Expert from your first skill increase, master at 7th,
  legendary at 15th. Only the expert gate moves by class: Rogue and Investigator start at 2nd.
- **Over budget**, phrased as a rank nothing accounts for rather than an error, since a feat
  granting a rank outright is the likelier cause.

If something trains every skill, the arithmetic stops meaning anything and the panel says all
sixteen are trained instead of a number.

### Lores

Lores get their own line, and **only their ranks above trained are counted**. Becoming trained in a
Lore is free here, because nothing in the data says where a Lore came from: a background's Lore, one
a GM hands out and one bought with a skill increase are the same item with the same flags. The rank
is the only thing that separates them.

That leaves two cases:

- A skill increase spent becoming trained in a **new** Lore is not counted, so it still shows as
  unspent.
- **Additional Lore** raises its Lore at 3rd, 7th and 15th with no skill increase and no rule
  elements to read, so a character with it reads over budget by up to 3.

Rank caps apply to Lores on the same gates as everything else, since a cap is about level alone.

### GM grants

**Grant a skill with an item and it is counted.** Anything the character holds that carries an
`ActiveEffectLike` rule writing `system.skills.<skill>.rank` is read as a source, whatever kind of
item it is: a feat, a class feature, a heritage, or an effect you build yourself and drop on the
sheet. The rank you write is the rank credited, so an effect granting expert adds two points to the
budget and two to the spend, leaving unspent increases where they were.

**Setting a rank by hand is not counted.** A rank edited directly on the sheet cannot be told from
one the player bought, so it is charged to the character: it eats unspent increases without saying
so, and only reads as over budget once those run out. Grant an item rather than make an edit.

## Which class is which

The first class is the primary one. It decides three things and nothing else:

- **The name shown in the Class slot**, with the other classes following it in order.
- **The character's single key attribute.** This is not the boosts: every class's key attribute
  boost applies whoever is primary. Pathfinder 2e separately keeps one field for *the* character's
  key attribute, with no room in it for two answers, and that field takes the primary's. Little
  reads it, the Resolve Points maximum under the Stamina variant being one.
- **Which class DC is flagged primary**, which is worth very little, as above.

The published rule does not settle what to do when two classes disagree on a key attribute, so the
choice is left explicit: **Make primary**, in the menu on any extra class cell, swaps that class with
the current primary and leaves the other classes where they are.

## Compatibility

Verified against Foundry v14 and Pathfinder 2e 8.4.1 and 8.5.0. The manifest declares 8.4.1 as the
minimum rather than a lower version nobody has run it on; Pathfinder 2e 8.4.1 itself requires Foundry
14.361, so there is no older combination to support.

Pathfinder 2e deletes a character's existing class whenever a new one is added, and there is no
setting to turn that off. This module gets two classes onto one sheet by holding on to the class the
system is about to delete, which depends on the particular way the system does the deleting. If a
future release changes that, the module notices and tells you: an error on screen, a note in the chat
log, and details in the console. Even so, **after any system update, add a second class to a test
character and check the first one is still there.**

- If another module adds a general-purpose second ladder of class feat slots, it is suppressed for
  characters this module already gives per-class ladders to, so the sheet does not offer the same
  slots twice.
- The Free Archetype variant is unaffected and adds its own archetype ladder as usual, so a
  dual-class character running Free Archetype has three ladders.

## Status

- [CHANGELOG.md](CHANGELOG.md) - version-by-version history
- [docs/design-notes.md](docs/design-notes.md) - why the module works the way it does
