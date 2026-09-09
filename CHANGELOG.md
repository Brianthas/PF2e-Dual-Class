# Changelog

## 0.3.1

- Fixed adding a class deleting the previous class's features. The system purges the existing class
  before creating the new one, and that purge takes the class's granted feats with it. The class
  itself was being kept and its features were not, so a Fighter who gained a second class kept the
  Fighter item and lost Reactive Strike and Shield Block. Those feats are now kept too.
- Fixed a second, wrong control on each extra class cell. The cell is a copy of the Class cell and
  inherited the system's own class picker, which showed as a duplicate magnifying glass and would
  have replaced the character's **first** class when clicked.

## 0.3.0

- A character can take a **third class**, treated exactly like the second: the best of the three
  proficiencies, the highest Hit Points, the larger additional skill count rather than the sum, a
  class DC each at its own key attribute, a key attribute boost each, and a class feat ladder each.
  Skill, general and ancestry feats stay on one ladder across all three, since the variant rule has
  those only once per level. Not a published rule; the Dual-Class rules applied to one more class.
- Two ways to allow it, off by default. **Allow a Third Class** is a world setting covering every
  character. **Third Class Permissions** is a GM-only screen for allowing it to particular
  characters in a world that is otherwise dual class. Either grants it.
- Levelling past 1st now requires every class the character is entitled to, so a character allowed
  three needs three, while another character in the same world still needs two.
- Feat ladders are named after their class: **Fighter Feats**, **Rogue Feats**, **Sorcerer Feats**,
  including the system's own group, which previously read "Class Feats" while the others carried
  names. A single-class character is unchanged.
- The class cells sit together on the sheet, reading Class, Second Class, Third Class, then Deity.
  They appear whenever the module is on rather than only once a first class is picked.
- Fixed the class feature sync asking for choices already made. Levelling up re-ran every extra
  class's feature grant, which re-opens that class's choice prompts, so a Rogue was asked for its
  racket again at every level and the answer was thrown away as a duplicate. Nothing is generated
  now for a class that has nothing new to give.
- Fixed a class added to an already-levelled character not catching up its features. The check
  watched the flag name used before this version.

## 0.2.1

- The module description now mentions Ancestry Paragon, which has its own world setting and was not
  discoverable from the module list.

## 0.2.0

- Renamed. The module id is now `pf2e-dual-class-items` and the title is **Dual Class Items (PF2e)**.
  The plain `pf2e-dual-class` id was already taken on Foundry's package listing by a different,
  actively maintained module, and the two titles were close enough to be confusing.
- **This breaks an existing install.** Foundry treats the new id as a different module, so a world
  running the old one needs the new module enabled, its two settings turned back on, and any
  character's second class re-picked from the Second Class slot. Feats already placed in the
  per-class ladders are unaffected: those slots are named independently of the module id.

## 0.1.1

- Fixed the Enable Dual Class setting hint, which said characters were unaffected until a second
  class was added. They are not: with the setting on, a player cannot level a character past 1st
  until it has both classes. The hint says that now.
- Reworded the README and several on-screen messages.

## 0.1.0

First release. Runs the Dual-Class Characters variant rule on two real class items.

- A character can hold two class items. The system deletes an existing class whenever one is added,
  with no option to switch that off, so the class being deleted is kept instead. Only applies to an
  add started from the Second Class slot; every other class drop still replaces the class.
- Proficiencies, saving throws, perception and spellcasting take the better of the two classes, and
  Hit Points the higher per level. The system's own class handling already resolves these with a
  maximum; what needed correcting is the six fields it assigns outright, where the last class
  prepared won.
- Both classes get a class DC at their own key attribute, with one marked primary.
- Both key attribute boosts apply, and the Attribute Boosts window gets a row per class. The
  system's single row offers the union of both classes' options and writes every choice to the
  first class.
- A feat ladder per class, at that class's own levels, plus extra skill, general or ancestry feat
  slots where the second class grants them at levels the first does not.
- Both classes' features are granted on level up and removed on level down, and a Sync Class
  Features action catches up a class added after level 1.
- A trained skill counter on the Proficiencies tab, counting the larger of the two classes'
  additional skill counts rather than the sum.
- A warning when a class feat is placed in the other class's ladder. Feat slots are not gated by
  class, so this reports rather than blocks.
- Ancestry Paragon, as its own world setting independent of dual class. The extra slots go into
  PF2e's own Ancestry Feats group rather than a second ladder, so the feats sit where a player looks
  for them, and the heading says the ladder is a paragon one.
- A player cannot level a character past 1st with only one class; a GM is warned and allowed
  through. The second class's 1st-level features and proficiencies belong to the character from the
  start, and levelling without it leaves no sign on the sheet.
- Deleting one class no longer takes the other class's features with it. The system treats every
  feat located to any class item as linked to the class being removed, which is right with one class
  and destroys the other class's features with two. Applies to deleting a class by any route, not
  only the module's own Remove Second Class.
- A feat section another module adds is placed with the group that takes the same kind of feat
  rather than at the bottom of the tab, so a second source of skill or ancestry feats reads as a
  continuation of that ladder.
